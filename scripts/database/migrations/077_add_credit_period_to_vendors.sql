-- Add credit_period column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS credit_period INTEGER DEFAULT 0;
