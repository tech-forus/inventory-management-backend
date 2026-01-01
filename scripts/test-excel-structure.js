/**
 * Test script to read and analyze Excel file structure
 */

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_FILE_PATH = process.argv[2] || 'C:\\Users\\abhis\\Downloads\\Category_Master_Upload_Template (1).xlsx';

function analyzeExcelFile(filePath) {
  console.log('='.repeat(60));
  console.log('Excel File Structure Analysis');
  console.log('='.repeat(60));
  console.log(`\nFile: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`\n✗ File not found: ${filePath}`);
    return;
  }

  try {
    const workbook = xlsx.readFile(filePath);
    
    console.log(`\n✓ File read successfully`);
    console.log(`\nSheet Names: ${workbook.SheetNames.join(', ')}`);
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Sheet ${index + 1}: "${sheetName}"`);
      console.log('='.repeat(60));
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Get the range of the sheet
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
      console.log(`\nRange: ${worksheet['!ref'] || 'Empty'}`);
      console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
      
      // Show first 10 rows
      console.log('\nFirst 10 rows:');
      for (let row = 0; row <= Math.min(9, range.e.r); row++) {
        const rowData = [];
        for (let col = 0; col <= Math.min(2, range.e.c); col++) {
          const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
          rowData.push(value);
        }
        console.log(`Row ${row + 1}: [${rowData.map(v => `"${v}"`).join(', ')}]`);
      }
      
      // Try to find header row
      console.log('\nSearching for header row...');
      let headerRowFound = -1;
      for (let i = 0; i <= Math.min(9, range.e.r); i++) {
        const cellA = worksheet[xlsx.utils.encode_cell({ r: i, c: 0 })];
        if (cellA && cellA.v && cellA.v.toString().toLowerCase().includes('product category')) {
          headerRowFound = i;
          console.log(`✓ Header row found at index ${i} (Row ${i + 1})`);
          break;
        }
      }
      
      if (headerRowFound === -1) {
        console.log('✗ Header row not found in first 10 rows');
      }
      
      // Parse with different range options
      console.log('\n--- Testing Parsing with range: 1 (starts from row 2) ---');
      const data1 = xlsx.utils.sheet_to_json(worksheet, {
        header: ['Product Category', 'Item Category', 'Sub Category'],
        range: 1,
        defval: null,
        blankrows: false,
      });
      console.log(`Parsed ${data1.length} rows`);
      if (data1.length > 0) {
        console.log('First 3 parsed rows:');
        data1.slice(0, 3).forEach((row, idx) => {
          console.log(`  ${idx + 1}. Product: "${row['Product Category']}", Item: "${row['Item Category']}", Sub: "${row['Sub Category']}"`);
        });
      }
      
      if (headerRowFound >= 0) {
        const dataStartRow = headerRowFound + 1;
        console.log(`\n--- Testing Parsing with range: ${dataStartRow} (starts from row ${dataStartRow + 1}) ---`);
        const data2 = xlsx.utils.sheet_to_json(worksheet, {
          header: ['Product Category', 'Item Category', 'Sub Category'],
          range: dataStartRow,
          defval: null,
          blankrows: false,
        });
        console.log(`Parsed ${data2.length} rows`);
        if (data2.length > 0) {
          console.log('First 3 parsed rows:');
          data2.slice(0, 3).forEach((row, idx) => {
            console.log(`  ${idx + 1}. Product: "${row['Product Category']}", Item: "${row['Item Category']}", Sub: "${row['Sub Category']}"`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('\n✗ Error reading file:', error.message);
    console.error(error.stack);
  }
}

analyzeExcelFile(EXCEL_FILE_PATH);


