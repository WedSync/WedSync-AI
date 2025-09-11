import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { TouchVendorComparison } from '../../../src/components/mobile/analytics/TouchVendorComparison';
import { VendorMetrics, ComparisonMode, ComparisonMetrics } from '../../../src/types/mobile-analytics';

// Mock touch debouncing
jest.mock('../../../src/lib/services/mobile/TouchDebouncing', () => ({
  TouchDebouncing: {
    getInstance: () => ({
      debounce: jest.fn((callback) => callback),
      setTouchTarget: jest.fn(),
      cleanup: jest.fn(),
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
  {
    id: 'vendor3',
    name: 'Catering Excellence C',
    type: 'caterer',
    overallScore: 9.1,
    responseTime: 1.8,
    clientSatisfaction: 9.5,
    completionRate: 97,
    revenue: 180000,
    bookingsCount: 52,
    averageBookingValue: 3461.54,
    lastActive: new Date('2025-01-14T12:00:00Z'),
    performanceTrend: 'improving',
    communicationScore: 9.2,
    punctualityScore: 9.3,
    qualityScore: 9.0,
    valueScore: 8.8,
    reviewsCount: 156,
    averageRating: 4.8,
    monthlyGrowth: 15.8,
    repeatClientRate: 75,
    referralRate: 32,
  },
];

const mockComparisonMetrics: ComparisonMetrics = {
  selectedVendors: ['vendor1', 'vendor2'],
  comparisonMode: 'side-by-side' as ComparisonMode,
  metrics: [
    'overallScore',
    'clientSatisfaction',
    'completionRate',
    'responseTime',
  ],
  timeRange: '30d',
};

describe('TouchVendorComparison', () => {
  let mockOnVendorSelect: jest.MockedFunction<(vendorIds: string[]) => void>;
  let mockOnComparisonModeChange: jest.MockedFunction<(mode: ComparisonMode) => void>;
  let mockOnMetricToggle: jest.MockedFunction<(metric: string) => void>;

  beforeEach(() => {
    mockOnVendorSelect = jest.fn();
    mockOnComparisonModeChange = jest.fn();
    mockOnMetricToggle = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render vendor comparison interface', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByTestId('touch-vendor-comparison')).toBeInTheDocument();
      expect(screen.getByText('Vendor Comparison')).toBeInTheDocument();
      expect(screen.getByText('Photography Studio A')).toBeInTheDocument();
      expect(screen.getByText('Floral Designs B')).toBeInTheDocument();
    });

    it('should render side-by-side comparison mode', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByTestId('side-by-side-comparison')).toBeInTheDocument();
      expect(screen.getByTestId('vendor-comparison-left')).toBeInTheDocument();
      expect(screen.getByTestId('vendor-comparison-right')).toBeInTheDocument();
    });

    it('should render overlay comparison mode', () => {
      const overlayMetrics = {
        ...mockComparisonMetrics,
        comparisonMode: 'overlay' as ComparisonMode,
      };

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={overlayMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByTestId('overlay-comparison')).toBeInTheDocument();
    });

    it('should render chart comparison mode', () => {
      const chartMetrics = {
        ...mockComparisonMetrics,
        comparisonMode: 'chart' as ComparisonMode,
      };

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={chartMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByTestId('chart-comparison')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <TouchVendorComparison
          vendors={[]}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
          loading={true}
        />
      );

      expect(screen.getByText('Loading comparison data...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
          error="Failed to load comparison data"
        />
      );

      expect(screen.getByText('Failed to load comparison data')).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    it('should handle swipe navigation between vendors', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const comparison = screen.getByTestId('touch-vendor-comparison');

      // Simulate swipe left gesture
      fireEvent.touchStart(comparison, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchMove(comparison, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(comparison);

      await waitFor(() => {
        expect(screen.getByTestId('next-vendor-preview')).toBeInTheDocument();
      });
    });

    it('should handle swipe right to go back', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const comparison = screen.getByTestId('touch-vendor-comparison');

      // Simulate swipe right gesture
      fireEvent.touchStart(comparison, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchMove(comparison, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchEnd(comparison);

      await waitFor(() => {
        expect(screen.getByTestId('prev-vendor-preview')).toBeInTheDocument();
      });
    });

    it('should handle tap to select vendor', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const vendorCard = screen.getByTestId('vendor-card-vendor3');
      fireEvent.click(vendorCard);

      await waitFor(() => {
        expect(mockOnVendorSelect).toHaveBeenCalledWith(['vendor1', 'vendor2', 'vendor3']);
      });
    });

    it('should handle double tap to focus on vendor', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const vendorCard = screen.getByTestId('vendor-card-vendor1');

      // Double tap
      fireEvent.click(vendorCard);
      fireEvent.click(vendorCard);

      await waitFor(() => {
        expect(screen.getByTestId('vendor-focus-mode')).toBeInTheDocument();
      });
    });

    it('should provide haptic feedback on interactions', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const vendorCard = screen.getByTestId('vendor-card-vendor1');
      fireEvent.click(vendorCard);

      await waitFor(() => {
        expect(window.navigator.vibrate).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Comparison Mode Switching', () => {
    it('should switch between comparison modes', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const overlayModeButton = screen.getByRole('button', { name: /overlay mode/i });
      fireEvent.click(overlayModeButton);

      await waitFor(() => {
        expect(mockOnComparisonModeChange).toHaveBeenCalledWith('overlay');
      });

      const chartModeButton = screen.getByRole('button', { name: /chart mode/i });
      fireEvent.click(chartModeButton);

      await waitFor(() => {
        expect(mockOnComparisonModeChange).toHaveBeenCalledWith('chart');
      });
    });

    it('should animate mode transitions', async () => {
      const { rerender } = render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const newMetrics = {
        ...mockComparisonMetrics,
        comparisonMode: 'overlay' as ComparisonMode,
      };

      rerender(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={newMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByTestId('touch-vendor-comparison')).toHaveClass('mode-transition');
    });
  });

  describe('Metric Selection', () => {
    it('should handle metric toggle', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const revenueMetricButton = screen.getByRole('button', { name: /revenue/i });
      fireEvent.click(revenueMetricButton);

      await waitFor(() => {
        expect(mockOnMetricToggle).toHaveBeenCalledWith('revenue');
      });
    });

    it('should show metric selection interface', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const metricsToggle = screen.getByRole('button', { name: /select metrics/i });
      fireEvent.click(metricsToggle);

      expect(screen.getByTestId('metric-selection-panel')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /overall score/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /client satisfaction/i })).toBeInTheDocument();
    });

    it('should handle metric selection changes', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const metricsToggle = screen.getByRole('button', { name: /select metrics/i });
      fireEvent.click(metricsToggle);

      const revenueCheckbox = screen.getByRole('checkbox', { name: /revenue/i });
      fireEvent.click(revenueCheckbox);

      await waitFor(() => {
        expect(mockOnMetricToggle).toHaveBeenCalledWith('revenue');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for small screens', () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByTestId('touch-vendor-comparison')).toHaveClass('mobile-layout');
    });

    it('should handle orientation changes', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      // Mock orientation change to landscape
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90 },
        writable: true,
      });

      fireEvent(window, new Event('orientationchange'));

      expect(screen.getByTestId('touch-vendor-comparison')).toHaveClass('landscape-mode');
    });

    it('should adjust touch targets for larger screens', () => {
      // Mock larger screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const vendorCards = screen.getAllByTestId(/vendor-card-/);
      vendorCards.forEach(card => {
        expect(card).toHaveClass('large-touch-target');
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should implement virtual scrolling for many vendors', () => {
      const manyVendors = Array.from({ length: 100 }, (_, i) => ({
        ...mockVendorData[0],
        id: `vendor-${i}`,
        name: `Vendor ${i}`,
      }));

      render(
        <TouchVendorComparison
          vendors={manyVendors}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      // Should only render visible vendors
      const renderedVendors = screen.getAllByTestId(/vendor-card-/);
      expect(renderedVendors.length).toBeLessThan(manyVendors.length);
    });

    it('should debounce swipe gestures', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const comparison = screen.getByTestId('touch-vendor-comparison');

      // Rapid swipes
      for (let i = 0; i < 5; i++) {
        fireEvent.touchStart(comparison, {
          touches: [{ clientX: 200, clientY: 100 }],
        });
        fireEvent.touchMove(comparison, {
          touches: [{ clientX: 100, clientY: 100 }],
        });
        fireEvent.touchEnd(comparison);
      }

      await waitFor(() => {
        // Should only process one swipe due to debouncing
        expect(screen.getAllByTestId(/vendor-transition-/).length).toBe(1);
      });
    });

    it('should lazy load vendor details', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const vendorCard = screen.getByTestId('vendor-card-vendor3');

      // Initially, detailed metrics should not be loaded
      expect(screen.queryByText('Detailed Analytics')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(vendorCard);

      await waitFor(() => {
        expect(screen.getByText('Loading detailed metrics...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Detailed Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Vendor Comparison');
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Comparison Modes');
      
      const vendorCards = screen.getAllByRole('button');
      vendorCards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should support keyboard navigation', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const vendorCard = screen.getByTestId('vendor-card-vendor1');

      fireEvent.keyDown(vendorCard, { key: 'Enter' });
      expect(mockOnVendorSelect).toHaveBeenCalled();

      fireEvent.keyDown(vendorCard, { key: ' ' });
      expect(mockOnVendorSelect).toHaveBeenCalledTimes(2);
    });

    it('should announce changes to screen readers', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const overlayModeButton = screen.getByRole('button', { name: /overlay mode/i });
      fireEvent.click(overlayModeButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Switched to overlay comparison mode');
      });
    });

    it('should provide focus management', () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const firstVendorCard = screen.getByTestId('vendor-card-vendor1');
      const secondVendorCard = screen.getByTestId('vendor-card-vendor2');

      firstVendorCard.focus();
      fireEvent.keyDown(firstVendorCard, { key: 'ArrowRight' });

      expect(document.activeElement).toBe(secondVendorCard);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty vendor selection gracefully', () => {
      const emptyMetrics = {
        ...mockComparisonMetrics,
        selectedVendors: [],
      };

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={emptyMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(screen.getByText('Select vendors to compare')).toBeInTheDocument();
    });

    it('should handle gesture conflicts gracefully', async () => {
      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const comparison = screen.getByTestId('touch-vendor-comparison');

      // Simulate conflicting gestures
      fireEvent.touchStart(comparison, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      // Start another touch before ending the first
      fireEvent.touchStart(comparison, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      });

      fireEvent.touchEnd(comparison);

      await waitFor(() => {
        expect(screen.getByTestId('touch-vendor-comparison')).toHaveAttribute(
          'data-gesture-state',
          'resolved'
        );
      });
    });

    it('should recover from API errors', async () => {
      // Mock API error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const vendorCard = screen.getByTestId('vendor-card-vendor1');
      fireEvent.click(vendorCard);

      await waitFor(() => {
        expect(screen.getByText('Failed to load detailed data')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should remember comparison settings', () => {
      const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      const overlayModeButton = screen.getByRole('button', { name: /overlay mode/i });
      fireEvent.click(overlayModeButton);

      expect(localStorageSpy).toHaveBeenCalledWith(
        'vendor-comparison-settings',
        expect.stringContaining('overlay')
      );
    });

    it('should restore previous comparison settings', () => {
      const savedSettings = {
        comparisonMode: 'chart',
        selectedMetrics: ['overallScore', 'revenue'],
        selectedVendors: ['vendor1', 'vendor3'],
      };

      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify(savedSettings)
      );

      render(
        <TouchVendorComparison
          vendors={mockVendorData}
          comparisonMetrics={mockComparisonMetrics}
          onVendorSelect={mockOnVendorSelect}
          onComparisonModeChange={mockOnComparisonModeChange}
          onMetricToggle={mockOnMetricToggle}
        />
      );

      expect(mockOnComparisonModeChange).toHaveBeenCalledWith('chart');
      expect(mockOnVendorSelect).toHaveBeenCalledWith(['vendor1', 'vendor3']);
    });
  });
});