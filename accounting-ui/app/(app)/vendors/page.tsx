'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function VendorsPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600">Manage your vendor relationships</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Vendor
        </Button>
      </div>

      <Card>
        <div className="p-12 text-center">
          <p className="text-gray-500">Vendor management coming soon...</p>
        </div>
      </Card>
    </div>
  );
}
