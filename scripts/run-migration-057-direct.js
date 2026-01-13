const { Client } = require('pg');

// Connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigrationDirect() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Check if warranty column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incoming_inventory_items' 
      AND column_name = 'warranty';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('⏭️  Warranty column already exists in incoming_inventory_items table');
      await client.end();
      return;
    }

    console.log('🔄 Adding warranty column to incoming_inventory_items table...\n');

    // Execute migration directly
    await client.query('BEGIN');
    
    await client.query(`
      ALTER TABLE incoming_inventory_items
        ADD COLUMN IF NOT EXISTS warranty INTEGER DEFAULT 0;
    `);

    await client.query(`
      COMMENT ON COLUMN incoming_inventory_items.warranty IS 'Warranty period value for this specific item (in months)';
    `);

    await client.query('COMMIT');

    console.log('✅ Successfully added warranty column\n');

    // Verify the changes
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
      console.log('✅ Warranty column verified:');
      console.log(`   Column: ${warrantyCol.column_name}`);
      console.log(`   Type: ${warrantyCol.data_type}`);
      console.log(`   Nullable: ${warrantyCol.is_nullable}`);
      console.log(`   Default: ${warrantyCol.column_default || 'None'}\n`);
    }

    await client.end();
    console.log('✅ Migration completed successfully!');
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

runMigrationDirect();
