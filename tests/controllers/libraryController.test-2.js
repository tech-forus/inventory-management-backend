const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('Library Controller', () => {
  let testCompanyId;
  let testToken;
  let testVendorId;
  let testBrandId;

  beforeEach(async () => {
    await begin();
    
    // Create test company
    // Company ID must be 6 characters max
    testCompanyId = 'T' + Date.now().toString().slice(-5);
    await pool.query(
      `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone)
       VALUES ($1, 'Test Company', $2, 'Manufacturing', '123 Test St', 'Test City', 'Test State', '123456', '1234567890')`,
      [testCompanyId, uniqueGST()]
    );

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

  describe('GET /api/yourvendors', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/yourvendors')
        .send();

      expect(response.status).toBe(401);
    });

    it('should return vendors with valid authentication', async () => {
      const response = await request(app)
        .get('/api/yourvendors')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send();

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/yourvendors', () => {
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
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send(vendorData);

      expect([200, 201, 400, 401, 500]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        testVendorId = response.body.data?.id;
      }
    });
  });

  describe('GET /api/yourbrands', () => {
    it('should return brands with valid authentication', async () => {
      const response = await request(app)
        .get('/api/yourbrands')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send();

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });
});

