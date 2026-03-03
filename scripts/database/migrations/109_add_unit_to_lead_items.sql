-- Migration 109: Add unit column to lead_items table
BEGIN;

ALTER TABLE lead_items ADD COLUMN IF NOT EXISTS unit TEXT;

COMMIT;
