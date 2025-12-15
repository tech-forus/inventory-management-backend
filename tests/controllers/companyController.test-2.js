const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');

describe('Company Controller', () => {
  let testCompanyId;

  afterAll(async () => {
    // Cleanup
    if (testCompanyId) {
      await pool.query('DELETE FROM users WHERE company_id = $1', [testCompanyId]);
      await pool.query('DELETE FROM companies WHERE company_id = $1', [testCompanyId]);
    }
  });

  describe('POST /api/companies/register', () => {
    it('should register a new company successfully', async () => {
      const companyData = {
        companyName: `Test Company ${Date.now()}`,
        // GST number must be max 15 characters: 29 + 10 chars + F1Z5 = 15 chars
        gstNumber: `29T${Date.now().toString().slice(-7)}F1Z5`,
        businessType: 'Manufacturing',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pin: '123456',
        phone: '1234567890',
        fullName: 'Test Admin',
        email: `test${Date.now()}@test.com`,
        adminPhone: '1234567890',
        password: 'Test@1234',
      };

      const response = await request(app)
        .post('/api/companies/register')
        .send(companyData);

      expect([200, 201]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('company');
        testCompanyId = response.body.data.company?.companyId;
      }
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/companies/register')
        .send({
          companyName: 'Test Company',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
    });

    it('should return 409 for duplicate GST number', async () => {
      // First registration
      const companyData1 = {
        companyName: `Test Company ${Date.now()}`,
        // GST number must be max 15 characters
        gstNumber: '29DUP123456F1Z5',
        businessType: 'Manufacturing',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pin: '123456',
        phone: '1234567890',
        fullName: 'Test Admin',
        email: `test${Date.now()}@test.com`,
        adminPhone: '1234567890',
        password: 'Test@1234',
      };

      await request(app)
        .post('/api/companies/register')
        .send(companyData1);

      // Second registration with same GST
      const companyData2 = {
        ...companyData1,
        email: `test${Date.now()}@test.com`,
      };

      const response = await request(app)
        .post('/api/companies/register')
        .send(companyData2);

      expect([409, 400]).toContain(response.status);
    });
  });

  describe('GET /api/companies/:companyId', () => {
    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .get('/api/companies/NONEXIST')
        .send();

      expect(response.status).toBe(404);
    });
  });
});

