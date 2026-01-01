/**
 * Test script for CRUD operations in Library API
 * Tests CREATE, READ, UPDATE, DELETE for all library items
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
        } else {
          console.log(`   📝 ID: ${result.data.id}, Name: ${result.data.name || result.data.itemName || 'N/A'}`);
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
  console.log('🚀 Starting CRUD Tests for Library');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const createdItems = {
    productCategoryId: null,
    itemCategoryId: null,
    subCategoryId: null,
    vendorId: null,
    brandId: null,
  };

  // ========== PRODUCT CATEGORIES ==========
  console.log('\n📦 PRODUCT CATEGORIES CRUD');
  console.log('-'.repeat(60));

  // CREATE
  const productCatData = {
    name: 'Test Product Cat CRUD ' + Date.now(),
    description: 'Test description'
  };
  const createPC = await testEndpoint('POST', '/yourproductcategories', productCatData, 'CREATE Product Category');
  results.tests.push({ name: 'CREATE Product Category', ...createPC });
  if (createPC.success) {
    results.passed++;
    createdItems.productCategoryId = createPC.data.data.id;
  } else {
    results.failed++;
  }

  // READ
  const getPC = await testEndpoint('GET', '/yourproductcategories', null, 'READ All Product Categories');
  results.tests.push({ name: 'READ All Product Categories', ...getPC });
  if (getPC.success) results.passed++; else results.failed++;

  // UPDATE
  if (createdItems.productCategoryId) {
    const updatePCData = {
      name: 'Updated Product Cat ' + Date.now(),
      description: 'Updated description'
    };
    const updatePC = await testEndpoint('PUT', `/yourproductcategories/${createdItems.productCategoryId}`, updatePCData, 'UPDATE Product Category');
    results.tests.push({ name: 'UPDATE Product Category', ...updatePC });
    if (updatePC.success) results.passed++; else results.failed++;
  }

  // ========== ITEM CATEGORIES ==========
  console.log('\n📦 ITEM CATEGORIES CRUD');
  console.log('-'.repeat(60));

  if (createdItems.productCategoryId) {
    // CREATE
    const itemCatData = {
      productCategoryId: createdItems.productCategoryId,
      name: 'Test Item Cat CRUD ' + Date.now(),
      description: 'Test description'
    };
    const createIC = await testEndpoint('POST', '/youritemcategories', itemCatData, 'CREATE Item Category');
    results.tests.push({ name: 'CREATE Item Category', ...createIC });
    if (createIC.success) {
      results.passed++;
      createdItems.itemCategoryId = createIC.data.data.id;
    } else {
      results.failed++;
    }

    // READ
    const getIC = await testEndpoint('GET', '/youritemcategories', null, 'READ All Item Categories');
    results.tests.push({ name: 'READ All Item Categories', ...getIC });
    if (getIC.success) results.passed++; else results.failed++;

    // UPDATE
    if (createdItems.itemCategoryId) {
      const updateICData = {
        name: 'Updated Item Cat ' + Date.now(),
        description: 'Updated description'
      };
      const updateIC = await testEndpoint('PUT', `/youritemcategories/${createdItems.itemCategoryId}`, updateICData, 'UPDATE Item Category');
      results.tests.push({ name: 'UPDATE Item Category', ...updateIC });
      if (updateIC.success) results.passed++; else results.failed++;
    }
  }

  // ========== SUB CATEGORIES ==========
  console.log('\n📦 SUB CATEGORIES CRUD');
  console.log('-'.repeat(60));

  if (createdItems.itemCategoryId) {
    // CREATE
    const subCatData = {
      itemCategoryId: createdItems.itemCategoryId,
      name: 'Test Sub Cat CRUD ' + Date.now(),
      description: 'Test description'
    };
    const createSC = await testEndpoint('POST', '/yoursubcategories', subCatData, 'CREATE Sub Category');
    results.tests.push({ name: 'CREATE Sub Category', ...createSC });
    if (createSC.success) {
      results.passed++;
      createdItems.subCategoryId = createSC.data.data.id;
    } else {
      results.failed++;
    }

    // READ
    const getSC = await testEndpoint('GET', '/yoursubcategories', null, 'READ All Sub Categories');
    results.tests.push({ name: 'READ All Sub Categories', ...getSC });
    if (getSC.success) results.passed++; else results.failed++;

    // UPDATE
    if (createdItems.subCategoryId) {
      const updateSCData = {
        name: 'Updated Sub Cat ' + Date.now(),
        description: 'Updated description'
      };
      const updateSC = await testEndpoint('PUT', `/yoursubcategories/${createdItems.subCategoryId}`, updateSCData, 'UPDATE Sub Category');
      results.tests.push({ name: 'UPDATE Sub Category', ...updateSC });
      if (updateSC.success) results.passed++; else results.failed++;
    }
  }

  // ========== VENDORS ==========
  console.log('\n📦 VENDORS CRUD');
  console.log('-'.repeat(60));

  // CREATE
  const vendorData = {
    name: 'Test Vendor CRUD ' + Date.now(),
    contactPerson: 'John Doe',
    email: 'john@test.com',
    phone: '9876543210',
    gstNumber: '29TEST1234F1Z5',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    pin: '123456',
    isActive: true
  };
  const createV = await testEndpoint('POST', '/yourvendors', vendorData, 'CREATE Vendor');
  results.tests.push({ name: 'CREATE Vendor', ...createV });
  if (createV.success) {
    results.passed++;
    createdItems.vendorId = createV.data.data.id;
  } else {
    results.failed++;
  }

  // READ
  const getV = await testEndpoint('GET', '/yourvendors', null, 'READ All Vendors');
  results.tests.push({ name: 'READ All Vendors', ...getV });
  if (getV.success) results.passed++; else results.failed++;

  // UPDATE
  if (createdItems.vendorId) {
    const updateVData = {
      name: 'Updated Vendor ' + Date.now(),
      contactPerson: 'Jane Doe',
      email: 'jane@test.com',
      phone: '9876543211',
      gstNumber: '29TEST1234F1Z6',
      isActive: true
    };
    const updateV = await testEndpoint('PUT', `/yourvendors/${createdItems.vendorId}`, updateVData, 'UPDATE Vendor');
    results.tests.push({ name: 'UPDATE Vendor', ...updateV });
    if (updateV.success) results.passed++; else results.failed++;
  }

  // ========== BRANDS ==========
  console.log('\n📦 BRANDS CRUD');
  console.log('-'.repeat(60));

  // CREATE
  const brandData = {
    name: 'Test Brand CRUD ' + Date.now(),
    description: 'Test brand description',
    isActive: true
  };
  const createB = await testEndpoint('POST', '/yourbrands', brandData, 'CREATE Brand');
  results.tests.push({ name: 'CREATE Brand', ...createB });
  if (createB.success) {
    results.passed++;
    createdItems.brandId = createB.data.data.id;
  } else {
    results.failed++;
  }

  // READ
  const getB = await testEndpoint('GET', '/yourbrands', null, 'READ All Brands');
  results.tests.push({ name: 'READ All Brands', ...getB });
  if (getB.success) results.passed++; else results.failed++;

  // UPDATE
  if (createdItems.brandId) {
    const updateBData = {
      name: 'Updated Brand ' + Date.now(),
      description: 'Updated brand description',
      isActive: true
    };
    const updateB = await testEndpoint('PUT', `/yourbrands/${createdItems.brandId}`, updateBData, 'UPDATE Brand');
    results.tests.push({ name: 'UPDATE Brand', ...updateB });
    if (updateB.success) results.passed++; else results.failed++;
  }

  // ========== DELETE OPERATIONS ==========
  console.log('\n🗑️  DELETE OPERATIONS');
  console.log('-'.repeat(60));

  if (createdItems.subCategoryId) {
    const delSC = await testEndpoint('DELETE', `/yoursubcategories/${createdItems.subCategoryId}`, null, 'DELETE Sub Category');
    results.tests.push({ name: 'DELETE Sub Category', ...delSC });
    if (delSC.success) results.passed++; else results.failed++;
  }

  if (createdItems.itemCategoryId) {
    const delIC = await testEndpoint('DELETE', `/youritemcategories/${createdItems.itemCategoryId}`, null, 'DELETE Item Category');
    results.tests.push({ name: 'DELETE Item Category', ...delIC });
    if (delIC.success) results.passed++; else results.failed++;
  }

  if (createdItems.productCategoryId) {
    const delPC = await testEndpoint('DELETE', `/yourproductcategories/${createdItems.productCategoryId}`, null, 'DELETE Product Category');
    results.tests.push({ name: 'DELETE Product Category', ...delPC });
    if (delPC.success) results.passed++; else results.failed++;
  }

  if (createdItems.vendorId) {
    const delV = await testEndpoint('DELETE', `/yourvendors/${createdItems.vendorId}`, null, 'DELETE Vendor');
    results.tests.push({ name: 'DELETE Vendor', ...delV });
    if (delV.success) results.passed++; else results.failed++;
  }

  if (createdItems.brandId) {
    const delB = await testEndpoint('DELETE', `/yourbrands/${createdItems.brandId}`, null, 'DELETE Brand');
    results.tests.push({ name: 'DELETE Brand', ...delB });
    if (delB.success) results.passed++; else results.failed++;
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
    console.log('\n🎉 All CRUD tests passed! Library operations are working correctly.');
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

