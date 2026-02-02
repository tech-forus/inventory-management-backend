const pool = require('../models/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { logger } = require('../utils/logger');
const { getUserPermissions } = require('../utils/rbac');

/**
 * Login controller
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and password are required'
      });
    }

    const input = String(email).trim();
    const isEmail = input.includes('@');

    let normalizedEmail = null;
    let normalizedPhone = null;

    if (isEmail) {
      normalizedEmail = input.toLowerCase();
    } else {
      normalizedPhone = input.replace(/[\s\-\(\)\+]/g, '');
      if (normalizedPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be 10 digits'
        });
      }
    }

    let query;
    let params;

    if (isEmail) {
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

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    const currentTimestamp = new Date();
    try {
      if (user.role === 'admin' || user.role === 'super_admin') {
        await pool.query(
          'UPDATE admins SET last_login = $1, updated_at = $1 WHERE user_id = $2',
          [currentTimestamp, user.id]
        );
      } else if (user.role === 'user' || user.role === 'sales') {
        await pool.query(
          'UPDATE users_data SET last_login = $1, updated_at = $1 WHERE user_id = $2',
          [currentTimestamp, user.id]
        );
      }
    } catch (updateError) {
      logger.warn({
        userId: user.id,
        role: user.role,
        error: updateError.message
      }, 'Failed to update last_login timestamp');
    }

    // RBAC: resolve permissions from user_roles -> role_permissions -> permissions
    let permissions = [];
    try {
      permissions = await getUserPermissions(user.id, user.company_id);
      // Super admin / admin with no RBAC roles: grant all (legacy)
      if ((user.role === 'super_admin' || user.role === 'admin') && permissions.length === 0) {
        permissions = ['*'];
      }
    } catch (permError) {
      logger.warn({ userId: user.id, error: permError.message }, 'Failed to fetch RBAC permissions');
      if (user.role === 'super_admin' || user.role === 'admin') {
        permissions = ['*'];
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

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
        }
      }
    });

  } catch (error) {
    logger.error({
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
      code: error.code
    }, 'Login error');

    next(error);
  }
};

module.exports = {
  login,
};
