const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { validateRequired } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/requirePermission');

// Get all permissions (global list)
router.get('/permissions', authenticate, roleController.getPermissions);

// Get all roles (requires authentication)
router.get('/', authenticate, requirePermission('accessControl', 'view'), roleController.getRoles);

// Create a new role (requires authentication)
router.post(
  '/',
  authenticate,
  requirePermission('accessControl', 'create'),
  validateRequired(['name']),
  roleController.createRole
);

// Update a role (requires authentication)
router.put(
  '/:id',
  authenticate,
  requirePermission('accessControl', 'edit'),
  roleController.updateRole
);

// Delete a role (requires authentication)
router.delete('/:id', authenticate, requirePermission('accessControl', 'delete'), roleController.deleteRole);

module.exports = router;

