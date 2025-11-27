// --- src/routes/expenses.js ---
const express = require('express');
const { body, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

// GET /v1/expenses
router.get('/', async (req, res, next) => {
  try {
    let q = db('expenses')
      .leftJoin('vendors', 'expenses.vendor_id', 'vendors.id')
      .leftJoin('accounts', 'expenses.account_id', 'accounts.id')
      .where('expenses.organization_id', req.user.orgId)
      .select('expenses.*', 'vendors.display_name as vendor_name', 'accounts.name as account_name')
      .orderBy('expenses.expense_date', 'desc');

    if (req.query.vendorId) q = q.where('expenses.vendor_id', req.query.vendorId);
    if (req.query.accountId) q = q.where('expenses.account_id', req.query.accountId);

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatExpense);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /v1/expenses
router.post('/', [
  body('accountId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('expenseDate').isISO8601(),
  body('vendorId').optional().isUUID(),
  body('paymentAccountId').optional().isUUID(),
  body('description').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const expense = await db.transaction(async (trx) => {
      const [exp] = await trx('expenses')
        .insert({
          organization_id: req.user.orgId,
          vendor_id: req.body.vendorId,
          account_id: req.body.accountId,
          payment_account_id: req.body.paymentAccountId,
          expense_date: req.body.expenseDate,
          amount: req.body.amount,
          tax_amount: req.body.taxAmount || 0,
          description: req.body.description,
          payment_method: req.body.paymentMethod,
          is_billable: req.body.isBillable || false,
          customer_id: req.body.customerId,
          created_by: req.user.id
        })
        .returning('*');

      // Create ledger entries
      if (req.body.paymentAccountId) {
        await trx('ledger_entries').insert([
          {
            organization_id: req.user.orgId,
            account_id: req.body.accountId,
            transaction_date: req.body.expenseDate,
            transaction_type: 'expense',
            source_id: exp.id,
            description: req.body.description || 'Expense',
            debit: req.body.amount,
            credit: 0,
            vendor_id: req.body.vendorId
          },
          {
            organization_id: req.user.orgId,
            account_id: req.body.paymentAccountId,
            transaction_date: req.body.expenseDate,
            transaction_type: 'expense',
            source_id: exp.id,
            description: req.body.description || 'Expense',
            debit: 0,
            credit: req.body.amount,
            vendor_id: req.body.vendorId
          }
        ]);
      }

      return exp;
    });

    res.status(201).json(formatExpense(expense));
  } catch (err) { next(err); }
});

// GET /v1/expenses/:id
router.get('/:id', [param('id').isUUID(), validate], async (req, res, next) => {
  try {
    const expense = await db('expenses')
      .leftJoin('vendors', 'expenses.vendor_id', 'vendors.id')
      .leftJoin('accounts', 'expenses.account_id', 'accounts.id')
      .where('expenses.id', req.params.id)
      .where('expenses.organization_id', req.user.orgId)
      .select('expenses.*', 'vendors.display_name as vendor_name', 'accounts.name as account_name')
      .first();

    if (!expense) throw new AppError('Expense not found', 404);
    res.json(formatExpense(expense));
  } catch (err) { next(err); }
});

function formatExpense(e) {
  return {
    id: e.id,
    vendorId: e.vendor_id,
    vendorName: e.vendor_name,
    accountId: e.account_id,
    accountName: e.account_name,
    expenseDate: e.expense_date,
    amount: { amount: parseFloat(e.amount), currency: 'USD' },
    description: e.description,
    paymentMethod: e.payment_method,
    isBillable: e.is_billable,
    createdAt: e.created_at
  };
}

module.exports = router;







// ====================================================
// src/routes/expenses.js
// ====================================================
// const expensesRouter = express.Router();
// expensesRouter.use(authenticate);

// expensesRouter.get('/', async (req, res, next) => {
//   try {
//     let q = db('expenses')
//       .leftJoin('vendors', 'expenses.vendor_id', 'vendors.id')
//       .leftJoin('accounts', 'expenses.account_id', 'accounts.id')
//       .where('expenses.organization_id', req.user.orgId)
//       .select('expenses.*', 'vendors.display_name as vendor_name', 'accounts.name as account_name')
//       .orderBy('expenses.expense_date', 'desc');

//     if (req.query.vendorId) q = q.where('expenses.vendor_id', req.query.vendorId);
//     if (req.query.accountId) q = q.where('expenses.account_id', req.query.accountId);

//     const result = await paginate(q, req.query);
//     res.json(result);
//   } catch (err) {
//     next(err);
//   }
// });

// expensesRouter.post('/', [
//   body('accountId').isUUID(),
//   body('amount').isFloat({ min: 0.01 }),
//   body('expenseDate').isISO8601(),
//   validate
// ], async (req, res, next) => {
//   try {
//     const [expense] = await db('expenses')
//       .insert({
//         organization_id: req.user.orgId,
//         vendor_id: req.body.vendorId,
//         account_id: req.body.accountId,
//         payment_account_id: req.body.paymentAccountId,
//         expense_date: req.body.expenseDate,
//         amount: req.body.amount,
//         tax_amount: req.body.taxAmount || 0,
//         description: req.body.description,
//         payment_method: req.body.paymentMethod,
//         is_billable: req.body.isBillable || false,
//         customer_id: req.body.customerId,
//         created_by: req.user.id
//       })
//       .returning('*');

//     res.status(201).json(expense);
//   } catch (err) {
//     next(err);
//   }
// });
