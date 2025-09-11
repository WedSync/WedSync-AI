// WS-131: Revenue Performance Monitoring API
// API endpoints for accessing performance metrics and system health

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revenuePerformanceMonitor } from '@/lib/billing/revenue-performance-monitor';

export const dynamic = 'force-dynamic';

// GET /api/billing/monitoring - Get performance metrics and system health
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify admin/system role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'system', 'owner'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';
    const timeRange = searchParams.get('range') || '1h';
    const metricName = searchParams.get('metric');

    const now = new Date();
    let startTime: Date;

    // Parse time range
    switch (timeRange) {
      case '15m':
        startTime = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    switch (action) {
      case 'health':
        const systemHealth = await revenuePerformanceMonitor.getSystemHealth();
        return NextResponse.json({
          success: true,
          data: systemHealth,
          timestamp: new Date().toISOString(),
        });

      case 'metrics':
        if (!metricName) {
          return NextResponse.json(
            { error: 'Metric name required' },
            { status: 400 },
          );
        }

        const metrics = await revenuePerformanceMonitor.getMetrics(
          metricName,
          startTime,
          now,
        );

        return NextResponse.json({
          success: true,
          data: {
            metric_name: metricName,
            time_range: timeRange,
            start_time: startTime.toISOString(),
            end_time: now.toISOString(),
            data_points: metrics.length,
            metrics: metrics,
          },
        });

      case 'alerts':
        const severity = searchParams.get('severity') || undefined;
        const alerts =
          await revenuePerformanceMonitor.getActiveAlerts(severity);

        return NextResponse.json({
          success: true,
          data: {
            total_alerts: alerts.length,
            critical_alerts: alerts.filter((a) => a.severity === 'critical')
              .length,
            warning_alerts: alerts.filter((a) => a.severity === 'warning')
              .length,
            alerts: alerts,
          },
        });

      case 'dashboard':
        // Get comprehensive dashboard data
        const [
          health,
          activeAlerts,
          paymentMetrics,
          apiMetrics,
          revenueMetrics,
        ] = await Promise.all([
          revenuePerformanceMonitor.getSystemHealth(),
          revenuePerformanceMonitor.getActiveAlerts(),
          revenuePerformanceMonitor.getMetrics(
            'payment_success_rate',
            startTime,
            now,
          ),
          revenuePerformanceMonitor.getMetrics(
            'api_response_time_ms',
            startTime,
            now,
          ),
          revenuePerformanceMonitor.getMetrics(
            'revenue_reconciliation_accuracy',
            startTime,
            now,
          ),
        ]);

        // Calculate summary statistics
        const paymentSuccessRate =
          paymentMetrics.length > 0
            ? paymentMetrics[paymentMetrics.length - 1].metric_value
            : 0;

        const avgApiResponseTime =
          apiMetrics.length > 0
            ? apiMetrics.reduce((sum, m) => sum + m.metric_value, 0) /
              apiMetrics.length
            : 0;

        const revenueAccuracy =
          revenueMetrics.length > 0
            ? revenueMetrics[revenueMetrics.length - 1].metric_value
            : 0;

        return NextResponse.json({
          success: true,
          data: {
            system_health: health,
            summary_stats: {
              payment_success_rate:
                Math.round(paymentSuccessRate * 10000) / 100, // Convert to percentage
              avg_api_response_time: Math.round(avgApiResponseTime),
              revenue_accuracy: Math.round(revenueAccuracy * 10000) / 100,
              active_alerts: activeAlerts.length,
              critical_alerts: activeAlerts.filter(
                (a) => a.severity === 'critical',
              ).length,
            },
            alerts: activeAlerts.slice(0, 10), // Latest 10 alerts
            time_range: timeRange,
            last_updated: new Date().toISOString(),
          },
        });

      case 'report':
        // Generate comprehensive performance report
        const report =
          await revenuePerformanceMonitor.generatePerformanceReport(
            startTime,
            now,
          );

        return NextResponse.json({
          success: true,
          data: report,
        });

      case 'summary':
        // Get summary data from database views
        const { data: performanceSummary } = await supabase
          .from('performance_summary')
          .select('*')
          .gte('hour', startTime.toISOString())
          .order('hour', { ascending: false })
          .limit(24);

        const { data: healthSummary } = await supabase
          .from('system_health_summary')
          .select('*')
          .gte('hour', startTime.toISOString())
          .order('hour', { ascending: false })
          .limit(24);

        const { data: alertSummary } = await supabase
          .from('alert_summary')
          .select('*')
          .gte('day', startTime.toISOString())
          .order('day', { ascending: false })
          .limit(7);

        const { data: paymentSuccess } = await supabase
          .from('payment_success_rate_24h')
          .select('*')
          .order('hour', { ascending: false })
          .limit(24);

        return NextResponse.json({
          success: true,
          data: {
            performance_summary: performanceSummary || [],
            health_summary: healthSummary || [],
            alert_summary: alertSummary || [],
            payment_success_rate: paymentSuccess || [],
            time_range: timeRange,
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// POST /api/billing/monitoring - Record metrics or manage alerts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'record_metric':
        const { metric_name, value, type, labels } = body;

        if (!metric_name || value === undefined) {
          return NextResponse.json(
            { error: 'Metric name and value required' },
            { status: 400 },
          );
        }

        await revenuePerformanceMonitor.recordMetric(
          metric_name,
          value,
          type || 'gauge',
          labels || {},
        );

        return NextResponse.json({
          success: true,
          message: 'Metric recorded successfully',
        });

      case 'record_payment_metrics':
        const { paymentData } = body;

        if (!paymentData) {
          return NextResponse.json(
            { error: 'Payment data required' },
            { status: 400 },
          );
        }

        await revenuePerformanceMonitor.recordPaymentMetrics(paymentData);

        return NextResponse.json({
          success: true,
          message: 'Payment metrics recorded successfully',
        });

      case 'record_api_metrics':
        const { endpointData } = body;

        if (!endpointData) {
          return NextResponse.json(
            { error: 'Endpoint data required' },
            { status: 400 },
          );
        }

        await revenuePerformanceMonitor.recordAPIMetrics(endpointData);

        return NextResponse.json({
          success: true,
          message: 'API metrics recorded successfully',
        });

      case 'acknowledge_alert':
        const { alert_id } = body;

        if (!alert_id) {
          return NextResponse.json(
            { error: 'Alert ID required' },
            { status: 400 },
          );
        }

        const { error: updateError } = await supabase
          .from('revenue_alerts')
          .update({
            status: 'acknowledged',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: user.id,
          })
          .eq('id', alert_id);

        if (updateError) {
          throw updateError;
        }

        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged successfully',
        });

      case 'resolve_alert':
        const { alert_id: resolveAlertId } = body;

        if (!resolveAlertId) {
          return NextResponse.json(
            { error: 'Alert ID required' },
            { status: 400 },
          );
        }

        const { error: resolveError } = await supabase
          .from('revenue_alerts')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
          })
          .eq('id', resolveAlertId);

        if (resolveError) {
          throw resolveError;
        }

        return NextResponse.json({
          success: true,
          message: 'Alert resolved successfully',
        });

      case 'create_alert_rule':
        // Verify admin permissions
        const { data: adminProfile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!adminProfile || !['admin', 'system'].includes(adminProfile.role)) {
          return NextResponse.json(
            { error: 'Admin permissions required' },
            { status: 403 },
          );
        }

        const { rule } = body;

        if (!rule) {
          return NextResponse.json(
            { error: 'Alert rule data required' },
            { status: 400 },
          );
        }

        const ruleId = await revenuePerformanceMonitor.createAlertRule(rule);

        return NextResponse.json({
          success: true,
          data: { rule_id: ruleId },
          message: 'Alert rule created successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Monitoring POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// PUT /api/billing/monitoring - Update alert rules or configurations
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'system'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { rule_id, updates } = body;

    if (!rule_id || !updates) {
      return NextResponse.json(
        { error: 'Rule ID and updates required' },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from('alert_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rule_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Alert rule updated successfully',
    });
  } catch (error) {
    console.error('Monitoring PUT API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/billing/monitoring - Delete alert rules
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'system'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('rule_id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    // Soft delete by deactivating the rule
    const { error: deleteError } = await supabase
      .from('alert_rules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Alert rule deactivated successfully',
    });
  } catch (error) {
    console.error('Monitoring DELETE API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
