export interface PaymentScheduleItem {
  id: string;
  due_date: string;
  vendor_id: string;
  vendor_name: string;
  amount: number;
  currency: string;
  status: 'upcoming' | 'due' | 'overdue' | 'paid';
  description: string;
  budget_category_id: string;
  payment_method?: string;
  invoice_url?: string;
  paid_date?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentCalendarData {
  payments: PaymentScheduleItem[];
  totalAmount: number;
  overdueCount: number;
  dueCount: number;
  weddingDate?: string;
}

export interface MarkAsPaidFormData {
  paymentId: string;
  paidDate: string;
  paymentMethod: string;
  notes: string;
  confirmationNumber?: string;
}

export interface PaymentCalendarProps {
  payments: PaymentScheduleItem[];
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  onPaymentUpdate?: (
    paymentId: string,
    updates: Partial<PaymentScheduleItem>,
  ) => void;
  loading?: boolean;
  className?: string;
}

export interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  payments: PaymentScheduleItem[];
  hasPayments: boolean;
}

export interface PaymentSummary {
  totalPending: number;
  overdueAmount: number;
  dueThisWeek: number;
  totalPayments: number;
}
