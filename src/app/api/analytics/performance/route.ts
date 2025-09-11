import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  inp?: number;
  deviceMemory?: number;
  connectionType?: string;
  batteryLevel?: number;
  devicePixelRatio?: number;
  screenResolution?: string;
  domContentLoaded?: number;
  loadComplete?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  jsHeapSizeLimit?: number;
  jsHeapSizeUsed?: number;
  serviceWorkerLatency?: number;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
  networkCondition?: string;
  isStandalone?: boolean;
  platform?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { metrics }: { metrics: PerformanceMetrics[] } = await request.json();

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics data' },
        { status: 400 },
      );
    }

    // Process and store metrics
    const processedMetrics = metrics.map((metric) => ({
      ...metric,
      created_at: new Date(metric.timestamp).toISOString(),
      browser_name: extractBrowserName(metric.userAgent),
      device_type: extractDeviceType(metric.userAgent),
      performance_score: calculatePerformanceScore(metric),
      has_performance_issues: hasPerformanceIssues(metric),
    }));

    // Insert metrics into database
    const { error: insertError } = await supabase
      .from('performance_metrics')
      .insert(processedMetrics);

    if (insertError) {
      console.error('Failed to insert performance metrics:', insertError);
      return NextResponse.json(
        { error: 'Failed to store metrics' },
        { status: 500 },
      );
    }

    // Check for performance alerts
    await checkPerformanceAlerts(processedMetrics, supabase);

    return NextResponse.json({
      success: true,
      processed: processedMetrics.length,
    });
  } catch (error) {
    console.error('Performance metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function extractBrowserName(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edge')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('edge')) return 'edge';
  return 'other';
}

function extractDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipod/.test(ua)) return 'iphone';
  if (/ipad/.test(ua)) return 'ipad';
  if (/android.*mobile/.test(ua)) return 'android-phone';
  if (/android/.test(ua)) return 'android-tablet';
  return 'desktop';
}

function calculatePerformanceScore(metric: PerformanceMetrics): number {
  let score = 100;

  if (metric.lcp) {
    if (metric.lcp > 4000) score -= 25;
    else if (metric.lcp > 2500) score -= 10;
  }

  if (metric.fid) {
    if (metric.fid > 300) score -= 25;
    else if (metric.fid > 100) score -= 10;
  }

  if (metric.cls !== undefined) {
    if (metric.cls > 0.25) score -= 25;
    else if (metric.cls > 0.1) score -= 10;
  }

  if (metric.ttfb) {
    if (metric.ttfb > 1800) score -= 15;
    else if (metric.ttfb > 800) score -= 5;
  }

  return Math.max(0, score);
}

function hasPerformanceIssues(metric: PerformanceMetrics): boolean {
  return (
    (metric.lcp && metric.lcp > 4000) ||
    (metric.fid && metric.fid > 300) ||
    (metric.cls !== undefined && metric.cls > 0.25) ||
    (metric.ttfb && metric.ttfb > 1800) ||
    (metric.loadComplete && metric.loadComplete > 8000)
  );
}

async function checkPerformanceAlerts(metrics: any[], supabase: any) {
  const criticalMetrics = metrics.filter((m) => m.performance_score < 50);

  if (criticalMetrics.length === 0) return;

  const { data: recentAlerts } = await supabase
    .from('performance_alerts')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1);

  if (recentAlerts && recentAlerts.length > 0) return;

  const alertData = {
    alert_type: 'performance_degradation',
    severity: 'high',
    affected_metrics: criticalMetrics.length,
    average_score:
      criticalMetrics.reduce((sum, m) => sum + m.performance_score, 0) /
      criticalMetrics.length,
    details: {
      platforms: [...new Set(criticalMetrics.map((m) => m.platform))],
      browsers: [...new Set(criticalMetrics.map((m) => m.browser_name))],
      worst_metrics: criticalMetrics
        .sort((a, b) => a.performance_score - b.performance_score)
        .slice(0, 3),
    },
    created_at: new Date().toISOString(),
  };

  await supabase.from('performance_alerts').insert(alertData);
  console.warn('[Performance Alert]', alertData);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    const timeframe = searchParams.get('timeframe') || '24h';
    const platform = searchParams.get('platform');

    let query = supabase
      .from('performance_metrics')
      .select('*')
      .order('timestamp', { ascending: false });

    const timeFilter = getTimeFilter(timeframe);
    if (timeFilter) {
      query = query.gte('created_at', timeFilter);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: metrics, error } = await query.limit(1000);

    if (error) {
      throw error;
    }

    const stats = calculateAggregatedStats(metrics || []);

    return NextResponse.json({
      metrics: metrics || [],
      stats,
      timeframe,
      platform,
    });
  } catch (error) {
    console.error('Performance metrics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 },
    );
  }
}

function getTimeFilter(timeframe: string): string | null {
  const now = new Date();

  switch (timeframe) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

function calculateAggregatedStats(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      averageScore: 0,
      totalSamples: 0,
      platformBreakdown: {},
      coreWebVitals: {
        lcp: { p50: 0, p75: 0, p90: 0 },
        fid: { p50: 0, p75: 0, p90: 0 },
        cls: { p50: 0, p75: 0, p90: 0 },
      },
    };
  }

  const scores = metrics.map((m) => m.performance_score || 0);
  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const platformBreakdown = metrics.reduce((acc, m) => {
    acc[m.platform] = (acc[m.platform] || 0) + 1;
    return acc;
  }, {});

  const calculatePercentiles = (values: number[]) => {
    const sorted = values.filter((v) => v != null).sort((a, b) => a - b);
    if (sorted.length === 0) return { p50: 0, p75: 0, p90: 0 };

    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
    };
  };

  return {
    averageScore: Math.round(averageScore),
    totalSamples: metrics.length,
    platformBreakdown,
    coreWebVitals: {
      lcp: calculatePercentiles(metrics.map((m) => m.lcp).filter(Boolean)),
      fid: calculatePercentiles(metrics.map((m) => m.fid).filter(Boolean)),
      cls: calculatePercentiles(metrics.map((m) => m.cls).filter(Boolean)),
    },
  };
}
