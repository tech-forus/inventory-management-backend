const { Pool } = require('pg');
const dbConfig = require('./config');

const pool = new Pool(dbConfig);

async function verifySKUsTable() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'skus'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ SKUs table does not exist');
      return;
    }

    console.log('✅ SKUs table exists\n');

    // Get table structure
    const columns = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'skus'
      ORDER BY ordinal_position
    `);

    console.log('Table Structure:');
    console.log('================');
    console.log('Column Name'.padEnd(30) + ' | ' + 'Data Type'.padEnd(20) + ' | ' + 'Length'.padEnd(10) + ' | ' + 'Nullable');
    console.log('-'.repeat(100));

    columns.rows.forEach(col => {
      const length = col.character_maximum_length ? col.character_maximum_length.toString() : '';
      console.log(
        col.column_name.padEnd(30) + ' | ' +
        col.data_type.padEnd(20) + ' | ' +
        length.padEnd(10) + ' | ' +
        col.is_nullable
      );
    });

    // Check constraints
    console.log('\n\nConstraints:');
    console.log('============');
    const constraints = await pool.query(`
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'skus'
    `);

    constraints.rows.forEach(constraint => {
      console.log(`- ${constraint.constraint_name} (${constraint.constraint_type})`);
    });

    // Check indexes
    console.log('\n\nIndexes:');
    console.log('========');
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'skus'
    `);

    indexes.rows.forEach(index => {
      console.log(`- ${index.indexname}`);
    });

    console.log('\n✅ SKUs table verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifySKUsTable();

