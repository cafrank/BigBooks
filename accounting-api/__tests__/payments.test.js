// --- __tests__/payments.test.js ---
const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');
const db = require('../src/config/database');
const { 
  createTestOrganization, 
  createTestUser, 
  createTestCustomer,
  createTestAccount
} = require('./helpers/testData');

describe('Payments API', () => {
  let token;
  let orgId;
  let customerId;
  let invoiceId;
  let depositAccountId;

  beforeEach(async () => {
    const org = await createTestOrganization();
    const user = await createTestUser(org.id);
    const customer = await createTestCustomer(org.id);
    
    orgId = org.id;
    customerId = customer.id;
    
    token = jwt.sign(
      { userId: user.id, orgId: org.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Get checking account
    const account = await db('accounts')
      .where({ organization_id: org.id, account_subtype: 'bank' })
      .first();
    depositAccountId = account.id;

    // Create test invoice
    const invoiceRes = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customerId,
        lineItems: [
          { description: 'Service', quantity: 1, unitPrice: 1000 }
        ]
      });
    invoiceId = invoiceRes.body.id;
  });

  describe('POST /v1/payments', () => {
    it('should record a payment and apply to invoice', async () => {
      const res = await request(app)
        .post('/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          amount: 1000,
          paymentDate: '2024-03-20',
          paymentMethod: 'check',
          depositAccountId: depositAccountId,
          invoicesApplied: [
            { invoiceId: invoiceId, amount: 1000 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.amount.amount).toBe(1000);
      expect(res.body.invoicesApplied).toHaveLength(1);

      // Verify invoice updated
      const invoiceRes = await request(app)
        .get(`/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(invoiceRes.body.status).toBe('paid');
      expect(invoiceRes.body.amountPaid.amount).toBe(1000);
      expect(invoiceRes.body.amountDue.amount).toBe(0);
    });

    it('should handle partial payments', async () => {
      const res = await request(app)
        .post('/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          amount: 500,
          paymentDate: '2024-03-20',
          depositAccountId: depositAccountId,
          invoicesApplied: [
            { invoiceId: invoiceId, amount: 500 }
          ]
        });

      expect(res.status).toBe(201);

      // Verify invoice status
      const invoiceRes = await request(app)
        .get(`/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(invoiceRes.body.status).toBe('partial');
      expect(invoiceRes.body.amountDue.amount).toBe(500);
    });
  });

  describe('DELETE /v1/payments/:id', () => {
    it('should void a payment and update invoice', async () => {
      const paymentRes = await request(app)
        .post('/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          amount: 1000,
          paymentDate: '2024-03-20',
          depositAccountId: depositAccountId,
          invoicesApplied: [
            { invoiceId: invoiceId, amount: 1000 }
          ]
        });

      const res = await request(app)
        .delete(`/v1/payments/${paymentRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify invoice reverted
      const invoiceRes = await request(app)
        .get(`/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(invoiceRes.body.status).toBe('draft');
      expect(invoiceRes.body.amountDue.amount).toBe(1000);
    });
  });
});
