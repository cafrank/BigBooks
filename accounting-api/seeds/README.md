# Database Seeds

This directory contains seed files for populating the database with sample data.

## Development Seed

The `01_development_data.js` file creates a complete set of sample data for development and testing purposes.

### What's Included

- **Organization**: Demo Company with full profile
- **Users**: 2 users (admin and demo user)
- **Chart of Accounts**: 20 accounts covering all account types
  - Assets (Cash, Checking, AR, Inventory, Equipment)
  - Liabilities (AP, Credit Card, Loans)
  - Equity (Owner's Equity, Retained Earnings)
  - Income (Sales, Services, Other Income)
  - Expenses (COGS, Rent, Utilities, Supplies, etc.)
- **Tax Rates**: 2 tax rates (Sales Tax 8.5%, VAT 10%)
- **Customers**: 4 customers with varying payment terms
- **Vendors**: 3 vendors
- **Products/Services**: 4 items (services and products)
- **Invoices**: 3 invoices in different statuses (sent, partial, draft)
- **Bills**: 2 bills (one open, one paid)
- **Document Sequences**: Configured for auto-numbering

### Login Credentials

After seeding, you can login with either:

**Admin User:**
- Email: `admin@example.com`
- Password: `password123`

**Demo User:**
- Email: `demo@example.com`
- Password: `password123`

### Running the Seed

From the root directory:
```bash
make db-seed
```

From the `accounting-api` directory:
```bash
npm run seed
# or
make db-seed
# or
npx knex seed:run
```

### Resetting the Database

To completely reset the database with fresh seed data:

From the root directory:
```bash
make db-reset
```

From the `accounting-api` directory:
```bash
make db-reset
```

This will:
1. Drop and recreate the database
2. Run all migrations
3. Run the seed files

### Sample Data Details

#### Invoices
1. **INV-1001** - Sent invoice for $5,425.00 (Acme Corporation)
   - Web Development Services - 40 hours @ $125/hr
   - Status: Sent, unpaid

2. **INV-1002** - Partially paid invoice for $3,255.00 (Tech Solutions Inc)
   - Consulting Services - 20 hours @ $150/hr
   - Status: Partial payment of $1,500

3. **INV-1003** - Draft invoice for $8,137.50 (Global Enterprises)
   - Software License - 5 licenses @ $999 each
   - Training Workshop - $2,500
   - Status: Draft (not yet sent)

#### Bills
1. **BILL-001** - Open bill for $450.00 (Office Depot)
   - Office supplies order
   - Status: Open, unpaid

2. **BILL-002** - Paid bill for $299.00 (CloudHost Services)
   - Monthly hosting fee
   - Status: Paid

### Custom Seeds

To create additional seed files:

1. Create a new file in this directory with a number prefix (e.g., `02_my_custom_data.js`)
2. Export a `seed` function that takes `knex` as parameter
3. Implement your seeding logic

Example:
```javascript
exports.seed = async function(knex) {
  // Your seeding logic here
  await knex('table_name').insert([
    { column: 'value' }
  ]);
};
```

Seed files run in alphabetical order by filename.
