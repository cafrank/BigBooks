'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import api from '@/lib/api';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon }) => {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
            <div className="mt-2 flex items-center">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`ml-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change)}% from last month
              </span>
            </div>
          </div>
          <div className="rounded-full bg-primary-100 p-3">
            <Icon className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    outstandingInvoices: 0,
    revenueChange: 0,
    expensesChange: 0,
    profitChange: 0,
    invoicesChange: 0,
  });

  useEffect(() => {
    // In a real app, fetch from API
    setStats({
      revenue: 125000,
      expenses: 78000,
      profit: 47000,
      outstandingInvoices: 15,
      revenueChange: 12.5,
      expensesChange: -5.2,
      profitChange: 23.1,
      invoicesChange: 8.3,
    });
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.revenue)}
          change={stats.revenueChange}
          icon={DollarSign}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.expenses)}
          change={stats.expensesChange}
          icon={TrendingDown}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.profit)}
          change={stats.profitChange}
          icon={TrendingUp}
        />
        <StatCard
          title="Outstanding Invoices"
          value={stats.outstandingInvoices.toString()}
          change={stats.invoicesChange}
          icon={FileText}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <p className="font-medium text-gray-900">INV-1001</p>
                  <p className="text-sm text-gray-600">Acme Corp</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(5000)}</p>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Paid
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <p className="font-medium text-gray-900">INV-1002</p>
                  <p className="text-sm text-gray-600">Tech Solutions Inc</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(3500)}</p>
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                    Pending
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">INV-1003</p>
                  <p className="text-sm text-gray-600">Global Services LLC</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(7200)}</p>
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Overdue
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Money In</span>
                <span className="font-medium text-green-600">{formatCurrency(45000)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Money Out</span>
                <span className="font-medium text-red-600">{formatCurrency(28000)}</span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Net Cash Flow</span>
                  <span className="font-bold text-green-600">{formatCurrency(17000)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
