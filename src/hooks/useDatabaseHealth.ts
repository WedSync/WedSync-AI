/**
 * WS-234 Database Health Hook
 * React hook for real-time database health monitoring and optimization actions
 *
 * Features:
 * - Real-time health metrics polling
 * - Optimization action triggers
 * - Error handling and retry logic
 * - Wedding season context awareness
 * - Performance optimization controls
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DatabaseHealthMetrics } from '@/lib/monitoring/database-health-monitor';

export interface DatabaseHealthOptions {
  refreshInterval?: number; // milliseconds
  includeQueries?: boolean;
  includeIndexes?: boolean;
  includeMaintenance?: boolean;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onCriticalAlert?: (metrics: DatabaseHealthMetrics) => void;
}

export interface DatabaseHealthResult {
  // Data
  healthMetrics: DatabaseHealthMetrics | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;

  // Actions
  refetch: () => Promise<void>;
  optimizeDatabase: (
    action: string,
    target: string,
    options?: OptimizationOptions,
  ) => Promise<void>;
  killSlowQueries: () => Promise<void>;
  cleanupConnections: () => Promise<void>;
  scheduleVacuum: (tableName: string, options?: VacuumOptions) => Promise<void>;

  // Status
  isOptimizing: boolean;
  optimizationError: Error | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface OptimizationOptions {
  dryRun?: boolean;
  force?: boolean;
  parameters?: Record<string, any>;
}

export interface VacuumOptions {
  full?: boolean;
  analyze?: boolean;
  scheduleTime?: Date;
}

interface OptimizationRequest {
  action: string;
  target: string;
  parameters?: Record<string, any>;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Hook for database health monitoring and optimization
 */
export function useDatabaseHealth(
  options: DatabaseHealthOptions = {},
): DatabaseHealthResult {
  const {
    refreshInterval = 30000, // 30 seconds default
    includeQueries = false,
    includeIndexes = false,
    includeMaintenance = false,
    enabled = true,
    onError,
    onCriticalAlert,
  } = options;

  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('connecting');
  const previousStatusRef = useRef<string>('healthy');

  // Query key for health metrics
  const queryKey = [
    'database-health',
    { includeQueries, includeIndexes, includeMaintenance },
  ];

  // Fetch database health metrics
  const {
    data: healthMetrics,
    isLoading,
    isError,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<DatabaseHealthMetrics> => {
      try {
        setConnectionStatus('connecting');

        const params = new URLSearchParams();
        if (includeQueries) params.set('includeQueries', 'true');
        if (includeIndexes) params.set('includeIndexes', 'true');
        if (includeMaintenance) params.set('includeMaintenance', 'true');

        const response = await fetch(
          `/api/admin/database/health?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Health check failed: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Health check returned failure status');
        }

        setConnectionStatus('connected');
        setLastUpdated(new Date());

        return data.data;
      } catch (error) {
        setConnectionStatus('disconnected');
        console.error('Database health fetch error:', error);
        throw error;
      }
    },
    refetchInterval: enabled && refreshInterval > 0 ? refreshInterval : false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Retry up to 3 times with exponential backoff
      if (failureCount >= 3) return false;

      // Don't retry on auth errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }

      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled,
  });

  // Handle errors
  useEffect(() => {
    if (isError && error && onError) {
      onError(error);
    }
  }, [isError, error, onError]);

  // Handle critical alerts
  useEffect(() => {
    if (healthMetrics && onCriticalAlert) {
      // Check if status changed from non-critical to critical
      if (
        healthMetrics.status === 'critical' &&
        previousStatusRef.current !== 'critical'
      ) {
        onCriticalAlert(healthMetrics);
      }
      previousStatusRef.current = healthMetrics.status;
    }
  }, [healthMetrics, onCriticalAlert]);

  // Database optimization mutation
  const optimizationMutation = useMutation({
    mutationFn: async (request: OptimizationRequest) => {
      const response = await fetch('/api/admin/database/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Optimization failed: ${response.status}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Optimization returned failure status');
      }

      return data.result;
    },
    onSuccess: () => {
      // Invalidate and refetch health data after optimization
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Database optimization error:', error);
      if (onError) {
        onError(
          error instanceof Error ? error : new Error('Optimization failed'),
        );
      }
    },
  });

  // Refetch function
  const refetch = useCallback(async () => {
    try {
      await queryRefetch();
    } catch (error) {
      console.error('Manual refetch error:', error);
      // Error is already handled by the query error handling
    }
  }, [queryRefetch]);

  // Optimize database action
  const optimizeDatabase = useCallback(
    async (
      action: string,
      target: string,
      options: OptimizationOptions = {},
    ) => {
      await optimizationMutation.mutateAsync({
        action,
        target,
        parameters: options.parameters,
        dryRun: options.dryRun || false,
        force: options.force || false,
      });
    },
    [optimizationMutation],
  );

  // Kill slow queries
  const killSlowQueries = useCallback(async () => {
    if (!healthMetrics?.queryPerformance?.slowQueries) {
      throw new Error('No slow queries found to kill');
    }

    // Find the slowest queries to kill
    const criticalQueries = healthMetrics.queryPerformance.slowQueries
      .filter((q) => q.avgTime > 2000) // Only very slow queries
      .slice(0, 5); // Limit to top 5

    if (criticalQueries.length === 0) {
      throw new Error('No critical slow queries found');
    }

    // Kill each critical query (this would need actual process IDs in production)
    for (const query of criticalQueries) {
      try {
        await optimizationMutation.mutateAsync({
          action: 'kill_query',
          target: query.queryHash,
          parameters: { query_hash: query.queryHash },
          force: true,
        });
      } catch (error) {
        console.error(`Failed to kill query ${query.queryHash}:`, error);
        // Continue with other queries
      }
    }
  }, [healthMetrics, optimizationMutation]);

  // Cleanup idle connections
  const cleanupConnections = useCallback(async () => {
    await optimizationMutation.mutateAsync({
      action: 'kill_idle_connections',
      target: 'idle_connections',
      force: true,
    });
  }, [optimizationMutation]);

  // Schedule vacuum operation
  const scheduleVacuum = useCallback(
    async (tableName: string, options: VacuumOptions = {}) => {
      const action = options.full ? 'vacuum_full_table' : 'vacuum_table';
      const parameters: Record<string, any> = {
        analyze: options.analyze !== false, // Default to true
      };

      if (options.scheduleTime) {
        parameters.scheduled_for = options.scheduleTime.toISOString();
      }

      await optimizationMutation.mutateAsync({
        action,
        target: tableName,
        parameters,
      });
    },
    [optimizationMutation],
  );

  return {
    // Data
    healthMetrics,
    isLoading,
    isError,
    error: error as Error | null,
    lastUpdated,

    // Actions
    refetch,
    optimizeDatabase,
    killSlowQueries,
    cleanupConnections,
    scheduleVacuum,

    // Status
    isOptimizing: optimizationMutation.isPending,
    optimizationError: optimizationMutation.error as Error | null,
    connectionStatus,
  };
}

/**
 * Hook for database maintenance history
 */
export function useMaintenanceHistory(
  options: {
    limit?: number;
    offset?: number;
    includeScheduled?: boolean;
    includeRecommendations?: boolean;
  } = {},
) {
  const {
    limit = 50,
    offset = 0,
    includeScheduled = true,
    includeRecommendations = true,
  } = options;

  return useQuery({
    queryKey: [
      'maintenance-history',
      { limit, offset, includeScheduled, includeRecommendations },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        includeScheduled: includeScheduled.toString(),
        includeRecommendations: includeRecommendations.toString(),
      });

      const response = await fetch(
        `/api/admin/database/maintenance/history?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch maintenance history: ${response.status}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch maintenance history');
      }

      return data.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for real-time wedding season awareness
 */
export function useWeddingSeasonContext() {
  const [isWeddingSeason, setIsWeddingSeason] = useState(false);
  const [seasonMultiplier, setSeasonMultiplier] = useState(1.0);
  const [peakMonth, setPeakMonth] = useState<string | null>(null);

  useEffect(() => {
    const updateWeddingContext = () => {
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12

      // Peak wedding months: May, June, July, September, October
      const weddingSeasons = {
        5: { multiplier: 1.4, name: 'May' },
        6: { multiplier: 1.6, name: 'June' },
        7: { multiplier: 1.5, name: 'July' },
        9: { multiplier: 1.3, name: 'September' },
        10: { multiplier: 1.4, name: 'October' },
      };

      const currentSeason =
        weddingSeasons[month as keyof typeof weddingSeasons];

      setIsWeddingSeason(!!currentSeason);
      setSeasonMultiplier(currentSeason?.multiplier || 1.0);
      setPeakMonth(currentSeason?.name || null);
    };

    updateWeddingContext();

    // Update at the start of each month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const timeUntilNextMonth = nextMonth.getTime() - now.getTime();

    const timeout = setTimeout(updateWeddingContext, timeUntilNextMonth);

    return () => clearTimeout(timeout);
  }, []);

  return {
    isWeddingSeason,
    seasonMultiplier,
    peakMonth,
    isWeddingDay: () => new Date().getDay() === 6, // Saturday
    isSafeMaintenanceWindow: () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      const hour = now.getHours();

      // Safe window: Tuesday-Thursday, 2-6 AM
      return day >= 2 && day <= 4 && hour >= 2 && hour < 6;
    },
  };
}

/**
 * Custom hook for database health alerts
 */
export function useDatabaseHealthAlerts() {
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      level: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: Date;
      dismissed: boolean;
    }>
  >([]);

  const addAlert = useCallback(
    (level: 'info' | 'warning' | 'critical', message: string) => {
      const alert = {
        id: `alert-${Date.now()}-${Math.random()}`,
        level,
        message,
        timestamp: new Date(),
        dismissed: false,
      };

      setAlerts((prev) => [alert, ...prev].slice(0, 10)); // Keep last 10 alerts
    },
    [],
  );

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, dismissed: true } : alert,
      ),
    );
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts: alerts.filter((alert) => !alert.dismissed),
    addAlert,
    dismissAlert,
    clearAllAlerts,
    hasUnreadAlerts: alerts.some((alert) => !alert.dismissed),
  };
}
