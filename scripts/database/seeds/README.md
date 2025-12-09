# Seeds

This directory contains seed data files to populate the database with initial or test data.

## Seed Files

Seed files can be SQL scripts or JavaScript files that insert data into tables.

## Example Seed Structure

```sql
-- Seed: seed_companies
-- Description: Inserts sample company data

INSERT INTO companies (company_name, gst_number, business_type, address, city, state, pin, phone, website)
VALUES 
  ('Sample Company 1', '27AABCU9603R1ZX', 'Manufacturing', '123 Main St', 'Mumbai', 'Maharashtra', '400001', '9876543210', 'https://example1.com'),
  ('Sample Company 2', '29AABCS1234D1Z5', 'Trading', '456 Park Ave', 'Delhi', 'Delhi', '110001', '9876543211', 'https://example2.com')
ON CONFLICT (gst_number) DO NOTHING;
```

## Running Seeds

Seeds should be run after migrations to populate the database with initial data.

