/**
 * RBAC utilities - resolve user permissions from roles
 */
const pool = require('../models/database');
const { logger } = require('../utils/logger');

/**
 * Get all permissions for a user in a company (from user_roles -> role_permissions -> permissions)
 * @param {number} userId
 * @param {string} companyId
 * @returns {Promise<string[]>} Array of "module.action" strings
 */
async function getUserPermissions(userId, companyId) {
  const normalizedCompanyId = String(companyId || '').toUpperCase();
  const result = await pool.query(
    `SELECT DISTINCT p.module, p.action
     FROM user_roles ur
     JOIN role_permissions rp ON ur.role_id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE ur.user_id = $1 AND UPPER(ur.company_id) = UPPER($2)`,
    [userId, normalizedCompanyId]
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
 * Super_admin: returns null (full access, no filtering)
 * User with no role_category_access rows: returns null (full access)
 * User with role_category_access: returns { productCategoryIds, itemCategoryIds, subCategoryIds }
 *   - Empty array at a level = no restriction from that role
 *   - Non-empty array = restrict to those IDs only
 * For multiple roles: apply union of non-empty restrictions. Only roles with non-empty arrays
 * contribute; a role with empty arrays does NOT grant full access (avoids Admin+User bypass).
 * @param {number} userId
 * @param {string} companyId
 * @param {string} userRole - from users.role (admin, super_admin, user, sales)
 * @returns {Promise<{ productCategoryIds: number[], itemCategoryIds: number[], subCategoryIds: number[] } | null>}
 */
async function getUserCategoryAccess(userId, companyId, userRole) {
  if (!userId || !companyId) return null;

  // Only super_admin bypasses (system-wide full access)
  if (userRole === 'super_admin') return null;

  const normalizedCompanyId = String(companyId).toUpperCase();
  const result = await pool.query(
    `SELECT rca.product_category_ids, rca.item_category_ids, rca.sub_category_ids
     FROM user_roles ur
     JOIN role_category_access rca ON ur.role_id = rca.role_id
     WHERE ur.user_id = $1 AND UPPER(ur.company_id) = UPPER($2)`,
    [userId, normalizedCompanyId]
  );

  logger.info({
    msg: '[getUserCategoryAccess] query result',
    userId,
    companyId: normalizedCompanyId,
    rowCount: result.rows.length,
    rows: result.rows.map((r) => ({
      product_category_ids: r.product_category_ids,
      item_category_ids: r.item_category_ids,
      sub_category_ids: r.sub_category_ids,
    })),
  });

  if (result.rows.length === 0) return null; // No role_category_access = full access

  // Only roles with non-empty arrays contribute to restrictions.
  // If ANY role has non-empty at a level → apply union of those IDs.
  // If ALL roles have empty at a level → no filter (full access at that level).
  const productIds = new Set();
  const itemIds = new Set();
  const subIds = new Set();
  for (const row of result.rows) {
    if (row.product_category_ids?.length) row.product_category_ids.forEach((id) => productIds.add(id));
    if (row.item_category_ids?.length) row.item_category_ids.forEach((id) => itemIds.add(id));
    if (row.sub_category_ids?.length) row.sub_category_ids.forEach((id) => subIds.add(id));
  }

  const productCategoryIds = productIds.size > 0 ? Array.from(productIds) : null;
  const itemCategoryIds = itemIds.size > 0 ? Array.from(itemIds) : null;
  const subCategoryIds = subIds.size > 0 ? Array.from(subIds) : null;

  if (!productCategoryIds && !itemCategoryIds && !subCategoryIds) return null;

  return { productCategoryIds, itemCategoryIds, subCategoryIds };
}

module.exports = {
  getUserPermissions,
  hasPermission,
  getUserCategoryAccess,
};
