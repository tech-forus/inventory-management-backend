-- Migration: 061_add_created_by_to_inventory_ledgers
-- Description: Adds created_by column to inventory_ledgers table
-- Created: 2026-01-20

BEGIN;

DO $$
BEGIN
  -- Only attempt to alter if the table exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventory_ledgers'
  ) THEN

    -- Add the column only if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'inventory_ledgers' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.inventory_ledgers
        ADD COLUMN created_by VARCHAR(255);

      COMMENT ON COLUMN public.inventory_ledgers.created_by IS 'ID of the user who created this ledger entry';
    END IF;

  END IF;
END $$;

COMMIT;
