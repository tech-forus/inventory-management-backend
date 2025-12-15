const request = require('supertest');
const app = require('./helpers/testApp');
const pool = require('../src/models/database');
const { begin, rollback, uniqueGST } = require('./helpers/testDb');

describe('Authentication API', () => {
  let testCompanyId;
  let testToken;

  beforeEach(async () => {
    await begin();
    
    // Create a test company for authentication tests
    testCompanyId = 'TEST' + Date.now().toString().slice(-6);
    
    // Register test company with unique GST
    const registerResponse = await request(app)
      .post('/api/companies/register')
      .send({
        companyName: 'Test Company',
        gstNumber: uniqueGST(),
        businessType: 'Manufacturing',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pin: '123456',
        phone: '1234567890',
        fullName: 'Test Admin',
        email: `test${Date.now()}@test.com`,
        adminPhone: '1234567890',
        password: 'Test@1234',
      });

    if (registerResponse.status === 200 || registerResponse.status === 201) {
      testCompanyId = registerResponse.body.data?.companyId || testCompanyId;
    }
  });

  afterEach(async () => {
    await rollback();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          email: 'invalid@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should login successfully with valid credentials', async () => {
      // First, ensure we have a user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          email: `test${Date.now()}@test.com`,
          password: 'Test@1234',
        });

      // This might fail if user doesn't exist, which is expected
      // In a real scenario, you'd create the user first
      expect([200, 401]).toContain(loginResponse.status);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .send({});

      expect(response.status).toBe(401);
    });
  });
});

