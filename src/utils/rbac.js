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
 * Get category access for a user.
 * Priority: 1) user_category_access (from invite/CategoryAccessWizard), 2) role_category_access (from roles).
 * Super_admin: returns null (full access, no filtering)
 * User with no restrictions: returns null (full access)
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

  // 1) User-level category access (from invite/CategoryAccessWizard) - takes precedence
  const userAccessResult = await pool.query(
    `SELECT product_category_ids, item_category_ids, sub_category_ids
     FROM user_category_access
     WHERE user_id = $1 AND UPPER(company_id) = UPPER($2)`,
    [userId, normalizedCompanyId]
  );

  if (userAccessResult.rows.length > 0) {
    const row = userAccessResult.rows[0];
    const productCategoryIds = row.product_category_ids?.length ? row.product_category_ids : null;
    const itemCategoryIds = row.item_category_ids?.length ? row.item_category_ids : null;
    const subCategoryIds = row.sub_category_ids?.length ? row.sub_category_ids : null;
    if (productCategoryIds || itemCategoryIds || subCategoryIds) {
      logger.info({
        msg: '[getUserCategoryAccess]',
        source: 'user_category_access',
        userId,
        companyId: normalizedCompanyId,
        productIds: productCategoryIds || [],
        itemIds: itemCategoryIds || [],
        subIds: subCategoryIds || [],
      });
      return { productCategoryIds, itemCategoryIds, subCategoryIds };
    }
  }

  // 2) Role-level category access (from role_category_access) - fallback
  const result = await pool.query(
    `SELECT rca.product_category_ids, rca.item_category_ids, rca.sub_category_ids
     FROM user_roles ur
     JOIN role_category_access rca ON ur.role_id = rca.role_id
     WHERE ur.user_id = $1 AND UPPER(ur.company_id) = UPPER($2)`,
    [userId, normalizedCompanyId]
  );

  logger.info({
    msg: '[getUserCategoryAccess]',
    source: 'role_category_access',
    userId,
    companyId: normalizedCompanyId,
    rowCount: result.rows.length,
    hasRestrictions: result.rows.some(
      (r) =>
        (r.product_category_ids?.length || 0) > 0 ||
        (r.item_category_ids?.length || 0) > 0 ||
        (r.sub_category_ids?.length || 0) > 0
    ),
    productIds: result.rows.flatMap((r) => r.product_category_ids || []),
    itemIds: result.rows.flatMap((r) => r.item_category_ids || []),
    subIds: result.rows.flatMap((r) => r.sub_category_ids || []),
  });

  if (result.rows.length === 0) return null; // No role_category_access = full access

  // Only roles with non-empty arrays contribute to restrictions.
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
