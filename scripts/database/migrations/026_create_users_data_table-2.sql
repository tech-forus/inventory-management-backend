-- Migration: 026_create_users_data_table
-- Description: Creates users_data table to store user-specific data
-- Created: 2024-12-19

BEGIN;

-- Create users_data table
CREATE TABLE IF NOT EXISTS users_data (
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
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to users table
  CONSTRAINT fk_users_data_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_users_data_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_data_user_id ON users_data(user_id);
CREATE INDEX IF NOT EXISTS idx_users_data_company_id ON users_data(company_id);
CREATE INDEX IF NOT EXISTS idx_users_data_email ON users_data(email);
CREATE INDEX IF NOT EXISTS idx_users_data_is_active ON users_data(is_active);
CREATE INDEX IF NOT EXISTS idx_users_data_created_at ON users_data(created_at);
CREATE INDEX IF NOT EXISTS idx_users_data_department ON users_data(department);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_users_data_company_active ON users_data(company_id, is_active);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_data_updated_at
    BEFORE UPDATE ON users_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE users_data IS 'Stores user-specific data and permissions';
COMMENT ON COLUMN users_data.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN users_data.user_id IS 'Foreign key to users table for authentication';
COMMENT ON COLUMN users_data.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN users_data.first_name IS 'User first name';
COMMENT ON COLUMN users_data.last_name IS 'User last name';
COMMENT ON COLUMN users_data.email IS 'User email address (unique)';
COMMENT ON COLUMN users_data.phone IS 'User phone number';
COMMENT ON COLUMN users_data.department IS 'User department';
COMMENT ON COLUMN users_data.designation IS 'User designation/title';
COMMENT ON COLUMN users_data.permissions IS 'JSON object storing user permissions';
COMMENT ON COLUMN users_data.module_access IS 'JSON object storing module access permissions';
COMMENT ON COLUMN users_data.category_access IS 'JSON array storing category access permissions';
COMMENT ON COLUMN users_data.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users_data.last_login IS 'Timestamp of last login';
COMMENT ON COLUMN users_data.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN users_data.updated_at IS 'Timestamp when record was last updated';

COMMIT;

