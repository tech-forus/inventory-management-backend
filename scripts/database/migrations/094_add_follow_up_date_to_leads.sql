BEGIN;

-- Add follow_up_date to leads table for easier querying and display
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON leads(follow_up_date);

COMMIT;
