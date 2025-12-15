const pool = require('../models/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { logger } = require('../utils/logger');

/**
 * Login controller
 */
const login = async (req, res, next) => {
  try {
    const { companyId, email, password } = req.body;

    // Validation is now handled by middleware
    // Additional defensive checks
    if (!companyId || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: companyId, email, and password are required'
      });
    }

    // Ensure companyId and email are strings before calling string methods
    const normalizedCompanyId = String(companyId).toUpperCase().trim();
    const normalizedEmail = String(email).toLowerCase().trim();

    // Find user by company_id and email
    const result = await pool.query(
      `SELECT 
        u.id, u.company_id, u.email, u.password, u.full_name, 
        u.phone, u.role, u.is_active,
        c.company_name
      FROM users u
      INNER JOIN companies c ON u.company_id = c.company_id
      WHERE u.company_id = $1 AND u.email = $2`,
      [normalizedCompanyId, normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid company ID or email' 
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        error: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    // Return success response (exclude password)
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          companyId: user.company_id,
          companyName: user.company_name,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role
        }
      }
    });

  } catch (error) {
    // Log the error for debugging
    logger.error({
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      companyId: req.body?.companyId,
      email: req.body?.email,
      code: error.code
    }, 'Login error');
    
    // Pass error to error handler
    next(error);
  }
};

module.exports = {
  login,
};


