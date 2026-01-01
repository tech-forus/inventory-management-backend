const bcrypt = require('bcryptjs');

/**
 * Seed: seed_test_company
 * Description: Inserts a test company registration with properly hashed password
 * 
 * @param {Object} client - PostgreSQL client from pool
 */
async function seedTestCompany(client) {
  try {
    // Hash password for test admin
    const hashedPassword = await bcrypt.hash('Test@1234', 10);

    // Check if test company already exists
    const existing = await client.query(
      'SELECT id FROM companies WHERE company_id = $1 OR gst_number = $2 OR admin_email = $3',
      ['TEST01', '27AABCT1234D1Z5', 'admin@testelectronics.com']
    );

    if (existing.rows.length > 0) {
      console.log('⏭️  Test company already exists, skipping...');
      return;
    }

    // Insert test company
    const result = await client.query(
      `INSERT INTO companies (
        company_id,
        company_name,
        gst_number,
        business_type,
        address,
        city,
        state,
        pin,
        phone,
        website,
        admin_full_name,
        admin_email,
        admin_phone,
        admin_password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, company_id, company_name, admin_email`,
      [
        'TEST01',
        'Test Electronics Pvt Ltd',
        '27AABCT1234D1Z5',
        'Manufacturing',
        '123 Industrial Area, Sector 5',
        'Mumbai',
        'Maharashtra',
        '400001',
        '9876543210',
        'https://www.testelectronics.com',
        'John Doe',
        'admin@testelectronics.com',
        '9876543211',
        hashedPassword
      ]
    );

    console.log('✅ Test company created successfully!');
    console.log(`   Company ID: ${result.rows[0].company_id}`);
    console.log(`   Company Name: ${result.rows[0].company_name}`);
    console.log(`   Admin Email: ${result.rows[0].admin_email}`);

    // Check if user already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE company_id = $1 AND email = $2',
      ['TEST01', 'admin@testelectronics.com']
    );

    if (userCheck.rows.length === 0) {
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
    } else {
      console.log('⏭️  Test user already exists, skipping...');
    }

    console.log(`   Test Password: Test@1234`);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      console.log('⏭️  Test company already exists, skipping...');
    } else {
      throw error;
    }
  }
}

module.exports = seedTestCompany;

