-- Migration: 087_add_customer_type_and_source
-- Description: Adds customer_type and source columns to customers table for the enhanced customer form
-- Created: 2026-02-19

BEGIN;

-- Add customer_type column (Individual, Business, Dealer, Distributor, Contractor)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50);

-- Add source column (how the customer heard about us)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Add comments
COMMENT ON COLUMN customers.customer_type IS 'Customer type: Individual, Business, Dealer, Distributor, Contractor';
COMMENT ON COLUMN customers.source IS 'How the customer heard about us: Referral, Walk-in, Google, Instagram, Facebook, Exhibition, Other';

COMMIT;
