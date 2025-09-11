/**
 * Multi-Tier Rate Limiting Service
 * Implements hierarchical rate limiting: User -> Organization -> IP -> Global
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SlidingWindowRateLimiter } from './sliding-window';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import type {
  RateLimitResult,
  RateLimitTier,
  RateLimitContext,
  EnhancedRateLimitResult,
  RateLimitTierConfig,
  RATE_LIMIT_TIER_PRECEDENCE,
} from '@/types/rate-limit';
import { DEFAULT_RATE_LIMITS } from '@/types/rate-limit';

export class MultiTierRateLimitService {
  private limiters: Record<RateLimitTier, SlidingWindowRateLimiter>;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(config: RateLimitTierConfig = DEFAULT_RATE_LIMITS) {
    // Initialize sliding window limiters for each tier
    this.limiters = {
      ip: new SlidingWindowRateLimiter({
        windowMs: config.ip.windowMs,
        maxRequests: config.ip.maxRequests,
        tier: 'ip',
        keyPrefix: config.ip.keyPrefix,
        precision: 20, // Higher precision for IP limiting
      }),
      user: new SlidingWindowRateLimiter({
        windowMs: config.user.windowMs,
        maxRequests: config.user.maxRequests,
        tier: 'user',
        keyPrefix: config.user.keyPrefix,
        precision: 15,
      }),
      organization: new SlidingWindowRateLimiter({
        windowMs: config.organization.windowMs,
        maxRequests: config.organization.maxRequests,
        tier: 'organization',
        keyPrefix: config.organization.keyPrefix,
        precision: 15,
      }),
      global: new SlidingWindowRateLimiter({
        windowMs: config.global.windowMs,
        maxRequests: config.global.maxRequests,
        tier: 'global',
        keyPrefix: config.global.keyPrefix,
        precision: 10,
      }),
    };
  }

  /**
   * Main rate limiting check - evaluates all applicable tiers
   */
  async checkRateLimit(request: NextRequest): Promise<EnhancedRateLimitResult> {
    const startTime = Date.now();

    try {
      // Build rate limiting context
      const context = await this.buildContext(request);

      // Check bypass conditions
      const bypassReason = await this.checkBypassConditions(context);
      if (bypassReason) {
        return this.createBypassResult(context, bypassReason);
      }

      // Check all applicable tiers
      const tierResults = await this.checkAllTiers(context);

      // Find the most restrictive tier that blocks the request
      const blockingTier = this.findBlockingTier(tierResults);
      const appliedTier = blockingTier || 'ip'; // Default to IP if no blocking tier

      const result: EnhancedRateLimitResult = {
        ...tierResults[appliedTier],
        appliedTier,
        allTiers: tierResults,
      };

      // Record analytics
      await this.recordAnalytics(context, result, Date.now() - startTime);

      return result;
    } catch (error) {
      logger.error('Multi-tier rate limit check failed', error as Error, {
        url: request.url,
        ip: this.extractIP(request),
      });

      // Fail open with IP-based limiting
      const fallbackResult = await this.limiters.ip.checkLimit(
        this.extractIP(request),
      );
      return {
        ...fallbackResult,
        appliedTier: 'ip',
        allTiers: {
          ip: fallbackResult,
          user: fallbackResult,
          organization: fallbackResult,
          global: fallbackResult,
        },
      };
    }
  }

  /**
   * Build comprehensive context for rate limiting decision
   */
  private async buildContext(request: NextRequest): Promise<RateLimitContext> {
    const ip = this.extractIP(request);
    const path = new URL(request.url).pathname;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || '';

    // Extract user information from auth headers or cookies
    const authResult = await this.extractAuthInfo(request);

    return {
      request: {
        ip,
        userId: authResult?.userId,
        organizationId: authResult?.organizationId,
        path,
        method,
        userAgent,
        timestamp: Date.now(),
      },
      user: authResult?.user,
      organization: authResult?.organization,
    };
  }

  /**
   * Extract authentication information from request
   */
  private async extractAuthInfo(request: NextRequest): Promise<{
    userId?: string;
    organizationId?: string;
    user?: any;
    organization?: any;
  } | null> {
    try {
      // Check Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        // Verify with Supabase
        const {
          data: { user },
          error,
        } = await this.supabase.auth.getUser(token);

        if (error || !user) {
          return null;
        }

        // Get user profile with organization info
        const { data: profile } = await this.supabase
          .from('profiles')
          .select(
            `
            id,
            organization_id,
            tier,
            organizations!inner (
              id,
              name,
              tier,
              member_count
            )
          `,
          )
          .eq('id', user.id)
          .single();

        if (profile) {
          return {
            userId: user.id,
            organizationId: profile.organization_id,
            user: {
              id: user.id,
              organizationId: profile.organization_id,
              tier: profile.tier || 'free',
            },
            organization: profile.organizations
              ? {
                  id: profile.organizations.id,
                  tier: profile.organizations.tier || 'free',
                  memberCount: profile.organizations.member_count || 1,
                }
              : undefined,
          };
        }
      }

      // Fallback: check session cookie
      const sessionCookie = request.cookies.get('sb-auth-token');
      if (sessionCookie) {
        // Would need to verify session token
        // For now, return null to fall back to IP-based limiting
      }

      return null;
    } catch (error) {
      logger.warn(
        'Failed to extract auth info for rate limiting',
        error as Error,
      );
      return null;
    }
  }

  /**
   * Check for bypass conditions (whitelisting, maintenance mode, etc.)
   */
  private async checkBypassConditions(
    context: RateLimitContext,
  ): Promise<string | null> {
    const ip = context.request.ip;

    // Health check endpoints
    if (context.request.path.startsWith('/api/health')) {
      return 'health_check';
    }

    // Check IP whitelist
    const whitelistedIPs =
      process.env.RATE_LIMIT_WHITELIST_IPS?.split(',') || [];
    if (whitelistedIPs.includes(ip)) {
      return 'whitelist';
    }

    // Check for admin override
    if (context.user?.tier === 'enterprise') {
      const { data: override } = await this.supabase
        .from('rate_limit_overrides')
        .select('*')
        .or(`user_id.eq.${context.user.id},ip.eq.${ip}`)
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (override) {
        return 'admin_override';
      }
    }

    // System maintenance mode
    if (
      process.env.MAINTENANCE_MODE === 'true' &&
      context.user?.tier === 'enterprise'
    ) {
      return 'system_maintenance';
    }

    return null;
  }

  /**
   * Check rate limits for all applicable tiers
   */
  private async checkAllTiers(
    context: RateLimitContext,
  ): Promise<Record<RateLimitTier, RateLimitResult>> {
    const checks = await Promise.allSettled([
      // Always check IP
      this.limiters.ip.checkLimit(context.request.ip),

      // Check user if authenticated
      context.request.userId
        ? this.limiters.user.checkLimit(context.request.userId)
        : Promise.resolve(null),

      // Check organization if user belongs to one
      context.request.organizationId
        ? this.limiters.organization.checkLimit(context.request.organizationId)
        : Promise.resolve(null),

      // Always check global
      this.limiters.global.checkLimit('global'),
    ]);

    const results: Record<RateLimitTier, RateLimitResult> = {} as any;

    // Process IP result
    if (checks[0].status === 'fulfilled') {
      results.ip = checks[0].value;
    } else {
      logger.error('IP rate limit check failed', checks[0].reason);
      results.ip = this.createErrorResult('ip');
    }

    // Process user result
    if (checks[1].status === 'fulfilled' && checks[1].value) {
      results.user = checks[1].value;
    } else {
      results.user = this.createSkippedResult('user');
    }

    // Process organization result
    if (checks[2].status === 'fulfilled' && checks[2].value) {
      results.organization = checks[2].value;
    } else {
      results.organization = this.createSkippedResult('organization');
    }

    // Process global result
    if (checks[3].status === 'fulfilled') {
      results.global = checks[3].value;
    } else {
      logger.error('Global rate limit check failed', checks[3].reason);
      results.global = this.createErrorResult('global');
    }

    return results;
  }

  /**
   * Find the tier that blocks the request (most restrictive)
   */
  private findBlockingTier(
    results: Record<RateLimitTier, RateLimitResult>,
  ): RateLimitTier | null {
    // Check tiers in order of precedence
    for (const tier of RATE_LIMIT_TIER_PRECEDENCE) {
      if (results[tier] && !results[tier].allowed) {
        return tier;
      }
    }
    return null;
  }

  /**
   * Extract IP address from request with proper header precedence
   */
  private extractIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    return (
      cfConnectingIp ||
      realIp ||
      forwarded?.split(',')[0]?.trim() ||
      '127.0.0.1'
    );
  }

  /**
   * Create bypass result for whitelisted requests
   */
  private createBypassResult(
    context: RateLimitContext,
    reason: string,
  ): EnhancedRateLimitResult {
    const defaultResult: RateLimitResult = {
      allowed: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      resetTime: Date.now() + 3600000, // 1 hour from now
      tier: 'ip',
      key: context.request.ip,
      windowMs: 3600000,
    };

    return {
      ...defaultResult,
      appliedTier: 'ip',
      bypassReason: reason,
      allTiers: {
        ip: defaultResult,
        user: defaultResult,
        organization: defaultResult,
        global: defaultResult,
      },
    };
  }

  /**
   * Create error result for failed checks (fail open)
   */
  private createErrorResult(tier: RateLimitTier): RateLimitResult {
    return {
      allowed: true,
      limit: 1000,
      remaining: 1000,
      resetTime: Date.now() + 3600000,
      tier,
      key: 'error',
      windowMs: 3600000,
    };
  }

  /**
   * Create skipped result for non-applicable tiers
   */
  private createSkippedResult(tier: RateLimitTier): RateLimitResult {
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      resetTime: Date.now(),
      tier,
      key: 'skipped',
      windowMs: 0,
    };
  }

  /**
   * Record analytics for monitoring and optimization
   */
  private async recordAnalytics(
    context: RateLimitContext,
    result: EnhancedRateLimitResult,
    processingTime: number,
  ): Promise<void> {
    try {
      // Record metrics
      metrics.incrementCounter('rate_limit.multi_tier.requests', 1, {
        applied_tier: result.appliedTier,
        allowed: result.allowed.toString(),
        bypass_reason: result.bypassReason || 'none',
        has_user: (!!context.request.userId).toString(),
        has_org: (!!context.request.organizationId).toString(),
      });

      metrics.recordHistogram(
        'rate_limit.multi_tier.processing_time',
        processingTime,
        {
          applied_tier: result.appliedTier,
        },
      );

      // Store analytics event for complex queries
      if (!result.allowed || result.bypassReason) {
        await this.supabase.from('rate_limit_events').insert({
          event_type: result.allowed ? 'bypass' : 'limit_exceeded',
          ip_address: context.request.ip,
          user_id: context.request.userId,
          organization_id: context.request.organizationId,
          tier: result.appliedTier,
          endpoint: context.request.path,
          details: {
            all_tiers: Object.entries(result.allTiers).map(
              ([tier, tierResult]) => ({
                tier,
                allowed: tierResult.allowed,
                remaining: tierResult.remaining,
                limit: tierResult.limit,
              }),
            ),
            bypass_reason: result.bypassReason,
            user_agent: context.request.userAgent,
            processing_time_ms: processingTime,
          },
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to record rate limit analytics', error as Error);
    }
  }

  /**
   * Admin method: Reset rate limits for a specific identifier and tier
   */
  async resetRateLimit(
    tier: RateLimitTier,
    identifier: string,
    adminUserId: string,
  ): Promise<void> {
    try {
      await this.limiters[tier].resetLimit(identifier);

      // Log admin action
      await this.supabase.from('admin_actions').insert({
        action_type: 'rate_limit_reset',
        admin_user_id: adminUserId,
        details: {
          tier,
          identifier,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Rate limit reset by admin', {
        tier,
        identifier,
        adminUserId,
      });
    } catch (error) {
      logger.error('Failed to reset rate limit', error as Error, {
        tier,
        identifier,
        adminUserId,
      });
      throw error;
    }
  }

  /**
   * Admin method: Set rate limit override
   */
  async setOverride(
    tier: RateLimitTier,
    identifier: string,
    newLimit: number,
    windowMs: number,
    adminUserId: string,
    reason: string,
    expiresAt?: Date,
  ): Promise<void> {
    try {
      await this.limiters[tier].setOverride(identifier, newLimit, windowMs);

      // Store override in database
      await this.supabase.from('rate_limit_overrides').insert({
        tier,
        identifier,
        limit: newLimit,
        window_ms: windowMs,
        reason,
        created_by: adminUserId,
        expires_at: expiresAt?.toISOString(),
        active: true,
      });

      logger.info('Rate limit override set by admin', {
        tier,
        identifier,
        newLimit,
        windowMs,
        adminUserId,
        reason,
      });
    } catch (error) {
      logger.error('Failed to set rate limit override', error as Error, {
        tier,
        identifier,
        adminUserId,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const rateLimitService = new MultiTierRateLimitService();
