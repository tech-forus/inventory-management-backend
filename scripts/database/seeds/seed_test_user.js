const bcrypt = require('bcryptjs');

/**
 * Seed: seed_test_user
 * Description: Creates a test user for the test company
 * 
 * @param {Object} client - PostgreSQL client from pool
 */
async function seedTestUser(client) {
  try {
    // Hash password for test admin
    const hashedPassword = await bcrypt.hash('Test@1234', 10);

    // Check if user already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE company_id = $1 AND email = $2',
      ['TEST01', 'admin@testelectronics.com']
    );

    if (userCheck.rows.length > 0) {
      console.log('⏭️  Test user already exists, skipping...');
      return;
    }

    // Create user record
    await client.query(
      `INSERT INTO users (
        company_id, email, password, full_name, phone, role
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'TEST01',
        'admin@testelectronics.com',
        hashedPassword,
        'John Doe',
        '9876543211',
        'super_admin'
      ]
    );

    console.log('✅ Test user created successfully!');
    console.log(`   Company ID: TEST01`);
    console.log(`   Email: admin@testelectronics.com`);
    console.log(`   Password: Test@1234`);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      console.log('⏭️  Test user already exists, skipping...');
    } else {
      throw error;
    }
  }
}

module.exports = seedTestUser;

