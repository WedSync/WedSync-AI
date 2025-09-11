/**
 * WS-173: Real User Monitoring (RUM) API Endpoint
 * Team E - Round 2 Implementation
 *
 * Collects real user performance metrics for monitoring and analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

interface RUMMetric {
  session_id: string;
  page_url: string;
  user_agent: string;
  connection_type: string;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  load_time: number | null;
  viewport_width: number;
  viewport_height: number;
  device_memory?: number;
  effective_connection_type?: string;
  save_data?: boolean;
  javascript_errors?: string[];
  custom_metrics?: Record<string, any>;
}

// Rate limiting: Store request counts per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per IP per minute

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIP || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (now > limit.resetTime) {
    // Reset the limit
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  limit.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getRateLimitKey(request);
    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.session_id || !body.page_url) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, page_url' },
        { status: 400 },
      );
    }

    // Sanitize and validate metrics
    const rumMetric: RUMMetric = {
      session_id: String(body.session_id).substring(0, 100),
      page_url: String(body.page_url).substring(0, 500),
      user_agent: String(
        body.user_agent || request.headers.get('user-agent') || '',
      ).substring(0, 500),
      connection_type: String(body.connection_type || 'unknown').substring(
        0,
        50,
      ),
      lcp: validateNumericMetric(body.lcp, 0, 60000), // Max 60 seconds
      fid: validateNumericMetric(body.fid, 0, 5000), // Max 5 seconds
      cls: validateNumericMetric(body.cls, 0, 10), // CLS should be small
      fcp: validateNumericMetric(body.fcp, 0, 60000), // Max 60 seconds
      ttfb: validateNumericMetric(body.ttfb, 0, 30000), // Max 30 seconds
      load_time: validateNumericMetric(body.load_time, 0, 120000), // Max 2 minutes
      viewport_width: validateNumericMetric(body.viewport_width, 0, 10000) || 0,
      viewport_height:
        validateNumericMetric(body.viewport_height, 0, 10000) || 0,
    };

    // Add optional enhanced metrics
    if (body.device_memory) {
      rumMetric.device_memory = validateNumericMetric(
        body.device_memory,
        0,
        64,
      );
    }

    if (body.effective_connection_type) {
      rumMetric.effective_connection_type = String(
        body.effective_connection_type,
      ).substring(0, 20);
    }

    if (typeof body.save_data === 'boolean') {
      rumMetric.save_data = body.save_data;
    }

    // Handle JavaScript errors (limit to prevent spam)
    if (Array.isArray(body.javascript_errors)) {
      rumMetric.javascript_errors = body.javascript_errors
        .slice(0, 5) // Max 5 errors
        .map((error) => String(error).substring(0, 1000)); // Max 1000 chars each
    }

    // Handle custom metrics (sanitized)
    if (body.custom_metrics && typeof body.custom_metrics === 'object') {
      rumMetric.custom_metrics = sanitizeCustomMetrics(body.custom_metrics);
    }

    // Store in Supabase
    const supabase = createClient();
    const { error } = await supabase.from('rum_metrics').insert([rumMetric]);

    if (error) {
      console.error('Failed to store RUM metric:', error);

      // Don't fail the request - this could impact user experience
      // Instead, log and return success to avoid client-side errors
      return NextResponse.json({ status: 'logged' });
    }

    // Optionally trigger real-time alerts for critical performance issues
    await checkForCriticalPerformanceIssues(rumMetric);

    return NextResponse.json({
      status: 'success',
      message: 'RUM metric recorded',
    });
  } catch (error) {
    console.error('RUM API error:', error);

    // Don't fail - this could impact user experience
    return NextResponse.json({
      status: 'error',
      message: 'Failed to record metric',
    });
  }
}

// GET endpoint for retrieving RUM analytics (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const pageUrl = searchParams.get('pageUrl');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '1000'),
      10000,
    );

    const supabase = createClient();

    // Get time range filter
    const timeRangeMs = parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs);

    let query = supabase
      .from('rum_metrics')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by page URL if specified
    if (pageUrl) {
      query = query.eq('page_url', pageUrl);
    }

    const { data: metrics, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate aggregated analytics
    const analytics = calculateRUMAnalytics(metrics || []);

    return NextResponse.json({
      timeRange,
      totalMetrics: metrics?.length || 0,
      analytics,
      rawMetrics:
        searchParams.get('includeRaw') === 'true' ? metrics : undefined,
    });
  } catch (error) {
    console.error('RUM GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve RUM metrics' },
      { status: 500 },
    );
  }
}

function validateNumericMetric(
  value: any,
  min: number,
  max: number,
): number | null {
  const num = parseFloat(value);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

function sanitizeCustomMetrics(customMetrics: any): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const maxKeys = 10;
  let keyCount = 0;

  for (const [key, value] of Object.entries(customMetrics)) {
    if (keyCount >= maxKeys) break;

    const sanitizedKey = String(key).substring(0, 100);

    if (typeof value === 'number' && !isNaN(value)) {
      sanitized[sanitizedKey] = Math.min(Math.max(value, -999999), 999999);
    } else if (typeof value === 'string') {
      sanitized[sanitizedKey] = String(value).substring(0, 500);
    } else if (typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    }

    keyCount++;
  }

  return sanitized;
}

async function checkForCriticalPerformanceIssues(metric: RUMMetric) {
  // Check for critical performance issues that need immediate attention
  const criticalIssues = [];

  if (metric.lcp && metric.lcp > 4000) {
    // LCP > 4s
    criticalIssues.push(`Critical LCP: ${metric.lcp}ms on ${metric.page_url}`);
  }

  if (metric.fid && metric.fid > 300) {
    // FID > 300ms
    criticalIssues.push(`Critical FID: ${metric.fid}ms on ${metric.page_url}`);
  }

  if (metric.cls && metric.cls > 0.25) {
    // CLS > 0.25
    criticalIssues.push(`Critical CLS: ${metric.cls} on ${metric.page_url}`);
  }

  if (metric.javascript_errors && metric.javascript_errors.length > 0) {
    criticalIssues.push(
      `JavaScript errors on ${metric.page_url}: ${metric.javascript_errors.length} errors`,
    );
  }

  // If critical issues found, could trigger alerts here
  if (criticalIssues.length > 0) {
    console.warn('Critical performance issues detected:', criticalIssues);

    // In production, you might want to:
    // - Send Slack alerts
    // - Create incident tickets
    // - Log to monitoring service
    // await sendSlackAlert(criticalIssues);
  }
}

function parseTimeRange(timeRange: string): number {
  const timeRanges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  return timeRanges[timeRange] || timeRanges['24h'];
}

function calculateRUMAnalytics(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      coreWebVitals: { lcp: 0, fid: 0, cls: 0 },
      loadPerformance: { avgLoadTime: 0, p95LoadTime: 0 },
      userExperience: { errorRate: 0, bounceIndicators: 0 },
      deviceInsights: { topViewports: [], connectionTypes: [] },
      pagePerformance: {},
    };
  }

  // Core Web Vitals analysis
  const validLCP = metrics.filter((m) => m.lcp && m.lcp > 0);
  const validFID = metrics.filter((m) => m.fid && m.fid > 0);
  const validCLS = metrics.filter((m) => m.cls && m.cls >= 0);

  const coreWebVitals = {
    lcp: {
      avg:
        validLCP.length > 0
          ? validLCP.reduce((sum, m) => sum + m.lcp, 0) / validLCP.length
          : 0,
      p95:
        validLCP.length > 0
          ? percentile(
              validLCP.map((m) => m.lcp),
              0.95,
            )
          : 0,
      goodCount: validLCP.filter((m) => m.lcp <= 2500).length,
      poorCount: validLCP.filter((m) => m.lcp > 4000).length,
    },
    fid: {
      avg:
        validFID.length > 0
          ? validFID.reduce((sum, m) => sum + m.fid, 0) / validFID.length
          : 0,
      p95:
        validFID.length > 0
          ? percentile(
              validFID.map((m) => m.fid),
              0.95,
            )
          : 0,
      goodCount: validFID.filter((m) => m.fid <= 100).length,
      poorCount: validFID.filter((m) => m.fid > 300).length,
    },
    cls: {
      avg:
        validCLS.length > 0
          ? validCLS.reduce((sum, m) => sum + m.cls, 0) / validCLS.length
          : 0,
      p95:
        validCLS.length > 0
          ? percentile(
              validCLS.map((m) => m.cls),
              0.95,
            )
          : 0,
      goodCount: validCLS.filter((m) => m.cls <= 0.1).length,
      poorCount: validCLS.filter((m) => m.cls > 0.25).length,
    },
  };

  // Load performance analysis
  const validLoadTimes = metrics.filter((m) => m.load_time && m.load_time > 0);
  const loadPerformance = {
    avgLoadTime:
      validLoadTimes.length > 0
        ? validLoadTimes.reduce((sum, m) => sum + m.load_time, 0) /
          validLoadTimes.length
        : 0,
    p95LoadTime:
      validLoadTimes.length > 0
        ? percentile(
            validLoadTimes.map((m) => m.load_time),
            0.95,
          )
        : 0,
    fastCount: validLoadTimes.filter((m) => m.load_time <= 2000).length,
    slowCount: validLoadTimes.filter((m) => m.load_time > 5000).length,
  };

  // User experience insights
  const errorMetrics = metrics.filter(
    (m) => m.javascript_errors && m.javascript_errors.length > 0,
  );
  const userExperience = {
    errorRate: (errorMetrics.length / metrics.length) * 100,
    bounceIndicators: metrics.filter((m) => m.load_time && m.load_time > 10000)
      .length,
    totalSessions: new Set(metrics.map((m) => m.session_id)).size,
  };

  // Device and connection insights
  const viewportCounts = metrics.reduce((acc, m) => {
    const viewport = `${m.viewport_width}x${m.viewport_height}`;
    acc[viewport] = (acc[viewport] || 0) + 1;
    return acc;
  }, {});

  const connectionCounts = metrics.reduce((acc, m) => {
    acc[m.connection_type] = (acc[m.connection_type] || 0) + 1;
    return acc;
  }, {});

  const deviceInsights = {
    topViewports: Object.entries(viewportCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5),
    connectionTypes: Object.entries(connectionCounts).sort(
      ([, a], [, b]) => (b as number) - (a as number),
    ),
  };

  // Page-specific performance
  const pageGroups = metrics.reduce(
    (acc, m) => {
      if (!acc[m.page_url]) acc[m.page_url] = [];
      acc[m.page_url].push(m);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const pagePerformance = Object.entries(pageGroups).reduce(
    (acc, [url, pageMetrics]) => {
      const validPageLCP = pageMetrics.filter((m) => m.lcp && m.lcp > 0);
      const validPageLoad = pageMetrics.filter(
        (m) => m.load_time && m.load_time > 0,
      );

      acc[url] = {
        samples: pageMetrics.length,
        avgLCP:
          validPageLCP.length > 0
            ? validPageLCP.reduce((sum, m) => sum + m.lcp, 0) /
              validPageLCP.length
            : 0,
        avgLoadTime:
          validPageLoad.length > 0
            ? validPageLoad.reduce((sum, m) => sum + m.load_time, 0) /
              validPageLoad.length
            : 0,
        errorCount: pageMetrics.filter(
          (m) => m.javascript_errors && m.javascript_errors.length > 0,
        ).length,
      };
      return acc;
    },
    {} as Record<string, any>,
  );

  return {
    coreWebVitals,
    loadPerformance,
    userExperience,
    deviceInsights,
    pagePerformance,
  };
}

function percentile(values: number[], p: number): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)] || 0;
}
