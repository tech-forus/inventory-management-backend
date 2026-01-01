-- Migration: 042_make_transporter_fields_nullable
-- Description: Makes vehicle_type, capacity, pricing_type, and rate nullable
-- Created: 2026-01-01

BEGIN;

-- Make unused columns nullable (no longer required by frontend)
ALTER TABLE transportors
  ALTER COLUMN vehicle_type DROP NOT NULL,
  ALTER COLUMN capacity DROP NOT NULL,
  ALTER COLUMN pricing_type DROP NOT NULL,
  ALTER COLUMN rate DROP NOT NULL;

-- Update comments
COMMENT ON COLUMN transportors.vehicle_type IS 'Type of vehicle (optional, legacy field)';
COMMENT ON COLUMN transportors.capacity IS 'Vehicle capacity (optional, legacy field)';
COMMENT ON COLUMN transportors.pricing_type IS 'Pricing model (optional, legacy field)';
COMMENT ON COLUMN transportors.rate IS 'Rate based on pricing type (optional, legacy field)';

COMMIT;
