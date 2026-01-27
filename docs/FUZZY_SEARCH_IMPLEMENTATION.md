# Fuzzy Search Implementation Guide

## Overview

This document describes the production-grade fuzzy search implementation using PostgreSQL `pg_trgm` extension. The implementation provides typo-tolerant search with ranked results (exact matches first, then fuzzy matches by similarity score).

## Features

✅ **Typo Tolerance**: Finds results even with spelling mistakes  
✅ **Ranked Results**: Exact matches appear first, then fuzzy matches ordered by similarity  
✅ **Space-Insensitive**: Already handles spaces (from previous implementation)  
✅ **Performance Optimized**: Uses GIN indexes for fast similarity searches  
✅ **Safe Queries**: All queries use parameterized statements (SQL injection safe)  
✅ **Configurable**: Adjustable similarity threshold  

## Database Setup

### 1. Run Migration

The migration file `065_enable_pg_trgm_fuzzy_search.sql` will:
- Enable `pg_trgm` extension
- Create GIN (Generalized Inverted Index) indexes on searchable fields

```bash
npm run migrate
```

### 2. Verify Extension

```sql
-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE '%_trgm';
```

## How It Works

### Similarity Function

PostgreSQL `pg_trgm` extension provides `similarity()` function that:
- Breaks text into trigrams (3-character sequences)
- Compares trigrams between search term and database fields
- Returns a similarity score between 0.0 (no match) and 1.0 (exact match)

**Example:**
```sql
SELECT similarity('SwitchBoard', 'SwitchBord');  -- Returns ~0.89 (89% similar)
SELECT similarity('SwitchBoard', 'Switch');      -- Returns ~0.50 (50% similar)
SELECT similarity('SwitchBoard', 'Light');       -- Returns ~0.00 (0% similar)
```

### Ranking Strategy

1. **Exact Matches** (Rank 0): Results where search term exactly matches (using ILIKE)
2. **Fuzzy Matches** (Rank 1+): Results where similarity >= threshold, ordered by similarity DESC

## Usage

### Backend API

The fuzzy search is automatically enabled for SKU searches. No changes needed to API calls.

**Example Request:**
```javascript
GET /api/skus?search=SwitchBord&limit=20
```

**Response:** Results ranked with exact matches first, then fuzzy matches by similarity.

### Code Example

```javascript
const { buildFuzzySearchQuery } = require('../utils/fuzzySearch');

// Define searchable fields
const searchFields = [
  { table: 's', column: 'item_name', alias: 'item_name' },
  { table: 's', column: 'sku_id', alias: 'sku_id' },
  { table: 'b', column: 'name', alias: 'brand_name' }
];

// Build fuzzy search query
const fuzzySearch = buildFuzzySearchQuery(
  'SwitchBord',           // Search term (with typo)
  searchFields,           // Fields to search
  2,                      // Starting parameter index
  { 
    similarityThreshold: 0.3,  // Minimum 30% similarity
    exactMatchOnly: false      // Enable fuzzy matching
  }
);

// Use in SQL query
const query = `
  SELECT * FROM skus s
  LEFT JOIN brands b ON s.brand_id = b.id
  WHERE s.company_id = $1
  ${fuzzySearch.whereClause}
  ${fuzzySearch.orderByClause}
  LIMIT $${fuzzySearch.paramIndex} OFFSET $${fuzzySearch.paramIndex + 1}
`;

const params = [
  companyId,
  ...fuzzySearch.params,
  limit,
  offset
];
```

## Configuration

### Similarity Threshold

The default similarity threshold is **0.3** (30%). This means:
- Results must be at least 30% similar to the search term
- Lower threshold = more results (more typos allowed)
- Higher threshold = fewer results (stricter matching)

**Recommended Thresholds:**
- **0.2-0.3**: Very lenient (allows many typos, good for short terms)
- **0.3-0.4**: Balanced (default, good for most cases)
- **0.4-0.5**: Strict (fewer typos allowed, better precision)
- **0.5+**: Very strict (only minor typos allowed)

### Adjusting Threshold

In `src/models/skuModel.js`:

```javascript
const fuzzySearch = buildFuzzySearchQuery(
  filters.search,
  searchFields,
  paramIndex,
  { 
    similarityThreshold: 0.4,  // Change from 0.3 to 0.4
    exactMatchOnly: false 
  }
);
```

## Performance Considerations

### Index Usage

GIN indexes are automatically used by PostgreSQL when:
- Using `similarity()` function
- Using `%` pattern with ILIKE (for exact matches)

### Query Performance

- **Small datasets** (< 10,000 rows): Fast, no optimization needed
- **Medium datasets** (10,000 - 100,000 rows): Good performance with GIN indexes
- **Large datasets** (> 100,000 rows): Consider:
  - Increasing similarity threshold to reduce results
  - Adding LIMIT clauses (already implemented)
  - Using materialized views for frequently searched data

### Index Maintenance

GIN indexes are automatically maintained by PostgreSQL:
- Updated on INSERT/UPDATE/DELETE
- No manual maintenance required
- Slightly slower writes (acceptable trade-off for fast searches)

## Testing

### Test Queries

```sql
-- Test exact match
SELECT * FROM skus 
WHERE similarity(REPLACE(item_name, ' ', ''), 'switchboard') >= 0.3
ORDER BY similarity(REPLACE(item_name, ' ', ''), 'switchboard') DESC
LIMIT 10;

-- Test with typo
SELECT * FROM skus 
WHERE similarity(REPLACE(item_name, ' ', ''), 'switchbord') >= 0.3
ORDER BY similarity(REPLACE(item_name, ' ', ''), 'switchbord') DESC
LIMIT 10;
```

### Expected Behavior

1. **"SwitchBoard"** → Finds "Switch Board", "SwitchBoard", "SwitchBord" (typo)
2. **"SwitchBord"** → Finds "SwitchBoard" (corrects typo), "Switch Board"
3. **"SwtichBoard"** → Finds "SwitchBoard" (transposed characters)

## Troubleshooting

### Extension Not Found

**Error:** `function similarity(unknown, unknown) does not exist`

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Slow Queries

**Symptoms:** Queries taking > 1 second

**Solutions:**
1. Verify GIN indexes exist: `\d+ skus` (check indexes)
2. Increase similarity threshold (fewer results = faster)
3. Add LIMIT clause (already implemented)
4. Check EXPLAIN ANALYZE for index usage

### No Fuzzy Results

**Symptoms:** Only exact matches returned

**Check:**
1. Similarity threshold too high (try lowering to 0.2)
2. Search term too short (trigrams need at least 3 characters)
3. No similar data in database

## Best Practices

1. **Always use LIMIT**: Prevents returning too many results
2. **Parameterized queries**: Already implemented (SQL injection safe)
3. **Index maintenance**: GIN indexes auto-update, but monitor size
4. **Threshold tuning**: Adjust based on your data and user needs
5. **Combine with filters**: Use category/brand filters to narrow results first

## Future Enhancements

Potential improvements:
- [ ] Configurable threshold per field (e.g., stricter for SKU codes)
- [ ] Search suggestions/autocomplete using fuzzy matching
- [ ] Highlight matched portions in results
- [ ] Search analytics (track common typos)
- [ ] Multi-language support (different thresholds per language)

## References

- [PostgreSQL pg_trgm Documentation](https://www.postgresql.org/docs/current/pgtrgm.html)
- [GIN Index Documentation](https://www.postgresql.org/docs/current/gin.html)
- [Trigram Similarity Explained](https://www.postgresql.org/docs/current/pgtrgm.html#PGTRGM-CONCEPTS)
