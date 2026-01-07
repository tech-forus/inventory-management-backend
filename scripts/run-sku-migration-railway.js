require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Railway Migration Script for SKU Simplified Fields
 * Run this script with your Railway DATABASE_URL to update SKU table structure
 * 
 * Usage:
 *   DATABASE_URL="your-connection-string" node scripts/run-sku-migration-railway.js
 * 
 * Or set DATABASE_URL in your environment and run:
 *   node scripts/run-sku-migration-railway.js
 */

// Use provided DATABASE_URL or the one from environment
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
  console.error('\nUsage:');
  console.error('  node scripts/run-sku-migration-railway.js "postgresql://user:pass@host:port/db"');
  console.error('  OR');
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/run-sku-migration-railway.js');
  process.exit(1);
}

function getDbConfig() {
  try {
    const url = new URL(DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading '/'
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false }, // Railway requires SSL
    };
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error.message);
    process.exit(1);
  }
}

async function runMigration() {
  const dbConfig = getDbConfig();
  
  console.log('🚀 Starting Railway SKU Migration...\n');
  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: Enabled\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '046_update_skus_simplified_fields.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration: 046_update_skus_simplified_fields.sql\n');

    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    // Verify columns were added
    console.log('🔍 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'skus'
      AND column_name IN ('vendor_id', 'manufacture_or_import', 'weight_unit', 'length_unit', 'width_unit', 'height_unit', 'custom_fields')
      ORDER BY column_name
    `);

    const expectedColumns = ['vendor_id', 'manufacture_or_import', 'weight_unit', 'length_unit', 'width_unit', 'height_unit', 'custom_fields'];
    const foundColumns = verifyResult.rows.map(r => r.column_name);
    
    console.log(`✅ Found ${verifyResult.rows.length} of ${expectedColumns.length} expected columns:`);
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check if vendor_id is nullable
    const vendorIdCheck = verifyResult.rows.find(r => r.column_name === 'vendor_id');
    if (vendorIdCheck && vendorIdCheck.is_nullable === 'YES') {
      console.log('\n✅ vendor_id is now nullable (vendor selection removed from form)');
    } else if (vendorIdCheck) {
      console.log('\n⚠️  vendor_id is still NOT NULL - migration may need to be checked');
    }

    // Check if new columns exist
    const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Warning: Some columns may not have been created: ${missingColumns.join(', ')}`);
    } else {
      console.log('\n✅ All expected columns are present!');
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
    
    // Provide helpful error messages
    if (error.message && error.message.includes('does not exist')) {
      console.error('\n💡 The skus table may not exist yet.');
      console.error('   Make sure all previous migrations have been run.');
    } else if (error.message && error.message.includes('already exists')) {
      console.log('\n⚠️  Columns may already exist. This is safe to ignore.');
      console.log('   The migration uses IF NOT EXISTS, so it should be idempotent.');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('\n💡 Connection failed. Check your DATABASE_URL:');
      console.error('   - Host is correct');
      console.error('   - Port is correct');
      console.error('   - Network access is allowed');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed. Check your DATABASE_URL:');
      console.error('   - Username is correct');
      console.error('   - Password is correct');
    }
    
    console.error('\nFull error:', error);
    
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

