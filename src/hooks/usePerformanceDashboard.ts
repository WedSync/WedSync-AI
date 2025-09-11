'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceOptimizer } from '@/lib/services/performance-optimization-service';
import { cacheManager } from '@/lib/services/cache-management-service';
import { backgroundSync } from '@/lib/services/background-sync-service';
import { weddingDayPreCaching } from '@/lib/services/wedding-day-precaching-service';
import type {
  PerformanceStats,
  PerformanceConfig,
  PerformanceMetrics,
} from '@/lib/services/performance-optimization-service';
import type {
  CacheStats,
  CacheConfig,
  StorageQuota,
} from '@/lib/services/cache-management-service';
import type { SyncStats } from '@/lib/services/background-sync-service';
import type { PreCacheStatus } from '@/lib/services/wedding-day-precaching-service';

export interface DashboardAlert {
  id: string;
  type: 'performance' | 'cache' | 'sync' | 'storage';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  timestamp: number;
  actionable: boolean;
  suggestedAction?: string;
  weddingId?: string;
}

export interface SystemHealth {
  overall: 'excellent' | 'good' | 'poor' | 'critical';
  performance: {
    score: number; // 0-100
    averageResponseTime: number;
    cacheHitRatio: number;
    slowOperationsCount: number;
  };
  storage: {
    score: number; // 0-100
    usagePercentage: number;
    totalSize: number;
    availableSpace: number;
  };
  sync: {
    score: number; // 0-100
    pendingActions: number;
    failedActions: number;
    lastSyncTime: string | null;
  };
  cache: {
    score: number; // 0-100
    totalCaches: number;
    healthyCaches: number;
    needsCleanup: boolean;
  };
}

export interface UsePerformanceDashboardProps {
  weddingId?: string;
  updateInterval?: number; // milliseconds, default 30000
  enableAlerts?: boolean;
  alertThresholds?: {
    performanceMs?: number;
    cacheHitRatio?: number;
    storageUsagePercent?: number;
    pendingActionsCount?: number;
  };
}

export interface UsePerformanceDashboardReturn {
  // System health overview
  systemHealth: SystemHealth;

  // Raw metrics
  performanceStats: PerformanceStats | null;
  cacheStats: CacheStats | null;
  syncStats: SyncStats | null;
  preCacheStatus: PreCacheStatus | null;
  storageQuota: StorageQuota | null;

  // Alerts and notifications
  alerts: DashboardAlert[];
  criticalAlerts: DashboardAlert[];

  // Actions
  refreshAllStats: () => Promise<void>;
  dismissAlert: (alertId: string) => void;
  clearAllAlerts: () => void;
  optimizeSystem: () => Promise<void>;

  // Performance controls
  enableWeddingDayMode: (weddingId: string) => void;
  enableEmergencyMode: () => void;
  restoreNormalMode: () => void;

  // Cache management
  performCacheCleanup: () => Promise<{ cleaned: number; freed: number }>;
  clearNonCriticalCaches: () => Promise<number>;

  // Sync management
  forceSyncNow: () => Promise<void>;
  retryFailedActions: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;

  // Real-time monitoring
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;

  // Configuration
  updateConfig: (config: Partial<UsePerformanceDashboardProps>) => void;

  // Export data for debugging
  exportDiagnostics: () => Promise<{ data: any; timestamp: string }>;
}

export function usePerformanceDashboard({
  weddingId,
  updateInterval = 30000,
  enableAlerts = true,
  alertThresholds = {
    performanceMs: 150,
    cacheHitRatio: 0.7,
    storageUsagePercent: 80,
    pendingActionsCount: 10,
  },
}: UsePerformanceDashboardProps = {}): UsePerformanceDashboardReturn {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [performanceStats, setPerformanceStats] =
    useState<PerformanceStats | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [preCacheStatus, setPreCacheStatus] = useState<PreCacheStatus | null>(
    null,
  );
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'good',
    performance: {
      score: 75,
      averageResponseTime: 100,
      cacheHitRatio: 0.8,
      slowOperationsCount: 0,
    },
    storage: {
      score: 75,
      usagePercentage: 30,
      totalSize: 0,
      availableSpace: 0,
    },
    sync: {
      score: 75,
      pendingActions: 0,
      failedActions: 0,
      lastSyncTime: null,
    },
    cache: { score: 75, totalCaches: 0, healthyCaches: 0, needsCleanup: false },
  });

  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [config, setConfig] = useState({
    weddingId,
    updateInterval,
    enableAlerts,
    alertThresholds,
  });

  // Refs for intervals
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);
  const alertCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // =====================================================
  // DATA COLLECTION
  // =====================================================

  const collectPerformanceStats = useCallback(async () => {
    try {
      const stats = performanceOptimizer.getPerformanceStats();
      setPerformanceStats(stats);
      return stats;
    } catch (error) {
      console.error('[Dashboard] Failed to collect performance stats:', error);
      return null;
    }
  }, []);

  const collectCacheStats = useCallback(async () => {
    try {
      const stats = await cacheManager.analyzeCaches();
      setCacheStats(stats);
      return stats;
    } catch (error) {
      console.error('[Dashboard] Failed to collect cache stats:', error);
      return null;
    }
  }, []);

  const collectSyncStats = useCallback(async () => {
    try {
      const stats = await backgroundSync.getSyncStats();
      setSyncStats(stats);
      return stats;
    } catch (error) {
      console.error('[Dashboard] Failed to collect sync stats:', error);
      return null;
    }
  }, []);

  const collectPreCacheStatus = useCallback(async () => {
    if (!config.weddingId) return null;

    try {
      const status = await weddingDayPreCaching.getPreCacheStatus(
        config.weddingId,
      );
      setPreCacheStatus(status);
      return status;
    } catch (error) {
      console.error('[Dashboard] Failed to collect pre-cache status:', error);
      return null;
    }
  }, [config.weddingId]);

  const collectStorageQuota = useCallback(async () => {
    try {
      const quota = await cacheManager.getStorageQuota();
      setStorageQuota(quota);
      return quota;
    } catch (error) {
      console.error('[Dashboard] Failed to collect storage quota:', error);
      return null;
    }
  }, []);

  const refreshAllStats = useCallback(async () => {
    console.log('[Dashboard] Refreshing all statistics');

    const [
      perfStats,
      cacheStatsData,
      syncStatsData,
      preCacheData,
      storageData,
    ] = await Promise.all([
      collectPerformanceStats(),
      collectCacheStats(),
      collectSyncStats(),
      collectPreCacheStatus(),
      collectStorageQuota(),
    ]);

    // Update system health after collecting all stats
    updateSystemHealth(perfStats, cacheStatsData, syncStatsData, storageData);
  }, [
    collectPerformanceStats,
    collectCacheStats,
    collectSyncStats,
    collectPreCacheStatus,
    collectStorageQuota,
  ]);

  // =====================================================
  // SYSTEM HEALTH CALCULATION
  // =====================================================

  const updateSystemHealth = useCallback(
    (
      perfStats?: PerformanceStats | null,
      cacheStatsData?: CacheStats | null,
      syncStatsData?: SyncStats | null,
      storageData?: StorageQuota | null,
    ) => {
      const stats = {
        performance: perfStats || performanceStats,
        cache: cacheStatsData || cacheStats,
        sync: syncStatsData || syncStats,
        storage: storageData || storageQuota,
      };

      // Calculate performance score (0-100)
      const performanceScore = stats.performance
        ? Math.max(
            0,
            100 -
              ((stats.performance.averageAccessTime > 100 ? 30 : 0) +
                (stats.performance.cacheHitRatio < 0.8 ? 20 : 0) +
                (stats.performance.slowOperationCount > 5 ? 25 : 0) +
                (stats.performance.p95AccessTime > 200 ? 25 : 0)),
          )
        : 75;

      // Calculate storage score (0-100)
      const storageScore = stats.storage
        ? Math.max(
            0,
            100 -
              ((stats.storage.usagePercentage > 90 ? 40 : 0) +
                (stats.storage.usagePercentage > 80 ? 20 : 0) +
                (stats.storage.usagePercentage > 70 ? 10 : 0)),
          )
        : 75;

      // Calculate sync score (0-100)
      const syncScore = stats.sync
        ? Math.max(
            0,
            100 -
              (stats.sync.failedActions * 10 +
                (stats.sync.pendingActions > 10
                  ? 20
                  : stats.sync.pendingActions > 5
                    ? 10
                    : 0)),
          )
        : 75;

      // Calculate cache score (0-100)
      const cacheScore = stats.cache
        ? Math.max(
            0,
            100 -
              (stats.cache.recommendations.length * 10 +
                (stats.cache.totalSize > 50 * 1024 * 1024 ? 20 : 0) +
                (stats.cache.quotaInfo.usagePercentage > 80 ? 20 : 0)),
          )
        : 75;

      // Overall health
      const averageScore =
        (performanceScore + storageScore + syncScore + cacheScore) / 4;
      const overall: SystemHealth['overall'] =
        averageScore >= 90
          ? 'excellent'
          : averageScore >= 75
            ? 'good'
            : averageScore >= 50
              ? 'poor'
              : 'critical';

      const newHealth: SystemHealth = {
        overall,
        performance: {
          score: performanceScore,
          averageResponseTime: stats.performance?.averageAccessTime || 0,
          cacheHitRatio: stats.performance?.cacheHitRatio || 0,
          slowOperationsCount: stats.performance?.slowOperationCount || 0,
        },
        storage: {
          score: storageScore,
          usagePercentage: stats.storage?.usagePercentage || 0,
          totalSize: stats.storage?.usage || 0,
          availableSpace: stats.storage?.available || 0,
        },
        sync: {
          score: syncScore,
          pendingActions: stats.sync?.pendingActions || 0,
          failedActions: stats.sync?.failedActions || 0,
          lastSyncTime: stats.sync?.lastSyncTime || null,
        },
        cache: {
          score: cacheScore,
          totalCaches: stats.cache?.totalCaches || 0,
          healthyCaches: stats.cache
            ? stats.cache.totalCaches - stats.cache.recommendations.length
            : 0,
          needsCleanup: stats.cache
            ? stats.cache.totalSize > 40 * 1024 * 1024 ||
              stats.cache.recommendations.length > 0
            : false,
        },
      };

      setSystemHealth(newHealth);

      // Generate alerts based on health scores
      if (config.enableAlerts) {
        generateHealthAlerts(newHealth);
      }
    },
    [
      performanceStats,
      cacheStats,
      syncStats,
      storageQuota,
      config.enableAlerts,
    ],
  );

  // =====================================================
  // ALERT MANAGEMENT
  // =====================================================

  const generateAlert = useCallback(
    (
      type: DashboardAlert['type'],
      severity: DashboardAlert['severity'],
      title: string,
      message: string,
      options: {
        actionable?: boolean;
        suggestedAction?: string;
        weddingId?: string;
      } = {},
    ) => {
      const alert: DashboardAlert = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity,
        title,
        message,
        timestamp: Date.now(),
        actionable: options.actionable || false,
        suggestedAction: options.suggestedAction,
        weddingId: options.weddingId,
      };

      setAlerts((prev) => [...prev, alert].slice(-50)); // Keep last 50 alerts
      return alert;
    },
    [],
  );

  const generateHealthAlerts = useCallback(
    (health: SystemHealth) => {
      const thresholds = config.alertThresholds;

      // Performance alerts
      if (
        health.performance.averageResponseTime >
        (thresholds.performanceMs || 150)
      ) {
        generateAlert(
          'performance',
          health.performance.averageResponseTime > 300 ? 'critical' : 'warning',
          'Slow Performance Detected',
          `Average response time: ${Math.round(health.performance.averageResponseTime)}ms`,
          {
            actionable: true,
            suggestedAction:
              'Enable wedding day optimization mode or clear cache',
          },
        );
      }

      // Cache hit ratio alerts
      if (
        health.performance.cacheHitRatio < (thresholds.cacheHitRatio || 0.7)
      ) {
        generateAlert(
          'cache',
          health.performance.cacheHitRatio < 0.5 ? 'critical' : 'warning',
          'Low Cache Hit Ratio',
          `Cache hit ratio: ${Math.round(health.performance.cacheHitRatio * 100)}%`,
          {
            actionable: true,
            suggestedAction: 'Review caching strategy or enable pre-caching',
          },
        );
      }

      // Storage alerts
      if (
        health.storage.usagePercentage > (thresholds.storageUsagePercent || 80)
      ) {
        generateAlert(
          'storage',
          health.storage.usagePercentage > 95 ? 'critical' : 'warning',
          'High Storage Usage',
          `Storage usage: ${Math.round(health.storage.usagePercentage)}%`,
          {
            actionable: true,
            suggestedAction: 'Perform cache cleanup or clear old data',
          },
        );
      }

      // Sync alerts
      if (health.sync.pendingActions > (thresholds.pendingActionsCount || 10)) {
        generateAlert(
          'sync',
          health.sync.pendingActions > 25 ? 'critical' : 'warning',
          'High Pending Actions',
          `${health.sync.pendingActions} actions pending sync`,
          {
            actionable: true,
            suggestedAction: 'Force sync now or check network connection',
          },
        );
      }

      if (health.sync.failedActions > 0) {
        generateAlert(
          'sync',
          health.sync.failedActions > 5 ? 'critical' : 'warning',
          'Sync Failures Detected',
          `${health.sync.failedActions} actions failed to sync`,
          {
            actionable: true,
            suggestedAction: 'Retry failed actions or check API connectivity',
          },
        );
      }
    },
    [config.alertThresholds, generateAlert],
  );

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // =====================================================
  // SYSTEM OPTIMIZATION ACTIONS
  // =====================================================

  const optimizeSystem = useCallback(async () => {
    console.log('[Dashboard] Running system optimization');

    try {
      // Performance optimization
      if (systemHealth.performance.score < 70) {
        if (config.weddingId) {
          performanceOptimizer.enableWeddingDayMode(config.weddingId);
        }
      }

      // Cache cleanup if needed
      if (systemHealth.storage.score < 70 || systemHealth.cache.needsCleanup) {
        await cacheManager.performIntelligentCleanup();
      }

      // Force sync if there are too many pending actions
      if (systemHealth.sync.pendingActions > 5) {
        await backgroundSync.triggerSync();
      }

      // Refresh stats after optimization
      await refreshAllStats();

      generateAlert(
        'performance',
        'success',
        'System Optimization Complete',
        'System has been optimized for better performance',
        { actionable: false },
      );
    } catch (error) {
      console.error('[Dashboard] System optimization failed:', error);
      generateAlert(
        'performance',
        'critical',
        'Optimization Failed',
        'System optimization encountered errors',
        { actionable: false },
      );
    }
  }, [systemHealth, config.weddingId, refreshAllStats, generateAlert]);

  // =====================================================
  // PERFORMANCE CONTROLS
  // =====================================================

  const enableWeddingDayMode = useCallback(
    (weddingId: string) => {
      performanceOptimizer.enableWeddingDayMode(weddingId);
      generateAlert(
        'performance',
        'info',
        'Wedding Day Mode Enabled',
        `Optimized performance for wedding ${weddingId}`,
        { actionable: false, weddingId },
      );
    },
    [generateAlert],
  );

  const enableEmergencyMode = useCallback(() => {
    performanceOptimizer.enableEmergencyMode();
    generateAlert(
      'performance',
      'warning',
      'Emergency Mode Enabled',
      'System optimized for emergency performance',
      { actionable: false },
    );
  }, [generateAlert]);

  const restoreNormalMode = useCallback(() => {
    performanceOptimizer.restoreNormalMode();
    cacheManager.restoreNormalOperation();
    generateAlert(
      'performance',
      'info',
      'Normal Mode Restored',
      'System returned to normal operation mode',
      { actionable: false },
    );
  }, [generateAlert]);

  // =====================================================
  // CACHE MANAGEMENT ACTIONS
  // =====================================================

  const performCacheCleanup = useCallback(async () => {
    const result = await cacheManager.performIntelligentCleanup();
    generateAlert(
      'cache',
      'success',
      'Cache Cleanup Complete',
      `Cleaned ${result.cleaned} caches, freed ${Math.round(result.freed / 1024)}KB`,
      { actionable: false },
    );
    return result;
  }, [generateAlert]);

  const clearNonCriticalCaches = useCallback(async () => {
    const result = await cacheManager.emergencyCleanup();
    generateAlert(
      'cache',
      'warning',
      'Emergency Cache Cleanup',
      `Freed ${Math.round(result.freed / 1024)}KB of non-critical data`,
      { actionable: false },
    );
    return result.success ? 1 : 0;
  }, [generateAlert]);

  // =====================================================
  // SYNC MANAGEMENT ACTIONS
  // =====================================================

  const forceSyncNow = useCallback(async () => {
    try {
      await backgroundSync.triggerSync();
      generateAlert(
        'sync',
        'success',
        'Force Sync Complete',
        'All pending actions have been synced',
        { actionable: false },
      );
    } catch (error) {
      generateAlert(
        'sync',
        'critical',
        'Force Sync Failed',
        'Failed to sync pending actions',
        { actionable: false },
      );
      throw error;
    }
  }, [generateAlert]);

  const retryFailedActions = useCallback(async () => {
    try {
      await backgroundSync.retryFailedActions();
      generateAlert(
        'sync',
        'success',
        'Failed Actions Retried',
        'Previously failed actions have been retried',
        { actionable: false },
      );
    } catch (error) {
      generateAlert(
        'sync',
        'critical',
        'Retry Failed',
        'Failed to retry failed actions',
        { actionable: false },
      );
      throw error;
    }
  }, [generateAlert]);

  const clearSyncQueue = useCallback(async () => {
    try {
      await backgroundSync.clearAllActions();
      generateAlert(
        'sync',
        'warning',
        'Sync Queue Cleared',
        'All pending sync actions have been cleared',
        { actionable: false },
      );
    } catch (error) {
      generateAlert(
        'sync',
        'critical',
        'Clear Queue Failed',
        'Failed to clear sync queue',
        { actionable: false },
      );
      throw error;
    }
  }, [generateAlert]);

  // =====================================================
  // REAL-TIME MONITORING
  // =====================================================

  const startMonitoring = useCallback(() => {
    if (monitoringInterval.current) return;

    setIsMonitoring(true);

    // Main stats refresh interval
    monitoringInterval.current = setInterval(() => {
      refreshAllStats();
    }, config.updateInterval);

    // More frequent alert checking
    alertCheckInterval.current = setInterval(() => {
      updateSystemHealth();
    }, 10000); // Every 10 seconds

    console.log('[Dashboard] Real-time monitoring started');
  }, [config.updateInterval, refreshAllStats, updateSystemHealth]);

  const stopMonitoring = useCallback(() => {
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }

    if (alertCheckInterval.current) {
      clearInterval(alertCheckInterval.current);
      alertCheckInterval.current = null;
    }

    setIsMonitoring(false);
    console.log('[Dashboard] Real-time monitoring stopped');
  }, []);

  // =====================================================
  // CONFIGURATION AND UTILITIES
  // =====================================================

  const updateConfig = useCallback(
    (newConfig: Partial<UsePerformanceDashboardProps>) => {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);

      // Restart monitoring if interval changed
      if (newConfig.updateInterval && isMonitoring) {
        stopMonitoring();
        setTimeout(startMonitoring, 100);
      }
    },
    [config, isMonitoring, stopMonitoring, startMonitoring],
  );

  const exportDiagnostics = useCallback(async () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      systemHealth,
      performanceStats,
      cacheStats,
      syncStats,
      preCacheStatus,
      storageQuota,
      alerts: alerts.slice(-20), // Last 20 alerts
      config,
      performanceConfig: performanceOptimizer.getConfig(),
      performanceAlerts: performanceOptimizer.getPerformanceAlerts(),
      cachePerformanceMetrics:
        performanceOptimizer.getCachePerformanceMetrics(),
    };

    return {
      data: diagnostics,
      timestamp: diagnostics.timestamp,
    };
  }, [
    systemHealth,
    performanceStats,
    cacheStats,
    syncStats,
    preCacheStatus,
    storageQuota,
    alerts,
    config,
  ]);

  // =====================================================
  // INITIALIZATION AND CLEANUP
  // =====================================================

  useEffect(() => {
    // Initial data load
    refreshAllStats();

    // Auto-start monitoring
    startMonitoring();

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, []); // Empty dependency array for one-time setup

  // Critical alerts (severity critical or warning)
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === 'critical' || alert.severity === 'warning',
  );

  // =====================================================
  // RETURN INTERFACE
  // =====================================================

  return {
    // System health overview
    systemHealth,

    // Raw metrics
    performanceStats,
    cacheStats,
    syncStats,
    preCacheStatus,
    storageQuota,

    // Alerts and notifications
    alerts,
    criticalAlerts,

    // Actions
    refreshAllStats,
    dismissAlert,
    clearAllAlerts,
    optimizeSystem,

    // Performance controls
    enableWeddingDayMode,
    enableEmergencyMode,
    restoreNormalMode,

    // Cache management
    performCacheCleanup,
    clearNonCriticalCaches,

    // Sync management
    forceSyncNow,
    retryFailedActions,
    clearSyncQueue,

    // Real-time monitoring
    isMonitoring,
    startMonitoring,
    stopMonitoring,

    // Configuration
    updateConfig,

    // Export data for debugging
    exportDiagnostics,
  };
}
