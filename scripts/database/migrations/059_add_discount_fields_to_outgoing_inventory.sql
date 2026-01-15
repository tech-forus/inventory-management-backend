-- Migration: 059_add_discount_fields_to_outgoing_inventory
-- Description: Adds dual-level discount support (SKU + Invoice level), freight, and boxes fields to outgoing_inventory tables
-- Created: 2025-01-15

BEGIN;

-- ============================================================================
-- PART 1: Add fields to outgoing_inventory (header/master table)
-- ============================================================================

-- Add freight amount column
ALTER TABLE outgoing_inventory
  ADD COLUMN IF NOT EXISTS freight_amount DECIMAL(15, 2) DEFAULT 0;

-- Add boxes columns
ALTER TABLE outgoing_inventory
  ADD COLUMN IF NOT EXISTS number_of_boxes INTEGER DEFAULT 0;

ALTER TABLE outgoing_inventory
  ADD COLUMN IF NOT EXISTS received_boxes INTEGER DEFAULT 0;

-- Add invoice-level discount columns
ALTER TABLE outgoing_inventory
  ADD COLUMN IF NOT EXISTS invoice_level_discount DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE outgoing_inventory
  ADD COLUMN IF NOT EXISTS invoice_level_discount_type VARCHAR(20) DEFAULT 'percentage';

-- Add comments for documentation
COMMENT ON COLUMN outgoing_inventory.freight_amount IS 'Freight/transportation amount for the entire invoice';
COMMENT ON COLUMN outgoing_inventory.number_of_boxes IS 'Total number of boxes in the shipment';
COMMENT ON COLUMN outgoing_inventory.received_boxes IS 'Number of boxes actually received';
COMMENT ON COLUMN outgoing_inventory.invoice_level_discount IS 'Invoice-level discount value (percentage or flat amount)';
COMMENT ON COLUMN outgoing_inventory.invoice_level_discount_type IS 'Type of invoice discount: percentage or flat';

-- ============================================================================
-- PART 2: Add fields to outgoing_inventory_items (line items table)
-- ============================================================================

-- Add GST percentage column (if not exists from earlier migration)
ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) DEFAULT 0;

-- Add SKU-level discount columns
ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS sku_discount DECIMAL(5, 2) DEFAULT 0;

ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS sku_discount_amount DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS amount_after_sku_discount DECIMAL(15, 2) DEFAULT 0;

-- Add invoice-level discount distribution columns
ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS invoice_discount_share DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS final_taxable_amount DECIMAL(15, 2) DEFAULT 0;

-- Add GST calculation columns
ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS total_excl_gst DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE outgoing_inventory_items
  ADD COLUMN IF NOT EXISTS total_incl_gst DECIMAL(15, 2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN outgoing_inventory_items.gst_percentage IS 'GST rate percentage for this item';
COMMENT ON COLUMN outgoing_inventory_items.sku_discount IS 'SKU-level discount percentage (0-100)';
COMMENT ON COLUMN outgoing_inventory_items.sku_discount_amount IS 'Calculated SKU discount amount in currency';
COMMENT ON COLUMN outgoing_inventory_items.amount_after_sku_discount IS 'Amount after applying SKU-level discount';
COMMENT ON COLUMN outgoing_inventory_items.invoice_discount_share IS 'Proportional share of invoice-level discount for this item';
COMMENT ON COLUMN outgoing_inventory_items.final_taxable_amount IS 'Final taxable amount after both SKU and invoice discounts';
COMMENT ON COLUMN outgoing_inventory_items.total_excl_gst IS 'Total amount excluding GST (same as final_taxable_amount for compatibility)';
COMMENT ON COLUMN outgoing_inventory_items.gst_amount IS 'Calculated GST amount';
COMMENT ON COLUMN outgoing_inventory_items.total_incl_gst IS 'Final total including GST';

-- ============================================================================
-- PART 3: Update existing records with default values
-- ============================================================================

-- Update outgoing_inventory existing records
UPDATE outgoing_inventory
SET
  freight_amount = 0,
  number_of_boxes = 0,
  received_boxes = 0,
  invoice_level_discount = 0,
  invoice_level_discount_type = 'percentage'
WHERE
  freight_amount IS NULL
  OR invoice_level_discount IS NULL;

-- Update outgoing_inventory_items existing records
-- Calculate basic values from existing unit_price and outgoing_quantity
UPDATE outgoing_inventory_items
SET
  gst_percentage = COALESCE(gst_percentage, 0),
  sku_discount = 0,
  sku_discount_amount = 0,
  amount_after_sku_discount = COALESCE(unit_price * outgoing_quantity, 0),
  invoice_discount_share = 0,
  final_taxable_amount = COALESCE(unit_price * outgoing_quantity, 0),
  total_excl_gst = COALESCE(unit_price * outgoing_quantity, 0),
  gst_amount = 0,
  total_incl_gst = COALESCE(unit_price * outgoing_quantity, 0)
WHERE
  amount_after_sku_discount IS NULL
  OR final_taxable_amount IS NULL;

-- ============================================================================
-- PART 4: Add validation constraints
-- ============================================================================

-- Ensure invoice_level_discount_type is valid
ALTER TABLE outgoing_inventory
  ADD CONSTRAINT check_invoice_discount_type
  CHECK (invoice_level_discount_type IN ('percentage', 'flat'));

-- Ensure percentages are within valid range (0-100)
ALTER TABLE outgoing_inventory_items
  ADD CONSTRAINT check_sku_discount_range
  CHECK (sku_discount >= 0 AND sku_discount <= 100);

ALTER TABLE outgoing_inventory_items
  ADD CONSTRAINT check_gst_percentage_range
  CHECK (gst_percentage >= 0 AND gst_percentage <= 100);

-- Ensure discount amounts and totals are non-negative
ALTER TABLE outgoing_inventory
  ADD CONSTRAINT check_freight_amount_positive
  CHECK (freight_amount >= 0);

ALTER TABLE outgoing_inventory
  ADD CONSTRAINT check_invoice_discount_positive
  CHECK (invoice_level_discount >= 0);

ALTER TABLE outgoing_inventory_items
  ADD CONSTRAINT check_sku_discount_amount_positive
  CHECK (sku_discount_amount >= 0);

-- ============================================================================
-- PART 5: Create indexes for performance
-- ============================================================================

-- Add index on invoice_level_discount_type for filtering
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_discount_type
  ON outgoing_inventory(invoice_level_discount_type);

-- Add index on gst_percentage for tax reporting
CREATE INDEX IF NOT EXISTS idx_outgoing_items_gst_percentage
  ON outgoing_inventory_items(gst_percentage);

COMMIT;

-- ============================================================================
-- Migration Notes:
-- ============================================================================
-- This migration adds comprehensive discount support to outgoing inventory:
--
-- 1. SKU-Level Discount: Applied per item before invoice discount
-- 2. Invoice-Level Discount: Applied to subtotal, distributed proportionally
-- 3. Freight: Added to final total with GST calculation
-- 4. Boxes: Tracking for shipment reconciliation
--
-- Calculation Flow:
-- 1. Base Amount = quantity × unit_price
-- 2. SKU Discount = base_amount × (sku_discount / 100)
-- 3. After SKU Discount = base_amount - sku_discount_amount
-- 4. Subtotal = sum of all after_sku_discount
-- 5. Invoice Discount = proportionally distributed to items
-- 6. Final Taxable = after_sku_discount - invoice_discount_share
-- 7. GST = final_taxable × (gst_percentage / 100)
-- 8. Total = final_taxable + gst_amount
--
-- Freight is handled at invoice level with GST calculated using max GST rate
