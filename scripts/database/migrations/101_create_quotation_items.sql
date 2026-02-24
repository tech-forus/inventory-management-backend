BEGIN;

CREATE TABLE IF NOT EXISTS quotation_items (
    id              SERIAL          PRIMARY KEY,
    quotation_id    UUID            NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    sort_order      INTEGER         NOT NULL DEFAULT 0,

    sku_code        VARCHAR(100),
    item_name       VARCHAR(255),
    hsn             VARCHAR(20),
    qty             NUMERIC(10,3)   NOT NULL DEFAULT 0,
    unit            VARCHAR(30)     DEFAULT 'Pcs',
    rate            NUMERIC(14,2)   NOT NULL DEFAULT 0,
    discount_pct    NUMERIC(5,2)    NOT NULL DEFAULT 0,
    gst_pct         NUMERIC(5,2)    NOT NULL DEFAULT 0,
    amount          NUMERIC(14,2)   NOT NULL DEFAULT 0   -- qty * rate after item discount, before GST
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);

COMMIT;
