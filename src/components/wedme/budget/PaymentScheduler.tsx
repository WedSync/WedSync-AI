'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  Bell,
  CreditCard,
  Filter,
  Search,
  Download,
  Send,
  MoreHorizontal,
  CalendarDays,
  Banknote,
  TrendingUp,
  Target,
  Users,
} from 'lucide-react';
import {
  format,
  addDays,
  isPast,
  isBefore,
  isAfter,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface PaymentSchedule {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_contact?: string;
  contract_amount: number;
  payment_amount: number;
  payment_type: 'deposit' | 'milestone' | 'final' | 'installment';
  due_date: Date;
  paid_date?: Date;
  status: 'pending' | 'overdue' | 'paid' | 'scheduled' | 'cancelled';
  payment_method?: 'card' | 'bank_transfer' | 'check' | 'cash';
  notes?: string;
  reminder_sent?: boolean;
  late_fee?: number;
  category: string;
  milestone_description?: string;
  contract_id?: string;
  payment_terms?: string;
  auto_pay?: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PaymentReminder {
  id: string;
  payment_id: string;
  reminder_date: Date;
  reminder_type: 'email' | 'sms' | 'push' | 'in_app';
  sent: boolean;
  message?: string;
}

interface VendorContact {
  id: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  payment_terms?: string;
  preferred_method?: string;
}

interface PaymentSchedulerProps {
  clientId: string;
  className?: string;
  onPaymentUpdate?: (payment: PaymentSchedule) => void;
  initialFilter?: 'all' | 'upcoming' | 'overdue' | 'paid';
}

const PAYMENT_TYPES = [
  { value: 'deposit', label: 'Deposit', color: 'bg-blue-500' },
  { value: 'milestone', label: 'Milestone', color: 'bg-purple-500' },
  { value: 'installment', label: 'Installment', color: 'bg-green-500' },
  { value: 'final', label: 'Final Payment', color: 'bg-orange-500' },
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Banknote },
  { value: 'check', label: 'Check', icon: Calendar },
  { value: 'cash', label: 'Cash', icon: DollarSign },
];

export function PaymentScheduler({
  clientId,
  className,
  onPaymentUpdate,
  initialFilter = 'all',
}: PaymentSchedulerProps) {
  // State
  const [payments, setPayments] = useState<PaymentSchedule[]>([]);
  const [vendors, setVendors] = useState<VendorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentSchedule | null>(
    null,
  );
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showReminders, setShowReminders] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'timeline'>(
    'list',
  );

  // Form state
  const [formData, setFormData] = useState({
    vendor_id: '',
    vendor_name: '',
    contract_amount: 0,
    payment_amount: 0,
    payment_type: 'deposit' as PaymentSchedule['payment_type'],
    due_date: '',
    payment_method: 'card' as PaymentSchedule['payment_method'],
    notes: '',
    category: '',
    milestone_description: '',
    payment_terms: '',
    auto_pay: false,
  });

  // Load data
  useEffect(() => {
    loadPayments();
    loadVendors();
  }, [clientId]);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/budget/payments?client_id=${clientId}`,
      );
      if (!response.ok) throw new Error('Failed to load payments');

      const data = await response.json();
      setPayments(
        data.payments.map((p: any) => ({
          ...p,
          due_date: new Date(p.due_date),
          paid_date: p.paid_date ? new Date(p.paid_date) : undefined,
          created_at: new Date(p.created_at),
          updated_at: new Date(p.updated_at),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch(`/api/vendors?client_id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  };

  // Filtered and sorted payments
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Apply status filter
    switch (selectedFilter) {
      case 'upcoming':
        filtered = filtered.filter(
          (p) => p.status === 'pending' && !isPast(p.due_date),
        );
        break;
      case 'overdue':
        filtered = filtered.filter(
          (p) => p.status === 'pending' && isPast(p.due_date),
        );
        break;
      case 'paid':
        filtered = filtered.filter((p) => p.status === 'paid');
        break;
      default:
        // 'all' - no filter
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.vendor_name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.milestone_description?.toLowerCase().includes(query) ||
          p.notes?.toLowerCase().includes(query),
      );
    }

    // Sort by due date (overdue first, then by date)
    return filtered.sort((a, b) => {
      const aOverdue = isPast(a.due_date) && a.status === 'pending';
      const bOverdue = isPast(b.due_date) && b.status === 'pending';

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      return a.due_date.getTime() - b.due_date.getTime();
    });
  }, [payments, selectedFilter, searchQuery]);

  // Payment statistics
  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + p.payment_amount, 0);
    const paid = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.payment_amount, 0);
    const pending = payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.payment_amount, 0);
    const overdue = payments
      .filter((p) => p.status === 'pending' && isPast(p.due_date))
      .reduce((sum, p) => sum + p.payment_amount, 0);
    const upcoming30 = payments
      .filter(
        (p) =>
          p.status === 'pending' &&
          isBefore(p.due_date, addDays(new Date(), 30)) &&
          !isPast(p.due_date),
      )
      .reduce((sum, p) => sum + p.payment_amount, 0);

    return {
      total,
      paid,
      pending,
      overdue,
      upcoming30,
      overdueCount: payments.filter(
        (p) => p.status === 'pending' && isPast(p.due_date),
      ).length,
      upcomingCount: payments.filter(
        (p) =>
          p.status === 'pending' &&
          isBefore(p.due_date, addDays(new Date(), 30)) &&
          !isPast(p.due_date),
      ).length,
    };
  }, [payments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const paymentData = {
        ...formData,
        client_id: clientId,
        due_date: new Date(formData.due_date),
        status: 'pending' as const,
      };

      const url = editingPayment
        ? `/api/budget/payments/${editingPayment.id}`
        : '/api/budget/payments';

      const method = editingPayment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) throw new Error('Failed to save payment');

      await loadPayments();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    }
  };

  const markAsPaid = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/budget/payments/${paymentId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paid_date: new Date(),
        }),
      });

      if (!response.ok) throw new Error('Failed to mark payment as paid');

      await loadPayments();
      onPaymentUpdate?.(payments.find((p) => p.id === paymentId)!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment schedule?'))
      return;

    try {
      const response = await fetch(`/api/budget/payments/${paymentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete payment');

      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  };

  const sendReminder = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/budget/payments/${paymentId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_type: 'email',
          message: 'Payment reminder for upcoming wedding vendor payment',
        }),
      });

      if (!response.ok) throw new Error('Failed to send reminder');

      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminder');
    }
  };

  const bulkAction = async (action: string) => {
    if (selectedPayments.length === 0) return;

    try {
      const response = await fetch('/api/budget/payments/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_ids: selectedPayments,
          action,
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} payments`);

      await loadPayments();
      setSelectedPayments([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} payments`,
      );
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      vendor_name: '',
      contract_amount: 0,
      payment_amount: 0,
      payment_type: 'deposit',
      due_date: '',
      payment_method: 'card',
      notes: '',
      category: '',
      milestone_description: '',
      payment_terms: '',
      auto_pay: false,
    });
    setEditingPayment(null);
    setShowForm(false);
  };

  const startEdit = (payment: PaymentSchedule) => {
    setFormData({
      vendor_id: payment.vendor_id,
      vendor_name: payment.vendor_name,
      contract_amount: payment.contract_amount,
      payment_amount: payment.payment_amount,
      payment_type: payment.payment_type,
      due_date: format(payment.due_date, 'yyyy-MM-dd'),
      payment_method: payment.payment_method || 'card',
      notes: payment.notes || '',
      category: payment.category,
      milestone_description: payment.milestone_description || '',
      payment_terms: payment.payment_terms || '',
      auto_pay: payment.auto_pay || false,
    });
    setEditingPayment(payment);
    setShowForm(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (payment: PaymentSchedule) => {
    if (payment.status === 'paid') return 'text-success-600 bg-success-50';
    if (payment.status === 'pending' && isPast(payment.due_date))
      return 'text-error-600 bg-error-50';
    if (
      payment.status === 'pending' &&
      isBefore(payment.due_date, addDays(new Date(), 7))
    )
      return 'text-warning-600 bg-warning-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusIcon = (payment: PaymentSchedule) => {
    if (payment.status === 'paid') return <CheckCircle className="w-4 h-4" />;
    if (payment.status === 'pending' && isPast(payment.due_date))
      return <XCircle className="w-4 h-4" />;
    if (
      payment.status === 'pending' &&
      isBefore(payment.due_date, addDays(new Date(), 7))
    )
      return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Scheduler
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage vendor payments and track due dates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReminders(!showReminders)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Reminders
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Payment
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error-600" />
              <span className="text-sm text-error-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">
                  Total Payments
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(stats.total)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-success-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-xs text-success-600 font-medium">Paid</p>
                <p className="text-lg font-bold text-success-900">
                  {formatCurrency(stats.paid)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-warning-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-xs text-warning-600 font-medium">
                  Due in 30 days
                </p>
                <p className="text-lg font-bold text-warning-900">
                  {formatCurrency(stats.upcoming30)}
                </p>
                <p className="text-xs text-warning-600">
                  {stats.upcomingCount} payments
                </p>
              </div>
            </div>
          </div>

          <div className="bg-error-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-error-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-error-600" />
              </div>
              <div>
                <p className="text-xs text-error-600 font-medium">Overdue</p>
                <p className="text-lg font-bold text-error-900">
                  {formatCurrency(stats.overdue)}
                </p>
                <p className="text-xs text-error-600">
                  {stats.overdueCount} payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'paid', label: 'Paid' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key as any)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    selectedFilter === filter.key
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {selectedPayments.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bulkAction('send_reminder')}
                  className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Send Reminders ({selectedPayments.length})
                </button>
                <button
                  onClick={() => bulkAction('mark_paid')}
                  className="px-3 py-2 text-xs font-medium text-success-700 bg-success-100 rounded-lg hover:bg-success-200 transition-colors"
                >
                  Mark Paid
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="p-6">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No payments found</p>
            <p className="text-sm text-gray-400">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add your first payment schedule'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayments([
                            ...selectedPayments,
                            payment.id,
                          ]);
                        } else {
                          setSelectedPayments(
                            selectedPayments.filter((id) => id !== payment.id),
                          );
                        }
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />

                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        PAYMENT_TYPES.find(
                          (t) => t.value === payment.payment_type,
                        )?.color || 'bg-gray-400',
                      )}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {payment.vendor_name}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {
                            PAYMENT_TYPES.find(
                              (t) => t.value === payment.payment_type,
                            )?.label
                          }
                        </span>
                        <div
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                            getStatusColor(payment),
                          )}
                        >
                          {getStatusIcon(payment)}
                          <span className="capitalize">{payment.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium">
                          {formatCurrency(payment.payment_amount)}
                        </span>
                        <span>
                          Due: {format(payment.due_date, 'MMM dd, yyyy')}
                        </span>
                        {payment.category && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {payment.category}
                          </span>
                        )}
                      </div>

                      {payment.milestone_description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {payment.milestone_description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-3">
                    {payment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => sendReminder(payment.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Send reminder"
                        >
                          <Bell className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => markAsPaid(payment.id)}
                          className="p-2 text-gray-400 hover:text-success-600 hover:bg-success-50 rounded-md transition-colors"
                          title="Mark as paid"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => startEdit(payment)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="Edit payment"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deletePayment(payment.id)}
                      className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-md transition-colors"
                      title="Delete payment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPayment ? 'Edit Payment' : 'Add Payment'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Vendor Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => {
                      const vendor = vendors.find(
                        (v) => v.id === e.target.value,
                      );
                      setFormData((prev) => ({
                        ...prev,
                        vendor_id: e.target.value,
                        vendor_name: vendor?.vendor_name || '',
                        payment_terms: vendor?.payment_terms || '',
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Venue, Catering"
                    required
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_type: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {PAYMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.contract_amount || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contract_amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.payment_amount || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Due Date and Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        due_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Milestone Description */}
              {formData.payment_type === 'milestone' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Milestone Description
                  </label>
                  <input
                    type="text"
                    value={formData.milestone_description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        milestone_description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., After venue walkthrough"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Auto Pay Option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_pay"
                  checked={formData.auto_pay}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      auto_pay: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="auto_pay" className="text-sm text-gray-700">
                  Set up automatic payment (where available)
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingPayment ? 'Update' : 'Add'} Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
