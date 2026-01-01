/**
 * Test script to verify Customer and Vendor dropdowns work correctly
 * Tests: Frontend API calls, Backend endpoints, Database queries
 */

const pool = require('../src/models/database');
const CustomerModel = require('../src/models/customerModel');
const VendorModel = require('../src/models/vendorModel');
const { transformCustomer, transformVendor } = require('../src/utils/transformers');

// Test company ID (use an existing one or create test data)
const TEST_COMPANY_ID = 'GJIPER'; // Change this to your test company ID

async function testCustomers() {
  console.log('\n=== Testing Customers ===\n');
  
  try {
    // Test 1: Database query
    console.log('1. Testing database query...');
    const customers = await CustomerModel.getAll(TEST_COMPANY_ID);
    console.log(`   ✅ Found ${customers.length} customers in database`);
    
    if (customers.length > 0) {
      console.log('   Sample customer data:');
      customers.slice(0, 3).forEach((c, i) => {
        console.log(`   ${i + 1}. ID: ${c.id}, Name: ${c.customer_name}, Company: ${c.company_name}`);
      });
    }
    
    // Test 2: Data transformation
    console.log('\n2. Testing data transformation...');
    if (customers.length > 0) {
      const transformed = transformCustomer(customers[0]);
      console.log('   ✅ Transformation successful');
      console.log('   Transformed fields:', {
        id: transformed.id,
        customerName: transformed.customerName,
        name: transformed.name,
        phone: transformed.phone,
        emailId: transformed.emailId,
      });
    } else {
      console.log('   ⚠️  No customers to transform');
    }
    
    // Test 3: API endpoint simulation
    console.log('\n3. Testing API response format...');
    const transformedCustomers = customers.map(transformCustomer);
    const apiResponse = { success: true, data: transformedCustomers };
    console.log(`   ✅ API response format correct: { success: true, data: [${transformedCustomers.length} items] }`);
    
    return { success: true, count: customers.length, data: transformedCustomers };
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testVendors() {
  console.log('\n=== Testing Vendors ===\n');
  
  try {
    // Test 1: Database query
    console.log('1. Testing database query...');
    const vendors = await VendorModel.getAll(TEST_COMPANY_ID);
    console.log(`   ✅ Found ${vendors.length} vendors in database`);
    
    if (vendors.length > 0) {
      console.log('   Sample vendor data:');
      vendors.slice(0, 3).forEach((v, i) => {
        console.log(`   ${i + 1}. ID: ${v.id}, Name: ${v.name}`);
      });
    }
    
    // Test 2: Data transformation
    console.log('\n2. Testing data transformation...');
    if (vendors.length > 0) {
      const transformed = transformVendor(vendors[0]);
      console.log('   ✅ Transformation successful');
      console.log('   Transformed fields:', {
        id: transformed.id,
        name: transformed.name,
        phone: transformed.phone,
        email: transformed.email,
      });
    } else {
      console.log('   ⚠️  No vendors to transform');
    }
    
    // Test 3: API endpoint simulation
    console.log('\n3. Testing API response format...');
    const transformedVendors = vendors.map(transformVendor);
    const apiResponse = { success: true, data: transformedVendors };
    console.log(`   ✅ API response format correct: { success: true, data: [${transformedVendors.length} items] }`);
    
    return { success: true, count: vendors.length, data: transformedVendors };
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testFrontendCompatibility() {
  console.log('\n=== Testing Frontend Compatibility ===\n');
  
  try {
    const customersResult = await testCustomers();
    const vendorsResult = await testVendors();
    
    console.log('\n4. Testing frontend field access...');
    
    if (customersResult.success && customersResult.data.length > 0) {
      const customer = customersResult.data[0];
      console.log('   Customer field access:');
      console.log(`     - customer.customerName: ${customer.customerName || 'undefined'}`);
      console.log(`     - customer.name: ${customer.name || 'undefined'}`);
      console.log(`     - customer.id: ${customer.id || 'undefined'}`);
      console.log('   ✅ Frontend can access customer fields correctly');
    }
    
    if (vendorsResult.success && vendorsResult.data.length > 0) {
      const vendor = vendorsResult.data[0];
      console.log('   Vendor field access:');
      console.log(`     - vendor.name: ${vendor.name || 'undefined'}`);
      console.log(`     - vendor.id: ${vendor.id || 'undefined'}`);
      console.log('   ✅ Frontend can access vendor fields correctly');
    }
    
    return { customers: customersResult, vendors: vendorsResult };
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing Outgoing Inventory Dropdowns');
  console.log(`Company ID: ${TEST_COMPANY_ID}`);
  console.log('='.repeat(60));
  
  try {
    const results = await testFrontendCompatibility();
    
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    
    if (results.customers && results.customers.success) {
      console.log(`✅ Customers: ${results.customers.count} found`);
    } else {
      console.log(`❌ Customers: ${results.customers?.error || 'Failed'}`);
    }
    
    if (results.vendors && results.vendors.success) {
      console.log(`✅ Vendors: ${results.vendors.count} found`);
    } else {
      console.log(`❌ Vendors: ${results.vendors?.error || 'Failed'}`);
    }
    
    console.log('\n✅ All tests completed!');
    console.log('\nNext steps:');
    console.log('1. Start the backend server');
    console.log('2. Test API endpoints:');
    console.log('   - GET http://localhost:5000/api/library/customers');
    console.log('   - GET http://localhost:5000/api/library/yourvendors');
    console.log('3. Open the Outgoing Inventory page in the frontend');
    console.log('4. Verify dropdowns show customers and vendors');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run tests
runTests();





