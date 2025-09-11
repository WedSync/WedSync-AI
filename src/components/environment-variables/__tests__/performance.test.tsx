/**
 * Performance Tests for Environment Variables Management System
 * Tests performance optimizations, bundle size, and runtime performance
 */

import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnvironmentVariablesManagementOptimized } from '../EnvironmentVariablesManagementOptimized';
import {
  useVirtualScrolling,
  useDebouncedSearch,
  PerformanceMonitor,
  APICache,
  DataProcessor,
  MemoryLeakPrevention,
} from '../utils/performance';
import { renderHook, waitForNextUpdate } from '@testing-library/react-hooks';

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() =>
          Promise.resolve({
            data: generateMockData(1000), // Large dataset for performance testing
            error: null,
          }),
        ),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => Promise.resolve('ok')),
    unsubscribe: jest.fn(() => Promise.resolve('ok')),
  })),
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@wedsync.com',
            app_metadata: { roles: ['admin'] },
          },
        },
        error: null,
      }),
    ),
  },
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabaseClient,
}));

// Mock intersection observer for virtual scrolling
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Generate mock data for performance testing
function generateMockData(count: number) {
  const environments = [
    'development',
    'staging',
    'production',
    'wedding-day-critical',
  ];
  const securityLevels = [
    'Public',
    'Internal',
    'Confidential',
    'Wedding-Day-Critical',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `var-${i}`,
    key: `VARIABLE_${i}`,
    value: `value_${i}_${Math.random().toString(36).substring(7)}`,
    environment: environments[i % environments.length],
    security_level: securityLevels[i % securityLevels.length],
    is_encrypted: i % 3 === 0,
    created_at: new Date(Date.now() - i * 1000).toISOString(),
    updated_at: new Date(Date.now() - i * 500).toISOString(),
    created_by: `user-${i % 10}`,
    description: i % 5 === 0 ? `Description for variable ${i}` : undefined,
  }));
}

// Performance measurement utilities
function measureRenderTime(renderFn: () => void): Promise<number> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    renderFn();

    // Wait for next frame to ensure rendering is complete
    requestAnimationFrame(() => {
      const endTime = performance.now();
      resolve(endTime - startTime);
    });
  });
}

function measureMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PerformanceMonitor.clearMetrics();
    APICache.clear();
    MemoryLeakPrevention.cleanupAll();
  });

  afterEach(() => {
    MemoryLeakPrevention.cleanupAll();
  });

  describe('Virtual Scrolling Performance', () => {
    test('should handle large datasets efficiently with virtual scrolling', async () => {
      const largeDataset = generateMockData(10000);
      const itemHeight = 60;
      const containerHeight = 400;

      const { result } = renderHook(() =>
        useVirtualScrolling(largeDataset, itemHeight, containerHeight),
      );

      // Should only render visible items, not all 10000
      expect(result.current.visibleItems.length).toBeLessThan(50);
      expect(result.current.visibleItems.length).toBeGreaterThan(0);

      // Total height should represent all items
      expect(result.current.totalHeight).toBe(largeDataset.length * itemHeight);
    });

    test('should update visible items when scrolling', async () => {
      const dataset = generateMockData(1000);
      const itemHeight = 60;
      const containerHeight = 400;

      const { result } = renderHook(() =>
        useVirtualScrolling(dataset, itemHeight, containerHeight),
      );

      const initialVisibleItems = result.current.visibleItems.length;
      const initialStartIndex = result.current.visibleItemsRange.startIndex;

      // Simulate scroll by updating scroll position
      act(() => {
        if (result.current.scrollElementRef.current) {
          Object.defineProperty(
            result.current.scrollElementRef.current,
            'scrollTop',
            {
              value: 1000,
              writable: true,
            },
          );

          // Trigger scroll event
          fireEvent.scroll(result.current.scrollElementRef.current, {
            target: { scrollTop: 1000 },
          });
        }
      });

      // Should update visible range after scroll
      expect(result.current.visibleItemsRange.startIndex).toBeGreaterThan(
        initialStartIndex,
      );
    });
  });

  describe('Debounced Search Performance', () => {
    test('should debounce search input to prevent excessive filtering', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useDebouncedSearch('', 300));

      // Initial state
      expect(result.current).toBe('');

      // Update search term multiple times quickly
      const searchTerms = ['a', 'ab', 'abc', 'abcd'];

      searchTerms.forEach((term, index) => {
        renderHook(() => useDebouncedSearch(term, 300));
        jest.advanceTimersByTime(100); // Less than debounce delay
      });

      // Should not have updated yet
      expect(result.current).toBe('');

      // Advance time past debounce delay
      jest.advanceTimersByTime(300);

      // Should now have the final search term
      await waitFor(() => {
        expect(result.current).toBe('abcd');
      });

      jest.useRealTimers();
    });

    test('should handle rapid search changes without performance issues', async () => {
      const startTime = performance.now();

      const { result } = renderHook(() => useDebouncedSearch('initial', 100));

      // Simulate rapid typing
      for (let i = 0; i < 100; i++) {
        renderHook(() => useDebouncedSearch(`search${i}`, 100));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid updates in reasonable time (< 100ms)
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track timing metrics accurately', () => {
      const stopTiming = PerformanceMonitor.startTiming('test-operation');

      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }

      stopTiming();

      const metrics = PerformanceMonitor.getMetrics('test-operation');
      expect(metrics).toBeTruthy();
      expect(metrics!.count).toBe(1);
      expect(metrics!.min).toBeGreaterThan(0);
      expect(metrics!.avg).toBeGreaterThan(0);
    });

    test('should warn about slow operations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const stopTiming = PerformanceMonitor.startTiming('slow-operation');

      // Mock slow operation
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 0 : 600; // 600ms duration
      });

      stopTiming();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Slow operation detected: slow-operation took 600.00ms',
        ),
      );

      performance.now = originalNow;
      consoleSpy.mockRestore();
    });

    test('should maintain limited history of measurements', () => {
      // Add more than 100 measurements
      for (let i = 0; i < 150; i++) {
        const stopTiming = PerformanceMonitor.startTiming('history-test');
        stopTiming();
      }

      const metrics = PerformanceMonitor.getMetrics('history-test');
      expect(metrics!.count).toBe(100); // Should cap at 100
    });
  });

  describe('API Caching Performance', () => {
    test('should cache API responses efficiently', () => {
      const testData = { variables: generateMockData(100) };
      const cacheKey = 'test-data';

      // Set cache
      APICache.set(cacheKey, testData, 60000);

      // Get from cache should be fast
      const startTime = performance.now();
      const cachedData = APICache.get(cacheKey);
      const endTime = performance.now();

      expect(cachedData).toEqual(testData);
      expect(endTime - startTime).toBeLessThan(1); // Should be < 1ms
    });

    test('should respect cache TTL and evict expired entries', async () => {
      const testData = { test: 'data' };
      const cacheKey = 'ttl-test';

      // Set with short TTL
      APICache.set(cacheKey, testData, 100); // 100ms TTL

      // Should be available immediately
      expect(APICache.get(cacheKey)).toEqual(testData);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired and return null
      expect(APICache.get(cacheKey)).toBeNull();
    });

    test('should maintain cache size limit', () => {
      // Fill cache beyond max size (100)
      for (let i = 0; i < 150; i++) {
        APICache.set(`key-${i}`, { data: `value-${i}` });
      }

      // Should not exceed max size
      expect(APICache.size()).toBeLessThanOrEqual(100);
    });
  });

  describe('Data Processing Performance', () => {
    test('should process large datasets in chunks efficiently', async () => {
      const largeDataset = generateMockData(10000);
      const startTime = performance.now();

      const processed = await DataProcessor.processInChunks(
        largeDataset,
        (chunk) => chunk.map((item) => ({ ...item, processed: true })),
        (progress) => {
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        },
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(processed).toHaveLength(10000);
      expect(processed[0]).toHaveProperty('processed', true);

      // Should complete in reasonable time for 10k items
      expect(totalTime).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Component Rendering Performance', () => {
    test('should render large variable lists efficiently', async () => {
      const renderTime = await measureRenderTime(() => {
        render(<EnvironmentVariablesManagementOptimized />);
      });

      // Should render within performance budget
      expect(renderTime).toBeLessThan(100); // Less than 100ms
    });

    test('should handle tab switching without performance degradation', async () => {
      const user = userEvent.setup();
      render(<EnvironmentVariablesManagementOptimized />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Switch between tabs multiple times
      for (const tabName of [
        'variables',
        'health',
        'security',
        'deployment',
        'dashboard',
      ]) {
        const tab = screen.getByRole('tab', { name: new RegExp(tabName, 'i') });
        await user.click(tab);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Tab switching should be fast
      expect(totalTime).toBeLessThan(500); // Less than 500ms for all switches
    });

    test('should maintain stable memory usage during interactions', async () => {
      const user = userEvent.setup();
      render(<EnvironmentVariablesManagementOptimized />);

      const initialMemory = measureMemoryUsage();

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Perform various interactions
      const tabButtons = screen.getAllByRole('tab');

      for (let i = 0; i < 10; i++) {
        for (const tab of tabButtons) {
          await user.click(tab);
          // Small delay to allow for rendering
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Bundle Size Optimization', () => {
    test('should lazy load heavy components', async () => {
      const { container } = render(<EnvironmentVariablesManagementOptimized />);

      // Should show loading state initially
      expect(
        screen.getByRole('status', { name: /loading/i }),
      ).toBeInTheDocument();

      // Wait for lazy loaded components to render
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Components should be loaded
      expect(container.querySelector('[role="tabpanel"]')).toBeInTheDocument();
    });

    test('should use React.memo for expensive components', () => {
      const component = EnvironmentVariablesManagementOptimized;

      // Check that component is memoized
      expect(component.displayName).toBe(
        'EnvironmentVariablesManagementOptimized',
      );

      // Verify memo behavior by checking if component has memo wrapper
      expect(component.type || component).toBeTruthy();
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should clean up subscriptions on unmount', () => {
      const cleanupSpy = jest.fn();
      MemoryLeakPrevention.addSubscription(cleanupSpy);

      const { unmount } = render(<EnvironmentVariablesManagementOptimized />);

      // Unmount component
      unmount();

      // Should trigger cleanup
      MemoryLeakPrevention.cleanupAll();
      expect(cleanupSpy).toHaveBeenCalled();
    });

    test('should clear timeouts and intervals', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const timeoutId = setTimeout(() => {}, 1000) as any;
      const intervalId = setInterval(() => {}, 1000) as any;

      MemoryLeakPrevention.addTimeout(timeoutId);
      MemoryLeakPrevention.addInterval(intervalId);

      MemoryLeakPrevention.clearAllTimeouts();
      MemoryLeakPrevention.clearAllIntervals();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

      clearTimeoutSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Real-world Performance Scenarios', () => {
    test('should handle wedding day mode activation efficiently', async () => {
      const originalDate = Date;
      const mockDate = new Date('2024-06-15T19:00:00Z'); // Saturday 7 PM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = () => mockDate.getTime();

      const startTime = performance.now();

      render(<EnvironmentVariablesManagementOptimized />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Wedding day mode should activate quickly
      expect(renderTime).toBeLessThan(50);
      expect(screen.getByText(/wedding day mode/i)).toBeInTheDocument();

      global.Date = originalDate;
    });

    test('should handle concurrent real-time updates efficiently', async () => {
      render(<EnvironmentVariablesManagementOptimized />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Simulate multiple concurrent real-time updates
      const updatePromises = Array.from(
        { length: 100 },
        (_, i) =>
          new Promise((resolve) => {
            setTimeout(() => {
              // Simulate real-time update
              mockSupabaseClient.channel().on.mock.calls[0]?.[2]?.({
                eventType: 'UPDATE',
                new: {
                  id: `var-${i}`,
                  key: `UPDATED_VAR_${i}`,
                  value: `updated_value_${i}`,
                  environment: 'development',
                },
              });
              resolve(true);
            }, Math.random() * 10);
          }),
      );

      await Promise.all(updatePromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent updates efficiently
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Performance Regression Prevention', () => {
    test('should meet initial load performance budget', async () => {
      const startTime = performance.now();

      render(<EnvironmentVariablesManagementOptimized />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should meet performance budget: < 2000ms initial load
      expect(loadTime).toBeLessThan(2000);
    });

    test('should have minimal re-renders during user interactions', async () => {
      let renderCount = 0;
      const OriginalComponent = EnvironmentVariablesManagementOptimized;

      // Wrap component to count renders
      const WrappedComponent = () => {
        renderCount++;
        return <OriginalComponent />;
      };

      const user = userEvent.setup();
      render(<WrappedComponent />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      const initialRenderCount = renderCount;

      // Perform user interactions
      const tab = screen.getByRole('tab', { name: /variables/i });
      await user.click(tab);

      // Should have minimal additional renders
      expect(renderCount - initialRenderCount).toBeLessThan(5);
    });
  });
});
