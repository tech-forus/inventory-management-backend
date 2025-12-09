/**
 * Simple script to verify teams table exists and structure is correct
 * Run with: node verify_teams_table.js
 */

const { Pool } = require('pg');
const dbConfig = require('../src/config/database');

const pool = new Pool(dbConfig);

async function verifyTeamsTable() {
  try {
    console.log('========================================');
    console.log('Teams Table Verification');
    console.log('========================================\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'teams'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Teams table does NOT exist');
      console.log('\n📝 Please run the migration:');
      console.log('   cd database');
      console.log('   node migrate.js');
      console.log('   OR run: psql -U your_user -d your_database -f migrations/014_create_teams.sql\n');
      return;
    }

    console.log('✅ Teams table exists\n');

    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'teams'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Table Structure:');
    console.log('─'.repeat(60));
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('─'.repeat(60));

    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'teams';
    `);

    console.log(`\n📊 Indexes (${indexes.rows.length}):`);
    indexes.rows.forEach(idx => {
      console.log(`  ✓ ${idx.indexname}`);
    });

    // Check constraints
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'teams';
    `);

    console.log(`\n🔒 Constraints (${constraints.rows.length}):`);
    constraints.rows.forEach(con => {
      console.log(`  ✓ ${con.constraint_name} (${con.constraint_type})`);
    });

    // Check row count
    const count = await pool.query('SELECT COUNT(*) FROM teams');
    console.log(`\n📈 Current Records: ${count.rows[0].count}`);

    // Verify required columns exist
    const requiredColumns = ['id', 'company_id', 'name', 'contact_number', 'email_id', 'department', 'designation'];
    const existingColumns = columns.rows.map(c => c.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Missing required columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('\n✅ All required columns present');
    }

    console.log('\n========================================');
    console.log('✅ Teams table is ready to use!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Database is running');
    console.error('   2. Database credentials in database/config.js are correct');
    console.error('   3. Migration has been run\n');
  } finally {
    await pool.end();
  }
}

verifyTeamsTable();

