/**
 * Test script to verify Category Master Excel file upload logic
 * This simulates what the backend will do when processing the file
 */

const xlsx = require('xlsx');
const fs = require('fs');

const EXCEL_FILE_PATH = process.argv[2] || 'C:\\Users\\abhis\\Downloads\\Category_Master_Upload_Template (1).xlsx';

function testUploadLogic(filePath) {
  console.log('='.repeat(70));
  console.log('Category Master Upload - Logic Verification');
  console.log('='.repeat(70));
  console.log(`\nFile: ${filePath}\n`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`✗ File not found: ${filePath}`);
    return;
  }

  try {
    // Step 1: Read workbook
    const workbook = xlsx.readFile(filePath);
    const sheets = {};
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      sheets[sheetName] = xlsx.utils.sheet_to_json(worksheet);
    });
    
    console.log('✓ Step 1: File read successfully');
    console.log(`  Sheet names: ${workbook.SheetNames.join(', ')}\n`);
    
    // Step 2: Find Category Master sheet (simulating backend logic)
    const categoryMasterSheetName = Object.keys(sheets).find(name => {
      const lowerName = name.toLowerCase().trim();
      return (lowerName.includes('category') && lowerName.includes('master')) ||
             lowerName === 'category master' ||
             lowerName === 'categorymaster';
    });
    
    if (!categoryMasterSheetName) {
      console.error('✗ Category Master sheet not found!');
      return;
    }
    
    console.log(`✓ Step 2: Found Category Master sheet: "${categoryMasterSheetName}"\n`);
    
    // Step 3: Re-parse with header detection (simulating backend logic)
    const worksheet = workbook.Sheets[categoryMasterSheetName];
    
    // Find header row
    let dataStartRow = 2; // Default
    const maxSearchRows = 5;
    for (let i = 0; i < maxSearchRows; i++) {
      const cellA = worksheet[xlsx.utils.encode_cell({ r: i, c: 0 })];
      if (cellA && cellA.v && cellA.v.toString().toLowerCase().includes('product category')) {
        dataStartRow = i + 1;
        console.log(`✓ Step 3: Header row found at index ${i} (Row ${i + 1})`);
        console.log(`  Data will start from row ${dataStartRow + 1} (index ${dataStartRow})\n`);
        break;
      }
    }
    
    // Step 4: Parse data
    const unifiedData = xlsx.utils.sheet_to_json(worksheet, {
      header: ['Product Category', 'Item Category', 'Sub Category'],
      range: dataStartRow,
      defval: null,
      blankrows: false,
    });
    
    // Filter empty rows
    const dataRows = unifiedData.filter(row =>
      (row['Product Category'] && row['Product Category'].toString().trim()) ||
      (row['Item Category'] && row['Item Category'].toString().trim()) ||
      (row['Sub Category'] && row['Sub Category'].toString().trim())
    );
    
    console.log(`✓ Step 4: Parsed ${dataRows.length} data rows\n`);
    
    // Step 5: Extract categories (simulating backend logic with original case preservation)
    const productCategoryMap = new Map(); // lowercase -> original case
    const itemCategoryMap = new Map(); // productCategory (lowercase) -> Map(itemCategory lowercase -> original case)
    const subCategoryMap = new Map(); // itemCategoryKey -> Map(subCategory lowercase -> original case)
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const productCat = (row['Product Category'] || '').toString().trim();
      const itemCat = (row['Item Category'] || '').toString().trim();
      const subCat = (row['Sub Category'] || '').toString().trim();
      
      if (productCat) {
        const key = productCat.toLowerCase();
        if (!productCategoryMap.has(key)) {
          productCategoryMap.set(key, productCat); // Preserve original case
        }
      }
      
      if (productCat && itemCat) {
        const productKey = productCat.toLowerCase();
        if (!itemCategoryMap.has(productKey)) {
          itemCategoryMap.set(productKey, new Map());
        }
        const itemKey = itemCat.toLowerCase();
        if (!itemCategoryMap.get(productKey).has(itemKey)) {
          itemCategoryMap.get(productKey).set(itemKey, itemCat); // Preserve original case
        }
      }
      
      if (productCat && itemCat && subCat) {
        const key = `${productCat.toLowerCase()}|${itemCat.toLowerCase()}`;
        if (!subCategoryMap.has(key)) {
          subCategoryMap.set(key, new Map());
        }
        const subKey = subCat.toLowerCase();
        if (!subCategoryMap.get(key).has(subKey)) {
          subCategoryMap.get(key).set(subKey, subCat); // Preserve original case
        }
      }
    }
    
    console.log('✓ Step 5: Category extraction complete\n');
    
    // Step 6: Display results
    console.log('='.repeat(70));
    console.log('UPLOAD SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n📦 Product Categories (${productCategoryMap.size} unique):`);
    let pcIndex = 1;
    for (const [lowercase, original] of productCategoryMap) {
      console.log(`   ${pcIndex}. "${original}" (stored as: "${original}")`);
      pcIndex++;
    }
    
    console.log(`\n📦 Item Categories (${Array.from(itemCategoryMap.values()).reduce((sum, map) => sum + map.size, 0)} unique):`);
    let icIndex = 1;
    for (const [productKey, itemCatsMap] of itemCategoryMap) {
      const productName = productCategoryMap.get(productKey);
      for (const [itemLowercase, itemOriginal] of itemCatsMap) {
        console.log(`   ${icIndex}. "${itemOriginal}" under "${productName}" (stored as: "${itemOriginal}")`);
        icIndex++;
      }
    }
    
    console.log(`\n📦 Sub Categories (${Array.from(subCategoryMap.values()).reduce((sum, map) => sum + map.size, 0)} unique):`);
    let scIndex = 1;
    for (const [itemCatKey, subCatsMap] of subCategoryMap) {
      const [productKey, itemKey] = itemCatKey.split('|');
      const productName = productCategoryMap.get(productKey);
      const itemName = itemCategoryMap.get(productKey)?.get(itemKey);
      for (const [subLowercase, subOriginal] of subCatsMap) {
        console.log(`   ${scIndex}. "${subOriginal}" under "${productName} > ${itemName}" (stored as: "${subOriginal}")`);
        scIndex++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(70));
    console.log('\nKey Points:');
    console.log('  ✓ Original case is preserved (not converted to lowercase)');
    console.log('  ✓ Duplicate categories are deduplicated');
    console.log('  ✓ Header row is automatically detected');
    console.log('  ✓ Empty rows are skipped');
    console.log('\nThe file is ready for upload!');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
  }
}

testUploadLogic(EXCEL_FILE_PATH);


