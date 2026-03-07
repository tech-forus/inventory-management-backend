-- Migration 128: Fix Leads status constraint to include MEETING and QUOTATION
BEGIN;

-- Drop the old constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add the new constraint with all 7 statuses
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('OPEN', 'MEETING', 'QUOTATION', 'NEGOTIATION', 'WON', 'LOST', 'NOT_RESPONSE'));

COMMIT;
