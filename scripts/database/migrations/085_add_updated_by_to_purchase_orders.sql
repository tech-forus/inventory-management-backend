-- Migration: 085_add_updated_by_to_purchase_orders
-- Description: Adds updated_by column to purchase_orders
-- Created: 2026-02-18

BEGIN;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

COMMIT;
