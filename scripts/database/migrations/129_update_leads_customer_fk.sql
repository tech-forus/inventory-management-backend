-- Migration: 129_update_leads_customer_fk
-- Description: Updates the leads table to reference customer_contacts(id) instead of customers(id).
-- Created: 2026-03-07

BEGIN;

-- 1. Drop the old foreign key constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_customer_id_fkey;

-- 2. Add the new foreign key constraint pointing to customer_contacts
-- We use NO CHECK initially if there's legacy data that doesn't exist in contacts yet,
-- but for a clean transition, we'll just add it.
ALTER TABLE leads 
ADD CONSTRAINT leads_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customer_contacts(id);

COMMIT;
