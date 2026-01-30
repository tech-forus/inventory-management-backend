/**
 * Script to run warranty and serial number migrations
 * Run this script to add warranty and serial_number columns to the database
 * 
 * Usage: node scripts/run-warranty-serial-migrations.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
function getDbConfig() {
  // Try to get from environment variable first
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }

  // Fallback to hardcoded connection string
  return {
    connectionString: 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway',
    ssl: { rejectUnauthorized: false },
  };
}

async function runMigration(client, migrationFile) {
  const filePath = path.join(__dirname, 'database', 'migrations', migrationFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filePath}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n🔄 Running migration: ${migrationFile}`);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Successfully ran migration: ${migrationFile}`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('IF NOT EXISTS')) {
      console.log(`⏭️  Migration ${migrationFile} already applied (column exists)`);
      return true;
    }
    console.error(`❌ Error running migration ${migrationFile}:`, error.message);
    console.error(`   Details: ${error.detail || ''}`);
    return false;
  }
}

async function main() {
  const dbConfig = getDbConfig();
  const client = new Client(dbConfig);

  console.log('🚀 Starting Warranty and Serial Number Migrations...\n');
  console.log('📊 Database Configuration:');
  if (dbConfig.connectionString) {
    const url = new URL(dbConfig.connectionString);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   User: ${url.username}`);
  }
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrations = [
      '066_add_warranty_to_skus.sql',
      '067_add_serial_number_to_incoming_inventory_items.sql',
      '068_add_warranty_serial_to_outgoing_inventory_items.sql',
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const migration of migrations) {
      const success = await runMigration(client, migration);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Verify columns exist
    console.log('\n🔍 Verifying columns...');
    try {
      const skuCheck = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'skus' AND column_name = 'warranty'
      `);
      if (skuCheck.rows.length > 0) {
        console.log(`✅ skus.warranty column exists (Type: ${skuCheck.rows[0].data_type}, Default: ${skuCheck.rows[0].column_default || 'NULL'})`);
      } else {
        console.log('❌ skus.warranty column not found');
      }

      const incomingCheck = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'incoming_inventory_items' AND column_name = 'serial_number'
      `);
      if (incomingCheck.rows.length > 0) {
        console.log(`✅ incoming_inventory_items.serial_number column exists (Type: ${incomingCheck.rows[0].data_type})`);
      } else {
        console.log('❌ incoming_inventory_items.serial_number column not found');
      }

      const outgoingWarrantyCheck = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'outgoing_inventory_items' AND column_name = 'warranty'
      `);
      const outgoingSerialCheck = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'outgoing_inventory_items' AND column_name = 'serial_number'
      `);
      
      if (outgoingWarrantyCheck.rows.length > 0 && outgoingSerialCheck.rows.length > 0) {
        console.log(`✅ outgoing_inventory_items.warranty and serial_number columns exist`);
      } else {
        if (outgoingWarrantyCheck.rows.length === 0) {
          console.log('❌ outgoing_inventory_items.warranty column not found');
        }
        if (outgoingSerialCheck.rows.length === 0) {
          console.log('❌ outgoing_inventory_items.serial_number column not found');
        }
      }
    } catch (error) {
      console.error('Error verifying columns:', error.message);
    }

    await client.end();
    
    if (errorCount === 0) {
      console.log('\n✨ All migrations completed successfully!');
    } else {
      console.log(`\n⚠️  Completed with ${errorCount} error(s). Please review the errors above.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run migrations
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
