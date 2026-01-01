const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { UnauthorizedError } = require('./errorHandler');
const { logger } = require('../utils/logger');

/**
 * Authenticate middleware
 * Verifies JWT (Bearer token) and attaches decoded payload to req.user
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization token required');
    }

    const token = authHeader.substring(7);
    
    // Log JWT secret status in development (for debugging)
    if (process.env.NODE_ENV !== 'production') {
      logger.debug({
        hasJwtSecret: !!jwtConfig.secret,
        secretLength: jwtConfig.secret?.length || 0,
        secretPreview: jwtConfig.secret ? `${jwtConfig.secret.substring(0, 10)}...` : 'missing'
      }, 'JWT Config Check');
    }
    
    const decoded = jwt.verify(token, jwtConfig.secret);

    // Normalize to a consistent shape across the app
    req.user = {
      id: decoded.id || decoded.userId,
      userId: decoded.userId || decoded.id,
      companyId: decoded.companyId,
      email: decoded.email,
      role: decoded.role,
      exp: decoded.exp,
      iat: decoded.iat,
    };

    return next();
  } catch (err) {
    // Log the actual error for debugging (in production, log to Railway logs)
    logger.error({
      error: err.message,
      errorName: err.name,
      path: req.path,
      method: req.method,
      hasJwtSecret: !!jwtConfig.secret,
      // Don't log the full secret, just confirm it exists
      secretConfigured: !!jwtConfig.secret && jwtConfig.secret !== 'your-super-secret-jwt-key-change-this-in-production'
    }, 'JWT Verification Failed');
    
    // jwt.verify can throw; normalize to 401
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Helper to read companyId for queries.
 * Most controllers use this instead of directly reading req.user.
 */
const getCompanyId = (req) => {
  // primary: JWT
  if (req.user?.companyId) return req.user.companyId;

  // fallback: header for internal tooling / uploads (keep backwards compatible)
  const headerCompanyId = req.headers['x-company-id'];
  if (headerCompanyId) return String(headerCompanyId).toUpperCase();

  throw new UnauthorizedError('Company ID not found in request');
};

module.exports = {
  authenticate,
  getCompanyId,
};



