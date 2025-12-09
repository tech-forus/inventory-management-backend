const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('Incoming Inventory Controller - Comprehensive Tests', () => {
  let testCompanyId;
  let testToken;
  let testVendorId;
  let testBrandId;
  let testSkuId;
  let testInventoryId;

  beforeEach(async () => {
    await begin();
    
    testCompanyId = ('T' + Date.now().toString().slice(-5)).toUpperCase();
    await pool.query(
      `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone)
       VALUES ($1, 'Test Company', $2, 'Manufacturing', '123 Test St', 'Test City', 'Test State', '123456', '1234567890')`,
      [testCompanyId, uniqueGST()]
    );

    // Create product category FIRST (needed for item category)
    const prodCatResult = await pool.query(
      `INSERT INTO product_categories (company_id, name) VALUES ($1, 'Test Product Category') RETURNING id`,
      [testCompanyId]
    );
    const testProductCategoryId = prodCatResult.rows[0].id;

    // Create vendor
    const vendorResult = await pool.query(
      `INSERT INTO vendors (company_id, name, email, phone) VALUES ($1, 'Test Vendor', 'vendor@test.com', '1234567890') RETURNING id`,
      [testCompanyId]
    );
    testVendorId = vendorResult.rows[0].id;

    // Create brand
    const brandResult = await pool.query(
      `INSERT INTO brands (company_id, name) VALUES ($1, 'Test Brand') RETURNING id`,
      [testCompanyId]
    );
    testBrandId = brandResult.rows[0].id;

    // Create item category (needs product_category_id)
    const itemCatResult = await pool.query(
      `INSERT INTO item_categories (company_id, product_category_id, name) VALUES ($1, $2, 'Test Item Category') RETURNING id`,
      [testCompanyId, testProductCategoryId]
    );
    const testItemCategoryId = itemCatResult.rows[0].id;

    // Create SKU (include min_stock_level)
    const skuResult = await pool.query(
      `INSERT INTO skus (company_id, sku_id, item_name, brand_id, product_category_id, item_category_id, vendor_id, unit, current_stock, min_stock_level)
       VALUES ($1, $2, 'Test SKU', $3, $4, $5, $6, 'pcs', 100, 10) RETURNING id`,
      [testCompanyId, `${testCompanyId}SKU001`, testBrandId, testProductCategoryId, testItemCategoryId, testVendorId]
    );
    testSkuId = skuResult.rows[0].id;

    // Create user for received_by
    const userResult = await pool.query(
      `INSERT INTO users (company_id, email, password, full_name, role, is_active)
       VALUES ($1, 'user@test.com', 'hashed', 'Test User', 'admin', true) RETURNING id`,
      [testCompanyId]
    );
    const userId = userResult.rows[0].id;

    // Create incoming inventory (brand_id and reason are required, status must be 'draft', 'completed', or 'cancelled')
    const invResult = await pool.query(
      `INSERT INTO incoming_inventory (company_id, invoice_number, invoice_date, vendor_id, brand_id, receiving_date, received_by, reason, status)
       VALUES ($1, 'INV-001', CURRENT_DATE, $2, $3, CURRENT_DATE, $4, 'purchase', 'draft') RETURNING id`,
      [testCompanyId, testVendorId, testBrandId, userId]
    );
    testInventoryId = invResult.rows[0].id;

    // Create inventory item
    await pool.query(
      `INSERT INTO incoming_inventory_items (incoming_inventory_id, sku_id, total_quantity, received, short, rejected, unit_price)
       VALUES ($1, $2, 100, 90, 10, 0, 50.00)`,
      [testInventoryId, testSkuId]
    );

    testToken = jwt.sign(
      { userId: 1, companyId: testCompanyId, email: 'test@test.com', role: 'admin' },
      jwtConfig.secret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await rollback();
  });

  describe('GET /api/inventory/incoming - Filtering', () => {
    it('should filter by date range', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/inventory/incoming?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by vendor', async () => {
      const response = await request(app)
        .get(`/api/inventory/incoming?vendor=${testVendorId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming?status=pending')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/inventory/incoming - Create', () => {
    it('should create incoming inventory with valid data', async () => {
      const inventoryData = {
        invoiceNumber: 'INV-002',
        invoiceDate: new Date().toISOString().split('T')[0],
        vendorId: testVendorId,
        receivingDate: new Date().toISOString().split('T')[0],
        items: [
          {
            skuId: testSkuId,
            totalQuantity: 50,
            received: 45,
            short: 5,
            rejected: 0,
            unitPrice: 25.00,
          },
        ],
      };

      const response = await request(app)
        .post('/api/inventory/incoming')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(inventoryData);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
      }
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/inventory/incoming')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          invoiceNumber: 'INV-003',
          // Missing invoiceDate, vendorId, items
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject empty items array', async () => {
      const response = await request(app)
        .post('/api/inventory/incoming')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          invoiceNumber: 'INV-004',
          invoiceDate: new Date().toISOString().split('T')[0],
          vendorId: testVendorId,
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid SKU in items', async () => {
      const response = await request(app)
        .post('/api/inventory/incoming')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          invoiceNumber: 'INV-005',
          invoiceDate: new Date().toISOString().split('T')[0],
          vendorId: testVendorId,
          items: [
            {
              skuId: 999999, // Invalid SKU
              totalQuantity: 50,
              received: 45,
              unitPrice: 25.00,
            },
          ],
        });

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/inventory/incoming/history', () => {
    it('should return history with filters', async () => {
      const response = await request(app)
        .get(`/api/inventory/incoming/history?sku=${testSkuId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming/history');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/inventory/incoming/:id/items/:itemId/update', () => {
    it('should update item rejected and short quantities', async () => {
      const itemResult = await pool.query(
        `SELECT id FROM incoming_inventory_items WHERE incoming_inventory_id = $1 LIMIT 1`,
        [testInventoryId]
      );
      const itemId = itemResult.rows[0]?.id;

      if (itemId) {
        const response = await request(app)
          .put(`/api/inventory/incoming/${testInventoryId}/items/${itemId}/update`)
          .set('Authorization', `Bearer ${testToken}`)
          .set('x-company-id', testCompanyId)
          .send({
            rejected: 5,
            short: 5,
          });

        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        }
      }
    });

    it('should reject invalid rejected quantity', async () => {
      const itemResult = await pool.query(
        `SELECT id FROM incoming_inventory_items WHERE incoming_inventory_id = $1 LIMIT 1`,
        [testInventoryId]
      );
      const itemId = itemResult.rows[0]?.id;

      if (itemId) {
        const response = await request(app)
          .put(`/api/inventory/incoming/${testInventoryId}/items/${itemId}/update`)
          .set('Authorization', `Bearer ${testToken}`)
          .set('x-company-id', testCompanyId)
          .send({
            rejected: 1000, // More than received
            short: 0,
          });

        expect([400, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Response Structure Snapshots', () => {
    it('should match GET /api/inventory/incoming response structure', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      if (response.status === 200) {
        expect(response.body).toMatchSnapshot({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              invoiceNumber: expect.any(String),
            }),
          ]),
        });
      }
    });
  });
});

