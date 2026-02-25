-- Migration: 103_add_customer_stage
-- Description: Adds customer_stage column (potential/existing) to customers table
-- When a lead linked to a customer is WON, the backend auto-promotes stage to 'existing'
-- Created: 2026-02-25

BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_stage VARCHAR(20) DEFAULT 'potential';

COMMENT ON COLUMN customers.customer_stage IS 'Customer lifecycle stage: potential or existing. Auto-promoted to existing when a linked lead is WON.';

-- Set all current customers that have WON leads to existing
UPDATE customers c
SET customer_stage = 'existing'
WHERE EXISTS (
    SELECT 1 FROM leads l
    WHERE l.customer_id = c.id AND l.status = 'WON'
);

COMMIT;
