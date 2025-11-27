// --- __tests__/expenses.test.js ---
const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');
const {
  createTestOrganization,
  createTestUser,
  createTestVendor,
  createTestAccount
} = require('./helpers/testData');

describe('Expenses API', () => {
  let token;
  let orgId;
  let vendorId;
  let expenseAccountId;
  let paymentAccountId;

  beforeEach(async () => {
    const org = await createTestOrganization();
    const user = await createTestUser(org.id);
    const vendor = await createTestVendor(org.id);
    const expenseAccount = await createTestAccount(org.id, 'expense');
    const paymentAccount = await createTestAccount(org.id, 'asset');

    orgId = org.id;
    vendorId = vendor.id;
    expenseAccountId = expenseAccount.id;
    paymentAccountId = paymentAccount.id;

    token = jwt.sign(
      { userId: user.id, orgId: org.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /v1/expenses', () => {
    it('should create a new expense', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          paymentAccountId: paymentAccountId,
          expenseDate: '2024-03-20',
          amount: 150.00,
          description: 'Office supplies',
          paymentMethod: 'credit_card'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.vendorId).toBe(vendorId);
      expect(res.body.accountId).toBe(expenseAccountId);
      expect(res.body.amount.amount).toBe(150.00);
      expect(res.body.description).toBe('Office supplies');
      expect(res.body.paymentMethod).toBe('credit_card');
    });

    it('should create expense with tax amount', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          paymentAccountId: paymentAccountId,
          expenseDate: '2024-03-20',
          amount: 100.00,
          taxAmount: 10.00,
          description: 'Equipment purchase',
          paymentMethod: 'check'
        });

      expect(res.status).toBe(201);
      expect(res.body.amount.amount).toBe(100.00);
    });

    it('should create expense without vendor (optional)', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: expenseAccountId,
          paymentAccountId: paymentAccountId,
          expenseDate: '2024-03-20',
          amount: 50.00,
          description: 'Misc expense',
          paymentMethod: 'cash'
        });

      expect(res.status).toBe(201);
      expect(res.body.vendorId).toBeNull();
      expect(res.body.amount.amount).toBe(50.00);
    });

    it('should create expense without payment account', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          expenseDate: '2024-03-20',
          amount: 75.00,
          description: 'Unpaid expense'
        });

      expect(res.status).toBe(201);
      expect(res.body.amount.amount).toBe(75.00);
    });

    it('should require account ID', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          expenseDate: '2024-03-20',
          amount: 150.00,
          description: 'Missing account'
        });

      expect(res.status).toBe(400);
    });

    it('should require amount greater than 0', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          expenseDate: '2024-03-20',
          amount: 0,
          description: 'Zero amount'
        });

      expect(res.status).toBe(400);
    });

    it('should require valid expense date', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          expenseDate: 'invalid-date',
          amount: 150.00
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/expenses', () => {
    beforeEach(async () => {
      // Create some test expenses
      await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          paymentAccountId: paymentAccountId,
          expenseDate: '2024-03-20',
          amount: 100.00,
          description: 'Expense 1',
          paymentMethod: 'credit_card'
        });

      await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          paymentAccountId: paymentAccountId,
          expenseDate: '2024-03-21',
          amount: 200.00,
          description: 'Expense 2',
          paymentMethod: 'check'
        });
    });

    it('should retrieve all expenses', async () => {
      const res = await request(app)
        .get('/v1/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should filter expenses by vendor', async () => {
      const res = await request(app)
        .get(`/v1/expenses?vendorId=${vendorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(expense => expense.vendorId === vendorId)).toBe(true);
    });

    it('should filter expenses by account', async () => {
      const res = await request(app)
        .get(`/v1/expenses?accountId=${expenseAccountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(expense => expense.accountId === expenseAccountId)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/v1/expenses?limit=1&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.offset).toBe(0);
    });

    it('should order expenses by date descending', async () => {
      const res = await request(app)
        .get('/v1/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Check that expenses are ordered by date descending
      const dates = res.body.data.map(e => new Date(e.expenseDate));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1] >= dates[i]).toBe(true);
      }
    });
  });

  describe('GET /v1/expenses/:id', () => {
    let expenseId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          paymentAccountId: paymentAccountId,
          expenseDate: '2024-03-20',
          amount: 150.00,
          description: 'Test expense',
          paymentMethod: 'credit_card'
        });

      expenseId = createRes.body.id;
    });

    it('should retrieve expense details', async () => {
      const res = await request(app)
        .get(`/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(expenseId);
      expect(res.body.vendorId).toBe(vendorId);
      expect(res.body.amount.amount).toBe(150.00);
      expect(res.body.description).toBe('Test expense');
    });

    it('should return 404 for non-existent expense', async () => {
      const res = await request(app)
        .get('/v1/expenses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should include vendor name when vendor is specified', async () => {
      const res = await request(app)
        .get(`/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('vendorName');
      expect(res.body.vendorName).toBe('Test Vendor');
    });

    it('should include account name', async () => {
      const res = await request(app)
        .get(`/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accountName');
      expect(res.body.accountName).toBe('Test Account');
    });
  });

  describe('Ledger Entry Creation', () => {
    it('should create ledger entries when payment account is provided', async () => {
      const db = require('../src/config/database');

      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          paymentAccountId: paymentAccountId,
          expenseDate: '2024-03-20',
          amount: 150.00,
          description: 'Test expense with ledger',
          paymentMethod: 'credit_card'
        });

      expect(res.status).toBe(201);

      // Verify ledger entries were created
      const ledgerEntries = await db('ledger_entries')
        .where({ source_id: res.body.id, transaction_type: 'expense' })
        .orderBy('debit', 'desc');

      expect(ledgerEntries.length).toBe(2);

      // Debit entry (expense account)
      expect(parseFloat(ledgerEntries[0].debit)).toBe(150.00);
      expect(parseFloat(ledgerEntries[0].credit)).toBe(0);
      expect(ledgerEntries[0].account_id).toBe(expenseAccountId);

      // Credit entry (payment account)
      expect(parseFloat(ledgerEntries[1].debit)).toBe(0);
      expect(parseFloat(ledgerEntries[1].credit)).toBe(150.00);
      expect(ledgerEntries[1].account_id).toBe(paymentAccountId);
    });

    it('should not create ledger entries when payment account is not provided', async () => {
      const db = require('../src/config/database');

      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          accountId: expenseAccountId,
          expenseDate: '2024-03-20',
          amount: 150.00,
          description: 'Unpaid expense'
        });

      expect(res.status).toBe(201);

      // Verify no ledger entries were created
      const ledgerEntries = await db('ledger_entries')
        .where({ source_id: res.body.id, transaction_type: 'expense' });

      expect(ledgerEntries.length).toBe(0);
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/v1/expenses');

      expect(res.status).toBe(401);
    });

    it('should not allow access to expenses from another organization', async () => {
      // Create a second organization
      const org2 = await createTestOrganization();
      const user2 = await createTestUser(org2.id);
      const vendor2 = await createTestVendor(org2.id);
      const account2 = await createTestAccount(org2.id, 'expense');

      const token2 = jwt.sign(
        { userId: user2.id, orgId: org2.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Create an expense in org2
      const createRes = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          vendorId: vendor2.id,
          accountId: account2.id,
          expenseDate: '2024-03-20',
          amount: 100.00,
          description: 'Org 2 expense'
        });

      // Try to get expenses with org1's token
      const res = await request(app)
        .get('/v1/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should not include the expense from org2
      expect(res.body.data.every(expense => expense.id !== createRes.body.id)).toBe(true);
    });

    it('should not allow access to expense details from another organization', async () => {
      // Create a second organization
      const org2 = await createTestOrganization();
      const user2 = await createTestUser(org2.id);
      const vendor2 = await createTestVendor(org2.id);
      const account2 = await createTestAccount(org2.id, 'expense');

      const token2 = jwt.sign(
        { userId: user2.id, orgId: org2.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Create an expense in org2
      const createRes = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          vendorId: vendor2.id,
          accountId: account2.id,
          expenseDate: '2024-03-20',
          amount: 100.00,
          description: 'Org 2 expense'
        });

      // Try to get the expense with org1's token
      const res = await request(app)
        .get(`/v1/expenses/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: expenseAccountId,
          expenseDate: '2024-03-20',
          amount: 0.01,
          description: 'Tiny expense'
        });

      expect(res.status).toBe(201);
      expect(res.body.amount.amount).toBe(0.01);
    });

    it('should handle large amounts', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: expenseAccountId,
          expenseDate: '2024-03-20',
          amount: 999999.99,
          description: 'Large expense'
        });

      expect(res.status).toBe(201);
      expect(res.body.amount.amount).toBe(999999.99);
    });

    it('should handle empty description', async () => {
      const res = await request(app)
        .post('/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: expenseAccountId,
          expenseDate: '2024-03-20',
          amount: 100.00,
          description: ''
        });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe('');
    });
  });
});
