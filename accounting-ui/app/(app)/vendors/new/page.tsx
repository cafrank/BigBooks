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
import { vendorsApi } from '@/lib/api';

const vendorSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  billingAddress: z.string().optional(),
  isActive: z.boolean().default(true),
});

type VendorFormData = z.infer<typeof vendorSchema>;

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      isActive: true,
    },
  });

  const onSubmit = async (data: VendorFormData) => {
    setLoading(true);
    try {
      const response = await vendorsApi.create(data);
      router.push(`/vendors/${response.data.id}`);
    } catch (error: any) {
      console.error('Failed to create vendor:', error);
      alert(error.response?.data?.error || 'Failed to create vendor');
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
            <h1 className="text-2xl font-bold text-gray-900">New Vendor</h1>
            <p className="text-gray-600">Add a new vendor to your account</p>
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
            Create Vendor
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
                  placeholder="Office Supplies Co"
                  error={errors.displayName?.message}
                />
                <Input
                  {...register('companyName')}
                  label="Company Name"
                  placeholder="Office Supplies Corporation"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    {...register('email')}
                    type="email"
                    label="Email"
                    placeholder="sales@example.com"
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
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Address
                  </label>
                  <textarea
                    {...register('billingAddress')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="456 Commerce St&#10;New York, NY 10001"
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
                    Active vendor
                  </label>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Inactive vendors will not appear in dropdowns
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
                  variant="outline"
                  className="w-full"
                  isLoading={loading}
                >
                  Create Vendor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/vendors')}
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
