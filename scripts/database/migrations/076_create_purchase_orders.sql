-- Migration: 076_create_purchase_orders
-- Description: Creates purchase_orders table
-- Created: 2026-02-11

BEGIN;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  po_number VARCHAR(50) NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Created',
  items JSONB DEFAULT '[]'::jsonb,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);

COMMIT;
