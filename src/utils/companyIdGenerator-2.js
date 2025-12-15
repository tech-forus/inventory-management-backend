const { logger } = require('./logger');

/**
 * Generate a random 6-letter alphabetic Company ID
 * All letters are uppercase and alphabetic only (A-Z)
 * 
 * @returns {string} String of 6 uppercase letters (A-Z)
 */
function generateCompanyId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let companyId = '';
  
  for (let i = 0; i < 6; i++) {
    companyId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  return companyId;
}

/**
 * Generate a unique Company ID by checking against database
 * 
 * @param {Object} client - PostgreSQL client (from pool.connect())
 * @returns {Promise<string>} Unique 6-letter company ID
 */
async function generateUniqueCompanyId(client) {
  const maxAttempts = 100; // Prevent infinite loop
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const companyId = generateCompanyId();
    
    try {
      // Check if ID exists in database
      const result = await client.query(
        'SELECT company_id FROM companies WHERE company_id = $1',
        [companyId]
      );
      
      // If ID doesn't exist, return it
      if (result.rows.length === 0) {
        return companyId;
      }
      
      attempts++;
    } catch (error) {
      logger.error({ error: error.message }, 'Error checking company ID uniqueness');
      // If there's an error, return the generated ID anyway
      return companyId;
    }
  }
  
  // Fallback: throw error if all attempts fail
  throw new Error('Failed to generate unique Company ID after multiple attempts');
}

module.exports = {
  generateCompanyId,
  generateUniqueCompanyId
};

