/**
 * Validation Middleware
 * Validates request data before processing
 */

/**
 * Validate required fields
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && !req.body[field].trim())) {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing,
      });
    }
    
    next();
  };
};

/**
 * Validate email format
 */
const validateEmail = (field = 'email') => {
  return (req, res, next) => {
    if (req.body[field]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body[field])) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
          field,
        });
      }
    }
    next();
  };
};

/**
 * Validate phone number format
 */
const validatePhone = (field = 'phone') => {
  return (req, res, next) => {
    if (req.body[field]) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(req.body[field].replace(/[\s-]/g, ''))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format (must be 10 digits)',
          field,
        });
      }
    }
    next();
  };
};

/**
 * Validate numeric value
 */
const validateNumeric = (field, min = null, max = null) => {
  return (req, res, next) => {
    if (req.body[field] !== undefined) {
      const value = parseFloat(req.body[field]);
      if (isNaN(value)) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a number`,
          field,
        });
      }
      if (min !== null && value < min) {
        return res.status(400).json({
          success: false,
          error: `${field} must be at least ${min}`,
          field,
        });
      }
      if (max !== null && value > max) {
        return res.status(400).json({
          success: false,
          error: `${field} must be at most ${max}`,
          field,
        });
      }
    }
    next();
  };
};

/**
 * Validate array
 */
const validateArray = (field, minLength = 1) => {
  return (req, res, next) => {
    if (req.body[field] !== undefined) {
      if (!Array.isArray(req.body[field])) {
        return res.status(400).json({
          success: false,
          error: `${field} must be an array`,
          field,
        });
      }
      if (req.body[field].length < minLength) {
        return res.status(400).json({
          success: false,
          error: `${field} must have at least ${minLength} item(s)`,
          field,
        });
      }
    }
    next();
  };
};

/**
 * Validate date format (YYYY-MM-DD)
 * Only validates if the field is provided (optional by default)
 */
const validateDate = (field = 'date', required = false) => {
  return (req, res, next) => {
    // If required and field is missing, return error
    if (required && !req.body[field]) {
      return res.status(400).json({
        success: false,
        error: `${field} is required`,
        field,
      });
    }
    
    // If field is provided, validate format
    if (req.body[field]) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(req.body[field])) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a valid date in YYYY-MM-DD format`,
          field,
        });
      }
      const date = new Date(req.body[field]);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a valid date`,
          field,
        });
      }
    }
    next();
  };
};

/**
 * Validate array items (for nested validation)
 */
const validateArrayItems = (field, validator) => {
  return (req, res, next) => {
    if (req.body[field] && Array.isArray(req.body[field])) {
      for (let i = 0; i < req.body[field].length; i++) {
        const item = req.body[field][i];
        const result = validator(item, i);
        if (result !== true) {
          return res.status(400).json({
            success: false,
            error: result || `Invalid item at index ${i} in ${field}`,
            field,
            index: i,
          });
        }
      }
    }
    next();
  };
};

/**
 * Validate incoming inventory items array
 * Each item must have skuId, totalQuantity, unitPrice
 */
const validateIncomingItems = () => {
  return (req, res, next) => {
    if (req.body.items && Array.isArray(req.body.items)) {
      for (let i = 0; i < req.body.items.length; i++) {
        const item = req.body.items[i];
        if (!item.skuId) {
          return res.status(400).json({
            success: false,
            error: `Item at index ${i} is missing required field: skuId`,
            field: 'items',
            index: i,
          });
        }
        if (item.totalQuantity !== undefined && (isNaN(item.totalQuantity) || item.totalQuantity < 0)) {
          return res.status(400).json({
            success: false,
            error: `Item at index ${i} has invalid totalQuantity (must be a non-negative number)`,
            field: 'items',
            index: i,
          });
        }
        if (item.unitPrice !== undefined && (isNaN(item.unitPrice) || item.unitPrice < 0)) {
          return res.status(400).json({
            success: false,
            error: `Item at index ${i} has invalid unitPrice (must be a non-negative number)`,
            field: 'items',
            index: i,
          });
        }
      }
    }
    next();
  };
};

module.exports = {
  validateRequired,
  validateEmail,
  validatePhone,
  validateNumeric,
  validateArray,
  validateDate,
  validateArrayItems,
  validateIncomingItems,
};


