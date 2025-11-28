'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
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
import { accountsApi } from '@/lib/api';
import type { Account, AccountTransaction } from '@/types';

const ACCOUNT_TYPE_COLORS = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-purple-100 text-purple-800',
  income: 'bg-green-100 text-green-800',
  expense: 'bg-orange-100 text-orange-800',
};

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadAccount(params.id as string);
      loadTransactions(params.id as string);
    }
  }, [params.id]);

  const loadAccount = async (id: string) => {
    try {
      const response = await accountsApi.getById(id);
      setAccount(response.data);
    } catch (error) {
      console.error('Failed to load account:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (id: string) => {
    try {
      const response = await accountsApi.getTransactions(id, { limit: 50 });
      setTransactions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;

    if (account.isSystemAccount) {
      alert('Cannot delete system accounts.');
      return;
    }

    if (!confirm(`Are you sure you want to delete account "${account.name}"?`)) {
      return;
    }

    try {
      await accountsApi.delete(account.id);
      router.push('/accounts');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      const message = error.response?.data?.error || 'Failed to delete account. Please try again.';
      alert(message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600">Account not found</p>
          <Button onClick={() => router.push('/accounts')} className="mt-4">
            Back to Accounts
          </Button>
        </div>
      </div>
    );
  }

  const isDebitNormal = ['asset', 'expense'].includes(account.type);
  const balanceAmount = account.balance?.amount || 0;
  const isPositive = balanceAmount >= 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/accounts')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {account.name}
              </h1>
              {account.accountNumber && (
                <span className="font-mono text-lg text-gray-600">
                  {account.accountNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                ACCOUNT_TYPE_COLORS[account.type as keyof typeof ACCOUNT_TYPE_COLORS]
              }`}>
                {account.type}
              </span>
              <Badge variant={account.isActive ? 'success' : 'default'}>
                {account.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {account.isSystemAccount && (
                <Badge variant="default">System Account</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/accounts/${account.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {!account.isSystemAccount && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Balance and Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Balance */}
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                {formatCurrency(balanceAmount)}
                {isPositive ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
              {account.balance && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Debits:</span>
                    <span className="font-medium">{formatCurrency(account.balance.debits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Credits:</span>
                    <span className="font-medium">{formatCurrency(account.balance.credits)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Account Type</div>
                <div className="font-medium capitalize">{account.type}</div>
              </div>
              {account.subtype && (
                <div>
                  <div className="text-sm text-gray-600">Subtype</div>
                  <div className="font-medium">{account.subtype}</div>
                </div>
              )}
              {account.accountNumber && (
                <div>
                  <div className="text-sm text-gray-600">Account Number</div>
                  <div className="font-mono">{account.accountNumber}</div>
                </div>
              )}
              {account.description && (
                <div>
                  <div className="text-sm text-gray-600">Description</div>
                  <div className="text-sm">{account.description}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-600">Currency</div>
                <div className="font-medium">{account.currency}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Created</div>
                <div className="text-sm">{formatDate(account.createdAt)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Child Accounts */}
          {account.childAccounts && account.childAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sub-Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {account.childAccounts.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div>
                        <div className="font-medium text-sm">{child.name}</div>
                        {child.accountNumber && (
                          <div className="font-mono text-xs text-gray-500">
                            {child.accountNumber}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/accounts/${child.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No transactions found for this account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(txn.date)}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {txn.type.replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {txn.description}
                          </TableCell>
                          <TableCell className="text-right">
                            {txn.debit.amount > 0 ? (
                              <span className="text-red-600 font-medium">
                                {formatCurrency(txn.debit.amount)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {txn.credit.amount > 0 ? (
                              <span className="text-green-600 font-medium">
                                {formatCurrency(txn.credit.amount)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
