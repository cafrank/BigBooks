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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'voided';
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  lineItems?: InvoiceLineItem[];
  notes?: string;
}

export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxAmount?: number;
  productId?: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName?: string;
  paymentDate: string;
  amount: number;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
