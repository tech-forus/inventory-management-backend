const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequired, validateEmail } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');
const pool = require('../models/database');

router.post(
  '/login',
  validateRequired(['companyId', 'email', 'password']),
  validateEmail('email'),
  authController.login
);

// Current user profile (used by frontend AuthGate / route guards)
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;

    if (!role || !userId || !companyId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Super admin: allow everything by default
    if (role === 'super_admin') {
      return res.json({
        success: true,
        data: {
          userId,
          companyId,
          role,
          moduleAccess: { all: true },
          categoryAccess: ['*'],
          permissions: { all: true },
        },
      });
    }

    const table = role === 'admin' ? 'admins' : 'users_data';
    const result = await pool.query(
      `SELECT module_access, category_access, permissions
       FROM ${table}
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );

    const row = result.rows[0] || {};
    return res.json({
      success: true,
      data: {
        userId,
        companyId,
        role,
        moduleAccess: row.module_access || {},
        categoryAccess: row.category_access || [],
        permissions: row.permissions || {},
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
