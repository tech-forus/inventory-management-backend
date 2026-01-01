/**
 * Test script to analyze Product Upload Template
 */

const xlsx = require('xlsx');
const fs = require('fs');

const EXCEL_FILE_PATH = process.argv[2] || 'C:\\Users\\abhis\\Downloads\\Product_Upload_Template .xlsx';

function analyzeTemplate(filePath) {
  console.log('='.repeat(70));
  console.log('Product Upload Template Analysis');
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
      
      // Parse as JSON to see headers and data
      const data = xlsx.utils.sheet_to_json(worksheet);
      console.log(`\nTotal data rows: ${data.length}`);
      
      if (data.length > 0) {
        console.log('\nColumn Headers:');
        const headers = Object.keys(data[0]);
        headers.forEach((header, idx) => {
          console.log(`  ${idx + 1}. "${header}"`);
        });
        
        console.log('\nFirst row data:');
        console.log(JSON.stringify(data[0], null, 2));
      }
    });
    
  } catch (error) {
    console.error('\n✗ Error reading file:', error.message);
    console.error(error.stack);
  }
}

analyzeTemplate(EXCEL_FILE_PATH);


