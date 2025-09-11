/**
 * API Response Cache Middleware
 *
 * Intelligent HTTP response caching for WedSync API endpoints:
 * - Route-specific cache policies (vendors: 1hr, guests: 5min, payments: no cache)
 * - ETag support for conditional requests
 * - Background cache refresh for stale data
 * - Wedding day emergency protocols (extend all TTL)
 * - GraphQL query response caching
 *
 * Target Performance: 60% response time reduction, >70% cache hit rate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { RedisCacheService } from '../cache/redis-cache-service';
import { getVendorCacheConfig } from '../integrations/cache/vendor-cache-config';

export interface APICacheConfig {
  /** Cache TTL in seconds */
  ttl: number;
  /** Cache tags for invalidation */
  tags: string[];
  /** Vary headers to include in cache key */
  varyBy: string[];
  /** Whether to enable background refresh */
  backgroundRefresh: boolean;
  /** Wedding day TTL extension multiplier */
  weddingDayMultiplier: number;
  /** Whether caching is enabled for this route */
  enabled: boolean;
  /** Custom cache key generator */
  cacheKeyGenerator?: (req: NextRequest) => string;
  /** Conditional caching logic */
  shouldCache?: (req: NextRequest, res: NextResponse) => boolean;
}

export interface CachedResponse {
  /** Response body */
  body: string;
  /** Response headers */
  headers: Record<string, string>;
  /** HTTP status code */
  status: number;
  /** ETag for conditional requests */
  etag: string;
  /** Cache metadata */
  metadata: {
    cachedAt: string;
    expiresAt: string;
    hitCount: number;
    lastAccessed: string;
    route: string;
    method: string;
  };
}

// Route-specific cache configurations optimized for wedding industry
const ROUTE_CACHE_CONFIGS: Record<string, APICacheConfig> = {
  // Vendor endpoints - stable data, longer cache
  'GET /api/vendors': {
    ttl: 3600, // 1 hour
    tags: ['vendors', 'search'],
    varyBy: ['location', 'vendorType', 'budget', 'availability'],
    backgroundRefresh: true,
    weddingDayMultiplier: 2,
    enabled: true,
  },
  'GET /api/vendors/[id]': {
    ttl: 1800, // 30 minutes
    tags: ['vendor', 'profile'],
    varyBy: ['id'],
    backgroundRefresh: true,
    weddingDayMultiplier: 3,
    enabled: true,
  },
  'GET /api/vendors/[id]/availability': {
    ttl: 900, // 15 minutes
    tags: ['vendor', 'availability'],
    varyBy: ['id', 'date', 'duration'],
    backgroundRefresh: true,
    weddingDayMultiplier: 4, // Extra important on wedding day
    enabled: true,
  },

  // Wedding data endpoints - frequently changing
  'GET /api/weddings/[id]': {
    ttl: 600, // 10 minutes
    tags: ['wedding', 'details'],
    varyBy: ['id', 'userId'],
    backgroundRefresh: true,
    weddingDayMultiplier: 6, // Critical on wedding day
    enabled: true,
  },
  'GET /api/weddings/[id]/timeline': {
    ttl: 300, // 5 minutes
    tags: ['wedding', 'timeline'],
    varyBy: ['id'],
    backgroundRefresh: true,
    weddingDayMultiplier: 12, // Timeline is critical on wedding day
    enabled: true,
  },
  'GET /api/weddings/[id]/guests': {
    ttl: 300, // 5 minutes - guest list changes frequently
    tags: ['wedding', 'guests'],
    varyBy: ['id', 'page', 'filter'],
    backgroundRefresh: false, // Guest data too sensitive for background refresh
    weddingDayMultiplier: 8,
    enabled: true,
  },

  // Budget endpoints - sensitive financial data
  'GET /api/weddings/[id]/budget': {
    ttl: 600, // 10 minutes
    tags: ['wedding', 'budget'],
    varyBy: ['id', 'userId'],
    backgroundRefresh: false,
    weddingDayMultiplier: 4,
    enabled: true,
  },

  // AI recommendations - expensive to compute
  'GET /api/ai/recommendations': {
    ttl: 1800, // 30 minutes - AI computations are expensive
    tags: ['ai', 'recommendations'],
    varyBy: ['weddingId', 'context', 'preferences'],
    backgroundRefresh: true,
    weddingDayMultiplier: 2,
    enabled: true,
  },
  'POST /api/ai/chat': {
    ttl: 900, // 15 minutes for similar queries
    tags: ['ai', 'chat'],
    varyBy: ['weddingId', 'query'], // Cache similar queries
    backgroundRefresh: false,
    weddingDayMultiplier: 1, // AI chat not critical on wedding day
    enabled: true,
    shouldCache: (req, res) => {
      // Only cache successful AI responses
      return res.status === 200 && req.method === 'POST';
    },
  },

  // Marketplace endpoints - product data
  'GET /api/marketplace/templates': {
    ttl: 7200, // 2 hours - templates don't change often
    tags: ['marketplace', 'templates'],
    varyBy: ['category', 'price', 'rating'],
    backgroundRefresh: true,
    weddingDayMultiplier: 1, // Not critical on wedding day
    enabled: true,
  },
  'GET /api/marketplace/search': {
    ttl: 1800, // 30 minutes
    tags: ['marketplace', 'search'],
    varyBy: ['q', 'category', 'sort', 'page'],
    backgroundRefresh: true,
    weddingDayMultiplier: 1,
    enabled: true,
  },

  // Payment endpoints - NEVER cache
  'GET /api/payments': {
    ttl: 0,
    tags: [],
    varyBy: [],
    backgroundRefresh: false,
    weddingDayMultiplier: 0,
    enabled: false,
  },
  'POST /api/payments': {
    ttl: 0,
    tags: [],
    varyBy: [],
    backgroundRefresh: false,
    weddingDayMultiplier: 0,
    enabled: false,
  },
  'GET /api/stripe': {
    ttl: 0,
    tags: [],
    varyBy: [],
    backgroundRefresh: false,
    weddingDayMultiplier: 0,
    enabled: false,
  },

  // Analytics endpoints - can be cached briefly
  'GET /api/analytics': {
    ttl: 300, // 5 minutes
    tags: ['analytics'],
    varyBy: ['metric', 'timeframe', 'organizationId'],
    backgroundRefresh: true,
    weddingDayMultiplier: 1,
    enabled: true,
  },

  // Health and system endpoints
  'GET /api/health': {
    ttl: 60, // 1 minute
    tags: ['health'],
    varyBy: [],
    backgroundRefresh: false,
    weddingDayMultiplier: 1,
    enabled: true,
  },
};

export class APIResponseCacheMiddleware {
  private cacheService: RedisCacheService;
  private backgroundRefreshQueue: Map<string, NodeJS.Timeout> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    bypassed: 0,
    errors: 0,
    backgroundRefreshes: 0,
    avgResponseTime: 0,
    lastReset: new Date().toISOString(),
  };

  constructor(cacheService: RedisCacheService) {
    this.cacheService = cacheService;
  }

  /**
   * Main middleware function for Next.js API routes
   */
  async middleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    routePattern: string,
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const config = this.getCacheConfig(routePattern, request);

    // Check if caching is enabled for this route
    if (!config.enabled || request.method !== 'GET') {
      const response = await handler(request);
      this.recordStats('bypassed', Date.now() - startTime);
      return response;
    }

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(request, config, routePattern);
      const organizationId = this.extractOrganizationId(request);

      // Try to get cached response
      const cached = await this.getCachedResponse(cacheKey, organizationId);

      if (cached) {
        // Check ETag for conditional requests
        const clientETag = request.headers.get('if-none-match');
        if (clientETag === cached.etag) {
          this.recordStats('hits', Date.now() - startTime);
          return new NextResponse(null, { status: 304 });
        }

        // Check if we should serve from cache or refresh in background
        if (this.shouldServeFromCache(cached, config)) {
          // Schedule background refresh if needed
          if (
            config.backgroundRefresh &&
            this.shouldBackgroundRefresh(cached)
          ) {
            this.scheduleBackgroundRefresh(
              request,
              handler,
              cacheKey,
              organizationId,
              config,
              routePattern,
            );
          }

          this.recordStats('hits', Date.now() - startTime);
          return this.createResponseFromCache(cached);
        }
      }

      // Cache miss or expired - fetch fresh data
      const response = await handler(request);

      // Check if we should cache this response
      if (this.shouldCacheResponse(request, response, config)) {
        await this.cacheResponse(
          request,
          response,
          cacheKey,
          organizationId,
          config,
          routePattern,
        );
      }

      this.recordStats('misses', Date.now() - startTime);
      return response;
    } catch (error) {
      console.error('Cache middleware error:', error);
      this.recordStats('errors', Date.now() - startTime);

      // Always return the actual response on cache errors
      return await handler(request);
    }
  }

  /**
   * Get cache configuration for route
   */
  private getCacheConfig(
    routePattern: string,
    request: NextRequest,
  ): APICacheConfig {
    const method = request.method;
    const key = `${method} ${routePattern}`;
    const config = ROUTE_CACHE_CONFIGS[key];

    if (!config) {
      // Default configuration for unspecified routes
      return {
        ttl: 300, // 5 minutes default
        tags: ['default'],
        varyBy: [],
        backgroundRefresh: false,
        weddingDayMultiplier: 1,
        enabled: false, // Conservative - don't cache unknown routes
      };
    }

    // Apply wedding day adjustments
    if (this.isWeddingDay()) {
      const adjustedConfig = { ...config };
      adjustedConfig.ttl = config.ttl * config.weddingDayMultiplier;
      return adjustedConfig;
    }

    return config;
  }

  /**
   * Generate cache key from request and configuration
   */
  private generateCacheKey(
    request: NextRequest,
    config: APICacheConfig,
    routePattern: string,
  ): string {
    if (config.cacheKeyGenerator) {
      return config.cacheKeyGenerator(request);
    }

    const url = new URL(request.url);
    const method = request.method;

    // Base key components
    const keyParts = [
      'api_response',
      method.toLowerCase(),
      routePattern.replace(
        /\[id\]/g,
        url.pathname.split('/').pop() || 'unknown',
      ),
    ];

    // Add vary parameters
    for (const varyParam of config.varyBy) {
      const value = this.extractVaryValue(request, varyParam);
      if (value) {
        keyParts.push(`${varyParam}:${value}`);
      }
    }

    // Add query parameters that affect caching
    const relevantParams = ['page', 'limit', 'sort', 'filter', 'q'];
    relevantParams.forEach((param) => {
      const value = url.searchParams.get(param);
      if (value) {
        keyParts.push(`${param}:${value}`);
      }
    });

    return keyParts.join(':');
  }

  /**
   * Extract value for vary parameter
   */
  private extractVaryValue(
    request: NextRequest,
    varyParam: string,
  ): string | null {
    const url = new URL(request.url);

    switch (varyParam) {
      case 'id':
        return url.pathname.split('/').pop() || null;
      case 'userId':
        return request.headers.get('x-user-id');
      case 'organizationId':
        return this.extractOrganizationId(request);
      case 'location':
        return (
          url.searchParams.get('location') ||
          request.headers.get('x-user-location')
        );
      case 'vendorType':
        return url.searchParams.get('vendorType');
      case 'budget':
        return url.searchParams.get('budget');
      case 'availability':
        return (
          url.searchParams.get('date') || url.searchParams.get('available')
        );
      case 'weddingId':
        return (
          url.searchParams.get('weddingId') ||
          url.pathname.match(/weddings\/([^\/]+)/)?.[1]
        );
      case 'context':
        return url.searchParams.get('context');
      case 'preferences':
        return this.hashObject(url.searchParams.get('preferences'));
      case 'query':
        return this.hashObject(url.searchParams.get('q') || '');
      default:
        return url.searchParams.get(varyParam);
    }
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(
    cacheKey: string,
    organizationId: string,
  ): Promise<CachedResponse | null> {
    const cached = await this.cacheService.get<CachedResponse>(
      cacheKey,
      organizationId,
    );

    if (cached) {
      // Update access metadata
      cached.metadata.hitCount++;
      cached.metadata.lastAccessed = new Date().toISOString();

      return cached;
    }

    return null;
  }

  /**
   * Check if should serve from cache
   */
  private shouldServeFromCache(
    cached: CachedResponse,
    config: APICacheConfig,
  ): boolean {
    const now = new Date();
    const expiresAt = new Date(cached.metadata.expiresAt);

    // Always serve if not expired
    if (now <= expiresAt) {
      return true;
    }

    // On wedding day, serve stale data rather than wait for fresh data
    if (this.isWeddingDay()) {
      const staleAge = (now.getTime() - expiresAt.getTime()) / 1000; // seconds
      const maxStaleAge = config.ttl * 0.5; // Allow 50% stale on wedding day
      return staleAge <= maxStaleAge;
    }

    return false;
  }

  /**
   * Check if should background refresh
   */
  private shouldBackgroundRefresh(cached: CachedResponse): boolean {
    const now = new Date();
    const cachedAt = new Date(cached.metadata.cachedAt);
    const age = (now.getTime() - cachedAt.getTime()) / 1000; // seconds

    // Refresh if data is older than 80% of TTL
    const refreshThreshold = 0.8;
    return (
      age >
      (cached.metadata.expiresAt
        ? ((new Date(cached.metadata.expiresAt).getTime() -
            cachedAt.getTime()) /
            1000) *
          refreshThreshold
        : 300 * refreshThreshold)
    );
  }

  /**
   * Schedule background refresh
   */
  private scheduleBackgroundRefresh(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    cacheKey: string,
    organizationId: string,
    config: APICacheConfig,
    routePattern: string,
  ): void {
    // Avoid duplicate background refreshes
    if (this.backgroundRefreshQueue.has(cacheKey)) {
      return;
    }

    const refreshTimer = setTimeout(async () => {
      try {
        console.log(`🔄 Background refreshing cache key: ${cacheKey}`);
        const freshResponse = await handler(request);

        if (this.shouldCacheResponse(request, freshResponse, config)) {
          await this.cacheResponse(
            request,
            freshResponse,
            cacheKey,
            organizationId,
            config,
            routePattern,
          );
          this.cacheStats.backgroundRefreshes++;
        }
      } catch (error) {
        console.error('Background refresh failed:', error);
      } finally {
        this.backgroundRefreshQueue.delete(cacheKey);
      }
    }, 100); // 100ms delay to not impact current request

    this.backgroundRefreshQueue.set(cacheKey, refreshTimer);
  }

  /**
   * Check if should cache response
   */
  private shouldCacheResponse(
    request: NextRequest,
    response: NextResponse,
    config: APICacheConfig,
  ): boolean {
    // Don't cache error responses
    if (response.status >= 400) {
      return false;
    }

    // Don't cache if explicitly disabled
    if (response.headers.get('cache-control')?.includes('no-cache')) {
      return false;
    }

    // Custom validation
    if (config.shouldCache) {
      return config.shouldCache(request, response);
    }

    return true;
  }

  /**
   * Cache response
   */
  private async cacheResponse(
    request: NextRequest,
    response: NextResponse,
    cacheKey: string,
    organizationId: string,
    config: APICacheConfig,
    routePattern: string,
  ): Promise<void> {
    const body = await response.text();
    const etag = this.generateETag(body);

    const cachedResponse: CachedResponse = {
      body,
      headers: (() => {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return headers;
      })(),
      status: response.status,
      etag,
      metadata: {
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + config.ttl * 1000).toISOString(),
        hitCount: 0,
        lastAccessed: new Date().toISOString(),
        route: routePattern,
        method: request.method,
      },
    };

    // Add cache control headers
    cachedResponse.headers['etag'] = etag;
    cachedResponse.headers['cache-control'] = `public, max-age=${config.ttl}`;
    cachedResponse.headers['x-cache-status'] = 'MISS';

    await this.cacheService.set(cacheKey, cachedResponse, {
      namespace: organizationId,
      ttl: config.ttl,
      tags: config.tags,
    });
  }

  /**
   * Create response from cached data
   */
  private createResponseFromCache(cached: CachedResponse): NextResponse {
    const response = new NextResponse(cached.body, {
      status: cached.status,
      headers: {
        ...cached.headers,
        'x-cache-status': 'HIT',
        'x-cache-age': String(
          Math.floor(
            (new Date().getTime() -
              new Date(cached.metadata.cachedAt).getTime()) /
              1000,
          ),
        ),
      },
    });

    return response;
  }

  /**
   * Generate ETag for response body
   */
  private generateETag(body: string): string {
    return `"${createHash('md5').update(body).digest('hex')}"`;
  }

  /**
   * Extract organization ID from request
   */
  private extractOrganizationId(request: NextRequest): string {
    // Try multiple sources for organization ID
    return (
      request.headers.get('x-organization-id') ||
      request.headers.get('x-org-id') ||
      new URL(request.url).searchParams.get('organizationId') ||
      'default'
    );
  }

  /**
   * Check if today is wedding day (Saturday)
   */
  private isWeddingDay(): boolean {
    return new Date().getDay() === 6;
  }

  /**
   * Hash object for cache key
   */
  private hashObject(obj: any): string {
    if (!obj) return '';
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return createHash('md5').update(str).digest('hex').substring(0, 8);
  }

  /**
   * Record statistics
   */
  private recordStats(
    type: 'hits' | 'misses' | 'bypassed' | 'errors',
    responseTime: number,
  ): void {
    this.cacheStats[type]++;
    this.cacheStats.avgResponseTime =
      (this.cacheStats.avgResponseTime + responseTime) / 2;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(
    tags: string[],
    organizationId: string,
  ): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      const pattern = `api_response:*:${tag}:*`;
      totalInvalidated += await this.cacheService.invalidatePattern(
        pattern,
        organizationId,
      );
    }

    return totalInvalidated;
  }

  /**
   * Invalidate cache by route pattern
   */
  async invalidateByRoute(
    routePattern: string,
    organizationId: string,
  ): Promise<number> {
    const pattern = `api_response:*:${routePattern}:*`;
    return await this.cacheService.invalidatePattern(pattern, organizationId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      ...this.cacheStats,
      hitRate: total > 0 ? (this.cacheStats.hits / total) * 100 : 0,
      totalRequests: total,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      bypassed: 0,
      errors: 0,
      backgroundRefreshes: 0,
      avgResponseTime: 0,
      lastReset: new Date().toISOString(),
    };
  }

  /**
   * Cleanup background refresh timers
   */
  cleanup(): void {
    this.backgroundRefreshQueue.forEach((timer) => {
      clearTimeout(timer);
    });
    this.backgroundRefreshQueue.clear();
  }
}

// Helper function to create middleware instance
export function createAPIResponseCache(
  cacheService: RedisCacheService,
): APIResponseCacheMiddleware {
  return new APIResponseCacheMiddleware(cacheService);
}

export default APIResponseCacheMiddleware;
