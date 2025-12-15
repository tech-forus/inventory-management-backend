/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

const { logger } = require('../utils/logger');

/**
 * Error handling middleware
 * Standardized error response format
 */
const errorHandler = (err, req, res, next) => {
  // Log error with request context
  const logData = {
    requestId: req.id || 'unknown',
    method: req.method || 'UNKNOWN',
    path: req.originalUrl || req.url || 'unknown',
    error: err.message || 'Unknown error',
    stack: err.stack,
    status: err.status || 500,
    code: err.code,
  };
  
  if (req.user) {
    logData.userId = req.user.id;
    logData.companyId = req.user.companyId;
  }
  
  logger.error(logData, 'Request error');
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    const error = new ForbiddenError('Not allowed by CORS', { origin: req.headers.origin });
    return sendErrorResponse(error, res);
  }
  
  // Handle PostgreSQL errors
  if (err.code === '23505') { // Unique violation
    const error = new ConflictError('A record with this information already exists', {
      constraint: err.constraint,
      table: err.table
    });
    return sendErrorResponse(error, res);
  }
  
  if (err.code === '23503') { // Foreign key violation
    const error = new ValidationError('Referenced record does not exist', {
      constraint: err.constraint,
      table: err.table
    });
    return sendErrorResponse(error, res);
  }

  // Handle column/table does not exist errors (likely migration not run)
  if (err.code === '42703' || err.code === '42P01') { // Undefined column or table
    const error = new AppError(
      'Database schema error: Missing column or table. Please run database migrations.',
      500,
      'DATABASE_SCHEMA_ERROR',
      {
        originalError: err.message,
        hint: err.hint || 'Run migration: 024_update_incoming_inventory_document_fields.sql',
        code: err.code
      }
    );
    return sendErrorResponse(error, res);
  }

  // Handle other PostgreSQL errors
  if (err.code && err.code.startsWith('42')) { // PostgreSQL syntax/type errors
    const error = new AppError(
      `Database error: ${err.message || 'A database error occurred'}`,
      500,
      'DATABASE_ERROR',
      {
        originalError: err.message,
        detail: err.detail,
        hint: err.hint,
        code: err.code
      }
    );
    return sendErrorResponse(error, res);
  }

  // Handle custom AppError instances
  if (err instanceof AppError) {
    return sendErrorResponse(err, res);
  }

  // Handle errors with status property (from getCompanyId, etc.)
  if (err.status) {
    const error = new AppError(
      err.message || 'An error occurred',
      err.status,
      err.code || 'ERROR',
      err.details
    );
    return sendErrorResponse(error, res);
  }

  // Default to 500 Internal Server Error
  const error = new AppError(
    err.message || 'Something went wrong',
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'development' ? { originalError: err.message } : null
  );
  
  return sendErrorResponse(error, res);
};

/**
 * Send standardized error response
 * ALWAYS includes success: false for consistency
 */
const sendErrorResponse = (error, res) => {
  const response = {
    success: false, // MANDATORY: Always include success field
    error: error.code || 'INTERNAL_SERVER_ERROR',
    message: error.message || 'Something went wrong',
  };

  // Add details if present
  if (error.details) {
    response.details = error.details;
  }

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(error.status || 500).json(response);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  const error = new NotFoundError('Route not found', { path: req.path });
  sendErrorResponse(error, res);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};

