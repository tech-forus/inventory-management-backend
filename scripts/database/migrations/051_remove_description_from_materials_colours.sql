-- Migration: 051_remove_description_from_materials_colours
-- Description: Removes description column from materials and colours tables
-- Created: 2026-01-07

BEGIN;

-- Remove description column from materials table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' AND column_name = 'description'
  ) THEN
    ALTER TABLE materials DROP COLUMN description;
  END IF;
END $$;

-- Remove description column from colours table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'colours' AND column_name = 'description'
  ) THEN
    ALTER TABLE colours DROP COLUMN description;
  END IF;
END $$;

COMMIT;



