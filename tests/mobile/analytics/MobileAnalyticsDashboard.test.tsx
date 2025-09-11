import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { MobileAnalyticsDashboard } from '../../../src/components/mobile/analytics/MobileAnalyticsDashboard';
import { VendorMetrics, TouchGesture, MobileChartConfig } from '../../../src/types/mobile-analytics';

// Mock dependencies
jest.mock('../../../src/lib/services/mobile/TouchDebouncing', () => ({
  TouchDebouncing: {
    getInstance: () => ({
      debounce: jest.fn((callback) => callback),
      setTouchTarget: jest.fn(),
      cleanup: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/lib/services/mobile/MobileMemoryManager', () => ({
  MobileMemoryManager: {
    getInstance: () => ({
      allocate: jest.fn(),
      deallocate: jest.fn(),
      getUsage: jest.fn(() => ({ used: 100, total: 1000 })),
      cleanup: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/lib/services/mobile/OfflineAnalyticsManager', () => ({
  OfflineAnalyticsManager: {
    getInstance: () => ({
      isOnline: jest.fn(() => true),
      syncData: jest.fn(),
      getCachedData: jest.fn(() => Promise.resolve(mockVendorData)),
      cacheData: jest.fn(),
    }),
  },
}));

// Mock haptic feedback
Object.defineProperty(window.navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

// Mock intersection observer
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock data
const mockVendorData: VendorMetrics[] = [
  {
    id: 'vendor1',
    name: 'Photography Studio A',
    type: 'photographer',
    overallScore: 8.5,
    responseTime: 2.5,
    clientSatisfaction: 9.2,
    completionRate: 95,
    revenue: 125000,
    bookingsCount: 45,
    averageBookingValue: 2777.78,
    lastActive: new Date('2025-01-14T10:00:00Z'),
    performanceTrend: 'improving',
    communicationScore: 8.8,
    punctualityScore: 9.1,
    qualityScore: 8.9,
    valueScore: 8.3,
    reviewsCount: 127,
    averageRating: 4.6,
    monthlyGrowth: 12.5,
    repeatClientRate: 68,
    referralRate: 23,
  },
  {
    id: 'vendor2',
    name: 'Floral Designs B',
    type: 'florist',
    overallScore: 7.8,
    responseTime: 4.2,
    clientSatisfaction: 8.5,
    completionRate: 88,
    revenue: 85000,
    bookingsCount: 32,
    averageBookingValue: 2656.25,
    lastActive: new Date('2025-01-13T15:30:00Z'),
    performanceTrend: 'stable',
    communicationScore: 7.9,
    punctualityScore: 8.2,
    qualityScore: 8.1,
    valueScore: 7.6,
    reviewsCount: 94,
    averageRating: 4.3,
    monthlyGrowth: 3.2,
    repeatClientRate: 45,
    referralRate: 18,
  },
];

const mockChartConfig: MobileChartConfig = {
  type: 'line',
  responsive: true,
  maintainAspectRatio: false,
  touchEnabled: true,
  gestureHandling: {
    pinchToZoom: true,
    panEnabled: true,
    tapToSelect: true,
  },
  mobileOptimizations: {
    reducedData: true,
    simplifiedLabels: true,
    largerTouchTargets: true,
  },
  performance: {
    enableVirtualization: true,
    maxDataPoints: 100,
    updateInterval: 1000,
  },
};

describe('MobileAnalyticsDashboard', () => {
  let mockOnVendorSelect: jest.MockedFunction<(vendor: VendorMetrics) => void>;
  let mockOnRefresh: jest.MockedFunction<() => Promise<void>>;

  beforeEach(() => {
    mockOnVendorSelect = jest.fn();
    mockOnRefresh = jest.fn().mockResolvedValue(undefined);
    
    // Mock fetch for refresh functionality
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVendorData),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard with vendor cards', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Photography Studio A')).toBeInTheDocument();
      expect(screen.getByText('Floral Designs B')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={[]}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
          loading={true}
        />
      );

      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={[]}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
          error="Failed to load data"
        />
      );

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('should render empty state when no vendors', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={[]}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('No vendor data available')).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    it('should handle vendor card tap', async () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const vendorCard = screen.getByText('Photography Studio A').closest('.vendor-card');
      expect(vendorCard).toBeInTheDocument();

      fireEvent.click(vendorCard!);

      await waitFor(() => {
        expect(mockOnVendorSelect).toHaveBeenCalledWith(mockVendorData[0]);
      });
    });

    it('should handle pull-to-refresh gesture', async () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const dashboard = screen.getByTestId('mobile-analytics-dashboard');
      
      // Simulate pull-to-refresh
      fireEvent.touchStart(dashboard, {
        touches: [{ clientY: 100 }],
      });

      fireEvent.touchMove(dashboard, {
        touches: [{ clientY: 200 }],
      });

      fireEvent.touchEnd(dashboard);

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('should provide haptic feedback on interactions', async () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const vendorCard = screen.getByText('Photography Studio A').closest('.vendor-card');
      fireEvent.click(vendorCard!);

      await waitFor(() => {
        expect(window.navigator.vibrate).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to screen size changes', () => {
      const { rerender } = render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Mock window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // Small mobile
      });

      fireEvent(window, new Event('resize'));

      rerender(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByTestId('mobile-analytics-dashboard')).toHaveClass('mobile-layout');
    });

    it('should handle orientation changes', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Mock orientation change
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90 },
        writable: true,
      });

      fireEvent(window, new Event('orientationchange'));

      expect(screen.getByTestId('mobile-analytics-dashboard')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should implement virtual scrolling for large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockVendorData[0],
        id: `vendor-${i}`,
        name: `Vendor ${i}`,
      }));

      render(
        <MobileAnalyticsDashboard
          vendors={largeDataset}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Should only render visible items
      const renderedItems = screen.getAllByTestId(/vendor-card-/);
      expect(renderedItems.length).toBeLessThan(largeDataset.length);
    });

    it('should debounce touch events', async () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const vendorCard = screen.getByText('Photography Studio A').closest('.vendor-card');
      
      // Rapid taps
      fireEvent.click(vendorCard!);
      fireEvent.click(vendorCard!);
      fireEvent.click(vendorCard!);

      await waitFor(() => {
        // Should only call once due to debouncing
        expect(mockOnVendorSelect).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should show offline indicator when offline', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Offline Mode')).toBeInTheDocument();
    });

    it('should use cached data when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      render(
        <MobileAnalyticsDashboard
          vendors={[]}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Should load from cache
      await waitFor(() => {
        expect(screen.getByText('Photography Studio A')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Analytics Dashboard');
      expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Vendor Performance List');
    });

    it('should support keyboard navigation', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const vendorCard = screen.getByText('Photography Studio A').closest('.vendor-card');
      
      fireEvent.keyDown(vendorCard!, { key: 'Enter' });
      
      expect(mockOnVendorSelect).toHaveBeenCalledWith(mockVendorData[0]);
    });

    it('should have proper focus management', () => {
      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const vendorCards = screen.getAllByRole('button');
      expect(vendorCards[0]).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Error Handling', () => {
    it('should handle refresh errors gracefully', async () => {
      mockOnRefresh.mockRejectedValueOnce(new Error('Network error'));

      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to refresh data/i)).toBeInTheDocument();
      });
    });

    it('should handle memory pressure gracefully', async () => {
      const mockMemoryManager = require('../../../src/lib/services/mobile/MobileMemoryManager').MobileMemoryManager.getInstance();
      mockMemoryManager.getUsage.mockReturnValue({ used: 900, total: 1000 });

      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/memory usage high/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should track component render time', () => {
      const performanceStartSpy = jest.spyOn(performance, 'mark');
      const performanceEndSpy = jest.spyOn(performance, 'measure');

      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      expect(performanceStartSpy).toHaveBeenCalledWith('MobileAnalyticsDashboard-render-start');
      expect(performanceEndSpy).toHaveBeenCalledWith(
        'MobileAnalyticsDashboard-render',
        'MobileAnalyticsDashboard-render-start',
        expect.any(String)
      );
    });

    it('should track user interaction metrics', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      render(
        <MobileAnalyticsDashboard
          vendors={mockVendorData}
          chartConfig={mockChartConfig}
          onVendorSelect={mockOnVendorSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const vendorCard = screen.getByText('Photography Studio A').closest('.vendor-card');
      fireEvent.click(vendorCard!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Analytics: Vendor card interaction',
          expect.objectContaining({
            vendorId: 'vendor1',
            interactionType: 'tap',
            timestamp: expect.any(Number),
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });
});