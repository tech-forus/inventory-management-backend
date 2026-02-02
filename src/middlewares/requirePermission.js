const { ForbiddenError } = require('./errorHandler');
const { hasPermission } = require('../utils/rbac');

/**
 * Middleware: require specific permission (module.action)
 * Must run after authenticate.
 * @param {string} module - e.g. 'sku', 'inventory', 'library'
 * @param {string} action - e.g. 'view', 'create', 'edit', 'delete'
 */
function requirePermission(module, action) {
  return async (req, res, next) => {
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;

    if (!userId || !companyId) {
      return next(new ForbiddenError('Access denied'));
    }

    const requiredPermission = `${module}.${action}`;
    const allowed = await hasPermission(userId, companyId, userRole, requiredPermission);

    if (!allowed) {
      return next(new ForbiddenError(`Access denied: ${requiredPermission} required`));
    }

    next();
  };
}

module.exports = { requirePermission };
