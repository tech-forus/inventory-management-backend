const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Connection string from user
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration056() {
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

    const migrationFile = '056_remove_unused_sku_columns.sql';
    
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
    console.log('This will remove the following unused columns from skus table:');
    console.log('  - insulation');
    console.log('  - input_supply');
    console.log('  - cri');
    console.log('  - cct');
    console.log('  - beam_angle');
    console.log('  - led_type');
    console.log('  - shape');
    console.log('  - rack_number\n');

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

    // Verify the changes - show remaining columns
    console.log('🔍 Verifying skus table columns...\n');
    const columnInfo = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'skus'
      AND column_name NOT IN ('id', 'company_id', 'sku_id', 'created_at', 'updated_at')
      ORDER BY ordinal_position;
    `);

    console.log('Remaining columns in skus table:');
    columnInfo.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`   ${row.column_name}: ${row.data_type} ${nullable}`);
    });

    // Check if removed columns are gone
    const removedColumns = ['insulation', 'input_supply', 'cri', 'cct', 'beam_angle', 'led_type', 'shape', 'rack_number'];
    const checkRemoved = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'skus'
      AND column_name = ANY($1::text[])
    `, [removedColumns]);

    if (checkRemoved.rows.length === 0) {
      console.log('\n✅ All unused columns successfully removed!');
    } else {
      console.log('\n⚠️  Warning: Some columns still exist:');
      checkRemoved.rows.forEach(row => {
        console.log(`   - ${row.column_name}`);
      });
    }

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

runMigration056();
