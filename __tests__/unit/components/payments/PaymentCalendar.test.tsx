import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { PaymentCalendar } from '@/components/payments/PaymentCalendar';
import { 
  mockPaymentData, 
  mockPaymentSummary, 
  mockComponentProps,
  testUtils 
} from '../../../../tests/payments/fixtures/payment-fixtures';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard/payments',
    query: {},
  }),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnValue({ data: mockPaymentData, error: null }),
      insert: jest.fn().mockReturnValue({ data: mockPaymentData[0], error: null }),
      update: jest.fn().mockReturnValue({ data: mockPaymentData[0], error: null }),
      delete: jest.fn().mockReturnValue({ error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      })
    }
  })
}));

describe('PaymentCalendar Component', () => {
  const defaultProps = mockComponentProps.paymentCalendar;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders payment calendar with all essential elements', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      expect(screen.getByTestId('payment-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('payment-summary')).toBeInTheDocument();
      expect(screen.getByTestId('payment-list')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-controls')).toBeInTheDocument();
    });

    test('displays payment summary correctly', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      expect(screen.getByTestId('total-payments')).toHaveTextContent('5');
      expect(screen.getByTestId('total-amount')).toHaveTextContent('$29,951.50');
      expect(screen.getByTestId('overdue-count')).toHaveTextContent('1');
      expect(screen.getByTestId('due-soon-count')).toHaveTextContent('1');
    });

    test('renders all payment items', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      mockPaymentData.forEach(payment => {
        expect(screen.getByText(payment.vendor_name)).toBeInTheDocument();
        expect(screen.getByText(testUtils.formatCurrency(payment.amount))).toBeInTheDocument();
      });
    });

    test('applies correct status styling', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const overduePayment = screen.getByTestId('payment-item-payment-003');
      const dueSoonPayment = screen.getByTestId('payment-item-payment-002');
      const paidPayment = screen.getByTestId('payment-item-payment-005');

      expect(overduePayment).toHaveClass('status-overdue');
      expect(dueSoonPayment).toHaveClass('status-due-soon');
      expect(paidPayment).toHaveClass('status-paid');
    });
  });

  describe('User Interactions', () => {
    test('handles payment status update', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const statusButton = screen.getByTestId('status-update-payment-001');
      
      await act(async () => {
        fireEvent.click(statusButton);
      });

      expect(defaultProps.onPaymentUpdate).toHaveBeenCalledWith(
        'payment-001',
        expect.objectContaining({ status: 'paid' })
      );
    });

    test('handles date selection', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const dateCell = screen.getByTestId('calendar-date-2025-02-15');
      
      await act(async () => {
        fireEvent.click(dateCell);
      });

      expect(defaultProps.onDateSelect).toHaveBeenCalledWith('2025-02-15');
    });

    test('handles filter changes', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const statusFilter = screen.getByTestId('status-filter');
      
      await act(async () => {
        fireEvent.change(statusFilter, { target: { value: 'overdue' } });
      });

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        status: 'overdue'
      });
    });

    test('handles sort changes', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const sortControl = screen.getByTestId('sort-control');
      
      await act(async () => {
        fireEvent.click(sortControl);
      });

      expect(defaultProps.onSortChange).toHaveBeenCalledWith({
        field: 'due_date',
        order: 'asc'
      });
    });
  });

  describe('Loading and Error States', () => {
    test('displays loading state', () => {
      const loadingProps = { ...defaultProps, loading: true };
      render(<PaymentCalendar {...loadingProps} />);
      
      expect(screen.getByTestId('payment-calendar-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading payment data...')).toBeInTheDocument();
    });

    test('displays error state', () => {
      const errorProps = { 
        ...defaultProps, 
        error: 'Failed to load payments' 
      };
      render(<PaymentCalendar {...errorProps} />);
      
      expect(screen.getByTestId('payment-calendar-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load payments')).toBeInTheDocument();
    });

    test('displays empty state', () => {
      const emptyProps = { 
        ...defaultProps, 
        payments: [],
        summary: { ...mockPaymentSummary, total_payments: 0 }
      };
      render(<PaymentCalendar {...emptyProps} />);
      
      expect(screen.getByTestId('payment-calendar-empty')).toBeInTheDocument();
      expect(screen.getByText('No payments scheduled')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Payment Calendar');
      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Payment Schedule');
      expect(screen.getByRole('region', { name: 'Payment Summary' })).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const firstPaymentItem = screen.getByTestId('payment-item-payment-001');
      
      await act(async () => {
        firstPaymentItem.focus();
        fireEvent.keyDown(firstPaymentItem, { key: 'Enter' });
      });

      expect(defaultProps.onPaymentUpdate).toHaveBeenCalled();
    });

    test('has proper focus management', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const focusableElements = screen.getAllByRole('button');
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
      });
    });

    test('provides screen reader announcements', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const statusButton = screen.getByTestId('status-update-payment-001');
      
      await act(async () => {
        fireEvent.click(statusButton);
      });

      expect(screen.getByRole('status')).toHaveTextContent(
        'Payment status updated successfully'
      );
    });
  });

  describe('Performance', () => {
    test('renders large dataset efficiently', () => {
      const largeDataset = testUtils.createPayments(100);
      const largeProps = {
        ...defaultProps,
        payments: largeDataset,
        summary: testUtils.calculateSummary(largeDataset)
      };

      const startTime = performance.now();
      render(<PaymentCalendar {...largeProps} />);
      const endTime = performance.now();

      // Should render within 100ms for good UX
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('virtualizes long lists', () => {
      const largeDataset = testUtils.createPayments(1000);
      const largeProps = {
        ...defaultProps,
        payments: largeDataset
      };

      render(<PaymentCalendar {...largeProps} />);
      
      // Should only render visible items (approximately 20)
      const visibleItems = screen.getAllByTestId(/payment-item-/);
      expect(visibleItems.length).toBeLessThanOrEqual(25);
    });
  });

  describe('Responsive Design', () => {
    test('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<PaymentCalendar {...defaultProps} />);
      
      expect(screen.getByTestId('payment-calendar')).toHaveClass('mobile-layout');
      expect(screen.queryByTestId('desktop-calendar-view')).not.toBeInTheDocument();
    });

    test('shows appropriate controls for tablet', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<PaymentCalendar {...defaultProps} />);
      
      expect(screen.getByTestId('payment-calendar')).toHaveClass('tablet-layout');
      expect(screen.getByTestId('tablet-calendar-controls')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles leap year dates correctly', () => {
      const leapYearPayment = testUtils.createPayment({
        due_date: '2024-02-29'
      });
      const leapYearProps = {
        ...defaultProps,
        payments: [leapYearPayment]
      };

      render(<PaymentCalendar {...leapYearProps} />);
      
      expect(screen.getByText('Feb 29, 2024')).toBeInTheDocument();
    });

    test('handles timezone differences', () => {
      const timezonePayment = testUtils.createPayment({
        due_date: '2025-01-01T00:00:00Z',
        created_at: '2024-12-31T23:59:59Z'
      });
      const timezoneProps = {
        ...defaultProps,
        payments: [timezonePayment]
      };

      render(<PaymentCalendar {...timezoneProps} />);
      
      // Should display in user's local timezone
      expect(screen.getByTestId('payment-due-date')).toBeInTheDocument();
    });

    test('handles very large amounts', () => {
      const largeAmountPayment = testUtils.createPayment({
        amount: 999999.99
      });
      const largeAmountProps = {
        ...defaultProps,
        payments: [largeAmountPayment]
      };

      render(<PaymentCalendar {...largeAmountProps} />);
      
      expect(screen.getByText('$999,999.99')).toBeInTheDocument();
    });

    test('handles precision rounding correctly', () => {
      const precisionPayment = testUtils.createPayment({
        amount: 1234.567
      });
      const precisionProps = {
        ...defaultProps,
        payments: [precisionPayment]
      };

      render(<PaymentCalendar {...precisionProps} />);
      
      // Should round to 2 decimal places
      expect(screen.getByText('$1,234.57')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('handles payment status changes in real-time', async () => {
      const { rerender } = render(<PaymentCalendar {...defaultProps} />);
      
      const updatedPayments = mockPaymentData.map(payment => 
        payment.id === 'payment-001' 
          ? { ...payment, status: 'paid' as const }
          : payment
      );
      const updatedProps = {
        ...defaultProps,
        payments: updatedPayments,
        summary: testUtils.calculateSummary(updatedPayments)
      };

      rerender(<PaymentCalendar {...updatedProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-item-payment-001')).toHaveClass('status-paid');
      });
    });

    test('updates summary when payments change', async () => {
      const { rerender } = render(<PaymentCalendar {...defaultProps} />);
      
      const newPayment = testUtils.createPayment({
        id: 'payment-new',
        amount: 5000,
        status: 'pending'
      });
      const updatedPayments = [...mockPaymentData, newPayment];
      const updatedProps = {
        ...defaultProps,
        payments: updatedPayments,
        summary: testUtils.calculateSummary(updatedPayments)
      };

      rerender(<PaymentCalendar {...updatedProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('total-payments')).toHaveTextContent('6');
        expect(screen.getByTestId('total-amount')).toHaveTextContent('$34,951.50');
      });
    });
  });

  describe('Filtering and Sorting', () => {
    test('filters by payment status', () => {
      const filteredProps = {
        ...defaultProps,
        payments: testUtils.getPaymentsByStatus('overdue')
      };

      render(<PaymentCalendar {...filteredProps} />);
      
      expect(screen.getAllByTestId(/payment-item-/)).toHaveLength(1);
      expect(screen.getByText('Professional Wedding Photography')).toBeInTheDocument();
    });

    test('sorts by due date ascending', () => {
      const sortedPayments = [...mockPaymentData].sort((a, b) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
      const sortedProps = {
        ...defaultProps,
        payments: sortedPayments
      };

      render(<PaymentCalendar {...sortedProps} />);
      
      const paymentItems = screen.getAllByTestId(/payment-item-/);
      expect(paymentItems[0]).toHaveAttribute('data-testid', 'payment-item-payment-005');
    });

    test('sorts by amount descending', () => {
      const sortedPayments = [...mockPaymentData].sort((a, b) => b.amount - a.amount);
      const sortedProps = {
        ...defaultProps,
        payments: sortedPayments
      };

      render(<PaymentCalendar {...sortedProps} />);
      
      const paymentItems = screen.getAllByTestId(/payment-item-/);
      expect(paymentItems[0]).toHaveAttribute('data-testid', 'payment-item-payment-001');
    });
  });

  describe('Form Integration', () => {
    test('opens payment creation form', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const addButton = screen.getByTestId('add-payment-button');
      
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(screen.getByTestId('payment-form-modal')).toBeInTheDocument();
    });

    test('submits new payment', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const addButton = screen.getByTestId('add-payment-button');
      await act(async () => {
        fireEvent.click(addButton);
      });

      const form = screen.getByTestId('payment-form');
      const vendorInput = screen.getByTestId('vendor-name-input');
      const amountInput = screen.getByTestId('amount-input');
      const dueDateInput = screen.getByTestId('due-date-input');
      const submitButton = screen.getByTestId('submit-payment');

      await act(async () => {
        fireEvent.change(vendorInput, { target: { value: 'Test Vendor' } });
        fireEvent.change(amountInput, { target: { value: '1500.00' } });
        fireEvent.change(dueDateInput, { target: { value: '2025-03-15' } });
        fireEvent.click(submitButton);
      });

      expect(defaultProps.onPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_name: 'Test Vendor',
          amount: 1500.00,
          due_date: '2025-03-15'
        })
      );
    });
  });

  describe('Validation', () => {
    test('prevents invalid payment amounts', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const addButton = screen.getByTestId('add-payment-button');
      await act(async () => {
        fireEvent.click(addButton);
      });

      const amountInput = screen.getByTestId('amount-input');
      const submitButton = screen.getByTestId('submit-payment');

      await act(async () => {
        fireEvent.change(amountInput, { target: { value: '-100' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
      expect(defaultProps.onPaymentCreate).not.toHaveBeenCalled();
    });

    test('validates required fields', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const addButton = screen.getByTestId('add-payment-button');
      await act(async () => {
        fireEvent.click(addButton);
      });

      const submitButton = screen.getByTestId('submit-payment');

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Vendor name is required')).toBeInTheDocument();
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
      expect(screen.getByText('Due date is required')).toBeInTheDocument();
    });

    test('validates date format', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const addButton = screen.getByTestId('add-payment-button');
      await act(async () => {
        fireEvent.click(addButton);
      });

      const dueDateInput = screen.getByTestId('due-date-input');
      const submitButton = screen.getByTestId('submit-payment');

      await act(async () => {
        fireEvent.change(dueDateInput, { target: { value: 'invalid-date' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Please enter a valid date')).toBeInTheDocument();
    });
  });

  describe('Calendar View', () => {
    test('switches between calendar and list view', async () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const viewToggle = screen.getByTestId('view-toggle');
      
      // Default should be list view
      expect(screen.getByTestId('payment-list-view')).toBeInTheDocument();
      
      await act(async () => {
        fireEvent.click(viewToggle);
      });

      expect(screen.getByTestId('payment-calendar-view')).toBeInTheDocument();
    });

    test('highlights dates with payments', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const viewToggle = screen.getByTestId('view-toggle');
      fireEvent.click(viewToggle);

      // Check if dates with payments are highlighted
      expect(screen.getByTestId('calendar-date-2025-02-15')).toHaveClass('has-payments');
      expect(screen.getByTestId('calendar-date-2025-03-01')).toHaveClass('has-payments');
    });

    test('shows payment count per date', () => {
      render(<PaymentCalendar {...defaultProps} />);
      
      const viewToggle = screen.getByTestId('view-toggle');
      fireEvent.click(viewToggle);

      const feb15Cell = screen.getByTestId('calendar-date-2025-02-15');
      expect(feb15Cell).toHaveTextContent('1 payment');
    });
  });

  describe('Export Functionality', () => {
    test('exports payment data to CSV', async () => {
      // Mock URL.createObjectURL and download
      const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      render(<PaymentCalendar {...defaultProps} />);
      
      const exportButton = screen.getByTestId('export-csv-button');
      
      await act(async () => {
        fireEvent.click(exportButton);
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    test('exports payment data to PDF', async () => {
      // Mock jsPDF
      const mockJsPDF = {
        text: jest.fn(),
        save: jest.fn(),
        autoTable: jest.fn()
      };
      global.jsPDF = jest.fn(() => mockJsPDF);

      render(<PaymentCalendar {...defaultProps} />);
      
      const exportButton = screen.getByTestId('export-pdf-button');
      
      await act(async () => {
        fireEvent.click(exportButton);
      });

      expect(mockJsPDF.save).toHaveBeenCalledWith('payment-calendar.pdf');
    });
  });
});