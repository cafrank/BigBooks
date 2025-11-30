'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter, Download, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { invoicesApi } from '@/lib/api';
import type { Invoice } from '@/types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
      return;
    }

    try {
      await invoicesApi.delete(id);
      await loadInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await invoicesApi.getAll();
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      // Use mock data for demo
      setInvoices([
        {
          id: '1',
          invoiceNumber: 'INV-1001',
          customerId: '1',
          customerName: 'Acme Corporation',
          status: 'paid',
          issueDate: '2024-01-15',
          dueDate: '2024-02-15',
          subtotal: 5000,
          taxAmount: 400,
          total: { amount: 5400, currency: 'USD' },
          amountPaid: { amount: 5400, currency: 'USD' },
          amountDue: { amount: 0, currency: 'USD' },
          currency: 'USD',
        },
        {
          id: '2',
          invoiceNumber: 'INV-1002',
          customerId: '2',
          customerName: 'Tech Solutions Inc',
          status: 'sent',
          issueDate: '2024-01-20',
          dueDate: '2024-02-20',
          subtotal: 3500,
          taxAmount: 280,
          total: { amount: 3780, currency: 'USD' },
          amountPaid: { amount: 0, currency: 'USD' },
          amountDue: { amount: 3780, currency: 'USD' },
          currency: 'USD',
        },
        {
          id: '3',
          invoiceNumber: 'INV-1003',
          customerId: '3',
          customerName: 'Global Services LLC',
          status: 'overdue',
          issueDate: '2023-12-10',
          dueDate: '2024-01-10',
          subtotal: 7200,
          taxAmount: 576,
          total: { amount: 7776, currency: 'USD' },
          amountPaid: { amount: 0, currency: 'USD' },
          amountDue: { amount: 7776, currency: 'USD' },
          currency: 'USD',
        },
      ]);
    } finally {
      setLoading(false);
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
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage your invoices and track payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link href="/invoices/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(invoice.status)}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    typeof invoice.total === 'object' ? invoice.total.amount : (invoice.total || 0),
                    typeof invoice.total === 'object' ? invoice.total.currency : 'USD'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    typeof invoice.amountDue === 'object' ? invoice.amountDue.amount : invoice.amountDue,
                    typeof invoice.amountDue === 'object' ? invoice.amountDue.currency : 'USD'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Link href={`/invoices/${invoice.id}`}>
                      <Button variant="ghost" size="sm" title="View">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/invoices/${invoice.id}/edit`}>
                      <Button variant="ghost" size="sm" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
