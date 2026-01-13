-- Migration: 056_remove_unused_sku_columns
-- Description: Removes unused columns from skus table that are not used in SKU creation form
-- Based on SKUCreatePage.tsx payload analysis
-- Created: 2025-01-13

BEGIN;

-- Remove unused optional specification columns that are not in the form
DO $$
BEGIN
  -- Drop insulation column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'insulation') THEN
    ALTER TABLE skus DROP COLUMN insulation;
    RAISE NOTICE 'Dropped column: insulation';
  END IF;

  -- Drop input_supply column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'input_supply') THEN
    ALTER TABLE skus DROP COLUMN input_supply;
    RAISE NOTICE 'Dropped column: input_supply';
  END IF;

  -- Drop cri column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'cri') THEN
    ALTER TABLE skus DROP COLUMN cri;
    RAISE NOTICE 'Dropped column: cri';
  END IF;

  -- Drop cct column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'cct') THEN
    ALTER TABLE skus DROP COLUMN cct;
    RAISE NOTICE 'Dropped column: cct';
  END IF;

  -- Drop beam_angle column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'beam_angle') THEN
    ALTER TABLE skus DROP COLUMN beam_angle;
    RAISE NOTICE 'Dropped column: beam_angle';
  END IF;

  -- Drop led_type column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'led_type') THEN
    ALTER TABLE skus DROP COLUMN led_type;
    RAISE NOTICE 'Dropped column: led_type';
  END IF;

  -- Drop shape column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'shape') THEN
    ALTER TABLE skus DROP COLUMN shape;
    RAISE NOTICE 'Dropped column: shape';
  END IF;

  -- Drop rack_number column if it exists (not used in form)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'rack_number') THEN
    ALTER TABLE skus DROP COLUMN rack_number;
    RAISE NOTICE 'Dropped column: rack_number';
  END IF;
END $$;

COMMIT;
