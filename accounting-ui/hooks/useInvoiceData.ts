import { useState, useEffect } from 'react';
import { invoicesApi, customersApi } from '@/lib/api';
import type { Customer, Invoice } from '@/types';

interface UseInvoiceDataReturn {
  invoice: Invoice | null;
  customers: Customer[];
  loading: boolean;
  error: string | null;
}

export function useInvoiceData(invoiceId?: string): UseInvoiceDataReturn {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load customers and invoice in parallel
        const [customersResponse, invoiceResponse] = await Promise.all([
          customersApi.getAll(),
          invoiceId ? invoicesApi.getById(invoiceId) : Promise.resolve(null),
        ]);

        setCustomers(customersResponse.data.data || []);

        if (invoiceResponse) {
          setInvoice(invoiceResponse.data);
        }
      } catch (err: any) {
        console.error('Failed to load invoice data:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [invoiceId]);

  return { invoice, customers, loading, error };
}
