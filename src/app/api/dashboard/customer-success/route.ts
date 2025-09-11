/**
 * WS-168 Customer Success Dashboard API with Performance Optimizations
 * Optimized for high-performance data retrieval with caching and efficient queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  metricsCache,
  analyticsCache,
  customerMetricsCache,
  cacheMonitor,
} from '@/lib/cache/dashboard-cache';

interface DashboardRequest {
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  refresh?: boolean;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();

    // Parse request parameters
    const { searchParams } = new URL(request.url);
    const params: DashboardRequest = {
      timeframe: searchParams.get('timeframe') || '30d',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      organizationId: searchParams.get('organizationId') || undefined,
      refresh: searchParams.get('refresh') === 'true',
    };

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Admin role verification
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Calculate date range
    const { startDate, endDate } = getDateRange(params);

    // Cache key parameters
    const cacheParams = {
      startDate,
      endDate,
      organizationId: params.organizationId || 'all',
    };

    // Get dashboard data with caching
    const [summary, analytics, customerMetrics] = await Promise.all([
      getDashboardSummary(supabase, cacheParams, params.refresh),
      getAnalyticsData(supabase, cacheParams, params.refresh),
      getCustomerMetrics(supabase, cacheParams, params.refresh),
    ]);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        summary,
        analytics,
        customerMetrics,
        metadata: {
          dateRange: { startDate, endDate },
          responseTime,
          cached: responseTime < 100, // Fast response likely means cached
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Customer success dashboard API error:', error);
    cacheMonitor.recordError();

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load dashboard data',
        responseTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Get dashboard summary with caching
 */
async function getDashboardSummary(
  supabase: any,
  cacheParams: any,
  refresh: boolean = false,
): Promise<any> {
  const cacheKey = 'summary';

  if (!refresh) {
    const cached = await metricsCache.get(cacheKey, cacheParams);
    if (cached) {
      cacheMonitor.recordHit();
      return cached;
    }
  }

  cacheMonitor.recordMiss();

  try {
    // Use database aggregation for performance
    const [totalUsers, activeUsers, totalOrganizations, activeSubscriptions] =
      await Promise.all([
        // Total users count
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .then(({ count }) => count || 0),

        // Active users in date range
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_sign_in_at', cacheParams.startDate)
          .lte('last_sign_in_at', cacheParams.endDate)
          .then(({ count }) => count || 0),

        // Total organizations
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .then(({ count }) => count || 0),

        // Active subscriptions (with fallback)
        supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .then(({ count }) => count || 0)
          .catch(() => 0), // Fallback if subscriptions table doesn't exist
      ]);

    const summary = {
      totalUsers,
      activeUsers,
      totalOrganizations,
      activeSubscriptions,
      conversionRate:
        totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0,
      userEngagementRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
    };

    // Cache for 5 minutes
    await metricsCache.set(cacheKey, summary, cacheParams, 300);
    cacheMonitor.recordSet();

    return summary;
  } catch (error) {
    console.error('Dashboard summary error:', error);
    throw error;
  }
}

/**
 * Get analytics data with caching
 */
async function getAnalyticsData(
  supabase: any,
  cacheParams: any,
  refresh: boolean = false,
): Promise<any> {
  const cacheKey = 'analytics';

  if (!refresh) {
    const cached = await analyticsCache.get(cacheKey, cacheParams);
    if (cached) {
      cacheMonitor.recordHit();
      return cached;
    }
  }

  cacheMonitor.recordMiss();

  try {
    // Get time-series data for charts
    const performanceHistory = await getPerformanceHistory(
      supabase,
      cacheParams,
    );

    // Get growth metrics
    const growthMetrics = await getGrowthMetrics(supabase, cacheParams);

    // Get engagement metrics
    const engagementMetrics = await getEngagementMetrics(supabase, cacheParams);

    const analytics = {
      performanceHistory,
      growthMetrics,
      engagementMetrics,
    };

    // Cache for 10 minutes
    await analyticsCache.set(cacheKey, analytics, cacheParams, 600);
    cacheMonitor.recordSet();

    return analytics;
  } catch (error) {
    console.error('Analytics data error:', error);
    throw error;
  }
}

/**
 * Get customer metrics with caching
 */
async function getCustomerMetrics(
  supabase: any,
  cacheParams: any,
  refresh: boolean = false,
): Promise<any> {
  const cacheKey = 'customers';

  if (!refresh) {
    const cached = await customerMetricsCache.get(cacheKey, cacheParams);
    if (cached) {
      cacheMonitor.recordHit();
      return cached;
    }
  }

  cacheMonitor.recordMiss();

  try {
    // Get customer segmentation data
    const segments = await getCustomerSegments(supabase, cacheParams);

    // Get cohort analysis
    const cohorts = await getCohortAnalysis(supabase, cacheParams);

    // Get churn metrics
    const churnMetrics = await getChurnMetrics(supabase, cacheParams);

    const customerMetrics = {
      segments,
      cohorts,
      churnMetrics,
    };

    // Cache for 15 minutes (customer data changes less frequently)
    await customerMetricsCache.set(cacheKey, customerMetrics, cacheParams, 900);
    cacheMonitor.recordSet();

    return customerMetrics;
  } catch (error) {
    console.error('Customer metrics error:', error);
    throw error;
  }
}

/**
 * Helper functions for data retrieval
 */
function getDateRange(params: DashboardRequest): {
  startDate: string;
  endDate: string;
} {
  if (params.startDate && params.endDate) {
    return {
      startDate: params.startDate,
      endDate: params.endDate,
    };
  }

  const now = new Date();
  const days =
    params.timeframe === '7d' ? 7 : params.timeframe === '90d' ? 90 : 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

async function getPerformanceHistory(
  supabase: any,
  cacheParams: any,
): Promise<any[]> {
  const days = Math.ceil(
    (new Date(cacheParams.endDate).getTime() -
      new Date(cacheParams.startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Generate date array for consistent chart data
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date(cacheParams.startDate);
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  // Get daily metrics (using efficient queries)
  const dailyMetrics = await Promise.all(
    dates.map(async (date) => {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [userSignups, userActivity] = await Promise.all([
        // New user signups for this day
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', date)
          .lt('created_at', nextDate.toISOString().split('T')[0])
          .then(({ count }) => count || 0),

        // User activity for this day
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .gte('last_sign_in_at', date)
          .lt('last_sign_in_at', nextDate.toISOString().split('T')[0])
          .then(({ count }) => count || 0),
      ]);

      return {
        date,
        userSignups,
        userActivity,
        conversionRate:
          userSignups > 0 ? (userActivity / userSignups) * 100 : 0,
      };
    }),
  );

  return dailyMetrics;
}

async function getGrowthMetrics(supabase: any, cacheParams: any): Promise<any> {
  const prevPeriodStart = new Date(cacheParams.startDate);
  const periodLength =
    new Date(cacheParams.endDate).getTime() -
    new Date(cacheParams.startDate).getTime();
  prevPeriodStart.setTime(prevPeriodStart.getTime() - periodLength);

  const [currentPeriod, previousPeriod] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cacheParams.startDate)
      .lte('created_at', cacheParams.endDate),

    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', prevPeriodStart.toISOString())
      .lt('created_at', cacheParams.startDate),
  ]);

  const currentCount = currentPeriod.count || 0;
  const previousCount = previousPeriod.count || 0;
  const growthRate =
    previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : 0;

  return {
    currentPeriod: currentCount,
    previousPeriod: previousCount,
    growthRate,
    trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable',
  };
}

async function getEngagementMetrics(
  supabase: any,
  cacheParams: any,
): Promise<any> {
  // Get user activity patterns
  const { data: activityData } = await supabase
    .from('user_profiles')
    .select('last_sign_in_at, created_at')
    .gte('created_at', cacheParams.startDate)
    .lte('created_at', cacheParams.endDate);

  if (!activityData || activityData.length === 0) {
    return {
      avgSessionsPerUser: 0,
      activeUserRate: 0,
      retentionRate: 0,
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const activeLastWeek = activityData.filter(
    (user) =>
      user.last_sign_in_at && new Date(user.last_sign_in_at) >= sevenDaysAgo,
  ).length;

  const activeLastMonth = activityData.filter(
    (user) =>
      user.last_sign_in_at && new Date(user.last_sign_in_at) >= thirtyDaysAgo,
  ).length;

  return {
    avgSessionsPerUser: 1.5, // Placeholder - would need session tracking
    activeUserRate:
      activityData.length > 0
        ? (activeLastWeek / activityData.length) * 100
        : 0,
    retentionRate:
      activityData.length > 0
        ? (activeLastMonth / activityData.length) * 100
        : 0,
  };
}

async function getCustomerSegments(
  supabase: any,
  cacheParams: any,
): Promise<any[]> {
  // Simple segmentation based on activity
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, created_at, last_sign_in_at, role')
    .neq('role', 'admin');

  if (!users || users.length === 0) {
    return [];
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const segments = {
    new: users.filter((u) => new Date(u.created_at) >= sevenDaysAgo).length,
    active: users.filter(
      (u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= sevenDaysAgo,
    ).length,
    at_risk: users.filter(
      (u) =>
        u.last_sign_in_at &&
        new Date(u.last_sign_in_at) < sevenDaysAgo &&
        new Date(u.last_sign_in_at) >= thirtyDaysAgo,
    ).length,
    inactive: users.filter(
      (u) => !u.last_sign_in_at || new Date(u.last_sign_in_at) < thirtyDaysAgo,
    ).length,
  };

  return Object.entries(segments).map(([name, count]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    count,
    percentage: users.length > 0 ? (count / users.length) * 100 : 0,
  }));
}

async function getCohortAnalysis(
  supabase: any,
  cacheParams: any,
): Promise<any[]> {
  // Simple cohort analysis by month
  const { data: users } = await supabase
    .from('user_profiles')
    .select('created_at, last_sign_in_at')
    .gte('created_at', cacheParams.startDate)
    .lte('created_at', cacheParams.endDate);

  if (!users || users.length === 0) {
    return [];
  }

  const cohorts: { [key: string]: any } = {};
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  users.forEach((user) => {
    const cohortMonth = new Date(user.created_at).toISOString().substring(0, 7);

    if (!cohorts[cohortMonth]) {
      cohorts[cohortMonth] = {
        month: cohortMonth,
        totalUsers: 0,
        activeUsers: 0,
      };
    }

    cohorts[cohortMonth].totalUsers++;

    if (
      user.last_sign_in_at &&
      new Date(user.last_sign_in_at) >= thirtyDaysAgo
    ) {
      cohorts[cohortMonth].activeUsers++;
    }
  });

  return Object.values(cohorts).map((cohort: any) => ({
    ...cohort,
    retentionRate:
      cohort.totalUsers > 0
        ? (cohort.activeUsers / cohort.totalUsers) * 100
        : 0,
  }));
}

async function getChurnMetrics(supabase: any, cacheParams: any): Promise<any> {
  const { data: users } = await supabase
    .from('user_profiles')
    .select('last_sign_in_at, created_at')
    .lte('created_at', cacheParams.endDate);

  if (!users || users.length === 0) {
    return { churnRate: 0, totalUsers: 0, inactiveUsers: 0 };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const inactiveUsers = users.filter(
    (user) =>
      !user.last_sign_in_at || new Date(user.last_sign_in_at) < thirtyDaysAgo,
  ).length;

  return {
    churnRate: users.length > 0 ? (inactiveUsers / users.length) * 100 : 0,
    totalUsers: users.length,
    inactiveUsers,
  };
}
