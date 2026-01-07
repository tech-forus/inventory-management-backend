require('dotenv').config();
const { Client } = require('pg');

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
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

async function checkPhoneNumbers() {
  const dbConfig = getDbConfig();
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check admins table
    console.log('📋 Phone numbers in admins table:');
    const adminsPhones = await client.query(`
      SELECT 
        a.user_id,
        a.phone as admin_phone,
        u.phone as user_phone,
        u.email,
        u.role,
        a.is_super_admin
      FROM admins a
      INNER JOIN users u ON a.user_id = u.id
      ORDER BY a.is_super_admin DESC, u.email
    `);

    if (adminsPhones.rows.length === 0) {
      console.log('   No admins found\n');
    } else {
      adminsPhones.rows.forEach(row => {
        const roleLabel = row.is_super_admin ? 'super_admin' : 'admin';
        const adminPhone = row.admin_phone || '(none)';
        const userPhone = row.user_phone || '(none)';
        const match = row.admin_phone === row.user_phone ? '✅' : '⚠️';
        console.log(`   ${match} user_id ${row.user_id} (${row.email}, ${roleLabel}):`);
        console.log(`      Admin phone: ${adminPhone}`);
        console.log(`      User phone: ${userPhone}`);
        if (row.admin_phone && !row.user_phone) {
          console.log(`      ⚠️  Phone exists in admins but NOT in users - needs import`);
        }
        console.log('');
      });
    }

    // Check users_data table
    console.log('📋 Phone numbers in users_data table:');
    const usersDataPhones = await client.query(`
      SELECT 
        ud.user_id,
        ud.phone as user_data_phone,
        u.phone as user_phone,
        u.email,
        u.role
      FROM users_data ud
      INNER JOIN users u ON ud.user_id = u.id
      ORDER BY u.email
    `);

    if (usersDataPhones.rows.length === 0) {
      console.log('   No users_data found\n');
    } else {
      usersDataPhones.rows.forEach(row => {
        const userDataPhone = row.user_data_phone || '(none)';
        const userPhone = row.user_phone || '(none)';
        const match = row.user_data_phone === row.user_phone ? '✅' : '⚠️';
        console.log(`   ${match} user_id ${row.user_id} (${row.email}, ${row.role}):`);
        console.log(`      User_data phone: ${userDataPhone}`);
        console.log(`      User phone: ${userPhone}`);
        if (row.user_data_phone && !row.user_phone) {
          console.log(`      ⚠️  Phone exists in users_data but NOT in users - needs import`);
        }
        console.log('');
      });
    }

    // Summary
    const needsImport = adminsPhones.rows.filter(r => r.admin_phone && !r.user_phone).length +
                       usersDataPhones.rows.filter(r => r.user_data_phone && !r.user_phone).length;

    if (needsImport > 0) {
      console.log(`\n⚠️  Found ${needsImport} users with phone numbers that need to be imported to users table`);
      console.log('   Run the import script to update them.\n');
    } else {
      console.log('\n✅ All phone numbers are already synced to users table\n');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  checkPhoneNumbers();
}

module.exports = { checkPhoneNumbers, getDbConfig };

