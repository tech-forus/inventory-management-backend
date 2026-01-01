-- Migration: 035_add_whatsapp_number_to_customers
-- Description: Adds whatsapp_number field to customers table
-- Created: 2024-12-19

BEGIN;

-- Add whatsapp_number column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- Add comment
COMMENT ON COLUMN customers.whatsapp_number IS 'WhatsApp number for customer contact';

COMMIT;

