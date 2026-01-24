-- Migration: 063_add_unique_constraint_item_name_model
-- Description: Adds unique constraint on (company_id, item_name, model) combination to prevent duplicates
-- Created: 2025-01-24
-- Note: This uses a unique index on expressions to handle case-insensitive comparison and NULL values

BEGIN;

-- First, clean up any existing duplicates (keep the oldest one, mark others as inactive)
-- This handles the case where duplicates already exist before adding the constraint
DO $$
DECLARE
    duplicate_record RECORD;
    first_id INTEGER;
BEGIN
    -- Find and handle duplicates
    FOR duplicate_record IN
        SELECT 
            company_id,
            LOWER(TRIM(item_name)) as normalized_item_name,
            UPPER(TRIM(COALESCE(model, ''))) as normalized_model,
            ARRAY_AGG(id ORDER BY id) as ids
        FROM skus
        WHERE is_active = true
        GROUP BY company_id, LOWER(TRIM(item_name)), UPPER(TRIM(COALESCE(model, '')))
        HAVING COUNT(*) > 1
    LOOP
        -- Get the first (oldest) ID
        first_id := duplicate_record.ids[1];
        
        -- Mark all others as inactive
        UPDATE skus
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id = duplicate_record.company_id
          AND LOWER(TRIM(item_name)) = duplicate_record.normalized_item_name
          AND UPPER(TRIM(COALESCE(model, ''))) = duplicate_record.normalized_model
          AND id != first_id
          AND is_active = true;
    END LOOP;
END $$;

-- Create unique index on normalized (company_id, item_name, model) combination
-- This prevents duplicates at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_skus_unique_item_name_model 
ON skus (
    company_id,
    LOWER(TRIM(item_name)),
    UPPER(TRIM(COALESCE(model, '')))
)
WHERE is_active = true;

-- Add comment
COMMENT ON INDEX idx_skus_unique_item_name_model IS 
'Unique constraint on (company_id, item_name, model) combination. Prevents duplicate SKUs with same item name and model number within a company. Case-insensitive and handles NULL model values.';

COMMIT;
