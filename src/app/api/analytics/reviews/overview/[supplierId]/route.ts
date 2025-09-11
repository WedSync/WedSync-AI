/**
 * @fileoverview Review Analytics Overview API Endpoint
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 *
 * Security: PII protection, rate limiting, role-based access
 * Performance: <500ms response time, caching enabled
 * Validation: Comprehensive input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { OptimizedAnalyticsQueries } from '@/lib/database/analytics-queries';
import { AnalyticsCache } from '@/lib/caching/analytics-cache';
import { rateLimit } from '@/lib/rate-limiter';

// Request validation schema
const paramsSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID format'),
});

const querySchema = z.object({
  dateRange: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(val),
      'Invalid date range format. Use YYYY-MM-DD,YYYY-MM-DD',
    ),
  includeDetails: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val || '50', 10);
      return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 100);
    }),
});

// Response schema for type safety
const responseSchema = z.object({
  totalReviews: z.number().min(0),
  averageRating: z.number().min(0).max(5),
  responseRate: z.number().min(0).max(1),
  sentimentScore: z.number().min(0).max(1),
  monthlyGrowth: z.number(),
  lastUpdated: z.string().datetime(),
  metadata: z.object({
    supplierId: z.string().uuid(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    queryTime: z.number(),
  }),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { supplierId: string } },
) {
  const startTime = performance.now();

  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      requests: 100,
      window: 60 * 1000, // 1 minute
      identifier: 'analytics-overview',
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Validate parameters
    const paramsResult = paramsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: paramsResult.error.issues,
        },
        { status: 400 },
      );
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const queryResult = querySchema.safeParse(queryParams);

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { supplierId } = paramsResult.data;
    const { dateRange, includeDetails, limit } = queryResult.data;

    // Authentication and authorization
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this supplier's data
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, supplier_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Role-based access control
    const hasAccess =
      userProfile.role === 'admin' ||
      userProfile.role === 'analytics' ||
      (userProfile.role === 'supplier' &&
        userProfile.supplier_id === supplierId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse date range
    let startDate: Date, endDate: Date;
    if (dateRange) {
      const [start, end] = dateRange.split(',');
      startDate = new Date(start);
      endDate = new Date(end);

      // Validate date range
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 },
        );
      }

      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 },
        );
      }

      // Limit date range to prevent excessive queries
      const daysDiff =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return NextResponse.json(
          { error: 'Date range cannot exceed 365 days' },
          { status: 400 },
        );
      }
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Check cache first
    const cache = AnalyticsCache.getInstance();
    const cacheKey = `overview_${supplierId}_${startDate.toISOString()}_${endDate.toISOString()}_${includeDetails}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
          queryTime: performance.now() - startTime,
        },
      });
    }

    // Fetch analytics data
    const {
      data: analyticsData,
      error: analyticsError,
      queryTime,
    } = await OptimizedAnalyticsQueries.getReviewAnalytics({
      supplierId,
      dateRange: { start: startDate, end: endDate },
      includeDetails,
      limit,
    });

    if (analyticsError) {
      console.error('Analytics query error:', analyticsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 },
      );
    }

    // Sanitize and structure response data
    const responseData = {
      totalReviews: analyticsData?.total_reviews || 0,
      averageRating: Math.round((analyticsData?.average_rating || 0) * 10) / 10,
      responseRate: Math.round((analyticsData?.response_rate || 0) * 100) / 100,
      sentimentScore:
        Math.round((analyticsData?.sentiment_score || 0) * 100) / 100,
      monthlyGrowth:
        Math.round((analyticsData?.monthly_growth || 0) * 100) / 100,
      lastUpdated: new Date().toISOString(),
      metadata: {
        supplierId,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        queryTime: queryTime || 0,
        cached: false,
      },
    };

    // Validate response structure
    const validatedResponse = responseSchema.parse(responseData);

    // Cache the response (5 minutes TTL)
    cache.set(cacheKey, validatedResponse, 5 * 60 * 1000);

    // Add performance headers
    const totalTime = performance.now() - startTime;
    const response = NextResponse.json(validatedResponse);
    response.headers.set('X-Response-Time', `${Math.round(totalTime)}ms`);
    response.headers.set('X-Query-Time', `${Math.round(queryTime || 0)}ms`);
    response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes

    // Performance monitoring
    if (totalTime > 500) {
      console.warn(
        `Slow analytics query: ${totalTime}ms for supplier ${supplierId}`,
      );
    }

    return response;
  } catch (error) {
    console.error('Analytics overview API error:', error);

    const totalTime = performance.now() - startTime;

    // Don't expose internal errors to client
    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId: crypto.randomUUID(),
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${Math.round(totalTime)}ms`,
        },
      },
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
