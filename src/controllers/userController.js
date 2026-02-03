const pool = require('../models/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { sendInvitationEmail } = require('../utils/emailService');
const { logger } = require('../utils/logger');
const { NotFoundError, BadRequestError, ConflictError } = require('../middlewares/errorHandler');
const { getCompanyId } = require('../middlewares/auth');
const { getUserPermissions } = require('../utils/rbac');

/**
 * Get current user details (RBAC permissions)
 */
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT u.id, u.company_id, c.company_name, u.email, u.full_name, u.phone, u.role, u.is_active
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    let permissions = await getUserPermissions(userId, user.company_id);
    if ((user.role === 'super_admin' || user.role === 'admin') && permissions.length === 0) {
      permissions = ['*'];
    }

    res.json({
      success: true,
      data: {
        ...user,
        permissions: Array.isArray(permissions) ? permissions : [],
      }
    });
  } catch (error) {
    next(error);
  }
};

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
      roleIds = [],
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

    // Derive users.role from RBAC roleIds (not legacy role dropdown)
    // If any assigned role is Admin, use admin; otherwise user
    let derivedRole = 'user';
    const roleIdArray = Array.isArray(roleIds) ? roleIds : [];
    if (roleIdArray.length > 0) {
      const placeholders = roleIdArray.map((_, i) => `$${i + 1}`).join(',');
      const roleNamesResult = await client.query(
        `SELECT name FROM roles WHERE id IN (${placeholders}) AND company_id = $${roleIdArray.length + 1}`,
        [...roleIdArray, companyId]
      );
      const hasAdminRole = roleNamesResult.rows.some((r) => r.name && String(r.name).toLowerCase() === 'admin');
      if (hasAdminRole) derivedRole = 'admin';
    } else if (role === 'admin') {
      derivedRole = 'admin'; // Fallback if no roleIds (legacy)
    }

    // Insert user into users table
    // Combine firstName and lastName (lastName is optional)
    const fullName = lastName && lastName.trim()
      ? `${firstName} ${lastName}`.trim()
      : firstName.trim();

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
        fullName,
        null, // phone can be added later
        derivedRole,
        passwordResetToken,
        passwordResetExpires,
        true
      ]
    );

    const user = userResult.rows[0];

    // Determine which table to insert into based on derived role
    const isAdmin = derivedRole === 'admin';
    const dataTable = isAdmin ? 'admins' : 'users_data';

    // Insert into admins or users_data table
    // lastName is optional, so use null if not provided or empty
    const lastNameValue = lastName && lastName.trim() ? lastName.trim() : null;

    await client.query(
      `INSERT INTO ${dataTable} (
        user_id, company_id, first_name, last_name, employee_id,
        email, department, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        companyId,
        firstName,
        lastNameValue,
        employeeId || null,
        normalizedEmail,
        department || null,
        true
      ]
    );

    // RBAC: assign roles to user (use uppercase company_id for consistency with RBAC queries)
    const normalizedCompanyId = String(companyId).toUpperCase();
    for (const roleId of roleIdArray) {
      const roleCheck = await client.query(
        'SELECT id FROM roles WHERE id = $1 AND company_id = $2',
        [roleId, normalizedCompanyId]
      );
      if (roleCheck.rows.length > 0) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id, company_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [user.id, roleId, normalizedCompanyId]
        );
      }
    }

    // User-level category access (from CategoryAccessWizard on Invite page)
    if (categoryAccess && typeof categoryAccess === 'object') {
      const pcIds = Array.isArray(categoryAccess.productCategoryIds) ? categoryAccess.productCategoryIds : [];
      const icIds = Array.isArray(categoryAccess.itemCategoryIds) ? categoryAccess.itemCategoryIds : [];
      const scIds = Array.isArray(categoryAccess.subCategoryIds) ? categoryAccess.subCategoryIds : [];
      const hasRestrictions = pcIds.length > 0 || icIds.length > 0 || scIds.length > 0;
      if (hasRestrictions) {
        await client.query(
          `INSERT INTO user_category_access (user_id, company_id, product_category_ids, item_category_ids, sub_category_ids)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, company_id) DO UPDATE SET
             product_category_ids = EXCLUDED.product_category_ids,
             item_category_ids = EXCLUDED.item_category_ids,
             sub_category_ids = EXCLUDED.sub_category_ids,
             updated_at = CURRENT_TIMESTAMP`,
          [user.id, normalizedCompanyId, pcIds, icIds, scIds]
        );
      }
    }

    await client.query('COMMIT');

    // Get company name for the email
    let companyName = 'Your Company';
    try {
      const companyResult = await pool.query(
        'SELECT company_name FROM companies WHERE company_id = $1',
        [companyId]
      );
      if (companyResult.rows.length > 0 && companyResult.rows[0].company_name) {
        companyName = companyResult.rows[0].company_name;
      }
    } catch (companyErr) {
      logger.warn({ error: companyErr.message }, 'Could not fetch company name for invitation email');
    }

    // Send invitation email
    try {
      await sendInvitationEmail({
        email: normalizedEmail,
        firstName,
        lastName: lastNameValue || '',
        token: passwordResetToken,
        companyId,
        companyName,
        role: derivedRole === 'admin' ? 'Admin' : 'User',
      });
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
      `SELECT id, email, company_id, role, password_reset_expires, is_active
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

    const userDetails = await client.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.company_id, c.company_name
       FROM users u
       INNER JOIN companies c ON u.company_id = c.company_id
       WHERE u.id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    const userData = userDetails.rows[0];
    const { getUserPermissions } = require('../utils/rbac');
    let permissions = await getUserPermissions(user.id, user.company_id);
    if ((userData.role === 'super_admin' || userData.role === 'admin') && permissions.length === 0) {
      permissions = ['*'];
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

/**
 * Assign roles to a user
 * Body: { roleIds: number[] }
 */
const assignUserRoles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleIds = [] } = req.body;
    const companyId = getCompanyId(req);

    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    if (userCheck.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const normalizedCompanyId = String(companyId).toUpperCase();
    await pool.query('DELETE FROM user_roles WHERE user_id = $1 AND company_id = $2', [id, normalizedCompanyId]);

    const roleIdArray = Array.isArray(roleIds) ? roleIds : [];
    for (const roleId of roleIdArray) {
      const roleCheck = await pool.query(
        'SELECT id FROM roles WHERE id = $1 AND company_id = $2',
        [roleId, normalizedCompanyId]
      );
      if (roleCheck.rows.length > 0) {
        await pool.query(
          `INSERT INTO user_roles (user_id, role_id, company_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [id, roleId, normalizedCompanyId]
        );
      }
    }

    // Sync users.role with RBAC: admin if any role is Admin, else user
    let newUsersRole = 'user';
    if (roleIdArray.length > 0) {
      const placeholders = roleIdArray.map((_, i) => `$${i + 1}`).join(',');
      const roleNamesResult = await pool.query(
        `SELECT name FROM roles WHERE id IN (${placeholders}) AND company_id = $${roleIdArray.length + 1}`,
        [...roleIdArray, normalizedCompanyId]
      );
      const hasAdminRole = roleNamesResult.rows.some((r) => r.name && String(r.name).toLowerCase() === 'admin');
      if (hasAdminRole) newUsersRole = 'admin';
    }
    await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3',
      [newUsersRole, id, normalizedCompanyId]
    );

    res.json({
      success: true,
      message: 'Roles assigned successfully',
      data: { roleIds: roleIdArray },
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
  getMe,
  assignUserRoles,
};

