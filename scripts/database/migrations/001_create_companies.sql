-- Migration: 001_create_companies
-- Description: Creates the companies table for company registration
-- Created: 2024-11-18

BEGIN;

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  gst_number VARCHAR(15) UNIQUE NOT NULL,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('Manufacturing', 'Trading', 'Retail')),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pin VARCHAR(6) NOT NULL CHECK (pin ~ '^[0-9]{6}$'),
  phone VARCHAR(10) NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_gst ON companies(gst_number);
CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_business_type ON companies(business_type);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns
COMMENT ON TABLE companies IS 'Stores company registration information';
COMMENT ON COLUMN companies.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN companies.company_id IS 'Unique 6-letter alphabetic Company ID (SKU)';
COMMENT ON COLUMN companies.company_name IS 'Legal name of the company';
COMMENT ON COLUMN companies.gst_number IS 'GST identification number (15 characters, unique)';
COMMENT ON COLUMN companies.business_type IS 'Type of business: Manufacturing, Trading, or Retail';
COMMENT ON COLUMN companies.address IS 'Company address';
COMMENT ON COLUMN companies.city IS 'City where company is located';
COMMENT ON COLUMN companies.state IS 'State where company is located';
COMMENT ON COLUMN companies.pin IS 'PIN code (6 digits)';
COMMENT ON COLUMN companies.phone IS 'Company phone number (10 digits)';
COMMENT ON COLUMN companies.website IS 'Company website URL (optional)';
COMMENT ON COLUMN companies.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN companies.updated_at IS 'Timestamp when record was last updated';

COMMIT;

