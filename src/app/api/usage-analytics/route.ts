// app/api/usage-analytics/route.ts
// WS-233: API Usage Analytics Endpoint
// Team B - Backend Implementation
// Organization usage analytics and dashboard data

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getApiAnalyticsService,
  AnalyticsTimeRangeSchema,
} from '@/lib/services/api-analytics-service';
import { withApiUsageTracking } from '@/lib/middleware/api-usage-tracker';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Request validation schemas
const GetAnalyticsQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']).optional(),
  includeSystemHealth: z.boolean().optional(),
});

/**
 * GET /api/usage-analytics
 * Retrieve usage analytics for organization or system-wide (admin)
 */
async function GET(request: NextRequest, context: any): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      organizationId: url.searchParams.get('organizationId'),
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
      period: url.searchParams.get('period'),
      includeSystemHealth:
        url.searchParams.get('includeSystemHealth') === 'true',
    };

    // Remove null values for validation
    const cleanedParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null),
    );

    const validatedQuery = GetAnalyticsQuerySchema.parse(cleanedParams);

    // Get authenticated user context
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    // Verify user access
    const token = authHeader.split(' ')[1];
    const { data: session } = await supabase.auth.getUser(token);

    if (!session.user) {
      return NextResponse.json(
        { error: 'Invalid authentication token', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    // Get user's organization access
    const { data: userOrgs } = await supabase
      .from('user_organization_roles')
      .select('organization_id, role')
      .eq('user_id', session.user.id);

    if (!userOrgs?.length) {
      return NextResponse.json(
        { error: 'No organization access', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const isAdmin = userOrgs.some((org) => org.role === 'admin');
    const hasOrgAccess = validatedQuery.organizationId
      ? userOrgs.some(
          (org) => org.organization_id === validatedQuery.organizationId,
        )
      : true;

    if (!hasOrgAccess) {
      return NextResponse.json(
        { error: 'Access denied to specified organization', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // Default time range (last 7 days)
    const endDate = validatedQuery.endDate
      ? new Date(validatedQuery.endDate)
      : new Date();
    const startDate = validatedQuery.startDate
      ? new Date(validatedQuery.startDate)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const timeRange = {
      startDate,
      endDate,
      period: validatedQuery.period || ('DAY' as const),
    };

    const analyticsService = getApiAnalyticsService();

    // If specific organization requested
    if (validatedQuery.organizationId) {
      const organizationStats = await analyticsService.getOrganizationAnalytics(
        validatedQuery.organizationId,
        timeRange,
      );

      if (!organizationStats) {
        return NextResponse.json(
          {
            error: 'Organization not found or no data available',
            code: 'NOT_FOUND',
          },
          { status: 404 },
        );
      }

      // Get trends data
      const trends = await analyticsService.getUsageTrends(
        validatedQuery.organizationId,
        timeRange,
      );

      const response = {
        organization: organizationStats,
        trends,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          period: timeRange.period,
        },
      };

      // Include system health for admins
      if (validatedQuery.includeSystemHealth && isAdmin) {
        const systemHealth = await analyticsService.getSystemHealthMetrics();
        (response as any).systemHealth = systemHealth;
      }

      return NextResponse.json(response);
    }

    // System-wide analytics (admin only)
    if (!isAdmin) {
      return NextResponse.json(
        {
          error: 'Admin access required for system-wide analytics',
          code: 'FORBIDDEN',
        },
        { status: 403 },
      );
    }

    // Get system health and trends
    const systemHealth = await analyticsService.getSystemHealthMetrics();
    const systemTrends = await analyticsService.getUsageTrends(
      undefined,
      timeRange,
    );

    // Get top organizations by usage
    const { data: topOrgs } = await supabase
      .from('api_usage_analytics')
      .select(
        `
        organization_id,
        organizations!inner(name),
        total_requests,
        avg_response_time_ms,
        quota_utilization_percentage
      `,
      )
      .gte('period_start', startDate.toISOString())
      .lte('period_end', endDate.toISOString())
      .eq('period_type', timeRange.period)
      .order('total_requests', { ascending: false })
      .limit(10);

    const response = {
      systemHealth,
      trends: systemTrends,
      topOrganizations:
        topOrgs?.map((org) => ({
          organizationId: org.organization_id,
          organizationName: org.organizations.name,
          totalRequests: org.total_requests,
          avgResponseTime: org.avg_response_time_ms,
          quotaUtilization: org.quota_utilization_percentage,
        })) || [],
      timeRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        period: timeRange.period,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Usage Analytics API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: context.requestId,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/usage-analytics/alerts
 * Configure usage alerts for organization
 */
async function POST(request: NextRequest, context: any): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate alert configuration
    const alertConfigSchema = z.object({
      organizationId: z.string().uuid(),
      ruleName: z.string().min(1).max(100),
      ruleType: z.enum([
        'QUOTA_THRESHOLD',
        'ERROR_RATE',
        'LATENCY_SPIKE',
        'TRAFFIC_ANOMALY',
      ]),
      thresholdValue: z.number().positive(),
      thresholdOperator: z.enum(['>', '>=', '<', '<=']),
      thresholdUnit: z.enum(['PERCENTAGE', 'COUNT', 'MILLISECONDS']),
      evaluationWindowMinutes: z.number().int().min(5).max(1440),
      notificationChannels: z.array(z.string().min(1)).min(1).max(5),
      isEnabled: z.boolean().default(true),
    });

    const validatedConfig = alertConfigSchema.parse(body);

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: session } = await supabase.auth.getUser(token);

    if (!session.user) {
      return NextResponse.json(
        { error: 'Invalid authentication token', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    // Check organization access
    const { data: userRole } = await supabase
      .from('user_organization_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('organization_id', validatedConfig.organizationId)
      .single();

    if (!userRole || !['admin', 'owner'].includes(userRole.role)) {
      return NextResponse.json(
        {
          error: 'Admin access required to configure alerts',
          code: 'FORBIDDEN',
        },
        { status: 403 },
      );
    }

    // Create alert rule
    const analyticsService = getApiAnalyticsService();
    const alertId = await analyticsService.configureAlerts(
      validatedConfig.organizationId,
      validatedConfig,
    );

    if (!alertId) {
      return NextResponse.json(
        { error: 'Failed to create alert rule', code: 'INTERNAL_ERROR' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        alertId,
        message: 'Alert rule created successfully',
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('[Usage Analytics API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid alert configuration',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: context.requestId,
      },
      { status: 500 },
    );
  }
}

// Apply usage tracking middleware
export const GET_WithTracking = withApiUsageTracking(GET);
export const POST_WithTracking = withApiUsageTracking(POST);

export { GET_WithTracking as GET, POST_WithTracking as POST };
