-- Migration: 048_create_warehouses
-- Description: Creates warehouses table for warehouse management
-- Created: 2026-01-07

BEGIN;

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  warehouse_name VARCHAR(255) NOT NULL,
  warehouse_code VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  is_default BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_warehouses_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate warehouse names
  CONSTRAINT unique_company_warehouse_name 
    UNIQUE (company_id, warehouse_name),
  
  -- Unique constraint: company cannot have duplicate warehouse codes (if provided)
  CONSTRAINT unique_company_warehouse_code 
    UNIQUE (company_id, warehouse_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_default ON warehouses(is_default);
CREATE INDEX IF NOT EXISTS idx_warehouses_created_at ON warehouses(created_at);
CREATE INDEX IF NOT EXISTS idx_warehouses_warehouse_code ON warehouses(warehouse_code);

-- Create trigger to automatically update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_warehouses_updated_at'
  ) THEN
    CREATE TRIGGER update_warehouses_updated_at
      BEFORE UPDATE ON warehouses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE warehouses IS 'Stores warehouse information for inventory management';
COMMENT ON COLUMN warehouses.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN warehouses.warehouse_name IS 'Warehouse name (unique per company)';
COMMENT ON COLUMN warehouses.warehouse_code IS 'Optional warehouse code (unique per company)';
COMMENT ON COLUMN warehouses.is_default IS 'Whether this is the default warehouse for the company';
COMMENT ON COLUMN warehouses.status IS 'Warehouse status: active or inactive';

COMMIT;



