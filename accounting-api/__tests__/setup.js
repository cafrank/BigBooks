// --- __tests__/setup.js (UPDATED with better error handling) ---
require('dotenv').config({ path: '.env.test' });

const db = require('../src/config/database');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = 'accounting_test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console output during tests (optional)
global.console = {
  ...console,
  log: jest.fn(), // Suppress logs
  debug: jest.fn(),
  info: jest.fn(),
  // Keep errors and warnings
  // warn: console.warn,
  // error: console.error,
};

let migrationRan = false;

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('✓ ============================================================\n');
  if (migrationRan) return;

  try {
    console.log('\n🔧 Testing database connection...');

    // Test connection
    await db.raw('SELECT 1');
    console.log('✓ Database connection successful:', process.env.DB_NAME);
    console.log('✓ Migrations already run by docker-compose');
    console.log('✓ ============================================================\n');

    migrationRan = true;
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  try {
    console.log('\n🧹 Closing database connections...');
    await db.destroy();
    console.log('✓ Database connections closed\n');
  } catch (error) {
    console.error('❌ Teardown error:', error.message);
  }
});

// Clean database before each test
beforeEach(async () => {
  // Only clean if migrations have run
  if (!migrationRan) return;

  try {
    // Disable foreign key checks temporarily
    await db.raw('SET session_replication_role = replica;');

    // Truncate tables
    const tables = [
      'payment_applications',
      'payments',
      'bill_payment_applications',
      'bill_payments',
      'bill_line_items',
      'bills',
      'invoice_line_items',
      'invoices',
      'expenses',
      'journal_entry_lines',
      'journal_entries',
      'ledger_entries',
      'customer_contacts',
      'customer_addresses',
      'customers',
      'vendor_addresses',
      'vendors',
      'products',
      'tax_rate_components',
      'tax_rates',
      'document_sequences',
      'organization_users',
      'users',
      'organizations'
    ];

    for (const table of tables) {
      try {
        await db(table).del();
      } catch (err) {
        // Ignore errors for tables that might not exist
        if (!err.message.includes('does not exist')) {
          console.warn(`Warning: Could not clean table ${table}:`, err.message);
        }
      }
    }

    // Delete non-system accounts
    try {
      await db('accounts').where('is_system_account', false).del();
    } catch (err) {
      if (!err.message.includes('does not exist')) {
        console.warn('Warning: Could not clean accounts:', err.message);
      }
    }

    // Re-enable foreign key checks
    await db.raw('SET session_replication_role = DEFAULT;');
  } catch (error) {
    // Don't throw on cleanup errors to allow tests to continue
    console.warn('⚠️  Cleanup warning:', error.message);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
