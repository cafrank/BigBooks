// ====================================================
// src/routes/payments.js
// ====================================================
const express = require('express');
const { body, query, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { generateDocNumber } = require('../utils/documentNumber');
const { AppError } = require('../middleware/errorHandler');

const paymentsRouter = express.Router();
paymentsRouter.use(authenticate);

// GET /v1/payments
paymentsRouter.get('/', [
  query('customerId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate
], async (req, res, next) => {
  try {
    let q = db('payments')
      .leftJoin('customers', 'payments.customer_id', 'customers.id')
      .where('payments.organization_id', req.user.orgId)
      .where('payments.is_voided', false)
      .select('payments.*', 'customers.display_name as customer_name')
      .orderBy('payments.payment_date', 'desc');

    if (req.query.customerId) q = q.where('payments.customer_id', req.query.customerId);
    if (req.query.startDate) q = q.where('payments.payment_date', '>=', req.query.startDate);
    if (req.query.endDate) q = q.where('payments.payment_date', '<=', req.query.endDate);

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatPayment);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/payments
paymentsRouter.post('/', [
  body('customerId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentDate').isISO8601(),
  body('paymentMethod').optional().isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other']),
  body('depositAccountId').optional().isUUID(),
  body('invoicesApplied').optional().isArray(),
  validate
], async (req, res, next) => {
  try {
    const payment = await db.transaction(async (trx) => {
      const paymentNumber = await generateDocNumber(req.user.orgId, 'payment');

      const [pmt] = await trx('payments')
        .insert({
          organization_id: req.user.orgId,
          customer_id: req.body.customerId,
          payment_number: paymentNumber,
          payment_date: req.body.paymentDate,
          amount: req.body.amount,
          payment_method: req.body.paymentMethod,
          reference_number: req.body.referenceNumber,
          deposit_account_id: req.body.depositAccountId,
          memo: req.body.memo,
          created_by: req.user.id
        })
        .returning('*');

      // Apply to invoices
      if (req.body.invoicesApplied?.length > 0) {
        const applications = req.body.invoicesApplied.map(app => ({
          payment_id: pmt.id,
          invoice_id: app.invoiceId,
          amount: app.amount
        }));
        await trx('payment_applications').insert(applications);

        // Update invoice status and amounts
        for (const app of req.body.invoicesApplied) {
          await updateInvoiceStatus(trx, app.invoiceId);
        }
      }

      // Create ledger entries
      if (req.body.depositAccountId) {
        const arAccount = await trx('accounts')
          .where({ organization_id: req.user.orgId, account_subtype: 'accounts_receivable' })
          .first();

        await trx('ledger_entries').insert([
          {
            organization_id: req.user.orgId,
            account_id: req.body.depositAccountId,
            transaction_date: req.body.paymentDate,
            transaction_type: 'payment',
            source_id: pmt.id,
            description: `Payment from customer - ${paymentNumber}`,
            debit: req.body.amount,
            credit: 0,
            customer_id: req.body.customerId
          },
          {
            organization_id: req.user.orgId,
            account_id: arAccount.id,
            transaction_date: req.body.paymentDate,
            transaction_type: 'payment',
            source_id: pmt.id,
            description: `Payment from customer - ${paymentNumber}`,
            debit: 0,
            credit: req.body.amount,
            customer_id: req.body.customerId
          }
        ]);
      }

      return pmt;
    });

    res.status(201).json(await getPaymentById(payment.id, req.user.orgId));
  } catch (err) {
    next(err);
  }
});

// GET /v1/payments/:id
paymentsRouter.get('/:id', [param('id').isUUID(), validate], async (req, res, next) => {
  try {
    const payment = await getPaymentById(req.params.id, req.user.orgId);
    if (!payment) throw new AppError('Payment not found', 404);
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/payments/:id
paymentsRouter.delete('/:id', [param('id').isUUID(), validate], async (req, res, next) => {
  try {
    await db.transaction(async (trx) => {
      // Get invoice IDs before deleting applications
      const applications = await trx('payment_applications')
        .where('payment_id', req.params.id)
        .select('invoice_id');

      await trx('payments')
        .where({ id: req.params.id, organization_id: req.user.orgId })
        .update({ is_voided: true, voided_at: db.fn.now() });

      await trx('payment_applications').where('payment_id', req.params.id).del();

      // Update invoice statuses
      for (const app of applications) {
        await updateInvoiceStatus(trx, app.invoice_id);
      }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

async function getPaymentById(id, orgId) {
  const payment = await db('payments')
    .leftJoin('customers', 'payments.customer_id', 'customers.id')
    .where('payments.id', id)
    .where('payments.organization_id', orgId)
    .select('payments.*', 'customers.display_name as customer_name')
    .first();

  if (!payment) return null;

  const applications = await db('payment_applications')
    .leftJoin('invoices', 'payment_applications.invoice_id', 'invoices.id')
    .where('payment_id', id)
    .select('payment_applications.*', 'invoices.invoice_number');

  return {
    ...formatPayment(payment),
    invoicesApplied: applications.map(a => ({
      invoiceId: a.invoice_id,
      invoiceNumber: a.invoice_number,
      amount: { amount: parseFloat(a.amount), currency: 'USD' }
    }))
  };
}

function formatPayment(p) {
  return {
    id: p.id,
    paymentNumber: p.payment_number,
    customerId: p.customer_id,
    customerName: p.customer_name,
    paymentDate: p.payment_date,
    amount: { amount: parseFloat(p.amount), currency: 'USD' },
    paymentMethod: p.payment_method,
    referenceNumber: p.reference_number,
    memo: p.memo,
    createdAt: p.created_at
  };
}

async function updateInvoiceStatus(trx, invoiceId) {
  // Get invoice total
  const invoice = await trx('invoices')
    .where('id', invoiceId)
    .select('total')
    .first();

  if (!invoice) return;

  // Calculate total payments
  const result = await trx('payment_applications')
    .where('invoice_id', invoiceId)
    .sum('amount as total_paid')
    .first();

  const totalPaid = parseFloat(result.total_paid || 0);
  const totalAmount = parseFloat(invoice.total);
  const amountDue = totalAmount - totalPaid;

  // Determine status
  let status = 'draft';
  if (totalPaid === 0) {
    status = 'draft';
  } else if (totalPaid >= totalAmount) {
    status = 'paid';
  } else {
    status = 'partial';
  }

  // Update invoice
  await trx('invoices')
    .where('id', invoiceId)
    .update({
      amount_paid: totalPaid,
      amount_due: amountDue,
      status: status
    });
}

module.exports = paymentsRouter;

// module.exports = {
//   payments: paymentsRouter,
//   // ...
// };