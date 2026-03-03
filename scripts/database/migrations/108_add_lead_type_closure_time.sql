-- Migration 108: Add lead_type and closure_time to leads table
BEGIN;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS closure_time TEXT;

COMMIT;
