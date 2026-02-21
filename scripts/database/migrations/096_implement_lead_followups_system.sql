-- Migration: 096_implement_lead_followups_system
-- Description: Creates properly structured lead_followups table and cleans up old follow-up structures
-- Created: 2026-02-21

BEGIN;

-- 1. Drop old follow-up table if exists (from 086)
DROP TABLE IF EXISTS lead_follow_ups;

-- 2. Create new follow-ups table
-- Adapting types to match existing schema: lead_id is UUID, created_by is INTEGER
CREATE TABLE lead_followups (
  id BIGSERIAL PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED | MISSED | CANCELLED
  completed_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add Indexes as requested
-- Partial index for active follow-ups to keep dashboard queries fast
CREATE INDEX idx_followups_lead_pending 
ON lead_followups (lead_id, scheduled_at)
WHERE status = 'PENDING';

CREATE INDEX idx_followups_scheduled_at 
ON lead_followups (scheduled_at);

-- 4. Add index for created_at for sorting/logs
CREATE INDEX idx_followups_created_at ON lead_followups (created_at);

COMMIT;
