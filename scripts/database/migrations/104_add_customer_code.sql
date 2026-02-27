-- Migration: 104_add_customer_code
-- Description: Adds customer_code column (CUST-001, POT-001) with per-company sequences
-- POT customers get POT-XXX, existing customers get CUST-XXX
-- When a customer is promoted from potential to existing, their code changes from POT to CUST
-- Created: 2026-02-27

BEGIN;

-- Add customer_code column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(20);

-- Create a table to track the next counter per company per prefix
CREATE TABLE IF NOT EXISTS customer_code_sequences (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    prefix VARCHAR(10) NOT NULL,  -- 'CUST' or 'POT'
    next_val INTEGER NOT NULL DEFAULT 1,
    UNIQUE(company_id, prefix)
);

-- Function to generate next customer code atomically
CREATE OR REPLACE FUNCTION generate_customer_code(p_company_id VARCHAR, p_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_next_val INTEGER;
    v_code VARCHAR;
BEGIN
    -- Insert or increment the counter atomically
    INSERT INTO customer_code_sequences (company_id, prefix, next_val)
    VALUES (p_company_id, p_prefix, 2)
    ON CONFLICT (company_id, prefix)
    DO UPDATE SET next_val = customer_code_sequences.next_val + 1
    RETURNING next_val - 1 INTO v_next_val;  -- Return the value BEFORE increment
    
    -- Format as PREFIX-001
    v_code := p_prefix || '-' || LPAD(v_next_val::TEXT, 3, '0');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing customers with codes
-- First, existing customers get CUST codes
DO $$
DECLARE
    r RECORD;
    v_code VARCHAR;
BEGIN
    FOR r IN 
        SELECT id, company_id 
        FROM customers 
        WHERE customer_stage = 'existing' AND (customer_code IS NULL OR customer_code = '')
        ORDER BY created_at ASC
    LOOP
        v_code := generate_customer_code(r.company_id, 'CUST');
        UPDATE customers SET customer_code = v_code WHERE id = r.id;
    END LOOP;
    
    -- Then, potential customers get POT codes
    FOR r IN 
        SELECT id, company_id 
        FROM customers 
        WHERE (customer_stage = 'potential' OR customer_stage IS NULL) AND (customer_code IS NULL OR customer_code = '')
        ORDER BY created_at ASC
    LOOP
        v_code := generate_customer_code(r.company_id, 'POT');
        UPDATE customers SET customer_code = v_code WHERE id = r.id;
    END LOOP;
END $$;

-- Create index for fast lookup by customer_code
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);

COMMIT;
