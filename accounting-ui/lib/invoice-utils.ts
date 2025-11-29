import type { Invoice } from '@/types';

export interface LineItemFormData {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface InvoiceFormData {
  customerId: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItemFormData[];
  notes?: string;
  discountAmount?: number;
  shippingAmount?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/**
 * Calculate invoice totals from line items
 */
export function calculateInvoiceTotals(
  lineItems: LineItemFormData[],
  discountAmount: number = 0,
  shippingAmount: number = 0
): InvoiceTotals {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);

  const taxAmount = lineItems.reduce((sum, item) => {
    const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    const tax = itemTotal * ((Number(item.taxRate) || 0) / 100);
    return sum + tax;
  }, 0);

  const total = subtotal + taxAmount + Number(shippingAmount) - Number(discountAmount);

  return {
    subtotal,
    taxAmount,
    total,
  };
}

/**
 * Transform invoice API data to form data
 */
export function transformInvoiceToFormData(invoice: Invoice): InvoiceFormData {
  return {
    customerId: invoice.customerId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    lineItems: invoice.lineItems?.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxAmount && item.amount
        ? (item.taxAmount / item.amount) * 100
        : 0,
    })) || [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
    notes: invoice.notes,
    discountAmount: 0,
    shippingAmount: 0,
  };
}

/**
 * Clean form data by removing NaN values and ensuring proper types
 */
export function cleanInvoiceFormData(data: InvoiceFormData): InvoiceFormData {
  return {
    ...data,
    discountAmount: isNaN(data.discountAmount!) ? 0 : (data.discountAmount || 0),
    shippingAmount: isNaN(data.shippingAmount!) ? 0 : (data.shippingAmount || 0),
    lineItems: data.lineItems.map(item => ({
      ...item,
      taxRate: isNaN(item.taxRate!) ? 0 : (item.taxRate || 0),
    })),
  };
}
