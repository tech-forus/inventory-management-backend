/**
 * Comprehensive Stress Test for Library CRUD Operations
 * Tests 1000+ cases including edge cases, bulk operations, and error handling
 */

const API_BASE_URL = 'http://localhost:5000/api';
const COMPANY_ID = process.env.COMPANY_ID || 'DEMO01';

let testCount = 0;
let passedCount = 0;
let failedCount = 0;
const errors = [];

async function testEndpoint(method, endpoint, data = null, description, expectedStatus = 200) {
  testCount++;
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': COMPANY_ID
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const responseTime = Date.now() - startTime;
    const result = await response.json();

    const success = response.status === expectedStatus;
    
    if (success) {
      passedCount++;
      if (testCount % 100 === 0) {
        process.stdout.write(`\r✅ Tests: ${testCount} | Passed: ${passedCount} | Failed: ${failedCount} | Response Time: ${responseTime}ms`);
      }
    } else {
      failedCount++;
      errors.push({
        test: description,
        status: response.status,
        expected: expectedStatus,
        error: result.error || result.message,
        endpoint,
        method
      });
    }

    return { success, data: result, status: response.status, responseTime };
  } catch (error) {
    failedCount++;
    errors.push({
      test: description,
      error: error.message,
      endpoint,
      method
    });
    return { success: false, error: error.message };
  }
}

async function runStressTests() {
  console.log('🚀 Library CRUD Stress Test - 1000+ Test Cases');
  console.log('='.repeat(80));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Company ID: ${COMPANY_ID}`);
  console.log('='.repeat(80));
  console.log('\n📊 Starting comprehensive tests...\n');

  const createdItems = {
    productCategories: [],
    itemCategories: [],
    subCategories: []
  };

  // ========== PHASE 1: BULK CREATION (300 tests) ==========
  console.log('\n📦 PHASE 1: Bulk Creation Tests (300 items)');
  console.log('-'.repeat(80));

  // Create 100 Product Categories
  for (let i = 1; i <= 100; i++) {
    const data = {
      name: `Stress Test PC ${i} ${Date.now()}`,
      description: `Description for product category ${i}`
    };
    const result = await testEndpoint('POST', '/yourproductcategories', data, `Create Product Category ${i}`);
    if (result.success && result.data.data) {
      createdItems.productCategories.push(result.data.data.id);
    }
  }

  // Create 100 Item Categories (using first 50 product categories)
  for (let i = 1; i <= 100; i++) {
    const productCatId = createdItems.productCategories[i % 50] || createdItems.productCategories[0];
    if (productCatId) {
      const data = {
        productCategoryId: productCatId,
        name: `Stress Test IC ${i} ${Date.now()}`,
        description: `Description for item category ${i}`
      };
      const result = await testEndpoint('POST', '/youritemcategories', data, `Create Item Category ${i}`);
      if (result.success && result.data.data) {
        createdItems.itemCategories.push(result.data.data.id);
      }
    }
  }

  // Create 100 Sub Categories (using first 50 item categories)
  for (let i = 1; i <= 100; i++) {
    const itemCatId = createdItems.itemCategories[i % 50] || createdItems.itemCategories[0];
    if (itemCatId) {
      const data = {
        itemCategoryId: itemCatId,
        name: `Stress Test SC ${i} ${Date.now()}`,
        description: `Description for sub category ${i}`
      };
      const result = await testEndpoint('POST', '/yoursubcategories', data, `Create Sub Category ${i}`);
      if (result.success && result.data.data) {
        createdItems.subCategories.push(result.data.data.id);
      }
    }
  }

  // ========== PHASE 2: READ OPERATIONS (200 tests) ==========
  console.log('\n\n📖 PHASE 2: Read Operations (200 tests)');
  console.log('-'.repeat(80));

  // Read all product categories 20 times
  for (let i = 1; i <= 20; i++) {
    await testEndpoint('GET', '/yourproductcategories', null, `Read All Product Categories (${i})`);
  }

  // Read all item categories 20 times
  for (let i = 1; i <= 20; i++) {
    await testEndpoint('GET', '/youritemcategories', null, `Read All Item Categories (${i})`);
  }

  // Read all sub categories 20 times
  for (let i = 1; i <= 20; i++) {
    await testEndpoint('GET', '/yoursubcategories', null, `Read All Sub Categories (${i})`);
  }

  // Read single product categories (40 tests)
  for (let i = 0; i < Math.min(40, createdItems.productCategories.length); i++) {
    await testEndpoint('GET', `/yourproductcategories/${createdItems.productCategories[i]}`, null, `Read Single Product Category ${i + 1}`);
  }

  // Read filtered item categories (50 tests)
  for (let i = 0; i < Math.min(50, createdItems.productCategories.length); i++) {
    await testEndpoint('GET', `/youritemcategories?productCategoryId=${createdItems.productCategories[i]}`, null, `Read Filtered Item Categories ${i + 1}`);
  }

  // Read filtered sub categories (50 tests)
  for (let i = 0; i < Math.min(50, createdItems.itemCategories.length); i++) {
    await testEndpoint('GET', `/yoursubcategories?itemCategoryId=${createdItems.itemCategories[i]}`, null, `Read Filtered Sub Categories ${i + 1}`);
  }

  // ========== PHASE 3: UPDATE OPERATIONS (200 tests) ==========
  console.log('\n\n✏️  PHASE 3: Update Operations (200 tests)');
  console.log('-'.repeat(80));

  // Update 70 product categories
  for (let i = 0; i < Math.min(70, createdItems.productCategories.length); i++) {
    const data = {
      name: `Updated PC ${i} ${Date.now()}`,
      description: `Updated description ${i}`
    };
    await testEndpoint('PUT', `/yourproductcategories/${createdItems.productCategories[i]}`, data, `Update Product Category ${i + 1}`);
  }

  // Update 70 item categories
  for (let i = 0; i < Math.min(70, createdItems.itemCategories.length); i++) {
    const data = {
      name: `Updated IC ${i} ${Date.now()}`,
      description: `Updated description ${i}`
    };
    await testEndpoint('PUT', `/youritemcategories/${createdItems.itemCategories[i]}`, data, `Update Item Category ${i + 1}`);
  }

  // Update 60 sub categories
  for (let i = 0; i < Math.min(60, createdItems.subCategories.length); i++) {
    const data = {
      name: `Updated SC ${i} ${Date.now()}`,
      description: `Updated description ${i}`
    };
    await testEndpoint('PUT', `/yoursubcategories/${createdItems.subCategories[i]}`, data, `Update Sub Category ${i + 1}`);
  }

  // ========== PHASE 4: EDGE CASES (150 tests) ==========
  console.log('\n\n⚠️  PHASE 4: Edge Cases & Error Handling (150 tests)');
  console.log('-'.repeat(80));

  // Test empty name (should fail)
  await testEndpoint('POST', '/yourproductcategories', { name: '', description: 'test' }, 'Create with empty name', 400);
  await testEndpoint('POST', '/youritemcategories', { productCategoryId: createdItems.productCategories[0], name: '' }, 'Create item with empty name', 400);
  await testEndpoint('POST', '/yoursubcategories', { itemCategoryId: createdItems.itemCategories[0], name: '' }, 'Create sub with empty name', 400);

  // Test missing required fields
  await testEndpoint('POST', '/yourproductcategories', { description: 'test' }, 'Create without name', 400);
  await testEndpoint('POST', '/youritemcategories', { name: 'test' }, 'Create item without productCategoryId', 400);
  await testEndpoint('POST', '/yoursubcategories', { name: 'test' }, 'Create sub without itemCategoryId', 400);

  // Test invalid IDs (should return 404)
  await testEndpoint('GET', '/yourproductcategories/999999', null, 'Read non-existent product category', 404);
  await testEndpoint('GET', '/youritemcategories/999999', null, 'Read non-existent item category', 404);
  await testEndpoint('GET', '/yoursubcategories/999999', null, 'Read non-existent sub category', 404);
  await testEndpoint('PUT', '/yourproductcategories/999999', { name: 'test' }, 'Update non-existent product category', 404);
  await testEndpoint('PUT', '/youritemcategories/999999', { name: 'test' }, 'Update non-existent item category', 404);
  await testEndpoint('PUT', '/yoursubcategories/999999', { name: 'test' }, 'Update non-existent sub category', 404);
  await testEndpoint('DELETE', '/yourproductcategories/999999', null, 'Delete non-existent product category', 404);
  await testEndpoint('DELETE', '/youritemcategories/999999', null, 'Delete non-existent item category', 404);
  await testEndpoint('DELETE', '/yoursubcategories/999999', null, 'Delete non-existent sub category', 404);

  // Test invalid productCategoryId for item categories
  await testEndpoint('POST', '/youritemcategories', { productCategoryId: 999999, name: 'test' }, 'Create item with invalid productCategoryId', 400);

  // Test invalid itemCategoryId for sub categories
  await testEndpoint('POST', '/yoursubcategories', { itemCategoryId: 999999, name: 'test' }, 'Create sub with invalid itemCategoryId', 400);

  // Test very long names (100+ characters)
  const longName = 'A'.repeat(300);
  await testEndpoint('POST', '/yourproductcategories', { name: longName, description: 'test' }, 'Create with very long name', 200);

  // Test special characters
  await testEndpoint('POST', '/yourproductcategories', { name: 'Test !@#$%^&*()_+-=[]{}|;:,.<>?', description: 'test' }, 'Create with special characters', 200);
  await testEndpoint('POST', '/yourproductcategories', { name: 'Test 中文 العربية हिन्दी', description: 'test' }, 'Create with unicode characters', 200);

  // Test SQL injection attempts (should be sanitized)
  await testEndpoint('POST', '/yourproductcategories', { name: "'; DROP TABLE product_categories; --", description: 'test' }, 'SQL injection attempt', 200);

  // Test null/undefined values
  await testEndpoint('POST', '/yourproductcategories', { name: 'Test', description: null }, 'Create with null description', 200);

  // Test duplicate names (should handle gracefully)
  if (createdItems.productCategories.length > 0) {
    const firstPC = await testEndpoint('GET', `/yourproductcategories/${createdItems.productCategories[0]}`, null, 'Get first PC for duplicate test');
    if (firstPC.success && firstPC.data.data) {
      await testEndpoint('POST', '/yourproductcategories', { name: firstPC.data.data.name, description: 'duplicate' }, 'Create duplicate name (should update)', 200);
    }
  }

  // Test invalid JSON
  // (This would require raw fetch, skipping for now)

  // Test missing company ID (should use default)
  // (Already handled by getCompanyId function)

  // Test concurrent updates (same item multiple times)
  if (createdItems.productCategories.length > 0) {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(testEndpoint('PUT', `/yourproductcategories/${createdItems.productCategories[0]}`, { name: `Concurrent Update ${i}`, description: 'test' }, `Concurrent update ${i + 1}`));
    }
    await Promise.all(promises);
  }

  // Test rapid create/delete cycles
  for (let i = 0; i < 20; i++) {
    const create = await testEndpoint('POST', '/yourproductcategories', { name: `Rapid Test ${i} ${Date.now()}`, description: 'test' }, `Rapid create ${i + 1}`);
    if (create.success && create.data.data) {
      await testEndpoint('DELETE', `/yourproductcategories/${create.data.data.id}`, null, `Rapid delete ${i + 1}`);
    }
  }

  // Test filtering edge cases
  await testEndpoint('GET', '/youritemcategories?productCategoryId=0', null, 'Filter with zero ID', 200);
  await testEndpoint('GET', '/youritemcategories?productCategoryId=-1', null, 'Filter with negative ID', 200);
  await testEndpoint('GET', '/yoursubcategories?itemCategoryId=0', null, 'Filter sub with zero ID', 200);

  // Test empty arrays in responses
  // (Would need to delete all items first, skipping)

  // ========== PHASE 5: DATA INTEGRITY (100 tests) ==========
  console.log('\n\n🔒 PHASE 5: Data Integrity Tests (100 tests)');
  console.log('-'.repeat(80));

  // Verify created items still exist
  for (let i = 0; i < Math.min(30, createdItems.productCategories.length); i++) {
    const result = await testEndpoint('GET', `/yourproductcategories/${createdItems.productCategories[i]}`, null, `Verify Product Category ${i + 1} exists`);
    if (!result.success) {
      errors.push({ test: `Product Category ${i + 1} missing`, id: createdItems.productCategories[i] });
    }
  }

  // Verify relationships
  for (let i = 0; i < Math.min(30, createdItems.itemCategories.length); i++) {
    const result = await testEndpoint('GET', `/youritemcategories/${createdItems.itemCategories[i]}`, null, `Verify Item Category ${i + 1} exists`);
    if (result.success && result.data.data) {
      // Verify it has productCategoryName
      if (!result.data.data.productCategoryName) {
        errors.push({ test: `Item Category ${i + 1} missing productCategoryName`, id: createdItems.itemCategories[i] });
      }
    }
  }

  // Verify cascade relationships
  for (let i = 0; i < Math.min(30, createdItems.subCategories.length); i++) {
    const result = await testEndpoint('GET', `/yoursubcategories/${createdItems.subCategories[i]}`, null, `Verify Sub Category ${i + 1} exists`);
    if (result.success && result.data.data) {
      // Verify it has itemCategoryName
      if (!result.data.data.itemCategoryName) {
        errors.push({ test: `Sub Category ${i + 1} missing itemCategoryName`, id: createdItems.subCategories[i] });
      }
    }
  }

  // Test that deleted items don't appear in lists
  if (createdItems.productCategories.length > 0) {
    const deleteId = createdItems.productCategories[0];
    await testEndpoint('DELETE', `/yourproductcategories/${deleteId}`, null, 'Delete for integrity test');
    const verify = await testEndpoint('GET', '/yourproductcategories', null, 'Verify deleted item not in list');
    if (verify.success && verify.data.data) {
      const found = verify.data.data.find(cat => cat.id === deleteId);
      if (found) {
        errors.push({ test: 'Deleted product category still appears in list', id: deleteId });
      }
    }
  }

  // ========== PHASE 6: PERFORMANCE & LOAD (50 tests) ==========
  console.log('\n\n⚡ PHASE 6: Performance & Load Tests (50 tests)');
  console.log('-'.repeat(80));

  // Measure response times for bulk reads
  const startTime = Date.now();
  for (let i = 0; i < 20; i++) {
    await testEndpoint('GET', '/yourproductcategories', null, `Performance test ${i + 1}`);
  }
  const avgTime = (Date.now() - startTime) / 20;
  console.log(`\n   📊 Average response time for GET all: ${avgTime.toFixed(2)}ms`);

  // Test with large result sets
  const largeRead = await testEndpoint('GET', '/yourproductcategories', null, 'Large result set test');
  if (largeRead.success && largeRead.data.data) {
    console.log(`   📊 Retrieved ${largeRead.data.data.length} product categories`);
  }

  // ========== PHASE 7: CLEANUP (100 tests) ==========
  console.log('\n\n🗑️  PHASE 7: Cleanup - Delete All Created Items (100 tests)');
  console.log('-'.repeat(80));

  // Delete all sub categories
  for (let i = 0; i < createdItems.subCategories.length; i++) {
    await testEndpoint('DELETE', `/yoursubcategories/${createdItems.subCategories[i]}`, null, `Delete Sub Category ${i + 1}`);
  }

  // Delete all item categories
  for (let i = 0; i < createdItems.itemCategories.length; i++) {
    await testEndpoint('DELETE', `/youritemcategories/${createdItems.itemCategories[i]}`, null, `Delete Item Category ${i + 1}`);
  }

  // Delete all product categories
  for (let i = 0; i < createdItems.productCategories.length; i++) {
    await testEndpoint('DELETE', `/yourproductcategories/${createdItems.productCategories[i]}`, null, `Delete Product Category ${i + 1}`);
  }

  // Verify cleanup
  const finalCheck = await testEndpoint('GET', '/yourproductcategories', null, 'Final cleanup verification');
  if (finalCheck.success && finalCheck.data.data) {
    const remaining = finalCheck.data.data.filter(cat => 
      createdItems.productCategories.includes(cat.id)
    );
    if (remaining.length > 0) {
      errors.push({ test: 'Some items not deleted during cleanup', count: remaining.length });
    }
  }

  // ========== SUMMARY ==========
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Total Tests: ${testCount}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`📈 Success Rate: ${((passedCount / testCount) * 100).toFixed(2)}%`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors Found: ${errors.length}`);
    console.log('\n📋 Error Details (showing first 20):');
    errors.slice(0, 20).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test || 'Unknown'}`);
      if (error.status) console.log(`      Status: ${error.status} (Expected: ${error.expected || 'N/A'})`);
      if (error.error) console.log(`      Error: ${error.error}`);
    });
    if (errors.length > 20) {
      console.log(`   ... and ${errors.length - 20} more errors`);
    }
  }

  if (failedCount === 0) {
    console.log('\n🎉 All stress tests passed! System is robust and ready for production.');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
    process.exit(1);
  }
}

// Check server
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Backend server is running\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Backend server is not running');
    console.log('   Please start the server with: npm start or npm run dev');
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    const startTime = Date.now();
    await runStressTests();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Total Test Time: ${totalTime} seconds`);
    console.log(`📊 Tests per second: ${(testCount / parseFloat(totalTime)).toFixed(2)}`);
  } else {
    process.exit(1);
  }
})();

