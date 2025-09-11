'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Clock,
  Building2,
  CreditCard,
  FileText,
  AlertTriangle,
  Calendar as CalendarIcon,
  Search,
  Filter,
  SortAsc,
  ArrowUpDown,
  DollarSign,
  User,
  ExternalLink,
  Phone,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  format,
  parseISO,
  isValid,
  differenceInDays,
  isAfter,
  isBefore,
  addDays,
} from 'date-fns';
import type { PaymentScheduleItem } from '@/types/payment';
import {
  PaymentStatusIndicator,
  PaymentStatusUtils,
} from './PaymentStatusIndicator';

interface UpcomingPaymentsListProps {
  payments: PaymentScheduleItem[];
  onMarkPaid?: (payment: PaymentScheduleItem) => void;
  onPaymentUpdate?: (payment: PaymentScheduleItem) => void;
  onPaymentSelect?: (payment: PaymentScheduleItem) => void;
  weddingDate?: string;
  loading?: boolean;
  className?: string;
}

type SortOption = 'due_date' | 'amount' | 'vendor' | 'priority';
type FilterOption = 'all' | 'upcoming' | 'due' | 'overdue' | 'paid';

export function UpcomingPaymentsList({
  payments,
  onMarkPaid,
  onPaymentUpdate,
  onPaymentSelect,
  weddingDate,
  loading = false,
  className,
}: UpcomingPaymentsListProps) {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(
    new Set(),
  );

  // Advanced filtering and sorting
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = [...payments];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.vendor_name.toLowerCase().includes(searchLower) ||
          payment.description.toLowerCase().includes(searchLower) ||
          payment.payment_method?.toLowerCase().includes(searchLower) ||
          payment.currency.toLowerCase().includes(searchLower),
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'due_date':
          comparison =
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'vendor':
          comparison = a.vendor_name.localeCompare(b.vendor_name);
          break;
        case 'priority':
        default:
          comparison =
            PaymentStatusUtils.getPriorityScore(b) -
            PaymentStatusUtils.getPriorityScore(a);
          break;
      }

      return sortDesc ? -comparison : comparison;
    });

    return filtered;
  }, [payments, searchTerm, statusFilter, sortBy, sortDesc]);

  // Calculate payment statistics
  const paymentStats = useMemo(() => {
    const total = filteredAndSortedPayments.length;
    const overdue = filteredAndSortedPayments.filter(
      (p) => p.status === 'overdue',
    ).length;
    const due = filteredAndSortedPayments.filter(
      (p) => p.status === 'due',
    ).length;
    const upcoming = filteredAndSortedPayments.filter(
      (p) => p.status === 'upcoming',
    ).length;
    const paid = filteredAndSortedPayments.filter(
      (p) => p.status === 'paid',
    ).length;

    const totalAmount = filteredAndSortedPayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const pendingAmount = filteredAndSortedPayments
      .filter((p) => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      total,
      overdue,
      due,
      upcoming,
      paid,
      totalAmount,
      pendingAmount,
    };
  }, [filteredAndSortedPayments]);

  // Utility functions
  const getDaysUntilDue = useCallback((dueDate: string): number => {
    const due = parseISO(dueDate);
    if (!isValid(due)) return 0;
    return differenceInDays(due, new Date());
  }, []);

  const formatAmount = useCallback(
    (amount: number, currency: string = 'USD'): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);
    },
    [],
  );

  const formatDate = useCallback(
    (dateStr: string, formatStr: string = 'MMM dd, yyyy'): string => {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, formatStr) : 'Invalid Date';
    },
    [],
  );

  // Wedding context calculations
  const getWeddingUrgency = useCallback(
    (payment: PaymentScheduleItem) => {
      if (!weddingDate) return null;

      const wedding = parseISO(weddingDate);
      if (!isValid(wedding)) return null;

      const daysUntilWedding = differenceInDays(wedding, new Date());
      const daysUntilDue = getDaysUntilDue(payment.due_date);

      if (payment.status === 'overdue' && daysUntilWedding <= 30) {
        return {
          level: 'critical' as const,
          message: `🚨 Critical: Wedding in ${daysUntilWedding} days!`,
          priority: 3,
        };
      }

      if (daysUntilDue <= 7 && daysUntilWedding <= 60) {
        return {
          level: 'high' as const,
          message: `⚠️ High priority: Due before wedding`,
          priority: 2,
        };
      }

      if (daysUntilDue <= 14 && daysUntilWedding <= 90) {
        return {
          level: 'medium' as const,
          message: `⏰ Wedding planning priority`,
          priority: 1,
        };
      }

      return null;
    },
    [weddingDate, getDaysUntilDue],
  );

  // Handler functions
  const handleMarkPaid = useCallback(
    (payment: PaymentScheduleItem) => {
      if (onMarkPaid) {
        onMarkPaid(payment);
      }
    },
    [onMarkPaid],
  );

  const handlePaymentClick = useCallback(
    (payment: PaymentScheduleItem) => {
      if (onPaymentSelect) {
        onPaymentSelect(payment);
      }
      // Toggle expansion
      setExpandedPayment((prev) => (prev === payment.id ? null : payment.id));
    },
    [onPaymentSelect],
  );

  const handleSortToggle = useCallback(
    (newSortBy: SortOption) => {
      if (sortBy === newSortBy) {
        setSortDesc((prev) => !prev);
      } else {
        setSortBy(newSortBy);
        setSortDesc(true);
      }
    },
    [sortBy],
  );

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('priority');
    setSortDesc(true);
  }, []);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-48 h-6 bg-gray-200 rounded animate-pulse" />
              <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
              <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
              <div className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Critical Payment Alerts */}
      {paymentStats.overdue > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Urgent:</strong> {paymentStats.overdue} overdue payment
            {paymentStats.overdue > 1 ? 's' : ''} totaling{' '}
            {formatAmount(
              filteredAndSortedPayments
                .filter((p) => p.status === 'overdue')
                .reduce((sum, p) => sum + p.amount, 0),
            )}{' '}
            require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                Payment Schedule
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Track and manage your wedding vendor payments
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {paymentStats.total} total
              </Badge>
              {paymentStats.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {paymentStats.overdue} overdue
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-900">
                {formatAmount(paymentStats.pendingAmount)}
              </p>
              <p className="text-gray-600 text-xs">Pending</p>
            </div>

            {paymentStats.overdue > 0 && (
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="font-semibold text-red-900">
                  {paymentStats.overdue}
                </p>
                <p className="text-red-700 text-xs">Overdue</p>
              </div>
            )}

            {paymentStats.due > 0 && (
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="font-semibold text-yellow-900">
                  {paymentStats.due}
                </p>
                <p className="text-yellow-700 text-xs">Due Soon</p>
              </div>
            )}

            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-900">
                {paymentStats.upcoming}
              </p>
              <p className="text-blue-700 text-xs">Upcoming</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vendors, descriptions, or payment methods..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="due">Due Soon</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Options */}
            <Select
              value={sortBy}
              onValueChange={(value: SortOption) => {
                setSortBy(value);
                setSortDesc(true);
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Direction */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDesc((prev) => !prev)}
              className="whitespace-nowrap"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {sortDesc ? 'Desc' : 'Asc'}
            </Button>

            {/* Clear Filters */}
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      <Card>
        <CardContent className="p-0">
          {filteredAndSortedPayments.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <CalendarIcon className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'No matching payments found'
                  : 'No payments scheduled'}
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? "Try adjusting your search terms or filter criteria to find what you're looking for."
                  : "When you add payment schedules for your wedding vendors, they'll appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAndSortedPayments.map((payment, index) => {
                const daysUntilDue = getDaysUntilDue(payment.due_date);
                const weddingUrgency = getWeddingUrgency(payment);
                const isExpanded = expandedPayment === payment.id;

                return (
                  <div
                    key={payment.id}
                    data-testid={`payment-item-${payment.id}`}
                    className={cn(
                      'p-6 transition-all duration-200 cursor-pointer',
                      'hover:bg-gray-50 focus-within:bg-gray-50',
                      // Status-based styling
                      {
                        upcoming: 'border-l-4 border-l-blue-500',
                        due: 'border-l-4 border-l-yellow-500',
                        overdue: 'border-l-4 border-l-red-500 bg-red-50/30',
                        paid: 'border-l-4 border-l-green-500 opacity-75',
                      }[payment.status],
                      // Wedding urgency highlighting
                      weddingUrgency?.level === 'critical' &&
                        'bg-red-50/50 border-l-red-600',
                    )}
                    onClick={() => handlePaymentClick(payment)}
                  >
                    {/* Wedding Urgency Alert */}
                    {weddingUrgency && (
                      <div
                        className={cn(
                          'flex items-center space-x-2 mb-4 p-2 rounded-lg text-xs font-medium',
                          {
                            critical:
                              'bg-red-100 border border-red-200 text-red-800',
                            high: 'bg-yellow-100 border border-yellow-200 text-yellow-800',
                            medium:
                              'bg-blue-100 border border-blue-200 text-blue-800',
                          }[weddingUrgency.level],
                        )}
                      >
                        <span>{weddingUrgency.message}</span>
                      </div>
                    )}

                    {/* Main Payment Information */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <div className="shrink-0">
                          <PaymentStatusIndicator
                            status={payment.status}
                            size="lg"
                            showIcon
                            className="mt-1"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-lg text-gray-900 truncate mb-1">
                                {payment.vendor_name}
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {payment.description}
                              </p>
                            </div>

                            <div className="ml-4 text-right shrink-0">
                              <p className="font-bold text-xl text-gray-900">
                                {formatAmount(payment.amount, payment.currency)}
                              </p>
                              <PaymentStatusIndicator
                                status={payment.status}
                                size="sm"
                                showText
                                className="mt-1"
                              />
                            </div>
                          </div>

                          {/* Due Date & Status Info */}
                          <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span>Due {formatDate(payment.due_date)}</span>
                            </div>

                            {payment.status !== 'paid' && (
                              <span
                                className={cn(
                                  'font-medium px-2 py-1 rounded-full text-xs',
                                  daysUntilDue < 0
                                    ? 'bg-red-100 text-red-700'
                                    : daysUntilDue <= 7
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-blue-100 text-blue-700',
                                )}
                              >
                                {daysUntilDue < 0
                                  ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue`
                                  : daysUntilDue === 0
                                    ? 'Due today'
                                    : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} remaining`}
                              </span>
                            )}

                            {payment.status === 'paid' && payment.paid_date && (
                              <span className="bg-green-100 text-green-700 font-medium px-2 py-1 rounded-full text-xs">
                                Paid {formatDate(payment.paid_date, 'MMM dd')}
                              </span>
                            )}

                            {payment.payment_method && (
                              <div className="flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4" />
                                <span className="capitalize">
                                  {payment.payment_method.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {payment.status !== 'paid' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkPaid(payment);
                                }}
                                className={cn(
                                  'text-sm font-medium',
                                  payment.status === 'overdue'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white',
                                )}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Mark as Paid
                              </Button>
                            )}

                            {payment.invoice_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(payment.invoice_url, '_blank');
                                }}
                                className="text-sm"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Invoice
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement contact functionality
                              }}
                              className="text-sm"
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        {/* Payment Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Vendor:</span>
                              <span className="font-medium text-gray-900">
                                {payment.vendor_name}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Due Date:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(payment.due_date).toLocaleDateString(
                                  'en-GB',
                                  {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  },
                                )}
                              </span>
                            </div>

                            {payment.payment_method && (
                              <div className="flex items-center space-x-2">
                                <CreditCard className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Method:</span>
                                <span className="font-medium text-gray-900">
                                  {payment.payment_method}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                              <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                              <span className="text-gray-600">
                                Description:
                              </span>
                              <span className="font-medium text-gray-900 flex-1">
                                {payment.description}
                              </span>
                            </div>

                            {weddingDate && (
                              <div className="text-xs text-gray-500">
                                {PaymentStatusUtils.getWeddingContextMessage(
                                  payment.status,
                                  payment.vendor_name,
                                  Math.ceil(
                                    (new Date(weddingDate).getTime() -
                                      Date.now()) /
                                      (1000 * 60 * 60 * 24),
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Extended Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex space-x-2">
                            {payment.invoice_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(payment.invoice_url, '_blank');
                                }}
                                className="text-xs"
                              >
                                📄 View Invoice
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement vendor contact functionality
                              }}
                              className="text-xs"
                            >
                              📞 Contact Vendor
                            </Button>
                          </div>

                          {payment.status !== 'paid' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkPaid(payment.id);
                              }}
                              className={cn(
                                'text-sm',
                                payment.status === 'overdue'
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-primary-600 hover:bg-primary-700',
                              )}
                            >
                              {payment.status === 'overdue'
                                ? '⚠️ Mark as Paid'
                                : 'Mark as Paid'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tap to expand hint for mobile */}
                    <div className="mt-2 text-center md:hidden">
                      <span className="text-xs text-gray-400">
                        {isExpanded ? 'Tap to collapse' : 'Tap for details'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UpcomingPaymentsList;
