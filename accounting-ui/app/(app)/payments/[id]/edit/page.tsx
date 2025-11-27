'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { paymentsApi, customersApi, invoicesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Customer, Invoice } from '@/types';

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceId: z.string().optional(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  referenceNumber: z.string().optional(),
  memo: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function EditPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'bank_transfer',
    },
  });

  const watchCustomerId = watch('customerId');
  const watchInvoiceId = watch('invoiceId');

  useEffect(() => {
    loadCustomers();
    loadPayment();
  }, [paymentId]);

  useEffect(() => {
    if (watchCustomerId) {
      setSelectedCustomerId(watchCustomerId);
      loadCustomerInvoices(watchCustomerId);
    }
  }, [watchCustomerId]);

  useEffect(() => {
    if (watchInvoiceId) {
      loadInvoiceAmount(watchInvoiceId);
    }
  }, [watchInvoiceId]);

  const loadPayment = async () => {
    setLoadingData(true);
    try {
      const response = await paymentsApi.getById(paymentId);
      const payment = response.data;

      reset({
        customerId: payment.customerId,
        paymentDate: payment.paymentDate,
        amount: payment.amount.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber || '',
        memo: payment.memo || '',
        invoiceId: payment.invoicesApplied?.[0]?.invoiceId || '',
      });

      setSelectedCustomerId(payment.customerId);
    } catch (error) {
      console.error('Failed to load payment:', error);
      alert('Failed to load payment');
      router.push('/payments');
    } finally {
      setLoadingData(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([
        { id: '1', displayName: 'Acme Corporation', email: 'billing@acme.com', isActive: true, createdAt: '2024-01-01' },
        { id: '2', displayName: 'Tech Solutions Inc', email: 'info@techsolutions.com', isActive: true, createdAt: '2024-01-01' },
      ]);
    }
  };

  const loadCustomerInvoices = async (customerId: string) => {
    try {
      const response = await invoicesApi.getAll({ customerId });
      const unpaidInvoices = (response.data.data || []).filter(
        (inv: Invoice) => inv.amountDue > 0
      );
      setInvoices(unpaidInvoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      setInvoices([
        {
          id: '1',
          invoiceNumber: 'INV-1001',
          customerId,
          customerName: 'Acme Corporation',
          status: 'sent',
          issueDate: '2024-01-15',
          dueDate: '2024-02-15',
          subtotal: 5000,
          taxAmount: 400,
          total: 5400,
          amountPaid: 0,
          amountDue: 5400,
          currency: 'USD',
        },
      ]);
    }
  };

  const loadInvoiceAmount = async (invoiceId: string) => {
    try {
      const response = await invoicesApi.getById(invoiceId);
      const invoice = response.data;
      setValue('amount', invoice.amountDue);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    setLoading(true);
    try {
      const updateData = {
        ...data,
        invoicesApplied: data.invoiceId ? [{ invoiceId: data.invoiceId, amount: data.amount }] : []
      };
      await paymentsApi.update(paymentId, updateData);
      router.push('/payments');
    } catch (error: any) {
      console.error('Failed to update payment:', error);
      alert(error.response?.data?.error || 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
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
            onClick={() => router.push('/payments')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Payment</h1>
            <p className="text-gray-600">Update payment details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/payments')}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSubmit(onSubmit)}
            isLoading={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Update Payment
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  {...register('customerId')}
                  label="Customer *"
                  error={errors.customerId?.message}
                  options={[
                    { value: '', label: 'Select a customer' },
                    ...customers.map((c) => ({ value: c.id, label: c.displayName })),
                  ]}
                />

                {selectedCustomerId && invoices.length > 0 && (
                  <Select
                    {...register('invoiceId')}
                    label="Invoice (Optional)"
                    options={[
                      { value: '', label: 'General payment (not linked to invoice)' },
                      ...invoices.map((inv) => ({
                        value: inv.id,
                        label: `${inv.invoiceNumber} - ${formatCurrency(inv.amountDue)} due`,
                      })),
                    ]}
                  />
                )}

                <Input
                  {...register('paymentDate')}
                  type="date"
                  label="Payment Date *"
                  error={errors.paymentDate?.message}
                />

                <Input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  label="Amount *"
                  placeholder="0.00"
                  error={errors.amount?.message}
                />
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  {...register('paymentMethod')}
                  label="Method *"
                  error={errors.paymentMethod?.message}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'check', label: 'Check' },
                    { value: 'credit_card', label: 'Credit Card' },
                    { value: 'debit_card', label: 'Debit Card' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'other', label: 'Other' },
                  ]}
                />

                <Input
                  {...register('referenceNumber')}
                  label="Reference/Transaction Number"
                  placeholder="Check #, Transaction ID, etc."
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Memo
                  </label>
                  <textarea
                    {...register('memo')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Additional notes about this payment..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  isLoading={loading}
                >
                  Update Payment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/payments')}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>

            {/* Help Text */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>
                  • Link to an invoice to automatically update its payment status
                </p>
                <p>
                  • Or record a general payment without linking to an invoice
                </p>
                <p>
                  • The reference number helps track the payment in your bank account
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
