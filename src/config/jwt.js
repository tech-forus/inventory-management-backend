require('dotenv').config();

/**
 * JWT Configuration
 */
module.exports = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  expiresIn: process.env.JWT_EXPIRE || '7d', // 7 days for persistent login
};

