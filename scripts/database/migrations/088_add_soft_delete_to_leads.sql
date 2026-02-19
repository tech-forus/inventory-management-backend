-- Add soft delete support to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at);
