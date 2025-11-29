import { useMemo } from 'react';
import { calculateInvoiceTotals, type LineItemFormData } from '@/lib/invoice-utils';

export function useInvoiceTotals(
  lineItems: LineItemFormData[],
  discountAmount: number = 0,
  shippingAmount: number = 0
) {
  return useMemo(
    () => calculateInvoiceTotals(lineItems, discountAmount, shippingAmount),
    [lineItems, discountAmount, shippingAmount]
  );
}
