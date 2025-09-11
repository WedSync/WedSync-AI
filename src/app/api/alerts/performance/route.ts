/**
 * WS-145: Performance Alerts API
 * Endpoint for managing performance threshold alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PerformanceAlertPayload {
  type: 'performance_alert';
  data: {
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
    timestamp: number;
    url: string;
    deviceType: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
    }

    const payload: PerformanceAlertPayload = await request.json();
    const { type, data: alertData } = payload;

    if (type !== 'performance_alert') {
      return NextResponse.json(
        { error: 'Invalid alert type' },
        { status: 400 },
      );
    }

    const pagePath = new URL(alertData.url).pathname;

    // Check if we already have a similar alert recently to avoid spam
    const { data: existingAlerts, error: checkError } = await supabase
      .from('performance_alerts')
      .select('id')
      .eq('user_id', user?.id || null)
      .eq('metric_name', alertData.metric)
      .eq('page_path', pagePath)
      .eq('status', 'open')
      .gte('triggered_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within last 5 minutes
      .limit(1);

    if (checkError) {
      console.error('Error checking existing alerts:', checkError);
    }

    // Skip if we have a recent similar alert
    if (existingAlerts && existingAlerts.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Similar alert already exists, skipping duplicate',
      });
    }

    // Insert performance alert
    const { error } = await supabase.from('performance_alerts').insert({
      user_id: user?.id || null,
      metric_name: alertData.metric,
      metric_value: alertData.value,
      threshold_value: alertData.threshold,
      severity: alertData.severity,
      page_path: pagePath,
      url: alertData.url,
      device_type: alertData.deviceType,
      triggered_at: new Date(alertData.timestamp).toISOString(),
    });

    if (error) {
      console.error('Error inserting performance alert:', error);
      return NextResponse.json(
        { error: 'Failed to save performance alert' },
        { status: 500 },
      );
    }

    // Log critical alerts for immediate attention
    if (alertData.severity === 'critical') {
      console.warn(
        `CRITICAL Performance Alert: ${alertData.metric} = ${alertData.value}ms exceeds threshold of ${alertData.threshold}ms on ${pagePath} (${alertData.deviceType})`,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Performance alert error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'open';
    const severity = url.searchParams.get('severity');
    const pagePath = url.searchParams.get('page_path');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '100'),
      1000,
    );
    const days = Math.min(parseInt(url.searchParams.get('days') || '7'), 30);

    // Build query
    let query = supabase
      .from('performance_alerts')
      .select('*')
      .eq('user_id', user.id)
      .gte(
        'triggered_at',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (pagePath) {
      query = query.eq('page_path', pagePath);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Error fetching performance alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 },
      );
    }

    // Get alert summary statistics
    const { data: summary, error: summaryError } = await supabase
      .from('performance_alerts')
      .select('severity, status, metric_name')
      .eq('user_id', user.id)
      .gte(
        'triggered_at',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      );

    let alertsSummary = {};
    if (!summaryError && summary) {
      alertsSummary = {
        totalAlerts: summary.length,
        bySeverity: summary.reduce(
          (counts, alert) => {
            counts[alert.severity] = (counts[alert.severity] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        ),
        byStatus: summary.reduce(
          (counts, alert) => {
            counts[alert.status] = (counts[alert.status] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        ),
        byMetric: summary.reduce(
          (counts, alert) => {
            counts[alert.metric_name] = (counts[alert.metric_name] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        ),
      };
    }

    return NextResponse.json({
      alerts: alerts || [],
      summary: alertsSummary,
      filters: {
        status,
        severity,
        pagePath,
        days,
        limit,
      },
    });
  } catch (error) {
    console.error('Performance alerts GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertIds, status } = await request.json();

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'Alert IDs are required' },
        { status: 400 },
      );
    }

    if (!['acknowledged', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "acknowledged" or "resolved"' },
        { status: 400 },
      );
    }

    // Update alert status
    const updateData: any = { status };
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('performance_alerts')
      .update(updateData)
      .in('id', alertIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating performance alerts:', error);
      return NextResponse.json(
        { error: 'Failed to update alerts' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: alertIds.length,
      newStatus: status,
    });
  } catch (error) {
    console.error('Performance alerts PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
