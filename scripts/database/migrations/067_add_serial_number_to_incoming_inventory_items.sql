-- Migration: 067_add_serial_number_to_incoming_inventory_items
-- Description: Adds serial_number column to incoming_inventory_items table
-- Created: 2025-01-XX

BEGIN;

-- Add serial_number column to incoming_inventory_items table
ALTER TABLE incoming_inventory_items
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN incoming_inventory_items.serial_number IS 'Serial number(s) for this item. Can be comma-separated for multiple serials or single value.';

-- Add index for serial number searches
CREATE INDEX IF NOT EXISTS idx_incoming_items_serial_number ON incoming_inventory_items(serial_number) WHERE serial_number IS NOT NULL;

COMMIT;
