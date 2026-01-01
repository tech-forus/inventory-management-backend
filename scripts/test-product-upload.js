/**
 * Test script to test Product Upload functionality
 */

const xlsx = require('xlsx');
const fs = require('fs');
const axios = require('axios');

const EXCEL_FILE_PATH = process.argv[2] || 'C:\\Users\\abhis\\Downloads\\Product_Upload_Template (1) (1).xlsx';
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test credentials - you may need to update these
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password';
const TEST_COMPANY_ID = process.env.TEST_COMPANY_ID || 'TEST01';

async function testUpload() {
  console.log('='.repeat(70));
  console.log('Product Upload Test');
  console.log('='.repeat(70));
  console.log(`\nFile: ${EXCEL_FILE_PATH}\n`);

  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    console.error(`✗ File not found: ${EXCEL_FILE_PATH}`);
    return;
  }

  try {
    // Step 1: Login to get token
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      companyId: TEST_COMPANY_ID,
    });

    if (!loginResponse.data.token) {
      console.error('✗ Login failed: No token received');
      console.log('Response:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✓ Login successful\n');

    // Step 2: Read and parse Excel file
    console.log('Step 2: Reading Excel file...');
    const fileBuffer = fs.readFileSync(EXCEL_FILE_PATH);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Check if first row contains section headers
    const firstRowCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: 0 })];
    const hasSectionHeaders = firstRowCell && (
      firstRowCell.v && (
        firstRowCell.v.toString().includes('Basic Information') ||
        firstRowCell.v.toString().includes('Vendor & Brand') ||
        firstRowCell.v.toString().includes('Product Specifications') ||
        firstRowCell.v.toString().includes('Inventory Settings')
      )
    );

    console.log(`Sheet: ${sheetName}`);
    console.log(`Has section headers: ${hasSectionHeaders}`);

    // Parse with section header detection
    let data;
    if (hasSectionHeaders) {
      data = xlsx.utils.sheet_to_json(worksheet, {
        range: 1, // Start from row 2 (0-based index 1)
        defval: null,
        blankrows: false,
      });
    } else {
      data = xlsx.utils.sheet_to_json(worksheet);
    }

    console.log(`✓ Parsed ${data.length} rows\n`);

    // Show first row structure
    if (data.length > 0) {
      console.log('First row structure:');
      console.log(JSON.stringify(data[0], null, 2));
      console.log('\n');
    }

    // Step 3: Upload file
    console.log('Step 3: Uploading file...');
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'Product_Upload_Template.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/skus/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('✓ Upload response:');
    console.log(JSON.stringify(uploadResponse.data, null, 2));

    if (uploadResponse.data.success) {
      console.log(`\n✓ Successfully uploaded ${uploadResponse.data.inserted} products`);
      if (uploadResponse.data.errors > 0) {
        console.log(`⚠ ${uploadResponse.data.errors} errors occurred`);
        if (uploadResponse.data.errorDetails) {
          console.log('\nError details:');
          uploadResponse.data.errorDetails.forEach((err, idx) => {
            console.log(`  ${idx + 1}. Row ${err.row}: ${err.error}`);
          });
        }
      }
    } else {
      console.log(`\n✗ Upload failed: ${uploadResponse.data.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

testUpload();


