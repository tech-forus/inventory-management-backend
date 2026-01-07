require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
  console.error('\nUsage:');
  console.error('  node scripts/run-phone-index-migration-railway.js "postgresql://user:pass@host:port/db"');
  console.error('  OR');
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/run-phone-index-migration-railway.js');
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

async function runMigration() {
  const dbConfig = getDbConfig();

  console.log('🚀 Starting Railway Phone Index Migration...\n');
  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    const migrationPath = path.join(__dirname, 'database', 'migrations', '047_add_phone_index_to_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration: 047_add_phone_index_to_users.sql\n');

    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    console.log('🔍 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      AND indexname = 'idx_users_phone'
    `);

    if (verifyResult.rows.length === 1) {
      console.log('✅ Verification successful:');
      console.log(`   - Index: ${verifyResult.rows[0].indexname}`);
      console.log(`   - Table: ${verifyResult.rows[0].tablename}`);
      console.log(`   - Schema: ${verifyResult.rows[0].schemaname}`);
      console.log(`   - Definition: ${verifyResult.rows[0].indexdef}`);
    } else {
      console.log('⚠️  Warning: Index may not have been created');
      console.log('   Found indexes:', verifyResult.rows.map(r => r.indexname).join(', '));
    }

    await client.end();
    console.log('\n✅ Migration script completed successfully!');
    process.exit(0);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
    }

    console.error('\n❌ Migration error:', error.message);
    console.error('Error details:', error);

    if (error.message && error.message.includes('already exists')) {
      console.log('\n⚠️  Index may already exist. This is safe to ignore.');
      console.log('   The migration uses IF NOT EXISTS, so it should be idempotent.');
    }

    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration, getDbConfig };

