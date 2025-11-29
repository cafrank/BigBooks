// --- __tests__/invoices.test.js ---
const request = require('supertest');
const app = require('../src/index');
const jwt = require('jsonwebtoken');
const { 
  createTestOrganization, 
  createTestUser, 
  createTestCustomer 
} = require('./helpers/testData');

describe('Invoices API', () => {
  let token;
  let orgId;
  let customerId;

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
  });

  describe('POST /v1/invoices', () => {
    it('should create a new invoice', async () => {
      const res = await request(app)
        .post('/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          issueDate: '2024-03-20',
          dueDate: '2024-04-19',
          lineItems: [
            {
              description: 'Consulting Services',
              quantity: 10,
              unitPrice: 150.00
            },
            {
              description: 'Software License',
              quantity: 1,
              unitPrice: 500.00
            }
          ],
          notes: 'Thank you for your business'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('invoiceNumber');
      expect(res.body.status).toBe('draft');
      expect(res.body.lineItems).toHaveLength(2);
      expect(res.body.total.amount).toBe(2000.00);
      expect(res.body.amountDue.amount).toBe(2000.00);
    });

    it('should calculate totals correctly', async () => {
      const res = await request(app)
        .post('/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          lineItems: [
            { description: 'Item 1', quantity: 2, unitPrice: 100 },
            { description: 'Item 2', quantity: 1, unitPrice: 50 }
          ],
          discountAmount: 25
        });

      expect(res.body.subtotal.amount).toBe(250);
      expect(res.body.total.amount).toBe(225); // 250 - 25
    });

    it('should require at least one line item', async () => {
      const res = await request(app)
        .post('/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          lineItems: []
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /v1/invoices/:id', () => {
    it('should update an invoice with new line items', async () => {
      // Create invoice first
      const createRes = await request(app)
        .post('/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          lineItems: [
            { description: 'Original Item', quantity: 1, unitPrice: 1000 }
          ]
        });

      // Update the invoice
      const updateRes = await request(app)
        .put(`/v1/invoices/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          issueDate: '2024-03-20',
          dueDate: '2024-04-20',
          lineItems: [
            { description: 'Updated Item 1', quantity: 2, unitPrice: 500 },
            { description: 'New Item 2', quantity: 1, unitPrice: 250 }
          ],
          notes: 'Updated notes'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.lineItems).toHaveLength(2);
      expect(updateRes.body.lineItems[0].description).toBe('Updated Item 1');
      expect(updateRes.body.total.amount).toBe(1250);
      expect(updateRes.body.notes).toBe('Updated notes');
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app)
        .put('/v1/invoices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          lineItems: [
            { description: 'Item', quantity: 1, unitPrice: 100 }
          ]
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/invoices/:id', () => {
    it('should retrieve invoice details', async () => {
      const createRes = await request(app)
        .post('/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          lineItems: [
            { description: 'Service', quantity: 1, unitPrice: 1000 }
          ]
        });

      const res = await request(app)
        .get(`/v1/invoices/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
      expect(res.body.lineItems).toHaveLength(1);
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app)
        .get('/v1/invoices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/invoices/:id/send', () => {
    it('should mark invoice as sent', async () => {
      const createRes = await request(app)
        .post('/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customerId,
          lineItems: [
            { description: 'Service', quantity: 1, unitPrice: 1000 }
          ]
        });

      const res = await request(app)
        .post(`/v1/invoices/${createRes.body.id}/send`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'customer@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invoice sent successfully');

      // Verify status changed
      const getRes = await request(app)
        .get(`/v1/invoices/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.body.status).toBe('sent');
    });
  });
});
