BEGIN;

-- One row per company; atomically incremented on each quotation creation
CREATE TABLE IF NOT EXISTS quotation_sequence (
    company_id  VARCHAR(6)  PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
    last_seq    INTEGER     NOT NULL DEFAULT 0
);

COMMIT;
