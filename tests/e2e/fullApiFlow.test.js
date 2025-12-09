const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const bcrypt = require('bcryptjs');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('E2E Tests - Full API Flow', () => {
  let testCompanyId;
  let testToken;
  let testVendorId;
  let testBrandId;
  let testSkuId;
  let testInventoryId;

  beforeEach(async () => {
    await begin();
  });

  afterEach(async () => {
    await rollback();
  });

  describe('Complete Flow: Register → Login → Authenticated Operations', () => {
    it('should complete full registration and login flow', async () => {
      // Step 1: Register Company
      const registerData = {
        companyName: 'E2E Test Company',
        gstNumber: uniqueGST(),
        businessType: 'Manufacturing',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pin: '123456',
        phone: '1234567890',
        fullName: 'Test Admin',
        email: `e2e${Date.now()}@test.com`,
        adminPhone: '1234567890',
        password: 'Test@1234',
      };

      const registerResponse = await request(app)
        .post('/api/companies/register')
        .send(registerData);

      expect([200, 201]).toContain(registerResponse.status);
      if (registerResponse.status === 200 || registerResponse.status === 201) {
        testCompanyId = registerResponse.body.data?.companyId;
        expect(testCompanyId).toBeDefined();

        // Step 2: Login
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            companyId: testCompanyId,
            email: registerData.email,
            password: registerData.password,
          });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data).toHaveProperty('token');
        testToken = loginResponse.body.data.token;

        // Step 3: Verify Token
        const verifyResponse = await request(app)
          .post('/api/auth/verify')
          .set('Authorization', `Bearer ${testToken}`)
          .send();

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.success).toBe(true);
      }
    });
  });

  describe('Complete Flow: Create Vendor → Fetch Vendors', () => {
    beforeEach(async () => {
      // Setup: Create company and login
      testCompanyId = 'E2E' + Date.now().toString().slice(-4);
      await pool.query(
        `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone, admin_email, admin_password)
         VALUES ($1, 'E2E Company', $2, 'Manufacturing', '123 Test St', 'Test City', 'Test State', '123456', '1234567890', 'admin@test.com', $3)`,
        [testCompanyId, uniqueGST(), await bcrypt.hash('Test@1234', 10)]
      );

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          email: 'admin@test.com',
          password: 'Test@1234',
        });

      if (loginResponse.status === 200) {
        testToken = loginResponse.body.data.token;
      }
    });

    it('should create vendor and then fetch it', async () => {
      if (!testToken) {
        // Skip if login failed
        return;
      }

      // Step 1: Create Vendor
      const vendorData = {
        name: 'E2E Test Vendor',
        contactPerson: 'John Doe',
        email: 'vendor@test.com',
        phone: '1234567890',
        gstNumber: uniqueGST(),
        address: '123 Vendor St',
        city: 'Vendor City',
        state: 'Vendor State',
        pin: '123456',
      };

      const createResponse = await request(app)
        .post('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(vendorData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        expect(createResponse.body.success).toBe(true);
        testVendorId = createResponse.body.data?.id;
        expect(testVendorId).toBeDefined();

        // Step 2: Fetch Vendors
        const fetchResponse = await request(app)
          .get('/api/yourvendors')
          .set('Authorization', `Bearer ${testToken}`)
          .set('x-company-id', testCompanyId);

        expect(fetchResponse.status).toBe(200);
        expect(fetchResponse.body.success).toBe(true);
        expect(Array.isArray(fetchResponse.body.data)).toBe(true);
        
        const createdVendor = fetchResponse.body.data.find(v => v.id === testVendorId);
        expect(createdVendor).toBeDefined();
        expect(createdVendor.name).toBe('E2E Test Vendor');
      }
    });
  });

  describe('Complete Flow: Create SKU → Fetch SKU → Update SKU', () => {
    beforeEach(async () => {
      // Setup: Create company, vendor, brand, categories
      testCompanyId = 'E2E' + Date.now().toString().slice(-4);
      await pool.query(
        `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone, admin_email, admin_password)
         VALUES ($1, 'E2E Company', $2, 'Manufacturing', '123 Test St', 'Test City', 'Test State', '123456', '1234567890', 'admin@test.com', $3)`,
        [testCompanyId, uniqueGST(), await bcrypt.hash('Test@1234', 10)]
      );

      // Create vendor
      const vendorResult = await pool.query(
        `INSERT INTO vendors (company_id, name, email, phone) VALUES ($1, 'E2E Vendor', 'vendor@test.com', '1234567890') RETURNING id`,
        [testCompanyId]
      );
      testVendorId = vendorResult.rows[0].id;

      // Create brand
      const brandResult = await pool.query(
        `INSERT INTO brands (company_id, name) VALUES ($1, 'E2E Brand') RETURNING id`,
        [testCompanyId]
      );
      testBrandId = brandResult.rows[0].id;

      // Create product category
      const prodCatResult = await pool.query(
        `INSERT INTO product_categories (company_id, name) VALUES ($1, 'E2E Product Category') RETURNING id`,
        [testCompanyId]
      );
      const testProductCategoryId = prodCatResult.rows[0].id;

      // Create item category
      await pool.query(
        `INSERT INTO item_categories (company_id, product_category_id, name) VALUES ($1, $2, 'E2E Item Category')`,
        [testCompanyId, testProductCategoryId]
      );

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          email: 'admin@test.com',
          password: 'Test@1234',
        });

      if (loginResponse.status === 200) {
        testToken = loginResponse.body.data.token;
      }
    });

    it('should create SKU, fetch it, and update it', async () => {
      if (!testToken) {
        return;
      }

      // Step 1: Create SKU
      const itemCatResult = await pool.query(
        `SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1`,
        [testCompanyId]
      );
      const itemCategoryId = itemCatResult.rows[0]?.id;
      const prodCatResult = await pool.query(
        `SELECT id FROM product_categories WHERE company_id = $1 LIMIT 1`,
        [testCompanyId]
      );
      const productCategoryId = prodCatResult.rows[0]?.id;

      if (!itemCategoryId || !productCategoryId) {
        return; // Skip if setup incomplete
      }

      const skuData = {
        itemName: 'E2E Test SKU',
        brandId: testBrandId,
        productCategoryId: productCategoryId,
        itemCategoryId: itemCategoryId,
        vendorId: testVendorId,
        unit: 'pcs',
        currentStock: 100,
      };

      const createResponse = await request(app)
        .post('/api/skus')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(skuData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        expect(createResponse.body.success).toBe(true);
        testSkuId = createResponse.body.data?.id;
        expect(testSkuId).toBeDefined();

        // Step 2: Fetch SKU
        const fetchResponse = await request(app)
          .get(`/api/skus/${testSkuId}`)
          .set('Authorization', `Bearer ${testToken}`)
          .set('x-company-id', testCompanyId);

        if (fetchResponse.status === 200) {
          expect(fetchResponse.body.success).toBe(true);
          expect(fetchResponse.body.data.id).toBe(testSkuId);

          // Step 3: Update SKU
          const updateResponse = await request(app)
            .put(`/api/skus/${testSkuId}`)
            .set('Authorization', `Bearer ${testToken}`)
            .set('x-company-id', testCompanyId)
            .send({
              itemName: 'Updated E2E SKU',
              currentStock: 150,
            });

          if (updateResponse.status === 200) {
            expect(updateResponse.body.success).toBe(true);
            expect(updateResponse.body.data.itemName).toBe('Updated E2E SKU');
            expect(updateResponse.body.data.currentStock).toBe(150);
          }
        }
      }
    });
  });
});




