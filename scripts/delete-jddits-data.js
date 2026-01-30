/**
 * Delete All JDDITS Company Data
 * 
 * This script permanently deletes ALL data for company_id = 'JDDITS':
 *   - All SKU products
 *   - All incoming inventory records
 *   - All outgoing inventory records
 *   - All inventory ledger transactions
 *   - All related data (manufacturing, price history, rejected reports, BOM)
 * 
 * WARNING: This action is PERMANENT and CANNOT be undone!
 * 
 * Usage: node scripts/delete-jddits-data.js
 */

const { Pool } = require('pg');
const readline = require('readline');

// Database connection - use provided connection string or fallback to config
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

// Set company ID - can be changed via command line argument or environment variable
const COMPANY_ID = process.argv[2] || process.env.COMPANY_ID || 'JDDITS';

// Check for --force flag to skip confirmation
const FORCE_MODE = process.argv.includes('--force') || process.argv.includes('-f');

// Create readline interface for confirmation (only if not in force mode)
const rl = FORCE_MODE ? null : readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask for confirmation
function askQuestion(question) {
  if (FORCE_MODE) {
    return Promise.resolve('YES');
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to get counts
async function getCounts(client) {
  const counts = {};
  
  const queries = [
    { key: 'skus', query: 'SELECT COUNT(*) as count FROM skus WHERE company_id = $1' },
    { key: 'incoming_inventory', query: 'SELECT COUNT(*) as count FROM incoming_inventory WHERE company_id = $1' },
    { key: 'outgoing_inventory', query: 'SELECT COUNT(*) as count FROM outgoing_inventory WHERE company_id = $1' },
    { key: 'inventory_ledgers', query: 'SELECT COUNT(*) as count FROM inventory_ledgers WHERE company_id = $1' },
    { key: 'manufacturing_records', query: 'SELECT COUNT(*) as count FROM manufacturing_records WHERE company_id = $1' },
    { key: 'price_history', query: 'SELECT COUNT(*) as count FROM price_history WHERE company_id = $1' },
    { key: 'rejected_item_reports', query: 'SELECT COUNT(*) as count FROM rejected_item_reports WHERE company_id = $1' },
    { key: 'bom_materials', query: 'SELECT COUNT(*) as count FROM bom_materials WHERE company_id = $1' },
  ];

  for (const { key, query } of queries) {
    try {
      const result = await client.query(query, [COMPANY_ID]);
      counts[key] = parseInt(result.rows[0].count, 10);
    } catch (error) {
      // Table might not exist, set to 0
      counts[key] = 0;
    }
  }

  return counts;
}

// Main deletion function
async function deleteJDDITSData() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    console.log('\n========================================');
    console.log(`DELETE ALL ${COMPANY_ID} COMPANY DATA`);
    console.log('========================================\n');

    // Get counts before deletion
    console.log('Fetching current data counts...');
    const beforeCounts = await getCounts(client);
    
    console.log('\nCurrent Data Counts:');
    console.log('----------------------------------------');
    console.log(`SKUs: ${beforeCounts.skus}`);
    console.log(`Incoming Inventory Records: ${beforeCounts.incoming_inventory}`);
    console.log(`Outgoing Inventory Records: ${beforeCounts.outgoing_inventory}`);
    console.log(`Inventory Ledger Transactions: ${beforeCounts.inventory_ledgers}`);
    console.log(`Manufacturing Records: ${beforeCounts.manufacturing_records}`);
    console.log(`Price History Records: ${beforeCounts.price_history}`);
    console.log(`Rejected Item Reports: ${beforeCounts.rejected_item_reports}`);
    console.log(`BOM Materials: ${beforeCounts.bom_materials}`);
    console.log('----------------------------------------\n');

    const totalRecords = Object.values(beforeCounts).reduce((sum, count) => sum + count, 0);
    
    if (totalRecords === 0) {
      console.log(`No data found for company ${COMPANY_ID}. Nothing to delete.`);
      return;
    }

    // Final confirmation (skip if force mode)
    if (!FORCE_MODE) {
      console.log('⚠️  WARNING: This will PERMANENTLY DELETE all the above data!');
      console.log('⚠️  This action CANNOT be undone!\n');
      
      const confirmation1 = await askQuestion(`Type "DELETE ${COMPANY_ID}" to confirm: `);
      
      if (confirmation1 !== `DELETE ${COMPANY_ID}`) {
        console.log('Deletion cancelled.');
        return;
      }

      const confirmation2 = await askQuestion('Are you absolutely sure? Type "YES" to proceed: ');
      
      if (confirmation2 !== 'YES') {
        console.log('Deletion cancelled.');
        return;
      }
    } else {
      console.log('⚠️  FORCE MODE: Skipping confirmation prompts...\n');
    }

    console.log('\nStarting deletion...\n');

    // Begin transaction
    await client.query('BEGIN');

    try {
      // Step 1: Delete Inventory Ledgers
      console.log('Step 1: Deleting inventory ledgers...');
      const ledgerResult = await client.query(
        'DELETE FROM inventory_ledgers WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${ledgerResult.rowCount} ledger transactions`);

      // Step 2: Delete Rejected Item Reports
      console.log('Step 2: Deleting rejected item reports...');
      const rejectedResult = await client.query(
        'DELETE FROM rejected_item_reports WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${rejectedResult.rowCount} rejected item reports`);

      // Step 3: Delete Price History
      console.log('Step 3: Deleting price history...');
      const priceResult = await client.query(
        'DELETE FROM price_history WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${priceResult.rowCount} price history records`);

      // Step 4: Delete Manufacturing Components
      console.log('Step 4: Deleting manufacturing components...');
      const mfgCompResult = await client.query(
        `DELETE FROM manufacturing_components 
         WHERE manufacturing_id IN (
           SELECT id FROM manufacturing_records WHERE company_id = $1
         )`,
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${mfgCompResult.rowCount} manufacturing components`);

      // Step 5: Delete Manufacturing Records
      console.log('Step 5: Deleting manufacturing records...');
      const mfgResult = await client.query(
        'DELETE FROM manufacturing_records WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${mfgResult.rowCount} manufacturing records`);

      // Step 6: Delete BOM Materials
      console.log('Step 6: Deleting BOM materials...');
      const bomResult = await client.query(
        'DELETE FROM bom_materials WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${bomResult.rowCount} BOM materials`);

      // Step 7: Delete Incoming Inventory Items
      console.log('Step 7: Deleting incoming inventory items...');
      const incomingItemsResult = await client.query(
        `DELETE FROM incoming_inventory_items 
         WHERE incoming_inventory_id IN (
           SELECT id FROM incoming_inventory WHERE company_id = $1
         )`,
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${incomingItemsResult.rowCount} incoming inventory items`);

      // Step 8: Delete Incoming Inventory
      console.log('Step 8: Deleting incoming inventory records...');
      const incomingResult = await client.query(
        'DELETE FROM incoming_inventory WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${incomingResult.rowCount} incoming inventory records`);

      // Step 9: Delete Outgoing Inventory Items
      console.log('Step 9: Deleting outgoing inventory items...');
      const outgoingItemsResult = await client.query(
        `DELETE FROM outgoing_inventory_items 
         WHERE outgoing_inventory_id IN (
           SELECT id FROM outgoing_inventory WHERE company_id = $1
         )`,
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${outgoingItemsResult.rowCount} outgoing inventory items`);

      // Step 10: Delete Outgoing Inventory
      console.log('Step 10: Deleting outgoing inventory records...');
      const outgoingResult = await client.query(
        'DELETE FROM outgoing_inventory WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${outgoingResult.rowCount} outgoing inventory records`);

      // Step 11: Delete SKUs (LAST STEP)
      console.log('Step 11: Deleting SKUs...');
      const skusResult = await client.query(
        'DELETE FROM skus WHERE company_id = $1',
        [COMPANY_ID]
      );
      console.log(`   ✓ Deleted ${skusResult.rowCount} SKUs`);

      // Commit transaction
      await client.query('COMMIT');
      console.log('\n✅ Transaction committed successfully!\n');

      // Verify deletion
      console.log('Verifying deletion...');
      const afterCounts = await getCounts(client);
      
      console.log('\nRemaining Data Counts:');
      console.log('----------------------------------------');
      console.log(`SKUs: ${afterCounts.skus}`);
      console.log(`Incoming Inventory Records: ${afterCounts.incoming_inventory}`);
      console.log(`Outgoing Inventory Records: ${afterCounts.outgoing_inventory}`);
      console.log(`Inventory Ledger Transactions: ${afterCounts.inventory_ledgers}`);
      console.log(`Manufacturing Records: ${afterCounts.manufacturing_records}`);
      console.log(`Price History Records: ${afterCounts.price_history}`);
      console.log(`Rejected Item Reports: ${afterCounts.rejected_item_reports}`);
      console.log(`BOM Materials: ${afterCounts.bom_materials}`);
      console.log('----------------------------------------\n');

      const totalRemaining = Object.values(afterCounts).reduce((sum, count) => sum + count, 0);
      
      if (totalRemaining === 0) {
        console.log(`✅ SUCCESS: All ${COMPANY_ID} data has been deleted successfully!`);
      } else {
        console.log('⚠️  WARNING: Some records may still exist. Please verify manually.');
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Error during deletion:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    if (rl) {
      rl.close();
    }
  }
}

// Run the script
deleteJDDITSData()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
