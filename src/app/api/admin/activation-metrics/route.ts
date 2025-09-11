import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import {
  activationTracker,
  type ActivationFunnel,
  type CohortActivationData,
} from '@/lib/analytics/activation-tracker';

// Rate limiting for admin endpoints
const RATE_LIMIT = 60; // requests per minute

interface ActivationMetricsResponse {
  funnel: ActivationFunnel;
  byUserType: Record<'supplier' | 'couple', ActivationFunnel>;
  cohortAnalysis: CohortActivationData[];
  dropoffAnalysis: any[];
}

/**
 * GET /api/admin/activation-metrics
 *
 * Retrieves activation funnel metrics for admin dashboard
 * Query parameters:
 * - timeframe: '7d', '30d', '90d', 'custom' (default: 30d)
 * - start_date: ISO date string (for custom timeframe)
 * - end_date: ISO date string (for custom timeframe)
 * - user_type: 'supplier', 'couple', 'all' (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication and admin role
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

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const userTypeFilter =
      (searchParams.get('user_type') as 'supplier' | 'couple' | 'all') || 'all';
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (timeframe === 'custom' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const daysMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };
      const days = daysMap[timeframe] || 30;
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    // Validate date range
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Invalid date range: start_date must be before end_date' },
        { status: 400 },
      );
    }

    // Get activation metrics
    let response: ActivationMetricsResponse;

    if (userTypeFilter === 'all') {
      // Get metrics for both user types
      const metrics = await activationTracker.getActivationMetrics({
        start: startDate,
        end: endDate,
      });

      response = {
        funnel: metrics.funnel,
        byUserType: metrics.byUserType,
        cohortAnalysis: [],
        dropoffAnalysis: metrics.funnel.dropoffAnalysis,
      };
    } else {
      // Get metrics for specific user type
      const funnel = await activationTracker.calculateActivationFunnel(
        userTypeFilter,
        {
          start: startDate,
          end: endDate,
        },
      );

      response = {
        funnel,
        byUserType: { [userTypeFilter]: funnel } as any,
        cohortAnalysis: [],
        dropoffAnalysis: funnel.dropoffAnalysis,
      };
    }

    // Generate cohort analysis for the past 30 days
    const cohortPromises: Promise<CohortActivationData>[] = [];
    const cohortDays = 30;

    for (let i = cohortDays; i >= 0; i--) {
      const cohortDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const cohortDateString = cohortDate.toISOString().split('T')[0];

      if (userTypeFilter === 'all') {
        cohortPromises.push(
          activationTracker.getCohortActivationData(
            cohortDateString,
            'supplier',
          ),
          activationTracker.getCohortActivationData(cohortDateString, 'couple'),
        );
      } else {
        cohortPromises.push(
          activationTracker.getCohortActivationData(
            cohortDateString,
            userTypeFilter,
          ),
        );
      }
    }

    // Execute cohort analysis with timeout
    const cohortResults = await Promise.allSettled(cohortPromises);
    response.cohortAnalysis = cohortResults
      .filter(
        (result): result is PromiseFulfilledResult<CohortActivationData> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value)
      .sort(
        (a, b) =>
          new Date(a.cohortDate).getTime() - new Date(b.cohortDate).getTime(),
      );

    // Add metadata
    const responseWithMeta = {
      ...response,
      metadata: {
        timeframe,
        userTypeFilter,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedAt: new Date().toISOString(),
        totalCohorts: response.cohortAnalysis.length,
      },
    };

    return NextResponse.json(responseWithMeta, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in activation metrics API:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/activation-metrics
 *
 * Trigger recalculation of activation metrics (for admin use)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication and admin role
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

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, parameters } = body;

    if (action === 'refresh_metrics') {
      // Trigger a manual refresh of activation metrics
      const timeRange = parameters?.timeRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const [supplierMetrics, coupleMetrics] = await Promise.all([
        activationTracker.calculateActivationFunnel('supplier', timeRange),
        activationTracker.calculateActivationFunnel('couple', timeRange),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Activation metrics refreshed successfully',
        data: {
          supplier: supplierMetrics,
          couple: coupleMetrics,
          refreshedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: refresh_metrics' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Error in activation metrics POST API:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * Rate limiting middleware
 */
function checkRateLimit(userIp: string): boolean {
  // In production, implement proper rate limiting with Redis or similar
  // For now, return true to allow all requests
  return true;
}
