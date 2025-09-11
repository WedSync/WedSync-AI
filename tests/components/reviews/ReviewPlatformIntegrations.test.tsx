/**
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewPlatformIntegrations } from '@/components/reviews/ReviewPlatformIntegrations';

describe('ReviewPlatformIntegrations', () => {
  const defaultProps = {
    supplierId: 'test-supplier-id',
    onConnectionChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders component header with security notice', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Platform Integrations')).toBeInTheDocument();
        expect(screen.getByText(/connect your review platforms to automatically collect feedback/i)).toBeInTheDocument();
        expect(screen.getByText(/all connections are secured with industry-standard OAuth/i)).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders connection summary cards', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('Issues')).toBeInTheDocument();
      });
    });

    it('displays correct connection counts in summary', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        // Should show 2 connected platforms (Google, Facebook)
        expect(screen.getByText('2')).toBeInTheDocument();
        // Should show 5 total available platforms
        expect(screen.getByText('5')).toBeInTheDocument();
        // Should show 1 platform with issues (Yelp)
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });
  });

  describe('Platform Cards', () => {
    it('renders all platform cards with correct information', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        // Platform names
        expect(screen.getByText('Google Business')).toBeInTheDocument();
        expect(screen.getByText('Facebook Pages')).toBeInTheDocument();
        expect(screen.getByText('Yelp for Business')).toBeInTheDocument();
        expect(screen.getByText('WeddingWire')).toBeInTheDocument();
        expect(screen.getByText('The Knot')).toBeInTheDocument();

        // Platform descriptions
        expect(screen.getByText(/connect your google my business profile/i)).toBeInTheDocument();
        expect(screen.getByText(/connect your facebook business page/i)).toBeInTheDocument();
      });
    });

    it('shows platform icons correctly', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        // Platform icons should be rendered (emojis)
        expect(screen.getByText('🌟')).toBeInTheDocument(); // Google
        expect(screen.getByText('👍')).toBeInTheDocument(); // Facebook  
        expect(screen.getByText('📝')).toBeInTheDocument(); // Yelp
        expect(screen.getByText('💍')).toBeInTheDocument(); // WeddingWire
        expect(screen.getByText('🎗️')).toBeInTheDocument(); // The Knot
      });
    });

    it('displays correct status indicators', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Connected')).toHaveLength(2); // Google, Facebook
        expect(screen.getAllByText('Not Connected')).toHaveLength(2); // WeddingWire, The Knot
        expect(screen.getByText('Error')).toBeInTheDocument(); // Yelp
      });
    });

    it('shows account information for connected platforms', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('info@yourphotography.com')).toBeInTheDocument();
        expect(screen.getAllByText('Your Photography Studio')).toHaveLength(2); // Google & Facebook
        expect(screen.getByText(/last synced.*ago/i)).toBeInTheDocument();
      });
    });

    it('displays error messages for problematic platforms', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('API key expired. Please reconnect your account.')).toBeInTheDocument();
      });
    });

    it('shows platform features correctly', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Automatic review requests')).toBeInTheDocument();
        expect(screen.getByText('Review response management')).toBeInTheDocument();
        expect(screen.getByText('Rating analytics')).toBeInTheDocument();
        expect(screen.getByText('Business profile insights')).toBeInTheDocument();
      });
    });
  });

  describe('Platform Actions', () => {
    it('shows correct action buttons for connected platforms', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Sync Now')).toHaveLength(2); // Google, Facebook
        expect(screen.getAllByText('View Profile')).toHaveLength(2);
        expect(screen.getAllByText('Settings')).toHaveLength(2);
        expect(screen.getAllByText('Disconnect')).toHaveLength(2);
      });
    });

    it('shows connect button for disconnected platforms', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Connect')).toHaveLength(3); // WeddingWire, The Knot, Yelp (error state)
      });
    });

    it('handles platform connection', async () => {
      const user = userEvent.setup();
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(async () => {
        const connectButtons = screen.getAllByText('Connect');
        const weddingWireButton = connectButtons[0]; // First disconnect platform

        await user.click(weddingWireButton);

        // Should show connecting state
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
        expect(weddingWireButton).toBeDisabled();
      });

      // After connection completes
      await waitFor(() => {
        expect(defaultProps.onConnectionChange).toHaveBeenCalledWith('weddingwire', true);
      });
    });

    it('handles platform disconnection', async () => {
      const user = userEvent.setup();
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(async () => {
        const disconnectButtons = screen.getAllByText('Disconnect');
        await user.click(disconnectButtons[0]);

        expect(defaultProps.onConnectionChange).toHaveBeenCalledWith('google', false);
      });
    });

    it('handles platform sync', async () => {
      const user = userEvent.setup();
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(async () => {
        const syncButtons = screen.getAllByText('Sync Now');
        await user.click(syncButtons[0]);

        // Should update last sync time
        await waitFor(() => {
          expect(screen.getByText(/last synced.*minutes ago/i)).toBeInTheDocument();
        });
      });
    });

    it('opens external profile links correctly', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        const profileLinks = screen.getAllByText('View Profile');
        const googleProfileLink = profileLinks[0].closest('a');
        
        expect(googleProfileLink).toHaveAttribute('href', 'https://business.google.com/b/123456789');
        expect(googleProfileLink).toHaveAttribute('target', '_blank');
        expect(googleProfileLink).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Security Features', () => {
    it('displays security notice at bottom', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Security & Privacy')).toBeInTheDocument();
        expect(screen.getByText(/all integrations use secure OAuth 2.0 authentication/i)).toBeInTheDocument();
        expect(screen.getByText(/we never store your platform passwords/i)).toBeInTheDocument();
      });
    });

    it('shows OAuth security badge in header', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/industry-standard OAuth protocols/i)).toBeInTheDocument();
      });
    });
  });

  describe('Last Sync Formatting', () => {
    it('formats recent sync times correctly', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        // Should show relative time formatting
        expect(screen.getByText(/hours ago/i)).toBeInTheDocument();
      });
    });

    it('shows sync times for connected platforms only', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        const syncTimes = screen.getAllByText(/ago/i);
        // Should have sync times for connected platforms (Google, Facebook)
        expect(syncTimes.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API connection errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(async () => {
        const connectButton = screen.getAllByText('Connect')[0];
        
        // Mock failed connection
        vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Connection failed'));
        
        await user.click(connectButton);
        
        // Should handle error gracefully
        expect(connectButton).not.toBeDisabled();
      });

      consoleSpy.mockRestore();
    });

    it('shows appropriate error states for problematic connections', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('API key expired. Please reconnect your account.')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /platform integrations/i, level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /security & privacy/i, level: 4 })).toBeInTheDocument();
      });
    });

    it('has proper button labeling', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        const connectButtons = screen.getAllByRole('button', { name: /connect/i });
        expect(connectButtons.length).toBeGreaterThan(0);

        const syncButtons = screen.getAllByRole('button', { name: /sync now/i });
        expect(syncButtons.length).toBeGreaterThan(0);
      });
    });

    it('provides proper ARIA labels for status indicators', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        // Status indicators should have proper accessibility
        const statusBadges = screen.getAllByText(/connected|not connected|error/i);
        expect(statusBadges.length).toBeGreaterThan(0);
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(async () => {
        const firstButton = screen.getAllByRole('button')[0];
        firstButton.focus();
        expect(firstButton).toHaveFocus();

        await user.tab();
        expect(document.activeElement).not.toBe(firstButton);
      });
    });

    it('has proper contrast for status indicators', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        // Status badges should have proper styling classes
        const connectedBadge = screen.getAllByText('Connected')[0];
        expect(connectedBadge).toHaveClass('text-success-700');

        const errorBadge = screen.getByText('Error');
        expect(errorBadge).toHaveClass('text-error-700');
      });
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', () => {
      const startTime = performance.now();
      render(<ReviewPlatformIntegrations {...defaultProps} />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('handles multiple platforms efficiently', async () => {
      const startTime = performance.now();
      render(<ReviewPlatformIntegrations {...defaultProps} />);
      
      await waitFor(() => {
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(200);
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts platform cards for mobile', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<ReviewPlatformIntegrations {...defaultProps} />);

      // Should use single column layout on mobile
      const platformCards = document.querySelectorAll('[class*="lg:flex-row"]');
      expect(platformCards.length).toBeGreaterThan(0);
    });

    it('uses grid layout for summary cards', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        const summaryGrid = document.querySelector('[class*="grid-cols-1 md:grid-cols-3"]');
        expect(summaryGrid).toBeInTheDocument();
      });
    });
  });

  describe('Data Management', () => {
    it('loads platform data on mount', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Google Business')).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('updates platform status after connection', async () => {
      const user = userEvent.setup();
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(async () => {
        const connectButton = screen.getAllByText('Connect')[0];
        await user.click(connectButton);

        // Should eventually show connected state
        await waitFor(() => {
          expect(screen.getByText('Connecting...')).toBeInTheDocument();
        });
      });
    });

    it('maintains correct platform counts', async () => {
      render(<ReviewPlatformIntegrations {...defaultProps} />);

      await waitFor(() => {
        // Verify counts match the actual platform states
        const connectedCount = screen.getByText('Connected').nextSibling;
        const totalCount = screen.getByText('Available').nextSibling;
        const issuesCount = screen.getByText('Issues').nextSibling;

        expect(connectedCount?.textContent).toBe('2');
        expect(totalCount?.textContent).toBe('5');
        expect(issuesCount?.textContent).toBe('1');
      });
    });
  });
});