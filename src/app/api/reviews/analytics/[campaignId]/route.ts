import { NextRequest, NextResponse } from 'next/server';
import { createSecureRoute, SecurityPresets } from '@/lib/middleware/security';
import { ReviewEngine } from '@/lib/reviews/review-engine';
import { z } from 'zod';

const paramsSchema = z.object({
  campaignId: z.string().uuid(),
});

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  include_reviews: z.enum(['true', 'false']).default('false'),
});

/**
 * GET /api/reviews/analytics/[campaignId] - Get campaign analytics
 */
export const GET = createSecureRoute(
  {
    ...SecurityPresets.SUPPLIER,
    validateParams: paramsSchema,
    validateQuery: querySchema,
  },
  async (req, context) => {
    const reviewEngine = new ReviewEngine();
    const { campaignId } = (req as any).validatedData.params;
    const { period, include_reviews } = (req as any).validatedData.query;

    try {
      // Get campaign analytics
      const analytics = await reviewEngine.getCampaignAnalytics(campaignId);

      // Verify supplier ownership
      if (analytics.campaign.supplier_id !== req.supplierId) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 },
        );
      }

      // Calculate date range based on period
      const now = new Date();
      const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      };

      const startDate = new Date();
      startDate.setDate(now.getDate() - periodDays[period]);

      // Get time-series data for the period
      const { data: timeseriesData, error: timeseriesError } =
        await reviewEngine.supabase
          .from('review_requests')
          .select(
            `
          created_at,
          status,
          sent_at,
          opened_at,
          completed_at
        `,
          )
          .eq('campaign_id', campaignId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

      if (timeseriesError) {
        console.error('Failed to fetch timeseries data:', timeseriesError);
      }

      // Aggregate daily stats
      const dailyStats: Record<string, any> = {};
      timeseriesData?.forEach((request) => {
        const date = request.created_at.split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            requests_created: 0,
            requests_sent: 0,
            requests_opened: 0,
            requests_completed: 0,
          };
        }

        dailyStats[date].requests_created++;
        if (request.sent_at) dailyStats[date].requests_sent++;
        if (request.opened_at) dailyStats[date].requests_opened++;
        if (request.completed_at) dailyStats[date].requests_completed++;
      });

      const response: any = {
        campaign: {
          id: analytics.campaign.id,
          name: analytics.campaign.name,
          is_active: analytics.campaign.is_active,
          created_at: analytics.campaign.created_at,
        },
        stats: analytics.stats,
        daily_stats: Object.values(dailyStats),
        period: {
          start_date: startDate.toISOString(),
          end_date: now.toISOString(),
          period,
        },
      };

      // Include recent reviews if requested
      if (include_reviews === 'true') {
        const { data: recentReviews, error: reviewsError } =
          await reviewEngine.supabase
            .from('collected_reviews')
            .select(
              `
            id,
            platform,
            rating,
            review_text,
            reviewer_name,
            published_at,
            created_at,
            requests:review_requests!inner(campaign_id)
          `,
            )
            .eq('requests.campaign_id', campaignId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(20);

        if (reviewsError) {
          console.error('Failed to fetch recent reviews:', reviewsError);
        } else {
          response.recent_reviews =
            recentReviews?.map((review) => ({
              id: review.id,
              platform: review.platform,
              rating: review.rating,
              content:
                review.review_text?.substring(0, 200) +
                (review.review_text?.length > 200 ? '...' : ''),
              reviewer_name: review.reviewer_name,
              created_at: review.created_at,
            })) || [];
        }
      }

      return NextResponse.json(response);
    } catch (error) {
      console.error('Failed to fetch campaign analytics:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch campaign analytics' },
        { status: 500 },
      );
    }
  },
);
