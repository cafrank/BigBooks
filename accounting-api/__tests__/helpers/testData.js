// --- __tests__/helpers/testData.js (update this file) ---
const bcrypt = require('bcryptjs');
const db = require('../../src/config/database');
const { v4: uuidv4 } = require('uuid');

async function createTestOrganization() {
  const uniqueId = uuidv4().substring(0, 8);
  const [org] = await db('organizations')
    .insert({ name: `Test Org ${uniqueId}` })
    .returning('*');

  // Seed default accounts
  await db.raw('SELECT seed_default_accounts(?)', [org.id]);

  return org;
}

async function createTestUser(orgId) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const uniqueId = uuidv4().substring(0, 8);

  const [user] = await db('users')
    .insert({
      email: `test-${uniqueId}@example.com`,
      password_hash: passwordHash,
      first_name: 'Test',
      last_name: 'User'
    })
    .returning('*');

  await db('organization_users').insert({
    organization_id: orgId,
    user_id: user.id,
    role: 'owner',
    is_owner: true
  });

  return user;
}

async function createTestCustomer(orgId) {
  const uniqueId = uuidv4().substring(0, 8);
  const [customer] = await db('customers')
    .insert({
      organization_id: orgId,
      display_name: `Test Customer ${uniqueId}`,
      email: `customer-${uniqueId}@example.com`,
      payment_terms: 'net30'
    })
    .returning('*');

  return customer;
}

async function createTestVendor(orgId) {
  const uniqueId = uuidv4().substring(0, 8);
  const [vendor] = await db('vendors')
    .insert({
      organization_id: orgId,
      display_name: 'Test Vendor',
      email: `vendor-${uniqueId}@example.com`,
      payment_terms: 'net30'
    })
    .returning('*');

  return vendor;
}

async function createTestAccount(orgId, type = 'asset') {
  const uniqueId = uuidv4().substring(0, 8);
  const [account] = await db('accounts')
    .insert({
      organization_id: orgId,
      name: 'Test Account',
      account_type: type,
      account_number: `999${uniqueId.substring(0, 5)}`
    })
    .returning('*');

  return account;
}

async function createTestInvoice(orgId, customerId) {
  const [invoice] = await db('invoices')
    .insert({
      organization_id: orgId,
      customer_id: customerId,
      invoice_number: 'TEST-001',
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 1000,
      total: 1000,
      amount_due: 1000
    })
    .returning('*');

  return invoice;
}

module.exports = {
  createTestOrganization,
  createTestUser,
  createTestCustomer,
  createTestVendor,
  createTestAccount,
  createTestInvoice
};
