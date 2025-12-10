-- Migration: 025_create_customers
-- Description: Creates customers table for customer information
-- Created: 2024-12-10

BEGIN;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(10) NOT NULL,
  company_name VARCHAR(255),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email_id VARCHAR(255),
  gst_number VARCHAR(15),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pin VARCHAR(6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_customers_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate customer names
  CONSTRAINT unique_company_customer_name 
    UNIQUE (company_id, customer_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_gst_number ON customers(gst_number);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE customers IS 'Customer information for inventory management';
COMMENT ON COLUMN customers.company_id IS 'Foreign key to companies table';

COMMIT;

