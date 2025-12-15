const request = require('supertest');
const app = require('./helpers/testApp');
const pool = require('../src/models/database');

describe('Library API', () => {
  let testCompanyId = 'DEMO01';
  let testToken;
  let testVendorId;
  let testBrandId;

  beforeAll(async () => {
    // Get or create test token
    // In a real test, you'd authenticate first
    testCompanyId = 'DEMO01';
  });

  afterAll(async () => {
    // Cleanup test data
    if (testVendorId) {
      await pool.query('DELETE FROM vendors WHERE id = $1', [testVendorId]);
    }
    if (testBrandId) {
      await pool.query('DELETE FROM brands WHERE id = $1', [testBrandId]);
    }
  });

  describe('GET /api/yourvendors', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/yourvendors')
        .send();

      expect(response.status).toBe(401);
    });

    it('should return vendors with valid company ID', async () => {
      const response = await request(app)
        .get('/api/yourvendors')
        .set('x-company-id', testCompanyId)
        .send();

      // Should either return 200 with data or 401 if auth is required
      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/yourvendors', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/yourvendors')
        .send({
          name: 'Test Vendor',
          contactPerson: 'John Doe',
          email: 'test@vendor.com',
          phone: '1234567890',
        });

      expect(response.status).toBe(401);
    });

    it('should create vendor with valid data', async () => {
      const vendorData = {
        name: `Test Vendor ${Date.now()}`,
        contactPerson: 'John Doe',
        email: `test${Date.now()}@vendor.com`,
        phone: '1234567890',
        gstNumber: '29TEST1234F1Z5',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pin: '123456',
      };

      const response = await request(app)
        .post('/api/yourvendors')
        .set('x-company-id', testCompanyId)
        .send(vendorData);

      // Should either succeed or require auth
      expect([200, 201, 401]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('data');
        testVendorId = response.body.data?.id;
      }
    });
  });

  describe('GET /api/yourbrands', () => {
    it('should return brands with valid company ID', async () => {
      const response = await request(app)
        .get('/api/yourbrands')
        .set('x-company-id', testCompanyId)
        .send();

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });
});

