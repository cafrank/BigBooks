// ============================================
// COMPLETE WORKING MIGRATION FILE
// migrations/20240101000000_create_initial_schema.js
// ============================================

/**
 * This migration creates the complete accounting database schema
 * Run with: NODE_ENV=test npx knex migrate:latest
 */

exports.up = async function(knex) {
  console.log('Creating database schema...');

  // Enable extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Create enums
  await knex.raw(`
    CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
  `);
  
  await knex.raw(`
    CREATE TYPE account_subtype AS ENUM (
      'cash', 'bank', 'accounts_receivable', 'inventory', 'fixed_asset', 'other_asset',
      'accounts_payable', 'credit_card', 'other_liability', 'long_term_liability',
      'owners_equity', 'retained_earnings',
      'sales', 'other_income',
      'cost_of_goods_sold', 'operating_expense', 'other_expense'
    );
  `);
  
  await knex.raw(`
    CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'voided');
  `);
  
  await knex.raw(`
    CREATE TYPE bill_status AS ENUM ('draft', 'open', 'partial', 'paid', 'voided');
  `);
  
  await knex.raw(`
    CREATE TYPE payment_method AS ENUM ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other');
  `);
  
  await knex.raw(`
    CREATE TYPE product_type AS ENUM ('product', 'service');
  `);
  
  await knex.raw(`
    CREATE TYPE transaction_type AS ENUM ('invoice', 'payment', 'expense', 'bill', 'bill_payment', 'journal_entry', 'transfer');
  `);

  // Organizations
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('legal_name', 255);
    table.string('tax_id', 50);
    table.string('email', 255);
    table.string('phone', 50);
    table.string('website', 255);
    table.string('logo_url', 500);
    table.integer('fiscal_year_start_month').defaultTo(1);
    table.string('base_currency', 3).defaultTo('USD');
    table.string('timezone', 50).defaultTo('UTC');
    table.timestamps(true, true);
  });

  // Users
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('phone', 50);
    table.string('avatar_url', 500);
    table.boolean('email_verified').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamps(true, true);
  });

  // Organization Users
  await knex.schema.createTable('organization_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 50).defaultTo('member');
    table.jsonb('permissions').defaultTo('{}');
    table.boolean('is_owner').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['organization_id', 'user_id']);
  });

  // API Keys
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('key_hash', 255).notNullable();
    table.string('key_prefix', 10).notNullable();
    table.specificType('scopes', 'text[]').defaultTo(knex.raw("ARRAY['read', 'write']"));
    table.timestamp('expires_at');
    table.timestamp('last_used_at');
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Accounts (Chart of Accounts)
  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('parent_account_id').references('id').inTable('accounts').onDelete('SET NULL');
    table.string('account_number', 20);
    table.string('name', 255).notNullable();
    table.text('description');
    table.specificType('account_type', 'account_type').notNullable();
    table.specificType('account_subtype', 'account_subtype');
    table.string('currency', 3).defaultTo('USD');
    table.boolean('is_system_account').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.unique(['organization_id', 'account_number']);
    table.index(['organization_id']);
    table.index(['organization_id', 'account_type']);
    table.index(['parent_account_id']);
  });

  // Tax Rates
  await knex.schema.createTable('tax_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.decimal('rate', 6, 4).notNullable();
    table.text('description');
    table.string('agency', 100);
    table.boolean('is_compound').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['organization_id']);
  });

  // Tax Rate Components
  await knex.schema.createTable('tax_rate_components', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tax_rate_id').notNullable().references('id').inTable('tax_rates').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.decimal('rate', 6, 4).notNullable();
    table.string('agency', 100);
    table.integer('sort_order').defaultTo(0);
  });

  // Customers
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('display_name', 255).notNullable();
    table.string('company_name', 255);
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('email', 255);
    table.string('phone', 50);
    table.string('mobile', 50);
    table.string('fax', 50);
    table.string('website', 255);
    table.string('tax_id', 50);
    table.text('notes');
    table.string('payment_terms', 50).defaultTo('net30');
    table.decimal('credit_limit', 15, 2);
    table.boolean('is_taxable').defaultTo(true);
    table.uuid('default_tax_rate_id').references('id').inTable('tax_rates');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['organization_id']);
    table.index(['organization_id', 'email']);
    table.index(['organization_id', 'display_name']);
  });

  // Customer Addresses
  await knex.schema.createTable('customer_addresses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.string('address_type', 20).notNullable().defaultTo('billing');
    table.string('line1', 255);
    table.string('line2', 255);
    table.string('city', 100);
    table.string('state', 100);
    table.string('postal_code', 20);
    table.string('country', 2).defaultTo('US');
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Customer Contacts
  await knex.schema.createTable('customer_contacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('email', 255);
    table.string('phone', 50);
    table.string('title', 100);
    table.boolean('is_primary').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Vendors
  await knex.schema.createTable('vendors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('display_name', 255).notNullable();
    table.string('company_name', 255);
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('email', 255);
    table.string('phone', 50);
    table.string('website', 255);
    table.string('tax_id', 50);
    table.string('account_number', 50);
    table.text('notes');
    table.string('payment_terms', 50).defaultTo('net30');
    table.boolean('is_1099_eligible').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['organization_id']);
    table.index(['organization_id', 'display_name']);
  });

  // Vendor Addresses
  await knex.schema.createTable('vendor_addresses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('CASCADE');
    table.string('address_type', 20).notNullable().defaultTo('primary');
    table.string('line1', 255);
    table.string('line2', 255);
    table.string('city', 100);
    table.string('state', 100);
    table.string('postal_code', 20);
    table.string('country', 2).defaultTo('US');
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Products
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('sku', 100);
    table.specificType('type', 'product_type').notNullable().defaultTo('service');
    table.text('description');
    table.decimal('unit_price', 15, 4);
    table.decimal('cost', 15, 4);
    table.uuid('income_account_id').references('id').inTable('accounts');
    table.uuid('expense_account_id').references('id').inTable('accounts');
    table.uuid('inventory_account_id').references('id').inTable('accounts');
    table.boolean('is_taxable').defaultTo(true);
    table.uuid('tax_rate_id').references('id').inTable('tax_rates');
    table.decimal('quantity_on_hand', 15, 4).defaultTo(0);
    table.decimal('reorder_point', 15, 4);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['organization_id']);
    table.index(['organization_id', 'sku']);
  });

  // Invoices
  await knex.schema.createTable('invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('customer_id').notNullable().references('id').inTable('customers');
    table.string('invoice_number', 50).notNullable();
    table.specificType('status', 'invoice_status').defaultTo('draft');
    table.date('issue_date').notNullable().defaultTo(knex.fn.now());
    table.date('due_date').notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.decimal('exchange_rate', 15, 6).defaultTo(1);
    table.decimal('subtotal', 15, 2).defaultTo(0);
    table.string('discount_type', 20);
    table.decimal('discount_value', 15, 2).defaultTo(0);
    table.decimal('discount_amount', 15, 2).defaultTo(0);
    table.decimal('tax_amount', 15, 2).defaultTo(0);
    table.decimal('shipping_amount', 15, 2).defaultTo(0);
    table.decimal('total', 15, 2).defaultTo(0);
    table.decimal('amount_paid', 15, 2).defaultTo(0);
    table.decimal('amount_due', 15, 2).defaultTo(0);
    table.text('notes');
    table.text('terms');
    table.text('footer');
    table.jsonb('billing_address');
    table.jsonb('shipping_address');
    table.timestamp('sent_at');
    table.timestamp('viewed_at');
    table.timestamp('paid_at');
    table.timestamp('voided_at');
    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.unique(['organization_id', 'invoice_number']);
    table.index(['organization_id']);
    table.index(['customer_id']);
    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'issue_date']);
    table.index(['organization_id', 'due_date']);
  });

  // Invoice Line Items
  await knex.schema.createTable('invoice_line_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    table.uuid('product_id').references('id').inTable('products');
    table.uuid('account_id').references('id').inTable('accounts');
    table.text('description').notNullable();
    table.decimal('quantity', 15, 4).defaultTo(1);
    table.decimal('unit_price', 15, 4).notNullable();
    table.decimal('discount_percent', 5, 2).defaultTo(0);
    table.uuid('tax_rate_id').references('id').inTable('tax_rates');
    table.decimal('tax_amount', 15, 2).defaultTo(0);
    table.decimal('amount', 15, 2).notNullable();
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['invoice_id']);
  });

  // Payments
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('customer_id').notNullable().references('id').inTable('customers');
    table.string('payment_number', 50);
    table.date('payment_date').notNullable().defaultTo(knex.fn.now());
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.decimal('exchange_rate', 15, 6).defaultTo(1);
    table.specificType('payment_method', 'payment_method');
    table.string('reference_number', 100);
    table.uuid('deposit_account_id').references('id').inTable('accounts');
    table.text('memo');
    table.boolean('is_voided').defaultTo(false);
    table.timestamp('voided_at');
    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['organization_id']);
    table.index(['customer_id']);
    table.index(['organization_id', 'payment_date']);
  });

  // Payment Applications
  await knex.schema.createTable('payment_applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('payment_id').notNullable().references('id').inTable('payments').onDelete('CASCADE');
    table.uuid('invoice_id').notNullable().references('id').inTable('invoices');
    table.decimal('amount', 15, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['payment_id']);
  });

  // Bills
  await knex.schema.createTable('bills', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors');
    table.string('bill_number', 50);
    table.string('vendor_invoice_number', 100);
    table.specificType('status', 'bill_status').defaultTo('draft');
    table.date('bill_date').notNullable().defaultTo(knex.fn.now());
    table.date('due_date').notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.decimal('exchange_rate', 15, 6).defaultTo(1);
    table.decimal('subtotal', 15, 2).defaultTo(0);
    table.decimal('tax_amount', 15, 2).defaultTo(0);
    table.decimal('total', 15, 2).defaultTo(0);
    table.decimal('amount_paid', 15, 2).defaultTo(0);
    table.decimal('amount_due', 15, 2).defaultTo(0);
    table.text('memo');
    table.uuid('ap_account_id').references('id').inTable('accounts');
    table.timestamp('voided_at');
    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.unique(['organization_id', 'bill_number']);
    table.index(['organization_id']);
    table.index(['vendor_id']);
    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'due_date']);
  });

  // Bill Line Items
  await knex.schema.createTable('bill_line_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('bill_id').notNullable().references('id').inTable('bills').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts');
    table.uuid('product_id').references('id').inTable('products');
    table.text('description');
    table.decimal('quantity', 15, 4).defaultTo(1);
    table.decimal('unit_price', 15, 4).notNullable();
    table.uuid('tax_rate_id').references('id').inTable('tax_rates');
    table.decimal('tax_amount', 15, 2).defaultTo(0);
    table.decimal('amount', 15, 2).notNullable();
    table.boolean('is_billable').defaultTo(false);
    table.uuid('customer_id').references('id').inTable('customers');
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['bill_id']);
  });

  // Bill Payments
  await knex.schema.createTable('bill_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors');
    table.date('payment_date').notNullable().defaultTo(knex.fn.now());
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.specificType('payment_method', 'payment_method');
    table.string('reference_number', 100);
    table.uuid('payment_account_id').notNullable().references('id').inTable('accounts');
    table.text('memo');
    table.boolean('is_voided').defaultTo(false);
    table.timestamp('voided_at');
    table.uuid('created_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['organization_id']);
  });

  // Bill Payment Applications
  await knex.schema.createTable('bill_payment_applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('bill_payment_id').notNullable().references('id').inTable('bill_payments').onDelete('CASCADE');
    table.uuid('bill_id').notNullable().references('id').inTable('bills');
    table.decimal('amount', 15, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Expenses
  await knex.schema.createTable('expenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('vendor_id').references('id').inTable('vendors');
    table.uuid('account_id').notNullable().references('id').inTable('accounts');
    table.uuid('payment_account_id').references('id').inTable('accounts');
    table.date('expense_date').notNullable().defaultTo(knex.fn.now());
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.decimal('exchange_rate', 15, 6).defaultTo(1);
    table.uuid('tax_rate_id').references('id').inTable('tax_rates');
    table.decimal('tax_amount', 15, 2).defaultTo(0);
    table.text('description');
    table.string('reference_number', 100);
    table.specificType('payment_method', 'payment_method');
    table.boolean('is_billable').defaultTo(false);
    table.uuid('customer_id').references('id').inTable('customers');
    table.uuid('invoice_id').references('id').inTable('invoices');
    table.string('receipt_url', 500);
    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['organization_id']);
    table.index(['vendor_id']);
    table.index(['organization_id', 'expense_date']);
    table.index(['account_id']);
  });

  // Journal Entries
  await knex.schema.createTable('journal_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('entry_number', 50).notNullable();
    table.date('entry_date').notNullable().defaultTo(knex.fn.now());
    table.text('memo');
    table.boolean('is_adjusting').defaultTo(false);
    table.boolean('is_closing').defaultTo(false);
    table.string('source_type', 50);
    table.uuid('source_id');
    table.boolean('is_posted').defaultTo(true);
    table.uuid('reversed_by_id').references('id').inTable('journal_entries');
    table.uuid('reverses_id').references('id').inTable('journal_entries');
    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.unique(['organization_id', 'entry_number']);
    table.index(['organization_id']);
    table.index(['organization_id', 'entry_date']);
  });

  // Journal Entry Lines
  await knex.schema.createTable('journal_entry_lines', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('journal_entry_id').notNullable().references('id').inTable('journal_entries').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts');
    table.text('description');
    table.decimal('debit', 15, 2).defaultTo(0);
    table.decimal('credit', 15, 2).defaultTo(0);
    table.uuid('customer_id').references('id').inTable('customers');
    table.uuid('vendor_id').references('id').inTable('vendors');
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.check('(debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)');
    table.index(['journal_entry_id']);
    table.index(['account_id']);
  });

  // Ledger Entries
  await knex.schema.createTable('ledger_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts');
    table.date('transaction_date').notNullable();
    table.specificType('transaction_type', 'transaction_type').notNullable();
    table.uuid('source_id').notNullable();
    table.uuid('source_line_id');
    table.text('description');
    table.decimal('debit', 15, 2).defaultTo(0);
    table.decimal('credit', 15, 2).defaultTo(0);
    table.decimal('balance', 15, 2);
    table.uuid('customer_id').references('id').inTable('customers');
    table.uuid('vendor_id').references('id').inTable('vendors');
    table.boolean('is_posted').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['organization_id']);
    table.index(['account_id']);
    table.index(['organization_id', 'transaction_date']);
    table.index(['source_id']);
    table.index(['organization_id', 'transaction_type']);
  });

  // Document Sequences
  await knex.schema.createTable('document_sequences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('document_type', 50).notNullable();
    table.string('prefix', 20).defaultTo('');
    table.integer('next_number').defaultTo(1);
    table.integer('padding').defaultTo(4);
    table.unique(['organization_id', 'document_type']);
  });

  // Attachments
  await knex.schema.createTable('attachments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('entity_type', 50).notNullable();
    table.uuid('entity_id').notNullable();
    table.string('file_name', 255).notNullable();
    table.string('file_type', 100);
    table.integer('file_size');
    table.string('file_url', 500).notNullable();
    table.string('thumbnail_url', 500);
    table.uuid('uploaded_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['entity_type', 'entity_id']);
  });

  // Audit Logs
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users');
    table.string('action', 50).notNullable();
    table.string('entity_type', 50).notNullable();
    table.uuid('entity_id').notNullable();
    table.jsonb('old_values');
    table.jsonb('new_values');
    table.specificType('ip_address', 'inet');
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['organization_id']);
    table.index(['entity_type', 'entity_id']);
    table.index(['created_at']);
  });

  // Organization Settings
  await knex.schema.createTable('organization_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('setting_key', 100).notNullable();
    table.jsonb('setting_value');
    table.timestamps(true, true);
    table.unique(['organization_id', 'setting_key']);
  });

  // Create Views
  await knex.raw(`
    CREATE VIEW v_account_balances AS
    SELECT 
      a.id,
      a.organization_id,
      a.name,
      a.account_type,
      a.account_subtype,
      COALESCE(SUM(le.debit), 0) AS total_debits,
      COALESCE(SUM(le.credit), 0) AS total_credits,
      CASE 
        WHEN a.account_type IN ('asset', 'expense') 
          THEN COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0)
        ELSE COALESCE(SUM(le.credit), 0) - COALESCE(SUM(le.debit), 0)
      END AS balance
    FROM accounts a
    LEFT JOIN ledger_entries le ON a.id = le.account_id AND le.is_posted = TRUE
    GROUP BY a.id, a.organization_id, a.name, a.account_type, a.account_subtype;
  `);

  await knex.raw(`
    CREATE VIEW v_customer_balances AS
    SELECT 
      c.id,
      c.organization_id,
      c.display_name,
      COALESCE(SUM(i.amount_due), 0) AS total_balance,
      COALESCE(SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.amount_due ELSE 0 END), 0) AS current,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - 30 THEN i.amount_due ELSE 0 END), 0) AS days_1_30,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 30 AND i.due_date >= CURRENT_DATE - 60 THEN i.amount_due ELSE 0 END), 0) AS days_31_60,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 60 AND i.due_date >= CURRENT_DATE - 90 THEN i.amount_due ELSE 0 END), 0) AS days_61_90,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 90 THEN i.amount_due ELSE 0 END), 0) AS days_90_plus
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id AND i.status NOT IN ('draft', 'voided', 'paid')
    GROUP BY c.id, c.organization_id, c.display_name;
  `);

  await knex.raw(`
    CREATE VIEW v_vendor_balances AS
    SELECT 
      v.id,
      v.organization_id,
      v.display_name,
      COALESCE(SUM(b.amount_due), 0) AS total_balance,
      COALESCE(SUM(CASE WHEN b.due_date >= CURRENT_DATE THEN b.amount_due ELSE 0 END), 0) AS current,
      COALESCE(SUM(CASE WHEN b.due_date < CURRENT_DATE AND b.due_date >= CURRENT_DATE - 30 THEN b.amount_due ELSE 0 END), 0) AS days_1_30,
      COALESCE(SUM(CASE WHEN b.due_date < CURRENT_DATE - 30 AND b.due_date >= CURRENT_DATE - 60 THEN b.amount_due ELSE 0 END), 0) AS days_31_60,
      COALESCE(SUM(CASE WHEN b.due_date < CURRENT_DATE - 60 AND b.due_date >= CURRENT_DATE - 90 THEN b.amount_due ELSE 0 END), 0) AS days_61_90,
      COALESCE(SUM(CASE WHEN b.due_date < CURRENT_DATE - 90 THEN b.amount_due ELSE 0 END), 0) AS days_90_plus
    FROM vendors v
    LEFT JOIN bills b ON v.id = b.vendor_id AND b.status NOT IN ('draft', 'voided', 'paid')
    GROUP BY v.id, v.organization_id, v.display_name;
  `);

  // Create Functions
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_document_number(
      p_org_id UUID,
      p_doc_type VARCHAR(50)
    ) RETURNS VARCHAR AS $$
    DECLARE
      v_prefix VARCHAR(20);
      v_next_num INT;
      v_padding INT;
      v_result VARCHAR;
    BEGIN
      INSERT INTO document_sequences (organization_id, document_type)
      VALUES (p_org_id, p_doc_type)
      ON CONFLICT (organization_id, document_type) DO NOTHING;

      UPDATE document_sequences
      SET next_number = next_number + 1
      WHERE organization_id = p_org_id AND document_type = p_doc_type
      RETURNING prefix, next_number - 1, padding INTO v_prefix, v_next_num, v_padding;

      v_result := v_prefix || LPAD(v_next_num::TEXT, v_padding, '0');
      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create seed_default_accounts function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION seed_default_accounts(p_org_id UUID)
    RETURNS VOID AS $$
    BEGIN
      -- Asset accounts
      INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
        (p_org_id, '1000', 'Cash on Hand', 'asset', 'cash', TRUE),
        (p_org_id, '1010', 'Checking Account', 'asset', 'bank', TRUE),
        (p_org_id, '1020', 'Savings Account', 'asset', 'bank', FALSE),
        (p_org_id, '1100', 'Accounts Receivable', 'asset', 'accounts_receivable', TRUE),
        (p_org_id, '1200', 'Inventory', 'asset', 'inventory', FALSE),
        (p_org_id, '1300', 'Prepaid Expenses', 'asset', 'other_asset', FALSE),
        (p_org_id, '1500', 'Furniture & Equipment', 'asset', 'fixed_asset', FALSE);

      -- Liability accounts
      INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
        (p_org_id, '2000', 'Accounts Payable', 'liability', 'accounts_payable', TRUE),
        (p_org_id, '2100', 'Credit Card', 'liability', 'credit_card', FALSE),
        (p_org_id, '2200', 'Accrued Expenses', 'liability', 'other_liability', FALSE),
        (p_org_id, '2300', 'Sales Tax Payable', 'liability', 'other_liability', TRUE);

      -- Equity accounts
      INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
        (p_org_id, '3000', 'Owner''s Equity', 'equity', 'owners_equity', TRUE),
        (p_org_id, '3200', 'Retained Earnings', 'equity', 'retained_earnings', TRUE);

      -- Income accounts
      INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
        (p_org_id, '4000', 'Sales Revenue', 'income', 'sales', TRUE),
        (p_org_id, '4100', 'Service Revenue', 'income', 'sales', FALSE);

      -- Expense accounts
      INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
        (p_org_id, '5000', 'Cost of Goods Sold', 'expense', 'cost_of_goods_sold', TRUE),
        (p_org_id, '6000', 'Advertising & Marketing', 'expense', 'operating_expense', FALSE),
        (p_org_id, '6600', 'Payroll Expenses', 'expense', 'operating_expense', FALSE),
        (p_org_id, '6800', 'Rent Expense', 'expense', 'operating_expense', FALSE),
        (p_org_id, '6900', 'Utilities', 'expense', 'operating_expense', FALSE);

      -- Set up document sequences
      INSERT INTO document_sequences (organization_id, document_type, prefix, next_number, padding) VALUES
        (p_org_id, 'invoice', 'INV-', 1001, 4),
        (p_org_id, 'payment', 'PMT-', 1001, 4),
        (p_org_id, 'bill', 'BILL-', 1001, 4),
        (p_org_id, 'journal_entry', 'JE-', 1001, 4);
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log('✓ Schema created successfully');
};

exports.down = async function(knex) {
  console.log('Rolling back schema...');

  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS seed_default_accounts(UUID)');
  await knex.raw('DROP FUNCTION IF EXISTS generate_document_number(UUID, VARCHAR)');

  // Drop views
  await knex.raw('DROP VIEW IF EXISTS v_vendor_balances');
  await knex.raw('DROP VIEW IF EXISTS v_customer_balances');
  await knex.raw('DROP VIEW IF EXISTS v_account_balances');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('organization_settings');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('document_sequences');
  await knex.schema.dropTableIfExists('ledger_entries');
  await knex.schema.dropTableIfExists('journal_entry_lines');
  await knex.schema.dropTableIfExists('journal_entries');
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('bill_payment_applications');
  await knex.schema.dropTableIfExists('bill_payments');
  await knex.schema.dropTableIfExists('bill_line_items');
  await knex.schema.dropTableIfExists('bills');
  await knex.schema.dropTableIfExists('payment_applications');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoice_line_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('vendor_addresses');
  await knex.schema.dropTableIfExists('vendors');
  await knex.schema.dropTableIfExists('customer_contacts');
  await knex.schema.dropTableIfExists('customer_addresses');
  await knex.schema.dropTableIfExists('customers');
  await knex.schema.dropTableIfExists('tax_rate_components');
  await knex.schema.dropTableIfExists('tax_rates');
  await knex.schema.dropTableIfExists('accounts');
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('organization_users');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('organizations');

  // Drop enums
  await knex.raw('DROP TYPE IF EXISTS transaction_type');
  await knex.raw('DROP TYPE IF EXISTS product_type');
  await knex.raw('DROP TYPE IF EXISTS payment_method');
  await knex.raw('DROP TYPE IF EXISTS bill_status');
  await knex.raw('DROP TYPE IF EXISTS invoice_status');
  await knex.raw('DROP TYPE IF EXISTS account_subtype');
  await knex.raw('DROP TYPE IF EXISTS account_type');

  console.log('✓ Schema rolled back');
};