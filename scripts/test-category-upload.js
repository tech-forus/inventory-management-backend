/**
 * Test script to upload Category Master Excel file
 * Usage: node scripts/test-category-upload.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const EXCEL_FILE_PATH = process.argv[2] || 'C:\\Users\\abhis\\Downloads\\Category_Master_Upload_Template (1).xlsx';

// Test credentials - update these if needed
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@gjiper.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';
const TEST_COMPANY_ID = process.env.TEST_COMPANY_ID || 'GJIPER';

async function login() {
  console.log('\n1. Logging in...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      companyId: TEST_COMPANY_ID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (response.data.success && response.data.token) {
      console.log('✓ Login successful');
      return response.data.token;
    } else {
      throw new Error('Login failed: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function uploadCategories(token, filePath) {
  console.log('\n2. Uploading category master file...');
  console.log(`   File: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await axios.post(
      `${API_BASE_URL}/api/categories/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.success) {
      console.log('✓ Upload successful!');
      console.log('\nUpload Summary:');
      console.log('Product Categories:', JSON.stringify(response.data.productCategories, null, 2));
      console.log('Item Categories:', JSON.stringify(response.data.itemCategories, null, 2));
      console.log('Sub Categories:', JSON.stringify(response.data.subCategories, null, 2));
      
      if (response.data.productCategories?.errorDetails?.length > 0) {
        console.log('\n⚠ Product Category Errors:');
        response.data.productCategories.errorDetails.forEach(err => {
          console.log(`  - ${err.error}`);
        });
      }
      if (response.data.itemCategories?.errorDetails?.length > 0) {
        console.log('\n⚠ Item Category Errors:');
        response.data.itemCategories.errorDetails.forEach(err => {
          console.log(`  - ${err.error}`);
        });
      }
      if (response.data.subCategories?.errorDetails?.length > 0) {
        console.log('\n⚠ Sub Category Errors:');
        response.data.subCategories.errorDetails.forEach(err => {
          console.log(`  - ${err.error}`);
        });
      }
      
      return response.data;
    } else {
      throw new Error('Upload failed: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('✗ Upload failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('  Error details:', error.response.data.error);
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Category Master Upload Test');
    console.log('='.repeat(60));
    
    const token = await login();
    await uploadCategories(token, EXCEL_FILE_PATH);
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ Test completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('✗ Test failed:', error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

main();

