-- Migration: 030_add_password_reset_token_to_users
-- Description: Adds password reset token fields to users table for set password functionality
-- Created: 2024-12-XX

BEGIN;

-- Add password reset token and expiry columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add comments
COMMENT ON COLUMN users.password_reset_token IS 'Token for password reset/set password functionality';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for password reset token';

COMMIT;

