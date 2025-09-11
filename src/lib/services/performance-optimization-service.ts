'use client';

// =====================================================
// PERFORMANCE OPTIMIZATION SERVICE
// Ultra-fast cache operations for wedding day scenarios
// Target: <100ms cache operations, <10ms for critical data
// =====================================================

export interface PerformanceMetrics {
  operationType:
    | 'cache_read'
    | 'cache_write'
    | 'indexeddb_read'
    | 'indexeddb_write'
    | 'network_request';
  operationId: string;
  duration: number;
  timestamp: number;
  cacheHit: boolean;
  dataSize: number;
  weddingId?: string;
  critical: boolean;
}

export interface PerformanceConfig {
  targetCacheAccessMs: number; // Target for cache operations (100ms)
  targetCriticalAccessMs: number; // Target for critical operations (10ms)
  slowOperationThresholdMs: number; // When to log warnings (150ms)
  enableDetailedLogging: boolean;
  maxMetricsHistory: number; // Keep last N metrics entries
  performanceMode: 'normal' | 'wedding_day' | 'emergency';
}

export interface PerformanceStats {
  averageAccessTime: number;
  p95AccessTime: number;
  p99AccessTime: number;
  cacheHitRatio: number;
  slowOperationCount: number;
  totalOperations: number;
  criticalOperationAverage: number;
  operationsByType: Record<string, number>;
}

class PerformanceOptimizationService {
  private config: PerformanceConfig = {
    targetCacheAccessMs: 100,
    targetCriticalAccessMs: 10,
    slowOperationThresholdMs: 150,
    enableDetailedLogging: false,
    maxMetricsHistory: 1000,
    performanceMode: 'normal',
  };

  private metricsHistory: PerformanceMetrics[] = [];
  private operationCounts = new Map<string, number>();
  private performanceAlerts: Array<{
    timestamp: number;
    message: string;
    severity: 'warning' | 'critical';
  }> = [];

  constructor() {
    this.setupPerformanceMonitoring();
  }

  // =====================================================
  // PERFORMANCE MEASUREMENT WRAPPER
  // =====================================================

  public async measureOperation<T>(
    operationType: PerformanceMetrics['operationType'],
    operationId: string,
    operation: () => Promise<T>,
    options: {
      critical?: boolean;
      weddingId?: string;
      expectedSize?: number;
    } = {},
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Estimate data size if not provided
      let dataSize = options.expectedSize || 0;
      if (!dataSize && result) {
        dataSize = this.estimateDataSize(result);
      }

      // Record metrics
      this.recordMetrics({
        operationType,
        operationId,
        duration,
        timestamp: Date.now(),
        cacheHit: operationType.includes('cache') && duration < 50, // Fast = likely cache hit
        dataSize,
        weddingId: options.weddingId,
        critical: options.critical || false,
      });

      // Performance alerts
      this.checkPerformanceThresholds(
        operationType,
        duration,
        options.critical || false,
      );

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Record failed operation
      this.recordMetrics({
        operationType,
        operationId: `${operationId}_failed`,
        duration,
        timestamp: Date.now(),
        cacheHit: false,
        dataSize: 0,
        weddingId: options.weddingId,
        critical: options.critical || false,
      });

      throw error;
    }
  }

  // =====================================================
  // FAST CACHE ACCESS OPTIMIZATION
  // =====================================================

  public async optimizedCacheRead<T>(
    cacheName: string,
    key: string,
    fallback: () => Promise<T>,
    options: { critical?: boolean; weddingId?: string } = {},
  ): Promise<T> {
    return this.measureOperation(
      'cache_read',
      `${cacheName}:${key}`,
      async () => {
        // Try service worker cache first (fastest)
        try {
          const cache = await caches.open(cacheName);
          const response = await cache.match(key);

          if (response) {
            if (this.config.enableDetailedLogging) {
              console.log(`[Performance] Cache hit: ${cacheName}:${key}`);
            }
            return await response.json();
          }
        } catch (error) {
          console.warn(
            `[Performance] Cache read failed for ${cacheName}:${key}`,
            error,
          );
        }

        // Fallback to provided function
        if (this.config.enableDetailedLogging) {
          console.log(
            `[Performance] Cache miss, using fallback: ${cacheName}:${key}`,
          );
        }

        return await fallback();
      },
      options,
    );
  }

  public async optimizedCacheWrite<T>(
    cacheName: string,
    key: string,
    data: T,
    options: { critical?: boolean; weddingId?: string; ttl?: number } = {},
  ): Promise<void> {
    return this.measureOperation(
      'cache_write',
      `${cacheName}:${key}`,
      async () => {
        const cache = await caches.open(cacheName);

        // Create response with metadata
        const headers = new Headers({
          'Content-Type': 'application/json',
          'Cache-Timestamp': Date.now().toString(),
        });

        if (options.ttl) {
          headers.set('Cache-TTL', options.ttl.toString());
        }

        const response = new Response(JSON.stringify(data), { headers });

        await cache.put(key, response);

        if (this.config.enableDetailedLogging) {
          console.log(`[Performance] Cached: ${cacheName}:${key}`, {
            size: this.estimateDataSize(data),
          });
        }
      },
      options,
    );
  }

  // =====================================================
  // INDEXEDDB OPTIMIZATION
  // =====================================================

  public async optimizedIndexedDBRead<T>(
    dbName: string,
    storeName: string,
    key: string,
    options: { critical?: boolean; weddingId?: string } = {},
  ): Promise<T | null> {
    return this.measureOperation(
      'indexeddb_read',
      `${dbName}:${storeName}:${key}`,
      async () => {
        return new Promise<T | null>((resolve, reject) => {
          const request = indexedDB.open(dbName);

          request.onerror = () => reject(request.error);

          request.onsuccess = () => {
            const db = request.result;

            try {
              const transaction = db.transaction([storeName], 'readonly');
              const store = transaction.objectStore(storeName);
              const getRequest = store.get(key);

              getRequest.onsuccess = () => resolve(getRequest.result || null);
              getRequest.onerror = () => reject(getRequest.error);
            } catch (error) {
              reject(error);
            } finally {
              db.close();
            }
          };
        });
      },
      options,
    );
  }

  public async optimizedIndexedDBWrite<T>(
    dbName: string,
    storeName: string,
    key: string,
    data: T,
    options: { critical?: boolean; weddingId?: string } = {},
  ): Promise<void> {
    return this.measureOperation(
      'indexeddb_write',
      `${dbName}:${storeName}:${key}`,
      async () => {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(dbName);

          request.onerror = () => reject(request.error);

          request.onsuccess = () => {
            const db = request.result;

            try {
              const transaction = db.transaction([storeName], 'readwrite');
              const store = transaction.objectStore(storeName);

              // Add metadata
              const recordWithMeta = {
                ...data,
                _timestamp: Date.now(),
                _critical: options.critical || false,
                _weddingId: options.weddingId,
              };

              const putRequest = store.put(recordWithMeta, key);

              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => reject(putRequest.error);
            } catch (error) {
              reject(error);
            } finally {
              db.close();
            }
          };
        });
      },
      options,
    );
  }

  // =====================================================
  // WEDDING DAY PERFORMANCE MODE
  // =====================================================

  public enableWeddingDayMode(weddingId: string): void {
    console.log(`[Performance] Enabling wedding day mode for ${weddingId}`);

    this.config = {
      ...this.config,
      performanceMode: 'wedding_day',
      targetCacheAccessMs: 50, // Even faster for wedding day
      targetCriticalAccessMs: 5, // Ultra-fast for critical operations
      enableDetailedLogging: true,
      maxMetricsHistory: 2000, // Keep more history during wedding day
    };

    // Pre-warm caches for better performance
    this.preWarmCaches();

    // More frequent performance monitoring
    this.startIntensiveMonitoring();
  }

  public enableEmergencyMode(): void {
    console.log('[Performance] Enabling emergency performance mode');

    this.config = {
      ...this.config,
      performanceMode: 'emergency',
      targetCacheAccessMs: 25, // Ultra-fast for emergency
      targetCriticalAccessMs: 3,
      enableDetailedLogging: false, // Reduce overhead
      maxMetricsHistory: 100, // Keep minimal history
    };

    // Clear all non-critical caches
    this.emergencyOptimization();
  }

  public restoreNormalMode(): void {
    console.log('[Performance] Restoring normal performance mode');

    this.config = {
      targetCacheAccessMs: 100,
      targetCriticalAccessMs: 10,
      slowOperationThresholdMs: 150,
      enableDetailedLogging: false,
      maxMetricsHistory: 1000,
      performanceMode: 'normal',
    };

    this.stopIntensiveMonitoring();
  }

  // =====================================================
  // PERFORMANCE ANALYSIS
  // =====================================================

  public getPerformanceStats(): PerformanceStats {
    if (this.metricsHistory.length === 0) {
      return {
        averageAccessTime: 0,
        p95AccessTime: 0,
        p99AccessTime: 0,
        cacheHitRatio: 0,
        slowOperationCount: 0,
        totalOperations: 0,
        criticalOperationAverage: 0,
        operationsByType: {},
      };
    }

    const durations = this.metricsHistory
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const cacheOperations = this.metricsHistory.filter((m) =>
      m.operationType.includes('cache'),
    );
    const criticalOperations = this.metricsHistory.filter((m) => m.critical);
    const slowOperations = this.metricsHistory.filter(
      (m) => m.duration > this.config.slowOperationThresholdMs,
    );

    // Calculate percentiles
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    // Operations by type
    const operationsByType: Record<string, number> = {};
    this.metricsHistory.forEach((metric) => {
      operationsByType[metric.operationType] =
        (operationsByType[metric.operationType] || 0) + 1;
    });

    return {
      averageAccessTime:
        durations.reduce((a, b) => a + b, 0) / durations.length,
      p95AccessTime: durations[p95Index] || 0,
      p99AccessTime: durations[p99Index] || 0,
      cacheHitRatio:
        cacheOperations.length > 0
          ? cacheOperations.filter((op) => op.cacheHit).length /
            cacheOperations.length
          : 0,
      slowOperationCount: slowOperations.length,
      totalOperations: this.metricsHistory.length,
      criticalOperationAverage:
        criticalOperations.length > 0
          ? criticalOperations.reduce((sum, op) => sum + op.duration, 0) /
            criticalOperations.length
          : 0,
      operationsByType,
    };
  }

  public getPerformanceAlerts(): Array<{
    timestamp: number;
    message: string;
    severity: 'warning' | 'critical';
  }> {
    return [...this.performanceAlerts].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  // =====================================================
  // INTERNAL METHODS
  // =====================================================

  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);

    // Keep history within limits
    if (this.metricsHistory.length > this.config.maxMetricsHistory) {
      this.metricsHistory = this.metricsHistory.slice(
        -this.config.maxMetricsHistory,
      );
    }

    // Update operation counts
    const key = `${metrics.operationType}:${metrics.critical ? 'critical' : 'normal'}`;
    this.operationCounts.set(key, (this.operationCounts.get(key) || 0) + 1);
  }

  private checkPerformanceThresholds(
    operationType: PerformanceMetrics['operationType'],
    duration: number,
    critical: boolean,
  ): void {
    const target = critical
      ? this.config.targetCriticalAccessMs
      : this.config.targetCacheAccessMs;
    const threshold = this.config.slowOperationThresholdMs;

    if (duration > threshold) {
      const alert = {
        timestamp: Date.now(),
        message: `Slow ${operationType} operation: ${Math.round(duration)}ms (target: ${target}ms)`,
        severity: critical ? ('critical' as const) : ('warning' as const),
      };

      this.performanceAlerts.push(alert);

      // Keep only recent alerts
      this.performanceAlerts = this.performanceAlerts.slice(-50);

      console.warn(`[Performance Alert] ${alert.message}`);
    }

    if (this.config.enableDetailedLogging) {
      console.log(
        `[Performance] ${operationType} completed in ${Math.round(duration)}ms`,
      );
    }
  }

  private estimateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  private setupPerformanceMonitoring(): void {
    // Monitor page performance
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          for (const entry of entries) {
            if (
              entry.name.includes('cache') ||
              entry.name.includes('storage')
            ) {
              this.recordMetrics({
                operationType: 'cache_read',
                operationId: entry.name,
                duration: entry.duration,
                timestamp: Date.now(),
                cacheHit: entry.duration < 50,
                dataSize: 0,
                critical: false,
              });
            }
          }
        });

        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('[Performance] PerformanceObserver setup failed:', error);
      }
    }
  }

  private preWarmCaches(): void {
    // Pre-load critical cache operations to improve first access
    setTimeout(async () => {
      try {
        const cacheNames = await caches.keys();
        const criticalCaches = cacheNames.filter(
          (name) => name.includes('wedding') || name.includes('critical'),
        );

        for (const cacheName of criticalCaches) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();

          // Access first few entries to warm up
          for (const key of keys.slice(0, 5)) {
            await cache.match(key);
          }
        }

        console.log(`[Performance] Pre-warmed ${criticalCaches.length} caches`);
      } catch (error) {
        console.warn('[Performance] Cache pre-warming failed:', error);
      }
    }, 100);
  }

  private intensiveMonitoringInterval: NodeJS.Timeout | null = null;

  private startIntensiveMonitoring(): void {
    if (this.intensiveMonitoringInterval) {
      clearInterval(this.intensiveMonitoringInterval);
    }

    this.intensiveMonitoringInterval = setInterval(() => {
      const stats = this.getPerformanceStats();

      if (stats.averageAccessTime > this.config.targetCacheAccessMs * 2) {
        console.warn(
          `[Performance] Average access time degraded: ${Math.round(stats.averageAccessTime)}ms`,
        );
      }

      if (stats.cacheHitRatio < 0.8) {
        console.warn(
          `[Performance] Cache hit ratio low: ${Math.round(stats.cacheHitRatio * 100)}%`,
        );
      }
    }, 10000); // Every 10 seconds during intensive monitoring
  }

  private stopIntensiveMonitoring(): void {
    if (this.intensiveMonitoringInterval) {
      clearInterval(this.intensiveMonitoringInterval);
      this.intensiveMonitoringInterval = null;
    }
  }

  private async emergencyOptimization(): Promise<void> {
    try {
      // Clear all non-critical caches
      const cacheNames = await caches.keys();
      const nonCritical = cacheNames.filter(
        (name) =>
          !name.includes('critical') &&
          !name.includes('wedding') &&
          !name.includes('api'),
      );

      for (const cacheName of nonCritical) {
        await caches.delete(cacheName);
      }

      console.log(
        `[Performance] Emergency cleanup: removed ${nonCritical.length} non-critical caches`,
      );
    } catch (error) {
      console.error('[Performance] Emergency optimization failed:', error);
    }
  }

  // =====================================================
  // PUBLIC CONFIGURATION
  // =====================================================

  public updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[Performance] Configuration updated:', updates);
  }

  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  public clearMetrics(): void {
    this.metricsHistory = [];
    this.operationCounts.clear();
    this.performanceAlerts = [];
    console.log('[Performance] Metrics cleared');
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizationService();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).performanceOptimizer = performanceOptimizer;
}
