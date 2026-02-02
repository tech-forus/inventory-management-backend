-- Migration: 072_create_role_category_access
-- Description: Category-level access control per role (product, item, sub categories)
-- Created: 2025-02

BEGIN;

CREATE TABLE IF NOT EXISTS role_category_access (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  product_category_ids INTEGER[] DEFAULT '{}',
  item_category_ids INTEGER[] DEFAULT '{}',
  sub_category_ids INTEGER[] DEFAULT '{}',
  "view" BOOLEAN DEFAULT true,
  "create" BOOLEAN DEFAULT false,
  edit BOOLEAN DEFAULT false,
  "delete" BOOLEAN DEFAULT false,
  UNIQUE(role_id)
);

CREATE INDEX IF NOT EXISTS idx_role_category_access_role_id ON role_category_access(role_id);

COMMENT ON TABLE role_category_access IS 'Category-level access per role. Empty arrays = no restriction (all access) at that level.';

COMMIT;
