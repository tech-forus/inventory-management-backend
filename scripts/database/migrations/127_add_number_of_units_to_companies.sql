-- Add number_of_units to customer_companies
ALTER TABLE customer_companies
ADD COLUMN IF NOT EXISTS number_of_units INTEGER DEFAULT 1;
