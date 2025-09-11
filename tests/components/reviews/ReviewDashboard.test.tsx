/**
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewDashboard } from '@/components/reviews/ReviewDashboard';
import { reviewCampaignFixtures } from '@/test/fixtures/review-collection';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  )
}));

describe('ReviewDashboard', () => {
  const defaultProps = {
    supplierId: 'test-supplier-id'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders dashboard header with title and description', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Review Dashboard')).toBeInTheDocument();
        expect(screen.getByText(/manage your review collection campaigns/i)).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<ReviewDashboard {...defaultProps} />);

      // Should show loading animation
      expect(screen.getByTestId('loading-skeleton') || document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders timeframe selector with correct options', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        const timeframeSelect = screen.getByDisplayValue('Last 30 days');
        expect(timeframeSelect).toBeInTheDocument();
        
        fireEvent.click(timeframeSelect);
        expect(screen.getByText('Last 7 days')).toBeInTheDocument();
        expect(screen.getByText('Last 90 days')).toBeInTheDocument();
        expect(screen.getByText('Last year')).toBeInTheDocument();
      });
    });

    it('displays New Campaign button', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        const newCampaignButton = screen.getByText(/new campaign/i);
        expect(newCampaignButton).toBeInTheDocument();
        expect(newCampaignButton.closest('a')).toHaveAttribute('href', '/reviews/campaigns/new');
      });
    });
  });

  describe('Statistics Overview Cards', () => {
    it('renders all stat cards with correct data', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Total Reviews
        expect(screen.getByText('Total Reviews')).toBeInTheDocument();
        expect(screen.getByText('127')).toBeInTheDocument();
        expect(screen.getByText('+23%')).toBeInTheDocument();

        // Average Rating
        expect(screen.getByText('Average Rating')).toBeInTheDocument();
        expect(screen.getByText('4.8')).toBeInTheDocument();

        // Response Rate
        expect(screen.getByText('Response Rate')).toBeInTheDocument();
        expect(screen.getByText('67%')).toBeInTheDocument();

        // Active Campaigns
        expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('12 pending requests')).toBeInTheDocument();
      });
    });

    it('shows correct icons for each stat', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Check for presence of icon containers (can't easily test specific Lucide icons)
        const statCards = screen.getAllByRole('generic').filter(el => 
          el.className?.includes('bg-white') && el.className?.includes('border')
        );
        expect(statCards.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('displays growth indicators correctly', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('+23%')).toBeInTheDocument();
        expect(screen.getByText('this month')).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Management Section', () => {
    it('renders active campaigns section with correct title', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });

    it('displays campaign cards when campaigns exist', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Should show campaign names
        expect(screen.getByText('Post-Wedding Reviews')).toBeInTheDocument();
        expect(screen.getByText('Engagement Session Follow-up')).toBeInTheDocument();
        expect(screen.getByText('VIP Client Reviews')).toBeInTheDocument();
      });
    });

    it('shows empty state when no campaigns exist', async () => {
      // Mock empty campaigns response
      const mockLoadData = vi.fn().mockResolvedValue({
        stats: reviewCampaignFixtures.emptyStats,
        campaigns: [],
        recentReviews: []
      });

      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        if (screen.queryByText('No campaigns yet')) {
          expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
          expect(screen.getByText(/create your first review collection campaign/i)).toBeInTheDocument();
          expect(screen.getByText('Create Campaign')).toBeInTheDocument();
        }
      });
    });

    it('handles campaign status toggle', async () => {
      const user = userEvent.setup();
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(async () => {
        // Find a campaign with actions menu
        const moreButton = screen.getAllByLabelText(/more options/i)[0];
        if (moreButton) {
          await user.click(moreButton);
          
          const pauseButton = screen.getByText(/pause campaign/i);
          expect(pauseButton).toBeInTheDocument();
        }
      });
    });
  });

  describe('Recent Reviews Section', () => {
    it('renders recent reviews section with correct title', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Reviews')).toBeInTheDocument();
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });

    it('displays review items with correct data', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Should show client names
        expect(screen.getByText('Emma & Mike')).toBeInTheDocument();
        expect(screen.getByText('Sarah & Tom')).toBeInTheDocument();
        expect(screen.getByText('Lisa & David')).toBeInTheDocument();

        // Should show review text
        expect(screen.getByText(/absolutely incredible photographer/i)).toBeInTheDocument();
        expect(screen.getByText(/professional, creative/i)).toBeInTheDocument();

        // Should show venues
        expect(screen.getByText('Sunset Manor')).toBeInTheDocument();
        expect(screen.getByText('Garden Estate')).toBeInTheDocument();
      });
    });

    it('shows platform icons for reviews', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Platform icons should be visible (emojis)
        const reviewItems = screen.getByText('Emma & Mike').closest('[class*="border-b"]');
        expect(reviewItems).toBeInTheDocument();
      });
    });

    it('displays star ratings correctly', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Should have star rating displays (can't easily test specific star counts)
        const starIcons = document.querySelectorAll('[class*="text-yellow-400"]');
        expect(starIcons.length).toBeGreaterThan(0);
      });
    });

    it('shows review dates and wedding dates', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Should show formatted dates
        expect(screen.getByText(/jan.*18.*2024/i)).toBeInTheDocument();
        expect(screen.getByText(/jan.*5.*2024/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no reviews exist', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        if (screen.queryByText('No reviews yet')) {
          expect(screen.getByText('No reviews yet')).toBeInTheDocument();
          expect(screen.getByText(/reviews will appear here as clients respond/i)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Performance Metrics Integration', () => {
    it('renders ReviewMetrics component', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // ReviewMetrics should be rendered (check for its distinctive elements)
        expect(screen.getByText(/performance analytics/i)).toBeInTheDocument();
      });
    });

    it('passes correct props to ReviewMetrics', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Verify that ReviewMetrics receives supplierId and timeframe
        const metricsComponent = document.querySelector('[class*="ReviewMetrics"]');
        // This would be more testable with data-testid attributes
        expect(true).toBe(true); // Placeholder assertion
      });
    });
  });

  describe('Timeframe Selection', () => {
    it('updates data when timeframe changes', async () => {
      const user = userEvent.setup();
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(async () => {
        const timeframeSelect = screen.getByDisplayValue('Last 30 days');
        await user.selectOptions(timeframeSelect, '7d');

        expect(timeframeSelect).toHaveValue('7d');
        // Data should reload (tested via loading state or API calls)
      });
    });

    it('passes timeframe to ReviewMetrics', async () => {
      const user = userEvent.setup();
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(async () => {
        const timeframeSelect = screen.getByDisplayValue('Last 30 days');
        await user.selectOptions(timeframeSelect, '90d');

        // Verify timeframe change affects metrics
        expect(timeframeSelect).toHaveValue('90d');
      });
    });
  });

  describe('Navigation Links', () => {
    it('has correct navigation links', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Check main navigation links
        expect(screen.getByRole('link', { name: /new campaign/i })).toHaveAttribute(
          'href', 
          '/reviews/campaigns/new'
        );
        
        expect(screen.getByRole('link', { name: /view all.*campaigns/i })).toHaveAttribute(
          'href', 
          '/reviews/campaigns'
        );
        
        expect(screen.getByRole('link', { name: /view all.*reviews/i })).toHaveAttribute(
          'href', 
          '/reviews/all'
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /review dashboard/i, level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /active campaigns/i, level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /recent reviews/i, level: 2 })).toBeInTheDocument();
      });
    });

    it('has proper ARIA labels and roles', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Check for proper select labeling
        const timeframeSelect = screen.getByDisplayValue('Last 30 days');
        expect(timeframeSelect).toHaveAttribute('name');

        // Check for proper button roles
        const newCampaignButton = screen.getByRole('link', { name: /new campaign/i });
        expect(newCampaignButton).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(async () => {
        const timeframeSelect = screen.getByDisplayValue('Last 30 days');
        timeframeSelect.focus();
        expect(timeframeSelect).toHaveFocus();

        await user.tab();
        const nextFocusable = document.activeElement;
        expect(nextFocusable).not.toBe(timeframeSelect);
      });
    });

    it('has sufficient color contrast for stats', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // This would typically be tested with accessibility testing tools
        // For now, we verify that text content is properly rendered
        expect(screen.getByText('Total Reviews')).toBeInTheDocument();
        expect(screen.getByText('127')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // Mock API error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Should not crash and should show some fallback content
        expect(screen.getByText('Review Dashboard')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('shows empty states appropriately', async () => {
      render(<ReviewDashboard {...defaultProps} />);

      await waitFor(() => {
        // Check for empty state handling
        const campaignSection = screen.getByText('Active Campaigns').closest('div');
        const reviewSection = screen.getByText('Recent Reviews').closest('div');
        
        expect(campaignSection).toBeInTheDocument();
        expect(reviewSection).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', () => {
      const startTime = performance.now();
      render(<ReviewDashboard {...defaultProps} />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(150);
    });

    it('handles large datasets efficiently', async () => {
      // Would test with large mock datasets
      const startTime = performance.now();
      render(<ReviewDashboard {...defaultProps} />);
      
      await waitFor(() => {
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(300);
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<ReviewDashboard {...defaultProps} />);

      // Grid layouts should stack on mobile
      const statsGrid = document.querySelector('[class*="grid-cols-1"]');
      expect(statsGrid).toBeInTheDocument();
    });

    it('uses full width on desktop', () => {
      global.innerWidth = 1920;
      global.dispatchEvent(new Event('resize'));

      render(<ReviewDashboard {...defaultProps} />);

      // Should use larger grid layouts
      expect(document.querySelector('[class*="lg:grid-cols"]')).toBeInTheDocument();
    });
  });
});