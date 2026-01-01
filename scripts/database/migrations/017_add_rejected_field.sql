-- Migration: 017_add_rejected_field
-- Description: Adds rejected field back to incoming_inventory_items for move to rejected functionality
-- Created: 2024-12-XX

BEGIN;

-- Add rejected column to incoming_inventory_items
ALTER TABLE incoming_inventory_items 
  ADD COLUMN IF NOT EXISTS rejected INTEGER DEFAULT 0;

-- Add challan_number and challan_date to incoming_inventory_items for tracking
ALTER TABLE incoming_inventory_items 
  ADD COLUMN IF NOT EXISTS challan_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS challan_date DATE;

-- Update comments
COMMENT ON COLUMN incoming_inventory_items.rejected IS 'Quantity rejected (moved from short)';
COMMENT ON COLUMN incoming_inventory_items.challan_number IS 'Challan number for the item';
COMMENT ON COLUMN incoming_inventory_items.challan_date IS 'Challan date for the item';

COMMIT;

