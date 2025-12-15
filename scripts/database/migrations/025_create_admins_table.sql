-- Migration: 025_create_admins_table
-- Description: Creates admins table to store admin-specific data
-- Created: 2024-12-19

BEGIN;

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  company_id VARCHAR(6) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(10),
  department VARCHAR(100),
  designation VARCHAR(100),
  permissions JSONB DEFAULT '{}',
  module_access JSONB DEFAULT '{}',
  category_access JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_super_admin BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to users table
  CONSTRAINT fk_admins_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_admins_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_company_id ON admins(company_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_is_super_admin ON admins(is_super_admin);
CREATE INDEX IF NOT EXISTS idx_admins_created_at ON admins(created_at);
CREATE INDEX IF NOT EXISTS idx_admins_department ON admins(department);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_admins_company_active ON admins(company_id, is_active);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE admins IS 'Stores admin-specific data and permissions';
COMMENT ON COLUMN admins.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN admins.user_id IS 'Foreign key to users table for authentication';
COMMENT ON COLUMN admins.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN admins.first_name IS 'Admin first name';
COMMENT ON COLUMN admins.last_name IS 'Admin last name';
COMMENT ON COLUMN admins.email IS 'Admin email address (unique)';
COMMENT ON COLUMN admins.phone IS 'Admin phone number';
COMMENT ON COLUMN admins.department IS 'Admin department';
COMMENT ON COLUMN admins.designation IS 'Admin designation/title';
COMMENT ON COLUMN admins.permissions IS 'JSON object storing admin permissions';
COMMENT ON COLUMN admins.module_access IS 'JSON object storing module access permissions';
COMMENT ON COLUMN admins.category_access IS 'JSON array storing category access permissions';
COMMENT ON COLUMN admins.is_active IS 'Whether the admin account is active';
COMMENT ON COLUMN admins.is_super_admin IS 'Whether the admin has super admin privileges';
COMMENT ON COLUMN admins.last_login IS 'Timestamp of last login';
COMMENT ON COLUMN admins.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN admins.updated_at IS 'Timestamp when record was last updated';

COMMIT;

