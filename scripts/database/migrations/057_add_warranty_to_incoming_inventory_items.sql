-- Migration: 057_add_warranty_to_incoming_inventory_items
-- Description: Adds warranty column to incoming_inventory_items table to support per-item warranty
-- Created: 2025-01-XX

BEGIN;

-- Add warranty column to incoming_inventory_items table
ALTER TABLE incoming_inventory_items
  ADD COLUMN IF NOT EXISTS warranty INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN incoming_inventory_items.warranty IS 'Warranty period value for this specific item (in months)';

COMMIT;
