/**
 * Test script to verify incoming inventory API returns data correctly
 */
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testIncomingInventory() {
  console.log('🧪 Testing Incoming Inventory API...\n');

  // Note: This requires a valid JWT token
  // In a real scenario, you would login first to get a token
  const token = process.env.TEST_TOKEN || '';

  if (!token) {
    console.log('⚠️  No token provided. Set TEST_TOKEN environment variable or login first.');
    console.log('   The API requires authentication.');
    return;
  }

  try {
    console.log('1. Testing GET /api/inventory/incoming...');
    const response = await axios.get(`${API_BASE_URL}/inventory/incoming`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('   ✅ Request successful!');
    console.log('   Status:', response.status);
    console.log('   Response structure:', {
      hasSuccess: 'success' in response.data,
      hasData: 'data' in response.data,
      dataType: Array.isArray(response.data.data) ? 'array' : typeof response.data.data,
      dataLength: Array.isArray(response.data.data) ? response.data.data.length : 'N/A'
    });

    if (response.data.success && Array.isArray(response.data.data)) {
      console.log(`   📊 Found ${response.data.data.length} incoming inventory records`);
      if (response.data.data.length > 0) {
        console.log('   Sample record:', JSON.stringify(response.data.data[0], null, 2));
      }
    } else {
      console.log('   ⚠️  Unexpected response structure:', response.data);
    }
  } catch (error) {
    if (error.response) {
      console.log('   ❌ Error:', error.response.status, error.response.data);
    } else {
      console.log('   ❌ Error:', error.message);
    }
  }
}

testIncomingInventory().catch(console.error);


