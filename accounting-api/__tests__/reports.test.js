// --- __tests__/reports.test.js ---
const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');
const { createTestOrganization, createTestUser } = require('./helpers/testData');

describe('Reports API', () => {
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

  describe('GET /v1/reports/profit-loss', () => {
    it('should return P&L report', async () => {
      const res = await request(app)
        .get('/v1/reports/profit-loss?startDate=2024-01-01&endDate=2024-03-31')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('startDate');
      expect(res.body).toHaveProperty('endDate');
      expect(res.body).toHaveProperty('income');
      expect(res.body).toHaveProperty('expenses');
      expect(res.body).toHaveProperty('netIncome');
    });

    it('should require date parameters', async () => {
      const res = await request(app)
        .get('/v1/reports/profit-loss')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/reports/balance-sheet', () => {
    it('should return balance sheet', async () => {
      const res = await request(app)
        .get('/v1/reports/balance-sheet')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('assets');
      expect(res.body).toHaveProperty('liabilities');
      expect(res.body).toHaveProperty('equity');
    });
  });

  describe('GET /v1/reports/trial-balance', () => {
    it('should return trial balance with balanced debits/credits', async () => {
      const res = await request(app)
        .get('/v1/reports/trial-balance')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accounts');
      expect(res.body).toHaveProperty('totals');
      
      // Verify debits equal credits
      const { totalDebits, totalCredits } = res.body.totals;
      expect(totalDebits.amount).toBeCloseTo(totalCredits.amount, 2);
    });
  });
});