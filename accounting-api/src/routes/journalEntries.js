// --- src/routes/journalEntries.js ---
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

// GET /v1/journal-entries
router.get('/', async (req, res, next) => {
  try {
    let q = db('journal_entries')
      .where('organization_id', req.user.orgId)
      .orderBy('entry_date', 'desc');

    if (req.query.startDate) q = q.where('entry_date', '>=', req.query.startDate);
    if (req.query.endDate) q = q.where('entry_date', '<=', req.query.endDate);

    const result = await paginate(q, req.query);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /v1/journal-entries
router.post('/', [
  body('entryDate').isISO8601(),
  body('lines').isArray({ min: 2 }),
  body('lines.*.accountId').isUUID(),
  validate
], async (req, res, next) => {
  try {
    // Validate debits = credits
    const totalDebits = req.body.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredits = req.body.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new AppError('Journal entry must balance (debits must equal credits)', 400);
    }

    const entry = await db.transaction(async (trx) => {
      const entryNumber = await generateDocNumber(req.user.orgId, 'journal_entry');

      const [je] = await trx('journal_entries')
        .insert({
          organization_id: req.user.orgId,
          entry_number: entryNumber,
          entry_date: req.body.entryDate,
          memo: req.body.memo,
          is_adjusting: req.body.isAdjusting || false,
          created_by: req.user.id
        })
        .returning('*');

      const lines = req.body.lines.map((line, idx) => ({
        journal_entry_id: je.id,
        account_id: line.accountId,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        sort_order: idx
      }));

      await trx('journal_entry_lines').insert(lines);

      // Create ledger entries
      const ledgerEntries = req.body.lines.map(line => ({
        organization_id: req.user.orgId,
        account_id: line.accountId,
        transaction_date: req.body.entryDate,
        transaction_type: 'journal_entry',
        source_id: je.id,
        description: line.description || req.body.memo,
        debit: line.debit || 0,
        credit: line.credit || 0
      }));

      await trx('ledger_entries').insert(ledgerEntries);

      return je;
    });

    res.status(201).json(entry);
  } catch (err) { next(err); }
});

module.exports = router;
