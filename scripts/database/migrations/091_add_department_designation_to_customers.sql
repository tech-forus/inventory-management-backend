-- Add department and designation columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
