'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  offlineDB,
  CachedWedding,
  SmartCacheManager,
  smartCacheManager,
} from '@/lib/offline/offline-database';
import { syncManager, SyncStatus } from '@/lib/offline/sync-manager';
import { SecureOfflineStorage } from '@/lib/security/offline-encryption';
import { debounce } from '@/lib/utils/debounce';

export interface UseOfflineDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  preloadRelated?: boolean;
  enableEncryption?: boolean;
  performanceMode?: boolean;
}

interface PerformanceMetrics {
  loadTime: number;
  cacheHits: number;
  cacheMisses: number;
  encryptionTime: number;
}

export interface OfflineDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  syncStatus: SyncStatus | null;
  performanceMetrics?: PerformanceMetrics;
}

// Enhanced hook for managing offline wedding data with security and performance
export function useOfflineWeddingData(
  weddingId?: string,
  options: UseOfflineDataOptions = {},
) {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    preloadRelated = true,
    enableEncryption = true,
    performanceMode = true,
  } = options;

  // Performance tracking
  const performanceRef = useRef<PerformanceMetrics>({
    loadTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    encryptionTime: 0,
  });

  // Cache for memoized operations
  const memoizedCache = useRef<Map<string, { data: any; timestamp: number }>>(
    new Map(),
  );
  const secureStorage = useMemo(() => SecureOfflineStorage.getInstance(), []);

  const [state, setState] = useState<OfflineDataState<CachedWedding>>({
    data: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
    syncStatus: null,
  });

  // Enhanced load wedding data with performance and security
  const loadWeddingData = useCallback(
    async (id: string) => {
      const startTime = performance.now();

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Check memoized cache first for <50ms performance
        const cacheKey = `wedding-${id}`;
        const cached = memoizedCache.current.get(cacheKey);
        const cacheExpiry = 5000; // 5 seconds cache

        if (
          cached &&
          performanceMode &&
          Date.now() - cached.timestamp < cacheExpiry
        ) {
          performanceRef.current.cacheHits++;
          setState((prev) => ({
            ...prev,
            data: cached.data,
            isLoading: false,
            lastUpdated: new Date(cached.timestamp),
            error: null,
            performanceMetrics: {
              ...performanceRef.current,
              loadTime: performance.now() - startTime,
            },
          }));
          return;
        }

        performanceRef.current.cacheMisses++;

        // Fast database retrieval
        let wedding: CachedWedding | undefined;
        if (enableEncryption) {
          const encryptionStart = performance.now();
          wedding = await SecureOfflineStorage.retrieveWeddingData(id);
          performanceRef.current.encryptionTime =
            performance.now() - encryptionStart;
        } else {
          wedding = await offlineDB.weddings.get(id);
        }

        if (wedding) {
          // Cache for future requests
          if (performanceMode) {
            memoizedCache.current.set(cacheKey, {
              data: wedding,
              timestamp: Date.now(),
            });
          }

          const loadTime = performance.now() - startTime;
          performanceRef.current.loadTime = loadTime;

          // Performance warning if over 50ms
          if (loadTime > 50) {
            console.warn(
              `Wedding data load exceeded 50ms: ${loadTime.toFixed(2)}ms`,
            );
          }

          setState((prev) => ({
            ...prev,
            data: wedding,
            isLoading: false,
            lastUpdated: new Date(),
            error: null,
            performanceMetrics: { ...performanceRef.current },
          }));

          // Preload related data asynchronously to not block main load
          if (preloadRelated) {
            requestIdleCallback(() => preloadRelatedData(wedding!));
          }
        } else {
          setState((prev) => ({
            ...prev,
            data: null,
            isLoading: false,
            error: 'Wedding not found in offline cache',
            performanceMetrics: {
              ...performanceRef.current,
              loadTime: performance.now() - startTime,
            },
          }));
        }
      } catch (error) {
        console.error('Error loading wedding data:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          performanceMetrics: {
            ...performanceRef.current,
            loadTime: performance.now() - startTime,
          },
        }));
      }
    },
    [preloadRelated, enableEncryption, performanceMode, secureStorage],
  );

  // Load today's weddings
  const loadTodaysWeddings = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const today = new Date().toISOString().split('T')[0];
      const todaysWeddings = await offlineDB.weddings
        .where('date')
        .equals(today)
        .and((w) => w.status === 'active' || w.status === 'upcoming')
        .sortBy('priority');

      setState((prev) => ({
        ...prev,
        data: todaysWeddings.length > 0 ? todaysWeddings[0] : null,
        isLoading: false,
        lastUpdated: new Date(),
        error:
          todaysWeddings.length === 0
            ? 'No weddings scheduled for today'
            : null,
      }));
    } catch (error) {
      console.error("Error loading today's weddings:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Preload related data
  const preloadRelatedData = async (wedding: CachedWedding) => {
    try {
      // Cache related forms
      const forms = await offlineDB.forms
        .where('clientId')
        .equals(wedding.coupleId)
        .toArray();

      // Cache form drafts
      const drafts = await offlineDB.formDrafts
        .where('clientId')
        .equals(wedding.coupleId)
        .toArray();

      console.log(
        `Preloaded ${forms.length} forms and ${drafts.length} drafts for wedding ${wedding.id}`,
      );
    } catch (error) {
      console.error('Error preloading related data:', error);
    }
  };

  // Debounced update for performance
  const debouncedUpdate = useMemo(
    () =>
      debounce(async (id: string, updates: Partial<CachedWedding>) => {
        const startTime = performance.now();

        try {
          // Enhanced update with security and performance
          const updateData = {
            ...updates,
            lastSync: new Date().toISOString(),
            syncStatus: 'pending' as const,
            lastModified: new Date().toISOString(),
          };

          if (enableEncryption) {
            // Use secure storage for sensitive updates
            await SecureOfflineStorage.storeWeddingData({ id, ...updateData });
          } else {
            await offlineDB.weddings.update(id, updateData);
          }

          // Clear cache for updated item
          memoizedCache.current.delete(`wedding-${id}`);

          // Priority sync for wedding-critical data
          const priority = getUpdatePriority(updates);
          await syncManager.queueAction(
            'client_update',
            'update',
            {
              id,
              updates,
              type: 'wedding',
            },
            { priority },
          );

          const updateTime = performance.now() - startTime;
          console.log(`Wedding update completed in ${updateTime.toFixed(2)}ms`);

          // Reload data efficiently
          if (weddingId === id) {
            await loadWeddingData(id);
          }
        } catch (error) {
          console.error('Error updating wedding data:', error);
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Update failed',
          }));
          // Retry logic for critical updates
          if (isCriticalUpdate(updates)) {
            setTimeout(() => updateWeddingData(id, updates), 2000);
          }
        }
      }, 300),
    [enableEncryption, weddingId, loadWeddingData],
  );

  // Public update function
  const updateWeddingData = useCallback(
    async (id: string, updates: Partial<CachedWedding>) => {
      await debouncedUpdate(id, updates);
    },
    [debouncedUpdate],
  );

  // Helper function to determine update priority for wedding context
  const getUpdatePriority = (updates: Partial<CachedWedding>): number => {
    if (updates.status === 'emergency' || updates.emergencyContacts) return 10;
    if (updates.timeline || updates.vendors) return 8;
    if (updates.guests || updates.seating) return 7;
    return 6;
  };

  // Helper function to identify critical updates
  const isCriticalUpdate = (updates: Partial<CachedWedding>): boolean => {
    return !!(
      updates.emergencyContacts ||
      updates.status === 'emergency' ||
      updates.timeline
    );
  };

  // Add timeline event
  const addTimelineEvent = useCallback(
    async (weddingId: string, timelineEvent: any) => {
      try {
        const wedding = await offlineDB.weddings.get(weddingId);
        if (!wedding) return;

        const updatedTimeline = [
          ...wedding.timeline,
          {
            id: `timeline-${Date.now()}`,
            ...timelineEvent,
            addedAt: new Date().toISOString(),
          },
        ];

        await updateWeddingData(weddingId, { timeline: updatedTimeline });
      } catch (error) {
        console.error('Error adding timeline event:', error);
      }
    },
    [updateWeddingData],
  );

  // Update vendor status
  const updateVendorStatus = useCallback(
    async (weddingId: string, vendorId: string, status: string) => {
      try {
        const wedding = await offlineDB.weddings.get(weddingId);
        if (!wedding) return;

        const updatedVendors = wedding.vendors.map((vendor) =>
          vendor.id === vendorId
            ? { ...vendor, status, updatedAt: new Date().toISOString() }
            : vendor,
        );

        await updateWeddingData(weddingId, { vendors: updatedVendors });
      } catch (error) {
        console.error('Error updating vendor status:', error);
      }
    },
    [updateWeddingData],
  );

  // Initialize sync status monitoring
  useEffect(() => {
    const loadSyncStatus = async () => {
      const status = await syncManager.getStatus();
      setState((prev) => ({ ...prev, syncStatus: status }));
    };

    loadSyncStatus();

    const handleStatusChange = (status: SyncStatus) => {
      setState((prev) => ({ ...prev, syncStatus: status }));
    };

    syncManager.onStatusChange(handleStatusChange);

    return () => {
      syncManager.removeStatusListener(handleStatusChange);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    if (weddingId) {
      loadWeddingData(weddingId);
    } else {
      loadTodaysWeddings();
    }
  }, [weddingId, loadWeddingData, loadTodaysWeddings]);

  // Auto-refresh data
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (weddingId) {
          loadWeddingData(weddingId);
        } else {
          loadTodaysWeddings();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [
    autoRefresh,
    refreshInterval,
    weddingId,
    loadWeddingData,
    loadTodaysWeddings,
  ]);

  return {
    ...state,
    refresh: weddingId ? () => loadWeddingData(weddingId) : loadTodaysWeddings,
    updateWedding: updateWeddingData,
    addTimelineEvent,
    updateVendorStatus,
  };
}

// Hook for cache management
export function useCacheManagement() {
  const [cacheStatus, setCacheStatus] = useState<{
    usage: number;
    size: string;
    quota: string;
    isOptimizing: boolean;
  } | null>(null);

  const loadCacheStatus = useCallback(async () => {
    try {
      const usage = await smartCacheManager.getCacheUsage();
      setCacheStatus({
        usage: usage.usage,
        size: formatBytes(usage.size),
        quota: formatBytes(usage.quota),
        isOptimizing: false,
      });
    } catch (error) {
      console.error('Error loading cache status:', error);
    }
  }, []);

  const optimizeCache = useCallback(async () => {
    try {
      setCacheStatus((prev) => (prev ? { ...prev, isOptimizing: true } : null));
      await smartCacheManager.optimizeStorage();
      await loadCacheStatus();
    } catch (error) {
      console.error('Error optimizing cache:', error);
    } finally {
      setCacheStatus((prev) =>
        prev ? { ...prev, isOptimizing: false } : null,
      );
    }
  }, [loadCacheStatus]);

  const preloadCriticalData = useCallback(async () => {
    try {
      await smartCacheManager.preloadCriticalData();
      await loadCacheStatus();
    } catch (error) {
      console.error('Error preloading critical data:', error);
    }
  }, [loadCacheStatus]);

  useEffect(() => {
    loadCacheStatus();

    // Refresh cache status every 5 minutes
    const interval = setInterval(loadCacheStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadCacheStatus]);

  return {
    cacheStatus,
    optimizeCache,
    preloadCriticalData,
    refreshStatus: loadCacheStatus,
  };
}

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Hook for form auto-save functionality
export function useAutoSave<T>(
  key: string,
  data: T,
  options: {
    interval?: number;
    enabled?: boolean;
    onSave?: (data: T) => void;
  } = {},
) {
  const { interval = 30000, enabled = true, onSave } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Save function
  const save = useCallback(async () => {
    try {
      // Save to IndexedDB or localStorage
      const serializedData = JSON.stringify(data);
      localStorage.setItem(`autosave-${key}`, serializedData);
      localStorage.setItem(
        `autosave-${key}-timestamp`,
        new Date().toISOString(),
      );

      setLastSaved(new Date());
      setIsDirty(false);

      if (onSave) {
        onSave(data);
      }

      console.log(`Auto-saved data for key: ${key}`);
    } catch (error) {
      console.error('Error auto-saving data:', error);
    }
  }, [key, data, onSave]);

  // Load saved data
  const loadSaved = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`autosave-${key}`);
      const timestamp = localStorage.getItem(`autosave-${key}-timestamp`);

      if (saved && timestamp) {
        setLastSaved(new Date(timestamp));
        return JSON.parse(saved);
      }
      return null;
    } catch (error) {
      console.error('Error loading saved data:', error);
      return null;
    }
  }, [key]);

  // Auto-save timer
  useEffect(() => {
    if (enabled && isDirty) {
      const timer = setTimeout(save, interval);
      return () => clearTimeout(timer);
    }
  }, [enabled, isDirty, interval, save]);

  // Track data changes
  useEffect(() => {
    setIsDirty(true);
  }, [data]);

  return {
    save,
    loadSaved,
    lastSaved,
    isDirty,
  };
}
