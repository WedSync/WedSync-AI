/**
 * WS-241 Cache Performance Monitoring Hook
 * React integration for real-time cache performance monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cachePerformanceMonitor } from '@/lib/ai/cache/performance-monitor';
import type {
  CachePerformanceMetrics,
  CacheAlert,
  SupplierType,
  WeddingSeason,
} from '@/types/ai-cache';

interface UseCachePerformanceMonitoringOptions {
  supplierId: string;
  supplierType: SupplierType;
  autoStart?: boolean;
  metricsInterval?: number;
  enableAlerts?: boolean;
  weddingSeason?: WeddingSeason;
}

interface CachePerformanceMonitoringState {
  isMonitoring: boolean;
  currentMetrics: CachePerformanceMetrics | null;
  metricsHistory: CachePerformanceMetrics[];
  activeAlerts: CacheAlert[];
  insights: Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    significance: 'high' | 'medium' | 'low';
  }>;
  performanceGrade: string | null;
  loading: boolean;
  error: string | null;
}

export const useCachePerformanceMonitoring = ({
  supplierId,
  supplierType,
  autoStart = true,
  metricsInterval = 30000,
  enableAlerts = true,
  weddingSeason,
}: UseCachePerformanceMonitoringOptions) => {
  const [state, setState] = useState<CachePerformanceMonitoringState>({
    isMonitoring: false,
    currentMetrics: null,
    metricsHistory: [],
    activeAlerts: [],
    insights: [],
    performanceGrade: null,
    loading: false,
    error: null,
  });

  const alertTimeoutRef = useRef<NodeJS.Timeout>();
  const metricsUpdateRef = useRef<NodeJS.Timeout>();

  // Handle real-time alerts
  const handleAlert = useCallback((alert: CacheAlert) => {
    setState((prev) => ({
      ...prev,
      activeAlerts: [
        ...prev.activeAlerts.filter((a) => a.id !== alert.id),
        alert,
      ],
    }));

    // Auto-dismiss low severity alerts after 30 seconds
    if (alert.severity === 'low') {
      alertTimeoutRef.current = setTimeout(() => {
        resolveAlert(alert.id);
      }, 30000);
    }
  }, []);

  // Start performance monitoring
  const startMonitoring = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Configure monitoring for wedding season if provided
      if (weddingSeason) {
        cachePerformanceMonitor.setWeddingSeason(weddingSeason);
      }

      // Set up alert callback
      if (enableAlerts) {
        cachePerformanceMonitor.onAlert(handleAlert);
      }

      // Start the monitor
      cachePerformanceMonitor.start();

      // Set up periodic UI updates
      metricsUpdateRef.current = setInterval(
        () => {
          updateMetricsState();
        },
        Math.max(metricsInterval / 3, 10000),
      ); // Update UI more frequently than collection

      setState((prev) => ({
        ...prev,
        isMonitoring: true,
        loading: false,
      }));

      // Initial metrics update
      updateMetricsState();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : 'Failed to start monitoring',
      }));
    }
  }, [
    supplierId,
    supplierType,
    metricsInterval,
    enableAlerts,
    weddingSeason,
    handleAlert,
  ]);

  // Stop performance monitoring
  const stopMonitoring = useCallback(() => {
    cachePerformanceMonitor.stop();

    if (metricsUpdateRef.current) {
      clearInterval(metricsUpdateRef.current);
    }

    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }

    setState((prev) => ({
      ...prev,
      isMonitoring: false,
    }));
  }, []);

  // Update metrics in state
  const updateMetricsState = useCallback(() => {
    const currentMetrics = cachePerformanceMonitor.getCurrentMetrics();
    const metricsHistory = cachePerformanceMonitor.getMetricsHistory(50); // Last 50 metrics
    const activeAlerts = cachePerformanceMonitor.getActiveAlerts();
    const insights = cachePerformanceMonitor.getPerformanceInsights();

    // Calculate performance grade
    const performanceGrade = currentMetrics
      ? calculatePerformanceGrade(
          currentMetrics.hitRate,
          currentMetrics.averageResponseTime,
        )
      : null;

    setState((prev) => ({
      ...prev,
      currentMetrics,
      metricsHistory,
      activeAlerts,
      insights,
      performanceGrade,
    }));
  }, []);

  // Resolve an alert
  const resolveAlert = useCallback((alertId: string) => {
    cachePerformanceMonitor.resolveAlert(alertId);
    setState((prev) => ({
      ...prev,
      activeAlerts: prev.activeAlerts.filter((alert) => alert.id !== alertId),
    }));
  }, []);

  // Record a performance event
  const recordEvent = useCallback(
    (event: Parameters<typeof cachePerformanceMonitor.recordEvent>[0]) => {
      cachePerformanceMonitor.recordEvent(event);
    },
    [],
  );

  // Generate performance report
  const generateReport = useCallback(
    (timeRange: 'hour' | 'day' | 'week' = 'day') => {
      return cachePerformanceMonitor.generatePerformanceReport(timeRange);
    },
    [],
  );

  // Get wedding season recommendations
  const getSeasonalRecommendations = useCallback(() => {
    if (!weddingSeason || !state.currentMetrics) return [];

    const recommendations = [];

    // Peak season recommendations
    if (weddingSeason === 'peak') {
      if (state.currentMetrics.hitRate < 85) {
        recommendations.push({
          title: 'Increase Cache Warming',
          description:
            'During peak wedding season, warm cache more frequently to handle increased query volume',
          priority: 'high' as const,
          action: 'Enable aggressive cache warming for popular wedding queries',
        });
      }

      if (state.currentMetrics.averageResponseTime > 150) {
        recommendations.push({
          title: 'Optimize Response Times',
          description:
            'Wedding clients expect fast responses during peak season',
          priority: 'high' as const,
          action: 'Review cache storage configuration and increase capacity',
        });
      }
    }

    // Off season recommendations
    if (weddingSeason === 'off') {
      if (state.activeAlerts.length > 0) {
        recommendations.push({
          title: 'Review Alert Thresholds',
          description:
            'Consider adjusting thresholds for off-season performance expectations',
          priority: 'medium' as const,
          action:
            'Lower performance thresholds during off-season to reduce noise',
        });
      }
    }

    return recommendations;
  }, [weddingSeason, state.currentMetrics, state.activeAlerts.length]);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && !state.isMonitoring && !state.loading) {
      startMonitoring();
    }

    return () => {
      if (state.isMonitoring) {
        stopMonitoring();
      }
    };
  }, [
    autoStart,
    startMonitoring,
    stopMonitoring,
    state.isMonitoring,
    state.loading,
  ]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (metricsUpdateRef.current) {
        clearInterval(metricsUpdateRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,

    // Actions
    startMonitoring,
    stopMonitoring,
    resolveAlert,
    recordEvent,
    generateReport,
    getSeasonalRecommendations,

    // Computed values
    hasActiveHighPriorityAlerts: state.activeAlerts.some(
      (alert) => alert.severity === 'high' || alert.severity === 'critical',
    ),
    overallHealthScore: calculateOverallHealthScore(
      state.currentMetrics,
      state.activeAlerts.length,
    ),

    // Wedding-specific insights
    isWeddingSeason: weddingSeason === 'peak' || weddingSeason === 'shoulder',
    seasonalRecommendations: getSeasonalRecommendations(),
  };
};

// Helper functions
function calculatePerformanceGrade(
  hitRate: number,
  responseTime: number,
): string {
  if (hitRate >= 90 && responseTime <= 100) return 'A+';
  if (hitRate >= 85 && responseTime <= 150) return 'A';
  if (hitRate >= 80 && responseTime <= 200) return 'B+';
  if (hitRate >= 75 && responseTime <= 300) return 'B';
  if (hitRate >= 70 && responseTime <= 400) return 'C+';
  if (hitRate >= 65 && responseTime <= 500) return 'C';
  return 'D';
}

function calculateOverallHealthScore(
  metrics: CachePerformanceMetrics | null,
  alertCount: number,
): number {
  if (!metrics) return 0;

  let score = 100;

  // Deduct for poor hit rate
  if (metrics.hitRate < 80) score -= 80 - metrics.hitRate;

  // Deduct for slow response times
  if (metrics.averageResponseTime > 200) {
    score -= Math.min(30, (metrics.averageResponseTime - 200) / 10);
  }

  // Deduct for high error rate
  score -= metrics.errorRate * 5;

  // Deduct for active alerts
  score -= alertCount * 2;

  return Math.max(0, Math.min(100, score));
}

export default useCachePerformanceMonitoring;
