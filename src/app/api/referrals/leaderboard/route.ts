/**
 * WS-344 Team B - Referral Leaderboard API Endpoint
 * GET /api/referrals/leaderboard
 * SECURITY: Public leaderboard with rate limiting and performance optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withQueryValidation } from '@/lib/validation/middleware';
import {
  leaderboardQuerySchema,
  LeaderboardQuery,
} from '@/lib/validation/referral-schemas';
import {
  referralTrackingService,
  ReferralError,
} from '@/services/referral-tracking';

// =============================================================================
// CACHING CONFIGURATION (AGGRESSIVE FOR PUBLIC LEADERBOARDS)
// =============================================================================

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

const leaderboardCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for public leaderboards
const MAX_CACHE_ENTRIES = 500; // Smaller cache for leaderboards

function getCachedLeaderboard(key: string): any | null {
  const entry = leaderboardCache.get(key);

  if (!entry || Date.now() > entry.expiry) {
    leaderboardCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedLeaderboard(key: string, data: any): void {
  // Clean up old entries if cache is getting too large
  if (leaderboardCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = leaderboardCache.keys().next().value;
    if (oldestKey) {
      leaderboardCache.delete(oldestKey);
    }
  }

  leaderboardCache.set(key, {
    data,
    timestamp: Date.now(),
    expiry: Date.now() + CACHE_DURATION,
  });
}

// =============================================================================
// RATE LIMITING CONFIGURATION (MORE LENIENT FOR PUBLIC READS)
// =============================================================================

interface RateLimitState {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
const RATE_LIMIT_REQUESTS = 60; // Higher limit for public leaderboard reads
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
// LEADERBOARD HELPER FUNCTIONS
// =============================================================================

function generateCacheKey(query: LeaderboardQuery): string {
  const parts = [
    'leaderboard',
    query.period,
    query.category || 'all',
    query.location || 'all',
    `limit-${query.limit}`,
    `offset-${query.offset}`,
  ];
  return parts.join(':');
}

function validateCategory(category?: string): boolean {
  if (!category) return true;

  const validCategories = [
    'photographer',
    'videographer',
    'florist',
    'caterer',
    'venue',
    'band',
    'dj',
    'other',
  ];

  return validCategories.includes(category.toLowerCase());
}

function sanitizeLocation(location?: string): string | undefined {
  if (!location) return undefined;

  // Remove potentially dangerous characters but allow common location formats
  return location
    .replace(/[<>\"\']/g, '') // Remove dangerous HTML/JS chars
    .replace(/[;|&$`]/g, '') // Remove command injection chars
    .trim()
    .substring(0, 100); // Limit length
}

// =============================================================================
// MAIN API HANDLER
// =============================================================================

export const GET = withQueryValidation(
  leaderboardQuerySchema,
  async (request: NextRequest, validatedQuery: LeaderboardQuery) => {
    const startTime = Date.now();

    try {
      // 1. RATE LIMITING CHECK (IP-based for public endpoint)
      const clientIp = getClientIp(request);
      const rateLimitKey = `leaderboard-${clientIp}`;
      const rateLimit = checkRateLimit(rateLimitKey);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'RATE_LIMITED',
            message:
              'Too many requests for leaderboard data. Please wait before requesting again.',
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
              'Retry-After': Math.ceil(
                (rateLimit.resetTime - Date.now()) / 1000,
              ).toString(),
            },
          },
        );
      }

      // 2. VALIDATE FILTERS
      if (
        validatedQuery.category &&
        !validateCategory(validatedQuery.category)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_CATEGORY',
            message: 'Invalid business category provided',
            validCategories: [
              'photographer',
              'videographer',
              'florist',
              'caterer',
              'venue',
              'band',
              'dj',
              'other',
            ],
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      // Sanitize location input
      const sanitizedLocation = sanitizeLocation(validatedQuery.location);
      const sanitizedQuery = {
        ...validatedQuery,
        location: sanitizedLocation,
      };

      // 3. CHECK CACHE FIRST
      const cacheKey = generateCacheKey(sanitizedQuery);
      const cachedResult = getCachedLeaderboard(cacheKey);

      if (cachedResult) {
        const response = NextResponse.json(
          {
            success: true,
            data: {
              entries: cachedResult.entries,
              totalEntries: cachedResult.totalEntries,
              currentPage: cachedResult.currentPage,
              totalPages: cachedResult.totalPages,
              lastUpdated: cachedResult.lastUpdated,
            },
            meta: {
              period: sanitizedQuery.period,
              category: sanitizedQuery.category,
              location: sanitizedQuery.location,
              cached: true,
              cacheAge: Math.floor(
                (Date.now() - cachedResult.timestamp) / 1000,
              ),
              responseTime: Date.now() - startTime,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 },
        );

        // Add cache and rate limit headers
        response.headers.set('X-Cache', 'HIT');
        response.headers.set(
          'X-RateLimit-Limit',
          RATE_LIMIT_REQUESTS.toString(),
        );
        response.headers.set(
          'X-RateLimit-Remaining',
          rateLimit.remaining.toString(),
        );
        response.headers.set(
          'X-RateLimit-Reset',
          Math.ceil(rateLimit.resetTime / 1000).toString(),
        );

        // Public caching headers
        response.headers.set(
          'Cache-Control',
          'public, max-age=600, s-maxage=600',
        ); // 10 minutes
        response.headers.set('Vary', 'Accept-Encoding');

        return response;
      }

      // 4. FETCH FRESH DATA FROM SERVICE
      const result =
        await referralTrackingService.getLeaderboard(sanitizedQuery);

      // 5. PREPARE RESPONSE DATA WITH GAMIFICATION ELEMENTS
      const responseData = {
        entries: result.entries.map((entry, index) => ({
          rank: entry.rank,
          businessName: entry.businessName,
          logoUrl: entry.logoUrl,
          businessLocation: entry.businessLocation,
          businessCategory: entry.businessCategory,
          paidConversions: entry.paidConversions,
          conversionRate: entry.conversionRate,
          monthsEarned: entry.monthsEarned,
          rankChange: entry.rankChange,
          trend: entry.trend,
          badges: entry.badges || [],
          // Add gamification elements
          isTopPerformer: entry.rank <= 3,
          isRising: entry.trend === 'rising' && entry.rankChange < -5,
          achievementLevel:
            entry.paidConversions >= 100
              ? 'legend'
              : entry.paidConversions >= 50
                ? 'master'
                : entry.paidConversions >= 25
                  ? 'champion'
                  : entry.paidConversions >= 10
                    ? 'expert'
                    : entry.paidConversions >= 5
                      ? 'rising'
                      : 'starter',
        })),
        totalEntries: result.totalEntries,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        lastUpdated: result.lastUpdated,
      };

      // 6. CACHE THE RESULT
      setCachedLeaderboard(cacheKey, {
        ...responseData,
        timestamp: Date.now(),
      });

      // 7. SUCCESS RESPONSE WITH COMPREHENSIVE METADATA
      const response = NextResponse.json(
        {
          success: true,
          data: responseData,
          meta: {
            period: sanitizedQuery.period,
            category: sanitizedQuery.category,
            location: sanitizedQuery.location,
            filters: {
              hasCategory: !!sanitizedQuery.category,
              hasLocation: !!sanitizedQuery.location,
              appliedFilters: [
                sanitizedQuery.category &&
                  `category: ${sanitizedQuery.category}`,
                sanitizedQuery.location &&
                  `location: ${sanitizedQuery.location}`,
              ].filter(Boolean),
            },
            pagination: {
              currentPage: result.currentPage,
              totalPages: result.totalPages,
              totalEntries: result.totalEntries,
              pageSize: sanitizedQuery.limit,
              hasNextPage: result.currentPage < result.totalPages,
              hasPrevPage: result.currentPage > 1,
            },
            performance: {
              cached: false,
              responseTime: Date.now() - startTime,
              nextUpdate: new Date(Date.now() + CACHE_DURATION).toISOString(),
            },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );

      // Add comprehensive headers
      response.headers.set('X-Cache', 'MISS');
      response.headers.set('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimit.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(rateLimit.resetTime / 1000).toString(),
      );

      // Public caching headers
      response.headers.set(
        'Cache-Control',
        'public, max-age=600, s-maxage=600',
      ); // 10 minutes
      response.headers.set('Vary', 'Accept-Encoding');
      response.headers.set('X-Content-Type-Options', 'nosniff');

      return response;
    } catch (error) {
      console.error('[ReferralLeaderboard] Error:', error);

      // Handle specific error types
      if (error instanceof ReferralError) {
        return NextResponse.json(
          {
            success: false,
            error: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
          },
          { status: error.code === 'DATABASE_ERROR' ? 500 : 400 },
        );
      }

      // Generic error fallback
      return NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message:
            'An unexpected error occurred while fetching the leaderboard',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

// =============================================================================
// HEAD HANDLER FOR METADATA/HEALTH CHECK
// =============================================================================

export async function HEAD(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Quick health check
    const responseTime = Date.now() - startTime;

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Health-Status': 'healthy',
        'X-Response-Time': responseTime.toString(),
        'X-Leaderboard-Available': 'true',
        'Cache-Control': 'public, max-age=300', // 5 minutes for health checks
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'error',
        'X-Leaderboard-Available': 'false',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

// =============================================================================
// OPTIONS HANDLER FOR CORS PREFLIGHT
// =============================================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Public leaderboard
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  });
}

// =============================================================================
// CACHE CLEANUP (PREVENT MEMORY LEAKS)
// =============================================================================

// Clean up expired cache entries every 15 minutes
if (typeof global !== 'undefined') {
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of leaderboardCache.entries()) {
        if (now > entry.expiry) {
          leaderboardCache.delete(key);
        }
      }

      // Also clean up rate limit store
      for (const [key, state] of rateLimitStore.entries()) {
        if (now > state.resetTime + 5 * 60 * 1000) {
          // 5 minutes after reset
          rateLimitStore.delete(key);
        }
      }
    },
    15 * 60 * 1000,
  ); // 15 minutes

  // Clear interval on process termination
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
  });
}

// =============================================================================
// RUNTIME CONFIGURATION
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow public caching
export const revalidate = 600; // 10 minutes
