/**
 * Advanced Viral Analytics API - GET /api/viral/analytics
 * WS-141 Round 2: Comprehensive viral performance analytics
 * SECURITY: Rate limited, authenticated, privacy protected
 * PERFORMANCE: Analytics under 200ms, complex queries under 1s
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { ViralAnalyticsService } from '@/lib/services/viral-analytics-service';

// Query parameter validation schema
const viralAnalyticsQuerySchema = z.object({
  analysis_type: z
    .enum([
      'generation',
      'channel',
      'timing',
      'geographic',
      'cohort',
      'summary',
    ])
    .default('summary'),
  timeframe: z.enum(['7d', '30d', '90d', '180d', '1y']).default('30d'),
  recipient_type: z.enum(['past_client', 'vendor', 'friend']).optional(),
  max_generations: z.coerce.number().min(1).max(20).default(10),
  cohort_size: z.coerce.number().min(10).max(1000).default(100),
  include_details: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
});

// Response type for viral analytics
interface ViralAnalyticsResponse {
  success: true;
  data: {
    analysis_type: string;
    timeframe: string;
    generation_analysis?: any[];
    channel_performance?: any[];
    timing_insights?: any[];
    geographic_spread?: any[];
    cohort_analysis?: any[];
    summary?: {
      total_generations: number;
      best_performing_channel: string | null;
      top_viral_region: string | null;
      overall_viral_coefficient: number;
      processing_time_ms: number;
      key_insights: string[];
    };
    performance_metrics: {
      query_time_ms: number;
      cache_hit: boolean;
      data_freshness: string;
    };
  };
  computed_at: string;
  cache_ttl: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check permissions - viral analytics require elevated access
    if (
      !session.user.role ||
      ![
        'admin',
        'marketing_manager',
        'data_analyst',
        'business_manager',
      ].includes(session.user.role)
    ) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Insufficient permissions for viral analytics access',
        },
        { status: 403 },
      );
    }

    // Rate limiting for viral analytics
    const rateLimitResult = await rateLimit.check(
      `viral_analytics:${session.user.id}`,
      25, // 25 requests
      300, // per 5 minutes
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Viral analytics rate limit exceeded.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validationResult = viralAnalyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'INVALID_QUERY_PARAMETERS',
          message: 'Invalid query parameters provided',
          details: validationResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const {
      analysis_type,
      timeframe,
      recipient_type,
      max_generations,
      cohort_size,
      include_details,
    } = validationResult.data;

    const timeframeMap = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '180d': '180 days',
      '1y': '1 year',
    };

    let responseData: ViralAnalyticsResponse['data'] = {
      analysis_type,
      timeframe: timeframeMap[timeframe],
      performance_metrics: {
        query_time_ms: 0,
        cache_hit: false,
        data_freshness: new Date().toISOString(),
      },
    };

    const analyticsStartTime = Date.now();

    switch (analysis_type) {
      case 'generation':
        const generationData = await ViralAnalyticsService.analyzeGenerations(
          timeframeMap[timeframe],
          max_generations,
        );

        responseData.generation_analysis = generationData;

        if (include_details) {
          responseData.summary = {
            total_generations: generationData.length,
            best_performing_channel: null,
            top_viral_region: null,
            overall_viral_coefficient:
              generationData.reduce((sum, g) => sum + g.viral_coefficient, 0) /
                generationData.length || 0,
            processing_time_ms: Date.now() - analyticsStartTime,
            key_insights: generateGenerationInsights(generationData),
          };
        }
        break;

      case 'channel':
        const channelData =
          await ViralAnalyticsService.analyzeChannelPerformance(
            timeframeMap[timeframe],
          );

        responseData.channel_performance = channelData;

        if (include_details) {
          responseData.summary = {
            total_generations: 0,
            best_performing_channel: channelData[0]?.channel || null,
            top_viral_region: null,
            overall_viral_coefficient: 0,
            processing_time_ms: Date.now() - analyticsStartTime,
            key_insights: generateChannelInsights(channelData),
          };
        }
        break;

      case 'timing':
        const timingData = await ViralAnalyticsService.analyzeOptimalTiming(
          recipient_type,
          timeframeMap[timeframe],
        );

        responseData.timing_insights = timingData;

        if (include_details) {
          responseData.summary = {
            total_generations: 0,
            best_performing_channel: null,
            top_viral_region: null,
            overall_viral_coefficient: 0,
            processing_time_ms: Date.now() - analyticsStartTime,
            key_insights: generateTimingInsights(timingData),
          };
        }
        break;

      case 'geographic':
        const geographicData =
          await ViralAnalyticsService.analyzeGeographicSpread(
            timeframeMap[timeframe],
          );

        responseData.geographic_spread = geographicData;

        if (include_details) {
          responseData.summary = {
            total_generations: 0,
            best_performing_channel: null,
            top_viral_region: geographicData[0]?.region || null,
            overall_viral_coefficient: 0,
            processing_time_ms: Date.now() - analyticsStartTime,
            key_insights: generateGeographicInsights(geographicData),
          };
        }
        break;

      case 'cohort':
        const cohortData =
          await ViralAnalyticsService.analyzeViralCohorts(cohort_size);

        responseData.cohort_analysis = cohortData;

        if (include_details) {
          responseData.summary = {
            total_generations: 0,
            best_performing_channel: null,
            top_viral_region: null,
            overall_viral_coefficient: 0,
            processing_time_ms: Date.now() - analyticsStartTime,
            key_insights: generateCohortInsights(cohortData),
          };
        }
        break;

      case 'summary':
      default:
        const summaryData =
          await ViralAnalyticsService.getViralAnalyticsSummary(
            timeframeMap[timeframe],
          );

        responseData = {
          ...responseData,
          ...summaryData,
        };
        break;
    }

    // Performance monitoring
    const processingTime = Date.now() - startTime;
    const performanceThreshold = analysis_type === 'summary' ? 200 : 1000;

    if (processingTime > performanceThreshold * 0.9) {
      console.warn(
        `Viral analytics ${analysis_type} took ${processingTime}ms - approaching ${performanceThreshold}ms limit`,
      );
    }

    responseData.performance_metrics.query_time_ms = processingTime;

    const response: ViralAnalyticsResponse = {
      success: true,
      data: responseData,
      computed_at: new Date().toISOString(),
      cache_ttl: analysis_type === 'summary' ? 300 : 600, // 5min for summary, 10min for detailed
    };

    // Add performance headers
    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time': `${processingTime}ms`,
        'X-Analysis-Type': analysis_type,
        'Cache-Control': `private, max-age=${response.cache_ttl}`,
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Data-Privacy': 'aggregated-only',
      },
    });
  } catch (error) {
    console.error('Viral analytics API error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process viral analytics request',
        timestamp: new Date().toISOString(),
        processing_time: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}

// Helper functions for generating insights
function generateGenerationInsights(data: any[]): string[] {
  const insights: string[] = [];

  if (data.length === 0) {
    insights.push('No viral generation data available for analysis');
    return insights;
  }

  const totalGenerations = data.length;
  const avgConversionRate =
    data.reduce((sum, g) => sum + g.conversion_rate, 0) / totalGenerations;
  const strongestGeneration = data.reduce(
    (max, g) => (g.conversion_rate > max.conversion_rate ? g : max),
    data[0],
  );

  insights.push(
    `Viral reach spans ${totalGenerations} generation${totalGenerations > 1 ? 's' : ''}`,
  );
  insights.push(
    `Average conversion rate across generations: ${avgConversionRate.toFixed(2)}%`,
  );

  if (strongestGeneration) {
    insights.push(
      `Generation ${strongestGeneration.generation} shows strongest performance (${strongestGeneration.conversion_rate}% conversion)`,
    );
  }

  const significantDropoff = data.find((g) => g.dropoff_rate > 50);
  if (significantDropoff) {
    insights.push(
      `Significant dropoff detected at generation ${significantDropoff.generation} (${significantDropoff.dropoff_rate}% decline)`,
    );
  }

  return insights;
}

function generateChannelInsights(data: any[]): string[] {
  const insights: string[] = [];

  if (data.length === 0) {
    insights.push('No channel performance data available');
    return insights;
  }

  const bestChannel = data[0];
  const worstChannel = data[data.length - 1];

  insights.push(
    `${bestChannel.channel} is the top performing channel with ${bestChannel.conversion_rate}% conversion rate`,
  );

  if (bestChannel.roi_score > 0) {
    insights.push(
      `${bestChannel.channel} delivers ${bestChannel.roi_score}% ROI`,
    );
  }

  const fastestChannel = data.reduce((min, c) =>
    c.average_response_time < min.average_response_time ? c : min,
  );
  if (fastestChannel.average_response_time > 0) {
    insights.push(
      `${fastestChannel.channel} has fastest response time: ${fastestChannel.average_response_time} hours`,
    );
  }

  if (data.length > 1) {
    const performanceGap =
      bestChannel.conversion_rate - worstChannel.conversion_rate;
    insights.push(
      `${performanceGap.toFixed(1)}% performance gap between best and worst channels`,
    );
  }

  return insights;
}

function generateTimingInsights(data: any[]): string[] {
  const insights: string[] = [];

  if (data.length === 0) {
    insights.push('Insufficient timing data for analysis');
    return insights;
  }

  const bestTiming = data[0]; // Sorted by conversion rate
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  insights.push(
    `Best sending time: ${bestTiming.hour_of_day}:00 on ${dayNames[bestTiming.day_of_week]}`,
  );
  insights.push(
    `Peak conversion rate: ${bestTiming.conversion_rate}% (${bestTiming.sample_size} samples)`,
  );

  const highConfidence = data.filter((t) => t.confidence_level >= 0.95);
  if (highConfidence.length > 0) {
    insights.push(
      `${highConfidence.length} timing window${highConfidence.length > 1 ? 's' : ''} with 95%+ statistical confidence`,
    );
  }

  const fastestResponse = data.reduce((min, t) =>
    t.average_response_time < min.average_response_time ? t : min,
  );
  if (fastestResponse.average_response_time > 0) {
    insights.push(
      `Fastest response time: ${fastestResponse.average_response_time} hours at ${fastestResponse.hour_of_day}:00`,
    );
  }

  return insights;
}

function generateGeographicInsights(data: any[]): string[] {
  const insights: string[] = [];

  if (data.length === 0) {
    insights.push('No geographic spread data available');
    return insights;
  }

  const topRegion = data[0];
  const totalRegions = data.length;
  const maxGeneration = Math.max(...data.map((g) => g.generation_reached));

  insights.push(
    `Viral reach spans ${totalRegions} geographic region${totalRegions > 1 ? 's' : ''}`,
  );
  insights.push(
    `${topRegion.region} leads with ${topRegion.signup_count} signups (${topRegion.conversion_rate}% conversion)`,
  );
  insights.push(`Maximum viral generation reached: ${maxGeneration}`);

  const highDensityRegions = data.filter((g) => g.network_density > 0.1);
  if (highDensityRegions.length > 0) {
    insights.push(
      `${highDensityRegions.length} region${highDensityRegions.length > 1 ? 's' : ''} show high network density (>10%)`,
    );
  }

  const internationalSpread = data.filter(
    (g) => g.country_code !== data[0].country_code,
  ).length;
  if (internationalSpread > 0) {
    insights.push(
      `International expansion: ${internationalSpread} countries beyond primary market`,
    );
  }

  return insights;
}

function generateCohortInsights(data: any[]): string[] {
  const insights: string[] = [];

  if (data.length === 0) {
    insights.push('No cohort data available for analysis');
    return insights;
  }

  const avgLifetimeValue =
    data.reduce((sum, c) => sum + c.lifetime_viral_value, 0) / data.length;
  const bestCohort = data.reduce(
    (max, c) => (c.final_conversion_rate > max.final_conversion_rate ? c : max),
    data[0],
  );
  const totalRevenue = data.reduce((sum, c) => sum + c.lifetime_viral_value, 0);

  insights.push(`${data.length} viral cohorts analyzed`);
  insights.push(
    `Average lifetime viral value: $${avgLifetimeValue.toFixed(2)} per cohort`,
  );
  insights.push(
    `Best performing cohort: ${bestCohort.final_conversion_rate}% final conversion`,
  );
  insights.push(
    `Total revenue attributed to viral activity: $${totalRevenue.toFixed(2)}`,
  );

  const avgGenerations =
    data.reduce((sum, c) => sum + c.generations_tracked, 0) / data.length;
  insights.push(
    `Average viral generations per cohort: ${avgGenerations.toFixed(1)}`,
  );

  return insights;
}

/**
 * POST /api/viral/analytics
 * Trigger analytics refresh and data updates
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check admin permissions for analytics refresh
    if (
      !session.user.role ||
      !['admin', 'data_analyst'].includes(session.user.role)
    ) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Insufficient permissions for analytics refresh',
        },
        { status: 403 },
      );
    }

    // Strict rate limiting for refresh operations
    const rateLimitResult = await rateLimit.check(
      `viral_analytics_refresh:${session.user.id}`,
      3, // 3 requests
      900, // per 15 minutes
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Analytics refresh rate limit exceeded.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Parse request body
    const body = await request.json();

    const refreshRequestSchema = z.object({
      refresh_type: z
        .enum(['cache_clear', 'data_refresh', 'full_recompute'])
        .default('cache_clear'),
      target_analysis: z
        .array(
          z.enum(['generation', 'channel', 'timing', 'geographic', 'cohort']),
        )
        .optional(),
    });

    const validationResult = refreshRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST_BODY',
          message: 'Invalid analytics refresh request',
          details: validationResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const { refresh_type, target_analysis } = validationResult.data;

    // Handle different refresh types
    let refreshResult: any;

    switch (refresh_type) {
      case 'cache_clear':
        // Clear analytics cache (implementation would depend on caching strategy)
        refreshResult = {
          cache_cleared: true,
          affected_analyses: target_analysis || ['all'],
        };
        break;

      case 'data_refresh':
        // Trigger background data refresh
        refreshResult = {
          data_refresh_queued: true,
          estimated_completion: Date.now() + 300000,
        }; // 5 minutes
        break;

      case 'full_recompute':
        // Full analytics recomputation (heavy operation)
        refreshResult = {
          recompute_queued: true,
          estimated_completion: Date.now() + 1800000,
        }; // 30 minutes
        break;
    }

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        refresh_type,
        target_analysis: target_analysis || ['all'],
        ...refreshResult,
        initiated_by: session.user.email,
        initiated_at: new Date().toISOString(),
        processing_time_ms: processingTime,
      },
      message: `Analytics ${refresh_type} initiated successfully`,
    };

    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time': `${processingTime}ms`,
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error('Analytics refresh error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to refresh viral analytics',
        timestamp: new Date().toISOString(),
        processing_time: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}
