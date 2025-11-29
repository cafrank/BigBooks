// --- __tests__/accounts.test.js ---
const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');
const db = require('../src/config/database');
const { createTestOrganization, createTestUser } = require('./helpers/testData');

describe('Accounts API', () => {
  let token;
  let orgId;
  let assetAccountId;
  let expenseAccountId;

  beforeEach(async () => {
    const org = await createTestOrganization();
    const user = await createTestUser(org.id);
    orgId = org.id;

    token = jwt.sign(
      { userId: user.id, orgId: org.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Get default accounts created by seed_default_accounts
    const assetAccount = await db('accounts')
      .where({ organization_id: orgId, account_type: 'asset' })
      .first();
    const expenseAccount = await db('accounts')
      .where({ organization_id: orgId, account_type: 'expense' })
      .first();

    assetAccountId = assetAccount?.id;
    expenseAccountId = expenseAccount?.id;
  });

  describe('POST /v1/accounts', () => {
    it('should create a new account', async () => {
      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Office Equipment',
          type: 'asset',
          accountNumber: '1599',
          description: 'Computers and furniture'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Office Equipment');
      expect(res.body.type).toBe('asset');
      expect(res.body.accountNumber).toBe('1599');
      expect(res.body.description).toBe('Computers and furniture');
      expect(res.body.isActive).toBe(true);
      expect(res.body.isSystemAccount).toBe(false);
    });

    it('should create account with parent account', async () => {
      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Petty Cash',
          type: 'asset',
          parentAccountId: assetAccountId
        });

      expect(res.status).toBe(201);
      expect(res.body.parentAccountId).toBe(assetAccountId);
    });

    it('should reject duplicate account number', async () => {
      await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Account 1',
          type: 'asset',
          accountNumber: '1500'
        });

      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Account 2',
          type: 'asset',
          accountNumber: '1500'
        });

      expect(res.status).toBe(409);
    });

    it('should reject parent account of different type', async () => {
      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Sub-account',
          type: 'expense',
          parentAccountId: assetAccountId
        });

      expect(res.status).toBe(400);
    });

    it('should require account name', async () => {
      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'asset'
        });

      expect(res.status).toBe(400);
    });

    it('should require valid account type', async () => {
      const res = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Account',
          type: 'invalid_type'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/accounts', () => {
    beforeEach(async () => {
      await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Checking Account',
          type: 'asset',
          accountNumber: '1010'
        });

      await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Office Supplies Expense',
          type: 'expense',
          accountNumber: '5100'
        });
    });

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
      expect(res.body.data.every(account => account.type === 'asset')).toBe(true);
    });

    it('should filter by active status', async () => {
      const res = await request(app)
        .get('/v1/accounts?isActive=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(account => account.isActive === true)).toBe(true);
    });

    it('should search accounts by name', async () => {
      const res = await request(app)
        .get('/v1/accounts?search=Checking')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some(account => account.name.includes('Checking'))).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/v1/accounts?limit=1&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.offset).toBe(0);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/v1/accounts');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /v1/accounts/:id', () => {
    let accountId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Account',
          type: 'asset',
          accountNumber: '1920',
          description: 'Test description'
        });

      accountId = createRes.body.id;
    });

    it('should retrieve account details with balance', async () => {
      const res = await request(app)
        .get(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(accountId);
      expect(res.body.name).toBe('Test Account');
      expect(res.body.type).toBe('asset');
      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toHaveProperty('amount');
    });

    it('should include child accounts', async () => {
      const childRes = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Child Account',
          type: 'asset',
          parentAccountId: accountId
        });

      const res = await request(app)
        .get(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.childAccounts).toBeInstanceOf(Array);
      expect(res.body.childAccounts.length).toBe(1);
      expect(res.body.childAccounts[0].id).toBe(childRes.body.id);
    });

    it('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .get('/v1/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /v1/accounts/:id', () => {
    let accountId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Original Name',
          type: 'asset',
          description: 'Original description'
        });

      accountId = createRes.body.id;
    });

    it('should update account name', async () => {
      const res = await request(app)
        .patch(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name'
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should update account description', async () => {
      const res = await request(app)
        .patch(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Updated description'
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated description');
    });

    it('should update active status', async () => {
      const res = await request(app)
        .patch(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: false
        });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it('should not allow deactivating system accounts', async () => {
      const systemAccount = await db('accounts')
        .where({ organization_id: orgId, is_system_account: true })
        .first();

      const res = await request(app)
        .patch(`/v1/accounts/${systemAccount.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: false
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .patch('/v1/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Name'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/accounts/:id', () => {
    let accountId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Account to Delete',
          type: 'asset'
        });

      accountId = createRes.body.id;
    });

    it('should delete account with no transactions', async () => {
      const res = await request(app)
        .delete(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      const getRes = await request(app)
        .get(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(404);
    });

    it('should not delete system accounts', async () => {
      const systemAccount = await db('accounts')
        .where({ organization_id: orgId, is_system_account: true })
        .first();

      const res = await request(app)
        .delete(`/v1/accounts/${systemAccount.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should not delete account with child accounts', async () => {
      await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Child Account',
          type: 'asset',
          parentAccountId: accountId
        });

      const res = await request(app)
        .delete(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should not delete account with transactions', async () => {
      const dummySourceId = '00000000-0000-0000-0000-000000000001';
      await db('ledger_entries').insert({
        organization_id: orgId,
        account_id: accountId,
        source_id: dummySourceId,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'journal_entry',
        description: 'Test entry',
        debit: 100,
        credit: 0
      });

      const res = await request(app)
        .delete(`/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('transactions');
    });

    it('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .delete('/v1/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/accounts/:id/transactions', () => {
    let accountId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Transaction Test Account',
          type: 'asset'
        });

      accountId = createRes.body.id;

      const dummySourceId = '00000000-0000-0000-0000-000000000001';
      await db('ledger_entries').insert([
        {
          organization_id: orgId,
          account_id: accountId,
          source_id: dummySourceId,
          transaction_date: '2024-01-15',
          transaction_type: 'journal_entry',
          description: 'Transaction 1',
          debit: 100,
          credit: 0,
          is_posted: true
        },
        {
          organization_id: orgId,
          account_id: accountId,
          source_id: dummySourceId,
          transaction_date: '2024-01-20',
          transaction_type: 'journal_entry',
          description: 'Transaction 2',
          debit: 0,
          credit: 50,
          is_posted: true
        }
      ]);
    });

    it('should retrieve account transactions', async () => {
      const res = await request(app)
        .get(`/v1/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter transactions by date range', async () => {
      const res = await request(app)
        .get(`/v1/accounts/${accountId}/transactions?startDate=2024-01-15&endDate=2024-01-15`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Check that all returned transactions are within the date range
      const allDatesMatch = res.body.data.every(txn => {
        const txnDate = txn.date.split('T')[0]; // Handle both date and datetime formats
        return txnDate === '2024-01-15';
      });
      expect(allDatesMatch).toBe(true);
    });

    it('should support pagination for transactions', async () => {
      const res = await request(app)
        .get(`/v1/accounts/${accountId}/transactions?limit=1`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });

    it('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .get('/v1/accounts/00000000-0000-0000-0000-000000000000/transactions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Authorization', () => {
    it('should not allow access to accounts from another organization', async () => {
      const org2 = await createTestOrganization();
      const user2 = await createTestUser(org2.id);

      const token2 = jwt.sign(
        { userId: user2.id, orgId: org2.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const createRes = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'Org 2 Account',
          type: 'asset'
        });

      const res = await request(app)
        .get('/v1/accounts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(account => account.id !== createRes.body.id)).toBe(true);
    });

    it('should not allow access to account details from another organization', async () => {
      const org2 = await createTestOrganization();
      const user2 = await createTestUser(org2.id);

      const token2 = jwt.sign(
        { userId: user2.id, orgId: org2.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const createRes = await request(app)
        .post('/v1/accounts')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'Org 2 Account',
          type: 'asset'
        });

      const res = await request(app)
        .get(`/v1/accounts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
