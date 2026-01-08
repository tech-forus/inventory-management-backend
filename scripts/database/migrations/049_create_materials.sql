-- Migration: 049_create_materials
-- Description: Creates materials table for material types (Gold, Silver, Copper, etc.)
-- Created: 2026-01-07

BEGIN;

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_materials_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate material names
  CONSTRAINT unique_company_material_name 
    UNIQUE (company_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_materials_company_id ON materials(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at);

-- Create trigger to automatically update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_materials_updated_at'
  ) THEN
    CREATE TRIGGER update_materials_updated_at
      BEFORE UPDATE ON materials
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE materials IS 'Stores material types (e.g., Gold, Silver, Copper)';
COMMENT ON COLUMN materials.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN materials.name IS 'Material name (unique per company)';

COMMIT;



