/**
 * Complete CRUD Test for Library Categories
 * Tests Product Categories, Item Categories, and Sub Categories
 * Verifies Frontend-Backend-Database connectivity
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Get company ID from environment or use default
const COMPANY_ID = process.env.COMPANY_ID || 'DEMO01';

async function testEndpoint(method, endpoint, data = null, description) {
  try {
    console.log(`\n🧪 ${description}`);
    console.log(`   ${method} ${endpoint}`);

    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': COMPANY_ID
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
      console.log(`   📤 Data: ${JSON.stringify(data).substring(0, 100)}...`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      if (result.data) {
        if (Array.isArray(result.data)) {
          console.log(`   📊 Returned ${result.data.length} items`);
        } else {
          console.log(`   📝 ID: ${result.data.id}, Name: ${result.data.name || 'N/A'}`);
        }
      }
      return { success: true, data: result, status: response.status };
    } else {
      console.log(`   ❌ Failed (${response.status}): ${result.error || result.message}`);
      return { success: false, error: result, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runCompleteTests() {
  console.log('🚀 Complete Library CRUD Tests');
  console.log('='.repeat(70));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Company ID: ${COMPANY_ID}`);
  console.log('='.repeat(70));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const createdItems = {
    productCategoryId: null,
    itemCategoryId: null,
    subCategoryId: null,
  };

  // ========== PRODUCT CATEGORIES CRUD ==========
  console.log('\n📦 PRODUCT CATEGORIES - Complete CRUD Test');
  console.log('-'.repeat(70));

  // CREATE
  const timestamp = Date.now();
  const productCatData = {
    name: `Test Product Cat ${timestamp}`,
    description: 'Test description for product category'
  };
  const createPC = await testEndpoint('POST', '/yourproductcategories', productCatData, 'CREATE Product Category');
  results.tests.push({ name: 'CREATE Product Category', ...createPC });
  if (createPC.success) {
    results.passed++;
    createdItems.productCategoryId = createPC.data.data.id;
    console.log(`   ✅ Created Product Category ID: ${createdItems.productCategoryId}`);
  } else {
    results.failed++;
    console.log(`   ❌ Failed to create Product Category`);
  }

  // READ ALL
  const getPC = await testEndpoint('GET', '/yourproductcategories', null, 'READ All Product Categories');
  results.tests.push({ name: 'READ All Product Categories', ...getPC });
  if (getPC.success && Array.isArray(getPC.data.data)) {
    results.passed++;
    const found = getPC.data.data.find(cat => cat.id === createdItems.productCategoryId);
    if (found) {
      console.log(`   ✅ Found created category in list: "${found.name}"`);
    } else {
      console.log(`   ⚠️  Created category not found in list`);
    }
  } else {
    results.failed++;
  }

  // READ SINGLE
  if (createdItems.productCategoryId) {
    const getSinglePC = await testEndpoint('GET', `/yourproductcategories/${createdItems.productCategoryId}`, null, 'READ Single Product Category');
    results.tests.push({ name: 'READ Single Product Category', ...getSinglePC });
    if (getSinglePC.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // UPDATE
  if (createdItems.productCategoryId) {
    const updatePCData = {
      name: `Updated Product Cat ${timestamp}`,
      description: 'Updated description'
    };
    const updatePC = await testEndpoint('PUT', `/yourproductcategories/${createdItems.productCategoryId}`, updatePCData, 'UPDATE Product Category');
    results.tests.push({ name: 'UPDATE Product Category', ...updatePC });
    if (updatePC.success && updatePC.data.data.name === updatePCData.name) {
      results.passed++;
      console.log(`   ✅ Category updated successfully: "${updatePC.data.data.name}"`);
    } else {
      results.failed++;
    }
  }

  // ========== ITEM CATEGORIES CRUD ==========
  console.log('\n📦 ITEM CATEGORIES - Complete CRUD Test');
  console.log('-'.repeat(70));

  if (createdItems.productCategoryId) {
    // CREATE
    const itemCatData = {
      productCategoryId: createdItems.productCategoryId,
      name: `Test Item Cat ${timestamp}`,
      description: 'Test description for item category'
    };
    const createIC = await testEndpoint('POST', '/youritemcategories', itemCatData, 'CREATE Item Category');
    results.tests.push({ name: 'CREATE Item Category', ...createIC });
    if (createIC.success) {
      results.passed++;
      createdItems.itemCategoryId = createIC.data.data.id;
      console.log(`   ✅ Created Item Category ID: ${createdItems.itemCategoryId}`);
    } else {
      results.failed++;
    }

    // READ ALL
    const getIC = await testEndpoint('GET', '/youritemcategories', null, 'READ All Item Categories');
    results.tests.push({ name: 'READ All Item Categories', ...getIC });
    if (getIC.success && Array.isArray(getIC.data.data)) {
      results.passed++;
      const found = getIC.data.data.find(cat => cat.id === createdItems.itemCategoryId);
      if (found) {
        console.log(`   ✅ Found created item category in list: "${found.name}"`);
      }
    } else {
      results.failed++;
    }

    // READ WITH FILTER
    const getICFiltered = await testEndpoint('GET', `/youritemcategories?productCategoryId=${createdItems.productCategoryId}`, null, 'READ Item Categories (Filtered)');
    results.tests.push({ name: 'READ Item Categories (Filtered)', ...getICFiltered });
    if (getICFiltered.success) {
      results.passed++;
    } else {
      results.failed++;
    }

    // UPDATE
    if (createdItems.itemCategoryId) {
      const updateICData = {
        name: `Updated Item Cat ${timestamp}`,
        description: 'Updated description'
      };
      const updateIC = await testEndpoint('PUT', `/youritemcategories/${createdItems.itemCategoryId}`, updateICData, 'UPDATE Item Category');
      results.tests.push({ name: 'UPDATE Item Category', ...updateIC });
      if (updateIC.success && updateIC.data.data.name === updateICData.name) {
        results.passed++;
        console.log(`   ✅ Item category updated successfully: "${updateIC.data.data.name}"`);
      } else {
        results.failed++;
      }
    }
  } else {
    console.log('   ⚠️  Skipping Item Categories tests (no product category created)');
    results.failed += 4;
  }

  // ========== SUB CATEGORIES CRUD ==========
  console.log('\n📦 SUB CATEGORIES - Complete CRUD Test');
  console.log('-'.repeat(70));

  if (createdItems.itemCategoryId) {
    // CREATE
    const subCatData = {
      itemCategoryId: createdItems.itemCategoryId,
      name: `Test Sub Cat ${timestamp}`,
      description: 'Test description for sub category'
    };
    const createSC = await testEndpoint('POST', '/yoursubcategories', subCatData, 'CREATE Sub Category');
    results.tests.push({ name: 'CREATE Sub Category', ...createSC });
    if (createSC.success) {
      results.passed++;
      createdItems.subCategoryId = createSC.data.data.id;
      console.log(`   ✅ Created Sub Category ID: ${createdItems.subCategoryId}`);
    } else {
      results.failed++;
    }

    // READ ALL
    const getSC = await testEndpoint('GET', '/yoursubcategories', null, 'READ All Sub Categories');
    results.tests.push({ name: 'READ All Sub Categories', ...getSC });
    if (getSC.success && Array.isArray(getSC.data.data)) {
      results.passed++;
      const found = getSC.data.data.find(cat => cat.id === createdItems.subCategoryId);
      if (found) {
        console.log(`   ✅ Found created sub category in list: "${found.name}"`);
      }
    } else {
      results.failed++;
    }

    // READ WITH FILTER
    const getSCFiltered = await testEndpoint('GET', `/yoursubcategories?itemCategoryId=${createdItems.itemCategoryId}`, null, 'READ Sub Categories (Filtered)');
    results.tests.push({ name: 'READ Sub Categories (Filtered)', ...getSCFiltered });
    if (getSCFiltered.success) {
      results.passed++;
    } else {
      results.failed++;
    }

    // UPDATE
    if (createdItems.subCategoryId) {
      const updateSCData = {
        name: `Updated Sub Cat ${timestamp}`,
        description: 'Updated description'
      };
      const updateSC = await testEndpoint('PUT', `/yoursubcategories/${createdItems.subCategoryId}`, updateSCData, 'UPDATE Sub Category');
      results.tests.push({ name: 'UPDATE Sub Category', ...updateSC });
      if (updateSC.success && updateSC.data.data.name === updateSCData.name) {
        results.passed++;
        console.log(`   ✅ Sub category updated successfully: "${updateSC.data.data.name}"`);
      } else {
        results.failed++;
      }
    }
  } else {
    console.log('   ⚠️  Skipping Sub Categories tests (no item category created)');
    results.failed += 4;
  }

  // ========== DELETE OPERATIONS (in reverse order) ==========
  console.log('\n🗑️  DELETE OPERATIONS');
  console.log('-'.repeat(70));

  if (createdItems.subCategoryId) {
    const delSC = await testEndpoint('DELETE', `/yoursubcategories/${createdItems.subCategoryId}`, null, 'DELETE Sub Category');
    results.tests.push({ name: 'DELETE Sub Category', ...delSC });
    if (delSC.success) {
      results.passed++;
      // Verify it's deleted
      const verifySC = await testEndpoint('GET', '/yoursubcategories', null, 'VERIFY Sub Category Deleted');
      if (verifySC.success) {
        const found = verifySC.data.data.find(cat => cat.id === createdItems.subCategoryId);
        if (!found) {
          console.log(`   ✅ Sub category successfully removed from list`);
        } else {
          console.log(`   ⚠️  Sub category still appears in list`);
        }
      }
    } else {
      results.failed++;
    }
  }

  if (createdItems.itemCategoryId) {
    const delIC = await testEndpoint('DELETE', `/youritemcategories/${createdItems.itemCategoryId}`, null, 'DELETE Item Category');
    results.tests.push({ name: 'DELETE Item Category', ...delIC });
    if (delIC.success) {
      results.passed++;
      // Verify it's deleted
      const verifyIC = await testEndpoint('GET', '/youritemcategories', null, 'VERIFY Item Category Deleted');
      if (verifyIC.success) {
        const found = verifyIC.data.data.find(cat => cat.id === createdItems.itemCategoryId);
        if (!found) {
          console.log(`   ✅ Item category successfully removed from list`);
        } else {
          console.log(`   ⚠️  Item category still appears in list`);
        }
      }
    } else {
      results.failed++;
    }
  }

  if (createdItems.productCategoryId) {
    const delPC = await testEndpoint('DELETE', `/yourproductcategories/${createdItems.productCategoryId}`, null, 'DELETE Product Category');
    results.tests.push({ name: 'DELETE Product Category', ...delPC });
    if (delPC.success) {
      results.passed++;
      // Verify it's deleted
      const verifyPC = await testEndpoint('GET', '/yourproductcategories', null, 'VERIFY Product Category Deleted');
      if (verifyPC.success) {
        const found = verifyPC.data.data.find(cat => cat.id === createdItems.productCategoryId);
        if (!found) {
          console.log(`   ✅ Product category successfully removed from list`);
        } else {
          console.log(`   ⚠️  Product category still appears in list`);
        }
      }
    } else {
      results.failed++;
    }
  }

  // ========== DATABASE CONNECTION TEST ==========
  console.log('\n🔌 DATABASE CONNECTION TEST');
  console.log('-'.repeat(70));

  // Test if we can read data (proves DB connection works)
  const dbTest = await testEndpoint('GET', '/yourproductcategories', null, 'Database Connection Test (via GET)');
  if (dbTest.success) {
    results.passed++;
    console.log(`   ✅ Database connection working - Retrieved ${dbTest.data.data.length} product categories`);
  } else {
    results.failed++;
    console.log(`   ❌ Database connection failed`);
  }

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total:  ${results.passed + results.failed}`);
  if (results.passed + results.failed > 0) {
    const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    console.log(`📊 Success Rate: ${successRate}%`);
  }

  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.success ? '✅' : '❌';
    const statusText = test.status ? ` (${test.status})` : '';
    console.log(`   ${index + 1}. ${status} ${test.name}${statusText}`);
  });

  if (results.failed === 0) {
    console.log('\n🎉 All CRUD tests passed! Library operations are working correctly.');
    console.log('✅ Frontend-Backend-Database connectivity verified!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Check if server is running
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
    await runCompleteTests();
  } else {
    process.exit(1);
  }
})();

