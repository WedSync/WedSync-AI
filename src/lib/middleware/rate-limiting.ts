// lib/middleware/rate-limiting.ts
import { createClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  burstLimit?: number;
  identifier: string;
  endpoint: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: number;
  retryAfterMinutes?: number;
  reason?: string;
}

export interface RateLimitRequest {
  identifier: string;
  endpoint: string;
  windowSeconds: number;
  maxRequests: number;
  userId?: string;
  supplierId?: string;
  subscriptionTier: string;
  requestId: string;
}

export class DistributedRateLimiter {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
  // Simple in-memory cache for Edge Runtime compatibility
  private memoryCache = new Map<string, {count: number, resetTime: number}>();

  // Wedding industry rate limit configurations
  private readonly RATE_LIMIT_TIERS = {
    free: {
      api: { windowSeconds: 3600, maxRequests: 100, burstLimit: 10 },
      forms: { windowSeconds: 3600, maxRequests: 20, burstLimit: 3 },
      ai: { windowSeconds: 3600, maxRequests: 10, burstLimit: 2 },
      search: { windowSeconds: 60, maxRequests: 30, burstLimit: 10 },
    },
    basic: {
      api: { windowSeconds: 3600, maxRequests: 500, burstLimit: 25 },
      forms: { windowSeconds: 3600, maxRequests: 100, burstLimit: 10 },
      ai: { windowSeconds: 3600, maxRequests: 50, burstLimit: 5 },
      search: { windowSeconds: 60, maxRequests: 100, burstLimit: 20 },
    },
    premium: {
      api: { windowSeconds: 3600, maxRequests: 2000, burstLimit: 100 },
      forms: { windowSeconds: 3600, maxRequests: 500, burstLimit: 25 },
      ai: { windowSeconds: 3600, maxRequests: 200, burstLimit: 20 },
      search: { windowSeconds: 60, maxRequests: 300, burstLimit: 50 },
    },
    enterprise: {
      api: { windowSeconds: 3600, maxRequests: 10000, burstLimit: 500 },
      forms: { windowSeconds: 3600, maxRequests: 2000, burstLimit: 100 },
      ai: { windowSeconds: 3600, maxRequests: 1000, burstLimit: 100 },
      search: { windowSeconds: 60, maxRequests: 1000, burstLimit: 200 },
    },
  };

  async checkRateLimit(request: RateLimitRequest): Promise<RateLimitResult> {
    try {
      // Determine rate limit configuration
      const config = this.getRateLimitConfig(
        request.endpoint,
        request.subscriptionTier,
      );

      // Create cache keys for different time windows
      const hourlyKey = this.createRedisKey(
        request.identifier,
        request.endpoint,
        'hourly',
      );
      const burstKey = this.createRedisKey(
        request.identifier,
        request.endpoint,
        'burst',
      );

      // Check burst limit (1 minute window)
      const burstResult = await this.checkBurstLimit(burstKey, config);
      if (!burstResult.allowed) {
        await this.logRateLimitViolation(
          request,
          'burst_limit_exceeded',
          burstResult,
        );
        return burstResult;
      }

      // Check hourly limit
      const hourlyResult = await this.checkHourlyLimit(hourlyKey, config);
      if (!hourlyResult.allowed) {
        await this.logRateLimitViolation(
          request,
          'hourly_limit_exceeded',
          hourlyResult,
        );
        return hourlyResult;
      }

      // Check for wedding season adjustments
      const seasonAdjustment = await this.applyWeddingSeasonAdjustment(request);
      if (!seasonAdjustment.allowed) {
        await this.logRateLimitViolation(
          request,
          'wedding_season_limit',
          seasonAdjustment,
        );
        return seasonAdjustment;
      }

      // Increment counters for successful requests
      this.incrementCounter(burstKey, Date.now() + 60000); // 1 minute expiry
      this.incrementCounter(hourlyKey, Date.now() + 3600000); // 1 hour expiry

      // Update rate limit bucket in database for persistence
      await this.updateRateLimitBucket(request, config);

      return {
        allowed: true,
        remaining: Math.max(
          0,
          config.maxRequests - hourlyResult.currentCount - 1,
        ),
        limit: config.maxRequests,
        resetTime: Date.now() + config.windowSeconds * 1000,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open for rate limiting errors to avoid blocking legitimate users
      return {
        allowed: true,
        remaining: 100,
        limit: 1000,
        resetTime: Date.now() + 3600000, // 1 hour
        reason: 'Rate limiting service unavailable',
      };
    }
  }

  private getRateLimitConfig(
    endpoint: string,
    tier: string,
  ): {
    windowSeconds: number;
    maxRequests: number;
    burstLimit: number;
  } {
    const tierConfig =
      this.RATE_LIMIT_TIERS[tier as keyof typeof this.RATE_LIMIT_TIERS] ||
      this.RATE_LIMIT_TIERS.free;

    // Determine endpoint category
    if (endpoint.includes('/api/ai')) {
      return tierConfig.ai;
    } else if (endpoint.includes('/api/forms/submit')) {
      return tierConfig.forms;
    } else if (
      endpoint.includes('/api/suppliers/search') ||
      endpoint.includes('/api/venues/search')
    ) {
      return tierConfig.search;
    } else {
      return tierConfig.api;
    }
  }

  private createRedisKey(
    identifier: string,
    endpoint: string,
    window: string,
  ): string {
    const endpointHash = endpoint.replace(/\/\d+/g, '/:id'); // Normalize dynamic routes
    return `ratelimit:${window}:${identifier}:${endpointHash}`;
  }

  private async checkBurstLimit(
    key: string,
    config: any,
  ): Promise<RateLimitResult> {
    const cached = this.memoryCache.get(key);
    const now = Date.now();
    const resetTime = now + 60000; // 1 minute
    
    // Clean expired entries
    if (cached && cached.resetTime <= now) {
      this.memoryCache.delete(key);
    }
    
    const current = (cached && cached.resetTime > now) ? cached.count : 0;
    const limit = config.burstLimit || 10;

    if (current >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetTime,
        retryAfterMinutes: 1,
        reason: 'Burst limit exceeded - too many requests in short time',
      };
    }

    return {
      allowed: true,
      remaining: limit - current - 1,
      limit,
      resetTime,
      currentCount: current,
    } as RateLimitResult & { currentCount: number };
  }

  private async checkHourlyLimit(
    key: string,
    config: any,
  ): Promise<RateLimitResult> {
    const cached = this.memoryCache.get(key);
    const now = Date.now();
    const resetTime = now + config.windowSeconds * 1000;
    
    // Clean expired entries
    if (cached && cached.resetTime <= now) {
      this.memoryCache.delete(key);
    }
    
    const current = (cached && cached.resetTime > now) ? cached.count : 0;
    const limit = config.maxRequests;

    if (current >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetTime,
        retryAfterMinutes: Math.ceil(config.windowSeconds / 60),
        reason: 'Hourly rate limit exceeded',
      };
    }

    return {
      allowed: true,
      remaining: limit - current - 1,
      limit,
      resetTime,
      currentCount: current,
    } as RateLimitResult & { currentCount: number };
  }

  private async applyWeddingSeasonAdjustment(
    request: RateLimitRequest,
  ): Promise<RateLimitResult> {
    // During peak wedding season (May-September), apply stricter limits for non-premium users
    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = currentMonth >= 5 && currentMonth <= 9;

    if (
      isPeakSeason &&
      !['premium', 'enterprise'].includes(request.subscriptionTier)
    ) {
      // Apply 25% reduction to rate limits during peak season for free/basic users
      const seasonalKey = this.createRedisKey(
        request.identifier,
        'seasonal',
        'peak',
      );
      const seasonalLimit = Math.floor(
        this.RATE_LIMIT_TIERS[
          request.subscriptionTier as keyof typeof this.RATE_LIMIT_TIERS
        ].api.maxRequests * 0.75,
      );

      const cached = this.memoryCache.get(seasonalKey);
      const now = Date.now();
      const resetTime = now + 3600000; // 1 hour
      
      // Clean expired entries
      if (cached && cached.resetTime <= now) {
        this.memoryCache.delete(seasonalKey);
      }
      
      const current = (cached && cached.resetTime > now) ? cached.count : 0;

      if (current >= seasonalLimit) {
        return {
          allowed: false,
          remaining: 0,
          limit: seasonalLimit,
          resetTime,
          retryAfterMinutes: 60,
          reason: 'Peak wedding season rate limit - upgrade for higher limits',
        };
      }

      this.incrementCounter(seasonalKey, resetTime);
    }

    return {
      allowed: true,
      remaining: 100,
      limit: 1000,
      resetTime: Date.now() + 3600000,
    };
  }

  private incrementCounter(
    key: string,
    resetTime: number,
  ): void {
    const cached = this.memoryCache.get(key);
    const now = Date.now();
    
    // Clean expired entries
    if (cached && cached.resetTime <= now) {
      this.memoryCache.delete(key);
    }
    
    const current = (cached && cached.resetTime > now) ? cached.count : 0;
    this.memoryCache.set(key, { count: current + 1, resetTime });
  }

  private async updateRateLimitBucket(
    request: RateLimitRequest,
    config: any,
  ): Promise<void> {
    const windowStart = new Date(
      Math.floor(Date.now() / (config.windowSeconds * 1000)) *
        config.windowSeconds *
        1000,
    );

    await this.supabase.from('rate_limit_buckets').upsert(
      {
        identifier: request.identifier,
        endpoint_pattern: request.endpoint.replace(/\/\d+/g, '/:id'),
        requests_count: 1,
        window_start: windowStart.toISOString(),
        window_duration_seconds: config.windowSeconds,
        max_requests: config.maxRequests,
        user_id: request.userId,
        supplier_id: request.supplierId,
        subscription_tier: request.subscriptionTier,
      },
      {
        onConflict: 'identifier,endpoint_pattern',
        ignoreDuplicates: false,
      },
    );
  }

  private async logRateLimitViolation(
    request: RateLimitRequest,
    violationType: string,
    result: RateLimitResult,
  ): Promise<void> {
    await this.supabase.from('security_events').insert({
      event_type: 'rate_limit_exceeded',
      request_id: request.requestId,
      ip_address: '0.0.0.0', // Will be populated by calling middleware
      user_id: request.userId,
      supplier_id: request.supplierId,
      severity: 'medium',
      description: `Rate limit violation: ${violationType}`,
      action_taken: 'throttled',
      blocked_duration_minutes: result.retryAfterMinutes,
      additional_data: {
        endpoint: request.endpoint,
        subscription_tier: request.subscriptionTier,
        limit: result.limit,
        current_count: (result as any).currentCount,
        violation_type: violationType,
      },
    });
  }

  async resetRateLimit(identifier: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      // Reset specific endpoint
      const keys = [
        this.createRedisKey(identifier, endpoint, 'hourly'),
        this.createRedisKey(identifier, endpoint, 'burst'),
      ];
      keys.forEach(key => this.memoryCache.delete(key));
    } else {
      // Reset all limits for identifier
      const pattern = `ratelimit:*:${identifier}:*`;
      const keysToDelete: string[] = [];
      for (const [key] of this.memoryCache.entries()) {
        if (key.includes(`:${identifier}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    }
  }

  async getRateLimitStatus(identifier: string): Promise<{
    hourlyUsage: number;
    hourlyLimit: number;
    burstUsage: number;
    burstLimit: number;
    resetTime: number;
  }> {
    // Get general API usage (most common endpoint type)
    const hourlyKey = this.createRedisKey(identifier, '/api/general', 'hourly');
    const burstKey = this.createRedisKey(identifier, '/api/general', 'burst');
    const now = Date.now();

    const hourlyCached = this.memoryCache.get(hourlyKey);
    const burstCached = this.memoryCache.get(burstKey);

    const hourlyUsage = (hourlyCached && hourlyCached.resetTime > now) ? hourlyCached.count : 0;
    const burstUsage = (burstCached && burstCached.resetTime > now) ? burstCached.count : 0;

    return {
      hourlyUsage,
      hourlyLimit: 1000, // Default, should be determined by tier
      burstUsage,
      burstLimit: 50,
      resetTime: Date.now() + 3600000, // 1 hour from now
    };
  }

  async cleanupExpiredBuckets(): Promise<void> {
    // Clean up old rate limit buckets from database
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    await this.supabase
      .from('rate_limit_buckets')
      .delete()
      .lt('window_start', cutoffTime.toISOString());
  }
}

export const rateLimiter = new DistributedRateLimiter();

export async function rateLimitCheck(
  request: RateLimitRequest,
): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit(request);
}
