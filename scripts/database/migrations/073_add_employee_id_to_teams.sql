-- Migration: 073_add_employee_id_to_teams
-- Description: Adds employee_id column to teams table
-- Created: 2025-02-03

BEGIN;

-- Add employee_id column after designation
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);

-- Create index for employee_id lookups
CREATE INDEX IF NOT EXISTS idx_teams_employee_id ON teams(employee_id);

COMMENT ON COLUMN teams.employee_id IS 'Employee ID or employee number';

COMMIT;
