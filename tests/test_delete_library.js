/**
 * Test script for DELETE operations in Library API
 */

const API_BASE_URL = 'http://localhost:5000/api';

async function testDeleteEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   DELETE ${endpoint}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   📝 Message: ${result.message || 'Deleted successfully'}`);
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
  console.log('🚀 Starting DELETE API Tests for Library');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // First, create test items to delete
  console.log('\n📦 Creating test items for deletion...');
  
  // Create a test vendor
  const vendorData = {
    name: 'Test Vendor for Delete ' + Date.now(),
    contactPerson: 'Test Person',
    email: 'test@vendor.com',
    phone: '1234567890',
    gstNumber: '29TEST1234F1Z5',
    isActive: true
  };
  
  const createVendorRes = await fetch(`${API_BASE_URL}/yourvendors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-company-id': 'DEMO01'
    },
    body: JSON.stringify(vendorData)
  });
  const vendorResult = await createVendorRes.json();
  const vendorId = vendorResult.data?.id;

  // Create a test brand
  const brandData = {
    name: 'Test Brand for Delete ' + Date.now(),
    description: 'Test brand',
    isActive: true
  };
  
  const createBrandRes = await fetch(`${API_BASE_URL}/yourbrands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-company-id': 'DEMO01'
    },
    body: JSON.stringify(brandData)
  });
  const brandResult = await createBrandRes.json();
  const brandId = brandResult.data?.id;

  // Create a test product category
  const productCatData = {
    name: 'Test Product Cat for Delete ' + Date.now(),
    description: 'Test category'
  };
  
  const createProductCatRes = await fetch(`${API_BASE_URL}/yourproductcategories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-company-id': 'DEMO01'
    },
    body: JSON.stringify(productCatData)
  });
  const productCatResult = await createProductCatRes.json();
  const productCatId = productCatResult.data?.id;

  // Create a test item category (if product category was created)
  let itemCatId = null;
  if (productCatId) {
    const itemCatData = {
      productCategoryId: productCatId,
      name: 'Test Item Cat for Delete ' + Date.now(),
      description: 'Test item category'
    };
    
    const createItemCatRes = await fetch(`${API_BASE_URL}/youritemcategories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify(itemCatData)
    });
    const itemCatResult = await createItemCatRes.json();
    itemCatId = itemCatResult.data?.id;
  }

  // Create a test sub category (if item category was created)
  let subCatId = null;
  if (itemCatId) {
    const subCatData = {
      itemCategoryId: itemCatId,
      name: 'Test Sub Cat for Delete ' + Date.now(),
      description: 'Test sub category'
    };
    
    const createSubCatRes = await fetch(`${API_BASE_URL}/yoursubcategories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify(subCatData)
    });
    const subCatResult = await createSubCatRes.json();
    subCatId = subCatResult.data?.id;
  }

  // Now test DELETE operations
  console.log('\n🗑️  Testing DELETE Operations');
  console.log('-'.repeat(60));

  if (vendorId) {
    const test = await testDeleteEndpoint(`/yourvendors/${vendorId}`, 'DELETE Vendor');
    results.tests.push({ name: 'DELETE Vendor', ...test });
    if (test.success) results.passed++; else results.failed++;
  } else {
    console.log('   ⚠️  Skipping DELETE Vendor test (failed to create test vendor)');
    results.failed++;
  }

  if (brandId) {
    const test = await testDeleteEndpoint(`/yourbrands/${brandId}`, 'DELETE Brand');
    results.tests.push({ name: 'DELETE Brand', ...test });
    if (test.success) results.passed++; else results.failed++;
  } else {
    console.log('   ⚠️  Skipping DELETE Brand test (failed to create test brand)');
    results.failed++;
  }

  if (subCatId) {
    const test = await testDeleteEndpoint(`/yoursubcategories/${subCatId}`, 'DELETE Sub Category');
    results.tests.push({ name: 'DELETE Sub Category', ...test });
    if (test.success) results.passed++; else results.failed++;
  } else {
    console.log('   ⚠️  Skipping DELETE Sub Category test (failed to create test sub category)');
    results.failed++;
  }

  if (itemCatId) {
    const test = await testDeleteEndpoint(`/youritemcategories/${itemCatId}`, 'DELETE Item Category');
    results.tests.push({ name: 'DELETE Item Category', ...test });
    if (test.success) results.passed++; else results.failed++;
  } else {
    console.log('   ⚠️  Skipping DELETE Item Category test (failed to create test item category)');
    results.failed++;
  }

  if (productCatId) {
    const test = await testDeleteEndpoint(`/yourproductcategories/${productCatId}`, 'DELETE Product Category');
    results.tests.push({ name: 'DELETE Product Category', ...test });
    if (test.success) results.passed++; else results.failed++;
  } else {
    console.log('   ⚠️  Skipping DELETE Product Category test (failed to create test product category)');
    results.failed++;
  }

  // Test deleting non-existent item
  const test404 = await testDeleteEndpoint('/yourvendors/99999', 'DELETE Non-existent Vendor (404 test)');
  results.tests.push({ name: 'DELETE Non-existent Vendor (404)', ...test404 });
  if (!test404.success && test404.error?.error === 'Vendor not found') {
    results.passed++;
    console.log('   ✅ Correctly returned 404 for non-existent vendor');
  } else {
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
    console.log('\n🎉 All DELETE tests passed! Library delete functionality is working correctly.');
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

