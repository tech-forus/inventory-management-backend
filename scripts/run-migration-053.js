const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Connection string from user
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration053() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database\n');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Migration tracking table ready\n');

    const migrationFile = '053_make_vendor_brand_nullable_in_incoming_inventory.sql';
    
    // Check if migration already ran
    const checkResult = await client.query(
      'SELECT filename FROM schema_migrations WHERE filename = $1',
      [migrationFile]
    );

    if (checkResult.rows.length > 0) {
      console.log(`⏭️  Migration ${migrationFile} already executed`);
      console.log(`   Executed at: ${checkResult.rows[0].executed_at}\n`);
      await client.end();
      return;
    }

    console.log(`🔄 Running migration: ${migrationFile}\n`);

    // Read migration file
    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    const filePath = path.join(migrationsDir, migrationFile);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Execute migration
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [migrationFile]
    );

    console.log(`✅ Successfully executed: ${migrationFile}\n`);

    // Verify the changes
    console.log('🔍 Verifying column constraints...\n');
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

    console.log('Column Status After Migration:');
    columnInfo.rows.forEach(row => {
      const status = row.is_nullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL';
      console.log(`   ${row.column_name}: ${status} (${row.data_type})`);
    });

    await client.end();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error.stack);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      await client.end().catch(() => {});
    }
    process.exit(1);
  }
}

runMigration053();
