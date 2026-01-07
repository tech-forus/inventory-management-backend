require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Railway Migration Script to Remove Description from Materials and Colours
 * Run this script with your Railway DATABASE_URL
 * 
 * Usage:
 *   node scripts/run-remove-description-migration-railway.js "postgresql://user:pass@host:port/db"
 */

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
  console.error('\nUsage:');
  console.error('  node scripts/run-remove-description-migration-railway.js "postgresql://user:pass@host:port/db"');
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
  
  console.log('🚀 Starting Railway Migration to Remove Description Columns...\n');
  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '051_remove_description_from_materials_colours.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration: 051_remove_description_from_materials_colours.sql\n');

    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    // Verify columns were removed
    console.log('🔍 Verifying migration...');
    
    const materialsCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'materials'
      AND column_name = 'description'
    `);
    
    const coloursCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'colours'
      AND column_name = 'description'
    `);

    if (materialsCheck.rows.length === 0 && coloursCheck.rows.length === 0) {
      console.log('✅ Verification successful:');
      console.log('   - description column removed from materials table');
      console.log('   - description column removed from colours table');
    } else {
      console.log('⚠️  Warning: Some columns may still exist');
      if (materialsCheck.rows.length > 0) {
        console.log('   - description still exists in materials table');
      }
      if (coloursCheck.rows.length > 0) {
        console.log('   - description still exists in colours table');
      }
    }

    // Show current table structures
    const materialsCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'materials'
      ORDER BY ordinal_position
    `);
    
    const coloursCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'colours'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📋 materials table now has ${materialsCols.rows.length} columns:`, materialsCols.rows.map(r => r.column_name).join(', '));
    console.log(`📋 colours table now has ${coloursCols.rows.length} columns:`, coloursCols.rows.map(r => r.column_name).join(', '));

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
    console.error('\nFull error:', error);
    
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

