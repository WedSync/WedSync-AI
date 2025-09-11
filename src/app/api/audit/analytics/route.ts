import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const analyticsQuerySchema = z.object({
  wedding_id: z.string().uuid().optional(),
  date_range: z.enum(['24h', '7d', '30d', '90d', '1y']).default('7d'),
  group_by: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metric_type: z
    .enum(['events', 'risk_score', 'user_activity', 'resource_activity'])
    .default('events'),
  resource_type: z.string().optional(),
  include_risk_analysis: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Convert boolean strings
    if (queryParams.include_risk_analysis === 'true') {
      queryParams.include_risk_analysis = true;
    } else if (queryParams.include_risk_analysis === 'false') {
      queryParams.include_risk_analysis = false;
    }

    const query = analyticsQuerySchema.parse(queryParams);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (query.date_range) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Generate analytics based on metric type
    const analytics = await generateAuditAnalytics(
      query,
      startDate,
      endDate,
      supabase,
    );

    return NextResponse.json({
      analytics,
      query_parameters: query,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function generateAuditAnalytics(
  query: any,
  startDate: Date,
  endDate: Date,
  supabase: any,
) {
  const analytics: any = {};

  // Base query filters
  let baseQuery = `
    timestamp >= '${startDate.toISOString()}' AND 
    timestamp <= '${endDate.toISOString()}'
  `;

  if (query.wedding_id) {
    baseQuery += ` AND wedding_id = '${query.wedding_id}'`;
  }

  if (query.resource_type) {
    baseQuery += ` AND resource_type = '${query.resource_type}'`;
  }

  // Generate time series data
  analytics.time_series = await generateTimeSeries(query, baseQuery, supabase);

  // Event distribution by type
  analytics.event_distribution = await generateEventDistribution(
    baseQuery,
    supabase,
  );

  // Resource activity breakdown
  analytics.resource_activity = await generateResourceActivity(
    baseQuery,
    supabase,
  );

  // User activity analysis
  analytics.user_activity = await generateUserActivity(baseQuery, supabase);

  // Wedding-specific metrics
  if (query.wedding_id) {
    analytics.wedding_metrics = await generateWeddingMetrics(
      query.wedding_id,
      baseQuery,
      supabase,
    );
  }

  // Risk analysis
  if (query.include_risk_analysis) {
    analytics.risk_analysis = await generateRiskAnalysis(baseQuery, supabase);
  }

  // Summary statistics
  analytics.summary = await generateSummaryStats(baseQuery, supabase);

  return analytics;
}

async function generateTimeSeries(
  query: any,
  baseQuery: string,
  supabase: any,
) {
  let timeFormat = 'YYYY-MM-DD';
  let interval = '1 day';

  switch (query.group_by) {
    case 'hour':
      timeFormat = 'YYYY-MM-DD HH24';
      interval = '1 hour';
      break;
    case 'day':
      timeFormat = 'YYYY-MM-DD';
      interval = '1 day';
      break;
    case 'week':
      timeFormat = 'YYYY-WW';
      interval = '1 week';
      break;
    case 'month':
      timeFormat = 'YYYY-MM';
      interval = '1 month';
      break;
  }

  const { data, error } = await supabase.rpc('get_audit_time_series', {
    base_query: baseQuery,
    time_format: timeFormat,
    metric_type: query.metric_type,
  });

  if (error) {
    console.error('Time series query error:', error);
    return [];
  }

  return data || [];
}

async function generateEventDistribution(baseQuery: string, supabase: any) {
  const { data, error } = await supabase.rpc('get_audit_event_distribution', {
    base_query: baseQuery,
  });

  if (error) {
    console.error('Event distribution query error:', error);
    return {};
  }

  return data || {};
}

async function generateResourceActivity(baseQuery: string, supabase: any) {
  const { data, error } = await supabase.rpc('get_audit_resource_activity', {
    base_query: baseQuery,
  });

  if (error) {
    console.error('Resource activity query error:', error);
    return {};
  }

  return data || {};
}

async function generateUserActivity(baseQuery: string, supabase: any) {
  const { data, error } = await supabase.rpc('get_audit_user_activity', {
    base_query: baseQuery,
  });

  if (error) {
    console.error('User activity query error:', error);
    return {};
  }

  return data || {};
}

async function generateWeddingMetrics(
  weddingId: string,
  baseQuery: string,
  supabase: any,
) {
  // Wedding-specific audit metrics
  const metrics = {
    total_events: 0,
    critical_events: 0,
    vendor_interactions: 0,
    payment_events: 0,
    timeline_changes: 0,
    guest_modifications: 0,
    risk_score_trend: [],
  };

  // Get wedding context
  const { data: wedding } = await supabase
    .from('weddings')
    .select('*')
    .eq('id', weddingId)
    .single();

  if (!wedding) return metrics;

  // Total events for this wedding
  const { count: totalEvents } = await supabase
    .from('audit_logs_optimized')
    .select('*', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1]);

  metrics.total_events = totalEvents || 0;

  // Critical events
  const { count: criticalEvents } = await supabase
    .from('audit_logs_optimized')
    .select('*', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('severity', 'critical')
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1]);

  metrics.critical_events = criticalEvents || 0;

  // Vendor interactions
  const { count: vendorInteractions } = await supabase
    .from('audit_logs_optimized')
    .select('*', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('resource_type', 'vendor')
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1]);

  metrics.vendor_interactions = vendorInteractions || 0;

  // Payment events
  const { count: paymentEvents } = await supabase
    .from('audit_logs_optimized')
    .select('*', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('resource_type', 'payment')
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1]);

  metrics.payment_events = paymentEvents || 0;

  // Timeline changes
  const { count: timelineChanges } = await supabase
    .from('audit_logs_optimized')
    .select('*', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('resource_type', 'timeline')
    .in('action', ['create', 'update', 'delete'])
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1]);

  metrics.timeline_changes = timelineChanges || 0;

  // Guest modifications
  const { count: guestModifications } = await supabase
    .from('audit_logs_optimized')
    .select('*', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('resource_type', 'guest')
    .in('action', ['create', 'update', 'delete'])
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1]);

  metrics.guest_modifications = guestModifications || 0;

  // Risk score trend (daily average)
  const { data: riskTrend } = await supabase
    .from('audit_logs_optimized')
    .select('timestamp, risk_score')
    .eq('wedding_id', weddingId)
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1])
    .not('risk_score', 'is', null)
    .order('timestamp');

  if (riskTrend) {
    // Group by day and calculate average risk score
    const dailyRiskMap = new Map();
    riskTrend.forEach((event) => {
      const day = event.timestamp.split('T')[0];
      if (!dailyRiskMap.has(day)) {
        dailyRiskMap.set(day, { scores: [], date: day });
      }
      dailyRiskMap.get(day).scores.push(event.risk_score);
    });

    metrics.risk_score_trend = Array.from(dailyRiskMap.values()).map((day) => ({
      date: day.date,
      avg_risk_score: day.scores.reduce((a, b) => a + b, 0) / day.scores.length,
      event_count: day.scores.length,
    }));
  }

  return metrics;
}

async function generateRiskAnalysis(baseQuery: string, supabase: any) {
  const analysis = {
    risk_distribution: {},
    high_risk_events: [],
    risk_trends: [],
    top_risk_users: [],
    risk_by_resource: {},
  };

  // Risk score distribution
  const { data: riskDistribution } = await supabase.rpc(
    'get_risk_distribution',
    {
      base_query: baseQuery,
    },
  );

  analysis.risk_distribution = riskDistribution || {};

  // High-risk events (risk score > 70)
  const { data: highRiskEvents } = await supabase
    .from('audit_logs_optimized')
    .select(
      `
      id, event_type, resource_type, action, risk_score,
      user_email, timestamp, wedding_id, details
    `,
    )
    .gt('risk_score', 70)
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1])
    .order('risk_score', { ascending: false })
    .limit(20);

  analysis.high_risk_events = highRiskEvents || [];

  // Top risk users
  const { data: topRiskUsers } = await supabase.rpc('get_top_risk_users', {
    base_query: baseQuery,
  });

  analysis.top_risk_users = topRiskUsers || [];

  // Risk by resource type
  const { data: riskByResource } = await supabase.rpc('get_risk_by_resource', {
    base_query: baseQuery,
  });

  analysis.risk_by_resource = riskByResource || {};

  return analysis;
}

async function generateSummaryStats(baseQuery: string, supabase: any) {
  const stats = {
    total_events: 0,
    unique_users: 0,
    unique_weddings: 0,
    avg_risk_score: 0,
    events_by_severity: {},
    most_active_resource: '',
    most_common_action: '',
  };

  // Total events
  const { count: totalEvents } = await supabase
    .from('audit_logs_optimized')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', baseQuery.match(/timestamp >= '([^']+)'/)?.[1])
    .lte('timestamp', baseQuery.match(/timestamp <= '([^']+)'/)?.[1]);

  stats.total_events = totalEvents || 0;

  // Summary statistics query
  const { data: summaryData } = await supabase.rpc('get_audit_summary_stats', {
    base_query: baseQuery,
  });

  if (summaryData) {
    Object.assign(stats, summaryData);
  }

  return stats;
}
