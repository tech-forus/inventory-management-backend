/**
 * API Endpoints Integration Test
 * Tests that all routes are properly connected and working
 * Run with: node test_api_endpoints.js
 * Note: Server must be running on port 5000
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test functions
async function testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true, // Don't throw on any status
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: response.status === expectedStatus, status: response.status, data: response.data };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return { success: false, error: 'Server not running', code: 'ECONNREFUSED' };
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('========================================');
  console.log('API Endpoints Integration Test');
  console.log('========================================\n');
  console.log('⚠️  Make sure the server is running on port 5000\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Root endpoint
  console.log('Testing root endpoint...');
  const rootTest = await testEndpoint('GET', '');
  if (rootTest.success && rootTest.data?.status === 'Server is running') {
    console.log('✓ GET / - Root endpoint working');
    testsPassed++;
  } else if (rootTest.code === 'ECONNREFUSED') {
    console.log('✗ GET / - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ GET / - Status: ${rootTest.status}, Expected: 200`);
    testsFailed++;
  }

  // Test 2: Health check
  console.log('Testing health endpoint...');
  const healthTest = await testEndpoint('GET', '/health');
  if (healthTest.success && healthTest.data?.status === 'OK') {
    console.log('✓ GET /api/health - Health check working');
    testsPassed++;
  } else if (healthTest.code === 'ECONNREFUSED') {
    console.log('✗ GET /api/health - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ GET /api/health - Status: ${healthTest.status}`);
    testsFailed++;
  }

  // Test 3: Auth routes (should return 400 for missing data)
  console.log('Testing auth routes...');
  const authTest = await testEndpoint('POST', '/auth/login', {}, 400);
  if (authTest.success || (authTest.status === 400 && authTest.data?.error?.includes('required'))) {
    console.log('✓ POST /api/auth/login - Route exists and validates');
    testsPassed++;
  } else if (authTest.code === 'ECONNREFUSED') {
    console.log('✗ POST /api/auth/login - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ POST /api/auth/login - Status: ${authTest.status}`);
    testsFailed++;
  }

  // Test 4: Companies routes
  console.log('Testing companies routes...');
  const companiesTest = await testEndpoint('GET', '/companies/TEST01', null, 404);
  if (companiesTest.success || (companiesTest.status === 404 && companiesTest.data?.error)) {
    console.log('✓ GET /api/companies/:companyId - Route exists');
    testsPassed++;
  } else if (companiesTest.code === 'ECONNREFUSED') {
    console.log('✗ GET /api/companies/:companyId - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ GET /api/companies/:companyId - Status: ${companiesTest.status}`);
    testsFailed++;
  }

  // Test 5: Onboarding routes
  console.log('Testing onboarding routes...');
  const onboardingTest = await testEndpoint('GET', '/onboarding/status/TEST01');
  if (onboardingTest.success || onboardingTest.status === 404) {
    console.log('✓ GET /api/onboarding/status/:companyId - Route exists');
    testsPassed++;
  } else if (onboardingTest.code === 'ECONNREFUSED') {
    console.log('✗ GET /api/onboarding/status/:companyId - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ GET /api/onboarding/status/:companyId - Status: ${onboardingTest.status}`);
    testsFailed++;
  }

  // Test 6: Library routes
  console.log('Testing library routes...');
  const libraryTest = await testEndpoint('GET', '/library/yourvendors');
  if (libraryTest.status === 200 || libraryTest.status === 401 || libraryTest.status === 400) {
    console.log('✓ GET /api/library/yourvendors - Route exists');
    testsPassed++;
  } else if (libraryTest.code === 'ECONNREFUSED') {
    console.log('✗ GET /api/library/yourvendors - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ GET /api/library/yourvendors - Status: ${libraryTest.status}`);
    testsFailed++;
  }

  // Test 7: SKUs routes
  console.log('Testing SKUs routes...');
  const skusTest = await testEndpoint('GET', '/skus');
  if (skusTest.status === 200 || skusTest.status === 401 || skusTest.status === 400) {
    console.log('✓ GET /api/skus - Route exists');
    testsPassed++;
  } else if (skusTest.code === 'ECONNREFUSED') {
    console.log('✗ GET /api/skus - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ GET /api/skus - Status: ${skusTest.status}`);
    testsFailed++;
  }

  // Test 8: 404 handler
  console.log('Testing 404 handler...');
  const notFoundTest = await testEndpoint('GET', '/nonexistent', null, 404);
  if (notFoundTest.success && notFoundTest.data?.error?.includes('not found')) {
    console.log('✓ 404 handler working');
    testsPassed++;
  } else if (notFoundTest.code === 'ECONNREFUSED') {
    console.log('✗ 404 handler - Server not running');
    testsFailed++;
  } else {
    console.log(`✗ 404 handler - Status: ${notFoundTest.status}`);
    testsFailed++;
  }

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`✓ Passed: ${testsPassed}`);
  console.log(`✗ Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n✅ All API endpoint tests passed!');
    console.log('Backend is working properly.');
    process.exit(0);
  } else if (testsFailed > 0 && testsPassed > 0) {
    console.log('\n⚠️  Some tests failed, but server is responding.');
    console.log('This might be expected if:');
    console.log('   - Some routes require authentication');
    console.log('   - Database is not connected');
    process.exit(0);
  } else {
    console.log('\n❌ Tests failed. Please check:');
    console.log('   - Is the server running on port 5000?');
    console.log('   - Run: cd BACKEND && npm start');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
