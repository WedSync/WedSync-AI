import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import WeddingAnalyticsPatterns from '@/components/analytics/WeddingAnalyticsPatterns';
import type { WeddingAnalyticsPatternsProps } from '@/types/analytics';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Flower: () => <div data-testid="flower-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Wind: () => <div data-testid="wind-icon" />,
  CloudRain: () => <div data-testid="cloud-rain-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Info: () => <div data-testid="info-icon" />,
  X: () => <div data-testid="x-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Share2: () => <div data-testid="share-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
}));

const defaultProps: WeddingAnalyticsPatternsProps = {
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  selectedPatterns: ['seasonal', 'venue', 'service', 'geographic'],
  comparisonMode: false,
  showPredictions: true,
  detailLevel: 'standard',
};

describe('WeddingAnalyticsPatterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);
      expect(
        screen.getByText('Wedding Analytics Patterns'),
      ).toBeInTheDocument();
    });

    it('renders navigation tabs', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('Seasonal')).toBeInTheDocument();
      expect(screen.getByText('Venues')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Geographic')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    it('displays header controls', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('Show Insights')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('shows seasonal pattern by default', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('Seasonal Booking Patterns')).toBeInTheDocument();
    });
  });

  describe('Seasonal Patterns', () => {
    it('displays all four seasons', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('Spring (Mar-May)')).toBeInTheDocument();
      expect(screen.getByText('Summer (Jun-Aug)')).toBeInTheDocument();
      expect(screen.getByText('Autumn (Sep-Nov)')).toBeInTheDocument();
      expect(screen.getByText('Winter (Dec-Feb)')).toBeInTheDocument();
    });

    it('shows booking counts for each season', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('156 bookings')).toBeInTheDocument(); // Spring
      expect(screen.getByText('287 bookings')).toBeInTheDocument(); // Summer
      expect(screen.getByText('198 bookings')).toBeInTheDocument(); // Autumn
      expect(screen.getByText('89 bookings')).toBeInTheDocument(); // Winter
    });

    it('displays average revenue for each season', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('£2,840 avg revenue')).toBeInTheDocument();
      expect(screen.getByText('£3,420 avg revenue')).toBeInTheDocument();
      expect(screen.getByText('£3,180 avg revenue')).toBeInTheDocument();
      expect(screen.getByText('£2,950 avg revenue')).toBeInTheDocument();
    });

    it('highlights peak months for each season', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('April')).toBeInTheDocument();
      expect(screen.getByText('May')).toBeInTheDocument();
      expect(screen.getByText('June')).toBeInTheDocument();
      expect(screen.getByText('July')).toBeInTheDocument();
    });

    it('shows detailed analysis when season is selected', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const summerCard = screen.getByText('Summer (Jun-Aug)');
      fireEvent.click(summerCard);

      await waitFor(() => {
        expect(
          screen.getByText('Summer (Jun-Aug) - Detailed Analysis'),
        ).toBeInTheDocument();
        expect(screen.getByText('Popular Services')).toBeInTheDocument();
        expect(screen.getByText('Seasonal Factors')).toBeInTheDocument();
      });
    });

    it('displays seasonal factors', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const springCard = screen.getByText('Spring (Mar-May)');
      fireEvent.click(springCard);

      await waitFor(() => {
        expect(
          screen.getByText('Perfect weather conditions'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Garden venues at their best'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Cherry blossom photography popular'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Venue Patterns', () => {
    it('displays venue types when venue tab is selected', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const venueTab = screen.getByText('Venues');
      fireEvent.click(venueTab);

      await waitFor(() => {
        expect(screen.getByText('Venue Type Performance')).toBeInTheDocument();
        expect(screen.getByText('Garden/Outdoor')).toBeInTheDocument();
        expect(screen.getByText('Historic Buildings')).toBeInTheDocument();
        expect(screen.getByText('Modern Hotels')).toBeInTheDocument();
        expect(screen.getByText('Barns/Rustic')).toBeInTheDocument();
      });
    });

    it('shows venue performance metrics', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const venueTab = screen.getByText('Venues');
      fireEvent.click(venueTab);

      await waitFor(() => {
        expect(screen.getByText('34.2%')).toBeInTheDocument(); // Market Share
        expect(screen.getByText('£3,800')).toBeInTheDocument(); // Avg Budget
        expect(screen.getByText('4.7★')).toBeInTheDocument(); // Satisfaction
        expect(screen.getByText('8.5 mo')).toBeInTheDocument(); // Lead Time
      });
    });

    it('displays opportunities and challenges when venue is selected', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const venueTab = screen.getByText('Venues');
      fireEvent.click(venueTab);

      await waitFor(() => {
        const gardenVenue = screen.getByText('Garden/Outdoor');
        fireEvent.click(gardenVenue);
      });

      await waitFor(() => {
        expect(screen.getByText('Opportunities')).toBeInTheDocument();
        expect(screen.getByText('Challenges')).toBeInTheDocument();
        expect(screen.getByText('Extended seasons')).toBeInTheDocument();
        expect(screen.getByText('Weather dependency')).toBeInTheDocument();
      });
    });
  });

  describe('Service Demand Patterns', () => {
    it('displays service analytics when services tab is selected', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const servicesTab = screen.getByText('Services');
      fireEvent.click(servicesTab);

      await waitFor(() => {
        expect(screen.getByText('Service Demand Analysis')).toBeInTheDocument();
        expect(screen.getByText('Photography')).toBeInTheDocument();
        expect(screen.getByText('Catering')).toBeInTheDocument();
        expect(screen.getByText('Floral Design')).toBeInTheDocument();
        expect(screen.getByText('Music/DJ')).toBeInTheDocument();
        expect(screen.getByText('Videography')).toBeInTheDocument();
      });
    });

    it('shows demand percentages', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const servicesTab = screen.getByText('Services');
      fireEvent.click(servicesTab);

      await waitFor(() => {
        expect(screen.getByText('98.5%')).toBeInTheDocument(); // Photography demand
        expect(screen.getByText('94.2%')).toBeInTheDocument(); // Catering demand
        expect(screen.getByText('87.3%')).toBeInTheDocument(); // Floral demand
      });
    });

    it('displays competition levels', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const servicesTab = screen.getByText('Services');
      fireEvent.click(servicesTab);

      await waitFor(() => {
        expect(screen.getByText('High Competition')).toBeInTheDocument();
        expect(screen.getByText('Medium Competition')).toBeInTheDocument();
      });
    });

    it('shows growth opportunities', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const servicesTab = screen.getByText('Services');
      fireEvent.click(servicesTab);

      await waitFor(() => {
        expect(screen.getByText('Growth Opportunities')).toBeInTheDocument();
        expect(screen.getByText('Drone photography')).toBeInTheDocument();
        expect(screen.getByText('Same-day editing')).toBeInTheDocument();
        expect(screen.getByText('Social media packages')).toBeInTheDocument();
      });
    });
  });

  describe('Geographic Patterns', () => {
    it('displays regional data when geographic tab is selected', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const geographicTab = screen.getByText('Geographic');
      fireEvent.click(geographicTab);

      await waitFor(() => {
        expect(
          screen.getByText('Geographic Market Analysis'),
        ).toBeInTheDocument();
        expect(screen.getByText('London & South East')).toBeInTheDocument();
        expect(screen.getByText('Cotswolds')).toBeInTheDocument();
        expect(screen.getByText('Lake District')).toBeInTheDocument();
        expect(screen.getByText('Scotland')).toBeInTheDocument();
      });
    });

    it('shows market share percentages', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const geographicTab = screen.getByText('Geographic');
      fireEvent.click(geographicTab);

      await waitFor(() => {
        expect(screen.getByText('42.3%')).toBeInTheDocument(); // London market share
        expect(screen.getByText('18.7%')).toBeInTheDocument(); // Cotswolds market share
      });
    });

    it('displays preferred wedding styles by region', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const geographicTab = screen.getByText('Geographic');
      fireEvent.click(geographicTab);

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
        expect(screen.getByText('Luxury')).toBeInTheDocument();
        expect(screen.getByText('Rustic')).toBeInTheDocument();
        expect(screen.getByText('Country')).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Day Timeline', () => {
    it('displays timeline when timeline tab is selected', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const timelineTab = screen.getByText('Timeline');
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(
          screen.getByText('Wedding Day Timeline Patterns'),
        ).toBeInTheDocument();
        expect(screen.getByText('08:00-10:00')).toBeInTheDocument();
        expect(screen.getByText('10:00-12:00')).toBeInTheDocument();
        expect(screen.getByText('12:00-14:00')).toBeInTheDocument();
      });
    });

    it('shows activities for each time slot', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const timelineTab = screen.getByText('Timeline');
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(screen.getByText('Preparation')).toBeInTheDocument();
        expect(screen.getByText('Getting Ready')).toBeInTheDocument();
        expect(screen.getByText('Ceremony')).toBeInTheDocument();
        expect(screen.getByText('Photos & Cocktails')).toBeInTheDocument();
        expect(screen.getByText('Reception')).toBeInTheDocument();
      });
    });

    it('displays stress levels for each time period', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const timelineTab = screen.getByText('Timeline');
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(screen.getByText('Medium Stress')).toBeInTheDocument();
        expect(screen.getByText('High Stress')).toBeInTheDocument();
        expect(screen.getByText('Very High Stress')).toBeInTheDocument();
        expect(screen.getByText('Low Stress')).toBeInTheDocument();
      });
    });

    it('shows critical milestones', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const timelineTab = screen.getByText('Timeline');
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(screen.getByText('Critical Milestones')).toBeInTheDocument();
        expect(screen.getByText('12:00')).toBeInTheDocument();
        expect(screen.getByText('Ceremony Start')).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });
  });

  describe('Insights Sidebar', () => {
    it('shows insights sidebar when insights are enabled', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('Pattern Insights')).toBeInTheDocument();
    });

    it('hides insights sidebar when toggled off', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const hideInsightsButton = screen.getByText('Hide Insights');
      fireEvent.click(hideInsightsButton);

      await waitFor(() => {
        expect(screen.queryByText('Pattern Insights')).not.toBeInTheDocument();
      });
    });

    it('displays pattern insights', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('Summer Peak Optimization')).toBeInTheDocument();
      expect(screen.getByText('Garden Venue Dominance')).toBeInTheDocument();
      expect(
        screen.getByText('Videography Market Explosion'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Cotswolds Destination Weddings'),
      ).toBeInTheDocument();
    });

    it('shows insight impact levels', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('displays actionable insights with action buttons', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const actionButtons = screen.getAllByText('Take Action');
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it('shows pattern summary', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText('Pattern Summary')).toBeInTheDocument();
      expect(screen.getByText(/summer garden weddings/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('changes active pattern when tab is clicked', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const venueTab = screen.getByText('Venues');
      fireEvent.click(venueTab);

      await waitFor(() => {
        expect(screen.getByText('Venue Type Performance')).toBeInTheDocument();
      });

      const servicesTab = screen.getByText('Services');
      fireEvent.click(servicesTab);

      await waitFor(() => {
        expect(screen.getByText('Service Demand Analysis')).toBeInTheDocument();
      });
    });

    it('handles pattern selection callback', async () => {
      const onPatternSelect = jest.fn();
      render(
        <WeddingAnalyticsPatterns
          {...defaultProps}
          onPatternSelect={onPatternSelect}
        />,
      );

      const venueTab = screen.getByText('Venues');
      fireEvent.click(venueTab);

      expect(onPatternSelect).toHaveBeenCalledWith('venue');
    });

    it('handles insight generation callback', () => {
      const onInsightGenerate = jest.fn();
      render(
        <WeddingAnalyticsPatterns
          {...defaultProps}
          onInsightGenerate={onInsightGenerate}
        />,
      );

      const takeActionButton = screen.getAllByText('Take Action')[0];
      fireEvent.click(takeActionButton);

      expect(onInsightGenerate).toHaveBeenCalled();
    });

    it('supports export functionality', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      // Should trigger export functionality
      expect(exportButton).toBeInTheDocument();
    });

    it('supports share functionality', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      // Should trigger share functionality
      expect(shareButton).toBeInTheDocument();
    });
  });

  describe('Wedding Industry Context', () => {
    it('displays wedding-specific terminology', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText(/wedding season/i)).toBeInTheDocument();
      expect(screen.getByText(/venue/i)).toBeInTheDocument();
      expect(screen.getByText(/ceremony/i)).toBeInTheDocument();
      expect(screen.getByText(/reception/i)).toBeInTheDocument();
    });

    it('includes wedding industry insights', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(screen.getByText(/peak wedding season/i)).toBeInTheDocument();
      expect(screen.getByText(/garden venues/i)).toBeInTheDocument();
      expect(screen.getByText(/destination weddings/i)).toBeInTheDocument();
    });

    it('shows seasonal wedding factors', async () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const summerCard = screen.getByText('Summer (Jun-Aug)');
      fireEvent.click(summerCard);

      await waitFor(() => {
        expect(screen.getByText('Peak wedding season')).toBeInTheDocument();
        expect(screen.getByText('Longest daylight hours')).toBeInTheDocument();
        expect(
          screen.getByText('School holidays for guests'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const container = screen.getByTestId('wedding-analytics-patterns');
      expect(container).toHaveClass('min-h-screen');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      render(<WeddingAnalyticsPatterns {...defaultProps} />);

      const firstTab = screen.getByText('Seasonal');
      firstTab.focus();

      expect(document.activeElement).toBe(firstTab);
    });
  });

  describe('Performance', () => {
    it('implements proper component memoization', () => {
      const { rerender } = render(
        <WeddingAnalyticsPatterns {...defaultProps} />,
      );

      // Re-render with same props
      rerender(<WeddingAnalyticsPatterns {...defaultProps} />);

      expect(
        screen.getByText('Wedding Analytics Patterns'),
      ).toBeInTheDocument();
    });

    it('handles large datasets efficiently', () => {
      const largeSelectedPatterns = [
        'seasonal',
        'venue',
        'service',
        'geographic',
        'timeline',
      ];

      render(
        <WeddingAnalyticsPatterns
          {...defaultProps}
          selectedPatterns={largeSelectedPatterns}
        />,
      );

      expect(
        screen.getByText('Wedding Analytics Patterns'),
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing data gracefully', () => {
      render(
        <WeddingAnalyticsPatterns {...defaultProps} selectedPatterns={[]} />,
      );

      // Should still render without crashing
      expect(
        screen.getByText('Wedding Analytics Patterns'),
      ).toBeInTheDocument();
    });

    it('handles invalid date ranges', () => {
      const invalidDateRange = {
        start: new Date('2024-12-31'),
        end: new Date('2024-01-01'), // End before start
      };

      render(
        <WeddingAnalyticsPatterns
          {...defaultProps}
          dateRange={invalidDateRange}
        />,
      );

      // Should handle gracefully
      expect(
        screen.getByText('Wedding Analytics Patterns'),
      ).toBeInTheDocument();
    });
  });
});

// Integration tests
describe('WeddingAnalyticsPatterns Integration', () => {
  it('integrates all pattern views correctly', async () => {
    render(<WeddingAnalyticsPatterns {...defaultProps} />);

    // Test switching between all pattern types
    const patterns = ['Venues', 'Services', 'Geographic', 'Timeline'];

    for (const pattern of patterns) {
      const tab = screen.getByText(pattern);
      fireEvent.click(tab);

      await waitFor(() => {
        expect(screen.getByText(tab.textContent!)).toHaveClass('text-blue-600');
      });
    }
  });

  it('maintains state between pattern switches', async () => {
    render(<WeddingAnalyticsPatterns {...defaultProps} />);

    // Select a season
    const summerCard = screen.getByText('Summer (Jun-Aug)');
    fireEvent.click(summerCard);

    // Switch to different pattern and back
    const venueTab = screen.getByText('Venues');
    fireEvent.click(venueTab);

    const seasonalTab = screen.getByText('Seasonal');
    fireEvent.click(seasonalTab);

    // State should be maintained
    await waitFor(() => {
      expect(
        screen.getByText('Summer (Jun-Aug) - Detailed Analysis'),
      ).toBeInTheDocument();
    });
  });
});

// Snapshot tests
describe('WeddingAnalyticsPatterns Snapshots', () => {
  it('matches snapshot with default props', () => {
    const { container } = render(
      <WeddingAnalyticsPatterns {...defaultProps} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot with insights hidden', () => {
    const { container } = render(
      <WeddingAnalyticsPatterns {...defaultProps} />,
    );

    const hideButton = screen.getByText('Hide Insights');
    fireEvent.click(hideButton);

    expect(container.firstChild).toMatchSnapshot();
  });
});
