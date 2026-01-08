require('dotenv').config();
const { Client } = require('pg');

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
  console.error('\nUsage:');
  console.error('  node scripts/import-phone-numbers-to-users.js "postgresql://user:pass@host:port/db"');
  console.error('  OR');
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/import-phone-numbers-to-users.js');
  process.exit(1);
}

function getDbConfig() {
  try {
    const url = new URL(DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false },
    };
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error.message);
    process.exit(1);
  }
}

function normalizePhone(phone) {
  if (!phone) return null;
  // Remove spaces, dashes, parentheses, plus signs, keep only digits
  const normalized = String(phone).replace(/[\s\-\(\)\+]/g, '');
  // Return only if it's exactly 10 digits
  return normalized.length === 10 ? normalized : null;
}

async function importPhoneNumbers() {
  const dbConfig = getDbConfig();

  console.log('🚀 Starting Phone Number Import to Users Table...\n');
  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    await client.query('BEGIN');

    // Step 1: Import phone numbers from admins table (for admin/super_admin users)
    console.log('📋 Step 1: Importing phone numbers from admins table...');
    const adminsResult = await client.query(`
      SELECT 
        a.user_id,
        a.phone,
        u.email,
        u.role,
        u.phone as existing_phone
      FROM admins a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.phone IS NOT NULL 
      AND a.phone != ''
      AND (u.phone IS NULL OR u.phone = '')
    `);

    console.log(`   Found ${adminsResult.rows.length} admin/super_admin users with phone numbers to import\n`);

    let adminsUpdated = 0;
    let adminsSkipped = 0;
    let adminsInvalid = 0;

    for (const admin of adminsResult.rows) {
      const normalizedPhone = normalizePhone(admin.phone);
      
      if (!normalizedPhone) {
        console.log(`   ⚠️  Skipping admin user_id ${admin.user_id} (${admin.email}): Invalid phone format "${admin.phone}"`);
        adminsInvalid++;
        continue;
      }

      try {
        await client.query(
          'UPDATE users SET phone = $1 WHERE id = $2',
          [normalizedPhone, admin.user_id]
        );
        console.log(`   ✅ Updated user_id ${admin.user_id} (${admin.email}, ${admin.role}): ${normalizedPhone}`);
        adminsUpdated++;
      } catch (error) {
        console.log(`   ❌ Error updating user_id ${admin.user_id}: ${error.message}`);
        adminsSkipped++;
      }
    }

    console.log(`\n   📊 Admins Summary: ${adminsUpdated} updated, ${adminsSkipped} skipped, ${adminsInvalid} invalid\n`);

    // Step 2: Import phone numbers from users_data table (for regular users)
    console.log('📋 Step 2: Importing phone numbers from users_data table...');
    const usersDataResult = await client.query(`
      SELECT 
        ud.user_id,
        ud.phone,
        u.email,
        u.role,
        u.phone as existing_phone
      FROM users_data ud
      INNER JOIN users u ON ud.user_id = u.id
      WHERE ud.phone IS NOT NULL 
      AND ud.phone != ''
      AND (u.phone IS NULL OR u.phone = '')
    `);

    console.log(`   Found ${usersDataResult.rows.length} regular users with phone numbers to import\n`);

    let usersUpdated = 0;
    let usersSkipped = 0;
    let usersInvalid = 0;

    for (const userData of usersDataResult.rows) {
      const normalizedPhone = normalizePhone(userData.phone);
      
      if (!normalizedPhone) {
        console.log(`   ⚠️  Skipping user_id ${userData.user_id} (${userData.email}): Invalid phone format "${userData.phone}"`);
        usersInvalid++;
        continue;
      }

      try {
        await client.query(
          'UPDATE users SET phone = $1 WHERE id = $2',
          [normalizedPhone, userData.user_id]
        );
        console.log(`   ✅ Updated user_id ${userData.user_id} (${userData.email}, ${userData.role}): ${normalizedPhone}`);
        usersUpdated++;
      } catch (error) {
        console.log(`   ❌ Error updating user_id ${userData.user_id}: ${error.message}`);
        usersSkipped++;
      }
    }

    console.log(`\n   📊 Users Data Summary: ${usersUpdated} updated, ${usersSkipped} skipped, ${usersInvalid} invalid\n`);

    // Step 3: Verify and show summary
    console.log('📋 Step 3: Verification...');
    const verificationResult = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(phone) as users_with_phone,
        COUNT(*) - COUNT(phone) as users_without_phone
      FROM users
    `);

    const stats = verificationResult.rows[0];
    console.log(`   Total users: ${stats.total_users}`);
    console.log(`   Users with phone: ${stats.users_with_phone}`);
    console.log(`   Users without phone: ${stats.users_without_phone}\n`);

    // Show breakdown by role
    const roleBreakdown = await client.query(`
      SELECT 
        role,
        COUNT(*) as total,
        COUNT(phone) as with_phone,
        COUNT(*) - COUNT(phone) as without_phone
      FROM users
      GROUP BY role
      ORDER BY role
    `);

    console.log('   📊 Breakdown by role:');
    roleBreakdown.rows.forEach(row => {
      console.log(`      ${row.role}: ${row.total} total, ${row.with_phone} with phone, ${row.without_phone} without phone`);
    });

    await client.query('COMMIT');

    console.log('\n✅ Phone number import completed successfully!\n');
    console.log('📊 Final Summary:');
    console.log(`   - Admins/Super Admins: ${adminsUpdated} updated`);
    console.log(`   - Regular Users: ${usersUpdated} updated`);
    console.log(`   - Total Updated: ${adminsUpdated + usersUpdated}`);
    console.log(`   - Invalid/Skipped: ${adminsSkipped + usersSkipped + adminsInvalid + usersInvalid}\n`);

    await client.end();
    process.exit(0);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log('\n⚠️  Transaction rolled back due to error');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
    }

    console.error('\n❌ Import error:', error.message);
    console.error('Error details:', error);

    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  importPhoneNumbers().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { importPhoneNumbers, getDbConfig, normalizePhone };



