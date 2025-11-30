'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { expensesApi, vendorsApi } from '@/lib/api';
import type { Vendor } from '@/types';

const expenseSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  category: z.string().min(1, 'Category is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  taxAmount: z.number().min(0).optional(),
  description: z.string().min(1, 'Description is required'),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Equipment',
  'Software & Subscriptions',
  'Travel',
  'Meals & Entertainment',
  'Utilities',
  'Rent',
  'Professional Services',
  'Marketing & Advertising',
  'Insurance',
  'Taxes & Licenses',
  'Other',
];

const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'PayPal',
  'Other',
];

function NewExpensePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
      taxAmount: 0,
    },
  });

  const watchAmount = watch('amount') || 0;
  const watchTaxAmount = watch('taxAmount') || 0;
  const total = Number(watchAmount) + Number(watchTaxAmount);

  useEffect(() => {
    loadVendors();

    // Pre-fill vendor from query params if available
    const vendorId = searchParams.get('vendorId');
    if (vendorId) {
      setValue('vendorId', vendorId);
    }
  }, []);

  const loadVendors = async () => {
    try {
      const response = await vendorsApi.getAll();
      setVendors(response.data.data || []);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      // Mock data
      setVendors([
        { id: '1', displayName: 'Office Supplies Co', email: 'sales@officesupplies.com', isActive: true, createdAt: '2024-01-01' },
        { id: '2', displayName: 'Tech Equipment Inc', email: 'info@techequipment.com', isActive: true, createdAt: '2024-01-01' },
      ]);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const response = await expensesApi.create(data);
      router.push(`/expenses/${response.data.id}`);
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      alert(error.response?.data?.error || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/vendors')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Record Expense</h1>
            <p className="text-gray-600">Record a new expense transaction</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/vendors')}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSubmit(onSubmit)}
            isLoading={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  {...register('vendorId')}
                  label="Vendor *"
                  error={errors.vendorId?.message}
                  options={[
                    { value: '', label: 'Select a vendor' },
                    ...vendors.map((v) => ({ value: v.id, label: v.displayName })),
                  ]}
                />
                <Input
                  {...register('expenseDate')}
                  type="date"
                  label="Expense Date *"
                  error={errors.expenseDate?.message}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    {...register('category')}
                    label="Category *"
                    error={errors.category?.message}
                    options={[
                      { value: '', label: 'Select a category' },
                      ...EXPENSE_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
                    ]}
                  />
                  <Select
                    {...register('paymentMethod')}
                    label="Payment Method *"
                    error={errors.paymentMethod?.message}
                    options={[
                      { value: '', label: 'Select payment method' },
                      ...PAYMENT_METHODS.map((method) => ({ value: method, label: method })),
                    ]}
                  />
                </div>
                <Input
                  {...register('description')}
                  label="Description *"
                  placeholder="Brief description of the expense..."
                  error={errors.description?.message}
                />
              </CardContent>
            </Card>

            {/* Amount Details */}
            <Card>
              <CardHeader>
                <CardTitle>Amount Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    {...register('amount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    label="Amount *"
                    placeholder="0.00"
                    error={errors.amount?.message}
                  />
                  <Input
                    {...register('taxAmount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    label="Tax Amount"
                    placeholder="0.00"
                    error={errors.taxAmount?.message}
                  />
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Amount</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  {...register('receiptUrl')}
                  type="url"
                  label="Receipt URL"
                  placeholder="https://example.com/receipt.pdf"
                  error={errors.receiptUrl?.message}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Additional notes about this expense..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Summary */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Expense Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-medium">{formatCurrency(watchAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatCurrency(watchTaxAmount)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    isLoading={loading}
                  >
                    Record Expense
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/vendors')}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    }>
      <NewExpensePageContent />
    </Suspense>
  );
}
