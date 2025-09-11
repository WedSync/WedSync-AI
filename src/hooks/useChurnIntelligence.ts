'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AtRiskSupplier,
  ChurnMetrics,
  RetentionCampaign,
  ChurnAlert,
  ChurnTrendData,
  ChurnRiskLevel,
  RetentionAction,
  CreateRetentionCampaignRequest,
  ExecuteRetentionActionRequest,
  AtRiskSupplierFilters,
  ChurnIntelligenceDashboard,
} from '@/types/churn-intelligence';
import { toast } from 'sonner';

interface UseChurnIntelligenceProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
  realTimeUpdates?: boolean;
  initialFilters?: AtRiskSupplierFilters;
}

interface UseChurnIntelligenceReturn {
  // Data state
  atRiskSuppliers: AtRiskSupplier[];
  churnMetrics: ChurnMetrics | null;
  retentionCampaigns: RetentionCampaign[];
  churnAlerts: ChurnAlert[];
  trendData: ChurnTrendData[];

  // Loading and error states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Filter and search
  filters: AtRiskSupplierFilters;
  setFilters: (filters: AtRiskSupplierFilters) => void;

  // Actions
  refreshData: () => Promise<void>;
  executeRetentionAction: (
    request: ExecuteRetentionActionRequest,
  ) => Promise<void>;
  createCampaign: (request: CreateRetentionCampaignRequest) => Promise<void>;
  dismissAlert: (alertId: string) => void;
  acknowledgeAlert: (alertId: string) => void;

  // Real-time connection
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastUpdated: Date | null;
}

export function useChurnIntelligence({
  autoRefresh = false,
  refreshInterval = 30,
  realTimeUpdates = false,
  initialFilters = {},
}: UseChurnIntelligenceProps = {}): UseChurnIntelligenceReturn {
  // Core data state
  const [atRiskSuppliers, setAtRiskSuppliers] = useState<AtRiskSupplier[]>([]);
  const [churnMetrics, setChurnMetrics] = useState<ChurnMetrics | null>(null);
  const [retentionCampaigns, setRetentionCampaigns] = useState<
    RetentionCampaign[]
  >([]);
  const [churnAlerts, setChurnAlerts] = useState<ChurnAlert[]>([]);
  const [trendData, setTrendData] = useState<ChurnTrendData[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'reconnecting'
  >('disconnected');

  // Filters
  const [filters, setFilters] = useState<AtRiskSupplierFilters>(initialFilters);

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const realTimeConnectionRef = useRef<any>();

  // Fetch churn intelligence data
  const fetchChurnData = useCallback(async () => {
    try {
      setError(null);

      // Fetch at-risk suppliers
      const suppliersUrl = new URL(
        '/api/analytics/churn-intelligence/suppliers',
        window.location.origin,
      );

      // Apply filters to API request
      if (filters.riskLevel?.length) {
        suppliersUrl.searchParams.set(
          'riskLevels',
          filters.riskLevel.join(','),
        );
      }
      if (filters.supplierType?.length) {
        suppliersUrl.searchParams.set(
          'supplierTypes',
          filters.supplierType.join(','),
        );
      }
      if (filters.riskScore) {
        suppliersUrl.searchParams.set(
          'minRiskScore',
          filters.riskScore.min.toString(),
        );
        suppliersUrl.searchParams.set(
          'maxRiskScore',
          filters.riskScore.max.toString(),
        );
      }
      if (filters.daysSinceLastLogin) {
        if (filters.daysSinceLastLogin.min) {
          suppliersUrl.searchParams.set(
            'minDaysSinceLogin',
            filters.daysSinceLastLogin.min.toString(),
          );
        }
        if (filters.daysSinceLastLogin.max) {
          suppliersUrl.searchParams.set(
            'maxDaysSinceLogin',
            filters.daysSinceLastLogin.max.toString(),
          );
        }
      }
      if (filters.search) {
        suppliersUrl.searchParams.set('search', filters.search);
      }

      const [suppliersRes, metricsRes, campaignsRes] = await Promise.all([
        fetch(suppliersUrl),
        fetch('/api/analytics/churn-intelligence/metrics'),
        fetch('/api/analytics/churn-intelligence/campaigns'),
      ]);

      if (!suppliersRes.ok || !metricsRes.ok || !campaignsRes.ok) {
        throw new Error('Failed to fetch churn intelligence data');
      }

      const [suppliersData, metricsData, campaignsData] = await Promise.all([
        suppliersRes.json(),
        metricsRes.json(),
        campaignsRes.json(),
      ]);

      setAtRiskSuppliers(suppliersData.data || []);
      setChurnMetrics(metricsData.data || null);
      setRetentionCampaigns(campaignsData.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch churn data';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [filters]);

  // Fetch trend data separately (larger dataset)
  const fetchTrendData = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/analytics/churn-intelligence/trends?range=90d',
      );
      if (!response.ok) {
        throw new Error('Failed to fetch trend data');
      }

      const data = await response.json();
      setTrendData(data.data || []);
    } catch (err) {
      console.error('Failed to fetch trend data:', err);
    }
  }, []);

  // Main data refresh function
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchChurnData(), fetchTrendData()]);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [fetchChurnData, fetchTrendData]);

  // Execute retention action
  const executeRetentionAction = useCallback(
    async (request: ExecuteRetentionActionRequest) => {
      try {
        const response = await fetch(
          '/api/analytics/churn-intelligence/actions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to execute retention action');
        }

        const result = await response.json();

        // Update supplier data after action
        setAtRiskSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.supplierId === request.supplierId
              ? {
                  ...supplier,
                  lastInterventionDate: new Date(),
                  interventionCount30d: supplier.interventionCount30d + 1,
                }
              : supplier,
          ),
        );

        // Add success alert
        const newAlert: ChurnAlert = {
          id: `action-${Date.now()}`,
          alertType: 'campaign_executed' as any,
          urgency: 'info' as any,
          supplierId: request.supplierId,
          supplierName:
            atRiskSuppliers.find((s) => s.supplierId === request.supplierId)
              ?.supplierName || 'Unknown',
          riskScore: 0,
          riskLevel: ChurnRiskLevel.STABLE,
          title: 'Retention Action Executed',
          message: `Successfully executed ${request.action.replace('_', ' ')} for supplier`,
          actionRequired: '',
          suggestedActions: [],
          createdAt: new Date(),
          isRead: false,
          isDismissed: false,
          triggerEvent: 'action_executed',
          metadata: { actionId: result.actionId },
        };

        setChurnAlerts((prev) => [newAlert, ...prev]);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to execute action';
        throw new Error(errorMessage);
      }
    },
    [atRiskSuppliers],
  );

  // Create retention campaign
  const createCampaign = useCallback(
    async (request: CreateRetentionCampaignRequest) => {
      try {
        const response = await fetch(
          '/api/analytics/churn-intelligence/campaigns',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to create retention campaign');
        }

        const result = await response.json();

        // Add to campaigns list
        setRetentionCampaigns((prev) => [result.data, ...prev]);

        toast.success('Retention campaign created successfully');
        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create campaign';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [],
  );

  // Alert management
  const dismissAlert = useCallback((alertId: string) => {
    setChurnAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, isDismissed: true } : alert,
      ),
    );
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setChurnAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? { ...alert, isRead: true, acknowledgedAt: new Date() }
          : alert,
      ),
    );
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!isRefreshing) {
          refreshData();
        }
      }, refreshInterval * 1000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshData, isRefreshing]);

  // Set up real-time updates (mock WebSocket connection)
  useEffect(() => {
    if (realTimeUpdates) {
      setConnectionStatus('connecting' as any);

      // Mock real-time connection
      const mockConnection = setTimeout(() => {
        setConnectionStatus('connected');

        // Simulate real-time updates
        const updateInterval = setInterval(() => {
          // Randomly update risk scores and generate alerts
          const randomSupplierIndex = Math.floor(
            Math.random() * atRiskSuppliers.length,
          );
          if (atRiskSuppliers[randomSupplierIndex] && Math.random() < 0.1) {
            // 10% chance of update
            const supplier = atRiskSuppliers[randomSupplierIndex];
            const newRiskScore = Math.min(
              100,
              supplier.churnRiskScore + (Math.random() - 0.5) * 10,
            );

            setAtRiskSuppliers((prev) =>
              prev.map((s, index) =>
                index === randomSupplierIndex
                  ? {
                      ...s,
                      churnRiskScore: newRiskScore,
                      lastUpdated: new Date(),
                    }
                  : s,
              ),
            );

            // Generate alert if risk increased significantly
            if (newRiskScore > supplier.churnRiskScore + 5) {
              const newAlert: ChurnAlert = {
                id: `realtime-${Date.now()}`,
                alertType: 'escalated_risk',
                urgency:
                  newRiskScore > 85 ? ('critical' as any) : ('urgent' as any),
                supplierId: supplier.supplierId,
                supplierName: supplier.supplierName,
                riskScore: newRiskScore,
                riskLevel:
                  newRiskScore > 85
                    ? ChurnRiskLevel.CRITICAL
                    : ChurnRiskLevel.HIGH_RISK,
                title: 'Risk Score Increased',
                message: `Risk score increased to ${newRiskScore.toFixed(0)} for ${supplier.supplierName}`,
                actionRequired: 'Review and take immediate action',
                suggestedActions: ['schedule_call', 'assign_csm'],
                createdAt: new Date(),
                isRead: false,
                isDismissed: false,
                triggerEvent: 'risk_score_increase',
                metadata: { previousScore: supplier.churnRiskScore },
              };

              setChurnAlerts((prev) => [newAlert, ...prev]);
            }
          }
        }, 15000); // Update every 15 seconds

        realTimeConnectionRef.current = updateInterval;
      }, 1000);

      return () => {
        clearTimeout(mockConnection);
        if (realTimeConnectionRef.current) {
          clearInterval(realTimeConnectionRef.current);
        }
        setConnectionStatus('disconnected');
      };
    }
  }, [realTimeUpdates, atRiskSuppliers]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh when filters change
  useEffect(() => {
    if (!isLoading) {
      refreshData();
    }
  }, [filters]);

  // Generate mock data for development
  useEffect(() => {
    if (isLoading && atRiskSuppliers.length === 0) {
      try {
        // Generate mock at-risk suppliers for development
        const mockSuppliers: AtRiskSupplier[] = [
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
            riskFactors: [
              {
                factorType: 'login_recency',
                severity: 'critical' as any,
                score: 95,
                weight: 0.4,
                description: 'No login for 18 days during peak season',
                value: 18,
                detectedAt: new Date(),
                thresholdExceeded: true,
                actionRequired: true,
              },
              {
                factorType: 'support_sentiment',
                severity: 'high' as any,
                score: 80,
                weight: 0.2,
                description:
                  '3 unresolved support tickets with negative sentiment',
                value: 3,
                detectedAt: new Date(),
                thresholdExceeded: true,
                actionRequired: true,
              },
            ],
            primaryRiskReason: 'Extended absence during peak booking season',
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
            lastUpdated: new Date(),
          },
          {
            supplierId: 'supplier-2',
            supplierName: 'Grand Ballroom Venue',
            supplierType: 'venue',
            contactEmail: 'events@grandballroom.com',
            churnRiskScore: 78,
            churnRiskLevel: ChurnRiskLevel.HIGH_RISK,
            churnProbability: 0.65,
            predictedChurnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            daysUntilPredictedChurn: 14,
            riskFactors: [
              {
                factorType: 'feature_usage',
                severity: 'high' as any,
                score: 75,
                weight: 0.3,
                description: 'Significant decline in booking calendar usage',
                value: 25,
                detectedAt: new Date(),
                thresholdExceeded: true,
                actionRequired: true,
              },
            ],
            primaryRiskReason: 'Declining feature engagement',
            daysSinceLastLogin: 8,
            lastActivityDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            loginFrequencyTrend: 'declining',
            featureUsageScore: 25,
            engagementTrend: 'declining',
            openSupportTickets: 1,
            recentTicketSentiment: 'neutral',
            supportInteractionCount30d: 2,
            subscriptionValue: 1800,
            paymentFailures30d: 0,
            subscriptionTier: 'Standard',
            interventionCount30d: 1,
            previousRetentionSuccess: true,
            weddingSeasonActivity: 'peak',
            seasonalRiskAdjustment: -5,
            calculatedAt: new Date(),
            lastUpdated: new Date(),
          },
        ];

        setAtRiskSuppliers(mockSuppliers);

        // Mock metrics
        const mockMetrics: ChurnMetrics = {
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
          calculatedAt: new Date(),
        };

        setChurnMetrics(mockMetrics);

        // Mock campaigns
        const mockCampaigns: RetentionCampaign[] = [
          {
            id: 'campaign-1',
            name: 'Peak Season Re-engagement',
            campaignType: 're_engagement' as any,
            description:
              'Targeted outreach to inactive suppliers during peak wedding season',
            targetRiskLevel: [
              ChurnRiskLevel.HIGH_RISK,
              ChurnRiskLevel.ATTENTION,
            ],
            targetSupplierTypes: ['photographer', 'venue'],
            targetSegments: [],
            status: 'active' as any,
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
            updatedAt: new Date(),
          },
        ];

        setRetentionCampaigns(mockCampaigns);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load mock data';
        setError(errorMessage);
      }
    }
  }, []);

  // Initialize with mock data
  useEffect(() => {
    // Use mock data for development
    setIsLoading(false);
    setConnectionStatus('connected');
  }, []);

  return {
    // Data
    atRiskSuppliers,
    churnMetrics,
    retentionCampaigns,
    churnAlerts,
    trendData,

    // State
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    connectionStatus,

    // Filters
    filters,
    setFilters,

    // Actions
    refreshData,
    executeRetentionAction,
    createCampaign,
    dismissAlert,
    acknowledgeAlert,
  };
}
