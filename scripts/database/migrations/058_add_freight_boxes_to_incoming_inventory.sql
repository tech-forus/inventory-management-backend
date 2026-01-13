-- Migration: 058_add_freight_boxes_to_incoming_inventory
-- Description: Adds freight_amount, number_of_boxes, and received_boxes columns to incoming_inventory table
-- Created: 2025-01-XX

BEGIN;

-- Add freight_amount column to incoming_inventory table
ALTER TABLE incoming_inventory
  ADD COLUMN IF NOT EXISTS freight_amount DECIMAL(15, 2) DEFAULT 0;

-- Add number_of_boxes column to incoming_inventory table
ALTER TABLE incoming_inventory
  ADD COLUMN IF NOT EXISTS number_of_boxes INTEGER DEFAULT 0;

-- Add received_boxes column to incoming_inventory table
ALTER TABLE incoming_inventory
  ADD COLUMN IF NOT EXISTS received_boxes INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN incoming_inventory.freight_amount IS 'Freight/transportation amount for the entire invoice';
COMMENT ON COLUMN incoming_inventory.number_of_boxes IS 'Total number of boxes in the shipment';
COMMENT ON COLUMN incoming_inventory.received_boxes IS 'Number of boxes actually received';

COMMIT;
