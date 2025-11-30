'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, DollarSign, Printer, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { billsApi, accountsApi } from '@/lib/api';
import type { Bill, Account } from '@/types';

const STATUS_COLORS = {
  draft: 'default',
  open: 'default',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
  voided: 'default',
};

function BillDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAccountId: '',
    paymentMethod: 'check',
    referenceNumber: '',
    memo: '',
  });

  useEffect(() => {
    if (params.id) {
      loadBill(params.id as string);
      loadAccounts();
    }

    // Check if payment modal should be shown
    if (searchParams.get('action') === 'pay') {
      setShowPaymentModal(true);
    }
  }, [params.id, searchParams]);

  const loadBill = async (id: string) => {
    try {
      const response = await billsApi.getById(id);
      setBill(response.data);
      // Set default payment amount to remaining balance
      setPaymentData(prev => ({
        ...prev,
        amount: response.data.amountDue || 0,
      }));
    } catch (error) {
      console.error('Failed to load bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      // Load asset accounts (for payment account selection)
      const response = await accountsApi.getAll({ type: 'asset', isActive: true });
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;

    setPaymentLoading(true);
    try {
      await billsApi.pay(bill.id, paymentData);
      setShowPaymentModal(false);
      // Reload bill to get updated data
      await loadBill(bill.id);
      alert('Payment recorded successfully!');
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Bill not found</p>
          <Button onClick={() => router.push('/bills')} className="mt-4">
            Back to Bills
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/bills')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Bill {bill.billNumber}
              </h1>
              <Badge variant={STATUS_COLORS[bill.status as keyof typeof STATUS_COLORS] as any}>
                {bill.status}
              </Badge>
            </div>
            <p className="text-gray-600">
              {bill.vendorName && (
                <>
                  From{' '}
                  <span
                    className="text-primary-600 cursor-pointer hover:underline"
                    onClick={() => router.push(`/vendors/${bill.vendorId}`)}
                  >
                    {bill.vendorName}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(bill.status === 'open' || bill.status === 'partial') && bill.amountDue > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(true)}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill Info */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Bill Date</div>
                  <div className="font-medium">{formatDate(bill.billDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Due Date</div>
                  <div className={`font-medium ${
                    bill.status === 'overdue' ? 'text-red-600' : ''
                  }`}>
                    {formatDate(bill.dueDate)}
                  </div>
                </div>
              </div>
              {bill.notes && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600">Notes</div>
                  <div className="text-sm mt-1">{bill.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              {bill.lineItems && bill.lineItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bill.lineItems.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {item.category || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No line items
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          {/* Amount Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Amount Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(bill.subtotal)}</span>
                </div>
                {bill.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatCurrency(bill.taxAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(bill.total)}
                    </span>
                  </div>
                </div>
                {bill.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount Paid</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(bill.amountPaid)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">Amount Due</span>
                        <span className="text-xl font-bold text-red-600">
                          {formatCurrency(bill.amountDue)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {bill.amountPaid > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  Total Paid: <span className="font-medium text-green-600">
                    {formatCurrency(bill.amountPaid)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePayment} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                  max={bill.amountDue}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {formatCurrency(bill.amountDue)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Account <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={paymentData.paymentAccountId}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentAccountId: e.target.value })}
                  required
                >
                  <option value="">Select account...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountNumber ? `${account.accountNumber} - ` : ''}{account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="ach">ACH</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <Input
                  type="text"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  placeholder="Check number, transaction ID, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Memo
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  value={paymentData.memo}
                  onChange={(e) => setPaymentData({ ...paymentData, memo: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={paymentLoading}
                >
                  {paymentLoading ? 'Recording...' : 'Record Payment'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    }>
      <BillDetailPageContent />
    </Suspense>
  );
}
