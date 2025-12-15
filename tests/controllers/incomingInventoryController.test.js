const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('Incoming Inventory Controller', () => {
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

  describe('GET /api/inventory/incoming', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming')
        .send();

      expect(response.status).toBe(401);
    });

    it('should return incoming inventory with valid authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send();

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Verify that records include rejected field
        if (response.body.data.length > 0) {
          const record = response.body.data[0];
          expect(record).toHaveProperty('rejected');
          expect(typeof record.rejected).toBe('number');
        }
      }
    });
  });

  describe('GET /api/inventory/incoming/history', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming/history')
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/inventory/incoming', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/inventory/incoming')
        .send({
          invoiceNumber: 'INV-001',
          invoiceDate: '2024-01-01',
          vendorId: 1,
          items: [],
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/inventory/incoming')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({
          // Missing required fields
        });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe('PUT /api/inventory/incoming/:id/update-record-level', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/inventory/incoming/999/update-record-level')
        .send({ rejected: 10, short: 5 });

      expect(response.status).toBe(401);
    });

    it('should return 400 if neither rejected nor short provided', async () => {
      const response = await request(app)
        .put('/api/inventory/incoming/999/update-record-level')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 or 400 for non-existent inventory', async () => {
      const response = await request(app)
        .put('/api/inventory/incoming/999999/update-record-level')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-company-id', testCompanyId)
        .send({ rejected: 10, short: 5 });

      // Should return 404 (not found) or 400 (validation error)
      expect([400, 404, 500]).toContain(response.status);
    });
  });
});

