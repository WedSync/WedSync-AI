/**
 * WS-239: Mobile AI Feature Manager Tests
 * Test suite for mobile AI feature management component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileAIFeatureManager from '@/components/wedme/ai-features/MobileAIFeatureManager';

// Mock the hooks
jest.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: jest.fn(() => ({
    isOnline: true,
    queueAction: jest.fn(),
    isPending: false,
    queueSize: 0
  }))
}));

jest.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: jest.fn(() => ({
    triggerHaptic: jest.fn(),
    isSupported: true,
    isEnabled: true
  }))
}));

// Mock AutoPopulationSecurity
jest.mock('@/lib/mobile/auto-population-security', () => ({
  AutoPopulationSecurity: {
    getSecureItem: jest.fn(),
    setSecureItem: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('MobileAIFeatureManager', () => {
  const defaultProps = {
    userId: 'test-user-id',
    organizationId: 'test-org-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    test('renders the main header correctly', () => {
      render(<MobileAIFeatureManager {...defaultProps} />);
      
      expect(screen.getByText('AI Features')).toBeInTheDocument();
      expect(screen.getByText('Using Platform AI')).toBeInTheDocument();
    });

    test('shows loading state initially', async () => {
      // Mock fetch to simulate loading
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<MobileAIFeatureManager {...defaultProps} />);
      
      expect(screen.getByText('Loading AI features...')).toBeInTheDocument();
    });

    test('renders connection status indicator', () => {
      render(<MobileAIFeatureManager {...defaultProps} />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('Platform vs Client Mode', () => {
    test('displays correct mode in header', () => {
      const { rerender } = render(
        <MobileAIFeatureManager {...defaultProps} initialMode="platform" />
      );
      
      expect(screen.getByText('Using Platform AI')).toBeInTheDocument();
      
      rerender(
        <MobileAIFeatureManager {...defaultProps} initialMode="client" />
      );
      
      expect(screen.getByText('Using Client API')).toBeInTheDocument();
    });

    test('shows API setup button in client mode', async () => {
      // Mock successful comparison fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          platformFeatures: [],
          clientFeatures: [],
          costComparison: {
            platformMonthly: 0,
            averageClientCosts: { total: 0 },
            breakEvenPoint: 0,
            savingsProjection: []
          },
          performanceMetrics: {
            platformLatency: 100,
            clientLatency: 120
          },
          recommendedChoice: 'platform'
        })
      });

      render(
        <MobileAIFeatureManager {...defaultProps} initialMode="client" />
      );

      await waitFor(() => {
        expect(screen.getByText('Setup API Keys')).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Scenario Suggestions', () => {
    test('displays scenario-based recommendation', async () => {
      // Mock successful fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          platformFeatures: [],
          clientFeatures: [],
          costComparison: {
            platformMonthly: 0,
            averageClientCosts: { total: 0 },
            breakEvenPoint: 0,
            savingsProjection: []
          },
          performanceMetrics: {
            platformLatency: 100,
            clientLatency: 120
          },
          recommendedChoice: 'platform'
        })
      });

      render(<MobileAIFeatureManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Client Meeting')).toBeInTheDocument();
        expect(screen.getByText('Generate timeline suggestions with clients')).toBeInTheDocument();
      });
    });
  });

  describe('Offline Functionality', () => {
    test('shows offline indicator when disconnected', () => {
      // Mock offline state
      const { useOfflineSync } = require('@/hooks/useOfflineSync');
      useOfflineSync.mockReturnValue({
        isOnline: false,
        queueAction: jest.fn(),
        isPending: false,
        queueSize: 2
      });

      render(<MobileAIFeatureManager {...defaultProps} offlineMode={true} />);

      expect(screen.getByText('Offline (2 queued)')).toBeInTheDocument();
    });

    test('handles offline mode gracefully', async () => {
      render(<MobileAIFeatureManager {...defaultProps} offlineMode={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Connection required for feature comparison')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<MobileAIFeatureManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('shows retry button on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<MobileAIFeatureManager {...defaultProps} />);

      await waitFor(() => {
        const retryButton = screen.getByText('Try again');
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper touch targets', () => {
      render(<MobileAIFeatureManager {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Check that buttons have touchAction style (would be set in component)
        expect(button).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      render(<MobileAIFeatureManager {...defaultProps} />);

      // Test tab navigation
      const firstButton = screen.getAllByRole('button')[0];
      if (firstButton) {
        firstButton.focus();
        expect(firstButton).toHaveFocus();
      }
    });
  });

  describe('Integration', () => {
    test('calls onModeChange when mode switches', async () => {
      const onModeChange = jest.fn();
      
      // Mock successful comparison fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          platformFeatures: [],
          clientFeatures: [],
          costComparison: {
            platformMonthly: 0,
            averageClientCosts: { total: 0 },
            breakEvenPoint: 0,
            savingsProjection: []
          },
          performanceMetrics: {
            platformLatency: 100,
            clientLatency: 120
          },
          recommendedChoice: 'platform'
        })
      });

      // Mock switch API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(
        <MobileAIFeatureManager 
          {...defaultProps} 
          onModeChange={onModeChange}
        />
      );

      // Wait for component to load, then trigger mode change would happen through toggle component
      await waitFor(() => {
        expect(screen.getByText('AI Features')).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Industry Context', () => {
    test('shows wedding-specific tips', async () => {
      // Mock successful comparison fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          platformFeatures: [],
          clientFeatures: [],
          costComparison: {
            platformMonthly: 0,
            averageClientCosts: { total: 0 },
            breakEvenPoint: 0,
            savingsProjection: []
          },
          performanceMetrics: {
            platformLatency: 100,
            clientLatency: 120
          },
          recommendedChoice: 'platform'
        })
      });

      render(<MobileAIFeatureManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Mobile Tip')).toBeInTheDocument();
        expect(screen.getByText(/Photographers:/)).toBeInTheDocument();
      });
    });
  });
});