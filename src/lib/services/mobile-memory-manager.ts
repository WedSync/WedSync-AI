/**
 * Mobile Memory Manager - WS-154 Round 2
 *
 * Memory optimization service for handling large guest lists on low-memory devices
 *
 * Features:
 * - Virtual scrolling for large datasets
 * - Intelligent data pagination with preloading
 * - Memory pool management for guest objects
 * - Automatic garbage collection triggers
 * - Low-memory device detection and adaptation
 * - Memory pressure monitoring and response
 * - Efficient data structures for mobile constraints
 */

import type {
  Guest,
  SeatingTable,
  SeatingArrangement,
} from '@/types/mobile-seating';

export interface MemoryConstraints {
  availableMemory: number; // bytes
  deviceMemory: number; // GB
  isLowMemoryDevice: boolean;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface VirtualizationConfig {
  viewportHeight: number;
  itemHeight: number;
  overscan: number; // items to render outside viewport
  chunkSize: number; // items per data chunk
  maxCachedChunks: number;
  preloadThreshold: number; // ms before reaching chunk boundary
}

export interface MemoryPool<T> {
  available: T[];
  inUse: Set<T>;
  maxSize: number;
  currentSize: number;
  factory: () => T;
  reset: (item: T) => void;
}

export interface DataChunk<T> {
  id: string;
  startIndex: number;
  endIndex: number;
  data: T[];
  lastAccessed: number;
  isLoading: boolean;
  memorySize: number;
}

export interface MemoryMetrics {
  totalGuestsLoaded: number;
  virtualizedItems: number;
  memoryUsed: number; // bytes
  cacheHitRate: number;
  gcTriggered: number;
  chunkCacheSize: number;
  memoryPressureEvents: number;
}

class MobileMemoryManager {
  private memoryConstraints: MemoryConstraints;
  private virtualizationConfig: VirtualizationConfig;
  private guestPool: MemoryPool<Guest>;
  private tablePool: MemoryPool<SeatingTable>;
  private dataChunks: Map<string, DataChunk<Guest>> = new Map();
  private memoryMetrics: MemoryMetrics;
  private performanceObserver: PerformanceObserver | null = null;
  private memoryPressureCallback: ((pressure: string) => void) | null = null;

  constructor() {
    this.memoryConstraints = this.detectMemoryConstraints();
    this.virtualizationConfig = this.calculateOptimalVirtualization();
    this.memoryMetrics = this.initializeMetrics();

    // Initialize memory pools
    this.guestPool = this.createGuestPool();
    this.tablePool = this.createTablePool();

    this.setupMemoryMonitoring();
    this.setupPerformanceObserver();
  }

  /**
   * Detect device memory constraints and capabilities
   */
  private detectMemoryConstraints(): MemoryConstraints {
    // Use navigator.deviceMemory if available (Chrome)
    const deviceMemory = (navigator as any).deviceMemory || 2; // Default to 2GB

    // Estimate available memory (rough calculation)
    const availableMemory = deviceMemory * 1024 * 1024 * 1024 * 0.3; // 30% available for app

    // Determine if this is a low-memory device
    const isLowMemoryDevice =
      deviceMemory <= 2 ||
      /Android.*(Go|Lite)/i.test(navigator.userAgent) ||
      availableMemory < 500 * 1024 * 1024; // Less than 500MB

    return {
      availableMemory,
      deviceMemory,
      isLowMemoryDevice,
      memoryPressure: isLowMemoryDevice ? 'medium' : 'low',
    };
  }

  /**
   * Calculate optimal virtualization settings based on device
   */
  private calculateOptimalVirtualization(): VirtualizationConfig {
    const baseConfig: VirtualizationConfig = {
      viewportHeight: 600,
      itemHeight: 60,
      overscan: 5,
      chunkSize: 50,
      maxCachedChunks: 10,
      preloadThreshold: 200,
    };

    // Adjust for low-memory devices
    if (this.memoryConstraints.isLowMemoryDevice) {
      return {
        ...baseConfig,
        overscan: 3, // Reduce overscan
        chunkSize: 25, // Smaller chunks
        maxCachedChunks: 5, // Fewer cached chunks
        preloadThreshold: 100, // Less aggressive preloading
      };
    }

    // Adjust for high-memory devices
    if (this.memoryConstraints.deviceMemory >= 6) {
      return {
        ...baseConfig,
        overscan: 10,
        chunkSize: 100,
        maxCachedChunks: 20,
        preloadThreshold: 500,
      };
    }

    return baseConfig;
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): MemoryMetrics {
    return {
      totalGuestsLoaded: 0,
      virtualizedItems: 0,
      memoryUsed: 0,
      cacheHitRate: 0,
      gcTriggered: 0,
      chunkCacheSize: 0,
      memoryPressureEvents: 0,
    };
  }

  /**
   * Create object pool for guest objects
   */
  private createGuestPool(): MemoryPool<Guest> {
    const maxSize = this.memoryConstraints.isLowMemoryDevice ? 100 : 500;

    return {
      available: [],
      inUse: new Set(),
      maxSize,
      currentSize: 0,
      factory: () =>
        ({
          id: '',
          name: '',
          email: '',
          tableId: null,
          category: 'guest',
          dietaryRequirements: [],
          relationships: [],
        }) as Guest,
      reset: (guest: Guest) => {
        guest.id = '';
        guest.name = '';
        guest.email = '';
        guest.tableId = null;
        guest.category = 'guest';
        guest.dietaryRequirements = [];
        guest.relationships = [];
      },
    };
  }

  /**
   * Create object pool for table objects
   */
  private createTablePool(): MemoryPool<SeatingTable> {
    const maxSize = this.memoryConstraints.isLowMemoryDevice ? 20 : 100;

    return {
      available: [],
      inUse: new Set(),
      maxSize,
      currentSize: 0,
      factory: () =>
        ({
          id: '',
          name: '',
          capacity: 8,
          shape: 'round',
          x: 0,
          y: 0,
          guests: [],
        }) as SeatingTable,
      reset: (table: SeatingTable) => {
        table.id = '';
        table.name = '';
        table.capacity = 8;
        table.shape = 'round';
        table.x = 0;
        table.y = 0;
        table.guests = [];
      },
    };
  }

  /**
   * Setup memory pressure monitoring
   */
  private setupMemoryMonitoring(): void {
    // Modern browsers with memory pressure API
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memInfo = (performance as any).memory;
        const usedJSHeap = memInfo.usedJSHeapSize;
        const totalJSHeap = memInfo.totalJSHeapSize;
        const pressure = usedJSHeap / totalJSHeap;

        let newPressure: MemoryConstraints['memoryPressure'] = 'low';
        if (pressure > 0.9) newPressure = 'critical';
        else if (pressure > 0.7) newPressure = 'high';
        else if (pressure > 0.5) newPressure = 'medium';

        if (newPressure !== this.memoryConstraints.memoryPressure) {
          this.memoryConstraints.memoryPressure = newPressure;
          this.handleMemoryPressureChange(newPressure);
          this.memoryMetrics.memoryPressureEvents++;
        }
      };

      // Check memory pressure every 5 seconds
      setInterval(checkMemoryPressure, 5000);
    }
  }

  /**
   * Setup performance observer for monitoring
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === 'measure' &&
              entry.name.includes('guest-render')
            ) {
              // Monitor guest rendering performance
              if (entry.duration > 16.67) {
                // 60fps threshold
                console.warn(
                  `[MemoryManager] Slow guest render: ${entry.duration.toFixed(2)}ms`,
                );
                this.triggerMemoryOptimization();
              }
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn(
          '[MemoryManager] PerformanceObserver not supported:',
          error,
        );
      }
    }
  }

  /**
   * Handle memory pressure changes
   */
  private handleMemoryPressureChange(
    pressure: MemoryConstraints['memoryPressure'],
  ): void {
    switch (pressure) {
      case 'critical':
        this.aggressiveCleanup();
        break;
      case 'high':
        this.moderateCleanup();
        break;
      case 'medium':
        this.gentleCleanup();
        break;
      default:
        // No action needed for low pressure
        break;
    }

    // Notify callback if set
    if (this.memoryPressureCallback) {
      this.memoryPressureCallback(pressure);
    }
  }

  /**
   * Aggressive cleanup for critical memory pressure
   */
  private aggressiveCleanup(): void {
    // Clear all but the most recent chunks
    const sortedChunks = Array.from(this.dataChunks.entries()).sort(
      ([, a], [, b]) => b.lastAccessed - a.lastAccessed,
    );

    const chunksToKeep = Math.max(
      1,
      Math.floor(this.virtualizationConfig.maxCachedChunks / 4),
    );

    sortedChunks.slice(chunksToKeep).forEach(([key]) => {
      this.dataChunks.delete(key);
    });

    // Aggressive object pool cleanup
    this.cleanupObjectPool(this.guestPool, 0.8);
    this.cleanupObjectPool(this.tablePool, 0.8);

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        this.memoryMetrics.gcTriggered++;
      } catch (error) {
        // GC not available in production builds
      }
    }

    console.warn(
      '[MemoryManager] Critical memory pressure - aggressive cleanup performed',
    );
  }

  /**
   * Moderate cleanup for high memory pressure
   */
  private moderateCleanup(): void {
    // Keep only half the chunks
    const sortedChunks = Array.from(this.dataChunks.entries()).sort(
      ([, a], [, b]) => b.lastAccessed - a.lastAccessed,
    );

    const chunksToKeep = Math.floor(
      this.virtualizationConfig.maxCachedChunks / 2,
    );

    sortedChunks.slice(chunksToKeep).forEach(([key]) => {
      this.dataChunks.delete(key);
    });

    // Moderate object pool cleanup
    this.cleanupObjectPool(this.guestPool, 0.6);
    this.cleanupObjectPool(this.tablePool, 0.6);
  }

  /**
   * Gentle cleanup for medium memory pressure
   */
  private gentleCleanup(): void {
    // Remove oldest chunks beyond limit
    const sortedChunks = Array.from(this.dataChunks.entries()).sort(
      ([, a], [, b]) => b.lastAccessed - a.lastAccessed,
    );

    if (sortedChunks.length > this.virtualizationConfig.maxCachedChunks) {
      sortedChunks
        .slice(this.virtualizationConfig.maxCachedChunks)
        .forEach(([key]) => {
          this.dataChunks.delete(key);
        });
    }

    // Gentle object pool cleanup
    this.cleanupObjectPool(this.guestPool, 0.4);
    this.cleanupObjectPool(this.tablePool, 0.4);
  }

  /**
   * Clean up object pool by removing unused objects
   */
  private cleanupObjectPool<T>(
    pool: MemoryPool<T>,
    cleanupRatio: number,
  ): void {
    const itemsToRemove = Math.floor(pool.available.length * cleanupRatio);
    pool.available.splice(0, itemsToRemove);
    pool.currentSize -= itemsToRemove;
  }

  /**
   * Get object from pool or create new one
   */
  private getFromPool<T>(pool: MemoryPool<T>): T {
    let item = pool.available.pop();

    if (!item && pool.currentSize < pool.maxSize) {
      item = pool.factory();
      pool.currentSize++;
    } else if (!item) {
      // Pool is full, create temporary object (will be GC'd)
      item = pool.factory();
    }

    if (item) {
      pool.inUse.add(item);
    }

    return item!;
  }

  /**
   * Return object to pool
   */
  private returnToPool<T>(pool: MemoryPool<T>, item: T): void {
    if (pool.inUse.has(item)) {
      pool.inUse.delete(item);
      pool.reset(item);

      if (pool.available.length < pool.maxSize / 2) {
        pool.available.push(item);
      }
      // Otherwise let it be garbage collected
    }
  }

  /**
   * Virtualize guest list for efficient rendering
   */
  async virtualizeGuestList(
    guests: Guest[],
    scrollTop: number,
    viewportHeight: number,
  ): Promise<{
    visibleItems: Guest[];
    totalHeight: number;
    startIndex: number;
    endIndex: number;
    placeholders: { before: number; after: number };
  }> {
    const { itemHeight, overscan } = this.virtualizationConfig;
    const totalHeight = guests.length * itemHeight;

    // Calculate visible range
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan,
    );
    const endIndex = Math.min(
      guests.length - 1,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan,
    );

    // Load required data chunks
    const visibleItems = await this.loadGuestChunks(
      guests,
      startIndex,
      endIndex,
    );

    // Calculate placeholder heights
    const beforeHeight = startIndex * itemHeight;
    const afterHeight = (guests.length - endIndex - 1) * itemHeight;

    this.memoryMetrics.virtualizedItems = endIndex - startIndex + 1;
    this.memoryMetrics.totalGuestsLoaded = guests.length;

    return {
      visibleItems,
      totalHeight,
      startIndex,
      endIndex,
      placeholders: {
        before: beforeHeight,
        after: afterHeight,
      },
    };
  }

  /**
   * Load guest data chunks efficiently
   */
  private async loadGuestChunks(
    allGuests: Guest[],
    startIndex: number,
    endIndex: number,
  ): Promise<Guest[]> {
    const { chunkSize } = this.virtualizationConfig;
    const requiredChunks: string[] = [];

    // Determine which chunks are needed
    for (let i = startIndex; i <= endIndex; i += chunkSize) {
      const chunkStart = Math.floor(i / chunkSize) * chunkSize;
      const chunkId = `chunk_${chunkStart}_${Math.min(chunkStart + chunkSize - 1, allGuests.length - 1)}`;
      requiredChunks.push(chunkId);
    }

    // Load chunks (from cache or create new)
    const chunkPromises = requiredChunks.map((chunkId) =>
      this.getOrCreateChunk(chunkId, allGuests),
    );
    const chunks = await Promise.all(chunkPromises);

    // Extract visible items from chunks
    const visibleItems: Guest[] = [];

    for (const chunk of chunks) {
      if (!chunk) continue;

      const chunkStartInRange = Math.max(startIndex, chunk.startIndex);
      const chunkEndInRange = Math.min(endIndex, chunk.endIndex);

      for (let i = chunkStartInRange; i <= chunkEndInRange; i++) {
        const itemIndex = i - chunk.startIndex;
        if (itemIndex >= 0 && itemIndex < chunk.data.length) {
          visibleItems.push(chunk.data[itemIndex]);
        }
      }

      // Update last accessed time
      chunk.lastAccessed = Date.now();
    }

    // Update cache hit rate
    const cacheHits = chunks.filter(
      (chunk) => chunk && !chunk.isLoading,
    ).length;
    this.memoryMetrics.cacheHitRate = cacheHits / requiredChunks.length;

    return visibleItems;
  }

  /**
   * Get chunk from cache or create new one
   */
  private async getOrCreateChunk(
    chunkId: string,
    allGuests: Guest[],
  ): Promise<DataChunk<Guest> | null> {
    // Check cache first
    let chunk = this.dataChunks.get(chunkId);

    if (chunk) {
      return chunk;
    }

    // Parse chunk boundaries from ID
    const [, startStr, endStr] = chunkId.split('_');
    const startIndex = parseInt(startStr);
    const endIndex = parseInt(endStr);

    // Create new chunk
    chunk = {
      id: chunkId,
      startIndex,
      endIndex,
      data: [],
      lastAccessed: Date.now(),
      isLoading: true,
      memorySize: 0,
    };

    // Add to cache immediately to prevent duplicate loads
    this.dataChunks.set(chunkId, chunk);

    try {
      // Extract data for this chunk
      const chunkData = allGuests.slice(startIndex, endIndex + 1);

      // Use object pool for memory efficiency
      const pooledGuests = chunkData.map((guest) => {
        const pooledGuest = this.getFromPool(this.guestPool);
        Object.assign(pooledGuest, guest);
        return pooledGuest;
      });

      chunk.data = pooledGuests;
      chunk.isLoading = false;
      chunk.memorySize = this.estimateChunkMemorySize(chunk);

      // Trigger cleanup if we have too many chunks
      if (this.dataChunks.size > this.virtualizationConfig.maxCachedChunks) {
        this.cleanupOldChunks();
      }

      this.memoryMetrics.chunkCacheSize = this.dataChunks.size;

      return chunk;
    } catch (error) {
      console.error('[MemoryManager] Failed to create chunk:', error);
      this.dataChunks.delete(chunkId);
      return null;
    }
  }

  /**
   * Clean up old chunks to maintain memory limits
   */
  private cleanupOldChunks(): void {
    const chunks = Array.from(this.dataChunks.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    ); // Oldest first

    const chunksToRemove =
      chunks.length - this.virtualizationConfig.maxCachedChunks + 1;

    for (let i = 0; i < chunksToRemove; i++) {
      const [chunkId, chunk] = chunks[i];

      // Return guests to pool before removing chunk
      chunk.data.forEach((guest) => this.returnToPool(this.guestPool, guest));

      this.dataChunks.delete(chunkId);
    }
  }

  /**
   * Estimate memory size of a data chunk
   */
  private estimateChunkMemorySize(chunk: DataChunk<Guest>): number {
    // Rough estimate: each guest object ~200 bytes
    return chunk.data.length * 200;
  }

  /**
   * Trigger memory optimization
   */
  private triggerMemoryOptimization(): void {
    if (this.memoryConstraints.memoryPressure === 'low') {
      this.gentleCleanup();
    } else if (this.memoryConstraints.memoryPressure === 'medium') {
      this.moderateCleanup();
    }
  }

  /**
   * Public API methods
   */

  /**
   * Get current memory metrics
   */
  getMemoryMetrics(): MemoryMetrics & { constraints: MemoryConstraints } {
    return {
      ...this.memoryMetrics,
      constraints: this.memoryConstraints,
    };
  }

  /**
   * Set memory pressure change callback
   */
  setMemoryPressureCallback(callback: (pressure: string) => void): void {
    this.memoryPressureCallback = callback;
  }

  /**
   * Manually trigger memory cleanup
   */
  forceCleanup(): void {
    this.moderateCleanup();
  }

  /**
   * Update virtualization config
   */
  updateVirtualizationConfig(config: Partial<VirtualizationConfig>): void {
    this.virtualizationConfig = { ...this.virtualizationConfig, ...config };
  }

  /**
   * Clear all caches and pools
   */
  clearAllMemory(): void {
    // Clear data chunks
    for (const [, chunk] of this.dataChunks) {
      chunk.data.forEach((guest) => this.returnToPool(this.guestPool, guest));
    }
    this.dataChunks.clear();

    // Clear object pools
    this.guestPool.available = [];
    this.guestPool.inUse.clear();
    this.guestPool.currentSize = 0;

    this.tablePool.available = [];
    this.tablePool.inUse.clear();
    this.tablePool.currentSize = 0;

    // Reset metrics
    this.memoryMetrics = this.initializeMetrics();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.clearAllMemory();
    this.memoryPressureCallback = null;
  }
}

// Export singleton instance
export const mobileMemoryManager = new MobileMemoryManager();
