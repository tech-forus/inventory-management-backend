-- Migration: 013_create_vendor_relationships
-- Description: Creates junction tables for vendor-category and vendor-brand relationships
-- Created: 2024-12-19

BEGIN;

-- Create vendor_product_categories junction table
CREATE TABLE IF NOT EXISTS vendor_product_categories (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
  product_category_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_vendor_product_categories_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_vendor_product_categories_product_category 
    FOREIGN KEY (product_category_id) 
    REFERENCES product_categories(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: vendor cannot have duplicate product category
  CONSTRAINT unique_vendor_product_category 
    UNIQUE (vendor_id, product_category_id)
);

-- Create vendor_item_categories junction table
CREATE TABLE IF NOT EXISTS vendor_item_categories (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
  item_category_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_vendor_item_categories_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_vendor_item_categories_item_category 
    FOREIGN KEY (item_category_id) 
    REFERENCES item_categories(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: vendor cannot have duplicate item category
  CONSTRAINT unique_vendor_item_category 
    UNIQUE (vendor_id, item_category_id)
);

-- Create vendor_sub_categories junction table
CREATE TABLE IF NOT EXISTS vendor_sub_categories (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
  sub_category_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_vendor_sub_categories_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_vendor_sub_categories_sub_category 
    FOREIGN KEY (sub_category_id) 
    REFERENCES sub_categories(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: vendor cannot have duplicate sub category
  CONSTRAINT unique_vendor_sub_category 
    UNIQUE (vendor_id, sub_category_id)
);

-- Create vendor_brands junction table
CREATE TABLE IF NOT EXISTS vendor_brands (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
  brand_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_vendor_brands_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_vendor_brands_brand 
    FOREIGN KEY (brand_id) 
    REFERENCES brands(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: vendor cannot have duplicate brand
  CONSTRAINT unique_vendor_brand 
    UNIQUE (vendor_id, brand_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendor_product_categories_vendor_id ON vendor_product_categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_product_categories_product_category_id ON vendor_product_categories(product_category_id);

CREATE INDEX IF NOT EXISTS idx_vendor_item_categories_vendor_id ON vendor_item_categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_item_categories_item_category_id ON vendor_item_categories(item_category_id);

CREATE INDEX IF NOT EXISTS idx_vendor_sub_categories_vendor_id ON vendor_sub_categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_sub_categories_sub_category_id ON vendor_sub_categories(sub_category_id);

CREATE INDEX IF NOT EXISTS idx_vendor_brands_vendor_id ON vendor_brands(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_brands_brand_id ON vendor_brands(brand_id);

-- Add comments
COMMENT ON TABLE vendor_product_categories IS 'Junction table for vendor-product category relationships';
COMMENT ON TABLE vendor_item_categories IS 'Junction table for vendor-item category relationships';
COMMENT ON TABLE vendor_sub_categories IS 'Junction table for vendor-sub category relationships';
COMMENT ON TABLE vendor_brands IS 'Junction table for vendor-brand relationships';

COMMIT;

