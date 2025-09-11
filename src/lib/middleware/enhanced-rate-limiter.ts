// lib/middleware/enhanced-rate-limiter.ts
// WS-233: Enhanced Rate Limiting Integration
// Team B - Backend Implementation
// Tier-based rate limiting integrated with API usage monitoring

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface TierBasedRateLimitConfig {
  organizationId: string;
  subscriptionTier:
    | 'FREE'
    | 'STARTER'
    | 'PROFESSIONAL'
    | 'SCALE'
    | 'ENTERPRISE';
  endpoint: string;
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EnhancedRateLimitResult {
  allowed: boolean;
  quotaInfo: {
    dailyUsed: number;
    dailyLimit: number;
    dailyRemaining: number;
    monthlyUsed: number;
    monthlyLimit: number;
    utilization: number;
  };
  rateLimitInfo: {
    requestsThisMinute: number;
    minuteLimit: number;
    minuteRemaining: number;
    resetTime: Date;
    burstAllowance: number;
  };
  reason?: string;
  retryAfter?: number; // seconds
  upgradeMessage?: string;
}

export interface RateLimitViolation {
  organizationId: string;
  violationType: 'RATE_LIMIT' | 'DAILY_QUOTA' | 'MONTHLY_QUOTA' | 'BURST_LIMIT';
  endpoint: string;
  timestamp: Date;
  currentUsage: number;
  limit: number;
  subscriptionTier: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class EnhancedRateLimiter {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private redis = process.env.REDIS_URL
    ? require('redis').createClient({ url: process.env.REDIS_URL })
    : null;
  private memoryCache = new Map<string, { count: number; resetTime: number }>();

  // Cache for quota limits to avoid repeated DB queries
  private quotaCache = new Map<
    string,
    {
      data: any;
      expiresAt: number;
    }
  >();

  constructor() {
    if (this.redis) {
      this.redis.connect().catch(console.error);
    }

    // Cleanup memory cache periodically
    setInterval(() => this.cleanupMemoryCache(), 60000); // Every minute
  }

  /**
   * Check rate limits and quotas for a request
   */
  async checkRateLimit(
    config: TierBasedRateLimitConfig,
  ): Promise<EnhancedRateLimitResult> {
    try {
      // Get tier limits from cache or database
      const tierLimits = await this.getTierLimits(config.subscriptionTier);

      if (!tierLimits) {
        // Default to most restrictive limits if tier not found
        return this.createDeniedResult('INVALID_SUBSCRIPTION_TIER', {
          dailyLimit: 10,
          monthlyLimit: 100,
          minuteLimit: 1,
          burstLimit: 1,
        });
      }

      // Check daily quota first (most important)
      const dailyUsage = await this.getDailyUsage(config.organizationId);
      const dailyLimit = tierLimits.daily_quota;

      if (dailyLimit > 0 && dailyUsage >= dailyLimit) {
        await this.logViolation({
          organizationId: config.organizationId,
          violationType: 'DAILY_QUOTA',
          endpoint: config.endpoint,
          timestamp: new Date(),
          currentUsage: dailyUsage,
          limit: dailyLimit,
          subscriptionTier: config.subscriptionTier,
          severity: 'HIGH',
        });

        return this.createDeniedResult(
          'DAILY_QUOTA_EXCEEDED',
          {
            dailyUsed: dailyUsage,
            dailyLimit,
            monthlyLimit: tierLimits.monthly_quota,
            minuteLimit: tierLimits.rate_limit_per_minute,
            burstLimit: tierLimits.burst_limit,
          },
          this.getUpgradeMessage(config.subscriptionTier),
        );
      }

      // Check rate limiting (per minute)
      const minuteUsage = await this.getMinuteUsage(
        config.organizationId,
        config.endpoint,
      );
      const minuteLimit = tierLimits.rate_limit_per_minute;
      const burstLimit = tierLimits.burst_limit;

      if (minuteLimit > 0 && minuteUsage >= minuteLimit) {
        await this.logViolation({
          organizationId: config.organizationId,
          violationType: 'RATE_LIMIT',
          endpoint: config.endpoint,
          timestamp: new Date(),
          currentUsage: minuteUsage,
          limit: minuteLimit,
          subscriptionTier: config.subscriptionTier,
          severity: 'MEDIUM',
        });

        const resetTime = new Date();
        resetTime.setSeconds(0, 0);
        resetTime.setMinutes(resetTime.getMinutes() + 1);

        return this.createDeniedResult('RATE_LIMIT_EXCEEDED', {
          dailyUsed: dailyUsage,
          dailyLimit,
          monthlyLimit: tierLimits.monthly_quota,
          minuteLimit,
          burstLimit,
          resetTime,
        });
      }

      // Check burst limit (rapid sequential requests)
      const burstUsage = await this.getBurstUsage(
        config.organizationId,
        config.endpoint,
      );
      if (burstLimit > 0 && burstUsage >= burstLimit) {
        await this.logViolation({
          organizationId: config.organizationId,
          violationType: 'BURST_LIMIT',
          endpoint: config.endpoint,
          timestamp: new Date(),
          currentUsage: burstUsage,
          limit: burstLimit,
          subscriptionTier: config.subscriptionTier,
          severity: 'MEDIUM',
        });

        return this.createDeniedResult('BURST_LIMIT_EXCEEDED', {
          dailyUsed: dailyUsage,
          dailyLimit,
          monthlyLimit: tierLimits.monthly_quota,
          minuteLimit,
          burstLimit,
        });
      }

      // Increment usage counters
      await this.incrementUsageCounters(config);

      // Calculate monthly usage (estimate based on daily usage)
      const monthlyUsage = Math.round(dailyUsage * 30); // Rough estimate
      const monthlyLimit = tierLimits.monthly_quota;

      // Return success with usage information
      return {
        allowed: true,
        quotaInfo: {
          dailyUsed: dailyUsage + 1, // Include current request
          dailyLimit,
          dailyRemaining: Math.max(0, dailyLimit - dailyUsage - 1),
          monthlyUsed: monthlyUsage,
          monthlyLimit,
          utilization:
            dailyLimit > 0 ? ((dailyUsage + 1) / dailyLimit) * 100 : 0,
        },
        rateLimitInfo: {
          requestsThisMinute: minuteUsage + 1,
          minuteLimit,
          minuteRemaining: Math.max(0, minuteLimit - minuteUsage - 1),
          resetTime: this.getNextMinuteReset(),
          burstAllowance: Math.max(0, burstLimit - burstUsage - 1),
        },
      };
    } catch (error) {
      console.error('[Enhanced Rate Limiter] Check failed:', error);

      // Fail open - allow the request but log the error
      return {
        allowed: true,
        quotaInfo: {
          dailyUsed: 0,
          dailyLimit: -1, // Unknown
          dailyRemaining: -1,
          monthlyUsed: 0,
          monthlyLimit: -1,
          utilization: 0,
        },
        rateLimitInfo: {
          requestsThisMinute: 0,
          minuteLimit: -1,
          minuteRemaining: -1,
          resetTime: this.getNextMinuteReset(),
          burstAllowance: -1,
        },
        reason: 'RATE_LIMITER_ERROR',
      };
    }
  }

  /**
   * Get tier limits from database with caching
   */
  private async getTierLimits(subscriptionTier: string): Promise<any | null> {
    const cacheKey = `tier_limits_${subscriptionTier}`;
    const cached = this.quotaCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const { data, error } = await this.supabase
      .from('api_quotas')
      .select('*')
      .eq('subscription_tier', subscriptionTier)
      .single();

    if (error || !data) {
      console.error(
        `[Enhanced Rate Limiter] Failed to get tier limits for ${subscriptionTier}:`,
        error,
      );
      return null;
    }

    // Cache for 5 minutes
    this.quotaCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return data;
  }

  /**
   * Get daily usage for organization
   */
  private async getDailyUsage(organizationId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await this.supabase
        .from('api_usage_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte('created_at', today.toISOString());

      if (error) {
        console.error(
          '[Enhanced Rate Limiter] Daily usage query failed:',
          error,
        );
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('[Enhanced Rate Limiter] Daily usage check failed:', error);
      return 0;
    }
  }

  /**
   * Get minute usage for organization/endpoint
   */
  private async getMinuteUsage(
    organizationId: string,
    endpoint: string,
  ): Promise<number> {
    const currentMinute = new Date();
    currentMinute.setSeconds(0, 0);

    // Try Redis first for performance
    if (this.redis) {
      try {
        const key = `rate_limit:${organizationId}:${endpoint}:${currentMinute.getTime()}`;
        const count = await this.redis.get(key);
        return parseInt(count || '0', 10);
      } catch (error) {
        console.error(
          '[Enhanced Rate Limiter] Redis minute usage failed:',
          error,
        );
        // Fall through to database check
      }
    }

    // Fallback to database
    try {
      const { data, error } = await this.supabase
        .from('api_rate_limits')
        .select('request_count')
        .eq('organization_id', organizationId)
        .eq('endpoint', endpoint)
        .eq('time_window', currentMinute.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        console.error(
          '[Enhanced Rate Limiter] Minute usage query failed:',
          error,
        );
        return 0;
      }

      return data?.request_count || 0;
    } catch (error) {
      console.error(
        '[Enhanced Rate Limiter] Minute usage check failed:',
        error,
      );
      return 0;
    }
  }

  /**
   * Get burst usage (last 10 seconds)
   */
  private async getBurstUsage(
    organizationId: string,
    endpoint: string,
  ): Promise<number> {
    const tenSecondsAgo = new Date(Date.now() - 10000);

    try {
      const { data, error } = await this.supabase
        .from('api_usage_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('endpoint', endpoint)
        .gte('created_at', tenSecondsAgo.toISOString());

      if (error) {
        console.error(
          '[Enhanced Rate Limiter] Burst usage query failed:',
          error,
        );
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('[Enhanced Rate Limiter] Burst usage check failed:', error);
      return 0;
    }
  }

  /**
   * Increment usage counters in Redis and/or memory
   */
  private async incrementUsageCounters(
    config: TierBasedRateLimitConfig,
  ): Promise<void> {
    const currentMinute = new Date();
    currentMinute.setSeconds(0, 0);

    // Increment Redis counter
    if (this.redis) {
      try {
        const key = `rate_limit:${config.organizationId}:${config.endpoint}:${currentMinute.getTime()}`;
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, 120); // Keep for 2 minutes
        await pipeline.exec();
        return;
      } catch (error) {
        console.error('[Enhanced Rate Limiter] Redis increment failed:', error);
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    const memKey = `${config.organizationId}:${config.endpoint}:${currentMinute.getTime()}`;
    const current = this.memoryCache.get(memKey);

    if (current) {
      current.count++;
    } else {
      this.memoryCache.set(memKey, {
        count: 1,
        resetTime: currentMinute.getTime() + 120000, // 2 minutes
      });
    }
  }

  /**
   * Log rate limit violations for monitoring
   */
  private async logViolation(violation: RateLimitViolation): Promise<void> {
    try {
      // Log to dedicated violations table (would need to create this table)
      console.warn('[Enhanced Rate Limiter] Violation detected:', {
        organizationId: violation.organizationId,
        type: violation.violationType,
        endpoint: violation.endpoint,
        usage: violation.currentUsage,
        limit: violation.limit,
        tier: violation.subscriptionTier,
      });

      // Could also trigger alerts here for severe violations
      if (violation.severity === 'HIGH') {
        await this.triggerHighSeverityAlert(violation);
      }
    } catch (error) {
      console.error('[Enhanced Rate Limiter] Failed to log violation:', error);
    }
  }

  /**
   * Trigger high severity alerts for quota violations
   */
  private async triggerHighSeverityAlert(
    violation: RateLimitViolation,
  ): Promise<void> {
    try {
      await this.supabase.from('api_alert_incidents').insert({
        alert_rule_id: null, // System generated
        organization_id: violation.organizationId,
        incident_title: `${violation.violationType} Exceeded`,
        incident_description: `Organization ${violation.organizationId} exceeded ${violation.violationType.toLowerCase()} limit for ${violation.endpoint}. Usage: ${violation.currentUsage}/${violation.limit}`,
        severity: violation.severity,
        status: 'ACTIVE',
        triggered_value: violation.currentUsage,
        trigger_threshold: violation.limit,
        affected_endpoints: [violation.endpoint],
        metrics_snapshot: {
          violation_type: violation.violationType,
          subscription_tier: violation.subscriptionTier,
          endpoint: violation.endpoint,
          timestamp: violation.timestamp.toISOString(),
        },
      });
    } catch (error) {
      console.error('[Enhanced Rate Limiter] Failed to trigger alert:', error);
    }
  }

  /**
   * Create denied rate limit result
   */
  private createDeniedResult(
    reason: string,
    limits: any,
    upgradeMessage?: string,
  ): EnhancedRateLimitResult {
    const resetTime = this.getNextMinuteReset();

    return {
      allowed: false,
      quotaInfo: {
        dailyUsed: limits.dailyUsed || 0,
        dailyLimit: limits.dailyLimit || 0,
        dailyRemaining: 0,
        monthlyUsed: limits.monthlyUsed || 0,
        monthlyLimit: limits.monthlyLimit || 0,
        utilization: 100,
      },
      rateLimitInfo: {
        requestsThisMinute: limits.requestsThisMinute || 0,
        minuteLimit: limits.minuteLimit || 0,
        minuteRemaining: 0,
        resetTime: limits.resetTime || resetTime,
        burstAllowance: 0,
      },
      reason,
      retryAfter: reason === 'RATE_LIMIT_EXCEEDED' ? 60 : 3600, // 1 minute for rate limit, 1 hour for quota
      upgradeMessage,
    };
  }

  /**
   * Get upgrade message based on current tier
   */
  private getUpgradeMessage(currentTier: string): string {
    const upgradeMessages = {
      FREE: 'Upgrade to STARTER plan for higher limits and remove branding',
      STARTER: 'Upgrade to PROFESSIONAL for AI features and marketplace access',
      PROFESSIONAL: 'Upgrade to SCALE for API access and automation features',
      SCALE:
        'Upgrade to ENTERPRISE for unlimited usage and white-label features',
    };

    return (
      upgradeMessages[currentTier as keyof typeof upgradeMessages] ||
      'Contact sales for enterprise-grade limits'
    );
  }

  /**
   * Get next minute boundary for rate limit reset
   */
  private getNextMinuteReset(): Date {
    const resetTime = new Date();
    resetTime.setSeconds(0, 0);
    resetTime.setMinutes(resetTime.getMinutes() + 1);
    return resetTime;
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();

    for (const [key, value] of this.memoryCache.entries()) {
      if (value.resetTime <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Health check for rate limiter
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    const checks = {
      database: false,
      redis: false,
      memoryCache: this.memoryCache.size,
      quotaCache: this.quotaCache.size,
    };

    try {
      // Test database connection
      const { error: dbError } = await this.supabase
        .from('api_quotas')
        .select('subscription_tier')
        .limit(1);
      checks.database = !dbError;

      // Test Redis connection
      if (this.redis) {
        try {
          await this.redis.ping();
          checks.redis = true;
        } catch {
          checks.redis = false;
        }
      } else {
        checks.redis = true; // Not required, so mark as healthy
      }

      const allHealthy = checks.database && checks.redis;

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: checks,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { ...checks, error: error.message },
      };
    }
  }
}

// Validation schemas
export const TierBasedRateLimitConfigSchema = z.object({
  organizationId: z.string().uuid(),
  subscriptionTier: z.enum([
    'FREE',
    'STARTER',
    'PROFESSIONAL',
    'SCALE',
    'ENTERPRISE',
  ]),
  endpoint: z.string().max(500),
  userId: z.string().uuid().optional(),
  apiKeyId: z.string().uuid().optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(1000).optional(),
});

// Singleton instance
let enhancedRateLimiterInstance: EnhancedRateLimiter | null = null;

export function getEnhancedRateLimiter(): EnhancedRateLimiter {
  if (!enhancedRateLimiterInstance) {
    enhancedRateLimiterInstance = new EnhancedRateLimiter();
  }
  return enhancedRateLimiterInstance;
}

export default EnhancedRateLimiter;
