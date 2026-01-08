const { Client } = require('pg');

// Connection string from user
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function checkMigrationStatus() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // Check if schema_migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Migration tracking table does not exist yet.');
      console.log('   This means no migrations have been run.\n');
    } else {
      // Check if migration 053 has been executed
      const migrationCheck = await client.query(`
        SELECT filename, executed_at 
        FROM schema_migrations 
        WHERE filename = '053_make_vendor_brand_nullable_in_incoming_inventory.sql'
        ORDER BY executed_at DESC
        LIMIT 1;
      `);

      if (migrationCheck.rows.length > 0) {
        console.log('✅ Migration 053 HAS BEEN EXECUTED');
        console.log(`   Filename: ${migrationCheck.rows[0].filename}`);
        console.log(`   Executed at: ${migrationCheck.rows[0].executed_at}\n`);
      } else {
        console.log('❌ Migration 053 HAS NOT BEEN EXECUTED\n');
      }

      // Show all executed migrations
      const allMigrations = await client.query(`
        SELECT filename, executed_at 
        FROM schema_migrations 
        ORDER BY executed_at DESC
        LIMIT 10;
      `);

      console.log('📋 Last 10 executed migrations:');
      allMigrations.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.filename} (${row.executed_at})`);
      });
      console.log('');
    }

    // Check the actual column constraints
    console.log('🔍 Checking column constraints on incoming_inventory table...\n');
    
    const columnInfo = await client.query(`
      SELECT 
        column_name,
        is_nullable,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'incoming_inventory'
      AND column_name IN ('vendor_id', 'brand_id', 'destination_id')
      ORDER BY column_name;
    `);

    if (columnInfo.rows.length === 0) {
      console.log('⚠️  incoming_inventory table not found or columns do not exist');
    } else {
      console.log('Column Status:');
      columnInfo.rows.forEach(row => {
        const status = row.is_nullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL';
        console.log(`   ${row.column_name}: ${status} (${row.data_type})`);
      });
    }

    await client.end();
    console.log('\n✅ Check completed!');
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    console.error(error.stack);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

checkMigrationStatus();
