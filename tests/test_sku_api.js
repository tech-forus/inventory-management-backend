/**
 * Test script for SKU API endpoints
 * Tests GET, POST operations for SKUs
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
            console.log(`   📝 Sample fields:`);
            console.log(`      - skuId: ${first.skuId || '❌ MISSING'}`);
            console.log(`      - productCategory: ${first.productCategory || '❌ MISSING'}`);
            console.log(`      - itemCategory: ${first.itemCategory || '❌ MISSING'}`);
            console.log(`      - itemName: ${first.itemName || '❌ MISSING'}`);
            console.log(`      - hsnSacCode: ${first.hsnSacCode || '❌ MISSING'}`);
            console.log(`      - currentStock: ${first.currentStock !== undefined ? first.currentStock : '❌ MISSING'}`);
          }
        } else {
          console.log(`   📝 Data fields:`);
          console.log(`      - skuId: ${result.data.skuId || '❌ MISSING'}`);
          console.log(`      - productCategory: ${result.data.productCategory || '❌ MISSING'}`);
          console.log(`      - itemCategory: ${result.data.itemCategory || '❌ MISSING'}`);
          console.log(`      - itemName: ${result.data.itemName || '❌ MISSING'}`);
          console.log(`      - hsnSacCode: ${result.data.hsnSacCode || '❌ MISSING'}`);
          console.log(`      - currentStock: ${result.data.currentStock !== undefined ? result.data.currentStock : '❌ MISSING'}`);
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
  console.log('🚀 Starting SKU API Tests');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test GET SKUs
  console.log('\n📦 GET SKUs TEST');
  console.log('-'.repeat(60));
  const getSkus = await testEndpoint('GET', '/skus?page=1&limit=10', null, 'GET All SKUs');
  results.tests.push({ name: 'GET All SKUs', ...getSkus });
  if (getSkus.success) results.passed++; else results.failed++;

  // Get required IDs for creating a SKU
  let productCategoryId = null;
  let itemCategoryId = null;
  let brandId = null;
  let vendorId = null;

  // Get product categories
  const productCatsRes = await fetch(`${API_BASE_URL}/yourproductcategories`, {
    headers: { 'x-company-id': 'DEMO01' }
  });
  const productCats = await productCatsRes.json();
  if (productCats.success && productCats.data && productCats.data.length > 0) {
    productCategoryId = productCats.data[0].id;
  }

  // Get item categories
  if (productCategoryId) {
    const itemCatsRes = await fetch(`${API_BASE_URL}/youritemcategories?productCategoryId=${productCategoryId}`, {
      headers: { 'x-company-id': 'DEMO01' }
    });
    const itemCats = await itemCatsRes.json();
    if (itemCats.success && itemCats.data && itemCats.data.length > 0) {
      itemCategoryId = itemCats.data[0].id;
    }
  }

  // Get brands
  const brandsRes = await fetch(`${API_BASE_URL}/yourbrands`, {
    headers: { 'x-company-id': 'DEMO01' }
  });
  const brands = await brandsRes.json();
  if (brands.success && brands.data && brands.data.length > 0) {
    brandId = brands.data[0].id;
  }

  // Get vendors
  const vendorsRes = await fetch(`${API_BASE_URL}/yourvendors`, {
    headers: { 'x-company-id': 'DEMO01' }
  });
  const vendors = await vendorsRes.json();
  if (vendors.success && vendors.data && vendors.data.length > 0) {
    vendorId = vendors.data[0].id;
  }

  // Test POST SKU
  if (productCategoryId && itemCategoryId && brandId && vendorId) {
    console.log('\n📦 POST SKU TEST');
    console.log('-'.repeat(60));
    const skuData = {
      productCategoryId,
      itemCategoryId,
      itemName: 'Test SKU ' + Date.now(),
      vendorId,
      brandId,
      hsnSacCode: '12345678',
      unit: 'Pieces',
      minStockLevel: 10,
      autoGenerateSKU: true
    };
    const postSku = await testEndpoint('POST', '/skus', skuData, 'POST Create SKU');
    results.tests.push({ name: 'POST Create SKU', ...postSku });
    if (postSku.success) results.passed++; else results.failed++;

    // Test GET SKUs after create
    if (postSku.success) {
      const getSkus2 = await testEndpoint('GET', '/skus?page=1&limit=10', null, 'GET All SKUs (After Create)');
      results.tests.push({ name: 'GET All SKUs (After Create)', ...getSkus2 });
      if (getSkus2.success) results.passed++; else results.failed++;
    }
  } else {
    console.log('\n⚠️  Skipping POST SKU test (missing required data)');
    console.log(`   Product Category ID: ${productCategoryId || '❌'}`);
    console.log(`   Item Category ID: ${itemCategoryId || '❌'}`);
    console.log(`   Brand ID: ${brandId || '❌'}`);
    console.log(`   Vendor ID: ${vendorId || '❌'}`);
    results.failed++;
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
    console.log('\n🎉 All tests passed! SKU API is working correctly.');
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

