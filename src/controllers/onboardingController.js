const pool = require('../models/database');
const { NotFoundError, ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');

/**
 * Check onboarding status
 */
const getStatus = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    const result = await pool.query(
      'SELECT onboarding_completed FROM companies WHERE company_id = $1',
      [companyId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    res.json({
      success: true,
      onboardingCompleted: result.rows[0].onboarding_completed || false
    });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message, companyId: req.params.companyId }, 'Error checking onboarding status');
    next(error);
  }
};

/**
 * Complete onboarding
 */
const complete = async (req, res, next) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      throw new ValidationError('Company ID is required');
    }

    const result = await pool.query(
      `UPDATE companies 
       SET onboarding_completed = true, onboarding_completed_at = CURRENT_TIMESTAMP
       WHERE company_id = $1
       RETURNING company_id, onboarding_completed, onboarding_completed_at`,
      [companyId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message, companyId: req.body.companyId }, 'Error completing onboarding');
    next(error);
  }
};

// Note: Category and vendor/brand creation methods are kept in routes for now
// due to their complexity. They can be moved to controllers later if needed.

module.exports = {
  getStatus,
  complete,
};



