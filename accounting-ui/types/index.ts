export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  role: string;
}

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  baseCurrency: string;
}

export interface Customer {
  id: string;
  displayName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  billingAddress?: string;
  shippingAddress?: string;
  balance?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Vendor {
  id: string;
  displayName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  billingAddress?: string;
  balance?: number;
  isActive: boolean;
  createdAt: string;
}

export interface CurrencyAmount {
  amount: number;
  currency: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customer?: {
    id: string;
    displayName: string;
    email: string;
  };
  arAccountId?: string;
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'voided';
  issueDate: string;
  dueDate: string;
  subtotal?: number | CurrencyAmount;
  taxAmount?: number | CurrencyAmount;
  discountAmount?: CurrencyAmount;
  shippingAmount?: CurrencyAmount;
  total: number | CurrencyAmount;
  amountPaid?: number | CurrencyAmount;
  amountDue: number | CurrencyAmount;
  currency?: string;
  lineItems?: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  sentAt?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLineItem {
  id?: string;
  productId?: string | null;
  productName?: string | null;
  description: string;
  quantity: number;
  unitPrice: number | CurrencyAmount;
  discountPercent?: number;
  taxAmount?: number | CurrencyAmount;
  amount: number | CurrencyAmount;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName?: string;
  paymentDate: string;
  amount: {
    amount: number;
    currency: string;
  };
  paymentMethod: string;
  referenceNumber?: string;
  memo?: string;
}

export interface DashboardStats {
  revenue: number;
  expenses: number;
  profit: number;
  outstandingInvoices: number;
  revenueChange: number;
  expensesChange: number;
  profitChange: number;
  invoicesChange: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName?: string;
  status: 'draft' | 'open' | 'partial' | 'paid' | 'overdue' | 'voided';
  billDate: string;
  dueDate: string;
  subtotal: number | CurrencyAmount;
  taxAmount: number | CurrencyAmount;
  total: number | CurrencyAmount;
  amountPaid: number | CurrencyAmount;
  amountDue: number | CurrencyAmount;
  currency?: string;
  lineItems?: BillLineItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillLineItem {
  id?: string;
  accountId?: string;
  accountName?: string;
  accountNumber?: string;
  description: string;
  quantity: number;
  unitPrice: number | CurrencyAmount;
  amount: number | CurrencyAmount;
  taxAmount?: number | CurrencyAmount;
  category?: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  vendorId: string;
  vendorName?: string;
  expenseDate: string;
  category: string;
  paymentMethod: string;
  amount: number;
  taxAmount: number;
  total: number;
  description: string;
  receiptUrl?: string;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'reimbursed' | 'rejected';
}

export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype?: string;
  accountNumber?: string;
  description?: string;
  parentAccountId?: string;
  currency: string;
  isActive: boolean;
  isSystemAccount: boolean;
  balance?: {
    amount: number;
    currency: string;
    debits: number;
    credits: number;
  };
  childAccounts?: {
    id: string;
    name: string;
    accountNumber?: string;
    isActive: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountTransaction {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: {
    amount: number;
    currency: string;
  };
  credit: {
    amount: number;
    currency: string;
  };
  balance?: {
    amount: number;
    currency: string;
  };
  sourceId?: string;
  sourceLineId?: string;
  customerId?: string;
  vendorId?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
