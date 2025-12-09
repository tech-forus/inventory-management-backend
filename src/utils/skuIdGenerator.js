const { logger } = require('./logger');

/**
 * Generate a random 8-character alphanumeric string
 * Contains uppercase letters (A-Z) and numbers (0-9)
 * 
 * @returns {string} String of 8 alphanumeric characters
 */
function generateRandomAlphanumeric() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a SKU ID with format: COMPANYID + 8 random alphanumeric characters
 * Format: XXXXXX + YYYYYYYY (6 + 8 = 14 characters total)
 * 
 * @param {string} companyId - 6-character company ID
 * @returns {string} SKU ID (14 characters: 6 company ID + 8 random)
 */
function generateSKUId(companyId) {
  if (!companyId || companyId.length !== 6) {
    throw new Error('Company ID must be exactly 6 characters');
  }
  
  const randomPart = generateRandomAlphanumeric();
  return companyId.toUpperCase() + randomPart;
}

/**
 * Generate a unique SKU ID by checking against database
 * 
 * @param {Object} client - PostgreSQL client (from pool.connect())
 * @param {string} companyId - 6-character company ID
 * @returns {Promise<string>} Unique SKU ID (14 characters)
 */
async function generateUniqueSKUId(client, companyId) {
  const maxAttempts = 100; // Prevent infinite loop
  let attempts = 0;
  
  if (!companyId || companyId.length !== 6) {
    throw new Error('Company ID must be exactly 6 characters');
  }
  
  while (attempts < maxAttempts) {
    const skuId = generateSKUId(companyId);
    
    try {
      // Check if SKU ID exists in database
      const result = await client.query(
        'SELECT sku_id FROM skus WHERE sku_id = $1',
        [skuId]
      );
      
      // If SKU ID doesn't exist, return it
      if (result.rows.length === 0) {
        return skuId;
      }
      
      attempts++;
    } catch (error) {
      // If table doesn't exist yet, return the generated ID
      if (error.message.includes('does not exist')) {
        return skuId;
      }
      logger.error({ error: error.message }, 'Error checking SKU ID uniqueness');
      // If there's an error, return the generated ID anyway
      return skuId;
    }
  }
  
  // Fallback: throw error if all attempts fail
  throw new Error('Failed to generate unique SKU ID after multiple attempts');
}

/**
 * Generate multiple unique SKU IDs efficiently for bulk operations
 * Uses batch checking to reduce database queries
 * 
 * @param {Object} client - PostgreSQL client (from pool.connect())
 * @param {string} companyId - 6-character company ID
 * @param {number} count - Number of SKU IDs to generate
 * @returns {Promise<string[]>} Array of unique SKU IDs
 */
async function generateBulkUniqueSKUIds(client, companyId, count) {
  if (!companyId || companyId.length !== 6) {
    throw new Error('Company ID must be exactly 6 characters');
  }
  
  if (count <= 0) {
    throw new Error('Count must be greater than 0');
  }
  
  const maxAttempts = 1000; // Increased for bulk operations
  const generatedIds = new Set();
  const batchSize = 100; // Check 100 IDs at a time
  
  while (generatedIds.size < count) {
    const batch = [];
    const attempts = generatedIds.size;
    
    // Generate a batch of candidate SKU IDs
    for (let i = 0; i < batchSize && generatedIds.size < count; i++) {
      const candidateId = generateSKUId(companyId);
      batch.push(candidateId);
    }
    
    if (batch.length === 0) break;
    
    try {
      // Check which IDs already exist in database
      const placeholders = batch.map((_, index) => `$${index + 1}`).join(',');
      const result = await client.query(
        `SELECT sku_id FROM skus WHERE sku_id IN (${placeholders})`,
        batch
      );
      
      const existingIds = new Set(result.rows.map(row => row.sku_id));
      
      // Add unique IDs to our set
      for (const id of batch) {
        if (!existingIds.has(id) && generatedIds.size < count) {
          generatedIds.add(id);
        }
      }
      
      // If we've tried too many times, throw error
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate ${count} unique SKU IDs after ${maxAttempts} attempts. Generated ${generatedIds.size} IDs.`);
      }
    } catch (error) {
      // If table doesn't exist yet, add all generated IDs
      if (error.message.includes('does not exist')) {
        batch.forEach(id => {
          if (generatedIds.size < count) {
            generatedIds.add(id);
          }
        });
      } else {
        logger.error({ error: error.message }, 'Error checking SKU ID uniqueness in bulk');
        throw error;
      }
    }
  }
  
  return Array.from(generatedIds);
}

module.exports = {
  generateSKUId,
  generateUniqueSKUId,
  generateRandomAlphanumeric,
  generateBulkUniqueSKUIds
};

