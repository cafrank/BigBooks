'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Filter, Eye } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { accountsApi } from '@/lib/api';
import type { Account } from '@/types';

const ACCOUNT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

const ACCOUNT_TYPE_COLORS = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-purple-100 text-purple-800',
  income: 'bg-green-100 text-green-800',
  expense: 'bg-orange-100 text-orange-800',
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    loadAccounts();
  }, [typeFilter, activeFilter]);

  const loadAccounts = async () => {
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (activeFilter !== undefined) params.isActive = activeFilter;

      const response = await accountsApi.getAll(params);
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, isSystemAccount: boolean) => {
    if (isSystemAccount) {
      alert('Cannot delete system accounts.');
      return;
    }

    if (!confirm(`Are you sure you want to delete account "${name}"?`)) {
      return;
    }

    try {
      await accountsApi.delete(id);
      await loadAccounts();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      const message = error.response?.data?.error || 'Failed to delete account. Please try again.';
      alert(message);
    }
  };

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group accounts by type for better organization
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

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
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600">Manage your account structure and balances</p>
        </div>
        <Link href="/accounts/new">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Account
          </Button>
        </Link>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search accounts by name, number, or description..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={activeFilter === undefined ? '' : activeFilter.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveFilter(val === '' ? undefined : val === 'true');
                }}
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {Object.keys(groupedAccounts).length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No accounts found. Create your first account to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
              <div key={type}>
                <div className="bg-gray-50 px-4 py-2">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">
                    {type}
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono text-sm">
                          {account.accountNumber || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/accounts/${account.id}`}
                            className="text-primary-600 hover:underline"
                          >
                            {account.name}
                          </Link>
                          {account.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {account.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ACCOUNT_TYPE_COLORS[account.type as keyof typeof ACCOUNT_TYPE_COLORS]
                          }`}>
                            {account.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {account.balance ? formatCurrency(account.balance.amount) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              account.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {account.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {account.isSystemAccount && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                System
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Link href={`/accounts/${account.id}`}>
                              <Button variant="ghost" size="sm" title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/accounts/${account.id}/edit`}>
                              <Button variant="ghost" size="sm" title="Edit">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </Link>
                            {!account.isSystemAccount && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(account.id, account.name, account.isSystemAccount)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
