const { Pool } = require('pg');
const dbConfig = require('./config');

const pool = new Pool(dbConfig);

async function verifyAllTables() {
  try {
    console.log('Checking all library-related tables...\n');

    const tables = [
      'companies',
      'users',
      'vendors',
      'brands',
      'product_categories',
      'item_categories',
      'sub_categories',
      'skus'
    ];

    for (const tableName of tables) {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);

      if (tableCheck.rows[0].exists) {
        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0].count;
        
        // Get column count
        const columnsResult = await pool.query(`
          SELECT COUNT(*) as col_count 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [tableName]);
        const colCount = columnsResult.rows[0].col_count;

        console.log(`✅ ${tableName.padEnd(25)} | Columns: ${colCount.toString().padStart(3)} | Rows: ${count.toString().padStart(5)}`);
      } else {
        console.log(`❌ ${tableName.padEnd(25)} | Table does not exist`);
      }
    }

    console.log('\n✅ All tables verification complete!');
    console.log('\n📋 Summary:');
    console.log('   - Companies: Company registration data');
    console.log('   - Users: User accounts');
    console.log('   - Vendors: Supplier/vendor information');
    console.log('   - Brands: Product brand information');
    console.log('   - Product Categories: Main product category groups');
    console.log('   - Item Categories: Item classification under product categories');
    console.log('   - Sub Categories: Optional sub-classification');
    console.log('   - SKUs: Stock Keeping Unit master data');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyAllTables();

