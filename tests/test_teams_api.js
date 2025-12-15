/**
 * Test script for Teams API endpoints
 * Run with: node test_teams_api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const TEST_COMPANY_ID = 'DEMO01'; // Change this to your test company ID

// Test credentials - adjust based on your test user
const TEST_EMAIL = 'admin@demo.com';
const TEST_PASSWORD = 'password123';

let authToken = '';

// Helper function to get auth token
async function getAuthToken() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      companyId: TEST_COMPANY_ID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✓ Authentication successful');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ Authentication failed:', error.response?.data?.error || error.message);
    return false;
  }
}

// Helper function to make authenticated requests
function makeRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
}

// Test functions
async function testGetTeams() {
  console.log('\n--- Testing GET /api/library/teams ---');
  try {
    const response = await makeRequest('get', '/library/teams');
    if (response.data.success) {
      console.log(`✓ Get teams successful. Found ${response.data.data.length} team members`);
      return response.data.data;
    }
  } catch (error) {
    console.error('✗ Get teams failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function testCreateTeam() {
  console.log('\n--- Testing POST /api/library/teams ---');
  const testTeam = {
    name: 'John Doe',
    contactNumber: '9876543210',
    emailId: 'john.doe@test.com',
    department: 'Sales',
    designation: 'Sales Manager',
  };
  
  try {
    const response = await makeRequest('post', '/library/teams', testTeam);
    if (response.data.success) {
      console.log('✓ Create team successful');
      console.log('  Created team member:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('✗ Create team failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function testUpdateTeam(teamId) {
  console.log('\n--- Testing PUT /api/library/teams/:id ---');
  const updatedTeam = {
    name: 'John Doe Updated',
    contactNumber: '9876543211',
    emailId: 'john.doe.updated@test.com',
    department: 'Marketing',
    designation: 'Marketing Manager',
    isActive: true,
  };
  
  try {
    const response = await makeRequest('put', `/library/teams/${teamId}`, updatedTeam);
    if (response.data.success) {
      console.log('✓ Update team successful');
      console.log('  Updated team member:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('✗ Update team failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function testDeleteTeam(teamId) {
  console.log('\n--- Testing DELETE /api/library/teams/:id ---');
  try {
    const response = await makeRequest('delete', `/library/teams/${teamId}`);
    if (response.data.success) {
      console.log('✓ Delete team successful');
      return true;
    }
  } catch (error) {
    console.error('✗ Delete team failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testValidation() {
  console.log('\n--- Testing Validation ---');
  
  // Test missing required fields
  const invalidTeam = {
    name: 'Test User',
    // Missing contactNumber, emailId, department, designation
  };
  
  try {
    await makeRequest('post', '/library/teams', invalidTeam);
    console.error('✗ Validation failed - should have rejected invalid data');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Validation working - rejected invalid data');
    } else {
      console.error('✗ Unexpected error:', error.response?.data?.error || error.message);
    }
  }
}

// Main test function
async function runTests() {
  console.log('========================================');
  console.log('Teams API Test Suite');
  console.log('========================================');
  
  // Step 1: Authenticate
  const authenticated = await getAuthToken();
  if (!authenticated) {
    console.error('\n✗ Cannot proceed without authentication');
    return;
  }
  
  // Step 2: Test GET (should be empty initially)
  await testGetTeams();
  
  // Step 3: Test CREATE
  const createdTeam = await testCreateTeam();
  if (!createdTeam) {
    console.error('\n✗ Cannot proceed - team creation failed');
    return;
  }
  
  // Step 4: Test GET again (should have one team now)
  await testGetTeams();
  
  // Step 5: Test UPDATE
  const updatedTeam = await testUpdateTeam(createdTeam.id);
  
  // Step 6: Test Validation
  await testValidation();
  
  // Step 7: Test DELETE (cleanup)
  if (updatedTeam) {
    await testDeleteTeam(updatedTeam.id);
  } else if (createdTeam) {
    await testDeleteTeam(createdTeam.id);
  }
  
  // Final GET to verify deletion
  await testGetTeams();
  
  console.log('\n========================================');
  console.log('Test Suite Completed');
  console.log('========================================');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

