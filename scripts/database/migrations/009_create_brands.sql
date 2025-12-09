-- Migration: 009_create_brands
-- Description: Creates brands table for product brand information
-- Created: 2024-11-18

BEGIN;

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_brands_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate brand names
  CONSTRAINT unique_company_brand_name 
    UNIQUE (company_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brands_created_at ON brands(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE brands IS 'Product brand information';
COMMENT ON COLUMN brands.company_id IS 'Foreign key to companies table';

COMMIT;

