/**
 * Test to verify that getById returns items with item_id field
 * Run with: node tests/test_item_id_fix.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const IncomingInventoryModel = require('../src/models/incomingInventoryModel');

// Use the database connection string from migration file
const DATABASE_URL = 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testItemIdInGetById() {
  console.log('🧪 Testing getById returns items with item_id...\n');
  
  try {
    // Get a test company ID (use first available)
    const companyResult = await pool.query(
      'SELECT DISTINCT company_id FROM incoming_inventory WHERE is_active = true LIMIT 1'
    );
    
    if (companyResult.rows.length === 0) {
      console.log('⚠️  No test data found. Skipping test.\n');
      return;
    }
    
    const companyId = companyResult.rows[0].company_id;
    console.log(`📋 Using company: ${companyId}\n`);
    
    // Get an incoming inventory record
    const recordResult = await pool.query(
      'SELECT id FROM incoming_inventory WHERE company_id = $1 AND is_active = true LIMIT 1',
      [companyId]
    );
    
    if (recordResult.rows.length === 0) {
      console.log('⚠️  No incoming inventory records found. Skipping test.\n');
      return;
    }
    
    const recordId = recordResult.rows[0].id;
    console.log(`📦 Testing record ID: ${recordId}\n`);
    
    // Call getById
    const record = await IncomingInventoryModel.getById(recordId, companyId);
    
    if (!record) {
      console.log('❌ getById returned null\n');
      return;
    }
    
    if (!record.items || record.items.length === 0) {
      console.log('⚠️  Record has no items. Skipping item test.\n');
      return;
    }
    
    console.log(`✅ Found ${record.items.length} item(s)\n`);
    
    // Check each item for item_id field
    let allHaveItemId = true;
    record.items.forEach((item, index) => {
      const hasItemId = item.item_id !== undefined && item.item_id !== null;
      console.log(`Item ${index + 1}:`);
      console.log(`  - item_id: ${item.item_id} ${hasItemId ? '✅' : '❌'}`);
      console.log(`  - id: ${item.id}`);
      console.log(`  - sku_id: ${item.sku_id}`);
      console.log(`  - item_name: ${item.item_name || 'N/A'}`);
      console.log('');
      
      if (!hasItemId) {
        allHaveItemId = false;
      }
    });
    
    if (allHaveItemId) {
      console.log('✅ SUCCESS: All items have item_id field\n');
    } else {
      console.log('❌ FAIL: Some items are missing item_id field\n');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testItemIdInGetById();
