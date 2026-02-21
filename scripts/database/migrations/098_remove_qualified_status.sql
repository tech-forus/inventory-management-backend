-- Migration 098: Remove QUALIFIED status and rename CLOSED_NO_RESPONSE to NOT_RESPONSE
-- 1. Drop existing constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- 2. Update existing data
-- Map QUALIFIED to OPEN (or maybe NEGOTIATION? Usually OPEN is safer)
UPDATE leads SET status = 'OPEN' WHERE status = 'QUALIFIED';
-- Map CLOSED_NO_RESPONSE to NOT_RESPONSE
UPDATE leads SET status = 'NOT_RESPONSE' WHERE status = 'CLOSED_NO_RESPONSE';

-- 3. Add new constraint with updated statuses
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('OPEN', 'NEGOTIATION', 'WON', 'LOST', 'NOT_RESPONSE'));
