-- Migration: Add GST fields to incoming and outgoing inventory items
-- Description: Adds GST percentage, GST amount, and total value (incl GST) fields
--               Standardizes GST calculation across the system

-- Add GST fields to incoming_inventory_items
ALTER TABLE incoming_inventory_items
ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value_excl_gst DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value_incl_gst DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Update existing records: Calculate GST from total_value
-- Assuming total_value currently includes GST, we'll backfill
-- For existing records, we'll set gst_percentage to 0 and total_value_incl_gst = total_value
UPDATE incoming_inventory_items
SET 
  gst_percentage = 0,
  gst_amount = 0,
  total_value_excl_gst = total_value,
  total_value_incl_gst = total_value
WHERE gst_percentage IS NULL OR gst_percentage = 0;

-- Add GST fields to outgoing_inventory_items
ALTER TABLE outgoing_inventory_items
ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value_excl_gst DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value_incl_gst DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Update existing records: Calculate GST from total_value
-- Assuming total_value currently includes GST, we'll backfill
-- For existing records, we'll set gst_percentage to 0 and total_value_incl_gst = total_value
UPDATE outgoing_inventory_items
SET 
  gst_percentage = 0,
  gst_amount = 0,
  total_value_excl_gst = total_value,
  total_value_incl_gst = total_value
WHERE gst_percentage IS NULL OR gst_percentage = 0;

-- Update total_value to be total_value_incl_gst for consistency
-- This ensures total_value always represents the final amount including GST
UPDATE incoming_inventory_items
SET total_value = total_value_incl_gst
WHERE total_value != total_value_incl_gst;

UPDATE outgoing_inventory_items
SET total_value = total_value_incl_gst
WHERE total_value != total_value_incl_gst;

-- Add comments for documentation
COMMENT ON COLUMN incoming_inventory_items.gst_percentage IS 'GST percentage applied (0, 5, 18, 28)';
COMMENT ON COLUMN incoming_inventory_items.gst_amount IS 'GST amount calculated from base value';
COMMENT ON COLUMN incoming_inventory_items.total_value_excl_gst IS 'Total value excluding GST (quantity * unit_price)';
COMMENT ON COLUMN incoming_inventory_items.total_value_incl_gst IS 'Total value including GST (excl_gst + gst_amount)';
COMMENT ON COLUMN incoming_inventory_items.total_value IS 'Final total value (same as total_value_incl_gst for consistency)';

COMMENT ON COLUMN outgoing_inventory_items.gst_percentage IS 'GST percentage applied (0, 5, 18, 28)';
COMMENT ON COLUMN outgoing_inventory_items.gst_amount IS 'GST amount calculated from base value';
COMMENT ON COLUMN outgoing_inventory_items.total_value_excl_gst IS 'Total value excluding GST (quantity * unit_price)';
COMMENT ON COLUMN outgoing_inventory_items.total_value_incl_gst IS 'Total value including GST (excl_gst + gst_amount)';
COMMENT ON COLUMN outgoing_inventory_items.total_value IS 'Final total value (same as total_value_incl_gst for consistency)';

