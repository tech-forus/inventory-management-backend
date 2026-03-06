BEGIN;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add indexes for performance when sorting by pinned status
CREATE INDEX IF NOT EXISTS idx_leads_is_pinned ON leads (company_id, is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_customers_is_pinned ON customers (company_id, is_pinned DESC);

COMMIT;
