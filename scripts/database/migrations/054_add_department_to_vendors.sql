-- Migration: 054_add_department_to_vendors
-- Description: Adds department column to vendors table
-- Created: 2024-12-20

BEGIN;

-- Add department column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- Add comment
COMMENT ON COLUMN vendors.department IS 'Department of the vendor contact person';

COMMIT;
