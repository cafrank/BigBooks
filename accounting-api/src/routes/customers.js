// src/routes/customers.js
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
 *   name: Customers
 *   description: Customer management
 */

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: List all customers
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or company name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: hasBalance
 *         schema:
 *           type: boolean
 *         description: Filter customers with outstanding balance
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of customers
 *       401:
 *         description: Unauthorized
 */
router.get('/', [
  query('search').optional().trim(),
  query('isActive').optional().isBoolean(),
  query('hasBalance').optional().isBoolean(),
  query('limit').optional().isInt({ max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    let q = db('customers')
      .where('organization_id', req.user.orgId)
      .orderBy('display_name');

    // Filter by active status
    if (req.query.isActive !== undefined) {
      q = q.where('is_active', req.query.isActive === 'true');
    } else {
      // Default: only show active customers
      q = q.where('is_active', true);
    }

    // Search filter
    if (req.query.search) {
      q = q.where((builder) => {
        builder
          .whereILike('display_name', `%${req.query.search}%`)
          .orWhereILike('email', `%${req.query.search}%`)
          .orWhereILike('company_name', `%${req.query.search}%`)
          .orWhereILike('phone', `%${req.query.search}%`);
      });
    }

    // Filter by customers with balance
    if (req.query.hasBalance === 'true') {
      q = q.whereExists(function() {
        this.select('*')
          .from('invoices')
          .whereRaw('invoices.customer_id = customers.id')
          .where('invoices.amount_due', '>', 0)
          .where('invoices.status', '!=', 'voided');
      });
    }

    const result = await paginate(q, req.query);
    
    // Enrich with balance data if requested
    if (req.query.includeBalance === 'true') {
      const customerIds = result.data.map(c => c.id);
      const balances = await db('v_customer_balances')
        .whereIn('id', customerIds);
      
      const balanceMap = new Map(balances.map(b => [b.id, b]));
      result.data = result.data.map(c => ({
        ...formatCustomer(c),
        balance: balanceMap.has(c.id) ? {
          amount: parseFloat(balanceMap.get(c.id).total_balance || 0),
          currency: 'USD'
        } : { amount: 0, currency: 'USD' }
      }));
    } else {
      result.data = result.data.map(formatCustomer);
    }
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - displayName
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: "Acme Corporation"
 *               companyName:
 *                 type: string
 *                 example: "Acme Corp"
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "billing@acmecorp.com"
 *               phone:
 *                 type: string
 *                 example: "+1-555-123-4567"
 *               mobile:
 *                 type: string
 *               website:
 *                 type: string
 *               taxId:
 *                 type: string
 *               paymentTerms:
 *                 type: string
 *                 enum: [due_on_receipt, net15, net30, net60, net90]
 *                 default: net30
 *               creditLimit:
 *                 type: number
 *               notes:
 *                 type: string
 *               billingAddress:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   line2:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                   country:
 *                     type: string
 *               shippingAddress:
 *                 type: object
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', [
  body('displayName').notEmpty().trim().isLength({ min: 1, max: 255 }),
  body('companyName').optional().trim().isLength({ max: 255 }),
  body('firstName').optional().trim().isLength({ max: 100 }),
  body('lastName').optional().trim().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('mobile').optional().trim(),
  body('website').optional().trim().isURL({ require_protocol: false }),
  body('taxId').optional().trim().isLength({ max: 50 }),
  body('paymentTerms').optional().isIn(['due_on_receipt', 'net15', 'net30', 'net60', 'net90']),
  body('creditLimit').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
  body('billingAddress').optional().isObject(),
  body('shippingAddress').optional().isObject(),
  validate
], async (req, res, next) => {
  try {
    const customer = await db.transaction(async (trx) => {
      // Create customer
      const [cust] = await trx('customers')
        .insert({
          organization_id: req.user.orgId,
          display_name: req.body.displayName,
          company_name: req.body.companyName,
          first_name: req.body.firstName,
          last_name: req.body.lastName,
          email: req.body.email,
          phone: req.body.phone,
          mobile: req.body.mobile,
          website: req.body.website,
          tax_id: req.body.taxId,
          payment_terms: req.body.paymentTerms || 'net30',
          credit_limit: req.body.creditLimit,
          notes: req.body.notes,
          is_taxable: req.body.isTaxable !== false,
          default_tax_rate_id: req.body.defaultTaxRateId
        })
        .returning('*');

      // Add billing address
      if (req.body.billingAddress) {
        await trx('customer_addresses').insert({
          customer_id: cust.id,
          address_type: 'billing',
          ...mapAddress(req.body.billingAddress),
          is_default: true
        });
      }

      // Add shipping address
      if (req.body.shippingAddress) {
        await trx('customer_addresses').insert({
          customer_id: cust.id,
          address_type: 'shipping',
          ...mapAddress(req.body.shippingAddress),
          is_default: !req.body.billingAddress
        });
      }

      // Add contacts if provided
      if (req.body.contacts && Array.isArray(req.body.contacts)) {
        const contacts = req.body.contacts.map((contact, idx) => ({
          customer_id: cust.id,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          title: contact.title,
          is_primary: idx === 0
        }));
        
        await trx('customer_contacts').insert(contacts);
      }

      return cust;
    });

    res.status(201).json(formatCustomer(customer));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer details with addresses and contacts
 *       404:
 *         description: Customer not found
 */
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const customer = await db('customers')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Get addresses
    const addresses = await db('customer_addresses')
      .where('customer_id', customer.id)
      .orderBy('is_default', 'desc')
      .orderBy('address_type');

    // Get contacts
    const contacts = await db('customer_contacts')
      .where('customer_id', customer.id)
      .orderBy('is_primary', 'desc');

    // Get summary stats
    const stats = await getCustomerStats(req.params.id);

    res.json({
      ...formatCustomer(customer),
      addresses: addresses.map(formatAddress),
      contacts: contacts.map(formatContact),
      stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /customers/{id}:
 *   patch:
 *     summary: Update a customer
 *     tags: [Customers]
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
 *               displayName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 */
router.patch('/:id', [
  param('id').isUUID(),
  body('displayName').optional().trim().isLength({ min: 1, max: 255 }),
  body('companyName').optional().trim().isLength({ max: 255 }),
  body('firstName').optional().trim().isLength({ max: 100 }),
  body('lastName').optional().trim().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('mobile').optional().trim(),
  body('website').optional().trim(),
  body('taxId').optional().trim(),
  body('paymentTerms').optional().isIn(['due_on_receipt', 'net15', 'net30', 'net60', 'net90']),
  body('creditLimit').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
  body('isActive').optional().isBoolean(),
  body('isTaxable').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    // Build update object
    const updates = {};
    if (req.body.displayName) updates.display_name = req.body.displayName;
    if (req.body.companyName !== undefined) updates.company_name = req.body.companyName;
    if (req.body.firstName !== undefined) updates.first_name = req.body.firstName;
    if (req.body.lastName !== undefined) updates.last_name = req.body.lastName;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.mobile !== undefined) updates.mobile = req.body.mobile;
    if (req.body.website !== undefined) updates.website = req.body.website;
    if (req.body.taxId !== undefined) updates.tax_id = req.body.taxId;
    if (req.body.paymentTerms) updates.payment_terms = req.body.paymentTerms;
    if (req.body.creditLimit !== undefined) updates.credit_limit = req.body.creditLimit;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;
    if (req.body.isTaxable !== undefined) updates.is_taxable = req.body.isTaxable;
    if (req.body.defaultTaxRateId !== undefined) updates.default_tax_rate_id = req.body.defaultTaxRateId;

    if (Object.keys(updates).length === 0) {
      const existing = await db('customers')
        .where({ id: req.params.id, organization_id: req.user.orgId })
        .first();
      
      if (!existing) {
        throw new AppError('Customer not found', 404);
      }
      
      return res.json(formatCustomer(existing));
    }

    const [customer] = await db('customers')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .update(updates)
      .returning('*');

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    res.json(formatCustomer(customer));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /customers/{id}:
 *   delete:
 *     summary: Delete a customer (soft delete)
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Customer deleted successfully
 *       400:
 *         description: Cannot delete customer with invoices
 *       404:
 *         description: Customer not found
 */
router.delete('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const customer = await db('customers')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Check for existing invoices
    const invoiceCount = await db('invoices')
      .where({ customer_id: req.params.id })
      .count('* as count')
      .first();

    if (parseInt(invoiceCount.count) > 0) {
      throw new AppError('Cannot delete customer with invoices. Consider deactivating instead.', 400);
    }

    // Soft delete - mark as inactive
    await db('customers')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .update({ is_active: false });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /customers/{id}/balance:
 *   get:
 *     summary: Get customer balance and aging report
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer balance with aging details
 *       404:
 *         description: Customer not found
 */
router.get('/:id/balance', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    // Verify customer exists
    const customer = await db('customers')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const balance = await db('v_customer_balances')
      .where('id', req.params.id)
      .where('organization_id', req.user.orgId)
      .first();

    if (!balance) {
      // Customer has no invoices yet
      return res.json({
        customerId: req.params.id,
        totalBalance: { amount: 0, currency: 'USD' },
        current: { amount: 0, currency: 'USD' },
        overdue1to30: { amount: 0, currency: 'USD' },
        overdue31to60: { amount: 0, currency: 'USD' },
        overdue61to90: { amount: 0, currency: 'USD' },
        overdue90plus: { amount: 0, currency: 'USD' }
      });
    }

    res.json({
      customerId: balance.id,
      customerName: balance.display_name,
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

/**
 * @swagger
 * /customers/{id}/invoices:
 *   get:
 *     summary: Get all invoices for a customer
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, viewed, partial, paid, overdue, voided]
 *     responses:
 *       200:
 *         description: List of customer invoices
 */
router.get('/:id/invoices', [
  param('id').isUUID(),
  query('status').optional().isIn(['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'voided']),
  query('limit').optional().isInt({ max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    let q = db('invoices')
      .where('customer_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .orderBy('issue_date', 'desc');

    if (req.query.status) {
      q = q.where('status', req.query.status);
    }

    const result = await paginate(q, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /customers/{id}/payments:
 *   get:
 *     summary: Get all payments from a customer
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of customer payments
 */
router.get('/:id/payments', [
  param('id').isUUID(),
  query('limit').optional().isInt({ max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    let q = db('payments')
      .where('customer_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .where('is_voided', false)
      .orderBy('payment_date', 'desc');

    const result = await paginate(q, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /customers/{id}/statement:
 *   get:
 *     summary: Get customer statement for a date range
 *     tags: [Customers]
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
 *     responses:
 *       200:
 *         description: Customer statement
 */
router.get('/:id/statement', [
  param('id').isUUID(),
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  validate
], async (req, res, next) => {
  try {
    const customer = await db('customers')
      .where({ id: req.params.id, organization_id: req.user.orgId })
      .first();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const { startDate, endDate } = req.query;

    // Get invoices in date range
    const invoices = await db('invoices')
      .where('customer_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .where('issue_date', '>=', startDate)
      .where('issue_date', '<=', endDate)
      .whereNot('status', 'voided')
      .orderBy('issue_date', 'asc')
      .select('id', 'invoice_number', 'issue_date', 'due_date', 'total', 'amount_paid', 'amount_due', 'status');

    // Get payments in date range
    const payments = await db('payments')
      .where('customer_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .where('payment_date', '>=', startDate)
      .where('payment_date', '<=', endDate)
      .where('is_voided', false)
      .orderBy('payment_date', 'asc')
      .select('id', 'payment_number', 'payment_date', 'amount', 'payment_method');

    // Calculate opening balance (before start date)
    const openingBalance = await db('invoices')
      .where('customer_id', req.params.id)
      .where('organization_id', req.user.orgId)
      .where('issue_date', '<', startDate)
      .whereNot('status', 'voided')
      .sum('amount_due as balance')
      .first();

    res.json({
      customer: formatCustomer(customer),
      period: { startDate, endDate },
      openingBalance: parseFloat(openingBalance.balance || 0),
      invoices: invoices,
      payments: payments,
      closingBalance: parseFloat(openingBalance.balance || 0) + 
                      invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_due), 0)
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Format customer for API response
 */
function formatCustomer(customer) {
  return {
    id: customer.id,
    displayName: customer.display_name,
    companyName: customer.company_name,
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email,
    phone: customer.phone,
    mobile: customer.mobile,
    fax: customer.fax,
    website: customer.website,
    taxId: customer.tax_id,
    paymentTerms: customer.payment_terms,
    creditLimit: customer.credit_limit ? parseFloat(customer.credit_limit) : null,
    notes: customer.notes,
    isTaxable: customer.is_taxable,
    defaultTaxRateId: customer.default_tax_rate_id,
    isActive: customer.is_active,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at
  };
}

/**
 * Format address for API response
 */
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
    isDefault: address.is_default,
    createdAt: address.created_at
  };
}

/**
 * Format contact for API response
 */
function formatContact(contact) {
  return {
    id: contact.id,
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    isPrimary: contact.is_primary,
    createdAt: contact.created_at
  };
}

/**
 * Map address from request to database format
 */
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

/**
 * Get customer statistics
 */
async function getCustomerStats(customerId) {
  const [invoiceStats, paymentStats] = await Promise.all([
    db('invoices')
      .where('customer_id', customerId)
      .whereNot('status', 'voided')
      .select(
        db.raw('COUNT(*) as total_invoices'),
        db.raw('COALESCE(SUM(total), 0) as total_invoiced'),
        db.raw('COALESCE(SUM(amount_due), 0) as total_outstanding')
      )
      .first(),
    
    db('payments')
      .where('customer_id', customerId)
      .where('is_voided', false)
      .select(
        db.raw('COUNT(*) as total_payments'),
        db.raw('COALESCE(SUM(amount), 0) as total_paid')
      )
      .first()
  ]);

  return {
    totalInvoices: parseInt(invoiceStats.total_invoices || 0),
    totalInvoiced: { amount: parseFloat(invoiceStats.total_invoiced || 0), currency: 'USD' },
    totalOutstanding: { amount: parseFloat(invoiceStats.total_outstanding || 0), currency: 'USD' },
    totalPayments: parseInt(paymentStats.total_payments || 0),
    totalPaid: { amount: parseFloat(paymentStats.total_paid || 0), currency: 'USD' }
  };
}

module.exports = router;