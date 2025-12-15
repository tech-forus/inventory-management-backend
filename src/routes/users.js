const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateRequired, validateEmail } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');


// Verify token endpoint (for checking if token is valid before showing set password form)
router.get('/verify-token/:token', userController.verifyToken);

// Set password endpoint
router.post(
  '/set-password',
  validateRequired(['token', 'password']),
  userController.setPassword
);

// Get users list (requires authentication)
router.get('/', authenticate, userController.getUsers);

// Get pending invitations (requires authentication)
router.get('/invitations', authenticate, userController.getInvitations);

// Delete user (requires authentication)
router.delete('/:id', authenticate, userController.deleteUser);

// Suspend/Unsuspend user (requires authentication)
router.put('/:id/suspend', authenticate, userController.suspendUser);

// Invite user (requires authentication)
router.post(
  '/invite',
  authenticate,
  validateRequired(['email', 'firstName', 'lastName', 'role']),
  validateEmail('email'),
  userController.inviteUser
);

module.exports = router;

