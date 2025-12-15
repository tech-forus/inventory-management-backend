const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Middleware to extract and verify JWT token
 * Adds decoded token data to req.user
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to extract company ID from request
 * Tries JWT token first (from req.user set by authenticate middleware), then body, then headers
 * Throws error if companyId is missing (no fallback for production safety)
 */
const getCompanyId = (req) => {
  // Try to get from JWT token first (set by authenticate middleware)
  if (req.user?.companyId) {
    return req.user.companyId;
  }

  // Try to get from body
  if (req.body.companyId) {
    return req.body.companyId;
  }

  // Try to get from headers
  if (req.headers['x-company-id']) {
    return req.headers['x-company-id'];
  }

  // No fallback - throw error for production safety
  const error = new Error('Missing companyId');
  error.status = 400;
  throw error;
};

module.exports = {
  authenticate,
  getCompanyId,
};

