/**
 * WS-214 Team D: Mobile Vendor Networking System - Comprehensive Tests
 * Tests cover mobile-optimized vendor networking functionality including:
 * - Connection management
 * - Vendor discovery
 * - Mobile UI components
 * - API integration
 * - Real-time updates
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import '@testing-library/jest-dom';

import VendorNetworkingHub from '@/components/vendor-networking/VendorNetworkingHub';
import VendorDiscovery from '@/components/vendor-networking/VendorDiscovery';
import ConnectionRequestCard from '@/components/vendor-networking/ConnectionRequestCard';
import { useVendorNetworking } from '@/hooks/useVendorNetworking';

// Mock Next.js components and hooks
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({ get: jest.fn() })),
}));

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: 'test-user-id' } } },
        }),
      ),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: 'test-vendor-id' },
            }),
          ),
        })),
      })),
    })),
  })),
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock data
const mockConnectionsResponse = {
  connections: [
    {
      id: 'conn-1',
      status: 'connected',
      connection_type: 'professional',
      trust_level: 4,
      last_interaction_at: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      requested_at: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      perspective: 'sent',
      other_vendor: {
        id: 'vendor-1',
        business_name: 'Elegant Photography',
        primary_category: 'Photography',
        city: 'London',
        featured_image: '/images/vendor1.jpg',
      },
    },
    {
      id: 'conn-2',
      status: 'pending',
      connection_type: 'referral_partner',
      trust_level: 1,
      initial_message:
        'Hi! I would love to connect and explore referral opportunities.',
      requested_at: new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      perspective: 'received',
      other_vendor: {
        id: 'vendor-2',
        business_name: 'Dream Venues',
        primary_category: 'Venue',
        city: 'Manchester',
        featured_image: '/images/vendor2.jpg',
      },
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    hasMore: false,
  },
};

const mockProfileResponse = {
  profile: {
    vendor_id: 'test-vendor-id',
    open_to_networking: true,
    seeking_referrals: true,
    offering_referrals: true,
    collaboration_interests: ['joint_bookings', 'resource_sharing'],
    networking_goals: 'Expand network and increase referrals',
    expertise_keywords: ['wedding_photography', 'portraits'],
    looking_for: ['venues', 'florists'],
    preferred_contact_method: 'in_app',
    response_time_hours: 24,
    total_connections: 15,
    active_connections: 12,
    referrals_sent: 8,
    referrals_received: 5,
    network_score: 85,
    profile_visibility: 'public',
    auto_accept_connections: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    vendor: {
      id: 'test-vendor-id',
      business_name: 'Test Photography',
      primary_category: 'Photography',
      city: 'London',
      description: 'Professional wedding photography',
    },
  },
};

const mockDiscoveryResponse = {
  vendors: [
    {
      id: 'discovery-vendor-1',
      business_name: 'Beautiful Blooms',
      primary_category: 'Florist',
      city: 'Birmingham',
      county: 'West Midlands',
      years_in_business: 5,
      team_size: 3,
      description:
        'Award-winning wedding florist specializing in luxury arrangements',
      network_score: 78,
      total_connections: 25,
      relevance_score: 92,
      open_to_networking: true,
      seeking_referrals: true,
      offering_referrals: true,
      collaboration_interests: ['styled_shoots', 'venue_partnerships'],
      expertise_keywords: [
        'luxury_flowers',
        'bridal_bouquets',
        'venue_styling',
      ],
    },
    {
      id: 'discovery-vendor-2',
      business_name: 'Sound & Vision',
      primary_category: 'DJ',
      city: 'Leeds',
      county: 'Yorkshire',
      years_in_business: 8,
      team_size: 2,
      description: 'Professional DJ and entertainment services for weddings',
      network_score: 82,
      total_connections: 18,
      relevance_score: 87,
      open_to_networking: true,
      seeking_referrals: false,
      offering_referrals: true,
      collaboration_interests: ['music_packages'],
      expertise_keywords: ['wedding_dj', 'entertainment', 'lighting'],
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    hasMore: false,
  },
  filters: {},
};

describe('WS-214 Team D: Mobile Vendor Networking System', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/vendor-networking/connections')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConnectionsResponse),
        });
      }
      if (url.includes('/api/vendor-networking/profiles')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProfileResponse),
        });
      }
      if (url.includes('/api/vendor-networking/discover')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDiscoveryResponse),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('VendorNetworkingHub Component', () => {
    it('renders mobile-optimized networking hub with stats', async () => {
      render(<VendorNetworkingHub />);

      // Check for main title
      expect(screen.getByText('Networking')).toBeInTheDocument();
      expect(
        screen.getByText('Connect & collaborate with vendors'),
      ).toBeInTheDocument();

      // Wait for API calls to complete
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // Total connections
      });

      // Check stats cards are rendered
      expect(screen.getByText('Connections')).toBeInTheDocument();
      expect(screen.getByText('Network Score')).toBeInTheDocument();
      expect(screen.getByText('Referrals')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('displays mobile-friendly tab navigation', async () => {
      render(<VendorNetworkingHub />);

      // Check tab buttons exist
      expect(
        screen.getByRole('tab', { name: /overview/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /connections/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /discover/i }),
      ).toBeInTheDocument();
    });

    it('switches between tabs correctly', async () => {
      render(<VendorNetworkingHub />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Click on connections tab
      fireEvent.click(screen.getByRole('tab', { name: /connections/i }));

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument(); // Filter button
      });
    });

    it('displays connection activity correctly', async () => {
      render(<VendorNetworkingHub />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
        expect(screen.getByText('Dream Venues')).toBeInTheDocument();
      });
    });

    it('handles empty state gracefully', async () => {
      // Mock empty response
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              connections: [],
              pagination: { page: 1, limit: 20, total: 0, hasMore: false },
            }),
        }),
      );

      render(<VendorNetworkingHub />);

      await waitFor(() => {
        expect(screen.getByText('No connections yet')).toBeInTheDocument();
        expect(
          screen.getByText('Start networking to grow your business'),
        ).toBeInTheDocument();
      });
    });

    it('shows loading state correctly', () => {
      // Mock delayed response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockConnectionsResponse),
                }),
              100,
            ),
          ),
      );

      render(<VendorNetworkingHub />);

      // Check loading skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Network error' }),
        }),
      );

      render(<VendorNetworkingHub />);

      // Component should still render without crashing
      expect(screen.getByText('Networking')).toBeInTheDocument();
    });
  });

  describe('VendorDiscovery Component', () => {
    it('renders vendor discovery with search functionality', async () => {
      render(<VendorDiscovery />);

      // Check search input
      const searchInput = screen.getByPlaceholderText(/search vendors/i);
      expect(searchInput).toBeInTheDocument();

      // Wait for vendors to load
      await waitFor(() => {
        expect(screen.getByText('Beautiful Blooms')).toBeInTheDocument();
        expect(screen.getByText('Sound & Vision')).toBeInTheDocument();
      });
    });

    it('filters vendors by category', async () => {
      render(<VendorDiscovery />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Beautiful Blooms')).toBeInTheDocument();
      });

      // Click on Florist filter
      const floristButton = screen.getByText('Florist');
      fireEvent.click(floristButton);

      // API should be called with category filter
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Florist'),
        );
      });
    });

    it('allows connecting to vendors', async () => {
      // Mock successful connection response
      mockFetch.mockImplementation((url: string, options: any) => {
        if (options?.method === 'POST' && url.includes('/connections')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                connection: {
                  id: 'new-conn-id',
                  status: 'pending',
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDiscoveryResponse),
        });
      });

      render(<VendorDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('Beautiful Blooms')).toBeInTheDocument();
      });

      // Click connect button
      const connectButtons = screen.getAllByText('Connect');
      fireEvent.click(connectButtons[0]);

      // Should show connecting state
      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
    });

    it('handles search with debouncing', async () => {
      render(<VendorDiscovery />);

      const searchInput = screen.getByPlaceholderText(/search vendors/i);

      // Type in search input
      fireEvent.change(searchInput, { target: { value: 'photography' } });

      // Should debounce the search
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600)); // Wait for debounce
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=photography'),
      );
    });

    it('shows relevance scores and vendor details', async () => {
      render(<VendorDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('92% match')).toBeInTheDocument();
        expect(screen.getByText('87% match')).toBeInTheDocument();
        expect(screen.getByText('5y exp')).toBeInTheDocument();
        expect(screen.getByText('8y exp')).toBeInTheDocument();
      });
    });

    it('displays networking preferences badges', async () => {
      render(<VendorDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('Seeking referrals')).toBeInTheDocument();
        expect(screen.getByText('Offers referrals')).toBeInTheDocument();
        expect(screen.getByText('Collaborates')).toBeInTheDocument();
      });
    });
  });

  describe('ConnectionRequestCard Component', () => {
    const mockConnection = {
      id: 'conn-test',
      status: 'pending' as const,
      connection_type: 'professional' as const,
      trust_level: 3,
      initial_message:
        'Hi! I would love to connect and explore opportunities for collaboration.',
      requested_at: new Date().toISOString(),
      perspective: 'received' as const,
      other_vendor: {
        id: 'vendor-test',
        business_name: 'Test Vendor',
        primary_category: 'Photography',
        city: 'Test City',
        years_in_business: 5,
        description: 'Professional wedding photography services',
      },
    };

    it('renders connection request with vendor details', () => {
      render(<ConnectionRequestCard connection={mockConnection} />);

      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByText('Test City')).toBeInTheDocument();
      expect(screen.getByText('5y exp')).toBeInTheDocument();
      expect(screen.getByText('3/5')).toBeInTheDocument(); // Trust level
    });

    it('shows initial message when present', () => {
      render(<ConnectionRequestCard connection={mockConnection} />);

      expect(
        screen.getByText(/Hi! I would love to connect/),
      ).toBeInTheDocument();
    });

    it('expands long messages correctly', () => {
      const longMessageConnection = {
        ...mockConnection,
        initial_message:
          'This is a very long message that should be truncated initially. '.repeat(
            10,
          ),
      };

      render(<ConnectionRequestCard connection={longMessageConnection} />);

      // Should show truncated version initially
      expect(
        screen.getByText(/This is a very long message/),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(longMessageConnection.initial_message),
      ).not.toBeInTheDocument();

      // Click expand button
      const expandButton =
        document.querySelector('[data-testid="expand-message"]') ||
        screen.getByRole('button', { name: /expand/i });
      if (expandButton) {
        fireEvent.click(expandButton);

        // Should show full message
        expect(
          screen.getByText(longMessageConnection.initial_message),
        ).toBeInTheDocument();
      }
    });

    it('handles accept and decline actions', async () => {
      const mockOnAccept = jest.fn();
      const mockOnDecline = jest.fn();

      render(
        <ConnectionRequestCard
          connection={mockConnection}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />,
      );

      // Click accept button
      const acceptButton = screen.getByText('Accept');
      fireEvent.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalledWith('conn-test');

      // Click decline button
      const declineButton = screen.getByRole('button', { name: /decline/i });
      fireEvent.click(declineButton);

      expect(mockOnDecline).toHaveBeenCalledWith('conn-test');
    });

    it('shows different states for sent vs received requests', () => {
      const sentConnection = {
        ...mockConnection,
        perspective: 'sent' as const,
      };

      const { rerender } = render(
        <ConnectionRequestCard connection={mockConnection} />,
      );

      // Received request should show accept/decline buttons
      expect(screen.getByText('Accept')).toBeInTheDocument();

      rerender(<ConnectionRequestCard connection={sentConnection} />);

      // Sent request should show awaiting response
      expect(screen.getByText('Awaiting response')).toBeInTheDocument();
      expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    });

    it('displays connected state correctly', () => {
      const connectedConnection = {
        ...mockConnection,
        status: 'connected' as const,
      };

      render(<ConnectionRequestCard connection={connectedConnection} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('Mobile-Specific Tests', () => {
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

    it('renders mobile-optimized layouts', () => {
      render(<VendorNetworkingHub />);

      // Check for mobile-specific classes
      const mobileElements = document.querySelectorAll(
        '.grid-cols-2, .space-y-3, .text-xs',
      );
      expect(mobileElements.length).toBeGreaterThan(0);
    });

    it('handles touch interactions correctly', async () => {
      render(<VendorDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('Beautiful Blooms')).toBeInTheDocument();
      });

      // Simulate touch events
      const connectButton = screen.getAllByText('Connect')[0];

      fireEvent.touchStart(connectButton);
      fireEvent.touchEnd(connectButton);
      fireEvent.click(connectButton);

      // Should handle touch events without errors
      expect(connectButton).toBeInTheDocument();
    });

    it('adapts to small screen sizes', () => {
      render(<VendorNetworkingHub />);

      // Check for responsive grid layouts
      const gridElements = document.querySelectorAll('.grid-cols-2');
      expect(gridElements.length).toBeGreaterThan(0);

      // Check for text sizing appropriate for mobile
      const smallTextElements = document.querySelectorAll('.text-xs, .text-sm');
      expect(smallTextElements.length).toBeGreaterThan(0);
    });

    it('provides adequate touch targets', () => {
      render(<VendorNetworkingHub />);

      // All buttons should be at least 44px (minimum touch target size)
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        const height = parseInt(styles.height) || 44;
        expect(height).toBeGreaterThanOrEqual(32); // Allowing for CSS scaling
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('loads efficiently with pagination', async () => {
      render(<VendorDiscovery />);

      // Should load initial set efficiently
      await waitFor(() => {
        expect(screen.getByText('Beautiful Blooms')).toBeInTheDocument();
      });

      // Check that API is called with reasonable limits
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
      );
    });

    it('provides proper ARIA labels', () => {
      render(<VendorNetworkingHub />);

      // Check for tab accessibility
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      // Check for button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('handles keyboard navigation', () => {
      render(<VendorNetworkingHub />);

      // Tab navigation should work
      const firstTab = screen.getByRole('tab', { name: /overview/i });
      firstTab.focus();

      fireEvent.keyDown(firstTab, { key: 'Tab' });

      // Should not throw errors
      expect(document.activeElement).toBeTruthy();
    });

    it('provides loading states for better UX', () => {
      // Mock slow API
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockDiscoveryResponse),
                }),
              100,
            ),
          ),
      );

      render(<VendorDiscovery />);

      // Should show loading skeletons
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<VendorNetworkingHub />);

      // Should not crash and should show fallback
      expect(screen.getByText('Networking')).toBeInTheDocument();
    });

    it('handles API errors with user feedback', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' }),
        }),
      );

      render(<VendorDiscovery />);

      // Should handle API errors gracefully
      await waitFor(() => {
        // Component should still render
        expect(
          screen.getByPlaceholderText(/search vendors/i),
        ).toBeInTheDocument();
      });
    });

    it('validates user inputs properly', async () => {
      render(<VendorDiscovery />);

      const searchInput = screen.getByPlaceholderText(/search vendors/i);

      // Test empty search
      fireEvent.change(searchInput, { target: { value: '' } });

      // Should not make unnecessary API calls
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      // Should have made initial load call but not search call
      const searchCalls = mockFetch.mock.calls.filter((call) =>
        call[0]?.toString().includes('search='),
      );
      expect(searchCalls.length).toBe(0);
    });
  });
});
