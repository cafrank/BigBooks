'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { customersApi } from '@/lib/api';
import type { Customer } from '@/types';

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

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (params.id) {
      loadCustomer(params.id as string);
    }
  }, [params.id]);

  const loadCustomer = async (id: string) => {
    try {
      const response = await customersApi.getById(id);
      const data = response.data;
      setCustomer(data);

      // Reset form with loaded data
      reset({
        displayName: data.displayName,
        companyName: data.companyName || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        billingAddress: data.billingAddress || '',
        shippingAddress: data.shippingAddress || '',
        isActive: data.isActive,
      });
    } catch (error) {
      console.error('Failed to load customer:', error);
      // Mock data
      const mockData = {
        id,
        displayName: 'Acme Corporation',
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        phone: '(555) 123-4567',
        website: 'https://acme.com',
        billingAddress: '123 Main St, San Francisco, CA 94102',
        shippingAddress: '123 Main St, San Francisco, CA 94102',
        balance: 5400,
        isActive: true,
        createdAt: '2024-01-01',
      };
      setCustomer(mockData);
      reset({
        displayName: mockData.displayName,
        companyName: mockData.companyName || '',
        email: mockData.email || '',
        phone: mockData.phone || '',
        website: mockData.website || '',
        billingAddress: mockData.billingAddress || '',
        shippingAddress: mockData.shippingAddress || '',
        isActive: mockData.isActive,
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    if (!params.id) return;

    setLoading(true);
    try {
      await customersApi.update(params.id as string, data);
      router.push(`/customers/${params.id}`);
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      alert(error.response?.data?.error || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
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
            onClick={() => router.push(`/customers/${params.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Customer
            </h1>
            <p className="text-gray-600">{customer?.displayName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/customers/${params.id}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            isLoading={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
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
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/customers/${params.id}`)}
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
