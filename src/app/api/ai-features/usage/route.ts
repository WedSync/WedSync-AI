/**
 * WS-239: AI Features Usage API - Team B Round 1
 * Real-time usage tracking and analytics for AI features
 * GET /api/ai-features/usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { costTrackingService } from '@/lib/ai/dual-system/CostTrackingService';
import { Logger } from '@/lib/logging/Logger';

const logger = new Logger('AIUsageAPI');

// Query parameters schema
const usageQuerySchema = z.object({
  // Time range
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z
    .enum(['today', 'week', 'month', 'quarter', 'year'])
    .default('month'),

  // Filters
  providerType: z.enum(['platform', 'client']).optional(),
  featureType: z
    .enum([
      'photo_analysis',
      'content_generation',
      'email_templates',
      'chat_responses',
      'document_analysis',
      'wedding_planning',
      'vendor_matching',
      'budget_optimization',
    ])
    .optional(),

  // Response format
  format: z.enum(['summary', 'detailed', 'analytics']).default('summary'),
  includeProjections: z.boolean().default(true),
  includeCostBreakdown: z.boolean().default(true),
});

/**
 * GET /api/ai-features/usage
 * Get real-time usage analytics and cost tracking
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const {
      user,
      supplierId,
      error: authError,
    } = await authenticateSupplier(request);
    if (authError) return authError;

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Convert string booleans to actual booleans
    if (queryParams.includeProjections) {
      queryParams.includeProjections =
        queryParams.includeProjections === 'true';
    }
    if (queryParams.includeCostBreakdown) {
      queryParams.includeCostBreakdown =
        queryParams.includeCostBreakdown === 'true';
    }

    const validation = usageQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const params = validation.data;

    // Calculate date range
    const dateRange = calculateDateRange(
      params.period,
      params.startDate,
      params.endDate,
    );

    logger.info('Fetching usage analytics', {
      supplierId,
      period: params.period,
      providerType: params.providerType,
      format: params.format,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
    });

    // Get usage analytics
    const analytics = await costTrackingService.getUsageAnalytics(
      supplierId,
      dateRange,
      params.providerType,
    );

    // Get budget status for both providers
    const [platformBudget, clientBudget] = await Promise.all([
      costTrackingService.getBudgetStatus(supplierId, 'platform'),
      costTrackingService.getBudgetStatus(supplierId, 'client'),
    ]);

    let response: any = {
      supplierId,
      period: params.period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      summary: {
        totalRequests: analytics.totalRequests,
        totalCost: analytics.totalCost,
        averageResponseTime: analytics.averageResponseTime,
        successRate: analytics.successRate,
        providerBreakdown: analytics.providerBreakdown,
      },
      budgetStatus: {
        platform: {
          monthlyBudget: platformBudget.monthlyBudget,
          currentSpend: platformBudget.currentSpend,
          utilizationRate: platformBudget.utilizationRate,
          onTrack: platformBudget.onTrack,
          daysRemaining: platformBudget.daysRemaining,
        },
        client: {
          monthlyBudget: clientBudget.monthlyBudget,
          currentSpend: clientBudget.currentSpend,
          utilizationRate: clientBudget.utilizationRate,
          onTrack: clientBudget.onTrack,
          daysRemaining: clientBudget.daysRemaining,
          triggeredAlerts: clientBudget.triggeredAlerts,
        },
      },
    };

    // Add detailed analytics if requested
    if (params.format === 'detailed' || params.format === 'analytics') {
      response.detailed = {
        topFeatures: analytics.topFeatures,
        dailyBreakdown: analytics.dailyBreakdown,
      };
    }

    // Add cost projections if requested
    if (params.includeProjections) {
      const projections =
        await costTrackingService.calculateProjectedCosts(supplierId);
      response.projections = {
        platform: {
          currentMonthCost: projections.platform.current,
          projectedMonthCost: projections.platform.projected,
        },
        client: {
          currentMonthCost: projections.client.current,
          projectedMonthCost: projections.client.projected,
        },
        recommendations: projections.recommendations,
      };
    }

    // Add cost breakdown if requested
    if (params.includeCostBreakdown) {
      const costReport = await costTrackingService.generateCostReport(
        supplierId,
        getCurrentBillingPeriod(),
      );

      response.costBreakdown = {
        summary: costReport.summary,
        savings: {
          totalSavings: costReport.summary.savings,
          savingsPercentage: costReport.summary.savingsPercentage,
        },
        platformUsage: costReport.platformUsage,
        clientUsage: costReport.clientUsage,
        recommendations: costReport.recommendations,
      };
    }

    // Add real-time alerts
    response.alerts = await getUsageAlerts(
      supplierId,
      platformBudget,
      clientBudget,
    );

    logger.info('Usage analytics retrieved', {
      supplierId,
      totalRequests: analytics.totalRequests,
      totalCost: analytics.totalCost,
      responseSize: JSON.stringify(response).length,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Usage analytics failed', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to retrieve usage data', code: 'ANALYTICS_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ai-features/usage/export
 * Export usage data in various formats
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const {
      user,
      supplierId,
      error: authError,
    } = await authenticateSupplier(request);
    if (authError) return authError;

    const body = await request.json();
    const { format = 'csv', dateRange, includeDetails = false } = body;

    if (!['csv', 'json', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { error: 'Unsupported export format', code: 'INVALID_FORMAT' },
        { status: 400 },
      );
    }

    // Get usage data for export
    const range = dateRange
      ? {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end),
        }
      : calculateDateRange('month');

    const analytics = await costTrackingService.getUsageAnalytics(
      supplierId,
      range,
    );

    // Generate export data based on format
    let exportData: any;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        exportData = generateCSVExport(analytics, includeDetails);
        contentType = 'text/csv';
        filename = `ai-usage-${supplierId}-${Date.now()}.csv`;
        break;

      case 'json':
        exportData = JSON.stringify(analytics, null, 2);
        contentType = 'application/json';
        filename = `ai-usage-${supplierId}-${Date.now()}.json`;
        break;

      case 'xlsx':
        // Would implement XLSX generation here
        return NextResponse.json(
          { error: 'XLSX export not yet implemented', code: 'NOT_IMPLEMENTED' },
          { status: 501 },
        );
    }

    logger.info('Usage data exported', {
      supplierId,
      format,
      dataSize: exportData.length,
      dateRange: range,
    });

    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': exportData.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Usage export failed', { error: error.message });
    return NextResponse.json(
      { error: 'Export failed', code: 'EXPORT_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * Helper functions
 */
async function authenticateSupplier(request: NextRequest): Promise<{
  user?: any;
  supplierId?: string;
  error?: NextResponse;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Authorization required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Invalid authentication', code: 'AUTH_INVALID' },
        { status: 401 },
      ),
    };
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('organization_id, user_type')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || userProfile.user_type !== 'supplier') {
    return {
      error: NextResponse.json(
        { error: 'Supplier access required', code: 'NOT_SUPPLIER' },
        { status: 403 },
      ),
    };
  }

  return { user, supplierId: userProfile.organization_id };
}

function calculateDateRange(
  period: string,
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);

  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
    };
  }

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterMonth, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
}

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

async function getUsageAlerts(
  supplierId: string,
  platformBudget: any,
  clientBudget: any,
): Promise<
  Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
    actionRequired?: boolean;
  }>
> {
  const alerts = [];

  // Platform budget alerts
  if (platformBudget.currentSpend > 0 && !platformBudget.onTrack) {
    alerts.push({
      type: 'warning',
      message: `Platform usage trending ${Math.round((platformBudget.projectedSpend / platformBudget.monthlyBudget - 1) * 100)}% over budget`,
      actionRequired: true,
    });
  }

  // Client budget alerts
  clientBudget.triggeredAlerts.forEach((threshold: number) => {
    const percentage = Math.round(threshold * 100);
    alerts.push({
      type: percentage >= 95 ? 'error' : 'warning',
      message: `Client API budget ${percentage}% used (£${clientBudget.currentSpend.toFixed(2)} of £${clientBudget.monthlyBudget.toFixed(2)})`,
      actionRequired: percentage >= 90,
    });
  });

  // Cost optimization suggestions
  if (platformBudget.currentSpend > 20 && clientBudget.currentSpend === 0) {
    alerts.push({
      type: 'info',
      message: 'Consider adding your own API key to reduce costs by up to 70%',
      actionRequired: false,
    });
  }

  return alerts;
}

function generateCSVExport(analytics: any, includeDetails: boolean): string {
  let csv = 'Feature,Requests,Cost,Average Response Time,Success Rate\n';

  analytics.topFeatures.forEach((feature: any) => {
    csv += `${feature.feature},${feature.count},${feature.cost.toFixed(4)},N/A,N/A\n`;
  });

  if (includeDetails) {
    csv += '\n\nDaily Breakdown\n';
    csv += 'Date,Requests,Cost\n';
    analytics.dailyBreakdown.forEach((day: any) => {
      csv += `${day.date},${day.requests},${day.cost.toFixed(4)}\n`;
    });
  }

  return csv;
}
