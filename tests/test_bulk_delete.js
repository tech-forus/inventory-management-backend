/**
 * Test script for bulk delete operations in Library API
 */

const API_BASE_URL = 'http://localhost:5000/api';

async function testBulkDelete(endpoint, ids, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   POST ${endpoint}`);
    console.log(`   IDs: [${ids.join(', ')}]`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify({ ids })
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   📝 Message: ${result.message}`);
      console.log(`   🗑️  Deleted Count: ${result.deletedCount}`);
      return { success: true, data: result };
    } else {
      console.log(`   ❌ Failed (${response.status}): ${result.error || result.message}`);
      return { success: false, error: result };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createTestItems() {
  const items = {
    productCategories: [],
    itemCategories: [],
    subCategories: []
  };

  // Create 3 product categories
  for (let i = 0; i < 3; i++) {
    const data = {
      name: `Test Product Cat Bulk ${Date.now()}-${i}`,
      description: 'Test description'
    };
    const res = await fetch(`${API_BASE_URL}/yourproductcategories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      items.productCategories.push(result.data.id);
    }
  }

  // Create 3 item categories (if we have product categories)
  if (items.productCategories.length > 0) {
    for (let i = 0; i < 3; i++) {
      const data = {
        productCategoryId: items.productCategories[0],
        name: `Test Item Cat Bulk ${Date.now()}-${i}`,
        description: 'Test description'
      };
      const res = await fetch(`${API_BASE_URL}/youritemcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': 'DEMO01'
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        items.itemCategories.push(result.data.id);
      }
    }
  }

  // Create 3 sub categories (if we have item categories)
  if (items.itemCategories.length > 0) {
    for (let i = 0; i < 3; i++) {
      const data = {
        itemCategoryId: items.itemCategories[0],
        name: `Test Sub Cat Bulk ${Date.now()}-${i}`,
        description: 'Test description'
      };
      const res = await fetch(`${API_BASE_URL}/yoursubcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': 'DEMO01'
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        items.subCategories.push(result.data.id);
      }
    }
  }

  return items;
}

async function runTests() {
  console.log('🚀 Starting Bulk Delete Tests for Library');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Create test items
  console.log('\n📦 Creating test items for bulk delete...');
  const testItems = await createTestItems();
  console.log(`   Created ${testItems.productCategories.length} product categories`);
  console.log(`   Created ${testItems.itemCategories.length} item categories`);
  console.log(`   Created ${testItems.subCategories.length} sub categories`);

  // Test bulk delete for product categories
  if (testItems.productCategories.length >= 2) {
    const idsToDelete = testItems.productCategories.slice(0, 2);
    const test = await testBulkDelete(
      '/yourproductcategories/bulk-delete',
      idsToDelete,
      'Bulk Delete Product Categories'
    );
    results.tests.push({ name: 'Bulk Delete Product Categories', ...test });
    if (test.success) results.passed++; else results.failed++;
  }

  // Test bulk delete for item categories
  if (testItems.itemCategories.length >= 2) {
    const idsToDelete = testItems.itemCategories.slice(0, 2);
    const test = await testBulkDelete(
      '/youritemcategories/bulk-delete',
      idsToDelete,
      'Bulk Delete Item Categories'
    );
    results.tests.push({ name: 'Bulk Delete Item Categories', ...test });
    if (test.success) results.passed++; else results.failed++;
  }

  // Test bulk delete for sub categories
  if (testItems.subCategories.length >= 2) {
    const idsToDelete = testItems.subCategories.slice(0, 2);
    const test = await testBulkDelete(
      '/yoursubcategories/bulk-delete',
      idsToDelete,
      'Bulk Delete Sub Categories'
    );
    results.tests.push({ name: 'Bulk Delete Sub Categories', ...test });
    if (test.success) results.passed++; else results.failed++;
  }

  // Test with empty array
  const testEmpty = await testBulkDelete(
    '/yourproductcategories/bulk-delete',
    [],
    'Bulk Delete with Empty Array (should fail)'
  );
  results.tests.push({ name: 'Bulk Delete with Empty Array', ...testEmpty });
  if (!testEmpty.success) {
    results.passed++;
    console.log('   ✅ Correctly rejected empty array');
  } else {
    results.failed++;
  }

  // Test with invalid data
  try {
    const response = await fetch(`${API_BASE_URL}/yourproductcategories/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify({ ids: 'invalid' })
    });
    const result = await response.json();
    if (!response.ok) {
      results.passed++;
      console.log('   ✅ Correctly rejected invalid data');
    } else {
      results.failed++;
    }
  } catch (error) {
    results.passed++;
    console.log('   ✅ Correctly rejected invalid data');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total:  ${results.passed + results.failed}`);
  if (results.passed + results.failed > 0) {
    console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  }

  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.success ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${test.name}`);
  });

  if (results.failed === 0) {
    console.log('\n🎉 All bulk delete tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Backend server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Backend server is not running or not accessible');
    console.log('   Please start the server with: npm start or npm run dev');
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
})();

