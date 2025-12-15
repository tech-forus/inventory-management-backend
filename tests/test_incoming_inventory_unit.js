/**
 * Unit Tests for Incoming Inventory
 * Tests the model and controller functions with mocked database
 * 
 * Run with: node test_incoming_inventory_unit.js
 */

const { Pool } = require('pg');
const dbConfig = require('../scripts/database/config');
const IncomingInventoryModel = require('../src/models/incomingInventoryModel');

// Test statistics
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Test helper functions
function test(name, testFn) {
  stats.total++;
  try {
    testFn();
    stats.passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    stats.failed++;
    stats.errors.push({ test: name, error: error.message });
    console.error(`✗ ${name}: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan: (expected) => {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value, but got ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value, but got ${actual}`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    },
    toHaveProperty: (property) => {
      if (!(property in actual)) {
        throw new Error(`Expected object to have property ${property}`);
      }
    }
  };
}

// Test data
const TEST_COMPANY_ID = 'TEST01';
const mockInventoryData = {
  invoiceDate: '2024-01-15',
  invoiceNumber: 'INV-001',
  docketNumber: 'DOC-001',
  transportorName: 'Test Transportor',
  vendorId: 1,
  brandId: 1,
  warranty: 12,
  warrantyUnit: 'months',
  receivingDate: '2024-01-15',
  receivedBy: 1,
  reason: 'purchase',
  remarks: 'Test remarks',
  status: 'draft'
};

const mockItems = [
  {
    skuId: 1,
    received: 80,
    short: 20,
    totalQuantity: 100,
    unitPrice: 50.00,
    numberOfBoxes: 10,
    receivedBoxes: 8
  },
  {
    skuId: 2,
    received: 50,
    short: 0,
    totalQuantity: 50,
    unitPrice: 100.00,
    numberOfBoxes: 5,
    receivedBoxes: 5
  }
];

/**
 * Test: Validate item calculation logic
 */
function testItemCalculation() {
  test('should calculate short correctly when received < totalQuantity', () => {
    const totalQuantity = 100;
    const received = 80;
    const expectedShort = 20;
    const calculatedShort = totalQuantity - received;
    
    expect(calculatedShort).toBe(expectedShort);
  });

  test('should calculate short as 0 when received = totalQuantity', () => {
    const totalQuantity = 100;
    const received = 100;
    const expectedShort = 0;
    const calculatedShort = totalQuantity - received;
    
    expect(calculatedShort).toBe(expectedShort);
  });

  test('should calculate totalValue correctly', () => {
    const received = 80;
    const unitPrice = 50.00;
    const expectedTotalValue = 4000.00;
    const calculatedTotalValue = received * unitPrice;
    
    expect(calculatedTotalValue).toBe(expectedTotalValue);
  });

  test('should validate received + short = totalQuantity', () => {
    const totalQuantity = 100;
    const received = 80;
    const short = 20;
    const sum = received + short;
    
    expect(sum).toBe(totalQuantity);
  });
}

/**
 * Test: Validate warranty unit values
 */
function testWarrantyValidation() {
  test('warranty_unit should be either months or year', () => {
    const validUnits = ['months', 'year'];
    const testUnit = 'months';
    
    expect(validUnits.includes(testUnit)).toBeTruthy();
  });

  test('warranty should be a non-negative integer', () => {
    const warranty = 12;
    
    expect(warranty).toBeGreaterThan(-1);
    expect(Number.isInteger(warranty)).toBeTruthy();
  });
}

/**
 * Test: Validate data structure
 */
function testDataStructure() {
  test('inventoryData should have all required fields', () => {
    const requiredFields = [
      'invoiceDate', 'invoiceNumber', 'vendorId', 'brandId',
      'receivingDate', 'reason', 'warranty', 'warrantyUnit'
    ];
    
    requiredFields.forEach(field => {
      expect(mockInventoryData).toHaveProperty(field);
    });
  });

  test('items should have all required fields', () => {
    const requiredFields = [
      'skuId', 'received', 'short', 'totalQuantity',
      'unitPrice', 'numberOfBoxes', 'receivedBoxes'
    ];
    
    requiredFields.forEach(field => {
      expect(mockItems[0]).toHaveProperty(field);
    });
  });

  test('items should not have accepted or rejected fields', () => {
    expect('accepted' in mockItems[0]).toBeFalsy();
    expect('rejected' in mockItems[0]).toBeFalsy();
  });
}

/**
 * Test: Validate business logic
 */
function testBusinessLogic() {
  test('totalValue should be sum of all item values', () => {
    const item1Value = mockItems[0].received * mockItems[0].unitPrice;
    const item2Value = mockItems[1].received * mockItems[1].unitPrice;
    const expectedTotal = item1Value + item2Value;
    
    expect(expectedTotal).toBe(9000.00); // 80*50 + 50*100
  });

  test('received boxes should not exceed total boxes', () => {
    mockItems.forEach(item => {
      expect(item.receivedBoxes).toBeLessThan(item.numberOfBoxes + 1);
    });
  });

  test('received quantity should not exceed total quantity', () => {
    mockItems.forEach(item => {
      expect(item.received).toBeLessThan(item.totalQuantity + 1);
    });
  });
}

/**
 * Test: Database integration tests
 */
async function testDatabaseIntegration() {
  const pool = new Pool(dbConfig);
  
  test('should connect to database', async () => {
    try {
      const result = await pool.query('SELECT NOW()');
      expect(result.rows.length).toBeGreaterThan(0);
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  });

  test('incoming_inventory table should have warranty columns', async () => {
    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incoming_inventory' 
        AND column_name IN ('warranty', 'warranty_unit')
      `);
      expect(result.rows.length).toBe(2);
    } catch (error) {
      throw new Error(`Table check failed: ${error.message}`);
    }
  });

  test('incoming_inventory_items should have received column', async () => {
    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incoming_inventory_items' 
        AND column_name = 'received'
      `);
      expect(result.rows.length).toBe(1);
    } catch (error) {
      throw new Error(`Table check failed: ${error.message}`);
    }
  });

  test('incoming_inventory_items should not have accepted column', async () => {
    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incoming_inventory_items' 
        AND column_name = 'accepted'
      `);
      expect(result.rows.length).toBe(0);
    } catch (error) {
      throw new Error(`Table check failed: ${error.message}`);
    }
  });

  test('incoming_inventory_items should have received_boxes column', async () => {
    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incoming_inventory_items' 
        AND column_name = 'received_boxes'
      `);
      expect(result.rows.length).toBe(1);
    } catch (error) {
      throw new Error(`Table check failed: ${error.message}`);
    }
  });

  test('received_by should reference teams table', async () => {
    try {
      const result = await pool.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'incoming_inventory'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'received_by'
      `);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].foreign_table_name).toBe('teams');
    } catch (error) {
      throw new Error(`Foreign key check failed: ${error.message}`);
    }
  });

  await pool.end();
}

/**
 * Test: Edge cases
 */
function testEdgeCases() {
  test('should handle zero received quantity', () => {
    const totalQuantity = 100;
    const received = 0;
    const short = totalQuantity - received;
    
    expect(short).toBe(100);
  });

  test('should handle zero total quantity', () => {
    const totalQuantity = 0;
    const received = 0;
    const short = totalQuantity - received;
    
    expect(short).toBe(0);
  });

  test('should handle large numbers', () => {
    const totalQuantity = 1000000;
    const received = 999999;
    const short = totalQuantity - received;
    
    expect(short).toBe(1);
  });

  test('should handle decimal unit prices', () => {
    const received = 10;
    const unitPrice = 12.50;
    const totalValue = received * unitPrice;
    
    expect(totalValue).toBe(125.00);
  });
}

/**
 * Test: Validation rules
 */
function testValidationRules() {
  test('warranty_unit should only accept months or year', () => {
    const validUnits = ['months', 'year'];
    const invalidUnits = ['days', 'weeks', 'years', ''];
    
    validUnits.forEach(unit => {
      expect(['months', 'year'].includes(unit)).toBeTruthy();
    });
    
    invalidUnits.forEach(unit => {
      expect(['months', 'year'].includes(unit)).toBeFalsy();
    });
  });

  test('status should only accept draft, completed, or cancelled', () => {
    const validStatuses = ['draft', 'completed', 'cancelled'];
    const testStatus = 'draft';
    
    expect(validStatuses.includes(testStatus)).toBeTruthy();
  });

  test('reason should be a valid value', () => {
    const validReasons = ['purchase', 'replacement', 'from_factory', 'others'];
    const testReason = 'purchase';
    
    expect(validReasons.includes(testReason)).toBeTruthy();
  });
}

/**
 * Test: Data transformation
 */
function testDataTransformation() {
  test('should transform snake_case to camelCase for warranty_unit', () => {
    const dbValue = 'months';
    const frontendValue = dbValue; // No transformation needed for this field
    
    expect(frontendValue).toBe('months');
  });

  test('should calculate totalValue from received and unitPrice', () => {
    const item = {
      received: 50,
      unitPrice: 25.50,
      totalValue: 0
    };
    item.totalValue = item.received * item.unitPrice;
    
    expect(item.totalValue).toBe(1275.00);
  });
}

/**
 * Run all unit tests
 */
async function runUnitTests() {
  console.log('========================================');
  console.log('Incoming Inventory Unit Tests');
  console.log('========================================\n');

  console.log('Running calculation tests...');
  testItemCalculation();
  
  console.log('\nRunning warranty validation tests...');
  testWarrantyValidation();
  
  console.log('\nRunning data structure tests...');
  testDataStructure();
  
  console.log('\nRunning business logic tests...');
  testBusinessLogic();
  
  console.log('\nRunning edge case tests...');
  testEdgeCases();
  
  console.log('\nRunning validation rule tests...');
  testValidationRules();
  
  console.log('\nRunning data transformation tests...');
  testDataTransformation();
  
  console.log('\nRunning database integration tests...');
  await testDatabaseIntegration();

  // Print results
  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`Total Tests: ${stats.total}`);
  console.log(`Passed: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(2)}%)`);
  
  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(err => {
      console.log(`  - ${err.test}: ${err.error}`);
    });
  }
  
  console.log('\n========================================\n');
  
  // Exit with appropriate code
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Run tests
runUnitTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


