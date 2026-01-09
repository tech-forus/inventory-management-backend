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
    const { email, password } = req.body;

    // Validation is now handled by middleware
    // Additional defensive checks
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and password are required'
      });
    }

    // Determine if input is email or phone number
    const input = String(email).trim();
    const isEmail = input.includes('@');

    let normalizedEmail = null;
    let normalizedPhone = null;

    if (isEmail) {
      // Normalize email: lowercase
      normalizedEmail = input.toLowerCase();
    } else {
      // Normalize phone: remove spaces, dashes, parentheses, plus signs, keep only digits
      normalizedPhone = input.replace(/[\s\-\(\)\+]/g, '');
      // Ensure it's exactly 10 digits
      if (normalizedPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be 10 digits'
        });
      }
    }

    // Find user by email OR phone
    // Also get phone from admins or users_data tables if not in users table
    let query;
    let params;

    if (isEmail) {
      // Query by email only
      query = `SELECT 
        u.id, u.company_id, u.email, u.password, u.full_name, 
        COALESCE(u.phone, a.phone, ud.phone) as phone,
        u.role, u.is_active,
        c.company_name
      FROM users u
      INNER JOIN companies c ON u.company_id = c.company_id
      LEFT JOIN admins a ON u.id = a.user_id
      LEFT JOIN users_data ud ON u.id = ud.user_id
      WHERE u.email = $1`;
      params = [normalizedEmail];
    } else {
      // Query by phone - check users, admins, and users_data tables
      query = `SELECT 
        u.id, u.company_id, u.email, u.password, u.full_name, 
        COALESCE(u.phone, a.phone, ud.phone) as phone,
        u.role, u.is_active,
        c.company_name
      FROM users u
      INNER JOIN companies c ON u.company_id = c.company_id
      LEFT JOIN admins a ON u.id = a.user_id
      LEFT JOIN users_data ud ON u.id = ud.user_id
      WHERE u.phone = $1 OR a.phone = $1 OR ud.phone = $1`;
      params = [normalizedPhone];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/phone number or password'
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

    // Fetch module_access and category_access from database
    let moduleAccess = {};
    let categoryAccess = [];
    let permissions = [];

    try {
      let accessQuery;
      if (user.role === 'admin' || user.role === 'super_admin') {
        accessQuery = await pool.query(
          'SELECT module_access, category_access, permissions FROM admins WHERE user_id = $1',
          [user.id]
        );
      } else {
        accessQuery = await pool.query(
          'SELECT module_access, category_access, permissions FROM users_data WHERE user_id = $1',
          [user.id]
        );
      }

      if (accessQuery.rows.length > 0) {
        const accessData = accessQuery.rows[0];

        // Parse module_access
        if (accessData.module_access) {
          moduleAccess = typeof accessData.module_access === 'string'
            ? JSON.parse(accessData.module_access)
            : accessData.module_access;
        }

        // Parse category_access
        if (accessData.category_access) {
          categoryAccess = typeof accessData.category_access === 'string'
            ? JSON.parse(accessData.category_access)
            : accessData.category_access;
        }

        // Parse permissions and convert moduleAccess to flat permissions array
        if (moduleAccess && typeof moduleAccess === 'object') {
          permissions = [];
          for (const [module, actions] of Object.entries(moduleAccess)) {
            if (actions && typeof actions === 'object') {
              for (const [action, allowed] of Object.entries(actions)) {
                if (allowed) {
                  permissions.push(`${module}.${action}`);
                }
              }
            }
          }
        }
      }
    } catch (accessError) {
      logger.warn({
        userId: user.id,
        error: accessError.message
      }, 'Failed to fetch user access permissions');
    }

    // Generate JWT token (include categoryAccess for access control)
    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
        categoryAccess: Array.isArray(categoryAccess) ? categoryAccess : []
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    // Return success response (exclude password, include permissions)
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
          role: user.role,
          permissions: Array.isArray(permissions) ? permissions : [],
          moduleAccess: moduleAccess || {},
          categoryAccess: Array.isArray(categoryAccess) ? categoryAccess : []
        }
      }
    });

  } catch (error) {
    // Log the error for debugging
    logger.error({
      requestId: req.id,
      error: error.message,
      stack: error.stack,
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


