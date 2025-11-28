#!/usr/bin/env node

/**
 * Debug helper for Bills API
 *
 * Usage:
 *   node debug-bills.js list
 *   node debug-bills.js create
 *   node debug-bills.js get <billId>
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/v1';
let TOKEN = process.env.API_TOKEN || '';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  if (TOKEN) config.headers.Authorization = `Bearer ${TOKEN}`;
  return config;
});

async function login() {
  try {
    const res = await api.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    TOKEN = res.data.token;
    api.defaults.headers.Authorization = `Bearer ${TOKEN}`;
    console.log('✓ Logged in successfully');
    return TOKEN;
  } catch (err) {
    console.error('✗ Login failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

async function listBills() {
  try {
    const res = await api.get('/bills');
    console.log('\n📋 Bills List:');
    console.log(JSON.stringify(res.data, null, 2));
    console.log(`\nTotal: ${res.data.pagination?.total || 0} bills`);
  } catch (err) {
    console.error('✗ Error:', err.response?.data || err.message);
  }
}

async function getBill(id) {
  try {
    const res = await api.get(`/bills/${id}`);
    console.log('\n📄 Bill Details:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('✗ Error:', err.response?.data || err.message);
  }
}

async function createBill(vendorId, accountId) {
  try {
    const billData = {
      vendorId: vendorId,
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lineItems: [
        {
          accountId: accountId,
          description: 'Debug test item',
          amount: 100.00,
          quantity: 1
        }
      ],
      memo: 'Created via debug script'
    };

    console.log('\n📝 Creating bill with data:');
    console.log(JSON.stringify(billData, null, 2));

    const res = await api.post('/bills', billData);
    console.log('\n✓ Bill created successfully:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('\n✗ Error creating bill:');
    console.error(err.response?.data || err.message);
  }
}

async function getVendors() {
  try {
    const res = await api.get('/vendors');
    console.log('\n👥 Available Vendors:');
    res.data.data?.forEach(v => {
      console.log(`  - ${v.displayName} (${v.id})`);
    });
    return res.data.data;
  } catch (err) {
    console.error('✗ Error fetching vendors:', err.response?.data || err.message);
    return [];
  }
}

async function getAccounts() {
  try {
    const res = await api.get('/accounts');
    console.log('\n💰 Available Accounts (expense type):');
    const expenseAccounts = res.data.data?.filter(a => a.accountType === 'expense') || [];
    expenseAccounts.slice(0, 5).forEach(a => {
      console.log(`  - ${a.name} (${a.id})`);
    });
    return expenseAccounts;
  } catch (err) {
    console.error('✗ Error fetching accounts:', err.response?.data || err.message);
    return [];
  }
}

async function main() {
  const command = process.argv[2];

  console.log('🔧 Bills API Debugger\n');

  if (!TOKEN) {
    await login();
  }

  switch (command) {
    case 'list':
      await listBills();
      break;

    case 'get':
      const billId = process.argv[3];
      if (!billId) {
        console.error('Usage: node debug-bills.js get <billId>');
        process.exit(1);
      }
      await getBill(billId);
      break;

    case 'create':
      const vendors = await getVendors();
      const accounts = await getAccounts();

      if (vendors.length === 0 || accounts.length === 0) {
        console.error('\n✗ Need at least one vendor and one expense account');
        process.exit(1);
      }

      console.log(`\nUsing vendor: ${vendors[0].displayName}`);
      console.log(`Using account: ${accounts[0].name}`);

      await createBill(vendors[0].id, accounts[0].id);
      break;

    case 'vendors':
      await getVendors();
      break;

    case 'accounts':
      await getAccounts();
      break;

    default:
      console.log('Usage:');
      console.log('  node debug-bills.js list           - List all bills');
      console.log('  node debug-bills.js get <id>       - Get bill details');
      console.log('  node debug-bills.js create         - Create test bill');
      console.log('  node debug-bills.js vendors        - List vendors');
      console.log('  node debug-bills.js accounts       - List expense accounts');
      console.log('\nEnvironment variables:');
      console.log('  API_URL    - API base URL (default: http://localhost:3000/v1)');
      console.log('  API_TOKEN  - Auth token (will login if not provided)');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
