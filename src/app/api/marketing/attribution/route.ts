import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { attributionTrackingService } from '@/lib/services/attribution-tracking-service';
import { rateLimitService } from '@/lib/ratelimit';

const attributionEventSchema = z.object({
  event_type: z.enum(['signup', 'conversion', 'payment', 'referral']),
  user_id: z.string().uuid(),
  referrer_id: z.string().uuid().optional(),
  conversion_value_cents: z.number().int().min(0).max(10000000), // $100k max
  attribution_source: z.enum([
    'viral_invitation',
    'campaign',
    'organic',
    'paid',
  ]),
  metadata: z.record(z.any()).optional(),
});

const funnelEventSchema = z.object({
  user_id: z.string().uuid(),
  stage: z.enum([
    'email_received',
    'email_opened',
    'link_clicked',
    'signup_started',
    'signup_completed',
    'first_payment',
  ]),
  converted: z.boolean().default(true),
});

/**
 * POST /api/marketing/attribution
 * Track attribution events in the viral chain
 */
export const POST = withSecureValidation(
  attributionEventSchema,
  async (request: NextRequest, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for attribution events
    const rateLimitResult = await rateLimitService.checkAttributionEvents(
      session.user.id,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Attribution event rate limit exceeded',
          retry_after: rateLimitResult.retry_after,
        },
        { status: 429 },
      );
    }

    try {
      const attributionId =
        await attributionTrackingService.trackAttributionEvent(validatedData);

      return NextResponse.json({
        success: true,
        attribution_id: attributionId,
      });
    } catch (error) {
      console.error('Attribution tracking API error:', error);
      return NextResponse.json(
        {
          error: 'Failed to track attribution event',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * GET /api/marketing/attribution
 * Get attribution analytics and metrics
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const analysisType = searchParams.get('type') || 'performance';
    const timeRange =
      (searchParams.get('time_range') as '7d' | '30d' | '90d' | 'all') || '30d';
    const userId = searchParams.get('user_id') || session.user.id;

    let response: any = {};

    switch (analysisType) {
      case 'performance':
        response.performance =
          await attributionTrackingService.getUserAttributionPerformance(
            userId,
          );
        break;

      case 'chain':
        response.viral_chain =
          await attributionTrackingService.calculateViralChainMetrics(userId);
        break;

      case 'revenue':
        response.revenue_attribution =
          await attributionTrackingService.getRevenueAttribution(
            userId,
            timeRange,
          );
        break;

      case 'funnel':
        response.conversion_funnel =
          await attributionTrackingService.getConversionFunnelAnalysis();
        break;

      case 'targets':
        const limit = parseInt(searchParams.get('limit') || '10');
        response.high_value_targets =
          await attributionTrackingService.identifyHighValueTargets(
            userId,
            limit,
          );
        break;

      case 'cohort':
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        if (startDate && endDate) {
          response.cohort_analysis =
            await attributionTrackingService.getCohortAttributionAnalysis(
              startDate,
              endDate,
            );
        } else {
          return NextResponse.json(
            {
              error: 'start_date and end_date are required for cohort analysis',
            },
            { status: 400 },
          );
        }
        break;

      default:
        // Default: return comprehensive attribution overview
        const [performance, chainMetrics, revenueAttribution] =
          await Promise.all([
            attributionTrackingService.getUserAttributionPerformance(userId),
            attributionTrackingService.calculateViralChainMetrics(userId),
            attributionTrackingService.getRevenueAttribution(userId, timeRange),
          ]);

        response = {
          performance,
          viral_chain: chainMetrics,
          revenue_attribution: revenueAttribution,
          time_range: timeRange,
        };
        break;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Attribution analytics API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/marketing/attribution/funnel
 * Track conversion funnel events
 */
export const PUT = withSecureValidation(
  funnelEventSchema,
  async (request: NextRequest, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { user_id, stage, converted } = validatedData;

      // Verify user has permission to track events for this user
      if (user_id !== session.user.id) {
        // Additional permission check could go here
        // For now, only allow tracking own events
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 },
        );
      }

      await attributionTrackingService.trackConversionFunnel(
        user_id,
        stage,
        converted,
      );

      return NextResponse.json({
        success: true,
        message: 'Funnel event tracked successfully',
      });
    } catch (error) {
      console.error('Funnel tracking API error:', error);
      return NextResponse.json(
        {
          error: 'Failed to track funnel event',
        },
        { status: 500 },
      );
    }
  },
);
