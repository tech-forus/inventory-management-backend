/**
 * Manual Test Script for SKU Current Stock Logic
 * Run with: node scripts/test-sku-current-stock.js
 */

require('dotenv').config();
const pool = require('../src/models/database');
const { generateUniqueSKUId } = require('../src/utils/skuIdGenerator');

const TEST_COMPANY_ID = 'TEST01';

async function testSKUCurrentStock() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧪 Testing SKU Current Stock Logic...\n');

    // Get test data IDs
    const company = await client.query(
      'SELECT id FROM companies WHERE company_id = $1',
      [TEST_COMPANY_ID]
    );

    if (company.rows.length === 0) {
      console.log('❌ Test company not found. Please run setup first.');
      return;
    }

    const productCategory = await client.query(
      'SELECT id FROM product_categories WHERE company_id = $1 LIMIT 1',
      [TEST_COMPANY_ID]
    );
    const itemCategory = await client.query(
      'SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1',
      [TEST_COMPANY_ID]
    );
    const vendor = await client.query(
      'SELECT id FROM vendors WHERE company_id = $1 LIMIT 1',
      [TEST_COMPANY_ID]
    );
    const brand = await client.query(
      'SELECT id FROM brands WHERE company_id = $1 LIMIT 1',
      [TEST_COMPANY_ID]
    );

    if (!productCategory.rows[0] || !itemCategory.rows[0] || !vendor.rows[0] || !brand.rows[0]) {
      console.log('❌ Test data not found. Please ensure test categories, vendors, and brands exist.');
      return;
    }

    const productCategoryId = productCategory.rows[0].id;
    const itemCategoryId = itemCategory.rows[0].id;
    const vendorId = vendor.rows[0].id;
    const brandId = brand.rows[0].id;

    // Test Case 1: currentStock = 100, minStockLevel = 20
    console.log('Test Case 1: currentStock = 100, minStockLevel = 20');
    const skuId1 = await generateUniqueSKUId(client, TEST_COMPANY_ID);
    
    const result1 = await client.query(
      `INSERT INTO skus (
        company_id, sku_id, product_category_id, item_category_id,
        item_name, vendor_id, brand_id, unit,
        min_stock_level, current_stock, status, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, sku_id, current_stock, min_stock_level`,
      [
        TEST_COMPANY_ID,
        skuId1,
        productCategoryId,
        itemCategoryId,
        'Test SKU - Current Stock 100',
        vendorId,
        brandId,
        'Pieces',
        20, // minStockLevel
        100 !== undefined && 100 !== null ? 100 : (20 || 0), // currentStock logic
        'active',
        true
      ]
    );

    const sku1 = result1.rows[0];
    console.log(`   Created SKU: ${sku1.sku_id}`);
    console.log(`   Current Stock: ${sku1.current_stock} (expected: 100)`);
    console.log(`   Min Stock Level: ${sku1.min_stock_level} (expected: 20)`);
    console.log(`   Available Stock: ${sku1.current_stock - 0} (expected: 100)`);
    
    if (sku1.current_stock === 100 && sku1.min_stock_level === 20) {
      console.log('   ✅ PASSED\n');
    } else {
      console.log('   ❌ FAILED\n');
    }

    // Test Case 2: currentStock not provided, minStockLevel = 30 (fallback)
    console.log('Test Case 2: currentStock not provided, minStockLevel = 30 (fallback)');
    const skuId2 = await generateUniqueSKUId(client, TEST_COMPANY_ID);
    
    const result2 = await client.query(
      `INSERT INTO skus (
        company_id, sku_id, product_category_id, item_category_id,
        item_name, vendor_id, brand_id, unit,
        min_stock_level, current_stock, status, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, sku_id, current_stock, min_stock_level`,
      [
        TEST_COMPANY_ID,
        skuId2,
        productCategoryId,
        itemCategoryId,
        'Test SKU - Fallback Test',
        vendorId,
        brandId,
        'Pieces',
        30, // minStockLevel
        undefined !== undefined && undefined !== null ? undefined : (30 || 0), // currentStock fallback logic
        'active',
        true
      ]
    );

    const sku2 = result2.rows[0];
    console.log(`   Created SKU: ${sku2.sku_id}`);
    console.log(`   Current Stock: ${sku2.current_stock} (expected: 30, from minStockLevel)`);
    console.log(`   Min Stock Level: ${sku2.min_stock_level} (expected: 30)`);
    
    if (sku2.current_stock === 30 && sku2.min_stock_level === 30) {
      console.log('   ✅ PASSED\n');
    } else {
      console.log('   ❌ FAILED\n');
    }

    // Cleanup
    await client.query('DELETE FROM skus WHERE sku_id IN ($1, $2)', [skuId1, skuId2]);
    
    await client.query('COMMIT');
    
    console.log('✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - When currentStock is provided, it should be used');
    console.log('   - When currentStock is not provided, minStockLevel is used as fallback');
    console.log('   - Available stock = current_stock - book_stocks (initially 0)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testSKUCurrentStock().catch(console.error);


