-- ============================================
-- ACCOUNTING SERVICE DATABASE SCHEMA
-- PostgreSQL 14+
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
CREATE TYPE account_subtype AS ENUM (
  'cash', 'bank', 'accounts_receivable', 'inventory', 'fixed_asset', 'other_asset',
  'accounts_payable', 'credit_card', 'other_liability', 'long_term_liability',
  'owners_equity', 'retained_earnings',
  'sales', 'other_income',
  'cost_of_goods_sold', 'operating_expense', 'other_expense'
);

CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'voided');
CREATE TYPE bill_status AS ENUM ('draft', 'open', 'partial', 'paid', 'voided');
CREATE TYPE payment_method AS ENUM ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other');
CREATE TYPE product_type AS ENUM ('product', 'service');
CREATE TYPE transaction_type AS ENUM ('invoice', 'payment', 'expense', 'bill', 'bill_payment', 'journal_entry', 'transfer');

-- ============================================
-- ORGANIZATIONS (Multi-tenant support)
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  logo_url VARCHAR(500),
  fiscal_year_start_month INT DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  base_currency CHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address_type VARCHAR(20) DEFAULT 'primary',
  line1 VARCHAR(255),
  line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country CHAR(2) DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  is_owner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  account_number VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  account_type account_type NOT NULL,
  account_subtype account_subtype,
  currency CHAR(3) DEFAULT 'USD',
  is_system_account BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, account_number)
);

CREATE INDEX idx_accounts_org ON accounts(organization_id);
CREATE INDEX idx_accounts_type ON accounts(organization_id, account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  fax VARCHAR(50),
  website VARCHAR(255),
  tax_id VARCHAR(50),
  notes TEXT,
  payment_terms VARCHAR(50) DEFAULT 'net30',
  credit_limit DECIMAL(15,2),
  is_taxable BOOLEAN DEFAULT TRUE,
  default_tax_rate_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_type VARCHAR(20) NOT NULL DEFAULT 'billing',
  line1 VARCHAR(255),
  line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country CHAR(2) DEFAULT 'US',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  title VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_email ON customers(organization_id, email);
CREATE INDEX idx_customers_name ON customers(organization_id, display_name);

-- ============================================
-- VENDORS
-- ============================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  tax_id VARCHAR(50),
  account_number VARCHAR(50),
  notes TEXT,
  payment_terms VARCHAR(50) DEFAULT 'net30',
  is_1099_eligible BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  address_type VARCHAR(20) NOT NULL DEFAULT 'primary',
  line1 VARCHAR(255),
  line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country CHAR(2) DEFAULT 'US',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_org ON vendors(organization_id);
CREATE INDEX idx_vendors_name ON vendors(organization_id, display_name);

-- ============================================
-- PRODUCTS & SERVICES
-- ============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  type product_type NOT NULL DEFAULT 'service',
  description TEXT,
  unit_price DECIMAL(15,4),
  cost DECIMAL(15,4),
  income_account_id UUID REFERENCES accounts(id),
  expense_account_id UUID REFERENCES accounts(id),
  inventory_account_id UUID REFERENCES accounts(id),
  is_taxable BOOLEAN DEFAULT TRUE,
  tax_rate_id UUID,
  quantity_on_hand DECIMAL(15,4) DEFAULT 0,
  reorder_point DECIMAL(15,4),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_sku ON products(organization_id, sku);

-- ============================================
-- TAX RATES
-- ============================================

CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(6,4) NOT NULL,
  description TEXT,
  agency VARCHAR(100),
  is_compound BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_rate_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tax_rate_id UUID NOT NULL REFERENCES tax_rates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(6,4) NOT NULL,
  agency VARCHAR(100),
  sort_order INT DEFAULT 0
);

-- Add foreign keys for tax rates
ALTER TABLE customers ADD CONSTRAINT fk_customer_tax_rate 
  FOREIGN KEY (default_tax_rate_id) REFERENCES tax_rates(id);
ALTER TABLE products ADD CONSTRAINT fk_product_tax_rate 
  FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id);

CREATE INDEX idx_tax_rates_org ON tax_rates(organization_id);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_number VARCHAR(50) NOT NULL,
  status invoice_status DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_type VARCHAR(20),
  discount_value DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_due DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  footer TEXT,
  billing_address JSONB,
  shipping_address JSONB,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, invoice_number)
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  account_id UUID REFERENCES accounts(id),
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_rate_id UUID REFERENCES tax_rates(id),
  tax_amount DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(organization_id, status);
CREATE INDEX idx_invoices_date ON invoices(organization_id, issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(organization_id, due_date);
CREATE INDEX idx_invoice_lines ON invoice_line_items(invoice_id);

-- ============================================
-- PAYMENTS RECEIVED
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  payment_number VARCHAR(50),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  payment_method payment_method,
  reference_number VARCHAR(100),
  deposit_account_id UUID REFERENCES accounts(id),
  memo TEXT,
  is_voided BOOLEAN DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(organization_id, payment_date);
CREATE INDEX idx_payment_applications ON payment_applications(payment_id);

-- ============================================
-- EXPENSES
-- ============================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  payment_account_id UUID REFERENCES accounts(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  tax_rate_id UUID REFERENCES tax_rates(id),
  tax_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  reference_number VARCHAR(100),
  payment_method payment_method,
  is_billable BOOLEAN DEFAULT FALSE,
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES invoices(id),
  receipt_url VARCHAR(500),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_org ON expenses(organization_id);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_expenses_date ON expenses(organization_id, expense_date);
CREATE INDEX idx_expenses_account ON expenses(account_id);

-- ============================================
-- BILLS (Accounts Payable)
-- ============================================

CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  bill_number VARCHAR(50),
  vendor_invoice_number VARCHAR(100),
  status bill_status DEFAULT 'draft',
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_due DECIMAL(15,2) DEFAULT 0,
  memo TEXT,
  ap_account_id UUID REFERENCES accounts(id),
  voided_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, bill_number)
);

CREATE TABLE bill_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  product_id UUID REFERENCES products(id),
  description TEXT,
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL,
  tax_rate_id UUID REFERENCES tax_rates(id),
  tax_amount DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) NOT NULL,
  is_billable BOOLEAN DEFAULT FALSE,
  customer_id UUID REFERENCES customers(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bill_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  payment_method payment_method,
  reference_number VARCHAR(100),
  payment_account_id UUID NOT NULL REFERENCES accounts(id),
  memo TEXT,
  is_voided BOOLEAN DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bill_payment_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_payment_id UUID NOT NULL REFERENCES bill_payments(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id),
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bills_org ON bills(organization_id);
CREATE INDEX idx_bills_vendor ON bills(vendor_id);
CREATE INDEX idx_bills_status ON bills(organization_id, status);
CREATE INDEX idx_bills_due_date ON bills(organization_id, due_date);
CREATE INDEX idx_bill_lines ON bill_line_items(bill_id);
CREATE INDEX idx_bill_payments_org ON bill_payments(organization_id);

-- ============================================
-- JOURNAL ENTRIES
-- ============================================

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  is_adjusting BOOLEAN DEFAULT FALSE,
  is_closing BOOLEAN DEFAULT FALSE,
  source_type VARCHAR(50),
  source_id UUID,
  is_posted BOOLEAN DEFAULT TRUE,
  reversed_by_id UUID REFERENCES journal_entries(id),
  reverses_id UUID REFERENCES journal_entries(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, entry_number)
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  description TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  customer_id UUID REFERENCES customers(id),
  vendor_id UUID REFERENCES vendors(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

CREATE INDEX idx_journal_entries_org ON journal_entries(organization_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(organization_id, entry_date);
CREATE INDEX idx_journal_lines ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_entry_lines(account_id);

-- ============================================
-- GENERAL LEDGER (Materialized transactions)
-- ============================================

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  transaction_date DATE NOT NULL,
  transaction_type transaction_type NOT NULL,
  source_id UUID NOT NULL,
  source_line_id UUID,
  description TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2),
  customer_id UUID REFERENCES customers(id),
  vendor_id UUID REFERENCES vendors(id),
  is_posted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_org ON ledger_entries(organization_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_date ON ledger_entries(organization_id, transaction_date);
CREATE INDEX idx_ledger_source ON ledger_entries(source_id);
CREATE INDEX idx_ledger_type ON ledger_entries(organization_id, transaction_type);

-- ============================================
-- RECURRING TRANSACTIONS
-- ============================================

CREATE TABLE recurring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_type VARCHAR(20) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  customer_id UUID REFERENCES customers(id),
  vendor_id UUID REFERENCES vendors(id),
  frequency VARCHAR(20) NOT NULL,
  interval_count INT DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  next_date DATE,
  last_generated_date DATE,
  auto_send BOOLEAN DEFAULT FALSE,
  days_before_due INT DEFAULT 0,
  template_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_org ON recurring_templates(organization_id);
CREATE INDEX idx_recurring_next ON recurring_templates(next_date) WHERE is_active = TRUE;

-- ============================================
-- ATTACHMENTS
-- ============================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INT,
  file_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- ============================================
-- SETTINGS & SEQUENCES
-- ============================================

CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, setting_key)
);

CREATE TABLE document_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  prefix VARCHAR(20) DEFAULT '',
  next_number INT DEFAULT 1,
  padding INT DEFAULT 4,
  UNIQUE(organization_id, document_type)
);

-- ============================================
-- VIEWS
-- ============================================

-- Account balances view
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

-- Customer balances view
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

-- Vendor balances view
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

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate next document number
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
$ LANGUAGE plpgsql;

-- Update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $
BEGIN
  UPDATE invoices SET
    subtotal = (SELECT COALESCE(SUM(amount), 0) FROM invoice_line_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM invoice_line_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  UPDATE invoices SET
    total = subtotal + tax_amount + shipping_amount - discount_amount,
    amount_due = subtotal + tax_amount + shipping_amount - discount_amount - amount_paid
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_line_items
AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- Update bill totals
CREATE OR REPLACE FUNCTION update_bill_totals()
RETURNS TRIGGER AS $
BEGIN
  UPDATE bills SET
    subtotal = (SELECT COALESCE(SUM(amount), 0) FROM bill_line_items WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)),
    tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM bill_line_items WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  UPDATE bills SET
    total = subtotal + tax_amount,
    amount_due = subtotal + tax_amount - amount_paid
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_line_items
AFTER INSERT OR UPDATE OR DELETE ON bill_line_items
FOR EACH ROW EXECUTE FUNCTION update_bill_totals();

-- Update invoice amount paid when payment applied
CREATE OR REPLACE FUNCTION update_invoice_payment()
RETURNS TRIGGER AS $
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE invoices SET
      amount_paid = amount_paid - OLD.amount,
      amount_due = amount_due + OLD.amount,
      status = CASE 
        WHEN amount_paid - OLD.amount <= 0 THEN 'sent'
        WHEN amount_paid - OLD.amount < total THEN 'partial'
        ELSE status
      END,
      paid_at = CASE WHEN amount_paid - OLD.amount < total THEN NULL ELSE paid_at END,
      updated_at = NOW()
    WHERE id = OLD.invoice_id;
    RETURN OLD;
  ELSE
    UPDATE invoices SET
      amount_paid = amount_paid + NEW.amount,
      amount_due = amount_due - NEW.amount,
      status = CASE 
        WHEN amount_paid + NEW.amount >= total THEN 'paid'
        WHEN amount_paid + NEW.amount > 0 THEN 'partial'
        ELSE status
      END,
      paid_at = CASE WHEN amount_paid + NEW.amount >= total THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = NEW.invoice_id;
    RETURN NEW;
  END IF;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_applications
AFTER INSERT OR DELETE ON payment_applications
FOR EACH ROW EXECUTE FUNCTION update_invoice_payment();

-- Update bill amount paid when payment applied
CREATE OR REPLACE FUNCTION update_bill_payment()
RETURNS TRIGGER AS $
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE bills SET
      amount_paid = amount_paid - OLD.amount,
      amount_due = amount_due + OLD.amount,
      status = CASE 
        WHEN amount_paid - OLD.amount <= 0 THEN 'open'
        WHEN amount_paid - OLD.amount < total THEN 'partial'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = OLD.bill_id;
    RETURN OLD;
  ELSE
    UPDATE bills SET
      amount_paid = amount_paid + NEW.amount,
      amount_due = amount_due - NEW.amount,
      status = CASE 
        WHEN amount_paid + NEW.amount >= total THEN 'paid'
        WHEN amount_paid + NEW.amount > 0 THEN 'partial'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.bill_id;
    RETURN NEW;
  END IF;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_payment_applications
AFTER INSERT OR DELETE ON bill_payment_applications
FOR EACH ROW EXECUTE FUNCTION update_bill_payment();

-- Validate journal entry balance
CREATE OR REPLACE FUNCTION validate_journal_entry()
RETURNS TRIGGER AS $
DECLARE
  v_total_debits DECIMAL(15,2);
  v_total_credits DECIMAL(15,2);
BEGIN
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debits, v_total_credits
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.id;
  
  IF v_total_debits != v_total_credits THEN
    RAISE EXCEPTION 'Journal entry must balance. Debits: %, Credits: %', v_total_debits, v_total_credits;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Updated at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DEFAULT CHART OF ACCOUNTS
-- ============================================

CREATE OR REPLACE FUNCTION seed_default_accounts(p_org_id UUID)
RETURNS VOID AS $
BEGIN
  -- Asset accounts
  INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
    (p_org_id, '1000', 'Cash on Hand', 'asset', 'cash', TRUE),
    (p_org_id, '1010', 'Checking Account', 'asset', 'bank', TRUE),
    (p_org_id, '1020', 'Savings Account', 'asset', 'bank', FALSE),
    (p_org_id, '1100', 'Accounts Receivable', 'asset', 'accounts_receivable', TRUE),
    (p_org_id, '1200', 'Inventory', 'asset', 'inventory', FALSE),
    (p_org_id, '1300', 'Prepaid Expenses', 'asset', 'other_asset', FALSE),
    (p_org_id, '1500', 'Furniture & Equipment', 'asset', 'fixed_asset', FALSE),
    (p_org_id, '1510', 'Accumulated Depreciation', 'asset', 'fixed_asset', FALSE);
  
  -- Liability accounts
  INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
    (p_org_id, '2000', 'Accounts Payable', 'liability', 'accounts_payable', TRUE),
    (p_org_id, '2100', 'Credit Card', 'liability', 'credit_card', FALSE),
    (p_org_id, '2200', 'Accrued Expenses', 'liability', 'other_liability', FALSE),
    (p_org_id, '2300', 'Sales Tax Payable', 'liability', 'other_liability', TRUE),
    (p_org_id, '2400', 'Payroll Liabilities', 'liability', 'other_liability', FALSE),
    (p_org_id, '2500', 'Unearned Revenue', 'liability', 'other_liability', FALSE),
    (p_org_id, '2700', 'Long-term Debt', 'liability', 'long_term_liability', FALSE);
  
  -- Equity accounts
  INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
    (p_org_id, '3000', 'Owner''s Equity', 'equity', 'owners_equity', TRUE),
    (p_org_id, '3100', 'Owner''s Draws', 'equity', 'owners_equity', FALSE),
    (p_org_id, '3200', 'Retained Earnings', 'equity', 'retained_earnings', TRUE);
  
  -- Income accounts
  INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
    (p_org_id, '4000', 'Sales Revenue', 'income', 'sales', TRUE),
    (p_org_id, '4100', 'Service Revenue', 'income', 'sales', FALSE),
    (p_org_id, '4200', 'Discounts Given', 'income', 'sales', FALSE),
    (p_org_id, '4900', 'Other Income', 'income', 'other_income', FALSE);
  
  -- Cost of Goods Sold
  INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
    (p_org_id, '5000', 'Cost of Goods Sold', 'expense', 'cost_of_goods_sold', TRUE),
    (p_org_id, '5100', 'Inventory Shrinkage', 'expense', 'cost_of_goods_sold', FALSE);
  
  -- Operating Expenses
  INSERT INTO accounts (organization_id, account_number, name, account_type, account_subtype, is_system_account) VALUES
    (p_org_id, '6000', 'Advertising & Marketing', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6100', 'Bank Fees', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6200', 'Depreciation Expense', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6300', 'Insurance', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6400', 'Interest Expense', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6500', 'Office Supplies', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6600', 'Payroll Expenses', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6700', 'Professional Fees', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6800', 'Rent Expense', 'expense', 'operating_expense', FALSE),
    (p_org_id, '6900', 'Utilities', 'expense', 'operating_expense', FALSE),
    (p_org_id, '7000', 'Travel & Entertainment', 'expense', 'operating_expense', FALSE),
    (p_org_id, '7100', 'Repairs & Maintenance', 'expense', 'operating_expense', FALSE),
    (p_org_id, '7900', 'Miscellaneous Expense', 'expense', 'other_expense', FALSE);
  
  -- Set up document sequences
  INSERT INTO document_sequences (organization_id, document_type, prefix, next_number, padding) VALUES
    (p_org_id, 'invoice', 'INV-', 1001, 4),
    (p_org_id, 'payment', 'PMT-', 1001, 4),
    (p_org_id, 'bill', 'BILL-', 1001, 4),
    (p_org_id, 'expense', 'EXP-', 1001, 4),
    (p_org_id, 'journal_entry', 'JE-', 1001, 4);
END;
$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (Multi-tenant)
-- ============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (requires app to set current_setting('app.current_org_id'))
CREATE POLICY accounts_org_isolation ON accounts
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY customers_org_isolation ON customers
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY vendors_org_isolation ON vendors
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY products_org_isolation ON products
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY invoices_org_isolation ON invoices
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY bills_org_isolation ON bills
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY payments_org_isolation ON payments
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY expenses_org_isolation ON expenses
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY journal_entries_org_isolation ON journal_entries
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY ledger_entries_org_isolation ON ledger_entries
  USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);