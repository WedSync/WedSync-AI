/**
 * Core Analytics Metrics API Endpoint
 *
 * High-performance endpoint for calculating and serving wedding business metrics
 * with sub-200ms response times and intelligent caching for peak season loads.
 *
 * @route POST /api/analytics/metrics
 * @author WedSync Analytics Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsEngine } from '@/lib/analytics/analytics-engine';
import { WeddingBusinessIntelligence } from '@/lib/analytics/wedding-business-intelligence';
import { createDatabaseOptimization } from '@/lib/analytics/database-optimization';
import { createSupabaseServiceClient } from '@/lib/supabase';

// Initialize analytics services
const analyticsEngine = new AnalyticsEngine();
const weddingBI = new WeddingBusinessIntelligence();
const dbOptimizer = createDatabaseOptimization();

/**
 * Metrics request interface
 */
interface MetricsRequest {
  vendorId: string;
  timeframe: {
    startDate: string;
    endDate: string;
    granularity: 'hour' | 'day' | 'week' | 'month';
    timezone: string;
  };
  metrics: string[];
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  groupBy?: string[];
  compareWith?: 'previous_period' | 'same_period_last_year';
}

/**
 * POST /api/analytics/metrics
 *
 * Calculate comprehensive wedding business metrics with real-time caching
 * Optimized for peak wedding season performance (May-October)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request
    const requestData: MetricsRequest = await request.json();

    if (
      !requestData.vendorId ||
      !requestData.timeframe ||
      !requestData.metrics?.length
    ) {
      return NextResponse.json(
        {
          error: 'Missing required fields: vendorId, timeframe, metrics',
          code: 'INVALID_REQUEST',
        },
        { status: 400 },
      );
    }

    // Authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid token' },
        { status: 401 },
      );
    }

    // Extract user context from token
    const userContext = await extractUserContext(
      authHeader.replace('Bearer ', ''),
    );
    if (!userContext.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 },
      );
    }

    // Validate vendor access
    if (
      !(await hasVendorAccess(
        userContext.organizationId!,
        requestData.vendorId,
      ))
    ) {
      return NextResponse.json(
        { error: 'Forbidden - No access to vendor data' },
        { status: 403 },
      );
    }

    // Build optimized metrics calculation request
    const metricsCalculationRequest = {
      vendorId: requestData.vendorId,
      timeframe: {
        startDate: new Date(requestData.timeframe.startDate),
        endDate: new Date(requestData.timeframe.endDate),
        granularity: requestData.timeframe.granularity,
        timezone: requestData.timeframe.timezone || 'UTC',
      },
      metrics: requestData.metrics.map((metricName) => ({
        name: metricName,
        type: determineMetricType(metricName) as
          | 'count'
          | 'sum'
          | 'average'
          | 'percentage'
          | 'ratio'
          | 'custom',
      })),
      filters:
        requestData.filters?.map((filter) => ({
          field: filter.field,
          operator: filter.operator as any,
          value: filter.value,
        })) || [],
      groupBy: requestData.groupBy || [],
      aggregations: ['sum', 'average', 'count'] as (
        | 'sum'
        | 'count'
        | 'average'
        | 'min'
        | 'max'
        | 'distinct'
        | 'percentile'
      )[],
      compareWith: requestData.compareWith
        ? {
            type: requestData.compareWith as
              | 'previous_period'
              | 'same_period_last_year'
              | 'custom',
          }
        : undefined,
    };

    // Use database optimization for caching
    const cacheKey = generateMetricsCacheKey(metricsCalculationRequest);

    const cachedResult = await dbOptimizer.getCachedQuery(
      cacheKey,
      async () => {
        // Calculate metrics using analytics engine
        const results = await analyticsEngine.calculateMetrics(
          metricsCalculationRequest,
        );

        // Enrich with wedding-specific insights
        const weddingMetrics = await weddingBI.calculateWeddingMetrics(
          requestData.vendorId,
          {
            startDate: new Date(requestData.timeframe.startDate),
            endDate: new Date(requestData.timeframe.endDate),
            timezone: requestData.timeframe.timezone || 'UTC',
          },
        );

        return {
          ...results,
          weddingSpecific: weddingMetrics.weddingSpecificMetrics,
          seasonalContext: getCurrentSeasonalContext(),
        };
      },
      300, // 5 minutes cache
    );

    const executionTime = Date.now() - startTime;

    // Build response with comprehensive metrics
    const response = {
      requestId: cachedResult.requestId,
      data: {
        metrics: cachedResult.results,
        weddingInsights: cachedResult.weddingSpecific,
        seasonalContext: cachedResult.seasonalContext,
        comparisonData: cachedResult.compareWith
          ? await getComparisonData(requestData)
          : null,
      },
      metadata: {
        executionTime,
        cacheHit: cachedResult.cacheInfo.hit,
        dataQuality: cachedResult.dataQuality,
        calculationTime: cachedResult.calculationTime,
        nextUpdateTime: cachedResult.nextUpdateTime,
        tier: userContext.tier,
      },
      performance: {
        queryTime: executionTime,
        cacheStatus: cachedResult.cacheInfo.hit ? 'HIT' : 'MISS',
        optimizations: cachedResult.cacheInfo.hit ? ['cache'] : ['real-time'],
      },
    };

    // Add performance headers
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'X-Response-Time': executionTime.toString(),
      'X-Cache-Status': cachedResult.cacheInfo.hit ? 'HIT' : 'MISS',
      'X-Data-Quality': cachedResult.dataQuality.overall.toString(),
      'Cache-Control': 'private, max-age=300', // 5 minutes
      Vary: 'Authorization',
    });

    // Add rate limiting headers based on tier
    const rateLimitInfo = getRateLimitInfo(userContext.tier!);
    responseHeaders.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    responseHeaders.set(
      'X-RateLimit-Remaining',
      rateLimitInfo.remaining.toString(),
    );

    return NextResponse.json(response, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Analytics metrics API error:', error);

    const executionTime = Date.now() - startTime;

    // Handle specific error types
    if (error.message?.includes('Model accuracy')) {
      return NextResponse.json(
        {
          error:
            'Analytics service temporarily unavailable - model retraining in progress',
          code: 'SERVICE_UNAVAILABLE',
          retryAfter: 300, // 5 minutes
        },
        {
          status: 503,
          headers: {
            'Retry-After': '300',
            'X-Response-Time': executionTime.toString(),
          },
        },
      );
    }

    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        {
          error:
            'Request timeout - try reducing the time range or metrics count',
          code: 'REQUEST_TIMEOUT',
          suggestions: [
            'Reduce timeframe to last 30 days',
            'Request fewer metrics per call',
            'Use hourly instead of minute-level granularity',
          ],
        },
        {
          status: 408,
          headers: {
            'X-Response-Time': executionTime.toString(),
          },
        },
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': executionTime.toString(),
        },
      },
    );
  }
}

/**
 * GET /api/analytics/metrics
 *
 * Retrieve pre-calculated metrics for dashboard widgets
 * Optimized for real-time dashboard updates
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  try {
    const vendorId = searchParams.get('vendorId');
    const metricsType = searchParams.get('type') || 'dashboard';

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Missing vendorId parameter' },
        { status: 400 },
      );
    }

    // Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userContext = await extractUserContext(
      authHeader.replace('Bearer ', ''),
    );
    if (!userContext.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get pre-calculated dashboard metrics
    const cacheKey = `dashboard_metrics:${vendorId}:${metricsType}`;

    const metrics = await dbOptimizer.getCachedQuery(
      cacheKey,
      async () => {
        return await getDashboardMetrics(vendorId, metricsType);
      },
      60, // 1 minute cache for dashboard
    );

    const executionTime = Date.now() - startTime;

    return NextResponse.json(
      {
        data: metrics,
        metadata: {
          executionTime,
          vendorId,
          metricsType,
          lastUpdated: new Date().toISOString(),
          tier: userContext.tier,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': executionTime.toString(),
          'Cache-Control': 'private, max-age=60',
        },
      },
    );
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    const executionTime = Date.now() - startTime;

    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      {
        status: 500,
        headers: {
          'X-Response-Time': executionTime.toString(),
        },
      },
    );
  }
}

// Helper functions

async function extractUserContext(token: string): Promise<{
  success: boolean;
  userId?: string;
  organizationId?: string;
  tier?: string;
}> {
  try {
    // In production, verify JWT properly
    const payload = JSON.parse(atob(token.split('.')[1]));

    return {
      success: true,
      userId: payload.userId,
      organizationId: payload.organizationId,
      tier: payload.tier || 'free',
    };
  } catch {
    return { success: false };
  }
}

async function hasVendorAccess(
  organizationId: string,
  vendorId: string,
): Promise<boolean> {
  // In production, check database for vendor access
  // For now, assume vendorId matches organizationId or user has access
  return true;
}

function determineMetricType(metricName: string): string {
  const metricTypeMap: Record<string, string> = {
    total_clients: 'count',
    total_revenue: 'sum',
    average_booking_value: 'average',
    conversion_rate: 'percentage',
    client_satisfaction: 'average',
    form_completion_rate: 'percentage',
    booking_lead_time: 'average',
    seasonal_revenue: 'sum',
    wedding_count: 'count',
    repeat_client_rate: 'percentage',
  };

  return metricTypeMap[metricName] || 'custom';
}

function generateMetricsCacheKey(request: any): string {
  const keyParts = [
    'metrics',
    request.vendorId,
    request.timeframe.startDate.toISOString().split('T')[0],
    request.timeframe.endDate.toISOString().split('T')[0],
    request.metrics
      .map((m: any) => m.name)
      .sort()
      .join(','),
    request.groupBy?.sort().join(',') || 'none',
  ];

  return keyParts.join(':');
}

function getCurrentSeasonalContext(): any {
  const now = new Date();
  const month = now.getMonth() + 1;

  let season: string;
  let peakSeason: boolean;

  if (month >= 3 && month <= 5) {
    season = 'Spring';
    peakSeason = month >= 4; // April-May start ramping up
  } else if (month >= 6 && month <= 8) {
    season = 'Summer';
    peakSeason = true; // Peak wedding season
  } else if (month >= 9 && month <= 11) {
    season = 'Fall';
    peakSeason = month === 9; // September is still peak
  } else {
    season = 'Winter';
    peakSeason = false; // Low season
  }

  return {
    currentSeason: season,
    isPeakSeason: peakSeason,
    seasonMultiplier: peakSeason ? 1.5 : 0.7,
    nextPeakSeason: peakSeason ? null : 'May-September',
    recommendations: peakSeason
      ? ['Maximize capacity', 'Premium pricing', 'Focus on efficiency']
      : ['Plan for next season', 'Focus on retention', 'Develop new services'],
  };
}

async function getComparisonData(request: MetricsRequest): Promise<any> {
  // Calculate comparison period data
  const timeframe = request.timeframe;
  const startDate = new Date(timeframe.startDate);
  const endDate = new Date(timeframe.endDate);

  let comparisonStart: Date;
  let comparisonEnd: Date;

  if (request.compareWith === 'previous_period') {
    const periodLength = endDate.getTime() - startDate.getTime();
    comparisonEnd = new Date(startDate.getTime() - 1);
    comparisonStart = new Date(comparisonEnd.getTime() - periodLength);
  } else {
    // same_period_last_year
    comparisonStart = new Date(startDate);
    comparisonStart.setFullYear(startDate.getFullYear() - 1);
    comparisonEnd = new Date(endDate);
    comparisonEnd.setFullYear(endDate.getFullYear() - 1);
  }

  // Return comparison data structure
  return {
    period: `${comparisonStart.toISOString().split('T')[0]} to ${comparisonEnd.toISOString().split('T')[0]}`,
    type: request.compareWith,
    // In production, calculate actual comparison metrics
    metrics: {},
  };
}

function getRateLimitInfo(tier: string): { limit: number; remaining: number } {
  const limits: Record<string, number> = {
    free: 10,
    starter: 100,
    professional: 500,
    scale: 1000,
    enterprise: 5000,
  };

  return {
    limit: limits[tier] || 10,
    remaining: Math.floor((limits[tier] || 10) * 0.8), // Mock remaining
  };
}

async function getDashboardMetrics(
  vendorId: string,
  metricsType: string,
): Promise<any> {
  const supabase = createSupabaseServiceClient();

  try {
    // Get basic metrics from database
    const [clientsResult, formsResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, created_at, wedding_date, budget')
        .eq('organization_id', vendorId),

      supabase
        .from('forms')
        .select(
          `
          id,
          form_responses (
            id,
            completion_rate,
            submitted_at
          )
        `,
        )
        .eq('organization_id', vendorId),
    ]);

    const clients = clientsResult.data || [];
    const forms = formsResult.data || [];

    // Calculate dashboard metrics
    const totalClients = clients.length;
    const upcomingWeddings = clients.filter(
      (c) => c.wedding_date && new Date(c.wedding_date) > new Date(),
    ).length;

    const totalForms = forms.length;
    const avgCompletionRate =
      forms.reduce((acc, form) => {
        const responses = (form.form_responses as any[]) || [];
        const avgRate =
          responses.reduce((sum, r) => sum + (r.completion_rate || 0), 0) /
          (responses.length || 1);
        return acc + avgRate;
      }, 0) / (forms.length || 1);

    const averageBudget =
      clients.reduce((sum, c) => sum + (c.budget || 0), 0) /
      (clients.length || 1);

    // Wedding season context
    const seasonalContext = getCurrentSeasonalContext();

    return {
      summary: {
        totalClients,
        upcomingWeddings,
        totalForms,
        averageCompletionRate: Math.round(avgCompletionRate * 100) / 100,
        averageBudget: Math.round(averageBudget),
      },
      trends: {
        clientGrowth: calculateGrowthRate(clients),
        seasonalFactor: seasonalContext.seasonMultiplier,
        peakSeasonStatus: seasonalContext.isPeakSeason,
      },
      recommendations: seasonalContext.recommendations,
      lastCalculated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);

    // Return fallback metrics
    return {
      summary: {
        totalClients: 0,
        upcomingWeddings: 0,
        totalForms: 0,
        averageCompletionRate: 0,
        averageBudget: 0,
      },
      trends: {
        clientGrowth: 0,
        seasonalFactor: 1,
        peakSeasonStatus: false,
      },
      recommendations: ['Contact support for data sync'],
      error: 'Unable to calculate current metrics',
      lastCalculated: new Date().toISOString(),
    };
  }
}

function calculateGrowthRate(clients: any[]): number {
  if (clients.length < 2) return 0;

  // Calculate month-over-month growth
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const lastMonthClients = clients.filter(
    (c) => new Date(c.created_at) >= lastMonth && new Date(c.created_at) < now,
  ).length;

  const previousMonthClients = clients.filter(
    (c) =>
      new Date(c.created_at) >= twoMonthsAgo &&
      new Date(c.created_at) < lastMonth,
  ).length;

  if (previousMonthClients === 0) return lastMonthClients > 0 ? 100 : 0;

  return Math.round(
    ((lastMonthClients - previousMonthClients) / previousMonthClients) * 100,
  );
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
