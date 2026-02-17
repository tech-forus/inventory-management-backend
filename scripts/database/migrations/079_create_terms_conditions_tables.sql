-- Terms & Conditions Management System Tables
-- Created: 2026-02-17

-- 1. Master Terms & Conditions Library
CREATE TABLE IF NOT EXISTS terms_conditions (
    id SERIAL PRIMARY KEY,
    term_key VARCHAR(100) UNIQUE NOT NULL,
    term_title VARCHAR(255) NOT NULL,
    term_value TEXT NOT NULL,
    term_order INTEGER NOT NULL DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_system_default BOOLEAN DEFAULT FALSE,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_term_key ON terms_conditions(term_key);
CREATE INDEX IF NOT EXISTS idx_term_order ON terms_conditions(term_order);

-- 2. PO-Specific Terms Mapping
CREATE TABLE IF NOT EXISTS po_terms_conditions (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL,
    term_key VARCHAR(100) NOT NULL,
    customized_value TEXT,
    final_value TEXT NOT NULL,
    term_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_terms_po_id ON po_terms_conditions(po_id);
CREATE INDEX IF NOT EXISTS idx_po_terms_term_key ON po_terms_conditions(term_key);

COMMENT ON TABLE po_terms_conditions IS 'Terms & Conditions applied to specific Purchase Orders';

-- 3. PO Term Variables Storage
CREATE TABLE IF NOT EXISTS po_term_variables (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL,
    variable_name VARCHAR(100) NOT NULL,
    variable_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(po_id, variable_name)
);

CREATE INDEX IF NOT EXISTS idx_po_variables_po_id ON po_term_variables(po_id);
CREATE INDEX IF NOT EXISTS idx_po_variables_name ON po_term_variables(variable_name);

COMMENT ON TABLE po_term_variables IS 'Variable values (like LD%, cities) for each PO';

-- 4. Add terms_status column to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS terms_status VARCHAR(20) DEFAULT 'not_set';
