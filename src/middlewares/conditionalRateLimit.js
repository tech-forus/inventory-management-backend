const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Conditional Rate Limiter
 * Allows unlimited requests for authenticated users (JWT valid for 12 hours)
 * Rate limits unauthenticated users
 */
const createConditionalRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // Max requests per window for unauthenticated users
    message = {
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  // Create the base rate limiter
  const limiter = rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    // Custom key generator - uses IP for unauthenticated, user ID for authenticated
    keyGenerator: (req) => {
      // Check if user is authenticated
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, jwtConfig.secret);
          
          // If token is valid, use user ID as key (allows unlimited for this user)
          // This effectively bypasses rate limiting for authenticated users
          return `authenticated:${decoded.id || decoded.userId || decoded.companyId}`;
        } catch (error) {
          // Invalid token, fall back to IP-based limiting using proper IPv6 helper
          return ipKeyGenerator(req);
        }
      }
      
      // For unauthenticated users, use IP address with proper IPv6 handling
      return ipKeyGenerator(req);
    },
    // Custom skip function - skip rate limiting for authenticated users
    skip: (req) => {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, jwtConfig.secret);
          
          // Check if token is still valid (within 12 hours)
          const now = Math.floor(Date.now() / 1000);
          const tokenExp = decoded.exp || 0;
          
          // If token is valid and not expired, skip rate limiting
          if (tokenExp > now) {
            return true; // Skip rate limiting for authenticated users
          }
        } catch (error) {
          // Invalid or expired token, apply rate limiting
          return false;
        }
      }
      
      // No valid token, apply rate limiting
      return false;
    },
  });

  return limiter;
};

/**
 * Pre-configured rate limiters for different use cases
 */

// For general API endpoints - unlimited for authenticated, 100/15min for unauthenticated
const apiRateLimiter = createConditionalRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes for unauthenticated users
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please authenticate or try again later.',
  },
});

// For authentication endpoints - stricter limits for unauthenticated
const authRateLimiter = createConditionalRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes for unauthenticated
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts, please try again later',
  },
});

// For high-value endpoints - moderate limits for unauthenticated
const strictRateLimiter = createConditionalRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes for unauthenticated users
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please authenticate for unlimited access.',
  },
});

module.exports = {
  createConditionalRateLimit,
  apiRateLimiter,
  authRateLimiter,
  strictRateLimiter,
};

