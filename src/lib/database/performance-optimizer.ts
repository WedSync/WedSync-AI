/**
 * WedSync Database Performance Optimizer
 * Advanced performance optimization for IndexedDB operations
 *
 * Features:
 * - Query optimization and caching
 * - Intelligent indexing strategies
 * - Memory-efficient batch operations
 * - Performance monitoring and analytics
 * - Mobile browser optimization
 * - Sub-100ms operation targets
 */

import {
  offlineDB,
  type CachedWedding,
  type CachedTimelineEvent,
  type VendorContact,
} from '@/lib/database/offline-database';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

// =====================================================
// PERFORMANCE INTERFACES
// =====================================================

interface QueryCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in ms
  hitCount: number;
}

interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  cacheHit: boolean;
  recordCount: number;
  indexUsed: string[];
}

interface OptimizationRule {
  queryPattern: string;
  indexStrategy: string[];
  cacheStrategy: 'aggressive' | 'conservative' | 'none';
  batchSize?: number;
}

interface QueryPlan {
  operation: string;
  estimatedCost: number;
  indexUsage: string[];
  optimizations: string[];
  cacheKey?: string;
}

// =====================================================
// PERFORMANCE OPTIMIZER CLASS
// =====================================================

export class DatabasePerformanceOptimizer {
  private static instance: DatabasePerformanceOptimizer;
  private queryCache: Map<string, QueryCache> = new Map();
  private metricsBuffer: PerformanceMetrics[] = [];
  private optimizationRules: OptimizationRule[] = [];
  private readonly MAX_CACHE_SIZE = 100;
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly METRICS_BUFFER_SIZE = 1000;

  public static getInstance(): DatabasePerformanceOptimizer {
    if (!DatabasePerformanceOptimizer.instance) {
      DatabasePerformanceOptimizer.instance =
        new DatabasePerformanceOptimizer();
    }
    return DatabasePerformanceOptimizer.instance;
  }

  constructor() {
    this.initializeOptimizationRules();
    this.startPeriodicMaintenance();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      // Wedding queries
      {
        queryPattern: 'weddings:byDate',
        indexStrategy: ['date', '[date+priority]'],
        cacheStrategy: 'aggressive',
        batchSize: 10,
      },
      {
        queryPattern: 'weddings:byStatus',
        indexStrategy: ['status', '[status+priority]'],
        cacheStrategy: 'conservative',
        batchSize: 20,
      },
      {
        queryPattern: 'weddings:upcoming',
        indexStrategy: ['[date+priority]', 'status'],
        cacheStrategy: 'aggressive',
        batchSize: 10,
      },

      // Timeline queries
      {
        queryPattern: 'timeline:byWedding',
        indexStrategy: ['[weddingId+startTime]', 'weddingId'],
        cacheStrategy: 'aggressive',
        batchSize: 50,
      },
      {
        queryPattern: 'timeline:byPriority',
        indexStrategy: ['[weddingId+priority]', 'priority'],
        cacheStrategy: 'conservative',
        batchSize: 30,
      },
      {
        queryPattern: 'timeline:weatherDependent',
        indexStrategy: ['weatherDependent', 'weddingId'],
        cacheStrategy: 'none',
      },

      // Vendor queries
      {
        queryPattern: 'vendors:byWedding',
        indexStrategy: ['weddingId', '[weddingId+type]'],
        cacheStrategy: 'aggressive',
        batchSize: 20,
      },
      {
        queryPattern: 'vendors:byStatus',
        indexStrategy: ['[weddingId+status]', 'status'],
        cacheStrategy: 'conservative',
        batchSize: 15,
      },

      // Issue queries
      {
        queryPattern: 'issues:bySeverity',
        indexStrategy: ['[weddingId+severity]', 'severity'],
        cacheStrategy: 'conservative',
        batchSize: 25,
      },
      {
        queryPattern: 'issues:byStatus',
        indexStrategy: ['[status+createdAt]', 'status'],
        cacheStrategy: 'aggressive',
        batchSize: 30,
      },
    ];
  }

  // =====================================================
  // OPTIMIZED QUERY METHODS
  // =====================================================

  async getWeddingsByDateOptimized(
    startDate: string,
    endDate: string,
  ): Promise<CachedWedding[]> {
    const cacheKey = `weddings:byDate:${startDate}:${endDate}`;
    const startTime = performance.now();

    // Check cache first
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      this.recordMetrics(
        'weddings:byDate',
        startTime,
        true,
        cachedResult.length,
        ['cache'],
      );
      return cachedResult;
    }

    try {
      // Optimized query using compound index
      const weddings = await offlineDB.weddings
        .where('[date+priority]')
        .between([startDate, 0], [endDate, Number.MAX_SAFE_INTEGER])
        .toArray();

      // Apply additional filters in memory (faster than multiple DB queries)
      const filtered = weddings.filter(
        (w) =>
          w.date >= startDate &&
          w.date <= endDate &&
          new Date(w.expiresAt) > new Date(),
      );

      // Sort by priority and date for optimal UX
      const sorted = filtered.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // Cache result
      this.addToCache(cacheKey, sorted, this.DEFAULT_CACHE_TTL);

      this.recordMetrics('weddings:byDate', startTime, false, sorted.length, [
        '[date+priority]',
      ]);
      return sorted;
    } catch (error) {
      console.error('[Optimizer] Wedding date query failed:', error);
      this.recordMetrics(
        'weddings:byDate',
        startTime,
        false,
        0,
        [],
        error.message,
      );
      return [];
    }
  }

  async getActiveWeddingsOptimized(): Promise<CachedWedding[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const cacheKey = `weddings:active:${today}`;
    const startTime = performance.now();

    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      this.recordMetrics(
        'weddings:active',
        startTime,
        true,
        cachedResult.length,
        ['cache'],
      );
      return cachedResult;
    }

    try {
      // Use compound index for efficient active wedding lookup
      const activeWeddings = await offlineDB.weddings
        .where('[status+priority]')
        .between(['active', 0], ['active', Number.MAX_SAFE_INTEGER])
        .or('[date+priority]')
        .between([today, 0], [today, Number.MAX_SAFE_INTEGER])
        .toArray();

      // Filter for today's weddings or active status
      const filtered = activeWeddings.filter(
        (w) => w.status === 'active' || w.date === today,
      );

      this.addToCache(cacheKey, filtered, 2 * 60 * 1000); // 2 minute cache for active data
      this.recordMetrics('weddings:active', startTime, false, filtered.length, [
        '[status+priority]',
        '[date+priority]',
      ]);

      return filtered;
    } catch (error) {
      console.error('[Optimizer] Active weddings query failed:', error);
      return [];
    }
  }

  async getTimelineEventsOptimized(
    weddingId: string,
    timeRange?: { start: string; end: string },
  ): Promise<CachedTimelineEvent[]> {
    const cacheKey = timeRange
      ? `timeline:${weddingId}:${timeRange.start}:${timeRange.end}`
      : `timeline:${weddingId}:all`;
    const startTime = performance.now();

    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      this.recordMetrics(
        'timeline:byWedding',
        startTime,
        true,
        cachedResult.length,
        ['cache'],
      );
      return cachedResult;
    }

    try {
      let query = offlineDB.timeline.where('[weddingId+startTime]');

      if (timeRange) {
        // Use compound index for time-range queries
        query = query.between(
          [weddingId, timeRange.start],
          [weddingId, timeRange.end],
        );
      } else {
        // Get all events for wedding using compound index
        query = query.between([weddingId, ''], [weddingId, '\uffff']);
      }

      const events = await query.toArray();

      // In-memory sort by startTime and priority for optimal display
      const sorted = events.sort((a, b) => {
        const timeCompare =
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (timeCompare !== 0) return timeCompare;

        // If same start time, sort by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Cache with shorter TTL for timeline data (more volatile)
      this.addToCache(cacheKey, sorted, 3 * 60 * 1000); // 3 minutes

      this.recordMetrics(
        'timeline:byWedding',
        startTime,
        false,
        sorted.length,
        ['[weddingId+startTime]'],
      );
      return sorted;
    } catch (error) {
      console.error('[Optimizer] Timeline query failed:', error);
      return [];
    }
  }

  async getVendorsOptimized(
    weddingId: string,
    filters?: { type?: string; status?: string },
  ): Promise<VendorContact[]> {
    const cacheKey = `vendors:${weddingId}:${filters?.type || 'all'}:${filters?.status || 'all'}`;
    const startTime = performance.now();

    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      this.recordMetrics(
        'vendors:byWedding',
        startTime,
        true,
        cachedResult.length,
        ['cache'],
      );
      return cachedResult;
    }

    try {
      let vendors: VendorContact[];

      if (filters?.type && filters?.status) {
        // Complex filter - use multiple compound indices
        const typeFiltered = await offlineDB.vendors
          .where('[weddingId+type]')
          .equals([weddingId, filters.type])
          .toArray();

        vendors = typeFiltered.filter((v) => v.status === filters.status);
      } else if (filters?.type) {
        // Use compound index for type filtering
        vendors = await offlineDB.vendors
          .where('[weddingId+type]')
          .equals([weddingId, filters.type])
          .toArray();
      } else if (filters?.status) {
        // Use compound index for status filtering
        vendors = await offlineDB.vendors
          .where('[weddingId+status]')
          .equals([weddingId, filters.status])
          .toArray();
      } else {
        // Get all vendors for wedding
        vendors = await offlineDB.vendors
          .where('weddingId')
          .equals(weddingId)
          .toArray();
      }

      // Sort by name for consistent ordering
      const sorted = vendors.sort((a, b) => a.name.localeCompare(b.name));

      this.addToCache(cacheKey, sorted, this.DEFAULT_CACHE_TTL);

      const indexUsed =
        filters?.type && filters?.status
          ? ['[weddingId+type]', 'memory-filter']
          : filters?.type
            ? ['[weddingId+type]']
            : filters?.status
              ? ['[weddingId+status]']
              : ['weddingId'];

      this.recordMetrics(
        'vendors:byWedding',
        startTime,
        false,
        sorted.length,
        indexUsed,
      );
      return sorted;
    } catch (error) {
      console.error('[Optimizer] Vendors query failed:', error);
      return [];
    }
  }

  // =====================================================
  // BATCH OPERATIONS
  // =====================================================

  async batchUpdateVendorStatus(
    updates: Array<{
      weddingId: string;
      vendorId: string;
      status: string;
      checkInTime?: string;
    }>,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Group updates by wedding for optimal transaction handling
      const groupedUpdates = new Map<string, typeof updates>();

      for (const update of updates) {
        if (!groupedUpdates.has(update.weddingId)) {
          groupedUpdates.set(update.weddingId, []);
        }
        groupedUpdates.get(update.weddingId)!.push(update);
      }

      // Process each wedding's updates in a single transaction
      for (const [weddingId, weddingUpdates] of groupedUpdates) {
        await offlineDB.transaction('rw', offlineDB.vendors, async () => {
          for (const update of weddingUpdates) {
            await offlineDB.vendors
              .where('[weddingId+vendorId]')
              .equals([update.weddingId, update.vendorId])
              .modify({
                status: update.status,
                checkInTime: update.checkInTime || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
              });
          }
        });

        // Invalidate cache for this wedding
        this.invalidateWeddingCache(weddingId);
      }

      this.recordMetrics(
        'vendors:batchUpdate',
        startTime,
        false,
        updates.length,
        ['[weddingId+vendorId]'],
      );
      console.log(
        `[Optimizer] Batch updated ${updates.length} vendor statuses`,
      );
    } catch (error) {
      console.error('[Optimizer] Batch vendor update failed:', error);
      throw error;
    }
  }

  async batchUpdateTimelineEvents(
    updates: Array<{ eventId: string; updates: Partial<CachedTimelineEvent> }>,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const BATCH_SIZE = 20; // Optimal batch size for timeline updates

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);

        await offlineDB.transaction('rw', offlineDB.timeline, async () => {
          for (const { eventId, updates: eventUpdates } of batch) {
            const existing = await offlineDB.timeline.get(eventId);
            if (existing) {
              await offlineDB.timeline.put({
                ...existing,
                ...eventUpdates,
                lastUpdated: new Date().toISOString(),
                syncVersion: existing.syncVersion + 1,
              });
            }
          }
        });

        // Small delay between batches to prevent blocking UI
        if (i + BATCH_SIZE < updates.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Invalidate timeline caches
      this.invalidateTimelineCache();

      this.recordMetrics(
        'timeline:batchUpdate',
        startTime,
        false,
        updates.length,
        ['id'],
      );
      console.log(
        `[Optimizer] Batch updated ${updates.length} timeline events`,
      );
    } catch (error) {
      console.error('[Optimizer] Batch timeline update failed:', error);
      throw error;
    }
  }

  // =====================================================
  // CACHE MANAGEMENT
  // =====================================================

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    cached.hitCount++;
    return cached.data;
  }

  private addToCache(
    key: string,
    data: any,
    ttl: number = this.DEFAULT_CACHE_TTL,
  ): void {
    // Ensure cache doesn't exceed max size
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsedCache();
    }

    this.queryCache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
    });
  }

  private evictLeastUsedCache(): void {
    // Use forEach for downlevelIteration compatibility
    let leastUsed: any = null;
    this.queryCache.forEach((cached) => {
      if (!leastUsed || cached.hitCount < leastUsed.hitCount) {
        leastUsed = cached;
      }
    });

    this.queryCache.delete(leastUsed.key);
  }

  private invalidateWeddingCache(weddingId: string): void {
    const keysToRemove: string[] = [];

    // Use forEach for downlevelIteration compatibility
    this.queryCache.forEach((cached, key) => {
      if (
        key.includes(weddingId) ||
        key.includes('weddings:') ||
        key.includes('vendors:') ||
        key.includes('timeline:')
      ) {
        keysToRemove.push(key);
      }
    });

    for (const key of keysToRemove) {
      this.queryCache.delete(key);
    }
  }

  private invalidateTimelineCache(): void {
    const keysToRemove: string[] = [];

    // Use forEach for downlevelIteration compatibility
    this.queryCache.forEach((cached, key) => {
      if (key.includes('timeline:')) {
        keysToRemove.push(key);
      }
    });

    for (const key of keysToRemove) {
      this.queryCache.delete(key);
    }
  }

  // =====================================================
  // PERFORMANCE MONITORING
  // =====================================================

  private recordMetrics(
    operation: string,
    startTime: number,
    cacheHit: boolean,
    recordCount: number,
    indexUsed: string[],
    error?: string,
  ): void {
    const duration = performance.now() - startTime;

    const metrics: PerformanceMetrics = {
      operation,
      duration,
      timestamp: Date.now(),
      cacheHit,
      recordCount,
      indexUsed,
    };

    this.metricsBuffer.push(metrics);

    // Keep buffer size manageable
    if (this.metricsBuffer.length > this.METRICS_BUFFER_SIZE) {
      this.metricsBuffer = this.metricsBuffer.slice(
        -this.METRICS_BUFFER_SIZE / 2,
      );
    }

    // Log slow operations
    if (duration > 100) {
      // Operations taking longer than 100ms
      console.warn(
        `[Optimizer] Slow operation: ${operation} took ${Math.round(duration)}ms`,
        {
          recordCount,
          indexUsed,
          cacheHit,
          error,
        },
      );
    }
  }

  getPerformanceReport(): {
    avgQueryTime: number;
    cacheHitRate: number;
    slowQueries: PerformanceMetrics[];
    topOperations: Array<{
      operation: string;
      count: number;
      avgDuration: number;
    }>;
  } {
    if (this.metricsBuffer.length === 0) {
      return {
        avgQueryTime: 0,
        cacheHitRate: 0,
        slowQueries: [],
        topOperations: [],
      };
    }

    const totalDuration = this.metricsBuffer.reduce(
      (sum, m) => sum + m.duration,
      0,
    );
    const avgQueryTime = totalDuration / this.metricsBuffer.length;

    const cacheHits = this.metricsBuffer.filter((m) => m.cacheHit).length;
    const cacheHitRate = (cacheHits / this.metricsBuffer.length) * 100;

    const slowQueries = this.metricsBuffer
      .filter((m) => m.duration > 100)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Aggregate operations
    const operationStats = new Map<
      string,
      { count: number; totalDuration: number }
    >();

    for (const metric of this.metricsBuffer) {
      const existing = operationStats.get(metric.operation) || {
        count: 0,
        totalDuration: 0,
      };
      existing.count++;
      existing.totalDuration += metric.duration;
      operationStats.set(metric.operation, existing);
    }

    // Use forEach to collect entries for downlevelIteration compatibility
    const topOperations: Array<{
      operation: string;
      count: number;
      avgDuration: number;
    }> = [];
    operationStats.forEach((stats, operation) => {
      topOperations.push({
        operation,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
      });
    });

    // Sort and slice after forEach collection
    topOperations.sort((a, b) => b.count - a.count);
    topOperations.splice(10); // Keep only top 10

    return {
      avgQueryTime: Math.round(avgQueryTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowQueries,
      topOperations,
    };
  }

  // =====================================================
  // MAINTENANCE
  // =====================================================

  private startPeriodicMaintenance(): void {
    // Clean cache every 5 minutes
    setInterval(
      () => {
        this.cleanExpiredCache();
      },
      5 * 60 * 1000,
    );

    // Generate performance reports every hour
    setInterval(
      () => {
        const report = this.getPerformanceReport();
        console.log('[Optimizer] Performance Report:', report);
      },
      60 * 60 * 1000,
    );
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Use forEach for downlevelIteration compatibility
    this.queryCache.forEach((cached, key) => {
      if (now - cached.timestamp > cached.ttl) {
        keysToRemove.push(key);
      }
    });

    for (const key of keysToRemove) {
      this.queryCache.delete(key);
    }

    if (keysToRemove.length > 0) {
      console.log(
        `[Optimizer] Cleaned ${keysToRemove.length} expired cache entries`,
      );
    }
  }

  clearAllCache(): void {
    this.queryCache.clear();
    console.log('[Optimizer] All cache cleared');
  }

  // =====================================================
  // QUERY PLANNING (Advanced)
  // =====================================================

  analyzeQuery(operation: string, filters: any): QueryPlan {
    const rule = this.optimizationRules.find((r) =>
      operation.includes(r.queryPattern),
    );

    if (!rule) {
      return {
        operation,
        estimatedCost: 1000, // High cost for unoptimized queries
        indexUsage: [],
        optimizations: ['Consider adding optimization rule'],
        cacheKey: undefined,
      };
    }

    const estimatedCost = this.estimateQueryCost(
      operation,
      filters,
      rule.indexStrategy,
    );
    const cacheKey =
      rule.cacheStrategy !== 'none'
        ? this.generateCacheKey(operation, filters)
        : undefined;

    return {
      operation,
      estimatedCost,
      indexUsage: rule.indexStrategy,
      optimizations: this.suggestOptimizations(operation, filters, rule),
      cacheKey,
    };
  }

  private estimateQueryCost(
    operation: string,
    filters: any,
    indices: string[],
  ): number {
    let baseCost = 100; // Base query cost

    // Reduce cost for indexed queries
    if (indices.length > 0) {
      baseCost *= 0.1; // 10x faster with proper index
    }

    // Increase cost for complex filters
    const filterCount = Object.keys(filters || {}).length;
    baseCost *= 1 + filterCount * 0.2;

    return Math.round(baseCost);
  }

  private generateCacheKey(operation: string, filters: any): string {
    const filterString = JSON.stringify(filters || {});
    return `${operation}:${btoa(filterString)}`;
  }

  private suggestOptimizations(
    operation: string,
    filters: any,
    rule: OptimizationRule,
  ): string[] {
    const suggestions: string[] = [];

    if (rule.batchSize && Object.keys(filters || {}).length === 0) {
      suggestions.push(`Consider using batch size of ${rule.batchSize}`);
    }

    if (rule.cacheStrategy === 'aggressive') {
      suggestions.push('Result will be aggressively cached');
    }

    if (rule.indexStrategy.length === 0) {
      suggestions.push(
        'No optimized index available - consider full table scan',
      );
    }

    return suggestions;
  }
}

// Export singleton instance
export const dbOptimizer = DatabasePerformanceOptimizer.getInstance();

// Make available for debugging
if (typeof window !== 'undefined') {
  (window as any).dbOptimizer = dbOptimizer;
}
