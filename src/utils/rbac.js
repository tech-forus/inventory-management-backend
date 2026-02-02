/**
 * RBAC utilities - resolve user permissions from roles
 */
const pool = require('../models/database');

/**
 * Get all permissions for a user in a company (from user_roles -> role_permissions -> permissions)
 * @param {number} userId
 * @param {string} companyId
 * @returns {Promise<string[]>} Array of "module.action" strings
 */
async function getUserPermissions(userId, companyId) {
  const result = await pool.query(
    `SELECT DISTINCT p.module, p.action
     FROM user_roles ur
     JOIN role_permissions rp ON ur.role_id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE ur.user_id = $1 AND ur.company_id = $2`,
    [userId, companyId]
  );

  return result.rows.map((r) => `${r.module}.${r.action}`);
}

/**
 * Check if user has a specific permission
 * Super admin (from users.role) bypasses - has all permissions
 * @param {number} userId
 * @param {string} companyId
 * @param {string} userRole - from users.role (admin, super_admin, user, sales)
 * @param {string} requiredPermission - e.g. "sku.view"
 */
async function hasPermission(userId, companyId, userRole, requiredPermission) {
  if (!userId || !companyId || !requiredPermission) return false;

  // Super admin bypass
  if (userRole === 'super_admin') return true;

  const permissions = await getUserPermissions(userId, companyId);

  // Wildcard = all permissions
  if (permissions.includes('*')) return true;

  // Admin role in users.role - if no RBAC roles assigned yet, treat as full access (legacy)
  if (userRole === 'admin' && permissions.length === 0) return true;

  return permissions.includes(requiredPermission);
}

/**
 * Get category access for a user (from their roles' role_category_access)
 * Admin/super_admin: returns null (full access, no filtering)
 * User with no role_category_access rows: returns null (full access)
 * User with role_category_access: returns { productCategoryIds, itemCategoryIds, subCategoryIds }
 *   - Empty array at a level = no restriction (all) at that level
 *   - Non-empty array = restrict to those IDs only
 * @param {number} userId
 * @param {string} companyId
 * @param {string} userRole - from users.role (admin, super_admin, user, sales)
 * @returns {Promise<{ productCategoryIds: number[], itemCategoryIds: number[], subCategoryIds: number[] } | null>}
 */
async function getUserCategoryAccess(userId, companyId, userRole) {
  if (!userId || !companyId) return null;

  // Admin and super_admin have full category access
  if (userRole === 'super_admin' || userRole === 'admin') return null;

  const result = await pool.query(
    `SELECT rca.product_category_ids, rca.item_category_ids, rca.sub_category_ids
     FROM user_roles ur
     JOIN role_category_access rca ON ur.role_id = rca.role_id
     WHERE ur.user_id = $1 AND ur.company_id = $2`,
    [userId, companyId]
  );

  if (result.rows.length === 0) return null; // No restrictions

  // Empty array at a level = "all" (no filter). Non-empty = restrict to those IDs.
  // For multiple roles: if ANY role has empty at a level → no filter. Else union of all.
  const hasAllProducts = result.rows.some((r) => !r.product_category_ids || r.product_category_ids.length === 0);
  const hasAllItems = result.rows.some((r) => !r.item_category_ids || r.item_category_ids.length === 0);
  const hasAllSubs = result.rows.some((r) => !r.sub_category_ids || r.sub_category_ids.length === 0);

  const productIds = new Set();
  const itemIds = new Set();
  const subIds = new Set();
  for (const row of result.rows) {
    (row.product_category_ids || []).forEach((id) => productIds.add(id));
    (row.item_category_ids || []).forEach((id) => itemIds.add(id));
    (row.sub_category_ids || []).forEach((id) => subIds.add(id));
  }

  const productCategoryIds = hasAllProducts ? null : Array.from(productIds);
  const itemCategoryIds = hasAllItems ? null : Array.from(itemIds);
  const subCategoryIds = hasAllSubs ? null : Array.from(subIds);

  if (!productCategoryIds && !itemCategoryIds && !subCategoryIds) return null;

  return { productCategoryIds, itemCategoryIds, subCategoryIds };
}

module.exports = {
  getUserPermissions,
  hasPermission,
  getUserCategoryAccess,
};
