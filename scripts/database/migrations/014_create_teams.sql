-- Migration: 014_create_teams
-- Description: Creates teams table for team member information
-- Created: 2024-12-19

BEGIN;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20),
  email_id VARCHAR(255),
  department VARCHAR(255),
  designation VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_teams_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: company cannot have duplicate team member emails
  CONSTRAINT unique_company_team_email 
    UNIQUE (company_id, email_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_email_id ON teams(email_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department);
CREATE INDEX IF NOT EXISTS idx_teams_designation ON teams(designation);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE teams IS 'Team member information for company';
COMMENT ON COLUMN teams.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN teams.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN teams.name IS 'Team member full name';
COMMENT ON COLUMN teams.contact_number IS 'Team member contact number';
COMMENT ON COLUMN teams.email_id IS 'Team member email address';
COMMENT ON COLUMN teams.department IS 'Team member department';
COMMENT ON COLUMN teams.designation IS 'Team member designation/position';
COMMENT ON COLUMN teams.is_active IS 'Whether the team member is active';
COMMENT ON COLUMN teams.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN teams.updated_at IS 'Timestamp when record was last updated';

COMMIT;

