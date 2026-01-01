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

const emailsToDelete = [
  'mrigankforus@gmail.com',
  'abhinowps@gmail.com',
  'abhishekjs005@gmail.com'
];

async function deleteUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Searching for users with these emails...\n');
    
    const userIdsToDelete = [];
    
    // Find all users with these emails
    for (const email of emailsToDelete) {
      const userResult = await client.query(
        'SELECT id, email, role, company_id FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        userIdsToDelete.push(user.id);
        console.log(`  ✓ Found: ${email} (ID: ${user.id}, Role: ${user.role}, Company: ${user.company_id})`);
      } else {
        console.log(`  ✗ Not found: ${email}`);
      }
    }
    
    if (userIdsToDelete.length === 0) {
      console.log('\n❌ No users found to delete.');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`\n🗑️  Deleting data for ${userIdsToDelete.length} user(s)...\n`);
    
    // Delete from admins table
    const placeholders = userIdsToDelete.map((_, i) => `$${i + 1}`).join(', ');
    const deletedAdmins = await client.query(
      `DELETE FROM admins WHERE user_id IN (${placeholders}) RETURNING id`,
      userIdsToDelete
    );
    console.log(`  ✓ Deleted ${deletedAdmins.rowCount} record(s) from admins table`);
    
    // Delete from users_data table
    const deletedUsersData = await client.query(
      `DELETE FROM users_data WHERE user_id IN (${placeholders}) RETURNING id`,
      userIdsToDelete
    );
    console.log(`  ✓ Deleted ${deletedUsersData.rowCount} record(s) from users_data table`);
    
    // Delete from users table (this should be last due to foreign key constraints)
    const deletedUsers = await client.query(
      `DELETE FROM users WHERE id IN (${placeholders}) RETURNING id, email`,
      userIdsToDelete
    );
    console.log(`  ✓ Deleted ${deletedUsers.rowCount} record(s) from users table`);
    
    console.log('\n✅ Deletion completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total users deleted: ${deletedUsers.rowCount}`);
    console.log(`   - Admins records deleted: ${deletedAdmins.rowCount}`);
    console.log(`   - Users_data records deleted: ${deletedUsersData.rowCount}`);
    
    if (deletedUsers.rows.length > 0) {
      console.log(`\n🗑️  Deleted users:`);
      deletedUsers.rows.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during deletion:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

