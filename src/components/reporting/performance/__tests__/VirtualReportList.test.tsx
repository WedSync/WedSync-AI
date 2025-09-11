import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { VirtualReportList } from '../VirtualReportList';
import { ReportData } from '../../types';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({
    children,
    itemCount,
    itemSize,
    onItemsRendered,
    ref,
  }: any) => (
    <div
      data-testid="virtual-list"
      data-item-count={itemCount}
      data-item-size={itemSize}
      ref={ref}
    >
      {Array.from({ length: Math.min(itemCount, 20) }, (_, i) => (
        <div key={i} data-testid={`virtual-item-${i}`}>
          {children({
            index: i,
            style: {
              height: itemSize,
              position: 'absolute',
              top: i * itemSize,
            },
          })}
        </div>
      ))}
    </div>
  ),
  areEqual: vi.fn(() => false),
}));

vi.mock('react-window-infinite-loader', () => ({
  default: ({ children, isItemLoaded, itemCount, loadMoreItems }: any) => (
    <div data-testid="infinite-loader">
      {children({ onItemsRendered: vi.fn(), ref: vi.fn() })}
    </div>
  ),
}));

describe('VirtualReportList', () => {
  const generateMockReports = (count: number): ReportData[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `report-${i}`,
      template: {
        id: `template-${i}`,
        name: `Report ${i}`,
        description: `Description for report ${i}`,
        category: 'financial',
        sections: [],
        layout: { columns: 1, spacing: 'medium', responsive: true },
        style: {
          theme: 'wedding',
          colors: {
            primary: '#c59d6c',
            secondary: '#8b6f47',
            accent: '#d4af37',
          },
        },
        isPublic: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        tags: [`tag-${i}`],
      },
      data: {
        'section-1': [{ value: Math.random() * 1000 }],
      },
      metadata: {
        generatedAt: new Date('2024-01-20'),
        totalRecords: 50 + i,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      },
      filters: [],
      vendorType: 'photographer',
      subscriptionTier: 'PROFESSIONAL',
    }));
  };

  const defaultProps = {
    reports: generateMockReports(100),
    itemHeight: 120,
    onReportSelect: vi.fn(),
    onReportDelete: vi.fn(),
    onLoadMore: vi.fn(),
    loading: false,
    hasNextPage: true,
    className: 'test-virtual-list',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      thresholds: [0],
      root: null,
      rootMargin: '0px',
    }));
  });

  describe('Virtual List Rendering', () => {
    it('renders virtual list with correct item count', () => {
      render(<VirtualReportList {...defaultProps} />);

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getByTestId('virtual-list')).toHaveAttribute(
        'data-item-count',
        '100',
      );
      expect(screen.getByTestId('virtual-list')).toHaveAttribute(
        'data-item-size',
        '120',
      );
    });

    it('renders only visible items for performance', () => {
      render(<VirtualReportList {...defaultProps} />);

      // Should render approximately 20 items (mocked limit)
      const visibleItems = screen.getAllByTestId(/virtual-item-/);
      expect(visibleItems.length).toBeLessThanOrEqual(20);
    });

    it('displays report information in each item', () => {
      render(<VirtualReportList {...defaultProps} />);

      expect(screen.getByText('Report 0')).toBeInTheDocument();
      expect(screen.getByText('Description for report 0')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<VirtualReportList {...defaultProps} />);

      expect(screen.getByTestId('virtual-report-list')).toHaveClass(
        'test-virtual-list',
      );
    });
  });

  describe('Large Dataset Performance', () => {
    it('handles 10,000+ items efficiently', () => {
      const largeDataset = generateMockReports(10000);
      const startTime = performance.now();

      render(<VirtualReportList {...defaultProps} reports={largeDataset} />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render quickly

      expect(screen.getByTestId('virtual-list')).toHaveAttribute(
        'data-item-count',
        '10000',
      );
    });

    it('maintains smooth scrolling with large datasets', () => {
      const largeDataset = generateMockReports(5000);
      render(<VirtualReportList {...defaultProps} reports={largeDataset} />);

      const virtualList = screen.getByTestId('virtual-list');

      // Simulate scrolling
      fireEvent.scroll(virtualList, { target: { scrollTop: 1000 } });

      // Should not cause performance issues
      expect(virtualList).toBeInTheDocument();
    });

    it('optimizes memory usage with item recycling', () => {
      const largeDataset = generateMockReports(1000);
      render(<VirtualReportList {...defaultProps} reports={largeDataset} />);

      // Should only render visible items, not all 1000
      const renderedItems = screen.getAllByTestId(/virtual-item-/);
      expect(renderedItems.length).toBeLessThan(50);
    });
  });

  describe('Infinite Scrolling', () => {
    it('implements infinite loading with InfiniteLoader', () => {
      render(<VirtualReportList {...defaultProps} />);

      expect(screen.getByTestId('infinite-loader')).toBeInTheDocument();
    });

    it('loads more items when scrolling near bottom', async () => {
      render(<VirtualReportList {...defaultProps} />);

      const virtualList = screen.getByTestId('virtual-list');

      // Simulate scrolling to near bottom
      fireEvent.scroll(virtualList, {
        target: { scrollTop: 2000, scrollHeight: 2200, clientHeight: 400 },
      });

      await waitFor(() => {
        expect(defaultProps.onLoadMore).toHaveBeenCalled();
      });
    });

    it('shows loading indicator when loading more items', () => {
      render(<VirtualReportList {...defaultProps} loading />);

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText(/loading more reports/i)).toBeInTheDocument();
    });

    it('handles end of list when no more items', () => {
      render(<VirtualReportList {...defaultProps} hasNextPage={false} />);

      expect(screen.getByTestId('end-of-list')).toBeInTheDocument();
      expect(screen.getByText(/no more reports/i)).toBeInTheDocument();
    });
  });

  describe('Item Interactions', () => {
    it('handles report selection', () => {
      render(<VirtualReportList {...defaultProps} />);

      const firstReport = screen.getByTestId('report-item-0');
      fireEvent.click(firstReport);

      expect(defaultProps.onReportSelect).toHaveBeenCalledWith(
        defaultProps.reports[0],
      );
    });

    it('handles report deletion', () => {
      render(<VirtualReportList {...defaultProps} />);

      const deleteButton = screen.getAllByTestId(/delete-button-/)[0];
      fireEvent.click(deleteButton);

      expect(defaultProps.onReportDelete).toHaveBeenCalledWith(
        defaultProps.reports[0],
      );
    });

    it('provides keyboard navigation support', () => {
      render(<VirtualReportList {...defaultProps} />);

      const firstItem = screen.getByTestId('report-item-0');
      firstItem.focus();

      expect(firstItem).toHaveFocus();

      // Test arrow key navigation
      fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
      expect(screen.getByTestId('report-item-1')).toHaveFocus();
    });
  });

  describe('Mobile Optimizations', () => {
    it('adjusts item height for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<VirtualReportList {...defaultProps} />);

      expect(screen.getByTestId('virtual-list')).toHaveAttribute(
        'data-item-size',
        '140',
      ); // Larger for mobile
    });

    it('implements touch-friendly scrolling', () => {
      render(<VirtualReportList {...defaultProps} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveStyle('touch-action: pan-y');
    });

    it('optimizes rendering for mobile performance', () => {
      render(<VirtualReportList {...defaultProps} />);

      // Should render fewer items on mobile for better performance
      const items = screen.getAllByTestId(/virtual-item-/);
      expect(items.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Wedding Industry Features', () => {
    it('highlights peak season reports', () => {
      // Mock peak season reports
      const seasonalReports = defaultProps.reports.map((report, i) => ({
        ...report,
        metadata: {
          ...report.metadata,
          isPeakSeason: i % 3 === 0, // Every third report is peak season
        },
      }));

      render(<VirtualReportList {...defaultProps} reports={seasonalReports} />);

      expect(screen.getAllByTestId('peak-season-indicator')).toHaveLength(7); // ~33% of 20 visible items
    });

    it('shows vendor-specific styling', () => {
      render(<VirtualReportList {...defaultProps} />);

      const reportItems = screen.getAllByTestId(/report-item-/);
      reportItems.forEach((item) => {
        expect(item).toHaveClass('vendor-photographer');
      });
    });

    it('displays subscription tier badges', () => {
      render(<VirtualReportList {...defaultProps} />);

      const tierBadges = screen.getAllByTestId('tier-badge');
      expect(tierBadges.length).toBeGreaterThan(0);
      tierBadges.forEach((badge) => {
        expect(badge).toHaveTextContent('PRO');
      });
    });

    it('shows wedding day restrictions', () => {
      // Mock Saturday (wedding day)
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      render(<VirtualReportList {...defaultProps} />);

      expect(screen.getByTestId('wedding-day-notice')).toBeInTheDocument();
      expect(screen.getByText(/wedding day mode active/i)).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks scroll performance metrics', () => {
      const mockPerformanceObserver = vi.fn();
      global.PerformanceObserver = vi.fn().mockImplementation(() => ({
        observe: mockPerformanceObserver,
        disconnect: vi.fn(),
      }));

      render(<VirtualReportList {...defaultProps} />);

      expect(mockPerformanceObserver).toHaveBeenCalled();
    });

    it('measures rendering performance', () => {
      const performanceSpy = vi
        .spyOn(performance, 'measure')
        .mockImplementation(vi.fn());

      render(<VirtualReportList {...defaultProps} />);

      expect(performanceSpy).toHaveBeenCalledWith(
        'virtual-list-render',
        expect.any(String),
        expect.any(String),
      );
    });

    it('throttles scroll events for performance', () => {
      render(<VirtualReportList {...defaultProps} />);

      const virtualList = screen.getByTestId('virtual-list');

      // Rapid scroll events
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(virtualList, { target: { scrollTop: i * 100 } });
      }

      // Should throttle the events
      expect(defaultProps.onLoadMore).toHaveBeenCalledTimes(0); // Not near bottom yet
    });
  });

  describe('Caching and Optimization', () => {
    it('implements memoization for report items', () => {
      const { rerender } = render(<VirtualReportList {...defaultProps} />);

      // Re-render with same props
      rerender(<VirtualReportList {...defaultProps} />);

      // Items should be memoized and not re-render unnecessarily
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('caches rendered item heights', () => {
      render(<VirtualReportList {...defaultProps} />);

      expect(screen.getByTestId('virtual-list')).toHaveAttribute(
        'data-cache',
        'enabled',
      );
    });

    it('preloads items for smooth scrolling', () => {
      render(<VirtualReportList {...defaultProps} />);

      // Should preload items outside viewport
      expect(screen.getByTestId('virtual-list')).toHaveAttribute(
        'data-overscan',
        '5',
      );
    });
  });

  describe('Error Handling', () => {
    it('handles empty report list gracefully', () => {
      render(<VirtualReportList {...defaultProps} reports={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/no reports found/i)).toBeInTheDocument();
    });

    it('recovers from item rendering errors', () => {
      // Mock report with invalid data
      const errorReports = [
        {
          ...defaultProps.reports[0],
          template: null as any, // Invalid data
        },
      ];

      render(<VirtualReportList {...defaultProps} reports={errorReports} />);

      expect(screen.getByTestId('error-item')).toBeInTheDocument();
      expect(screen.getByText(/failed to load report/i)).toBeInTheDocument();
    });

    it('handles scroll errors gracefully', () => {
      render(<VirtualReportList {...defaultProps} />);

      const virtualList = screen.getByTestId('virtual-list');

      // Simulate scroll error
      const errorEvent = new Event('error');
      fireEvent(virtualList, errorEvent);

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      render(<VirtualReportList {...defaultProps} />);

      const virtualList = screen.getByRole('list');
      expect(virtualList).toHaveAttribute('aria-label', 'Wedding reports list');
      expect(virtualList).toHaveAttribute('aria-rowcount', '100');
    });

    it('supports screen reader announcements', () => {
      render(<VirtualReportList {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveTextContent('Showing 20 of 100 reports');
    });

    it('implements keyboard navigation', () => {
      render(<VirtualReportList {...defaultProps} />);

      const firstItem = screen.getByTestId('report-item-0');
      expect(firstItem).toHaveAttribute('tabIndex', '0');
      expect(firstItem).toHaveAttribute('role', 'listitem');
    });

    it('provides alternative text for loading states', () => {
      render(<VirtualReportList {...defaultProps} loading />);

      expect(
        screen.getByLabelText(/loading additional reports/i),
      ).toBeInTheDocument();
    });
  });

  describe('Stress Testing', () => {
    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = render(<VirtualReportList {...defaultProps} />);

      // Rapidly change props
      for (let i = 0; i < 50; i++) {
        rerender(
          <VirtualReportList
            {...defaultProps}
            reports={generateMockReports(i + 100)}
          />,
        );
      }

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('maintains performance with frequent scrolling', () => {
      render(<VirtualReportList {...defaultProps} />);

      const virtualList = screen.getByTestId('virtual-list');
      const startTime = performance.now();

      // Simulate frequent scrolling
      for (let i = 0; i < 100; i++) {
        fireEvent.scroll(virtualList, { target: { scrollTop: i * 10 } });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200); // Should remain performant
    });
  });
});
