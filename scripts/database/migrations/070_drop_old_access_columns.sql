-- Migration: 070_drop_old_access_columns
-- Description: Drops deprecated module_access, category_access, permissions from admins and users_data
-- Run after RBAC is fully deployed and verified

BEGIN;

ALTER TABLE admins DROP COLUMN IF EXISTS permissions;
ALTER TABLE admins DROP COLUMN IF EXISTS module_access;
ALTER TABLE admins DROP COLUMN IF EXISTS category_access;

ALTER TABLE users_data DROP COLUMN IF EXISTS permissions;
ALTER TABLE users_data DROP COLUMN IF EXISTS module_access;
ALTER TABLE users_data DROP COLUMN IF EXISTS category_access;

COMMIT;
