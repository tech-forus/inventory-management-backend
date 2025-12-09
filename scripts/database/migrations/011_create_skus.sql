-- Migration: 011_create_skus
-- Description: Creates skus table for SKU management
-- Created: 2024-11-18

BEGIN;

-- Create skus table
CREATE TABLE IF NOT EXISTS skus (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  sku_id VARCHAR(14) NOT NULL UNIQUE,
  product_category_id INTEGER NOT NULL,
  item_category_id INTEGER NOT NULL,
  sub_category_id INTEGER,
  item_name VARCHAR(255) NOT NULL,
  item_details TEXT,
  vendor_id INTEGER NOT NULL,
  vendor_item_code VARCHAR(100),
  brand_id INTEGER NOT NULL,
  hsn_sac_code VARCHAR(15),
  rating_size VARCHAR(50),
  model VARCHAR(100),
  series VARCHAR(100),
  unit VARCHAR(20) NOT NULL,
  -- Optional specifications
  material VARCHAR(100),
  insulation VARCHAR(100),
  input_supply VARCHAR(100),
  color VARCHAR(50),
  cri VARCHAR(20),
  cct VARCHAR(20),
  beam_angle VARCHAR(20),
  led_type VARCHAR(50),
  shape VARCHAR(50),
  -- Dimensions
  weight DECIMAL(10, 2),
  length DECIMAL(10, 2),
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),
  -- Inventory settings
  min_stock_level INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER,
  default_storage_location VARCHAR(255),
  current_stock INTEGER NOT NULL DEFAULT 0,
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'inactive')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_skus_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_skus_product_category 
    FOREIGN KEY (product_category_id) 
    REFERENCES product_categories(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_skus_item_category 
    FOREIGN KEY (item_category_id) 
    REFERENCES item_categories(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_skus_sub_category 
    FOREIGN KEY (sub_category_id) 
    REFERENCES sub_categories(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_skus_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_skus_brand 
    FOREIGN KEY (brand_id) 
    REFERENCES brands(id) 
    ON DELETE RESTRICT,
  
  -- Unique constraint: company cannot have duplicate SKU IDs
  CONSTRAINT unique_company_sku_id 
    UNIQUE (company_id, sku_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_skus_company_id ON skus(company_id);
CREATE INDEX IF NOT EXISTS idx_skus_sku_id ON skus(sku_id);
CREATE INDEX IF NOT EXISTS idx_skus_product_category_id ON skus(product_category_id);
CREATE INDEX IF NOT EXISTS idx_skus_item_category_id ON skus(item_category_id);
CREATE INDEX IF NOT EXISTS idx_skus_vendor_id ON skus(vendor_id);
CREATE INDEX IF NOT EXISTS idx_skus_brand_id ON skus(brand_id);
CREATE INDEX IF NOT EXISTS idx_skus_status ON skus(status);
CREATE INDEX IF NOT EXISTS idx_skus_is_active ON skus(is_active);
CREATE INDEX IF NOT EXISTS idx_skus_current_stock ON skus(current_stock);
CREATE INDEX IF NOT EXISTS idx_skus_created_at ON skus(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_skus_updated_at
    BEFORE UPDATE ON skus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE skus IS 'SKU (Stock Keeping Unit) master data';
COMMENT ON COLUMN skus.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN skus.sku_id IS 'Unique SKU identifier: 6 chars company ID + 8 chars alphanumeric (14 chars total)';
COMMENT ON COLUMN skus.current_stock IS 'Current stock quantity';
COMMENT ON COLUMN skus.min_stock_level IS 'Minimum stock level (reorder threshold)';
COMMENT ON COLUMN skus.reorder_point IS 'Reorder point (minimum stock level)';

COMMIT;

