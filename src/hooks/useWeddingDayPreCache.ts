'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  weddingDayPreCaching,
  type PreCacheStatus,
  type WeddingDayData,
} from '@/lib/services/wedding-day-precaching-service';

export interface UseWeddingDayPreCacheProps {
  weddingId?: string;
  weddingDate?: string;
  autoStart?: boolean;
}

export interface UseWeddingDayPreCacheReturn {
  // Status
  status: PreCacheStatus | null;
  isPreCaching: boolean;
  isPreCached: boolean;
  cacheSize: number;

  // Data access (ultra-fast)
  weddingData: WeddingDayData | null;
  timelineEvents: any[];
  vendors: any[];

  // Actions
  startPreCache: (weddingId: string, weddingDate: string) => Promise<void>;
  getWeddingDataFast: (weddingId: string) => Promise<WeddingDayData | null>;
  clearPreCache: (weddingId?: string) => Promise<void>;
  refreshPreCache: (weddingId: string, weddingDate: string) => Promise<void>;

  // Utilities
  isWeddingDayApproaching: (weddingDate: string) => boolean;
  getHoursUntilWedding: (weddingDate: string) => number;

  // Performance metrics
  lastCacheTime: string | null;
  cachePerformance: {
    fetchTime: number | null;
    cacheHitRatio: number;
    totalRequests: number;
    cacheHits: number;
  };
}

export function useWeddingDayPreCache({
  weddingId,
  weddingDate,
  autoStart = true,
}: UseWeddingDayPreCacheProps = {}): UseWeddingDayPreCacheReturn {
  // State
  const [status, setStatus] = useState<PreCacheStatus | null>(null);
  const [isPreCaching, setIsPreCaching] = useState(false);
  const [weddingData, setWeddingData] = useState<WeddingDayData | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [lastCacheTime, setLastCacheTime] = useState<string | null>(null);

  // Performance tracking
  const performanceRef = useRef({
    fetchTime: null as number | null,
    cacheHitRatio: 0,
    totalRequests: 0,
    cacheHits: 0,
  });

  // =====================================================
  // STATUS MONITORING
  // =====================================================

  const updateStatus = useCallback(
    async (targetWeddingId?: string) => {
      try {
        const currentStatus = await weddingDayPreCaching.getPreCacheStatus(
          targetWeddingId || weddingId,
        );
        setStatus(currentStatus);

        if (currentStatus) {
          setLastCacheTime(currentStatus.lastCacheTime);
          setIsPreCaching(currentStatus.status === 'caching');
        }
      } catch (error) {
        console.error('[PreCache Hook] Failed to update status:', error);
      }
    },
    [weddingId],
  );

  // =====================================================
  // DATA ACCESS (ULTRA-FAST)
  // =====================================================

  const getWeddingDataFast = useCallback(
    async (targetWeddingId: string): Promise<WeddingDayData | null> => {
      const startTime = performance.now();

      try {
        performanceRef.current.totalRequests++;

        // Try IndexedDB first (sub-10ms access)
        const data =
          await weddingDayPreCaching.getWeddingDataFast(targetWeddingId);

        if (data) {
          performanceRef.current.cacheHits++;
          performanceRef.current.cacheHitRatio =
            performanceRef.current.cacheHits /
            performanceRef.current.totalRequests;

          const endTime = performance.now();
          performanceRef.current.fetchTime = endTime - startTime;

          console.log(
            `[PreCache Hook] Fast data access in ${Math.round(performanceRef.current.fetchTime)}ms`,
          );

          setWeddingData(data);
          return data;
        }

        // Fallback to network if not cached
        console.log('[PreCache Hook] Data not cached, falling back to network');
        return null;
      } catch (error) {
        console.error('[PreCache Hook] Fast data access failed:', error);
        return null;
      }
    },
    [],
  );

  const loadTimelineEventsFast = useCallback(
    async (targetWeddingId: string) => {
      try {
        const events =
          await weddingDayPreCaching.getTimelineEventsFast(targetWeddingId);
        setTimelineEvents(events);
        return events;
      } catch (error) {
        console.error('[PreCache Hook] Failed to load timeline events:', error);
        return [];
      }
    },
    [],
  );

  const loadVendorsFast = useCallback(async (targetWeddingId: string) => {
    try {
      const vendorData =
        await weddingDayPreCaching.getVendorsFast(targetWeddingId);
      setVendors(vendorData);
      return vendorData;
    } catch (error) {
      console.error('[PreCache Hook] Failed to load vendors:', error);
      return [];
    }
  }, []);

  // =====================================================
  // PRE-CACHING ACTIONS
  // =====================================================

  const startPreCache = useCallback(
    async (targetWeddingId: string, targetWeddingDate: string) => {
      try {
        setIsPreCaching(true);
        console.log(
          `[PreCache Hook] Starting pre-cache for wedding ${targetWeddingId}`,
        );

        await weddingDayPreCaching.preCacheWeddingDay(
          targetWeddingId,
          targetWeddingDate,
        );

        // Update status and load data
        await updateStatus(targetWeddingId);
        await getWeddingDataFast(targetWeddingId);
        await loadTimelineEventsFast(targetWeddingId);
        await loadVendorsFast(targetWeddingId);

        console.log(
          `[PreCache Hook] Pre-cache completed for wedding ${targetWeddingId}`,
        );
      } catch (error) {
        console.error('[PreCache Hook] Pre-cache failed:', error);
        throw error;
      } finally {
        setIsPreCaching(false);
      }
    },
    [updateStatus, getWeddingDataFast, loadTimelineEventsFast, loadVendorsFast],
  );

  const refreshPreCache = useCallback(
    async (targetWeddingId: string, targetWeddingDate: string) => {
      console.log(
        `[PreCache Hook] Refreshing pre-cache for wedding ${targetWeddingId}`,
      );
      await startPreCache(targetWeddingId, targetWeddingDate);
    },
    [startPreCache],
  );

  const clearPreCache = useCallback(async (targetWeddingId?: string) => {
    try {
      // Clear specific wedding or all cached data
      if (targetWeddingId) {
        localStorage.removeItem(`wedding-day-precache-${targetWeddingId}`);
      } else {
        // Clear all pre-cache data
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith('wedding-day-precache-')) {
            localStorage.removeItem(key);
          }
        });
      }

      // Reset state
      setWeddingData(null);
      setTimelineEvents([]);
      setVendors([]);
      setStatus(null);

      console.log('[PreCache Hook] Pre-cache cleared');
    } catch (error) {
      console.error('[PreCache Hook] Failed to clear pre-cache:', error);
    }
  }, []);

  // =====================================================
  // UTILITIES
  // =====================================================

  const isWeddingDayApproaching = useCallback(
    (targetWeddingDate: string): boolean => {
      const hoursUntil = getHoursUntilWedding(targetWeddingDate);
      return hoursUntil <= 24 && hoursUntil > 0;
    },
    [],
  );

  const getHoursUntilWedding = useCallback(
    (targetWeddingDate: string): number => {
      const now = new Date();
      const wedding = new Date(targetWeddingDate);
      const timeDiff = wedding.getTime() - now.getTime();
      return Math.ceil(timeDiff / (1000 * 60 * 60));
    },
    [],
  );

  // =====================================================
  // AUTO-INITIALIZATION
  // =====================================================

  useEffect(() => {
    if (autoStart && weddingId && weddingDate) {
      const hoursUntil = getHoursUntilWedding(weddingDate);

      if (isWeddingDayApproaching(weddingDate)) {
        console.log(
          `[PreCache Hook] Wedding ${weddingId} approaching in ${hoursUntil}h - starting pre-cache`,
        );
        startPreCache(weddingId, weddingDate).catch(console.error);
      } else {
        // Check if data is already cached
        updateStatus(weddingId).then(() => {
          getWeddingDataFast(weddingId).then((data) => {
            if (data) {
              loadTimelineEventsFast(weddingId);
              loadVendorsFast(weddingId);
            }
          });
        });
      }
    }
  }, [
    weddingId,
    weddingDate,
    autoStart,
    startPreCache,
    updateStatus,
    getWeddingDataFast,
    isWeddingDayApproaching,
    getHoursUntilWedding,
    loadTimelineEventsFast,
    loadVendorsFast,
  ]);

  // =====================================================
  // SERVICE WORKER COMMUNICATION
  // =====================================================

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        const { type, data } = event.data;

        switch (type) {
          case 'WEDDING_DAY_PRECACHE_COMPLETE':
            console.log(
              '[PreCache Hook] Service worker pre-cache completed',
              data,
            );
            updateStatus(data.weddingId);
            break;

          case 'WEDDING_DAY_SYNC_SUCCESS':
            console.log('[PreCache Hook] Background sync successful', data);
            if (weddingId === data.weddingId) {
              getWeddingDataFast(weddingId);
            }
            break;

          case 'WEDDING_DAY_SYNC_FAILED':
            console.error('[PreCache Hook] Background sync failed', data);
            break;

          default:
            break;
        }
      };

      navigator.serviceWorker.addEventListener(
        'message',
        handleServiceWorkerMessage,
      );

      return () => {
        navigator.serviceWorker.removeEventListener(
          'message',
          handleServiceWorkerMessage,
        );
      };
    }
  }, [weddingId, updateStatus, getWeddingDataFast]);

  // =====================================================
  // PERFORMANCE MONITORING
  // =====================================================

  useEffect(() => {
    // Monitor performance and log metrics
    const interval = setInterval(() => {
      if (performanceRef.current.totalRequests > 0) {
        console.log('[PreCache Hook] Performance metrics:', {
          cacheHitRatio: `${Math.round(performanceRef.current.cacheHitRatio * 100)}%`,
          averageFetchTime: `${Math.round(performanceRef.current.fetchTime || 0)}ms`,
          totalRequests: performanceRef.current.totalRequests,
          cacheHits: performanceRef.current.cacheHits,
        });
      }
    }, 60000); // Log every minute

    return () => clearInterval(interval);
  }, []);

  // =====================================================
  // RETURN HOOK INTERFACE
  // =====================================================

  return {
    // Status
    status,
    isPreCaching,
    isPreCached: status?.status === 'completed' && !!weddingData,
    cacheSize: status?.cacheSize || 0,

    // Data access
    weddingData,
    timelineEvents,
    vendors,

    // Actions
    startPreCache,
    getWeddingDataFast,
    clearPreCache,
    refreshPreCache,

    // Utilities
    isWeddingDayApproaching,
    getHoursUntilWedding,

    // Performance
    lastCacheTime,
    cachePerformance: performanceRef.current,
  };
}

// =====================================================
// WEDDING LIST PRE-CACHE HOOK
// =====================================================

export function useWeddingListPreCache() {
  const [upcomingWeddings, setUpcomingWeddings] = useState<
    Array<{ weddingId: string; weddingDate: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUpcomingWeddings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/weddings/upcoming');
      if (response.ok) {
        const weddings = await response.json();
        setUpcomingWeddings(weddings);

        // Trigger pre-caching for approaching weddings
        for (const wedding of weddings) {
          const hoursUntil = Math.ceil(
            (new Date(wedding.weddingDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60),
          );

          if (hoursUntil <= 24 && hoursUntil > 0) {
            weddingDayPreCaching.preCacheWeddingDay(
              wedding.weddingId,
              wedding.weddingDate,
            );
          }
        }
      }
    } catch (error) {
      console.error('[PreCache Hook] Failed to load upcoming weddings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUpcomingWeddings();

    // Refresh every hour
    const interval = setInterval(loadUpcomingWeddings, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadUpcomingWeddings]);

  return {
    upcomingWeddings,
    isLoading,
    refreshWeddings: loadUpcomingWeddings,
  };
}
