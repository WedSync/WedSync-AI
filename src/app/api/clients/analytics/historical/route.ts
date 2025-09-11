import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ratelimit } from '@/lib/rate-limiter';
import { clientAnalyticsEngine } from '@/lib/analytics/client-analytics-engine';

const historicalAnalyticsSchema = z.object({
  client_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  metrics: z
    .array(
      z.enum([
        'engagement_trends',
        'communication_patterns',
        'journey_progression',
        'revenue_attribution',
        'satisfaction_trends',
        'milestone_achievements',
        'behavioral_segments',
        'predictive_insights',
      ]),
    )
    .default(['engagement_trends', 'communication_patterns']),
  export_format: z.enum(['json', 'csv', 'pdf']).default('json'),
  include_predictions: z.boolean().default(false),
  privacy_level: z.enum(['full', 'aggregated', 'anonymized']).default('full'),
});

interface HistoricalMetrics {
  period: string;
  engagement_score: number;
  activity_events: number;
  communication_touchpoints: number;
  response_rate: number;
  journey_progress: number;
  revenue_generated: number;
  satisfaction_score: number;
  milestone_count: number;
}

interface TrendAnalysis {
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  trend_strength: number;
  growth_rate: number;
  volatility: number;
  seasonal_patterns: {
    pattern: string;
    strength: number;
    peak_periods: string[];
  }[];
}

interface ClientSegmentation {
  segment_name: string;
  segment_size: number;
  characteristics: {
    engagement_level: string;
    communication_preference: string;
    journey_stage: string;
    value_tier: string;
  };
  behavioral_patterns: {
    peak_activity_hours: number[];
    preferred_channels: string[];
    response_patterns: string;
  };
}

function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // Check if start is before end
  if (start >= end) {
    return false;
  }

  // Check if end is not in the future
  if (end > now) {
    return false;
  }

  // Check if range is not too large (max 2 years)
  const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
  if (end.getTime() - start.getTime() > maxRange) {
    return false;
  }

  return true;
}

function generatePeriods(
  startDate: string,
  endDate: string,
  granularity: string,
): string[] {
  const periods: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);

  while (current <= end) {
    switch (granularity) {
      case 'daily':
        periods.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        // Get Monday of the week
        const monday = new Date(current);
        monday.setDate(current.getDate() - current.getDay() + 1);
        periods.push(monday.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
        periods.push(firstDay.toISOString().split('T')[0]);
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return [...new Set(periods)]; // Remove duplicates
}

async function getHistoricalEngagementTrends(
  supabase: any,
  clientId: string | null,
  supplierId: string | null,
  startDate: string,
  endDate: string,
  granularity: string,
  privacyLevel: string,
): Promise<{ data: HistoricalMetrics[]; trends: TrendAnalysis }> {
  const periods = generatePeriods(startDate, endDate, granularity);
  const metrics: HistoricalMetrics[] = [];

  // Build dynamic query based on granularity
  let dateFormat: string;
  switch (granularity) {
    case 'daily':
      dateFormat = 'DATE(created_at)';
      break;
    case 'weekly':
      dateFormat = "DATE_TRUNC('week', created_at)::date";
      break;
    case 'monthly':
      dateFormat = "DATE_TRUNC('month', created_at)::date";
      break;
    default:
      dateFormat = 'DATE(created_at)';
  }

  // Get engagement events grouped by period
  let engagementQuery = supabase
    .from('client_engagement_events')
    .select(
      `
      ${dateFormat} as period,
      event_type,
      client_id,
      supplier_id,
      event_data,
      duration_seconds
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (clientId) {
    engagementQuery = engagementQuery.eq('client_id', clientId);
  }
  if (supplierId) {
    engagementQuery = engagementQuery.eq('supplier_id', supplierId);
  }

  const { data: engagementEvents, error: engagementError } =
    await engagementQuery;

  if (engagementError) {
    console.error('Historical engagement error:', engagementError);
    throw new Error(
      `Failed to fetch engagement trends: ${engagementError.message}`,
    );
  }

  // Get communication data for the same periods
  const communicationPromises = [
    supabase
      .from('email_communications')
      .select(
        `
        ${dateFormat.replace('created_at', 'sent_at')} as period,
        client_id,
        supplier_id,
        response_received,
        response_time_hours
      `,
      )
      .gte('sent_at', startDate)
      .lte('sent_at', endDate)
      .apply((q) => {
        if (clientId) q = q.eq('client_id', clientId);
        if (supplierId) q = q.eq('supplier_id', supplierId);
        return q;
      }),

    supabase
      .from('client_journey_progress')
      .select(
        `
        ${dateFormat.replace('created_at', 'updated_at')} as period,
        client_id,
        completion_percentage,
        milestones_achieved
      `,
      )
      .gte('updated_at', startDate)
      .lte('updated_at', endDate)
      .apply((q) => {
        if (clientId) q = q.eq('client_id', clientId);
        return q;
      }),

    supabase
      .from('client_revenue_attribution')
      .select(
        `
        ${dateFormat.replace('created_at', 'transaction_date')} as period,
        client_id,
        supplier_id,
        revenue_amount
      `,
      )
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .apply((q) => {
        if (clientId) q = q.eq('client_id', clientId);
        if (supplierId) q = q.eq('supplier_id', supplierId);
        return q;
      }),
  ];

  const [emailResult, journeyResult, revenueResult] = await Promise.all(
    communicationPromises,
  );

  const emails = emailResult.data || [];
  const journeys = journeyResult.data || [];
  const revenues = revenueResult.data || [];

  // Process data for each period
  for (const period of periods) {
    const periodStart = new Date(period);
    const periodEnd = new Date(period);

    // Set period boundaries based on granularity
    switch (granularity) {
      case 'daily':
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;
      case 'weekly':
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
    }

    // Filter data for this period
    const periodEngagementEvents = (engagementEvents || []).filter(
      (e) => e.period === period,
    );

    const periodEmails = emails.filter((e) => e.period === period);
    const periodJourneys = journeys.filter((j) => j.period === period);
    const periodRevenues = revenues.filter((r) => r.period === period);

    // Calculate metrics for this period
    const engagementScore = calculatePeriodEngagementScore(
      periodEngagementEvents,
    );
    const activityEvents = periodEngagementEvents.length;
    const communicationTouchpoints = periodEmails.length;
    const responseRate =
      periodEmails.length > 0
        ? (periodEmails.filter((e) => e.response_received).length /
            periodEmails.length) *
          100
        : 0;

    const journeyProgress =
      periodJourneys.length > 0
        ? periodJourneys.reduce(
            (sum, j) => sum + (j.completion_percentage || 0),
            0,
          ) / periodJourneys.length
        : 0;

    const revenueGenerated = periodRevenues.reduce(
      (sum, r) => sum + parseFloat(r.revenue_amount || 0),
      0,
    );

    const milestoneCount = periodJourneys.reduce(
      (sum, j) =>
        sum +
        (Array.isArray(j.milestones_achieved)
          ? j.milestones_achieved.length
          : 0),
      0,
    );

    // Privacy-compliant data transformation
    const metric: HistoricalMetrics = {
      period,
      engagement_score:
        privacyLevel === 'anonymized'
          ? Math.round(engagementScore / 10) * 10
          : engagementScore,
      activity_events:
        privacyLevel === 'anonymized'
          ? Math.round(activityEvents / 5) * 5
          : activityEvents,
      communication_touchpoints:
        privacyLevel === 'anonymized'
          ? Math.round(communicationTouchpoints / 5) * 5
          : communicationTouchpoints,
      response_rate: Math.round(responseRate * 100) / 100,
      journey_progress: Math.round(journeyProgress * 100) / 100,
      revenue_generated:
        privacyLevel === 'anonymized'
          ? Math.round(revenueGenerated / 100) * 100
          : revenueGenerated,
      satisfaction_score: 0, // Would be calculated from satisfaction surveys
      milestone_count: milestoneCount,
    };

    metrics.push(metric);
  }

  // Calculate trend analysis
  const trends = calculateTrendAnalysis(metrics);

  return { data: metrics, trends };
}

function calculatePeriodEngagementScore(events: any[]): number {
  if (!events || events.length === 0) return 0;

  const eventWeights = {
    portal_login: 10,
    form_submit: 15,
    document_download: 8,
    message_sent: 12,
    email_open: 3,
    email_click: 5,
    call_scheduled: 20,
    meeting_attended: 25,
    payment_made: 30,
    form_view: 2,
    portal_view: 1,
  };

  const totalScore = events.reduce((sum, event) => {
    const weight =
      eventWeights[event.event_type as keyof typeof eventWeights] || 1;
    return sum + weight;
  }, 0);

  return Math.min(100, (totalScore / events.length) * 5);
}

function calculateTrendAnalysis(metrics: HistoricalMetrics[]): TrendAnalysis {
  if (metrics.length < 2) {
    return {
      trend_direction: 'stable',
      trend_strength: 0,
      growth_rate: 0,
      volatility: 0,
      seasonal_patterns: [],
    };
  }

  // Calculate engagement score trend
  const engagementScores = metrics.map((m) => m.engagement_score);
  const firstScore = engagementScores[0];
  const lastScore = engagementScores[engagementScores.length - 1];

  const growthRate =
    firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;
  const trendDirection: 'increasing' | 'decreasing' | 'stable' =
    growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable';

  // Calculate trend strength using linear regression
  const n = engagementScores.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = engagementScores.reduce((a, b) => a + b, 0);
  const sumXY = engagementScores.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const trendStrength = Math.abs(slope) * 10; // Normalize

  // Calculate volatility (coefficient of variation)
  const mean = sumY / n;
  const variance =
    engagementScores.reduce(
      (sum, score) => sum + Math.pow(score - mean, 2),
      0,
    ) / n;
  const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // Simple seasonal pattern detection (would be more sophisticated in production)
  const seasonalPatterns = detectSeasonalPatterns(metrics);

  return {
    trend_direction: trendDirection,
    trend_strength: Math.round(trendStrength * 100) / 100,
    growth_rate: Math.round(growthRate * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    seasonal_patterns: seasonalPatterns,
  };
}

function detectSeasonalPatterns(metrics: HistoricalMetrics[]): {
  pattern: string;
  strength: number;
  peak_periods: string[];
}[] {
  // This is a simplified version - in production, you'd use proper time series analysis
  const patterns = [];

  if (metrics.length >= 7) {
    // Weekly pattern detection
    const weeklyAverages = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);

    metrics.forEach((metric, index) => {
      const dayOfWeek = new Date(metric.period).getDay();
      weeklyAverages[dayOfWeek] += metric.engagement_score;
      weeklyCounts[dayOfWeek]++;
    });

    const weeklyMeans = weeklyAverages.map((sum, i) =>
      weeklyCounts[i] > 0 ? sum / weeklyCounts[i] : 0,
    );
    const overallMean =
      weeklyMeans.reduce((a, b) => a + b, 0) / weeklyMeans.length;
    const weeklyVariance =
      weeklyMeans.reduce(
        (sum, mean) => sum + Math.pow(mean - overallMean, 2),
        0,
      ) / weeklyMeans.length;

    if (weeklyVariance > 10) {
      // Threshold for significant pattern
      const peakDays = weeklyMeans
        .map((mean, i) => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
          mean,
        }))
        .sort((a, b) => b.mean - a.mean)
        .slice(0, 2)
        .map((d) => d.day);

      patterns.push({
        pattern: 'weekly',
        strength: Math.min(100, weeklyVariance / 10),
        peak_periods: peakDays,
      });
    }
  }

  return patterns;
}

async function generateClientSegmentation(
  supabase: any,
  supplierId: string | null,
  startDate: string,
  endDate: string,
  privacyLevel: string,
): Promise<ClientSegmentation[]> {
  // Get client data for segmentation
  let query = supabase
    .from('client_engagement_events')
    .select(
      `
      client_id,
      event_type,
      created_at,
      event_data,
      clients!inner(created_at, organization_id),
      client_journey_progress!inner(completion_percentage, engagement_level)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data: clientData, error } = await query;

  if (error || !clientData) {
    console.error('Client segmentation error:', error);
    return [];
  }

  // Group data by client
  const clientGroups = clientData.reduce((acc: any, event) => {
    const clientId =
      privacyLevel === 'anonymized' ? 'anonymous' : event.client_id;

    if (!acc[clientId]) {
      acc[clientId] = {
        events: [],
        journey_progress: event.client_journey_progress?.[0] || {},
        created_at: event.clients?.created_at,
      };
    }

    acc[clientId].events.push(event);
    return acc;
  }, {});

  // Analyze each client and create segments
  const segments: { [key: string]: ClientSegmentation } = {};

  Object.values(clientGroups).forEach((client: any) => {
    const events = client.events;
    const journeyProgress = client.journey_progress;

    // Calculate engagement level
    const eventCount = events.length;
    const uniqueEventTypes = new Set(events.map((e: any) => e.event_type)).size;
    const engagementLevel =
      eventCount > 20 && uniqueEventTypes > 5
        ? 'high'
        : eventCount > 10 && uniqueEventTypes > 3
          ? 'medium'
          : 'low';

    // Determine communication preference
    const channelCounts = events.reduce((counts: any, event: any) => {
      const channel = event.event_type.includes('email')
        ? 'email'
        : event.event_type.includes('portal')
          ? 'portal'
          : event.event_type.includes('call')
            ? 'phone'
            : 'other';
      counts[channel] = (counts[channel] || 0) + 1;
      return counts;
    }, {});

    const preferredChannel =
      Object.entries(channelCounts).sort(
        ([, a], [, b]) => (b as number) - (a as number),
      )[0]?.[0] || 'email';

    // Determine journey stage
    const completionPercentage = journeyProgress.completion_percentage || 0;
    const journeyStage =
      completionPercentage > 80
        ? 'completion'
        : completionPercentage > 50
          ? 'engagement'
          : completionPercentage > 20
            ? 'activation'
            : 'awareness';

    // Determine value tier (simplified)
    const valueTier =
      engagementLevel === 'high'
        ? 'premium'
        : engagementLevel === 'medium'
          ? 'standard'
          : 'basic';

    // Create segment key
    const segmentKey = `${engagementLevel}_${preferredChannel}_${journeyStage}_${valueTier}`;

    if (!segments[segmentKey]) {
      segments[segmentKey] = {
        segment_name: `${engagementLevel.toUpperCase()} ${journeyStage} clients via ${preferredChannel}`,
        segment_size: 0,
        characteristics: {
          engagement_level: engagementLevel,
          communication_preference: preferredChannel,
          journey_stage: journeyStage,
          value_tier: valueTier,
        },
        behavioral_patterns: {
          peak_activity_hours: [],
          preferred_channels: [preferredChannel],
          response_patterns: 'responsive', // Simplified
        },
      };
    }

    segments[segmentKey].segment_size++;
  });

  return Object.values(segments);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = request.ip || 'unknown';

    // Rate limiting for historical analytics (lower limit due to computational cost)
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `historical_analytics_${ip}`,
    );

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit,
          reset: new Date(reset * 1000),
          remaining,
        },
        { status: 429 },
      );
    }

    // Parse and validate query parameters
    const queryParams = {
      client_id: searchParams.get('client_id') || undefined,
      supplier_id: searchParams.get('supplier_id') || undefined,
      start_date:
        searchParams.get('start_date') ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: searchParams.get('end_date') || new Date().toISOString(),
      granularity: searchParams.get('granularity') || 'daily',
      metrics: searchParams.get('metrics')?.split(',') || [
        'engagement_trends',
        'communication_patterns',
      ],
      export_format: searchParams.get('export_format') || 'json',
      include_predictions: searchParams.get('include_predictions') === 'true',
      privacy_level: searchParams.get('privacy_level') || 'full',
    };

    const validatedParams = historicalAnalyticsSchema.parse(queryParams);

    // Validate date range
    if (
      !validateDateRange(validatedParams.start_date, validatedParams.end_date)
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid date range. Ensure start_date < end_date and range is not too large.',
        },
        { status: 400 },
      );
    }

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication and authorization
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify access to supplier data
    if (validatedParams.supplier_id) {
      const { data: orgAccess } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', validatedParams.supplier_id)
        .single();

      if (!orgAccess) {
        return NextResponse.json(
          { error: 'Forbidden - No access to supplier data' },
          { status: 403 },
        );
      }
    }

    const analyticsData: any = {
      metadata: {
        client_id: validatedParams.client_id,
        supplier_id: validatedParams.supplier_id,
        start_date: validatedParams.start_date,
        end_date: validatedParams.end_date,
        granularity: validatedParams.granularity,
        privacy_level: validatedParams.privacy_level,
        generated_at: new Date().toISOString(),
        requested_metrics: validatedParams.metrics,
      },
    };

    // Fetch historical analytics data
    const dataPromises = [];

    if (validatedParams.metrics.includes('engagement_trends')) {
      dataPromises.push(
        getHistoricalEngagementTrends(
          supabase,
          validatedParams.client_id || null,
          validatedParams.supplier_id || null,
          validatedParams.start_date,
          validatedParams.end_date,
          validatedParams.granularity,
          validatedParams.privacy_level,
        ).then((data) => ({ engagement_trends: data })),
      );
    }

    if (validatedParams.metrics.includes('behavioral_segments')) {
      dataPromises.push(
        generateClientSegmentation(
          supabase,
          validatedParams.supplier_id || null,
          validatedParams.start_date,
          validatedParams.end_date,
          validatedParams.privacy_level,
        ).then((data) => ({ behavioral_segments: data })),
      );
    }

    // Wait for all data to be fetched
    const results = await Promise.all(dataPromises);

    // Merge results
    results.forEach((result) => {
      Object.assign(analyticsData, result);
    });

    // Add predictive insights if requested
    if (
      validatedParams.include_predictions &&
      analyticsData.engagement_trends
    ) {
      analyticsData.predictive_insights = generatePredictiveInsights(
        analyticsData.engagement_trends.data,
      );
    }

    // Handle different export formats
    if (validatedParams.export_format === 'csv') {
      const csv = convertToCSV(analyticsData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition':
            'attachment; filename="client_analytics_historical.csv"',
        },
      });
    }

    return NextResponse.json(analyticsData, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600', // 30 minutes cache
        'X-Analytics-Version': '1.0',
        'X-Privacy-Level': validatedParams.privacy_level,
        'X-Data-Points':
          analyticsData.engagement_trends?.data?.length?.toString() || '0',
      },
    });
  } catch (error) {
    console.error('Historical analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate historical analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

function generatePredictiveInsights(historicalData: HistoricalMetrics[]): any {
  if (historicalData.length < 5) {
    return {
      predictions: [],
      confidence: 'low',
      warning: 'Insufficient data for reliable predictions',
    };
  }

  // Simple linear trend prediction (would use ML models in production)
  const engagementScores = historicalData.map((d) => d.engagement_score);
  const n = engagementScores.length;

  // Calculate trend
  const sumX = (n * (n - 1)) / 2;
  const sumY = engagementScores.reduce((a, b) => a + b, 0);
  const sumXY = engagementScores.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next 7 periods
  const predictions = [];
  for (let i = 1; i <= 7; i++) {
    const predictedScore = Math.max(
      0,
      Math.min(100, intercept + slope * (n + i - 1)),
    );
    predictions.push({
      period: i,
      predicted_engagement_score: Math.round(predictedScore * 100) / 100,
      confidence_interval: {
        lower: Math.max(0, predictedScore - 10),
        upper: Math.min(100, predictedScore + 10),
      },
    });
  }

  return {
    predictions,
    confidence: slope !== 0 ? 'medium' : 'low',
    trend_analysis: {
      slope: Math.round(slope * 100) / 100,
      direction:
        slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
    },
  };
}

function convertToCSV(data: any): string {
  if (!data.engagement_trends?.data) {
    return 'No data available for CSV export';
  }

  const headers = [
    'period',
    'engagement_score',
    'activity_events',
    'communication_touchpoints',
    'response_rate',
    'journey_progress',
    'revenue_generated',
    'milestone_count',
  ];

  const csvRows = [headers.join(',')];

  data.engagement_trends.data.forEach((row: HistoricalMetrics) => {
    const csvRow = headers
      .map((header) => {
        const value = row[header as keyof HistoricalMetrics];
        return typeof value === 'string' ? `"${value}"` : value;
      })
      .join(',');
    csvRows.push(csvRow);
  });

  return csvRows.join('\n');
}
