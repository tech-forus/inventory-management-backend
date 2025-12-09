const { Client } = require('pg');
const dbConfig = require('./config');

async function verifyMigration() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check if columns exist
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'incoming_inventory' 
      AND column_name IN (
        'document_type', 
        'document_sub_type', 
        'vendor_sub_type', 
        'delivery_challan_sub_type', 
        'destination_type', 
        'destination_id'
      )
      ORDER BY column_name;
    `);
    
    console.log('📋 Migration 024 - Column Verification:\n');
    console.log(`Found ${result.rows.length} columns:\n`);
    
    result.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });
    
    if (result.rows.length === 6) {
      console.log('\n✅ All 6 columns exist! Migration successful.');
    } else {
      console.log(`\n⚠️  Expected 6 columns, found ${result.rows.length}`);
    }
    
    // Check indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'incoming_inventory'
      AND indexname LIKE 'idx_incoming_inventory_%'
      ORDER BY indexname;
    `);
    
    console.log('\n📊 Indexes created:\n');
    indexResult.rows.forEach(idx => {
      console.log(`  ✓ ${idx.indexname}`);
    });
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (client) await client.end();
    process.exit(1);
  }
}

verifyMigration();

