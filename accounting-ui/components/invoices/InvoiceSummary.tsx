import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { InvoiceTotals } from '@/lib/invoice-utils';

interface InvoiceSummaryProps {
  totals: InvoiceTotals;
  shippingAmount: number;
  discountAmount: number;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function InvoiceSummary({
  totals,
  shippingAmount,
  discountAmount,
  loading,
  onSave,
  onCancel,
}: InvoiceSummaryProps) {
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Invoice Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
          </div>
          {shippingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">{formatCurrency(shippingAmount)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Button
            type="submit"
            className="w-full"
            isLoading={loading}
            onClick={onSave}
          >
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
