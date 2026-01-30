const { Pool } = require('pg');

// Database connection string
const connectionString = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const COMPANY_ID = 'QVSTAR';

// List of tables with company_id, ordered by dependency (child tables first)
// This order ensures foreign key constraints are respected
const TABLES_TO_DELETE = [
  // Inventory items and transactions (most dependent)
  'incoming_inventory_items',
  'outgoing_inventory_items',
  'inventory_ledgers',
  'item_history',
  'price_history',
  'rejected_item_reports',
  
  // Inventory records
  'incoming_inventory',
  'outgoing_inventory',
  
  // SKUs and related
  'skus',
  
  // Library data
  'vendor_catalog',
  'vendors',
  'customers',
  'brands',
  'transportors',
  'materials',
  'colours',
  'warehouses',
  'teams',
  
  // User data
  'users_data',
  'admins',
  
  // Categories
  'sub_categories',
  'item_categories',
  'product_categories',
  
  // Company itself (last)
  'companies'
];

async function deleteCompanyData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Starting deletion of all data for company_id: ${COMPANY_ID}`);
    
    // First, verify company exists
    const companyCheck = await client.query(
      'SELECT id, company_id, company_name FROM companies WHERE company_id = $1',
      [COMPANY_ID]
    );
    
    if (companyCheck.rows.length === 0) {
      console.log(`Company with ID '${COMPANY_ID}' not found. Nothing to delete.`);
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`Found company: ${companyCheck.rows[0].company_name} (${companyCheck.rows[0].company_id})`);
    console.log('\nDeleting data from tables...\n');
    
    let totalDeleted = 0;
    
    for (const table of TABLES_TO_DELETE) {
      try {
        // Check if table exists
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        
        if (!tableExists.rows[0].exists) {
          console.log(`  ⚠ Table '${table}' does not exist, skipping...`);
          continue;
        }
        
        // Check if table has company_id column
        const hasCompanyId = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = 'company_id'
          )`,
          [table]
        );
        
        if (!hasCompanyId.rows[0].exists) {
          console.log(`  ⚠ Table '${table}' does not have company_id column, skipping...`);
          continue;
        }
        
        // Delete data
        const result = await client.query(
          `DELETE FROM ${table} WHERE company_id = $1`,
          [COMPANY_ID]
        );
        
        const deletedCount = result.rowCount || 0;
        totalDeleted += deletedCount;
        
        if (deletedCount > 0) {
          console.log(`  ✓ Deleted ${deletedCount} row(s) from '${table}'`);
        } else {
          console.log(`  - No data found in '${table}'`);
        }
        
      } catch (error) {
        console.error(`  ✗ Error deleting from '${table}':`, error.message);
        // Continue with other tables
      }
    }
    
    // Also delete from users table if user is associated with this company
    try {
      const usersResult = await client.query(
        `DELETE FROM users 
         WHERE id IN (
           SELECT user_id FROM users_data WHERE company_id = $1
         )`,
        [COMPANY_ID]
      );
      if (usersResult.rowCount > 0) {
        console.log(`  ✓ Deleted ${usersResult.rowCount} user(s) associated with company`);
        totalDeleted += usersResult.rowCount;
      }
    } catch (error) {
      console.error(`  ✗ Error deleting users:`, error.message);
    }
    
    console.log(`\n✓ Deletion complete! Total rows deleted: ${totalDeleted}`);
    console.log(`\nCompany '${COMPANY_ID}' and all associated data have been deleted.`);
    
    await client.query('COMMIT');
    console.log('\n✓ Transaction committed successfully.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n✗ Error occurred, transaction rolled back:');
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the deletion
deleteCompanyData()
  .then(() => {
    console.log('\n✓ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:');
    console.error(error);
    process.exit(1);
  });
