/**
 * WS-144: Performance Optimization for Offline Operations
 * Ensures sub-100ms response times for critical operations
 *
 * Features:
 * - Lazy loading and code splitting
 * - Efficient IndexedDB queries with indexes
 * - Memory management and garbage collection
 * - Request debouncing and throttling
 * - Virtual scrolling for large datasets
 */

import { offlineDB } from '@/lib/database/offline-database';

// =====================================================
// PERFORMANCE CONFIGURATION
// =====================================================

const PERFORMANCE_CONFIG = {
  targetResponseTime: 100, // ms
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  cacheSize: 1000, // Max items in memory cache
  batchSize: 50, // Items per batch operation
  debounceDelay: 300, // ms
  throttleDelay: 100, // ms
  virtualScrollBuffer: 20, // Items to render outside viewport
  indexedDBTimeout: 5000, // ms
};

// =====================================================
// PERFORMANCE METRICS
// =====================================================

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  measure<T>(operation: string, fn: () => T): T {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success: true,
      });

      if (duration > PERFORMANCE_CONFIG.targetResponseTime) {
        console.warn(
          `[Performance] ${operation} took ${duration}ms (target: ${PERFORMANCE_CONFIG.targetResponseTime}ms)`,
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success: true,
      });

      if (duration > PERFORMANCE_CONFIG.targetResponseTime) {
        console.warn(
          `[Performance] ${operation} took ${duration}ms (target: ${PERFORMANCE_CONFIG.targetResponseTime}ms)`,
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter((m) => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;

    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  getP95Time(operation: string): number {
    const operationMetrics = this.getMetrics(operation)
      .map((m) => m.duration)
      .sort((a, b) => a - b);

    if (operationMetrics.length === 0) return 0;

    const index = Math.floor(operationMetrics.length * 0.95);
    return operationMetrics[index];
  }
}

// =====================================================
// MEMORY CACHE
// =====================================================

class MemoryCache<T> {
  private cache: Map<string, { data: T; timestamp: number; size: number }> =
    new Map();
  private totalSize = 0;
  private maxSize: number;
  private maxItems: number;

  constructor(
    maxSize: number = PERFORMANCE_CONFIG.maxMemoryUsage,
    maxItems: number = PERFORMANCE_CONFIG.cacheSize,
  ) {
    this.maxSize = maxSize;
    this.maxItems = maxItems;
  }

  set(key: string, data: T): void {
    const size = this.estimateSize(data);

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const old = this.cache.get(key)!;
      this.totalSize -= old.size;
    }

    // Evict if necessary
    while (
      (this.totalSize + size > this.maxSize ||
        this.cache.size >= this.maxItems) &&
      this.cache.size > 0
    ) {
      this.evictOldest();
    }

    this.cache.set(key, { data, timestamp: Date.now(), size });
    this.totalSize += size;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Update timestamp for LRU
    entry.timestamp = Date.now();
    return entry.data;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldest = key;
        oldestTime = entry.timestamp;
      }
    }

    if (oldest) {
      this.delete(oldest);
    }
  }

  private estimateSize(obj: any): number {
    // Rough estimation of object size in bytes
    const str = JSON.stringify(obj);
    return str.length * 2; // 2 bytes per character
  }

  getStats() {
    return {
      items: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      utilization: (this.totalSize / this.maxSize) * 100,
    };
  }
}

// =====================================================
// INDEXEDDB OPTIMIZATION
// =====================================================

class OptimizedIndexedDB {
  private dbCache: Map<string, IDBDatabase> = new Map();
  private transactionPool: Map<string, IDBTransaction> = new Map();

  async getOptimized<T>(
    storeName: string,
    key: string,
  ): Promise<T | undefined> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.getPooledTransaction(db, storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllOptimized<T>(
    storeName: string,
    query?: IDBKeyRange,
    limit?: number,
  ): Promise<T[]> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.getPooledTransaction(db, storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = query
        ? store.getAll(query, limit)
        : store.getAll(undefined, limit);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async batchPut<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Use cursor for efficient batch operations
    const promises = items.map((item) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async createIndex(
    storeName: string,
    indexName: string,
    keyPath: string | string[],
    options?: IDBIndexParameters,
  ): Promise<void> {
    const db = await this.getDatabase();

    // Check if index exists
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    if (!store.indexNames.contains(indexName)) {
      // Need to upgrade database version
      await this.upgradeDatabase(db.version + 1, (db) => {
        const store = db.transaction.objectStore(storeName);
        store.createIndex(indexName, keyPath, options);
      });
    }
  }

  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBKeyRange | IDBValidKey,
    limit?: number,
  ): Promise<T[]> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query, limit);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getDatabase(): Promise<IDBDatabase> {
    const dbName = 'WedSyncOffline';

    if (this.dbCache.has(dbName)) {
      return this.dbCache.get(dbName)!;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onsuccess = () => {
        const db = request.result;
        this.dbCache.set(dbName, db);
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private getPooledTransaction(
    db: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode,
  ): IDBTransaction {
    const key = `${storeName}_${mode}`;

    if (this.transactionPool.has(key)) {
      const transaction = this.transactionPool.get(key)!;

      // Check if transaction is still active
      try {
        transaction.objectStore(storeName);
        return transaction;
      } catch {
        // Transaction is no longer active, create new one
        this.transactionPool.delete(key);
      }
    }

    const transaction = db.transaction(storeName, mode);
    this.transactionPool.set(key, transaction);

    // Clean up when transaction completes
    transaction.oncomplete = () => this.transactionPool.delete(key);
    transaction.onerror = () => this.transactionPool.delete(key);
    transaction.onabort = () => this.transactionPool.delete(key);

    return transaction;
  }

  private async upgradeDatabase(
    version: number,
    upgradeCallback: (db: IDBDatabase) => void,
  ): Promise<void> {
    const dbName = 'WedSyncOffline';

    // Close existing connection
    if (this.dbCache.has(dbName)) {
      this.dbCache.get(dbName)!.close();
      this.dbCache.delete(dbName);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onupgradeneeded = () => {
        upgradeCallback(request.result);
      };

      request.onsuccess = () => {
        this.dbCache.set(dbName, request.result);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// =====================================================
// REQUEST OPTIMIZATION
// =====================================================

class RequestOptimizer {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private throttleTimestamps: Map<string, number> = new Map();
  private batchQueues: Map<string, any[]> = new Map();

  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = PERFORMANCE_CONFIG.debounceDelay,
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!);
      }

      const timer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    };
  }

  throttle<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = PERFORMANCE_CONFIG.throttleDelay,
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      const now = Date.now();
      const lastCall = this.throttleTimestamps.get(key) || 0;

      if (now - lastCall >= delay) {
        this.throttleTimestamps.set(key, now);
        return fn(...args);
      }

      return undefined;
    };
  }

  batch<T>(
    key: string,
    item: T,
    processBatch: (items: T[]) => void,
    batchSize: number = PERFORMANCE_CONFIG.batchSize,
    delay: number = 100,
  ): void {
    if (!this.batchQueues.has(key)) {
      this.batchQueues.set(key, []);
    }

    const queue = this.batchQueues.get(key)!;
    queue.push(item);

    if (queue.length >= batchSize) {
      // Process immediately if batch is full
      const batch = queue.splice(0, batchSize);
      processBatch(batch);
    } else {
      // Schedule batch processing
      setTimeout(() => {
        const queue = this.batchQueues.get(key);
        if (queue && queue.length > 0) {
          const batch = queue.splice(0, batchSize);
          processBatch(batch);
        }
      }, delay);
    }
  }
}

// =====================================================
// VIRTUAL SCROLLING
// =====================================================

export class VirtualScroller<T> {
  private items: T[] = [];
  private itemHeight: number;
  private containerHeight: number;
  private scrollTop = 0;
  private buffer = PERFORMANCE_CONFIG.virtualScrollBuffer;

  constructor(itemHeight: number, containerHeight: number) {
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
  }

  setItems(items: T[]): void {
    this.items = items;
  }

  setScrollPosition(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getVisibleItems(): { items: T[]; offset: number; totalHeight: number } {
    const startIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.itemHeight) - this.buffer,
    );
    const endIndex = Math.min(
      this.items.length,
      Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) +
        this.buffer,
    );

    return {
      items: this.items.slice(startIndex, endIndex),
      offset: startIndex * this.itemHeight,
      totalHeight: this.items.length * this.itemHeight,
    };
  }

  scrollToItem(index: number): number {
    const scrollTop = index * this.itemHeight;
    this.scrollTop = scrollTop;
    return scrollTop;
  }
}

// =====================================================
// LAZY LOADING
// =====================================================

class LazyLoader {
  private loadedModules: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  async load<T>(moduleId: string, loader: () => Promise<T>): Promise<T> {
    // Return cached module if available
    if (this.loadedModules.has(moduleId)) {
      return this.loadedModules.get(moduleId);
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId);
    }

    // Start loading
    const loadPromise = loader().then((module) => {
      this.loadedModules.set(moduleId, module);
      this.loadingPromises.delete(moduleId);
      return module;
    });

    this.loadingPromises.set(moduleId, loadPromise);
    return loadPromise;
  }

  preload<T>(moduleId: string, loader: () => Promise<T>): void {
    // Start loading but don't wait
    this.load(moduleId, loader);
  }

  isLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }

  unload(moduleId: string): void {
    this.loadedModules.delete(moduleId);
  }
}

// =====================================================
// PERFORMANCE OPTIMIZER SINGLETON
// =====================================================

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;

  public monitor = new PerformanceMonitor();
  public cache = new MemoryCache();
  public db = new OptimizedIndexedDB();
  public requests = new RequestOptimizer();
  public lazyLoader = new LazyLoader();

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private constructor() {
    this.initialize();
  }

  private async initialize() {
    // Create optimized indexes
    await this.createOptimizedIndexes();

    // Set up performance monitoring
    this.setupPerformanceMonitoring();

    // Preload critical modules
    this.preloadCriticalModules();
  }

  private async createOptimizedIndexes() {
    const indexes = [
      { store: 'guests', name: 'by_wedding', keyPath: 'weddingId' },
      { store: 'guests', name: 'by_rsvp', keyPath: 'rsvpStatus' },
      { store: 'vendors', name: 'by_category', keyPath: 'category' },
      { store: 'vendors', name: 'by_status', keyPath: 'status' },
      { store: 'timeline', name: 'by_time', keyPath: 'time' },
    ];

    for (const index of indexes) {
      try {
        await this.db.createIndex(index.store, index.name, index.keyPath);
      } catch (error) {
        console.warn(
          `[Performance] Failed to create index ${index.name}:`,
          error,
        );
      }
    }
  }

  private setupPerformanceMonitoring() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > PERFORMANCE_CONFIG.targetResponseTime) {
            console.warn(
              `[Performance] Slow operation detected: ${entry.name} (${entry.duration}ms)`,
            );
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }

  private preloadCriticalModules() {
    // Preload critical modules for offline functionality
    const criticalModules = [
      {
        id: 'conflict-resolver',
        loader: () => import('./advanced-conflict-resolver'),
      },
      {
        id: 'background-sync',
        loader: () => import('./optimized-background-sync'),
      },
      {
        id: 'integrity-validator',
        loader: () => import('./data-integrity-validator'),
      },
    ];

    for (const module of criticalModules) {
      this.lazyLoader.preload(module.id, module.loader);
    }
  }

  // Public API for performance optimization

  async optimizeQuery<T>(
    storeName: string,
    query: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return this.monitor.measureAsync(`query_${storeName}`, async () => {
      const cacheKey = `${storeName}_${JSON.stringify(query)}`;

      // Check memory cache first
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as T;

      // Query IndexedDB
      const result = await this.db.getOptimized<T>(storeName, cacheKey);

      // Cache result
      if (result) {
        this.cache.set(cacheKey, result);
      }

      return result as T;
    });
  }

  createVirtualScroller<T>(
    itemHeight: number,
    containerHeight: number,
  ): VirtualScroller<T> {
    return new VirtualScroller<T>(itemHeight, containerHeight);
  }

  debounceOperation(key: string, operation: () => void, delay?: number): void {
    this.requests.debounce(key, operation, delay)();
  }

  throttleOperation(key: string, operation: () => void, delay?: number): void {
    this.requests.throttle(key, operation, delay)();
  }

  async getPerformanceReport() {
    const operations = [
      'guest_create',
      'guest_update',
      'guest_search',
      'vendor_create',
      'vendor_update',
      'timeline_update',
      'sync_operation',
    ];

    const report: Record<string, any> = {
      timestamp: new Date().toISOString(),
      summary: {
        cacheStats: this.cache.getStats(),
        totalOperations: this.monitor.getMetrics().length,
      },
      operations: {},
    };

    for (const op of operations) {
      report.operations[op] = {
        averageTime: this.monitor.getAverageTime(op),
        p95Time: this.monitor.getP95Time(op),
        count: this.monitor.getMetrics(op).length,
        meetsTarget:
          this.monitor.getP95Time(op) < PERFORMANCE_CONFIG.targetResponseTime,
      };
    }

    return report;
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();
