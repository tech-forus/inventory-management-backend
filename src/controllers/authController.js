const pool = require('../models/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Login controller
 */
const login = async (req, res, next) => {
  try {
    const { companyId, email, password } = req.body;

    // Validation is now handled by middleware

    // Find user by company_id and email
    const result = await pool.query(
      `SELECT 
        u.id, u.company_id, u.email, u.password, u.full_name, 
        u.phone, u.role, u.is_active,
        c.company_name
      FROM users u
      INNER JOIN companies c ON u.company_id = c.company_id
      WHERE u.company_id = $1 AND u.email = $2`,
      [companyId.toUpperCase(), email.toLowerCase()]
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
    next(error); // Pass error to error handler
  }
};

module.exports = {
  login,
};


