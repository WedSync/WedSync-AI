import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { AnalyticsDashboardService } from '@/lib/services/monitoring/AnalyticsDashboardService';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';

const metricsLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many metrics requests',
});

const MetricsQuerySchema = z.object({
  type: z
    .enum(['usage', 'security', 'operational', 'wedding_day', 'system'])
    .optional()
    .default('system'),
  date_range: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  granularity: z
    .enum(['hour', 'day', 'week', 'month'])
    .optional()
    .default('day'),
});

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await metricsLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') || 'system',
      granularity: searchParams.get('granularity') || 'day',
      date_range: {
        start:
          searchParams.get('start') ||
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: searchParams.get('end') || new Date().toISOString(),
      },
    };

    const validatedQuery = MetricsQuerySchema.parse(queryParams);
    const dateRange = {
      start: new Date(validatedQuery.date_range.start),
      end: new Date(validatedQuery.date_range.end),
    };

    const monitoringService = new MonitoringService();
    const analyticsService = new AnalyticsDashboardService();

    let metricsData: any = {};

    switch (validatedQuery.type) {
      case 'usage':
        metricsData = await analyticsService.getUsageMetrics(
          organizationId,
          dateRange,
        );
        break;

      case 'security':
        metricsData = await analyticsService.getSecurityMetrics(
          organizationId,
          dateRange,
        );
        break;

      case 'operational':
        metricsData = await analyticsService.getOperationalMetrics(
          organizationId,
          dateRange,
        );
        break;

      case 'wedding_day':
        metricsData = await analyticsService.getWeddingDayMetrics(
          organizationId,
          dateRange,
        );
        break;

      case 'system':
      default:
        metricsData =
          await monitoringService.collectSystemMetrics(organizationId);
        break;
    }

    return NextResponse.json({
      type: validatedQuery.type,
      date_range: dateRange,
      granularity: validatedQuery.granularity,
      metrics: metricsData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Metrics collection failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to collect metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
