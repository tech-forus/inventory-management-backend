-- Seed: seed_test_company
-- Description: Inserts a test company registration for testing purposes
-- Note: This SQL file uses a simple approach. Use seed_test_company.js for proper password hashing.
-- Created: 2024-11-18

BEGIN;

-- Insert test company registration (only if it doesn't exist)
INSERT INTO companies (
  company_id,
  company_name,
  gst_number,
  business_type,
  address,
  city,
  state,
  pin,
  phone,
  website,
  admin_full_name,
  admin_email,
  admin_phone,
  admin_password
) 
SELECT 
  'TEST01',
  'Test Electronics Pvt Ltd',
  '27AABCT1234D1Z5',
  'Manufacturing',
  '123 Industrial Area, Sector 5',
  'Mumbai',
  'Maharashtra',
  '400001',
  '9876543210',
  'https://www.testelectronics.com',
  'John Doe',
  'admin@testelectronics.com',
  '9876543211',
  '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq'  -- Hashed password: "Test@1234"
WHERE NOT EXISTS (
  SELECT 1 FROM companies 
  WHERE company_id = 'TEST01' 
     OR gst_number = '27AABCT1234D1Z5' 
     OR admin_email = 'admin@testelectronics.com'
);

COMMIT;

