-- Migration: 041_add_sub_vendor_to_transportors
-- Description: Adds sub_vendor column to transportors table
-- Created: 2026-01-01

BEGIN;

-- Add sub_vendor column to transportors table
ALTER TABLE transportors
ADD COLUMN IF NOT EXISTS sub_vendor VARCHAR(255) NOT NULL DEFAULT '';

-- Add comment
COMMENT ON COLUMN transportors.sub_vendor IS 'Sub vendor or sub-contractor name (mandatory)';

COMMIT;
