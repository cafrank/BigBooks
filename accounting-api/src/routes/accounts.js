// src/routes/accounts.js
const express = require('express');
const { body, query, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Chart of accounts management
 */

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: List all accounts (Chart of Accounts)
 *     tags: [Accounts]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [asset, liability, equity, income, expense]
 *         description: Filter by account type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by account name or number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: List of accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Account'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get('/', [
  query('type').optional().isIn(['asset', 'liability', 'equity', 'income', 'expense']),
  query('isActive').optional().isBoolean(),
  query('search').optional().trim(),
  query('limit').optional().isInt({ max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    // Build base query with balance join
    let q = db('accounts as a')
      .leftJoin('v_account_balances as vab', 'a.id', 'vab.id')
      .where('a.organization_id', req.user.orgId);

    // Filter by type
    if (req.query.type) {
      q = q.where('a.account_type', req.query.type);
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      q = q.where('a.is_active', req.query.isActive === 'true');
    }

    // Search by name or account number
    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      q = q.where((builder) => {
        builder
          .where(db.raw('LOWER(a.name) LIKE LOWER(?)', [searchTerm]))
          .orWhere(db.raw('LOWER(a.account_number) LIKE LOWER(?)', [searchTerm]))
          .orWhere(db.raw('LOWER(a.description) LIKE LOWER(?)', [searchTerm]));
      });
    }

    // Apply pagination and ordering
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const offset = parseInt(req.query.offset) || 0;

    // Count total records
    const countQuery = q.clone().clearSelect().clearOrder();
    const countResult = await countQuery.countDistinct('a.id as count');
    const total = parseInt(countResult[0].count);

    // Get paginated data with balances
    const accounts = await q
      .select('a.*', 'vab.balance')
      .orderBy('a.account_number')
      .limit(limit)
      .offset(offset);

    res.json({
      data: accounts.map(formatAccount),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + accounts.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Office Equipment"
 *               type:
 *                 type: string
 *                 enum: [asset, liability, equity, income, expense]
 *                 example: "asset"
 *               accountNumber:
 *                 type: string
 *                 example: "1550"
 *               description:
 *                 type: string
 *                 example: "Computers, furniture, and office equipment"
 *               parentAccountId:
 *                 type: string
 *                 format: uuid
 *               openingBalance:
 *                 type: number
 *                 example: 0
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Account number already exists
 */
router.post('/', [
  body('name').notEmpty().trim().isLength({ min: 1, max: 255 }),
  body('type').isIn(['asset', 'liability', 'equity', 'income', 'expense']),
  body('accountNumber').optional().trim().isLength({ max: 20 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('parentAccountId').optional().isUUID(),
  body('openingBalance').optional().isFloat(),
  validate
], async (req, res, next) => {
  try {
    // Check if account number already exists
    if (req.body.accountNumber) {
      const existing = await db('accounts')
        .where({
          organization_id: req.user.orgId,
          account_number: req.body.accountNumber
        })
        .first();

      if (existing) {
        throw new AppError('Account number already exists', 409);
      }
    }

    // Validate parent account exists and is same type
    if (req.body.parentAccountId) {
      const parent = await db('accounts')
        .where({
          id: req.body.parentAccountId,
          organization_id: req.user.orgId
        })
        .first();

      if (!parent) {
        throw new AppError('Parent account not found', 404);
      }

      if (parent.account_type !== req.body.type) {
        throw new AppError('Parent account must be of the same type', 400);
      }
    }

    const [account] = await db('accounts')
      .insert({
        organization_id: req.user.orgId,
        name: req.body.name,
        account_type: req.body.type,
        account_number: req.body.accountNumber,
        description: req.body.description,
        parent_account_id: req.body.parentAccountId,
        is_active: true,
        is_system_account: false
      })
      .returning('*');

    // Create opening balance journal entry if provided
    if (req.body.openingBalance && req.body.openingBalance !== 0) {
      await createOpeningBalanceEntry(
        req.user.orgId,
        account.id,
        req.body.type,
        req.body.openingBalance,
        req.user.id
      );
    }

    res.status(201).json(formatAccount(account));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Get account by ID with balance
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account details with current balance
 *       404:
 *         description: Account not found
 */
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const account = await db('accounts')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!account) {
      throw new AppError('Account not found', 404);
    }

    // Get current balance from view
    const balanceData = await db('v_account_balances')
      .where({ id: req.params.id })
      .first();

    // Get child accounts if any
    const childAccounts = await db('accounts')
      .where({ parent_account_id: req.params.id })
      .select('id', 'name', 'account_number', 'is_active');

    const response = {
      ...formatAccount(account),
      balance: balanceData ? {
        amount: parseFloat(balanceData.balance || 0),
        currency: 'USD',
        debits: parseFloat(balanceData.total_debits || 0),
        credits: parseFloat(balanceData.total_credits || 0)
      } : {
        amount: 0,
        currency: 'USD',
        debits: 0,
        credits: 0
      },
      childAccounts: childAccounts.map(c => ({
        id: c.id,
        name: c.name,
        accountNumber: c.account_number,
        isActive: c.is_active
      }))
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   patch:
 *     summary: Update an account
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Account updated successfully
 *       404:
 *         description: Account not found
 */
router.patch('/:id', [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('isActive').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    // Check if account exists and is not a system account
    const existing = await db('accounts')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!existing) {
      throw new AppError('Account not found', 404);
    }

    // Build update object
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.isActive !== undefined) {
      // Don't allow deactivating system accounts
      if (existing.is_system_account && req.body.isActive === false) {
        throw new AppError('Cannot deactivate system accounts', 400);
      }
      updates.is_active = req.body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res.json(formatAccount(existing));
    }

    const [account] = await db('accounts')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .update(updates)
      .returning('*');

    res.json(formatAccount(account));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Account deleted successfully
 *       400:
 *         description: Cannot delete account with transactions or child accounts
 *       404:
 *         description: Account not found
 */
router.delete('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const account = await db('accounts')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!account) {
      throw new AppError('Account not found', 404);
    }

    // Cannot delete system accounts
    if (account.is_system_account) {
      throw new AppError('Cannot delete system accounts', 400);
    }

    // Check for child accounts
    const childCount = await db('accounts')
      .where({ parent_account_id: req.params.id })
      .count('* as count')
      .first();

    if (parseInt(childCount.count) > 0) {
      throw new AppError('Cannot delete account with child accounts', 400);
    }

    // Check for transactions
    const txnCount = await db('ledger_entries')
      .where({ account_id: req.params.id })
      .count('* as count')
      .first();

    if (parseInt(txnCount.count) > 0) {
      throw new AppError('Cannot delete account with transactions. Consider deactivating instead.', 400);
    }

    await db('accounts')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .del();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/{id}/transactions:
 *   get:
 *     summary: Get transactions for an account
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of account transactions
 */
router.get('/:id/transactions', [
  param('id').isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    // Verify account exists
    const account = await db('accounts')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!account) {
      throw new AppError('Account not found', 404);
    }

    let q = db('ledger_entries')
      .where('account_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .where('is_posted', true)
      .orderBy('transaction_date', 'desc')
      .orderBy('created_at', 'desc');

    if (req.query.startDate) {
      q = q.where('transaction_date', '>=', req.query.startDate);
    }
    if (req.query.endDate) {
      q = q.where('transaction_date', '<=', req.query.endDate);
    }

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatTransaction);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/{id}/balance-history:
 *   get:
 *     summary: Get balance history for an account over time
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Balance history data points
 */
router.get('/:id/balance-history', [
  param('id').isUUID(),
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('interval').optional().isIn(['daily', 'weekly', 'monthly']),
  validate
], async (req, res, next) => {
  try {
    const account = await db('accounts')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!account) {
      throw new AppError('Account not found', 404);
    }

    const interval = req.query.interval || 'monthly';
    const { startDate, endDate } = req.query;

    // Get all transactions in date range
    const transactions = await db('ledger_entries')
      .where('account_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .where('transaction_date', '>=', startDate)
      .where('transaction_date', '<=', endDate)
      .where('is_posted', true)
      .orderBy('transaction_date', 'asc')
      .select('transaction_date', 'debit', 'credit');

    // Calculate running balance
    const isDebitNormal = ['asset', 'expense'].includes(account.account_type);
    let runningBalance = 0;
    const balanceHistory = [];

    for (const txn of transactions) {
      const debit = parseFloat(txn.debit || 0);
      const credit = parseFloat(txn.credit || 0);
      
      if (isDebitNormal) {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      balanceHistory.push({
        date: txn.transaction_date,
        balance: runningBalance
      });
    }

    res.json({
      accountId: req.params.id,
      accountName: account.name,
      accountType: account.account_type,
      startDate,
      endDate,
      interval,
      balanceHistory
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Format account for API response
 */
function formatAccount(account) {
  return {
    id: account.id,
    name: account.name,
    type: account.account_type,
    subtype: account.account_subtype,
    accountNumber: account.account_number,
    description: account.description,
    parentAccountId: account.parent_account_id,
    currency: account.currency || 'USD',
    isActive: account.is_active,
    isSystemAccount: account.is_system_account,
    balance: account.balance !== undefined && account.balance !== null ? {
      amount: parseFloat(account.balance),
      currency: account.currency || 'USD'
    } : null,
    createdAt: account.created_at,
    updatedAt: account.updated_at
  };
}

/**
 * Format transaction for API response
 */
function formatTransaction(txn) {
  return {
    id: txn.id,
    date: txn.transaction_date,
    type: txn.transaction_type,
    description: txn.description,
    debit: { amount: parseFloat(txn.debit || 0), currency: 'USD' },
    credit: { amount: parseFloat(txn.credit || 0), currency: 'USD' },
    balance: txn.balance ? { amount: parseFloat(txn.balance), currency: 'USD' } : null,
    sourceId: txn.source_id,
    sourceLineId: txn.source_line_id,
    customerId: txn.customer_id,
    vendorId: txn.vendor_id,
    createdAt: txn.created_at
  };
}

/**
 * Create opening balance journal entry
 */
async function createOpeningBalanceEntry(orgId, accountId, accountType, amount, userId) {
  const { generateDocNumber } = require('../utils/documentNumber');
  
  return db.transaction(async (trx) => {
    const entryNumber = await generateDocNumber(orgId, 'journal_entry');
    
    // Get opening balance equity account
    const equityAccount = await trx('accounts')
      .where({ organization_id: orgId, account_subtype: 'owners_equity' })
      .first();

    const [entry] = await trx('journal_entries')
      .insert({
        organization_id: orgId,
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        memo: 'Opening balance',
        created_by: userId
      })
      .returning('*');

    // Determine debit/credit based on account type
    const isDebitNormal = ['asset', 'expense'].includes(accountType);
    const debitAccount = isDebitNormal ? accountId : equityAccount.id;
    const creditAccount = isDebitNormal ? equityAccount.id : accountId;

    // Create journal entry lines
    await trx('journal_entry_lines').insert([
      {
        journal_entry_id: entry.id,
        account_id: debitAccount,
        description: 'Opening balance',
        debit: Math.abs(amount),
        credit: 0,
        sort_order: 0
      },
      {
        journal_entry_id: entry.id,
        account_id: creditAccount,
        description: 'Opening balance',
        debit: 0,
        credit: Math.abs(amount),
        sort_order: 1
      }
    ]);

    // Create ledger entries
    await trx('ledger_entries').insert([
      {
        organization_id: orgId,
        account_id: debitAccount,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'journal_entry',
        source_id: entry.id,
        description: 'Opening balance',
        debit: Math.abs(amount),
        credit: 0
      },
      {
        organization_id: orgId,
        account_id: creditAccount,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'journal_entry',
        source_id: entry.id,
        description: 'Opening balance',
        debit: 0,
        credit: Math.abs(amount)
      }
    ]);

    return entry;
  });
}

module.exports = router;