'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { vendorPaymentsApi, vendorsApi, billsApi, accountsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Vendor, Bill, Account } from '@/types';

const billApplicationSchema = z.object({
  billId: z.string().min(1, 'Bill is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
});

const vendorPaymentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paymentAccountId: z.string().min(1, 'Payment account is required'),
  referenceNumber: z.string().optional(),
  memo: z.string().optional(),
  billsApplied: z.array(billApplicationSchema).optional(),
});

type VendorPaymentFormData = z.infer<typeof vendorPaymentSchema>;

function NewVendorPaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<VendorPaymentFormData>({
    resolver: zodResolver(vendorPaymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      billsApplied: [],
    },
  });

  // Log errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form validation errors:', errors);
    }
  }, [errors]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'billsApplied',
  });

  const watchVendorId = watch('vendorId');
  const watchBillsApplied = watch('billsApplied');

  useEffect(() => {
    loadVendors();
    loadAccounts();

    // Pre-fill from query params if available
    const billId = searchParams.get('billId');
    const vendorId = searchParams.get('vendorId');

    if (vendorId) {
      setValue('vendorId', vendorId);
      setSelectedVendorId(vendorId);
    }

    if (billId) {
      loadBillAmount(billId);
    }
  }, []);

  useEffect(() => {
    if (watchVendorId) {
      setSelectedVendorId(watchVendorId);
      loadVendorBills(watchVendorId);
    }
  }, [watchVendorId]);

  useEffect(() => {
    // Calculate total amount from bills applied
    if (watchBillsApplied && watchBillsApplied.length > 0) {
      const total = watchBillsApplied.reduce((sum, bill) => sum + (bill.amount || 0), 0);
      setValue('amount', total);
    }
  }, [watchBillsApplied]);

  const loadVendors = async () => {
    try {
      const response = await vendorsApi.getAll();
      setVendors(response.data.data || []);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      // Load cash and bank accounts (asset accounts)
      const response = await accountsApi.getAll({ type: 'asset', isActive: true });
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadVendorBills = async (vendorId: string) => {
    try {
      // Fetch both open and partial bills (bills with amount due > 0)
      const response = await billsApi.getAll({ vendorId, status: 'open,partial' });
      const unpaidBills = (response.data.data || []).filter(
        (bill: Bill) => (typeof bill.amountDue === 'object' ? bill.amountDue.amount : bill.amountDue) > 0
      );
      setBills(unpaidBills);
    } catch (error) {
      console.error('Failed to load bills:', error);
    }
  };

  const loadBillAmount = async (billId: string) => {
    try {
      const response = await billsApi.getById(billId);
      const bill = response.data;
      const amountDue = typeof bill.amountDue === 'object' ? bill.amountDue.amount : bill.amountDue;
      setValue('amount', amountDue);
      append({ billId, amount: amountDue });
    } catch (error) {
      console.error('Failed to load bill:', error);
    }
  };

  const addBillApplication = () => {
    append({ billId: '', amount: 0 });
  };

  const getBillOptions = (currentBillId?: string) => {
    const usedBillIds = new Set(
      fields.map((f) => f.billId).filter((id) => id && id !== currentBillId)
    );
    return bills.filter((b) => !usedBillIds.has(b.id));
  };

  const onBillSelect = (index: number, billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      const amountDue = typeof bill.amountDue === 'object' ? bill.amountDue.amount : bill.amountDue;
      setValue(`billsApplied.${index}.amount`, amountDue);
    }
  };

  const onSubmit = async (data: VendorPaymentFormData) => {
    console.log('Form submitted with data:', data);
    setLoading(true);
    try {
      await vendorPaymentsApi.create(data);
      router.push('/vendor-payments');
    } catch (error: any) {
      console.error('Failed to create vendor payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    handleSubmit(
      onSubmit,
      (errors) => {
        console.log('Validation failed:', errors);
        // Show first error to user
        const firstError = Object.values(errors)[0];
        if (firstError) {
          alert(firstError.message || 'Please fix the form errors before submitting');
        }
      }
    )();
  };

  const totalAmount = watchBillsApplied?.reduce((sum, bill) => sum + (bill.amount || 0), 0) || 0;

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
            <h1 className="text-2xl font-bold text-gray-900">Pay Bills</h1>
            <p className="text-gray-600">Make a vendor payment to cover one or more bills</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/bills')}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleFormSubmit}
            isLoading={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Record Payment
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
                  {...register('vendorId')}
                  label="Vendor *"
                  error={errors.vendorId?.message}
                  options={[
                    { value: '', label: 'Select a vendor' },
                    ...vendors.map((v) => ({ value: v.id, label: v.displayName })),
                  ]}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                )}

                <Input
                  {...register('paymentDate')}
                  type="date"
                  label="Payment Date *"
                  error={errors.paymentDate?.message}
                />

                <Select
                  {...register('paymentAccountId')}
                  label="Payment Account *"
                  error={errors.paymentAccountId?.message}
                  options={[
                    { value: '', label: 'Select a cash/bank account' },
                    ...accounts.map((a) => ({
                      value: a.id,
                      label: a.accountNumber ? `${a.accountNumber} - ${a.name}` : a.name,
                    })),
                  ]}
                />

                <Select
                  {...register('paymentMethod')}
                  label="Payment Method *"
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
                  label="Reference/Check Number"
                  placeholder="Check #, Transaction ID, etc."
                />
              </CardContent>
            </Card>

            {/* Bills to Pay */}
            {selectedVendorId && bills.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Bills to Pay</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addBillApplication}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Bill
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.length === 0 && (
                    <p className="text-sm text-gray-600">
                      Click "Add Bill" to select bills to pay
                    </p>
                  )}

                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Select
                          {...register(`billsApplied.${index}.billId`)}
                          label={index === 0 ? 'Bill' : ''}
                          error={errors.billsApplied?.[index]?.billId?.message}
                          options={[
                            { value: '', label: 'Select a bill' },
                            ...getBillOptions(field.billId).map((bill) => {
                              const amountDue = typeof bill.amountDue === 'object' ? bill.amountDue.amount : bill.amountDue;
                              const total = typeof bill.total === 'object' ? bill.total.amount : bill.total;
                              const statusLabel = bill.status === 'partial' ? ' (Partial)' : '';
                              return {
                                value: bill.id,
                                label: `${bill.billNumber}${statusLabel} - ${formatCurrency(amountDue, 'USD')} due of ${formatCurrency(total, 'USD')}`,
                              };
                            }),
                          ]}
                          onChange={(e) => onBillSelect(index, e.target.value)}
                        />
                      </div>
                      <div className="w-40">
                        <Input
                          {...register(`billsApplied.${index}.amount`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          label={index === 0 ? 'Amount' : ''}
                          placeholder="0.00"
                          error={errors.billsApplied?.[index]?.amount?.message}
                        />
                      </div>
                      <div className={index === 0 ? 'mt-7' : ''}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {fields.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total Payment Amount:</span>
                        <span className="text-lg">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent>
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
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bills Selected:</span>
                    <span className="font-medium">{fields.length}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-semibold text-lg">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    isLoading={loading}
                    disabled={fields.length === 0}
                  >
                    Record Payment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/bills')}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help Text */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>
                  • Select a vendor to see their open bills
                </p>
                <p>
                  • You can pay multiple bills with a single payment
                </p>
                <p>
                  • The total payment amount is calculated automatically
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewVendorPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    }>
      <NewVendorPaymentPageContent />
    </Suspense>
  );
}
