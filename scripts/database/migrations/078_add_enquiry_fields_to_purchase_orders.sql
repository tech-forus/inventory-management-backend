-- Migration: 078_add_enquiry_fields_to_purchase_orders
-- Description: Adds enquiry_number, type, and vendor_id to purchase_orders
-- Created: 2026-02-18

BEGIN;

-- Add type column: 'po' for purchase orders, 'enquiry' for enquiries
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'po';

-- Add enquiry_number column (only populated when type = 'enquiry')
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS enquiry_number VARCHAR(50);

-- Add vendor_id column (optional, used for POs with a single vendor)
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL;

-- Index for enquiry_number lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_enquiry_number ON purchase_orders(enquiry_number);

-- Index for status filtering (open/pending POs)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_type ON purchase_orders(type);

COMMIT;
