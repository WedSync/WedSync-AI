'use client';

import { useEffect, useCallback, useState } from 'react';
import useWeddingDayOfflineStore from '@/stores/wedding-day-offline';
import { useWeddingDaySync } from '@/hooks/useBackgroundSync';
import { useWeddingDayPreCache } from '@/hooks/useWeddingDayPreCache';
import { performanceOptimizer } from '@/lib/services/performance-optimization-service';
import { cacheManager } from '@/lib/services/cache-management-service';
import type {
  VendorCheckIn,
  TimelineEvent,
  WeddingDayIssue,
  WeatherCondition,
} from '@/types/wedding-day';

export interface UseWeddingDayOfflineProps {
  weddingId: string;
  coordinatorId: string;
  weddingDate?: string; // For pre-caching optimization
  enablePreCaching?: boolean; // Default: true
  enablePerformanceOptimization?: boolean; // Default: true
}

export function useWeddingDayOffline({
  weddingId,
  coordinatorId,
  weddingDate,
  enablePreCaching = true,
  enablePerformanceOptimization = true,
}: UseWeddingDayOfflineProps) {
  const {
    isOnline,
    vendors,
    timeline,
    issues,
    weather,
    coordinatorPresence,

    // Data updaters
    updateVendor,
    updateVendors,
    updateTimelineEvent,
    updateTimeline,
    updateIssue,
    updateIssues,
    updateWeather,
    updatePresence,

    // Action queue
    queueAction,

    // Data getters
    getVendorList,
    getTimelineList,
    getIssueList,

    // Status
    getPendingActionsCount,
    getFailedActionsCount,
  } = useWeddingDayOfflineStore();

  // =====================================================
  // ENHANCED PWA SERVICES INTEGRATION
  // =====================================================

  // Advanced background sync for wedding day
  const weddingDaySync = useWeddingDaySync(weddingId);

  // Pre-caching for ultra-fast data access
  const preCaching = useWeddingDayPreCache({
    weddingId,
    weddingDate,
    autoStart: enablePreCaching,
  });

  // Performance tracking state
  const [performanceStats, setPerformanceStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);

  // Queue offline action helper
  const queueOfflineAction = useCallback(
    (
      type:
        | 'vendor_checkin'
        | 'timeline_update'
        | 'issue_create'
        | 'issue_update'
        | 'status_update',
      data: any,
    ) => {
      queueAction({
        type,
        data,
        weddingId,
      });
    },
    [queueAction, weddingId],
  );

  // =====================================================
  // ENHANCED VENDOR OPERATIONS WITH PWA OPTIMIZATION
  // =====================================================

  const handleVendorCheckIn = useCallback(
    async (
      vendorId: string,
      location?: { lat: number; lng: number },
      notes?: string,
    ) => {
      return await performanceOptimizer.measureOperation(
        'cache_write',
        `vendor_checkin_${vendorId}`,
        async () => {
          const checkInData = {
            id: `checkin-${Date.now()}`,
            vendorId,
            vendorName: vendors[vendorId]?.vendorName || 'Unknown Vendor',
            vendorType: vendors[vendorId]?.vendorType || 'other',
            checkInTime: new Date().toISOString(),
            location: location
              ? { ...location, address: 'Current Location' }
              : undefined,
            status: 'checked-in' as const,
            notes,
            contact: vendors[vendorId]?.contact || { phone: '', email: '' },
            assignedTasks: vendors[vendorId]?.assignedTasks || [],
          };

          // Update local store immediately with optimization
          updateVendor(checkInData);

          // Cache the vendor data for ultra-fast access
          if (enablePerformanceOptimization) {
            await performanceOptimizer.optimizedCacheWrite(
              'wedding-day-vendors',
              `${weddingId}_vendor_${vendorId}`,
              checkInData,
              { critical: true, weddingId },
            );
          }

          // Use enhanced background sync queue
          if (!weddingDaySync.isOnline) {
            await weddingDaySync.checkInVendor(vendorId, { location, notes });
          } else {
            // Still queue legacy action for backwards compatibility
            queueOfflineAction('vendor_checkin', {
              vendorId,
              location,
              notes,
            });
          }

          return checkInData;
        },
        { critical: true, weddingId },
      );
    },
    [
      vendors,
      updateVendor,
      weddingDaySync.isOnline,
      weddingDaySync.checkInVendor,
      queueOfflineAction,
      enablePerformanceOptimization,
      weddingId,
    ],
  );

  const handleVendorStatusUpdate = useCallback(
    async (vendorId: string, status: VendorCheckIn['status'], eta?: string) => {
      // Update local vendor
      const existingVendor = vendors[vendorId];
      if (existingVendor) {
        updateVendor({
          ...existingVendor,
          status,
          eta,
        });
      }

      // Queue for sync when online
      if (!isOnline) {
        queueOfflineAction('status_update', {
          vendorId,
          status,
          eta,
        });
      }
    },
    [vendors, updateVendor, isOnline, queueOfflineAction],
  );

  // =====================================================
  // ENHANCED TIMELINE OPERATIONS WITH PWA OPTIMIZATION
  // =====================================================

  const handleTimelineEventUpdate = useCallback(
    async (eventId: string, update: Partial<TimelineEvent>) => {
      return await performanceOptimizer.measureOperation(
        'cache_write',
        `timeline_update_${eventId}`,
        async () => {
          // Update local timeline
          const existingEvent = timeline[eventId];
          if (existingEvent) {
            const updatedEvent = {
              ...existingEvent,
              ...update,
              updated_at: new Date().toISOString(),
            };

            updateTimelineEvent(updatedEvent);

            // Cache for ultra-fast access
            if (enablePerformanceOptimization) {
              await performanceOptimizer.optimizedCacheWrite(
                'wedding-day-timeline',
                `${weddingId}_event_${eventId}`,
                updatedEvent,
                { critical: true, weddingId },
              );
            }

            // Use enhanced background sync
            if (!weddingDaySync.isOnline) {
              await weddingDaySync.updateTimelineEvent(eventId, update);
            } else {
              // Legacy compatibility
              queueOfflineAction('timeline_update', { eventId, update });
            }

            return updatedEvent;
          }
        },
        { critical: true, weddingId },
      );
    },
    [
      timeline,
      updateTimelineEvent,
      weddingDaySync.isOnline,
      weddingDaySync.updateTimelineEvent,
      queueOfflineAction,
      enablePerformanceOptimization,
      weddingId,
    ],
  );

  // Issue operations
  const handleIssueCreate = useCallback(
    async (
      issue: Omit<WeddingDayIssue, 'id' | 'created_at' | 'updated_at'>,
    ) => {
      const newIssue: WeddingDayIssue = {
        ...issue,
        id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update local store
      updateIssue(newIssue);

      // Queue for sync when online
      if (!isOnline) {
        queueOfflineAction('issue_create', {
          issue: newIssue,
        });
      }

      return newIssue;
    },
    [updateIssue, isOnline, queueOfflineAction],
  );

  const handleIssueUpdate = useCallback(
    async (issueId: string, update: Partial<WeddingDayIssue>) => {
      // Update local issue
      const existingIssue = issues[issueId];
      if (existingIssue) {
        updateIssue({
          ...existingIssue,
          ...update,
          updated_at: new Date().toISOString(),
        });
      }

      // Queue for sync when online
      if (!isOnline) {
        queueOfflineAction('issue_update', {
          issueId,
          update: {
            ...update,
            updated_at: new Date().toISOString(),
          },
        });
      }
    },
    [issues, updateIssue, isOnline, queueOfflineAction],
  );

  // =====================================================
  // ENHANCED DATA LOADING WITH PRE-CACHING
  // =====================================================

  const loadInitialData = useCallback(async () => {
    console.log('Loading initial wedding day data with PWA optimization');

    try {
      // Try to get data from pre-cache first (ultra-fast)
      if (enablePreCaching && preCaching.isPreCached) {
        const cachedData = await preCaching.getWeddingDataFast(weddingId);
        if (cachedData) {
          console.log('Using pre-cached wedding data for instant loading');
          updateVendors(cachedData.vendors || {});
          updateTimeline(cachedData.timeline || {});
          updateIssues(cachedData.issues || {});
          updateWeather(cachedData.weather || null);
          return cachedData;
        }
      }

      // Fallback to optimized cache read
      if (enablePerformanceOptimization) {
        const cachedData = await performanceOptimizer.optimizedCacheRead(
          'wedding-day-cache-v1',
          `wedding_${weddingId}`,
          async () => {
            // Network fallback
            const response = await fetch(
              `/api/weddings/${weddingId}/coordination-data`,
            );
            return await response.json();
          },
          { critical: true, weddingId },
        );

        if (cachedData) {
          updateVendors(cachedData.vendors || {});
          updateTimeline(cachedData.timeline || {});
          updateIssues(cachedData.issues || {});
          updateWeather(cachedData.weather || null);
          return cachedData;
        }
      }

      // Final fallback to regular network request
      console.log('Using network fallback for wedding data');
      const response = await fetch(
        `/api/weddings/${weddingId}/coordination-data`,
      );
      const data = await response.json();
      updateVendors(data.vendors || {});
      updateTimeline(data.timeline || {});
      updateIssues(data.issues || {});
      updateWeather(data.weather || null);
    } catch (error) {
      console.error('Failed to load wedding data:', error);
      // Continue with empty/existing data
    }
  }, [
    weddingId,
    enablePreCaching,
    enablePerformanceOptimization,
    preCaching,
    updateVendors,
    updateTimeline,
    updateIssues,
    updateWeather,
  ]);

  // =====================================================
  // PERFORMANCE MONITORING AND CACHE MANAGEMENT
  // =====================================================

  const updatePerformanceStats = useCallback(async () => {
    if (enablePerformanceOptimization) {
      try {
        const stats = performanceOptimizer.getPerformanceStats();
        const cache = await cacheManager.analyzeCaches();
        setPerformanceStats(stats);
        setCacheStats(cache);
      } catch (error) {
        console.error('Failed to update performance stats:', error);
      }
    }
  }, [enablePerformanceOptimization]);

  // Wedding day optimization
  const optimizeForWeddingDay = useCallback(async () => {
    if (!weddingDate || !enablePerformanceOptimization) return;

    const hoursUntilWedding = preCaching.getHoursUntilWedding(weddingDate);

    if (hoursUntilWedding <= 6) {
      // 6 hours before wedding
      console.log('Enabling emergency wedding day optimization mode');
      performanceOptimizer.enableEmergencyMode();
      await cacheManager.optimizeForWeddingDay(weddingId);
    } else if (hoursUntilWedding <= 24) {
      // 24 hours before wedding
      console.log('Enabling wedding day optimization mode');
      performanceOptimizer.enableWeddingDayMode(weddingId);
      await cacheManager.optimizeForWeddingDay(weddingId);
    }
  }, [
    weddingDate,
    weddingId,
    enablePerformanceOptimization,
    preCaching.getHoursUntilWedding,
  ]);

  // =====================================================
  // INITIALIZATION AND EFFECTS
  // =====================================================

  // Initialize data when hook is first used
  useEffect(() => {
    loadInitialData();

    // Initial performance stats update
    if (enablePerformanceOptimization) {
      updatePerformanceStats();
    }

    // Wedding day optimization check
    if (weddingDate) {
      optimizeForWeddingDay();
    }
  }, [
    loadInitialData,
    updatePerformanceStats,
    optimizeForWeddingDay,
    enablePerformanceOptimization,
    weddingDate,
  ]);

  // Periodic performance monitoring
  useEffect(() => {
    if (!enablePerformanceOptimization) return;

    const interval = setInterval(() => {
      updatePerformanceStats();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [updatePerformanceStats, enablePerformanceOptimization]);

  // Wedding day optimization monitoring
  useEffect(() => {
    if (!weddingDate || !enablePerformanceOptimization) return;

    const interval = setInterval(() => {
      optimizeForWeddingDay();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [optimizeForWeddingDay, weddingDate, enablePerformanceOptimization]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (enablePerformanceOptimization) {
        // Reset to normal mode when component unmounts
        performanceOptimizer.restoreNormalMode();
        cacheManager.restoreNormalOperation();
      }
    };
  }, [enablePerformanceOptimization]);

  // =====================================================
  // ENHANCED RETURN INTERFACE WITH PWA FEATURES
  // =====================================================

  return {
    // =====================================================
    // LEGACY COMPATIBILITY - Existing API maintained
    // =====================================================

    // Connection status (enhanced with PWA sync status)
    isOnline: weddingDaySync.isOnline || isOnline,
    syncStatus: {
      pendingCount:
        getPendingActionsCount() + (weddingDaySync.stats?.pendingActions || 0),
      failedCount:
        getFailedActionsCount() + (weddingDaySync.stats?.failedActions || 0),
      hasUnsyncedData:
        getPendingActionsCount() +
          getFailedActionsCount() +
          (weddingDaySync.stats?.pendingActions || 0) +
          (weddingDaySync.stats?.failedActions || 0) >
        0,
      // Enhanced sync info
      isSyncing: weddingDaySync.isSyncing,
      lastSyncTime: weddingDaySync.stats?.lastSyncTime,
      totalActions: weddingDaySync.stats?.totalActions || 0,
    },

    // Data (sorted and ready to use) - enhanced with pre-cached data
    vendors: getVendorList(),
    timeline: getTimelineList(),
    issues: getIssueList(),
    weather,
    coordinatorPresence,

    // Raw data maps (for lookups)
    vendorsMap: vendors,
    timelineMap: timeline,
    issuesMap: issues,

    // Event handlers (work offline with enhanced queueing and caching)
    onVendorCheckIn: handleVendorCheckIn,
    onVendorStatusUpdate: handleVendorStatusUpdate,
    onTimelineEventUpdate: handleTimelineEventUpdate,
    onIssueCreate: handleIssueCreate,
    onIssueUpdate: handleIssueUpdate,

    // Manual data updates (for when receiving real-time updates)
    updateVendors,
    updateTimeline,
    updateIssues,
    updateWeather,
    updatePresence,

    // Utility functions
    refreshData: loadInitialData,

    // =====================================================
    // NEW PWA FEATURES
    // =====================================================

    // Pre-caching status and controls
    preCache: {
      isPreCaching: preCaching.isPreCaching,
      isPreCached: preCaching.isPreCached,
      cacheSize: preCaching.cacheSize,
      lastCacheTime: preCaching.lastCacheTime,
      isWeddingDayApproaching: weddingDate
        ? preCaching.isWeddingDayApproaching(weddingDate)
        : false,
      hoursUntilWedding: weddingDate
        ? preCaching.getHoursUntilWedding(weddingDate)
        : null,

      // Actions
      startPreCache: preCaching.startPreCache,
      clearPreCache: preCaching.clearPreCache,
      refreshPreCache: preCaching.refreshPreCache,

      // Fast data access
      getWeddingDataFast: preCaching.getWeddingDataFast,

      // Performance metrics
      cachePerformance: preCaching.cachePerformance,
    },

    // Enhanced background sync
    backgroundSync: {
      isOnline: weddingDaySync.isOnline,
      isSyncing: weddingDaySync.isSyncing,
      stats: weddingDaySync.stats,

      // Wedding-specific sync actions
      checkInVendor: weddingDaySync.checkInVendor,
      updateTimelineEvent: weddingDaySync.updateTimelineEvent,
      reportIssue: weddingDaySync.reportIssue,
      updateStatus: weddingDaySync.updateStatus,

      // Force sync for critical situations
      forceSyncNow: weddingDaySync.forceSyncNow,

      // General sync controls
      triggerSync: weddingDaySync.triggerSync,
      clearAllActions: weddingDaySync.clearAllActions,
      retryFailedActions: weddingDaySync.retryFailedActions,
      getSyncStats: weddingDaySync.getSyncStats,
    },

    // Performance monitoring
    performance: enablePerformanceOptimization
      ? {
          stats: performanceStats,
          cacheStats: cacheStats,

          // Performance actions
          updateStats: updatePerformanceStats,
          optimizeForWeddingDay,

          // Direct access to performance optimizer
          enableWeddingDayMode: () =>
            performanceOptimizer.enableWeddingDayMode(weddingId),
          enableEmergencyMode: () => performanceOptimizer.enableEmergencyMode(),
          restoreNormalMode: () => performanceOptimizer.restoreNormalMode(),
          getPerformanceAlerts: () =>
            performanceOptimizer.getPerformanceAlerts(),
          clearMetrics: () => performanceOptimizer.clearMetrics(),
        }
      : null,

    // Cache management
    cacheManagement: enablePerformanceOptimization
      ? {
          analyzeCaches: () => cacheManager.analyzeCaches(),
          performCleanup: () => cacheManager.performIntelligentCleanup(),
          clearSpecificCache: cacheManager.clearSpecificCache,
          clearAllCaches: cacheManager.clearAllCaches,
          emergencyCleanup: cacheManager.emergencyCleanup,
          optimizeForWeddingDay: () =>
            cacheManager.optimizeForWeddingDay(weddingId),
          restoreNormalOperation: cacheManager.restoreNormalOperation,
        }
      : null,

    // Configuration
    config: {
      weddingId,
      coordinatorId,
      weddingDate,
      enablePreCaching,
      enablePerformanceOptimization,
    },

    // Debug utilities (development only)
    debug: {
      performanceOptimizer:
        typeof window !== 'undefined'
          ? (window as any).performanceOptimizer
          : null,
      cacheManager:
        typeof window !== 'undefined' ? (window as any).cacheManager : null,
      preCaching,
      weddingDaySync,
      metrics: {
        performance: performanceStats,
        cache: cacheStats,
      },
    },
  };
}
