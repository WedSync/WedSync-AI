/**
 * WS-227: useSystemHealth Hook - Admin System Health Monitoring
 * Specialized hook for admin health dashboard with real-time updates
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SystemHealth } from '@/lib/services/health-monitor';

export interface UseSystemHealthOptions {
  /** Auto-refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number;
  /** Enable/disable auto-refresh */
  autoRefresh?: boolean;
  /** Include detailed metrics in requests */
  includeMetrics?: boolean;
  /** Include historical data */
  includeHistory?: boolean;
  /** Filter by specific service */
  service?: string;
  /** Callback when health status changes */
  onHealthChange?: (health: SystemHealth) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface SystemHealthMetrics {
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  requestId: string | null;
}

export interface UseSystemHealthReturn extends SystemHealthMetrics {
  /** Manually trigger health check */
  refresh: (showLoading?: boolean) => Promise<void>;
  /** Trigger manual health check on server */
  triggerHealthCheck: (services?: string[]) => Promise<void>;
  /** Start auto-refresh */
  startAutoRefresh: () => void;
  /** Stop auto-refresh */
  stopAutoRefresh: () => void;
  /** Get overall system status */
  getOverallStatus: () => 'healthy' | 'degraded' | 'down';
  /** Check if specific service is healthy */
  isServiceHealthy: (serviceName: string) => boolean;
  /** Get service latency */
  getServiceLatency: (serviceName: string) => number;
  /** Get service uptime */
  getServiceUptime: (serviceName: string) => number;
  /** Get health score (0-100) */
  getHealthScore: () => number;
  /** Get critical alerts count */
  getCriticalAlertsCount: () => number;
}

export const useSystemHealth = (
  options: UseSystemHealthOptions = {},
): UseSystemHealthReturn => {
  const {
    refreshInterval = 30000,
    autoRefresh = true,
    includeMetrics = true,
    includeHistory = false,
    service,
    onHealthChange,
    onError,
  } = options;

  // State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Build API URL with query parameters
   */
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (!includeMetrics) params.set('metrics', 'false');
    if (includeHistory) params.set('history', 'true');
    if (service) params.set('service', service);

    const queryString = params.toString();
    return `/api/admin/health${queryString ? `?${queryString}` : ''}`;
  }, [includeMetrics, includeHistory, service]);

  /**
   * Fetch health data from admin API
   */
  const fetchHealthData = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(buildApiUrl(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP ${response.status}: ${response.statusText}`,
          );
        }

        if (!data.success) {
          throw new Error(data.message || 'Health check failed');
        }

        return {
          health: data.data,
          requestId: data.meta?.requestId,
        };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        throw err;
      }
    },
    [buildApiUrl],
  );

  /**
   * Manual refresh with loading state control
   */
  const refresh = useCallback(
    async (showLoading = false): Promise<void> => {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        const result = await fetchHealthData(abortControllerRef.current.signal);

        if (result) {
          const { health: healthData, requestId: reqId } = result;

          // Update state
          setHealth(healthData);
          setRequestId(reqId);
          setLastUpdated(new Date());
          setError(null);

          // Trigger callback
          if (healthData) {
            onHealthChange?.(healthData);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch health data';
        console.error('System health fetch failed:', err);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [fetchHealthData, onHealthChange, onError],
  );

  /**
   * Trigger manual health check on server
   */
  const triggerHealthCheck = useCallback(
    async (services?: string[]): Promise<void> => {
      setLoading(true);

      try {
        const response = await fetch('/api/admin/health', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            services,
            forceRefresh: true,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Manual health check failed');
        }

        if (data.success && data.data) {
          setHealth(data.data);
          setRequestId(data.meta?.requestId);
          setLastUpdated(new Date());
          onHealthChange?.(data.data);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Manual health check failed';
        console.error('Manual health check failed:', err);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        // Refresh data after manual trigger
        await refresh();
      }
    },
    [refresh, onHealthChange, onError],
  );

  /**
   * Start auto-refresh
   */
  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh(); // Clear existing interval

    intervalRef.current = setInterval(() => {
      refresh(false); // Don't show loading for auto-refresh
    }, refreshInterval);

    console.log(
      `Admin health monitoring started - refresh every ${refreshInterval}ms`,
    );
  }, [refresh, refreshInterval]);

  /**
   * Stop auto-refresh
   */
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Get overall system status
   */
  const getOverallStatus = useCallback((): 'healthy' | 'degraded' | 'down' => {
    if (!health) return 'down';

    const services = health.services;
    const criticalServices = ['database', 'supabase'];

    // Check critical services first
    const criticalDown = criticalServices.some(
      (serviceName) =>
        services[serviceName as keyof typeof services]?.status === 'down',
    );

    if (criticalDown) return 'down';

    // Check all services
    const serviceStatuses = Object.values(services);
    const downCount = serviceStatuses.filter((s) => s.status === 'down').length;
    const degradedCount = serviceStatuses.filter(
      (s) => s.status === 'degraded',
    ).length;

    if (downCount > 0) return 'degraded';
    if (degradedCount > 0) return 'degraded';

    // Check infrastructure
    if (
      health.infrastructure.cpuUsage > 90 ||
      health.infrastructure.memoryUsage > 90 ||
      health.infrastructure.diskSpace > 95
    ) {
      return 'degraded';
    }

    // Check API health
    if (health.apiHealth.errorRate > 10) return 'degraded';

    return 'healthy';
  }, [health]);

  /**
   * Check if specific service is healthy
   */
  const isServiceHealthy = useCallback(
    (serviceName: string): boolean => {
      if (!health) return false;
      const service =
        health.services[serviceName as keyof typeof health.services];
      return service?.status === 'healthy';
    },
    [health],
  );

  /**
   * Get service latency
   */
  const getServiceLatency = useCallback(
    (serviceName: string): number => {
      if (!health) return -1;
      const service =
        health.services[serviceName as keyof typeof health.services];
      return service?.latency || -1;
    },
    [health],
  );

  /**
   * Get service uptime
   */
  const getServiceUptime = useCallback(
    (serviceName: string): number => {
      if (!health) return 0;
      const service =
        health.services[serviceName as keyof typeof health.services];
      return service?.uptime || 0;
    },
    [health],
  );

  /**
   * Calculate health score (0-100)
   */
  const getHealthScore = useCallback((): number => {
    if (!health) return 0;

    let score = 100;

    // Service health scoring
    Object.values(health.services).forEach((service) => {
      if (service.status === 'down') {
        score -= 15;
      } else if (service.status === 'degraded') {
        score -= 8;
      }

      // Latency penalties
      if (service.latency > 1000) score -= 5;
      if (service.latency > 2000) score -= 5;

      // Error count penalties
      if (service.errorCount24h > 10) score -= 5;
      if (service.errorCount24h > 50) score -= 10;

      // Uptime penalties
      if (service.uptime < 99.0) score -= 5;
      if (service.uptime < 95.0) score -= 10;
    });

    // Infrastructure scoring
    if (health.infrastructure.cpuUsage > 80) score -= 10;
    if (health.infrastructure.cpuUsage > 90) score -= 10;

    if (health.infrastructure.memoryUsage > 80) score -= 10;
    if (health.infrastructure.memoryUsage > 90) score -= 10;

    if (health.infrastructure.diskSpace > 85) score -= 15;
    if (health.infrastructure.diskSpace > 95) score -= 15;

    // API health scoring
    if (health.apiHealth.errorRate > 1) score -= 5;
    if (health.apiHealth.errorRate > 5) score -= 10;
    if (health.apiHealth.errorRate > 10) score -= 15;

    if (health.apiHealth.p95ResponseTime > 500) score -= 5;
    if (health.apiHealth.p95ResponseTime > 1000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }, [health]);

  /**
   * Get count of critical alerts
   */
  const getCriticalAlertsCount = useCallback((): number => {
    if (!health) return 0;

    let criticalCount = 0;

    // Service alerts
    Object.values(health.services).forEach((service) => {
      if (service.status === 'down') criticalCount++;
      if (service.errorCount24h > 100) criticalCount++;
    });

    // Infrastructure alerts
    if (health.infrastructure.cpuUsage > 95) criticalCount++;
    if (health.infrastructure.memoryUsage > 95) criticalCount++;
    if (health.infrastructure.diskSpace > 95) criticalCount++;

    // API alerts
    if (health.apiHealth.errorRate > 20) criticalCount++;

    return criticalCount;
  }, [health]);

  // Initialize and cleanup
  useEffect(() => {
    // Initial fetch
    refresh(true);

    // Start auto-refresh if enabled
    if (autoRefresh) {
      startAutoRefresh();
    }

    // Cleanup
    return () => {
      stopAutoRefresh();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoRefresh, refresh, startAutoRefresh, stopAutoRefresh]);

  // Update auto-refresh when interval changes
  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    }
  }, [refreshInterval, autoRefresh, startAutoRefresh]);

  return {
    health,
    loading,
    error,
    lastUpdated,
    requestId,
    refresh,
    triggerHealthCheck,
    startAutoRefresh,
    stopAutoRefresh,
    getOverallStatus,
    isServiceHealthy,
    getServiceLatency,
    getServiceUptime,
    getHealthScore,
    getCriticalAlertsCount,
  };
};

export default useSystemHealth;
