# Vendor Payments Feature Documentation

## Overview
This feature allows making vendor payments that can cover multiple bills from the same vendor, including both open and partially paid bills.

## Features Implemented

### Backend API

#### New Endpoints (`/v1/vendor-payments`)
- **POST /v1/vendor-payments** - Create a payment covering one or more bills
- **GET /v1/vendor-payments** - List all vendor payments with filtering
- **GET /v1/vendor-payments/:id** - Get payment details with applied bills
- **PUT /v1/vendor-payments/:id** - Update a payment
- **DELETE /v1/vendor-payments/:id** - Void a payment

#### Enhanced Bills Endpoint
- **GET /v1/bills** - Now supports:
  - Multiple status filtering: `?status=open,partial`
  - Unpaid only filter: `?unpaidOnly=true`

#### Database Changes
- Added `payment_number` field to `bill_payments` table
- Unique constraint on `(organization_id, payment_number)`
- Auto-generated sequential payment numbers (0001, 0002, etc.)

### Frontend UI

#### New Pages
- `/vendor-payments` - List of all vendor payments
- `/vendor-payments/new` - Create new payment with multi-bill selection

#### Navigation
- Added "Pay Bills" menu item in sidebar with Banknote icon

#### Key Features
- Select vendor to see their open and partially paid bills
- Add multiple bills to a single payment
- Automatic total calculation
- Bill selection with duplicate prevention
- Clear visual indicators for partial bills
- Shows both amount due and total amount for context

## Technical Details

### Double-Entry Accounting
Each vendor payment creates proper ledger entries:
```
Debit:  Accounts Payable (reduces liability)
Credit: Bank Account (reduces cash)
```

### Bill Status Updates
Bills automatically update based on payment:
- `open` → `partial` (when partially paid)
- `partial` → `partial` (additional partial payment)
- `open` or `partial` → `paid` (when fully paid)

### Multi-Bill Payment Flow
1. User selects vendor
2. System loads all unpaid bills (open + partial status, amount_due > 0)
3. User selects bills and amounts to apply
4. Total payment amount calculated automatically
5. Single payment record created with multiple bill applications
6. All affected bills updated atomically in a transaction

## Usage Examples

### Example 1: Single Bill - Full Payment
```bash
POST /v1/vendor-payments
{
  "vendorId": "...",
  "amount": 500,
  "paymentDate": "2024-12-02",
  "paymentMethod": "bank_transfer",
  "paymentAccountId": "...",
  "billsApplied": [
    {"billId": "...", "amount": 500}
  ]
}
```

### Example 2: Multiple Bills in One Payment
```bash
POST /v1/vendor-payments
{
  "vendorId": "...",
  "amount": 1200,
  "paymentDate": "2024-12-02",
  "paymentMethod": "check",
  "referenceNumber": "CHK-1234",
  "paymentAccountId": "...",
  "billsApplied": [
    {"billId": "bill1-id", "amount": 400},
    {"billId": "bill2-id", "amount": 800}
  ]
}
```

### Example 3: Paying Partial Bills
```bash
# First partial payment
POST /v1/vendor-payments
{
  "vendorId": "...",
  "amount": 300,
  "billsApplied": [{"billId": "...", "amount": 300}]
}
# Bill status: open → partial, amount_due: 1000 → 700

# Complete the payment
POST /v1/vendor-payments
{
  "vendorId": "...",
  "amount": 700,
  "billsApplied": [{"billId": "...", "amount": 700}]
}
# Bill status: partial → paid, amount_due: 700 → 0
```

## Testing

All features have been comprehensively tested:

✅ **Single bill - full payment**
- Bill status updates correctly to 'paid'
- Amount due becomes 0

✅ **Single bill - multiple partial payments**
- First payment: status → 'partial', amount_due decreases
- Final payment: status → 'paid', amount_due → 0

✅ **Multiple bills - single payment**
- One payment can cover multiple bills
- Each bill updated independently
- Total must match sum of applied amounts

✅ **Mixed bills (open + partial)**
- Can select and pay both open and partial bills together
- Partial bills show remaining amount clearly
- All bills update correctly

## Files Modified

### Backend
- `accounting-api/src/routes/vendorPayments.js` (new)
- `accounting-api/src/routes/bills.js` (enhanced)
- `accounting-api/src/index.js` (registered route)
- `accounting-api/migrations/20241202000000_add_payment_number_to_bill_payments.js` (new)

### Frontend
- `accounting-ui/lib/api.ts` (added vendorPaymentsApi)
- `accounting-ui/app/(app)/vendor-payments/page.tsx` (new)
- `accounting-ui/app/(app)/vendor-payments/new/page.tsx` (new)
- `accounting-ui/components/layout/Sidebar.tsx` (added menu item)

## API Reference

### Create Vendor Payment

**Endpoint:** `POST /v1/vendor-payments`

**Request Body:**
```typescript
{
  vendorId: string;          // Required
  amount: number;            // Required, total payment amount
  paymentDate: string;       // Required, ISO 8601 date
  paymentMethod: string;     // Required: cash|check|credit_card|debit_card|bank_transfer|other
  paymentAccountId: string;  // Required, bank/cash account
  referenceNumber?: string;  // Optional, check number or transaction ID
  memo?: string;             // Optional notes
  billsApplied?: Array<{
    billId: string;
    amount: number;
  }>;
}
```

**Response:**
```typescript
{
  id: string;
  paymentNumber: string;    // Auto-generated (0001, 0002, etc.)
  vendorId: string;
  vendorName: string;
  paymentDate: string;
  amount: { amount: number, currency: string };
  paymentMethod: string;
  referenceNumber?: string;
  paymentAccountId: string;
  memo?: string;
  createdAt: string;
  billsApplied: Array<{
    billId: string;
    billNumber: string;
    amount: { amount: number, currency: string };
  }>;
}
```

## Future Enhancements

Potential improvements:
- [ ] Print check functionality
- [ ] Batch payment import from CSV
- [ ] Payment approval workflow
- [ ] Recurring payments for regular bills
- [ ] Payment reminders based on due dates
- [ ] Vendor payment history report
- [ ] Export payments to accounting software
