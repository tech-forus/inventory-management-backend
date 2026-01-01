-- Migration: 040_remove_retail_from_business_type
-- Description: Removes 'Retail' option from business_type CHECK constraint
-- Created: 2025-01-XX

BEGIN;

-- Drop the existing CHECK constraint
ALTER TABLE companies 
DROP CONSTRAINT IF EXISTS companies_business_type_check;

-- Add new CHECK constraint without 'Retail'
ALTER TABLE companies 
ADD CONSTRAINT companies_business_type_check 
CHECK (business_type IN ('Manufacturing', 'Trading'));

-- Update any existing 'Retail' records to 'Trading' (or 'Manufacturing' if preferred)
-- Uncomment the line below if you want to update existing records
-- UPDATE companies SET business_type = 'Trading' WHERE business_type = 'Retail';

COMMIT;

