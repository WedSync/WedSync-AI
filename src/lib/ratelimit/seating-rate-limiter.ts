/**
 * WS-154 Round 3: Production-Ready Rate Limiting and Throttling System
 * Team B - Advanced Rate Limiting for Seating Optimization APIs
 * Protects against abuse while ensuring fair usage across all couples
 */

import { NextRequest, NextResponse } from 'next/server';
import { seatingObservabilitySystem } from '@/lib/monitoring/seating-observability-system';

// Rate Limiting Configuration
export interface RateLimitConfig {
  // Basic rate limiting
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;

  // Burst limiting
  burst_limit: number;
  burst_window_seconds: number;

  // Resource-based limiting
  optimization_requests_per_hour: number;
  ml_optimization_requests_per_hour: number;
  genetic_optimization_requests_per_day: number;

  // Mobile-specific limits
  mobile_requests_per_minute: number;
  mobile_requests_per_hour: number;

  // Team integration limits
  team_integration_requests_per_hour: number;

  // Penalty system
  enable_progressive_penalties: boolean;
  penalty_multiplier: number;
  penalty_duration_minutes: number;

  // Whitelist and blacklist
  whitelisted_couples: string[];
  blacklisted_couples: string[];

  // Premium tier adjustments
  premium_multiplier: number;
  enterprise_multiplier: number;
}

export enum RateLimitTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
  ADMIN = 'ADMIN',
}

export enum RateLimitType {
  GLOBAL = 'GLOBAL',
  COUPLE_BASED = 'COUPLE_BASED',
  IP_BASED = 'IP_BASED',
  ENDPOINT_BASED = 'ENDPOINT_BASED',
  RESOURCE_BASED = 'RESOURCE_BASED',
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset_time: Date;
  retry_after_seconds?: number;
  tier: RateLimitTier;
  penalty_active: boolean;
  reason?: string;
  headers: Record<string, string>;
}

export interface RateLimitUsage {
  couple_id: string;
  tier: RateLimitTier;
  current_usage: {
    requests_per_minute: number;
    requests_per_hour: number;
    requests_per_day: number;
    optimization_requests_hour: number;
    ml_optimization_requests_hour: number;
    genetic_optimization_requests_day: number;
    mobile_requests_minute: number;
    mobile_requests_hour: number;
    team_integration_requests_hour: number;
  };
  timestamps: {
    last_request: Date;
    last_reset_minute: Date;
    last_reset_hour: Date;
    last_reset_day: Date;
  };
  penalties: {
    active: boolean;
    multiplier: number;
    expires_at?: Date;
    reason?: string;
  };
  burst_tracking: {
    requests_in_burst: number;
    burst_start_time: Date;
  };
}

// Default rate limiting configurations for different tiers
const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  [RateLimitTier.FREE]: {
    requests_per_minute: 10,
    requests_per_hour: 100,
    requests_per_day: 500,
    burst_limit: 5,
    burst_window_seconds: 10,
    optimization_requests_per_hour: 20,
    ml_optimization_requests_per_hour: 5,
    genetic_optimization_requests_per_day: 3,
    mobile_requests_per_minute: 15,
    mobile_requests_per_hour: 150,
    team_integration_requests_per_hour: 50,
    enable_progressive_penalties: true,
    penalty_multiplier: 0.5,
    penalty_duration_minutes: 30,
    whitelisted_couples: [],
    blacklisted_couples: [],
    premium_multiplier: 1.0,
    enterprise_multiplier: 1.0,
  },

  [RateLimitTier.PREMIUM]: {
    requests_per_minute: 30,
    requests_per_hour: 500,
    requests_per_day: 2000,
    burst_limit: 15,
    burst_window_seconds: 10,
    optimization_requests_per_hour: 100,
    ml_optimization_requests_per_hour: 30,
    genetic_optimization_requests_per_day: 15,
    mobile_requests_per_minute: 50,
    mobile_requests_per_hour: 600,
    team_integration_requests_per_hour: 200,
    enable_progressive_penalties: true,
    penalty_multiplier: 0.7,
    penalty_duration_minutes: 15,
    whitelisted_couples: [],
    blacklisted_couples: [],
    premium_multiplier: 2.0,
    enterprise_multiplier: 1.0,
  },

  [RateLimitTier.ENTERPRISE]: {
    requests_per_minute: 100,
    requests_per_hour: 2000,
    requests_per_day: 10000,
    burst_limit: 50,
    burst_window_seconds: 10,
    optimization_requests_per_hour: 500,
    ml_optimization_requests_per_hour: 150,
    genetic_optimization_requests_per_day: 75,
    mobile_requests_per_minute: 200,
    mobile_requests_per_hour: 2500,
    team_integration_requests_per_hour: 1000,
    enable_progressive_penalties: false,
    penalty_multiplier: 1.0,
    penalty_duration_minutes: 5,
    whitelisted_couples: [],
    blacklisted_couples: [],
    premium_multiplier: 1.0,
    enterprise_multiplier: 5.0,
  },

  [RateLimitTier.ADMIN]: {
    requests_per_minute: 1000,
    requests_per_hour: 10000,
    requests_per_day: 100000,
    burst_limit: 500,
    burst_window_seconds: 10,
    optimization_requests_per_hour: 5000,
    ml_optimization_requests_per_hour: 1000,
    genetic_optimization_requests_per_day: 500,
    mobile_requests_per_minute: 1000,
    mobile_requests_per_hour: 10000,
    team_integration_requests_per_hour: 10000,
    enable_progressive_penalties: false,
    penalty_multiplier: 1.0,
    penalty_duration_minutes: 0,
    whitelisted_couples: [],
    blacklisted_couples: [],
    premium_multiplier: 1.0,
    enterprise_multiplier: 1.0,
  },
};

// Rate Limiter Class
export class SeatingRateLimiter {
  private usageStore = new Map<string, RateLimitUsage>();
  private globalUsage = {
    requests_per_second: 0,
    requests_per_minute: 0,
    last_reset_second: new Date(),
    last_reset_minute: new Date(),
  };

  constructor() {
    this.startCleanupInterval();
    this.startGlobalTracking();
  }

  async checkRateLimit(
    coupleId: string,
    tier: RateLimitTier,
    endpoint: string,
    requestType:
      | 'standard'
      | 'mobile'
      | 'ml'
      | 'genetic'
      | 'team_integration' = 'standard',
    clientIP?: string,
  ): Promise<RateLimitResult> {
    const config = RATE_LIMIT_CONFIGS[tier];
    const usage = this.getOrCreateUsage(coupleId, tier);

    // Check blacklist first
    if (config.blacklisted_couples.includes(coupleId)) {
      return this.createRateLimitResult(
        false,
        0,
        0,
        new Date(),
        tier,
        true,
        'Couple is blacklisted',
      );
    }

    // Check whitelist (bypass all limits)
    if (config.whitelisted_couples.includes(coupleId)) {
      return this.createRateLimitResult(
        true,
        999999,
        999999,
        new Date(),
        tier,
        false,
      );
    }

    // Update usage counters
    this.updateUsageCounters(usage, requestType);

    // Check global system limits first
    const globalCheck = this.checkGlobalLimits();
    if (!globalCheck.allowed) {
      return globalCheck;
    }

    // Check burst limits
    const burstCheck = this.checkBurstLimits(usage, config);
    if (!burstCheck.allowed) {
      return burstCheck;
    }

    // Check specific rate limits based on request type
    const typeCheck = this.checkRequestTypeLimits(
      usage,
      config,
      requestType,
      tier,
    );
    if (!typeCheck.allowed) {
      // Apply penalties if enabled
      if (config.enable_progressive_penalties) {
        this.applyPenalty(usage, config);
      }

      // Record rate limit hit for monitoring
      seatingObservabilitySystem.recordRateLimitHit({
        couple_id: coupleId,
        endpoint,
        current_usage: this.getTotalRequestsThisHour(usage),
      });

      return typeCheck;
    }

    // Check time-based limits
    const timeCheck = this.checkTimeLimits(usage, config, tier);
    if (!timeCheck.allowed) {
      if (config.enable_progressive_penalties) {
        this.applyPenalty(usage, config);
      }

      seatingObservabilitySystem.recordRateLimitHit({
        couple_id: coupleId,
        endpoint,
        current_usage: this.getTotalRequestsThisHour(usage),
      });

      return timeCheck;
    }

    // All checks passed
    return this.createRateLimitResult(
      true,
      config.requests_per_hour,
      config.requests_per_hour - usage.current_usage.requests_per_hour,
      new Date(Date.now() + 60 * 60 * 1000), // Next hour
      tier,
      usage.penalties.active,
    );
  }

  private checkGlobalLimits(): RateLimitResult {
    // Global system protection (prevents system overload)
    const globalLimit = {
      requests_per_second: 200,
      requests_per_minute: 5000,
    };

    this.updateGlobalUsage();

    if (
      this.globalUsage.requests_per_second > globalLimit.requests_per_second
    ) {
      return this.createRateLimitResult(
        false,
        globalLimit.requests_per_second,
        0,
        new Date(Date.now() + 1000),
        RateLimitTier.FREE,
        false,
        'Global system limit exceeded - please try again momentarily',
      );
    }

    if (
      this.globalUsage.requests_per_minute > globalLimit.requests_per_minute
    ) {
      return this.createRateLimitResult(
        false,
        globalLimit.requests_per_minute,
        0,
        new Date(Date.now() + 60000),
        RateLimitTier.FREE,
        false,
        'System under heavy load - please try again in a minute',
      );
    }

    return this.createRateLimitResult(
      true,
      globalLimit.requests_per_minute,
      globalLimit.requests_per_minute - this.globalUsage.requests_per_minute,
      new Date(Date.now() + 60000),
      RateLimitTier.FREE,
      false,
    );
  }

  private checkBurstLimits(
    usage: RateLimitUsage,
    config: RateLimitConfig,
  ): RateLimitResult {
    const now = new Date();
    const burstWindowMs = config.burst_window_seconds * 1000;

    // Reset burst counter if window expired
    if (
      now.getTime() - usage.burst_tracking.burst_start_time.getTime() >
      burstWindowMs
    ) {
      usage.burst_tracking.requests_in_burst = 0;
      usage.burst_tracking.burst_start_time = now;
    }

    // Check burst limit
    if (usage.burst_tracking.requests_in_burst >= config.burst_limit) {
      const resetTime = new Date(
        usage.burst_tracking.burst_start_time.getTime() + burstWindowMs,
      );
      return this.createRateLimitResult(
        false,
        config.burst_limit,
        0,
        resetTime,
        usage.tier,
        usage.penalties.active,
        'Burst limit exceeded',
      );
    }

    // Increment burst counter
    usage.burst_tracking.requests_in_burst++;

    return this.createRateLimitResult(
      true,
      config.burst_limit,
      config.burst_limit - usage.burst_tracking.requests_in_burst,
      new Date(usage.burst_tracking.burst_start_time.getTime() + burstWindowMs),
      usage.tier,
      usage.penalties.active,
    );
  }

  private checkRequestTypeLimits(
    usage: RateLimitUsage,
    config: RateLimitConfig,
    requestType: string,
    tier: RateLimitTier,
  ): RateLimitResult {
    switch (requestType) {
      case 'mobile':
        if (
          usage.current_usage.mobile_requests_minute >=
          config.mobile_requests_per_minute
        ) {
          return this.createRateLimitResult(
            false,
            config.mobile_requests_per_minute,
            0,
            new Date(Date.now() + 60000),
            tier,
            usage.penalties.active,
            'Mobile requests per minute exceeded',
          );
        }
        if (
          usage.current_usage.mobile_requests_hour >=
          config.mobile_requests_per_hour
        ) {
          return this.createRateLimitResult(
            false,
            config.mobile_requests_per_hour,
            0,
            new Date(Date.now() + 3600000),
            tier,
            usage.penalties.active,
            'Mobile requests per hour exceeded',
          );
        }
        break;

      case 'ml':
        if (
          usage.current_usage.ml_optimization_requests_hour >=
          config.ml_optimization_requests_per_hour
        ) {
          return this.createRateLimitResult(
            false,
            config.ml_optimization_requests_per_hour,
            0,
            new Date(Date.now() + 3600000),
            tier,
            usage.penalties.active,
            'ML optimization requests per hour exceeded',
          );
        }
        break;

      case 'genetic':
        if (
          usage.current_usage.genetic_optimization_requests_day >=
          config.genetic_optimization_requests_per_day
        ) {
          return this.createRateLimitResult(
            false,
            config.genetic_optimization_requests_per_day,
            0,
            new Date(Date.now() + 86400000),
            tier,
            usage.penalties.active,
            'Genetic optimization daily limit exceeded',
          );
        }
        break;

      case 'team_integration':
        if (
          usage.current_usage.team_integration_requests_hour >=
          config.team_integration_requests_per_hour
        ) {
          return this.createRateLimitResult(
            false,
            config.team_integration_requests_per_hour,
            0,
            new Date(Date.now() + 3600000),
            tier,
            usage.penalties.active,
            'Team integration requests per hour exceeded',
          );
        }
        break;
    }

    return this.createRateLimitResult(
      true,
      999999,
      999999,
      new Date(),
      tier,
      usage.penalties.active,
    );
  }

  private checkTimeLimits(
    usage: RateLimitUsage,
    config: RateLimitConfig,
    tier: RateLimitTier,
  ): RateLimitResult {
    // Apply penalty multiplier if active
    let penaltyMultiplier = 1.0;
    if (usage.penalties.active) {
      penaltyMultiplier = usage.penalties.multiplier;
    }

    // Check per-minute limit
    const effectiveMinuteLimit = Math.floor(
      config.requests_per_minute * penaltyMultiplier,
    );
    if (usage.current_usage.requests_per_minute >= effectiveMinuteLimit) {
      return this.createRateLimitResult(
        false,
        effectiveMinuteLimit,
        0,
        new Date(Date.now() + 60000),
        tier,
        usage.penalties.active,
        'Requests per minute exceeded',
      );
    }

    // Check per-hour limit
    const effectiveHourLimit = Math.floor(
      config.requests_per_hour * penaltyMultiplier,
    );
    if (usage.current_usage.requests_per_hour >= effectiveHourLimit) {
      return this.createRateLimitResult(
        false,
        effectiveHourLimit,
        0,
        new Date(Date.now() + 3600000),
        tier,
        usage.penalties.active,
        'Requests per hour exceeded',
      );
    }

    // Check per-day limit
    const effectiveDayLimit = Math.floor(
      config.requests_per_day * penaltyMultiplier,
    );
    if (usage.current_usage.requests_per_day >= effectiveDayLimit) {
      return this.createRateLimitResult(
        false,
        effectiveDayLimit,
        0,
        new Date(Date.now() + 86400000),
        tier,
        usage.penalties.active,
        'Daily request limit exceeded',
      );
    }

    return this.createRateLimitResult(
      true,
      effectiveHourLimit,
      effectiveHourLimit - usage.current_usage.requests_per_hour,
      new Date(Date.now() + 3600000),
      tier,
      usage.penalties.active,
    );
  }

  private getOrCreateUsage(
    coupleId: string,
    tier: RateLimitTier,
  ): RateLimitUsage {
    if (!this.usageStore.has(coupleId)) {
      const now = new Date();
      this.usageStore.set(coupleId, {
        couple_id: coupleId,
        tier,
        current_usage: {
          requests_per_minute: 0,
          requests_per_hour: 0,
          requests_per_day: 0,
          optimization_requests_hour: 0,
          ml_optimization_requests_hour: 0,
          genetic_optimization_requests_day: 0,
          mobile_requests_minute: 0,
          mobile_requests_hour: 0,
          team_integration_requests_hour: 0,
        },
        timestamps: {
          last_request: now,
          last_reset_minute: now,
          last_reset_hour: now,
          last_reset_day: now,
        },
        penalties: {
          active: false,
          multiplier: 1.0,
        },
        burst_tracking: {
          requests_in_burst: 0,
          burst_start_time: now,
        },
      });
    }

    return this.usageStore.get(coupleId)!;
  }

  private updateUsageCounters(
    usage: RateLimitUsage,
    requestType: string,
  ): void {
    const now = new Date();

    // Reset counters if time windows have passed
    if (now.getTime() - usage.timestamps.last_reset_minute.getTime() >= 60000) {
      usage.current_usage.requests_per_minute = 0;
      usage.current_usage.mobile_requests_minute = 0;
      usage.timestamps.last_reset_minute = now;
    }

    if (now.getTime() - usage.timestamps.last_reset_hour.getTime() >= 3600000) {
      usage.current_usage.requests_per_hour = 0;
      usage.current_usage.optimization_requests_hour = 0;
      usage.current_usage.ml_optimization_requests_hour = 0;
      usage.current_usage.mobile_requests_hour = 0;
      usage.current_usage.team_integration_requests_hour = 0;
      usage.timestamps.last_reset_hour = now;
    }

    if (now.getTime() - usage.timestamps.last_reset_day.getTime() >= 86400000) {
      usage.current_usage.requests_per_day = 0;
      usage.current_usage.genetic_optimization_requests_day = 0;
      usage.timestamps.last_reset_day = now;
    }

    // Increment counters
    usage.current_usage.requests_per_minute++;
    usage.current_usage.requests_per_hour++;
    usage.current_usage.requests_per_day++;

    switch (requestType) {
      case 'standard':
      case 'ml':
      case 'genetic':
        usage.current_usage.optimization_requests_hour++;
        if (requestType === 'ml') {
          usage.current_usage.ml_optimization_requests_hour++;
        } else if (requestType === 'genetic') {
          usage.current_usage.genetic_optimization_requests_day++;
        }
        break;
      case 'mobile':
        usage.current_usage.mobile_requests_minute++;
        usage.current_usage.mobile_requests_hour++;
        break;
      case 'team_integration':
        usage.current_usage.team_integration_requests_hour++;
        break;
    }

    usage.timestamps.last_request = now;

    // Check if penalty should expire
    if (
      usage.penalties.active &&
      usage.penalties.expires_at &&
      now > usage.penalties.expires_at
    ) {
      usage.penalties.active = false;
      usage.penalties.multiplier = 1.0;
      delete usage.penalties.expires_at;
      delete usage.penalties.reason;
    }
  }

  private updateGlobalUsage(): void {
    const now = new Date();

    // Reset per-second counter
    if (now.getTime() - this.globalUsage.last_reset_second.getTime() >= 1000) {
      this.globalUsage.requests_per_second = 0;
      this.globalUsage.last_reset_second = now;
    }

    // Reset per-minute counter
    if (now.getTime() - this.globalUsage.last_reset_minute.getTime() >= 60000) {
      this.globalUsage.requests_per_minute = 0;
      this.globalUsage.last_reset_minute = now;
    }

    this.globalUsage.requests_per_second++;
    this.globalUsage.requests_per_minute++;
  }

  private applyPenalty(usage: RateLimitUsage, config: RateLimitConfig): void {
    if (!config.enable_progressive_penalties) return;

    const now = new Date();
    const penaltyDuration = config.penalty_duration_minutes * 60 * 1000;

    usage.penalties.active = true;
    usage.penalties.multiplier = config.penalty_multiplier;
    usage.penalties.expires_at = new Date(now.getTime() + penaltyDuration);
    usage.penalties.reason = `Rate limit exceeded - reduced capacity for ${config.penalty_duration_minutes} minutes`;

    console.log(
      `Applied penalty to couple ${usage.couple_id}: ${usage.penalties.reason}`,
    );
  }

  private createRateLimitResult(
    allowed: boolean,
    limit: number,
    remaining: number,
    resetTime: Date,
    tier: RateLimitTier,
    penaltyActive: boolean,
    reason?: string,
  ): RateLimitResult {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000).toString(),
      'X-RateLimit-Tier': tier,
    };

    if (penaltyActive) {
      headers['X-RateLimit-Penalty-Active'] = 'true';
    }

    if (!allowed) {
      const retryAfterSeconds = Math.ceil(
        (resetTime.getTime() - Date.now()) / 1000,
      );
      headers['Retry-After'] = retryAfterSeconds.toString();

      return {
        allowed: false,
        limit,
        remaining: 0,
        reset_time: resetTime,
        retry_after_seconds: retryAfterSeconds,
        tier,
        penalty_active: penaltyActive,
        reason,
        headers,
      };
    }

    return {
      allowed: true,
      limit,
      remaining,
      reset_time: resetTime,
      tier,
      penalty_active: penaltyActive,
      headers,
    };
  }

  private getTotalRequestsThisHour(usage: RateLimitUsage): number {
    return usage.current_usage.requests_per_hour;
  }

  private startCleanupInterval(): void {
    // Clean up old usage data every 30 minutes
    setInterval(
      () => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        for (const [coupleId, usage] of this.usageStore.entries()) {
          if (usage.timestamps.last_request < cutoff) {
            this.usageStore.delete(coupleId);
          }
        }

        console.log(
          `Rate limiter cleanup completed. Active couples: ${this.usageStore.size}`,
        );
      },
      30 * 60 * 1000,
    );
  }

  private startGlobalTracking(): void {
    // Reset global counters periodically
    setInterval(() => {
      this.updateGlobalUsage(); // This will reset counters if needed
    }, 1000);
  }

  // Public utility methods
  public getCoupleUsage(coupleId: string): RateLimitUsage | null {
    return this.usageStore.get(coupleId) || null;
  }

  public getSystemStats(): {
    active_couples: number;
    global_requests_per_minute: number;
    global_requests_per_second: number;
    total_penalties_active: number;
  } {
    let activePenalties = 0;
    for (const usage of this.usageStore.values()) {
      if (usage.penalties.active) activePenalties++;
    }

    return {
      active_couples: this.usageStore.size,
      global_requests_per_minute: this.globalUsage.requests_per_minute,
      global_requests_per_second: this.globalUsage.requests_per_second,
      total_penalties_active: activePenalties,
    };
  }

  public clearCoupleUsage(coupleId: string): boolean {
    return this.usageStore.delete(coupleId);
  }

  public adjustTier(coupleId: string, newTier: RateLimitTier): void {
    const usage = this.usageStore.get(coupleId);
    if (usage) {
      usage.tier = newTier;
    }
  }
}

// Global rate limiter instance
export const seatingRateLimiter = new SeatingRateLimiter();

// Middleware function for rate limiting
export async function withRateLimit(
  request: NextRequest,
  coupleId: string,
  tier: RateLimitTier = RateLimitTier.FREE,
  requestType:
    | 'standard'
    | 'mobile'
    | 'ml'
    | 'genetic'
    | 'team_integration' = 'standard',
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const endpoint = request.nextUrl.pathname;
  const clientIP =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const result = await seatingRateLimiter.checkRateLimit(
    coupleId,
    tier,
    endpoint,
    requestType,
    clientIP,
  );

  if (!result.allowed) {
    const errorResponse = {
      error: 'Rate limit exceeded',
      message: result.reason || 'Too many requests',
      retry_after_seconds: result.retry_after_seconds,
      tier: result.tier,
      penalty_active: result.penalty_active,
      timestamp: new Date().toISOString(),
    };

    return {
      allowed: false,
      response: NextResponse.json(errorResponse, {
        status: 429,
        headers: result.headers,
      }),
    };
  }

  return { allowed: true };
}

// Helper function to determine tier from user subscription
export function determineTierFromSubscription(
  subscriptionData: any,
): RateLimitTier {
  if (!subscriptionData || !subscriptionData.tier) {
    return RateLimitTier.FREE;
  }

  switch (subscriptionData.tier.toLowerCase()) {
    case 'premium':
      return RateLimitTier.PREMIUM;
    case 'enterprise':
      return RateLimitTier.ENTERPRISE;
    case 'admin':
      return RateLimitTier.ADMIN;
    default:
      return RateLimitTier.FREE;
  }
}

// Helper function to determine request type from endpoint and payload
export function determineRequestType(
  endpoint: string,
  payload: any,
): 'standard' | 'mobile' | 'ml' | 'genetic' | 'team_integration' {
  if (endpoint.includes('/mobile/')) {
    return 'mobile';
  }

  if (payload.optimization_engine) {
    if (payload.optimization_engine.includes('ml')) {
      return 'ml';
    }
    if (payload.optimization_engine === 'genetic') {
      return 'genetic';
    }
  }

  if (
    payload.team_a_frontend_mode ||
    payload.team_c_conflict_integration ||
    payload.team_d_mobile_optimization ||
    payload.team_e_enhanced_queries
  ) {
    return 'team_integration';
  }

  return 'standard';
}

export {
  SeatingRateLimiter,
  RateLimitConfig,
  RateLimitTier,
  RateLimitType,
  RateLimitResult,
  RateLimitUsage,
};
