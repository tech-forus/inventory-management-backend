# Database Structure

This directory contains database migrations and seeds for the Inventory Management System.

## Directory Structure

```
database/
├── migrations/    # Database schema migrations
└── seeds/        # Database seed data
```

## Migrations

Migrations are used to create and modify database schema. They should be run in order and are version-controlled.

### Running Migrations

```bash
npm run migrate
```

## Seeds

Seeds are used to populate the database with initial or test data.

### Running Seeds

```bash
npm run seed
```

## Migration Naming Convention

Migrations should be named with a timestamp prefix:
- Format: `YYYYMMDDHHMMSS_description.sql`
- Example: `20241118140000_create_companies_table.sql`

## Seed Naming Convention

Seeds should be named descriptively:
- Format: `seed_table_name.sql` or `seed_table_name.js`
- Example: `seed_companies.js`

