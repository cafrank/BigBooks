'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { paymentsApi } from '@/lib/api';
import type { Payment } from '@/types';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const handleDelete = async (id: string, paymentNumber: string) => {
    if (!confirm(`Are you sure you want to void payment ${paymentNumber}?`)) {
      return;
    }

    try {
      await paymentsApi.delete(id);
      await loadPayments();
    } catch (error) {
      console.error('Failed to void payment:', error);
      alert('Failed to void payment. Please try again.');
    }
  };

  const loadPayments = async () => {
    try {
      const response = await paymentsApi.getAll();
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
      // Use mock data for demo
      setPayments([
        {
          id: '1',
          paymentNumber: 'PMT-1001',
          customerId: '1',
          customerName: 'Acme Corporation',
          paymentDate: '2024-02-10',
          amount: { amount: 5400, currency: 'USD' },
          paymentMethod: 'bank_transfer',
          referenceNumber: 'TXN-20240210-001',
        },
        {
          id: '2',
          paymentNumber: 'PMT-1002',
          customerId: '2',
          customerName: 'Tech Solutions Inc',
          paymentDate: '2024-02-15',
          amount: { amount: 1500, currency: 'USD' },
          paymentMethod: 'credit_card',
          referenceNumber: 'TXN-20240215-002',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      check: 'Check',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      bank_transfer: 'Bank Transfer',
      other: 'Other',
    };
    return labels[method] || method;
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track all payments received</p>
        </div>
        <Link href="/payments/new">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Payment
          </Button>
        </Link>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/payments/${payment.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {payment.paymentNumber}
                  </Link>
                </TableCell>
                <TableCell>{payment.customerName}</TableCell>
                <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                <TableCell className="text-gray-600">
                  {payment.referenceNumber || '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(payment.amount.amount, payment.amount.currency)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Link href={`/payments/${payment.id}`}>
                      <Button variant="ghost" size="sm" title="View">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/payments/${payment.id}/edit`}>
                      <Button variant="ghost" size="sm" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(payment.id, payment.paymentNumber)}
                      title="Void Payment"
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
