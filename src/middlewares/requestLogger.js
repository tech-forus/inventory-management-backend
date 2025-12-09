const { logger, generateRequestId } = require('../utils/logger');

/**
 * Request logger middleware
 * Logs request method, path, status, duration, and request ID
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = generateRequestId();
  
  // Attach request ID to request object for use in controllers
  req.id = requestId;
  
  // Log request start
  logger.debug({
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  }, 'Incoming request');

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logData = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
    };

    // Add user info if available
    if (req.user) {
      logData.userId = req.user.id;
      logData.companyId = req.user.companyId;
    }

    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error(logData, 'Request failed');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
};

module.exports = requestLogger;

