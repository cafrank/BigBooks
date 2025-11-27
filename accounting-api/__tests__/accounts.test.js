// --- __tests__/accounts.test.js ---
const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');
const { createTestOrganization, createTestUser } = require('./helpers/testData');

describe('Accounts API', () => {
  let token;
  let orgId;

  beforeEach(async () => {
    const org = await createTestOrganization();
    const user = await createTestUser(org.id);
    orgId = org.id;
    
    token = jwt.sign(
      { userId: user.id, orgId: org.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /v1/accounts', () => {
    it('should return list of accounts', async () => {
      const res = await request(app)
        .get('/v1/accounts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by account type', async () => {
      const res = await request(app)
        .get('/v1/accounts?type=asset')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(account => {
        expect(account.type).toBe('asset');
      });
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/v1/accounts');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /v1/accounts', () => {
    it('should create a new account', async () => {
      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Revenue Account',
          type: 'income',
          accountNumber: '4500',
          description: 'Consulting revenue'
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Revenue Account');
      expect(res.body.type).toBe('income');
      expect(res.body.accountNumber).toBe('4500');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Account'
          // Missing type
        });

      expect(res.status).toBe(400);
    });
  });
});
