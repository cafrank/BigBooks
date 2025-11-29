'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { accountsApi } from '@/lib/api';
import type { Account } from '@/types';

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(255),
  type: z.enum(['asset', 'liability', 'equity', 'income', 'expense'], {
    required_error: 'Account type is required',
  }),
  accountNumber: z.string().max(20).optional(),
  description: z.string().max(1000).optional(),
  parentAccountId: z.string().uuid().optional().or(z.literal('')),
  openingBalance: z.number().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset', description: 'Resources owned by the business' },
  { value: 'liability', label: 'Liability', description: 'Debts and obligations' },
  { value: 'equity', label: 'Equity', description: 'Owner\'s investment in the business' },
  { value: 'income', label: 'Income', description: 'Revenue from sales and services' },
  { value: 'expense', label: 'Expense', description: 'Costs of doing business' },
];

export default function NewAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<Account[]>([]);
  const [selectedType, setSelectedType] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      accountNumber: '',
      description: '',
      parentAccountId: '',
      openingBalance: 0,
    },
  });

  const watchType = watch('type');

  useEffect(() => {
    if (watchType) {
      setSelectedType(watchType);
      loadParentAccounts(watchType);
    }
  }, [watchType]);

  const loadParentAccounts = async (type: string) => {
    try {
      const response = await accountsApi.getAll({ type, isActive: true });
      setParentAccounts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load parent accounts:', error);
    }
  };

  const onSubmit = async (data: AccountFormData) => {
    setLoading(true);
    try {
      // Clean up empty parent account ID
      const payload = {
        ...data,
        parentAccountId: data.parentAccountId || undefined,
        accountNumber: data.accountNumber || undefined,
        description: data.description || undefined,
      };

      const response = await accountsApi.create(payload);
      router.push(`/accounts/${response.data.id}`);
    } catch (error: any) {
      console.error('Failed to create account:', error);
      const message = error.response?.data?.error || 'Failed to create account. Please try again.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/accounts')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Account</h1>
          <p className="text-gray-600">Add a new account to your chart of accounts</p>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="e.g., Checking Account, Office Supplies Expense"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('type')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select account type...</option>
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <Input
                      {...register('accountNumber')}
                      placeholder="e.g., 1000, 4500"
                      maxLength={20}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional: Used for sorting and organization
                    </p>
                    {errors.accountNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.accountNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Account
                    </label>
                    <select
                      {...register('parentAccountId')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!selectedType}
                    >
                      <option value="">None (Top-level account)</option>
                      {parentAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.accountNumber ? `${account.accountNumber} - ` : ''}{account.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Optional: Create as a sub-account
                    </p>
                    {errors.parentAccountId && (
                      <p className="mt-1 text-sm text-red-600">{errors.parentAccountId.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Additional details about this account..."
                    maxLength={1000}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Opening Balance */}
            <Card>
              <CardHeader>
                <CardTitle>Opening Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Balance Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('openingBalance', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Set the initial balance for this account. Leave as 0 if this is a new account with no prior balance.
                  </p>
                  {errors.openingBalance && (
                    <p className="mt-1 text-sm text-red-600">{errors.openingBalance.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Help & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={loading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/accounts')}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Types Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ACCOUNT_TYPES.map((type) => (
                  <div key={type.value}>
                    <div className="font-medium text-sm text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-600">{type.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>
                  • Use account numbers to organize your chart of accounts (e.g., 1000-1999 for assets, 2000-2999 for liabilities)
                </p>
                <p>
                  • Create parent accounts first, then add sub-accounts to build a hierarchy
                </p>
                <p>
                  • System accounts cannot be deleted or modified once created
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
