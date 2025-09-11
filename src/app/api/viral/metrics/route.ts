/**
 * Viral Metrics API - GET /api/viral/metrics
 * Calculates viral coefficient and provides optimization insights
 * SECURITY: Rate limited, authenticated, validated inputs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';

// Query parameter validation schema
const metricsQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  includeSegments: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
});

// Response type for viral metrics
interface ViralMetricsResponse {
  success: true;
  data: {
    viral_coefficient: number;
    trend_direction: 'up' | 'down' | 'stable';
    metrics: {
      total_invites_sent: number;
      total_invites_accepted: number;
      active_inviters: number;
      super_connectors: number;
    };
    time_series: Array<{
      date: string;
      coefficient: number;
      invites_sent: number;
      invites_accepted: number;
    }>;
    segments?: {
      by_user_type: Array<{ user_type: string; coefficient: number }>;
      by_channel: Array<{ channel: string; coefficient: number }>;
    };
    recommendations: string[];
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

    // Rate limiting for analytics endpoints
    const rateLimitResult = await rateLimit.check(
      `viral_metrics:${session.user.id}`,
      10, // 10 requests
      60, // per minute
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many requests. Analytics rate limit exceeded.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validationResult = metricsQuerySchema.safeParse(queryParams);
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

    const { timeframe, granularity, includeSegments } = validationResult.data;

    // Calculate timeframe in SQL format
    const timeframeMap = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year',
    };

    // Core viral coefficient calculation query
    const viralMetricsQuery = `
      WITH user_invites AS (
        SELECT 
          sender_id,
          channel,
          user_type,
          DATE_TRUNC('${granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : 'month'}', created_at) as period,
          COUNT(*) as invites_sent,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as invites_accepted
        FROM viral_invitations 
        WHERE created_at >= NOW() - INTERVAL '${timeframeMap[timeframe]}'
        GROUP BY sender_id, channel, user_type, period
      ),
      period_metrics AS (
        SELECT 
          period,
          COUNT(DISTINCT sender_id) as active_inviters,
          SUM(invites_sent) as total_invites_sent,
          SUM(invites_accepted) as total_invites_accepted,
          COALESCE(
            CASE 
              WHEN COUNT(DISTINCT sender_id) > 0 
              THEN ROUND((SUM(invites_accepted)::decimal / COUNT(DISTINCT sender_id)), 2)
              ELSE 0 
            END, 0
          ) as viral_coefficient
        FROM user_invites
        GROUP BY period
      ),
      overall_metrics AS (
        SELECT 
          COUNT(DISTINCT sender_id) as total_active_inviters,
          SUM(invites_sent) as total_invites_sent,
          SUM(invites_accepted) as total_invites_accepted,
          COALESCE(
            CASE 
              WHEN COUNT(DISTINCT sender_id) > 0 
              THEN ROUND((SUM(invites_accepted)::decimal / COUNT(DISTINCT sender_id)), 2)
              ELSE 0 
            END, 0
          ) as overall_viral_coefficient
        FROM user_invites
      ),
      super_connectors AS (
        SELECT COUNT(*) as super_connector_count
        FROM user_invites 
        WHERE invites_accepted >= 5
      )
      SELECT 
        om.overall_viral_coefficient as viral_coefficient,
        om.total_active_inviters as active_inviters,
        om.total_invites_sent,
        om.total_invites_accepted,
        sc.super_connector_count as super_connectors,
        (
          SELECT json_agg(
            json_build_object(
              'date', period::date,
              'coefficient', viral_coefficient,
              'invites_sent', total_invites_sent,
              'invites_accepted', total_invites_accepted
            ) ORDER BY period
          )
          FROM period_metrics
        ) as time_series
      FROM overall_metrics om, super_connectors sc;
    `;

    // Execute the main metrics query using PostgreSQL MCP
    const metricsResult = await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: viralMetricsQuery }),
    }).then((res) => res.json());

    if (!metricsResult.rows || metricsResult.rows.length === 0) {
      // Return empty metrics structure if no data
      const response: ViralMetricsResponse = {
        success: true,
        data: {
          viral_coefficient: 0,
          trend_direction: 'stable',
          metrics: {
            total_invites_sent: 0,
            total_invites_accepted: 0,
            active_inviters: 0,
            super_connectors: 0,
          },
          time_series: [],
          recommendations: [
            'Start inviting past clients to boost your viral coefficient',
            'Focus on personalized invitations for better acceptance rates',
            'Enable multi-channel invitations (email, SMS, WhatsApp)',
          ],
        },
        computed_at: new Date().toISOString(),
        cache_ttl: 300, // 5 minutes
      };

      return NextResponse.json(response);
    }

    const data = metricsResult.rows[0];

    // Calculate trend direction from time series
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (data.time_series && data.time_series.length >= 2) {
      const recent = data.time_series[data.time_series.length - 1];
      const previous = data.time_series[data.time_series.length - 2];
      if (recent.coefficient > previous.coefficient * 1.05) {
        trendDirection = 'up';
      } else if (recent.coefficient < previous.coefficient * 0.95) {
        trendDirection = 'down';
      }
    }

    // Generate recommendations based on metrics
    const recommendations: string[] = [];
    if (data.viral_coefficient < 1.0) {
      recommendations.push(
        'Viral coefficient below 1.0 - focus on improving invitation acceptance rates',
      );
    }
    if (data.super_connectors < 5) {
      recommendations.push(
        'Identify and nurture super-connectors (users who successfully invite 5+ people)',
      );
    }
    if (
      data.total_invites_sent > 0 &&
      data.total_invites_accepted / data.total_invites_sent < 0.2
    ) {
      recommendations.push(
        'Low acceptance rate - improve invitation personalization and timing',
      );
    }
    if (trendDirection === 'down') {
      recommendations.push(
        'Declining trend detected - consider A/B testing new invitation templates',
      );
    }

    // Fetch segment data if requested
    let segments;
    if (includeSegments) {
      const segmentQuery = `
        WITH user_type_segments AS (
          SELECT 
            user_type,
            COUNT(DISTINCT sender_id) as active_inviters,
            COUNT(*) as invites_sent,
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as invites_accepted
          FROM viral_invitations 
          WHERE created_at >= NOW() - INTERVAL '${timeframeMap[timeframe]}'
          GROUP BY user_type
        ),
        channel_segments AS (
          SELECT 
            channel,
            COUNT(DISTINCT sender_id) as active_inviters,
            COUNT(*) as invites_sent,
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as invites_accepted
          FROM viral_invitations 
          WHERE created_at >= NOW() - INTERVAL '${timeframeMap[timeframe]}'
          GROUP BY channel
        )
        SELECT 
          'user_type' as segment_type,
          json_agg(
            json_build_object(
              'user_type', user_type,
              'coefficient', ROUND((invites_accepted::decimal / GREATEST(active_inviters, 1)), 2)
            )
          ) as segments
        FROM user_type_segments
        UNION ALL
        SELECT 
          'channel' as segment_type,
          json_agg(
            json_build_object(
              'channel', channel,
              'coefficient', ROUND((invites_accepted::decimal / GREATEST(active_inviters, 1)), 2)
            )
          ) as segments
        FROM channel_segments
      `;

      const segmentResult = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: segmentQuery }),
      }).then((res) => res.json());

      segments = {
        by_user_type:
          segmentResult.rows.find((r) => r.segment_type === 'user_type')
            ?.segments || [],
        by_channel:
          segmentResult.rows.find((r) => r.segment_type === 'channel')
            ?.segments || [],
      };
    }

    // Performance requirement: under 500ms
    const processingTime = Date.now() - startTime;
    if (processingTime > 450) {
      console.warn(
        `Viral metrics query took ${processingTime}ms - approaching 500ms limit`,
      );
    }

    const response: ViralMetricsResponse = {
      success: true,
      data: {
        viral_coefficient: parseFloat(data.viral_coefficient) || 0,
        trend_direction: trendDirection,
        metrics: {
          total_invites_sent: parseInt(data.total_invites_sent) || 0,
          total_invites_accepted: parseInt(data.total_invites_accepted) || 0,
          active_inviters: parseInt(data.active_inviters) || 0,
          super_connectors: parseInt(data.super_connectors) || 0,
        },
        time_series: data.time_series || [],
        ...(includeSegments && { segments }),
        recommendations:
          recommendations.length > 0
            ? recommendations
            : [
                'Viral coefficient looks healthy - keep optimizing invitation personalization',
                'Monitor super-connectors and provide them with premium features',
                'Test different invitation channels for optimal performance',
              ],
      },
      computed_at: new Date().toISOString(),
      cache_ttl: 300, // 5 minutes cache
    };

    // Add performance headers
    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time': `${processingTime}ms`,
        'Cache-Control': 'private, max-age=300', // 5 minute cache
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error('Viral metrics API error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate viral metrics',
        timestamp: new Date().toISOString(),
        processing_time: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}
