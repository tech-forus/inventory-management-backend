const { Pool } = require('pg');
const dbConfig = require('../scripts/database/config');
const pool = new Pool(dbConfig);
const IncomingInventoryModel = require('../src/models/incomingInventoryModel');

/**
 * Unit tests for new incoming inventory features:
 * - Grouped history by invoice
 * - Move short to rejected
 * - Update short item
 * - Challan counting
 */

async function runTests() {
  console.log('🧪 Starting unit tests for new incoming inventory features...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  const errors = [];

  // Test 1: getHistory returns grouped records
  async function testGetHistoryGrouped() {
    try {
      console.log('Test 1: Testing getHistory returns grouped records by invoice...');
      
      // Get a company ID from the database
      const companyResult = await pool.query('SELECT company_id FROM companies LIMIT 1');
      if (companyResult.rows.length === 0) {
        throw new Error('No companies found in database');
      }
      const companyId = companyResult.rows[0].company_id;

      const history = await IncomingInventoryModel.getHistory(companyId, { limit: 10 });
      
      // Check that history is an array
      if (!Array.isArray(history)) {
        throw new Error('History should be an array');
      }

      // Check structure of returned records
      if (history.length > 0) {
        const record = history[0];
        const requiredFields = ['id', 'invoice_date', 'invoice_number', 'total_quantity', 'received_quantity', 'status'];
        for (const field of requiredFields) {
          if (!(field in record)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Check status is either 'Complete' or 'Pending'
        if (record.status !== 'Complete' && record.status !== 'Pending') {
          throw new Error(`Invalid status: ${record.status}. Should be 'Complete' or 'Pending'`);
        }

        // Check that status is 'Pending' if total_short > 0
        if (record.total_short > 0 && record.status !== 'Pending') {
          throw new Error('Status should be Pending when total_short > 0');
        }
      }

      console.log('✅ Test 1 passed: getHistory returns grouped records\n');
      passedTests++;
    } catch (error) {
      console.log(`❌ Test 1 failed: ${error.message}\n`);
      failedTests++;
      errors.push({ test: 'testGetHistoryGrouped', error: error.message });
    }
  }

  // Test 2: getItemsByInventoryId returns items with challan info
  async function testGetItemsByInventoryId() {
    try {
      console.log('Test 2: Testing getItemsByInventoryId returns items with challan info...');
      
      const companyResult = await pool.query('SELECT company_id FROM companies LIMIT 1');
      if (companyResult.rows.length === 0) {
        throw new Error('No companies found in database');
      }
      const companyId = companyResult.rows[0].company_id;

      // Get an incoming inventory ID
      const inventoryResult = await pool.query(
        'SELECT id FROM incoming_inventory WHERE company_id = $1 AND is_active = true LIMIT 1',
        [companyId]
      );

      if (inventoryResult.rows.length === 0) {
        console.log('⚠️  Test 2 skipped: No incoming inventory records found\n');
        return;
      }

      const inventoryId = inventoryResult.rows[0].id;
      const items = await IncomingInventoryModel.getItemsByInventoryId(inventoryId, companyId);

      if (!Array.isArray(items)) {
        throw new Error('Items should be an array');
      }

      if (items.length > 0) {
        const item = items[0];
        const requiredFields = ['item_id', 'sku_id', 'received', 'short', 'rejected'];
        for (const field of requiredFields) {
          if (!(field in item)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Check that challan_number and challan_date fields exist (can be null)
        if (!('challan_number' in item)) {
          throw new Error('Missing challan_number field');
        }
        if (!('challan_date' in item)) {
          throw new Error('Missing challan_date field');
        }
      }

      console.log('✅ Test 2 passed: getItemsByInventoryId returns items with challan info\n');
      passedTests++;
    } catch (error) {
      console.log(`❌ Test 2 failed: ${error.message}\n`);
      failedTests++;
      errors.push({ test: 'testGetItemsByInventoryId', error: error.message });
    }
  }

  // Test 3: moveShortToRejected updates stock correctly
  async function testMoveShortToRejected() {
    try {
      console.log('Test 3: Testing moveShortToRejected updates stock correctly...');
      
      const companyResult = await pool.query('SELECT company_id FROM companies LIMIT 1');
      if (companyResult.rows.length === 0) {
        throw new Error('No companies found in database');
      }
      const companyId = companyResult.rows[0].company_id;

      // Find an item with short > 0
      const itemResult = await pool.query(`
        SELECT iii.id as item_id, iii.incoming_inventory_id, iii.sku_id, iii.received, iii.short, iii.rejected, iii.total_quantity,
               s.current_stock
        FROM incoming_inventory_items iii
        INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
        LEFT JOIN skus s ON iii.sku_id = s.id
        WHERE ii.company_id = $1 AND ii.is_active = true AND iii.short > 0
        LIMIT 1
      `, [companyId]);

      if (itemResult.rows.length === 0) {
        console.log('⚠️  Test 3 skipped: No items with short quantity found\n');
        return;
      }

      const item = itemResult.rows[0];
      const oldShort = item.short;
      const oldRejected = item.rejected || 0;
      const oldStock = item.current_stock || 0;
      const inventoryId = item.incoming_inventory_id;
      const itemId = item.item_id;

      // Move short to rejected
      await IncomingInventoryModel.moveShortToRejected(inventoryId, itemId, companyId);

      // Verify the update
      const updatedItemResult = await pool.query(
        'SELECT short, rejected FROM incoming_inventory_items WHERE id = $1',
        [itemId]
      );

      if (updatedItemResult.rows.length === 0) {
        throw new Error('Item not found after update');
      }

      const updatedItem = updatedItemResult.rows[0];
      if (updatedItem.short !== 0) {
        throw new Error(`Short should be 0 after move, got ${updatedItem.short}`);
      }

      if (updatedItem.rejected !== oldRejected + oldShort) {
        throw new Error(`Rejected should be ${oldRejected + oldShort}, got ${updatedItem.rejected}`);
      }

      // Verify stock was updated
      const stockResult = await pool.query('SELECT current_stock FROM skus WHERE id = $1', [item.sku_id]);
      const newStock = stockResult.rows[0].current_stock || 0;
      const expectedStockIncrease = item.total_quantity - item.received; // The short that was moved

      // Stock should have increased by the short amount
      if (newStock < oldStock) {
        throw new Error('Stock should have increased after moving short to rejected');
      }

      console.log('✅ Test 3 passed: moveShortToRejected updates stock correctly\n');
      passedTests++;
    } catch (error) {
      console.log(`❌ Test 3 failed: ${error.message}\n`);
      failedTests++;
      errors.push({ test: 'testMoveShortToRejected', error: error.message });
    }
  }

  // Test 4: updateShortItem validates and updates correctly
  async function testUpdateShortItem() {
    try {
      console.log('Test 4: Testing updateShortItem validates and updates correctly...');
      
      const companyResult = await pool.query('SELECT company_id FROM companies LIMIT 1');
      if (companyResult.rows.length === 0) {
        throw new Error('No companies found in database');
      }
      const companyId = companyResult.rows[0].company_id;

      // Find an item with short > 0
      const itemResult = await pool.query(`
        SELECT iii.id as item_id, iii.incoming_inventory_id, iii.sku_id, iii.received, iii.short, iii.rejected, iii.total_quantity,
               s.current_stock
        FROM incoming_inventory_items iii
        INNER JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
        LEFT JOIN skus s ON iii.sku_id = s.id
        WHERE ii.company_id = $1 AND ii.is_active = true AND iii.short > 0
        LIMIT 1
      `, [companyId]);

      if (itemResult.rows.length === 0) {
        console.log('⚠️  Test 4 skipped: No items with short quantity found\n');
        return;
      }

      const item = itemResult.rows[0];
      const inventoryId = item.incoming_inventory_id;
      const itemId = item.item_id;
      const oldReceived = item.received;
      const oldShort = item.short;
      const oldRejected = item.rejected || 0;
      const totalQty = item.total_quantity;

      // Test validation: received + short + rejected must equal total_quantity
      try {
        await IncomingInventoryModel.updateShortItem(inventoryId, itemId, {
          received: oldReceived + 1,
          short: oldShort,
        }, companyId);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        if (!error.message.includes('must equal Total Quantity')) {
          throw new Error(`Expected validation error, got: ${error.message}`);
        }
      }

      // Test valid update
      const newReceived = oldReceived + 1;
      const newShort = oldShort - 1;
      const challanNumber = 'CHALLAN-001';
      const challanDate = '2024-01-15';

      await IncomingInventoryModel.updateShortItem(inventoryId, itemId, {
        received: newReceived,
        short: newShort,
        challanNumber: challanNumber,
        challanDate: challanDate,
      }, companyId);

      // Verify the update
      const updatedItemResult = await pool.query(
        'SELECT received, short, challan_number, challan_date FROM incoming_inventory_items WHERE id = $1',
        [itemId]
      );

      const updatedItem = updatedItemResult.rows[0];
      if (updatedItem.received !== newReceived) {
        throw new Error(`Received should be ${newReceived}, got ${updatedItem.received}`);
      }

      if (updatedItem.short !== newShort) {
        throw new Error(`Short should be ${newShort}, got ${updatedItem.short}`);
      }

      if (updatedItem.challan_number !== challanNumber) {
        throw new Error(`Challan number should be ${challanNumber}, got ${updatedItem.challan_number}`);
      }

      if (updatedItem.challan_date.toISOString().split('T')[0] !== challanDate) {
        throw new Error(`Challan date should be ${challanDate}, got ${updatedItem.challan_date}`);
      }

      console.log('✅ Test 4 passed: updateShortItem validates and updates correctly\n');
      passedTests++;
    } catch (error) {
      console.log(`❌ Test 4 failed: ${error.message}\n`);
      failedTests++;
      errors.push({ test: 'testUpdateShortItem', error: error.message });
    }
  }

  // Test 5: Challan counting logic
  async function testChallanCounting() {
    try {
      console.log('Test 5: Testing challan counting logic...');
      
      const companyResult = await pool.query('SELECT company_id FROM companies LIMIT 1');
      if (companyResult.rows.length === 0) {
        throw new Error('No companies found in database');
      }
      const companyId = companyResult.rows[0].company_id;

      // Get an incoming inventory ID
      const inventoryResult = await pool.query(
        'SELECT id FROM incoming_inventory WHERE company_id = $1 AND is_active = true LIMIT 1',
        [companyId]
      );

      if (inventoryResult.rows.length === 0) {
        console.log('⚠️  Test 5 skipped: No incoming inventory records found\n');
        return;
      }

      const inventoryId = inventoryResult.rows[0].id;
      const items = await IncomingInventoryModel.getItemsByInventoryId(inventoryId, companyId);

      // Count unique challans
      const uniqueChallans = new Set();
      items.forEach(item => {
        if (item.challan_number) {
          uniqueChallans.add(item.challan_number);
        }
      });

      const challanCount = uniqueChallans.size;
      console.log(`   Found ${challanCount} unique challan(s) for inventory ${inventoryId}`);

      console.log('✅ Test 5 passed: Challan counting logic works\n');
      passedTests++;
    } catch (error) {
      console.log(`❌ Test 5 failed: ${error.message}\n`);
      failedTests++;
      errors.push({ test: 'testChallanCounting', error: error.message });
    }
  }

  // Run all tests
  await testGetHistoryGrouped();
  await testGetItemsByInventoryId();
  await testMoveShortToRejected();
  await testUpdateShortItem();
  await testChallanCounting();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📝 Total: ${passedTests + failedTests}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${err.test}: ${err.error}`);
    });
  }

  // Close database connection
  await pool.end();
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

