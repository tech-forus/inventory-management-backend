-- Migration: 060_add_opening_stock_to_skus
-- Description: Adds opening_stock column to skus table
-- Created: 2026-01-20

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skus' AND column_name = 'opening_stock') THEN
    ALTER TABLE skus ADD COLUMN opening_stock INTEGER DEFAULT 0;
    COMMENT ON COLUMN skus.opening_stock IS 'Opening stock quantity (initial stock)';
  END IF;
END $$;

COMMIT;
