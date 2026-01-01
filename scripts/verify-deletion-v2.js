require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  connectionString: 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway',
  ssl: {
    rejectUnauthorized: false
  }
};

const pool = new Pool(dbConfig);

const emailsToCheck = [
  'mrigankforus@gmail.com',
  'abhinowps@gmail.com',
  'abhishekjs005@gmail.com'
];

async function verifyDeletion() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verifying deletion for these emails...\n');
    console.log('Emails to check:', emailsToCheck.join(', '));
    console.log('\n');
    
    // Check users table
    const usersResult = await client.query(
      'SELECT id, email FROM users WHERE email = ANY($1)',
      [emailsToCheck]
    );
    
    if (usersResult.rows.length > 0) {
      console.log('❌ Records still found in users table:');
      usersResult.rows.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
    } else {
      console.log('✅ No records found in users table');
    }
    
    // Check admins table (via JOIN)
    const adminsResult = await client.query(
      `SELECT a.id, u.email 
       FROM admins a 
       JOIN users u ON a.user_id = u.id 
       WHERE u.email = ANY($1)`,
      [emailsToCheck]
    );
    
    if (adminsResult.rows.length > 0) {
      console.log('❌ Records still found in admins table:');
      adminsResult.rows.forEach(admin => {
        console.log(`   - ${admin.email} (Admin ID: ${admin.id})`);
      });
    } else {
      console.log('✅ No records found in admins table');
    }
    
    // Check users_data table (via JOIN)
    const usersDataResult = await client.query(
      `SELECT ud.id, u.email 
       FROM users_data ud 
       JOIN users u ON ud.user_id = u.id 
       WHERE u.email = ANY($1)`,
      [emailsToCheck]
    );
    
    if (usersDataResult.rows.length > 0) {
      console.log('❌ Records still found in users_data table:');
      usersDataResult.rows.forEach(ud => {
        console.log(`   - ${ud.email} (UserData ID: ${ud.id})`);
      });
    } else {
      console.log('✅ No records found in users_data table');
    }
    
    console.log('\n✅ Verification completed!');
    
    if (usersResult.rows.length === 0 && 
        adminsResult.rows.length === 0 && 
        usersDataResult.rows.length === 0) {
      console.log('\n🎉 All data successfully deleted! No remaining references found.');
    } else {
      console.log('\n⚠️  Some data still exists. Please check the output above.');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDeletion()
  .then(() => {
    console.log('\n✅ Verification script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });

