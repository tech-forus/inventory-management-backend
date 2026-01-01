/**
 * Test script to upload Brand Excel file
 */

const xlsx = require('xlsx');
const fs = require('fs');

const EXCEL_FILE_PATH = process.argv[2] || 'C:\\Users\\abhis\\Downloads\\Brand_Upload_Template (1).xlsx';

function analyzeBrandFile(filePath) {
  console.log('='.repeat(70));
  console.log('Brand Upload File Analysis');
  console.log('='.repeat(70));
  console.log(`\nFile: ${filePath}\n`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`✗ File not found: ${filePath}`);
    return;
  }

  try {
    const workbook = xlsx.readFile(filePath);
    
    console.log(`✓ File read successfully`);
    console.log(`\nSheet Names: ${workbook.SheetNames.join(', ')}`);
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Sheet ${index + 1}: "${sheetName}"`);
      console.log('='.repeat(70));
      
      const worksheet = workbook.Sheets[sheetName];
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
      console.log(`\nRange: ${worksheet['!ref'] || 'Empty'}`);
      console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
      
      // Show first 10 rows
      console.log('\nFirst 10 rows:');
      for (let row = 0; row <= Math.min(9, range.e.r); row++) {
        const rowData = [];
        for (let col = 0; col <= Math.min(4, range.e.c); col++) {
          const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          const value = cell ? (cell.v !== undefined ? cell.v : '') : '';
          rowData.push(value);
        }
        console.log(`Row ${row + 1}: [${rowData.map(v => `"${v}"`).join(', ')}]`);
      }
      
      // Parse as JSON
      console.log('\n--- Parsed Data (first 5 rows) ---');
      const data = xlsx.utils.sheet_to_json(worksheet);
      console.log(`Total rows: ${data.length}`);
      data.slice(0, 5).forEach((row, idx) => {
        console.log(`Row ${idx + 1}:`, JSON.stringify(row, null, 2));
      });
    });
    
  } catch (error) {
    console.error('\n✗ Error reading file:', error.message);
    console.error(error.stack);
  }
}

analyzeBrandFile(EXCEL_FILE_PATH);


