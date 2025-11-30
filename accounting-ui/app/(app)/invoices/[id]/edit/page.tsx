'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LineItem } from '@/components/invoices/LineItem';
import { InvoiceSummary } from '@/components/invoices/InvoiceSummary';
import { useInvoiceData } from '@/hooks/useInvoiceData';
import { useInvoiceTotals } from '@/hooks/useInvoiceTotals';
import {
  cleanInvoiceFormData,
  transformInvoiceToFormData,
  type InvoiceFormData,
} from '@/lib/invoice-utils';
import { invoicesApi } from '@/lib/api';

const lineItemSchema = z.object({
  id: z.string().optional(),
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

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const [submitting, setSubmitting] = useState(false);

  const { invoice, customers, loading, error } = useInvoiceData(invoiceId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
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

  const totals = useInvoiceTotals(watchLineItems, watchDiscount, watchShipping);

  // Load invoice data into form when available
  useEffect(() => {
    if (invoice) {
      reset(transformInvoiceToFormData(invoice));
    }
  }, [invoice, reset]);

  const onSubmit = async (data: InvoiceFormData) => {
    setSubmitting(true);
    try {
      const cleanData = cleanInvoiceFormData(data);
      await invoicesApi.update(invoiceId, cleanData);
      router.push(`/invoices/${invoiceId}`);
    } catch (err: any) {
      console.error('Failed to update invoice:', err);
      alert(err.response?.data?.error || 'Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/invoices/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Invoice
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/invoices')}>
            Back to Invoices
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
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Invoice {invoice?.invoiceNumber}
            </h1>
            <p className="text-gray-600">Update invoice details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            isLoading={submitting}
          >
            {!submitting && <Save className="mr-2 h-4 w-4" />}
            Save Changes
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
                    <LineItem
                      key={field.id}
                      index={index}
                      register={register}
                      errors={errors}
                      quantity={watchLineItems[index]?.quantity || 0}
                      unitPrice={watchLineItems[index]?.unitPrice || 0}
                      canRemove={fields.length > 1}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </div>
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
            <InvoiceSummary
              totals={totals}
              shippingAmount={watchShipping}
              discountAmount={watchDiscount}
              loading={submitting}
              onSave={handleSubmit(onSubmit)}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
