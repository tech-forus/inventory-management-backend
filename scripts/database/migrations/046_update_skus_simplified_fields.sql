-- Migration: 046_update_skus_simplified_fields
-- Description: Updates SKU table to support simplified form fields
-- - Makes vendor_id nullable (vendor selection removed)
-- - Adds manufacture_or_import field
-- - Adds unit fields for weight, length, width, height
-- - Adds custom_fields JSON field
-- Created: 2025-01-06

BEGIN;

-- Make vendor_id nullable (vendor selection removed from form)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'vendor_id' AND is_nullable = 'NO') THEN
    ALTER TABLE skus ALTER COLUMN vendor_id DROP NOT NULL;
  END IF;
END $$;

-- Add manufacture_or_import field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'manufacture_or_import') THEN
    ALTER TABLE skus ADD COLUMN manufacture_or_import VARCHAR(20) CHECK (manufacture_or_import IN ('Manufacture', 'Import'));
  END IF;
END $$;

-- Add unit fields for dimensions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'weight_unit') THEN
    ALTER TABLE skus ADD COLUMN weight_unit VARCHAR(10) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'g'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'length_unit') THEN
    ALTER TABLE skus ADD COLUMN length_unit VARCHAR(10) DEFAULT 'mm' CHECK (length_unit IN ('mm', 'cm', 'inch'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'width_unit') THEN
    ALTER TABLE skus ADD COLUMN width_unit VARCHAR(10) DEFAULT 'mm' CHECK (width_unit IN ('mm', 'cm', 'inch'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'height_unit') THEN
    ALTER TABLE skus ADD COLUMN height_unit VARCHAR(10) DEFAULT 'mm' CHECK (height_unit IN ('mm', 'cm', 'inch'));
  END IF;
END $$;

-- Add custom_fields JSON field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'custom_fields') THEN
    ALTER TABLE skus ADD COLUMN custom_fields JSONB;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN skus.manufacture_or_import IS 'Whether the item is Manufactured or Imported';
COMMENT ON COLUMN skus.weight_unit IS 'Unit for weight measurement (kg or g)';
COMMENT ON COLUMN skus.length_unit IS 'Unit for length measurement (mm, cm, or inch)';
COMMENT ON COLUMN skus.width_unit IS 'Unit for width measurement (mm, cm, or inch)';
COMMENT ON COLUMN skus.height_unit IS 'Unit for height measurement (mm, cm, or inch)';
COMMENT ON COLUMN skus.custom_fields IS 'Additional custom fields stored as JSON array of {key, value} objects';

COMMIT;

