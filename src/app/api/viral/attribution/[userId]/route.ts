/**
 * User Attribution Chain API - GET /api/viral/attribution/[userId]
 * Get user's complete viral attribution chain and referral performance
 * SECURITY: User can only access their own attribution data or admin override
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { uuidSchema } from '@/lib/validation/schemas';

// Path parameter validation
const userIdParamSchema = uuidSchema;

// Query parameter validation
const attributionQuerySchema = z.object({
  include_descendants: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  max_depth: z.coerce.number().int().min(1).max(10).default(5),
  include_metrics: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).default('all'),
});

interface UserAttributionResponse {
  success: true;
  data: {
    user_info: {
      id: string;
      name: string;
      user_type: string;
      joined_at: string;
    };
    attribution_chain: {
      ancestors: Array<{
        user_id: string;
        name: string;
        user_type: string;
        level: number;
        conversion_type: string;
        attributed_at: string;
        conversion_value: number;
      }>;
      descendants?: Array<{
        user_id: string;
        name: string;
        user_type: string;
        level: number;
        conversion_type: string;
        attributed_at: string;
        conversion_value: number;
        total_sub_referrals: number;
      }>;
    };
    performance_metrics?: {
      total_referrals: number;
      successful_conversions: number;
      total_attributed_value: number;
      average_conversion_rate: number;
      best_performing_channel: string;
      viral_coefficient: number;
      super_connector_status: boolean;
      rewards_earned: {
        total_earned: number;
        last_30_days: number;
        pending_payout: number;
      };
    };
    network_insights: {
      network_size: number;
      max_chain_depth: number;
      most_valuable_referral: {
        user_name: string;
        conversion_value: number;
        attributed_at: string;
      } | null;
    };
  };
  computed_at: string;
  cache_ttl: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const startTime = Date.now();

  try {
    // Validate userId parameter
    const userIdValidation = userIdParamSchema.safeParse(params.userId);
    if (!userIdValidation.success) {
      return NextResponse.json(
        {
          error: 'INVALID_USER_ID',
          message: 'Invalid user ID format',
          details: userIdValidation.error.errors.map((e) => e.message),
        },
        { status: 400 },
      );
    }

    const requestedUserId = userIdValidation.data;

    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Authorization check - users can only view their own attribution data
    // (unless they're admin)
    const isOwnData = session.user.id === requestedUserId;
    const isAdmin = session.user.role === 'admin'; // Assuming role field exists

    if (!isOwnData && !isAdmin) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'You can only access your own attribution data',
        },
        { status: 403 },
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit.check(
      `attribution_view:${session.user.id}`,
      30, // 30 requests
      60, // per minute
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many attribution queries. Please wait.',
          retry_after: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const queryValidation = attributionQuerySchema.safeParse(queryParams);

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'INVALID_QUERY_PARAMETERS',
          message: 'Invalid query parameters',
          details: queryValidation.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          ),
        },
        { status: 400 },
      );
    }

    const { include_descendants, max_depth, include_metrics, timeframe } =
      queryValidation.data;

    // Build timeframe condition
    const timeframeCondition =
      timeframe !== 'all'
        ? `AND created_at >= NOW() - INTERVAL '${timeframe.replace('d', ' days').replace('y', ' year')}'`
        : '';

    // Get user information
    const userInfoQuery = `
      SELECT id, name, user_type, created_at as joined_at
      FROM users 
      WHERE id = $1
    `;

    const userInfoResult = await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userInfoQuery,
        params: [requestedUserId],
      }),
    }).then((res) => res.json());

    if (!userInfoResult.rows || userInfoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 },
      );
    }

    const userInfo = userInfoResult.rows[0];

    // Get attribution chain (ancestors)
    const ancestorChainQuery = `
      WITH RECURSIVE attribution_ancestors AS (
        -- Base case: start with the requested user
        SELECT 
          va.user_id,
          va.referrer_id,
          va.conversion_type,
          va.conversion_value,
          va.created_at as attributed_at,
          1 as level,
          u.name,
          u.user_type
        FROM viral_attributions va
        JOIN users u ON va.referrer_id = u.id
        WHERE va.user_id = $1 ${timeframeCondition}
        
        UNION ALL
        
        -- Recursive case: follow the chain up
        SELECT 
          va.user_id,
          va.referrer_id,
          va.conversion_type,
          va.conversion_value,
          va.created_at,
          aa.level + 1,
          u.name,
          u.user_type
        FROM viral_attributions va
        JOIN attribution_ancestors aa ON va.user_id = aa.referrer_id
        JOIN users u ON va.referrer_id = u.id
        WHERE aa.level < $2 ${timeframeCondition}
      )
      SELECT 
        referrer_id as user_id,
        name,
        user_type,
        level,
        conversion_type,
        attributed_at::text,
        conversion_value
      FROM attribution_ancestors
      ORDER BY level DESC;
    `;

    const ancestorResult = await fetch('/api/internal/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ancestorChainQuery,
        params: [requestedUserId, max_depth],
      }),
    }).then((res) => res.json());

    const ancestors = ancestorResult.rows || [];

    // Get descendants if requested
    let descendants = [];
    if (include_descendants) {
      const descendantChainQuery = `
        WITH RECURSIVE attribution_descendants AS (
          -- Base case: direct referrals
          SELECT 
            va.user_id,
            va.conversion_type,
            va.conversion_value,
            va.created_at as attributed_at,
            1 as level,
            u.name,
            u.user_type
          FROM viral_attributions va
          JOIN users u ON va.user_id = u.id
          WHERE va.referrer_id = $1 ${timeframeCondition}
          
          UNION ALL
          
          -- Recursive case: follow the chain down
          SELECT 
            va.user_id,
            va.conversion_type,
            va.conversion_value,
            va.created_at,
            ad.level + 1,
            u.name,
            u.user_type
          FROM viral_attributions va
          JOIN attribution_descendants ad ON va.referrer_id = ad.user_id
          JOIN users u ON va.user_id = u.id
          WHERE ad.level < $2 ${timeframeCondition}
        ),
        descendant_counts AS (
          SELECT 
            user_id,
            COUNT(*) as total_sub_referrals
          FROM attribution_descendants
          WHERE level > 1
          GROUP BY user_id
        )
        SELECT 
          ad.user_id,
          ad.name,
          ad.user_type,
          ad.level,
          ad.conversion_type,
          ad.attributed_at::text,
          ad.conversion_value,
          COALESCE(dc.total_sub_referrals, 0) as total_sub_referrals
        FROM attribution_descendants ad
        LEFT JOIN descendant_counts dc ON ad.user_id = dc.user_id
        ORDER BY level, attributed_at;
      `;

      const descendantResult = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: descendantChainQuery,
          params: [requestedUserId, max_depth],
        }),
      }).then((res) => res.json());

      descendants = descendantResult.rows || [];
    }

    // Get performance metrics if requested
    let performanceMetrics = null;
    if (include_metrics) {
      const metricsQuery = `
        WITH user_performance AS (
          SELECT 
            COUNT(*) as total_referrals,
            COUNT(CASE WHEN va2.user_id IS NOT NULL THEN 1 END) as successful_conversions,
            SUM(va.conversion_value) as total_attributed_value,
            AVG(CASE WHEN vi.status = 'accepted' THEN 1.0 ELSE 0.0 END) as avg_conversion_rate
          FROM viral_invitations vi
          LEFT JOIN viral_attributions va ON vi.id = va.invitation_id
          LEFT JOIN viral_attributions va2 ON vi.recipient_email = (SELECT email FROM users WHERE id = va2.user_id)
          WHERE vi.sender_id = $1 ${timeframeCondition.replace('created_at', 'vi.created_at')}
        ),
        channel_performance AS (
          SELECT 
            channel,
            COUNT(*) as channel_invites,
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as channel_accepted
          FROM viral_invitations 
          WHERE sender_id = $1 ${timeframeCondition.replace('created_at', 'created_at')}
          GROUP BY channel
          ORDER BY (COUNT(CASE WHEN status = 'accepted' THEN 1 END)::float / GREATEST(COUNT(*), 1)) DESC
          LIMIT 1
        ),
        rewards_info AS (
          SELECT 
            SUM(conversion_value * 0.3) as total_earned,
            SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN conversion_value * 0.3 ELSE 0 END) as last_30_days,
            SUM(CASE WHEN payout_status IS NULL OR payout_status = 'pending' THEN conversion_value * 0.3 ELSE 0 END) as pending_payout
          FROM viral_attributions
          WHERE referrer_id = $1 ${timeframeCondition}
        )
        SELECT 
          up.total_referrals,
          up.successful_conversions,
          up.total_attributed_value,
          up.avg_conversion_rate,
          cp.channel as best_channel,
          CASE 
            WHEN up.total_referrals > 0 THEN ROUND((up.successful_conversions::decimal / up.total_referrals), 2)
            ELSE 0 
          END as viral_coefficient,
          CASE WHEN up.successful_conversions >= 5 THEN true ELSE false END as super_connector_status,
          ri.total_earned,
          ri.last_30_days,
          ri.pending_payout
        FROM user_performance up
        CROSS JOIN channel_performance cp
        CROSS JOIN rewards_info ri
      `;

      const metricsResult = await fetch('/api/internal/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: metricsQuery,
          params: [requestedUserId],
        }),
      }).then((res) => res.json());

      if (metricsResult.rows && metricsResult.rows.length > 0) {
        const metrics = metricsResult.rows[0];
        performanceMetrics = {
          total_referrals: parseInt(metrics.total_referrals) || 0,
          successful_conversions: parseInt(metrics.successful_conversions) || 0,
          total_attributed_value:
            parseFloat(metrics.total_attributed_value) || 0,
          average_conversion_rate: parseFloat(metrics.avg_conversion_rate) || 0,
          best_performing_channel: metrics.best_channel || 'email',
          viral_coefficient: parseFloat(metrics.viral_coefficient) || 0,
          super_connector_status: metrics.super_connector_status || false,
          rewards_earned: {
            total_earned: parseFloat(metrics.total_earned) || 0,
            last_30_days: parseFloat(metrics.last_30_days) || 0,
            pending_payout: parseFloat(metrics.pending_payout) || 0,
          },
        };
      }
    }

    // Calculate network insights
    const networkSize = descendants.length + ancestors.length;
    const maxChainDepth = Math.max(
      descendants.length > 0 ? Math.max(...descendants.map((d) => d.level)) : 0,
      ancestors.length > 0 ? Math.max(...ancestors.map((a) => a.level)) : 0,
    );

    // Find most valuable referral
    const allReferrals = [...descendants, ...ancestors];
    const mostValuableReferral =
      allReferrals.length > 0
        ? allReferrals.reduce((max, current) =>
            current.conversion_value > (max?.conversion_value || 0)
              ? current
              : max,
          )
        : null;

    const networkInsights = {
      network_size: networkSize,
      max_chain_depth: maxChainDepth,
      most_valuable_referral: mostValuableReferral
        ? {
            user_name: mostValuableReferral.name,
            conversion_value: mostValuableReferral.conversion_value,
            attributed_at: mostValuableReferral.attributed_at,
          }
        : null,
    };

    // Performance requirement: complex queries under 1s
    const processingTime = Date.now() - startTime;
    if (processingTime > 900) {
      console.warn(
        `Attribution chain query took ${processingTime}ms - approaching 1s limit`,
      );
    }

    const response: UserAttributionResponse = {
      success: true,
      data: {
        user_info: {
          id: userInfo.id,
          name: userInfo.name,
          user_type: userInfo.user_type,
          joined_at: userInfo.joined_at,
        },
        attribution_chain: {
          ancestors,
          ...(include_descendants && { descendants }),
        },
        ...(include_metrics && { performance_metrics: performanceMetrics }),
        network_insights: networkInsights,
      },
      computed_at: new Date().toISOString(),
      cache_ttl: 300, // 5 minutes cache
    };

    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time': `${processingTime}ms`,
        'Cache-Control': 'private, max-age=300',
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error('Attribution chain API error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve attribution chain',
        timestamp: new Date().toISOString(),
        processing_time: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}
