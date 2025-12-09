const pool = require('../models/database');
const bcrypt = require('bcryptjs');
const { generateUniqueCompanyId } = require('../utils/companyIdGenerator');
const { NotFoundError, ConflictError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');

/**
 * Register a new company with super admin
 */
const register = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Extract company data
    const {
      companyName,
      gstNumber,
      businessType,
      address,
      city,
      state,
      pin,
      phone,
      website,
      // Super Admin data
      fullName,
      email,
      adminPhone,
      password
    } = req.body;

    // Validation is now handled by middleware

    // Check if GST number already exists
    const gstCheck = await client.query(
      'SELECT id FROM companies WHERE gst_number = $1',
      [gstNumber.toUpperCase()]
    );

    if (gstCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new ConflictError('Company with this GST number already exists');
    }

    // Check if admin email already exists
    const emailCheck = await client.query(
      'SELECT id FROM companies WHERE admin_email = $1',
      [email.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new ConflictError('Email address already registered');
    }

    // Generate unique company ID
    const companyId = await generateUniqueCompanyId(client);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert company with all registration data including super admin details
    const companyResult = await client.query(
      `INSERT INTO companies (
        company_id, company_name, gst_number, business_type, 
        address, city, state, pin, phone, website,
        admin_full_name, admin_email, admin_phone, admin_password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, company_id, company_name, admin_full_name, admin_email, created_at`,
      [
        companyId,
        companyName,
        gstNumber.toUpperCase(),
        businessType,
        address,
        city,
        state,
        pin,
        phone,
        website || null,
        fullName,
        email.toLowerCase(),
        adminPhone,
        hashedPassword
      ]
    );

    const company = companyResult.rows[0];

    // Create user record in users table
    await client.query(
      `INSERT INTO users (
        company_id, email, password, full_name, phone, role
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        companyId,
        email.toLowerCase(),
        hashedPassword,
        fullName,
        adminPhone,
        'super_admin'
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      data: {
        company: {
          id: company.id,
          companyId: company.company_id,
          companyName: company.company_name,
          adminName: company.admin_full_name,
          adminEmail: company.admin_email,
          createdAt: company.created_at
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error); // Error handler will handle PostgreSQL errors
  } finally {
    client.release();
  }
};

/**
 * Get company by company ID
 */
const getCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    const result = await pool.query(
      `SELECT 
        id, company_id, company_name, gst_number, business_type,
        address, city, state, pin, phone, website,
        admin_full_name, admin_email, admin_phone,
        created_at, updated_at
      FROM companies 
      WHERE company_id = $1`,
      [companyId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Error fetching company');
    next(error);
  }
};

module.exports = {
  register,
  getCompany,
};



