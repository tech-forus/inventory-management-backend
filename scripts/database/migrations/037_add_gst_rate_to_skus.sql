-- Migration: 037_add_gst_rate_to_skus
-- Description: Adds gst_rate field to skus table for GST percentage
-- Created: 2024-12-20

BEGIN;

-- Add gst_rate column to skus table
ALTER TABLE skus 
ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2);

-- Add constraint to only allow valid GST rates: 0, 5, 18, or 40
-- Only add if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_gst_rate' 
        AND conrelid = 'skus'::regclass
    ) THEN
        ALTER TABLE skus
        ADD CONSTRAINT check_gst_rate 
        CHECK (gst_rate IS NULL OR gst_rate IN (0, 5, 18, 40));
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN skus.gst_rate IS 'GST rate percentage (must be 0, 5, 18, or 40)';

COMMIT;

