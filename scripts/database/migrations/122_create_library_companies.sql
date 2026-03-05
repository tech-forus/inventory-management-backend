-- Migration: 122_create_library_companies
-- Description: Creates tables for external companies (those you deal with) and their units
-- Created: 2024-03-05

BEGIN;

-- 1. Create library_companies table (for the organizations you deal with)
CREATE TABLE IF NOT EXISTS library_companies (
    id SERIAL PRIMARY KEY,
    tenant_company_id VARCHAR(10) NOT NULL, -- The company using the software (e.g. FEPL)
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(10) NOT NULL, -- The unique initials (e.g. TMPL)
    company_type VARCHAR(50), -- Customer, Vendor, Transporter, etc.
    gst_number VARCHAR(15),
    registration_type VARCHAR(50), -- Pvt Ltd, LLP, etc.
    billing_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    created_by INTEGER, -- The user who created this company
    
    UNIQUE(tenant_company_id, company_code), -- Safe initials per tenant
    UNIQUE(tenant_company_id, gst_number)    -- Unique GST per tenant
);

-- 2. Create library_company_units table (Warehouses/Branches of those companies)
CREATE TABLE IF NOT EXISTS library_company_units (
    id SERIAL PRIMARY KEY,
    library_company_id INTEGER REFERENCES library_companies(id) ON DELETE CASCADE,
    unit_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create customer_id_counters table (for the professional sequence generation)
CREATE TABLE IF NOT EXISTS customer_id_counters (
    library_company_id INTEGER REFERENCES library_companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    last_seq INTEGER DEFAULT 0,
    PRIMARY KEY (library_company_id, year, month)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lib_comp_tenant ON library_companies(tenant_company_id);
CREATE INDEX IF NOT EXISTS idx_lib_comp_code ON library_companies(company_code);
CREATE INDEX IF NOT EXISTS idx_lib_unit_comp ON library_company_units(library_company_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lib_companies_updated_at
    BEFORE UPDATE ON library_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lib_company_units_updated_at
    BEFORE UPDATE ON library_company_units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
