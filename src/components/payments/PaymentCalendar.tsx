'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isValid,
} from 'date-fns';
import type {
  PaymentScheduleItem,
  PaymentCalendarProps,
  CalendarDay,
  PaymentSummary,
} from '@/types/payment';
import {
  PaymentStatusIndicator,
  PaymentStatusUtils,
} from './PaymentStatusIndicator';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FilterOptions {
  status: 'all' | 'upcoming' | 'due' | 'overdue' | 'paid';
  vendor: string;
  amount: 'all' | 'high' | 'medium' | 'low';
}

export function PaymentCalendar({
  payments,
  selectedDate,
  onDateSelect,
  onPaymentUpdate,
  loading = false,
  className,
}: PaymentCalendarProps) {
  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    vendor: '',
    amount: 'all',
  });

  // Parse selectedDate safely
  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    const parsed = parseISO(selectedDate);
    return isValid(parsed) ? parsed : null;
  }, [selectedDate]);

  // Filter payments based on search and filters
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          payment.vendor_name.toLowerCase().includes(searchLower) ||
          payment.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && payment.status !== filters.status) {
        return false;
      }

      // Vendor filter
      if (
        filters.vendor &&
        !payment.vendor_name
          .toLowerCase()
          .includes(filters.vendor.toLowerCase())
      ) {
        return false;
      }

      // Amount filter
      if (filters.amount !== 'all') {
        const threshold =
          filters.amount === 'high'
            ? 5000
            : filters.amount === 'medium'
              ? 1000
              : 500;
        if (filters.amount === 'high' && payment.amount < threshold)
          return false;
        if (
          filters.amount === 'medium' &&
          (payment.amount >= 5000 || payment.amount < 1000)
        )
          return false;
        if (filters.amount === 'low' && payment.amount >= 1000) return false;
      }

      return true;
    });
  }, [payments, searchTerm, filters]);

  // Calculate payment summary
  const paymentSummary = useMemo((): PaymentSummary => {
    const totalPending = filteredPayments
      .filter((p) => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const overdueAmount = filteredPayments
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0);

    const dueThisWeek = filteredPayments
      .filter((p) => {
        if (p.status === 'paid') return false;
        const dueDate = parseISO(p.due_date);
        if (!isValid(dueDate)) return false;
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return dueDate <= weekFromNow;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPending,
      overdueAmount,
      dueThisWeek,
      totalPayments: filteredPayments.length,
    };
  }, [filteredPayments]);

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding days for the calendar grid
    const startDay = start.getDay();
    const endDay = end.getDay();

    // Previous month padding
    const prevMonthEnd = new Date(start);
    prevMonthEnd.setDate(0);
    const prevDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const day = new Date(prevMonthEnd);
      day.setDate(prevMonthEnd.getDate() - i);
      prevDays.push(day);
    }

    // Next month padding
    const nextDays = [];
    const nextMonthStart = new Date(end);
    nextMonthStart.setDate(end.getDate() + 1);
    for (let i = 1; i < 7 - endDay; i++) {
      const day = new Date(nextMonthStart);
      day.setDate(nextMonthStart.getDate() + i - 1);
      nextDays.push(day);
    }

    const allDays = [...prevDays, ...days, ...nextDays];

    return allDays.map((date) => {
      const dayPayments = filteredPayments.filter((payment) => {
        const paymentDate = parseISO(payment.due_date);
        return isValid(paymentDate) && isSameDay(paymentDate, date);
      });

      return {
        date: format(date, 'yyyy-MM-dd'),
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isToday(date),
        isSelected: selectedDateObj ? isSameDay(date, selectedDateObj) : false,
        payments: dayPayments,
        hasPayments: dayPayments.length > 0,
      };
    });
  }, [currentMonth, filteredPayments, selectedDateObj]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentMonth(today);
    if (onDateSelect) {
      onDateSelect(format(today, 'yyyy-MM-dd'));
    }
  }, [onDateSelect]);

  // Date selection handler
  const handleDateClick = useCallback(
    (day: CalendarDay) => {
      if (onDateSelect) {
        onDateSelect(day.date);
      }
    },
    [onDateSelect],
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      vendor: '',
      amount: 'all',
    });
    setSearchTerm('');
  }, []);

  // Get unique vendors for filter dropdown
  const vendors = useMemo(() => {
    const uniqueVendors = [...new Set(payments.map((p) => p.vendor_name))];
    return uniqueVendors.sort();
  }, [payments]);

  // Critical payments requiring immediate attention
  const criticalPayments = useMemo(() => {
    return payments.filter((p) => p.status === 'overdue').slice(0, 3);
  }, [payments]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading payment calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Critical Alerts */}
      {criticalPayments.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Urgent:</strong> You have {criticalPayments.length} overdue
            payment{criticalPayments.length > 1 ? 's' : ''} requiring immediate
            attention.
            <div className="mt-2 space-y-1">
              {criticalPayments.map((payment) => (
                <div key={payment.id} className="text-sm">
                  • {payment.vendor_name} - ${payment.amount.toLocaleString()}{' '}
                  (Due {format(parseISO(payment.due_date), 'MMM dd')})
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Navigation and Summary */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Navigation */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  disabled={loading}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <CardTitle className="text-lg font-semibold min-w-[140px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  disabled={loading}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  disabled={loading}
                  className="text-xs"
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Payment Summary */}
        <Card className="lg:w-80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Payment Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Total Pending</span>
                <p className="font-semibold text-lg">
                  ${paymentSummary.totalPending.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Due This Week</span>
                <p className="font-semibold text-lg text-amber-600">
                  ${paymentSummary.dueThisWeek.toLocaleString()}
                </p>
              </div>
            </div>

            {paymentSummary.overdueAmount > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-600 font-medium text-sm">
                  Overdue: ${paymentSummary.overdueAmount.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vendors or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status}
              onValueChange={(value: FilterOptions['status']) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
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

            {/* Vendor Filter */}
            <Select
              value={filters.vendor}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, vendor: value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>
                    {vendor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Amount Filter */}
            <Select
              value={filters.amount}
              onValueChange={(value: FilterOptions['amount']) =>
                setFilters((prev) => ({ ...prev, amount: value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="high">$5,000+</SelectItem>
                <SelectItem value="medium">$1,000-4,999</SelectItem>
                <SelectItem value="low">Under $1,000</SelectItem>
              </SelectContent>
            </Select>

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

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <button
                key={day.date}
                onClick={() => handleDateClick(day)}
                disabled={loading}
                className={cn(
                  'min-h-[80px] p-2 border-r border-b flex flex-col items-start justify-start',
                  'hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
                  !day.isCurrentMonth && 'text-gray-400 bg-gray-50',
                  day.isToday && 'bg-blue-50 border-blue-200',
                  day.isSelected && 'bg-primary-50 border-primary-200',
                  day.hasPayments && 'border-l-4 border-l-amber-400',
                  // Remove right border for last column
                  (index + 1) % 7 === 0 && 'border-r-0',
                )}
                aria-label={`${format(parseISO(day.date), 'MMMM d, yyyy')}${day.hasPayments ? ` - ${day.payments.length} payment${day.payments.length > 1 ? 's' : ''}` : ''}`}
              >
                {/* Date Number */}
                <span
                  className={cn(
                    'text-sm font-medium mb-1',
                    day.isToday && 'text-blue-600',
                    day.isSelected && 'text-primary-600',
                  )}
                >
                  {format(parseISO(day.date), 'd')}
                </span>

                {/* Payment Indicators */}
                {day.hasPayments && (
                  <div className="w-full space-y-1">
                    {day.payments.slice(0, 2).map((payment) => (
                      <div
                        key={payment.id}
                        className={cn(
                          'text-xs px-1 py-0.5 rounded truncate w-full text-left',
                          'bg-white border shadow-sm',
                        )}
                        title={`${payment.vendor_name} - $${payment.amount.toLocaleString()}`}
                      >
                        <div className="flex items-center gap-1">
                          <PaymentStatusIndicator
                            status={payment.status}
                            size="sm"
                            className="shrink-0"
                          />
                          <span className="truncate font-medium">
                            {payment.vendor_name}
                          </span>
                        </div>
                      </div>
                    ))}

                    {day.payments.length > 2 && (
                      <div className="text-xs text-gray-500 font-medium px-1">
                        +{day.payments.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span>Due Soon</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-400 rounded-sm" />
              <span>Has Payments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentCalendar;
