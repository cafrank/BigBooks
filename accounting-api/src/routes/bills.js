// --- src/routes/bills.js ---
const express = require('express');
const { body, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { generateDocNumber } = require('../utils/documentNumber');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

// GET /v1/bills
router.get('/', async (req, res, next) => {
  try {
    let q = db('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .where('bills.organization_id', req.user.orgId)
      .select('bills.*', 'vendors.display_name as vendor_name')
      .orderBy('bills.due_date');

    if (req.query.status) q = q.where('bills.status', req.query.status);
    if (req.query.vendorId) q = q.where('bills.vendor_id', req.query.vendorId);

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatBillSummary);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /v1/bills/:id
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const bill = await db('bills')
      .leftJoin('vendors', 'bills.vendor_id', 'vendors.id')
      .where({ 'bills.id': req.params.id, 'bills.organization_id': req.user.orgId })
      .select('bills.*', 'vendors.display_name as vendor_name')
      .first();

    if (!bill) throw new AppError('Bill not found', 404);

    const lineItems = await db('bill_line_items')
      .leftJoin('accounts', 'bill_line_items.account_id', 'accounts.id')
      .where('bill_line_items.bill_id', bill.id)
      .select(
        'bill_line_items.*',
        'accounts.name as account_name',
        'accounts.account_number'
      )
      .orderBy('bill_line_items.sort_order');

    res.json(formatBillDetail(bill, lineItems));
  } catch (err) { next(err); }
});

// POST /v1/bills
router.post('/', [
  body('vendorId').isUUID(),
  body('apAccountId').optional().isUUID(),
  body('billDate').isISO8601(),
  body('dueDate').isISO8601(),
  body('lineItems').isArray({ min: 1 }),
  body('lineItems.*.accountId').isUUID(),
  body('lineItems.*.amount').isFloat({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    const bill = await db.transaction(async (trx) => {
      const billNumber = await generateDocNumber(req.user.orgId, 'bill');
      const subtotal = req.body.lineItems.reduce((sum, li) => sum + li.amount, 0);
      const total = subtotal + (req.body.taxAmount || 0);

      const [b] = await trx('bills')
        .insert({
          organization_id: req.user.orgId,
          vendor_id: req.body.vendorId,
          bill_number: billNumber,
          vendor_invoice_number: req.body.vendorInvoiceNumber,
          status: 'open',
          bill_date: req.body.billDate,
          due_date: req.body.dueDate,
          subtotal,
          tax_amount: req.body.taxAmount || 0,
          total,
          amount_due: total,
          ap_account_id: req.body.apAccountId,
          memo: req.body.memo,
          created_by: req.user.id
        })
        .returning('*');

      const lines = req.body.lineItems.map((item, idx) => ({
        bill_id: b.id,
        account_id: item.accountId,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.amount / (item.quantity || 1),
        amount: item.amount,
        sort_order: idx
      }));

      await trx('bill_line_items').insert(lines);

      return b;
    });

    res.status(201).json(formatBillSummary(bill));
  } catch (err) { next(err); }
});

// POST /v1/bills/:id/pay
router.post('/:id/pay', [
  param('id').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentDate').isISO8601(),
  body('paymentAccountId').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const bill = await db('bills')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!bill) throw new AppError('Bill not found', 404);
    if (req.body.amount > parseFloat(bill.amount_due)) {
      throw new AppError('Payment amount exceeds amount due', 400);
    }

    await db.transaction(async (trx) => {
      const [payment] = await trx('bill_payments')
        .insert({
          organization_id: req.user.orgId,
          vendor_id: bill.vendor_id,
          payment_date: req.body.paymentDate,
          amount: req.body.amount,
          payment_method: req.body.paymentMethod,
          reference_number: req.body.referenceNumber,
          payment_account_id: req.body.paymentAccountId,
          created_by: req.user.id
        })
        .returning('*');

      await trx('bill_payment_applications').insert({
        bill_payment_id: payment.id,
        bill_id: bill.id,
        amount: req.body.amount
      });

      // Create ledger entries
      const apAccount = await trx('accounts')
        .where({ organization_id: req.user.orgId, account_subtype: 'accounts_payable' })
        .first();

      await trx('ledger_entries').insert([
        {
          organization_id: req.user.orgId,
          account_id: apAccount.id,
          transaction_date: req.body.paymentDate,
          transaction_type: 'bill_payment',
          source_id: payment.id,
          debit: req.body.amount,
          credit: 0,
          vendor_id: bill.vendor_id
        },
        {
          organization_id: req.user.orgId,
          account_id: req.body.paymentAccountId,
          transaction_date: req.body.paymentDate,
          transaction_type: 'bill_payment',
          source_id: payment.id,
          debit: 0,
          credit: req.body.amount,
          vendor_id: bill.vendor_id
        }
      ]);

      // Update bill amount_due and status
      const newAmountDue = parseFloat(bill.amount_due) - req.body.amount;
      let newStatus = bill.status;

      if (newAmountDue <= 0) {
        newStatus = 'paid';
      } else if (newAmountDue < parseFloat(bill.total)) {
        newStatus = 'partial';
      }

      await trx('bills')
        .where({ id: bill.id })
        .update({
          amount_due: newAmountDue,
          status: newStatus,
          updated_at: trx.fn.now()
        });
    });

    res.json({ message: 'Payment recorded successfully' });
  } catch (err) { next(err); }
});

function formatBillSummary(b) {
  return {
    id: b.id,
    billNumber: b.bill_number,
    vendorId: b.vendor_id,
    vendorName: b.vendor_name,
    status: b.status,
    billDate: b.bill_date,
    dueDate: b.due_date,
    total: { amount: parseFloat(b.total), currency: 'USD' },
    amountDue: { amount: parseFloat(b.amount_due), currency: 'USD' },
    amountPaid: { amount: parseFloat(b.total) - parseFloat(b.amount_due), currency: 'USD' },
    subtotal: { amount: parseFloat(b.subtotal), currency: 'USD' },
    taxAmount: { amount: parseFloat(b.tax_amount || 0), currency: 'USD' },
    createdAt: b.created_at
  };
}

function formatBillDetail(bill, lineItems) {
  return {
    id: bill.id,
    billNumber: bill.bill_number,
    vendorId: bill.vendor_id,
    vendorName: bill.vendor_name,
    status: bill.status,
    billDate: bill.bill_date,
    dueDate: bill.due_date,
    subtotal: { amount: parseFloat(bill.subtotal), currency: 'USD' },
    taxAmount: { amount: parseFloat(bill.tax_amount || 0), currency: 'USD' },
    total: { amount: parseFloat(bill.total), currency: 'USD' },
    amountDue: { amount: parseFloat(bill.amount_due), currency: 'USD' },
    amountPaid: { amount: parseFloat(bill.total) - parseFloat(bill.amount_due), currency: 'USD' },
    notes: bill.memo,
    lineItems: lineItems.map(li => ({
      id: li.id,
      accountId: li.account_id,
      accountName: li.account_name,
      accountNumber: li.account_number,
      description: li.description,
      quantity: parseFloat(li.quantity),
      unitPrice: parseFloat(li.unit_price),
      amount: parseFloat(li.amount),
      category: li.category
    })),
    createdAt: bill.created_at,
    updatedAt: bill.updated_at
  };
}

module.exports = router;

