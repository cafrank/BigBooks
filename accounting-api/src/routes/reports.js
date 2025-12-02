// --- src/routes/reports.js ---
const express = require('express');
const { query } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// GET /v1/reports/profit-loss
router.get('/profit-loss', [
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  validate
], async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = req.user.orgId;

    // Get income accounts with totals
    const income = await db('accounts')
      .leftJoin('ledger_entries', function() {
        this.on('accounts.id', '=', 'ledger_entries.account_id')
          .andOn('ledger_entries.transaction_date', '>=', db.raw('?', [startDate]))
          .andOn('ledger_entries.transaction_date', '<=', db.raw('?', [endDate]));
      })
      .where('accounts.organization_id', orgId)
      .where('accounts.account_type', 'income')
      .groupBy('accounts.id', 'accounts.name', 'accounts.account_number')
      .select(
        'accounts.id',
        'accounts.account_number',
        'accounts.name',
        db.raw('COALESCE(SUM(ledger_entries.credit), 0) - COALESCE(SUM(ledger_entries.debit), 0) as amount')
      );

    // Get expense accounts with totals
    const expenses = await db('accounts')
      .leftJoin('ledger_entries', function() {
        this.on('accounts.id', '=', 'ledger_entries.account_id')
          .andOn('ledger_entries.transaction_date', '>=', db.raw('?', [startDate]))
          .andOn('ledger_entries.transaction_date', '<=', db.raw('?', [endDate]));
      })
      .where('accounts.organization_id', orgId)
      .whereIn('accounts.account_type', ['expense'])
      .groupBy('accounts.id', 'accounts.name', 'accounts.account_number')
      .select(
        'accounts.id',
        'accounts.account_number',
        'accounts.name',
        db.raw('COALESCE(SUM(ledger_entries.debit), 0) - COALESCE(SUM(ledger_entries.credit), 0) as amount')
      );

    const totalIncome = income.reduce((sum, a) => sum + parseFloat(a.amount), 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + parseFloat(a.amount), 0);

    res.json({
      startDate,
      endDate,
      income: {
        total: { amount: totalIncome, currency: 'USD' },
        accounts: income.filter(a => parseFloat(a.amount) !== 0).map(a => ({
          accountId: a.id,
          accountNumber: a.account_number,
          accountName: a.name,
          amount: { amount: parseFloat(a.amount), currency: 'USD' }
        }))
      },
      expenses: {
        total: { amount: totalExpenses, currency: 'USD' },
        accounts: expenses.filter(a => parseFloat(a.amount) !== 0).map(a => ({
          accountId: a.id,
          accountNumber: a.account_number,
          accountName: a.name,
          amount: { amount: parseFloat(a.amount), currency: 'USD' }
        }))
      },
      netIncome: { amount: totalIncome - totalExpenses, currency: 'USD' }
    });
  } catch (err) { next(err); }
});

// GET /v1/reports/balance-sheet
router.get('/balance-sheet', [
  query('asOf').optional().isISO8601(),
  validate
], async (req, res, next) => {
  try {
    const asOf = req.query.asOf || new Date().toISOString().split('T')[0];
    const balances = await db('v_account_balances')
      .where('organization_id', req.user.orgId);

    const assets = balances.filter(a => a.account_type === 'asset');
    const liabilities = balances.filter(a => a.account_type === 'liability');
    const equity = balances.filter(a => a.account_type === 'equity');

    const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + parseFloat(a.balance), 0);
    const totalEquity = equity.reduce((sum, a) => sum + parseFloat(a.balance), 0);

    res.json({
      asOfDate: asOf,
      assets: {
        total: { amount: totalAssets, currency: 'USD' },
        accounts: assets.map(a => ({
          accountId: a.id, accountName: a.name,
          balance: { amount: parseFloat(a.balance), currency: 'USD' }
        }))
      },
      liabilities: {
        total: { amount: totalLiabilities, currency: 'USD' },
        accounts: liabilities.map(a => ({
          accountId: a.id, accountName: a.name,
          balance: { amount: parseFloat(a.balance), currency: 'USD' }
        }))
      },
      equity: {
        total: { amount: totalEquity, currency: 'USD' },
        accounts: equity.map(a => ({
          accountId: a.id, accountName: a.name,
          balance: { amount: parseFloat(a.balance), currency: 'USD' }
        }))
      }
    });
  } catch (err) { next(err); }
});

// GET /v1/reports/accounts-receivable
router.get('/accounts-receivable', async (req, res, next) => {
  try {
    const details = await db('v_customer_balances')
      .where('organization_id', req.user.orgId)
      .where('total_balance', '>', 0);

    const summary = details.reduce((acc, d) => ({
      current: acc.current + parseFloat(d.current),
      days1to30: acc.days1to30 + parseFloat(d.days_1_30),
      days31to60: acc.days31to60 + parseFloat(d.days_31_60),
      days61to90: acc.days61to90 + parseFloat(d.days_61_90),
      days90plus: acc.days90plus + parseFloat(d.days_90_plus),
      total: acc.total + parseFloat(d.total_balance)
    }), { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 });

    res.json({
      asOfDate: new Date().toISOString().split('T')[0],
      summary: Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, { amount: v, currency: 'USD' }])),
      details: details.map(d => ({
        entityId: d.id,
        entityName: d.display_name,
        current: { amount: parseFloat(d.current), currency: 'USD' },
        days1to30: { amount: parseFloat(d.days_1_30), currency: 'USD' },
        days31to60: { amount: parseFloat(d.days_31_60), currency: 'USD' },
        days61to90: { amount: parseFloat(d.days_61_90), currency: 'USD' },
        days90plus: { amount: parseFloat(d.days_90_plus), currency: 'USD' },
        total: { amount: parseFloat(d.total_balance), currency: 'USD' }
      }))
    });
  } catch (err) { next(err); }
});

// GET /v1/reports/trial-balance
router.get('/trial-balance', async (req, res, next) => {
  try {
    const accounts = await db('v_account_balances')
      .where('organization_id', req.user.orgId)
      .orderBy('account_type');

    const formatted = accounts.map(a => {
      const isDebitNormal = ['asset', 'expense'].includes(a.account_type);
      const balance = parseFloat(a.balance);
      return {
        accountId: a.id,
        accountName: a.name,
        accountType: a.account_type,
        debit: isDebitNormal && balance > 0 ? { amount: balance, currency: 'USD' } : { amount: 0, currency: 'USD' },
        credit: !isDebitNormal || balance < 0 ? { amount: Math.abs(balance), currency: 'USD' } : { amount: 0, currency: 'USD' }
      };
    });

    const totals = formatted.reduce((acc, a) => ({
      totalDebits: acc.totalDebits + a.debit.amount,
      totalCredits: acc.totalCredits + a.credit.amount
    }), { totalDebits: 0, totalCredits: 0 });

    res.json({
      asOfDate: new Date().toISOString().split('T')[0],
      accounts: formatted,
      totals: {
        totalDebits: { amount: totals.totalDebits, currency: 'USD' },
        totalCredits: { amount: totals.totalCredits, currency: 'USD' }
      }
    });
  } catch (err) { next(err); }
});

// GET /v1/reports/transaction-journal
router.get('/transaction-journal', [
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('accountId').optional().isUUID(),
  query('transactionType').optional().isString(),
  validate
], async (req, res, next) => {
  try {
    const { startDate, endDate, accountId, transactionType } = req.query;
    const orgId = req.user.orgId;

    // Query ledger entries with related account, customer, and vendor info
    let query = db('ledger_entries as le')
      .join('accounts as a', 'le.account_id', 'a.id')
      .leftJoin('customers as c', 'le.customer_id', 'c.id')
      .leftJoin('vendors as v', 'le.vendor_id', 'v.id')
      .where('le.organization_id', orgId)
      .where('le.transaction_date', '>=', startDate)
      .where('le.transaction_date', '<=', endDate)
      .where('le.is_posted', true)
      .orderBy('le.transaction_date', 'asc')
      .orderBy('le.source_id', 'asc')
      .orderBy('le.created_at', 'asc')
      .select(
        'le.id',
        'le.transaction_date',
        'le.transaction_type',
        'le.source_id',
        'le.description',
        'le.debit',
        'le.credit',
        'a.id as account_id',
        'a.account_number',
        'a.name as account_name',
        'c.display_name as customer_name',
        'v.display_name as vendor_name'
      );

    if (accountId) {
      query = query.where('le.account_id', accountId);
    }

    if (transactionType) {
      query = query.where('le.transaction_type', transactionType);
    }

    const entries = await query;

    // Group entries by source_id to show transactions together
    const groupedByTransaction = {};
    entries.forEach(entry => {
      const key = `${entry.source_id}-${entry.transaction_date}`;
      if (!groupedByTransaction[key]) {
        groupedByTransaction[key] = {
          transactionDate: entry.transaction_date,
          transactionType: entry.transaction_type,
          sourceId: entry.source_id,
          entityName: entry.customer_name || entry.vendor_name || '',
          entries: []
        };
      }

      groupedByTransaction[key].entries.push({
        entryId: entry.id,
        accountId: entry.account_id,
        accountNumber: entry.account_number,
        accountName: entry.account_name,
        description: entry.description,
        debit: { amount: parseFloat(entry.debit || 0), currency: 'USD' },
        credit: { amount: parseFloat(entry.credit || 0), currency: 'USD' }
      });
    });

    // Convert to array and calculate totals for each transaction
    const transactions = Object.values(groupedByTransaction).map(tx => ({
      ...tx,
      totalDebit: {
        amount: tx.entries.reduce((sum, e) => sum + e.debit.amount, 0),
        currency: 'USD'
      },
      totalCredit: {
        amount: tx.entries.reduce((sum, e) => sum + e.credit.amount, 0),
        currency: 'USD'
      }
    }));

    // Calculate grand totals
    const grandTotalDebit = transactions.reduce((sum, tx) => sum + tx.totalDebit.amount, 0);
    const grandTotalCredit = transactions.reduce((sum, tx) => sum + tx.totalCredit.amount, 0);

    res.json({
      startDate,
      endDate,
      transactions,
      totals: {
        totalDebits: { amount: grandTotalDebit, currency: 'USD' },
        totalCredits: { amount: grandTotalCredit, currency: 'USD' }
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
