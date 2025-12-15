const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { validateRequired, validateEmail, validatePhone } = require('../middlewares/validation');

router.post(
  '/register',
  validateRequired([
    'companyName',
    'gstNumber',
    'businessType',
    'address',
    'city',
    'state',
    'pin',
    'phone',
    'fullName',
    'email',
    'adminPhone',
    'password'
  ]),
  validateEmail('email'),
  validatePhone('phone'),
  validatePhone('adminPhone'),
  companyController.register
);

router.get('/:companyId', companyController.getCompany);

module.exports = router;
