const { Client } = require('pg');
const dbConfig = require('./config');

async function verifyTable() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if companies table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'companies'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Companies table does not exist');
      return;
    }

    console.log('✅ Companies table exists\n');

    // Get table structure
    const columns = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Table Structure:');
    console.log('─'.repeat(80));
    columns.rows.forEach(col => {
      const length = col.character_maximum_length 
        ? `(${col.character_maximum_length})` 
        : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${(col.data_type + length).padEnd(25)} ${nullable}${defaultVal}`);
    });

    // Get indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'companies';
    `);

    console.log('\n📊 Indexes:');
    console.log('─'.repeat(80));
    indexes.rows.forEach(idx => {
      console.log(`  ${idx.indexname}`);
    });

    await client.end();
    console.log('\n✅ Verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTable();

