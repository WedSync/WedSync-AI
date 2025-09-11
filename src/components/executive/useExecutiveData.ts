'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getExecutiveMetrics,
  subscribeToMetricsUpdates,
  cleanupAllSubscriptions,
} from '@/lib/analytics/executiveMetrics';

interface UseExecutiveDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enableRealtime?: boolean;
}

interface ExecutiveDataState {
  metrics: any | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
}

export function useExecutiveData(
  organizationId: string,
  timeRange: string = '30d',
  options: UseExecutiveDataOptions = {},
): ExecutiveDataState {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enableRealtime = true,
  } = options;

  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // Calculate date range based on timeRange parameter
  const getDateRange = useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [timeRange]);

  // Fetch executive metrics data
  const fetchMetrics = useCallback(
    async (forceRefresh = false) => {
      if (!organizationId) return;

      if (!forceRefresh && metrics && !loading) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const { startDate, endDate } = getDateRange();
        const metricsData = await getExecutiveMetrics(
          organizationId,
          startDate,
          endDate,
          { forceRefresh },
        );

        if (mountedRef.current) {
          setMetrics(metricsData);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching executive metrics:', err);
        if (mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to fetch executive metrics',
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [organizationId, getDateRange, metrics, loading],
  );

  // Manual refresh function
  const refreshData = useCallback(async () => {
    await fetchMetrics(true);
  }, [fetchMetrics]);

  // Setup auto-refresh interval
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchMetrics(true);
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  // Setup real-time subscription
  useEffect(() => {
    if (enableRealtime && organizationId) {
      const setupRealtime = async () => {
        try {
          const cleanup = await subscribeToMetricsUpdates(
            organizationId,
            (updatedMetrics) => {
              if (mountedRef.current) {
                setMetrics(updatedMetrics);
                setLastUpdated(new Date());
              }
            },
          );
          realtimeCleanupRef.current = cleanup;
        } catch (err) {
          console.error('Failed to setup real-time metrics subscription:', err);
        }
      };

      setupRealtime();

      return () => {
        if (realtimeCleanupRef.current) {
          realtimeCleanupRef.current();
        }
      };
    }
  }, [enableRealtime, organizationId]);

  // Initial data fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
      }

      // Cleanup all subscriptions when component unmounts
      cleanupAllSubscriptions();
    };
  }, []);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refreshData,
    isRefreshing,
  };
}

export default useExecutiveData;
