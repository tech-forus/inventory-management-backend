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
    // Also get phone from admins or users_data tables if not in users table
    const result = await pool.query(
      `SELECT 
        u.id, u.company_id, u.email, u.password, u.full_name, 
        COALESCE(u.phone, a.phone, ud.phone) as phone,
        u.role, u.is_active,
        c.company_name
      FROM users u
      INNER JOIN companies c ON u.company_id = c.company_id
      LEFT JOIN admins a ON u.id = a.user_id
      LEFT JOIN users_data ud ON u.id = ud.user_id
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

    // Update last_login timestamp in the appropriate table based on role
    const currentTimestamp = new Date();
    try {
      if (user.role === 'admin' || user.role === 'super_admin') {
        // Update last_login in admins table
        await pool.query(
          'UPDATE admins SET last_login = $1, updated_at = $1 WHERE user_id = $2',
          [currentTimestamp, user.id]
        );
      } else if (user.role === 'user' || user.role === 'sales') {
        // Update last_login in users_data table
        await pool.query(
          'UPDATE users_data SET last_login = $1, updated_at = $1 WHERE user_id = $2',
          [currentTimestamp, user.id]
        );
      }
    } catch (updateError) {
      // Log error but don't fail login if last_login update fails
      logger.warn({
        userId: user.id,
        role: user.role,
        error: updateError.message
      }, 'Failed to update last_login timestamp');
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


