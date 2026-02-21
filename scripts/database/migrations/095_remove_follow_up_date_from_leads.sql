BEGIN;

-- Remove follow_up_date from leads table
ALTER TABLE leads DROP COLUMN IF EXISTS follow_up_date;

COMMIT;
