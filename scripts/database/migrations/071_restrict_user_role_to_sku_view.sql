-- Migration: 071_restrict_user_role_to_sku_view
-- Description: Restrict User role to sku.view only (SKU Management view + Profile via RequireAuth)
-- Created: 2025-02

BEGIN;

DO $$
DECLARE
  user_role RECORD;
  sku_view_id INT;
BEGIN
  SELECT id INTO sku_view_id FROM permissions WHERE module = 'sku' AND action = 'view';
  IF sku_view_id IS NULL THEN
    RAISE EXCEPTION 'Permission sku.view not found';
  END IF;

  FOR user_role IN SELECT id FROM roles WHERE name = 'User'
  LOOP
    -- Remove all existing permissions from User role
    DELETE FROM role_permissions WHERE role_id = user_role.id;
    
    -- Add only sku.view
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (user_role.id, sku_view_id);
  END LOOP;
END $$;

COMMIT;
