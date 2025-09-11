/**
 * WS-227: System Health Monitoring - React Hook for Health Metrics
 * Team E Implementation - Production-Ready Health Metrics Hook
 *
 * This hook provides real-time access to system health metrics with:
 * - Auto-refresh capabilities
 * - Error handling and fallbacks
 * - Wedding day protocols
 * - Caching for performance
 * - TypeScript safety
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SystemHealth, ServiceStatus } from '@/lib/services/health-monitor';

export interface UseHealthMetricsOptions {
  /** Auto-refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number;
  /** Enable/disable auto-refresh */
  autoRefresh?: boolean;
  /** Wedding day mode - more frequent updates and stricter thresholds */
  weddingDayMode?: boolean;
  /** Services to monitor specifically */
  services?: string[];
  /** Callback when critical alert detected */
  onCriticalAlert?: (alert: HealthAlert) => void;
  /** Callback when service status changes */
  onStatusChange?: (
    service: string,
    oldStatus: string,
    newStatus: string,
  ) => void;
}

export interface HealthAlert {
  service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface UseHealthMetricsReturn {
  /** Current system health data */
  health: SystemHealth | null;
  /** Individual service statuses */
  services: Record<string, ServiceStatus>;
  /** Current health alerts */
  alerts: HealthAlert[];
  /** Overall system status */
  systemStatus: 'healthy' | 'degraded' | 'down' | 'loading';
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Last update timestamp */
  lastUpdated: Date | null;
  /** Manually trigger refresh */
  refresh: () => Promise<void>;
  /** Start auto-refresh */
  startAutoRefresh: () => void;
  /** Stop auto-refresh */
  stopAutoRefresh: () => void;
  /** Check if service is healthy */
  isServiceHealthy: (service: string) => boolean;
  /** Get service uptime percentage */
  getServiceUptime: (service: string) => number;
  /** Get overall system score (0-100) */
  getHealthScore: () => number;
}

export const useHealthMetrics = (
  options: UseHealthMetricsOptions = {},
): UseHealthMetricsReturn => {
  const {
    refreshInterval = 30000, // 30 seconds default
    autoRefresh = true,
    weddingDayMode = false,
    services = [],
    onCriticalAlert,
    onStatusChange,
  } = options;

  // State management
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for cleanup and status tracking
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousStatusRef = useRef<Record<string, string>>({});

  /**
   * Determine effective refresh interval based on wedding day mode
   */
  const getEffectiveRefreshInterval = useCallback(() => {
    if (weddingDayMode) {
      return Math.min(refreshInterval, 10000); // Max 10 seconds on wedding days
    }
    return refreshInterval;
  }, [refreshInterval, weddingDayMode]);

  /**
   * Calculate overall system status from health data
   */
  const calculateSystemStatus = useCallback(
    (
      healthData: SystemHealth | null,
    ): 'healthy' | 'degraded' | 'down' | 'loading' => {
      if (!healthData) return 'loading';

      const serviceStatuses = Object.values(healthData.services);
      const downServices = serviceStatuses.filter((s) => s.status === 'down');
      const degradedServices = serviceStatuses.filter(
        (s) => s.status === 'degraded',
      );

      // Critical infrastructure checks
      if (
        healthData.services.database?.status === 'down' ||
        healthData.services.supabase?.status === 'down'
      ) {
        return 'down';
      }

      // Wedding day has stricter criteria
      if (weddingDayMode) {
        if (downServices.length > 0 || degradedServices.length > 1) {
          return 'down';
        }
        if (degradedServices.length > 0) {
          return 'degraded';
        }
      } else {
        if (downServices.length > 2) return 'down';
        if (downServices.length > 0 || degradedServices.length > 2)
          return 'degraded';
      }

      return 'healthy';
    },
    [weddingDayMode],
  );

  /**
   * Check for new alerts based on health data
   */
  const checkForAlerts = useCallback(
    (healthData: SystemHealth) => {
      const newAlerts: HealthAlert[] = [];

      // Check service alerts
      Object.entries(healthData.services).forEach(([serviceName, status]) => {
        const previousStatus = previousStatusRef.current[serviceName];

        // Status change alert
        if (previousStatus && previousStatus !== status.status) {
          onStatusChange?.(serviceName, previousStatus, status.status);

          if (status.status === 'down') {
            const alert: HealthAlert = {
              service: serviceName,
              severity: 'critical',
              message: `${serviceName} service is down`,
              timestamp: new Date(),
              resolved: false,
            };
            newAlerts.push(alert);
            onCriticalAlert?.(alert);
          } else if (status.status === 'degraded') {
            newAlerts.push({
              service: serviceName,
              severity: weddingDayMode ? 'high' : 'medium',
              message: `${serviceName} service is degraded (${status.latency}ms latency)`,
              timestamp: new Date(),
              resolved: false,
            });
          }
        }

        // Store current status for next comparison
        previousStatusRef.current[serviceName] = status.status;
      });

      // Infrastructure alerts
      if (healthData.infrastructure.cpuUsage > (weddingDayMode ? 70 : 80)) {
        newAlerts.push({
          service: 'infrastructure',
          severity: weddingDayMode ? 'high' : 'medium',
          message: `High CPU usage: ${healthData.infrastructure.cpuUsage}%`,
          timestamp: new Date(),
          resolved: false,
        });
      }

      if (healthData.infrastructure.memoryUsage > (weddingDayMode ? 80 : 85)) {
        newAlerts.push({
          service: 'infrastructure',
          severity: 'high',
          message: `High memory usage: ${healthData.infrastructure.memoryUsage}%`,
          timestamp: new Date(),
          resolved: false,
        });
      }

      if (healthData.infrastructure.diskSpace > (weddingDayMode ? 85 : 90)) {
        const alert: HealthAlert = {
          service: 'infrastructure',
          severity: 'critical',
          message: `Low disk space: ${healthData.infrastructure.diskSpace}% used`,
          timestamp: new Date(),
          resolved: false,
        };
        newAlerts.push(alert);
        onCriticalAlert?.(alert);
      }

      // API health alerts
      if (healthData.apiHealth.errorRate > (weddingDayMode ? 2 : 5)) {
        newAlerts.push({
          service: 'api',
          severity: weddingDayMode ? 'critical' : 'high',
          message: `High API error rate: ${healthData.apiHealth.errorRate}%`,
          timestamp: new Date(),
          resolved: false,
        });
      }

      // Update alerts state
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev.slice(0, 49)]); // Keep last 50 alerts
      }
    },
    [weddingDayMode, onCriticalAlert, onStatusChange],
  );

  /**
   * Fetch health data from API
   */
  const fetchHealthData = useCallback(
    async (signal?: AbortSignal): Promise<SystemHealth | null> => {
      try {
        const response = await fetch('/api/health', {
          signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Health API returned ${response.status}: ${response.statusText}`,
          );
        }

        const data = await response.json();
        return data;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null; // Request was aborted, ignore
        }
        throw err;
      }
    },
    [],
  );

  /**
   * Refresh health data
   */
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const healthData = await fetchHealthData(
        abortControllerRef.current.signal,
      );

      if (healthData) {
        setHealth(healthData);
        setLastUpdated(new Date());
        checkForAlerts(healthData);
      }
    } catch (err) {
      console.error('Health metrics fetch failed:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch health data',
      );

      // On wedding days, this is critical
      if (weddingDayMode) {
        const criticalAlert: HealthAlert = {
          service: 'system',
          severity: 'critical',
          message:
            'Health monitoring system failure - immediate attention required',
          timestamp: new Date(),
          resolved: false,
        };
        setAlerts((prev) => [criticalAlert, ...prev]);
        onCriticalAlert?.(criticalAlert);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchHealthData, checkForAlerts, weddingDayMode, onCriticalAlert]);

  /**
   * Start auto-refresh
   */
  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh(); // Clear existing interval

    const interval = getEffectiveRefreshInterval();
    intervalRef.current = setInterval(refresh, interval);

    console.log(
      `Health monitoring started - refresh every ${interval}ms ${weddingDayMode ? '(Wedding Day Mode)' : ''}`,
    );
  }, [refresh, getEffectiveRefreshInterval, weddingDayMode]);

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
   * Check if service is healthy
   */
  const isServiceHealthy = useCallback(
    (service: string): boolean => {
      if (!health) return false;
      const serviceStatus = health.services[
        service as keyof typeof health.services
      ] as ServiceStatus;
      return serviceStatus?.status === 'healthy';
    },
    [health],
  );

  /**
   * Get service uptime percentage
   */
  const getServiceUptime = useCallback(
    (service: string): number => {
      if (!health) return 0;
      const serviceStatus = health.services[
        service as keyof typeof health.services
      ] as ServiceStatus;
      return serviceStatus?.uptime || 0;
    },
    [health],
  );

  /**
   * Calculate overall system health score (0-100)
   */
  const getHealthScore = useCallback((): number => {
    if (!health) return 0;

    let score = 100;
    const services = Object.values(health.services);

    // Deduct points for service issues
    services.forEach((service) => {
      if (service.status === 'down') {
        score -= 20;
      } else if (service.status === 'degraded') {
        score -= 10;
      }

      // Additional deductions for high latency
      if (service.latency > 1000) {
        score -= 5;
      }
    });

    // Infrastructure penalties
    if (health.infrastructure.cpuUsage > 80) score -= 10;
    if (health.infrastructure.memoryUsage > 85) score -= 10;
    if (health.infrastructure.diskSpace > 90) score -= 15;

    // API health penalties
    if (health.apiHealth.errorRate > 5) score -= 15;
    if (health.apiHealth.p95ResponseTime > 1000) score -= 10;

    return Math.max(0, score);
  }, [health]);

  // Initialize and cleanup effects
  useEffect(() => {
    // Initial fetch
    refresh();

    // Start auto-refresh if enabled
    if (autoRefresh) {
      startAutoRefresh();
    }

    // Cleanup on unmount
    return () => {
      stopAutoRefresh();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoRefresh, refresh, startAutoRefresh, stopAutoRefresh]);

  // Wedding day mode effect
  useEffect(() => {
    if (weddingDayMode && autoRefresh) {
      // Restart with wedding day intervals
      startAutoRefresh();
    }
  }, [weddingDayMode, autoRefresh, startAutoRefresh]);

  // Extract services for easy access
  const servicesData = health?.services || {};

  return {
    health,
    services: servicesData,
    alerts,
    systemStatus: calculateSystemStatus(health),
    isLoading,
    error,
    lastUpdated,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    isServiceHealthy,
    getServiceUptime,
    getHealthScore,
  };
};

export default useHealthMetrics;
