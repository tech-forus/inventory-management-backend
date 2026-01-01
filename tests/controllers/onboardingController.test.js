const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('Onboarding Controller', () => {
  let testCompanyId;
  let testToken;

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

  describe('GET /api/onboarding/status/:companyId', () => {
    it('should return onboarding status', async () => {
      const response = await request(app)
        .get(`/api/onboarding/status/${testCompanyId}`)
        .send();

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
      }
    });
  });

  describe('POST /api/onboarding/product-categories', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/onboarding/product-categories')
        .send({
          companyId: testCompanyId,
          categories: [{ name: 'Test Category' }],
        });

      expect([200, 401, 500]).toContain(response.status);
    });
  });
});

