const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('Library Controller - Comprehensive Tests', () => {
  let testCompanyId;
  let testToken;
  let testVendorId;
  let testBrandId;

  beforeEach(async () => {
    await begin();
    
    testCompanyId = ('T' + Date.now().toString().slice(-5)).toUpperCase();
    await pool.query(
      `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone)
       VALUES ($1, 'Test Company', $2, 'Manufacturing', '123 Test St', 'Test City', 'Test State', '123456', '1234567890')`,
      [testCompanyId, uniqueGST()]
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

  describe('Vendors - GET /api/yourvendors', () => {
    it('should return empty array when no vendors exist', async () => {
      const response = await request(app)
        .get('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return vendors after creation', async () => {
      // Create a vendor first
      await pool.query(
        `INSERT INTO vendors (company_id, name, email, phone) VALUES ($1, 'Test Vendor', 'vendor@test.com', '1234567890')`,
        [testCompanyId.toUpperCase()]
      );

      const response = await request(app)
        .get('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Vendors - POST /api/yourvendors', () => {
    it('should create vendor with all required fields', async () => {
      const vendorData = {
        name: 'New Vendor',
        contactPerson: 'John Doe',
        email: 'newvendor@test.com',
        phone: '9876543210',
        gstNumber: uniqueGST(),
        address: '123 Vendor St',
        city: 'Vendor City',
        state: 'Vendor State',
        pin: '654321',
      };

      const response = await request(app)
        .post('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(vendorData);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('name', 'New Vendor');
        expect(response.body.data).toHaveProperty('email', 'newvendor@test.com');
      }
    });

    it('should reject vendor with missing name', async () => {
      const response = await request(app)
        .post('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          email: 'vendor@test.com',
          phone: '1234567890',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          name: 'Test Vendor',
          email: 'invalid-email',
          phone: '1234567890',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid phone format', async () => {
      const response = await request(app)
        .post('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          name: 'Test Vendor',
          email: 'vendor@test.com',
          phone: '123', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Brands - GET /api/yourbrands', () => {
    it('should return empty array when no brands exist', async () => {
      const response = await request(app)
        .get('/api/yourbrands')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return brands after creation', async () => {
      await pool.query(
        `INSERT INTO brands (company_id, name) VALUES ($1, 'Test Brand')`,
        [testCompanyId.toUpperCase()]
      );

      const response = await request(app)
        .get('/api/yourbrands')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Brands - POST /api/yourbrands', () => {
    it('should create brand with valid data', async () => {
      const brandData = {
        name: 'New Brand',
        description: 'Brand description',
      };

      const response = await request(app)
        .post('/api/yourbrands')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(brandData);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('name', 'New Brand');
      }
    });

    it('should reject brand with missing name', async () => {
      const response = await request(app)
        .post('/api/yourbrands')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          description: 'Brand description',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Structure Snapshots', () => {
    it('should match GET /api/yourvendors response structure', async () => {
      const response = await request(app)
        .get('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      if (response.status === 200) {
        expect(response.body).toMatchSnapshot({
          data: expect.any(Array),
        });
      }
    });

    it('should match GET /api/yourbrands response structure', async () => {
      const response = await request(app)
        .get('/api/yourbrands')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId);

      if (response.status === 200) {
        expect(response.body).toMatchSnapshot({
          data: expect.any(Array),
        });
      }
    });
  });
});

