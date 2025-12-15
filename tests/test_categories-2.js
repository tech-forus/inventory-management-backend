/**
 * Test script for Categories API endpoints
 * Tests Product Categories, Item Categories, and Sub Categories
 */

const API_BASE_URL = 'http://localhost:5000/api';

async function testEndpoint(method, endpoint, data = null, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   ${method} ${endpoint}`);

    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      if (result.data) {
        if (Array.isArray(result.data)) {
          console.log(`   📊 Returned ${result.data.length} items`);
          if (result.data.length > 0) {
            const first = result.data[0];
            console.log(`   📝 Sample: ${JSON.stringify(first).substring(0, 150)}...`);
          }
        } else {
          console.log(`   📝 Data: ${JSON.stringify(result.data).substring(0, 150)}...`);
        }
      }
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

async function runTests() {
  console.log('🚀 Starting Categories API Tests');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test Product Categories
  console.log('\n📦 PRODUCT CATEGORIES TESTS');
  console.log('-'.repeat(60));

  const productCatGet = await testEndpoint('GET', '/yourproductcategories', null, 'GET All Product Categories');
  results.tests.push({ name: 'GET All Product Categories', ...productCatGet });
  if (productCatGet.success) results.passed++; else results.failed++;

  const productCatData = {
    name: 'Test Product Category ' + Date.now(),
    description: 'This is a test product category'
  };
  const productCatPost = await testEndpoint('POST', '/yourproductcategories', productCatData, 'POST Create Product Category');
  results.tests.push({ name: 'POST Create Product Category', ...productCatPost });
  if (productCatPost.success) results.passed++; else results.failed++;

  const productCatGet2 = await testEndpoint('GET', '/yourproductcategories', null, 'GET All Product Categories (After Create)');
  results.tests.push({ name: 'GET All Product Categories (After Create)', ...productCatGet2 });
  if (productCatGet2.success) results.passed++; else results.failed++;

  // Test Item Categories
  console.log('\n📦 ITEM CATEGORIES TESTS');
  console.log('-'.repeat(60));

  const itemCatGet = await testEndpoint('GET', '/youritemcategories', null, 'GET All Item Categories');
  results.tests.push({ name: 'GET All Item Categories', ...itemCatGet });
  if (itemCatGet.success) results.passed++; else results.failed++;

  // Get a product category ID for item category
  let productCategoryId = null;
  if (productCatGet2.success && productCatGet2.data.data && productCatGet2.data.data.length > 0) {
    productCategoryId = productCatGet2.data.data[0].id;
  } else if (productCatGet.success && productCatGet.data.data && productCatGet.data.data.length > 0) {
    productCategoryId = productCatGet.data.data[0].id;
  }

  if (productCategoryId) {
    const itemCatData = {
      productCategoryId: productCategoryId,
      name: 'Test Item Category ' + Date.now(),
      description: 'This is a test item category'
    };
    const itemCatPost = await testEndpoint('POST', '/youritemcategories', itemCatData, 'POST Create Item Category');
    results.tests.push({ name: 'POST Create Item Category', ...itemCatPost });
    if (itemCatPost.success) results.passed++; else results.failed++;
  } else {
    console.log('   ⚠️  Skipping POST Item Category (no product category available)');
    results.failed++;
  }

  const itemCatGet2 = await testEndpoint('GET', '/youritemcategories', null, 'GET All Item Categories (After Create)');
  results.tests.push({ name: 'GET All Item Categories (After Create)', ...itemCatGet2 });
  if (itemCatGet2.success) results.passed++; else results.failed++;

  // Test Sub Categories
  console.log('\n📦 SUB CATEGORIES TESTS');
  console.log('-'.repeat(60));

  const subCatGet = await testEndpoint('GET', '/yoursubcategories', null, 'GET All Sub Categories');
  results.tests.push({ name: 'GET All Sub Categories', ...subCatGet });
  if (subCatGet.success) results.passed++; else results.failed++;

  // Get an item category ID for sub category
  let itemCategoryId = null;
  if (itemCatGet2.success && itemCatGet2.data.data && itemCatGet2.data.data.length > 0) {
    itemCategoryId = itemCatGet2.data.data[0].id;
  } else if (itemCatGet.success && itemCatGet.data.data && itemCatGet.data.data.length > 0) {
    itemCategoryId = itemCatGet.data.data[0].id;
  }

  if (itemCategoryId) {
    const subCatData = {
      itemCategoryId: itemCategoryId,
      name: 'Test Sub Category ' + Date.now(),
      description: 'This is a test sub category'
    };
    const subCatPost = await testEndpoint('POST', '/yoursubcategories', subCatData, 'POST Create Sub Category');
    results.tests.push({ name: 'POST Create Sub Category', ...subCatPost });
    if (subCatPost.success) results.passed++; else results.failed++;
  } else {
    console.log('   ⚠️  Skipping POST Sub Category (no item category available)');
    results.failed++;
  }

  const subCatGet2 = await testEndpoint('GET', '/yoursubcategories', null, 'GET All Sub Categories (After Create)');
  results.tests.push({ name: 'GET All Sub Categories (After Create)', ...subCatGet2 });
  if (subCatGet2.success) results.passed++; else results.failed++;

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
    console.log('\n🎉 All tests passed! Categories are working correctly.');
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

