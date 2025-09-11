/**
 * API Gateway Analytics Endpoint - Traffic analytics and insights
 * WS-250 - Real-time analytics with wedding industry focus
 */

import { NextRequest, NextResponse } from 'next/server';
import { trafficAnalyticsCollector } from '@/lib/services/api-gateway/TrafficAnalyticsCollector';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || 'hour';

    let startTime: Date;
    const endTime = new Date();

    switch (timeRange) {
      case 'hour':
        startTime = new Date(endTime.getTime() - 3600000);
        break;
      case 'day':
        startTime = new Date(endTime.getTime() - 86400000);
        break;
      case 'week':
        startTime = new Date(endTime.getTime() - 604800000);
        break;
      default:
        startTime = new Date(endTime.getTime() - 3600000);
    }

    const analytics = {
      realtime: trafficAnalyticsCollector.getRealtimeStats(),
      aggregated: trafficAnalyticsCollector.getAggregatedMetrics(
        startTime,
        endTime,
      ),
      wedding: trafficAnalyticsCollector.getWeddingAnalytics(),
      trends: trafficAnalyticsCollector.getTrafficTrends(),
      topEndpoints: trafficAnalyticsCollector.getTopEndpoints('requests', 10),
      report: trafficAnalyticsCollector.generateAnalyticsReport(),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeRange: { start: startTime.toISOString(), end: endTime.toISOString() },
      data: analytics,
    });
  } catch (error) {
    console.error('[API Gateway Analytics] GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get analytics data' },
      { status: 500 },
    );
  }
}
