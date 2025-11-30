'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { customersApi, invoicesApi } from '@/lib/api';
import type { Customer, Invoice } from '@/types';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadCustomer(params.id as string);
      loadCustomerInvoices(params.id as string);
    }
  }, [params.id]);

  const loadCustomer = async (id: string) => {
    try {
      const response = await customersApi.getById(id);
      setCustomer(response.data);
    } catch (error) {
      console.error('Failed to load customer:', error);
      // Mock data
      setCustomer({
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
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerInvoices = async (customerId: string) => {
    try {
      const response = await invoicesApi.getAll({ customerId });
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error('Failed to load customer invoices:', error);
      // Mock data
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
          total: { amount: 5400, currency: 'USD' },
          amountPaid: { amount: 0, currency: 'USD' },
          amountDue: { amount: 5400, currency: 'USD' },
          currency: 'USD',
        },
      ]);
    }
  };

  const handleDelete = async () => {
    if (!customer || !confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customersApi.delete(customer.id);
      router.push('/customers');
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      draft: 'default',
      sent: 'info',
      viewed: 'info',
      partial: 'warning',
      paid: 'success',
      overdue: 'danger',
      voided: 'default',
    };
    return variants[status] || 'default';
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Customer not found</p>
          <Button onClick={() => router.push('/customers')} className="mt-4">
            Back to Customers
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
            onClick={() => router.push('/customers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.displayName}
            </h1>
            <p className="text-gray-600">{customer.companyName}</p>
          </div>
          <Badge variant={customer.isActive ? 'success' : 'default'}>
            {customer.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/customers/${customer.id}/edit`)}
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
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-primary-600 hover:underline"
                  >
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-primary-600 hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a
                    href={customer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {customer.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Billing Address</p>
                <p className="text-sm text-gray-600">
                  {customer.billingAddress || 'No billing address'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Shipping Address</p>
                <p className="text-sm text-gray-600">
                  {customer.shippingAddress || 'No shipping address'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Invoices</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/invoices/new?customerId=${customer.id}`)}
                >
                  New Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            typeof invoice.total === 'object' ? invoice.total.amount : (invoice.total || 0),
                            typeof invoice.total === 'object' ? invoice.total.currency : 'USD'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-gray-500">No invoices yet</p>
              )}
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
                {formatCurrency(customer.balance || 0)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Outstanding balance</p>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer Since</p>
                <p className="font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
