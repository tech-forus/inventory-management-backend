-- Migration: 029_add_employee_id_to_admins_and_users_data
-- Description: Adds employee_id column to admins and users_data tables
-- Created: 2024-12-19

BEGIN;

-- Add employee_id to admins table
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);

-- Add employee_id to users_data table
ALTER TABLE users_data
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);

-- Create indexes for employee_id for better query performance
CREATE INDEX IF NOT EXISTS idx_admins_employee_id ON admins(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_data_employee_id ON users_data(employee_id);

-- Create unique index on employee_id per company (optional - if employee IDs should be unique per company)
-- Uncomment if needed:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_company_employee_id ON admins(company_id, employee_id) WHERE employee_id IS NOT NULL;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_users_data_company_employee_id ON users_data(company_id, employee_id) WHERE employee_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN admins.employee_id IS 'Employee ID for the admin';
COMMENT ON COLUMN users_data.employee_id IS 'Employee ID for the user';

COMMIT;

