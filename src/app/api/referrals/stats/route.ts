/**
 * WS-344 Team B - Referral Stats API Endpoint
 * GET /api/referrals/stats
 * SECURITY: Authenticated, rate limited, performance optimized with caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { withQueryValidation } from '@/lib/validation/middleware';
import {
  referralStatsQuerySchema,
  ReferralStatsQuery,
} from '@/lib/validation/referral-schemas';
import {
  referralTrackingService,
  ReferralError,
} from '@/services/referral-tracking';

// =============================================================================
// CACHING CONFIGURATION
// =============================================================================

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

const statsCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 1000; // Prevent memory leaks

function getCachedStats(key: string): any | null {
  const entry = statsCache.get(key);

  if (!entry || Date.now() > entry.expiry) {
    statsCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedStats(key: string, data: any): void {
  // Clean up old entries if cache is getting too large
  if (statsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = statsCache.keys().next().value;
    if (oldestKey) {
      statsCache.delete(oldestKey);
    }
  }

  statsCache.set(key, {
    data,
    timestamp: Date.now(),
    expiry: Date.now() + CACHE_DURATION,
  });
}

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

interface RateLimitState {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
const RATE_LIMIT_REQUESTS = 30; // Higher limit for read operations
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const state = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!state || now >= state.resetTime) {
    const newState = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(identifier, newState);
    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS - 1,
      resetTime: newState.resetTime,
    };
  }

  // Check if limit exceeded
  if (state.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: state.resetTime,
    };
  }

  // Increment and allow
  state.count++;
  rateLimitStore.set(identifier, state);

  return {
    allowed: true,
    remaining: RATE_LIMIT_REQUESTS - state.count,
    resetTime: state.resetTime,
  };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const remote = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return real || remote || 'unknown';
}

// =============================================================================
// MAIN API HANDLER
// =============================================================================

export const GET = withQueryValidation(
  referralStatsQuerySchema,
  async (request: NextRequest, validatedQuery: ReferralStatsQuery) => {
    const startTime = Date.now();

    try {
      // 1. AUTHENTICATION CHECK
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          {
            success: false,
            error: 'UNAUTHORIZED',
            message: 'Authentication required to access referral stats',
            timestamp: new Date().toISOString(),
          },
          { status: 401 },
        );
      }

      // 2. VERIFY SUPPLIER ORGANIZATION ACCESS
      const supplierId = session.user.organizationId;
      if (!supplierId) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN',
            message: 'Supplier organization access required',
            timestamp: new Date().toISOString(),
          },
          { status: 403 },
        );
      }

      // 3. RATE LIMITING CHECK
      const clientIp = getClientIp(request);
      const rateLimitKey = `stats-${supplierId}-${clientIp}`;
      const rateLimit = checkRateLimit(rateLimitKey);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'RATE_LIMITED',
            message:
              'Too many requests for referral stats. Please wait before requesting again.',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(
                rateLimit.resetTime / 1000,
              ).toString(),
            },
          },
        );
      }

      // 4. CHECK CACHE FIRST
      const cacheKey = `stats:${supplierId}:${validatedQuery.period}:${validatedQuery.includeBreakdown ? 'detailed' : 'summary'}`;
      const cachedResult = getCachedStats(cacheKey);

      if (cachedResult) {
        const response = NextResponse.json(
          {
            success: true,
            data: cachedResult.data,
            meta: {
              period: validatedQuery.period,
              includeBreakdown: validatedQuery.includeBreakdown,
              cached: true,
              responseTime: Date.now() - startTime,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 },
        );

        response.headers.set('X-Cache', 'HIT');
        return response;
      }

      // 5. FETCH FRESH DATA FROM SERVICE
      const result = await referralTrackingService.getReferralStats(
        supplierId,
        validatedQuery,
      );

      // 6. PREPARE RESPONSE DATA
      const responseData = {
        totalReferrals: result.stats.totalReferrals,
        activeTrials: result.stats.activeTrials,
        paidConversions: result.stats.paidConversions,
        conversionRate: result.stats.conversionRate,
        monthsEarned: result.stats.monthsEarned,
        currentRankings: result.rankings,
      };

      // 7. ADD DETAILED BREAKDOWN IF REQUESTED
      if (validatedQuery.includeBreakdown) {
        Object.assign(responseData, {
          recentActivity: result.stats.recentActivity,
        });
      }

      // 8. CACHE THE RESULT
      setCachedStats(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });

      // 9. SUCCESS RESPONSE
      const response = NextResponse.json(
        {
          success: true,
          data: responseData,
          meta: {
            period: validatedQuery.period,
            includeBreakdown: validatedQuery.includeBreakdown,
            cached: false,
            responseTime: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );

      response.headers.set('X-Cache', 'MISS');
      return response;
    } catch (error) {
      console.error('[ReferralStats] Error:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message:
            'An unexpected error occurred while fetching referral statistics',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
