const { Client } = require('pg');

// Connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration058Direct() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Check if columns already exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incoming_inventory' 
      AND column_name IN ('freight_amount', 'number_of_boxes', 'received_boxes');
    `);

    const existingColumns = checkColumns.rows.map(row => row.column_name);
    const columnsToAdd = ['freight_amount', 'number_of_boxes', 'received_boxes'].filter(col => !existingColumns.includes(col));

    if (columnsToAdd.length === 0) {
      console.log('⏭️  All columns already exist in incoming_inventory table');
      await client.end();
      return;
    }

    console.log(`🔄 Adding columns to incoming_inventory table: ${columnsToAdd.join(', ')}\n`);

    // Execute migration directly
    await client.query('BEGIN');
    
    if (columnsToAdd.includes('freight_amount')) {
      await client.query(`
        ALTER TABLE incoming_inventory
          ADD COLUMN IF NOT EXISTS freight_amount DECIMAL(15, 2) DEFAULT 0;
      `);
      console.log('✅ Added freight_amount column');
    }

    if (columnsToAdd.includes('number_of_boxes')) {
      await client.query(`
        ALTER TABLE incoming_inventory
          ADD COLUMN IF NOT EXISTS number_of_boxes INTEGER DEFAULT 0;
      `);
      console.log('✅ Added number_of_boxes column');
    }

    if (columnsToAdd.includes('received_boxes')) {
      await client.query(`
        ALTER TABLE incoming_inventory
          ADD COLUMN IF NOT EXISTS received_boxes INTEGER DEFAULT 0;
      `);
      console.log('✅ Added received_boxes column');
    }

    await client.query(`
      COMMENT ON COLUMN incoming_inventory.freight_amount IS 'Freight/transportation amount for the entire invoice';
    `);

    await client.query(`
      COMMENT ON COLUMN incoming_inventory.number_of_boxes IS 'Total number of boxes in the shipment';
    `);

    await client.query(`
      COMMENT ON COLUMN incoming_inventory.received_boxes IS 'Number of boxes actually received';
    `);

    await client.query('COMMIT');

    console.log('\n✅ Successfully added all columns\n');

    // Verify the changes
    const columnInfo = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'incoming_inventory'
      AND column_name IN ('freight_amount', 'number_of_boxes', 'received_boxes')
      ORDER BY column_name;
    `);

    if (columnInfo.rows.length > 0) {
      console.log('✅ Columns verified:');
      columnInfo.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'None'})`);
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

runMigration058Direct();
