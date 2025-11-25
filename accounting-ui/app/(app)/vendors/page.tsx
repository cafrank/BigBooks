'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
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
import { vendorsApi } from '@/lib/api';
import type { Vendor } from '@/types';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await vendorsApi.getAll();
      setVendors(response.data.data || []);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      // Use mock data for demo
      setVendors([
        {
          id: '1',
          displayName: 'Office Supplies Co',
          companyName: 'Office Supplies Co',
          email: 'sales@officesupplies.com',
          phone: '(555) 111-2222',
          balance: 2500,
          isActive: true,
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          displayName: 'Tech Equipment Inc',
          companyName: 'Tech Equipment Inc',
          email: 'orders@techequip.com',
          phone: '(555) 222-3333',
          balance: 8900,
          isActive: true,
          createdAt: '2024-01-05',
        },
        {
          id: '3',
          displayName: 'Cloud Services LLC',
          companyName: 'Cloud Services LLC',
          email: 'billing@cloudservices.com',
          phone: '(555) 333-4444',
          balance: 1200,
          isActive: true,
          createdAt: '2023-12-10',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendor.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600">Manage your vendor relationships</p>
        </div>
        <Link href="/vendors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Vendor
          </Button>
        </Link>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search vendors..."
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
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/vendors/${vendor.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {vendor.displayName}
                  </Link>
                </TableCell>
                <TableCell>{vendor.email}</TableCell>
                <TableCell>{vendor.phone}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(vendor.balance || 0)}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vendor.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
