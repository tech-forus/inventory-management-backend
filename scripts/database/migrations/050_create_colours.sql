-- Migration: 050_create_colours
-- Description: Creates colours table for color management
-- Created: 2026-01-07

BEGIN;

-- Create colours table
CREATE TABLE IF NOT EXISTS colours (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  hex_code VARCHAR(7),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_colours_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate color names
  CONSTRAINT unique_company_colour_name 
    UNIQUE (company_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_colours_company_id ON colours(company_id);
CREATE INDEX IF NOT EXISTS idx_colours_is_active ON colours(is_active);
CREATE INDEX IF NOT EXISTS idx_colours_created_at ON colours(created_at);

-- Create trigger to automatically update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_colours_updated_at'
  ) THEN
    CREATE TRIGGER update_colours_updated_at
      BEFORE UPDATE ON colours
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE colours IS 'Stores color options for products';
COMMENT ON COLUMN colours.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN colours.name IS 'Color name (unique per company)';
COMMENT ON COLUMN colours.hex_code IS 'Optional hex color code (e.g., #FF5733)';

COMMIT;



