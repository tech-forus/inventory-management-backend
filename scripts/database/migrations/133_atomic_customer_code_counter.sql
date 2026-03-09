-- 133_atomic_customer_code_counter.sql
-- Replace the customer code generator with an atomic counter-based function
-- that works correctly even when multiple codes are generated in a single transaction.

-- 1. Counter table
CREATE TABLE IF NOT EXISTS customer_code_counters (
  tenant_prefix VARCHAR(20) PRIMARY KEY,
  last_number   INTEGER DEFAULT 0
);

-- 2. Replace the company code generator with the atomic version
CREATE OR REPLACE FUNCTION generate_customer_company_code(p_tenant_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO customer_code_counters (tenant_prefix, last_number)
  VALUES (p_tenant_prefix, 1)
  ON CONFLICT (tenant_prefix) DO UPDATE
    SET last_number = customer_code_counters.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN p_tenant_prefix || '/CID/' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Back-fill the counter for each tenant so the next generated code
--    continues from the highest existing code rather than resetting to 1.
INSERT INTO customer_code_counters (tenant_prefix, last_number)
SELECT
  SPLIT_PART(customer_code, '/CID/', 1) AS tenant_prefix,
  MAX(CAST(SPLIT_PART(customer_code, '/CID/', 2) AS INTEGER)) AS last_number
FROM (
  SELECT customer_code FROM customer_companies WHERE customer_code IS NOT NULL
  UNION ALL
  SELECT customer_code FROM customer_units WHERE customer_code IS NOT NULL
) all_codes
WHERE customer_code LIKE '%/CID/%'
GROUP BY tenant_prefix
ON CONFLICT (tenant_prefix) DO UPDATE
  SET last_number = GREATEST(customer_code_counters.last_number, EXCLUDED.last_number);
