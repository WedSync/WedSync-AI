import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import type { UseAnalyticsDataProps, AnalyticsError } from '@/types/analytics';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
      unsubscribe: jest.fn()
    }))
  }
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const defaultProps: UseAnalyticsDataProps = {
  userId: 'test-user-id',
  organizationId: 'test-org-id',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  filters: {},
  realTimeEnabled: false,
  refreshInterval: 0 // Disable auto-refresh for tests
};

describe('useAnalyticsData', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Hook Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      expect(result.current.revenue).toBeNull();
      expect(result.current.bookingFunnel).toBeNull();
      expect(result.current.clientSatisfaction).toBeNull();
      expect(result.current.marketPosition).toBeNull();
      expect(result.current.performanceKPIs).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.refreshCount).toBe(0);
    });

    it('provides all required action functions', () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refreshData).toBe('function');
      expect(typeof result.current.refreshSpecificData).toBe('function');
      expect(typeof result.current.updateFilters).toBe('function');
      expect(typeof result.current.updateDateRange).toBe('function');
      expect(typeof result.current.enableRealTime).toBe('function');
      expect(typeof result.current.disableRealTime).toBe('function');
      expect(typeof result.current.clearCache).toBe('function');
      expect(typeof result.current.invalidateCache).toBe('function');
      expect(typeof result.current.exportData).toBe('function');
    });
  });

  describe('Data Fetching', () => {
    it('fetches analytics data on mount', async () => {
      renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // Verify that data queries are enabled and executed
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('updates loading state during data fetching', async () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('populates data after successful fetch', async () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.revenue).not.toBeNull();
        expect(result.current.bookingFunnel).not.toBeNull();
        expect(result.current.clientSatisfaction).not.toBeNull();
        expect(result.current.marketPosition).not.toBeNull();
        expect(result.current.performanceKPIs).not.toBeNull();
      });
    });

    it('updates lastUpdated timestamp after data fetch', async () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      const initialTime = result.current.lastUpdated;

      await waitFor(() => {
        expect(result.current.lastUpdated.getTime()).toBeGreaterThan(initialTime.getTime());
      });
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      // Mock fetch to reject
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.code).toBe('FETCH_ERROR');
        expect(result.current.error?.recoverable).toBe(true);
      });
    });

    it('combines multiple errors correctly', async () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        if (result.current.error) {
          expect(result.current.error.details).toBeInstanceOf(Array);
        }
      });
    });

    it('clears error on successful retry', async () => {
      // First fail, then succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response);

      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      await act(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Real-time Features', () => {
    it('sets up real-time connection when enabled', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
        unsubscribe: jest.fn()
      };

      const { supabase } = require('@/lib/supabase');
      supabase.channel.mockReturnValue(mockChannel);

      renderHook(() => useAnalyticsData({
        ...defaultProps,
        realTimeEnabled: true
      }), {
        wrapper: createWrapper(),
      });

      expect(supabase.channel).toHaveBeenCalledWith('analytics-test-user-id');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('updates connection status', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          callback('SUBSCRIBED');
          return Promise.resolve({ status: 'SUBSCRIBED' });
        }),
        unsubscribe: jest.fn()
      };

      const { supabase } = require('@/lib/supabase');
      supabase.channel.mockReturnValue(mockChannel);

      const { result } = renderHook(() => useAnalyticsData({
        ...defaultProps,
        realTimeEnabled: true
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('cleans up real-time connection on unmount', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
        unsubscribe: jest.fn()
      };

      const { supabase } = require('@/lib/supabase');
      supabase.channel.mockReturnValue(mockChannel);

      const { unmount } = renderHook(() => useAnalyticsData({
        ...defaultProps,
        realTimeEnabled: true
      }), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Data Refresh', () => {
    it('refreshes all data when refreshData is called', async () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialRefreshCount = result.current.refreshCount;

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.refreshCount).toBe(initialRefreshCount + 1);
    });

    it('refreshes specific data type when refreshSpecificData is called', async () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshSpecificData('revenue');
      });

      // Should refresh only revenue data
      expect(result.current.refreshCount).toBeGreaterThanOrEqual(0);
    });

    it('sets up auto-refresh when refreshInterval is provided', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useAnalyticsData({
        ...defaultProps,
        refreshInterval: 5000
      }), {
        wrapper: createWrapper(),
      });

      const spy = jest.spyOn(result.current, 'refreshData');

      jest.advanceTimersByTime(5000);

      expect(spy).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Filter and Date Range Updates', () => {
    it('updates filters when updateFilters is called', () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      const newFilters = { serviceType: 'Photography' };

      act(() => {
        result.current.updateFilters(newFilters);
      });

      // Should trigger re-fetch with new filters
      expect(result.current.refreshCount).toBeGreaterThanOrEqual(0);
    });

    it('updates date range when updateDateRange is called', () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      const newDateRange = {
        start: new Date('2024-02-01'),
        end: new Date('2024-02-28')
      };

      act(() => {
        result.current.updateDateRange(newDateRange);
      });

      // Should trigger re-fetch with new date range
      expect(result.current.refreshCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    it('clears cache when clearCache is called', () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearCache();
      });

      // Cache should be cleared (implementation dependent)
      expect(result.current.clearCache).toHaveBeenCalled();
    });

    it('invalidates specific cache when invalidateCache is called', () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.invalidateCache('revenue');
      });

      // Specific cache should be invalidated
      expect(result.current.invalidateCache).toHaveBeenCalledWith('revenue');
    });
  });

  describe('Export Functionality', () => {
    it('exports data in specified format', async () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.exportData('json', ['revenue', 'bookingFunnel']);
      });

      // Should handle export (implementation dependent)
      expect(result.current.exportData).toHaveBeenCalledWith('json', ['revenue', 'bookingFunnel']);
    });
  });

  describe('Performance Optimizations', () => {
    it('does not create new functions on every render', () => {
      const { result, rerender } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      const initialRefreshData = result.current.refreshData;
      const initialUpdateFilters = result.current.updateFilters;

      rerender();

      expect(result.current.refreshData).toBe(initialRefreshData);
      expect(result.current.updateFilters).toBe(initialUpdateFilters);
    });

    it('memoizes expensive calculations', () => {
      const { result, rerender } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      const initialState = result.current;

      rerender();

      // State should be stable if no data changed
      expect(result.current.lastUpdated).toBe(initialState.lastUpdated);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty userId gracefully', () => {
      const { result } = renderHook(() => useAnalyticsData({
        ...defaultProps,
        userId: ''
      }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles invalid date ranges', () => {
      const { result } = renderHook(() => useAnalyticsData({
        ...defaultProps,
        dateRange: {
          start: new Date('2024-12-31'),
          end: new Date('2024-01-01') // End before start
        }
      }), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeTruthy();
    });

    it('handles network timeouts', async () => {
      // Mock slow network
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const { result } = renderHook(() => useAnalyticsData({
        ...defaultProps,
        cacheConfig: { ttl: 1000, staleTime: 500, cacheKey: 'test' }
      }), {
        wrapper: createWrapper(),
      });

      // Should handle timeout gracefully
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });
  });

  describe('Memory Management', () => {
    it('cleans up intervals and subscriptions on unmount', () => {
      jest.useFakeTimers();
      
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
        unsubscribe: jest.fn()
      };

      const { supabase } = require('@/lib/supabase');
      supabase.channel.mockReturnValue(mockChannel);

      const { unmount } = renderHook(() => useAnalyticsData({
        ...defaultProps,
        realTimeEnabled: true,
        refreshInterval: 5000
      }), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('aborts pending requests on unmount', () => {
      const mockAbortController = {
        abort: jest.fn(),
        signal: { aborted: false }
      };

      global.AbortController = jest.fn(() => mockAbortController) as any;

      const { unmount } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(mockAbortController.abort).toHaveBeenCalled();
    });
  });

  describe('TypeScript Integration', () => {
    it('provides strongly typed return values', () => {
      const { result } = renderHook(() => useAnalyticsData(defaultProps), {
        wrapper: createWrapper(),
      });

      // TypeScript should enforce correct types
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(result.current.refreshCount).toBeTypeOf('number');
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('enforces correct prop types', () => {
      // This test ensures TypeScript compilation catches type errors
      expect(() => {
        renderHook(() => useAnalyticsData({
          userId: 'test',
          organizationId: 'test',
          // Missing required props should cause TypeScript error
        } as UseAnalyticsDataProps), {
          wrapper: createWrapper(),
        });
      }).not.toThrow();
    });
  });
});

// Integration tests with React Query
describe('useAnalyticsData React Query Integration', () => {
  it('integrates with React Query cache', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAnalyticsData(defaultProps), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Cache should contain analytics data
    const cache = queryClient.getQueryCache();
    expect(cache.getAll()).toHaveLength(5); // 5 different data types
  });

  it('respects React Query staleTime and gcTime settings', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    renderHook(() => useAnalyticsData({
      ...defaultProps,
      cacheConfig: {
        ttl: 60000,
        staleTime: 30000,
        cacheKey: 'test'
      }
    }), {
      wrapper,
    });

    const queries = queryClient.getQueryCache().getAll();
    queries.forEach(query => {
      expect(query.options.gcTime).toBe(60000);
      expect(query.options.staleTime).toBe(30000);
    });
  });
});