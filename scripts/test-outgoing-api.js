/**
 * Test script to verify Customer and Vendor API endpoints
 * Tests the actual HTTP endpoints that the frontend will call
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:5000';
const TEST_COMPANY_ID = 'GJIPER';
const TEST_EMAIL = 'admin@gjiper.com'; // Change to your test user email
const TEST_PASSWORD = 'password123'; // Change to your test password

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function login() {
  console.log('\n1. Logging in...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': TEST_COMPANY_ID,
      },
    };

    const response = await makeRequest(options, {
      companyId: TEST_COMPANY_ID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (response.status === 200 && response.data.success) {
      console.log('   ✅ Login successful');
      return response.data.data.token;
    } else {
      console.log('   ❌ Login failed:', response.data.error || response.data.message);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return null;
  }
}

async function testCustomersEndpoint(token) {
  console.log('\n2. Testing GET /api/library/customers...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/library/customers',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company-id': TEST_COMPANY_ID,
      },
    };

    const response = await makeRequest(options);

    if (response.status === 200 && response.data.success) {
      const customers = response.data.data || [];
      console.log(`   ✅ Success! Found ${customers.length} customers`);
      
      if (customers.length > 0) {
        console.log('   Sample customers:');
        customers.slice(0, 3).forEach((c, i) => {
          console.log(`     ${i + 1}. ${c.customerName || c.name} (ID: ${c.id})`);
        });
        
        // Verify field names
        const first = customers[0];
        console.log('\n   Field verification:');
        console.log(`     - customerName: ${first.customerName ? '✅' : '❌'}`);
        console.log(`     - name: ${first.name ? '✅' : '❌'}`);
        console.log(`     - id: ${first.id ? '✅' : '❌'}`);
        console.log(`     - phone: ${first.phone ? '✅' : '❌'}`);
      } else {
        console.log('   ⚠️  No customers found in database');
      }
      
      return { success: true, count: customers.length, data: customers };
    } else {
      console.log(`   ❌ Failed! Status: ${response.status}`);
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testVendorsEndpoint(token) {
  console.log('\n3. Testing GET /api/library/yourvendors...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/library/yourvendors',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company-id': TEST_COMPANY_ID,
      },
    };

    const response = await makeRequest(options);

    if (response.status === 200 && response.data.success) {
      const vendors = response.data.data || [];
      console.log(`   ✅ Success! Found ${vendors.length} vendors`);
      
      if (vendors.length > 0) {
        console.log('   Sample vendors:');
        vendors.slice(0, 3).forEach((v, i) => {
          console.log(`     ${i + 1}. ${v.name} (ID: ${v.id})`);
        });
        
        // Verify field names
        const first = vendors[0];
        console.log('\n   Field verification:');
        console.log(`     - name: ${first.name ? '✅' : '❌'}`);
        console.log(`     - id: ${first.id ? '✅' : '❌'}`);
        console.log(`     - phone: ${first.phone ? '✅' : '❌'}`);
      } else {
        console.log('   ⚠️  No vendors found in database');
        console.log('   💡 Tip: Add vendors in the Library page to see them here');
      }
      
      return { success: true, count: vendors.length, data: vendors };
    } else {
      console.log(`   ❌ Failed! Status: ${response.status}`);
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testTeamsEndpoint(token) {
  console.log('\n4. Testing GET /api/library/teams...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/library/teams',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company-id': TEST_COMPANY_ID,
      },
    };

    const response = await makeRequest(options);

    if (response.status === 200 && response.data.success) {
      const teams = response.data.data || [];
      console.log(`   ✅ Success! Found ${teams.length} teams`);
      
      if (teams.length > 0) {
        console.log('   Sample teams:');
        teams.slice(0, 3).forEach((t, i) => {
          console.log(`     ${i + 1}. ${t.name} (ID: ${t.id})`);
        });
      } else {
        console.log('   ⚠️  No teams found in database');
      }
      
      return { success: true, count: teams.length, data: teams };
    } else {
      console.log(`   ❌ Failed! Status: ${response.status}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('Testing Outgoing Inventory API Endpoints');
  console.log('='.repeat(70));
  console.log(`Company ID: ${TEST_COMPANY_ID}`);
  console.log(`Email: ${TEST_EMAIL}`);
  console.log('='.repeat(70));

  // Check if server is running
  try {
    const testReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      timeout: 2000,
    }, () => {});
    
    testReq.on('error', () => {
      console.log('\n❌ ERROR: Backend server is not running!');
      console.log('   Please start the server first:');
      console.log('   cd backend1final');
      console.log('   npm start');
      process.exit(1);
    });
    
    testReq.end();
  } catch (error) {
    console.log('\n❌ ERROR: Cannot connect to backend server!');
    console.log('   Please start the server first:');
    console.log('   cd backend1final');
    console.log('   npm start');
    process.exit(1);
  }

  const token = await login();
  
  if (!token) {
    console.log('\n❌ Cannot proceed without authentication token');
    console.log('   Please check your login credentials');
    process.exit(1);
  }

  const results = {
    customers: await testCustomersEndpoint(token),
    vendors: await testVendorsEndpoint(token),
    teams: await testTeamsEndpoint(token),
  };

  console.log('\n' + '='.repeat(70));
  console.log('Test Summary');
  console.log('='.repeat(70));
  
  console.log(`\nCustomers: ${results.customers.success ? '✅' : '❌'} ${results.customers.count || 0} found`);
  console.log(`Vendors: ${results.vendors.success ? '✅' : '❌'} ${results.vendors.count || 0} found`);
  console.log(`Teams: ${results.teams.success ? '✅' : '❌'} ${results.teams.count || 0} found`);

  if (results.customers.success && results.vendors.success && results.teams.success) {
    console.log('\n✅ All API endpoints are working correctly!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open the frontend application');
    console.log('2. Navigate to: Inventory → Outgoing Records');
    console.log('3. Select a document type (Sales Invoice, Delivery Challan, etc.)');
    console.log('4. Select destination type (Customer or Vendor)');
    console.log('5. Verify the dropdowns show the correct data');
  } else {
    console.log('\n⚠️  Some endpoints failed. Check the errors above.');
  }

  console.log('\n' + '='.repeat(70));
}

// Run tests
runTests().catch(console.error);






