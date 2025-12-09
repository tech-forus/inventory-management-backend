// Use built-in fetch for Node.js 18+ or node-fetch for older versions
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  fetch = require('node-fetch');
}

const BASE_URL = 'http://localhost:5000/api';
const COMPANY_ID = process.env.COMPANY_ID || 'DEMO01';

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  createdItems: {
    productCategories: [],
    itemCategories: [],
    subCategories: [],
    brands: [],
    vendors: []
  }
};

function logTest(testName, passed, error = null, details = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    if (details) console.log(`   ${details}`);
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

async function makeRequest(method, endpoint, data = null, useAuth = true) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': COMPANY_ID
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

// ==================== SETUP: CREATE TEST DATA ====================
async function setupTestData() {
  console.log('\n🔧 SETTING UP TEST DATA\n');
  console.log('='.repeat(60));
  
  // Create Product Category
  console.log('Creating Product Category...');
  const { response: pcRes, result: pcResult } = await makeRequest('POST', '/yourproductcategories', {
    name: `Test PC ${Date.now()}`,
    description: 'Test product category'
  });
  if (pcRes.ok && pcResult.data) {
    testResults.createdItems.productCategories.push(pcResult.data.id);
    console.log(`✅ Created Product Category ID: ${pcResult.data.id}`);
  }
  
  // Create Item Category
  if (testResults.createdItems.productCategories.length > 0) {
    console.log('Creating Item Category...');
    const { response: icRes, result: icResult } = await makeRequest('POST', '/youritemcategories', {
      name: `Test IC ${Date.now()}`,
      productCategoryId: testResults.createdItems.productCategories[0],
      description: 'Test item category'
    });
    if (icRes.ok && icResult.data) {
      testResults.createdItems.itemCategories.push(icResult.data.id);
      console.log(`✅ Created Item Category ID: ${icResult.data.id}`);
    }
  }
  
  // Create Sub Category
  if (testResults.createdItems.itemCategories.length > 0) {
    console.log('Creating Sub Category...');
    const { response: scRes, result: scResult } = await makeRequest('POST', '/yoursubcategories', {
      name: `Test SC ${Date.now()}`,
      itemCategoryId: testResults.createdItems.itemCategories[0],
      description: 'Test sub category'
    });
    if (scRes.ok && scResult.data) {
      testResults.createdItems.subCategories.push(scResult.data.id);
      console.log(`✅ Created Sub Category ID: ${scResult.data.id}`);
    }
  }
  
  // Create Brand
  console.log('Creating Brand...');
  const { response: bRes, result: bResult } = await makeRequest('POST', '/yourbrands', {
    name: `Test Brand ${Date.now()}`,
    description: 'Test brand',
    isActive: true
  });
  if (bRes.ok && bResult.data) {
    testResults.createdItems.brands.push(bResult.data.id);
    console.log(`✅ Created Brand ID: ${bResult.data.id}`);
  }
  
  console.log('\n✅ Test data setup complete!\n');
}

// ==================== COMPREHENSIVE VENDOR TESTS ====================
async function testVendorsComprehensive() {
  console.log('\n📦 COMPREHENSIVE VENDOR TESTS\n');
  console.log('='.repeat(60));
  
  const pcId = testResults.createdItems.productCategories[0];
  const icId = testResults.createdItems.itemCategories[0];
  const scId = testResults.createdItems.subCategories[0];
  const brandId = testResults.createdItems.brands[0];
  
  // Test 1: Create Vendor with ALL relationships
  console.log('\n1. CREATE Vendor with ALL Relationships');
  let vendorId = null;
  try {
    const vendorData = {
      name: `Complete Vendor Test ${Date.now()}`,
      contactPerson: 'John Doe',
      designation: 'Manager',
      phone: '1234567890',
      email: `vendor${Date.now()}@test.com`,
      gstNumber: '27AAAAA0000A1Z5',
      address: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400001',
      isActive: true,
      productCategoryIds: pcId ? [pcId] : [],
      itemCategoryIds: icId ? [icId] : [],
      subCategoryIds: scId ? [scId] : [],
      brandIds: brandId ? [brandId] : []
    };
    
    const { response, result } = await makeRequest('POST', '/yourvendors', vendorData);
    const passed = response.ok && result.success;
    logTest('Create Vendor with Relationships', passed, passed ? null : result);
    
    if (passed && result.data) {
      vendorId = result.data.id;
      testResults.createdItems.vendors.push(vendorId);
      console.log(`   Vendor ID: ${vendorId}`);
      console.log(`   Product Categories: ${JSON.stringify(result.data.productCategoryIds || [])}`);
      console.log(`   Item Categories: ${JSON.stringify(result.data.itemCategoryIds || [])}`);
      console.log(`   Sub Categories: ${JSON.stringify(result.data.subCategoryIds || [])}`);
      console.log(`   Brands: ${JSON.stringify(result.data.brandIds || [])}`);
      
      // Verify relationships were saved
      const hasRelationships = 
        (result.data.productCategoryIds && result.data.productCategoryIds.length > 0) ||
        (result.data.itemCategoryIds && result.data.itemCategoryIds.length > 0) ||
        (result.data.subCategoryIds && result.data.subCategoryIds.length > 0) ||
        (result.data.brandIds && result.data.brandIds.length > 0);
      
      if (hasRelationships) {
        logTest('Verify Relationships Saved', true, null, 'Relationships are present in response');
      } else {
        logTest('Verify Relationships Saved', false, 'No relationships found in response');
      }
    }
  } catch (error) {
    logTest('Create Vendor with Relationships', false, error);
  }
  
  // Test 2: Get Vendor and Verify Relationships
  console.log('\n2. GET Vendor and Verify Relationships');
  if (vendorId) {
    try {
      const { response, result } = await makeRequest('GET', '/yourvendors');
      if (response.ok && result.success && Array.isArray(result.data)) {
        const vendor = result.data.find(v => v.id === vendorId);
        if (vendor) {
          logTest('Get Vendor from List', true, null, `Found vendor: ${vendor.name}`);
          console.log(`   Product Categories: ${JSON.stringify(vendor.productCategoryIds || [])}`);
          console.log(`   Item Categories: ${JSON.stringify(vendor.itemCategoryIds || [])}`);
          console.log(`   Sub Categories: ${JSON.stringify(vendor.subCategoryIds || [])}`);
          console.log(`   Brands: ${JSON.stringify(vendor.brandIds || [])}`);
          
          // Verify all relationships
          const allRelationshipsPresent = 
            (pcId && vendor.productCategoryIds && vendor.productCategoryIds.includes(pcId)) &&
            (icId && vendor.itemCategoryIds && vendor.itemCategoryIds.includes(icId)) &&
            (scId && vendor.subCategoryIds && vendor.subCategoryIds.includes(scId)) &&
            (brandId && vendor.brandIds && vendor.brandIds.includes(brandId));
          
          if (allRelationshipsPresent) {
            logTest('Verify All Relationships Retrieved', true, null, 'All relationships present');
          } else {
            logTest('Verify All Relationships Retrieved', false, 'Some relationships missing');
          }
        } else {
          logTest('Get Vendor from List', false, 'Vendor not found in list');
        }
      } else {
        logTest('Get Vendor from List', false, result);
      }
    } catch (error) {
      logTest('Get Vendor from List', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no vendor created)');
  }
  
  // Test 3: Update Vendor Relationships
  console.log('\n3. UPDATE Vendor Relationships');
  if (vendorId) {
    try {
      const updateData = {
        name: `Updated Vendor ${Date.now()}`,
        contactPerson: 'Jane Doe',
        designation: 'Director',
        phone: '9876543210',
        email: `updated${Date.now()}@test.com`,
        gstNumber: '27BBBBB0000B2Z6',
        address: '456 Updated Street',
        city: 'Delhi',
        state: 'Delhi',
        pin: '110001',
        isActive: true,
        productCategoryIds: pcId ? [pcId] : [],
        itemCategoryIds: icId ? [icId] : [],
        subCategoryIds: scId ? [scId] : [],
        brandIds: brandId ? [brandId] : []
      };
      
      const { response, result } = await makeRequest('PUT', `/yourvendors/${vendorId}`, updateData);
      const passed = response.ok && result.success;
      logTest('Update Vendor Relationships', passed, passed ? null : result);
      
      if (passed && result.data) {
        console.log(`   Updated Product Categories: ${JSON.stringify(result.data.productCategoryIds || [])}`);
        console.log(`   Updated Item Categories: ${JSON.stringify(result.data.itemCategoryIds || [])}`);
        console.log(`   Updated Sub Categories: ${JSON.stringify(result.data.subCategoryIds || [])}`);
        console.log(`   Updated Brands: ${JSON.stringify(result.data.brandIds || [])}`);
      }
    } catch (error) {
      logTest('Update Vendor Relationships', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no vendor created)');
  }
  
  // Test 4: Create Multiple Vendors
  console.log('\n4. CREATE Multiple Vendors');
  try {
    const vendors = [];
    for (let i = 1; i <= 5; i++) {
      const { response, result } = await makeRequest('POST', '/yourvendors', {
        name: `Bulk Vendor ${i} ${Date.now()}`,
        contactPerson: `Person ${i}`,
        phone: `123456789${i}`,
        email: `bulk${i}${Date.now()}@test.com`,
        isActive: true,
        productCategoryIds: pcId ? [pcId] : [],
        brandIds: brandId ? [brandId] : []
      });
      
      if (response.ok && result.success && result.data) {
        vendors.push(result.data.id);
        testResults.createdItems.vendors.push(result.data.id);
      }
    }
    logTest('Create Multiple Vendors', vendors.length === 5, 
      vendors.length === 5 ? null : `Only created ${vendors.length}/5 vendors`);
    console.log(`   Created ${vendors.length} vendors`);
  } catch (error) {
    logTest('Create Multiple Vendors', false, error);
  }
  
  // Test 5: Get All Vendors and Verify Count
  console.log('\n5. GET All Vendors (Verify Count)');
  try {
    const { response, result } = await makeRequest('GET', '/yourvendors');
    if (response.ok && result.success && Array.isArray(result.data)) {
      logTest('Get All Vendors', true, null, `Found ${result.data.length} vendors`);
      
      // Verify all vendors have relationship arrays
      const allHaveRelationships = result.data.every(v => 
        Array.isArray(v.productCategoryIds) &&
        Array.isArray(v.itemCategoryIds) &&
        Array.isArray(v.subCategoryIds) &&
        Array.isArray(v.brandIds)
      );
      logTest('All Vendors Have Relationship Arrays', allHaveRelationships, 
        allHaveRelationships ? null : 'Some vendors missing relationship arrays');
    } else {
      logTest('Get All Vendors', false, result);
    }
  } catch (error) {
    logTest('Get All Vendors', false, error);
  }
  
  // Test 6: Delete Vendor (should cascade delete relationships)
  console.log('\n6. DELETE Vendor (Cascade Relationships)');
  if (vendorId) {
    try {
      const { response, result } = await makeRequest('DELETE', `/yourvendors/${vendorId}`);
      logTest('Delete Vendor', response.ok && result.success, response.ok ? null : result);
      
      if (response.ok) {
        // Verify vendor is deleted (soft delete - check isActive)
        const { response: getRes, result: getResult } = await makeRequest('GET', '/yourvendors');
        if (getRes.ok && getResult.success) {
          const vendor = getResult.data.find(v => v.id === vendorId);
          // Vendor might still exist but be inactive (soft delete)
          if (vendor) {
            logTest('Verify Vendor Deleted', !vendor.isActive, 
              vendor.isActive ? 'Vendor still active' : 'Vendor is inactive (soft deleted)');
          } else {
            logTest('Verify Vendor Deleted', true, null, 'Vendor not found in list');
          }
        }
      }
    } catch (error) {
      logTest('Delete Vendor', false, error);
    }
  } else {
    console.log('⏭️  Skipped (no vendor created)');
  }
  
  return vendorId;
}

// ==================== COMPREHENSIVE CRUD TESTS ====================
async function testAllCRUD() {
  console.log('\n📦 COMPREHENSIVE CRUD TESTS FOR ALL ENTITIES\n');
  console.log('='.repeat(60));
  
  // Test Product Categories CRUD
  console.log('\n🔹 PRODUCT CATEGORIES CRUD');
  let pcId = null;
  let pcIdForIC = null; // Keep one for item categories
  try {
    // CREATE
    const { response: createRes, result: createResult } = await makeRequest('POST', '/yourproductcategories', {
      name: `CRUD Test PC ${Date.now()}`,
      description: 'CRUD test'
    });
    if (createRes.ok && createResult.data) {
      pcId = createResult.data.id;
      logTest('Product Category CREATE', true);
    } else {
      logTest('Product Category CREATE', false, createResult);
    }
    
    // Create another one for item categories (don't delete this one)
    const { response: createRes2, result: createResult2 } = await makeRequest('POST', '/yourproductcategories', {
      name: `CRUD Test PC Keep ${Date.now()}`,
      description: 'For item category tests'
    });
    if (createRes2.ok && createResult2.data) {
      pcIdForIC = createResult2.data.id;
    }
    
    // READ
    const { response: readRes, result: readResult } = await makeRequest('GET', '/yourproductcategories');
    logTest('Product Category READ', readRes.ok && readResult.success && Array.isArray(readResult.data));
    
    // UPDATE
    if (pcId) {
      const { response: updateRes, result: updateResult } = await makeRequest('PUT', `/yourproductcategories/${pcId}`, {
        name: `Updated CRUD PC ${Date.now()}`,
        description: 'Updated'
      });
      logTest('Product Category UPDATE', updateRes.ok && updateResult.success);
    }
    
    // DELETE (only delete the first one, keep the second for item categories)
    if (pcId) {
      const { response: deleteRes, result: deleteResult } = await makeRequest('DELETE', `/yourproductcategories/${pcId}`);
      logTest('Product Category DELETE', deleteRes.ok && deleteResult.success);
    }
  } catch (error) {
    logTest('Product Categories CRUD', false, error);
  }
  
  // Test Item Categories CRUD
  console.log('\n🔹 ITEM CATEGORIES CRUD');
  let icId = null;
  let icIdForSC = null; // Keep one for sub categories
  try {
    // Use the product category we kept for item categories
    let testPcId = pcIdForIC;
    if (!testPcId) {
      const { response, result } = await makeRequest('POST', '/yourproductcategories', {
        name: `PC for IC ${Date.now()}`,
        description: 'For item category'
      });
      if (response.ok && result.data) {
        testPcId = result.data.id;
        console.log(`   Created Product Category ID: ${testPcId}`);
      }
    }
    
    if (testPcId) {
      // CREATE
      const { response: createRes, result: createResult } = await makeRequest('POST', '/youritemcategories', {
        name: `CRUD Test IC ${Date.now()}`,
        productCategoryId: testPcId,
        description: 'CRUD test'
      });
      if (createRes.ok && createResult.data) {
        icId = createResult.data.id;
        logTest('Item Category CREATE', true, null, `Created with ID: ${icId}`);
      } else {
        logTest('Item Category CREATE', false, 
          createResult.error || createResult.message || JSON.stringify(createResult));
      }
      
      // READ
      const { response: readRes, result: readResult } = await makeRequest('GET', '/youritemcategories');
      logTest('Item Category READ', readRes.ok && readResult.success && Array.isArray(readResult.data));
      
      // UPDATE
      if (icId) {
        const { response: updateRes, result: updateResult } = await makeRequest('PUT', `/youritemcategories/${icId}`, {
          name: `Updated CRUD IC ${Date.now()}`,
          productCategoryId: pcId,
          description: 'Updated'
        });
        logTest('Item Category UPDATE', updateRes.ok && updateResult.success);
      }
      
      // DELETE
      if (icId) {
        const { response: deleteRes, result: deleteResult } = await makeRequest('DELETE', `/youritemcategories/${icId}`);
        logTest('Item Category DELETE', deleteRes.ok && deleteResult.success);
      }
    }
  } catch (error) {
    logTest('Item Categories CRUD', false, error);
  }
  
  // Test Sub Categories CRUD
  console.log('\n🔹 SUB CATEGORIES CRUD');
  let scId = null;
  try {
    // Use the item category we kept for sub categories
    let testIcId = icIdForSC;
    if (!testIcId && pcIdForIC) {
      const { response, result } = await makeRequest('POST', '/youritemcategories', {
        name: `IC for SC ${Date.now()}`,
        productCategoryId: pcIdForIC,
        description: 'For sub category'
      });
      if (response.ok && result.data) testIcId = result.data.id;
    }
    
    if (testIcId) {
      // CREATE
      const { response: createRes, result: createResult } = await makeRequest('POST', '/yoursubcategories', {
        name: `CRUD Test SC ${Date.now()}`,
        itemCategoryId: testIcId,
        description: 'CRUD test'
      });
      if (createRes.ok && createResult.data) {
        scId = createResult.data.id;
        logTest('Sub Category CREATE', true, null, `Created with ID: ${scId}`);
      } else {
        logTest('Sub Category CREATE', false, 
          createResult.error || createResult.message || JSON.stringify(createResult));
      }
      
      // READ
      const { response: readRes, result: readResult } = await makeRequest('GET', '/yoursubcategories');
      logTest('Sub Category READ', readRes.ok && readResult.success && Array.isArray(readResult.data));
      
      // UPDATE
      if (scId) {
        const { response: updateRes, result: updateResult } = await makeRequest('PUT', `/yoursubcategories/${scId}`, {
          name: `Updated CRUD SC ${Date.now()}`,
          itemCategoryId: testIcId,
          description: 'Updated'
        });
        logTest('Sub Category UPDATE', updateRes.ok && updateResult.success);
      }
      
      // DELETE
      if (scId) {
        const { response: deleteRes, result: deleteResult } = await makeRequest('DELETE', `/yoursubcategories/${scId}`);
        logTest('Sub Category DELETE', deleteRes.ok && deleteResult.success);
      }
    }
  } catch (error) {
    logTest('Sub Categories CRUD', false, error);
  }
  
  // Test Brands CRUD
  console.log('\n🔹 BRANDS CRUD');
  let brandId = null;
  try {
    // CREATE
    const { response: createRes, result: createResult } = await makeRequest('POST', '/yourbrands', {
      name: `CRUD Test Brand ${Date.now()}`,
      description: 'CRUD test',
      isActive: true
    });
    if (createRes.ok && createResult.data) {
      brandId = createResult.data.id;
      logTest('Brand CREATE', true);
    } else {
      logTest('Brand CREATE', false, createResult);
    }
    
    // READ
    const { response: readRes, result: readResult } = await makeRequest('GET', '/yourbrands');
    logTest('Brand READ', readRes.ok && readResult.success && Array.isArray(readResult.data));
    
    // UPDATE
    if (brandId) {
      const { response: updateRes, result: updateResult } = await makeRequest('PUT', `/yourbrands/${brandId}`, {
        name: `Updated CRUD Brand ${Date.now()}`,
        description: 'Updated',
        isActive: true
      });
      logTest('Brand UPDATE', updateRes.ok && updateResult.success);
    }
    
    // DELETE
    if (brandId) {
      const { response: deleteRes, result: deleteResult } = await makeRequest('DELETE', `/yourbrands/${brandId}`);
      logTest('Brand DELETE', deleteRes.ok && deleteResult.success);
    }
  } catch (error) {
    logTest('Brands CRUD', false, error);
  }
  
  return { pcId, icId, scId, brandId };
}

// ==================== MAIN TEST RUNNER ====================
async function runHardTests() {
  console.log('\n🚀 HARD COMPREHENSIVE LIBRARY PAGE TESTS');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Company ID: ${COMPANY_ID}`);
  console.log('='.repeat(60));
  
  try {
    // Setup test data
    await setupTestData();
    
    // Test all CRUD operations
    const ids = await testAllCRUD();
    
    // Test vendors comprehensively
    await testVendorsComprehensive();
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
  }
  
  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  const total = testResults.passed + testResults.failed;
  console.log(`📈 Success Rate: ${total > 0 ? ((testResults.passed / total) * 100).toFixed(2) : 0}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.test}`);
      console.log(`   ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Hard Testing Complete!');
  console.log('='.repeat(60));
}

// Run tests
runHardTests().catch(console.error);

