-- 1. Create a temporary table to store current status mappings
CREATE TEMP TABLE lead_status_map (
    old_status VARCHAR(50),
    new_status VARCHAR(50)
);

INSERT INTO lead_status_map (old_status, new_status) VALUES
('open', 'OPEN'),
('follow_up', 'OPEN'), 
('negotiation', 'NEGOTIATION'),
('closed_won', 'WON'),
('closed_lost', 'LOST');

-- 2. Drop existing constraint if it exists
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS check_lead_status;

-- 3. Update the leads table statuses to the new uppercase format
ALTER TABLE leads ALTER COLUMN status TYPE TEXT;

UPDATE leads l
SET status = m.new_status
FROM lead_status_map m
WHERE l.status = m.old_status;

-- 4. Set a default for any weird states
UPDATE leads SET status = 'OPEN' WHERE status NOT IN ('OPEN', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'CLOSED_NO_RESPONSE') OR status IS NULL;

-- 5. Re-apply the new professional constraint
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('OPEN', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'CLOSED_NO_RESPONSE'));

-- 6. Enforce unique pending follow-up rule
-- First, cancel any duplicates that might exist (keep the earliest one)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY scheduled_at ASC) as rn
    FROM lead_followups
    WHERE status = 'PENDING'
)
UPDATE lead_followups
SET status = 'CANCELLED'
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now create the partial unique index
DROP INDEX IF EXISTS one_pending_followup_per_lead;
CREATE UNIQUE INDEX one_pending_followup_per_lead
ON lead_followups (lead_id)
WHERE status = 'PENDING';

-- 7. Cleanup
DROP TABLE lead_status_map;
