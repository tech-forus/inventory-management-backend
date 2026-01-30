-- Migration: 068_add_warranty_serial_to_outgoing_inventory_items
-- Description: Adds warranty and serial_number columns to outgoing_inventory_items table
-- Created: 2025-01-XX

BEGIN;

-- Add warranty column to outgoing_inventory_items table
ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS warranty INTEGER DEFAULT 0;

-- Add serial_number column to outgoing_inventory_items table
ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(500);

-- Add comments for documentation
COMMENT ON COLUMN outgoing_inventory_items.warranty IS 'Warranty period value for this specific item (in months)';
COMMENT ON COLUMN outgoing_inventory_items.serial_number IS 'Serial number(s) for this item. Can be comma-separated for multiple serials or single value.';

-- Add index for serial number searches
CREATE INDEX IF NOT EXISTS idx_outgoing_items_serial_number ON outgoing_inventory_items(serial_number) WHERE serial_number IS NOT NULL;

COMMIT;
