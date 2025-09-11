'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  downloadUrl?: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
  metadata?: Record<string, any>;
}

interface PaymentHistoryProps {
  organizationId?: string;
  onDownloadInvoice?: (paymentId: string) => Promise<void>;
  className?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'succeeded':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Paid
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'refunded':
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Stripe amounts are in cents
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function PaymentRow({
  payment,
  onDownloadInvoice,
}: {
  payment: PaymentRecord;
  onDownloadInvoice?: (paymentId: string) => Promise<void>;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!onDownloadInvoice) return;

    setIsDownloading(true);
    try {
      await onDownloadInvoice(payment.id);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-4 px-6 hover:bg-gray-50 transition-colors">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        {/* Date & Invoice */}
        <div>
          <p className="font-medium text-gray-900">
            {formatDate(payment.date)}
          </p>
          {payment.invoiceNumber && (
            <p className="text-sm text-gray-500">#{payment.invoiceNumber}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <p className="text-gray-900">{payment.description}</p>
          {payment.paymentMethod && (
            <p className="text-sm text-gray-500">
              {payment.paymentMethod.brand} •••• {payment.paymentMethod.last4}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="text-right md:text-left">
          <p className="font-medium text-gray-900">
            {formatAmount(payment.amount, payment.currency)}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          {getStatusBadge(payment.status)}

          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            {payment.invoiceUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(payment.invoiceUrl, '_blank')}
                className="text-wedding hover:text-wedding"
              >
                View
              </Button>
            )}

            {(payment.downloadUrl || onDownloadInvoice) &&
              payment.status === 'succeeded' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  loading={isDownloading}
                  disabled={isDownloading}
                  className="text-wedding hover:text-wedding"
                >
                  Download
                </Button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentHistory({
  organizationId,
  onDownloadInvoice,
  className = '',
}: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Load payment history
  useEffect(() => {
    const loadPayments = async () => {
      if (!organizationId) return;

      setLoading(true);
      setError('');

      try {
        const token =
          localStorage.getItem('sb-access-token') ||
          sessionStorage.getItem('sb-access-token');

        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(
          `/api/billing/payment-history?organizationId=${organizationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load payment history');
        }

        const data = await response.json();
        setPayments(data.payments || []);
      } catch (err) {
        console.error('Error loading payment history:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load payment history',
        );
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [organizationId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.invoiceNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case 'last-month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'last-3-months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'last-year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0); // All time
      }

      filtered = filtered.filter((payment) => payment.date >= startDate);
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

    setFilteredPayments(filtered);
    setTotalPages(Math.ceil(filtered.length / pageSize));
    setCurrentPage(1); // Reset to first page when filters change
  }, [payments, searchTerm, statusFilter, dateRange, pageSize]);

  // Get current page payments
  const getCurrentPagePayments = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPayments.slice(startIndex, startIndex + pageSize);
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <LoadingSkeleton className="h-8 w-48" />
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-3/4" />
          <LoadingSkeleton className="h-4 w-1/2" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <p className="font-medium">Failed to load payment history</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
            <p className="text-gray-600 mt-1">
              View and download your billing history and invoices
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Statuses</option>
            <option value="succeeded">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Time</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="last-year">Last Year</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {getCurrentPagePayments().length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No payments found
            </h3>
            <p className="text-gray-600">
              {filteredPayments.length === 0 && payments.length > 0
                ? 'No payments match your current filters.'
                : 'You have no payment history yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Header */}
            <div className="hidden md:block bg-gray-50 px-6 py-3">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                <div>Date</div>
                <div className="col-span-2">Description</div>
                <div>Amount</div>
                <div>Status</div>
              </div>
            </div>

            {/* Payment Rows */}
            {getCurrentPagePayments().map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                onDownloadInvoice={onDownloadInvoice}
              />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredPayments.length)} of{' '}
              {filteredPayments.length} payments
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
