/**
 * PDF Analysis Analytics API Endpoint
 * WS-242: AI PDF Analysis System - Business Intelligence
 *
 * Provides comprehensive analytics for wedding businesses
 * Cost tracking, quality metrics, processing insights, and ROI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';

// Analytics query validation schema
const analyticsQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '6m', '1y', 'custom']).default('30d'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  organizationId: z.string().uuid(),
  metrics: z.string().optional(), // comma-separated list
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  extractionType: z.string().optional(),
  includeComparisons: z.enum(['true', 'false']).default('false'),
  includeForecasts: z.enum(['true', 'false']).default('false'),
});

// Available metric categories
const AVAILABLE_METRICS = {
  processing: ['total_jobs', 'success_rate', 'processing_time', 'throughput'],
  cost: ['total_cost', 'cost_per_job', 'cost_by_provider', 'cost_trends'],
  quality: [
    'accuracy_scores',
    'field_extraction_rate',
    'manual_review_rate',
    'error_categories',
  ],
  business: [
    'time_saved',
    'roi_analysis',
    'automation_rate',
    'customer_satisfaction',
  ],
};

/**
 * GET /api/pdf-analysis/analytics
 * Get comprehensive analytics for PDF processing
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Parse and validate query parameters
    const searchParams = new URL(request.url).searchParams;
    const queryResult = analyticsQuerySchema.safeParse(
      Object.fromEntries(searchParams),
    );

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'INVALID_PARAMS',
          details: queryResult.error.issues,
        },
        { status: 400 },
      );
    }

    const query = queryResult.data;

    // Verify user has access to organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, organization:organizations(id, name, plan)')
      .eq('organization_id', query.organizationId)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Calculate date range
    const { startDate, endDate } = calculateDateRange(
      query.timeframe,
      query.startDate,
      query.endDate,
    );

    // Determine which metrics to include
    const requestedMetrics = query.metrics
      ? query.metrics.split(',').map((m) => m.trim())
      : Object.values(AVAILABLE_METRICS).flat();

    const repository = createPDFAnalysisRepository();

    // Prepare analytics queries
    const analyticsPromises = [];

    // Processing Analytics
    if (
      requestedMetrics.some((m) => AVAILABLE_METRICS.processing.includes(m))
    ) {
      analyticsPromises.push(
        repository.getProcessingAnalytics({
          organizationId: query.organizationId,
          startDate,
          endDate,
          groupBy: query.groupBy,
          extractionType: query.extractionType,
        }),
      );
    }

    // Cost Analytics
    if (requestedMetrics.some((m) => AVAILABLE_METRICS.cost.includes(m))) {
      analyticsPromises.push(
        repository.getCostAnalytics({
          organizationId: query.organizationId,
          startDate,
          endDate,
          groupBy: query.groupBy,
        }),
      );
    }

    // Quality Analytics
    if (requestedMetrics.some((m) => AVAILABLE_METRICS.quality.includes(m))) {
      analyticsPromises.push(
        repository.getQualityAnalytics({
          organizationId: query.organizationId,
          startDate,
          endDate,
          extractionType: query.extractionType,
        }),
      );
    }

    // Business Analytics
    if (requestedMetrics.some((m) => AVAILABLE_METRICS.business.includes(m))) {
      analyticsPromises.push(
        repository.getBusinessAnalytics({
          organizationId: query.organizationId,
          startDate,
          endDate,
          organizationPlan: orgMember.organization.plan,
        }),
      );
    }

    // Execute analytics queries in parallel
    const [
      processingAnalytics,
      costAnalytics,
      qualityAnalytics,
      businessAnalytics,
    ] = await Promise.allSettled(analyticsPromises);

    // Prepare response data
    const analyticsData: any = {
      timeframe: {
        period: query.timeframe,
        startDate,
        endDate,
        daysInPeriod: Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      },
      organization: {
        id: orgMember.organization.id,
        name: orgMember.organization.name,
        plan: orgMember.organization.plan,
      },
    };

    // Process analytics results
    if (processingAnalytics.status === 'fulfilled') {
      analyticsData.processing = processingAnalytics.value;
    }

    if (costAnalytics.status === 'fulfilled') {
      analyticsData.costs = costAnalytics.value;
    }

    if (qualityAnalytics.status === 'fulfilled') {
      analyticsData.quality = qualityAnalytics.value;
    }

    if (businessAnalytics.status === 'fulfilled') {
      analyticsData.business = businessAnalytics.value;
    }

    // Add comparisons if requested
    if (query.includeComparisons === 'true') {
      const comparisonData = await generateComparisons(
        repository,
        query.organizationId,
        startDate,
        endDate,
        query.timeframe,
      );
      analyticsData.comparisons = comparisonData;
    }

    // Add forecasts if requested (for paid plans)
    if (
      query.includeForecasts === 'true' &&
      ['premium', 'enterprise'].includes(orgMember.organization.plan)
    ) {
      const forecastData = await generateForecasts(
        repository,
        query.organizationId,
        analyticsData,
      );
      analyticsData.forecasts = forecastData;
    }

    // Calculate key insights
    const insights = generateKeyInsights(analyticsData);
    analyticsData.insights = insights;

    return NextResponse.json(
      {
        success: true,
        data: analyticsData,
        meta: {
          generatedAt: new Date().toISOString(),
          metricsIncluded: requestedMetrics,
          hasComparisons: query.includeComparisons === 'true',
          hasForecasts:
            query.includeForecasts === 'true' &&
            ['premium', 'enterprise'].includes(orgMember.organization.plan),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5-minute cache
          'X-Analytics-Period': query.timeframe,
        },
      },
    );
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate analytics',
        code: 'ANALYTICS_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pdf-analysis/analytics/export
 * Export analytics data in various formats
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { organizationId, format, analytics, fileName } = body;

    // Verify access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Generate export based on format
    let exportData;
    let contentType;
    let fileExtension;

    switch (format) {
      case 'csv':
        exportData = generateCSVExport(analytics);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;

      case 'pdf':
        exportData = await generatePDFExport(analytics, orgMember.organization);
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;

      case 'excel':
        exportData = generateExcelExport(analytics);
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid export format', code: 'INVALID_FORMAT' },
          { status: 400 },
        );
    }

    const exportFileName =
      fileName || `wedsync-analytics-${Date.now()}.${fileExtension}`;

    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${exportFileName}"`,
        'X-Export-Format': format,
      },
    });
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      {
        error: 'Export failed',
        code: 'EXPORT_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

// Helper functions

function calculateDateRange(
  timeframe: string,
  startDate?: string,
  endDate?: string,
): { startDate: string; endDate: string } {
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  let start: Date;

  if (timeframe === 'custom' && startDate) {
    start = new Date(startDate);
  } else {
    const daysToSubtract =
      {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '6m': 180,
        '1y': 365,
      }[timeframe] || 30;

    start = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

async function generateComparisons(
  repository: any,
  organizationId: string,
  currentStart: string,
  currentEnd: string,
  timeframe: string,
): Promise<any> {
  // Calculate previous period
  const currentPeriodMs =
    new Date(currentEnd).getTime() - new Date(currentStart).getTime();
  const previousEnd = new Date(new Date(currentStart).getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - currentPeriodMs);

  // Get analytics for previous period
  const [currentAnalytics, previousAnalytics] = await Promise.all([
    repository.getProcessingAnalytics({
      organizationId,
      startDate: currentStart,
      endDate: currentEnd,
    }),
    repository.getProcessingAnalytics({
      organizationId,
      startDate: previousStart.toISOString(),
      endDate: previousEnd.toISOString(),
    }),
  ]);

  // Calculate percentage changes
  return {
    totalJobs: {
      current: currentAnalytics.totalJobs,
      previous: previousAnalytics.totalJobs,
      change: calculatePercentageChange(
        previousAnalytics.totalJobs,
        currentAnalytics.totalJobs,
      ),
    },
    successRate: {
      current: currentAnalytics.successRate,
      previous: previousAnalytics.successRate,
      change: calculatePercentageChange(
        previousAnalytics.successRate,
        currentAnalytics.successRate,
      ),
    },
    averageProcessingTime: {
      current: currentAnalytics.averageProcessingTime,
      previous: previousAnalytics.averageProcessingTime,
      change: calculatePercentageChange(
        previousAnalytics.averageProcessingTime,
        currentAnalytics.averageProcessingTime,
        true,
      ), // Reverse for time (lower is better)
    },
  };
}

async function generateForecasts(
  repository: any,
  organizationId: string,
  analyticsData: any,
): Promise<any> {
  // Simple linear regression forecasting
  const trends = calculateTrends(analyticsData);

  return {
    nextMonthJobs: Math.round(trends.jobTrend * 30),
    nextMonthCost: Math.round(trends.costTrend * 30 * 100) / 100,
    qualityImprovement: Math.round(trends.qualityTrend * 100 * 100) / 100,
    confidence: 0.75, // Static confidence for now
  };
}

function calculateTrends(analyticsData: any): any {
  // Simplified trend calculation
  const processing = analyticsData.processing || {};
  const costs = analyticsData.costs || {};
  const quality = analyticsData.quality || {};

  return {
    jobTrend: processing.dailyJobs
      ? processing.dailyJobs
          .slice(-7)
          .reduce((a: number, b: any) => a + b.jobs, 0) / 7
      : 0,
    costTrend: costs.dailyCosts
      ? costs.dailyCosts
          .slice(-7)
          .reduce((a: number, b: any) => a + b.cost, 0) / 7
      : 0,
    qualityTrend: quality.accuracyTrends
      ? (quality.accuracyTrends.slice(-1)[0]?.accuracy || 0) -
        (quality.accuracyTrends.slice(-7)[0]?.accuracy || 0)
      : 0,
  };
}

function generateKeyInsights(analyticsData: any): string[] {
  const insights: string[] = [];

  if (analyticsData.processing?.successRate > 0.95) {
    insights.push(
      'Excellent processing success rate - your system is performing optimally',
    );
  }

  if (analyticsData.costs?.costPerJob < 2) {
    insights.push('Cost efficiency is excellent - under £2 per form analysis');
  }

  if (analyticsData.quality?.averageAccuracy > 0.9) {
    insights.push('High accuracy extraction - minimal manual review needed');
  }

  if (analyticsData.processing?.averageProcessingTime < 300) {
    insights.push('Fast processing times - great user experience');
  }

  return insights;
}

function calculatePercentageChange(
  previous: number,
  current: number,
  reverse: boolean = false,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;

  const change = ((current - previous) / previous) * 100;
  return reverse ? -change : change;
}

function generateCSVExport(analytics: any): string {
  // Simplified CSV generation
  const rows = [
    ['Metric', 'Value', 'Period'],
    [
      'Total Jobs',
      analytics.processing?.totalJobs || 0,
      analytics.timeframe?.period || '',
    ],
    [
      'Success Rate',
      (analytics.processing?.successRate || 0) * 100 + '%',
      analytics.timeframe?.period || '',
    ],
    [
      'Total Cost',
      '£' + (analytics.costs?.totalCost || 0).toFixed(2),
      analytics.timeframe?.period || '',
    ],
    [
      'Average Accuracy',
      (analytics.quality?.averageAccuracy || 0) * 100 + '%',
      analytics.timeframe?.period || '',
    ],
  ];

  return rows.map((row) => row.join(',')).join('\n');
}

async function generatePDFExport(
  analytics: any,
  organization: any,
): Promise<Buffer> {
  // This would use a PDF generation library like puppeteer or jsPDF
  // For now, returning a placeholder
  return Buffer.from('PDF export placeholder');
}

function generateExcelExport(analytics: any): Buffer {
  // This would use a library like exceljs
  // For now, returning a placeholder
  return Buffer.from('Excel export placeholder');
}
