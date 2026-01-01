-- Migration: 036_add_contact_person_to_customers
-- Description: Adds contact_person field to customers table
-- Created: 2024-12-19

BEGIN;

-- Add contact_person column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

-- Add comment
COMMENT ON COLUMN customers.contact_person IS 'Contact person name for the customer';

COMMIT;

