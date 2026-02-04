-- Rollback migration 075
-- Drop the index
DROP INDEX IF EXISTS idx_skus_search_blob_trgm;

-- Drop the trigger
DROP TRIGGER IF EXISTS trg_sku_search_blob ON skus;

-- Drop the function
DROP FUNCTION IF EXISTS update_sku_search_blob();

-- Drop the column
ALTER TABLE skus DROP COLUMN IF EXISTS search_blob;
