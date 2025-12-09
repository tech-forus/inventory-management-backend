/**
 * Simple API test to check connection
 */

const API_BASE_URL = 'http://localhost:5000/api';

async function test() {
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await fetch(`${API_BASE_URL}/health`);
    const healthData = await health.json();
    console.log('   ✅ Health:', healthData.status);

    // Test 2: GET vendors
    console.log('\n2. Testing GET /yourvendors...');
    const vendorsGet = await fetch(`${API_BASE_URL}/yourvendors`, {
      headers: { 'x-company-id': 'DEMO01' }
    });
    const vendorsData = await vendorsGet.json();
    console.log('   Status:', vendorsGet.status);
    console.log('   Response:', JSON.stringify(vendorsData, null, 2));

    // Test 3: POST vendor
    console.log('\n3. Testing POST /yourvendors...');
    const vendorPost = await fetch(`${API_BASE_URL}/yourvendors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify({
        name: 'Test Vendor ' + Date.now(),
        contactPerson: 'John Doe',
        email: 'test@vendor.com',
        phone: '1234567890'
      })
    });
    const vendorPostData = await vendorPost.json();
    console.log('   Status:', vendorPost.status);
    console.log('   Response:', JSON.stringify(vendorPostData, null, 2));

    // Test 4: GET brands
    console.log('\n4. Testing GET /yourbrands...');
    const brandsGet = await fetch(`${API_BASE_URL}/yourbrands`, {
      headers: { 'x-company-id': 'DEMO01' }
    });
    const brandsData = await brandsGet.json();
    console.log('   Status:', brandsGet.status);
    console.log('   Items:', brandsData.data?.length || 0);

    // Test 5: POST brand
    console.log('\n5. Testing POST /yourbrands...');
    const brandPost = await fetch(`${API_BASE_URL}/yourbrands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'DEMO01'
      },
      body: JSON.stringify({
        name: 'Test Brand ' + Date.now(),
        description: 'Test description'
      })
    });
    const brandPostData = await brandPost.json();
    console.log('   Status:', brandPost.status);
    console.log('   Response:', JSON.stringify(brandPostData, null, 2));

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();

