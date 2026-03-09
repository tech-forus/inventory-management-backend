-- Migration: 130_add_customer_units_and_codes
-- Description: Adds customer_units table, updates codes, and adds hierarchical generation functions.
-- Created: 2026-03-09

BEGIN;

-- 1. Units table
CREATE TABLE IF NOT EXISTS customer_units (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES customer_companies(id) ON DELETE CASCADE,
  unit_name VARCHAR(255) NOT NULL,
  unit_code VARCHAR(50) NOT NULL,  -- e.g. FEPL/CID/001/U01
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(unit_code)
);

-- 2. Add columns to existing tables (handling cases where they might already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_companies' AND column_name='customer_code') THEN
        ALTER TABLE customer_companies ADD COLUMN customer_code VARCHAR(50);
    END IF;
    
    -- Ensure unique constraint exists (migration 124 already had UNIQUE(company_id, customer_code))
    -- But the user requested a global unique for the generator logic? 
    -- Let's stick to the user's specific request for simplicity as per the snippet.
    -- However, global unique on a field that already has a per-tenant unique might require dropping old constraint.
END $$;

-- Add contact_code and unit_id to customer_contacts
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS contact_code VARCHAR(50);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES customer_units(id) ON DELETE SET NULL;

-- Ensure uniqueness for the new columns if requested as unique in the snippet
-- Note: User used "UNIQUE" keywords in ALTER TABLE snippets.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_companies_customer_code_key') THEN
        ALTER TABLE customer_companies ADD CONSTRAINT customer_companies_customer_code_key UNIQUE(customer_code);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_contacts_contact_code_key') THEN
        ALTER TABLE customer_contacts ADD CONSTRAINT customer_contacts_contact_code_key UNIQUE(contact_code);
    END IF;
END $$;

-- 3. Company code generator
CREATE OR REPLACE FUNCTION generate_customer_company_code(p_tenant_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- We use split_part to get the counter (the 3rd part of INITIALS/CID/001)
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(customer_code, '/', 3), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM customer_companies
  WHERE customer_code LIKE p_tenant_prefix || '/CID/%';
  -- Note: FOR UPDATE is not allowed in simple SELECT within a function like this easily without a cursor, 
  -- but we'll stick close to user snippet intent.

  RETURN p_tenant_prefix || '/CID/' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. Unit code generator
CREATE OR REPLACE FUNCTION generate_customer_unit_code(p_company_code TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(unit_code, '/U', 2), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM customer_units
  WHERE unit_code LIKE p_company_code || '/U%';

  RETURN p_company_code || '/U' || LPAD(next_num::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- 5. Contact code generator
CREATE OR REPLACE FUNCTION generate_customer_contact_code(
  p_company_code TEXT,
  p_unit_code TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  next_num  INTEGER;
BEGIN
  base_code := COALESCE(p_unit_code, p_company_code);

  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(contact_code, '-', 2), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM customer_contacts
  WHERE contact_code LIKE base_code || '-%';

  RETURN base_code || '-' || LPAD(next_num::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

COMMIT;
