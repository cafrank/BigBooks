'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { invoicesApi, customersApi } from '@/lib/api';
import type { Customer } from '@/types';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.0001, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be 0 or greater'),
  taxRate: z.number().min(0).max(100).optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  discountAmount: z.number().min(0).optional(),
  shippingAmount: z.number().min(0).optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
      discountAmount: 0,
      shippingAmount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const watchLineItems = watch('lineItems');
  const watchDiscount = watch('discountAmount') || 0;
  const watchShipping = watch('shippingAmount') || 0;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      // Mock data
      setCustomers([
        { id: '1', displayName: 'Acme Corporation', email: 'billing@acme.com', isActive: true, createdAt: '2024-01-01' },
        { id: '2', displayName: 'Tech Solutions Inc', email: 'info@techsolutions.com', isActive: true, createdAt: '2024-01-01' },
      ]);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = watchLineItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);

    const taxAmount = watchLineItems.reduce((sum, item) => {
      const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      const tax = itemTotal * ((Number(item.taxRate) || 0) / 100);
      return sum + tax;
    }, 0);

    const total = subtotal + taxAmount + Number(watchShipping) - Number(watchDiscount);

    return {
      subtotal,
      taxAmount,
      total,
    };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      const response = await invoicesApi.create(data);
      router.push(`/invoices/${response.data.id}`);
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      alert(error.response?.data?.error || 'Failed to create invoice');
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
            onClick={() => router.push('/invoices')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
            <p className="text-gray-600">Create a new invoice for your customer</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/invoices')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            isLoading={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Create Invoice
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
                <CardTitle>Invoice Information</CardTitle>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    {...register('issueDate')}
                    type="date"
                    label="Issue Date *"
                    error={errors.issueDate?.message}
                  />
                  <Input
                    {...register('dueDate')}
                    type="date"
                    label="Due Date *"
                    error={errors.dueDate?.message}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Line Items</CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      append({ description: '', quantity: 1, unitPrice: 0, taxRate: 0 })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="space-y-4">
                        <Input
                          {...register(`lineItems.${index}.description`)}
                          label="Description *"
                          placeholder="Item description..."
                          error={errors.lineItems?.[index]?.description?.message}
                        />
                        <div className="grid gap-4 md:grid-cols-4">
                          <Input
                            {...register(`lineItems.${index}.quantity`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            label="Quantity *"
                            error={errors.lineItems?.[index]?.quantity?.message}
                          />
                          <Input
                            {...register(`lineItems.${index}.unitPrice`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            label="Unit Price *"
                            error={errors.lineItems?.[index]?.unitPrice?.message}
                          />
                          <Input
                            {...register(`lineItems.${index}.taxRate`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            label="Tax Rate (%)"
                            placeholder="0"
                          />
                          <div className="flex items-end">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount
                              </label>
                              <div className="flex h-10 items-center rounded-md border border-gray-300 bg-gray-50 px-3 text-sm font-medium">
                                {formatCurrency(
                                  (watchLineItems[index]?.quantity || 0) *
                                    (watchLineItems[index]?.unitPrice || 0)
                                )}
                              </div>
                            </div>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="ml-2"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.lineItems?.message && (
                  <p className="mt-2 text-sm text-red-600">{errors.lineItems.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    {...register('discountAmount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    label="Discount Amount"
                    placeholder="0.00"
                  />
                  <Input
                    {...register('shippingAmount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    label="Shipping Amount"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Thank you for your business..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Totals */}
          <div>
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
                  {watchShipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">{formatCurrency(watchShipping)}</span>
                    </div>
                  )}
                  {watchDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(watchDiscount)}</span>
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
                  >
                    Create Invoice
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/invoices')}
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
