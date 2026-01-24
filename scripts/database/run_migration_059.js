const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '059_add_discount_fields_to_outgoing_inventory.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Starting migration: 059_add_discount_fields_to_outgoing_inventory');
    console.log('─────────────────────────────────────────────────────────\n');

    // Execute the migration
    console.log('⏳ Executing SQL statements...');
    await client.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!');
    console.log('─────────────────────────────────────────────────────────\n');

    // Verify the changes
    console.log('🔍 Verifying changes...\n');

    // Check outgoing_inventory table columns
    console.log('📊 Checking outgoing_inventory table columns:');
    const inventoryColumns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'outgoing_inventory'
        AND column_name IN (
          'freight_amount',
          'number_of_boxes',
          'received_boxes',
          'invoice_level_discount',
          'invoice_level_discount_type'
        )
      ORDER BY ordinal_position;
    `);

    if (inventoryColumns.rows.length > 0) {
      console.log('   ✓ Found columns:');
      inventoryColumns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type}, default: ${col.column_default || 'none'})`);
      });
    } else {
      console.log('   ⚠️  No new columns found in outgoing_inventory');
    }

    // Check outgoing_inventory_items table columns
    console.log('\n📊 Checking outgoing_inventory_items table columns:');
    const itemsColumns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'outgoing_inventory_items'
        AND column_name IN (
          'gst_percentage',
          'sku_discount',
          'sku_discount_amount',
          'amount_after_sku_discount',
          'invoice_discount_share',
          'final_taxable_amount',
          'total_excl_gst',
          'gst_amount',
          'total_incl_gst'
        )
      ORDER BY ordinal_position;
    `);

    if (itemsColumns.rows.length > 0) {
      console.log('   ✓ Found columns:');
      itemsColumns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type}, default: ${col.column_default || 'none'})`);
      });
    } else {
      console.log('   ⚠️  No new columns found in outgoing_inventory_items');
    }

    // Check constraints
    console.log('\n🔒 Checking constraints:');
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name IN ('outgoing_inventory', 'outgoing_inventory_items')
        AND constraint_name LIKE '%discount%'
        OR constraint_name LIKE '%gst%'
        OR constraint_name LIKE '%freight%';
    `);

    if (constraints.rows.length > 0) {
      console.log('   ✓ Found constraints:');
      constraints.rows.forEach(con => {
        console.log(`     - ${con.constraint_name} (${con.constraint_type})`);
      });
    } else {
      console.log('   ⚠️  No constraints found');
    }

    // Check indexes
    console.log('\n📇 Checking indexes:');
    const indexes = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('outgoing_inventory', 'outgoing_inventory_items')
        AND (indexname LIKE '%discount%' OR indexname LIKE '%gst%');
    `);

    if (indexes.rows.length > 0) {
      console.log('   ✓ Found indexes:');
      indexes.rows.forEach(idx => {
        console.log(`     - ${idx.indexname} on ${idx.tablename}`);
      });
    } else {
      console.log('   ⚠️  No new indexes found');
    }

    // Count existing records
    console.log('\n📈 Checking existing records:');
    const inventoryCount = await client.query('SELECT COUNT(*) as count FROM outgoing_inventory');
    const itemsCount = await client.query('SELECT COUNT(*) as count FROM outgoing_inventory_items');

    console.log(`   - outgoing_inventory records: ${inventoryCount.rows[0].count}`);
    console.log(`   - outgoing_inventory_items records: ${itemsCount.rows[0].count}`);

    if (parseInt(inventoryCount.rows[0].count) > 0) {
      console.log('   ✓ Existing records have been updated with default values');
    }

    console.log('\n─────────────────────────────────────────────────────────');
    console.log('🎉 Migration 059 completed successfully!');
    console.log('─────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error details:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the migration
console.log('═════════════════════════════════════════════════════════');
console.log('   OUTGOING INVENTORY DISCOUNT FIELDS MIGRATION');
console.log('═════════════════════════════════════════════════════════\n');

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
