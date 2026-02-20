-- Drop department and designation columns from customers table
ALTER TABLE customers DROP COLUMN IF EXISTS department;
ALTER TABLE customers DROP COLUMN IF EXISTS designation;
