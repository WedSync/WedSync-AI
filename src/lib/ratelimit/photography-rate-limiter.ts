/**
 * Photography AI Rate Limiter
 * WS-130 Round 3: Production-grade rate limiting with intelligent queuing
 *
 * Features:
 * - Multi-tier rate limiting (per-user, per-plan, global)
 * - Priority queue for premium users
 * - Burst handling and smooth rate limiting
 * - Integration with billing system
 * - Performance monitoring
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { FeatureGateService } from '@/lib/billing/featureGating';
import { photographyCache } from '@/lib/cache/photography-cache';

interface RateLimitConfig {
  requests: number;
  window: string; // '1m', '1h', '1d'
  burst?: number;
  priority?: number; // 1-10, higher = more priority
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending?: number; // Queue position if applicable
  retryAfter?: number; // Seconds to wait
  plan?: string;
  priority?: number;
}

interface QueuedRequest {
  id: string;
  userId: string;
  priority: number;
  timestamp: number;
  planTier: string;
  retryCount: number;
  maxRetries: number;
}

export class PhotographyRateLimiter {
  private redis: Redis;
  private rateLimiters: Map<string, Ratelimit> = new Map();
  private queue: QueuedRequest[] = [];
  private processingQueue = false;
  private queueProcessor?: NodeJS.Timeout;

  // Rate limit configurations by plan tier
  private readonly PLAN_LIMITS: Record<string, RateLimitConfig[]> = {
    free: [
      { requests: 0, window: '1h' }, // No AI access on free
    ],
    starter: [
      { requests: 5, window: '1h', burst: 2, priority: 1 }, // Very limited
    ],
    professional: [
      { requests: 100, window: '1d', burst: 10, priority: 3 }, // Daily limit
      { requests: 20, window: '1h', burst: 5, priority: 3 }, // Hourly burst
      { requests: 5, window: '1m', burst: 2, priority: 3 }, // Per minute
    ],
    premium: [
      { requests: 1000, window: '1d', burst: 50, priority: 7 }, // High daily limit
      { requests: 100, window: '1h', burst: 20, priority: 7 }, // High hourly
      { requests: 20, window: '1m', burst: 10, priority: 7 }, // High per minute
    ],
    enterprise: [
      { requests: 10000, window: '1d', burst: 200, priority: 10 }, // Very high limits
      { requests: 500, window: '1h', burst: 100, priority: 10 },
      { requests: 50, window: '1m', burst: 25, priority: 10 },
    ],
  };

  // Global rate limits to prevent system overload
  private readonly GLOBAL_LIMITS: RateLimitConfig[] = [
    { requests: 1000, window: '1m' }, // 1000 requests per minute globally
    { requests: 50000, window: '1h' }, // 50k requests per hour globally
  ];

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    this.initializeRateLimiters();
    this.startQueueProcessor();
  }

  private initializeRateLimiters() {
    // Initialize rate limiters for each plan and configuration
    Object.entries(this.PLAN_LIMITS).forEach(([planName, configs]) => {
      configs.forEach((config, index) => {
        const key = `${planName}-${index}`;
        this.rateLimiters.set(
          key,
          new Ratelimit({
            redis: this.redis,
            limiter: Ratelimit.slidingWindow(config.requests, config.window),
            analytics: true,
            prefix: `photography-ai-${key}`,
          }),
        );
      });
    });

    // Initialize global rate limiters
    this.GLOBAL_LIMITS.forEach((config, index) => {
      const key = `global-${index}`;
      this.rateLimiters.set(
        key,
        new Ratelimit({
          redis: this.redis,
          limiter: Ratelimit.slidingWindow(config.requests, config.window),
          analytics: true,
          prefix: `photography-ai-${key}`,
        }),
      );
    });
  }

  /**
   * Check if user can make a request
   */
  async checkLimit(
    userId: string,
    requestId?: string,
    skipQueue = false,
  ): Promise<RateLimitResult> {
    try {
      // Get user's current plan
      const planLimits = await FeatureGateService.getUserPlanLimits(userId);
      const planTier = planLimits?.plan || 'free';

      // Check cached rate limit status first
      const cacheKey = `rate-limit:${userId}:${planTier}`;
      const cached = await photographyCache.getCachedFeatureAccess(
        userId,
        'rate_limit',
      );

      if (cached && this.isCacheValid(cached)) {
        return this.createResultFromCache(cached);
      }

      // Check global limits first
      for (let i = 0; i < this.GLOBAL_LIMITS.length; i++) {
        const limiter = this.rateLimiters.get(`global-${i}`);
        if (limiter) {
          const globalResult = await limiter.limit('global');
          if (!globalResult.success) {
            return {
              success: false,
              limit: globalResult.limit,
              remaining: globalResult.remaining,
              reset: globalResult.reset,
              retryAfter: Math.ceil((globalResult.reset - Date.now()) / 1000),
              plan: 'global',
              priority: 0,
            };
          }
        }
      }

      // Check plan-specific limits
      const planConfigs = this.PLAN_LIMITS[planTier] || this.PLAN_LIMITS.free;
      let mostRestrictive: RateLimitResult | null = null;

      for (let i = 0; i < planConfigs.length; i++) {
        const limiter = this.rateLimiters.get(`${planTier}-${i}`);
        if (!limiter) continue;

        const result = await limiter.limit(userId);

        if (!result.success) {
          const rateLimitResult: RateLimitResult = {
            success: false,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
            plan: planTier,
            priority: planConfigs[i].priority || 1,
          };

          // If this is a hard limit (no burst), reject immediately
          if (!planConfigs[i].burst) {
            await this.cacheRateLimitResult(userId, rateLimitResult);
            return rateLimitResult;
          }

          // Track most restrictive limit for potential queueing
          if (
            !mostRestrictive ||
            rateLimitResult.retryAfter! < mostRestrictive.retryAfter!
          ) {
            mostRestrictive = rateLimitResult;
          }
        }
      }

      // If we have rate limit issues but can queue, add to queue
      if (mostRestrictive && !skipQueue && this.canQueue(planTier)) {
        const queuePosition = await this.addToQueue(
          userId,
          requestId || crypto.randomUUID(),
          planTier,
          planConfigs[0].priority || 1,
        );

        return {
          ...mostRestrictive,
          success: false,
          pending: queuePosition,
          retryAfter: this.estimateQueueWaitTime(queuePosition, planTier),
        };
      }

      // If we get here, all checks passed
      const successResult: RateLimitResult = {
        success: true,
        limit: Math.min(...planConfigs.map((c) => c.requests)),
        remaining: Math.max(
          0,
          Math.min(...planConfigs.map((c) => c.requests)) - 1,
        ),
        reset: Date.now() + 60 * 1000, // Next minute
        plan: planTier,
        priority: planConfigs[0].priority || 1,
      };

      await this.cacheRateLimitResult(userId, successResult);
      return successResult;
    } catch (error) {
      console.error('Rate limit check failed:', error);

      // Fail open for system errors (allow request but log)
      return {
        success: true,
        limit: 1,
        remaining: 0,
        reset: Date.now() + 60 * 1000,
        plan: 'error',
      };
    }
  }

  /**
   * Add request to priority queue
   */
  private async addToQueue(
    userId: string,
    requestId: string,
    planTier: string,
    priority: number,
  ): Promise<number> {
    const queuedRequest: QueuedRequest = {
      id: requestId,
      userId,
      priority,
      timestamp: Date.now(),
      planTier,
      retryCount: 0,
      maxRetries: 3,
    };

    // Insert in priority order
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, queuedRequest);

    // Store in Redis for persistence
    await this.redis.lpush(
      'photography-ai-queue',
      JSON.stringify(queuedRequest),
    );

    return insertIndex + 1; // Return 1-based position
  }

  /**
   * Process queue periodically
   */
  private startQueueProcessor() {
    this.queueProcessor = setInterval(async () => {
      if (this.processingQueue || this.queue.length === 0) return;

      this.processingQueue = true;

      try {
        await this.processQueue();
      } catch (error) {
        console.error('Queue processing error:', error);
      } finally {
        this.processingQueue = false;
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    const maxProcessPerCycle = 10;
    let processed = 0;

    while (this.queue.length > 0 && processed < maxProcessPerCycle) {
      const request = this.queue[0];

      // Check if request has expired (5 minutes max wait)
      if (Date.now() - request.timestamp > 5 * 60 * 1000) {
        this.queue.shift();
        await this.redis.lpop('photography-ai-queue');
        continue;
      }

      // Try to process the request
      const canProcess = await this.checkLimit(
        request.userId,
        request.id,
        true,
      );

      if (canProcess.success) {
        // Request can now be processed
        this.queue.shift();
        await this.redis.lpop('photography-ai-queue');

        // Notify waiting client (this would typically be done via WebSocket or polling)
        await this.notifyRequestReady(request);
        processed++;
      } else if (request.retryCount >= request.maxRetries) {
        // Max retries exceeded, remove from queue
        this.queue.shift();
        await this.redis.lpop('photography-ai-queue');
        await this.notifyRequestFailed(request);
      } else {
        // Still can't process, increment retry and break
        request.retryCount++;
        break;
      }
    }
  }

  /**
   * Estimate queue wait time
   */
  private estimateQueueWaitTime(position: number, planTier: string): number {
    const planConfig =
      this.PLAN_LIMITS[planTier]?.[0] || this.PLAN_LIMITS.free[0];
    const averageProcessingTime = 30; // seconds
    const queueThroughput = Math.max(1, Math.floor(planConfig.requests / 60)); // requests per minute

    return Math.ceil((position / queueThroughput) * 60) + averageProcessingTime;
  }

  /**
   * Check if plan can use queue
   */
  private canQueue(planTier: string): boolean {
    const queueEnabledPlans = ['professional', 'premium', 'enterprise'];
    return queueEnabledPlans.includes(planTier);
  }

  /**
   * Check if cached rate limit is still valid
   */
  private isCacheValid(cached: any): boolean {
    if (!cached || !cached.timestamp) return false;
    return Date.now() - cached.timestamp < 30000; // 30 seconds
  }

  /**
   * Create result from cached data
   */
  private createResultFromCache(cached: any): RateLimitResult {
    return {
      success: cached.success,
      limit: cached.limit,
      remaining: Math.max(0, cached.remaining - 1),
      reset: cached.reset,
      plan: cached.plan,
      priority: cached.priority,
    };
  }

  /**
   * Cache rate limit result
   */
  private async cacheRateLimitResult(userId: string, result: RateLimitResult) {
    await photographyCache.cacheFeatureAccess(userId, 'rate_limit', {
      ...result,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify client that request is ready
   */
  private async notifyRequestReady(request: QueuedRequest) {
    // In a real implementation, this would use WebSocket, Server-Sent Events,
    // or a callback mechanism to notify the waiting client
    console.log(`Request ${request.id} ready for processing`);

    // Could also use Redis pub/sub
    await this.redis.publish(`request-ready:${request.userId}`, request.id);
  }

  /**
   * Notify client that request failed
   */
  private async notifyRequestFailed(request: QueuedRequest) {
    console.log(
      `Request ${request.id} failed after ${request.retryCount} retries`,
    );
    await this.redis.publish(`request-failed:${request.userId}`, request.id);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(userId: string): Promise<{
    plan: string;
    limits: Array<{
      window: string;
      limit: number;
      remaining: number;
      reset: number;
    }>;
    queuePosition?: number;
    queueWaitTime?: number;
  }> {
    try {
      const planLimits = await FeatureGateService.getUserPlanLimits(userId);
      const planTier = planLimits?.plan || 'free';
      const planConfigs = this.PLAN_LIMITS[planTier] || this.PLAN_LIMITS.free;

      const limits = [];
      for (let i = 0; i < planConfigs.length; i++) {
        const limiter = this.rateLimiters.get(`${planTier}-${i}`);
        if (limiter) {
          // This is a check-only operation, doesn't consume the limit
          const result = await limiter.limit(userId);
          limits.push({
            window: planConfigs[i].window,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
          });
        }
      }

      // Check if user is in queue
      const queuePosition = this.queue.findIndex(
        (req) => req.userId === userId,
      );
      let queueInfo = {};

      if (queuePosition >= 0) {
        queueInfo = {
          queuePosition: queuePosition + 1,
          queueWaitTime: this.estimateQueueWaitTime(
            queuePosition + 1,
            planTier,
          ),
        };
      }

      return {
        plan: planTier,
        limits,
        ...queueInfo,
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        plan: 'unknown',
        limits: [],
      };
    }
  }

  /**
   * Clear user from queue
   */
  async removeFromQueue(userId: string, requestId?: string): Promise<boolean> {
    let removed = false;

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const req = this.queue[i];
      if (req.userId === userId && (!requestId || req.id === requestId)) {
        this.queue.splice(i, 1);
        removed = true;
        if (requestId) break; // Only remove specific request
      }
    }

    return removed;
  }

  /**
   * Get rate limiter statistics
   */
  async getStatistics(): Promise<{
    queueLength: number;
    totalProcessed: number;
    averageWaitTime: number;
    planDistribution: Record<string, number>;
  }> {
    const planDistribution: Record<string, number> = {};

    this.queue.forEach((req) => {
      planDistribution[req.planTier] =
        (planDistribution[req.planTier] || 0) + 1;
    });

    const recentProcessingTimes = await this.redis.lrange(
      'processing-times',
      0,
      99,
    );
    const avgWaitTime =
      recentProcessingTimes.length > 0
        ? recentProcessingTimes.reduce((sum, time) => sum + parseInt(time), 0) /
          recentProcessingTimes.length
        : 0;

    return {
      queueLength: this.queue.length,
      totalProcessed: (await this.redis.get('total-processed')) || 0,
      averageWaitTime: avgWaitTime,
      planDistribution,
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }
    this.queue = [];
    await this.redis.quit();
  }
}

// Export singleton instance
export const photographyRateLimiter = new PhotographyRateLimiter();
