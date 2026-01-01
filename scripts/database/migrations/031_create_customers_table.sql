-- Migration: Create customers table
-- Description: Creates the customers table for managing customer information

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    
    -- Basic Information
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Contact Information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Business Information
    company_name VARCHAR(255),
    gst_number VARCHAR(50),
    tax_id VARCHAR(50),
    
    -- Financial Information
    credit_limit DECIMAL(15, 2) DEFAULT 0.00,
    outstanding_balance DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Stores customer information for sales and order management';
COMMENT ON COLUMN customers.customer_name IS 'Full name of the customer';
COMMENT ON COLUMN customers.company_name IS 'Company name if customer is a business';
COMMENT ON COLUMN customers.credit_limit IS 'Maximum credit allowed for this customer';
COMMENT ON COLUMN customers.outstanding_balance IS 'Current outstanding balance';
