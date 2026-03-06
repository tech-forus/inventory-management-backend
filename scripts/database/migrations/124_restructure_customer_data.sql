-- Migration: 124_restructure_customer_data
-- Description: Creates hierarchical tables for companies, contacts, and delivery addresses.
-- Created: 2026-03-06

BEGIN;

-- 1. Create customer_companies table
CREATE TABLE IF NOT EXISTS customer_companies (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(10) NOT NULL, -- Tenant ID
    unit_id INTEGER, -- Optional branch ID
    name VARCHAR(255) NOT NULL,
    customer_code VARCHAR(50),
    customer_type VARCHAR(50), -- Industry, OEM, Dealer, etc.
    customer_stage VARCHAR(50), -- Potential, Existing
    gst_number VARCHAR(15),
    billing_address TEXT,
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_pin VARCHAR(10),
    credit_period INTEGER DEFAULT 0,
    payment_terms VARCHAR(100),
    loyalty_tier VARCHAR(50),
    tags JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, name),
    UNIQUE(company_id, customer_code)
);

-- 2. Create customer_contacts table
CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_company_id INTEGER REFERENCES customer_companies(id) ON DELETE CASCADE,
    company_id VARCHAR(10) NOT NULL, -- Tenant ID
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    phone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 3. Create customer_consignee_addresses table
CREATE TABLE IF NOT EXISTS customer_consignee_addresses (
    id SERIAL PRIMARY KEY,
    customer_company_id INTEGER REFERENCES customer_companies(id) ON DELETE CASCADE,
    label VARCHAR(100), -- e.g., "Mumbai Factory"
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    pin VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cust_comp_tenant ON customer_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_cust_contact_comp ON customer_contacts(customer_company_id);
CREATE INDEX IF NOT EXISTS idx_cust_addr_comp ON customer_consignee_addresses(customer_company_id);

-- Trigger for updated_at
CREATE TRIGGER update_customer_companies_updated_at
    BEFORE UPDATE ON customer_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_contacts_updated_at
    BEFORE UPDATE ON customer_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_consignee_addresses_updated_at
    BEFORE UPDATE ON customer_consignee_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
