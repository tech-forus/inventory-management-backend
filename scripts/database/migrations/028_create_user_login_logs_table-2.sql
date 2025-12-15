-- Migration: 028_create_user_login_logs_table
-- Description: Creates user_login_logs table to store user login history
-- Created: 2024-12-19

BEGIN;

-- Create user_login_logs table
CREATE TABLE IF NOT EXISTS user_login_logs (
  id SERIAL PRIMARY KEY,
  user_data_id INTEGER NOT NULL,
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
  
  -- Foreign key constraint to users_data table
  CONSTRAINT fk_user_login_logs_user_data 
    FOREIGN KEY (user_data_id) 
    REFERENCES users_data(id) 
    ON DELETE CASCADE,
  
  -- Foreign key constraint to users table
  CONSTRAINT fk_user_login_logs_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Foreign key constraint to companies table
  CONSTRAINT fk_user_login_logs_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_data_id ON user_login_logs(user_data_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_company_id ON user_login_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_email ON user_login_logs(email);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_timestamp ON user_login_logs(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_status ON user_login_logs(login_status);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_is_active_session ON user_login_logs(is_active_session);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON user_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_session_id ON user_login_logs(session_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_data_timestamp ON user_login_logs(user_data_id, login_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_company_timestamp ON user_login_logs(company_id, login_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_active_sessions ON user_login_logs(user_data_id, is_active_session) WHERE is_active_session = true;

-- Add comments
COMMENT ON TABLE user_login_logs IS 'Stores user login and logout history';
COMMENT ON COLUMN user_login_logs.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN user_login_logs.user_data_id IS 'Foreign key to users_data table';
COMMENT ON COLUMN user_login_logs.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_login_logs.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN user_login_logs.email IS 'User email used for login';
COMMENT ON COLUMN user_login_logs.login_timestamp IS 'Timestamp when user logged in';
COMMENT ON COLUMN user_login_logs.logout_timestamp IS 'Timestamp when user logged out';
COMMENT ON COLUMN user_login_logs.ip_address IS 'IP address from which login occurred';
COMMENT ON COLUMN user_login_logs.user_agent IS 'User agent string from browser';
COMMENT ON COLUMN user_login_logs.device_type IS 'Type of device (mobile, desktop, tablet)';
COMMENT ON COLUMN user_login_logs.browser IS 'Browser name and version';
COMMENT ON COLUMN user_login_logs.os IS 'Operating system';
COMMENT ON COLUMN user_login_logs.location IS 'Geographic location (if available)';
COMMENT ON COLUMN user_login_logs.login_status IS 'Status of login: success, failed, or blocked';
COMMENT ON COLUMN user_login_logs.failure_reason IS 'Reason for login failure (if applicable)';
COMMENT ON COLUMN user_login_logs.session_id IS 'Session identifier';
COMMENT ON COLUMN user_login_logs.is_active_session IS 'Whether the session is currently active';
COMMENT ON COLUMN user_login_logs.created_at IS 'Timestamp when record was created';

COMMIT;

