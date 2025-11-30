'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, MoreVertical, FileText } from 'lucide-react';
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
import { customersApi } from '@/lib/api';
import type { Customer } from '@/types';

interface CustomerWithBalance extends Customer {
  computedBalance?: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) {
      return;
    }

    try {
      await customersApi.delete(id);
      await loadCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer. Please try again.');
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      const customersList = response.data.data || [];

      // Fetch balance for each customer
      const customersWithBalances = await Promise.all(
        customersList.map(async (customer: Customer) => {
          try {
            const balanceResponse = await customersApi.getBalance(customer.id);
            return {
              ...customer,
              computedBalance: balanceResponse.data.totalBalance?.amount || 0
            };
          } catch (error) {
            console.error(`Failed to load balance for customer ${customer.id}:`, error);
            return {
              ...customer,
              computedBalance: 0
            };
          }
        })
      );

      setCustomers(customersWithBalances);
    } catch (error) {
      console.error('Failed to load customers:', error);
      // Use mock data for demo
      setCustomers([
        {
          id: '1',
          displayName: 'Acme Corporation',
          companyName: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '(555) 123-4567',
          balance: 0,
          isActive: true,
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          displayName: 'Tech Solutions Inc',
          companyName: 'Tech Solutions Inc',
          email: 'info@techsolutions.com',
          phone: '(555) 234-5678',
          balance: 3780,
          isActive: true,
          createdAt: '2024-01-05',
        },
        {
          id: '3',
          displayName: 'Global Services LLC',
          companyName: 'Global Services LLC',
          email: 'hello@globalservices.com',
          phone: '(555) 345-6789',
          balance: 7776,
          isActive: true,
          createdAt: '2023-12-10',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer relationships</p>
        </div>
        <Link href="/customers/new">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Customer
          </Button>
        </Link>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search customers..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {customer.displayName}
                  </Link>
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(customer.computedBalance || 0)}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Link href={`/invoices/new?customerId=${customer.id}`}>
                      <Button variant="ghost" size="sm" title="Create Invoice">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </Button>
                    </Link>
                    <Link href={`/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm" title="View">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/customers/${customer.id}/edit`}>
                      <Button variant="ghost" size="sm" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(customer.id, customer.displayName)}
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
