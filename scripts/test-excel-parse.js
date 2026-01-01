/**
 * Test script to verify Excel parsing logic
 */

const xlsx = require('xlsx');
const fs = require('fs');

const EXCEL_FILE_PATH = process.argv[2] || 'C:\\Users\\abhis\\Downloads\\Product_Upload_Template (1) (1).xlsx';

function testParsing(filePath) {
  console.log('='.repeat(70));
  console.log('Excel Parsing Test');
  console.log('='.repeat(70));
  console.log(`\nFile: ${filePath}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`✗ File not found: ${filePath}`);
    return;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`Sheet: ${sheetName}`);
    console.log(`Range: ${worksheet['!ref'] || 'Empty'}\n`);

    // Check first few rows
    console.log('First 5 rows (raw):');
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 10; c++) {
        const cell = worksheet[xlsx.utils.encode_cell({ r, c })];
        row.push(cell ? (cell.v !== undefined ? cell.v : '') : '');
      }
      console.log(`Row ${r + 1}:`, row);
    }

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

    console.log(`\nHas section headers: ${hasSectionHeaders}`);

    // Test parsing with section headers
    if (hasSectionHeaders) {
      console.log('\n--- Parsing with range: 1 (row 2 as headers) ---');
      const data1 = xlsx.utils.sheet_to_json(worksheet, {
        range: 1, // Start from row 2 (0-based index 1)
        defval: null,
        blankrows: false,
      });
      console.log(`Parsed ${data1.length} rows`);
      if (data1.length > 0) {
        console.log('Headers:', Object.keys(data1[0]));
        console.log('First data row:', JSON.stringify(data1[0], null, 2));
      }

      // Test with explicit header row
      console.log('\n--- Parsing with explicit header row (row 2) and data from row 3 ---');
      const headerRow = 1; // Row 2 (0-based index 1)
      const dataStartRow = 2; // Row 3 (0-based index 2)
      
      // Get headers from row 2
      const headers = [];
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let c = 0; c <= range.e.c; c++) {
        const cell = worksheet[xlsx.utils.encode_cell({ r: headerRow, c })];
        headers.push(cell && cell.v !== undefined ? cell.v : `__EMPTY_${c}`);
      }

      console.log('Headers:', headers);

      // Parse data starting from row 3
      const data2 = xlsx.utils.sheet_to_json(worksheet, {
        header: headers,
        range: dataStartRow,
        defval: null,
        blankrows: false,
      });
      console.log(`Parsed ${data2.length} rows`);
      if (data2.length > 0) {
        console.log('First data row:', JSON.stringify(data2[0], null, 2));
      }
    } else {
      console.log('\n--- Parsing without section headers ---');
      const data = xlsx.utils.sheet_to_json(worksheet);
      console.log(`Parsed ${data.length} rows`);
      if (data.length > 0) {
        console.log('Headers:', Object.keys(data[0]));
        console.log('First data row:', JSON.stringify(data[0], null, 2));
      }
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
  }
}

testParsing(EXCEL_FILE_PATH);


