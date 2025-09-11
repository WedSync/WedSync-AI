// Quality Dashboard API Route
// Provides real-time quality metrics and dashboard data for monitoring system

import { NextRequest, NextResponse } from 'next/server';
import { getQualityMonitor } from '../../../monitoring/production-quality-monitor';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = parseInt(searchParams.get('timeRange') || '3600'); // Default 1 hour

    // Get quality monitor instance
    const qualityMonitor = getQualityMonitor();

    // Fetch dashboard data
    const dashboardData =
      await qualityMonitor.getQualityDashboardData(timeRange);

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Quality dashboard API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch quality dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metric } = body;

    if (!metric) {
      return NextResponse.json(
        { error: 'Missing metric data' },
        { status: 400 },
      );
    }

    // Get quality monitor instance
    const qualityMonitor = getQualityMonitor();

    // Record the metric
    await qualityMonitor.recordMetric({
      timestamp: new Date(metric.timestamp || Date.now()),
      metric: metric.name,
      value: metric.value,
      threshold: metric.threshold,
      severity: metric.severity || 'info',
      context: {
        environment:
          metric.context?.environment || process.env.NODE_ENV || 'development',
        feature: metric.context?.feature || 'unknown',
        userType: metric.context?.userType || 'system',
        weddingPhase: metric.context?.weddingPhase,
      },
      metadata: metric.metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Quality metric recording error:', error);

    return NextResponse.json(
      {
        error: 'Failed to record quality metric',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
