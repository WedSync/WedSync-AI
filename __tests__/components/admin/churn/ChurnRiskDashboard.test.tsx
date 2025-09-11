/**
 * WS-182 ChurnRiskDashboard Component Tests
 * Team A - UI Component Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChurnRiskDashboard } from '@/components/admin/churn/ChurnRiskDashboard';
import { useChurnIntelligence } from '@/hooks/useChurnIntelligence';
import { ChurnRiskLevel, AlertUrgency } from '@/types/churn-intelligence';

// Mock the hook
jest.mock('@/hooks/useChurnIntelligence');
const mockUseChurnIntelligence = useChurnIntelligence as jest.MockedFunction<typeof useChurnIntelligence>;

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock data
const mockChurnMetrics = {
  totalSuppliers: 487,
  atRiskSuppliers: 42,
  criticalRiskSuppliers: 8,
  predictedChurn30d: 15,
  predictedChurn90d: 28,
  monthlyRetentionRate: 91.5,
  retentionRateChange: -2.3,
  campaignsSaved: 12,
  revenueAtRisk: 125000,
  revenueRetained: 89000,
  interventionsExecuted30d: 23,
  interventionSuccessRate: 76.5,
  averageTimeToIntervention: 4.2,
  criticalAlertsGenerated: 8,
  riskTrend: 'worsening' as const,
  seasonalAdjustment: -5,
  calculatedAt: new Date()
};

const mockSuppliers = [
  {
    supplierId: 'supplier-1',
    supplierName: 'Sunshine Photography',
    supplierType: 'photographer' as const,
    contactEmail: 'contact@sunshinephoto.com',
    churnRiskScore: 92,
    churnRiskLevel: ChurnRiskLevel.CRITICAL,
    churnProbability: 0.85,
    predictedChurnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    daysUntilPredictedChurn: 7,
    riskFactors: [],
    primaryRiskReason: 'Extended absence during peak season',
    daysSinceLastLogin: 18,
    lastActivityDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    loginFrequencyTrend: 'declining' as const,
    featureUsageScore: 15,
    engagementTrend: 'declining' as const,
    openSupportTickets: 3,
    recentTicketSentiment: 'negative' as const,
    supportInteractionCount30d: 5,
    subscriptionValue: 2400,
    paymentFailures30d: 1,
    subscriptionTier: 'Professional',
    daysSinceLastPayment: 45,
    interventionCount30d: 0,
    previousRetentionSuccess: false,
    weddingSeasonActivity: 'peak' as const,
    seasonalRiskAdjustment: -5,
    calculatedAt: new Date(),
    lastUpdated: new Date()
  }
];

const mockAlerts = [
  {
    id: 'alert-1',
    alertType: 'escalated_risk' as const,
    urgency: AlertUrgency.CRITICAL,
    supplierId: 'supplier-1',
    supplierName: 'Sunshine Photography',
    riskScore: 92,
    riskLevel: ChurnRiskLevel.CRITICAL,
    title: 'Critical Churn Risk',
    message: 'Supplier showing critical churn indicators',
    actionRequired: 'Immediate intervention needed',
    suggestedActions: ['schedule_call', 'assign_csm'],
    createdAt: new Date(),
    isRead: false,
    isDismissed: false,
    triggerEvent: 'risk_score_increase',
    metadata: {}
  }
];

const mockHookReturn = {
  atRiskSuppliers: mockSuppliers,
  churnMetrics: mockChurnMetrics,
  retentionCampaigns: [],
  churnAlerts: mockAlerts,
  trendData: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  filters: {},
  setFilters: jest.fn(),
  refreshData: jest.fn(),
  executeRetentionAction: jest.fn(),
  createCampaign: jest.fn(),
  dismissAlert: jest.fn(),
  acknowledgeAlert: jest.fn(),
  connectionStatus: 'connected' as const,
  lastUpdated: new Date()
};

describe('ChurnRiskDashboard', () => {
  beforeEach(() => {
    mockUseChurnIntelligence.mockReturnValue(mockHookReturn);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dashboard with all main sections', () => {
      render(<ChurnRiskDashboard />);

      expect(screen.getByText('Churn Intelligence Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /suppliers/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /campaigns/i })).toBeInTheDocument();
    });

    it('displays key metrics cards correctly', () => {
      render(<ChurnRiskDashboard />);

      expect(screen.getByText('487')).toBeInTheDocument(); // Total suppliers
      expect(screen.getByText('42')).toBeInTheDocument(); // At-risk suppliers
      expect(screen.getByText('91.5%')).toBeInTheDocument(); // Retention rate
      expect(screen.getByText('$125,000')).toBeInTheDocument(); // Revenue at risk
    });

    it('shows loading state correctly', () => {
      mockUseChurnIntelligence.mockReturnValue({
        ...mockHookReturn,
        isLoading: true,
        churnMetrics: null
      });

      render(<ChurnRiskDashboard />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading churn intelligence data/i)).toBeInTheDocument();
    });

    it('displays error state appropriately', () => {
      mockUseChurnIntelligence.mockReturnValue({
        ...mockHookReturn,
        error: 'Failed to load churn data'
      });

      render(<ChurnRiskDashboard />);

      expect(screen.getByText('Failed to load churn data')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      render(<ChurnRiskDashboard />);

      const suppliersTab = screen.getByRole('tab', { name: /suppliers/i });
      const campaignsTab = screen.getByRole('tab', { name: /campaigns/i });

      // Initially on overview tab
      expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');

      // Switch to suppliers tab
      fireEvent.click(suppliersTab);
      await waitFor(() => {
        expect(suppliersTab).toHaveAttribute('aria-selected', 'true');
      });

      // Switch to campaigns tab
      fireEvent.click(campaignsTab);
      await waitFor(() => {
        expect(campaignsTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('shows correct content for each tab', async () => {
      render(<ChurnRiskDashboard />);

      // Overview tab (default)
      expect(screen.getByText(/key performance indicators/i)).toBeInTheDocument();

      // Switch to suppliers tab
      fireEvent.click(screen.getByRole('tab', { name: /suppliers/i }));
      await waitFor(() => {
        expect(screen.getByText(/at-risk suppliers/i)).toBeInTheDocument();
      });

      // Switch to campaigns tab
      fireEvent.click(screen.getByRole('tab', { name: /campaigns/i }));
      await waitFor(() => {
        expect(screen.getByText(/retention campaigns/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it('updates filters when search is performed', async () => {
      const mockSetFilters = jest.fn();
      mockUseChurnIntelligence.mockReturnValue({
        ...mockHookReturn,
        setFilters: mockSetFilters
      });

      render(<ChurnRiskDashboard />);

      // Switch to suppliers tab to access search
      fireEvent.click(screen.getByRole('tab', { name: /suppliers/i }));

      const searchInput = screen.getByPlaceholderText(/search suppliers/i);
      fireEvent.change(searchInput, { target: { value: 'Sunshine' } });

      await waitFor(() => {
        expect(mockSetFilters).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Sunshine' })
        );
      });
    });

    it('applies risk level filters correctly', async () => {
      const mockSetFilters = jest.fn();
      mockUseChurnIntelligence.mockReturnValue({
        ...mockHookReturn,
        setFilters: mockSetFilters
      });

      render(<ChurnRiskDashboard />);

      // Switch to suppliers tab
      fireEvent.click(screen.getByRole('tab', { name: /suppliers/i }));

      const criticalFilter = screen.getByRole('checkbox', { name: /critical/i });
      fireEvent.click(criticalFilter);

      await waitFor(() => {
        expect(mockSetFilters).toHaveBeenCalledWith(
          expect.objectContaining({
            riskLevel: expect.arrayContaining([ChurnRiskLevel.CRITICAL])
          })
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('displays connection status indicator', () => {
      render(<ChurnRiskDashboard />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('shows last updated timestamp', () => {
      render(<ChurnRiskDashboard />);

      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });

    it('calls refresh when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      mockUseChurnIntelligence.mockReturnValue({
        ...mockHookReturn,
        refreshData: mockRefresh
      });

      render(<ChurnRiskDashboard />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ChurnRiskDashboard />);

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Dashboard sections');
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('supports keyboard navigation', async () => {
      render(<ChurnRiskDashboard />);

      const firstTab = screen.getByRole('tab', { name: /overview/i });
      const secondTab = screen.getByRole('tab', { name: /suppliers/i });

      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);

      // Navigate with arrow keys
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(document.activeElement).toBe(secondTab);
      });
    });

    it('announces tab changes to screen readers', async () => {
      render(<ChurnRiskDashboard />);

      const suppliersTab = screen.getByRole('tab', { name: /suppliers/i });
      fireEvent.click(suppliersTab);

      await waitFor(() => {
        expect(suppliersTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', suppliersTab.id);
      });
    });
  });

  describe('Integration with Child Components', () => {
    it('passes correct props to AtRiskSupplierCard components', async () => {
      render(<ChurnRiskDashboard />);

      // Switch to suppliers tab
      fireEvent.click(screen.getByRole('tab', { name: /suppliers/i }));

      await waitFor(() => {
        expect(screen.getByText('Sunshine Photography')).toBeInTheDocument();
      });
    });

    it('handles retention action execution', async () => {
      const mockExecuteAction = jest.fn().mockResolvedValue({});
      mockUseChurnIntelligence.mockReturnValue({
        ...mockHookReturn,
        executeRetentionAction: mockExecuteAction
      });

      render(<ChurnRiskDashboard />);

      // Switch to suppliers tab
      fireEvent.click(screen.getByRole('tab', { name: /suppliers/i }));

      // Find and click a retention action button (assuming it exists in the supplier card)
      await waitFor(async () => {
        const actionButton = screen.getByRole('button', { name: /schedule call/i });
        fireEvent.click(actionButton);

        expect(mockExecuteAction).toHaveBeenCalledWith({
          supplierId: 'supplier-1',
          action: 'schedule_call'
        });
      });
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large datasets', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockSuppliers[0],
        supplierId: `supplier-${i}`,
        supplierName: `Supplier ${i}`
      }));

      mockUseChurnIntelligence.mockReturnValue({
        ...mockHookReturn,
        atRiskSuppliers: largeDataset
      });

      const startTime = performance.now();
      render(<ChurnRiskDashboard />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('implements virtualization for supplier lists', async () => {
      render(<ChurnRiskDashboard />);

      // Switch to suppliers tab
      fireEvent.click(screen.getByRole('tab', { name: /suppliers/i }));

      // Check that only visible suppliers are rendered (implementation-specific)
      await waitFor(() => {
        const supplierCards = screen.getAllByTestId(/supplier-card/i);
        expect(supplierCards.length).toBeLessThanOrEqual(20); // Reasonable viewport limit
      });
    });
  });
});