require('dotenv').config();
const { Client } = require('pg');
const readline = require('readline');

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

function normalizePhone(phone) {
  if (!phone) return null;
  const normalized = String(phone).replace(/[\s\-\(\)\+]/g, '');
  return normalized.length === 10 ? normalized : null;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addPhoneNumbers() {
  const dbConfig = getDbConfig();
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all admin and super_admin users without phone numbers
    const usersWithoutPhone = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.full_name,
        u.phone
      FROM users u
      WHERE u.role IN ('admin', 'super_admin')
      AND (u.phone IS NULL OR u.phone = '')
      ORDER BY u.role DESC, u.email
    `);

    if (usersWithoutPhone.rows.length === 0) {
      console.log('✅ All admin and super_admin users already have phone numbers!\n');
      await client.end();
      rl.close();
      process.exit(0);
    }

    console.log(`📋 Found ${usersWithoutPhone.rows.length} admin/super_admin users without phone numbers:\n`);
    usersWithoutPhone.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.full_name || 'No name'}`);
    });
    console.log('');

    const proceed = await question('Do you want to add phone numbers for these users? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
      console.log('❌ Cancelled\n');
      await client.end();
      rl.close();
      process.exit(0);
    }

    await client.query('BEGIN');

    let updated = 0;
    let skipped = 0;

    for (const user of usersWithoutPhone.rows) {
      console.log(`\n📱 User: ${user.email} (${user.role})`);
      const phoneInput = await question('   Enter phone number (10 digits, or "skip" to skip): ');
      
      if (phoneInput.toLowerCase() === 'skip' || phoneInput.toLowerCase() === 's') {
        console.log('   ⏭️  Skipped');
        skipped++;
        continue;
      }

      const normalizedPhone = normalizePhone(phoneInput);
      if (!normalizedPhone) {
        console.log(`   ❌ Invalid phone number format. Expected 10 digits, got: ${phoneInput}`);
        skipped++;
        continue;
      }

      try {
        await client.query(
          'UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [normalizedPhone, user.id]
        );
        console.log(`   ✅ Updated: ${normalizedPhone}`);
        updated++;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        skipped++;
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Phone number update completed!\n');
    console.log(`📊 Summary: ${updated} updated, ${skipped} skipped\n`);

    await client.end();
    rl.close();
    process.exit(0);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore
      }
    }
    console.error('\n❌ Error:', error.message);
    if (client) await client.end().catch(() => {});
    rl.close();
    process.exit(1);
  }
}

if (require.main === module) {
  addPhoneNumbers();
}

module.exports = { addPhoneNumbers, getDbConfig, normalizePhone };

