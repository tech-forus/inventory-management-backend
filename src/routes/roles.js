const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { validateRequired } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');

// Get all roles (requires authentication)
router.get('/', authenticate, roleController.getRoles);

// Create a new role (requires authentication)
router.post(
  '/',
  authenticate,
  validateRequired(['name']),
  roleController.createRole
);

// Update a role (requires authentication)
router.put(
  '/:id',
  authenticate,
  validateRequired(['name']),
  roleController.updateRole
);

// Delete a role (requires authentication)
router.delete('/:id', authenticate, roleController.deleteRole);

module.exports = router;

