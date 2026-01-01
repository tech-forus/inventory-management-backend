-- Migration: 034_add_whatsapp_number_to_vendors
-- Description: Adds whatsapp_number field to vendors table
-- Created: 2024-12-19

BEGIN;

-- Add whatsapp_number column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- Add comment
COMMENT ON COLUMN vendors.whatsapp_number IS 'WhatsApp number for vendor contact';

COMMIT;

