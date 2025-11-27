# Accounting API

A comprehensive REST API for accounting operations similar to QuickBooks.
git 
## Features

- Multi-tenant organization support
- Double-entry bookkeeping
- Invoice and payment management
- Accounts payable and receivable
- Financial reporting (P&L, Balance Sheet, Cash Flow)
- Journal entries
- Customer and vendor management
- Product/service catalog

## Quick Start

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec api npm run migrate

# View logs
docker-compose logs -f api
```

### Manual Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials

# Run migrations
npm run migrate

# Start development server
npm run dev
```

## API Documentation

Interactive API documentation available at:
- http://localhost:3000/api-docs

## Running Tests

```bash
npm test
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT
