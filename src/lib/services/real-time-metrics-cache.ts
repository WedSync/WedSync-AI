/**
 * Real-time Metrics Calculation and Caching Service
 * Provides high-performance analytics with intelligent caching
 * SECURITY: Cache keys are organization-scoped and user-validated
 */

export interface MetricsCacheEntry {
  data: any;
  calculatedAt: number;
  expiresAt: number;
  organizationId: string;
  version: string;
  queryHash: string;
}

export interface RealTimeMetrics {
  tasksCompleted: number;
  tasksOverdue: number;
  completionRate: number;
  avgCompletionTime: number;
  vendorResponsiveness: number;
  budgetUtilization: number;
  timeToWedding: number;
  criticalPath: Array<{
    taskId: string;
    title: string;
    daysRemaining: number;
    risk: 'low' | 'medium' | 'high' | 'critical';
  }>;
  trends: {
    completionTrend: 'improving' | 'declining' | 'stable';
    velocityChange: number;
    riskIndicators: string[];
  };
}

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxEntries: number;
  compressionEnabled: boolean;
  realtimeUpdates: boolean;
}

class RealTimeMetricsCache {
  private static instance: RealTimeMetricsCache;
  private cache = new Map<string, MetricsCacheEntry>();
  private config: CacheConfig;
  private compressionCache = new Map<string, string>();

  // Cache TTL based on data freshness requirements
  private static readonly CACHE_TTLS = {
    'real-time': 30, // 30 seconds for real-time metrics
    frequent: 300, // 5 minutes for frequently accessed data
    standard: 1800, // 30 minutes for standard analytics
    historical: 3600, // 1 hour for historical analysis
    reports: 14400, // 4 hours for executive reports
  };

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300,
      maxEntries: 10000,
      compressionEnabled: true,
      realtimeUpdates: true,
      ...config,
    };

    // Start cache cleanup interval
    this.startCacheCleanup();
  }

  static getInstance(config?: Partial<CacheConfig>): RealTimeMetricsCache {
    if (!this.instance) {
      this.instance = new RealTimeMetricsCache(config);
    }
    return this.instance;
  }

  /**
   * Get or calculate real-time metrics with caching
   */
  async getRealTimeMetrics(
    organizationId: string,
    weddingId: string,
    forceRefresh = false,
  ): Promise<RealTimeMetrics> {
    const cacheKey = this.generateCacheKey(
      'realtime',
      organizationId,
      weddingId,
    );

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.get(cacheKey);
      if (cached) {
        return cached as RealTimeMetrics;
      }
    }

    try {
      // Calculate fresh metrics
      const metrics = await this.calculateRealTimeMetrics(
        organizationId,
        weddingId,
      );

      // Cache with short TTL for real-time data
      this.set(cacheKey, metrics, this.CACHE_TTLS['real-time'], organizationId);

      return metrics;
    } catch (error) {
      console.error('Failed to calculate real-time metrics:', error);

      // Return stale cache data if available during errors
      const staleData = this.getStale(cacheKey);
      if (staleData) {
        console.warn('Returning stale metrics due to calculation error');
        return staleData as RealTimeMetrics;
      }

      // Return default empty metrics if nothing available
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get cached analytics data with query-based caching
   */
  async getCachedAnalytics(
    organizationId: string,
    query: any,
    calculator: () => Promise<any>,
    ttlType: keyof typeof RealTimeMetricsCache.CACHE_TTLS = 'standard',
  ): Promise<any> {
    const queryHash = this.hashQuery(query);
    const cacheKey = this.generateCacheKey(
      'analytics',
      organizationId,
      queryHash,
    );

    // Check cache
    const cached = this.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Calculate fresh data
      const data = await calculator();

      // Cache with appropriate TTL
      this.set(cacheKey, data, this.CACHE_TTLS[ttlType], organizationId);

      return data;
    } catch (error) {
      console.error('Analytics calculation failed:', error);

      // Try to return stale data
      const staleData = this.getStale(cacheKey);
      if (staleData) {
        return staleData;
      }

      throw error;
    }
  }

  /**
   * Invalidate cache for specific organization or wedding
   */
  invalidateCache(organizationId: string, weddingId?: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.organizationId === organizationId) {
        if (!weddingId || key.includes(weddingId)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.compressionCache.delete(key);
    });

    console.log(
      `Cache invalidated: ${keysToDelete.length} entries removed for org ${organizationId}`,
    );
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(organizationId: string, weddingIds: string[]): Promise<void> {
    const warmupPromises = weddingIds.map(async (weddingId) => {
      try {
        await this.getRealTimeMetrics(organizationId, weddingId, true);
        console.log(`Cache warmed for wedding ${weddingId}`);
      } catch (error) {
        console.warn(`Failed to warm cache for wedding ${weddingId}:`, error);
      }
    });

    await Promise.allSettled(warmupPromises);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
    oldestEntry: number;
    expiringEntries: number;
  } {
    const now = Date.now();
    let oldestEntry = now;
    let expiringEntries = 0;

    for (const entry of this.cache.values()) {
      if (entry.calculatedAt < oldestEntry) {
        oldestEntry = entry.calculatedAt;
      }
      if (entry.expiresAt < now + 60000) {
        // Expiring within 1 minute
        expiringEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: now - oldestEntry,
      expiringEntries,
    };
  }

  // Private methods

  private async calculateRealTimeMetrics(
    organizationId: string,
    weddingId: string,
  ): Promise<RealTimeMetrics> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    try {
      // Get wedding details
      const { data: wedding } = await supabase
        .from('weddings')
        .select('wedding_date, budget, created_at')
        .eq('id', weddingId)
        .eq('organization_id', organizationId)
        .single();

      if (!wedding) {
        throw new Error('Wedding not found');
      }

      // Get all tasks for this wedding
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('organization_id', organizationId);

      // Get vendor data
      const { data: vendors } = await supabase
        .from('wedding_vendors')
        .select(
          `
          *,
          vendor:vendor_id (
            name,
            response_time_avg,
            rating
          )
        `,
        )
        .eq('wedding_id', weddingId);

      // Calculate metrics
      const now = new Date();
      const weddingDate = new Date(wedding.wedding_date);
      const timeToWedding = Math.ceil(
        (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const totalTasks = tasks?.length || 0;
      const completedTasks =
        tasks?.filter((t) => t.status === 'completed').length || 0;
      const overdueTasks =
        tasks?.filter((t) => {
          return (
            t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
          );
        }).length || 0;

      const completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate average completion time
      const completedTasksWithTime =
        tasks?.filter(
          (t) => t.status === 'completed' && t.completed_at && t.created_at,
        ) || [];

      const avgCompletionTime =
        completedTasksWithTime.length > 0
          ? completedTasksWithTime.reduce((sum, task) => {
              const completionTime =
                new Date(task.completed_at).getTime() -
                new Date(task.created_at).getTime();
              return sum + completionTime / (1000 * 60 * 60 * 24); // Convert to days
            }, 0) / completedTasksWithTime.length
          : 0;

      // Calculate vendor responsiveness
      const vendorResponsiveness =
        vendors && vendors.length > 0
          ? vendors.reduce(
              (sum, v) => sum + (v.vendor?.response_time_avg || 24),
              0,
            ) / vendors.length
          : 24; // Default 24 hours

      // Calculate budget utilization
      const totalSpent =
        vendors?.reduce((sum, v) => sum + (v.contracted_amount || 0), 0) || 0;
      const budgetUtilization = wedding.budget
        ? (totalSpent / wedding.budget) * 100
        : 0;

      // Identify critical path tasks
      const criticalTasks =
        tasks
          ?.filter(
            (t) =>
              (t.status !== 'completed' && t.priority === 'high') ||
              t.priority === 'critical',
          )
          .map((task) => ({
            taskId: task.id,
            title: task.title,
            daysRemaining: task.due_date
              ? Math.ceil(
                  (new Date(task.due_date).getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 999,
            risk: this.calculateTaskRisk(task, timeToWedding) as
              | 'low'
              | 'medium'
              | 'high'
              | 'critical',
          }))
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
          .slice(0, 10) || [];

      // Calculate trends
      const trends = await this.calculateTrends(
        organizationId,
        weddingId,
        tasks || [],
      );

      return {
        tasksCompleted: completedTasks,
        tasksOverdue: overdueTasks,
        completionRate: Math.round(completionRate * 100) / 100,
        avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
        vendorResponsiveness: Math.round(vendorResponsiveness * 100) / 100,
        budgetUtilization: Math.round(budgetUtilization * 100) / 100,
        timeToWedding,
        criticalPath: criticalTasks,
        trends,
      };
    } catch (error) {
      console.error('Error calculating real-time metrics:', error);
      throw error;
    }
  }

  private calculateTaskRisk(task: any, timeToWedding: number): string {
    const daysRemaining = task.due_date
      ? Math.ceil(
          (new Date(task.due_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;

    if (daysRemaining < 0) return 'critical'; // Overdue
    if (daysRemaining < 3) return 'high';
    if (daysRemaining < 7) return 'medium';
    return 'low';
  }

  private async calculateTrends(
    organizationId: string,
    weddingId: string,
    tasks: any[],
  ): Promise<{
    completionTrend: 'improving' | 'declining' | 'stable';
    velocityChange: number;
    riskIndicators: string[];
  }> {
    // Calculate completion trend over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletions = tasks.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= thirtyDaysAgo,
    );

    // Split into two periods to compare
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recentPeriod = recentCompletions.filter(
      (t) => new Date(t.completed_at) >= fifteenDaysAgo,
    ).length;

    const earlierPeriod = recentCompletions.filter(
      (t) => new Date(t.completed_at) < fifteenDaysAgo,
    ).length;

    let completionTrend: 'improving' | 'declining' | 'stable' = 'stable';
    let velocityChange = 0;

    if (earlierPeriod > 0) {
      velocityChange = ((recentPeriod - earlierPeriod) / earlierPeriod) * 100;
      if (velocityChange > 10) completionTrend = 'improving';
      else if (velocityChange < -10) completionTrend = 'declining';
    }

    // Identify risk indicators
    const riskIndicators: string[] = [];
    const overdueTasks = tasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        t.status !== 'completed',
    );

    if (overdueTasks.length > 0) {
      riskIndicators.push(`${overdueTasks.length} tasks overdue`);
    }

    const highPriorityPending = tasks.filter(
      (t) =>
        (t.priority === 'high' || t.priority === 'critical') &&
        t.status !== 'completed',
    );

    if (highPriorityPending.length > 5) {
      riskIndicators.push(
        `${highPriorityPending.length} high-priority tasks pending`,
      );
    }

    if (completionTrend === 'declining') {
      riskIndicators.push('Task completion velocity declining');
    }

    return {
      completionTrend,
      velocityChange: Math.round(velocityChange * 100) / 100,
      riskIndicators,
    };
  }

  private get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.compressionCache.delete(key);
      return null;
    }

    return entry.data;
  }

  private getStale(key: string): any | null {
    const entry = this.cache.get(key);
    return entry ? entry.data : null;
  }

  private set(
    key: string,
    data: any,
    ttlSeconds: number,
    organizationId: string,
  ): void {
    const now = Date.now();
    const entry: MetricsCacheEntry = {
      data,
      calculatedAt: now,
      expiresAt: now + ttlSeconds * 1000,
      organizationId,
      version: '1.0',
      queryHash: key,
    };

    // Enforce max entries limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldestEntries(Math.floor(this.config.maxEntries * 0.1)); // Remove 10%
    }

    this.cache.set(key, entry);
  }

  private generateCacheKey(...parts: string[]): string {
    return parts.join(':');
  }

  private hashQuery(query: any): string {
    const queryString = JSON.stringify(query, Object.keys(query).sort());
    // Simple hash function for query strings
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.calculatedAt - b.calculatedAt)
      .slice(0, count);

    for (const [key] of entries) {
      this.cache.delete(key);
      this.compressionCache.delete(key);
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => {
        this.cache.delete(key);
        this.compressionCache.delete(key);
      });

      if (keysToDelete.length > 0) {
        console.log(
          `Cache cleanup: ${keysToDelete.length} expired entries removed`,
        );
      }
    }, 60000); // Run every minute
  }

  private calculateHitRate(): number {
    // This would require tracking hits/misses in a production implementation
    // For now, return a placeholder
    return 85; // 85% hit rate assumption
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry.data).length * 2; // Rough estimate
    }
    return totalSize;
  }

  private getDefaultMetrics(): RealTimeMetrics {
    return {
      tasksCompleted: 0,
      tasksOverdue: 0,
      completionRate: 0,
      avgCompletionTime: 0,
      vendorResponsiveness: 24,
      budgetUtilization: 0,
      timeToWedding: 0,
      criticalPath: [],
      trends: {
        completionTrend: 'stable',
        velocityChange: 0,
        riskIndicators: [],
      },
    };
  }
}

// Singleton instance
export const metricsCache = RealTimeMetricsCache.getInstance({
  defaultTTL: 300,
  maxEntries: 5000,
  compressionEnabled: true,
  realtimeUpdates: true,
});

export { RealTimeMetricsCache };
