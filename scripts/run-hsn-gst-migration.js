require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Railway Migration Script for HSN/GST Columns
 * Run this script on Railway to add hsn_code and gst_rate columns to sub_categories table
 * 
 * Usage:
 *   node scripts/run-hsn-gst-migration.js
 * 
 * Or on Railway:
 *   railway run node scripts/run-hsn-gst-migration.js
 */

function getDbConfig() {
  // Parse DATABASE_URL if available (Railway, Heroku, etc.)
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading '/'
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false }, // Railway requires SSL
    };
  }

  // Fallback to environment variables
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost')
      ? { rejectUnauthorized: false }
      : false,
  };
}

async function runMigration() {
  const dbConfig = getDbConfig();
  
  console.log('🚀 Starting Railway HSN/GST Migration...\n');
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

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '045_add_hsn_gst_to_sub_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration: 045_add_hsn_gst_to_sub_categories.sql\n');

    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    // Verify columns were added
    console.log('🔍 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'sub_categories'
      AND column_name IN ('hsn_code', 'gst_rate')
      ORDER BY column_name
    `);

    if (verifyResult.rows.length === 2) {
      console.log('✅ Verification successful:');
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
      });
    } else {
      console.log('⚠️  Warning: Some columns may not have been created');
      console.log('   Found columns:', verifyResult.rows.map(r => r.column_name).join(', '));
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
    
    // Check if columns already exist (not a fatal error)
    if (error.message && error.message.includes('already exists')) {
      console.log('\n⚠️  Columns may already exist. This is safe to ignore.');
      console.log('   The migration uses IF NOT EXISTS, so it should be idempotent.');
    }
    
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  runMigration().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration, getDbConfig };



