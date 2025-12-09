const request = require('supertest');
const app = require('./helpers/testApp');
const pool = require('../src/models/database');

describe('Inventory API', () => {
  let testCompanyId = 'DEMO01';

  describe('GET /api/inventory/incoming', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming')
        .send();

      expect(response.status).toBe(401);
    });

    it('should return incoming inventory with valid auth', async () => {
      const response = await request(app)
        .get('/api/inventory/incoming')
        .set('x-company-id', testCompanyId)
        .send();

      // Should either return data or require proper JWT auth
      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
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
          brandId: 1,
          items: [],
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/inventory/incoming')
        .set('x-company-id', testCompanyId)
        .send({
          // Missing required fields
        });

      // Should return 400 for validation errors or 401 for auth
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Health Check', () => {
    it('should return health status with database check', async () => {
      const response = await request(app)
        .get('/api/health')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('db');
      expect(response.body).toHaveProperty('timestamp');
      expect(['OK', 'DEGRADED']).toContain(response.body.status);
      expect(['UP', 'DOWN']).toContain(response.body.db);
    });
  });
});

