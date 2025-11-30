# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BigBooks is a QuickBooks-like accounting application with a Node.js/Express API backend and Next.js frontend. The system uses PostgreSQL for data persistence and follows a double-entry bookkeeping model.

## Architecture

### Backend (accounting-api)
- **Framework**: Express.js with Knex.js ORM
- **Database**: PostgreSQL with migrations in `accounting-api/migrations/`
- **Authentication**: JWT-based auth with bearer tokens
- **Structure**:
  - `src/routes/`: RESTful API endpoints (accounts, invoices, bills, payments, expenses, vendors, customers, products, journal entries, reports)
  - `src/middleware/`: Authentication, validation, error handling
  - `src/config/`: Database and Swagger configuration
  - `src/utils/`: Pagination, document numbering utilities
  - `__tests__/`: Jest test suites with setup in `__tests__/setup.js`

### Frontend (accounting-ui)
- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation
- **Structure**:
  - `app/(app)/`: Authenticated routes (accounts, bills, customers, dashboard, expenses, invoices, payments, reports, vendors)
  - `app/login/`: Public authentication route
  - `lib/api.ts`: Axios client with interceptors, API endpoint functions
  - `components/layout/`: Sidebar, Header
  - `components/ui/`: Reusable UI components

### Database Schema
Key entities defined in `migrations/20240101000000_create_initial_schema.js`:
- **Core Accounting**: `accounts` (chart of accounts with types: asset, liability, equity, income, expense), `ledger_entries`, `journal_entries`
- **AR/AP**: `invoices`, `invoice_line_items`, `payments`, `payment_applications`, `bills`, `bill_line_items`, `bill_payments`
- **Entities**: `customers`, `vendors`, `products`, `organizations`, `users`
- **System**: `document_sequences` for auto-numbering, `tax_rates`

The system maintains ledger integrity through triggers and uses PostgreSQL enums for status fields.

## Common Commands

The build system uses standardized `make` commands that work from both the root directory and subdirectories (`accounting-api/` or `accounting-ui/`).

### Quick Reference

Run `make` or `make help` from any directory to see available commands.

### Standard Commands (Work from root or subdirectories)

**Development**:
```bash
make dev            # Start development server(s) with auto-reload
                    # From root: starts both API & UI
                    # From subdirectory: starts that service only
                    # API: http://localhost:3000
                    # UI: http://localhost:3001
```

**Testing**:
```bash
make test           # Run tests
                    # From root: runs all tests
                    # From subdirectory: runs tests for that service
```

**Production**:
```bash
make build          # Build for production
make run            # Run production server(s)
```

**Maintenance**:
```bash
make install        # Install dependencies
make clean          # Remove node_modules and build artifacts
make stop           # Stop running server(s)
```

### Service-Specific Commands (From root only)

```bash
make dev-api        # Start API development server only
make dev-ui         # Start UI development server only
make test-api       # Run API tests only
make test-ui        # Run UI tests only
make clean-api      # Clean API artifacts only
make clean-ui       # Clean UI artifacts only
```

### Testing Details

**Run all tests**:
```bash
make test           # From root runs all tests
cd accounting-api && make test  # From subdirectory
```

**Run specific test file**:
```bash
cd accounting-api
npm test -- accounts.test.js
npm test -- __tests__/bills.test.js
```

**Run with watch mode**:
```bash
cd accounting-api
npm run test:watch
```

**Note**: Tests use `accounting_test` database and run with `--runInBand` for sequential execution. Test setup is in `__tests__/setup.js` which handles database cleanup between tests.

### Database Management

**From root or from accounting-api/**:
```bash
make db-setup       # Setup PostgreSQL via docker-compose
make db-migrate     # Run database migrations
make db-seed        # Seed database with sample data
make db-reset       # Reset database (drop, recreate, migrate, seed)
```

**Additional database commands** (from accounting-api/ only):
```bash
make db-shell       # Open PostgreSQL shell
npm run migrate:rollback  # Rollback last migration
```

**Development Seed Data**: The `make db-seed` command populates the database with comprehensive sample data:
- Organization: Demo Company
- Users: admin@example.com and demo@example.com (password: password123)
- 20 Chart of Accounts entries (assets, liabilities, equity, income, expenses)
- 4 customers, 3 vendors, 4 products/services
- 3 sample invoices (sent, partial, draft) and 2 bills (open, paid)
- Configured tax rates and document sequences

See `accounting-api/seeds/README.md` for complete details.

### Examples

```bash
# From project root - start everything
make dev

# From project root - start just the API
make dev-api

# From accounting-api/ - same as 'make dev-api' from root
cd accounting-api && make dev

# From accounting-ui/ - start just the UI
cd accounting-ui && make dev

# Clean everything and reinstall
make clean
make install

# Full database reset
make db-reset
```

## UI Development Notes

- **Port Configuration**: The UI runs on port **3001** (configured in `package.json` scripts), despite API typically being on 3000
- **API URL**: Set via `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:3000/v1`)
- **Route Groups**: Uses Next.js route groups - `(app)` folder contains authenticated routes
- **API Client**: Centralized in `lib/api.ts` with automatic token injection and 401 redirect handling
- **Auth Pattern**: Client-side token stored in localStorage, checked in layout useEffect

## API Development Notes

- **Authentication**: All routes except `/health` and `/auth/*` require JWT bearer token
- **Validation**: Uses `express-validator` with middleware in `src/middleware/validate.js`
- **Error Handling**: Centralized error handler in `src/middleware/errorHandler.js`
- **Swagger Docs**: Available at `/api-docs` when server is running
- **Database Access**: Use `db` from `src/config/database.js` (Knex instance)
- **Testing**: Tests assume migrations are already run by docker-compose; use `NODE_ENV=test` for test database

## Key Patterns

### Double-Entry Bookkeeping
All financial transactions create offsetting ledger entries. When modifying invoice, payment, bill, or expense routes, ensure proper ledger entries are created/updated.

### Document Numbering
Uses `document_sequences` table to auto-generate sequential numbers (INV-001, BILL-001, etc.). See `src/utils/documentNumber.js`.

### Status Transitions
- **Invoices**: draft → sent → viewed → partial/paid/overdue
- **Bills**: draft → open → partial/paid
- **Payments**: Track applied amounts via `payment_applications` or `bill_payment_applications` junction tables

### API Response Pagination
Use `paginate` utility from `src/utils/pagination.js` for list endpoints. Returns `{ data: [], pagination: { total, page, limit, pages } }`.
