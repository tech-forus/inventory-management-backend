-- Migration: 027_create_admin_login_logs_table
-- Description: Creates admin_login_logs table to store admin login history
-- Created: 2024-12-19

BEGIN;

-- Create admin_login_logs table
CREATE TABLE IF NOT EXISTS admin_login_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  company_id VARCHAR(6) NOT NULL,
  email VARCHAR(255) NOT NULL,
  login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_timestamp TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  location VARCHAR(255),
  login_status VARCHAR(20) DEFAULT 'success' CHECK (login_status IN ('success', 'failed', 'blocked')),
  failure_reason TEXT,
  session_id VARCHAR(255),
  is_active_session BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to admins table
  CONSTRAINT fk_admin_login_logs_admin 
    FOREIGN KEY (admin_id) 
    REFERENCES admins(id) 
    ON DELETE CASCADE,
  
  -- Foreign key constraint to users table
  CONSTRAINT fk_admin_login_logs_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_admin_login_logs_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_admin_id ON admin_login_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_user_id ON admin_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_company_id ON admin_login_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_email ON admin_login_logs(email);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_login_timestamp ON admin_login_logs(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_login_status ON admin_login_logs(login_status);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_is_active_session ON admin_login_logs(is_active_session);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_ip_address ON admin_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_session_id ON admin_login_logs(session_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_admin_timestamp ON admin_login_logs(admin_id, login_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_company_timestamp ON admin_login_logs(company_id, login_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_active_sessions ON admin_login_logs(admin_id, is_active_session) WHERE is_active_session = true;

-- Add comments
COMMENT ON TABLE admin_login_logs IS 'Stores admin login and logout history';
COMMENT ON COLUMN admin_login_logs.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN admin_login_logs.admin_id IS 'Foreign key to admins table';
COMMENT ON COLUMN admin_login_logs.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN admin_login_logs.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN admin_login_logs.email IS 'Admin email used for login';
COMMENT ON COLUMN admin_login_logs.login_timestamp IS 'Timestamp when admin logged in';
COMMENT ON COLUMN admin_login_logs.logout_timestamp IS 'Timestamp when admin logged out';
COMMENT ON COLUMN admin_login_logs.ip_address IS 'IP address from which login occurred';
COMMENT ON COLUMN admin_login_logs.user_agent IS 'User agent string from browser';
COMMENT ON COLUMN admin_login_logs.device_type IS 'Type of device (mobile, desktop, tablet)';
COMMENT ON COLUMN admin_login_logs.browser IS 'Browser name and version';
COMMENT ON COLUMN admin_login_logs.os IS 'Operating system';
COMMENT ON COLUMN admin_login_logs.location IS 'Geographic location (if available)';
COMMENT ON COLUMN admin_login_logs.login_status IS 'Status of login: success, failed, or blocked';
COMMENT ON COLUMN admin_login_logs.failure_reason IS 'Reason for login failure (if applicable)';
COMMENT ON COLUMN admin_login_logs.session_id IS 'Session identifier';
COMMENT ON COLUMN admin_login_logs.is_active_session IS 'Whether the session is currently active';
COMMENT ON COLUMN admin_login_logs.created_at IS 'Timestamp when record was created';

COMMIT;

