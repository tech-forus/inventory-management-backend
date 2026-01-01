const { logger } = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request', details) {
    super(message, 400, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details) {
    super(message, 401, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details) {
    super(message, 403, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found', details) {
    super(message, 404, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details) {
    super(message, 409, details);
  }
}

/**
 * 404 handler - must be after all routes
 */
const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Central error handler - must be last middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err?.statusCode || err?.status || 500;
  const message = err?.message || 'Internal server error';

  // Avoid leaking stack traces in production responses
  const isProd = process.env.NODE_ENV === 'production';

  // Log full error
  logger.error(
    {
      statusCode,
      message,
      name: err?.name,
      details: err?.details,
      stack: err?.stack,
      method: req?.method,
      url: req?.originalUrl,
    },
    'Request error'
  );

  const payload = {
    success: false,
    error: message,
  };

  if (!isProd && err?.details) payload.details = err.details;

  // If headers already sent, delegate to Express default handler
  if (res.headersSent) return next(err);

  return res.status(statusCode).json(payload);
};

module.exports = {
  // middleware
  notFoundHandler,
  errorHandler,
  // base + typed errors
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};