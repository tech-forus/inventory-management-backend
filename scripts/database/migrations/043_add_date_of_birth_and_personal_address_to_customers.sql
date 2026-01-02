-- Migration: 043_add_date_of_birth_and_personal_address_to_customers
-- Description: Adds date_of_birth and personal_address fields to customers table
-- Created: 2025-01-02

BEGIN;

-- Add date_of_birth column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add personal_address column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS personal_address TEXT;

-- Add comments
COMMENT ON COLUMN customers.date_of_birth IS 'Date of birth of the customer (optional)';
COMMENT ON COLUMN customers.personal_address IS 'Personal address of the customer (optional)';

COMMIT;

