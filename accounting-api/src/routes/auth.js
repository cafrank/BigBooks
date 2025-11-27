// --- src/routes/auth.js (with Swagger annotations) ---
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and registration
 */
// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../config/database');
const { validate } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and registration
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user and organization
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - organizationName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               organizationName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User and organization created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('organizationName').notEmpty().trim(),
  validate
], async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body;
    
    // Check if user exists
    const existing = await db('users').where({ email }).first();
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    // Create organization and user in transaction
    const result = await db.transaction(async (trx) => {
      // Create organization
      const [org] = await trx('organizations')
        .insert({ name: organizationName })
        .returning('*');

      // Create user
      const passwordHash = await bcrypt.hash(password, 12);
      const [user] = await trx('users')
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          email_verified: false
        })
        .returning(['id', 'email', 'first_name', 'last_name', 'created_at']);

      // Link user to organization
      await trx('organization_users')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          is_owner: true
        });

      // Seed default chart of accounts
      await trx.raw('SELECT seed_default_accounts(?)', [org.id]);

      return { user, org };
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.user.id, orgId: result.org.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.first_name,
        lastName: result.user.last_name
      },
      organization: {
        id: result.org.id,
        name: result.org.name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to get authentication token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
], async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user with organization
    const user = await db('users')
      .join('organization_users', 'users.id', 'organization_users.user_id')
      .where('users.email', email)
      .where('users.is_active', true)
      .select(
        'users.*',
        'organization_users.organization_id',
        'organization_users.role'
      )
      .first();

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ last_login_at: db.fn.now() });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, orgId: user.organization_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.user.id })
      .select('id', 'email', 'first_name', 'last_name', 'phone', 'avatar_url', 'created_at')
      .first();

    const organization = await db('organizations')
      .where({ id: req.user.orgId })
      .first();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      },
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        phone: organization.phone
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;