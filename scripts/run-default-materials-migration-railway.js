require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Railway Migration Script to Add Default Materials
 * Run this script with your Railway DATABASE_URL
 * 
 * Usage:
 *   node scripts/run-default-materials-migration-railway.js "postgresql://user:pass@host:port/db"
 */

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
  console.error('\nUsage:');
  console.error('  node scripts/run-default-materials-migration-railway.js "postgresql://user:pass@host:port/db"');
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
  
  console.log('🚀 Starting Railway Migration to Add Default Materials...\n');
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
    const migrationPath = path.join(__dirname, 'database', 'migrations', '052_add_default_materials.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration: 052_add_default_materials.sql\n');

    // Execute migration
    await client.query('BEGIN');
    const result = await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    // Verify materials were added
    console.log('🔍 Verifying migration...');
    
    const materialsCheck = await client.query(`
      SELECT company_id, name, is_active
      FROM materials
      WHERE LOWER(name) IN ('gold', 'silver', 'copper', 'aluminum', 'zinc', 'nickel', 'iron', 'plastic', 'polycon')
      ORDER BY company_id, name
    `);

    if (materialsCheck.rows.length > 0) {
      console.log(`✅ Found ${materialsCheck.rows.length} default materials:`);
      
      // Group by company
      const byCompany = {};
      materialsCheck.rows.forEach(row => {
        if (!byCompany[row.company_id]) {
          byCompany[row.company_id] = [];
        }
        byCompany[row.company_id].push(row.name);
      });
      
      Object.keys(byCompany).forEach(companyId => {
        console.log(`   Company ${companyId}: ${byCompany[companyId].join(', ')}`);
      });
    } else {
      console.log('⚠️  No default materials found. They may already exist or no companies exist.');
    }

    // Count total materials per company
    const companyCounts = await client.query(`
      SELECT company_id, COUNT(*) as material_count
      FROM materials
      GROUP BY company_id
      ORDER BY company_id
    `);
    
    if (companyCounts.rows.length > 0) {
      console.log(`\n📋 Total materials per company:`);
      companyCounts.rows.forEach(row => {
        console.log(`   Company ${row.company_id}: ${row.material_count} materials`);
      });
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



