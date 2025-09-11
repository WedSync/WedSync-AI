import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ratelimit } from '@/lib/rate-limiter';

const analyticsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  metrics: z
    .array(
      z.enum([
        'engagement',
        'activity',
        'communication',
        'revenue',
        'satisfaction',
        'milestones',
        'performance',
      ]),
    )
    .default(['engagement', 'activity', 'communication']),
  privacy_level: z.enum(['full', 'aggregated', 'anonymized']).default('full'),
});

interface ClientMetrics {
  client_id: string;
  supplier_id: string;
  timeframe: string;
  engagement_score: number;
  activity_level: string;
  communication_frequency: number;
  satisfaction_rating: number;
  milestone_progress: number;
  revenue_contribution: number;
  last_activity: string;
  total_interactions: number;
  response_rate: number;
  conversion_events: number;
}

function getTimeframeFilter(timeframe: string): string {
  const now = new Date();
  switch (timeframe) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case '30d':
      return new Date(now.setDate(now.getDate() - 30)).toISOString();
    case '90d':
      return new Date(now.setDate(now.getDate() - 90)).toISOString();
    case '1y':
      return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    default:
      return new Date(now.setDate(now.getDate() - 30)).toISOString();
  }
}

async function getClientEngagementMetrics(
  supabase: any,
  clientId: string | null,
  supplierId: string | null,
  timeframe: string,
  privacyLevel: string,
): Promise<any> {
  const timeFilter = getTimeframeFilter(timeframe);

  let query = supabase
    .from('client_engagement_events')
    .select(
      `
      client_id,
      supplier_id,
      event_type,
      event_data,
      created_at,
      session_id,
      clients!inner(name, email, created_at),
      organizations!inner(id, name)
    `,
    )
    .gte('created_at', timeFilter)
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error('Engagement metrics error:', error);
    return { engagement_score: 0, activity_level: 'low', total_events: 0 };
  }

  if (!events || events.length === 0) {
    return { engagement_score: 0, activity_level: 'low', total_events: 0 };
  }

  // Calculate engagement score based on event types and frequency
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

  const totalScore = events.reduce((score, event) => {
    const weight =
      eventWeights[event.event_type as keyof typeof eventWeights] || 1;
    return score + weight;
  }, 0);

  const engagementScore = Math.min(100, (totalScore / events.length) * 10);

  // Determine activity level
  const activityLevel =
    engagementScore > 70 ? 'high' : engagementScore > 40 ? 'medium' : 'low';

  // Group events by client for aggregated view
  const clientMetrics = events.reduce((acc: any, event) => {
    const key = privacyLevel === 'anonymized' ? 'anonymous' : event.client_id;

    if (!acc[key]) {
      acc[key] = {
        client_id: privacyLevel === 'anonymized' ? null : event.client_id,
        client_name:
          privacyLevel === 'anonymized' ? 'Anonymous' : event.clients?.name,
        supplier_id: event.supplier_id,
        events: [],
        total_score: 0,
        last_activity: event.created_at,
        unique_sessions: new Set(),
      };
    }

    acc[key].events.push({
      type: event.event_type,
      timestamp: event.created_at,
      score: eventWeights[event.event_type as keyof typeof eventWeights] || 1,
    });

    acc[key].total_score +=
      eventWeights[event.event_type as keyof typeof eventWeights] || 1;

    if (event.session_id) {
      acc[key].unique_sessions.add(event.session_id);
    }

    return acc;
  }, {});

  // Convert to array and calculate final metrics
  const clientAnalytics = Object.values(clientMetrics).map((client: any) => ({
    client_id: client.client_id,
    client_name: client.client_name,
    supplier_id: client.supplier_id,
    engagement_score: Math.min(
      100,
      (client.total_score / client.events.length) * 10,
    ),
    activity_level:
      client.total_score > 70
        ? 'high'
        : client.total_score > 40
          ? 'medium'
          : 'low',
    total_events: client.events.length,
    unique_sessions: client.unique_sessions.size,
    last_activity: client.last_activity,
    event_breakdown: client.events.reduce((breakdown: any, event: any) => {
      breakdown[event.type] = (breakdown[event.type] || 0) + 1;
      return breakdown;
    }, {}),
  }));

  return {
    overall_engagement_score: engagementScore,
    overall_activity_level: activityLevel,
    total_events: events.length,
    unique_clients: Object.keys(clientMetrics).length,
    client_analytics: clientAnalytics,
    timeframe_summary: {
      start_date: timeFilter,
      end_date: new Date().toISOString(),
      days:
        timeframe === '7d'
          ? 7
          : timeframe === '30d'
            ? 30
            : timeframe === '90d'
              ? 90
              : 365,
    },
  };
}

async function getCommunicationMetrics(
  supabase: any,
  clientId: string | null,
  supplierId: string | null,
  timeframe: string,
  privacyLevel: string,
): Promise<any> {
  const timeFilter = getTimeframeFilter(timeframe);

  // Get communication data from multiple sources
  const communicationPromises = [
    // Email communications
    supabase
      .from('email_communications')
      .select('*')
      .gte('created_at', timeFilter)
      .apply((query) => {
        if (clientId) query = query.eq('client_id', clientId);
        if (supplierId) query = query.eq('supplier_id', supplierId);
        return query;
      }),

    // SMS communications
    supabase
      .from('sms_communications')
      .select('*')
      .gte('created_at', timeFilter)
      .apply((query) => {
        if (clientId) query = query.eq('client_id', clientId);
        if (supplierId) query = query.eq('supplier_id', supplierId);
        return query;
      }),

    // Direct messages
    supabase
      .from('direct_messages')
      .select('*')
      .gte('created_at', timeFilter)
      .apply((query) => {
        if (clientId) query = query.eq('client_id', clientId);
        if (supplierId) query = query.eq('supplier_id', supplierId);
        return query;
      }),
  ];

  const [emailResult, smsResult, messageResult] = await Promise.all(
    communicationPromises,
  );

  const emails = emailResult.data || [];
  const sms = smsResult.data || [];
  const messages = messageResult.data || [];

  const totalCommunications = emails.length + sms.length + messages.length;

  // Calculate response rates
  const emailResponseRate =
    emails.length > 0
      ? (emails.filter((e) => e.response_received).length / emails.length) * 100
      : 0;

  const overallResponseRate =
    totalCommunications > 0
      ? ((emails.filter((e) => e.response_received).length +
          sms.filter((s) => s.response_received).length +
          messages.filter((m) => m.response_received).length) /
          totalCommunications) *
        100
      : 0;

  // Privacy-compliant data return
  if (privacyLevel === 'anonymized') {
    return {
      total_communications: totalCommunications,
      average_response_rate: overallResponseRate,
      communication_frequency:
        totalCommunications /
        (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90),
      channels_used: ['email', 'sms', 'direct'].filter(
        (channel) =>
          (channel === 'email' && emails.length > 0) ||
          (channel === 'sms' && sms.length > 0) ||
          (channel === 'direct' && messages.length > 0),
      ),
    };
  }

  return {
    total_communications: totalCommunications,
    email_communications: emails.length,
    sms_communications: sms.length,
    direct_messages: messages.length,
    email_response_rate: emailResponseRate,
    overall_response_rate: overallResponseRate,
    communication_frequency:
      totalCommunications /
      (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90),
    recent_communications:
      privacyLevel === 'full'
        ? [...emails, ...sms, ...messages]
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .slice(0, 10)
            .map((comm) => ({
              id: comm.id,
              type: comm.type || 'email',
              subject: comm.subject || comm.message?.substring(0, 50),
              sent_at: comm.created_at,
              status: comm.status,
              response_received: comm.response_received,
            }))
        : [],
  };
}

async function getRevenueMetrics(
  supabase: any,
  clientId: string | null,
  supplierId: string | null,
  timeframe: string,
  privacyLevel: string,
): Promise<any> {
  const timeFilter = getTimeframeFilter(timeframe);

  let query = supabase
    .from('client_revenue_attribution')
    .select(
      `
      client_id,
      supplier_id,
      revenue_amount,
      revenue_type,
      transaction_date,
      journey_id,
      conversion_source
    `,
    )
    .gte('transaction_date', timeFilter);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data: revenueData, error } = await query;

  if (error) {
    console.error('Revenue metrics error:', error);
    return { total_revenue: 0, transactions: 0 };
  }

  if (!revenueData || revenueData.length === 0) {
    return { total_revenue: 0, transactions: 0, average_transaction_value: 0 };
  }

  const totalRevenue = revenueData.reduce(
    (sum, r) => sum + parseFloat(r.revenue_amount),
    0,
  );
  const averageTransactionValue = totalRevenue / revenueData.length;

  // Group by revenue type
  const revenueByType = revenueData.reduce((acc: any, r) => {
    acc[r.revenue_type] =
      (acc[r.revenue_type] || 0) + parseFloat(r.revenue_amount);
    return acc;
  }, {});

  if (privacyLevel === 'anonymized') {
    return {
      total_revenue: Math.round(totalRevenue / 100) * 100, // Round to nearest 100
      transactions: revenueData.length,
      average_transaction_value: Math.round(averageTransactionValue / 10) * 10, // Round to nearest 10
      revenue_categories: Object.keys(revenueByType).length,
    };
  }

  return {
    total_revenue: totalRevenue,
    transactions: revenueData.length,
    average_transaction_value: averageTransactionValue,
    revenue_by_type: revenueByType,
    recent_transactions:
      privacyLevel === 'full'
        ? revenueData
            .sort(
              (a, b) =>
                new Date(b.transaction_date).getTime() -
                new Date(a.transaction_date).getTime(),
            )
            .slice(0, 5)
            .map((r) => ({
              id: r.client_id + '_' + r.transaction_date,
              amount: r.revenue_amount,
              type: r.revenue_type,
              date: r.transaction_date,
              source: r.conversion_source,
            }))
        : [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = request.ip || 'unknown';

    // Rate limiting - 30 requests per minute for analytics
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `analytics_${ip}`,
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
      timeframe: searchParams.get('timeframe') || '30d',
      metrics: searchParams.get('metrics')?.split(',') || [
        'engagement',
        'activity',
        'communication',
      ],
      privacy_level: searchParams.get('privacy_level') || 'full',
    };

    const validatedParams = analyticsQuerySchema.parse(queryParams);

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

    // Verify user has access to requested data
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

    // Get analytics data based on requested metrics
    const analyticsData: any = {
      metadata: {
        client_id: validatedParams.client_id,
        supplier_id: validatedParams.supplier_id,
        timeframe: validatedParams.timeframe,
        privacy_level: validatedParams.privacy_level,
        generated_at: new Date().toISOString(),
        requested_metrics: validatedParams.metrics,
      },
    };

    // Fetch data for each requested metric in parallel
    const metricsPromises = [];

    if (validatedParams.metrics.includes('engagement')) {
      metricsPromises.push(
        getClientEngagementMetrics(
          supabase,
          validatedParams.client_id,
          validatedParams.supplier_id,
          validatedParams.timeframe,
          validatedParams.privacy_level,
        ).then((data) => ({ engagement: data })),
      );
    }

    if (validatedParams.metrics.includes('communication')) {
      metricsPromises.push(
        getCommunicationMetrics(
          supabase,
          validatedParams.client_id,
          validatedParams.supplier_id,
          validatedParams.timeframe,
          validatedParams.privacy_level,
        ).then((data) => ({ communication: data })),
      );
    }

    if (validatedParams.metrics.includes('revenue')) {
      metricsPromises.push(
        getRevenueMetrics(
          supabase,
          validatedParams.client_id,
          validatedParams.supplier_id,
          validatedParams.timeframe,
          validatedParams.privacy_level,
        ).then((data) => ({ revenue: data })),
      );
    }

    // Wait for all metrics to complete
    const metricsResults = await Promise.all(metricsPromises);

    // Merge all metrics into the response
    metricsResults.forEach((result) => {
      Object.assign(analyticsData, result);
    });

    // Add cache headers for performance
    const cacheMaxAge = validatedParams.timeframe === '7d' ? 300 : 900; // 5-15 minutes

    return NextResponse.json(analyticsData, {
      headers: {
        'Cache-Control': `public, max-age=${cacheMaxAge}, stale-while-revalidate=1800`,
        'X-Analytics-Version': '1.0',
        'X-Privacy-Level': validatedParams.privacy_level,
        'X-Generated-At': new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Client analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate analytics data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// POST endpoint for bulk analytics requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.ip || 'unknown';

    // Rate limiting for bulk requests
    const { success } = await ratelimit.limit(`bulk_analytics_${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for bulk requests' },
        { status: 429 },
      );
    }

    const bulkRequestSchema = z.object({
      requests: z.array(analyticsQuerySchema).max(10), // Max 10 bulk requests
      callback_url: z.string().url().optional(),
    });

    const { requests, callback_url } = bulkRequestSchema.parse(body);

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process bulk requests
    const results = [];
    const errors = [];

    for (const requestParams of requests) {
      try {
        // Verify access for each request
        if (requestParams.supplier_id) {
          const { data: orgAccess } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('organization_id', requestParams.supplier_id)
            .single();

          if (!orgAccess) {
            errors.push({
              request: requestParams,
              error: 'Forbidden - No access to supplier data',
            });
            continue;
          }
        }

        // Get analytics for this request
        const analyticsData: any = {
          metadata: {
            ...requestParams,
            generated_at: new Date().toISOString(),
          },
        };

        // Fetch requested metrics
        if (requestParams.metrics.includes('engagement')) {
          const engagementData = await getClientEngagementMetrics(
            supabase,
            requestParams.client_id || null,
            requestParams.supplier_id || null,
            requestParams.timeframe,
            requestParams.privacy_level,
          );
          analyticsData.engagement = engagementData;
        }

        if (requestParams.metrics.includes('communication')) {
          const commData = await getCommunicationMetrics(
            supabase,
            requestParams.client_id || null,
            requestParams.supplier_id || null,
            requestParams.timeframe,
            requestParams.privacy_level,
          );
          analyticsData.communication = commData;
        }

        if (requestParams.metrics.includes('revenue')) {
          const revenueData = await getRevenueMetrics(
            supabase,
            requestParams.client_id || null,
            requestParams.supplier_id || null,
            requestParams.timeframe,
            requestParams.privacy_level,
          );
          analyticsData.revenue = revenueData;
        }

        results.push({
          request: requestParams,
          data: analyticsData,
          success: true,
        });
      } catch (error) {
        errors.push({
          request: requestParams,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Bulk client analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid bulk request format', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to process bulk analytics request' },
      { status: 500 },
    );
  }
}
