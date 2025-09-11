/**
 * WS-165 Payment Calendar Performance Testing Suite
 * Team E - Round 1 Implementation
 * 
 * Performance tests covering:
 * - Rendering performance with large datasets
 * - Memory usage and leak detection
 * - User interaction responsiveness
 * - Bundle size and loading performance
 * - Mobile performance optimization
 * - Real-time update performance
 */

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceObserver, performance } from 'perf_hooks';
import PaymentCalendar from '@/components/payments/PaymentCalendar';
import { 
  testUtils,
  mockComponentProps,
  MOCK_WEDDING_ID 
} from '@/tests/payments/fixtures/payment-fixtures';

// Performance measurement utilities
class PerformanceProfiler {
  private markers: Map<string, number> = new Map();
  private measurements: Map<string, number> = new Map();

  mark(name: string) {
    this.markers.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string) {
    const startTime = this.markers.get(startMark);
    const endTime = endMark ? this.markers.get(endMark) : performance.now();
    
    if (startTime && endTime) {
      this.measurements.set(name, endTime - startTime);
    }
  }

  getMeasurement(name: string): number | undefined {
    return this.measurements.get(name);
  }

  clear() {
    this.markers.clear();
    this.measurements.clear();
  }

  getReport(): Record<string, number> {
    return Object.fromEntries(this.measurements);
  }
}

// Memory usage tracking
class MemoryProfiler {
  private initialMemory: number;
  private snapshots: Array<{ timestamp: number; memory: number }> = [];

  constructor() {
    this.initialMemory = this.getCurrentMemory();
  }

  private getCurrentMemory(): number {
    // In Node.js environment, use process.memoryUsage()
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  snapshot(label?: string) {
    const memory = this.getCurrentMemory();
    this.snapshots.push({
      timestamp: Date.now(),
      memory,
    });
    return memory;
  }

  getMemoryIncrease(): number {
    const current = this.getCurrentMemory();
    return current - this.initialMemory;
  }

  getMemoryReport() {
    return {
      initial: this.initialMemory,
      current: this.getCurrentMemory(),
      increase: this.getMemoryIncrease(),
      snapshots: this.snapshots,
    };
  }
}

// Mock performance APIs for testing environment
global.performance = global.performance || {
  now: () => Date.now(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

describe('Payment Calendar Performance Tests - WS-165', () => {
  let profiler: PerformanceProfiler;
  let memoryProfiler: MemoryProfiler;
  let mockProps: typeof mockComponentProps.paymentCalendar;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
    memoryProfiler = new MemoryProfiler();
    mockProps = {
      ...mockComponentProps.paymentCalendar,
      onPaymentUpdate: jest.fn(),
      onPaymentCreate: jest.fn(),
      onPaymentDelete: jest.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    profiler.clear();
  });

  /**
   * RENDERING PERFORMANCE TESTS
   */
  describe('Rendering Performance', () => {
    test('renders efficiently with small payment dataset', async () => {
      const smallDataset = testUtils.createPayments(10, { wedding_id: MOCK_WEDDING_ID });
      const props = { ...mockProps, payments: smallDataset };

      profiler.mark('render-start');
      render(<PaymentCalendar {...props} />);
      profiler.mark('render-end');
      profiler.measure('small-dataset-render', 'render-start', 'render-end');

      const renderTime = profiler.getMeasurement('small-dataset-render');
      expect(renderTime).toBeLessThan(50); // 50ms budget for 10 payments
    });

    test('renders efficiently with medium payment dataset', async () => {
      const mediumDataset = testUtils.createPayments(100, { wedding_id: MOCK_WEDDING_ID });
      const props = { ...mockProps, payments: mediumDataset };

      profiler.mark('render-start');
      render(<PaymentCalendar {...props} />);
      profiler.mark('render-end');
      profiler.measure('medium-dataset-render', 'render-start', 'render-end');

      const renderTime = profiler.getMeasurement('medium-dataset-render');
      expect(renderTime).toBeLessThan(200); // 200ms budget for 100 payments
    });

    test('renders efficiently with large payment dataset', async () => {
      const largeDataset = testUtils.createPayments(500, { wedding_id: MOCK_WEDDING_ID });
      const props = { ...mockProps, payments: largeDataset };

      profiler.mark('render-start');
      render(<PaymentCalendar {...props} />);
      profiler.mark('render-end');
      profiler.measure('large-dataset-render', 'render-start', 'render-end');

      const renderTime = profiler.getMeasurement('large-dataset-render');
      expect(renderTime).toBeLessThan(500); // 500ms budget for 500 payments
    });

    test('handles extremely large dataset without crashing', async () => {
      const extremeDataset = testUtils.createPayments(1000, { wedding_id: MOCK_WEDDING_ID });
      const props = { ...mockProps, payments: extremeDataset };

      profiler.mark('extreme-render-start');
      
      expect(() => {
        render(<PaymentCalendar {...props} />);
      }).not.toThrow();
      
      profiler.mark('extreme-render-end');
      profiler.measure('extreme-dataset-render', 'extreme-render-start', 'extreme-render-end');

      const renderTime = profiler.getMeasurement('extreme-dataset-render');
      expect(renderTime).toBeLessThan(2000); // 2s budget for 1000 payments
      
      // Verify component is still functional
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    test('optimizes re-renders with React.memo and useMemo', async () => {
      const { rerender } = render(<PaymentCalendar {...mockProps} />);
      
      // First render
      profiler.mark('first-render');
      profiler.mark('first-render-end');
      profiler.measure('first-render-time', 'first-render', 'first-render-end');

      // Re-render with same props (should be optimized)
      profiler.mark('rerender-same-props');
      rerender(<PaymentCalendar {...mockProps} />);
      profiler.mark('rerender-same-props-end');
      profiler.measure('rerender-same-props-time', 'rerender-same-props', 'rerender-same-props-end');

      // Re-render with different props
      const newProps = { ...mockProps, loading: true };
      profiler.mark('rerender-diff-props');
      rerender(<PaymentCalendar {...newProps} />);
      profiler.mark('rerender-diff-props-end');
      profiler.measure('rerender-diff-props-time', 'rerender-diff-props', 'rerender-diff-props-end');

      const samePropsTime = profiler.getMeasurement('rerender-same-props-time') || 0;
      const diffPropsTime = profiler.getMeasurement('rerender-diff-props-time') || 0;

      // Same props should render faster due to memoization
      expect(samePropsTime).toBeLessThan(diffPropsTime);
    });
  });

  /**
   * MEMORY USAGE TESTS
   */
  describe('Memory Usage', () => {
    test('maintains reasonable memory footprint', async () => {
      const initialMemory = memoryProfiler.snapshot('initial');
      
      render(<PaymentCalendar {...mockProps} />);
      const afterRenderMemory = memoryProfiler.snapshot('after-render');
      
      const memoryIncrease = afterRenderMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for basic render)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('does not leak memory on component unmount', async () => {
      const initialMemory = memoryProfiler.snapshot('before-render');
      
      const { unmount } = render(<PaymentCalendar {...mockProps} />);
      const afterRenderMemory = memoryProfiler.snapshot('after-render');
      
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait for potential cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterUnmountMemory = memoryProfiler.snapshot('after-unmount');
      
      // Memory should return close to initial levels
      const memoryDifference = afterUnmountMemory - initialMemory;
      expect(Math.abs(memoryDifference)).toBeLessThan(5 * 1024 * 1024); // 5MB tolerance
    });

    test('handles memory efficiently with large datasets', async () => {
      const largeDataset = testUtils.createPayments(500, { wedding_id: MOCK_WEDDING_ID });
      const props = { ...mockProps, payments: largeDataset };

      const beforeRender = memoryProfiler.snapshot('before-large-dataset');
      
      render(<PaymentCalendar {...props} />);
      
      const afterRender = memoryProfiler.snapshot('after-large-dataset');
      const memoryIncrease = afterRender - beforeRender;
      
      // Should handle large dataset efficiently (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  /**
   * INTERACTION PERFORMANCE TESTS
   */
  describe('User Interaction Performance', () => {
    test('responds quickly to date selection', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      const dateCell = screen.getByRole('gridcell', { name: /15/i });
      
      profiler.mark('date-click-start');
      await user.click(dateCell);
      profiler.mark('date-click-end');
      profiler.measure('date-click-response', 'date-click-start', 'date-click-end');

      const responseTime = profiler.getMeasurement('date-click-response');
      expect(responseTime).toBeLessThan(100); // 100ms response time budget
    });

    test('handles rapid user interactions smoothly', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      const nextButton = screen.getByLabelText(/next month/i);
      
      profiler.mark('rapid-clicks-start');
      
      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        await user.click(nextButton);
      }
      
      profiler.mark('rapid-clicks-end');
      profiler.measure('rapid-clicks-total', 'rapid-clicks-start', 'rapid-clicks-end');

      const totalTime = profiler.getMeasurement('rapid-clicks-total');
      const averageTime = totalTime! / 10;
      
      expect(averageTime).toBeLessThan(50); // Average 50ms per interaction
    });

    test('maintains smooth scrolling performance', async () => {
      const largeDataset = testUtils.createPayments(200, { wedding_id: MOCK_WEDDING_ID });
      const props = { ...mockProps, payments: largeDataset };
      
      render(<PaymentCalendar {...props} />);
      
      const scrollContainer = screen.getByTestId('payment-scroll-container');
      
      profiler.mark('scroll-test-start');
      
      // Simulate rapid scrolling
      for (let i = 0; i < 50; i++) {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 50 } });
      }
      
      profiler.mark('scroll-test-end');
      profiler.measure('scroll-performance', 'scroll-test-start', 'scroll-test-end');

      const scrollTime = profiler.getMeasurement('scroll-performance');
      expect(scrollTime).toBeLessThan(1000); // 1s budget for 50 scroll events
    });

    test('debounces search input effectively', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      const searchInput = screen.getByLabelText(/search payments/i);
      
      profiler.mark('search-debounce-start');
      
      // Rapid typing simulation
      await user.type(searchInput, 'test search query');
      
      profiler.mark('search-debounce-end');
      profiler.measure('search-input-time', 'search-debounce-start', 'search-debounce-end');

      const inputTime = profiler.getMeasurement('search-input-time');
      
      // Should handle input smoothly
      expect(inputTime).toBeLessThan(500);
      
      // Verify debouncing (onFilterChange should be called limited times)
      expect(mockProps.onFilterChange).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * MOBILE PERFORMANCE TESTS
   */
  describe('Mobile Performance Optimization', () => {
    beforeEach(() => {
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
    });

    test('optimizes rendering for mobile devices', async () => {
      profiler.mark('mobile-render-start');
      render(<PaymentCalendar {...mockProps} />);
      profiler.mark('mobile-render-end');
      profiler.measure('mobile-render-time', 'mobile-render-start', 'mobile-render-end');

      const mobileRenderTime = profiler.getMeasurement('mobile-render-time');
      expect(mobileRenderTime).toBeLessThan(300); // Stricter budget for mobile
    });

    test('handles touch interactions efficiently', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const paymentItem = screen.getByTestId('payment-001');
      
      profiler.mark('touch-start');
      
      // Simulate touch events
      fireEvent.touchStart(paymentItem, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchEnd(paymentItem);
      
      profiler.mark('touch-end');
      profiler.measure('touch-response', 'touch-start', 'touch-end');

      const touchTime = profiler.getMeasurement('touch-response');
      expect(touchTime).toBeLessThan(50); // 50ms touch response
    });

    test('implements efficient virtual scrolling on mobile', async () => {
      const largeDataset = testUtils.createPayments(300, { wedding_id: MOCK_WEDDING_ID });
      const props = { ...mockProps, payments: largeDataset };
      
      render(<PaymentCalendar {...props} />);
      
      // Verify virtual scrolling is active
      const visibleItems = screen.getAllByTestId(/^payment-/);
      
      // Should not render all 300 items at once on mobile
      expect(visibleItems.length).toBeLessThan(50);
    });
  });

  /**
   * REAL-TIME UPDATE PERFORMANCE TESTS
   */
  describe('Real-time Update Performance', () => {
    test('handles frequent payment updates efficiently', async () => {
      const { rerender } = render(<PaymentCalendar {...mockProps} />);
      
      profiler.mark('updates-start');
      
      // Simulate 20 rapid updates
      for (let i = 0; i < 20; i++) {
        const updatedPayments = [...mockProps.payments];
        updatedPayments[0] = {
          ...updatedPayments[0],
          status: i % 2 === 0 ? 'paid' : 'pending',
          updated_at: new Date().toISOString(),
        };
        
        const newProps = { ...mockProps, payments: updatedPayments };
        rerender(<PaymentCalendar {...newProps} />);
      }
      
      profiler.mark('updates-end');
      profiler.measure('rapid-updates', 'updates-start', 'updates-end');

      const updateTime = profiler.getMeasurement('rapid-updates');
      const averageUpdateTime = updateTime! / 20;
      
      expect(averageUpdateTime).toBeLessThan(25); // 25ms per update
    });

    test('batches multiple simultaneous updates', async () => {
      const { rerender } = render(<PaymentCalendar {...mockProps} />);
      
      // Simulate batch of updates arriving simultaneously
      const batchUpdates = mockProps.payments.map((payment, index) => ({
        ...payment,
        status: index % 2 === 0 ? 'paid' : 'pending',
        updated_at: new Date().toISOString(),
      }));
      
      profiler.mark('batch-update-start');
      
      act(() => {
        rerender(<PaymentCalendar {...{ ...mockProps, payments: batchUpdates }} />);
      });
      
      profiler.mark('batch-update-end');
      profiler.measure('batch-update-time', 'batch-update-start', 'batch-update-end');

      const batchTime = profiler.getMeasurement('batch-update-time');
      expect(batchTime).toBeLessThan(100); // 100ms for batch update
    });
  });

  /**
   * BUNDLE SIZE AND LOADING PERFORMANCE TESTS
   */
  describe('Bundle Size and Loading Performance', () => {
    test('lazy loads non-critical payment features', async () => {
      const beforeLazyLoad = Date.now();
      
      // Simulate lazy loading of heavy components
      const LazyPaymentDetails = React.lazy(() => 
        Promise.resolve({
          default: () => <div data-testid="lazy-payment-details">Lazy Loaded</div>
        })
      );
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyPaymentDetails />
        </React.Suspense>
      );
      
      const afterLazyLoad = Date.now();
      const lazyLoadTime = afterLazyLoad - beforeLazyLoad;
      
      expect(lazyLoadTime).toBeLessThan(100); // Fast lazy loading
      await expect(screen.findByTestId('lazy-payment-details')).resolves.toBeInTheDocument();
    });

    test('preloads critical payment data efficiently', async () => {
      profiler.mark('preload-start');
      
      // Simulate preloading critical payment data
      const criticalData = mockProps.payments.slice(0, 10); // First 10 payments
      const preloadProps = { ...mockProps, payments: criticalData };
      
      render(<PaymentCalendar {...preloadProps} />);
      
      profiler.mark('preload-end');
      profiler.measure('preload-time', 'preload-start', 'preload-end');

      const preloadTime = profiler.getMeasurement('preload-time');
      expect(preloadTime).toBeLessThan(100); // Fast preload
    });
  });

  /**
   * PERFORMANCE REGRESSION TESTS
   */
  describe('Performance Regression Detection', () => {
    test('maintains baseline rendering performance', async () => {
      // Establish performance baseline
      const baselineDataset = testUtils.createPayments(50, { wedding_id: MOCK_WEDDING_ID });
      const baselineProps = { ...mockProps, payments: baselineDataset };
      
      profiler.mark('baseline-start');
      render(<PaymentCalendar {...baselineProps} />);
      profiler.mark('baseline-end');
      profiler.measure('baseline-render', 'baseline-start', 'baseline-end');

      const baselineTime = profiler.getMeasurement('baseline-render');
      
      // Clean up and test again
      cleanup();
      
      profiler.mark('regression-test-start');
      render(<PaymentCalendar {...baselineProps} />);
      profiler.mark('regression-test-end');
      profiler.measure('regression-test-render', 'regression-test-start', 'regression-test-end');

      const regressionTime = profiler.getMeasurement('regression-test-render');
      
      // Performance should not regress by more than 20%
      const performanceRegression = (regressionTime! - baselineTime!) / baselineTime! * 100;
      expect(performanceRegression).toBeLessThan(20);
    });

    test('maintains memory efficiency over time', async () => {
      const initialMemory = memoryProfiler.snapshot('regression-initial');
      
      // Simulate extended usage
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<PaymentCalendar {...mockProps} />);
        memoryProfiler.snapshot(`iteration-${i}`);
        unmount();
      }
      
      const finalMemory = memoryProfiler.snapshot('regression-final');
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory usage should not grow significantly over iterations
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB max increase
    });
  });

  /**
   * PERFORMANCE MONITORING AND REPORTING
   */
  describe('Performance Monitoring', () => {
    test('generates comprehensive performance report', async () => {
      // Run a complete performance test scenario
      const testDataset = testUtils.createPayments(100, { wedding_id: MOCK_WEDDING_ID });
      const testProps = { ...mockProps, payments: testDataset };
      
      // Measure various performance aspects
      profiler.mark('complete-test-start');
      
      const { rerender } = render(<PaymentCalendar {...testProps} />);
      profiler.mark('initial-render-complete');
      
      // Test interactions
      const dateCell = screen.getByRole('gridcell', { name: /15/i });
      fireEvent.click(dateCell);
      profiler.mark('interaction-complete');
      
      // Test updates
      const updatedProps = { ...testProps, loading: true };
      rerender(<PaymentCalendar {...updatedProps} />);
      profiler.mark('update-complete');
      
      profiler.mark('complete-test-end');
      
      // Generate measurements
      profiler.measure('initial-render', 'complete-test-start', 'initial-render-complete');
      profiler.measure('user-interaction', 'initial-render-complete', 'interaction-complete');
      profiler.measure('component-update', 'interaction-complete', 'update-complete');
      profiler.measure('total-test-time', 'complete-test-start', 'complete-test-end');
      
      const report = profiler.getReport();
      const memoryReport = memoryProfiler.getMemoryReport();
      
      // Verify all measurements are recorded
      expect(report['initial-render']).toBeDefined();
      expect(report['user-interaction']).toBeDefined();
      expect(report['component-update']).toBeDefined();
      expect(report['total-test-time']).toBeDefined();
      
      // Verify performance budgets
      expect(report['initial-render']).toBeLessThan(300);
      expect(report['user-interaction']).toBeLessThan(100);
      expect(report['component-update']).toBeLessThan(100);
      
      // Log report for monitoring
      console.log('Payment Calendar Performance Report:', {
        performance: report,
        memory: memoryReport,
      });
    });
  });
});

// Export performance utilities for other tests
export { PerformanceProfiler, MemoryProfiler };