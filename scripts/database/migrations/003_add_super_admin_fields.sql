-- Migration: 003_add_super_admin_fields
-- Description: Adds super admin fields to companies table
-- Created: 2024-11-18

BEGIN;

-- Add super admin columns to companies table
DO $$ 
BEGIN
    -- Add admin_full_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'admin_full_name'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN admin_full_name VARCHAR(255);
    END IF;

    -- Add admin_email column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'admin_email'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN admin_email VARCHAR(255);
        
        -- Add unique constraint after column is created
        CREATE UNIQUE INDEX IF NOT EXISTS companies_admin_email_unique 
        ON companies(admin_email) WHERE admin_email IS NOT NULL AND admin_email != '';
    END IF;

    -- Add admin_phone column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'admin_phone'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN admin_phone VARCHAR(10);
    END IF;

    -- Add admin_password column (hashed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'admin_password'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN admin_password VARCHAR(255);
    END IF;
END $$;

-- Create indexes for admin fields (if not already created above)
CREATE INDEX IF NOT EXISTS idx_companies_admin_email ON companies(admin_email) WHERE admin_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_admin_phone ON companies(admin_phone) WHERE admin_phone IS NOT NULL;

-- Add comments
COMMENT ON COLUMN companies.admin_full_name IS 'Full name of the super admin';
COMMENT ON COLUMN companies.admin_email IS 'Email address of the super admin (unique)';
COMMENT ON COLUMN companies.admin_phone IS 'Phone number of the super admin (10 digits)';
COMMENT ON COLUMN companies.admin_password IS 'Hashed password of the super admin';

COMMIT;

