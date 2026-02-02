const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateRequired, validateEmail } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/requirePermission');

// Verify token endpoint (for checking if token is valid before showing set password form)
router.get('/verify-token/:token', userController.verifyToken);

// Set password endpoint
router.post(
  '/set-password',
  validateRequired(['token', 'password']),
  userController.setPassword
);

// Get current user details
router.get('/me', authenticate, userController.getMe);

// Get users list (requires authentication)
router.get('/', authenticate, requirePermission('accessControl', 'view'), userController.getUsers);

// Get pending invitations (requires authentication)
router.get('/invitations', authenticate, requirePermission('accessControl', 'view'), userController.getInvitations);

// Delete user (requires authentication)
router.delete('/:id', authenticate, requirePermission('accessControl', 'delete'), userController.deleteUser);

// Suspend/Unsuspend user (requires authentication)
router.put('/:id/suspend', authenticate, requirePermission('accessControl', 'edit'), userController.suspendUser);

// Assign roles to user
router.put(
  '/:id/roles',
  authenticate,
  requirePermission('accessControl', 'edit'),
  userController.assignUserRoles
);

// Invite user (requires authentication)
router.post(
  '/invite',
  authenticate,
  requirePermission('accessControl', 'create'),
  validateRequired(['email', 'firstName', 'role']),
  validateEmail('email'),
  userController.inviteUser
);

module.exports = router;
