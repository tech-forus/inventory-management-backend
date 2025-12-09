const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequired, validateEmail } = require('../middlewares/validation');

router.post(
  '/login',
  validateRequired(['companyId', 'email', 'password']),
  validateEmail('email'),
  authController.login
);

module.exports = router;
