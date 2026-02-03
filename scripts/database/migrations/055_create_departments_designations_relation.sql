-- Migration: 055_create_departments_designations_relation
-- Description: Creates departments and designations tables with relationship, and updates vendors to use foreign keys
-- Created: 2024-12-20

BEGIN;

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create designations table with foreign key to departments
CREATE TABLE IF NOT EXISTS designations (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_designations_department 
    FOREIGN KEY (department_id) 
    REFERENCES departments(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: same designation name cannot exist twice in same department
  CONSTRAINT unique_department_designation 
    UNIQUE (department_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_designations_department_id ON designations(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_designations_name ON designations(name);

-- Populate departments table with standard departments
INSERT INTO departments (name) VALUES
  ('Engineering / Technology'),
  ('Product'),
  ('Quality / Testing'),
  ('Data / Analytics'),
  ('Sales'),
  ('Marketing'),
  ('Customer Support / Success'),
  ('Finance / Accounts'),
  ('Human Resources (HR)'),
  ('Operations'),
  ('Legal / Compliance'),
  ('Administration')
ON CONFLICT (name) DO NOTHING;

-- Populate designations table with standard designations
INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Software Engineer'),
    ('Engineering Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Engineering / Technology'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Product Manager'),
    ('Product Lead')
) AS dept_designations(designation_name)
WHERE d.name = 'Product'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('QA Engineer'),
    ('QA Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Quality / Testing'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Data Analyst'),
    ('Data Scientist')
) AS dept_designations(designation_name)
WHERE d.name = 'Data / Analytics'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Sales Executive'),
    ('Sales Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Sales'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Marketing Specialist'),
    ('Marketing Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Marketing'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Customer Support Executive'),
    ('Customer Success Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Customer Support / Success'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Accountant'),
    ('Finance Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Finance / Accounts'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('HR Executive'),
    ('HR Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Human Resources (HR)'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Operations Executive'),
    ('Operations Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Operations'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Legal Officer'),
    ('Compliance Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Legal / Compliance'
ON CONFLICT (department_id, name) DO NOTHING;

INSERT INTO designations (department_id, name) 
SELECT d.id, designation_name
FROM departments d
CROSS JOIN LATERAL (
  VALUES 
    ('Admin Executive'),
    ('Admin Manager')
) AS dept_designations(designation_name)
WHERE d.name = 'Administration'
ON CONFLICT (department_id, name) DO NOTHING;

-- Add new foreign key columns to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS department_id INTEGER,
ADD COLUMN IF NOT EXISTS designation_id INTEGER;

-- Migrate existing data from VARCHAR to foreign keys
-- First, try to match existing department names
UPDATE vendors v
SET department_id = d.id
FROM departments d
WHERE v.department = d.name
AND v.department IS NOT NULL;

-- Then, try to match existing designation names (must match both department and designation)
UPDATE vendors v
SET designation_id = des.id
FROM designations des
INNER JOIN departments d ON des.department_id = d.id
WHERE v.designation = des.name
AND v.department_id = d.id
AND v.designation IS NOT NULL;

-- Add foreign key constraints (idempotent: skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendors_department') THEN
    ALTER TABLE vendors
    ADD CONSTRAINT fk_vendors_department 
      FOREIGN KEY (department_id) 
      REFERENCES departments(id) 
      ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendors_designation') THEN
    ALTER TABLE vendors
    ADD CONSTRAINT fk_vendors_designation 
      FOREIGN KEY (designation_id) 
      REFERENCES designations(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_vendors_department_id ON vendors(department_id);
CREATE INDEX IF NOT EXISTS idx_vendors_designation_id ON vendors(designation_id);

-- Add comments
COMMENT ON TABLE departments IS 'Department master table';
COMMENT ON TABLE designations IS 'Designation master table with relationship to departments';
COMMENT ON COLUMN vendors.department_id IS 'Foreign key to departments table';
COMMENT ON COLUMN vendors.designation_id IS 'Foreign key to designations table';

-- Note: We keep the old VARCHAR columns (department, designation) for now to allow gradual migration
-- They can be dropped in a future migration after ensuring all data is migrated

COMMIT;
