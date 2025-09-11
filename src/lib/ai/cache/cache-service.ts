/**
 * WS-241 AI Cache Service Layer
 * Client-side service for AI cache management and integration
 */

import type {
  CacheStats,
  CachePerformance,
  SeasonalData,
  CacheConfig,
  CacheApiResponse,
  CacheStatsResponse,
  CacheWarmingResponse,
  SupplierType,
  TimeRange,
  CacheType,
} from '@/types/ai-cache';

// Configuration for cache service
interface CacheServiceConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Cache warming request
interface CacheWarmingRequest {
  strategy: 'popular' | 'seasonal' | 'supplier_specific';
  priority?: number;
  maxQueries?: number;
  supplierType?: SupplierType;
  cacheTypes?: CacheType[];
}

// Cache clearing request
interface CacheClearingRequest {
  strategy: 'old' | 'low_quality' | 'type_specific' | 'all';
  maxAge?: number; // hours
  qualityThreshold?: number;
  cacheType?: CacheType;
}

class CacheService {
  private config: CacheServiceConfig;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();

  constructor(config: CacheServiceConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/api/ai/cache',
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
    };
  }

  /**
   * Get cache statistics for a supplier
   */
  async getCacheStats(
    supplierId: string,
    timeRange: TimeRange = 'week',
  ): Promise<CacheStatsResponse> {
    const cacheKey = `stats_${supplierId}_${timeRange}`;

    // Check local cache first (30 seconds TTL for stats)
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest<CacheStatsResponse>(
      `/stats?supplier_id=${supplierId}&range=${timeRange}`,
    );

    // Cache the response
    this.setCache(cacheKey, response, 30000); // 30 seconds
    return response;
  }

  /**
   * Get cache performance metrics
   */
  async getCachePerformance(
    supplierId: string,
    timeRange: TimeRange = 'week',
  ): Promise<CacheApiResponse<CachePerformance>> {
    const cacheKey = `performance_${supplierId}_${timeRange}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest<CacheApiResponse<CachePerformance>>(
      `/performance?supplier_id=${supplierId}&range=${timeRange}`,
    );

    this.setCache(cacheKey, response, 60000); // 1 minute
    return response;
  }

  /**
   * Get seasonal wedding data and recommendations
   */
  async getSeasonalData(
    supplierId: string,
  ): Promise<CacheApiResponse<SeasonalData>> {
    const cacheKey = `seasonal_${supplierId}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest<CacheApiResponse<SeasonalData>>(
      `/seasonal?supplier_id=${supplierId}`,
    );

    this.setCache(cacheKey, response, 300000); // 5 minutes
    return response;
  }

  /**
   * Get cache configuration
   */
  async getCacheConfig(
    supplierId?: string,
  ): Promise<CacheApiResponse<CacheConfig>> {
    const url = supplierId ? `/config?supplier_id=${supplierId}` : '/config';

    return this.makeRequest<CacheApiResponse<CacheConfig>>(url);
  }

  /**
   * Save cache configuration
   */
  async saveCacheConfig(
    config: CacheConfig,
    supplierId?: string,
  ): Promise<CacheApiResponse> {
    const body = supplierId ? { ...config, supplierId } : config;

    return this.makeRequest<CacheApiResponse>('/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Trigger cache warming
   */
  async warmCache(request: CacheWarmingRequest): Promise<CacheWarmingResponse> {
    return this.makeRequest<CacheWarmingResponse>('/warm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  /**
   * Clear cache entries
   */
  async clearCache(request: CacheClearingRequest): Promise<CacheApiResponse> {
    return this.makeRequest<CacheApiResponse>('/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  /**
   * Get cache health status
   */
  async getCacheHealth(): Promise<
    CacheApiResponse<{
      status: 'healthy' | 'degraded' | 'down';
      uptime: number;
      hitRate: number;
      averageResponseTime: number;
      errorRate: number;
      issues: string[];
    }>
  > {
    return this.makeRequest<any>('/health');
  }

  /**
   * Invalidate specific cache entries
   */
  async invalidateCache(
    pattern?: string,
    cacheType?: CacheType,
  ): Promise<CacheApiResponse> {
    const body: any = {};
    if (pattern) body.pattern = pattern;
    if (cacheType) body.cacheType = cacheType;

    return this.makeRequest<CacheApiResponse>('/invalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Get real-time cache metrics (SSE endpoint)
   */
  async subscribeToRealTimeMetrics(
    supplierId: string,
    onUpdate: (data: any) => void,
    onError?: (error: Error) => void,
  ): Promise<EventSource> {
    const eventSource = new EventSource(
      `${this.config.baseUrl}/realtime?supplier_id=${supplierId}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (error) {
        onError?.(new Error('Failed to parse real-time data'));
      }
    };

    eventSource.onerror = (error) => {
      onError?.(new Error('Real-time connection failed'));
    };

    return eventSource;
  }

  /**
   * Get wedding-specific cache recommendations
   */
  async getWeddingRecommendations(
    supplierType: SupplierType,
    currentSeason?: string,
  ): Promise<
    CacheApiResponse<{
      recommendations: Array<{
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        action: string;
        estimatedSavings: number;
      }>;
      seasonalAdjustments: Record<string, number>;
    }>
  > {
    return this.makeRequest<any>(
      `/recommendations?supplier_type=${supplierType}&season=${currentSeason}`,
    );
  }

  /**
   * Get cache analytics for wedding industry insights
   */
  async getCacheAnalytics(
    supplierId: string,
    metrics: string[] = ['hit_rate', 'cost_savings', 'response_time'],
  ): Promise<
    CacheApiResponse<{
      metrics: Record<string, any[]>;
      insights: Array<{
        title: string;
        value: string;
        trend: 'up' | 'down' | 'stable';
        significance: 'high' | 'medium' | 'low';
      }>;
    }>
  > {
    const metricsQuery = metrics.join(',');
    return this.makeRequest<any>(
      `/analytics?supplier_id=${supplierId}&metrics=${metricsQuery}`,
    );
  }

  /**
   * Bulk operations for cache management
   */
  async bulkCacheOperations(
    operations: Array<{
      operation: 'warm' | 'clear' | 'invalidate';
      target: string;
      parameters?: Record<string, any>;
    }>,
  ): Promise<
    CacheApiResponse<{
      results: Array<{
        operation: string;
        target: string;
        success: boolean;
        error?: string;
      }>;
    }>
  > {
    return this.makeRequest<any>('/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });
  }

  // Private helper methods

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    };

    try {
      let lastError: Error;

      // Retry logic
      for (
        let attempt = 0;
        attempt < (this.config.retryAttempts || 1);
        attempt++
      ) {
        try {
          const response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorData}`);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          lastError = error as Error;

          // Don't retry on client errors (4xx)
          if (error instanceof Error && error.message.includes('HTTP 4')) {
            break;
          }

          // Wait before retry (exponential backoff)
          if (attempt < (this.config.retryAttempts || 1) - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000),
            );
          }
        }
      }

      throw lastError!;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > v.ttl) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Clear local cache
   */
  clearLocalCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache service health
   */
  getServiceHealth(): {
    localCacheSize: number;
    lastRequestTime: number | null;
    isOnline: boolean;
  } {
    return {
      localCacheSize: this.cache.size,
      lastRequestTime: null, // Could track this if needed
      isOnline: navigator.onLine,
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export class for custom instances
export { CacheService };

// Export types for use in components
export type { CacheWarmingRequest, CacheClearingRequest, CacheServiceConfig };
