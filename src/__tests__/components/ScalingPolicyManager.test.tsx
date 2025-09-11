import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import ScalingPolicyManager from '../../components/platform/ScalingPolicyManager';

// Mock the hooks
const mockUsePlatformScaling = {
  isLoading: false,
  metrics: {
    platformHealth: {
      overallScore: 95,
      systemStatus: {
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
      },
    },
    viralGrowthMetrics: {
      currentGrowthRate: 150,
      activeViralPatterns: [],
      newUserRegistrations: 45,
      inviteConversionRate: 12.5,
    },
    weddingSeasonMetrics: {
      currentSeason: 'peak',
      peakMonths: [5, 6, 7, 8, 9],
      totalBookingsThisYear: 1250,
      averageBookingsPerMonth: 104.2,
    },
  },
  weddingProtection: {
    isActive: false,
    activatedBy: '',
    activatedAt: '',
    reason: '',
    affectedSystems: [],
  },
  lastDecision: null,
  error: null,
  refreshMetrics: jest.fn(),
  enableWeddingProtection: jest.fn(),
  disableWeddingProtection: jest.fn(),
  triggerScalingDecision: jest.fn(),
  resetError: jest.fn(),
};

const mockUseWeddingMetrics = {
  isLoading: false,
  metrics: {
    activeSaturdayWeddings: 3,
    viralReferralRate: 18.5,
    peakSeasonActive: true,
    totalWeddingsToday: 8,
    averageVendorCount: 6.2,
    activeVendorsToday: 127,
    conversionMetrics: {
      inviteToSignup: 18.5,
      signupToActive: 75,
      freeToTrial: 65,
      trialToPaid: 45,
    },
  },
  seasonMetrics: null,
  viralPatterns: [],
  conversions: [],
  error: null,
  refreshMetrics: jest.fn(),
  trackViralGrowth: jest.fn(),
  recordConversion: jest.fn(),
  resetError: jest.fn(),
};

jest.mock('../../hooks/usePlatformScaling', () => ({
  usePlatformScaling: () => mockUsePlatformScaling,
}));

jest.mock('../../hooks/useWeddingMetrics', () => ({
  useWeddingMetrics: () => mockUseWeddingMetrics,
}));

describe('ScalingPolicyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the main title', () => {
      render(<ScalingPolicyManager />);

      expect(
        screen.getByText('Platform Scaling Policy Manager'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Manage wedding-specific scaling policies/),
      ).toBeInTheDocument();
    });

    it('should display loading state', () => {
      const loadingMocks = {
        ...mockUsePlatformScaling,
        isLoading: true,
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mockReturnValue(loadingMocks);

      render(<ScalingPolicyManager />);

      expect(
        screen.getByText('Loading platform metrics...'),
      ).toBeInTheDocument();
    });

    it('should display error state', () => {
      const errorMocks = {
        ...mockUsePlatformScaling,
        error: 'Failed to load platform metrics',
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mockReturnValue(errorMocks);

      render(<ScalingPolicyManager />);

      expect(
        screen.getByText('Failed to load platform metrics'),
      ).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('wedding metrics display', () => {
    it('should display current wedding metrics', () => {
      render(<ScalingPolicyManager />);

      expect(screen.getByText('3')).toBeInTheDocument(); // Active Saturday weddings
      expect(screen.getByText('Active Saturday Weddings')).toBeInTheDocument();

      expect(screen.getByText('18.5%')).toBeInTheDocument(); // Viral referral rate
      expect(screen.getByText('Viral Referral Rate')).toBeInTheDocument();

      expect(screen.getByText('Peak Season')).toBeInTheDocument(); // Current season
    });

    it('should show wedding protection status', () => {
      render(<ScalingPolicyManager />);

      expect(screen.getByText('Wedding Protection')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Enable Protection')).toBeInTheDocument();
    });

    it('should show active wedding protection', () => {
      const protectionMocks = {
        ...mockUsePlatformScaling,
        weddingProtection: {
          isActive: true,
          activatedBy: 'admin@wedsync.com',
          activatedAt: '2022-01-01T10:00:00Z',
          reason: 'Saturday wedding protection',
          affectedSystems: ['deployments', 'maintenance'],
        },
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mockReturnValue(protectionMocks);

      render(<ScalingPolicyManager />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(
        screen.getByText('Saturday wedding protection'),
      ).toBeInTheDocument();
      expect(screen.getByText('Disable Protection')).toBeInTheDocument();
    });
  });

  describe('platform health display', () => {
    it('should display platform health score', () => {
      render(<ScalingPolicyManager />);

      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('Platform Health Score')).toBeInTheDocument();
    });

    it('should display system status', () => {
      render(<ScalingPolicyManager />);

      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('API')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();

      // Should show healthy status (green indicators)
      const healthyIndicators = screen.getAllByText('●');
      expect(healthyIndicators.length).toBeGreaterThan(0);
    });

    it('should display degraded system status', () => {
      const degradedMocks = {
        ...mockUsePlatformScaling,
        metrics: {
          ...mockUsePlatformScaling.metrics!,
          platformHealth: {
            overallScore: 65,
            systemStatus: {
              database: 'healthy',
              api: 'degraded',
              storage: 'failed',
            },
          },
        },
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mockReturnValue(degradedMocks);

      render(<ScalingPolicyManager />);

      expect(screen.getByText('65')).toBeInTheDocument();
      // Should show different status colors for degraded/failed systems
    });
  });

  describe('actions', () => {
    it('should enable wedding protection when button clicked', async () => {
      render(<ScalingPolicyManager />);

      const enableButton = screen.getByText('Enable Protection');
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(
          mockUsePlatformScaling.enableWeddingProtection,
        ).toHaveBeenCalled();
      });
    });

    it('should disable wedding protection when button clicked', async () => {
      const protectionMocks = {
        ...mockUsePlatformScaling,
        weddingProtection: {
          ...mockUsePlatformScaling.weddingProtection,
          isActive: true,
        },
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mockReturnValue(protectionMocks);

      render(<ScalingPolicyManager />);

      const disableButton = screen.getByText('Disable Protection');
      fireEvent.click(disableButton);

      await waitFor(() => {
        expect(
          mockUsePlatformScaling.disableWeddingProtection,
        ).toHaveBeenCalled();
      });
    });

    it('should trigger scaling decision when button clicked', async () => {
      render(<ScalingPolicyManager />);

      const triggerButton = screen.getByText('Trigger Scaling Decision');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(
          mockUsePlatformScaling.triggerScalingDecision,
        ).toHaveBeenCalled();
      });
    });

    it('should refresh metrics when refresh button clicked', async () => {
      render(<ScalingPolicyManager />);

      const refreshButton = screen.getByText('Refresh Metrics');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockUsePlatformScaling.refreshMetrics).toHaveBeenCalled();
      });
    });

    it('should reset error when retry button clicked', async () => {
      const errorMocks = {
        ...mockUsePlatformScaling,
        error: 'Test error',
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mockReturnValue(errorMocks);

      render(<ScalingPolicyManager />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockUsePlatformScaling.resetError).toHaveBeenCalled();
      });
    });
  });

  describe('scaling decision display', () => {
    it('should display last scaling decision', () => {
      const decisionMocks = {
        ...mockUsePlatformScaling,
        lastDecision: {
          timestamp: '2022-01-01T10:00:00Z',
          scalingActions: ['increase_capacity', 'enable_caching'],
          reasoning: 'Peak traffic detected during wedding season',
          priority: 'high' as const,
          estimatedDuration: 1800000,
          restrictions: ['no_deployments'],
        },
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mockReturnValue(decisionMocks);

      render(<ScalingPolicyManager />);

      expect(screen.getByText('Last Scaling Decision')).toBeInTheDocument();
      expect(
        screen.getByText('Peak traffic detected during wedding season'),
      ).toBeInTheDocument();
      expect(screen.getByText('increase_capacity')).toBeInTheDocument();
      expect(screen.getByText('enable_caching')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('should show no scaling decision when none available', () => {
      render(<ScalingPolicyManager />);

      expect(screen.getByText('No scaling decisions yet')).toBeInTheDocument();
    });
  });

  describe('viral growth metrics', () => {
    it('should display viral growth metrics', () => {
      render(<ScalingPolicyManager />);

      expect(screen.getByText('150')).toBeInTheDocument(); // Current growth rate
      expect(screen.getByText('users/hour')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument(); // New registrations
    });

    it('should highlight high growth rate', () => {
      const highGrowthMocks = {
        ...mockUsePlatformScaling,
        metrics: {
          ...mockUsePlatformScaling.metrics!,
          viralGrowthMetrics: {
            ...mockUsePlatformScaling.metrics!.viralGrowthMetrics,
            currentGrowthRate: 750, // Above threshold
          },
        },
      };

      jest
        .mocked(require('../../hooks/usePlatformScaling').usePlatformScaling)
        .mkReturnValue(highGrowthMocks);

      render(<ScalingPolicyManager />);

      expect(screen.getByText('750')).toBeInTheDocument();
      // Should have warning/alert styling for high growth
    });
  });

  describe('wedding season indicator', () => {
    it('should show peak season indicator', () => {
      render(<ScalingPolicyManager />);

      expect(screen.getByText('Peak Season')).toBeInTheDocument();
      // Should have appropriate styling for peak season
    });

    it('should show off season indicator', () => {
      const offSeasonMocks = {
        ...mockUseWeddingMetrics,
        metrics: {
          ...mockUseWeddingMetrics.metrics!,
          peakSeasonActive: false,
        },
      };

      jest
        .mocked(require('../../hooks/useWeddingMetrics').useWeddingMetrics)
        .mockReturnValue(offSeasonMocks);

      render(<ScalingPolicyManager />);

      expect(screen.getByText('Off Season')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should be responsive on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ScalingPolicyManager />);

      // Should render without breaking on mobile
      expect(
        screen.getByText('Platform Scaling Policy Manager'),
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ScalingPolicyManager />);

      expect(
        screen.getByRole('button', { name: /enable protection/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /trigger scaling decision/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /refresh metrics/i }),
      ).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<ScalingPolicyManager />);

      const enableButton = screen.getByText('Enable Protection');
      enableButton.focus();

      expect(document.activeElement).toBe(enableButton);
    });
  });
});
