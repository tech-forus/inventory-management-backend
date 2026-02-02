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

module.exports = {
  getUserPermissions,
  hasPermission,
};
