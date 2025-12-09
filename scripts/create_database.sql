-- Create inventory_db database (IDEMPOTENT)
-- This script is safe to run multiple times
-- 
-- WARNING: This script is for LOCAL DEVELOPMENT ONLY
-- For production, use migrations: npm run migrate
-- Database should be created via infrastructure as code or cloud console
--
-- Usage:
--   psql -U postgres -f create_database.sql
--   OR
--   psql -U postgres -c "SELECT 'CREATE DATABASE inventory_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventory_db')\gexec"

-- Method 1: Using psql \gexec (recommended)
-- Uncomment the following line if running interactively:
-- SELECT 'CREATE DATABASE inventory_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventory_db')\gexec

-- Method 2: Manual check and create (for script execution)
-- This requires running from a script that can handle the conditional logic
-- The createDatabase.js script handles this automatically

-- For direct SQL execution, use this approach:
DO $$
BEGIN
    -- Check if database exists
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventory_db') THEN
        -- Note: Cannot CREATE DATABASE inside a DO block
        -- This is a limitation of PostgreSQL
        -- Use createDatabase.js script instead, or run manually:
        -- CREATE DATABASE inventory_db;
        RAISE NOTICE 'Database inventory_db does not exist. Please create it manually or use: npm run create-db';
    ELSE
        RAISE NOTICE 'Database inventory_db already exists.';
    END IF;
END
$$;

-- Display status
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_database WHERE datname = 'inventory_db') 
        THEN 'Database inventory_db is ready!'
        ELSE 'Database inventory_db does not exist. Run: npm run create-db (dev only)'
    END AS message;
