import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { searchParams } = new URL(request.url);

    const range = searchParams.get('range') || '24h';

    // Calculate time range and intervals
    const now = new Date();
    const timeRanges = {
      '1h': { start: new Date(now.getTime() - 60 * 60 * 1000), interval: 5 }, // 5-minute intervals
      '24h': {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        interval: 60,
      }, // 1-hour intervals
      '7d': {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        interval: 1440,
      }, // 1-day intervals
      '30d': {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        interval: 1440,
      }, // 1-day intervals
    };

    const { start: startTime, interval } =
      timeRanges[range as keyof typeof timeRanges] || timeRanges['24h'];

    // Get user behavior data aggregated by time intervals
    const { data: analyticsData, error } = await supabase
      .from('analytics_events')
      .select(
        `
        created_at,
        event_name,
        user_id,
        session_id,
        properties
      `,
      )
      .gte('created_at', startTime.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Process data into time buckets
    const behaviorData = [];
    const events = analyticsData || [];

    // Create time buckets
    const buckets = new Map();
    const totalMinutes = Math.floor(
      (now.getTime() - startTime.getTime()) / (1000 * 60),
    );
    const bucketCount = Math.ceil(totalMinutes / interval);

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = new Date(
        startTime.getTime() + i * interval * 60 * 1000,
      );
      const bucketKey = bucketStart.toISOString();

      buckets.set(bucketKey, {
        timestamp: bucketKey,
        pageViews: 0,
        uniqueVisitors: new Set(),
        sessions: new Set(),
        bounces: 0,
        sessionDurations: [],
        conversions: 0,
      });
    }

    // Aggregate events into buckets
    events.forEach((event) => {
      const eventTime = new Date(event.created_at);
      const bucketIndex = Math.floor(
        (eventTime.getTime() - startTime.getTime()) / (interval * 60 * 1000),
      );
      const bucketStart = new Date(
        startTime.getTime() + bucketIndex * interval * 60 * 1000,
      );
      const bucketKey = bucketStart.toISOString();

      const bucket = buckets.get(bucketKey);
      if (!bucket) return;

      // Count page views
      if (event.event_name === 'page_view') {
        bucket.pageViews++;
        bucket.uniqueVisitors.add(event.user_id);
        bucket.sessions.add(event.session_id);
      }

      // Track bounces (single page sessions)
      if (event.event_name === 'page_unload') {
        const sessionDuration = event.properties?.session_duration || 0;
        if (sessionDuration < 30) {
          // Less than 30 seconds = bounce
          bucket.bounces++;
        }
        bucket.sessionDurations.push(sessionDuration);
      }

      // Track conversions
      if (
        ['booking_completed', 'vendor_booked', 'payment_completed'].includes(
          event.event_name,
        )
      ) {
        bucket.conversions++;
      }
    });

    // Convert buckets to final data structure
    buckets.forEach((bucket) => {
      const uniqueVisitorCount = bucket.uniqueVisitors.size;
      const sessionCount = bucket.sessions.size;
      const avgSessionDuration =
        bucket.sessionDurations.length > 0
          ? bucket.sessionDurations.reduce(
              (sum, duration) => sum + duration,
              0,
            ) / bucket.sessionDurations.length
          : 0;
      const bounceRate =
        sessionCount > 0 ? (bucket.bounces / sessionCount) * 100 : 0;
      const conversionRate =
        uniqueVisitorCount > 0
          ? (bucket.conversions / uniqueVisitorCount) * 100
          : 0;

      behaviorData.push({
        timestamp: bucket.timestamp,
        pageViews: bucket.pageViews,
        uniqueVisitors: uniqueVisitorCount,
        bounceRate: Math.round(bounceRate * 10) / 10,
        avgSessionDuration: Math.round(avgSessionDuration),
        conversionRate: Math.round(conversionRate * 100) / 100,
      });
    });

    // Get top pages for additional insights
    const { data: topPages } = await supabase
      .from('analytics_events')
      .select('properties')
      .eq('event_name', 'page_view')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', now.toISOString());

    const pageViews = new Map();
    topPages?.forEach((event) => {
      const page = event.properties?.page || 'Unknown';
      pageViews.set(page, (pageViews.get(page) || 0) + 1);
    });

    const topPagesData = Array.from(pageViews.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    // Get device/browser breakdown
    const { data: deviceData } = await supabase
      .from('analytics_events')
      .select('properties')
      .eq('event_name', 'page_view')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', now.toISOString());

    const devices = new Map();
    const browsers = new Map();

    deviceData?.forEach((event) => {
      const deviceType = event.properties?.device_type || 'Unknown';
      const browser = event.properties?.browser || 'Unknown';

      devices.set(deviceType, (devices.get(deviceType) || 0) + 1);
      browsers.set(browser, (browsers.get(browser) || 0) + 1);
    });

    const deviceBreakdown = Array.from(devices.entries()).map(
      ([device, count]) => ({ device, count }),
    );
    const browserBreakdown = Array.from(browsers.entries()).map(
      ([browser, count]) => ({ browser, count }),
    );

    return NextResponse.json({
      success: true,
      data: behaviorData,
      metadata: {
        timeRange: range,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        interval: interval,
        dataPoints: behaviorData.length,
        topPages: topPagesData,
        deviceBreakdown,
        browserBreakdown,
        summary: {
          totalPageViews: behaviorData.reduce((sum, d) => sum + d.pageViews, 0),
          totalUniqueVisitors: behaviorData.reduce(
            (sum, d) => sum + d.uniqueVisitors,
            0,
          ),
          avgBounceRate:
            behaviorData.length > 0
              ? behaviorData.reduce((sum, d) => sum + d.bounceRate, 0) /
                behaviorData.length
              : 0,
          avgConversionRate:
            behaviorData.length > 0
              ? behaviorData.reduce((sum, d) => sum + d.conversionRate, 0) /
                behaviorData.length
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('User behavior API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user behavior data' },
      { status: 500 },
    );
  }
}
