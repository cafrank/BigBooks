// src/routes/invoices.js
const express = require('express');
const { body, query, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { generateDocNumber } = require('../utils/documentNumber');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management
 */

// GET /v1/invoices
router.get('/', [
  query('status').optional().isIn(['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'voided']),
  query('customerId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    let q = db('invoices')
      .leftJoin('customers', 'invoices.customer_id', 'customers.id')
      .where('invoices.organization_id', req.user.orgId)
      .select('invoices.*', 'customers.display_name as customer_name')
      .orderBy('invoices.issue_date', 'desc');

    if (req.query.status) q = q.where('invoices.status', req.query.status);
    if (req.query.customerId) q = q.where('invoices.customer_id', req.query.customerId);
    if (req.query.startDate) q = q.where('invoices.issue_date', '>=', req.query.startDate);
    if (req.query.endDate) q = q.where('invoices.issue_date', '<=', req.query.endDate);

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatInvoiceSummary);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/invoices
router.post('/', [
  body('customerId').isUUID(),
  body('issueDate').optional().isISO8601(),
  body('dueDate').optional().isISO8601(),
  body('lineItems').isArray({ min: 1 }),
  body('lineItems.*.description').notEmpty(),
  body('lineItems.*.quantity').isFloat({ min: 0.0001 }),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }),
  body('lineItems.*.productId').optional().isUUID(),
  body('lineItems.*.taxRateId').optional().isUUID(),
  body('discountAmount').optional().isFloat({ min: 0 }),
  body('shippingAmount').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const invoice = await db.transaction(async (trx) => {
      const invoiceNumber = await generateDocNumber(req.user.orgId, 'invoice');
      
      // Calculate line items
      const lineItems = req.body.lineItems.map((item) => {
        const amount = item.quantity * item.unitPrice;
        const discount = amount * ((item.discountPercent || 0) / 100);
        const subtotal = amount - discount;
        const tax = subtotal * ((item.taxRate || 0) / 100);
        
        return {
          ...item,
          amount: subtotal,
          taxAmount: tax
        };
      });
      
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const discountAmount = req.body.discountAmount || 0;
      const shippingAmount = req.body.shippingAmount || 0;
      const total = subtotal + taxAmount + shippingAmount - discountAmount;

      // Default dates
      const issueDate = req.body.issueDate || new Date().toISOString().split('T')[0];
      const dueDate = req.body.dueDate || 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [inv] = await trx('invoices')
        .insert({
          organization_id: req.user.orgId,
          customer_id: req.body.customerId,
          invoice_number: invoiceNumber,
          status: 'draft',
          issue_date: issueDate,
          due_date: dueDate,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          shipping_amount: shippingAmount,
          total,
          amount_due: total,
          notes: req.body.notes,
          terms: req.body.terms,
          created_by: req.user.id
        })
        .returning('*');

      // Insert line items
      const lines = lineItems.map((item, idx) => ({
        invoice_id: inv.id,
        product_id: item.productId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_percent: item.discountPercent || 0,
        tax_rate_id: item.taxRateId,
        tax_amount: item.taxAmount,
        amount: item.amount,
        sort_order: idx
      }));

      await trx('invoice_line_items').insert(lines);

      return inv;
    });

    const fullInvoice = await getInvoiceById(invoice.id, req.user.orgId);
    res.status(201).json(fullInvoice);
  } catch (err) {
    next(err);
  }
});

// GET /v1/invoices/:id
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const invoice = await getInvoiceById(req.params.id, req.user.orgId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/invoices/:id
router.patch('/:id', [
  param('id').isUUID(),
  body('status').optional().isIn(['draft', 'sent', 'voided']),
  body('dueDate').optional().isISO8601(),
  body('notes').optional(),
  body('terms').optional(),
  validate
], async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.dueDate) updates.due_date = req.body.dueDate;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.terms !== undefined) updates.terms = req.body.terms;
    if (req.body.status === 'voided') updates.voided_at = db.fn.now();

    const [invoice] = await db('invoices')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .update(updates)
      .returning('*');

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    
    const fullInvoice = await getInvoiceById(invoice.id, req.user.orgId);
    res.json(fullInvoice);
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/invoices/:id
router.delete('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const invoice = await db('invoices')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (parseFloat(invoice.amount_paid) > 0) {
      throw new AppError('Cannot delete invoice with payments', 400);
    }

    await db('invoices').where({ id: req.params.id }).del();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /v1/invoices/:id/send
router.post('/:id/send', [
  param('id').isUUID(),
  body('email').optional().isEmail(),
  body('message').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const invoice = await db('invoices')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'voided') {
      throw new AppError('Cannot send voided invoice', 400);
    }

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just update status
    await db('invoices')
      .where({ id: req.params.id })
      .update({
        status: 'sent',
        sent_at: db.fn.now()
      });

    res.json({
      message: 'Invoice sent successfully',
      sentAt: new Date()
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/invoices/:id/pdf
router.get('/:id/pdf', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const invoice = await getInvoiceById(req.params.id, req.user.orgId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // TODO: Implement PDF generation (using pdfkit, puppeteer, etc.)
    res.status(501).json({ error: 'PDF generation not yet implemented' });
  } catch (err) {
    next(err);
  }
});

// Helper functions
async function getInvoiceById(id, orgId) {
  const invoice = await db('invoices')
    .leftJoin('customers', 'invoices.customer_id', 'customers.id')
    .where('invoices.id', id)
    .where('invoices.organization_id', orgId)
    .select(
      'invoices.*',
      'customers.display_name as customer_name',
      'customers.email as customer_email'
    )
    .first();

  if (!invoice) return null;

  const lineItems = await db('invoice_line_items')
    .leftJoin('products', 'invoice_line_items.product_id', 'products.id')
    .where('invoice_id', id)
    .select('invoice_line_items.*', 'products.name as product_name')
    .orderBy('sort_order');

  return formatInvoice(invoice, lineItems);
}

function formatInvoiceSummary(inv) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    customerId: inv.customer_id,
    customerName: inv.customer_name,
    status: inv.status,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    total: { amount: parseFloat(inv.total), currency: inv.currency || 'USD' },
    amountDue: { amount: parseFloat(inv.amount_due), currency: inv.currency || 'USD' },
    createdAt: inv.created_at
  };
}

function formatInvoice(inv, lineItems) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    customerId: inv.customer_id,
    customer: {
      id: inv.customer_id,
      displayName: inv.customer_name,
      email: inv.customer_email
    },
    status: inv.status,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    lineItems: lineItems.map(li => ({
      id: li.id,
      productId: li.product_id,
      productName: li.product_name,
      description: li.description,
      quantity: parseFloat(li.quantity),
      unitPrice: { amount: parseFloat(li.unit_price), currency: 'USD' },
      discountPercent: parseFloat(li.discount_percent),
      taxAmount: { amount: parseFloat(li.tax_amount || 0), currency: 'USD' },
      amount: { amount: parseFloat(li.amount), currency: 'USD' }
    })),
    subtotal: { amount: parseFloat(inv.subtotal), currency: 'USD' },
    discountAmount: { amount: parseFloat(inv.discount_amount || 0), currency: 'USD' },
    taxAmount: { amount: parseFloat(inv.tax_amount || 0), currency: 'USD' },
    shippingAmount: { amount: parseFloat(inv.shipping_amount || 0), currency: 'USD' },
    total: { amount: parseFloat(inv.total), currency: 'USD' },
    amountPaid: { amount: parseFloat(inv.amount_paid || 0), currency: 'USD' },
    amountDue: { amount: parseFloat(inv.amount_due), currency: 'USD' },
    notes: inv.notes,
    terms: inv.terms,
    sentAt: inv.sent_at,
    paidAt: inv.paid_at,
    voidedAt: inv.voided_at,
    createdAt: inv.created_at,
    updatedAt: inv.updated_at
  };
}

module.exports = router;