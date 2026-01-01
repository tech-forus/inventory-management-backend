require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

const emailsToCheck = [
  'abhishekjs005@gmail.com',
  'abhinowps@gmail.com',
  'tech@foruselectric.com',
  'mrigankforus@gmail.com'
];

async function checkRemainingEmails() {
  const client = await pool.connect();
  
  try {
    const normalizedEmails = emailsToCheck.map(email => email.toLowerCase().trim());
    
    console.log('Checking for remaining references to these emails...\n');
    
    // Check users table
    const usersResult = await client.query(
      `SELECT id, email, company_id, role FROM users WHERE LOWER(email) = ANY($1::text[])`,
      [normalizedEmails]
    );
    
    if (usersResult.rows.length > 0) {
      console.log('Found in users table:');
      usersResult.rows.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id}, Role: ${user.role})`);
      });
    } else {
      console.log('✅ No records found in users table');
    }
    
    // Check admins table
    const adminsResult = await client.query(
      `SELECT user_id, email, company_id FROM admins WHERE LOWER(email) = ANY($1::text[])`,
      [normalizedEmails]
    );
    
    if (adminsResult.rows.length > 0) {
      console.log('\nFound in admins table:');
      adminsResult.rows.forEach(admin => {
        console.log(`  - ${admin.email} (User ID: ${admin.user_id})`);
      });
    } else {
      console.log('\n✅ No records found in admins table');
    }
    
    // Check users_data table
    const usersDataResult = await client.query(
      `SELECT user_id, email, company_id FROM users_data WHERE LOWER(email) = ANY($1::text[])`,
      [normalizedEmails]
    );
    
    if (usersDataResult.rows.length > 0) {
      console.log('\nFound in users_data table:');
      usersDataResult.rows.forEach(userData => {
        console.log(`  - ${userData.email} (User ID: ${userData.user_id})`);
      });
    } else {
      console.log('\n✅ No records found in users_data table');
    }
    
    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkRemainingEmails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

