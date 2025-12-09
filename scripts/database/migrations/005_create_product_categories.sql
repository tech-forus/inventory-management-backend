-- Migration: 005_create_product_categories
-- Description: Creates product_categories table for main inventory groups
-- Created: 2024-11-18

BEGIN;

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_product_categories_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate category names
  CONSTRAINT unique_company_product_category 
    UNIQUE (company_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_company_id ON product_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_created_at ON product_categories(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE product_categories IS 'Main product category groups (e.g., Finished Goods, Raw Materials)';
COMMENT ON COLUMN product_categories.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN product_categories.name IS 'Product category name (unique per company)';

COMMIT;

