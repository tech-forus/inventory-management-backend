-- Add expected_closure_date column to leads table
-- This column will store the calculated expected closure date based on closure_time and created_at

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS expected_closure_date DATE;

-- Add index for better performance on delay checks
CREATE INDEX IF NOT EXISTS idx_leads_expected_closure_date ON leads(expected_closure_date);

-- Add comment explaining the purpose
COMMENT ON COLUMN leads.expected_closure_date IS 'Calculated expected closure date based on closure_time setting (immediate=+1day, upto_15_days=+15days, in_a_month=+30days, later=+90days)';
