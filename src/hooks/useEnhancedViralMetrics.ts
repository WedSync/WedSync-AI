'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EnhancedViralCoefficient,
  ViralBottleneck,
  OptimizationRecommendation,
} from '@/lib/analytics/advanced-viral-calculator';
import {
  ViralIntervention,
  ViralSimulationResult,
} from '@/lib/analytics/viral-optimization-engine';

interface ViralTrendData {
  date: string;
  coefficient: number;
  invitationRate: number;
  conversionRate: number;
  activationRate: number;
}

interface ViralLoop {
  type: string;
  count: number;
  conversionRate: number;
  revenue: number;
  efficiency: number;
}

interface SeasonalAdjustments {
  currentMultiplier: number;
  peakSeason: {
    months: number[];
    multiplier: number;
  };
  offSeason: {
    months: number[];
    multiplier: number;
  };
}

interface ViralMetricsState {
  enhanced: EnhancedViralCoefficient | null;
  historical: ViralTrendData[];
  loops: ViralLoop[];
  seasonal: SeasonalAdjustments | null;
  bottlenecks: ViralBottleneck[];
  recommendations: OptimizationRecommendation[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface SimulationState {
  result: ViralSimulationResult | null;
  isRunning: boolean;
  error: string | null;
}

interface UseEnhancedViralMetricsOptions {
  timeframe?: '7d' | '30d' | '90d' | '1y';
  vendorType?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseEnhancedViralMetricsReturn {
  // Data
  metrics: ViralMetricsState;
  simulation: SimulationState;

  // Actions
  refreshMetrics: () => Promise<void>;
  runSimulation: (
    intervention: ViralIntervention,
    duration: number,
  ) => Promise<void>;

  // Computed values
  isHealthy: boolean;
  growthTrend: 'up' | 'down' | 'stable';
  topBottleneck: ViralBottleneck | null;
  topRecommendation: OptimizationRecommendation | null;

  // Chart data
  coefficientTrendData: { date: string; value: number }[];
  loopPerformanceData: { name: string; value: number; efficiency: number }[];
  seasonalData: { month: string; multiplier: number }[];
}

export function useEnhancedViralMetrics(
  options: UseEnhancedViralMetricsOptions = {},
): UseEnhancedViralMetricsReturn {
  const {
    timeframe = '30d',
    vendorType,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
  } = options;

  // State management
  const [metrics, setMetrics] = useState<ViralMetricsState>({
    enhanced: null,
    historical: [],
    loops: [],
    seasonal: null,
    bottlenecks: [],
    recommendations: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const [simulation, setSimulation] = useState<SimulationState>({
    result: null,
    isRunning: false,
    error: null,
  });

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    // In a real app, this would get the token from your auth context/store
    const token = localStorage.getItem('supabase-auth-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch viral metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setMetrics((prev) => ({ ...prev, isLoading: true, error: null }));

      const params = new URLSearchParams({
        timeframe,
        ...(vendorType && { vendorType }),
      });

      const [metricsResponse, bottlenecksResponse] = await Promise.all([
        fetch(`/api/admin/viral-metrics?${params}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`/api/admin/viral-metrics/bottlenecks?${params}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!metricsResponse.ok) {
        throw new Error(
          `Failed to fetch metrics: ${metricsResponse.statusText}`,
        );
      }

      if (!bottlenecksResponse.ok) {
        throw new Error(
          `Failed to fetch bottlenecks: ${bottlenecksResponse.statusText}`,
        );
      }

      const metricsData = await metricsResponse.json();
      const bottlenecksData = await bottlenecksResponse.json();

      setMetrics({
        enhanced: metricsData.enhanced,
        historical: metricsData.historical,
        loops: metricsData.loops,
        seasonal: metricsData.seasonal,
        bottlenecks: bottlenecksData.bottlenecks,
        recommendations: bottlenecksData.recommendations,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      console.error('Failed to fetch viral metrics:', error);
      setMetrics((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch viral metrics',
      }));
    }
  }, [timeframe, vendorType, getAuthHeaders]);

  // Run viral simulation
  const runSimulation = useCallback(
    async (intervention: ViralIntervention, duration: number) => {
      try {
        setSimulation({ result: null, isRunning: true, error: null });

        const response = await fetch('/api/admin/viral-metrics/simulate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ intervention, duration }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Simulation failed');
        }

        const result = await response.json();
        setSimulation({ result, isRunning: false, error: null });
      } catch (error: any) {
        console.error('Viral simulation failed:', error);
        setSimulation({
          result: null,
          isRunning: false,
          error: error.message || 'Simulation failed',
        });
      }
    },
    [getAuthHeaders],
  );

  // Computed values
  const isHealthy = useMemo(() => {
    if (!metrics.enhanced) return false;
    return (
      metrics.enhanced.coefficient > 1.0 &&
      metrics.enhanced.qualityScore > 0.6 &&
      metrics.enhanced.acceptanceRate > 0.3
    );
  }, [metrics.enhanced]);

  const growthTrend = useMemo(() => {
    if (!metrics.enhanced) return 'stable';
    return metrics.enhanced.velocityTrend === 'accelerating'
      ? 'up'
      : metrics.enhanced.velocityTrend === 'decelerating'
        ? 'down'
        : 'stable';
  }, [metrics.enhanced]);

  const topBottleneck = useMemo(() => {
    return metrics.bottlenecks[0] || null;
  }, [metrics.bottlenecks]);

  const topRecommendation = useMemo(() => {
    return metrics.recommendations[0] || null;
  }, [metrics.recommendations]);

  // Chart data transformations
  const coefficientTrendData = useMemo(() => {
    return metrics.historical.map((point) => ({
      date: point.date,
      value: point.coefficient,
    }));
  }, [metrics.historical]);

  const loopPerformanceData = useMemo(() => {
    return metrics.loops.map((loop) => ({
      name: loop.type.replace(/_/g, ' '),
      value: loop.count,
      efficiency: loop.efficiency,
    }));
  }, [metrics.loops]);

  const seasonalData = useMemo(() => {
    if (!metrics.seasonal) return [];

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return months.map((month, index) => {
      const monthNum = index + 1;
      let multiplier = 1.0;

      if (metrics.seasonal!.peakSeason.months.includes(monthNum)) {
        multiplier = metrics.seasonal!.peakSeason.multiplier;
      } else if (metrics.seasonal!.offSeason.months.includes(monthNum)) {
        multiplier = metrics.seasonal!.offSeason.multiplier;
      }

      return { month, multiplier };
    });
  }, [metrics.seasonal]);

  // Auto-refresh effect
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  return {
    // Data
    metrics,
    simulation,

    // Actions
    refreshMetrics: fetchMetrics,
    runSimulation,

    // Computed values
    isHealthy,
    growthTrend,
    topBottleneck,
    topRecommendation,

    // Chart data
    coefficientTrendData,
    loopPerformanceData,
    seasonalData,
  };
}

// Helper hook for simulation presets
export function useViralSimulationPresets() {
  return useMemo(
    () => ({
      incentiveBoost: {
        type: 'incentive' as const,
        name: 'Referral Incentive Campaign',
        description:
          'Offer premium features to users who successfully refer new vendors',
        parameters: {
          incentiveAmount: 25,
          targetSegment: 'all' as const,
        },
        expectedImpact: {
          invitationRate: 1.3,
          conversionRate: 1.2,
          activationRate: 1.1,
        },
        cost: 2500,
        duration: 30,
      },
      seasonalPush: {
        type: 'timing' as const,
        name: 'Off-Season Engagement Push',
        description:
          'Targeted campaigns during winter months to boost off-season viral activity',
        parameters: {
          timingOptimization: 'seasonal' as const,
          targetSegment: 'photographers' as const,
        },
        expectedImpact: {
          invitationRate: 1.5,
          conversionRate: 1.1,
          cycleTime: -3,
        },
        cost: 5000,
        duration: 60,
      },
      qualityFocus: {
        type: 'targeting' as const,
        name: 'High-Value Connection Targeting',
        description:
          'Focus viral campaigns on high-quality, established wedding vendors',
        parameters: {
          targetSegment: 'venues' as const,
        },
        expectedImpact: {
          conversionRate: 1.4,
          activationRate: 1.3,
        },
        cost: 1500,
        duration: 45,
      },
      messagingOptimization: {
        type: 'messaging' as const,
        name: 'Wedding-Focused Messaging',
        description:
          'Optimize invitation messages with wedding industry-specific language and benefits',
        parameters: {
          messagingVariant: 'wedding_focused',
        },
        expectedImpact: {
          conversionRate: 1.25,
          activationRate: 1.15,
        },
        cost: 800,
        duration: 21,
      },
    }),
    [],
  );
}
