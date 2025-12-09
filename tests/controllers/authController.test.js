const request = require('supertest');
const app = require('../helpers/testApp');
const pool = require('../../src/models/database');
const bcrypt = require('bcryptjs');
const { begin, rollback, uniqueGST } = require('../helpers/testDb');

describe('Auth Controller', () => {
  let testCompanyId;
  let testUserEmail;
  let testPassword;

  beforeEach(async () => {
    await begin();
    
    // Create test company and user
    // Company ID must be 6 characters max
    testCompanyId = 'T' + Date.now().toString().slice(-5);
    testUserEmail = `test${Date.now()}@test.com`;
    testPassword = 'Test@1234';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Create company with unique GST
    await pool.query(
      `INSERT INTO companies (company_id, company_name, gst_number, business_type, address, city, state, pin, phone, admin_email, admin_password)
       VALUES ($1, 'Test Company', $2, 'Manufacturing', '123 Test St', 'Test City', 'Test State', '123456', '1234567890', $3, $4)`,
      [testCompanyId, uniqueGST(), testUserEmail, hashedPassword]
    );

    // Create user
    await pool.query(
      `INSERT INTO users (company_id, email, password, full_name, phone, role, is_active)
       VALUES ($1, $2, $3, 'Test User', '1234567890', 'admin', true)`,
      [testCompanyId, testUserEmail, hashedPassword]
    );
  });

  afterEach(async () => {
    await rollback();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          email: testUserEmail,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUserEmail);
      expect(response.body.data.user.companyId).toBe(testCompanyId);
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          email: 'invalid@test.com',
          password: testPassword,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          email: testUserEmail,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          companyId: testCompanyId,
          // Missing email and password
        });

      expect(response.status).toBe(400);
    });
  });
});

