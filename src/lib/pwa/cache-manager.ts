/**
 * WS-171: PWA Cache Manager
 * Intelligent offline caching strategy for critical wedding data
 */

import { createClient } from '@supabase/supabase-js';

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  priority: CachePriority;
  size: number;
  expirationTime?: number;
  lastAccessed: number;
  accessCount: number;
  weddingId?: string;
  dataType: WeddingDataType;
}

export enum CachePriority {
  CRITICAL = 5, // Wedding day timeline, active tasks
  HIGH = 4, // Vendor contacts, venue details
  MEDIUM = 3, // Guest list, preferences
  LOW = 2, // Historical data, completed tasks
  BACKGROUND = 1, // Analytics, logs
}

export enum WeddingDataType {
  TIMELINE = 'timeline',
  VENDORS = 'vendors',
  GUESTS = 'guests',
  TASKS = 'tasks',
  VENUES = 'venues',
  PHOTOS = 'photos',
  DOCUMENTS = 'documents',
  PREFERENCES = 'preferences',
  ANALYTICS = 'analytics',
  COMMUNICATIONS = 'communications',
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  defaultTTL: number; // Default time to live in ms
  priorityTTL: Record<CachePriority, number>;
  compressionThreshold: number; // Compress entries larger than this (bytes)
  cleanupInterval: number; // Cleanup interval in ms
  persistOffline: boolean; // Persist cache across sessions
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  priorityDistribution: Record<CachePriority, number>;
  dataTypeDistribution: Record<WeddingDataType, number>;
  memoryUsage: number;
  lastCleanup: number;
}

export class PWACacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private accessLog: Map<string, number[]> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private supabase: any;
  private compressionSupported: boolean;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 50, // 50MB default
      defaultTTL: config.defaultTTL || 3600000, // 1 hour
      priorityTTL: config.priorityTTL || {
        [CachePriority.CRITICAL]: 86400000, // 24 hours
        [CachePriority.HIGH]: 43200000, // 12 hours
        [CachePriority.MEDIUM]: 21600000, // 6 hours
        [CachePriority.LOW]: 10800000, // 3 hours
        [CachePriority.BACKGROUND]: 3600000, // 1 hour
      },
      compressionThreshold: config.compressionThreshold || 1024, // 1KB
      cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
      persistOffline: config.persistOffline ?? true,
    };

    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      priorityDistribution: {} as Record<CachePriority, number>,
      dataTypeDistribution: {} as Record<WeddingDataType, number>,
      memoryUsage: 0,
      lastCleanup: Date.now(),
    };

    this.compressionSupported = 'CompressionStream' in window;
    this.initializeSupabase();
    this.loadPersistedCache();
    this.startCleanupTimer();
    this.setupVisibilityHandlers();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Set cached data with intelligent prioritization
   */
  async set(
    key: string,
    data: any,
    options: {
      priority?: CachePriority;
      dataType?: WeddingDataType;
      weddingId?: string;
      customTTL?: number;
      compress?: boolean;
    } = {},
  ): Promise<boolean> {
    try {
      const priority =
        options.priority || this.determinePriority(key, options.dataType);
      const dataType = options.dataType || this.determineDataType(key);
      const ttl = options.customTTL || this.config.priorityTTL[priority];

      let processedData = data;
      let size = this.estimateSize(data);

      // Compress large entries if supported
      if (
        this.compressionSupported &&
        (options.compress || size > this.config.compressionThreshold)
      ) {
        processedData = await this.compressData(data);
        size = this.estimateSize(processedData);
      }

      // Check if we need to make space
      if (!this.hasSpaceFor(size)) {
        await this.makeSpaceFor(size, priority);
      }

      const entry: CacheEntry = {
        key,
        data: processedData,
        timestamp: Date.now(),
        priority,
        size,
        expirationTime: Date.now() + ttl,
        lastAccessed: Date.now(),
        accessCount: 0,
        weddingId: options.weddingId,
        dataType,
      };

      this.cache.set(key, entry);
      this.updateStats('set', entry);

      // Persist to IndexedDB for offline access
      if (this.config.persistOffline) {
        await this.persistEntry(entry);
      }

      // Track cache operation
      await this.trackCacheOperation('set', key, priority, dataType, size);

      return true;
    } catch (error) {
      console.error('Failed to cache data:', error);
      return false;
    }
  }

  /**
   * Get cached data with access tracking
   */
  async get(key: string): Promise<any> {
    try {
      let entry = this.cache.get(key);

      // Try to load from persistent storage if not in memory
      if (!entry && this.config.persistOffline) {
        entry = await this.loadPersistedEntry(key);
        if (entry) {
          this.cache.set(key, entry);
        }
      }

      if (!entry) {
        this.updateStats('miss', null);
        return null;
      }

      // Check expiration
      if (this.isExpired(entry)) {
        await this.delete(key);
        this.updateStats('expired', entry);
        return null;
      }

      // Update access metrics
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.trackAccess(key);

      let data = entry.data;

      // Decompress if needed
      if (this.isCompressed(data)) {
        data = await this.decompressData(data);
      }

      this.updateStats('hit', entry);

      // Track cache hit
      await this.trackCacheOperation(
        'get',
        key,
        entry.priority,
        entry.dataType,
        entry.size,
      );

      return data;
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      this.updateStats('error', null);
      return null;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.updateStats('delete', entry);

        // Remove from persistent storage
        if (this.config.persistOffline) {
          await this.deletePersistedEntry(key);
        }

        await this.trackCacheOperation(
          'delete',
          key,
          entry.priority,
          entry.dataType,
          entry.size,
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete cache entry:', error);
      return false;
    }
  }

  /**
   * Clear cache by criteria
   */
  async clear(
    criteria: {
      priority?: CachePriority;
      dataType?: WeddingDataType;
      weddingId?: string;
      olderThan?: number;
    } = {},
  ): Promise<number> {
    let deletedCount = 0;

    for (const [key, entry] of this.cache) {
      let shouldDelete = false;

      if (criteria.priority && entry.priority !== criteria.priority) continue;
      if (criteria.dataType && entry.dataType !== criteria.dataType) continue;
      if (criteria.weddingId && entry.weddingId !== criteria.weddingId)
        continue;
      if (criteria.olderThan && entry.timestamp > criteria.olderThan) continue;

      shouldDelete = true;

      if (shouldDelete) {
        await this.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Invalidate cache entries by pattern or criteria
   */
  async invalidate(pattern: string | RegExp, force = false): Promise<number> {
    let invalidatedCount = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const [key, entry] of this.cache) {
      if (regex.test(key)) {
        // Mark as expired rather than delete for critical data
        if (!force && entry.priority === CachePriority.CRITICAL) {
          entry.expirationTime = Date.now() - 1; // Expire immediately
        } else {
          await this.delete(key);
        }
        invalidatedCount++;
      }
    }

    await this.trackCacheOperation(
      'invalidate',
      pattern.toString(),
      undefined,
      undefined,
      invalidatedCount,
    );
    return invalidatedCount;
  }

  /**
   * Preload critical wedding data
   */
  async preloadWeddingData(weddingId: string): Promise<void> {
    const criticalDataTypes = [
      WeddingDataType.TIMELINE,
      WeddingDataType.VENDORS,
      WeddingDataType.TASKS,
      WeddingDataType.VENUES,
    ];

    // This would typically fetch from your API
    for (const dataType of criticalDataTypes) {
      try {
        const key = `wedding:${weddingId}:${dataType}`;
        if (!this.has(key)) {
          // Placeholder for actual data fetching logic
          const data = await this.fetchWeddingData(weddingId, dataType);
          if (data) {
            await this.set(key, data, {
              priority: CachePriority.CRITICAL,
              dataType,
              weddingId,
            });
          }
        }
      } catch (error) {
        console.error(
          `Failed to preload ${dataType} for wedding ${weddingId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * Export cache for debugging
   */
  export(): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: {
        ...entry,
        data: '[DATA_OMITTED]', // Don't export actual data for security
      },
    }));
  }

  /**
   * Private helper methods
   */

  private determinePriority(
    key: string,
    dataType?: WeddingDataType,
  ): CachePriority {
    // Timeline and active tasks are critical
    if (
      key.includes('timeline') ||
      key.includes('active-task') ||
      dataType === WeddingDataType.TIMELINE
    ) {
      return CachePriority.CRITICAL;
    }

    // Vendor and venue data is high priority
    if (
      key.includes('vendor') ||
      key.includes('venue') ||
      dataType === WeddingDataType.VENDORS ||
      dataType === WeddingDataType.VENUES
    ) {
      return CachePriority.HIGH;
    }

    // Guest and task data is medium priority
    if (
      key.includes('guest') ||
      key.includes('task') ||
      dataType === WeddingDataType.GUESTS ||
      dataType === WeddingDataType.TASKS
    ) {
      return CachePriority.MEDIUM;
    }

    // Analytics and logs are background priority
    if (
      key.includes('analytics') ||
      key.includes('log') ||
      dataType === WeddingDataType.ANALYTICS
    ) {
      return CachePriority.BACKGROUND;
    }

    return CachePriority.MEDIUM;
  }

  private determineDataType(key: string): WeddingDataType {
    if (key.includes('timeline')) return WeddingDataType.TIMELINE;
    if (key.includes('vendor')) return WeddingDataType.VENDORS;
    if (key.includes('guest')) return WeddingDataType.GUESTS;
    if (key.includes('task')) return WeddingDataType.TASKS;
    if (key.includes('venue')) return WeddingDataType.VENUES;
    if (key.includes('photo')) return WeddingDataType.PHOTOS;
    if (key.includes('document')) return WeddingDataType.DOCUMENTS;
    if (key.includes('preference')) return WeddingDataType.PREFERENCES;
    if (key.includes('analytics')) return WeddingDataType.ANALYTICS;
    if (key.includes('communication')) return WeddingDataType.COMMUNICATIONS;

    return WeddingDataType.PREFERENCES; // Default
  }

  private isExpired(entry: CacheEntry): boolean {
    return entry.expirationTime ? Date.now() > entry.expirationTime : false;
  }

  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2;
    }
  }

  private hasSpaceFor(size: number): boolean {
    const currentSizeMB = this.stats.totalSize / (1024 * 1024);
    const requiredSizeMB = size / (1024 * 1024);
    return currentSizeMB + requiredSizeMB <= this.config.maxSize;
  }

  private async makeSpaceFor(
    requiredSize: number,
    targetPriority: CachePriority,
  ): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Sort by priority (lower first), then by last accessed (older first)
        if (a.entry.priority !== b.entry.priority) {
          return a.entry.priority - b.entry.priority;
        }
        return a.entry.lastAccessed - b.entry.lastAccessed;
      });

    let freedSpace = 0;
    for (const { key, entry } of entries) {
      // Don't delete entries with higher or equal priority unless absolutely necessary
      if (entry.priority >= targetPriority && freedSpace < requiredSize) {
        continue;
      }

      await this.delete(key);
      freedSpace += entry.size;

      if (freedSpace >= requiredSize) {
        break;
      }
    }
  }

  private trackAccess(key: string): void {
    const now = Date.now();
    const accesses = this.accessLog.get(key) || [];
    accesses.push(now);

    // Keep only last 10 accesses
    if (accesses.length > 10) {
      accesses.shift();
    }

    this.accessLog.set(key, accesses);
  }

  private updateStats(operation: string, entry: CacheEntry | null): void {
    switch (operation) {
      case 'set':
        if (entry) {
          this.stats.totalEntries++;
          this.stats.totalSize += entry.size;
          this.stats.priorityDistribution[entry.priority] =
            (this.stats.priorityDistribution[entry.priority] || 0) + 1;
          this.stats.dataTypeDistribution[entry.dataType] =
            (this.stats.dataTypeDistribution[entry.dataType] || 0) + 1;
        }
        break;
      case 'hit':
        this.stats.hitRate = this.calculateHitRate();
        break;
      case 'miss':
        this.stats.missRate = this.calculateMissRate();
        break;
      case 'delete':
        if (entry) {
          this.stats.totalEntries--;
          this.stats.totalSize -= entry.size;
          this.stats.priorityDistribution[entry.priority]--;
          this.stats.dataTypeDistribution[entry.dataType]--;
        }
        break;
    }
  }

  private calculateHitRate(): number {
    // This would be calculated based on actual hit/miss tracking
    const totalHits = this.cache.size;
    const totalRequests = totalHits + 10; // Placeholder
    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  private calculateMissRate(): number {
    return 100 - this.calculateHitRate();
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      this.stats.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
  }

  private async compressData(data: any): Promise<any> {
    if (!this.compressionSupported) return data;

    try {
      const jsonString = JSON.stringify(data);
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(jsonString));
      writer.close();

      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      return {
        compressed: true,
        data: new Uint8Array(
          chunks.reduce((acc, chunk) => [...acc, ...chunk], []),
        ),
      };
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  private async decompressData(compressedData: any): Promise<any> {
    if (!compressedData.compressed) return compressedData;

    try {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(compressedData.data);
      writer.close();

      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const decompressed = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])),
      );

      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression failed:', error);
      return null;
    }
  }

  private isCompressed(data: any): boolean {
    return data && typeof data === 'object' && data.compressed === true;
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private async cleanup(): Promise<void> {
    let cleanedCount = 0;

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        await this.delete(key);
        cleanedCount++;
      }
    }

    this.stats.lastCleanup = Date.now();

    if (cleanedCount > 0) {
      await this.trackCacheOperation(
        'cleanup',
        'expired_entries',
        undefined,
        undefined,
        cleanedCount,
      );
    }
  }

  private setupVisibilityHandlers(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App going to background - persist critical data
        this.persistCriticalData();
      } else {
        // App coming to foreground - check for updates
        this.refreshCriticalData();
      }
    });
  }

  private async persistCriticalData(): Promise<void> {
    if (!this.config.persistOffline) return;

    for (const [key, entry] of this.cache) {
      if (entry.priority === CachePriority.CRITICAL) {
        await this.persistEntry(entry);
      }
    }
  }

  private async refreshCriticalData(): Promise<void> {
    // Check if critical data needs refreshing
    for (const [key, entry] of this.cache) {
      if (entry.priority === CachePriority.CRITICAL) {
        const ageMinutes = (Date.now() - entry.timestamp) / 60000;
        if (ageMinutes > 30) {
          // Refresh critical data older than 30 minutes
          // Trigger background refresh
          this.backgroundRefresh(key, entry);
        }
      }
    }
  }

  private async backgroundRefresh(
    key: string,
    entry: CacheEntry,
  ): Promise<void> {
    try {
      // This would typically call your API to refresh the data
      const freshData = await this.fetchFreshData(key, entry);
      if (freshData) {
        await this.set(key, freshData, {
          priority: entry.priority,
          dataType: entry.dataType,
          weddingId: entry.weddingId,
        });
      }
    } catch (error) {
      console.warn('Background refresh failed for', key, error);
    }
  }

  private async persistEntry(entry: CacheEntry): Promise<void> {
    // IndexedDB persistence would go here
    // For now, using localStorage as fallback with security measures
    try {
      // Sanitize entry before persistence
      const sanitizedEntry = {
        ...entry,
        data: this.sanitizeData(entry.data),
      };

      const serialized = JSON.stringify(sanitizedEntry);

      // Check storage quota before writing
      if (this.checkStorageQuota(serialized.length)) {
        localStorage.setItem(`cache:${entry.key}`, serialized);
      } else {
        throw new Error('Storage quota exceeded');
      }
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
      // Clean up old entries if storage is full
      if (
        error.message?.includes('quota') ||
        error.name === 'QuotaExceededError'
      ) {
        await this.emergencyCleanup();
      }
    }
  }

  private async loadPersistedEntry(key: string): Promise<CacheEntry | null> {
    try {
      const serialized = localStorage.getItem(`cache:${key}`);
      if (!serialized) {
        return null;
      }

      const entry = JSON.parse(serialized);

      // Validate entry structure for security
      if (!entry || typeof entry !== 'object' || !entry.key || !entry.data) {
        console.warn(`Invalid cache entry structure for key: ${key}`);
        localStorage.removeItem(`cache:${key}`);
        return null;
      }

      return entry as CacheEntry;
    } catch (error) {
      console.warn('Failed to load persisted cache entry:', error);
      // Remove corrupted entry
      try {
        localStorage.removeItem(`cache:${key}`);
      } catch {
        // Silently fail if storage is not accessible
      }
    }
    return null;
  }

  private async deletePersistedEntry(key: string): Promise<void> {
    try {
      localStorage.removeItem(`cache:${key}`);
    } catch (error) {
      console.warn('Failed to delete persisted cache entry:', error);
    }
  }

  private async loadPersistedCache(): Promise<void> {
    if (!this.config.persistOffline) return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith('cache:'),
      );
      for (const storageKey of keys) {
        const cacheKey = storageKey.replace('cache:', '');
        const entry = await this.loadPersistedEntry(cacheKey);
        if (entry && !this.isExpired(entry)) {
          this.cache.set(cacheKey, entry);
        } else if (entry) {
          // Clean up expired persisted entries
          await this.deletePersistedEntry(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted cache:', error);
    }
  }

  private async fetchWeddingData(
    weddingId: string,
    dataType: WeddingDataType,
  ): Promise<any> {
    // Placeholder for actual data fetching
    // This would integrate with your existing API layer
    return null;
  }

  private async fetchFreshData(key: string, entry: CacheEntry): Promise<any> {
    // Placeholder for fresh data fetching
    return null;
  }

  private async trackCacheOperation(
    operation: string,
    key: string,
    priority?: CachePriority,
    dataType?: WeddingDataType,
    size?: number,
  ): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_cache_operations').insert({
          operation,
          cache_key: key,
          priority,
          data_type: dataType,
          size_bytes: size,
          timestamp: new Date().toISOString(),
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track cache operation:', error);
      }
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Security helper methods
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove any potential script content
      return data.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '',
      );
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }
    return data;
  }

  private checkStorageQuota(additionalBytes: number): boolean {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        // This is async but we'll use a simple check for now
        const currentUsage = new Blob([localStorage.getItem('')]).size;
        const availableSpace = 5 * 1024 * 1024; // Assume 5MB limit
        return currentUsage + additionalBytes < availableSpace;
      }
      return true; // Assume storage is available if we can't check
    } catch {
      return false;
    }
  }

  private async emergencyCleanup(): Promise<void> {
    // Remove oldest non-critical entries
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .filter(({ entry }) => entry.priority !== CachePriority.CRITICAL)
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    // Remove up to 25% of non-critical entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      await this.delete(entries[i].key);
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
    this.accessLog.clear();
  }
}

// Export singleton instance
export const cacheManager =
  typeof window !== 'undefined' ? new PWACacheManager() : null;
