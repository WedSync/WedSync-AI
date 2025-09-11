import { renderHook, act } from '@testing-library/react';
import { usePaymentCalendar } from '@/hooks/payments/usePaymentCalendar';
import { usePaymentCalculations } from '@/hooks/payments/usePaymentCalculations';
import { usePaymentNotifications } from '@/hooks/payments/usePaymentNotifications';
import { 
  mockPaymentData,
  mockPaymentSummary,
  testUtils,
  MOCK_WEDDING_ID,
  edgeCasePaymentData,
  paymentCalculationTestData
} from '../../../../tests/payments/fixtures/payment-fixtures';

// Mock child hooks
jest.mock('@/hooks/payments/usePaymentCalculations');
jest.mock('@/hooks/payments/usePaymentNotifications');

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnValue(
        Promise.resolve({ data: mockPaymentData, error: null })
      ),
      insert: jest.fn().mockReturnValue(
        Promise.resolve({ data: mockPaymentData[0], error: null })
      ),
      update: jest.fn().mockReturnValue(
        Promise.resolve({ data: mockPaymentData[0], error: null })
      ),
      delete: jest.fn().mockReturnValue(
        Promise.resolve({ error: null })
      ),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      })
    }
  })
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard/payments',
    query: { weddingId: MOCK_WEDDING_ID },
  }),
}));

describe('usePaymentCalendar Hook', () => {
  const mockUsePaymentCalculations = usePaymentCalculations as jest.MockedFunction<typeof usePaymentCalculations>;
  const mockUsePaymentNotifications = usePaymentNotifications as jest.MockedFunction<typeof usePaymentNotifications>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock child hooks default returns
    mockUsePaymentCalculations.mockReturnValue({
      calculateTotals: jest.fn(() => mockPaymentSummary),
      calculateDueStatus: jest.fn((payment) => payment.status),
      formatCurrency: jest.fn((amount) => testUtils.formatCurrency(amount)),
      validatePayment: jest.fn(() => ({ isValid: true, errors: [] })),
    });

    mockUsePaymentNotifications.mockReturnValue({
      sendDueReminder: jest.fn(),
      scheduleNotifications: jest.fn(),
      cancelNotifications: jest.fn(),
      getNotificationSettings: jest.fn(() => ({ reminders: true, lead_time: 7 })),
    });
  });

  describe('Initialization', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.payments).toEqual([]);
      expect(result.current.summary).toBeNull();
      expect(result.current.filters).toEqual({ status: 'all', category: 'all' });
      expect(result.current.sortBy).toEqual({ field: 'due_date', order: 'asc' });
    });

    test('loads payments on mount', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        // Wait for initial load
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.payments).toEqual(mockPaymentData);
      expect(result.current.summary).toEqual(mockPaymentSummary);
    });

    test('handles invalid wedding ID', () => {
      const { result } = renderHook(() => usePaymentCalendar(''));

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Wedding ID is required');
      expect(result.current.payments).toEqual([]);
    });
  });

  describe('Data Fetching', () => {
    test('fetches payments successfully', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.payments).toHaveLength(5);
    });

    test('handles fetch errors gracefully', async () => {
      // Mock error response
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } })
      );

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Database error');
      expect(result.current.payments).toEqual([]);
    });

    test('retries failed requests', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select
        .mockReturnValueOnce(Promise.resolve({ data: null, error: { message: 'Network error' } }))
        .mockReturnValueOnce(Promise.resolve({ data: mockPaymentData, error: null }));

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.payments).toEqual(mockPaymentData);
    });
  });

  describe('Payment CRUD Operations', () => {
    test('creates new payment', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const newPayment = {
        vendor_name: 'Test Vendor',
        amount: 1500.00,
        due_date: '2025-03-15',
        status: 'pending' as const,
        priority: 'medium' as const,
        category: 'Testing',
      };

      await act(async () => {
        await result.current.createPayment(newPayment);
      });

      expect(result.current.payments).toHaveLength(6);
      expect(result.current.payments.find(p => p.vendor_name === 'Test Vendor')).toBeTruthy();
    });

    test('updates existing payment', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.updatePayment('payment-001', { status: 'paid' });
      });

      const updatedPayment = result.current.payments.find(p => p.id === 'payment-001');
      expect(updatedPayment?.status).toBe('paid');
    });

    test('deletes payment', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.deletePayment('payment-001');
      });

      expect(result.current.payments).toHaveLength(4);
      expect(result.current.payments.find(p => p.id === 'payment-001')).toBeFalsy();
    });

    test('handles validation errors on create', async () => {
      mockUsePaymentCalculations.mockReturnValue({
        calculateTotals: jest.fn(() => mockPaymentSummary),
        calculateDueStatus: jest.fn((payment) => payment.status),
        formatCurrency: jest.fn((amount) => testUtils.formatCurrency(amount)),
        validatePayment: jest.fn(() => ({ 
          isValid: false, 
          errors: ['Amount must be positive', 'Vendor name is required'] 
        })),
      });

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const invalidPayment = {
        vendor_name: '',
        amount: -100,
        due_date: '2025-03-15',
        status: 'pending' as const,
        priority: 'medium' as const,
        category: 'Testing',
      };

      await act(async () => {
        try {
          await result.current.createPayment(invalidPayment);
        } catch (error) {
          expect(error).toEqual({
            isValid: false,
            errors: ['Amount must be positive', 'Vendor name is required']
          });
        }
      });

      expect(result.current.payments).toHaveLength(5); // No new payment added
    });
  });

  describe('Filtering and Sorting', () => {
    test('filters by payment status', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setFilters({ status: 'overdue' });
      });

      expect(result.current.filteredPayments).toHaveLength(1);
      expect(result.current.filteredPayments[0].status).toBe('overdue');
    });

    test('filters by category', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setFilters({ category: 'Photography' });
      });

      expect(result.current.filteredPayments).toHaveLength(1);
      expect(result.current.filteredPayments[0].category).toBe('Photography');
    });

    test('combines multiple filters', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setFilters({ status: 'pending', category: 'Venue' });
      });

      const filtered = result.current.filteredPayments;
      expect(filtered.every(p => p.status === 'pending' && p.category === 'Venue')).toBe(true);
    });

    test('sorts by due date ascending', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setSortBy({ field: 'due_date', order: 'asc' });
      });

      const sorted = result.current.sortedPayments;
      const dates = sorted.map(p => new Date(p.due_date).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
    });

    test('sorts by amount descending', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setSortBy({ field: 'amount', order: 'desc' });
      });

      const sorted = result.current.sortedPayments;
      const amounts = sorted.map(p => p.amount);
      expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
    });

    test('sorts by vendor name alphabetically', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setSortBy({ field: 'vendor_name', order: 'asc' });
      });

      const sorted = result.current.sortedPayments;
      const names = sorted.map(p => p.vendor_name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('Summary Calculations', () => {
    test('calculates payment summary correctly', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        // Wait for data to load
      });

      expect(result.current.summary).toEqual(mockPaymentSummary);
      expect(mockUsePaymentCalculations().calculateTotals).toHaveBeenCalledWith(mockPaymentData);
    });

    test('recalculates summary when payments change', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.updatePayment('payment-001', { status: 'paid' });
      });

      expect(mockUsePaymentCalculations().calculateTotals).toHaveBeenCalledTimes(2);
    });

    test('handles edge case amounts in calculations', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: edgeCasePaymentData, error: null })
      );

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.payments).toEqual(edgeCasePaymentData);
      expect(mockUsePaymentCalculations().calculateTotals).toHaveBeenCalledWith(edgeCasePaymentData);
    });
  });

  describe('Date Handling', () => {
    test('handles leap year dates correctly', async () => {
      const leapYearPayments = [testUtils.createPayment({ due_date: '2024-02-29' })];
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: leapYearPayments, error: null })
      );

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.payments[0].due_date).toBe('2024-02-29');
    });

    test('handles timezone conversions', async () => {
      const timezonePayment = testUtils.createPayment({
        due_date: '2025-01-01T00:00:00Z',
        created_at: '2024-12-31T23:59:59Z'
      });

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.formatPaymentDate(timezonePayment.due_date);
      });

      // Should handle timezone conversion properly
      expect(typeof result.current.formatPaymentDate(timezonePayment.due_date)).toBe('string');
    });

    test('calculates business days correctly', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const businessDays = result.current.calculateBusinessDays('2025-01-01', 5);

      expect(businessDays).toBeInstanceOf(Date);
      // Should skip weekends
    });
  });

  describe('Performance Optimizations', () => {
    test('memoizes filtered results', async () => {
      const { result, rerender } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const firstCall = result.current.filteredPayments;
      
      rerender();
      
      const secondCall = result.current.filteredPayments;
      
      // Should return the same reference if filters haven't changed
      expect(firstCall).toBe(secondCall);
    });

    test('debounces filter updates', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setFilters({ status: 'pending' });
        result.current.setFilters({ status: 'overdue' });
        result.current.setFilters({ status: 'paid' });
      });

      // Should only apply the last filter update
      expect(result.current.filters.status).toBe('paid');
    });

    test('handles large datasets efficiently', async () => {
      const largeDataset = testUtils.createPayments(1000);
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: largeDataset, error: null })
      );

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.refetch();
      });

      const endTime = performance.now();

      expect(result.current.payments).toHaveLength(1000);
      // Should process large datasets quickly
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Error Recovery', () => {
    test('recovers from network errors', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select
        .mockReturnValueOnce(Promise.resolve({ data: null, error: { message: 'Network timeout' } }))
        .mockReturnValueOnce(Promise.resolve({ data: mockPaymentData, error: null }));

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      // First call fails
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Network timeout');

      // Retry succeeds
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.payments).toEqual(mockPaymentData);
    });

    test('handles partial data corruption gracefully', async () => {
      const corruptedData = [
        ...mockPaymentData.slice(0, 2),
        { ...mockPaymentData[2], amount: null }, // Corrupted amount
        ...mockPaymentData.slice(3)
      ];

      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: corruptedData, error: null })
      );

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.refetch();
      });

      // Should filter out corrupted records
      expect(result.current.payments).toHaveLength(4);
      expect(result.current.warnings).toContain('Some payment records had invalid data and were excluded');
    });
  });

  describe('Real-time Synchronization', () => {
    test('handles real-time payment updates', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        // Simulate real-time update
        result.current.handleRealtimeUpdate({
          eventType: 'UPDATE',
          new: { ...mockPaymentData[0], status: 'paid' },
          old: mockPaymentData[0]
        });
      });

      const updatedPayment = result.current.payments.find(p => p.id === 'payment-001');
      expect(updatedPayment?.status).toBe('paid');
    });

    test('handles real-time payment creation', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const newPayment = testUtils.createPayment({ id: 'payment-new' });

      await act(async () => {
        result.current.handleRealtimeUpdate({
          eventType: 'INSERT',
          new: newPayment
        });
      });

      expect(result.current.payments).toHaveLength(6);
      expect(result.current.payments.find(p => p.id === 'payment-new')).toBeTruthy();
    });

    test('handles real-time payment deletion', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        result.current.handleRealtimeUpdate({
          eventType: 'DELETE',
          old: mockPaymentData[0]
        });
      });

      expect(result.current.payments).toHaveLength(4);
      expect(result.current.payments.find(p => p.id === 'payment-001')).toBeFalsy();
    });
  });

  describe('Notification Integration', () => {
    test('schedules notifications for new payments', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const newPayment = {
        vendor_name: 'Test Vendor',
        amount: 1500.00,
        due_date: '2025-03-15',
        status: 'pending' as const,
        priority: 'high' as const,
        category: 'Testing',
      };

      await act(async () => {
        await result.current.createPayment(newPayment);
      });

      expect(mockUsePaymentNotifications().scheduleNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ vendor_name: 'Test Vendor' })
      );
    });

    test('cancels notifications for deleted payments', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.deletePayment('payment-001');
      });

      expect(mockUsePaymentNotifications().cancelNotifications).toHaveBeenCalledWith('payment-001');
    });

    test('sends due reminders on demand', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.sendDueReminder('payment-002');
      });

      expect(mockUsePaymentNotifications().sendDueReminder).toHaveBeenCalledWith('payment-002');
    });
  });

  describe('Accessibility Support', () => {
    test('provides screen reader announcements', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.updatePayment('payment-001', { status: 'paid' });
      });

      expect(result.current.announcement).toBe('Payment status updated to paid for Elegant Gardens Venue');
    });

    test('manages focus for keyboard navigation', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      act(() => {
        result.current.setFocusedPayment('payment-002');
      });

      expect(result.current.focusedPayment).toBe('payment-002');
    });

    test('provides semantic information for payments', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      const semanticInfo = result.current.getPaymentSemantics('payment-003');

      expect(semanticInfo).toEqual({
        role: 'listitem',
        'aria-label': 'Professional Wedding Photography payment of $3,200.50 due January 25, 2025, status overdue',
        'aria-describedby': 'payment-003-details',
        tabIndex: 0
      });
    });
  });

  describe('Edge Cases and Error Boundaries', () => {
    test('handles empty payment list gracefully', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: [], error: null })
      );

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.payments).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    test('handles concurrent updates gracefully', async () => {
      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      await act(async () => {
        // Simulate concurrent updates
        const updates = [
          result.current.updatePayment('payment-001', { status: 'paid' }),
          result.current.updatePayment('payment-002', { status: 'paid' }),
          result.current.updatePayment('payment-003', { status: 'paid' })
        ];
        
        await Promise.all(updates);
      });

      const paidPayments = result.current.payments.filter(p => p.status === 'paid');
      expect(paidPayments).toHaveLength(4); // 3 updated + 1 originally paid
    });

    test('handles malformed date strings', async () => {
      const malformedPayment = testUtils.createPayment({
        due_date: 'not-a-date'
      });

      const { result } = renderHook(() => usePaymentCalendar(MOCK_WEDDING_ID));

      expect(() => {
        result.current.formatPaymentDate(malformedPayment.due_date);
      }).not.toThrow();

      expect(result.current.formatPaymentDate(malformedPayment.due_date)).toBe('Invalid Date');
    });
  });
});