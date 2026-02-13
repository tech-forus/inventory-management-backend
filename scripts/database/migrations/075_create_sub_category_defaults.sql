-- Migration: 064_create_sub_category_defaults
-- Description: Creates sub_category_defaults table for storing default SKU field values per sub-category
-- Created: 2025-01-XX

BEGIN;

-- Create sub_category_defaults table
CREATE TABLE IF NOT EXISTS sub_category_defaults (
  id SERIAL PRIMARY KEY,
  sub_category_id INTEGER NOT NULL,
  company_id VARCHAR(6) NOT NULL,
  name VARCHAR(100) NOT NULL, -- e.g., "Standard Defaults", "Premium Line", "Budget Line"
  
  -- Tax & Category (can override sub-category defaults)
  hsn_code VARCHAR(15),
  gst_rate INTEGER CHECK (gst_rate IN (0, 5, 18)),
  
  -- Vendor & Brand
  default_vendor_id INTEGER,
  default_brand_id INTEGER,
  
  -- Product Specs
  default_unit VARCHAR(50),
  default_material VARCHAR(100),
  default_color VARCHAR(100),
  default_series VARCHAR(100),
  default_rating_size VARCHAR(100),
  default_manufacture_or_import VARCHAR(50),
  
  -- Dimensions & Weight
  default_weight VARCHAR(50),
  default_weight_unit VARCHAR(10),
  default_length VARCHAR(50),
  default_length_unit VARCHAR(10),
  default_width VARCHAR(50),
  default_width_unit VARCHAR(10),
  default_height VARCHAR(50),
  default_height_unit VARCHAR(10),
  
  -- Inventory
  default_warehouse_id INTEGER,
  default_min_stock_level INTEGER,
  
  -- Other
  default_item_details TEXT,
  default_custom_fields JSONB,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_sub_category_defaults_sub_category 
    FOREIGN KEY (sub_category_id) 
    REFERENCES sub_categories(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_sub_category_defaults_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_sub_category_defaults_vendor 
    FOREIGN KEY (default_vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE SET NULL,
  
  CONSTRAINT fk_sub_category_defaults_brand 
    FOREIGN KEY (default_brand_id) 
    REFERENCES brands(id) 
    ON DELETE SET NULL,
  
  CONSTRAINT fk_sub_category_defaults_warehouse 
    FOREIGN KEY (default_warehouse_id) 
    REFERENCES warehouses(id) 
    ON DELETE SET NULL,
  
  -- Unique constraint: company cannot have duplicate default set names for same sub-category
  CONSTRAINT unique_company_sub_category_default_name 
    UNIQUE (company_id, sub_category_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_category_defaults_sub_category_id ON sub_category_defaults(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_sub_category_defaults_company_id ON sub_category_defaults(company_id);
CREATE INDEX IF NOT EXISTS idx_sub_category_defaults_is_active ON sub_category_defaults(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_category_defaults_created_at ON sub_category_defaults(created_at);

-- Create trigger to automatically update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_sub_category_defaults_updated_at'
  ) THEN
    CREATE TRIGGER update_sub_category_defaults_updated_at
      BEFORE UPDATE ON sub_category_defaults
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE sub_category_defaults IS 'Default SKU field values for sub-categories (allows multiple default sets per sub-category)';
COMMENT ON COLUMN sub_category_defaults.name IS 'Name of the default set (e.g., "Standard", "Premium", "Budget")';
COMMENT ON COLUMN sub_category_defaults.hsn_code IS 'HSN Code override for this default set';
COMMENT ON COLUMN sub_category_defaults.gst_rate IS 'GST Rate override for this default set';
COMMENT ON COLUMN sub_category_defaults.default_vendor_id IS 'Default vendor ID for SKUs using this default set';
COMMENT ON COLUMN sub_category_defaults.default_brand_id IS 'Default brand ID for SKUs using this default set';
COMMENT ON COLUMN sub_category_defaults.default_custom_fields IS 'JSON array of custom fields [{key: string, value: string}]';

COMMIT;
