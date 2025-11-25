# Quick Start Guide

## Prerequisites

1. **Backend API Running**: Ensure the accounting-api is running on port 3000
2. **Node.js**: Version 18 or higher

## Installation & Setup

```bash
# Navigate to the UI directory
cd accounting-ui

# Install dependencies (already done)
npm install

# Start the development server
npm run dev
```

The application will be available at: **http://localhost:3001**

## Default Login (for testing)

Since this is a new setup, you'll need to create a user in your backend first. Use the backend's registration endpoint:

```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "organizationName": "My Company"
  }'
```

Then login with:
- Email: `admin@example.com`
- Password: `password123`

## Available Pages

After logging in, you'll have access to:

- **Dashboard** (`/dashboard`) - Overview of financial metrics
- **Invoices** (`/invoices`) - Invoice management
- **Customers** (`/customers`) - Customer management
- **Payments** (`/payments`) - Payment tracking
- **Vendors** (`/vendors`) - Vendor management (placeholder)
- **Reports** (`/reports`) - Financial reports

## Project Structure

```
accounting-ui/
├── app/                    # Next.js pages
│   ├── (app)/             # Protected routes (requires auth)
│   │   ├── dashboard/
│   │   ├── invoices/
│   │   ├── customers/
│   │   ├── payments/
│   │   ├── vendors/
│   │   └── reports/
│   └── login/             # Public login page
├── components/
│   ├── layout/           # Sidebar, Header
│   └── ui/               # Reusable UI components
├── lib/
│   ├── api.ts           # API client & endpoints
│   └── utils.ts         # Utility functions
└── types/               # TypeScript definitions
```

## Development Tips

1. **Hot Reload**: Changes to files will automatically reload in the browser

2. **TypeScript**: The project uses TypeScript for type safety

3. **API Integration**: All API calls go through `lib/api.ts`

4. **Mock Data**: Currently uses mock data for demo purposes. Connect to real API by ensuring backend is running

5. **Styling**: Uses Tailwind CSS utility classes

## Building for Production

```bash
npm run build
npm start
```

## Common Issues

### "Cannot connect to API"
- Ensure accounting-api is running on port 3000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`

### "Build errors"
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### "Port 3001 already in use"
- Change port in package.json scripts: `-p 3002`

## Next Steps

1. **Connect to Real API**: Update API base URL in `.env.local`
2. **Add Invoice Creation**: Build form for creating new invoices
3. **Add Customer Forms**: Create/edit customer functionality
4. **Implement PDF Export**: Add invoice PDF generation
5. **Email Integration**: Send invoices via email

## Tech Stack

- Next.js 16 (React framework)
- TypeScript (type safety)
- Tailwind CSS (styling)
- React Hook Form + Zod (forms & validation)
- Axios (HTTP client)
- Lucide React (icons)

## Support

For issues or questions, refer to:
- Next.js docs: https://nextjs.org/docs
- Tailwind docs: https://tailwindcss.com/docs
- React Hook Form: https://react-hook-form.com
