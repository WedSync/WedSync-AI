'use client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class FloristCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up expired entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
const floristCache = new FloristCache();

// Specialized cache functions for florist operations
export const FloristCacheManager = {
  // Cache key generators
  generateFlowerSearchKey: (query: string, filters: any) =>
    `flower_search:${query}:${JSON.stringify(filters)}`,

  generateColorPaletteKey: (
    baseColors: string[],
    style: string,
    season: string,
  ) => `color_palette:${baseColors.join(',')}:${style}:${season}`,

  generateArrangementKey: (template: string, items: any[]) =>
    `arrangement:${template}:${JSON.stringify(items)}`,

  generateSustainabilityKey: (flowers: string[], season: string) =>
    `sustainability:${flowers.join(',')}:${season}`,

  // Flower search caching
  cacheFlowerSearch: (
    key: string,
    results: any[],
    ttl: number = 10 * 60 * 1000,
  ) => {
    floristCache.set(key, results, ttl);
  },

  getCachedFlowerSearch: (key: string) => {
    return floristCache.get<any[]>(key);
  },

  // Color palette caching
  cacheColorPalette: (
    key: string,
    palette: any,
    ttl: number = 30 * 60 * 1000,
  ) => {
    floristCache.set(key, palette, ttl);
  },

  getCachedColorPalette: (key: string) => {
    return floristCache.get<any>(key);
  },

  // Arrangement caching
  cacheArrangement: (
    key: string,
    arrangement: any,
    ttl: number = 15 * 60 * 1000,
  ) => {
    floristCache.set(key, arrangement, ttl);
  },

  getCachedArrangement: (key: string) => {
    return floristCache.get<any>(key);
  },

  // Sustainability analysis caching
  cacheSustainabilityAnalysis: (
    key: string,
    analysis: any,
    ttl: number = 20 * 60 * 1000,
  ) => {
    floristCache.set(key, analysis, ttl);
  },

  getCachedSustainabilityAnalysis: (key: string) => {
    return floristCache.get<any>(key);
  },

  // Cache management
  invalidatePattern: (pattern: string) => {
    const keysToDelete: string[] = [];

    for (const key of floristCache.getStats().keys) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => floristCache.delete(key));
  },

  clearAll: () => floristCache.clear(),

  getStats: () => floristCache.getStats(),
};

// Browser storage fallback for persistent caching
export const PersistentFloristCache = {
  set: (key: string, data: any, ttl: number = 60 * 60 * 1000) => {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      localStorage.setItem(`florist_cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to store in persistent cache:', error);
    }
  },

  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(`florist_cache_${key}`);

      if (!cached) return null;

      const cacheData = JSON.parse(cached);

      if (Date.now() - cacheData.timestamp > cacheData.ttl) {
        localStorage.removeItem(`florist_cache_${key}`);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to retrieve from persistent cache:', error);
      return null;
    }
  },

  delete: (key: string) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(`florist_cache_${key}`);
    } catch (error) {
      console.warn('Failed to delete from persistent cache:', error);
    }
  },

  clear: () => {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('florist_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  },
};

// Service Worker integration for offline caching
export const ServiceWorkerCache = {
  isSupported: () => {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  },

  registerServiceWorker: async () => {
    if (!ServiceWorkerCache.isSupported()) return;

    try {
      const registration =
        await navigator.serviceWorker.register('/sw-florist.js');
      console.log('Florist SW registered:', registration);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  },

  sendMessage: (message: any) => {
    if (!ServiceWorkerCache.isSupported()) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage(message);
    });
  },

  cacheFloristData: (data: any) => {
    ServiceWorkerCache.sendMessage({
      type: 'CACHE_FLORIST_DATA',
      data,
    });
  },

  preloadForOffline: (weddingId?: string, season?: string) => {
    ServiceWorkerCache.sendMessage({
      type: 'PRELOAD_FLORIST_DATA',
      data: { weddingId, season },
    });
  },
};

// Initialize service worker on import
if (typeof window !== 'undefined') {
  ServiceWorkerCache.registerServiceWorker();
}

export default FloristCacheManager;
