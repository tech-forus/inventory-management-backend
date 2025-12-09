# Database Migrations Guide

## Overview

This project uses **node-pg-migrate** for database migrations in production. The migration system ensures:

- ✅ Idempotent migrations (safe to run multiple times)
- ✅ Version control for database schema changes
- ✅ Production-safe migration execution
- ✅ Rollback capabilities

## Development vs Production

### Development (Local)

For local development, you can use either:

1. **Quick setup** (for prototyping):
   ```bash
   npm run create-db        # Creates database (dev only)
   npm run migrate:legacy   # Runs legacy migration system
   ```

2. **Production-like setup** (recommended):
   ```bash
   # Create database manually or use create-db
   npm run migrate          # Uses node-pg-migrate
   ```

### Production

**⚠️ IMPORTANT: Never run `create-db` in production!**

For production:

1. **Create database manually** (via infrastructure as code, cloud console, etc.)
2. **Run migrations**:
   ```bash
   npm run migrate
   ```

Migrations should be run:
- ✅ Manually by DevOps/Admin
- ✅ Via CI/CD pipeline (before deployment)
- ✅ Via infrastructure automation
- ❌ **NOT automatically on app start**

## Migration Commands

### Run Migrations

```bash
# Run all pending migrations
npm run migrate

# Or directly
node-pg-migrate up
```

### Check Migration Status

```bash
npm run migrate:status

# Or directly
node-pg-migrate list
```

### Rollback Migrations

```bash
# Rollback last migration
npm run migrate:down

# Or directly
node-pg-migrate down
```

### Create New Migration

```bash
# Create a new migration file
npm run migrate:create migration_name

# Or directly
node-pg-migrate create migration_name
```

This creates a new file in `scripts/database/migrations/` with timestamp prefix.

## Migration Files

Migrations are stored in: `scripts/database/migrations/`

### File Naming

- Format: `{timestamp}-{name}.sql`
- Example: `1705312245123-create_users_table.sql`

### Migration Structure

Each migration file should be idempotent (safe to run multiple times):

```sql
-- ✅ Good: Idempotent
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- ❌ Bad: Not idempotent
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
```

### Writing Migrations

1. **Always use IF NOT EXISTS / IF EXISTS**:
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   CREATE INDEX IF NOT EXISTS ...
   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
   ```

2. **Use transactions** (node-pg-migrate handles this automatically)

3. **Test migrations**:
   - Test on development database first
   - Test rollback: `npm run migrate:down`
   - Test re-running: `npm run migrate`

## Migration Tracking

node-pg-migrate creates a `pgmigrations` table to track which migrations have been run:

```sql
SELECT * FROM pgmigrations;
```

This table is automatically managed by node-pg-migrate.

## Environment Variables

Required for migrations:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=production  # For production
```

## Troubleshooting

### Migration Fails

1. Check database connection:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

2. Check migration status:
   ```bash
   npm run migrate:status
   ```

3. Check logs for specific error messages

### Rollback Issues

If a migration fails partway through:
1. Check `pgmigrations` table to see what was applied
2. Manually fix the database state if needed
3. Mark migration as complete if it was actually successful:
   ```sql
   INSERT INTO pgmigrations (name, run_on) VALUES ('migration_name', NOW());
   ```

### Database Already Exists

If you get "database already exists" error:
- In development: This is fine, migrations will still run
- In production: Database should be created via infrastructure, not scripts

## Best Practices

1. ✅ **Always test migrations locally first**
2. ✅ **Write idempotent migrations** (use IF NOT EXISTS)
3. ✅ **One logical change per migration**
4. ✅ **Never modify existing migrations** (create new ones instead)
5. ✅ **Run migrations before deploying code** (in CI/CD)
6. ✅ **Backup database before running migrations in production**
7. ❌ **Never run migrations automatically on app start**
8. ❌ **Never run create-db in production**

## Legacy Migration System

The old migration system (`scripts/database/migrate.js`) is still available for backward compatibility:

```bash
npm run migrate:legacy
```

However, new migrations should use node-pg-migrate.

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run migrations
  run: |
    npm run migrate
  env:
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_PORT: ${{ secrets.DB_PORT }}
    DB_NAME: ${{ secrets.DB_NAME }}
    DB_USER: ${{ secrets.DB_USER }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    NODE_ENV: production
```

