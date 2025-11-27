// --- __tests__/bills.test.js ---
const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');
const {
  createTestOrganization,
  createTestUser,
  createTestVendor,
  createTestAccount
} = require('./helpers/testData');

describe('Bills API', () => {
  let token;
  let orgId;
  let vendorId;
  let accountId;

  beforeEach(async () => {
    const org = await createTestOrganization();
    const user = await createTestUser(org.id);
    const vendor = await createTestVendor(org.id);
    const account = await createTestAccount(org.id, 'expense');

    orgId = org.id;
    vendorId = vendor.id;
    accountId = account.id;

    token = jwt.sign(
      { userId: user.id, orgId: org.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /v1/bills', () => {
    it('should create a new bill', async () => {
      const res = await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            {
              accountId: accountId,
              description: 'Office Supplies',
              quantity: 10,
              amount: 150.00
            },
            {
              accountId: accountId,
              description: 'Equipment',
              quantity: 1,
              amount: 500.00
            }
          ],
          memo: 'Monthly vendor bill'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('billNumber');
      expect(res.body.status).toBe('open');
      expect(res.body.vendorId).toBe(vendorId);
      expect(res.body.total.amount).toBe(650.00);
      expect(res.body.amountDue.amount).toBe(650.00);
    });

    it('should calculate totals correctly with tax', async () => {
      const res = await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            { accountId: accountId, description: 'Item 1', quantity: 2, amount: 100 },
            { accountId: accountId, description: 'Item 2', quantity: 1, amount: 50 }
          ],
          taxAmount: 15
        });

      expect(res.status).toBe(201);
      expect(res.body.total.amount).toBe(165); // 150 + 15 tax
      expect(res.body.amountDue.amount).toBe(165);
    });

    it('should require at least one line item', async () => {
      const res = await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: []
        });

      expect(res.status).toBe(400);
    });

    it('should require valid vendor ID', async () => {
      const res = await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: 'not-a-uuid',
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            { accountId: accountId, description: 'Item 1', amount: 100 }
          ]
        });

      expect(res.status).toBe(400); // Invalid UUID format
    });

    it('should require valid account ID for line items', async () => {
      const res = await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            { accountId: 'invalid-uuid', description: 'Item 1', amount: 100 }
          ]
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/bills', () => {
    beforeEach(async () => {
      // Create some test bills
      await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            { accountId: accountId, description: 'Item 1', amount: 100 }
          ]
        });

      await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          billDate: '2024-03-21',
          dueDate: '2024-04-20',
          lineItems: [
            { accountId: accountId, description: 'Item 2', amount: 200 }
          ]
        });
    });

    it('should retrieve all bills', async () => {
      const res = await request(app)
        .get('/v1/bills')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should filter bills by vendor', async () => {
      const res = await request(app)
        .get(`/v1/bills?vendorId=${vendorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(bill => bill.vendorId === vendorId)).toBe(true);
    });

    it('should filter bills by status', async () => {
      const res = await request(app)
        .get('/v1/bills?status=open')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(bill => bill.status === 'open')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/v1/bills?limit=1&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.offset).toBe(0);
    });
  });

  describe('POST /v1/bills/:id/pay', () => {
    let billId;
    let paymentAccountId;

    beforeEach(async () => {
      // Create a payment account (asset account for cash)
      const paymentAccount = await createTestAccount(orgId, 'asset');
      paymentAccountId = paymentAccount.id;

      // Create a bill to pay
      const createRes = await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            { accountId: accountId, description: 'Service', amount: 1000 }
          ]
        });

      billId = createRes.body.id;
    });

    it('should record a full payment', async () => {
      const res = await request(app)
        .post(`/v1/bills/${billId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 1000,
          paymentDate: '2024-03-25',
          paymentAccountId: paymentAccountId,
          paymentMethod: 'check',
          referenceNumber: 'CHK-001'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Payment recorded successfully');
    });

    it('should record a partial payment', async () => {
      const res = await request(app)
        .post(`/v1/bills/${billId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 500,
          paymentDate: '2024-03-25',
          paymentAccountId: paymentAccountId,
          paymentMethod: 'check'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Payment recorded successfully');
    });

    it('should reject payment amount greater than amount due', async () => {
      const res = await request(app)
        .post(`/v1/bills/${billId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 1500,
          paymentDate: '2024-03-25',
          paymentAccountId: paymentAccountId,
          paymentMethod: 'check'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('exceeds amount due');
    });

    it('should require payment account ID', async () => {
      const res = await request(app)
        .post(`/v1/bills/${billId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 1000,
          paymentDate: '2024-03-25',
          paymentMethod: 'check'
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent bill', async () => {
      const res = await request(app)
        .post('/v1/bills/00000000-0000-0000-0000-000000000000/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 1000,
          paymentDate: '2024-03-25',
          paymentAccountId: paymentAccountId,
          paymentMethod: 'check'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/v1/bills');

      expect(res.status).toBe(401);
    });

    it('should not allow access to bills from another organization', async () => {
      // Create a second organization and vendor
      const org2 = await createTestOrganization();
      const user2 = await createTestUser(org2.id);
      const vendor2 = await createTestVendor(org2.id);
      const account2 = await createTestAccount(org2.id, 'expense');

      const token2 = jwt.sign(
        { userId: user2.id, orgId: org2.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Create a bill in org2
      const createRes = await request(app)
        .post('/v1/bills')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          vendorId: vendor2.id,
          billDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            { accountId: account2.id, description: 'Item 1', amount: 100 }
          ]
        });

      // Try to get bills with org1's token
      const res = await request(app)
        .get('/v1/bills')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should not include the bill from org2
      expect(res.body.data.every(bill => bill.id !== createRes.body.id)).toBe(true);
    });
  });
});
