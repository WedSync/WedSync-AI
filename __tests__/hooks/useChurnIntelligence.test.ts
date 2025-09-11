/**
 * WS-182 useChurnIntelligence Hook Tests
 * Team A - Hook Testing Suite
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChurnIntelligence } from '@/hooks/useChurnIntelligence';
import { ChurnRiskLevel, AlertUrgency } from '@/types/churn-intelligence';

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock data
const mockSupplierResponse = {
  data: [
    {
      supplierId: 'supplier-1',
      supplierName: 'Sunshine Photography',
      supplierType: 'photographer',
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
      loginFrequencyTrend: 'declining',
      featureUsageScore: 15,
      engagementTrend: 'declining',
      openSupportTickets: 3,
      recentTicketSentiment: 'negative',
      supportInteractionCount30d: 5,
      subscriptionValue: 2400,
      paymentFailures30d: 1,
      subscriptionTier: 'Professional',
      daysSinceLastPayment: 45,
      interventionCount30d: 0,
      previousRetentionSuccess: false,
      weddingSeasonActivity: 'peak',
      seasonalRiskAdjustment: -5,
      calculatedAt: new Date(),
      lastUpdated: new Date()
    }
  ]
};

const mockMetricsResponse = {
  data: {
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
    riskTrend: 'worsening',
    seasonalAdjustment: -5,
    calculatedAt: new Date()
  }
};

const mockCampaignsResponse = {
  data: [
    {
      id: 'campaign-1',
      name: 'Peak Season Re-engagement',
      campaignType: 're_engagement',
      description: 'Targeted outreach to inactive suppliers',
      targetRiskLevel: [ChurnRiskLevel.HIGH_RISK, ChurnRiskLevel.ATTENTION],
      targetSupplierTypes: ['photographer', 'venue'],
      status: 'active',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      frequency: 'weekly',
      targetedSuppliers: 35,
      emailsSent: 32,
      emailOpenRate: 68.2,
      emailClickRate: 24.1,
      callsCompleted: 8,
      responseRate: 31.25,
      suppliersRetained: 11,
      suppliersLost: 3,
      saveRate: 78.6,
      roiCalculated: 245.3,
      revenueRetained: 45600,
      isTestCampaign: false,
      autoExecute: true,
      triggerConditions: {},
      executionHistory: [],
      createdBy: 'system',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  ]
};

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useChurnIntelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Default successful responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSupplierResponse),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetricsResponse),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCampaignsResponse),
      } as Response);
  });

  describe('Initial State', () => {
    it('initializes with correct default values', () => {
      const { result } = renderHook(() => useChurnIntelligence());

      expect(result.current.atRiskSuppliers).toEqual([]);
      expect(result.current.churnMetrics).toBeNull();
      expect(result.current.retentionCampaigns).toEqual([]);
      expect(result.current.churnAlerts).toEqual([]);
      expect(result.current.trendData).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.filters).toEqual({});
    });

    it('accepts initial filters', () => {
      const initialFilters = { 
        riskLevel: [ChurnRiskLevel.CRITICAL],
        search: 'test' 
      };

      const { result } = renderHook(() => 
        useChurnIntelligence({ initialFilters })
      );

      expect(result.current.filters).toEqual(initialFilters);
    });
  });

  describe('Data Fetching', () => {
    it('fetches all data on mount', async () => {
      renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/churn-intelligence/suppliers'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/churn-intelligence/metrics'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/churn-intelligence/campaigns'
      );
    });

    it('applies filters to API requests', async () => {
      const filters = {
        riskLevel: [ChurnRiskLevel.CRITICAL, ChurnRiskLevel.HIGH_RISK],
        supplierType: ['photographer'],
        riskScore: { min: 70, max: 100 },
        search: 'photography'
      };

      renderHook(() => useChurnIntelligence({ initialFilters: filters }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/riskLevels=critical,high_risk/),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/supplierTypes=photographer/),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/minRiskScore=70/),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/search=photography/),
          expect.any(Object)
        );
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('updates state with fetched data', async () => {
      const { result } = renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(result.current.atRiskSuppliers).toEqual(mockSupplierResponse.data);
        expect(result.current.churnMetrics).toEqual(mockMetricsResponse.data);
        expect(result.current.retentionCampaigns).toEqual(mockCampaignsResponse.data);
        expect(result.current.lastUpdated).toBeInstanceOf(Date);
      });
    });
  });

  describe('Filtering', () => {
    it('updates filters correctly', async () => {
      const { result } = renderHook(() => useChurnIntelligence());

      const newFilters = { riskLevel: [ChurnRiskLevel.CRITICAL] };

      await act(async () => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
    });

    it('refetches data when filters change', async () => {
      const { result } = renderHook(() => useChurnIntelligence());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      mockFetch.mockClear();

      // Update filters
      await act(async () => {
        result.current.setFilters({ search: 'new search' });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/search=new\+search/),
          expect.any(Object)
        );
      });
    });
  });

  describe('Retention Actions', () => {
    it('executes retention actions successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ actionId: 'action-123' }),
      } as Response);

      const { result } = renderHook(() => useChurnIntelligence());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const actionRequest = {
        supplierId: 'supplier-1',
        action: 'schedule_call' as const
      };

      await act(async () => {
        await result.current.executeRetentionAction(actionRequest);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/churn-intelligence/actions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(actionRequest),
        })
      );
    });

    it('updates supplier data after successful action', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ actionId: 'action-123' }),
      } as Response);

      const { result } = renderHook(() => useChurnIntelligence());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.atRiskSuppliers.length).toBeGreaterThan(0);
      });

      const initialInterventionCount = result.current.atRiskSuppliers[0].interventionCount30d;

      await act(async () => {
        await result.current.executeRetentionAction({
          supplierId: 'supplier-1',
          action: 'schedule_call'
        });
      });

      const updatedSupplier = result.current.atRiskSuppliers[0];
      expect(updatedSupplier.interventionCount30d).toBe(initialInterventionCount + 1);
      expect(updatedSupplier.lastInterventionDate).toBeInstanceOf(Date);
    });

    it('handles action failures appropriately', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Action failed'));

      const { result } = renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.executeRetentionAction({
            supplierId: 'supplier-1',
            action: 'schedule_call'
          });
        })
      ).rejects.toThrow('Action failed');
    });
  });

  describe('Campaign Management', () => {
    it('creates retention campaigns successfully', async () => {
      const campaignData = {
        name: 'Test Campaign',
        campaignType: 'email_sequence' as const,
        description: 'Test campaign description',
        targetRiskLevel: [ChurnRiskLevel.HIGH_RISK]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'campaign-new', ...campaignData } }),
      } as Response);

      const { result } = renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCampaignCount = result.current.retentionCampaigns.length;

      await act(async () => {
        await result.current.createCampaign(campaignData);
      });

      expect(result.current.retentionCampaigns.length).toBe(initialCampaignCount + 1);
    });

    it('handles campaign creation failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Campaign creation failed'));

      const { result } = renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createCampaign({
            name: 'Test Campaign',
            campaignType: 'email_sequence',
            description: 'Test',
            targetRiskLevel: [ChurnRiskLevel.HIGH_RISK]
          });
        })
      ).rejects.toThrow('Campaign creation failed');
    });
  });

  describe('Alert Management', () => {
    it('dismisses alerts correctly', async () => {
      const { result } = renderHook(() => useChurnIntelligence());

      // Add a mock alert
      act(() => {
        result.current.churnAlerts.push({
          id: 'alert-1',
          alertType: 'escalated_risk',
          urgency: AlertUrgency.HIGH,
          supplierId: 'supplier-1',
          supplierName: 'Test Supplier',
          riskScore: 85,
          riskLevel: ChurnRiskLevel.HIGH_RISK,
          title: 'Test Alert',
          message: 'Test message',
          actionRequired: 'Test action',
          suggestedActions: [],
          createdAt: new Date(),
          isRead: false,
          isDismissed: false,
          triggerEvent: 'test_trigger',
          metadata: {}
        });
      });

      act(() => {
        result.current.dismissAlert('alert-1');
      });

      const dismissedAlert = result.current.churnAlerts.find(a => a.id === 'alert-1');
      expect(dismissedAlert?.isDismissed).toBe(true);
    });

    it('acknowledges alerts correctly', async () => {
      const { result } = renderHook(() => useChurnIntelligence());

      // Add a mock alert
      act(() => {
        result.current.churnAlerts.push({
          id: 'alert-2',
          alertType: 'escalated_risk',
          urgency: AlertUrgency.HIGH,
          supplierId: 'supplier-1',
          supplierName: 'Test Supplier',
          riskScore: 85,
          riskLevel: ChurnRiskLevel.HIGH_RISK,
          title: 'Test Alert',
          message: 'Test message',
          actionRequired: 'Test action',
          suggestedActions: [],
          createdAt: new Date(),
          isRead: false,
          isDismissed: false,
          triggerEvent: 'test_trigger',
          metadata: {}
        });
      });

      act(() => {
        result.current.acknowledgeAlert('alert-2');
      });

      const acknowledgedAlert = result.current.churnAlerts.find(a => a.id === 'alert-2');
      expect(acknowledgedAlert?.isRead).toBe(true);
      expect(acknowledgedAlert?.acknowledgedAt).toBeInstanceOf(Date);
    });
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('sets up auto-refresh when enabled', async () => {
      renderHook(() => useChurnIntelligence({
        autoRefresh: true,
        refreshInterval: 30
      }));

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Clear initial calls
      mockFetch.mockClear();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('does not refresh when disabled', async () => {
      renderHook(() => useChurnIntelligence({
        autoRefresh: false
      }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      mockFetch.mockClear();

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should not have made additional calls
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('enables real-time updates when configured', async () => {
      const { result } = renderHook(() => useChurnIntelligence({
        realTimeUpdates: true
      }));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Fast-forward to trigger mock updates
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Should potentially generate new alerts or update risk scores
      // (Implementation depends on random factors in the mock)
    });

    it('updates connection status appropriately', async () => {
      const { result } = renderHook(() => useChurnIntelligence({
        realTimeUpdates: true
      }));

      // Initially connecting
      expect(result.current.connectionStatus).toBe('connecting');

      // Should become connected
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });
  });

  describe('Manual Refresh', () => {
    it('refreshes data when called manually', async () => {
      const { result } = renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockClear();

      await act(async () => {
        await result.current.refreshData();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2); // fetchChurnData and fetchTrendData
      expect(result.current.isRefreshing).toBe(false);
    });

    it('sets refreshing state during manual refresh', async () => {
      const { result } = renderHook(() => useChurnIntelligence());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const refreshPromise = act(async () => {
        const promise = result.current.refreshData();
        expect(result.current.isRefreshing).toBe(true);
        await promise;
      });

      await refreshPromise;
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Memory Management', () => {
    it('cleans up intervals on unmount', () => {
      const { unmount } = renderHook(() => useChurnIntelligence({
        autoRefresh: true,
        realTimeUpdates: true
      }));

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});