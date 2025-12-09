/**
 * Test Script: 1000 Test Cases for Incoming Inventory
 * Tests the updated schema with warranty, received (instead of accepted/rejected), and received_boxes
 * 
 * Run with: node test_incoming_inventory_1000.js
 */

const { Pool } = require('pg');
const dbConfig = require('./database/config');

const pool = new Pool(dbConfig);

// Test configuration
const TEST_COMPANY_ID = 'TEST01';
const NUM_TEST_CASES = 1000;

// Statistics
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Cache for existing IDs
let existingIds = {
  vendors: [],
  brands: [],
  teams: [],
  skus: []
};

/**
 * Load existing IDs from database
 */
async function loadExistingIds() {
  try {
    // Get vendors
    const vendorsResult = await pool.query('SELECT id FROM vendors WHERE is_active = true LIMIT 100');
    existingIds.vendors = vendorsResult.rows.map(r => r.id);
    
    // Get brands
    const brandsResult = await pool.query('SELECT id FROM brands WHERE is_active = true LIMIT 100');
    existingIds.brands = brandsResult.rows.map(r => r.id);
    
    // Get teams
    const teamsResult = await pool.query('SELECT id FROM teams WHERE is_active = true AND company_id = $1 LIMIT 100', [TEST_COMPANY_ID]);
    existingIds.teams = teamsResult.rows.map(r => r.id);
    
    // Get SKUs
    const skusResult = await pool.query('SELECT id FROM skus WHERE is_active = true LIMIT 100');
    existingIds.skus = skusResult.rows.map(r => r.id);
    
    console.log(`Loaded existing IDs: ${existingIds.vendors.length} vendors, ${existingIds.brands.length} brands, ${existingIds.teams.length} teams, ${existingIds.skus.length} SKUs\n`);
    
    // If no data exists, create minimal test data
    if (existingIds.vendors.length === 0 || existingIds.brands.length === 0 || existingIds.skus.length === 0) {
      console.log('⚠️  Warning: Some required data is missing. Test may fail.\n');
    }
  } catch (error) {
    console.error('Error loading existing IDs:', error.message);
  }
}

/**
 * Generate random test data
 */
function generateTestData() {
  const warrantyUnits = ['months', 'year'];
  const reasons = ['purchase', 'replacement', 'from_factory', 'others'];
  
  // Get random IDs from existing data, or use null if none exist
  const vendorId = existingIds.vendors.length > 0 
    ? existingIds.vendors[Math.floor(Math.random() * existingIds.vendors.length)]
    : null;
  const brandId = existingIds.brands.length > 0 
    ? existingIds.brands[Math.floor(Math.random() * existingIds.brands.length)]
    : null;
  const receivedBy = existingIds.teams.length > 0 
    ? existingIds.teams[Math.floor(Math.random() * existingIds.teams.length)]
    : null;
  
  return {
    invoiceDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoiceNumber: `INV-${Math.floor(Math.random() * 1000000)}`,
    docketNumber: `DOC-${Math.floor(Math.random() * 100000)}`,
    transportorName: `Transportor ${Math.floor(Math.random() * 100)}`,
    vendorId: vendorId,
    brandId: brandId,
    warranty: Math.floor(Math.random() * 60), // 0-59 months/years
    warrantyUnit: warrantyUnits[Math.floor(Math.random() * warrantyUnits.length)],
    receivingDate: new Date().toISOString().split('T')[0],
    receivedBy: receivedBy,
    reason: reasons[Math.floor(Math.random() * reasons.length)],
    remarks: `Test remarks ${Math.floor(Math.random() * 1000)}`,
    status: Math.random() > 0.5 ? 'completed' : 'draft',
    items: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => {
      const skuId = existingIds.skus.length > 0 
        ? existingIds.skus[Math.floor(Math.random() * existingIds.skus.length)]
        : null;
      return {
        skuId: skuId,
        totalQuantity: Math.floor(Math.random() * 1000) + 1,
        received: 0, // Will be calculated
        short: 0, // Will be calculated
        unitPrice: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
        numberOfBoxes: Math.floor(Math.random() * 50) + 1,
        receivedBoxes: 0, // Will be calculated
      };
    }).filter(item => item.skuId !== null) // Only include items with valid SKU
  };
}

/**
 * Calculate received and short based on totalQuantity
 */
function calculateQuantities(item) {
  // Received is typically 80-100% of totalQuantity
  const receivedPercent = 0.8 + Math.random() * 0.2;
  item.received = Math.floor(item.totalQuantity * receivedPercent);
  item.short = Math.max(0, item.totalQuantity - item.received);
  
  // Received boxes is typically 70-100% of total boxes
  const receivedBoxesPercent = 0.7 + Math.random() * 0.3;
  item.receivedBoxes = Math.floor(item.numberOfBoxes * receivedBoxesPercent);
  
  // Calculate total value
  item.totalValue = item.received * item.unitPrice;
  
  return item;
}

/**
 * Test creating an incoming inventory record
 */
async function testCreateIncomingInventory(testCaseNum) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const testData = generateTestData();
    testData.items = testData.items.map(calculateQuantities);
    
    // Calculate total value
    const totalValue = testData.items.reduce((sum, item) => sum + item.totalValue, 0);
    
    // Insert main record
    const inventoryResult = await client.query(
      `INSERT INTO incoming_inventory (
        company_id, invoice_date, invoice_number, docket_number, transportor_name,
        vendor_id, brand_id, warranty, warranty_unit, receiving_date, received_by, 
        reason, remarks, status, total_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        TEST_COMPANY_ID,
        testData.invoiceDate,
        testData.invoiceNumber,
        testData.docketNumber,
        testData.transportorName,
        testData.vendorId,
        testData.brandId,
        testData.warranty,
        testData.warrantyUnit,
        testData.receivingDate,
        testData.receivedBy,
        testData.reason,
        testData.remarks,
        testData.status,
        totalValue,
      ]
    );
    
    const inventoryId = inventoryResult.rows[0].id;
    
    // Insert items
    const insertedItems = [];
    for (const item of testData.items) {
      const itemResult = await client.query(
        `INSERT INTO incoming_inventory_items (
          incoming_inventory_id, sku_id, received, short,
          total_quantity, unit_price, total_value, number_of_boxes, received_boxes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          inventoryId,
          item.skuId,
          item.received,
          item.short,
          item.totalQuantity,
          item.unitPrice,
          item.totalValue,
          item.numberOfBoxes,
          item.receivedBoxes,
        ]
      );
      insertedItems.push(itemResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    // Verify the data
    const verifyResult = await client.query(
      `SELECT * FROM incoming_inventory WHERE id = $1`,
      [inventoryId]
    );
    
    if (verifyResult.rows.length === 0) {
      throw new Error('Record not found after insert');
    }
    
    const record = verifyResult.rows[0];
    
    // Verify fields
    const checks = [
      { field: 'warranty', expected: testData.warranty, actual: record.warranty },
      { field: 'warranty_unit', expected: testData.warrantyUnit, actual: record.warranty_unit },
      { field: 'invoice_number', expected: testData.invoiceNumber, actual: record.invoice_number },
      { field: 'received_by', expected: testData.receivedBy, actual: record.received_by },
    ];
    
    for (const check of checks) {
      if (check.actual !== check.expected) {
        throw new Error(`Field ${check.field} mismatch: expected ${check.expected}, got ${check.actual}`);
      }
    }
    
    // Verify items
    const itemsResult = await client.query(
      `SELECT * FROM incoming_inventory_items WHERE incoming_inventory_id = $1 ORDER BY id`,
      [inventoryId]
    );
    
    if (itemsResult.rows.length !== testData.items.length) {
      throw new Error(`Item count mismatch: expected ${testData.items.length}, got ${itemsResult.rows.length}`);
    }
    
    for (let i = 0; i < itemsResult.rows.length; i++) {
      const dbItem = itemsResult.rows[i];
      const testItem = testData.items[i];
      
      const itemChecks = [
        { field: 'received', expected: testItem.received, actual: dbItem.received },
        { field: 'short', expected: testItem.short, actual: dbItem.short },
        { field: 'total_quantity', expected: testItem.totalQuantity, actual: dbItem.total_quantity },
        { field: 'received_boxes', expected: testItem.receivedBoxes, actual: dbItem.received_boxes },
      ];
      
      for (const check of itemChecks) {
        if (check.actual !== check.expected) {
          throw new Error(`Item ${i} field ${check.field} mismatch: expected ${check.expected}, got ${check.actual}`);
        }
      }
      
      // Verify calculation: received + short = totalQuantity
      if (dbItem.received + dbItem.short !== dbItem.total_quantity) {
        throw new Error(`Item ${i} calculation error: received (${dbItem.received}) + short (${dbItem.short}) != total_quantity (${dbItem.total_quantity})`);
      }
    }
    
    // Clean up - delete test record
    await client.query('DELETE FROM incoming_inventory_items WHERE incoming_inventory_id = $1', [inventoryId]);
    await client.query('DELETE FROM incoming_inventory WHERE id = $1', [inventoryId]);
    
    return { success: true, inventoryId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run a single test case
 */
async function runTestCase(testCaseNum) {
  try {
    stats.total++;
    const result = await testCreateIncomingInventory(testCaseNum);
    stats.passed++;
    
    if (testCaseNum % 100 === 0) {
      console.log(`✓ Test case ${testCaseNum} passed (${stats.passed}/${stats.total} passed, ${stats.failed} failed)`);
    }
    
    return result;
  } catch (error) {
    stats.failed++;
    stats.errors.push({
      testCase: testCaseNum,
      error: error.message
    });
    
    if (testCaseNum % 100 === 0 || stats.failed <= 10) {
      console.error(`✗ Test case ${testCaseNum} failed: ${error.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('========================================');
  console.log('Incoming Inventory 1000 Test Cases');
  console.log('========================================\n');
  
  // Load existing IDs first
  await loadExistingIds();
  
  // Validate we have minimum required data
  if (existingIds.vendors.length === 0 || existingIds.brands.length === 0 || existingIds.skus.length === 0) {
    console.error('❌ Error: Missing required test data. Please ensure vendors, brands, and SKUs exist in the database.');
    process.exit(1);
  }
  
  console.log(`Running ${NUM_TEST_CASES} test cases...\n`);
  
  const startTime = Date.now();
  
  // Run tests in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < NUM_TEST_CASES; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < NUM_TEST_CASES; j++) {
      batch.push(runTestCase(i + j + 1));
    }
    await Promise.all(batch);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print results
  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`Total Tests: ${stats.total}`);
  console.log(`Passed: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(2)}%)`);
  console.log(`Duration: ${duration}s`);
  console.log(`Average: ${(duration / stats.total).toFixed(3)}s per test`);
  
  if (stats.errors.length > 0) {
    console.log('\nFirst 10 Errors:');
    stats.errors.slice(0, 10).forEach(err => {
      console.log(`  Test ${err.testCase}: ${err.error}`);
    });
  }
  
  console.log('\n========================================\n');
  
  // Exit with appropriate code
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

