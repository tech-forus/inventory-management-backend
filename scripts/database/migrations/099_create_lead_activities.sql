-- Migration 099: Create lead_activities table for CRM Activity Log system
-- Each row is a discrete activity (call, email, meeting, chat, quote) logged by a sales rep against a lead.

CREATE TABLE IF NOT EXISTS lead_activities (
    id           SERIAL PRIMARY KEY,
    lead_id      UUID         NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    company_id   VARCHAR(6)   NOT NULL,
    type         VARCHAR(10)  NOT NULL CHECK (type IN ('CALL', 'MAIL', 'MEET', 'CHAT', 'QUOTE')),
    note         TEXT,
    logged_by    INTEGER      REFERENCES users(id),
    logged_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id    ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_id ON lead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_logged_at  ON lead_activities(lead_id, logged_at DESC);
