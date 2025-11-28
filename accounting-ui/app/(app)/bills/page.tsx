'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, DollarSign, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { billsApi } from '@/lib/api';
import type { Bill } from '@/types';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  voided: 'bg-gray-100 text-gray-800',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'voided', label: 'Voided' },
];

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadBills();
  }, [statusFilter]);

  const loadBills = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const response = await billsApi.getAll(params);
      setBills(response.data.data || []);
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter((bill) =>
    bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary stats
  const summary = filteredBills.reduce((acc, bill) => {
    acc.total += bill.total || 0;
    acc.amountDue += bill.amountDue || 0;
    acc.amountPaid += bill.amountPaid || 0;
    if (bill.status === 'overdue') acc.overdueCount++;
    if (bill.status === 'open' || bill.status === 'partial') acc.openCount++;
    return acc;
  }, { total: 0, amountDue: 0, amountPaid: 0, overdueCount: 0, openCount: 0 });

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
          <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
          <p className="text-gray-600">Manage vendor bills and payments</p>
        </div>
        <Link href="/bills/new">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            New Bill
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 mb-6 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.total)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Amount Due</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.amountDue)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.amountPaid)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Quick Stats</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Open Bills:</span>
                <span className="font-medium">{summary.openCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Overdue:</span>
                <span className="font-medium text-red-600">{summary.overdueCount}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by bill number or vendor..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || statusFilter
              ? 'No bills found matching your filters.'
              : 'No bills yet. Create your first bill to get started.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Amount Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/bills/${bill.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {bill.billNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {bill.vendorName ? (
                      <Link
                        href={`/vendors/${bill.vendorId}`}
                        className="text-gray-900 hover:text-primary-600"
                      >
                        {bill.vendorName}
                      </Link>
                    ) : (
                      <span className="text-gray-400">No vendor</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(bill.billDate)}</TableCell>
                  <TableCell>
                    <span className={
                      bill.status === 'overdue'
                        ? 'text-red-600 font-medium'
                        : ''
                    }>
                      {formatDate(bill.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(bill.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={
                      bill.amountDue > 0
                        ? 'font-medium text-red-600'
                        : 'text-green-600'
                    }>
                      {formatCurrency(bill.amountDue)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[bill.status as keyof typeof STATUS_COLORS]
                    }`}>
                      {bill.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link href={`/bills/${bill.id}`}>
                        <Button variant="ghost" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {(bill.status === 'open' || bill.status === 'partial') && bill.amountDue > 0 && (
                        <Link href={`/bills/${bill.id}?action=pay`}>
                          <Button variant="ghost" size="sm" title="Record Payment">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
