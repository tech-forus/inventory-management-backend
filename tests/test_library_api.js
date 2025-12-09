/**
 * Test script for Library API endpoints
 * Tests connection between Frontend, Backend, and Database
 * Uses Node.js built-in fetch (Node 18+)
 */

const API_BASE_URL = 'http://localhost:5000/api';
const TEST_COMPANY_ID = 'DEMO01';

// Test data
const testVendor = {
  name: 'Test Vendor ' + Date.now(),
  contactPerson: 'John Doe',
  email: 'test@vendor.com',
  phone: '1234567890',
  gstNumber: '29ABCDE1234F1Z5',
  address: '123 Test Street',
  city: 'Test City',
  state: 'Test State',
  pin: '123456'
};

const testBrand = {
  name: 'Test Brand ' + Date.now(),
  description: 'This is a test brand'
};

const testProductCategory = {
  name: 'Test Product Category ' + Date.now(),
  description: 'This is a test product category'
};

async function testEndpoint(method, endpoint, data = null, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   ${method} ${endpoint}`);

    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': TEST_COMPANY_ID
      }
    };

    if (data) {
      options.body = JSON.stringify({ ...data, companyId: TEST_COMPANY_ID });
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      if (result.data) {
        if (Array.isArray(result.data)) {
          console.log(`   📊 Returned ${result.data.length} items`);
        } else {
          console.log(`   📊 Data: ${JSON.stringify(result.data).substring(0, 100)}...`);
        }
      }
      return { success: true, data: result };
    } else {
      console.log(`   ❌ Failed (${response.status}): ${result.error || result.message}`);
      if (result.message) {
        console.log(`   📝 Details: ${result.message}`);
      }
      return { success: false, error: result };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Library API Tests');
  console.log('=' .repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Company ID: ${TEST_COMPANY_ID}`);
  console.log('=' .repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: GET all vendors
  const vendorsGet = await testEndpoint('GET', '/yourvendors', null, 'GET All Vendors');
  results.tests.push({ name: 'GET All Vendors', ...vendorsGet });
  if (vendorsGet.success) results.passed++; else results.failed++;

  // Test 2: POST create vendor
  const vendorPost = await testEndpoint('POST', '/yourvendors', testVendor, 'POST Create Vendor');
  results.tests.push({ name: 'POST Create Vendor', ...vendorPost });
  if (vendorPost.success) results.passed++; else results.failed++;

  // Test 3: GET all vendors again (should have one more)
  const vendorsGet2 = await testEndpoint('GET', '/yourvendors', null, 'GET All Vendors (After Create)');
  results.tests.push({ name: 'GET All Vendors (After Create)', ...vendorsGet2 });
  if (vendorsGet2.success) results.passed++; else results.failed++;

  // Test 4: GET all brands
  const brandsGet = await testEndpoint('GET', '/yourbrands', null, 'GET All Brands');
  results.tests.push({ name: 'GET All Brands', ...brandsGet });
  if (brandsGet.success) results.passed++; else results.failed++;

  // Test 5: POST create brand
  const brandPost = await testEndpoint('POST', '/yourbrands', testBrand, 'POST Create Brand');
  results.tests.push({ name: 'POST Create Brand', ...brandPost });
  if (brandPost.success) results.passed++; else results.failed++;

  // Test 6: GET all brands again
  const brandsGet2 = await testEndpoint('GET', '/yourbrands', null, 'GET All Brands (After Create)');
  results.tests.push({ name: 'GET All Brands (After Create)', ...brandsGet2 });
  if (brandsGet2.success) results.passed++; else results.failed++;

  // Test 7: GET all product categories
  const productCatsGet = await testEndpoint('GET', '/yourproductcategories', null, 'GET All Product Categories');
  results.tests.push({ name: 'GET All Product Categories', ...productCatsGet });
  if (productCatsGet.success) results.passed++; else results.failed++;

  // Test 8: POST create product category
  const productCatPost = await testEndpoint('POST', '/yourproductcategories', testProductCategory, 'POST Create Product Category');
  results.tests.push({ name: 'POST Create Product Category', ...productCatPost });
  if (productCatPost.success) results.passed++; else results.failed++;

  // Test 9: GET all item categories
  const itemCatsGet = await testEndpoint('GET', '/youritemcategories', null, 'GET All Item Categories');
  results.tests.push({ name: 'GET All Item Categories', ...itemCatsGet });
  if (itemCatsGet.success) results.passed++; else results.failed++;

  // Test 10: GET all sub categories
  const subCatsGet = await testEndpoint('GET', '/yoursubcategories', null, 'GET All Sub Categories');
  results.tests.push({ name: 'GET All Sub Categories', ...subCatsGet });
  if (subCatsGet.success) results.passed++; else results.failed++;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total:  ${results.passed + results.failed}`);
  console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.success ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${test.name}`);
  });

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Frontend-Backend-Database connection is working correctly.');
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

