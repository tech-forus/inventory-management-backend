/**
 * Test SKU Creation with Current Stock
 * Verifies that currentStock from frontend is used instead of defaulting to minStockLevel
 */

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/models/database');
const bcrypt = require('bcryptjs');

// Test data
let testCompanyId = 'TEST01';
let testToken = null;
let testUserId = null;
let testProductCategoryId = null;
let testItemCategoryId = null;
let testVendorId = null;
let testBrandId = null;

async function setupTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create test company if not exists
    const companyCheck = await client.query(
      'SELECT id FROM companies WHERE company_id = $1',
      [testCompanyId]
    );

    if (companyCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone, admin_full_name, admin_email, admin_phone, admin_password)
         VALUES ($1, 'Test Company', '29TEST1234F1Z5', 'Trading', 'Test Address', 'Test City', 'Test State', '123456', '1234567890', 'Test Admin', 'test@test.com', '1234567890', $2)`,
        [testCompanyId, await bcrypt.hash('test1234', 10)]
      );
    }

    // Create test user
    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password, full_name, phone, role)
       VALUES ($1, 'test@test.com', $2, 'Test User', '1234567890', 'super_admin')
       ON CONFLICT (company_id, email) DO UPDATE SET password = EXCLUDED.password
       RETURNING id`,
      [testCompanyId, await bcrypt.hash('test1234', 10)]
    );
    testUserId = userResult.rows[0].id;

    // Create product category
    const pcResult = await client.query(
      `INSERT INTO product_categories (company_id, name, description)
       VALUES ($1, 'Test Product Category', 'Test Description')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [testCompanyId]
    );
    if (pcResult.rows.length > 0) {
      testProductCategoryId = pcResult.rows[0].id;
    } else {
      const existing = await client.query(
        'SELECT id FROM product_categories WHERE company_id = $1 LIMIT 1',
        [testCompanyId]
      );
      testProductCategoryId = existing.rows[0].id;
    }

    // Create item category
    const icResult = await client.query(
      `INSERT INTO item_categories (company_id, product_category_id, name, description)
       VALUES ($1, $2, 'Test Item Category', 'Test Description')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [testCompanyId, testProductCategoryId]
    );
    if (icResult.rows.length > 0) {
      testItemCategoryId = icResult.rows[0].id;
    } else {
      const existing = await client.query(
        'SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1',
        [testCompanyId]
      );
      testItemCategoryId = existing.rows[0].id;
    }

    // Create vendor
    const vResult = await client.query(
      `INSERT INTO vendors (company_id, name, contact_person, email, phone)
       VALUES ($1, 'Test Vendor', 'Test Contact', 'vendor@test.com', '1234567890')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [testCompanyId]
    );
    if (vResult.rows.length > 0) {
      testVendorId = vResult.rows[0].id;
    } else {
      const existing = await client.query(
        'SELECT id FROM vendors WHERE company_id = $1 LIMIT 1',
        [testCompanyId]
      );
      testVendorId = existing.rows[0].id;
    }

    // Create brand
    const bResult = await client.query(
      `INSERT INTO brands (company_id, name, description)
       VALUES ($1, 'Test Brand', 'Test Description')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [testCompanyId]
    );
    if (bResult.rows.length > 0) {
      testBrandId = bResult.rows[0].id;
    } else {
      const existing = await client.query(
        'SELECT id FROM brands WHERE company_id = $1 LIMIT 1',
        [testCompanyId]
      );
      testBrandId = existing.rows[0].id;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getAuthToken() {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      companyId: testCompanyId,
      email: 'test@test.com',
      password: 'test1234'
    });

  if (response.status === 200 && response.body.success) {
    return response.body.data.token;
  }
  return null;
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Clean up test SKUs
    await client.query('DELETE FROM skus WHERE company_id = $1 AND item_name LIKE $2', [
      testCompanyId,
      'Test SKU%'
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

describe('SKU Current Stock Logic Test', () => {
  beforeAll(async () => {
    await setupTestData();
    testToken = await getAuthToken();
  });

  afterAll(async () => {
    await cleanup();
  });

  test('Should use currentStock from request instead of defaulting to minStockLevel', async () => {
    const skuData = {
      productCategoryId: testProductCategoryId,
      itemCategoryId: testItemCategoryId,
      itemName: 'Test SKU - Current Stock Test',
      vendorId: testVendorId,
      brandId: testBrandId,
      unit: 'Pieces',
      currentStock: 100, // User-entered current stock
      minStockLevel: 20, // Alert point
    };

    const response = await request(app)
      .post('/api/skus')
      .set('Authorization', `Bearer ${testToken}`)
      .set('x-company-id', testCompanyId)
      .send(skuData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    const createdSKU = response.body.data;

    // Verify current_stock = 100 (user-entered value)
    expect(createdSKU.current_stock).toBe(100);
    expect(createdSKU.current_stock).not.toBe(20);

    // Verify min_stock_level = 20 (alert point)
    expect(createdSKU.min_stock_level).toBe(20);

    // Verify available stock = current_stock - book_stocks = 100 - 0 = 100
    // (book_stocks should be 0 initially)
    const availableStock = createdSKU.current_stock - (createdSKU.book_stocks || 0);
    expect(availableStock).toBe(100);

    console.log('\n✅ Test Passed!');
    console.log(`   Current Stock: ${createdSKU.current_stock} (should be 100)`);
    console.log(`   Min Stock Level: ${createdSKU.min_stock_level} (should be 20)`);
    console.log(`   Available Stock: ${availableStock} (should be 100)`);
  });

  test('Should fallback to minStockLevel if currentStock is not provided', async () => {
    const skuData = {
      productCategoryId: testProductCategoryId,
      itemCategoryId: testItemCategoryId,
      itemName: 'Test SKU - Fallback Test',
      vendorId: testVendorId,
      brandId: testBrandId,
      unit: 'Pieces',
      // currentStock not provided
      minStockLevel: 30, // Should be used as fallback
    };

    const response = await request(app)
      .post('/api/skus')
      .set('Authorization', `Bearer ${testToken}`)
      .set('x-company-id', testCompanyId)
      .send(skuData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const createdSKU = response.body.data;

    // Verify current_stock = minStockLevel (fallback)
    expect(createdSKU.current_stock).toBe(30);
    expect(createdSKU.min_stock_level).toBe(30);

    console.log('\n✅ Fallback Test Passed!');
    console.log(`   Current Stock: ${createdSKU.current_stock} (should be 30, from minStockLevel)`);
    console.log(`   Min Stock Level: ${createdSKU.min_stock_level} (should be 30)`);
  });

  test('Should reject negative currentStock', async () => {
    const skuData = {
      productCategoryId: testProductCategoryId,
      itemCategoryId: testItemCategoryId,
      itemName: 'Test SKU - Negative Test',
      vendorId: testVendorId,
      brandId: testBrandId,
      unit: 'Pieces',
      currentStock: -10, // Invalid: negative value
      minStockLevel: 20,
    };

    const response = await request(app)
      .post('/api/skus')
      .set('Authorization', `Bearer ${testToken}`)
      .set('x-company-id', testCompanyId)
      .send(skuData);

    // Should reject negative currentStock
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('currentStock');

    console.log('\n✅ Validation Test Passed!');
    console.log(`   Negative currentStock correctly rejected`);
  });
});


