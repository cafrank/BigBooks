/**
 * Development Seed File
 * Populates the database with sample data for development and testing
 *
 * Run with: npm run seed
 * or: npx knex seed:run
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  console.log('🌱 Starting development seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await knex('payment_applications').del();
  await knex('payments').del();
  await knex('bill_payments').del();
  await knex('bill_payment_applications').del();
  await knex('invoice_line_items').del();
  await knex('invoices').del();
  await knex('bill_line_items').del();
  await knex('bills').del();
  await knex('expenses').del();
  await knex('ledger_entries').del();
  await knex('journal_entries').del();
  await knex('products').del();
  await knex('customer_contacts').del();
  await knex('customer_addresses').del();
  await knex('customers').del();
  await knex('vendor_addresses').del();
  await knex('vendors').del();
  await knex('tax_rates').del();
  await knex('accounts').del();
  await knex('organization_users').del();
  await knex('users').del();
  await knex('organizations').del();

  // Create organization
  console.log('Creating organization...');
  const [org] = await knex('organizations').insert({
    id: '2c2adc72-c6c4-4e46-8046-7f5a43b0859a',
    name: 'Demo Company',
    legal_name: 'Demo Company Inc.',
    tax_id: '12-3456789',
    email: 'info@democompany.com',
    phone: '555-0100',
    website: 'https://democompany.com',
    fiscal_year_start_month: 1,
    base_currency: 'USD',
    timezone: 'America/New_York'
  }).returning('*');

  // Create users
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const [adminUser] = await knex('users').insert({
    id: 'ac4db2d7-0ece-4a35-8070-293a25852e4d',
    email: 'admin@example.com',
    password_hash: passwordHash,
    first_name: 'Admin',
    last_name: 'User',
    phone: '555-0101',
    email_verified: true,
    is_active: true
  }).returning('*');

  const [demoUser] = await knex('users').insert({
    email: 'demo@example.com',
    password_hash: passwordHash,
    first_name: 'Demo',
    last_name: 'User',
    phone: '555-0102',
    email_verified: true,
    is_active: true
  }).returning('*');

  // Link users to organization
  await knex('organization_users').insert([
    {
      organization_id: org.id,
      user_id: adminUser.id,
      role: 'admin',
      is_owner: true
    },
    {
      organization_id: org.id,
      user_id: demoUser.id,
      role: 'member',
      is_owner: false
    }
  ]);

  // Create chart of accounts
  console.log('Creating chart of accounts...');
  const accounts = await knex('accounts').insert([
    // Assets
    { organization_id: org.id, account_number: '1000', name: 'Cash', account_type: 'asset', account_subtype: 'cash', is_active: true },
    { organization_id: org.id, account_number: '1010', name: 'Checking Account', account_type: 'asset', account_subtype: 'bank', is_active: true },
    { organization_id: org.id, account_number: '1200', name: 'Accounts Receivable', account_type: 'asset', account_subtype: 'accounts_receivable', is_system_account: true, is_active: true },
    { organization_id: org.id, account_number: '1300', name: 'Inventory', account_type: 'asset', account_subtype: 'inventory', is_active: true },
    { organization_id: org.id, account_number: '1500', name: 'Office Equipment', account_type: 'asset', account_subtype: 'fixed_asset', is_active: true },

    // Liabilities
    { organization_id: org.id, account_number: '2000', name: 'Accounts Payable', account_type: 'liability', account_subtype: 'accounts_payable', is_system_account: true, is_active: true },
    { organization_id: org.id, account_number: '2100', name: 'Credit Card', account_type: 'liability', account_subtype: 'credit_card', is_active: true },
    { organization_id: org.id, account_number: '2500', name: 'Long-term Loan', account_type: 'liability', account_subtype: 'long_term_liability', is_active: true },

    // Equity
    { organization_id: org.id, account_number: '3000', name: 'Owner\'s Equity', account_type: 'equity', account_subtype: 'owners_equity', is_active: true },
    { organization_id: org.id, account_number: '3100', name: 'Retained Earnings', account_type: 'equity', account_subtype: 'retained_earnings', is_system_account: true, is_active: true },

    // Income
    { organization_id: org.id, account_number: '4000', name: 'Sales Revenue', account_type: 'income', account_subtype: 'sales', is_active: true },
    { organization_id: org.id, account_number: '4100', name: 'Service Revenue', account_type: 'income', account_subtype: 'sales', is_active: true },
    { organization_id: org.id, account_number: '4500', name: 'Other Income', account_type: 'income', account_subtype: 'other_income', is_active: true },

    // Expenses
    { organization_id: org.id, account_number: '5000', name: 'Cost of Goods Sold', account_type: 'expense', account_subtype: 'cost_of_goods_sold', is_active: true },
    { organization_id: org.id, account_number: '6000', name: 'Rent Expense', account_type: 'expense', account_subtype: 'operating_expense', is_active: true },
    { organization_id: org.id, account_number: '6100', name: 'Utilities Expense', account_type: 'expense', account_subtype: 'operating_expense', is_active: true },
    { organization_id: org.id, account_number: '6200', name: 'Office Supplies', account_type: 'expense', account_subtype: 'operating_expense', is_active: true },
    { organization_id: org.id, account_number: '6300', name: 'Professional Services', account_type: 'expense', account_subtype: 'operating_expense', is_active: true },
    { organization_id: org.id, account_number: '6400', name: 'Marketing & Advertising', account_type: 'expense', account_subtype: 'operating_expense', is_active: true },
    { organization_id: org.id, account_number: '6500', name: 'Travel Expense', account_type: 'expense', account_subtype: 'operating_expense', is_active: true },
  ]).returning('*');

  const accountsMap = accounts.reduce((map, acc) => {
    map[acc.account_number] = acc.id;
    return map;
  }, {});

  // Create tax rates
  console.log('Creating tax rates...');
  const [salesTax] = await knex('tax_rates').insert({
    organization_id: org.id,
    name: 'Sales Tax (8.5%)',
    rate: 8.5,
    description: 'Standard sales tax rate',
    agency: 'State Tax Authority',
    is_active: true
  }).returning('*');

  const [vatTax] = await knex('tax_rates').insert({
    organization_id: org.id,
    name: 'VAT (10%)',
    rate: 10.0,
    description: 'Value Added Tax',
    agency: 'Federal Tax Authority',
    is_active: true
  }).returning('*');

  // Create customers
  console.log('Creating customers...');
  const customers = await knex('customers').insert([
    {
      id: '6ce69d15-5e12-4b57-bad6-3ff52e3aa0eb',
      organization_id: org.id,
      display_name: 'Acme Corporation',
      company_name: 'Acme Corporation',
      email: 'billing@acme.com',
      phone: '555-0200',
      website: 'https://acme.com',
      payment_terms: 'net30',
      credit_limit: 50000,
      is_taxable: true,
      default_tax_rate_id: salesTax.id,
      is_active: true
    },
    {
      organization_id: org.id,
      display_name: 'Tech Solutions Inc',
      company_name: 'Tech Solutions Inc',
      email: 'info@techsolutions.com',
      phone: '555-0201',
      website: 'https://techsolutions.com',
      payment_terms: 'net15',
      credit_limit: 25000,
      is_taxable: true,
      is_active: true
    },
    {
      organization_id: org.id,
      display_name: 'Global Enterprises',
      company_name: 'Global Enterprises LLC',
      email: 'accounts@globalent.com',
      phone: '555-0202',
      payment_terms: 'net45',
      credit_limit: 75000,
      is_taxable: true,
      is_active: true
    },
    {
      organization_id: org.id,
      display_name: 'John Smith',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@email.com',
      phone: '555-0203',
      payment_terms: 'due_on_receipt',
      is_taxable: true,
      is_active: true
    }
  ]).returning('*');

  // Create vendors
  console.log('Creating vendors...');
  const vendors = await knex('vendors').insert([
    {
      organization_id: org.id,
      display_name: 'Office Depot',
      company_name: 'Office Depot Inc',
      email: 'suppliers@officedepot.com',
      phone: '555-0300',
      website: 'https://officedepot.com',
      payment_terms: 'net30',
      is_1099_eligible: false,
      is_active: true
    },
    {
      organization_id: org.id,
      display_name: 'CloudHost Services',
      company_name: 'CloudHost Services LLC',
      email: 'billing@cloudhost.com',
      phone: '555-0301',
      website: 'https://cloudhost.com',
      payment_terms: 'net15',
      is_1099_eligible: true,
      is_active: true
    },
    {
      organization_id: org.id,
      display_name: 'City Utilities',
      company_name: 'City Utilities Department',
      email: 'payments@cityutil.gov',
      phone: '555-0302',
      payment_terms: 'due_on_receipt',
      is_1099_eligible: false,
      is_active: true
    }
  ]).returning('*');

  // Create products/services
  console.log('Creating products and services...');
  const products = await knex('products').insert([
    {
      organization_id: org.id,
      name: 'Web Development Service',
      sku: 'SRV-001',
      type: 'service',
      description: 'Custom web development services',
      unit_price: 125.00,
      cost: 75.00,
      income_account_id: accountsMap['4100'],
      is_taxable: true,
      tax_rate_id: salesTax.id,
      is_active: true
    },
    {
      organization_id: org.id,
      name: 'Consulting Hour',
      sku: 'SRV-002',
      type: 'service',
      description: 'Professional consulting services',
      unit_price: 150.00,
      cost: 90.00,
      income_account_id: accountsMap['4100'],
      is_taxable: true,
      tax_rate_id: salesTax.id,
      is_active: true
    },
    {
      organization_id: org.id,
      name: 'Software License',
      sku: 'PRD-001',
      type: 'product',
      description: 'Annual software license',
      unit_price: 999.00,
      cost: 200.00,
      income_account_id: accountsMap['4000'],
      inventory_account_id: accountsMap['1300'],
      expense_account_id: accountsMap['5000'],
      is_taxable: true,
      tax_rate_id: salesTax.id,
      quantity_on_hand: 50,
      reorder_point: 10,
      is_active: true
    },
    {
      organization_id: org.id,
      name: 'Training Workshop',
      sku: 'SRV-003',
      type: 'service',
      description: 'Full-day training workshop',
      unit_price: 2500.00,
      cost: 1000.00,
      income_account_id: accountsMap['4100'],
      is_taxable: true,
      is_active: true
    }
  ]).returning('*');

  // Create invoices
  console.log('Creating invoices...');
  const invoiceDate1 = new Date();
  invoiceDate1.setDate(invoiceDate1.getDate() - 15);
  const dueDate1 = new Date(invoiceDate1);
  dueDate1.setDate(dueDate1.getDate() + 30);

  const invoiceDate2 = new Date();
  invoiceDate2.setDate(invoiceDate2.getDate() - 5);
  const dueDate2 = new Date(invoiceDate2);
  dueDate2.setDate(dueDate2.getDate() + 15);

  const invoiceDate3 = new Date();
  const dueDate3 = new Date(invoiceDate3);
  dueDate3.setDate(dueDate3.getDate() + 30);

  const invoices = await knex('invoices').insert([
    {
      organization_id: org.id,
      customer_id: customers[0].id,
      invoice_number: 'INV-1001',
      status: 'sent',
      issue_date: invoiceDate1,
      due_date: dueDate1,
      currency: 'USD',
      subtotal: 5000.00,
      tax_amount: 425.00,
      total: 5425.00,
      amount_paid: 0,
      amount_due: 5425.00,
      notes: 'Thank you for your business!',
      terms: 'Payment due within 30 days',
      created_by: adminUser.id
    },
    {
      organization_id: org.id,
      customer_id: customers[1].id,
      invoice_number: 'INV-1002',
      status: 'partial',
      issue_date: invoiceDate2,
      due_date: dueDate2,
      currency: 'USD',
      subtotal: 3000.00,
      tax_amount: 255.00,
      total: 3255.00,
      amount_paid: 1500.00,
      amount_due: 1755.00,
      notes: 'Partial payment received',
      created_by: adminUser.id
    },
    {
      organization_id: org.id,
      customer_id: customers[2].id,
      invoice_number: 'INV-1003',
      status: 'draft',
      issue_date: invoiceDate3,
      due_date: dueDate3,
      currency: 'USD',
      subtotal: 7500.00,
      tax_amount: 637.50,
      total: 8137.50,
      amount_paid: 0,
      amount_due: 8137.50,
      notes: 'Draft invoice - not yet sent',
      created_by: demoUser.id
    }
  ]).returning('*');

  // Create invoice line items
  console.log('Creating invoice line items...');
  await knex('invoice_line_items').insert([
    // INV-1001 line items
    {
      invoice_id: invoices[0].id,
      product_id: products[0].id,
      description: 'Web Development Services - 40 hours',
      quantity: 40,
      unit_price: 125.00,
      amount: 5000.00,
      tax_rate_id: salesTax.id,
      tax_amount: 425.00,
      sort_order: 1
    },
    // INV-1002 line items
    {
      invoice_id: invoices[1].id,
      product_id: products[1].id,
      description: 'Consulting Services',
      quantity: 20,
      unit_price: 150.00,
      amount: 3000.00,
      tax_rate_id: salesTax.id,
      tax_amount: 255.00,
      sort_order: 1
    },
    // INV-1003 line items
    {
      invoice_id: invoices[2].id,
      product_id: products[2].id,
      description: 'Software License - 5 licenses',
      quantity: 5,
      unit_price: 999.00,
      amount: 4995.00,
      tax_rate_id: salesTax.id,
      tax_amount: 424.58,
      sort_order: 1
    },
    {
      invoice_id: invoices[2].id,
      product_id: products[3].id,
      description: 'Training Workshop',
      quantity: 1,
      unit_price: 2500.00,
      amount: 2500.00,
      tax_rate_id: salesTax.id,
      tax_amount: 212.50,
      sort_order: 2
    }
  ]);

  // Create bills
  console.log('Creating bills...');
  const billDate1 = new Date();
  billDate1.setDate(billDate1.getDate() - 10);
  const billDue1 = new Date(billDate1);
  billDue1.setDate(billDue1.getDate() + 30);

  const billDate2 = new Date();
  billDate2.setDate(billDate2.getDate() - 3);
  const billDue2 = new Date(billDate2);
  billDue2.setDate(billDue2.getDate() + 15);

  const bills = await knex('bills').insert([
    {
      organization_id: org.id,
      vendor_id: vendors[0].id,
      bill_number: 'BILL-001',
      status: 'open',
      bill_date: billDate1,
      due_date: billDue1,
      currency: 'USD',
      subtotal: 450.00,
      tax_amount: 0,
      total: 450.00,
      amount_paid: 0,
      amount_due: 450.00,
      memo: 'Office supplies order',
      ap_account_id: accountsMap['2000'],
      created_by: adminUser.id
    },
    {
      organization_id: org.id,
      vendor_id: vendors[1].id,
      bill_number: 'BILL-002',
      status: 'paid',
      bill_date: billDate2,
      due_date: billDue2,
      currency: 'USD',
      subtotal: 299.00,
      tax_amount: 0,
      total: 299.00,
      amount_paid: 299.00,
      amount_due: 0,
      memo: 'Monthly hosting fee',
      ap_account_id: accountsMap['2000'],
      created_by: adminUser.id
    }
  ]).returning('*');

  // Create bill line items
  console.log('Creating bill line items...');
  await knex('bill_line_items').insert([
    {
      bill_id: bills[0].id,
      description: 'Office paper and supplies',
      quantity: 1,
      unit_price: 450.00,
      amount: 450.00,
      account_id: accountsMap['6200'],
      sort_order: 1
    },
    {
      bill_id: bills[1].id,
      description: 'Cloud hosting - Monthly subscription',
      quantity: 1,
      unit_price: 299.00,
      amount: 299.00,
      account_id: accountsMap['6300'],
      sort_order: 1
    }
  ]);

  // Create document sequences
  console.log('Setting up document sequences...');
  await knex('document_sequences').insert([
    {
      organization_id: org.id,
      document_type: 'invoice',
      prefix: 'INV-',
      next_number: 1004,
      padding: 4
    },
    {
      organization_id: org.id,
      document_type: 'bill',
      prefix: 'BILL-',
      next_number: 3,
      padding: 3
    },
    {
      organization_id: org.id,
      document_type: 'payment',
      prefix: 'PAY-',
      next_number: 1,
      padding: 4
    },
    {
      organization_id: org.id,
      document_type: 'expense',
      prefix: 'EXP-',
      next_number: 1,
      padding: 4
    }
  ]);

  console.log('✅ Development seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Organization: ${org.name}`);
  console.log(`   - Users: 2 (admin@example.com, demo@example.com)`);
  console.log(`   - Password: password123`);
  console.log(`   - Customers: ${customers.length}`);
  console.log(`   - Vendors: ${vendors.length}`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Accounts: ${accounts.length}`);
  console.log(`   - Invoices: ${invoices.length}`);
  console.log(`   - Bills: ${bills.length}`);
  console.log('');
  console.log('🚀 You can now login with:');
  console.log('   Email: admin@example.com');
  console.log('   Password: password123');
};
