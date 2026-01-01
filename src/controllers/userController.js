const pool = require('../models/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { sendInvitationEmail } = require('../utils/emailService');
const { logger } = require('../utils/logger');
const { NotFoundError, BadRequestError, ConflictError } = require('../middlewares/errorHandler');
const { getCompanyId } = require('../middlewares/auth');

/**
 * Invite a new user (admin or regular user)
 */
const inviteUser = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      email,
      firstName,
      lastName,
      employeeId,
      role,
      department,
      moduleAccess,
      categoryAccess,
    } = req.body;

    // Get company_id from authenticated user or request
    let companyId;
    try {
      companyId = getCompanyId(req);
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Normalize email
    const normalizedEmail = String(email).toLowerCase().trim();

    // Check if user already exists in this company
    const existingUser = await client.query(
      'SELECT id FROM users WHERE company_id = $1 AND email = $2',
      [companyId, normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new ConflictError('User with this email already exists in your company');
    }

    // Generate password reset token (for setting password)
    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date();
    passwordResetExpires.setHours(passwordResetExpires.getHours() + 24); // 24 hours expiry

    // Create temporary password (will be changed when user sets password)
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Insert user into users table
    const userResult = await client.query(
      `INSERT INTO users (
        company_id, email, password, full_name, phone, role,
        password_reset_token, password_reset_expires, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, company_id, email, full_name, role`,
      [
        companyId,
        normalizedEmail,
        hashedPassword,
        `${firstName} ${lastName}`,
        null, // phone can be added later
        role === 'admin' ? 'admin' : 'user',
        passwordResetToken,
        passwordResetExpires,
        true
      ]
    );

    const user = userResult.rows[0];

    // Determine which table to insert into based on role
    const isAdmin = role === 'admin';
    const dataTable = isAdmin ? 'admins' : 'users_data';

    // Insert into admins or users_data table
    await client.query(
      `INSERT INTO ${dataTable} (
        user_id, company_id, first_name, last_name, employee_id,
        email, department, permissions, module_access, category_access, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        user.id,
        companyId,
        firstName,
        lastName,
        employeeId || null,
        normalizedEmail,
        department || null,
        JSON.stringify({}), // permissions
        JSON.stringify(moduleAccess || {}),
        JSON.stringify(categoryAccess || []),
        true
      ]
    );

    await client.query('COMMIT');

    // Send invitation email
    try {
      await sendInvitationEmail(
        normalizedEmail,
        firstName,
        lastName,
        passwordResetToken,
        companyId
      );
    } catch (emailError) {
      logger.error({
        error: emailError.message,
        stack: emailError.stack,
        email: normalizedEmail
      }, 'Failed to send invitation email');
      // Don't fail the request if email fails, but log it
    }

    res.status(201).json({
      success: true,
      message: 'User invited successfully. Invitation email sent.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Verify password reset token
 */
const verifyToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.email, u.company_id, u.password_reset_expires, u.full_name,
              c.company_name
       FROM users u
       INNER JOIN companies c ON u.company_id = c.company_id
       WHERE u.password_reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.password_reset_expires)) {
      return res.status(400).json({
        success: false,
        error: 'Token has expired. Please request a new invitation.'
      });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        companyId: user.company_id,
        companyName: user.company_name,
        name: user.full_name
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Set password for invited user
 */
const setPassword = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { token, password } = req.body;

    if (!token || !password) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Token and password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Find user by token
    const result = await client.query(
      `SELECT id, email, company_id, password_reset_expires, is_active
       FROM users
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.password_reset_expires)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Token has expired. Please request a new invitation.'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password, clear reset token, and ensure user is active
    // Users can directly access the system after setting password - no additional verification needed
    await client.query(
      `UPDATE users
       SET password = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    // Get user details with permissions for JWT token
    // Fetch permissions from admins or users_data table based on role
    let userDetails;
    if (user.role === 'admin' || user.role === 'super_admin') {
      userDetails = await client.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.company_id, c.company_name,
                a.permissions, a.module_access
         FROM users u
         INNER JOIN companies c ON u.company_id = c.company_id
         LEFT JOIN admins a ON u.id = a.user_id
         WHERE u.id = $1`,
        [user.id]
      );
    } else {
      userDetails = await client.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.company_id, c.company_name,
                ud.permissions, ud.module_access
         FROM users u
         INNER JOIN companies c ON u.company_id = c.company_id
         LEFT JOIN users_data ud ON u.id = ud.user_id
         WHERE u.id = $1`,
        [user.id]
      );
    }

    await client.query('COMMIT');

    const userData = userDetails.rows[0];
    
    // Parse permissions and module_access from JSON
    let permissions = [];
    let moduleAccess = {};
    try {
      if (userData.permissions) {
        const parsedPermissions = typeof userData.permissions === 'string' 
          ? JSON.parse(userData.permissions) 
          : userData.permissions;
        // Convert permissions object to array format expected by frontend
        if (typeof parsedPermissions === 'object' && !Array.isArray(parsedPermissions)) {
          // If permissions is an object, convert moduleAccess to permissions array
          permissions = [];
        } else if (Array.isArray(parsedPermissions)) {
          permissions = parsedPermissions;
        }
      }
      if (userData.module_access) {
        moduleAccess = typeof userData.module_access === 'string'
          ? JSON.parse(userData.module_access)
          : userData.module_access;
        
        // Convert moduleAccess object to permissions array format (e.g., "sku.view", "inventory.create")
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
    } catch (parseError) {
      logger.warn({ error: parseError.message, userId: userData.id }, 'Failed to parse permissions');
    }

    // Generate JWT token so user can login immediately without going to login page
    const authToken = jwt.sign(
      {
        userId: userData.id,
        companyId: userData.company_id,
        email: userData.email,
        role: userData.role
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      success: true,
      message: 'Password set successfully. You are now logged in.',
      data: {
        token: authToken,
        user: {
          id: userData.id,
          companyId: userData.company_id,
          companyName: userData.company_name,
          email: userData.email,
          fullName: userData.full_name,
          role: userData.role,
          permissions: Array.isArray(permissions) ? permissions : [],
          moduleAccess: moduleAccess || {}
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get list of users with optional filters
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, status } = req.query;
    let companyId;
    try {
      companyId = getCompanyId(req);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    let query = `
      SELECT 
        u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
        COALESCE(a.last_login, ud.last_login) as last_login,
        COALESCE(a.department, ud.department) as department,
        COALESCE(a.employee_id, ud.employee_id) as employee_id
      FROM users u
      LEFT JOIN admins a ON u.id = a.user_id
      LEFT JOIN users_data ud ON u.id = ud.user_id
      WHERE u.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;

    if (role && role !== 'all' && role !== '') {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (status === 'suspended') {
      query += ` AND u.is_active = false`;
    } else if (status === 'active') {
      query += ` AND u.is_active = true`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);

    const users = result.rows.map(row => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      department: row.department,
      employeeId: row.employee_id,
      status: row.is_active ? 'active' : 'suspended',
      lastLogin: row.last_login,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get list of pending invitations (users who haven't set password yet)
 */
const getInvitations = async (req, res, next) => {
  try {
    let companyId;
    try {
      companyId = getCompanyId(req);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.full_name, u.role, u.password_reset_expires, u.created_at,
        COALESCE(a.department, ud.department) as department,
        COALESCE(a.employee_id, ud.employee_id) as employee_id
      FROM users u
      LEFT JOIN admins a ON u.id = a.user_id
      LEFT JOIN users_data ud ON u.id = ud.user_id
      WHERE u.company_id = $1 
        AND u.password_reset_token IS NOT NULL
        AND u.password_reset_expires > CURRENT_TIMESTAMP
      ORDER BY u.created_at DESC`,
      [companyId]
    );

    const invitations = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.full_name,
      role: row.role,
      department: row.department,
      employeeId: row.employee_id,
      expiresAt: row.password_reset_expires,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: invitations
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user
 */
const deleteUser = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    let companyId;
    try {
      companyId = getCompanyId(req);
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Check if user exists and belongs to company
    const userCheck = await client.query(
      'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userCheck.rows[0];

    // Delete from admins or users_data table first (due to foreign key)
    if (user.role === 'admin') {
      await client.query('DELETE FROM admins WHERE user_id = $1', [id]);
    } else {
      await client.query('DELETE FROM users_data WHERE user_id = $1', [id]);
    }

    // Delete from users table (cascade will handle related records)
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Suspend/Unsuspend a user
 */
const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    let companyId;
    try {
      companyId = getCompanyId(req);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Check if user exists and belongs to company
    const userCheck = await pool.query(
      'SELECT id, is_active FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentStatus = userCheck.rows[0].is_active;
    const newStatus = !currentStatus;

    await pool.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'suspended'} successfully`,
      data: {
        id: parseInt(id),
        isActive: newStatus
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  inviteUser,
  verifyToken,
  setPassword,
  getUsers,
  getInvitations,
  deleteUser,
  suspendUser,
};

