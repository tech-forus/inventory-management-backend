-- Migration: 032_create_transportors_table
-- Description: Creates transportors table for managing transportor/logistics information
-- Created: 2024-12-19

BEGIN;

-- Create transportors table
CREATE TABLE IF NOT EXISTS transportors (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  transporter_name VARCHAR(255) NOT NULL,
  contact_person_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  email_id VARCHAR(255) NOT NULL,
  gst_number VARCHAR(50) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  capacity VARCHAR(100) NOT NULL,
  pricing_type VARCHAR(50) NOT NULL,
  rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_transportors_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transportors_company_id ON transportors(company_id);
CREATE INDEX IF NOT EXISTS idx_transportors_transporter_name ON transportors(transporter_name);
CREATE INDEX IF NOT EXISTS idx_transportors_email_id ON transportors(email_id);
CREATE INDEX IF NOT EXISTS idx_transportors_gst_number ON transportors(gst_number);
CREATE INDEX IF NOT EXISTS idx_transportors_is_active ON transportors(is_active);
CREATE INDEX IF NOT EXISTS idx_transportors_created_at ON transportors(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transportors_updated_at
    BEFORE UPDATE ON transportors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE transportors IS 'Stores transportor and logistics partner information';
COMMENT ON COLUMN transportors.transporter_name IS 'Name of the transportor company';
COMMENT ON COLUMN transportors.contact_person_name IS 'Name of the contact person';
COMMENT ON COLUMN transportors.contact_number IS 'Contact phone number';
COMMENT ON COLUMN transportors.email_id IS 'Email address';
COMMENT ON COLUMN transportors.gst_number IS 'GST identification number';
COMMENT ON COLUMN transportors.vehicle_type IS 'Type of vehicle (e.g., Truck, Van, Container)';
COMMENT ON COLUMN transportors.capacity IS 'Vehicle capacity (e.g., 5 tons, 10 tons)';
COMMENT ON COLUMN transportors.pricing_type IS 'Pricing model (Per KM, Per Trip, Per Ton, Fixed)';
COMMENT ON COLUMN transportors.rate IS 'Rate based on pricing type';

COMMIT;

