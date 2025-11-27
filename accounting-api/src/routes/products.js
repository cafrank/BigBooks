// --- src/routes/products.js ---
const express = require('express');
const { body, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

// GET /v1/products
router.get('/', async (req, res, next) => {
  try {
    let q = db('products')
      .where('organization_id', req.user.orgId)
      .where('is_active', true)
      .orderBy('name');

    if (req.query.type) q = q.where('type', req.query.type);

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatProduct);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /v1/products
router.post('/', [
  body('name').notEmpty().trim(),
  body('type').isIn(['product', 'service']),
  body('unitPrice').optional().isFloat({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    const [product] = await db('products')
      .insert({
        organization_id: req.user.orgId,
        name: req.body.name,
        sku: req.body.sku,
        type: req.body.type,
        description: req.body.description,
        unit_price: req.body.unitPrice,
        cost: req.body.cost,
        income_account_id: req.body.incomeAccountId,
        expense_account_id: req.body.expenseAccountId,
        is_taxable: req.body.taxable !== false,
        quantity_on_hand: req.body.quantityOnHand || 0
      })
      .returning('*');

    res.status(201).json(formatProduct(product));
  } catch (err) { next(err); }
});

function formatProduct(p) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    type: p.type,
    description: p.description,
    unitPrice: p.unit_price ? { amount: parseFloat(p.unit_price), currency: 'USD' } : null,
    cost: p.cost ? { amount: parseFloat(p.cost), currency: 'USD' } : null,
    taxable: p.is_taxable,
    quantityOnHand: parseFloat(p.quantity_on_hand || 0),
    isActive: p.is_active,
    createdAt: p.created_at
  };
}

module.exports = router;
