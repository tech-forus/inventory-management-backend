const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Connection string from user
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration057() {
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

    const migrationFile = '057_add_warranty_to_incoming_inventory_items.sql';
    
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
    console.log('This will add the following column to incoming_inventory_items table:');
    console.log('  - warranty (INTEGER DEFAULT 0) - Warranty period value for each item\n');

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

    // Verify the changes - show warranty column
    console.log('🔍 Verifying incoming_inventory_items table columns...\n');
    const columnInfo = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'incoming_inventory_items'
      AND column_name = 'warranty';
    `);

    if (columnInfo.rows.length > 0) {
      const warrantyCol = columnInfo.rows[0];
      console.log('✅ Warranty column successfully added:');
      console.log(`   Column: ${warrantyCol.column_name}`);
      console.log(`   Type: ${warrantyCol.data_type}`);
      console.log(`   Nullable: ${warrantyCol.is_nullable}`);
      console.log(`   Default: ${warrantyCol.column_default || 'None'}`);
    } else {
      console.log('⚠️  Warning: Warranty column not found after migration');
    }

    // Show all columns in incoming_inventory_items for reference
    console.log('\n📋 All columns in incoming_inventory_items table:');
    const allColumns = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'incoming_inventory_items'
      ORDER BY ordinal_position;
    `);

    allColumns.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`   ${row.column_name}: ${row.data_type} ${nullable}`);
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

runMigration057();
