'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { customersApi } from '@/lib/api';

const customerSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      isActive: true,
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    setLoading(true);
    try {
      const response = await customersApi.create(data);
      router.push(`/customers/${response.data.id}`);
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      alert(error.response?.data?.error || 'Failed to create customer');
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
            onClick={() => router.push('/customers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Customer</h1>
            <p className="text-gray-600">Add a new customer to your account</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/customers')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            isLoading={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Create Customer
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  {...register('displayName')}
                  label="Display Name *"
                  placeholder="John Doe or Acme Corp"
                  error={errors.displayName?.message}
                />
                <Input
                  {...register('companyName')}
                  label="Company Name"
                  placeholder="Acme Corporation"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    {...register('email')}
                    type="email"
                    label="Email"
                    placeholder="contact@example.com"
                    error={errors.email?.message}
                  />
                  <Input
                    {...register('phone')}
                    type="tel"
                    label="Phone"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <Input
                  {...register('website')}
                  type="url"
                  label="Website"
                  placeholder="https://example.com"
                  error={errors.website?.message}
                />
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Address
                  </label>
                  <textarea
                    {...register('billingAddress')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="123 Main St, Suite 100&#10;San Francisco, CA 94102"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Address
                  </label>
                  <textarea
                    {...register('shippingAddress')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="123 Main St, Suite 100&#10;San Francisco, CA 94102"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <input
                    {...register('isActive')}
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active customer
                  </label>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Inactive customers will not appear in dropdowns
                </p>
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
                  className="w-full"
                  isLoading={loading}
                >
                  Create Customer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/customers')}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
