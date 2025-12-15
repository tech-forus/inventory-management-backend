-- Migration: 006_create_item_categories
-- Description: Creates item_categories table for item classification under product categories
-- Created: 2024-11-18

BEGIN;

-- Create item_categories table
CREATE TABLE IF NOT EXISTS item_categories (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  product_category_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_item_categories_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_item_categories_product_category 
    FOREIGN KEY (product_category_id) 
    REFERENCES product_categories(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate item category names under same product category
  CONSTRAINT unique_company_item_category 
    UNIQUE (company_id, product_category_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_item_categories_company_id ON item_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_product_category_id ON item_categories(product_category_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_is_active ON item_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_item_categories_created_at ON item_categories(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_item_categories_updated_at
    BEFORE UPDATE ON item_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE item_categories IS 'Item categories under product categories (e.g., LED Drivers, LED Lights)';
COMMENT ON COLUMN item_categories.product_category_id IS 'Foreign key to product_categories table';

COMMIT;

