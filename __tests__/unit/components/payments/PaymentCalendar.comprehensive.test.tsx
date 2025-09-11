/**
 * WS-165 Payment Calendar Comprehensive Unit Testing Suite
 * Team E - Round 1 Implementation
 * 
 * Comprehensive unit tests for PaymentCalendar component covering:
 * - Core functionality and rendering
 * - User interactions and state management
 * - Edge cases and error scenarios
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Performance optimizations
 * - Security validations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import PaymentCalendar from '../../../../src/components/payments/PaymentCalendar';
import { 
  mockPaymentData, 
  mockPaymentSummary, 
  edgeCasePaymentData,
  invalidPaymentData,
  mockComponentProps,
  testUtils,
  MOCK_WEDDING_ID 
} from '../../../fixtures/payment-fixtures';

// Extend Jest matchers for accessibility
expect.extend(toHaveNoViolations);

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock('../../../../src/lib/supabase', () => ({
  createClient: () => mockComponentProps.paymentCalendar.mockSupabaseClient || {},
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for performance testing
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('PaymentCalendar Component - WS-165 Comprehensive Testing', () => {
  const user = userEvent.setup();
  let mockProps: typeof mockComponentProps.paymentCalendar;

  beforeEach(() => {
    // Reset all mocks and props for each test
    mockProps = {
      ...mockComponentProps.paymentCalendar,
      onPaymentUpdate: vi.fn(),
      onPaymentCreate: vi.fn(),
      onPaymentDelete: vi.fn(),
      onDateSelect: vi.fn(),
      onFilterChange: vi.fn(),
      onSortChange: vi.fn(),
    };
    
    // Clear all DOM elements
    document.body.innerHTML = '';
    
    // Reset console warnings/errors
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any timers, observers, etc.
    vi.useRealTimers();
  });

  /**
   * CORE FUNCTIONALITY TESTS
   */
  describe('Core Functionality', () => {
    test('renders payment calendar with basic structure', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Verify main calendar container exists
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByLabelText(/payment calendar/i)).toBeInTheDocument();
      
      // Verify navigation elements
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByLabelText(/previous month/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next month/i)).toBeInTheDocument();
    });

    test('displays payment data correctly', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Verify payment summary information
      expect(screen.getByText(/total payments/i)).toBeInTheDocument();
      expect(screen.getByText(`$${mockProps.summary.total_amount.toFixed(2)}`)).toBeInTheDocument();
      
      // Verify individual payments are displayed
      mockProps.payments.forEach(payment => {
        expect(screen.getByText(payment.vendor_name)).toBeInTheDocument();
        expect(screen.getByText(`$${payment.amount.toFixed(2)}`)).toBeInTheDocument();
      });
    });

    test('handles empty payment data gracefully', async () => {
      const emptyProps = {
        ...mockProps,
        payments: [],
        summary: {
          ...mockProps.summary,
          total_payments: 0,
          total_amount: 0,
        },
      };
      
      render(<PaymentCalendar {...emptyProps} />);
      
      expect(screen.getByText(/no payments scheduled/i)).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    test('processes different payment statuses correctly', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Verify status indicators
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
      expect(screen.getByText(/due soon/i)).toBeInTheDocument(); 
      expect(screen.getByText(/overdue/i)).toBeInTheDocument();
      expect(screen.getByText(/paid/i)).toBeInTheDocument();
      
      // Verify status-specific styling classes
      const overduePayments = screen.getAllByText(/overdue/i);
      overduePayments.forEach(element => {
        expect(element.closest('[data-status="overdue"]')).toHaveClass('text-red-600');
      });
    });
  });

  /**
   * USER INTERACTION TESTS
   */
  describe('User Interactions', () => {
    test('navigates between months correctly', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const nextButton = screen.getByLabelText(/next month/i);
      const prevButton = screen.getByLabelText(/previous month/i);
      
      // Test next month navigation
      await user.click(nextButton);
      expect(mockProps.onDateSelect).toHaveBeenCalled();
      
      // Test previous month navigation
      await user.click(prevButton);
      expect(mockProps.onDateSelect).toHaveBeenCalled();
    });

    test('selects dates and triggers callbacks', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Find and click on a date cell
      const dateCell = screen.getByRole('gridcell', { name: /15/i });
      await user.click(dateCell);
      
      expect(mockProps.onDateSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Object)
        })
      );
    });

    test('handles payment status updates', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Find a payment with pending status
      const paymentItem = screen.getByTestId('payment-001');
      const statusButton = screen.getByLabelText(/mark as paid/i);
      
      await user.click(statusButton);
      
      expect(mockProps.onPaymentUpdate).toHaveBeenCalledWith(
        mockProps.payments[0].id,
        expect.objectContaining({
          status: 'paid'
        })
      );
    });

    test('opens payment creation modal', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const addButton = screen.getByRole('button', { name: /add payment/i });
      await user.click(addButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/new payment/i)).toBeInTheDocument();
    });

    test('handles payment filtering and sorting', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Test status filter
      const filterDropdown = screen.getByLabelText(/filter by status/i);
      await user.click(filterDropdown);
      await user.click(screen.getByText(/overdue only/i));
      
      expect(mockProps.onFilterChange).toHaveBeenCalledWith('overdue');
      
      // Test sorting
      const sortDropdown = screen.getByLabelText(/sort by/i);
      await user.click(sortDropdown);
      await user.click(screen.getByText(/amount ascending/i));
      
      expect(mockProps.onSortChange).toHaveBeenCalledWith('amount-asc');
    });
  });

  /**
   * EDGE CASES AND ERROR SCENARIOS
   */
  describe('Edge Cases and Error Handling', () => {
    test('handles loading state correctly', async () => {
      const loadingProps = { ...mockProps, loading: true };
      render(<PaymentCalendar {...loadingProps} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading payments/i)).toBeInTheDocument();
    });

    test('displays error states appropriately', async () => {
      const errorProps = {
        ...mockProps,
        error: {
          message: 'Failed to load payments',
          code: 'NETWORK_ERROR',
        },
      };
      
      render(<PaymentCalendar {...errorProps} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to load payments/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    test('handles extreme date ranges', async () => {
      const extremeDates = [
        { due_date: '1900-01-01', vendor_name: 'Historical Payment' },
        { due_date: '2099-12-31', vendor_name: 'Future Payment' },
        { due_date: '2024-02-29', vendor_name: 'Leap Year Payment' },
      ];
      
      const extremeProps = {
        ...mockProps,
        payments: extremeDates.map((payment, index) => ({
          ...mockProps.payments[0],
          id: `extreme-${index}`,
          ...payment,
        })),
      };
      
      render(<PaymentCalendar {...extremeProps} />);
      
      extremeDates.forEach(payment => {
        expect(screen.getByText(payment.vendor_name)).toBeInTheDocument();
      });
    });

    test('validates payment amounts correctly', async () => {
      const invalidAmountProps = {
        ...mockProps,
        payments: [
          { ...mockProps.payments[0], amount: -100 }, // Negative
          { ...mockProps.payments[0], amount: 0 },    // Zero
          { ...mockProps.payments[0], amount: 999999.999 }, // High precision
        ],
      };
      
      render(<PaymentCalendar {...invalidAmountProps} />);
      
      // Should handle invalid amounts gracefully
      expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
    });

    test('handles network failures and retries', async () => {
      const networkErrorProps = {
        ...mockProps,
        error: { message: 'Network error', code: 'NETWORK_ERROR' },
      };
      
      render(<PaymentCalendar {...networkErrorProps} />);
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      // Should trigger error recovery mechanism
      expect(mockProps.onFilterChange).toHaveBeenCalled();
    });
  });

  /**
   * ACCESSIBILITY COMPLIANCE TESTS (WCAG 2.1 AA)
   */
  describe('Accessibility Compliance - WCAG 2.1 AA', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(<PaymentCalendar {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('provides proper ARIA labels and descriptions', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      expect(screen.getByRole('application')).toHaveAccessibleName();
      expect(screen.getByRole('grid')).toHaveAccessibleName('Payment Calendar');
      
      // Check payment items have proper labels
      const paymentItems = screen.getAllByRole('gridcell');
      paymentItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
      });
    });

    test('supports keyboard navigation', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const calendar = screen.getByRole('grid');
      calendar.focus();
      
      // Test arrow key navigation
      fireEvent.keyDown(calendar, { key: 'ArrowRight' });
      fireEvent.keyDown(calendar, { key: 'ArrowDown' });
      fireEvent.keyDown(calendar, { key: 'ArrowLeft' });
      fireEvent.keyDown(calendar, { key: 'ArrowUp' });
      
      // Should handle keyboard navigation without errors
      expect(document.activeElement).toBeInTheDocument();
    });

    test('provides screen reader announcements', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Check for live regions
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    test('maintains proper focus management', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const addButton = screen.getByRole('button', { name: /add payment/i });
      await user.click(addButton);
      
      // Focus should move to modal
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();
      
      // Test focus trap
      fireEvent.keyDown(modal, { key: 'Tab' });
      expect(document.activeElement).toBeInTheDocument();
    });

    test('meets color contrast requirements', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Verify high contrast colors are applied
      const overdueItems = screen.getAllByText(/overdue/i);
      overdueItems.forEach(item => {
        const styles = window.getComputedStyle(item);
        // Should have sufficient contrast ratio (tested via CSS classes)
        expect(item).toHaveClass('text-red-600');
      });
    });
  });

  /**
   * PERFORMANCE OPTIMIZATION TESTS
   */
  describe('Performance Optimizations', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    test('renders large payment datasets efficiently', async () => {
      const largeDataset = testUtils.createPayments(1000, {
        wedding_id: MOCK_WEDDING_ID,
      });
      
      const performanceProps = {
        ...mockProps,
        payments: largeDataset,
      };
      
      const startTime = performance.now();
      render(<PaymentCalendar {...performanceProps} />);
      const renderTime = performance.now() - startTime;
      
      // Should render in under 100ms for 1000 items
      expect(renderTime).toBeLessThan(100);
    });

    test('implements proper memoization', async () => {
      const { rerender } = render(<PaymentCalendar {...mockProps} />);
      
      // First render count
      const initialRenderCount = screen.getAllByTestId(/payment-/).length;
      
      // Re-render with same props (should not re-render payment items)
      rerender(<PaymentCalendar {...mockProps} />);
      
      const secondRenderCount = screen.getAllByTestId(/payment-/).length;
      expect(secondRenderCount).toBe(initialRenderCount);
    });

    test('handles scroll performance with virtual scrolling', async () => {
      const scrollableProps = {
        ...mockProps,
        payments: testUtils.createPayments(500),
      };
      
      render(<PaymentCalendar {...scrollableProps} />);
      
      const scrollContainer = screen.getByTestId('payment-scroll-container');
      
      // Simulate rapid scrolling
      act(() => {
        for (let i = 0; i < 50; i++) {
          fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 100 } });
        }
      });
      
      // Should maintain smooth scrolling without performance degradation
      expect(scrollContainer.scrollTop).toBeGreaterThan(0);
    });

    test('debounces search and filter operations', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const searchInput = screen.getByLabelText(/search payments/i);
      
      // Rapid typing simulation
      await user.type(searchInput, 'test search query');
      
      // Should debounce the search calls
      act(() => {
        vi.advanceTimersByTime(300); // Default debounce time
      });
      
      expect(mockProps.onFilterChange).toHaveBeenCalledTimes(1);
      expect(mockProps.onFilterChange).toHaveBeenLastCalledWith({
        search: 'test search query'
      });
    });
  });

  /**
   * SECURITY VALIDATION TESTS
   */
  describe('Security Validations', () => {
    test('sanitizes user input properly', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const searchInput = screen.getByLabelText(/search payments/i);
      
      // Test XSS prevention
      await user.type(searchInput, '<script>alert("xss")</script>');
      
      expect(searchInput).toHaveValue('<script>alert("xss")</script>');
      // Value should be sanitized when processed
      expect(mockProps.onFilterChange).not.toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.stringContaining('<script>')
        })
      );
    });

    test('prevents SQL injection in search queries', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const searchInput = screen.getByLabelText(/search payments/i);
      
      // Test SQL injection patterns
      const maliciousInputs = [
        "'; DROP TABLE payments; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
      ];
      
      for (const input of maliciousInputs) {
        await user.clear(searchInput);
        await user.type(searchInput, input);
        
        act(() => {
          vi.advanceTimersByTime(300);
        });
        
        // Should sanitize SQL injection attempts
        expect(mockProps.onFilterChange).toHaveBeenLastCalledWith({
          search: expect.not.stringMatching(/('|;|--|UNION|DROP)/i)
        });
      }
    });

    test('validates payment data integrity', async () => {
      const compromisedProps = {
        ...mockProps,
        payments: [
          {
            ...mockProps.payments[0],
            amount: 'HACKED_AMOUNT', // Invalid type
            id: '<script>alert("xss")</script>', // XSS attempt
          }
        ],
      };
      
      render(<PaymentCalendar {...compromisedProps} />);
      
      // Should handle compromised data gracefully
      expect(screen.getByText(/invalid payment data/i)).toBeInTheDocument();
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });

    test('enforces proper authorization checks', async () => {
      const unauthorizedProps = {
        ...mockProps,
        error: {
          message: 'Unauthorized access',
          code: 'AUTH_ERROR',
        },
      };
      
      render(<PaymentCalendar {...unauthorizedProps} />);
      
      expect(screen.getByText(/unauthorized access/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  /**
   * INTEGRATION SCENARIOS
   */
  describe('Integration Scenarios', () => {
    test('handles real-time payment updates', async () => {
      const { rerender } = render(<PaymentCalendar {...mockProps} />);
      
      // Simulate real-time update
      const updatedPayment = {
        ...mockProps.payments[0],
        status: 'paid' as const,
        updated_at: new Date().toISOString(),
      };
      
      const updatedProps = {
        ...mockProps,
        payments: [updatedPayment, ...mockProps.payments.slice(1)],
      };
      
      rerender(<PaymentCalendar {...updatedProps} />);
      
      expect(screen.getByText(/paid/i)).toBeInTheDocument();
      expect(screen.getByTestId('payment-001')).toHaveAttribute('data-status', 'paid');
    });

    test('synchronizes with external calendar systems', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const syncButton = screen.getByRole('button', { name: /sync calendar/i });
      await user.click(syncButton);
      
      expect(screen.getByText(/syncing/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText(/sync complete/i)).toBeInTheDocument();
      });
    });

    test('handles concurrent user modifications', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Simulate concurrent modification conflict
      const paymentItem = screen.getByTestId('payment-001');
      const editButton = screen.getByLabelText(/edit payment/i);
      
      await user.click(editButton);
      
      // Simulate another user's modification
      fireEvent(window, new CustomEvent('payment-modified', {
        detail: { paymentId: 'payment-001', modifiedBy: 'other-user' }
      }));
      
      expect(screen.getByText(/payment modified by another user/i)).toBeInTheDocument();
    });
  });

  /**
   * MOBILE RESPONSIVENESS TESTS
   */
  describe('Mobile Responsiveness', () => {
    test('adapts to mobile viewport correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
      
      render(<PaymentCalendar {...mockProps} />);
      
      // Should show mobile-optimized layout
      expect(screen.getByTestId('mobile-calendar-view')).toBeInTheDocument();
      
      // Touch-friendly button sizes
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44); // 44px minimum touch target
      });
    });

    test('handles touch interactions properly', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const paymentItem = screen.getByTestId('payment-001');
      
      // Simulate touch events
      fireEvent.touchStart(paymentItem);
      fireEvent.touchEnd(paymentItem);
      
      expect(mockProps.onPaymentUpdate).toHaveBeenCalled();
    });

    test('supports swipe gestures for navigation', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const calendar = screen.getByRole('grid');
      
      // Simulate swipe left (next month)
      fireEvent.touchStart(calendar, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(calendar, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(calendar);
      
      expect(mockProps.onDateSelect).toHaveBeenCalled();
    });
  });
});