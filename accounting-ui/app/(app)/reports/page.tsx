'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, FileText, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function ReportsPage() {
  const reports = [
    {
      name: 'Profit & Loss',
      description: 'View your income and expenses over time',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      name: 'Balance Sheet',
      description: 'See your assets, liabilities, and equity',
      icon: FileText,
      color: 'bg-green-100 text-green-600',
    },
    {
      name: 'Cash Flow Statement',
      description: 'Track the movement of cash in and out',
      icon: DollarSign,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      name: 'Accounts Receivable Aging',
      description: 'See which invoices are outstanding',
      icon: FileText,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Financial insights and analytics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className={`rounded-lg p-3 ${report.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <CardTitle>{report.name}</CardTitle>
                      <p className="mt-1 text-sm text-gray-600">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    View Report
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Revenue (YTD)</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(145000)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Expenses (YTD)</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(89000)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Net Profit (YTD)</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {formatCurrency(56000)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
