-- Migration: 053_make_vendor_brand_nullable_in_incoming_inventory
-- Description: Makes vendor_id and brand_id nullable in incoming_inventory table to support customer suppliers
-- Created: 2026-01-08

BEGIN;

-- Make vendor_id nullable (remove NOT NULL constraint)
-- This allows incoming inventory to be created with customers as suppliers
ALTER TABLE incoming_inventory
  ALTER COLUMN vendor_id DROP NOT NULL;

-- Make brand_id nullable (remove NOT NULL constraint)
-- Brand is only required when vendor is selected, not for customers
ALTER TABLE incoming_inventory
  ALTER COLUMN brand_id DROP NOT NULL;

-- Update foreign key constraints to handle NULL values properly
-- The existing constraints should already work with NULL, but we ensure they're set correctly
-- Note: Foreign keys with NULL values are automatically skipped by PostgreSQL

-- Add a check constraint to ensure at least one supplier identifier is present
-- Either vendor_id OR destination_id must be provided (unless it's a transfer_note)
-- We'll handle this in application logic, but add a database-level check for safety
-- Note: This check is complex because transfer_note might have different rules
-- So we'll rely on application-level validation for this

COMMENT ON COLUMN incoming_inventory.vendor_id IS 'Vendor ID when supplier is a vendor. NULL when supplier is a customer.';
COMMENT ON COLUMN incoming_inventory.brand_id IS 'Brand ID when vendor is selected. NULL when supplier is a customer.';
COMMENT ON COLUMN incoming_inventory.destination_id IS 'Customer ID when supplier is a customer. NULL when supplier is a vendor.';
COMMENT ON COLUMN incoming_inventory.destination_type IS 'Type of supplier: vendor or customer. Determines which ID field is used.';

COMMIT;
