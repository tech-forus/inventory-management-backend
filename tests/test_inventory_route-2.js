/**
 * Test script to verify inventory routes are working
 */
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testInventoryRoutes() {
  console.log('🧪 Testing Inventory Routes...\n');

  // Test 1: Check if route exists (should return 401 without auth, not 404)
  try {
    console.log('1. Testing POST /api/inventory/incoming (without auth)...');
    const response = await axios.post(`${API_BASE_URL}/inventory/incoming`, {}, {
      validateStatus: () => true // Don't throw on any status
    });
    
    if (response.status === 401) {
      console.log('   ✅ Route exists! (Got 401 - authentication required, which is expected)');
    } else if (response.status === 404) {
      console.log('   ❌ Route not found (404)');
      console.log('   Response:', response.data);
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
      console.log('   Response:', response.data);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Server is not running!');
      console.log('   Please start the server with: npm start or node server.js');
    } else {
      console.log('   ❌ Error:', error.message);
    }
  }

  // Test 2: Check GET history route
  try {
    console.log('\n2. Testing GET /api/inventory/incoming/history (without auth)...');
    const response = await axios.get(`${API_BASE_URL}/inventory/incoming/history`, {
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      console.log('   ✅ Route exists! (Got 401 - authentication required)');
    } else if (response.status === 404) {
      console.log('   ❌ Route not found (404)');
    } else {
      console.log(`   ⚠️  Status: ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n✅ Route testing complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Make sure the database migration has been run:');
  console.log('      cd BACKEND && node database/migrate.js');
  console.log('   2. Make sure the server is running');
  console.log('   3. Test with a valid authentication token');
}

testInventoryRoutes().catch(console.error);


