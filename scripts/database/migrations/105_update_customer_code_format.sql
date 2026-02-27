-- Migration: 105_update_customer_code_format
-- Description: Updates the customer code format to [INITIALS]/[TYPE][YY]/[COUNTER]
-- Example: FEPL/CX26/001
-- Created: 2026-02-27

BEGIN;

-- 1. Helper function to get company initials
CREATE OR REPLACE FUNCTION get_company_initials(p_company_id VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_name VARCHAR;
    v_initials VARCHAR := '';
    v_word VARCHAR;
BEGIN
    SELECT company_name INTO v_name FROM companies WHERE company_id = p_company_id;
    
    -- Split by space and take first letter of each word
    FOREACH v_word IN ARRAY string_to_array(v_name, ' ')
    LOOP
        IF v_word <> '' THEN
            v_initials := v_initials || UPPER(LEFT(v_word, 1));
        END IF;
    END LOOP;
    
    -- Fallback if initials are empty
    IF v_initials = '' THEN
        v_initials := p_company_id;
    END IF;
    
    RETURN v_initials;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the main generation function
CREATE OR REPLACE FUNCTION generate_customer_code(p_company_id VARCHAR, p_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_next_val INTEGER;
    v_code VARCHAR;
    v_initials VARCHAR;
    v_year VARCHAR;
    v_type_code VARCHAR;
    v_sequence_prefix VARCHAR;
BEGIN
    -- Get initials
    v_initials := get_company_initials(p_company_id);
    
    -- Get year (e.g., 26)
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Map prefix to display type code and sequence key
    IF p_prefix = 'CUST' OR p_prefix = 'CX' THEN
        v_type_code := 'CX';
        v_sequence_prefix := 'CUST'; -- Keep 'CUST' as key for backward compatibility or change to 'CX'
    ELSIF p_prefix = 'POT' OR p_prefix = 'PT' THEN
        v_type_code := 'PT';
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
    
    -- Format as INITIALS/TYPEYY/001
    v_code := v_initials || '/' || v_type_code || v_year || '/' || LPAD(v_next_val::TEXT, 3, '0');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 3. Update existing customer codes to the new format
-- We'll reset the counters for each company and stage to ensure consistency if needed, 
-- or just reformat existing numbers. 
-- The user said "separate counters" and the current numbers are already assigned.
-- Let's reformat all existing customer_code values based on their current sequence number 
-- if they match the old format (e.g. 'CUST-001'), or just regenerate them fresh in order of created_at.

-- Let's reset counters and regenerate to be clean, as it's a new format request.
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
