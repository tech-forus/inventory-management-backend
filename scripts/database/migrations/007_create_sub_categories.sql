-- Migration: 007_create_sub_categories
-- Description: Creates sub_categories table for optional sub-classification
-- Created: 2024-11-18

BEGIN;

-- Create sub_categories table
CREATE TABLE IF NOT EXISTS sub_categories (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  item_category_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_sub_categories_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_sub_categories_item_category 
    FOREIGN KEY (item_category_id) 
    REFERENCES item_categories(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate sub category names under same item category
  CONSTRAINT unique_company_sub_category 
    UNIQUE (company_id, item_category_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_categories_company_id ON sub_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_item_category_id ON sub_categories(item_category_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_is_active ON sub_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_categories_created_at ON sub_categories(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_sub_categories_updated_at
    BEFORE UPDATE ON sub_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE sub_categories IS 'Optional sub-categories under item categories (e.g., Indoor LED, Outdoor LED)';
COMMENT ON COLUMN sub_categories.item_category_id IS 'Foreign key to item_categories table';

COMMIT;

