-- Migration: 008_create_vendors
-- Description: Creates vendors table for supplier information
-- Created: 2024-11-18

BEGIN;

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  gst_number VARCHAR(15),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pin VARCHAR(6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_vendors_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate vendor names
  CONSTRAINT unique_company_vendor_name 
    UNIQUE (company_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_gst_number ON vendors(gst_number);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE vendors IS 'Vendor/supplier information for inventory management';
COMMENT ON COLUMN vendors.company_id IS 'Foreign key to companies table';

COMMIT;

