'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Download, Trash2, Edit, Check, X } from 'lucide-react';
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
import { invoicesApi } from '@/lib/api';
import type { Invoice } from '@/types';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadInvoice(params.id as string);
    }
  }, [params.id]);

  const loadInvoice = async (id: string) => {
    try {
      const response = await invoicesApi.getById(id);
      setInvoice(response.data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
      // Mock data for demo
      setInvoice({
        id,
        invoiceNumber: 'INV-1001',
        customerId: '1',
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
        notes: 'Thank you for your business!',
        lineItems: [
          {
            id: '1',
            description: 'Web Development Services',
            quantity: 40,
            unitPrice: 125,
            amount: 5000,
            taxAmount: 400,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!invoice) return;
    try {
      await invoicesApi.update(invoice.id, { status: newStatus });
      setInvoice({ ...invoice, status: newStatus as any });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async () => {
    if (!invoice || !confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoicesApi.delete(invoice.id);
      router.push('/invoices');
    } catch (error) {
      console.error('Failed to delete invoice:', error);
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

  if (!invoice) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Invoice not found</p>
          <Button onClick={() => router.push('/invoices')} className="mt-4">
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
            onClick={() => router.push('/invoices')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-gray-600">{invoice.customerName}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(invoice.status)}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusUpdate('sent')}
            >
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
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
        {/* Main Invoice Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount Due</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(
                      typeof invoice.amountDue === 'object' ? invoice.amountDue.amount : invoice.amountDue,
                      typeof invoice.amountDue === 'object' ? invoice.amountDue.currency : 'USD'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount Paid</p>
                  <p className="font-medium">
                    {formatCurrency(
                      typeof invoice.amountPaid === 'object' ? invoice.amountPaid.amount : (invoice.amountPaid || 0),
                      typeof invoice.amountPaid === 'object' ? invoice.amountPaid.currency : 'USD'
                    )}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div className="mt-6">
                <h3 className="mb-3 font-medium text-gray-900">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            typeof item.unitPrice === 'object' ? item.unitPrice.amount : (item.unitPrice || 0),
                            typeof item.unitPrice === 'object' ? item.unitPrice.currency : 'USD'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            typeof item.amount === 'object' ? item.amount.amount : (item.amount || 0),
                            typeof item.amount === 'object' ? item.amount.currency : 'USD'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span>{formatCurrency(
                          typeof invoice.subtotal === 'object' ? invoice.subtotal.amount : (invoice.subtotal || 0),
                          typeof invoice.subtotal === 'object' ? invoice.subtotal.currency : 'USD'
                        )}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span>{formatCurrency(
                          typeof invoice.taxAmount === 'object' ? invoice.taxAmount.amount : (invoice.taxAmount || 0),
                          typeof invoice.taxAmount === 'object' ? invoice.taxAmount.currency : 'USD'
                        )}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(
                          typeof invoice.total === 'object' ? invoice.total.amount : (invoice.total || 0),
                          typeof invoice.total === 'object' ? invoice.total.currency : 'USD'
                        )}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-6 rounded-md bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">Notes</p>
                  <p className="mt-1 text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {invoice.status !== 'paid' && invoice.status !== 'voided' && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleStatusUpdate('sent')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </Button>
                )}
                {(typeof invoice.amountDue === 'object' ? invoice.amountDue.amount : invoice.amountDue) > 0 && invoice.status !== 'draft' && (
                  <Button
                    className="w-full justify-start"
                    onClick={() => router.push(`/payments/new?invoiceId=${invoice.id}`)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusUpdate('voided')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Void Invoice
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-gray-900">{invoice.customerName}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 p-0 text-primary-600"
                onClick={() => router.push(`/customers/${invoice.customerId}`)}
              >
                View Customer Details
              </Button>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-gray-600">Created</p>
                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              {invoice.status !== 'draft' && (
                <div className="text-sm">
                  <p className="text-gray-600">Sent</p>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
