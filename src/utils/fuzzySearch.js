/**
 * Fuzzy Search Utilities
 * Production-grade fuzzy search using PostgreSQL pg_trgm extension
 * 
 * Features:
 * - Combines exact match + fuzzy match (exact results rank higher)
 * - Uses similarity() function from pg_trgm
 * - Proper GIN index utilization
 * - Safe parameterized queries
 * - Configurable similarity threshold
 */

/**
 * Build fuzzy search SQL condition with ranking
 * Combines exact matches (rank 1) with fuzzy matches (rank 2+)
 * 
 * @param {string} searchTerm - The search term
 * @param {Array} fields - Array of field objects: [{table: 's', column: 'item_name', alias: 'item_name'}]
 * @param {number} paramIndex - Current parameter index
 * @param {number} similarityThreshold - Minimum similarity threshold (0.0 to 1.0), default 0.3
 * @returns {Object} {sql: string, params: Array, paramIndex: number}
 * 
 * @example
 * const {sql, params, paramIndex} = buildFuzzySearchCondition(
 *   'SwitchBoard',
 *   [
 *     {table: 's', column: 'item_name', alias: 'item_name'},
 *     {table: 's', column: 'sku_id', alias: 'sku_id'}
 *   ],
 *   2,
 *   0.3
 * );
 */
function buildFuzzySearchCondition(searchTerm, fields, paramIndex, similarityThreshold = 0.3) {
  if (!searchTerm || !searchTerm.trim() || fields.length === 0) {
    return { sql: '', params: [], paramIndex };
  }

  const searchTrimmed = searchTerm.trim();
  const normalizedSearch = searchTrimmed.replace(/\s+/g, '').toLowerCase();
  const params = [];
  let sql = ' AND (';
  
  // Build exact match conditions (rank 1 - highest priority)
  const exactConditions = [];
  fields.forEach((field, index) => {
    const exactCondition = `REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', '') ILIKE $${paramIndex}`;
    exactConditions.push(exactCondition);
  });
  params.push(`%${normalizedSearch}%`);
  sql += exactConditions.join(' OR ');
  sql += ')';
  
  paramIndex++;
  
  // Build fuzzy match conditions using similarity() (rank 2 - lower priority)
  // Only add fuzzy if exact match threshold is not met
  const fuzzyConditions = [];
  fields.forEach((field) => {
    // Use similarity() function from pg_trgm
    // similarity() returns a value between 0 and 1
    const fuzzyCondition = `similarity(REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', ''), $${paramIndex}) >= $${paramIndex + 1}`;
    fuzzyConditions.push(fuzzyCondition);
  });
  
  if (fuzzyConditions.length > 0) {
    sql += ` OR (`;
    sql += fuzzyConditions.join(' OR ');
    sql += ')';
    params.push(normalizedSearch);
    params.push(similarityThreshold);
    paramIndex += 2;
  }

  return { sql, params, paramIndex };
}

/**
 * Build ORDER BY clause for ranked fuzzy search results
 * Exact matches first, then fuzzy matches ordered by similarity score
 * 
 * @param {string} searchTerm - The search term
 * @param {Array} fields - Array of field objects
 * @param {number} paramIndex - Current parameter index
 * @returns {Object} {sql: string, params: Array, paramIndex: number}
 */
function buildFuzzySearchOrderBy(searchTerm, fields, paramIndex) {
  if (!searchTerm || !searchTerm.trim() || fields.length === 0) {
    return { sql: '', params: [], paramIndex };
  }

  const searchTrimmed = searchTerm.trim();
  const normalizedSearch = searchTrimmed.replace(/\s+/g, '').toLowerCase();
  const params = [];
  
  // Calculate max similarity score across all fields
  const similarityScores = fields.map((field, index) => {
    return `similarity(REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', ''), $${paramIndex})`;
  });
  
  const maxSimilarity = `GREATEST(${similarityScores.join(', ')})`;
  params.push(normalizedSearch);
  
  // Order by: exact match first (CASE WHEN exact match THEN 0 ELSE 1), then by similarity DESC
  const exactMatchConditions = fields.map((field) => {
    return `REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', '') ILIKE $${paramIndex + 1}`;
  });
  
  const orderBySql = `
    ORDER BY 
      CASE 
        WHEN (${exactMatchConditions.join(' OR ')}) THEN 0 
        ELSE 1 
      END ASC,
      ${maxSimilarity} DESC
  `;
  
  params.push(`%${normalizedSearch}%`);
  
  return { sql: orderBySql, params, paramIndex: paramIndex + 2 };
}

/**
 * Build complete fuzzy search query with ranking
 * Combines exact + fuzzy matching with proper ordering
 * 
 * @param {string} searchTerm - The search term
 * @param {Array} fields - Array of field objects
 * @param {number} paramIndex - Current parameter index
 * @param {Object} options - Options object
 * @param {number} options.similarityThreshold - Minimum similarity (default: 0.3)
 * @param {boolean} options.exactMatchOnly - If true, only use exact matching (default: false)
 * @returns {Object} {whereClause: string, orderByClause: string, params: Array, paramIndex: number}
 */
function buildFuzzySearchQuery(searchTerm, fields, paramIndex, options = {}) {
  const {
    similarityThreshold = 0.3,
    exactMatchOnly = false
  } = options;

  if (!searchTerm || !searchTerm.trim() || fields.length === 0) {
    return { whereClause: '', orderByClause: '', params: [], paramIndex };
  }

  const searchTrimmed = searchTerm.trim();
  const normalizedSearch = searchTrimmed.replace(/\s+/g, '').toLowerCase();
  const params = [];
  let whereClause = ' AND (';
  let orderByClause = '';
  
  // Exact match conditions (rank 1 - highest priority)
  const exactConditions = [];
  fields.forEach((field) => {
    exactConditions.push(`REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', '') ILIKE $${paramIndex}`);
  });
  params.push(`%${normalizedSearch}%`);
  whereClause += exactConditions.join(' OR ');
  
  let currentParamIndex = paramIndex + 1;
  
  if (!exactMatchOnly) {
    // Add fuzzy match conditions using similarity() (rank 2 - lower priority)
    whereClause += ' OR (';
    const fuzzyConditions = [];
    fields.forEach((field) => {
      fuzzyConditions.push(`similarity(REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', ''), $${currentParamIndex}) >= $${currentParamIndex + 1}`);
    });
    whereClause += fuzzyConditions.join(' OR ');
    whereClause += ')';
    params.push(normalizedSearch);
    params.push(similarityThreshold);
    currentParamIndex += 2;
    
    // Build ORDER BY for ranking (exact matches first, then by similarity score)
    const similarityScores = fields.map((field) => {
      return `similarity(REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', ''), $${currentParamIndex})`;
    });
    const maxSimilarity = `GREATEST(${similarityScores.join(', ')})`;
    
    // Reuse the exact match parameter for ORDER BY
    const exactMatchCheck = fields.map((field) => {
      return `REPLACE(COALESCE(${field.table}.${field.column}, ''), ' ', '') ILIKE $${paramIndex}`;
    }).join(' OR ');
    
    orderByClause = `
      ORDER BY 
        CASE WHEN (${exactMatchCheck}) THEN 0 ELSE 1 END ASC,
        ${maxSimilarity} DESC
    `;
    params.push(normalizedSearch); // Add parameter for similarity calculation in ORDER BY
    currentParamIndex += 1;
  } else {
    orderByClause = '';
  }
  
  whereClause += ')';
  
  return { whereClause, orderByClause, params, paramIndex: currentParamIndex };
}

module.exports = {
  buildFuzzySearchCondition,
  buildFuzzySearchOrderBy,
  buildFuzzySearchQuery,
};
