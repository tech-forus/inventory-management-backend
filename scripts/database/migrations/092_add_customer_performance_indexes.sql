-- Migration: Add index for customer performance
-- Description: Adds descending index on created_at for faster sorted queries

CREATE INDEX IF NOT EXISTS idx_customers_created_at_desc ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active, created_at DESC);
