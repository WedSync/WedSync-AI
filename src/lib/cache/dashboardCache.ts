/**
 * Dashboard Cache System - WS-037 Implementation
 * Team B - Round 2
 * High-performance Redis-based caching for dashboard data
 */

import { Redis } from 'ioredis';

// Cache configuration
const CACHE_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
  lazyConnect: true,
};

// Cache key prefixes
const CACHE_PREFIXES = {
  DASHBOARD: 'dashboard',
  WIDGET: 'widget',
  METRICS: 'metrics',
  ACTIVITY: 'activity',
} as const;

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  DASHBOARD_DATA: 300, // 5 minutes
  WIDGET_DATA: 600, // 10 minutes
  METRICS: 1800, // 30 minutes
  ACTIVITY: 180, // 3 minutes
} as const;

export interface CacheMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  totalQueries: number;
  totalHits: number;
  totalMisses: number;
}

export class DashboardCache {
  private redis: Redis | null = null;
  private isConnected = false;
  private metrics: CacheMetrics = {
    cacheHitRate: 0,
    avgResponseTime: 0,
    totalQueries: 0,
    totalHits: 0,
    totalMisses: 0,
  };

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis(CACHE_CONFIG);

      this.redis.on('connect', () => {
        console.log('Dashboard cache connected to Redis');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('Redis connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with proper namespacing
   */
  private generateKey(prefix: string, key: string): string {
    return `${prefix}:${key}`;
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    if (!this.isConnected || !this.redis) {
      this.metrics.totalMisses++;
      return null;
    }

    try {
      const data = await this.redis.get(key);
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);

      if (data) {
        this.metrics.totalHits++;
        this.updateHitRate();
        return JSON.parse(data) as T;
      } else {
        this.metrics.totalMisses++;
        this.updateHitRate();
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.metrics.totalMisses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set data in cache with TTL
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = DEFAULT_TTL.DASHBOARD_DATA,
  ): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const serializedData = JSON.stringify(data);
      await this.redis.setex(key, ttl, serializedData);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    if (!this.isConnected || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return 0;
    }
  }

  /**
   * Cache dashboard summary data
   */
  async cacheDashboardSummary(
    supplierId: string,
    data: unknown,
    filters: Record<string, unknown> = {},
  ): Promise<boolean> {
    const key = this.generateKey(
      CACHE_PREFIXES.DASHBOARD,
      `summary:${supplierId}:${JSON.stringify(filters)}`,
    );
    return await this.set(key, data, DEFAULT_TTL.DASHBOARD_DATA);
  }

  /**
   * Get cached dashboard summary
   */
  async getDashboardSummary<T>(
    supplierId: string,
    filters: Record<string, unknown> = {},
  ): Promise<T | null> {
    const key = this.generateKey(
      CACHE_PREFIXES.DASHBOARD,
      `summary:${supplierId}:${JSON.stringify(filters)}`,
    );
    return await this.get<T>(key);
  }

  /**
   * Cache widget data
   */
  async cacheWidgetData(
    supplierId: string,
    widgetType: string,
    data: unknown,
  ): Promise<boolean> {
    const key = this.generateKey(
      CACHE_PREFIXES.WIDGET,
      `${widgetType}:${supplierId}`,
    );
    return await this.set(key, data, DEFAULT_TTL.WIDGET_DATA);
  }

  /**
   * Get cached widget data
   */
  async getWidgetData<T>(
    supplierId: string,
    widgetType: string,
  ): Promise<T | null> {
    const key = this.generateKey(
      CACHE_PREFIXES.WIDGET,
      `${widgetType}:${supplierId}`,
    );
    return await this.get<T>(key);
  }

  /**
   * Cache metrics data
   */
  async cacheMetrics(supplierId: string, data: unknown): Promise<boolean> {
    const key = this.generateKey(
      CACHE_PREFIXES.METRICS,
      `dashboard:${supplierId}`,
    );
    return await this.set(key, data, DEFAULT_TTL.METRICS);
  }

  /**
   * Get cached metrics
   */
  async getMetrics<T>(supplierId: string): Promise<T | null> {
    const key = this.generateKey(
      CACHE_PREFIXES.METRICS,
      `dashboard:${supplierId}`,
    );
    return await this.get<T>(key);
  }

  /**
   * Cache activity data
   */
  async cacheActivity(
    supplierId: string,
    data: unknown,
    limit: number = 10,
  ): Promise<boolean> {
    const key = this.generateKey(
      CACHE_PREFIXES.ACTIVITY,
      `recent:${supplierId}:${limit}`,
    );
    return await this.set(key, data, DEFAULT_TTL.ACTIVITY);
  }

  /**
   * Get cached activity
   */
  async getActivity<T>(
    supplierId: string,
    limit: number = 10,
  ): Promise<T | null> {
    const key = this.generateKey(
      CACHE_PREFIXES.ACTIVITY,
      `recent:${supplierId}:${limit}`,
    );
    return await this.get<T>(key);
  }

  /**
   * Invalidate all dashboard cache for a supplier
   */
  async invalidateDashboard(supplierId: string): Promise<number> {
    const patterns = [
      `${CACHE_PREFIXES.DASHBOARD}:*:${supplierId}:*`,
      `${CACHE_PREFIXES.WIDGET}:*:${supplierId}`,
      `${CACHE_PREFIXES.METRICS}:*:${supplierId}`,
      `${CACHE_PREFIXES.ACTIVITY}:*:${supplierId}:*`,
    ];

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += await this.invalidate(pattern);
    }

    return totalInvalidated;
  }

  /**
   * Invalidate widget cache for a supplier
   */
  async invalidateWidget(
    supplierId: string,
    widgetType?: string,
  ): Promise<number> {
    const pattern = widgetType
      ? `${CACHE_PREFIXES.WIDGET}:${widgetType}:${supplierId}`
      : `${CACHE_PREFIXES.WIDGET}:*:${supplierId}`;

    return await this.invalidate(pattern);
  }

  /**
   * Batch cache operations for better performance
   */
  async batchSet(
    operations: Array<{ key: string; data: unknown; ttl?: number }>,
  ): Promise<boolean[]> {
    if (!this.isConnected || !this.redis) {
      return operations.map(() => false);
    }

    try {
      const pipeline = this.redis.pipeline();

      operations.forEach(({ key, data, ttl = DEFAULT_TTL.DASHBOARD_DATA }) => {
        const serializedData = JSON.stringify(data);
        pipeline.setex(key, ttl, serializedData);
      });

      const results = await pipeline.exec();
      return (
        results?.map((result) => result[0] === null) ||
        operations.map(() => false)
      );
    } catch (error) {
      console.error('Batch cache set error:', error);
      return operations.map(() => false);
    }
  }

  /**
   * Get cache size and memory usage
   */
  async getCacheInfo(): Promise<{
    keyCount: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    if (!this.isConnected || !this.redis) {
      return {
        keyCount: 0,
        memoryUsage: '0B',
        hitRate: 0,
      };
    }

    try {
      const keyCount = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : '0B';

      return {
        keyCount,
        memoryUsage,
        hitRate: this.metrics.cacheHitRate,
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        keyCount: 0,
        memoryUsage: '0B',
        hitRate: 0,
      };
    }
  }

  /**
   * Clean expired cache entries (maintenance)
   */
  async cleanExpired(): Promise<number> {
    if (!this.isConnected || !this.redis) {
      return 0;
    }

    try {
      // Redis automatically handles TTL expiration, but we can get count of expired keys
      const info = await this.redis.info('stats');
      const expiredMatch = info.match(/expired_keys:(\d+)/);
      return expiredMatch ? parseInt(expiredMatch[1]) : 0;
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
      return 0;
    }
  }

  /**
   * Update cache hit rate metrics
   */
  private updateHitRate(): void {
    this.metrics.cacheHitRate =
      this.metrics.totalQueries > 0
        ? (this.metrics.totalHits / this.metrics.totalQueries) * 100
        : 0;
  }

  /**
   * Update average response time
   */
  private updateResponseTime(responseTime: number): void {
    this.metrics.avgResponseTime =
      this.metrics.totalQueries > 1
        ? (this.metrics.avgResponseTime + responseTime) / 2
        : responseTime;
  }

  /**
   * Get cache performance metrics
   */
  async getPerformanceMetrics(): Promise<CacheMetrics> {
    const cacheInfo = await this.getCacheInfo();

    return {
      ...this.metrics,
      cacheHitRate: cacheInfo.hitRate,
    };
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    connected: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      if (!this.redis) {
        return {
          status: 'unhealthy',
          connected: false,
          responseTime: 0,
          error: 'Redis client not initialized',
        };
      }

      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime > 1000 ? 'degraded' : 'healthy',
        connected: this.isConnected,
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}
