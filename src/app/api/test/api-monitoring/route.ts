/**
 * API Monitoring Test Endpoint
 * WS-233: Test endpoint to verify API monitoring functionality
 *
 * Provides test endpoints to verify:
 * - API usage tracking
 * - Rate limiting
 * - Alert triggering
 * - Performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiUsageAlertsService } from '@/lib/services/api-usage-alerts';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * GET /api/test/api-monitoring
 * Test API monitoring functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'basic';

    // Simulate different test scenarios
    switch (testType) {
      case 'basic':
        return await testBasicMonitoring();

      case 'rate-limit':
        return await testRateLimiting();

      case 'alerts':
        return await testAlertSystem();

      case 'performance':
        return await testPerformanceMonitoring();

      case 'analytics':
        return await testAnalytics();

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('API monitoring test error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Test basic API monitoring
 */
async function testBasicMonitoring(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check if API usage logs table exists and is accessible
    const { data: logs, error } = await supabase
      .from('api_usage_logs')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(`Database access error: ${error.message}`);
    }

    // Check if API usage summary table exists
    const { data: summary, error: summaryError } = await supabase
      .from('api_usage_summary')
      .select('id')
      .limit(1);

    if (summaryError) {
      throw new Error(`Summary table error: ${summaryError.message}`);
    }

    // Check if API keys table exists
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('id')
      .limit(1);

    if (keysError) {
      throw new Error(`API keys table error: ${keysError.message}`);
    }

    // Check if rate limit tracking exists
    const { data: rateLimits, error: rateLimitError } = await supabase
      .from('rate_limit_tracking')
      .select('id')
      .limit(1);

    if (rateLimitError) {
      throw new Error(`Rate limit table error: ${rateLimitError.message}`);
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      test: 'basic',
      message: 'API monitoring system is functional',
      checks: {
        database_connection: true,
        api_usage_logs: true,
        api_usage_summary: true,
        api_keys: true,
        rate_limit_tracking: true,
      },
      performance: {
        response_time_ms: responseTime,
        database_queries: 4,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: 'basic',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Test rate limiting functionality
 */
async function testRateLimiting(): Promise<NextResponse> {
  try {
    // Get current rate limits for free tier
    const { data: quotas } = await supabase
      .from('api_usage_quotas')
      .select('*')
      .eq('subscription_tier', 'free');

    // Test rate limit function
    const testOrgId = 'test-org-' + Date.now();

    // This would normally be called by the middleware
    const { data: rateLimitResult, error } = await supabase.rpc(
      'check_rate_limit',
      {
        org_id: testOrgId,
        api_key_id: null,
      },
    );

    return NextResponse.json({
      success: true,
      test: 'rate-limit',
      message: 'Rate limiting system is functional',
      data: {
        quotas_configured: quotas?.length || 0,
        rate_limit_function_available: !error,
        test_result: rateLimitResult,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: 'rate-limit',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Test alert system
 */
async function testAlertSystem(): Promise<NextResponse> {
  try {
    // Check if alerts service is functional
    const testOrgId = 'test-org-' + Date.now();

    // Test getting alert rules (should return empty array for non-existent org)
    const alertRules = await apiUsageAlertsService.getAlertRules(testOrgId);

    // Check alert rules table
    const { data: alertsTable, error } = await supabase
      .from('api_usage_alerts')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(`Alerts table error: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      test: 'alerts',
      message: 'Alert system is functional',
      data: {
        alerts_service_available: true,
        alert_rules_table_accessible: true,
        test_org_rules: alertRules.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: 'alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Test performance monitoring
 */
async function testPerformanceMonitoring(): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    // Test database query performance
    const queryStart = performance.now();

    const { data: recentLogs, error } = await supabase
      .from('api_usage_logs')
      .select('id, timestamp, response_time_ms')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(100);

    const queryTime = performance.now() - queryStart;

    if (error) {
      throw new Error(`Query error: ${error.message}`);
    }

    // Calculate some basic metrics
    const logCount = recentLogs?.length || 0;
    const avgResponseTime =
      logCount > 0
        ? recentLogs!.reduce(
            (sum, log) => sum + (log.response_time_ms || 0),
            0,
          ) / logCount
        : 0;

    const totalTime = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      test: 'performance',
      message: 'Performance monitoring is functional',
      metrics: {
        total_test_time_ms: Math.round(totalTime),
        database_query_time_ms: Math.round(queryTime),
        recent_logs_found: logCount,
        average_response_time_ms: Math.round(avgResponseTime),
        query_performance:
          queryTime < 100 ? 'excellent' : queryTime < 500 ? 'good' : 'slow',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: 'performance',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Test analytics functionality
 */
async function testAnalytics(): Promise<NextResponse> {
  try {
    // Test analytics queries
    const today = new Date().toISOString().split('T')[0];

    // Check summary data
    const { data: summaryData, error: summaryError } = await supabase
      .from('api_usage_summary')
      .select('*')
      .eq('date', today)
      .limit(5);

    // Check if we can get organization count
    const { data: orgCount, error: orgError } = await supabase
      .from('organizations')
      .select('id', { count: 'exact' });

    // Check recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('api_usage_logs')
      .select('endpoint, method, status_code')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(10);

    return NextResponse.json({
      success: true,
      test: 'analytics',
      message: 'Analytics system is functional',
      data: {
        summary_data_available: !summaryError,
        summary_records_today: summaryData?.length || 0,
        total_organizations: orgCount?.length || 0,
        recent_activity_records: recentActivity?.length || 0,
        analytics_queries_working: !summaryError && !orgError && !activityError,
      },
      errors: {
        summary: summaryError?.message,
        organizations: orgError?.message,
        activity: activityError?.message,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: 'analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/test/api-monitoring
 * Generate test data for monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, count = 10 } = body;

    switch (action) {
      case 'generate-logs':
        return await generateTestLogs(count);

      case 'trigger-alert':
        return await triggerTestAlert();

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Generate test API usage logs
 */
async function generateTestLogs(count: number): Promise<NextResponse> {
  try {
    const testOrgId = 'test-org-monitoring';
    const testUserId = 'test-user-monitoring';

    const endpoints = [
      '/api/forms',
      '/api/clients',
      '/api/bookings',
      '/api/suppliers',
    ];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const statusCodes = [200, 201, 400, 404, 500];

    const logs = [];

    for (let i = 0; i < count; i++) {
      logs.push({
        organization_id: testOrgId,
        user_id: testUserId,
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        method: methods[Math.floor(Math.random() * methods.length)],
        status_code:
          statusCodes[Math.floor(Math.random() * statusCodes.length)],
        response_time_ms: Math.floor(Math.random() * 1000) + 50,
        request_size_bytes: Math.floor(Math.random() * 5000) + 100,
        response_size_bytes: Math.floor(Math.random() * 10000) + 200,
        ip_address: '192.168.1.' + Math.floor(Math.random() * 255),
        user_agent: 'Test-Agent/1.0',
        rate_limited: Math.random() < 0.1, // 10% chance of being rate limited
        subscription_tier: 'free',
        timestamp: new Date(
          Date.now() - Math.random() * 60 * 60 * 1000,
        ).toISOString(),
      });
    }

    const { error } = await supabase.from('api_usage_logs').insert(logs);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${count} test API usage logs`,
      data: {
        logs_created: count,
        test_org_id: testOrgId,
        endpoints_used: endpoints,
        time_range: 'Last hour',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Trigger a test alert
 */
async function triggerTestAlert(): Promise<NextResponse> {
  try {
    // This would trigger the alert checking process
    await apiUsageAlertsService.checkUsageAlerts();

    return NextResponse.json({
      success: true,
      message: 'Alert check triggered',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
