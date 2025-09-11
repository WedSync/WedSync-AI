'use client';

import { useState, useEffect, useCallback } from 'react';
import { activationTracker } from '@/lib/analytics/activation-tracker';
import type {
  ActivationFunnel,
  CohortActivationData,
  DropoffPoint,
} from '@/lib/analytics/activation-tracker';

export interface ActivationMetricsData {
  funnel: ActivationFunnel;
  byUserType: Record<'supplier' | 'couple', ActivationFunnel>;
  cohortAnalysis: CohortActivationData[];
  dropoffAnalysis: DropoffPoint[];
  metadata?: {
    timeframe: string;
    userTypeFilter: string;
    startDate: string;
    endDate: string;
    generatedAt: string;
    totalCohorts: number;
  };
}

export interface UseActivationMetricsOptions {
  timeframe?: '7d' | '30d' | '90d' | 'custom';
  startDate?: Date;
  endDate?: Date;
  userType?: 'supplier' | 'couple' | 'all';
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface UseActivationMetricsReturn {
  data: ActivationMetricsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  trackEvent: (
    userId: string,
    eventName: string,
    eventData?: Record<string, any>,
  ) => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

/**
 * React hook for managing activation metrics data
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch, trackEvent } = useActivationMetrics({
 *   timeframe: '30d',
 *   userType: 'supplier',
 *   autoRefresh: true
 * })
 *
 * if (loading) return <div>Loading...</div>
 * if (error) return <div>Error: {error}</div>
 *
 * return (
 *   <div>
 *     <h2>Activation Rate: {data?.funnel.overallConversion}%</h2>
 *     <FunnelChart data={data?.funnel.stages} />
 *   </div>
 * )
 * ```
 */
export function useActivationMetrics(
  options: UseActivationMetricsOptions = {},
): UseActivationMetricsReturn {
  const {
    timeframe = '30d',
    startDate,
    endDate,
    userType = 'all',
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [data, setData] = useState<ActivationMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch activation metrics from API
   */
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        timeframe,
        user_type: userType,
      });

      if (timeframe === 'custom' && startDate && endDate) {
        params.set('start_date', startDate.toISOString());
        params.set('end_date', endDate.toISOString());
      }

      const response = await fetch(
        `/api/admin/activation-metrics?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const metricsData: ActivationMetricsData = await response.json();
      setData(metricsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch activation metrics';
      setError(errorMessage);
      console.error('Error fetching activation metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, startDate, endDate, userType]);

  /**
   * Track a user activation event
   */
  const trackEvent = useCallback(
    async (
      userId: string,
      eventName: string,
      eventData?: Record<string, any>,
    ) => {
      try {
        await activationTracker.trackActivationEvent(
          userId,
          eventName,
          eventData,
        );

        // Optionally refetch data after tracking an event
        if (autoRefresh) {
          await fetchMetrics();
        }
      } catch (err) {
        console.error('Error tracking activation event:', err);
        throw new Error(
          err instanceof Error
            ? err.message
            : 'Failed to track activation event',
        );
      }
    },
    [autoRefresh, fetchMetrics],
  );

  /**
   * Refresh metrics via API POST endpoint
   */
  const refreshMetrics = useCallback(async () => {
    try {
      const timeRange =
        timeframe === 'custom' && startDate && endDate
          ? { start: startDate, end: endDate }
          : undefined;

      const response = await fetch('/api/admin/activation-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'refresh_metrics',
          parameters: { timeRange },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to refresh metrics');
      }

      // Fetch updated data
      await fetchMetrics();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh metrics';
      setError(errorMessage);
      console.error('Error refreshing metrics:', err);
    }
  }, [fetchMetrics, timeframe, startDate, endDate]);

  /**
   * Manual refetch function (alias for fetchMetrics)
   */
  const refetch = useCallback(() => fetchMetrics(), [fetchMetrics]);

  // Initial data fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const intervalId = setInterval(fetchMetrics, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  return {
    data,
    loading,
    error,
    refetch,
    trackEvent,
    refreshMetrics,
  };
}

/**
 * Hook for tracking activation events without fetching metrics
 * Useful for components that only need to track events
 */
export function useActivationTracking() {
  const trackEvent = useCallback(
    async (
      userId: string,
      eventName: string,
      eventData?: Record<string, any>,
    ) => {
      try {
        await activationTracker.trackActivationEvent(
          userId,
          eventName,
          eventData,
        );
      } catch (err) {
        console.error('Error tracking activation event:', err);
        throw new Error(
          err instanceof Error
            ? err.message
            : 'Failed to track activation event',
        );
      }
    },
    [],
  );

  return { trackEvent };
}

/**
 * Hook for cohort-specific activation data
 */
export function useCohortActivation(
  cohortDate: string,
  userType: 'supplier' | 'couple',
) {
  const [data, setData] = useState<CohortActivationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohortData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cohortData = await activationTracker.getCohortActivationData(
        cohortDate,
        userType,
      );
      setData(cohortData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch cohort data';
      setError(errorMessage);
      console.error('Error fetching cohort activation data:', err);
    } finally {
      setLoading(false);
    }
  }, [cohortDate, userType]);

  useEffect(() => {
    fetchCohortData();
  }, [fetchCohortData]);

  return {
    data,
    loading,
    error,
    refetch: fetchCohortData,
  };
}

// Export types for use in components
export type { ActivationFunnel, CohortActivationData, DropoffPoint };
