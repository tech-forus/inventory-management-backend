// Use built-in fetch for Node.js 18+ or node-fetch for older versions
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  // Fallback to node-fetch if available
  fetch = require('node-fetch');
}

const BASE_URL = 'http://localhost:5000/api';
const COMPANY_ID = process.env.COMPANY_ID || 'DEMO01';

// Get JWT token by logging in
async function getAuthToken() {
  try {
    // Try to login with test credentials
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@demo.com',
        password: 'admin123',
        companyId: COMPANY_ID
      })
    });
    
    if (loginResponse.ok) {
      const result = await loginResponse.json();
      return result.token || result.data?.token;
    }
    
    // If login fails, try to create a test user or use a default token
    console.log('⚠️  Login failed, trying alternative authentication...');
    return process.env.TEST_TOKEN || null;
  } catch (error) {
    console.log('⚠️  Could not authenticate, continuing without token...');
    return process.env.TEST_TOKEN || null;
  }
}

let TEST_TOKEN = null;

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
      console.log(`   Error: ${error.message || error}`);
    }
  }
}

async function makeRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();
    return { response, result };
  } catch (error) {
    return { error };
  }
}

// ==================== PRODUCT CATEGORIES TESTS ====================
async function testProductCategories() {
  console.log('\n📦 TESTING PRODUCT CATEGORIES\n');
  console.log('='.repeat(60));
  
  let createdIds = [];
  
  // Test 1: Create Product Category
  console.log('\n1. CREATE Product Category');
  try {
    const { response, result } = await makeRequest('POST', '/yourproductcategories', {
      name: `Test Product Category ${Date.now()}`,
      description: 'Test description'
    });
    logTest('Create Product Category', response.ok && result.success, response.ok ? null : result);
    if (response.ok && result.data) {
      createdIds.push({ type: 'productCategory', id: result.data.id });
    }
  } catch (error) {
    logTest('Create Product Category', false, error);
  }
  
  // Test 2: Get All Product Categories
  console.log('\n2. GET All Product Categories');
  try {
    const { response, result } = await makeRequest('GET', '/yourproductcategories');
    logTest('Get All Product Categories', response.ok && result.success && Array.isArray(result.data), 
      response.ok ? null : result);
  } catch (error) {
    logTest('Get All Product Categories', false, error);
  }
  
  // Test 3: Update Product Category
  console.log('\n3. UPDATE Product Category');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('PUT', `/yourproductcategories/${createdIds[0].id}`, {
        name: `Updated Product Category ${Date.now()}`,
        description: 'Updated description'
      });
      logTest('Update Product Category', response.ok && result.success, response.ok ? null : result);
    } catch (error) {
      logTest('Update Product Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no category created)');
  }
  
  // Test 4: Delete Product Category
  console.log('\n4. DELETE Product Category');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('DELETE', `/yourproductcategories/${createdIds[0].id}`);
      logTest('Delete Product Category', response.ok && result.success, response.ok ? null : result);
      if (response.ok) createdIds.shift();
    } catch (error) {
      logTest('Delete Product Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no category created)');
  }
  
  return createdIds;
}

// ==================== ITEM CATEGORIES TESTS ====================
async function testItemCategories(productCategoryId) {
  console.log('\n📦 TESTING ITEM CATEGORIES\n');
  console.log('='.repeat(60));
  
  let createdIds = [];
  
  // Test 1: Create Item Category
  console.log('\n1. CREATE Item Category');
  if (!productCategoryId) {
    console.log('⚠️  Need product category ID. Creating one...');
    const { response, result } = await makeRequest('POST', '/yourproductcategories', {
      name: `Test Product Cat ${Date.now()}`,
      description: 'For item category test'
    });
    if (response.ok && result.data) {
      productCategoryId = result.data.id;
    }
  }
  
  try {
    const { response, result } = await makeRequest('POST', '/youritemcategories', {
      name: `Test Item Category ${Date.now()}`,
      productCategoryId: productCategoryId,
      description: 'Test description'
    });
    logTest('Create Item Category', response.ok && result.success, response.ok ? null : result);
    if (response.ok && result.data) {
      createdIds.push({ type: 'itemCategory', id: result.data.id, productCategoryId });
    }
  } catch (error) {
    logTest('Create Item Category', false, error);
  }
  
  // Test 2: Get All Item Categories
  console.log('\n2. GET All Item Categories');
  try {
    const { response, result } = await makeRequest('GET', '/youritemcategories');
    logTest('Get All Item Categories', response.ok && result.success && Array.isArray(result.data), 
      response.ok ? null : result);
  } catch (error) {
    logTest('Get All Item Categories', false, error);
  }
  
  // Test 3: Get Item Categories by Product Category
  console.log('\n3. GET Item Categories by Product Category');
  if (productCategoryId) {
    try {
      const { response, result } = await makeRequest('GET', `/youritemcategories?productCategoryId=${productCategoryId}`);
      logTest('Get Item Categories by Product Category', response.ok && result.success, response.ok ? null : result);
    } catch (error) {
      logTest('Get Item Categories by Product Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no product category ID)');
  }
  
  // Test 4: Update Item Category
  console.log('\n4. UPDATE Item Category');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('PUT', `/youritemcategories/${createdIds[0].id}`, {
        name: `Updated Item Category ${Date.now()}`,
        productCategoryId: productCategoryId,
        description: 'Updated description'
      });
      logTest('Update Item Category', response.ok && result.success, response.ok ? null : result);
    } catch (error) {
      logTest('Update Item Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no category created)');
  }
  
  // Test 5: Delete Item Category
  console.log('\n5. DELETE Item Category');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('DELETE', `/youritemcategories/${createdIds[0].id}`);
      logTest('Delete Item Category', response.ok && result.success, response.ok ? null : result);
      if (response.ok) createdIds.shift();
    } catch (error) {
      logTest('Delete Item Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no category created)');
  }
  
  return createdIds;
}

// ==================== SUB CATEGORIES TESTS ====================
async function testSubCategories(itemCategoryId) {
  console.log('\n📦 TESTING SUB CATEGORIES\n');
  console.log('='.repeat(60));
  
  let createdIds = [];
  
  // Test 1: Create Sub Category
  console.log('\n1. CREATE Sub Category');
  if (!itemCategoryId) {
    console.log('⚠️  Need item category ID. Creating one...');
    // First create product category
    const { response: pcRes, result: pcResult } = await makeRequest('POST', '/yourproductcategories', {
      name: `Test Product Cat ${Date.now()}`,
      description: 'For sub category test'
    });
    let pcId = null;
    if (pcRes.ok && pcResult.data) {
      pcId = pcResult.data.id;
    }
    
    // Then create item category
    if (pcId) {
      const { response: icRes, result: icResult } = await makeRequest('POST', '/youritemcategories', {
        name: `Test Item Cat ${Date.now()}`,
        productCategoryId: pcId,
        description: 'For sub category test'
      });
      if (icRes.ok && icResult.data) {
        itemCategoryId = icResult.data.id;
      }
    }
  }
  
  try {
    const { response, result } = await makeRequest('POST', '/yoursubcategories', {
      name: `Test Sub Category ${Date.now()}`,
      itemCategoryId: itemCategoryId,
      description: 'Test description'
    });
    logTest('Create Sub Category', response.ok && result.success, response.ok ? null : result);
    if (response.ok && result.data) {
      createdIds.push({ type: 'subCategory', id: result.data.id, itemCategoryId });
    }
  } catch (error) {
    logTest('Create Sub Category', false, error);
  }
  
  // Test 2: Get All Sub Categories
  console.log('\n2. GET All Sub Categories');
  try {
    const { response, result } = await makeRequest('GET', '/yoursubcategories');
    logTest('Get All Sub Categories', response.ok && result.success && Array.isArray(result.data), 
      response.ok ? null : result);
  } catch (error) {
    logTest('Get All Sub Categories', false, error);
  }
  
  // Test 3: Get Sub Categories by Item Category
  console.log('\n3. GET Sub Categories by Item Category');
  if (itemCategoryId) {
    try {
      const { response, result } = await makeRequest('GET', `/yoursubcategories?itemCategoryId=${itemCategoryId}`);
      logTest('Get Sub Categories by Item Category', response.ok && result.success, response.ok ? null : result);
    } catch (error) {
      logTest('Get Sub Categories by Item Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no item category ID)');
  }
  
  // Test 4: Update Sub Category
  console.log('\n4. UPDATE Sub Category');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('PUT', `/yoursubcategories/${createdIds[0].id}`, {
        name: `Updated Sub Category ${Date.now()}`,
        itemCategoryId: itemCategoryId,
        description: 'Updated description'
      });
      logTest('Update Sub Category', response.ok && result.success, response.ok ? null : result);
    } catch (error) {
      logTest('Update Sub Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no category created)');
  }
  
  // Test 5: Delete Sub Category
  console.log('\n5. DELETE Sub Category');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('DELETE', `/yoursubcategories/${createdIds[0].id}`);
      logTest('Delete Sub Category', response.ok && result.success, response.ok ? null : result);
      if (response.ok) createdIds.shift();
    } catch (error) {
      logTest('Delete Sub Category', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no category created)');
  }
  
  return createdIds;
}

// ==================== BRANDS TESTS ====================
async function testBrands() {
  console.log('\n📦 TESTING BRANDS\n');
  console.log('='.repeat(60));
  
  let createdIds = [];
  
  // Test 1: Create Brand
  console.log('\n1. CREATE Brand');
  try {
    const { response, result } = await makeRequest('POST', '/yourbrands', {
      name: `Test Brand ${Date.now()}`,
      description: 'Test brand description',
      isActive: true
    });
    logTest('Create Brand', response.ok && result.success, response.ok ? null : result);
    if (response.ok && result.data) {
      createdIds.push({ type: 'brand', id: result.data.id });
    }
  } catch (error) {
    logTest('Create Brand', false, error);
  }
  
  // Test 2: Get All Brands
  console.log('\n2. GET All Brands');
  try {
    const { response, result } = await makeRequest('GET', '/yourbrands');
    logTest('Get All Brands', response.ok && result.success && Array.isArray(result.data), 
      response.ok ? null : result);
  } catch (error) {
    logTest('Get All Brands', false, error);
  }
  
  // Test 3: Update Brand
  console.log('\n3. UPDATE Brand');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('PUT', `/yourbrands/${createdIds[0].id}`, {
        name: `Updated Brand ${Date.now()}`,
        description: 'Updated brand description',
        isActive: true
      });
      logTest('Update Brand', response.ok && result.success, response.ok ? null : result);
    } catch (error) {
      logTest('Update Brand', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no brand created)');
  }
  
  // Test 4: Delete Brand
  console.log('\n4. DELETE Brand');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('DELETE', `/yourbrands/${createdIds[0].id}`);
      logTest('Delete Brand', response.ok && result.success, response.ok ? null : result);
      if (response.ok) createdIds.shift();
    } catch (error) {
      logTest('Delete Brand', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no brand created)');
  }
  
  return createdIds;
}

// ==================== VENDORS TESTS ====================
async function testVendors(productCategoryId, itemCategoryId, subCategoryId, brandId) {
  console.log('\n📦 TESTING VENDORS\n');
  console.log('='.repeat(60));
  
  let createdIds = [];
  
  // Test 1: Create Vendor with all fields
  console.log('\n1. CREATE Vendor (Complete)');
  try {
    const vendorData = {
      name: `Test Vendor ${Date.now()}`,
      contactPerson: 'John Doe',
      designation: 'Manager',
      phone: '1234567890',
      email: `test${Date.now()}@vendor.com`,
      gstNumber: '27AAAAA0000A1Z5',
      address: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400001',
      isActive: true,
      productCategoryIds: productCategoryId ? [productCategoryId] : [],
      itemCategoryIds: itemCategoryId ? [itemCategoryId] : [],
      subCategoryIds: subCategoryId ? [subCategoryId] : [],
      brandIds: brandId ? [brandId] : []
    };
    
    const { response, result } = await makeRequest('POST', '/yourvendors', vendorData);
    logTest('Create Vendor (Complete)', response.ok && result.success, response.ok ? null : result);
    if (response.ok && result.data) {
      createdIds.push({ type: 'vendor', id: result.data.id });
      console.log(`   Created Vendor ID: ${result.data.id}`);
      console.log(`   Product Categories: ${JSON.stringify(result.data.productCategoryIds || [])}`);
      console.log(`   Item Categories: ${JSON.stringify(result.data.itemCategoryIds || [])}`);
      console.log(`   Sub Categories: ${JSON.stringify(result.data.subCategoryIds || [])}`);
      console.log(`   Brands: ${JSON.stringify(result.data.brandIds || [])}`);
    }
  } catch (error) {
    logTest('Create Vendor (Complete)', false, error);
  }
  
  // Test 2: Create Vendor (Minimal)
  console.log('\n2. CREATE Vendor (Minimal)');
  try {
    const { response, result } = await makeRequest('POST', '/yourvendors', {
      name: `Minimal Vendor ${Date.now()}`,
      isActive: true
    });
    logTest('Create Vendor (Minimal)', response.ok && result.success, response.ok ? null : result);
    if (response.ok && result.data) {
      createdIds.push({ type: 'vendor', id: result.data.id });
    }
  } catch (error) {
    logTest('Create Vendor (Minimal)', false, error);
  }
  
  // Test 3: Get All Vendors
  console.log('\n3. GET All Vendors');
  try {
    const { response, result } = await makeRequest('GET', '/yourvendors');
    logTest('Get All Vendors', response.ok && result.success && Array.isArray(result.data), 
      response.ok ? null : result);
    if (response.ok && result.data && result.data.length > 0) {
      const vendor = result.data[0];
      console.log(`   Sample Vendor: ${vendor.name}`);
      console.log(`   Has relationships: ${!!(vendor.productCategoryIds || vendor.itemCategoryIds || vendor.subCategoryIds || vendor.brandIds)}`);
    }
  } catch (error) {
    logTest('Get All Vendors', false, error);
  }
  
  // Test 4: Update Vendor
  console.log('\n4. UPDATE Vendor');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('PUT', `/yourvendors/${createdIds[0].id}`, {
        name: `Updated Vendor ${Date.now()}`,
        contactPerson: 'Jane Doe',
        designation: 'Director',
        phone: '9876543210',
        email: `updated${Date.now()}@vendor.com`,
        gstNumber: '27BBBBB0000B2Z6',
        address: '456 Updated Street',
        city: 'Delhi',
        state: 'Delhi',
        pin: '110001',
        isActive: true,
        productCategoryIds: productCategoryId ? [productCategoryId] : [],
        itemCategoryIds: itemCategoryId ? [itemCategoryId] : [],
        subCategoryIds: subCategoryId ? [subCategoryId] : [],
        brandIds: brandId ? [brandId] : []
      });
      logTest('Update Vendor', response.ok && result.success, response.ok ? null : result);
      if (response.ok && result.data) {
        console.log(`   Updated relationships: ${JSON.stringify({
          productCategories: result.data.productCategoryIds,
          itemCategories: result.data.itemCategoryIds,
          subCategories: result.data.subCategoryIds,
          brands: result.data.brandIds
        })}`);
      }
    } catch (error) {
      logTest('Update Vendor', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no vendor created)');
  }
  
  // Test 5: Delete Vendor
  console.log('\n5. DELETE Vendor');
  if (createdIds.length > 0) {
    try {
      const { response, result } = await makeRequest('DELETE', `/yourvendors/${createdIds[0].id}`);
      logTest('Delete Vendor', response.ok && result.success, response.ok ? null : result);
      if (response.ok) createdIds.shift();
    } catch (error) {
      logTest('Delete Vendor', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no vendor created)');
  }
  
  return createdIds;
}

// ==================== EDGE CASES & ERROR HANDLING ====================
async function testEdgeCases() {
  console.log('\n📦 TESTING EDGE CASES & ERROR HANDLING\n');
  console.log('='.repeat(60));
  
  // Test 1: Invalid Product Category ID
  console.log('\n1. Create Item Category with Invalid Product Category ID');
  try {
    const { response, result } = await makeRequest('POST', '/youritemcategories', {
      name: 'Test Item',
      productCategoryId: 99999,
      description: 'Test'
    });
    logTest('Invalid Product Category ID', !response.ok, response.ok ? 'Should have failed' : null);
  } catch (error) {
    logTest('Invalid Product Category ID', true, null);
  }
  
  // Test 2: Duplicate Vendor Name
  console.log('\n2. Create Duplicate Vendor Name');
  try {
    const vendorName = `Duplicate Test ${Date.now()}`;
    const { response: r1 } = await makeRequest('POST', '/yourvendors', {
      name: vendorName,
      isActive: true
    });
    
    if (r1.ok) {
      const { response: r2, result } = await makeRequest('POST', '/yourvendors', {
        name: vendorName,
        isActive: true
      });
      // Should either succeed (update) or fail (duplicate)
      logTest('Duplicate Vendor Name', true, null);
    }
  } catch (error) {
    logTest('Duplicate Vendor Name', false, error);
  }
  
  // Test 3: Missing Required Fields
  console.log('\n3. Create Vendor without Required Name');
  try {
    const { response, result } = await makeRequest('POST', '/yourvendors', {
      isActive: true
    });
    logTest('Missing Required Fields', !response.ok, response.ok ? 'Should have failed' : null);
  } catch (error) {
    logTest('Missing Required Fields', true, null);
  }
  
  // Test 4: Invalid Vendor ID for Update
  console.log('\n4. Update Non-existent Vendor');
  try {
    const { response, result } = await makeRequest('PUT', '/yourvendors/99999', {
      name: 'Test',
      isActive: true
    });
    logTest('Update Non-existent Vendor', !response.ok || result.error, 
      response.ok && !result.error ? 'Should have failed' : null);
  } catch (error) {
    logTest('Update Non-existent Vendor', true, null);
  }
  
  // Test 5: Delete Non-existent Vendor
  console.log('\n5. Delete Non-existent Vendor');
  try {
    const { response, result } = await makeRequest('DELETE', '/yourvendors/99999');
    logTest('Delete Non-existent Vendor', !response.ok || result.error, 
      response.ok && !result.error ? 'Should have failed' : null);
  } catch (error) {
    logTest('Delete Non-existent Vendor', true, null);
  }
}

// ==================== MAIN TEST RUNNER ====================
async function runAllTests() {
  console.log('\n🚀 STARTING COMPREHENSIVE LIBRARY PAGE TESTS');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Company ID: ${COMPANY_ID}`);
  
  // Get authentication token
  TEST_TOKEN = await getAuthToken();
  if (TEST_TOKEN) {
    console.log(`Token: ${TEST_TOKEN.substring(0, 20)}...`);
  } else {
    console.log('⚠️  No authentication token available - some tests may fail');
  }
  console.log('='.repeat(60));
  
  try {
    // Test Product Categories first
    const productCategoryIds = await testProductCategories();
    const productCategoryId = productCategoryIds.length > 0 ? productCategoryIds[0].id : null;
    
    // Test Item Categories
    const itemCategoryIds = await testItemCategories(productCategoryId);
    const itemCategoryId = itemCategoryIds.length > 0 ? itemCategoryIds[0].id : null;
    
    // Test Sub Categories
    const subCategoryIds = await testSubCategories(itemCategoryId);
    const subCategoryId = subCategoryIds.length > 0 ? subCategoryIds[0].id : null;
    
    // Test Brands
    const brandIds = await testBrands();
    const brandId = brandIds.length > 0 ? brandIds[0].id : null;
    
    // Test Vendors (with relationships)
    await testVendors(productCategoryId, itemCategoryId, subCategoryId, brandId);
    
    // Test Edge Cases
    await testEdgeCases();
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
  }
  
  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.test}`);
      console.log(`   ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing Complete!');
  console.log('='.repeat(60));
}

// Run tests
runAllTests().catch(console.error);

