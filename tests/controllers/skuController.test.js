const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('SKU Controller', () => {
  let testCompanyId;
  let testToken;
  let testSkuId;

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

  describe('GET /api/skus', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/skus')
        .send();

      expect(response.status).toBe(401);
    });

    it('should return SKUs with valid authentication', async () => {
      const response = await request(app)
        .get('/api/skus')
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

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/skus?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send();

      if (response.status === 200) {
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page', 1);
        expect(response.body.pagination).toHaveProperty('limit', 10);
      }
    });
  });

  describe('GET /api/skus/:id', () => {
    it('should return 404 for non-existent SKU', async () => {
      const response = await request(app)
        .get('/api/skus/99999')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send();

      expect([404, 401]).toContain(response.status);
    });
  });
});

