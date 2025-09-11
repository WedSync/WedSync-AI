/**
 * API Usage Metrics Endpoint
 * WS-233: Serves comprehensive API usage analytics
 *
 * Provides aggregated metrics for the admin dashboard including:
 * - Total requests and users
 * - Response time analysis
 * - Error rates and breakdowns
 * - Subscription tier usage
 * - Top endpoints
 * - Trend data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

interface MetricsQuery {
  range: '1h' | '24h' | '7d' | '30d';
  organizationId?: string;
  tier?: string;
}

/**
 * Get time range bounds for queries
 */
function getTimeRange(range: string): {
  start: Date;
  end: Date;
  interval: string;
} {
  const end = new Date();
  let start: Date;
  let interval: string;

  switch (range) {
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      interval = '5 minutes';
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      interval = '1 hour';
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      interval = '1 day';
      break;
    case '30d':
    default:
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      interval = '1 day';
      break;
  }

  return { start, end, interval };
}

/**
 * GET /api/admin/api-usage/metrics
 * Returns comprehensive API usage metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';
    const organizationId = searchParams.get('organizationId');
    const tier = searchParams.get('tier');

    // Verify admin access (should be handled by middleware, but double-check)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    const { data: user } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type, organization_id')
      .eq('user_id', user.user.id)
      .single();

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const { start, end, interval } = getTimeRange(range);

    // Build base query conditions
    let baseQuery = supabase
      .from('api_usage_logs')
      .select('*')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    if (organizationId) {
      baseQuery = baseQuery.eq('organization_id', organizationId);
    }

    if (tier) {
      baseQuery = baseQuery.eq('subscription_tier', tier);
    }

    // 1. Get total metrics
    const { data: logs, error: logsError } = await baseQuery;

    if (logsError) {
      throw logsError;
    }

    const totalRequests = logs?.length || 0;
    const uniqueUsers = new Set(logs?.map((log) => log.user_id).filter(Boolean))
      .size;
    const averageResponseTime = logs?.length
      ? Math.round(
          logs.reduce((sum, log) => sum + log.response_time_ms, 0) /
            logs.length,
        )
      : 0;
    const errorCount =
      logs?.filter((log) => log.status_code >= 400).length || 0;
    const errorRate =
      totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
    const rateLimitedRequests =
      logs?.filter((log) => log.rate_limited).length || 0;

    // 2. Get top endpoints
    const endpointStats =
      logs?.reduce((acc: Record<string, any>, log) => {
        if (!acc[log.endpoint]) {
          acc[log.endpoint] = {
            endpoint: log.endpoint,
            requests: 0,
            totalResponseTime: 0,
          };
        }
        acc[log.endpoint].requests++;
        acc[log.endpoint].totalResponseTime += log.response_time_ms;
        return acc;
      }, {}) || {};

    const topEndpoints = Object.values(endpointStats)
      .map((stat: any) => ({
        endpoint: stat.endpoint,
        requests: stat.requests,
        responseTime: Math.round(stat.totalResponseTime / stat.requests),
      }))
      .sort((a: any, b: any) => b.requests - a.requests)
      .slice(0, 10);

    // 3. Get tier usage breakdown
    const tierStats =
      logs?.reduce((acc: Record<string, any>, log) => {
        const tier = log.subscription_tier || 'free';
        if (!acc[tier]) {
          acc[tier] = { tier, requests: 0, users: new Set() };
        }
        acc[tier].requests++;
        if (log.user_id) {
          acc[tier].users.add(log.user_id);
        }
        return acc;
      }, {}) || {};

    const tierUsage = Object.values(tierStats).map((stat: any) => ({
      tier: stat.tier,
      requests: stat.requests,
      users: stat.users.size,
      percentage:
        totalRequests > 0
          ? Math.round((stat.requests / totalRequests) * 100)
          : 0,
    }));

    // 4. Get trend data
    let trendData: any[] = [];

    if (range === '1h') {
      // Hourly breakdown for last hour (5-minute intervals)
      const intervals = [];
      for (let i = 0; i < 12; i++) {
        const intervalStart = new Date(start.getTime() + i * 5 * 60 * 1000);
        const intervalEnd = new Date(start.getTime() + (i + 1) * 5 * 60 * 1000);

        const intervalLogs =
          logs?.filter((log) => {
            const logTime = new Date(log.timestamp);
            return logTime >= intervalStart && logTime < intervalEnd;
          }) || [];

        intervals.push({
          hour: intervalStart.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          requests: intervalLogs.length,
          errors: intervalLogs.filter((log) => log.status_code >= 400).length,
          responseTime:
            intervalLogs.length > 0
              ? Math.round(
                  intervalLogs.reduce(
                    (sum, log) => sum + log.response_time_ms,
                    0,
                  ) / intervalLogs.length,
                )
              : 0,
        });
      }
      trendData = intervals;
    } else {
      // Daily breakdown
      const { data: summaryData } = await supabase
        .from('api_usage_summary')
        .select('*')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
        .order('date', { ascending: true });

      trendData =
        summaryData?.map((summary) => ({
          date: summary.date,
          requests: summary.total_requests,
          users: 1, // Would need to calculate unique users per day
          errors: summary.error_count,
          responseTime:
            summary.total_requests > 0
              ? Math.round(
                  summary.total_response_time_ms / summary.total_requests,
                )
              : 0,
        })) || [];
    }

    // 5. Get error breakdown
    const errorBreakdown =
      logs?.reduce((acc: Record<number, number>, log) => {
        if (log.status_code >= 400) {
          acc[log.status_code] = (acc[log.status_code] || 0) + 1;
        }
        return acc;
      }, {}) || {};

    const errorBreakdownArray = Object.entries(errorBreakdown).map(
      ([statusCode, count]) => ({
        statusCode: parseInt(statusCode),
        count: count as number,
        percentage:
          totalRequests > 0
            ? Math.round(((count as number) / totalRequests) * 100)
            : 0,
      }),
    );

    // 6. Get organization data
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier');

    // Calculate per-organization stats
    const organizationStats =
      organizations
        ?.map((org) => {
          const orgLogs =
            logs?.filter((log) => log.organization_id === org.id) || [];
          const orgErrors = orgLogs.filter((log) => log.status_code >= 400);

          return {
            id: org.id,
            name: org.name,
            subscription_tier: org.subscription_tier || 'free',
            totalRequests: orgLogs.length,
            averageResponseTime:
              orgLogs.length > 0
                ? Math.round(
                    orgLogs.reduce(
                      (sum, log) => sum + log.response_time_ms,
                      0,
                    ) / orgLogs.length,
                  )
                : 0,
            errorRate:
              orgLogs.length > 0
                ? (orgErrors.length / orgLogs.length) * 100
                : 0,
          };
        })
        .sort((a, b) => b.totalRequests - a.totalRequests) || [];

    const metrics = {
      totalRequests,
      uniqueUsers,
      averageResponseTime,
      errorRate,
      rateLimitedRequests,
      topEndpoints,
      tierUsage,
      hourlyTrend: range === '1h' ? trendData : [],
      dailyTrend: range !== '1h' ? trendData : [],
      errorBreakdown: errorBreakdownArray,
    };

    return NextResponse.json({
      success: true,
      metrics,
      organizations: organizationStats,
      timeRange: { start: start.toISOString(), end: end.toISOString() },
    });
  } catch (error) {
    console.error('API usage metrics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch API usage metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/api-usage/metrics
 * Create custom metric queries
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters } = body;

    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    const { data: user } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.user.id)
      .single();

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Execute custom query (simplified - would need more robust query builder)
    const { data: results, error } = await supabase
      .from('api_usage_logs')
      .select(query)
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      results,
      count: results?.length || 0,
    });
  } catch (error) {
    console.error('Custom metrics query error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute custom query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
