-- Migration: 047_add_phone_index_to_users
-- Description: Adds index on phone column in users table for faster login queries
-- Created: 2026-01-06

BEGIN;

-- Add index on phone column for faster login lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Add comment
COMMENT ON INDEX idx_users_phone IS 'Index on phone column for faster login queries by phone number';

COMMIT;

