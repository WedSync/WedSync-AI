/**
 * MobileMemoryManager - Efficient memory management for mobile analytics
 *
 * Features:
 * - Automatic garbage collection triggers
 * - Memory pool management for frequent allocations
 * - Lazy loading and unloading of analytics data
 * - Memory pressure monitoring and response
 * - Large object detection and optimization
 * - Memory leak detection and prevention
 * - Background memory cleanup
 * - Device-specific memory optimizations
 */

interface MemoryConfig {
  maxHeapSize: number; // Maximum heap size in bytes
  warningThreshold: number; // Warning threshold (0-1)
  criticalThreshold: number; // Critical threshold (0-1)
  gcTriggerThreshold: number; // GC trigger threshold (0-1)
  poolSize: number; // Object pool size
  maxObjectSize: number; // Maximum single object size
  cleanupInterval: number; // Background cleanup interval (ms)
  pressureMonitoring: boolean; // Enable memory pressure monitoring
  leakDetection: boolean; // Enable memory leak detection
}

interface MemoryInfo {
  used: number;
  total: number;
  available: number;
  percentage: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
}

interface MemoryPressure {
  level: 'low' | 'moderate' | 'high' | 'critical';
  timestamp: Date;
  freeMemory: number;
  recommendations: string[];
}

interface MemoryPool<T> {
  name: string;
  objects: T[];
  maxSize: number;
  createFn: () => T;
  resetFn: (obj: T) => void;
  inUse: Set<T>;
}

interface MemoryLeak {
  objectType: string;
  count: number;
  sizeEstimate: number;
  growthRate: number; // objects per minute
  detected: Date;
}

interface LargeObjectTracker {
  id: string;
  size: number;
  type: string;
  created: Date;
  lastAccessed: Date;
  accessCount: number;
}

export class MobileMemoryManager {
  private config: MemoryConfig;
  private memoryPools: Map<string, MemoryPool<any>> = new Map();
  private largeObjects: Map<string, LargeObjectTracker> = new Map();
  private memoryHistory: MemoryInfo[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;
  private pressureTimer: NodeJS.Timeout | null = null;
  private leakDetectionTimer: NodeJS.Timeout | null = null;
  private objectCountTracker: Map<string, number> = new Map();
  private lastGCTime: number = 0;

  // Memory pressure listeners
  private pressureListeners: ((pressure: MemoryPressure) => void)[] = [];

  // Weak references for tracking objects
  private trackedObjects: WeakMap<object, string> = new WeakMap();
  private objectRegistry: FinalizationRegistry<string>;

  constructor(config?: Partial<MemoryConfig>) {
    this.config = {
      maxHeapSize: 50 * 1024 * 1024, // 50MB default
      warningThreshold: 0.7, // 70%
      criticalThreshold: 0.9, // 90%
      gcTriggerThreshold: 0.8, // 80%
      poolSize: 100,
      maxObjectSize: 1024 * 1024, // 1MB
      cleanupInterval: 30000, // 30 seconds
      pressureMonitoring: true,
      leakDetection: true,
      ...config,
    };

    // Set up finalization registry for leak detection
    this.objectRegistry = new FinalizationRegistry((objectId: string) => {
      this.handleObjectFinalization(objectId);
    });

    this.initialize();
  }

  /**
   * Initialize memory manager
   */
  private initialize(): void {
    // Start monitoring
    this.startMemoryMonitoring();

    // Set up background cleanup
    this.startBackgroundCleanup();

    // Set up memory pressure monitoring
    if (this.config.pressureMonitoring) {
      this.startPressureMonitoring();
    }

    // Set up leak detection
    if (this.config.leakDetection) {
      this.startLeakDetection();
    }

    // Create default memory pools
    this.createDefaultPools();

    // Set up page visibility change handler
    this.setupPageVisibilityHandler();
  }

  /**
   * Get current memory information
   */
  getMemoryInfo(): MemoryInfo {
    const info: MemoryInfo = {
      used: 0,
      total: this.config.maxHeapSize,
      available: this.config.maxHeapSize,
      percentage: 0,
    };

    // Use Performance API memory info if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      info.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      info.totalJSHeapSize = memory.totalJSHeapSize;
      info.usedJSHeapSize = memory.usedJSHeapSize;

      info.used = memory.usedJSHeapSize;
      info.total = memory.jsHeapSizeLimit;
      info.available = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
      info.percentage = info.used / info.total;
    } else {
      // Estimate based on tracked objects
      const estimatedUsage = this.estimateMemoryUsage();
      info.used = estimatedUsage;
      info.available = this.config.maxHeapSize - estimatedUsage;
      info.percentage = estimatedUsage / this.config.maxHeapSize;
    }

    return info;
  }

  /**
   * Create memory pool for frequent allocations
   */
  createPool<T>(
    name: string,
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize: number = this.config.poolSize,
  ): void {
    const pool: MemoryPool<T> = {
      name,
      objects: [],
      maxSize,
      createFn,
      resetFn,
      inUse: new Set(),
    };

    // Pre-populate pool
    for (let i = 0; i < Math.min(10, maxSize); i++) {
      pool.objects.push(createFn());
    }

    this.memoryPools.set(name, pool);
  }

  /**
   * Get object from memory pool
   */
  getFromPool<T>(poolName: string): T | null {
    const pool = this.memoryPools.get(poolName) as MemoryPool<T>;
    if (!pool) return null;

    let obj = pool.objects.pop();

    if (!obj) {
      // Create new object if pool is empty
      if (pool.inUse.size < pool.maxSize) {
        obj = pool.createFn();
      } else {
        return null; // Pool exhausted
      }
    }

    pool.inUse.add(obj);
    return obj;
  }

  /**
   * Return object to memory pool
   */
  returnToPool<T>(poolName: string, obj: T): void {
    const pool = this.memoryPools.get(poolName) as MemoryPool<T>;
    if (!pool || !pool.inUse.has(obj)) return;

    pool.inUse.delete(obj);
    pool.resetFn(obj);

    if (pool.objects.length < pool.maxSize) {
      pool.objects.push(obj);
    }
    // If pool is full, let object be garbage collected
  }

  /**
   * Track large object
   */
  trackLargeObject(obj: any, type: string): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const size = this.estimateObjectSize(obj);

    if (size > this.config.maxObjectSize) {
      console.warn(
        `[MemoryManager] Large object detected: ${type} (${(size / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    const tracker: LargeObjectTracker = {
      id,
      size,
      type,
      created: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
    };

    this.largeObjects.set(id, tracker);
    this.trackedObjects.set(obj, id);
    this.objectRegistry.register(obj, id);

    return id;
  }

  /**
   * Access tracked object (updates access time)
   */
  accessObject(id: string): void {
    const tracker = this.largeObjects.get(id);
    if (tracker) {
      tracker.lastAccessed = new Date();
      tracker.accessCount++;
    }
  }

  /**
   * Untrack object
   */
  untrackObject(id: string): void {
    this.largeObjects.delete(id);
  }

  /**
   * Force garbage collection if available
   */
  async forceGC(): Promise<boolean> {
    // Only available in Chrome with --enable-precise-memory-info flag
    if ('gc' in window) {
      try {
        (window as any).gc();
        this.lastGCTime = Date.now();
        return true;
      } catch (error) {
        console.warn('[MemoryManager] Manual GC failed:', error);
      }
    }

    // Fallback: trigger GC indirectly
    return this.triggerIndirectGC();
  }

  /**
   * Trigger garbage collection indirectly
   */
  private async triggerIndirectGC(): Promise<boolean> {
    try {
      // Create and release large temporary objects to encourage GC
      const temp: any[] = [];
      for (let i = 0; i < 1000; i++) {
        temp.push(new Array(1000).fill(Math.random()));
      }

      // Clear references
      temp.length = 0;

      // Yield to event loop
      await new Promise((resolve) => setTimeout(resolve, 0));

      return true;
    } catch (error) {
      console.warn('[MemoryManager] Indirect GC trigger failed:', error);
      return false;
    }
  }

  /**
   * Clean up unused objects
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Clean up old large objects
    for (const [id, tracker] of this.largeObjects.entries()) {
      const age = now - tracker.lastAccessed.getTime();
      if (age > maxAge && tracker.accessCount < 5) {
        this.largeObjects.delete(id);
      }
    }

    // Clean up memory pools
    for (const pool of this.memoryPools.values()) {
      // Reduce pool size if it's been underutilized
      const utilizationRate = pool.inUse.size / pool.maxSize;
      if (utilizationRate < 0.3 && pool.objects.length > 10) {
        pool.objects.length = Math.max(10, pool.objects.length * 0.7);
      }
    }

    // Clear old memory history
    this.memoryHistory = this.memoryHistory.slice(-50); // Keep last 50 entries
  }

  /**
   * Handle memory pressure
   */
  private async handleMemoryPressure(pressure: MemoryPressure): Promise<void> {
    console.log(`[MemoryManager] Memory pressure: ${pressure.level}`, pressure);

    switch (pressure.level) {
      case 'moderate':
        await this.cleanup();
        break;

      case 'high':
        await this.cleanup();
        await this.reduceCacheSize(0.5);
        break;

      case 'critical':
        await this.cleanup();
        await this.reduceCacheSize(0.8);
        await this.forceGC();
        this.notifyLowMemory();
        break;
    }

    // Notify listeners
    this.pressureListeners.forEach((listener) => {
      try {
        listener(pressure);
      } catch (error) {
        console.error('[MemoryManager] Pressure listener error:', error);
      }
    });
  }

  /**
   * Reduce cache size
   */
  private async reduceCacheSize(reduction: number): Promise<void> {
    // Reduce memory pool sizes
    for (const pool of this.memoryPools.values()) {
      const newSize = Math.floor(pool.objects.length * (1 - reduction));
      pool.objects.length = Math.max(5, newSize);
    }

    // Clear least recently used large objects
    const sortedObjects = Array.from(this.largeObjects.entries()).sort(
      (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime(),
    );

    const removeCount = Math.floor(sortedObjects.length * reduction);
    for (let i = 0; i < removeCount; i++) {
      this.largeObjects.delete(sortedObjects[i][0]);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    const monitor = () => {
      const info = this.getMemoryInfo();
      this.memoryHistory.push(info);

      // Trigger actions based on memory usage
      if (info.percentage > this.config.criticalThreshold) {
        this.handleMemoryPressure({
          level: 'critical',
          timestamp: new Date(),
          freeMemory: info.available,
          recommendations: ['Force cleanup', 'Reduce cache size', 'Force GC'],
        });
      } else if (info.percentage > this.config.warningThreshold) {
        this.handleMemoryPressure({
          level: 'high',
          timestamp: new Date(),
          freeMemory: info.available,
          recommendations: ['Cleanup old objects', 'Reduce cache size'],
        });
      }

      // Auto-trigger GC if needed
      if (
        info.percentage > this.config.gcTriggerThreshold &&
        Date.now() - this.lastGCTime > 30000
      ) {
        this.forceGC();
      }
    };

    // Monitor every 5 seconds
    setInterval(monitor, 5000);
  }

  /**
   * Start background cleanup
   */
  private startBackgroundCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Start memory pressure monitoring
   */
  private startPressureMonitoring(): void {
    // Monitor memory pressure trends
    this.pressureTimer = setInterval(() => {
      if (this.memoryHistory.length < 3) return;

      const recent = this.memoryHistory.slice(-3);
      const trend = recent[2].percentage - recent[0].percentage;

      if (trend > 0.1) {
        // 10% increase in short time
        this.handleMemoryPressure({
          level: 'moderate',
          timestamp: new Date(),
          freeMemory: recent[2].available,
          recommendations: ['Monitor memory usage', 'Consider cleanup'],
        });
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start leak detection
   */
  private startLeakDetection(): void {
    this.leakDetectionTimer = setInterval(() => {
      this.detectMemoryLeaks();
    }, 60000); // Check every minute
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(): void {
    const typeCount = new Map<string, number>();

    // Count objects by type
    for (const tracker of this.largeObjects.values()) {
      const count = typeCount.get(tracker.type) || 0;
      typeCount.set(tracker.type, count + 1);
    }

    // Check for suspicious growth
    for (const [type, count] of typeCount.entries()) {
      const previousCount = this.objectCountTracker.get(type) || 0;
      const growthRate = count - previousCount;

      if (growthRate > 10 && count > 50) {
        // More than 10 new objects of same type
        const leak: MemoryLeak = {
          objectType: type,
          count,
          sizeEstimate: count * 1024, // Rough estimate
          growthRate,
          detected: new Date(),
        };

        console.warn('[MemoryManager] Potential memory leak detected:', leak);
      }

      this.objectCountTracker.set(type, count);
    }
  }

  /**
   * Create default memory pools
   */
  private createDefaultPools(): void {
    // Analytics data points pool
    this.createPool(
      'analytics-points',
      () => ({ x: 0, y: 0, data: null }),
      (obj) => {
        obj.x = 0;
        obj.y = 0;
        obj.data = null;
      },
    );

    // Chart render cache pool
    this.createPool(
      'chart-cache',
      () => ({ canvas: null, data: null, timestamp: 0 }),
      (obj) => {
        obj.canvas = null;
        obj.data = null;
        obj.timestamp = 0;
      },
    );

    // Touch event pool
    this.createPool(
      'touch-events',
      () => ({ id: '', type: '', timestamp: 0, position: { x: 0, y: 0 } }),
      (obj) => {
        obj.id = '';
        obj.type = '';
        obj.timestamp = 0;
        obj.position.x = 0;
        obj.position.y = 0;
      },
    );
  }

  /**
   * Set up page visibility change handler
   */
  private setupPageVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, perform aggressive cleanup
        this.cleanup();
        this.forceGC();
      }
    });
  }

  /**
   * Estimate object size in bytes
   */
  private estimateObjectSize(obj: any): number {
    const seen = new WeakSet();

    const calculateSize = (obj: any): number => {
      if (obj === null || typeof obj !== 'object') {
        return typeof obj === 'string' ? obj.length * 2 : 8; // Rough estimate
      }

      if (seen.has(obj)) return 0;
      seen.add(obj);

      let size = 0;

      if (obj instanceof ArrayBuffer) {
        return obj.byteLength;
      }

      if (Array.isArray(obj)) {
        size += obj.length * 8; // Array overhead
        for (const item of obj) {
          size += calculateSize(item);
        }
      } else {
        const keys = Object.keys(obj);
        size += keys.length * 64; // Object overhead
        for (const key of keys) {
          size += key.length * 2; // Key size
          size += calculateSize(obj[key]); // Value size
        }
      }

      return size;
    };

    return calculateSize(obj);
  }

  /**
   * Estimate total memory usage
   */
  private estimateMemoryUsage(): number {
    let total = 0;

    // Add tracked large objects
    for (const tracker of this.largeObjects.values()) {
      total += tracker.size;
    }

    // Add memory pools
    for (const pool of this.memoryPools.values()) {
      total += pool.objects.length * 1024; // Rough estimate per object
    }

    return total;
  }

  /**
   * Handle object finalization
   */
  private handleObjectFinalization(objectId: string): void {
    this.largeObjects.delete(objectId);
  }

  /**
   * Notify low memory condition
   */
  private notifyLowMemory(): void {
    // Dispatch custom event
    const event = new CustomEvent('lowMemory', {
      detail: {
        memoryInfo: this.getMemoryInfo(),
        timestamp: new Date(),
      },
    });

    window.dispatchEvent(event);
  }

  /**
   * Add memory pressure listener
   */
  addPressureListener(listener: (pressure: MemoryPressure) => void): void {
    this.pressureListeners.push(listener);
  }

  /**
   * Remove memory pressure listener
   */
  removePressureListener(listener: (pressure: MemoryPressure) => void): void {
    const index = this.pressureListeners.indexOf(listener);
    if (index > -1) {
      this.pressureListeners.splice(index, 1);
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    pools: Array<{
      name: string;
      size: number;
      inUse: number;
      maxSize: number;
    }>;
    largeObjects: number;
    totalTracked: number;
    memoryHistory: MemoryInfo[];
  } {
    const pools = Array.from(this.memoryPools.entries()).map(
      ([name, pool]) => ({
        name,
        size: pool.objects.length,
        inUse: pool.inUse.size,
        maxSize: pool.maxSize,
      }),
    );

    return {
      pools,
      largeObjects: this.largeObjects.size,
      totalTracked: this.estimateMemoryUsage(),
      memoryHistory: this.memoryHistory.slice(-10), // Last 10 entries
    };
  }

  /**
   * Destroy memory manager
   */
  destroy(): void {
    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.pressureTimer) {
      clearInterval(this.pressureTimer);
    }
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
    }

    // Clear pools
    this.memoryPools.clear();

    // Clear tracked objects
    this.largeObjects.clear();
    this.objectCountTracker.clear();

    // Clear listeners
    this.pressureListeners = [];

    // Clear history
    this.memoryHistory = [];
  }
}
