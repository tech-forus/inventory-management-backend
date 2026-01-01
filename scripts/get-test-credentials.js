/**
 * Get test credentials from database
 */
const pool = require('../src/models/database');

async function getCredentials() {
  try {
    const result = await pool.query(
      'SELECT company_id, email, full_name FROM users WHERE company_id = $1 LIMIT 1',
      ['GJIPER']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(JSON.stringify({
        companyId: user.company_id,
        email: user.email,
        fullName: user.full_name
      }, null, 2));
    } else {
      console.log('No users found for GJIPER');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

getCredentials();






