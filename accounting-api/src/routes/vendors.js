// src/routes/vendors.js
const express = require('express');
const { body, query, param } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginate } = require('../utils/pagination');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor management
 */

// GET /v1/vendors
router.get('/', [
  query('search').optional().trim(),
  query('limit').optional().isInt({ max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    let q = db('vendors')
      .where('organization_id', req.user.orgId)
      .where('is_active', true)
      .orderBy('display_name');

    if (req.query.search) {
      q = q.where((builder) => {
        builder
          .whereILike('display_name', `%${req.query.search}%`)
          .orWhereILike('email', `%${req.query.search}%`)
          .orWhereILike('company_name', `%${req.query.search}%`);
      });
    }

    const result = await paginate(q, req.query);
    result.data = result.data.map(formatVendor);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/vendors
router.post('/', [
  body('displayName').notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('companyName').optional().trim(),
  body('address').optional().isObject(),
  body('paymentTerms').optional().isIn(['due_on_receipt', 'net15', 'net30', 'net60', 'net90']),
  validate
], async (req, res, next) => {
  try {
    const vendor = await db.transaction(async (trx) => {
      const [vend] = await trx('vendors')
        .insert({
          organization_id: req.user.orgId,
          display_name: req.body.displayName,
          company_name: req.body.companyName,
          email: req.body.email,
          phone: req.body.phone,
          website: req.body.website,
          tax_id: req.body.taxId,
          account_number: req.body.accountNumber,
          payment_terms: req.body.paymentTerms || 'net30',
          is_1099_eligible: req.body.is1099Eligible || false,
          notes: req.body.notes
        })
        .returning('*');

      // Add address
      if (req.body.address) {
        await trx('vendor_addresses').insert({
          vendor_id: vend.id,
          address_type: 'primary',
          ...mapAddress(req.body.address),
          is_default: true
        });
      }

      return vend;
    });

    res.status(201).json(formatVendor(vendor));
  } catch (err) {
    next(err);
  }
});

// GET /v1/vendors/:id
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const vendor = await db('vendors')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    // Get addresses
    const addresses = await db('vendor_addresses')
      .where('vendor_id', vendor.id)
      .orderBy('is_default', 'desc');

    res.json({
      ...formatVendor(vendor),
      addresses: addresses.map(formatAddress)
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/vendors/:id
router.patch('/:id', [
  param('id').isUUID(),
  body('displayName').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('isActive').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.displayName) updates.display_name = req.body.displayName;
    if (req.body.companyName !== undefined) updates.company_name = req.body.companyName;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.website !== undefined) updates.website = req.body.website;
    if (req.body.taxId !== undefined) updates.tax_id = req.body.taxId;
    if (req.body.accountNumber !== undefined) updates.account_number = req.body.accountNumber;
    if (req.body.paymentTerms) updates.payment_terms = req.body.paymentTerms;
    if (req.body.is1099Eligible !== undefined) updates.is_1099_eligible = req.body.is1099Eligible;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;

    const [vendor] = await db('vendors')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .update(updates)
      .returning('*');

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    res.json(formatVendor(vendor));
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/vendors/:id
router.delete('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    // Soft delete - mark as inactive
    const [vendor] = await db('vendors')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .update({ is_active: false })
      .returning('*');

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /v1/vendors/:id/balance
router.get('/:id/balance', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const balance = await db('v_vendor_balances')
      .where('id', req.params.id)
      .where('organization_id', req.user.orgId)
      .first();

    if (!balance) {
      throw new AppError('Vendor not found', 404);
    }

    res.json({
      vendorId: balance.id,
      totalBalance: { amount: parseFloat(balance.total_balance || 0), currency: 'USD' },
      current: { amount: parseFloat(balance.current || 0), currency: 'USD' },
      overdue1to30: { amount: parseFloat(balance.days_1_30 || 0), currency: 'USD' },
      overdue31to60: { amount: parseFloat(balance.days_31_60 || 0), currency: 'USD' },
      overdue61to90: { amount: parseFloat(balance.days_61_90 || 0), currency: 'USD' },
      overdue90plus: { amount: parseFloat(balance.days_90_plus || 0), currency: 'USD' }
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/vendors/:id/bills
router.get('/:id/bills', [
  param('id').isUUID(),
  query('status').optional().isIn(['draft', 'open', 'partial', 'paid', 'voided']),
  validate
], async (req, res, next) => {
  try {
    let q = db('bills')
      .where('vendor_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .orderBy('due_date', 'asc');

    if (req.query.status) {
      q = q.where('status', req.query.status);
    }

    const result = await paginate(q, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Helper functions
function formatVendor(vendor) {
  return {
    id: vendor.id,
    displayName: vendor.display_name,
    companyName: vendor.company_name,
    email: vendor.email,
    phone: vendor.phone,
    website: vendor.website,
    taxId: vendor.tax_id,
    accountNumber: vendor.account_number,
    paymentTerms: vendor.payment_terms,
    is1099Eligible: vendor.is_1099_eligible,
    notes: vendor.notes,
    isActive: vendor.is_active,
    createdAt: vendor.created_at,
    updatedAt: vendor.updated_at
  };
}

function formatAddress(address) {
  return {
    id: address.id,
    type: address.address_type,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country,
    isDefault: address.is_default
  };
}

function mapAddress(addr) {
  return {
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    state: addr.state,
    postal_code: addr.postalCode,
    country: addr.country || 'US'
  };
}

module.exports = router;