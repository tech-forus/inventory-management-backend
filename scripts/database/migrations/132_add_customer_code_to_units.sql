-- 132_add_customer_code_to_units.sql

-- Add customer_code to customer_units so each unit gets its own top-level CID code
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50) UNIQUE;
