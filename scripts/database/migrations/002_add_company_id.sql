-- Migration: 002_add_company_id
-- Description: Adds company_id column to companies table
-- Created: 2024-11-18

BEGIN;

-- Add company_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN company_id VARCHAR(6) UNIQUE;

        -- Create index for company_id
        CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);

        -- Add comment
        COMMENT ON COLUMN companies.company_id IS 'Unique 6-letter alphabetic Company ID (SKU)';
    END IF;
END $$;

COMMIT;

