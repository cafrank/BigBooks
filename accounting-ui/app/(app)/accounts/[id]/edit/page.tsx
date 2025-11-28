'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { accountsApi } from '@/lib/api';
import type { Account } from '@/types';

const accountEditSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(255),
  description: z.string().max(1000).optional(),
  isActive: z.boolean(),
});

type AccountEditFormData = z.infer<typeof accountEditSchema>;

export default function EditAccountPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AccountEditFormData>({
    resolver: zodResolver(accountEditSchema),
  });

  useEffect(() => {
    if (params.id) {
      loadAccount(params.id as string);
    }
  }, [params.id]);

  const loadAccount = async (id: string) => {
    try {
      const response = await accountsApi.getById(id);
      const accountData = response.data;
      setAccount(accountData);

      // Set form values
      setValue('name', accountData.name);
      setValue('description', accountData.description || '');
      setValue('isActive', accountData.isActive);
    } catch (error) {
      console.error('Failed to load account:', error);
      alert('Failed to load account. Please try again.');
      router.push('/accounts');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AccountEditFormData) => {
    if (!account) return;

    setSaving(true);
    try {
      await accountsApi.update(account.id, data);
      router.push(`/accounts/${account.id}`);
    } catch (error: any) {
      console.error('Failed to update account:', error);
      const message = error.response?.data?.error || 'Failed to update account. Please try again.';
      alert(message);
    } finally {
      setSaving(false);
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/accounts/${account.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Account</h1>
          <p className="text-gray-600">{account.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
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

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    id="isActive"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    disabled={account.isSystemAccount}
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
                {account.isSystemAccount && (
                  <p className="text-sm text-gray-500">
                    System accounts cannot be deactivated.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Read-only Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details (Read-only)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Account Type</div>
                    <div className="font-medium capitalize">{account.type}</div>
                  </div>
                  {account.accountNumber && (
                    <div>
                      <div className="text-sm text-gray-600">Account Number</div>
                      <div className="font-mono">{account.accountNumber}</div>
                    </div>
                  )}
                </div>
                {account.subtype && (
                  <div>
                    <div className="text-sm text-gray-600">Subtype</div>
                    <div className="font-medium">{account.subtype}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600">Currency</div>
                  <div className="font-medium">{account.currency}</div>
                </div>
                {account.isSystemAccount && (
                  <div className="rounded-md bg-blue-50 p-3">
                    <div className="text-sm font-medium text-blue-800">
                      This is a system account
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Some properties of system accounts cannot be modified to maintain data integrity.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/accounts/${account.id}`)}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What can be edited?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>
                  You can edit:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Account name</li>
                  <li>Description</li>
                  <li>Active status</li>
                </ul>
                <p className="mt-3">
                  You cannot edit:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Account type</li>
                  <li>Account number</li>
                  <li>Parent account</li>
                </ul>
                <p className="mt-3 text-xs">
                  These fields are locked after creation to maintain accounting integrity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
