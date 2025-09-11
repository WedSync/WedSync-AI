/**
 * Payment Calendar Types - WS-165
 * Comprehensive type definitions for payment schedule management
 */

// Core payment schedule item
export interface PaymentScheduleItem {
  id: string;
  due_date: string; // ISO date string
  vendor_id: string;
  vendor_name: string;
  amount: number; // Amount in cents (following Stripe pattern)
  currency: string; // ISO currency code (GBP, USD, EUR)
  status: PaymentStatus;
  description: string;
  budget_category_id: string;
  payment_method?: PaymentMethod;
  invoice_url?: string;
  paid_date?: string; // ISO date string
  confirmation_number?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Payment status enumeration
export type PaymentStatus =
  | 'upcoming' // Payment scheduled for future date
  | 'due' // Payment due within 7 days
  | 'overdue' // Payment past due date
  | 'paid'; // Payment completed

// Payment method types for UK market
export type PaymentMethod =
  | 'bank_transfer'
  | 'card'
  | 'cash'
  | 'cheque'
  | 'bacs'
  | 'faster_payment'
  | 'other';

// Payment priority levels for wedding planning
export type PaymentUrgencyLevel =
  | 'low' // Standard upcoming payment
  | 'medium' // Due within 30 days
  | 'high' // Due within 7 days or wedding approaching
  | 'critical'; // Overdue or critical to wedding timeline

// Calendar-specific types
export interface CalendarDay {
  date: Date;
  dateString?: string; // ISO date string for current month days
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  payments: PaymentScheduleItem[];
}

// Form data for marking payments as paid
export interface MarkAsPaidFormData {
  paymentId: string;
  paidDate: string; // ISO date string
  paymentMethod: PaymentMethod;
  notes: string;
  confirmationNumber?: string;
}

// Component prop interfaces
export interface PaymentCalendarProps {
  payments: PaymentScheduleItem[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  loading: boolean;
  className?: string;
}

export interface UpcomingPaymentsListProps {
  payments: PaymentScheduleItem[];
  onMarkPaid: (paymentId: string) => void;
  onPaymentUpdate?: (payment: PaymentScheduleItem) => void;
  loading: boolean;
  weddingDate?: string;
  className?: string;
}

export interface PaymentStatusIndicatorProps {
  status: PaymentStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export interface MarkAsPaidModalProps {
  payment: PaymentScheduleItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: MarkAsPaidFormData) => Promise<void>;
  loading: boolean;
  className?: string;
}

// API response types
export interface PaymentScheduleResponse {
  payments: PaymentScheduleItem[];
  totalAmount: number;
  overdueCount: number;
  dueCount: number;
  upcomingCount: number;
  paidCount: number;
  weddingDate?: string;
  lastUpdated: string;
}

export interface MarkAsPaidResponse {
  success: boolean;
  payment: PaymentScheduleItem;
  message: string;
}

// Error handling types
export interface PaymentError {
  type: 'network' | 'validation' | 'api' | 'permission' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userMessage: string;
  recovery?: () => Promise<void>;
  weddingImpact: 'none' | 'minor' | 'major' | 'critical';
}

export interface FormValidationError {
  field: string;
  message: string;
  code?: string;
}

// Wedding context types
export interface WeddingContext {
  weddingDate: string;
  daysUntilWedding: number;
  isWeddingClose: boolean; // Within 30 days
  totalVendors: number;
  budgetCategories: string[];
}

export interface WeddingPaymentUrgency {
  level: PaymentUrgencyLevel;
  message: string;
  actionRequired: boolean;
  timeframe?: string;
}

// Payment summary statistics
export interface PaymentSummaryStats {
  total: {
    amount: number;
    count: number;
  };
  byStatus: {
    upcoming: { amount: number; count: number };
    due: { amount: number; count: number };
    overdue: { amount: number; count: number };
    paid: { amount: number; count: number };
  };
  byTimeframe: {
    dueToday: number;
    dueThisWeek: number;
    dueThisMonth: number;
    overdue: number;
  };
  weddingContext?: {
    daysUntilWedding: number;
    paymentsAfterWedding: number;
    criticalPayments: number;
  };
}

// Filter and search types
export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus | 'all' | 'active';
  dateRange?: 'all' | 'week' | 'month' | 'overdue';
  vendor?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentSortOptions {
  field: 'due_date' | 'amount' | 'vendor_name' | 'status' | 'priority';
  direction: 'asc' | 'desc';
}

// Hook return types
export interface UseMarkAsPaidReturn {
  isModalOpen: boolean;
  selectedPayment: PaymentScheduleItem | null;
  loading: boolean;
  openModal: (payment: PaymentScheduleItem) => void;
  closeModal: () => void;
  confirmPayment: (data: MarkAsPaidFormData) => Promise<void>;
}

export interface UsePaymentCalendarReturn {
  payments: PaymentScheduleItem[];
  selectedDate: string;
  loading: boolean;
  error: string;
  summary: PaymentSummaryStats;
  filters: PaymentFilters;
  setSelectedDate: (date: string) => void;
  setFilters: (filters: PaymentFilters) => void;
  refreshPayments: () => Promise<void>;
  markAsPaid: (data: MarkAsPaidFormData) => Promise<void>;
}

// Database table interfaces (for backend integration)
export interface PaymentScheduleTable {
  id: string;
  organization_id: string;
  vendor_id: string;
  amount: number;
  currency: string;
  due_date: Date;
  status: PaymentStatus;
  description: string;
  budget_category_id: string;
  payment_method: PaymentMethod | null;
  invoice_url: string | null;
  paid_date: Date | null;
  confirmation_number: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

// Vendor integration types
export interface VendorPaymentInfo {
  vendor_id: string;
  vendor_name: string;
  vendor_email: string;
  vendor_phone?: string;
  payment_preferences: {
    methods: PaymentMethod[];
    currency: string;
    terms: string;
    late_fee_policy?: string;
  };
  contract_amount: number;
  deposit_amount?: number;
  final_payment_due: string;
  payment_schedule: PaymentScheduleItem[];
}

// Budget category integration
export interface BudgetCategoryIntegration {
  category_id: string;
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  pending_payments: PaymentScheduleItem[];
  remaining_budget: number;
  is_over_budget: boolean;
  recommended_actions?: string[];
}

// Notification and reminder types
export interface PaymentReminder {
  id: string;
  payment_id: string;
  reminder_date: Date;
  reminder_type: 'email' | 'sms' | 'push' | 'in_app';
  sent: boolean;
  message_template: string;
  wedding_context: WeddingContext;
}

// Security and audit types
export interface PaymentAuditLog {
  id: string;
  payment_id: string;
  action: 'created' | 'updated' | 'marked_paid' | 'status_changed' | 'deleted';
  user_id: string;
  timestamp: Date;
  old_values?: Partial<PaymentScheduleItem>;
  new_values?: Partial<PaymentScheduleItem>;
  ip_address: string;
  user_agent: string;
  wedding_id: string;
}

// Component state types
export interface PaymentCalendarState {
  currentMonth: Date;
  selectedDate: string;
  payments: PaymentScheduleItem[];
  loading: boolean;
  error: string | null;
  filters: PaymentFilters;
  touchState: {
    touchStart: { x: number; y: number } | null;
    touchEnd: { x: number; y: number } | null;
  };
}

export interface PaymentListState {
  searchTerm: string;
  statusFilter: string;
  expandedPayment: string | null;
  sortBy: PaymentSortOptions;
}

// Utility type helpers
export type PaymentDisplayProps = {
  payments: PaymentScheduleItem[];
};

export type PaymentSecurityProps = {
  sanitizePaymentData: (payment: PaymentScheduleItem) => PaymentScheduleItem;
  validatePaymentAccess: (paymentId: string, userId: string) => boolean;
};

// Wedding-specific utility types
export type WeddingPaymentValidation = {
  isPaymentDateValid: (dueDate: string, weddingDate: string) => boolean;
  isAmountReasonable: (amount: number, category: string) => boolean;
  isVendorValid: (vendorId: string, weddingId: string) => boolean;
};
