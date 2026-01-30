-- Migration: 066_add_warranty_to_skus
-- Description: Adds warranty column to skus table to store default warranty period
-- Created: 2025-01-XX

BEGIN;

-- Add warranty column to skus table
ALTER TABLE skus
  ADD COLUMN IF NOT EXISTS warranty INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN skus.warranty IS 'Default warranty period in months for this SKU (set during SKU creation)';

COMMIT;
