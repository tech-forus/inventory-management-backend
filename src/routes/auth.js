const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequired, validateEmailOrPhone } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');
const { getUserPermissions, getUserCategoryAccess } = require('../utils/rbac');

router.post(
  '/login',
  validateRequired(['email', 'password']),
  validateEmailOrPhone('email'),
  authController.login
);

// Current user profile (used by frontend for permissions)
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;

    if (!userId || !companyId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let permissions = await getUserPermissions(userId, companyId);

    // Super admin / admin with no RBAC roles: full access
    if ((userRole === 'super_admin' || userRole === 'admin') && permissions.length === 0) {
      permissions = ['*'];
    }

    const categoryAccess = await getUserCategoryAccess(userId, companyId, userRole);

    return res.json({
      success: true,
      data: {
        userId,
        companyId,
        role: userRole,
        permissions: Array.isArray(permissions) ? permissions : [],
        categoryAccess: categoryAccess || undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
