-- Migration: 012_add_designation_to_vendors
-- Description: Adds designation column to vendors table
-- Created: 2024-12-19

BEGIN;

-- Add designation column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS designation VARCHAR(255);

-- Add comment
COMMENT ON COLUMN vendors.designation IS 'Designation/Title of the contact person';

COMMIT;

