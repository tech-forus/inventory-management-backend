-- Add credit_period to customers table
ALTER TABLE customers ADD COLUMN credit_period INTEGER DEFAULT 0;
