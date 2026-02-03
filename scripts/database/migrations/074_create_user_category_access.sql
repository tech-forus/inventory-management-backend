-- Migration: 074_create_user_category_access
-- Description: User-level category access (from invite). Used when category access is configured per-invite via CategoryAccessWizard.
-- Created: 2025-02

BEGIN;

CREATE TABLE IF NOT EXISTS user_category_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  product_category_ids INTEGER[] DEFAULT '{}',
  item_category_ids INTEGER[] DEFAULT '{}',
  sub_category_ids INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_category_access_user_id ON user_category_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_access_company_id ON user_category_access(company_id);

COMMENT ON TABLE user_category_access IS 'User-level category access from invite. Used when CategoryAccessWizard is used on Invite page. Takes precedence over role_category_access.';

COMMIT;
