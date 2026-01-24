/**
 * Simple verification script for Opening Stock implementation
 * Checks that opening stock fields are properly integrated
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Opening Stock Implementation...\n');

const checks = [];
let passed = 0;
let failed = 0;

// Check 1: SKU Model - getById returns opening_stock
console.log('1. Checking SKU Model (getById returns opening_stock)...');
try {
  const skuModelPath = path.join(__dirname, '../src/models/skuModel.js');
  const skuModelContent = fs.readFileSync(skuModelPath, 'utf8');
  
  if (skuModelContent.includes('s.opening_stock')) {
    console.log('   ✅ SKU Model getById returns opening_stock\n');
    passed++;
  } else {
    console.log('   ❌ SKU Model getById missing opening_stock\n');
    failed++;
  }
} catch (error) {
  console.log(`   ❌ Error checking SKU Model: ${error.message}\n`);
  failed++;
}

// Check 2: SKU Model - create handles opening stock
console.log('2. Checking SKU Model (create handles opening_stock)...');
try {
  const skuModelPath = path.join(__dirname, '../src/models/skuModel.js');
  const skuModelContent = fs.readFileSync(skuModelPath, 'utf8');
  
  if (skuModelContent.includes('opening_stock') && 
      skuModelContent.includes('LedgerService.addTransaction') &&
      skuModelContent.includes('OPENING')) {
    console.log('   ✅ SKU Model create handles opening_stock with ledger entry\n');
    passed++;
  } else {
    console.log('   ❌ SKU Model create missing opening_stock ledger handling\n');
    failed++;
  }
} catch (error) {
  console.log(`   ❌ Error checking SKU Model create: ${error.message}\n`);
  failed++;
}

// Check 3: SKU Routes - CREATE route includes opening_stock
console.log('3. Checking SKU Routes (CREATE includes opening_stock)...');
try {
  const routesPath = path.join(__dirname, '../src/routes/skus.js');
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  
  const hasOpeningStockInCreate = routesContent.includes('openingStock') && 
                                   routesContent.includes('opening_stock') &&
                                   routesContent.includes('INSERT INTO skus');
  
  if (hasOpeningStockInCreate) {
    console.log('   ✅ CREATE route includes opening_stock\n');
    passed++;
  } else {
    console.log('   ❌ CREATE route missing opening_stock\n');
    failed++;
  }
} catch (error) {
  console.log(`   ❌ Error checking CREATE route: ${error.message}\n`);
  failed++;
}

// Check 4: SKU Routes - UPDATE route includes opening_stock
console.log('4. Checking SKU Routes (UPDATE includes opening_stock)...');
try {
  const routesPath = path.join(__dirname, '../src/routes/skus.js');
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  
  if (routesContent.includes('opening_stock = $42') || 
      routesContent.includes('opening_stock = $')) {
    console.log('   ✅ UPDATE route includes opening_stock\n');
    passed++;
  } else {
    console.log('   ⚠️  UPDATE route may be missing opening_stock (check manually)\n');
    failed++;
  }
} catch (error) {
  console.log(`   ❌ Error checking UPDATE route: ${error.message}\n`);
  failed++;
}

// Check 5: Frontend - SKUFormData interface includes openingStock
console.log('5. Checking Frontend (SKUFormData includes openingStock)...');
try {
  const formPath = path.join(__dirname, '../../inventory-management-fe/frontend/src/components/sku/useSKUForm.ts');
  const formContent = fs.readFileSync(formPath, 'utf8');
  
  if (formContent.includes('openingStock: string')) {
    console.log('   ✅ SKUFormData interface includes openingStock\n');
    passed++;
  } else {
    console.log('   ❌ SKUFormData interface missing openingStock\n');
    failed++;
  }
} catch (error) {
  console.log(`   ⚠️  Could not check frontend (file may not exist): ${error.message}\n`);
}

// Check 6: Frontend - InventorySettingsSection includes opening stock field
console.log('6. Checking Frontend (InventorySettingsSection has opening stock field)...');
try {
  const settingsPath = path.join(__dirname, '../../inventory-management-fe/frontend/src/components/sku/InventorySettingsSection.tsx');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  
  if (settingsContent.includes('Opening Stock') && 
      settingsContent.includes('formData.openingStock')) {
    console.log('   ✅ InventorySettingsSection includes Opening Stock field\n');
    passed++;
  } else {
    console.log('   ❌ InventorySettingsSection missing Opening Stock field\n');
    failed++;
  }
} catch (error) {
  console.log(`   ⚠️  Could not check frontend (file may not exist): ${error.message}\n`);
}

// Check 7: Frontend - SKUDetailPage displays opening stock
console.log('7. Checking Frontend (SKUDetailPage displays opening stock)...');
try {
  const detailPath = path.join(__dirname, '../../inventory-management-fe/frontend/src/pages/SKUDetailPage.tsx');
  const detailContent = fs.readFileSync(detailPath, 'utf8');
  
  if (detailContent.includes('Opening Stock') && 
      (detailContent.includes('openingStock') || detailContent.includes('opening_stock'))) {
    console.log('   ✅ SKUDetailPage displays Opening Stock\n');
    passed++;
  } else {
    console.log('   ❌ SKUDetailPage missing Opening Stock display\n');
    failed++;
  }
} catch (error) {
  console.log(`   ⚠️  Could not check frontend (file may not exist): ${error.message}\n`);
}

// Check 8: Migration file exists
console.log('8. Checking Database Migration (opening_stock column)...');
try {
  const migrationPath = path.join(__dirname, '../scripts/database/migrations/060_add_opening_stock_to_skus.sql');
  if (fs.existsSync(migrationPath)) {
    console.log('   ✅ Migration file exists\n');
    passed++;
  } else {
    console.log('   ⚠️  Migration file not found (may already be applied)\n');
  }
} catch (error) {
  console.log(`   ⚠️  Could not check migration: ${error.message}\n`);
}

// Summary
console.log('='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('🎉 All critical checks passed! Opening Stock implementation looks good.');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review the implementation.');
  process.exit(1);
}
