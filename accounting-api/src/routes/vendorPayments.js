// ====================================================
// src/routes/vendorPayments.js
// ====================================================
const express = require('express');
const { body, query, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { generateDocNumber } = require('../utils/documentNumber');
const { AppError } = require('../middleware/errorHandler');

const vendorPaymentsRouter = express.Router();
vendorPaymentsRouter.use(authenticate);

// GET /v1/vendor-payments
vendorPaymentsRouter.get('/', [
  query('vendorId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate
], async (req, res, next) => {
  try {
    let q = db('bill_payments')
      .leftJoin('vendors', 'bill_payments.vendor_id', 'vendors.id')
      .where('bill_payments.organization_id', req.user.orgId)
      .where('bill_payments.is_voided', false)
      .select('bill_payments.*', 'vendors.display_name as vendor_name')
      .orderBy('bill_payments.payment_date', 'desc');

    if (req.query.vendorId) q = q.where('bill_payments.vendor_id', req.query.vendorId);
    if (req.query.startDate) q = q.where('bill_payments.payment_date', '>=', req.query.startDate);
    if (req.query.endDate) q = q.where('bill_payments.payment_date', '<=', req.query.endDate);

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatVendorPayment);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/vendor-payments
vendorPaymentsRouter.post('/', [
  body('vendorId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentDate').isISO8601(),
  body('paymentMethod').optional().isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other']),
  body('paymentAccountId').isUUID(),
  body('billsApplied').optional().isArray(),
  validate
], async (req, res, next) => {
  try {
    const payment = await db.transaction(async (trx) => {
      const paymentNumber = await generateDocNumber(req.user.orgId, 'vendor_payment');

      const [pmt] = await trx('bill_payments')
        .insert({
          organization_id: req.user.orgId,
          vendor_id: req.body.vendorId,
          payment_number: paymentNumber,
          payment_date: req.body.paymentDate,
          amount: req.body.amount,
          payment_method: req.body.paymentMethod,
          reference_number: req.body.referenceNumber,
          payment_account_id: req.body.paymentAccountId,
          memo: req.body.memo,
          created_by: req.user.id
        })
        .returning('*');

      // Apply to bills
      if (req.body.billsApplied?.length > 0) {
        const applications = req.body.billsApplied.map(app => ({
          bill_payment_id: pmt.id,
          bill_id: app.billId,
          amount: app.amount
        }));
        await trx('bill_payment_applications').insert(applications);

        // Update bill status and amounts
        for (const app of req.body.billsApplied) {
          await updateBillStatus(trx, app.billId);
        }
      }

      // Create ledger entries
      const apAccount = await trx('accounts')
        .where({ organization_id: req.user.orgId, account_subtype: 'accounts_payable' })
        .first();

      if (!apAccount) {
        throw new AppError('Accounts Payable account not found', 400);
      }

      await trx('ledger_entries').insert([
        {
          organization_id: req.user.orgId,
          account_id: apAccount.id,
          transaction_date: req.body.paymentDate,
          transaction_type: 'bill_payment',
          source_id: pmt.id,
          description: `Payment to vendor - ${paymentNumber}`,
          debit: req.body.amount,
          credit: 0,
          vendor_id: req.body.vendorId
        },
        {
          organization_id: req.user.orgId,
          account_id: req.body.paymentAccountId,
          transaction_date: req.body.paymentDate,
          transaction_type: 'bill_payment',
          source_id: pmt.id,
          description: `Payment to vendor - ${paymentNumber}`,
          debit: 0,
          credit: req.body.amount,
          vendor_id: req.body.vendorId
        }
      ]);

      return pmt;
    });

    res.status(201).json(await getVendorPaymentById(payment.id, req.user.orgId));
  } catch (err) {
    next(err);
  }
});

// GET /v1/vendor-payments/:id
vendorPaymentsRouter.get('/:id', [param('id').isUUID(), validate], async (req, res, next) => {
  try {
    const payment = await getVendorPaymentById(req.params.id, req.user.orgId);
    if (!payment) throw new AppError('Vendor payment not found', 404);
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

// PUT /v1/vendor-payments/:id
vendorPaymentsRouter.put('/:id', [
  param('id').isUUID(),
  body('vendorId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentDate').isISO8601(),
  body('paymentMethod').optional().isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other']),
  body('paymentAccountId').isUUID(),
  body('billsApplied').optional().isArray(),
  validate
], async (req, res, next) => {
  try {
    const payment = await db.transaction(async (trx) => {
      // Update payment
      const [pmt] = await trx('bill_payments')
        .where({ id: req.params.id, organization_id: req.user.orgId })
        .update({
          vendor_id: req.body.vendorId,
          payment_date: req.body.paymentDate,
          amount: req.body.amount,
          payment_method: req.body.paymentMethod,
          reference_number: req.body.referenceNumber,
          payment_account_id: req.body.paymentAccountId,
          memo: req.body.memo,
          updated_at: db.fn.now()
        })
        .returning('*');

      if (!pmt) throw new AppError('Vendor payment not found', 404);

      // Get old bill applications
      const oldApplications = await trx('bill_payment_applications')
        .where('bill_payment_id', req.params.id)
        .select('bill_id');

      // Delete old applications
      await trx('bill_payment_applications').where('bill_payment_id', req.params.id).del();

      // Insert new applications
      if (req.body.billsApplied?.length > 0) {
        const applications = req.body.billsApplied.map(app => ({
          bill_payment_id: pmt.id,
          bill_id: app.billId,
          amount: app.amount
        }));
        await trx('bill_payment_applications').insert(applications);
      }

      // Update all affected bill statuses
      const allBillIds = new Set([
        ...oldApplications.map(a => a.bill_id),
        ...(req.body.billsApplied || []).map(a => a.billId)
      ]);

      for (const billId of allBillIds) {
        await updateBillStatus(trx, billId);
      }

      return pmt;
    });

    res.json(await getVendorPaymentById(payment.id, req.user.orgId));
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/vendor-payments/:id
vendorPaymentsRouter.delete('/:id', [param('id').isUUID(), validate], async (req, res, next) => {
  try {
    await db.transaction(async (trx) => {
      // Get bill IDs before deleting applications
      const applications = await trx('bill_payment_applications')
        .where('bill_payment_id', req.params.id)
        .select('bill_id');

      await trx('bill_payments')
        .where({ id: req.params.id, organization_id: req.user.orgId })
        .update({ is_voided: true, voided_at: db.fn.now() });

      await trx('bill_payment_applications').where('bill_payment_id', req.params.id).del();

      // Update bill statuses
      for (const app of applications) {
        await updateBillStatus(trx, app.bill_id);
      }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

async function getVendorPaymentById(id, orgId) {
  const payment = await db('bill_payments')
    .leftJoin('vendors', 'bill_payments.vendor_id', 'vendors.id')
    .where('bill_payments.id', id)
    .where('bill_payments.organization_id', orgId)
    .select('bill_payments.*', 'vendors.display_name as vendor_name')
    .first();

  if (!payment) return null;

  const applications = await db('bill_payment_applications')
    .leftJoin('bills', 'bill_payment_applications.bill_id', 'bills.id')
    .where('bill_payment_id', id)
    .select('bill_payment_applications.*', 'bills.bill_number');

  return {
    ...formatVendorPayment(payment),
    billsApplied: applications.map(a => ({
      billId: a.bill_id,
      billNumber: a.bill_number,
      amount: { amount: parseFloat(a.amount), currency: 'USD' }
    }))
  };
}

function formatVendorPayment(p) {
  return {
    id: p.id,
    paymentNumber: p.payment_number,
    vendorId: p.vendor_id,
    vendorName: p.vendor_name,
    paymentDate: p.payment_date,
    amount: { amount: parseFloat(p.amount), currency: 'USD' },
    paymentMethod: p.payment_method,
    referenceNumber: p.reference_number,
    paymentAccountId: p.payment_account_id,
    memo: p.memo,
    createdAt: p.created_at
  };
}

async function updateBillStatus(trx, billId) {
  // Get bill total
  const bill = await trx('bills')
    .where('id', billId)
    .select('total')
    .first();

  if (!bill) return;

  // Calculate total payments
  const result = await trx('bill_payment_applications')
    .where('bill_id', billId)
    .sum('amount as total_paid')
    .first();

  const totalPaid = parseFloat(result.total_paid || 0);
  const totalAmount = parseFloat(bill.total);
  const amountDue = totalAmount - totalPaid;

  // Determine status
  let status = 'open';
  if (totalPaid === 0) {
    status = 'open';
  } else if (totalPaid >= totalAmount) {
    status = 'paid';
  } else {
    status = 'partial';
  }

  // Update bill
  await trx('bills')
    .where('id', billId)
    .update({
      amount_due: amountDue,
      status: status
    });
}

module.exports = vendorPaymentsRouter;
