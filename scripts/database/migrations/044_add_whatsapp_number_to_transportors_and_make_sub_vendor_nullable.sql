-- Migration: 044_add_whatsapp_number_to_transportors_and_make_sub_vendor_nullable
-- Description: Adds whatsapp_number column to transportors table and makes sub_vendor nullable
-- Created: 2026-01-02

BEGIN;

-- Add whatsapp_number column to transportors table
ALTER TABLE transportors
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- Make sub_vendor nullable
ALTER TABLE transportors
ALTER COLUMN sub_vendor DROP NOT NULL;

-- Update comments
COMMENT ON COLUMN transportors.whatsapp_number IS 'WhatsApp number for transporter contact (optional)';
COMMENT ON COLUMN transportors.sub_vendor IS 'Sub vendor or sub-contractor name (optional)';

COMMIT;

