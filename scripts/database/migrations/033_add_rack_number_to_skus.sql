-- Migration: 033_add_rack_number_to_skus
-- Description: Adds rack_number field to skus table for Optional Specifications
-- Created: 2024-12-19

BEGIN;

-- Add rack_number column to skus table
ALTER TABLE skus 
ADD COLUMN IF NOT EXISTS rack_number VARCHAR(100);

-- Add comment
COMMENT ON COLUMN skus.rack_number IS 'Rack number for storage location (Optional Specification)';

COMMIT;

