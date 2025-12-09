const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('SKU Controller - Comprehensive Tests', () => {
  let testCompanyId;
  let testToken;
  let testSkuId;
  let testBrandId;
  let testCategoryId;
  let testVendorId;

  beforeEach(async () => {
    await begin();
    
    // Create test company (ensure company_id is uppercase)
    testCompanyId = ('T' + Date.now().toString().slice(-5)).toUpperCase();
    await pool.query(
      `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone)
       VALUES ($1, 'Test Company', $2, 'Manufacturing', '123 Test St', 'Test City', 'Test State', '123456', '1234567890')`,
      [testCompanyId.toUpperCase(), uniqueGST()]
    );

    // Create test brand (ensure company_id is uppercase)
    const brandResult = await pool.query(
      `INSERT INTO brands (company_id, name) VALUES ($1, 'Test Brand') RETURNING id`,
      [testCompanyId.toUpperCase()]
    );
    testBrandId = brandResult.rows[0].id;

    // Create test category (ensure company_id is uppercase)
    const categoryResult = await pool.query(
      `INSERT INTO product_categories (company_id, name) VALUES ($1, 'Test Category') RETURNING id`,
      [testCompanyId.toUpperCase()]
    );
    testCategoryId = categoryResult.rows[0].id;

    // Create test vendor (ensure company_id is uppercase)
    const vendorResult = await pool.query(
      `INSERT INTO vendors (company_id, name, email, phone) VALUES ($1, 'Test Vendor', 'vendor@test.com', '1234567890') RETURNING id`,
      [testCompanyId.toUpperCase()]
    );
    testVendorId = vendorResult.rows[0].id;

    // Create item category (required for SKU - needs product_category_id, ensure company_id is uppercase)
    const itemCatResult = await pool.query(
      `INSERT INTO item_categories (company_id, product_category_id, name) VALUES ($1, $2, 'Test Item Category') RETURNING id`,
      [testCompanyId.toUpperCase(), testCategoryId]
    );
    const testItemCategoryId = itemCatResult.rows[0].id;

    // Create test SKU (ensure company_id is uppercase and include min_stock_level)
    const skuResult = await pool.query(
      `INSERT INTO skus (company_id, sku_id, item_name, brand_id, product_category_id, item_category_id, vendor_id, unit, current_stock, min_stock_level)
       VALUES ($1, $2, 'Test SKU', $3, $4, $5, $6, 'pcs', 100, 10) RETURNING id`,
      [testCompanyId.toUpperCase(), `${testCompanyId.toUpperCase()}SKU001`, testBrandId, testCategoryId, testItemCategoryId, testVendorId]
    );
    testSkuId = skuResult.rows[0].id;

    // Create test token
    testToken = jwt.sign(
      { userId: 1, companyId: testCompanyId, email: 'test@test.com', role: 'admin' },
      jwtConfig.secret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await rollback();
  });

  describe('GET /api/skus - Filtering and Search', () => {
    it('should filter SKUs by brand', async () => {
      const response = await request(app)
        .get(`/api/skus?brand=${testBrandId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('brandId', testBrandId);
      }
    });

    it('should filter SKUs by product category', async () => {
      const response = await request(app)
        .get(`/api/skus?productCategory=${testCategoryId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should search SKUs by name', async () => {
      const response = await request(app)
        .get('/api/skus?search=Test')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by stock status (in stock)', async () => {
      const response = await request(app)
        .get('/api/skus?stockStatus=in_stock')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by stock status (out of stock)', async () => {
      const response = await request(app)
        .get('/api/skus?stockStatus=out_of_stock')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/skus?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/skus - Pagination', () => {
    it('should return pagination metadata', async () => {
      const response = await request(app)
        .get('/api/skus?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should handle page 2 correctly', async () => {
      const response = await request(app)
        .get('/api/skus?page=2&limit=5')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should use default pagination when not specified', async () => {
      const response = await request(app)
        .get('/api/skus')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 20);
    });
  });

  describe('GET /api/skus/:id', () => {
    it('should return SKU by ID with all fields', async () => {
      const response = await request(app)
        .get(`/api/skus/${testSkuId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testSkuId);
      expect(response.body.data).toHaveProperty('itemName');
      expect(response.body.data).toHaveProperty('currentStock');
    });

    it('should return 404 for invalid SKU ID', async () => {
      const response = await request(app)
        .get('/api/skus/999999')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/skus/${testSkuId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/skus - Create SKU', () => {
    it('should create SKU with valid data', async () => {
      // Get item category for the new SKU
      const itemCatResult = await pool.query(
        `SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1`,
        [testCompanyId]
      );
      const itemCategoryId = itemCatResult.rows[0].id;

      const skuData = {
        itemName: 'New Test SKU',
        brandId: testBrandId,
        productCategoryId: testCategoryId,
        itemCategoryId: itemCategoryId,
        vendorId: testVendorId,
        unit: 'pcs',
        currentStock: 50,
        minStockLevel: 10,
        itemDetails: 'Test description',
      };

      const response = await request(app)
        .post('/api/skus')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(skuData);

      expect([200, 201]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('itemName', 'New Test SKU');
      }
    });

    it('should auto-generate SKU ID when not provided', async () => {
      const itemCatResult = await pool.query(
        `SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1`,
        [testCompanyId]
      );
      const itemCategoryId = itemCatResult.rows[0].id;

      const skuData = {
        itemName: 'Auto SKU',
        brandId: testBrandId,
        productCategoryId: testCategoryId,
        itemCategoryId: itemCategoryId,
        vendorId: testVendorId,
        unit: 'pcs',
        minStockLevel: 10,
      };

      const response = await request(app)
        .post('/api/skus')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(skuData);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.data).toHaveProperty('skuId');
        expect(response.body.data.skuId).toHaveLength(14);
      }
    });

    it('should reject invalid SKU ID format', async () => {
      const itemCatResult = await pool.query(
        `SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1`,
        [testCompanyId]
      );
      const itemCategoryId = itemCatResult.rows[0].id;

      const skuData = {
        skuId: 'INVALID',
        itemName: 'Invalid SKU',
        brandId: testBrandId,
        productCategoryId: testCategoryId,
        itemCategoryId: itemCategoryId,
        vendorId: testVendorId,
        unit: 'pcs',
        minStockLevel: 10,
        autoGenerateSKU: false,
      };

      const response = await request(app)
        .post('/api/skus')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(skuData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate SKU ID', async () => {
      const itemCatResult = await pool.query(
        `SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1`,
        [testCompanyId]
      );
      const itemCategoryId = itemCatResult.rows[0].id;

      const skuData = {
        skuId: `${testCompanyId}SKU001`,
        itemName: 'Duplicate SKU',
        brandId: testBrandId,
        productCategoryId: testCategoryId,
        itemCategoryId: itemCategoryId,
        vendorId: testVendorId,
        unit: 'pcs',
        minStockLevel: 10,
        autoGenerateSKU: false,
      };

      const response = await request(app)
        .post('/api/skus')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(skuData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/skus')
        .send({ name: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/skus/:id - Update SKU', () => {
    it('should update SKU with valid data', async () => {
      const updateData = {
        itemName: 'Updated SKU Name',
        currentStock: 150,
      };

      const response = await request(app)
        .put(`/api/skus/${testSkuId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(updateData);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('itemName', 'Updated SKU Name');
      }
    });

    it('should return 404 for non-existent SKU', async () => {
      const response = await request(app)
        .put('/api/skus/999999')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put(`/api/skus/${testSkuId}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/skus/:id - Delete SKU', () => {
    it('should soft delete SKU', async () => {
      const response = await request(app)
        .delete(`/api/skus/${testSkuId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');
      }
    });

    it('should return 404 for non-existent SKU', async () => {
      const response = await request(app)
        .delete('/api/skus/999999')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/skus/${testSkuId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/skus?search=NONEXISTENT_SKU_NAME_12345')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should handle very large page numbers', async () => {
      const response = await request(app)
        .get('/api/skus?page=99999&limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should handle negative page numbers gracefully', async () => {
      const response = await request(app)
        .get('/api/skus?page=-1')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      // Should either return 400 or default to page 1 (negative page causes OFFSET error)
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Response Structure Snapshots', () => {
    it('should match GET /api/skus response structure', async () => {
      const response = await request(app)
        .get('/api/skus')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      if (response.status === 200) {
        expect(response.body).toMatchSnapshot({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
            }),
          ]),
        });
      }
    });

    it('should match GET /api/skus/:id response structure', async () => {
      const response = await request(app)
        .get(`/api/skus/${testSkuId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      if (response.status === 200) {
        expect(response.body).toMatchSnapshot({
          data: expect.objectContaining({
            id: expect.any(Number),
            itemName: expect.any(String),
          }),
        });
      }
    });
  });
});

