# Migrations

This directory contains database migration files that define the schema structure.

## Migration Files

Migration files should be created in chronological order and should be idempotent (safe to run multiple times).

## Example Migration Structure

```sql
-- Migration: create_companies_table
-- Description: Creates the companies table for company registration

BEGIN;

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  gst_number VARCHAR(15) UNIQUE NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pin VARCHAR(6) NOT NULL,
  phone VARCHAR(10) NOT NULL,
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_gst ON companies(gst_number);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(company_name);

COMMIT;
```

## Running Migrations

Use the migration runner script or run SQL files directly using psql or pgAdmin.

