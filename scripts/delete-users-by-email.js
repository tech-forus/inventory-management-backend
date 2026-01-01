require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

// Email addresses to delete
const emailsToDelete = [
  'abhishekjs005@gmail.com',
  'abhinowps@gmail.com',
  'tech@foruselectric.com',
  'mrigankforus@gmail.com'
];

async function deleteUsersByEmail() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting deletion process...');
    console.log('Emails to delete:', emailsToDelete);
    
    // Normalize emails to lowercase
    const normalizedEmails = emailsToDelete.map(email => email.toLowerCase().trim());
    
    // Step 1: Find all user IDs for these emails
    const userResult = await client.query(
      `SELECT id, email, company_id, role FROM users WHERE LOWER(email) = ANY($1::text[])`,
      [normalizedEmails]
    );
    
    if (userResult.rows.length === 0) {
      console.log('No users found with these email addresses.');
      await client.query('ROLLBACK');
      return;
    }
    
    const userIds = userResult.rows.map(row => row.id);
    const companyIds = [...new Set(userResult.rows.map(row => row.company_id))];
    
    console.log(`Found ${userResult.rows.length} users to delete:`);
    userResult.rows.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id}, Role: ${user.role}, Company: ${user.company_id})`);
    });
    
    // Step 2: Delete from related tables (in order to respect foreign keys)
    
    // Delete from admins table
    const adminsDeleted = await client.query(
      'DELETE FROM admins WHERE user_id = ANY($1::int[])',
      [userIds]
    );
    console.log(`Deleted ${adminsDeleted.rowCount} records from admins table`);
    
    // Delete from users_data table
    const usersDataDeleted = await client.query(
      'DELETE FROM users_data WHERE user_id = ANY($1::int[])',
      [userIds]
    );
    console.log(`Deleted ${usersDataDeleted.rowCount} records from users_data table`);
    
    // Delete from users table (this will cascade to other related tables if foreign keys are set up)
    const usersDeleted = await client.query(
      'DELETE FROM users WHERE id = ANY($1::int[])',
      [userIds]
    );
    console.log(`Deleted ${usersDeleted.rowCount} records from users table`);
    
    // Step 3: Check for any other tables that might reference these emails
    // Check companies table (if any of these users were company owners)
    const companiesResult = await client.query(
      `SELECT company_id, company_name FROM companies WHERE company_id = ANY($1::text[])`,
      [companyIds]
    );
    
    if (companiesResult.rows.length > 0) {
      console.log('\nWarning: Found companies associated with these users:');
      companiesResult.rows.forEach(company => {
        console.log(`  - ${company.company_name} (ID: ${company.company_id})`);
      });
      console.log('Note: Companies are NOT deleted. Only user records are removed.');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Deletion completed successfully!');
    console.log(`Total users deleted: ${userResult.rows.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during deletion:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the deletion
deleteUsersByEmail()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

