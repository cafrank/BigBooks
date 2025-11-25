# BigBooks - Accounting UI

A modern, responsive accounting frontend built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Dashboard**: Overview of key financial metrics and recent activity
- **Invoices**: Create, view, and manage invoices with status tracking
- **Customers**: Manage customer relationships and track balances
- **Payments**: Record and track payments received
- **Vendors**: Manage vendor relationships (coming soon)
- **Reports**: Financial reports including P&L, Balance Sheet, and Cash Flow

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Data Tables**: TanStack Table
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Running accounting-api backend on port 3000

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Edit .env.local and set your API URL
# NEXT_PUBLIC_API_URL=http://localhost:3000/v1

# Run development server
npm run dev
```

The application will be available at http://localhost:3001

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
accounting-ui/
├── app/                    # Next.js app directory
│   ├── (app)/             # Authenticated routes
│   │   ├── dashboard/     # Dashboard page
│   │   ├── invoices/      # Invoices module
│   │   ├── customers/     # Customers module
│   │   ├── payments/      # Payments module
│   │   ├── vendors/       # Vendors module
│   │   ├── reports/       # Reports module
│   │   └── layout.tsx     # Authenticated layout
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Root page (redirects)
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── layout/           # Layout components
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── ui/               # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       └── Table.tsx
├── lib/                  # Utilities
│   ├── api.ts           # API client and endpoints
│   └── utils.ts         # Helper functions
├── types/               # TypeScript types
│   └── index.ts
└── hooks/               # Custom React hooks

```

## API Integration

The UI connects to the accounting-api backend. Make sure the backend is running on port 3000 before starting the UI.

### Authentication

The app uses JWT token authentication. Tokens are stored in localStorage and automatically included in API requests.

### API Endpoints Used

- `POST /v1/auth/login` - User authentication
- `GET /v1/invoices` - List invoices
- `GET /v1/customers` - List customers
- `GET /v1/payments` - List payments
- `GET /v1/reports/profit-loss` - P&L report
- `GET /v1/reports/balance-sheet` - Balance sheet
- `GET /v1/reports/cash-flow` - Cash flow statement

## Development

### Adding a New Page

1. Create a new directory in `app/(app)/`
2. Add a `page.tsx` file
3. The route will be automatically available at `/your-route`

### Creating Components

Reusable UI components go in `components/ui/`
Feature-specific components go in `components/[feature]/`

### Styling

This project uses Tailwind CSS. Custom styles can be added to `app/globals.css`

## Features Roadmap

- [ ] Create/Edit invoice functionality
- [ ] Customer creation and editing
- [ ] Payment recording
- [ ] PDF invoice generation
- [ ] Email invoice sending
- [ ] Advanced filtering and search
- [ ] Export to Excel/CSV
- [ ] Dark mode support
- [ ] Multi-currency support
- [ ] Role-based permissions UI

## License

MIT
