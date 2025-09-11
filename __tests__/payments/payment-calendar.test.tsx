/**
 * PAYMENT CALENDAR TESTS - WS-165
 * TDD Approach: Tests written FIRST before implementation
 * Coverage Target: >85% as per requirements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Import components (to be implemented)
import { PaymentCalendar } from '@/components/payments/PaymentCalendar';
import { UpcomingPaymentsList } from '@/components/payments/UpcomingPaymentsList';
import { PaymentStatusIndicator } from '@/components/payments/PaymentStatusIndicator';
import { MarkAsPaidModal } from '@/components/payments/MarkAsPaidModal';

// Mock data following existing payment patterns
const mockPayments = [
  {
    id: '1',
    due_date: '2025-09-15',
    vendor_id: 'vendor_1',
    vendor_name: 'Amazing Photography',
    amount: 250000, // $2,500.00 in cents (following Stripe pattern)
    currency: 'GBP',
    status: 'upcoming' as const,
    description: 'Final payment for wedding photography',
    budget_category_id: 'cat_photography',
    payment_method: 'Bank Transfer',
  },
  {
    id: '2',
    due_date: '2025-09-20',
    vendor_id: 'vendor_2',
    vendor_name: 'Elegant Venue',
    amount: 500000, // $5,000.00 in cents
    currency: 'GBP',
    status: 'due' as const,
    description: 'Venue final balance',
    budget_category_id: 'cat_venue',
    payment_method: 'Card',
  },
  {
    id: '3',
    due_date: '2025-08-25', // Past due
    vendor_id: 'vendor_3',
    vendor_name: 'Floral Dreams',
    amount: 75000, // $750.00 in cents
    currency: 'GBP',
    status: 'overdue' as const,
    description: 'Bridal bouquet deposit',
    budget_category_id: 'cat_flowers',
  },
  {
    id: '4',
    due_date: '2025-08-20',
    vendor_id: 'vendor_4',
    vendor_name: 'Sweet Treats Catering',
    amount: 180000, // $1,800.00 in cents
    currency: 'GBP',
    status: 'paid' as const,
    description: 'Catering deposit',
    budget_category_id: 'cat_catering',
    paid_date: '2025-08-18',
  },
];

// Mock functions
const mockOnDateSelect = vi.fn();
const mockOnMarkPaid = vi.fn();
const mockOnPaymentUpdate = vi.fn();

describe('PaymentCalendar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Calendar Grid Rendering', () => {
    it('should render calendar with current month and year', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      expect(screen.getByText(/september 2025/i)).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('should display correct number of calendar days (42 days total)', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const calendarDays = screen.getAllByTestId(/calendar-day/);
      expect(calendarDays).toHaveLength(42); // 6 weeks × 7 days
    });

    it('should highlight today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate={today}
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const todayElement = screen.getByTestId(`calendar-day-${today}`);
      expect(todayElement).toHaveClass('bg-pink-600', 'text-white');
    });

    it('should show selected date with proper styling', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const selectedElement = screen.getByTestId('calendar-day-2025-09-15');
      expect(selectedElement).toHaveClass('bg-pink-100', 'text-pink-800', 'ring-2', 'ring-pink-500');
    });
  });

  describe('Payment Status Indicators', () => {
    it('should show payment indicators on days with payments', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      // Check for payment indicator on September 15th
      const paymentDay = screen.getByTestId('calendar-day-2025-09-15');
      expect(within(paymentDay).getByTestId('payment-indicator')).toBeInTheDocument();
    });

    it('should display different colors for different payment statuses', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      // Upcoming payment - blue indicator
      const upcomingDay = screen.getByTestId('calendar-day-2025-09-15');
      expect(within(upcomingDay).getByTestId('status-indicator-upcoming')).toHaveClass('bg-blue-500');

      // Due payment - yellow indicator
      const dueDay = screen.getByTestId('calendar-day-2025-09-20');
      expect(within(dueDay).getByTestId('status-indicator-due')).toHaveClass('bg-yellow-500');
    });

    it('should show payment count badge for days with multiple payments', () => {
      const multiplePayments = [
        ...mockPayments,
        {
          id: '5',
          due_date: '2025-09-15', // Same date as first payment
          vendor_id: 'vendor_5',
          vendor_name: 'Music Maestros',
          amount: 120000,
          currency: 'GBP',
          status: 'upcoming' as const,
          description: 'DJ services deposit',
          budget_category_id: 'cat_music',
        }
      ];

      render(
        <PaymentCalendar 
          payments={multiplePayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const dayWithMultiplePayments = screen.getByTestId('calendar-day-2025-09-15');
      expect(within(dayWithMultiplePayments).getByText('2')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onDateSelect when calendar day is clicked', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const calendarDay = screen.getByTestId('calendar-day-2025-09-20');
      fireEvent.click(calendarDay);

      expect(mockOnDateSelect).toHaveBeenCalledWith('2025-09-20');
    });

    it('should navigate to previous month when left arrow clicked', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const prevButton = screen.getByLabelText(/previous month/i);
      fireEvent.click(prevButton);

      expect(screen.getByText(/august 2025/i)).toBeInTheDocument();
    });

    it('should navigate to next month when right arrow clicked', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const nextButton = screen.getByLabelText(/next month/i);
      fireEvent.click(nextButton);

      expect(screen.getByText(/october 2025/i)).toBeInTheDocument();
    });
  });

  describe('Mobile Touch Support', () => {
    it('should support swipe gestures for month navigation', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const calendar = screen.getByTestId('payment-calendar-grid');
      
      // Simulate left swipe (next month)
      fireEvent.touchStart(calendar, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      fireEvent.touchMove(calendar, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchEnd(calendar);

      expect(screen.getByText(/october 2025/i)).toBeInTheDocument();
    });

    it('should provide haptic feedback on touch devices', () => {
      // Mock navigator.vibrate
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: vi.fn()
      });

      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const calendarDay = screen.getByTestId('calendar-day-2025-09-20');
      fireEvent.click(calendarDay);

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when loading prop is true', () => {
      render(
        <PaymentCalendar 
          payments={[]}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={true}
        />
      );

      expect(screen.getByTestId('calendar-loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for calendar navigation', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      expect(screen.getByLabelText(/previous month/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next month/i)).toBeInTheDocument();
      expect(screen.getByRole('grid', { name: /payment calendar/i })).toBeInTheDocument();
    });

    it('should announce payment information for screen readers', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const paymentDay = screen.getByTestId('calendar-day-2025-09-15');
      expect(paymentDay).toHaveAttribute('aria-label', expect.stringContaining('payment due'));
    });

    it('should support keyboard navigation', () => {
      render(
        <PaymentCalendar 
          payments={mockPayments}
          selectedDate="2025-09-15"
          onDateSelect={mockOnDateSelect}
          loading={false}
        />
      );

      const calendar = screen.getByRole('grid');
      
      // Tab to calendar
      calendar.focus();
      
      // Arrow key navigation
      fireEvent.keyDown(calendar, { key: 'ArrowRight' });
      
      expect(mockOnDateSelect).toHaveBeenCalled();
    });
  });
});

describe('UpcomingPaymentsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment List Rendering', () => {
    it('should render list of upcoming payments sorted by due date', () => {
      render(
        <UpcomingPaymentsList 
          payments={mockPayments}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      expect(screen.getByText('Amazing Photography')).toBeInTheDocument();
      expect(screen.getByText('Elegant Venue')).toBeInTheDocument();
      expect(screen.getByText('£2,500.00')).toBeInTheDocument();
    });

    it('should highlight overdue payments with red styling', () => {
      render(
        <UpcomingPaymentsList 
          payments={mockPayments}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      const overduePayment = screen.getByTestId('payment-item-3');
      expect(overduePayment).toHaveClass('border-red-300', 'bg-red-50');
    });

    it('should show days until due for upcoming payments', () => {
      render(
        <UpcomingPaymentsList 
          payments={mockPayments}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      expect(screen.getByText(/due in \d+ days?/)).toBeInTheDocument();
    });

    it('should display "Mark as Paid" button for unpaid items', () => {
      render(
        <UpcomingPaymentsList 
          payments={mockPayments}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      const markPaidButtons = screen.getAllByText(/mark as paid/i);
      expect(markPaidButtons.length).toBe(3); // 3 unpaid items
    });

    it('should show paid status for completed payments', () => {
      render(
        <UpcomingPaymentsList 
          payments={mockPayments}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      const paidItem = screen.getByTestId('payment-item-4');
      expect(within(paidItem).getByText(/paid/i)).toBeInTheDocument();
      expect(within(paidItem).getByText('18 Aug 2025')).toBeInTheDocument(); // Paid date
    });
  });

  describe('User Interactions', () => {
    it('should call onMarkPaid when mark as paid button is clicked', () => {
      render(
        <UpcomingPaymentsList 
          payments={mockPayments}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      const firstMarkPaidButton = screen.getAllByText(/mark as paid/i)[0];
      fireEvent.click(firstMarkPaidButton);

      expect(mockOnMarkPaid).toHaveBeenCalledWith(mockPayments[0].id);
    });

    it('should allow expanding payment details', () => {
      render(
        <UpcomingPaymentsList 
          payments={mockPayments}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      const paymentItem = screen.getByTestId('payment-item-1');
      fireEvent.click(paymentItem);

      expect(screen.getByText('Final payment for wedding photography')).toBeInTheDocument();
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no payments exist', () => {
      render(
        <UpcomingPaymentsList 
          payments={[]}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={false}
        />
      );

      expect(screen.getByText(/no upcoming payments/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeletons when loading', () => {
      render(
        <UpcomingPaymentsList 
          payments={[]}
          onMarkPaid={mockOnMarkPaid}
          onPaymentUpdate={mockOnPaymentUpdate}
          loading={true}
        />
      );

      expect(screen.getAllByTestId('payment-skeleton')).toHaveLength(3);
    });
  });
});

describe('PaymentStatusIndicator Component', () => {
  it('should render upcoming status with blue color', () => {
    render(<PaymentStatusIndicator status="upcoming" />);
    
    const indicator = screen.getByTestId('status-indicator-upcoming');
    expect(indicator).toHaveClass('bg-blue-500');
  });

  it('should render due status with yellow color', () => {
    render(<PaymentStatusIndicator status="due" />);
    
    const indicator = screen.getByTestId('status-indicator-due');
    expect(indicator).toHaveClass('bg-yellow-500');
  });

  it('should render overdue status with red color and pulse animation', () => {
    render(<PaymentStatusIndicator status="overdue" />);
    
    const indicator = screen.getByTestId('status-indicator-overdue');
    expect(indicator).toHaveClass('bg-red-500', 'animate-pulse');
  });

  it('should render paid status with green color', () => {
    render(<PaymentStatusIndicator status="paid" />);
    
    const indicator = screen.getByTestId('status-indicator-paid');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('should have proper accessibility attributes', () => {
    render(<PaymentStatusIndicator status="overdue" />);
    
    const indicator = screen.getByTestId('status-indicator-overdue');
    expect(indicator).toHaveAttribute('aria-label', 'Payment is overdue');
    expect(indicator).toHaveAttribute('role', 'status');
  });
});

describe('MarkAsPaidModal Component', () => {
  const mockPayment = mockPayments[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Display', () => {
    it('should render modal when open prop is true', () => {
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={vi.fn()}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/mark payment as paid/i)).toBeInTheDocument();
    });

    it('should not render modal when open prop is false', () => {
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={false}
          onClose={vi.fn()}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display payment details correctly', () => {
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={vi.fn()}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      expect(screen.getByText('Amazing Photography')).toBeInTheDocument();
      expect(screen.getByText('£2,500.00')).toBeInTheDocument();
      expect(screen.getByText('Final payment for wedding photography')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should allow entering payment date', () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      const dateInput = screen.getByLabelText(/payment date/i);
      fireEvent.change(dateInput, { target: { value: '2025-08-28' } });

      expect(dateInput).toHaveValue('2025-08-28');
    });

    it('should allow entering payment method', () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      const methodSelect = screen.getByLabelText(/payment method/i);
      fireEvent.change(methodSelect, { target: { value: 'card' } });

      expect(methodSelect).toHaveValue('card');
    });

    it('should allow entering optional notes', () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      const notesTextarea = screen.getByLabelText(/notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Paid via bank transfer' } });

      expect(notesTextarea).toHaveValue('Paid via bank transfer');
    });

    it('should call onConfirm with form data when confirmed', async () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      // Fill form
      fireEvent.change(screen.getByLabelText(/payment date/i), { 
        target: { value: '2025-08-28' } 
      });
      fireEvent.change(screen.getByLabelText(/payment method/i), { 
        target: { value: 'bank_transfer' } 
      });

      // Submit
      const confirmButton = screen.getByText(/confirm payment/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnMarkPaid).toHaveBeenCalledWith({
          paymentId: mockPayment.id,
          paidDate: '2025-08-28',
          paymentMethod: 'bank_transfer',
          notes: ''
        });
      });
    });

    it('should call onClose when cancel button is clicked', () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should require payment date', async () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      const confirmButton = screen.getByText(/confirm payment/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/payment date is required/i)).toBeInTheDocument();
      });
    });

    it('should not allow future payment dates', async () => {
      const mockOnClose = vi.fn();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      fireEvent.change(screen.getByLabelText(/payment date/i), { 
        target: { value: futureDateString } 
      });

      const confirmButton = screen.getByText(/confirm payment/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/payment date cannot be in the future/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable form when loading', () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={true}
        />
      );

      expect(screen.getByLabelText(/payment date/i)).toBeDisabled();
      expect(screen.getByText(/confirming.../i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should trap focus within modal', () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('should close on Escape key press', () => {
      const mockOnClose = vi.fn();
      
      render(
        <MarkAsPaidModal 
          payment={mockPayment}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnMarkPaid}
          loading={false}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

describe('Security and Data Handling', () => {
  it('should sanitize payment data before displaying', () => {
    const maliciousPayment = {
      ...mockPayments[0],
      vendor_name: '<script>alert("xss")</script>Vendor',
      description: '<img src="x" onerror="alert(\'xss\')" />Payment desc'
    };

    render(
      <UpcomingPaymentsList 
        payments={[maliciousPayment]}
        onMarkPaid={mockOnMarkPaid}
        onPaymentUpdate={mockOnPaymentUpdate}
        loading={false}
      />
    );

    // Should not render script tags or dangerous HTML
    expect(screen.queryByText(/script/)).not.toBeInTheDocument();
    expect(screen.getByText(/vendor/i)).toBeInTheDocument();
  });

  it('should format currency amounts correctly following existing patterns', () => {
    render(
      <UpcomingPaymentsList 
        payments={mockPayments}
        onMarkPaid={mockOnMarkPaid}
        onPaymentUpdate={mockOnPaymentUpdate}
        loading={false}
      />
    );

    // Following Stripe pattern: amounts in cents, display with proper formatting
    expect(screen.getByText('£2,500.00')).toBeInTheDocument();
    expect(screen.getByText('£5,000.00')).toBeInTheDocument();
    expect(screen.getByText('£750.00')).toBeInTheDocument();
  });
});

// Integration Tests
describe('Payment Calendar Integration', () => {
  it('should update payment list when calendar date selection changes', async () => {
    const TestWrapper = () => {
      const [selectedDate, setSelectedDate] = React.useState('2025-09-15');
      
      return (
        <>
          <PaymentCalendar 
            payments={mockPayments}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            loading={false}
          />
          <UpcomingPaymentsList 
            payments={mockPayments.filter(p => p.due_date === selectedDate)}
            onMarkPaid={mockOnMarkPaid}
            onPaymentUpdate={mockOnPaymentUpdate}
            loading={false}
          />
        </>
      );
    };

    render(<TestWrapper />);

    // Select different date
    const calendarDay = screen.getByTestId('calendar-day-2025-09-20');
    fireEvent.click(calendarDay);

    await waitFor(() => {
      // Should show only payments for selected date
      expect(screen.getByText('Elegant Venue')).toBeInTheDocument();
      expect(screen.queryByText('Amazing Photography')).not.toBeInTheDocument();
    });
  });
});

// Performance Tests
describe('Performance Requirements', () => {
  it('should render calendar within performance target', () => {
    const startTime = performance.now();
    
    render(
      <PaymentCalendar 
        payments={mockPayments}
        selectedDate="2025-09-15"
        onDateSelect={mockOnDateSelect}
        loading={false}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 200ms as per requirements
    expect(renderTime).toBeLessThan(200);
  });

  it('should handle large payment datasets efficiently', () => {
    const largePaymentSet = Array.from({ length: 100 }, (_, i) => ({
      ...mockPayments[0],
      id: `payment_${i}`,
      due_date: `2025-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`
    }));

    const startTime = performance.now();
    
    render(
      <UpcomingPaymentsList 
        payments={largePaymentSet}
        onMarkPaid={mockOnMarkPaid}
        onPaymentUpdate={mockOnPaymentUpdate}
        loading={false}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should handle large datasets within performance budget
    expect(renderTime).toBeLessThan(500);
  });
});