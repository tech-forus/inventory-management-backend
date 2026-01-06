-- Migration: 045_add_hsn_gst_to_sub_categories
-- Description: Adds HSN Code and GST Rate columns to sub_categories table
-- Created: 2025-01-06

BEGIN;

-- Add HSN Code column
ALTER TABLE sub_categories
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(15);

-- Add GST Rate column (0, 5, or 18)
ALTER TABLE sub_categories
  ADD COLUMN IF NOT EXISTS gst_rate INTEGER CHECK (gst_rate IN (0, 5, 18));

-- Create index on HSN code for faster lookups
CREATE INDEX IF NOT EXISTS idx_sub_categories_hsn_code ON sub_categories(hsn_code);

-- Add comments
COMMENT ON COLUMN sub_categories.hsn_code IS 'HSN Code for this category combination (used for GST purposes)';
COMMENT ON COLUMN sub_categories.gst_rate IS 'GST Rate percentage (0, 5, or 18)';

COMMIT;

