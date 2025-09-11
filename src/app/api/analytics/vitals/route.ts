/**
 * Web Vitals Analytics API
 * Collects and stores web performance metrics
 * FEATURE: WS-104 - Performance Monitoring Backend Infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/monitoring/structured-logger';
import { withPerformanceTracking } from '@/middleware/performance';

interface WebVitalsRequest {
  metric: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  id: string;
  page: string;
  timestamp: number;
  deviceType?: string;
  connectionType?: string;
  userId?: string;
  sessionId?: string;
  weddingContext?: {
    clientId?: string;
    vendorId?: string;
    weddingDate?: string;
  };
}

interface WebVitalsResponse {
  success: boolean;
  stored: boolean;
  message?: string;
}

// Performance budgets for different metrics
const PERFORMANCE_BUDGETS = {
  LCP: 2500, // Large Contentful Paint - 2.5s
  FID: 100, // First Input Delay - 100ms
  CLS: 0.1, // Cumulative Layout Shift - 0.1
  FCP: 1800, // First Contentful Paint - 1.8s
  TTFB: 800, // Time to First Byte - 800ms
  INP: 200, // Interaction to Next Paint - 200ms
};

// Critical pages that need better performance
const CRITICAL_PAGES = [
  '/rsvp',
  '/wedding-website',
  '/clients',
  '/vendors',
  '/dashboard',
  '/photos',
  '/documents',
];

async function handleWebVitalsPost(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const body: WebVitalsRequest = await request.json();

    // Validate request
    const validation = validateWebVitalsRequest(body);
    if (!validation.valid) {
      logger.warn('Invalid web vitals request', {
        errors: validation.errors,
        body,
      });

      return NextResponse.json(
        {
          success: false,
          stored: false,
          message: validation.errors.join(', '),
        },
        { status: 400 },
      );
    }

    // Extract additional context from headers
    const userAgent = request.headers.get('user-agent');
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Determine device and connection type if not provided
    const deviceType = body.deviceType || inferDeviceType(userAgent);
    const connectionType =
      body.connectionType || inferConnectionType(userAgent);

    // Record the web vital metric
    const labels = {
      metric: body.metric,
      page: sanitizePage(body.page),
      device_type: deviceType,
      connection_type: connectionType,
      has_user: body.userId ? 'true' : 'false',
      has_wedding_context: body.weddingContext ? 'true' : 'false',
    };

    // Record histogram metric
    metrics.recordHistogram('web_vitals.metric_value', body.value, labels);

    // Record specific metric
    metrics.recordHistogram(
      `web_vitals.${body.metric.toLowerCase()}`,
      body.value,
      {
        page: labels.page,
        device_type: deviceType,
        connection_type: connectionType,
      },
    );

    // Check performance budget
    const budget = PERFORMANCE_BUDGETS[body.metric];
    const budgetStatus = getBudgetStatus(body.value, budget);

    metrics.incrementCounter('web_vitals.budget_status', 1, {
      metric: body.metric,
      status: budgetStatus,
      page: labels.page,
    });

    // Log budget violations
    if (budgetStatus === 'fail') {
      logger.warn('Performance budget violation', {
        metric: body.metric,
        value: body.value,
        budget,
        page: body.page,
        deviceType,
        exceedBy: body.value - budget,
        weddingContext: body.weddingContext,
      });

      metrics.incrementCounter('web_vitals.budget_violations', 1, labels);

      // Alert on critical page violations
      if (isCriticalPage(body.page)) {
        await triggerCriticalPageAlert(body, budget, userAgent);
      }
    }

    // Assess wedding business impact
    if (body.weddingContext) {
      await assessWeddingImpact(body);
    }

    // Store detailed data for analysis (would integrate with database)
    await storeWebVitalData({
      ...body,
      deviceType,
      connectionType,
      userAgent,
      ipAddress,
      budgetStatus,
      recordedAt: new Date(),
    });

    logger.debug('Web vital recorded', {
      metric: body.metric,
      value: body.value,
      page: body.page,
      deviceType,
      budgetStatus,
      userId: body.userId,
    });

    return NextResponse.json({
      success: true,
      stored: true,
    } as WebVitalsResponse);
  } catch (error) {
    logger.error('Failed to process web vitals', error as Error);

    metrics.incrementCounter('web_vitals.processing_errors', 1);

    return NextResponse.json(
      { success: false, stored: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}

function validateWebVitalsRequest(body: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !body.metric ||
    !['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP'].includes(body.metric)
  ) {
    errors.push('Invalid or missing metric');
  }

  if (typeof body.value !== 'number' || body.value < 0) {
    errors.push('Invalid value - must be a positive number');
  }

  if (!body.id || typeof body.id !== 'string') {
    errors.push('Invalid or missing ID');
  }

  if (!body.page || typeof body.page !== 'string') {
    errors.push('Invalid or missing page');
  }

  if (!body.timestamp || typeof body.timestamp !== 'number') {
    errors.push('Invalid or missing timestamp');
  }

  // Validate timestamp is reasonable (within last 10 minutes)
  const now = Date.now();
  if (Math.abs(now - body.timestamp) > 600000) {
    // 10 minutes
    errors.push('Timestamp too old or invalid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function sanitizePage(page: string): string {
  // Remove query parameters and fragments for better grouping
  try {
    const url = new URL(page, 'https://example.com');
    return url.pathname;
  } catch {
    // If URL parsing fails, just clean up the string
    return page.split('?')[0].split('#')[0] || '/';
  }
}

function inferDeviceType(userAgent?: string | null): string {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  if (
    /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
      ua,
    )
  ) {
    return 'mobile';
  }
  return 'desktop';
}

function inferConnectionType(userAgent?: string | null): string {
  // This would typically use Network Information API data sent from client
  // For now, return unknown
  return 'unknown';
}

function getBudgetStatus(
  value: number,
  budget: number,
): 'pass' | 'warn' | 'fail' {
  if (value <= budget) {
    return 'pass';
  } else if (value <= budget * 1.25) {
    // 25% over budget is warning
    return 'warn';
  } else {
    return 'fail';
  }
}

function isCriticalPage(page: string): boolean {
  return CRITICAL_PAGES.some(
    (criticalPage) =>
      page.startsWith(criticalPage) || page.includes(criticalPage),
  );
}

async function triggerCriticalPageAlert(
  vital: WebVitalsRequest,
  budget: number,
  userAgent?: string | null,
): Promise<void> {
  logger.error(
    'Critical page performance violation',
    new Error('Performance budget exceeded'),
    {
      metric: vital.metric,
      value: vital.value,
      budget,
      page: vital.page,
      userId: vital.userId,
      weddingContext: vital.weddingContext,
      userAgent: userAgent || 'unknown',
      severity: 'high',
      businessImpact: 'wedding_experience',
    },
  );

  metrics.incrementCounter('web_vitals.critical_page_violations', 1, {
    metric: vital.metric,
    page: sanitizePage(vital.page),
  });
}

async function assessWeddingImpact(vital: WebVitalsRequest): Promise<void> {
  if (!vital.weddingContext) return;

  const impact = determineWeddingImpact(vital);

  metrics.incrementCounter('web_vitals.wedding_impact', 1, {
    metric: vital.metric,
    impact_level: impact,
    has_client: vital.weddingContext.clientId ? 'true' : 'false',
    has_vendor: vital.weddingContext.vendorId ? 'true' : 'false',
  });

  if (impact === 'critical' || impact === 'high') {
    logger.warn('Performance issue affecting wedding operations', {
      metric: vital.metric,
      value: vital.value,
      page: vital.page,
      impactLevel: impact,
      weddingContext: vital.weddingContext,
    });
  }
}

function determineWeddingImpact(
  vital: WebVitalsRequest,
): 'low' | 'medium' | 'high' | 'critical' {
  const { weddingContext, page, metric, value } = vital;

  if (!weddingContext) return 'low';

  // Calculate days until wedding if date is provided
  let daysUntilWedding = Infinity;
  if (weddingContext.weddingDate) {
    const weddingDate = new Date(weddingContext.weddingDate);
    const now = new Date();
    daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
    );
  }

  // Critical wedding operations
  const criticalWeddingPages = ['/rsvp', '/wedding-website', '/photos'];
  const isCriticalWeddingPage = criticalWeddingPages.some((p) =>
    page.includes(p),
  );

  // High impact criteria
  if (
    daysUntilWedding <= 7 &&
    isCriticalWeddingPage &&
    value > PERFORMANCE_BUDGETS[metric] * 2
  ) {
    return 'critical';
  }

  if (
    daysUntilWedding <= 14 &&
    isCriticalWeddingPage &&
    value > PERFORMANCE_BUDGETS[metric] * 1.5
  ) {
    return 'high';
  }

  if (isCriticalWeddingPage && value > PERFORMANCE_BUDGETS[metric]) {
    return 'medium';
  }

  return 'low';
}

async function storeWebVitalData(data: any): Promise<void> {
  try {
    // In a real implementation, this would store to your database
    // For now, just log the structured data
    logger.info('Web vital data stored', {
      metric: data.metric,
      value: data.value,
      page: data.page,
      deviceType: data.deviceType,
      budgetStatus: data.budgetStatus,
      timestamp: data.timestamp,
      userId: data.userId,
      weddingContext: data.weddingContext,
    });

    // Placeholder for database storage
    // await database.performanceMetrics.create(data);
  } catch (error) {
    logger.error('Failed to store web vital data', error as Error, {
      metric: data.metric,
      page: data.page,
    });
  }
}

// Wrapped handlers with performance tracking
export const POST = withPerformanceTracking(
  handleWebVitalsPost,
  'web_vitals_post',
);
