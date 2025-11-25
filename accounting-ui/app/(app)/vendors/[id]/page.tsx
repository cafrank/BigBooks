'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { vendorsApi } from '@/lib/api';
import type { Vendor } from '@/types';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadVendor(params.id as string);
    }
  }, [params.id]);

  const loadVendor = async (id: string) => {
    try {
      const response = await vendorsApi.getById(id);
      setVendor(response.data);
    } catch (error) {
      console.error('Failed to load vendor:', error);
      // Mock data
      setVendor({
        id,
        displayName: 'Office Supplies Co',
        companyName: 'Office Supplies Co',
        email: 'sales@officesupplies.com',
        phone: '(555) 111-2222',
        website: 'https://officesupplies.com',
        billingAddress: '456 Commerce St, New York, NY 10001',
        balance: 2500,
        isActive: true,
        createdAt: '2024-01-01',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vendor || !confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await vendorsApi.delete(vendor.id);
      router.push('/vendors');
    } catch (error) {
      console.error('Failed to delete vendor:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Vendor not found</p>
          <Button onClick={() => router.push('/vendors')} className="mt-4">
            Back to Vendors
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
            onClick={() => router.push('/vendors')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {vendor.displayName}
            </h1>
            <p className="text-gray-600">{vendor.companyName}</p>
          </div>
          <Badge variant={vendor.isActive ? 'success' : 'default'}>
            {vendor.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/vendors/${vendor.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a
                    href={`mailto:${vendor.email}`}
                    className="text-primary-600 hover:underline"
                  >
                    {vendor.email}
                  </a>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a
                    href={`tel:${vendor.phone}`}
                    className="text-primary-600 hover:underline"
                  >
                    {vendor.phone}
                  </a>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {vendor.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {vendor.billingAddress || 'No billing address'}
              </p>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-gray-600">Added on</p>
                <p className="font-medium">{formatDate(vendor.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Balance */}
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(vendor.balance || 0)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Amount owed</p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/bills/new?vendorId=${vendor.id}`)}
              >
                Create Bill
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/expenses/new?vendorId=${vendor.id}`)}
              >
                Record Expense
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
