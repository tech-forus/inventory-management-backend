-- Migration: 107_update_customer_code_remove_year
-- Description: Removes the year from the customer code format.
-- Format: [INITIALS]/[TYPE]/[COUNTER]
-- Example: FEPL/CID/001
-- Created: 2026-02-27

BEGIN;

-- 1. Update the main generation function
CREATE OR REPLACE FUNCTION generate_customer_code(p_company_id VARCHAR, p_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_next_val INTEGER;
    v_code VARCHAR;
    v_initials VARCHAR;
    v_type_code VARCHAR;
    v_sequence_prefix VARCHAR;
BEGIN
    -- Get initials
    v_initials := get_company_initials(p_company_id);
    
    -- Map prefix to display type code and sequence key
    IF p_prefix = 'CUST' OR p_prefix = 'CX' OR p_prefix = 'CID' THEN
        v_type_code := 'CID';
        v_sequence_prefix := 'CUST';
    ELSIF p_prefix = 'POT' OR p_prefix = 'PT' OR p_prefix = 'PID' THEN
        v_type_code := 'PID';
        v_sequence_prefix := 'POT';
    ELSE
        v_type_code := p_prefix;
        v_sequence_prefix := p_prefix;
    END IF;

    -- Insert or increment the counter atomically
    INSERT INTO customer_code_sequences (company_id, prefix, next_val)
    VALUES (p_company_id, v_sequence_prefix, 2)
    ON CONFLICT (company_id, prefix)
    DO UPDATE SET next_val = customer_code_sequences.next_val + 1
    RETURNING next_val - 1 INTO v_next_val;
    
    -- Format as INITIALS/TYPE/001 (e.g., FEPL/CID/001)
    v_code := v_initials || '/' || v_type_code || '/' || LPAD(v_next_val::TEXT, 3, '0');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 2. Update existing customer codes to the new format
-- Reset counters and regenerate
TRUNCATE TABLE customer_code_sequences;

DO $$
DECLARE
    r RECORD;
    v_code VARCHAR;
BEGIN
    -- Re-generate for existing customers
    FOR r IN 
        SELECT id, company_id 
        FROM customers 
        WHERE customer_stage = 'existing'
        ORDER BY created_at ASC
    LOOP
        v_code := generate_customer_code(r.company_id, 'CUST');
        UPDATE customers SET customer_code = v_code WHERE id = r.id;
    END LOOP;
    
    -- Re-generate for potential customers
    FOR r IN 
        SELECT id, company_id 
        FROM customers 
        WHERE (customer_stage = 'potential' OR customer_stage IS NULL)
        ORDER BY created_at ASC
    LOOP
        v_code := generate_customer_code(r.company_id, 'POT');
        UPDATE customers SET customer_code = v_code WHERE id = r.id;
    END LOOP;
END $$;

COMMIT;
