'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { ArrowLeft, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { reportsApi } from '@/lib/api';

interface JournalEntry {
  entryId: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  description: string;
  debit: { amount: number; currency: string };
  credit: { amount: number; currency: string };
}

interface Transaction {
  transactionDate: string;
  transactionType: string;
  sourceId: string;
  entityName: string;
  entries: JournalEntry[];
  totalDebit: { amount: number; currency: string };
  totalCredit: { amount: number; currency: string };
}

interface JournalReportData {
  startDate: string;
  endDate: string;
  transactions: Transaction[];
  totals: {
    totalDebits: { amount: number; currency: string };
    totalCredits: { amount: number; currency: string };
  };
}

export default function TransactionJournalPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<JournalReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.getTransactionJournal({
        startDate,
        endDate
      });
      setReportData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transaction journal');
      console.error('Error loading transaction journal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleRunReport = () => {
    loadReport();
  };

  const formatTransactionType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Button
            variant="ghost"
            onClick={() => router.push('/reports')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction Journal</h1>
        <p className="text-gray-600">General journal showing all ledger transactions</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleRunReport} disabled={loading}>
                {loading ? 'Loading...' : 'Run Report'}
              </Button>
            </div>
            <div className="flex items-end">
              <Button variant="outline" disabled={!reportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Loading transaction journal...</p>
          </CardContent>
        </Card>
      )}

      {!loading && reportData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Transaction Journal
                <span className="text-sm font-normal text-gray-600 ml-2">
                  {formatDate(reportData.startDate)} - {formatDate(reportData.endDate)}
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="w-40">Name</TableHead>
                    <TableHead className="w-32">Account #</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-32">Debit</TableHead>
                    <TableHead className="text-right w-32">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No transactions found for the selected date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.transactions.map((transaction, txIndex) => (
                      <React.Fragment key={`${transaction.sourceId}-${txIndex}`}>
                        {transaction.entries.map((entry, entryIndex) => (
                          <TableRow
                            key={entry.entryId}
                            className={entryIndex === transaction.entries.length - 1 ? 'border-b-2 border-gray-300' : ''}
                          >
                            {entryIndex === 0 ? (
                              <>
                                <TableCell rowSpan={transaction.entries.length} className="align-top font-medium">
                                  {formatDate(transaction.transactionDate)}
                                </TableCell>
                                <TableCell rowSpan={transaction.entries.length} className="align-top">
                                  {formatTransactionType(transaction.transactionType)}
                                </TableCell>
                                <TableCell rowSpan={transaction.entries.length} className="align-top">
                                  {transaction.entityName || '-'}
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="text-gray-600">
                              {entry.accountNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {entry.accountName}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {entry.description}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {entry.debit.amount > 0 ? formatCurrency(entry.debit.amount) : ''}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {entry.credit.amount > 0 ? formatCurrency(entry.credit.amount) : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                  {reportData.transactions.length > 0 && (
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={6} className="text-right">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(reportData.totals.totalDebits.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(reportData.totals.totalCredits.amount)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {reportData.transactions.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Balance Check:</strong> Debits and credits should be equal.
                  Difference: {formatCurrency(Math.abs(reportData.totals.totalDebits.amount - reportData.totals.totalCredits.amount))}
                  {reportData.totals.totalDebits.amount === reportData.totals.totalCredits.amount &&
                    ' ✓ Balanced'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
