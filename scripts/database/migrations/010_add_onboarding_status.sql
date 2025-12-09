-- Migration: 010_add_onboarding_status
-- Description: Adds onboarding completion status to companies table
-- Created: 2024-11-18

BEGIN;

-- Add onboarding_completed column to companies table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add onboarding_completed_at timestamp
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'onboarding_completed_at'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN onboarding_completed_at TIMESTAMP;
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_completed ON companies(onboarding_completed);

-- Add comments
COMMENT ON COLUMN companies.onboarding_completed IS 'Whether the company has completed onboarding wizard';
COMMENT ON COLUMN companies.onboarding_completed_at IS 'Timestamp when onboarding was completed';

COMMIT;

