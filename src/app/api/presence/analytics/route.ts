/**
 * WS-204: Presence Tracking API - Analytics Endpoint
 *
 * GET /api/presence/analytics?type=organization|user|wedding&id=uuid&period=day|week|month
 *
 * Enterprise analytics for presence data with comprehensive insights.
 * Provides activity reports, usage patterns, and wedding-specific metrics.
 *
 * Security Features:
 * - Enterprise tier verification
 * - Admin permission validation
 * - Data privacy compliance (GDPR)
 * - Rate limiting for analytics queries
 * - Audit logging for all analytics access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getActivityTracker } from '@/lib/presence/activity-tracker';
import { getPermissionService } from '@/lib/presence/permission-service';
import { ratelimit } from '@/lib/rate-limit';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const analyticsQuerySchema = z.object({
  type: z.enum(['organization', 'user', 'wedding']),
  id: z.string().uuid(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('week'),
  metrics: z
    .array(
      z.enum([
        'sessions',
        'activity',
        'users',
        'pages',
        'devices',
        'status',
        'collaboration',
        'trends',
        'peaks',
      ]),
    )
    .optional(),
  includeRawData: z.boolean().default(false),
  timezone: z.string().default('UTC'),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client for authentication
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Rate limiting for analytics queries (max 20 requests per hour)
    const rateLimitResult = await ratelimit.limit(
      `analytics:${user.id}`,
      20,
      3600,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for analytics queries',
          retryAfter: rateLimitResult.reset,
        },
        { status: 429 },
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      type: searchParams.get('type'),
      id: searchParams.get('id'),
      period: searchParams.get('period') || 'week',
      metrics: searchParams.get('metrics')?.split(',') || undefined,
      includeRawData: searchParams.get('includeRawData') === 'true',
      timezone: searchParams.get('timezone') || 'UTC',
    };

    // Custom date range if provided
    const customRange = {
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    // Validate main parameters
    const validationResult = analyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const params = validationResult.data;

    // Validate custom date range if provided
    let dateRange: any = null;
    if (customRange.startDate || customRange.endDate) {
      const rangeValidation = dateRangeSchema.safeParse(customRange);
      if (!rangeValidation.success) {
        return NextResponse.json(
          { error: 'Invalid date range format' },
          { status: 400 },
        );
      }
      dateRange = rangeValidation.data;
    }

    // Verify enterprise access and permissions
    const hasAccess = await verifyAnalyticsAccess(
      user.id,
      params.type,
      params.id,
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for analytics' },
        { status: 403 },
      );
    }

    // Generate analytics report based on type
    const activityTracker = getActivityTracker();
    let analyticsData: any;

    const reportDateRange =
      dateRange || getDateRangeForPeriod(params.period, params.timezone);

    switch (params.type) {
      case 'organization':
        analyticsData = await activityTracker.generateActivityReport(
          params.id,
          reportDateRange,
        );
        break;

      case 'user':
        analyticsData = await activityTracker.generateUserActivitySummary(
          params.id,
          reportDateRange,
        );
        break;

      case 'wedding':
        analyticsData = await activityTracker.generateWeddingActivityInsights(
          params.id,
          reportDateRange,
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 },
        );
    }

    // Filter metrics if specific ones requested
    if (params.metrics) {
      analyticsData = filterAnalyticsByMetrics(analyticsData, params.metrics);
    }

    // Remove raw data if not requested (for privacy/performance)
    if (!params.includeRawData) {
      analyticsData = removeRawData(analyticsData);
    }

    // Add metadata
    const metadata = {
      queryType: params.type,
      targetId: params.id,
      period: params.period,
      dateRange: reportDateRange,
      timezone: params.timezone,
      metricsRequested: params.metrics,
      includeRawData: params.includeRawData,
      generatedAt: new Date().toISOString(),
      queriedBy: user.id,
    };

    // Log analytics access for audit trail
    await logAnalyticsAccess(user.id, params.type, params.id, params.metrics);

    // Generate response
    const response = {
      success: true,
      metadata,
      analytics: analyticsData,
      rateLimitRemaining: rateLimitResult.remaining,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Analytics query error:', error);
    return handleApiError(error);
  }
}

// ============================================================================
// ACCESS CONTROL AND VALIDATION
// ============================================================================

/**
 * Verify user has access to analytics for the specified resource
 */
async function verifyAnalyticsAccess(
  userId: string,
  analyticsType: string,
  resourceId: string,
): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    switch (analyticsType) {
      case 'organization':
        return await verifyOrganizationAnalyticsAccess(
          supabase,
          userId,
          resourceId,
        );

      case 'user':
        return await verifyUserAnalyticsAccess(supabase, userId, resourceId);

      case 'wedding':
        return await verifyWeddingAnalyticsAccess(supabase, userId, resourceId);

      default:
        return false;
    }
  } catch (error) {
    console.error('Analytics access verification failed:', error);
    return false;
  }
}

/**
 * Verify organization analytics access
 */
async function verifyOrganizationAnalyticsAccess(
  supabase: any,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  // Check if user is admin in the organization
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select(
      `
      role,
      organization_id,
      organizations!inner(
        pricing_tier
      )
    `,
    )
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (!userProfile) {
    return false;
  }

  // Must be admin/owner and have enterprise tier
  const isAdmin = ['admin', 'owner'].includes(userProfile.role);
  const hasEnterprise =
    userProfile.organizations?.pricing_tier === 'enterprise';

  return isAdmin && hasEnterprise;
}

/**
 * Verify user analytics access
 */
async function verifyUserAnalyticsAccess(
  supabase: any,
  userId: string,
  targetUserId: string,
): Promise<boolean> {
  // Users can always see their own analytics
  if (userId === targetUserId) {
    // Verify they have enterprise access
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(
        `
        organization_id,
        organizations!inner(
          pricing_tier
        )
      `,
      )
      .eq('user_id', userId)
      .single();

    return userProfile?.organizations?.pricing_tier === 'enterprise';
  }

  // Check if requesting user is admin over target user
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, organization_id, role')
    .in('user_id', [userId, targetUserId]);

  if (!profiles || profiles.length !== 2) {
    return false;
  }

  const requester = profiles.find((p: any) => p.user_id === userId);
  const target = profiles.find((p: any) => p.user_id === targetUserId);

  // Must be same organization and requester must be admin
  return (
    requester?.organization_id === target?.organization_id &&
    ['admin', 'owner'].includes(requester?.role)
  );
}

/**
 * Verify wedding analytics access
 */
async function verifyWeddingAnalyticsAccess(
  supabase: any,
  userId: string,
  weddingId: string,
): Promise<boolean> {
  // Check if user is connected to this wedding
  const { data: connection } = await supabase
    .from('vendor_wedding_connections')
    .select(
      `
      id,
      organization_id,
      organizations!inner(
        pricing_tier
      )
    `,
    )
    .or(`supplier_id.eq.${userId},client_id.eq.${userId}`)
    .eq('wedding_id', weddingId)
    .eq('connection_status', 'active')
    .single();

  if (!connection) {
    return false;
  }

  // Must have enterprise tier
  return connection.organizations?.pricing_tier === 'enterprise';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get date range for specified period
 */
function getDateRangeForPeriod(period: string, timezone: string = 'UTC'): any {
  const now = new Date();
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return {
    start,
    end: now,
  };
}

/**
 * Filter analytics data by requested metrics
 */
function filterAnalyticsByMetrics(
  analyticsData: any,
  requestedMetrics: string[],
): any {
  if (!requestedMetrics || requestedMetrics.length === 0) {
    return analyticsData;
  }

  const filtered: any = {};

  // Map metric names to data properties
  const metricMap: { [key: string]: string[] } = {
    sessions: ['totalSessions', 'averageSessionDuration'],
    activity: ['mostActiveUsers', 'recentActivities'],
    users: ['totalUsers', 'mostActiveUsers'],
    pages: ['pageViews', 'mostVisitedPages'],
    devices: ['deviceBreakdown', 'deviceUsage'],
    status: ['statusDistribution', 'statusPreferences'],
    collaboration: ['collaborationMetrics', 'coordinationPatterns'],
    trends: ['dailyTrends', 'peakHours'],
    peaks: ['peakHours', 'weddingActivityPeaks'],
  };

  // Include base metadata
  filtered.organizationId = analyticsData.organizationId;
  filtered.userId = analyticsData.userId;
  filtered.weddingId = analyticsData.weddingId;
  filtered.dateRange = analyticsData.dateRange;

  // Include requested metrics
  for (const metric of requestedMetrics) {
    const properties = metricMap[metric] || [];
    for (const prop of properties) {
      if (analyticsData[prop] !== undefined) {
        filtered[prop] = analyticsData[prop];
      }
    }
  }

  return filtered;
}

/**
 * Remove raw data from analytics response
 */
function removeRawData(analyticsData: any): any {
  const cleaned = { ...analyticsData };

  // Remove arrays that might contain raw user data
  const rawDataFields = [
    'recentActivities',
    'individualSessions',
    'rawPageViews',
    'detailedLogs',
  ];

  for (const field of rawDataFields) {
    if (cleaned[field]) {
      delete cleaned[field];
    }
  }

  // Limit user arrays to prevent data exposure
  if (cleaned.mostActiveUsers && cleaned.mostActiveUsers.length > 10) {
    cleaned.mostActiveUsers = cleaned.mostActiveUsers.slice(0, 10);
  }

  return cleaned;
}

/**
 * Log analytics access for audit trail
 */
async function logAnalyticsAccess(
  userId: string,
  analyticsType: string,
  resourceId: string,
  metrics?: string[],
): Promise<void> {
  try {
    const activityTracker = getActivityTracker();

    await activityTracker.trackUserInteraction(userId, 'analytics_access', {
      analyticsType,
      resourceId,
      metricsAccessed: metrics,
      accessType: 'api_query',
      sensitiveData: true,
    });
  } catch (error) {
    console.error('Failed to log analytics access:', error);
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function handleApiError(error: any): NextResponse {
  if (error instanceof Error) {
    if (error.message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }
    if (
      error.message.includes('Permission') ||
      error.message.includes('Insufficient')
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions for analytics' },
        { status: 403 },
      );
    }
    if (
      error.message.includes('Invalid') ||
      error.message.includes('validation')
    ) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 },
      );
    }
    if (error.message.includes('Enterprise')) {
      return NextResponse.json(
        { error: 'Analytics require Enterprise tier' },
        { status: 402 }, // Payment required
      );
    }
  }

  return NextResponse.json(
    {
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  );
}

// ============================================================================
// CACHING FOR PERFORMANCE
// ============================================================================

interface AnalyticsCacheEntry {
  data: any;
  expires: number;
  queryHash: string;
}

class AnalyticsCache {
  private cache = new Map<string, AnalyticsCacheEntry>();
  private readonly TTL = 15 * 60 * 1000; // 15 minutes

  generateKey(
    type: string,
    id: string,
    period: string,
    metrics?: string[],
  ): string {
    const metricsStr = metrics?.sort().join(',') || 'all';
    return `${type}:${id}:${period}:${metricsStr}`;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.TTL,
      queryHash: this.hashQuery(data),
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  private hashQuery(data: any): string {
    return Buffer.from(JSON.stringify(data))
      .toString('base64')
      .substring(0, 16);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const analyticsCache = new AnalyticsCache();

// Clean up cache periodically
setInterval(
  () => {
    analyticsCache.clear();
  },
  30 * 60 * 1000,
); // Clear every 30 minutes
