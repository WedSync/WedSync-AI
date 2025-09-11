import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { engagementScoringService } from '@/lib/analytics/engagement-scoring';
import { z } from 'zod';

const querySchema = z.object({
  supplier_id: z.string().uuid(),
  time_range: z.enum(['7d', '30d', '90d']).default('30d'),
  include_trends: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      supplier_id: searchParams.get('supplier_id'),
      time_range: searchParams.get('time_range'),
      include_trends: searchParams.get('include_trends') !== 'false',
    });

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dashboard data
    const dashboardData = await engagementScoringService.getAnalyticsDashboard(
      params.supplier_id,
    );

    if (!dashboardData) {
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 },
      );
    }

    // Get engagement trends if requested
    let engagementTrends = [];
    if (params.include_trends) {
      const daysBack =
        params.time_range === '7d' ? 7 : params.time_range === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: trendsData, error: trendsError } = await supabase
        .from('client_engagement_events')
        .select(
          `
          created_at,
          client_engagement_scores!inner(score)
        `,
        )
        .eq('supplier_id', params.supplier_id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (!trendsError && trendsData) {
        // Group by date and calculate average scores
        const trendsMap = new Map<
          string,
          { total_score: number; count: number; events: number }
        >();

        trendsData.forEach((item) => {
          const date = item.created_at.split('T')[0]; // Get date part only
          const current = trendsMap.get(date) || {
            total_score: 0,
            count: 0,
            events: 0,
          };

          current.events += 1;
          if (item.client_engagement_scores?.score) {
            current.total_score += item.client_engagement_scores.score;
            current.count += 1;
          }

          trendsMap.set(date, current);
        });

        engagementTrends = Array.from(trendsMap.entries()).map(
          ([date, data]) => ({
            date,
            average_score:
              data.count > 0 ? Math.round(data.total_score / data.count) : 0,
            total_events: data.events,
          }),
        );
      }
    }

    const responseData = {
      ...dashboardData,
      engagement_trends: engagementTrends,
      query_params: params,
    };

    return NextResponse.json({
      data: responseData,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Engagement dashboard API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch engagement dashboard data' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, supplier_id } = body;

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'refresh_scores') {
      // Trigger engagement score refresh for all clients of this supplier
      const result =
        await engagementScoringService.refreshAllEngagementScores();

      return NextResponse.json({
        success: true,
        message: 'Engagement scores refreshed',
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Engagement dashboard POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
