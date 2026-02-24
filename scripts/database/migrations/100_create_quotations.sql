BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS quotations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          VARCHAR(6)      NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    lead_id             UUID            REFERENCES leads(id) ON DELETE SET NULL,

    quote_no            VARCHAR(40)     NOT NULL,
    version             VARCHAR(10)     NOT NULL DEFAULT 'V1',
    status              VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')),

    quote_date          DATE            NOT NULL DEFAULT CURRENT_DATE,
    valid_until         DATE,

    -- Customer snapshot (captured at creation time so it survives lead edits)
    customer_name       TEXT,
    customer_company    TEXT,
    customer_email      TEXT,
    customer_phone      TEXT,
    customer_gst_no     VARCHAR(20),
    billing_address     TEXT,
    consigning_address  TEXT,

    -- Financials
    subtotal            NUMERIC(14,2)   NOT NULL DEFAULT 0,
    overall_disc_type   VARCHAR(5)      NOT NULL DEFAULT 'pct' CHECK (overall_disc_type IN ('pct', 'flat')),
    overall_disc_value  NUMERIC(14,2)   NOT NULL DEFAULT 0,
    overall_disc_amt    NUMERIC(14,2)   NOT NULL DEFAULT 0,
    taxable_amt         NUMERIC(14,2)   NOT NULL DEFAULT 0,
    total_tax           NUMERIC(14,2)   NOT NULL DEFAULT 0,
    grand_total         NUMERIC(14,2)   NOT NULL DEFAULT 0,

    terms_text          TEXT,
    internal_notes      TEXT,

    assigned_to         INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    created_by          INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    UNIQUE (company_id, quote_no)
);

CREATE INDEX IF NOT EXISTS idx_quotations_company_id  ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_lead_id     ON quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status      ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_assigned_to ON quotations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at  ON quotations(created_at DESC);

COMMIT;
