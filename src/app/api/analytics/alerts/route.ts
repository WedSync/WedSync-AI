import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/ratelimit';
import NodeCache from 'node-cache';

// Server-side cache with 2-minute TTL for alerts (more frequent updates needed)
const alertsCache = new NodeCache({ stdTTL: 120, checkperiod: 30 });

// Performance monitoring for alerts API
const performanceLogger = {
  logQuery: (queryName: string, duration: number, supplierId: string) => {
    console.log(
      `[ALERTS-API] ${queryName}: ${duration.toFixed(2)}ms for supplier ${supplierId}`,
    );

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send metrics to monitoring service
    }
  },

  logCacheHit: (key: string) => {
    console.log(`[ALERTS-CACHE] HIT: ${key}`);
  },

  logCacheMiss: (key: string) => {
    console.log(`[ALERTS-CACHE] MISS: ${key}`);
  },
};

export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    // Rate limiting - 60 requests per minute for alerts (higher frequency than analytics)
    const rateLimitResult = await rateLimit(
      request,
      60, // requests
      60 * 1000, // window in milliseconds (1 minute)
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const severityFilter = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Input validation
    if (!supplierId) {
      return NextResponse.json(
        { error: 'Missing supplierId parameter' },
        { status: 400 },
      );
    }

    // Validate severity filter
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (severityFilter && !validSeverities.includes(severityFilter)) {
      return NextResponse.json(
        { error: 'Invalid severity parameter' },
        { status: 400 },
      );
    }

    // Validate limit
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 },
      );
    }

    // Check server-side cache
    const cacheKey = `alerts_${supplierId}_${severityFilter || 'all'}_${limit}`;
    const cachedData = alertsCache.get(cacheKey);

    if (cachedData) {
      performanceLogger.logCacheHit(cacheKey);
      return NextResponse.json({
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    performanceLogger.logCacheMiss(cacheKey);

    const supabase = createClient();

    // Verify supplier access
    const { data: supplier, error: supplierError } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 },
      );
    }

    const queryStartTime = performance.now();

    // Query for at-risk alerts with optimized joins
    let alertsQuery = supabase.rpc('get_client_risk_alerts', {
      supplier_id: supplierId,
      severity_filter: severityFilter,
      limit_count: limit,
    });

    const { data: alertsData, error: alertsError } = await alertsQuery;

    const queryDuration = performance.now() - queryStartTime;
    performanceLogger.logQuery('alerts_query', queryDuration, supplierId);

    if (alertsError) {
      console.error('Alerts query error:', alertsError);
      return NextResponse.json(
        { error: 'Failed to fetch alerts data' },
        { status: 500 },
      );
    }

    // Transform alerts data with risk scoring and recommendations
    const processedAlerts = (alertsData || []).map((alert: any) => {
      const recommendedActions = generateRecommendedActions(alert);

      return {
        id: alert.alert_id || `alert_${alert.client_id}_${Date.now()}`,
        client_id: alert.client_id,
        client_name: alert.client_name,
        alert_type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        recommended_actions: recommendedActions,
        days_since_activity: alert.days_since_activity,
        wedding_date: alert.wedding_date,
        engagement_score: alert.engagement_score,
        created_at: alert.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // Sort alerts by severity and recency
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    processedAlerts.sort((a: any, b: any) => {
      const severityDiff =
        (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
        (severityOrder[a.severity as keyof typeof severityOrder] || 0);

      if (severityDiff !== 0) return severityDiff;

      return b.days_since_activity - a.days_since_activity;
    });

    // Cache the result
    alertsCache.set(cacheKey, processedAlerts);

    const totalDuration = performance.now() - startTime;
    performanceLogger.logQuery(
      'total_alerts_request',
      totalDuration,
      supplierId,
    );

    return NextResponse.json({
      data: processedAlerts,
      cached: false,
      timestamp: new Date().toISOString(),
      performance: {
        total_duration_ms: totalDuration.toFixed(2),
        query_duration_ms: queryDuration.toFixed(2),
        cache_hit: false,
        alert_count: processedAlerts.length,
      },
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Generate recommended actions based on alert type and client data
function generateRecommendedActions(alert: any): string[] {
  const actions = [];

  switch (alert.alert_type) {
    case 'low_engagement':
      actions.push('Send personalized check-in email');
      actions.push('Schedule phone call');
      actions.push('Share wedding timeline update');
      break;

    case 'no_recent_activity':
      actions.push('Send wedding day reminder');
      actions.push('Share vendor recommendations');
      actions.push('Invite to planning session');
      break;

    case 'approaching_wedding':
      if (alert.days_until_wedding <= 30) {
        actions.push('Confirm final details');
        actions.push('Share day-of timeline');
        actions.push('Coordinate with other vendors');
      }
      break;

    case 'payment_overdue':
      actions.push('Send payment reminder');
      actions.push('Offer payment plan options');
      actions.push('Schedule payment discussion');
      break;

    case 'form_incomplete':
      actions.push('Send form completion reminder');
      actions.push('Offer assistance with form');
      actions.push('Schedule completion call');
      break;

    default:
      actions.push('Review client status');
      actions.push('Schedule follow-up');
      break;
  }

  // Add urgency-based actions
  if (alert.severity === 'critical') {
    actions.unshift('URGENT: Immediate contact required');
  } else if (alert.severity === 'high') {
    actions.unshift('High priority follow-up needed');
  }

  return actions.slice(0, 4); // Limit to 4 actions for UI
}

// OPTIONS method for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
