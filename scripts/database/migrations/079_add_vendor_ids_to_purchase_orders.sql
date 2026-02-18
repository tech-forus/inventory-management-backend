-- Migration: 079_add_vendor_ids_to_purchase_orders
-- Description: Adds vendor_ids column to purchase_orders for multi-vendor enquiries
-- Created: 2026-02-18

BEGIN;

-- Add vendor_ids column (JSONB or JSON) to store multiple vendor IDs
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_ids JSONB DEFAULT '[]';

COMMIT;
