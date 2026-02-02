-- Migration: 069_create_rbac_tables
-- Description: Creates RBAC tables (roles, permissions, role_permissions, user_roles) and seeds data
-- Created: 2025-02

BEGIN;

-- Permissions (global, seeded once)
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  UNIQUE(module, action)
);

-- Roles (per company)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role assignment
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles(company_id);

-- Seed permissions (idempotent)
INSERT INTO permissions (module, action) VALUES
  ('dashboard', 'view'),
  ('sku', 'view'), ('sku', 'create'), ('sku', 'edit'), ('sku', 'delete'),
  ('inventory', 'view'), ('inventory', 'create'), ('inventory', 'edit'), ('inventory', 'delete'),
  ('library', 'view'), ('library', 'create'), ('library', 'edit'), ('library', 'delete'),
  ('reports', 'view'),
  ('accessControl', 'view'), ('accessControl', 'create'), ('accessControl', 'edit'), ('accessControl', 'delete'),
  ('finance', 'view'),
  ('warranty', 'view'), ('warranty', 'create'), ('warranty', 'edit'), ('warranty', 'delete'),
  ('manufacturing', 'view'), ('manufacturing', 'create'), ('manufacturing', 'edit'), ('manufacturing', 'delete')
ON CONFLICT (module, action) DO NOTHING;

-- Create default roles for each company and bootstrap admins
DO $$
DECLARE
  comp RECORD;
  admin_role_id INT;
  user_role_id INT;
  perm RECORD;
  admin_user RECORD;
BEGIN
  FOR comp IN SELECT company_id FROM companies
  LOOP
    -- Create Admin role (all permissions)
    INSERT INTO roles (company_id, name, description, is_system)
    VALUES (comp.company_id, 'Admin', 'Full access to all modules', true)
    ON CONFLICT (company_id, name) DO NOTHING;
    
    SELECT id INTO admin_role_id FROM roles WHERE company_id = comp.company_id AND name = 'Admin';
    
    -- Assign all permissions to Admin role
    FOR perm IN SELECT id FROM permissions
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
    
    -- Create User role (SKU view only + Profile via RequireAuth)
    INSERT INTO roles (company_id, name, description, is_system)
    VALUES (comp.company_id, 'User', 'SKU Management view only, Profile access', true)
    ON CONFLICT (company_id, name) DO NOTHING;
    
    SELECT id INTO user_role_id FROM roles WHERE company_id = comp.company_id AND name = 'User';
    
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT user_role_id, p.id FROM permissions p
    WHERE p.module = 'sku' AND p.action = 'view';
    
    -- Bootstrap: assign Admin role to existing admin/super_admin users so they can assign others
    FOR admin_user IN 
      SELECT id FROM users WHERE company_id = comp.company_id AND role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO user_roles (user_id, role_id, company_id)
      VALUES (admin_user.id, admin_role_id, comp.company_id)
      ON CONFLICT (user_id, role_id, company_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

COMMIT;
