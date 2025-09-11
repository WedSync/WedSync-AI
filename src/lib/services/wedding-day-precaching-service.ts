'use client';

// =====================================================
// WEDDING DAY PRE-CACHING SERVICE
// Intelligent 24-hour pre-caching system for wedding day coordination
// =====================================================

import { createClient } from '@supabase/supabase-js';

export interface WeddingDayData {
  weddingId: string;
  weddingDate: string;
  timeline: any[];
  vendors: any[];
  contacts: any[];
  emergencyPlan: any;
  weatherInfo: any;
  issues: any[];
  checkpoints: any[];
}

export interface PreCacheStatus {
  isEnabled: boolean;
  lastCacheTime: string | null;
  nextCacheTime: string | null;
  cachedWeddings: string[];
  cacheSize: number;
  status: 'idle' | 'caching' | 'completed' | 'error';
}

class WeddingDayPreCachingService {
  private readonly CACHE_KEY = 'wedding-day-precache';
  private readonly IDB_NAME = 'WedSyncOfflineDB';
  private readonly IDB_VERSION = 2;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeIndexedDB();
  }

  // =====================================================
  // INDEXEDDB INITIALIZATION
  // =====================================================

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.IDB_NAME, this.IDB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB initialization failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Wedding Day Data Store
        if (!db.objectStoreNames.contains('weddingDayData')) {
          const weddingStore = db.createObjectStore('weddingDayData', {
            keyPath: 'weddingId',
          });
          weddingStore.createIndex('weddingDate', 'weddingDate', {
            unique: false,
          });
          weddingStore.createIndex('cacheTime', 'cacheTime', { unique: false });
        }

        // Timeline Events Store
        if (!db.objectStoreNames.contains('timelineEvents')) {
          const timelineStore = db.createObjectStore('timelineEvents', {
            keyPath: 'id',
          });
          timelineStore.createIndex('weddingId', 'weddingId', {
            unique: false,
          });
          timelineStore.createIndex('startTime', 'startTime', {
            unique: false,
          });
        }

        // Vendor Data Store
        if (!db.objectStoreNames.contains('vendors')) {
          const vendorStore = db.createObjectStore('vendors', {
            keyPath: 'id',
          });
          vendorStore.createIndex('weddingId', 'weddingId', { unique: false });
          vendorStore.createIndex('status', 'status', { unique: false });
        }

        // Offline Actions Queue
        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionsStore = db.createObjectStore('offlineActions', {
            keyPath: 'id',
          });
          actionsStore.createIndex('type', 'type', { unique: false });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionsStore.createIndex('priority', 'priority', { unique: false });
        }

        console.log('IndexedDB schema updated');
      };
    });
  }

  // =====================================================
  // WEDDING DAY DETECTION AND SCHEDULING
  // =====================================================

  public async scheduleWeddingDayPreCaching(): Promise<void> {
    try {
      // Get upcoming weddings from Supabase
      const upcomingWeddings = await this.getUpcomingWeddings();

      for (const wedding of upcomingWeddings) {
        const hoursUntilWedding = this.getHoursUntilWedding(
          wedding.weddingDate,
        );

        // Trigger pre-caching for weddings within 24 hours
        if (hoursUntilWedding <= 24 && hoursUntilWedding > 0) {
          console.log(
            `[Pre-Cache] Wedding ${wedding.weddingId} in ${hoursUntilWedding}h - triggering pre-cache`,
          );
          await this.preCacheWeddingDay(wedding.weddingId, wedding.weddingDate);
        }

        // Schedule future pre-caching
        if (hoursUntilWedding > 24) {
          this.schedulePreCacheTimer(
            wedding.weddingId,
            wedding.weddingDate,
            hoursUntilWedding,
          );
        }
      }
    } catch (error) {
      console.error('[Pre-Cache] Scheduling failed:', error);
    }
  }

  private async getUpcomingWeddings(): Promise<
    Array<{ weddingId: string; weddingDate: string }>
  > {
    try {
      // This would typically fetch from your API
      // For now, return mock data - replace with actual API call
      const response = await fetch('/api/weddings/upcoming');
      if (!response.ok) {
        throw new Error('Failed to fetch upcoming weddings');
      }

      return await response.json();
    } catch (error) {
      console.error('[Pre-Cache] Failed to get upcoming weddings:', error);
      return [];
    }
  }

  private getHoursUntilWedding(weddingDate: string): number {
    const now = new Date();
    const wedding = new Date(weddingDate);
    const timeDiff = wedding.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60));
  }

  private schedulePreCacheTimer(
    weddingId: string,
    weddingDate: string,
    hoursUntilWedding: number,
  ): void {
    // Schedule pre-caching to start 24 hours before the wedding
    const delayMs = (hoursUntilWedding - 24) * 60 * 60 * 1000;

    setTimeout(async () => {
      console.log(`[Pre-Cache] Timer triggered for wedding ${weddingId}`);
      await this.preCacheWeddingDay(weddingId, weddingDate);
    }, delayMs);

    console.log(
      `[Pre-Cache] Scheduled pre-cache for wedding ${weddingId} in ${delayMs / 1000 / 60 / 60}h`,
    );
  }

  // =====================================================
  // PRE-CACHING IMPLEMENTATION
  // =====================================================

  public async preCacheWeddingDay(
    weddingId: string,
    weddingDate: string,
  ): Promise<void> {
    try {
      console.log(`[Pre-Cache] Starting pre-cache for wedding ${weddingId}`);
      const startTime = performance.now();

      // 1. Fetch critical wedding day data
      const weddingData = await this.fetchWeddingDayData(weddingId);

      // 2. Store in IndexedDB for ultra-fast access
      await this.storeWeddingDataLocally(weddingData);

      // 3. Cache in service worker for network requests
      await this.cacheCriticalEndpoints(weddingId);

      // 4. Pre-load essential images and assets
      await this.preloadCriticalAssets(weddingData);

      // 5. Update pre-cache status
      await this.updatePreCacheStatus(weddingId, 'completed');

      // 6. Notify service worker
      await this.notifyServiceWorker('PRE_CACHE_WEDDING_DAY', {
        weddingId,
        weddingDate,
        cacheTime: new Date().toISOString(),
      });

      const endTime = performance.now();
      console.log(
        `[Pre-Cache] Completed for wedding ${weddingId} in ${Math.round(endTime - startTime)}ms`,
      );
    } catch (error) {
      console.error(`[Pre-Cache] Failed for wedding ${weddingId}:`, error);
      await this.updatePreCacheStatus(weddingId, 'error');
      throw error;
    }
  }

  private async fetchWeddingDayData(
    weddingId: string,
  ): Promise<WeddingDayData> {
    const baseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';

    // Parallel fetch of critical data
    const [
      timeline,
      vendors,
      contacts,
      emergencyPlan,
      weatherInfo,
      issues,
      checkpoints,
    ] = await Promise.all([
      fetch(`${baseUrl}/api/timeline/wedding/${weddingId}`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${baseUrl}/api/vendors/wedding/${weddingId}`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${baseUrl}/api/contacts/wedding/${weddingId}`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${baseUrl}/api/emergency-plan/wedding/${weddingId}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${baseUrl}/api/weather/wedding/${weddingId}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${baseUrl}/api/issues/wedding/${weddingId}`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${baseUrl}/api/checkpoints/wedding/${weddingId}`)
        .then((r) => r.json())
        .catch(() => []),
    ]);

    return {
      weddingId,
      weddingDate: new Date().toISOString(), // Would be actual wedding date
      timeline,
      vendors,
      contacts,
      emergencyPlan,
      weatherInfo,
      issues,
      checkpoints,
    };
  }

  private async storeWeddingDataLocally(
    weddingData: WeddingDayData,
  ): Promise<void> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['weddingDayData', 'timelineEvents', 'vendors'],
        'readwrite',
      );

      // Store main wedding data
      const weddingStore = transaction.objectStore('weddingDayData');
      weddingStore.put({
        ...weddingData,
        cacheTime: new Date().toISOString(),
      });

      // Store timeline events
      const timelineStore = transaction.objectStore('timelineEvents');
      weddingData.timeline.forEach((event) => {
        timelineStore.put({
          ...event,
          weddingId: weddingData.weddingId,
        });
      });

      // Store vendor data
      const vendorStore = transaction.objectStore('vendors');
      weddingData.vendors.forEach((vendor) => {
        vendorStore.put({
          ...vendor,
          weddingId: weddingData.weddingId,
        });
      });

      transaction.oncomplete = () => {
        console.log(
          `[Pre-Cache] Stored wedding data locally for ${weddingData.weddingId}`,
        );
        resolve();
      };

      transaction.onerror = () => {
        console.error(
          '[Pre-Cache] IndexedDB transaction failed:',
          transaction.error,
        );
        reject(transaction.error);
      };
    });
  }

  private async cacheCriticalEndpoints(weddingId: string): Promise<void> {
    const criticalEndpoints = [
      `/api/timeline/wedding/${weddingId}`,
      `/api/vendors/wedding/${weddingId}`,
      `/api/wedding-coordination/${weddingId}`,
      `/api/issues/wedding/${weddingId}`,
      `/api/weather/wedding/${weddingId}`,
      `/api/emergency-contacts/wedding/${weddingId}`,
      `/api/backup-plans/wedding/${weddingId}`,
      `/api/checkpoints/wedding/${weddingId}`,
    ];

    // Pre-warm the cache by making requests
    const fetchPromises = criticalEndpoints.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          // The service worker will cache this automatically
          console.log(`[Pre-Cache] Pre-warmed cache for ${url}`);
        }
      } catch (error) {
        console.warn(`[Pre-Cache] Failed to pre-warm ${url}:`, error);
      }
    });

    await Promise.allSettled(fetchPromises);
  }

  private async preloadCriticalAssets(
    weddingData: WeddingDayData,
  ): Promise<void> {
    const assetsToPreload: string[] = [];

    // Extract image URLs from wedding data
    weddingData.vendors.forEach((vendor) => {
      if (vendor.profileImage) {
        assetsToPreload.push(vendor.profileImage);
      }
      if (vendor.logo) {
        assetsToPreload.push(vendor.logo);
      }
    });

    // Add critical app assets
    assetsToPreload.push(
      '/icons/icon-192x192.svg',
      '/icons/timeline-192x192.svg',
      '/icons/vendors-192x192.svg',
      '/icons/emergency-192x192.svg',
    );

    // Preload using link rel="prefetch"
    const preloadPromises = assetsToPreload.map(async (url) => {
      return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.onload = link.onerror = () => resolve(url);
        document.head.appendChild(link);

        // Clean up after a short delay
        setTimeout(() => {
          document.head.removeChild(link);
        }, 5000);
      });
    });

    await Promise.allSettled(preloadPromises);
    console.log(
      `[Pre-Cache] Preloaded ${assetsToPreload.length} critical assets`,
    );
  }

  // =====================================================
  // STATUS MANAGEMENT
  // =====================================================

  private async updatePreCacheStatus(
    weddingId: string,
    status: PreCacheStatus['status'],
  ): Promise<void> {
    const statusData: PreCacheStatus = {
      isEnabled: true,
      lastCacheTime: new Date().toISOString(),
      nextCacheTime: null,
      cachedWeddings: [weddingId],
      cacheSize: await this.calculateCacheSize(),
      status,
    };

    localStorage.setItem(
      `${this.CACHE_KEY}-${weddingId}`,
      JSON.stringify(statusData),
    );
  }

  public async getPreCacheStatus(
    weddingId?: string,
  ): Promise<PreCacheStatus | null> {
    try {
      const key = weddingId ? `${this.CACHE_KEY}-${weddingId}` : this.CACHE_KEY;
      const statusJson = localStorage.getItem(key);

      if (!statusJson) {
        return null;
      }

      return JSON.parse(statusJson);
    } catch (error) {
      console.error('[Pre-Cache] Failed to get status:', error);
      return null;
    }
  }

  private async calculateCacheSize(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch (error) {
      console.error('[Pre-Cache] Failed to calculate cache size:', error);
      return 0;
    }
  }

  // =====================================================
  // SERVICE WORKER COMMUNICATION
  // =====================================================

  private async notifyServiceWorker(type: string, data: any): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();

      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        navigator.serviceWorker.controller?.postMessage({ type, data }, [
          messageChannel.port2,
        ]);
      });
    }
  }

  // =====================================================
  // DATA RETRIEVAL (ULTRA-FAST ACCESS)
  // =====================================================

  public async getWeddingDataFast(
    weddingId: string,
  ): Promise<WeddingDayData | null> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(['weddingDayData'], 'readonly');
      const store = transaction.objectStore('weddingDayData');
      const request = store.get(weddingId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async getTimelineEventsFast(weddingId: string): Promise<any[]> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(['timelineEvents'], 'readonly');
      const store = transaction.objectStore('timelineEvents');
      const index = store.index('weddingId');
      const request = index.getAll(weddingId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async getVendorsFast(weddingId: string): Promise<any[]> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(['vendors'], 'readonly');
      const store = transaction.objectStore('vendors');
      const index = store.index('weddingId');
      const request = index.getAll(weddingId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // =====================================================
  // CLEANUP AND MAINTENANCE
  // =====================================================

  public async cleanupExpiredData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep data for 7 days post-wedding

    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(['weddingDayData'], 'readwrite');
      const store = transaction.objectStore('weddingDayData');
      const index = store.index('cacheTime');
      const request = index.openCursor(
        IDBKeyRange.upperBound(cutoffDate.toISOString()),
      );

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('[Pre-Cache] Cleanup completed');
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Singleton instance
export const weddingDayPreCaching = new WeddingDayPreCachingService();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Start scheduling on page load
  window.addEventListener('load', () => {
    weddingDayPreCaching.scheduleWeddingDayPreCaching();
  });

  // Schedule periodic checks every 4 hours
  setInterval(
    () => {
      weddingDayPreCaching.scheduleWeddingDayPreCaching();
    },
    4 * 60 * 60 * 1000,
  );

  // Cleanup expired data daily
  setInterval(
    () => {
      weddingDayPreCaching.cleanupExpiredData();
    },
    24 * 60 * 60 * 1000,
  );
}
