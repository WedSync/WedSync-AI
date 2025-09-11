/**
 * WS-333 Team B: Report Generation API Endpoint
 * High-performance API for generating wedding industry reports
 * Supports enterprise-scale report generation with wedding-specific optimizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createWeddingReportingEngine } from '../../../../lib/reports/ReportingEngineFactory';
import {
  ReportGenerationRequest,
  ReportGenerationRequestSchema,
  WeddingContextFiltersSchema,
} from '../../../../types/reporting-backend';
import { createClient } from '@supabase/supabase-js';

// Rate limiting for report generation (wedding season aware)
const RATE_LIMITS = {
  default: 5, // 5 reports per minute per organization
  peak_season: 10, // Increased during peak wedding season
  wedding_day_emergency: 100, // No practical limit for emergencies
};

// Comprehensive validation schema for report generation
const ReportGenerationAPISchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  reportType: z.enum([
    'financial',
    'operational',
    'seasonal_analysis',
    'wedding_portfolio',
    'supplier_performance',
    'client_satisfaction',
    'booking_trends',
    'revenue_optimization',
    'venue_utilization',
    'photographer_metrics',
    'catering_analysis',
    'wedding_planner_dashboard',
    'enterprise_compliance',
  ]),
  configuration: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dataFilters: z.object({
      dateRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
      supplierIds: z.array(z.string()).optional(),
      clientIds: z.array(z.string()).optional(),
      weddingIds: z.array(z.string()).optional(),
      customFilters: z
        .array(
          z.object({
            field: z.string(),
            operator: z.string(),
            value: z.any(),
          }),
        )
        .optional(),
    }),
    outputFormat: z.array(
      z.enum([
        'pdf',
        'excel',
        'csv',
        'json',
        'powerpoint',
        'wedding_portfolio',
      ]),
    ),
    recipients: z.array(z.string().email()).optional(),
  }),
  priority: z
    .enum(['low', 'normal', 'high', 'critical', 'wedding_day_emergency'])
    .default('normal'),
  deliveryOptions: z
    .object({
      method: z
        .enum(['download', 'email', 'webhook', 'wedding_portal'])
        .default('download'),
      autoArchive: z.boolean().default(false),
      encryption: z.boolean().default(true),
    })
    .optional(),
  weddingContext: WeddingContextFiltersSchema.optional(),
});

// Initialize reporting engine instance
let reportingEngine: any = null;

function getReportingEngine() {
  if (!reportingEngine) {
    reportingEngine = createWeddingReportingEngine({
      weddingSeasonScaling: true,
      enablePerformanceMonitoring: true,
      cacheEnabled: true,
      securityEnabled: true,
    });
  }
  return reportingEngine;
}

/**
 * POST /api/reports/generate
 * Generate a comprehensive wedding industry report
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🎯 Wedding report generation request received');

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ReportGenerationAPISchema.safeParse(body);

    if (!validationResult.success) {
      console.error(
        '❌ Report request validation failed:',
        validationResult.error,
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    const reportRequest = validationResult.data;

    // Extract user context from headers/auth
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');
    const authToken = request.headers.get('authorization');

    if (!userId || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 },
      );
    }

    // Verify authentication and permissions
    const authValidation = await validateAuthentication(
      authToken,
      userId,
      organizationId,
    );
    if (!authValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          code: 'AUTH_FAILED',
        },
        { status: 401 },
      );
    }

    // Check rate limits (wedding season aware)
    const rateLimitResult = await checkRateLimit(
      organizationId,
      reportRequest.priority,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 },
      );
    }

    // Build comprehensive report generation request
    const fullReportRequest: ReportGenerationRequest = {
      ...reportRequest,
      userId,
      organizationId,
      dataFilters: {
        ...reportRequest.configuration.dataFilters,
        dateRange: {
          start: new Date(
            reportRequest.configuration.dataFilters.dateRange.start,
          ),
          end: new Date(reportRequest.configuration.dataFilters.dateRange.end),
          timezone: request.headers.get('x-timezone') || 'UTC',
        },
      },
      outputFormat: reportRequest.configuration.outputFormat,
      cacheStrategy: {
        level: 'redis',
        ttl: calculateOptimalTTL(
          reportRequest.reportType,
          reportRequest.weddingContext,
        ),
        invalidation_strategy: 'wedding_date_aware',
        wedding_context_aware: true,
      },
      deliveryOptions: {
        method: reportRequest.deliveryOptions?.method || 'download',
        recipients: reportRequest.configuration.recipients || [],
        autoArchive: reportRequest.deliveryOptions?.autoArchive || false,
        encryption: reportRequest.deliveryOptions?.encryption || true,
        weddingPortalIntegration:
          reportRequest.deliveryOptions?.method === 'wedding_portal',
      },
    };

    // Initialize reporting engine
    const engine = getReportingEngine();

    // Handle wedding day emergency priority
    if (reportRequest.priority === 'wedding_day_emergency') {
      console.log('🚨 WEDDING DAY EMERGENCY: Prioritizing report generation');
      fullReportRequest.priority = 'wedding_day_emergency';
    }

    // Generate report with comprehensive error handling
    const reportResult = await engine.generateReport(fullReportRequest);

    // Log successful generation
    console.log(
      `✅ Wedding report generated: ${reportResult.reportId} in ${reportResult.processingTime}ms`,
    );

    // Build response with wedding-specific metadata
    const response = {
      success: true,
      data: {
        reportId: reportResult.reportId,
        status: reportResult.status,
        generatedAt: reportResult.generatedAt,
        processingTime: reportResult.processingTime,
        outputs: reportResult.outputUrls,
        metadata: {
          recordsProcessed: reportResult.metadata.recordsProcessed,
          weddingCount: reportResult.metadata.weddingCount,
          supplierCount: reportResult.metadata.supplierCount,
          dataSize: reportResult.dataSize,
          cacheHit: reportResult.cacheInfo.cacheHit,
          weddingOptimizations: reportResult.weddingMetrics
            ? {
                weekendConcentration:
                  reportResult.weddingMetrics.weekend_concentration,
                seasonalDistribution:
                  reportResult.weddingMetrics.seasonal_distribution,
                averageLeadTime:
                  reportResult.weddingMetrics.average_booking_lead_time,
              }
            : undefined,
        },
        performance: {
          totalTime: Date.now() - startTime,
          queryTime: reportResult.performanceMetrics.queryExecutionTime,
          processingTime: reportResult.performanceMetrics.dataProcessingTime,
          renderingTime: reportResult.performanceMetrics.reportRenderingTime,
          cacheHitRatio: reportResult.performanceMetrics.cacheHitRatio,
        },
      },
    };

    // Set appropriate cache headers for wedding reports
    const cacheHeaders = {
      'Cache-Control': calculateCacheControl(
        reportRequest.reportType,
        reportRequest.weddingContext,
      ),
      'X-Wedding-Optimized': 'true',
      'X-Processing-Time': reportResult.processingTime.toString(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error) {
    console.error('❌ Wedding report generation failed:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Report generation failed';

    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        errorMessage = 'Request validation failed';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'PERMISSION_DENIED';
        errorMessage = 'Insufficient permissions';
      } else if (error.message.includes('timeout')) {
        statusCode = 504;
        errorCode = 'GENERATION_TIMEOUT';
        errorMessage = 'Report generation timeout';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      { status: statusCode },
    );
  }
}

/**
 * GET /api/reports/generate?reportId=xxx
 * Check the status of a report generation job
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report ID is required',
          code: 'MISSING_REPORT_ID',
        },
        { status: 400 },
      );
    }

    if (!userId || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 },
      );
    }

    // Get report status from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: reportStatus, error } = await supabase
      .from('report_generation_jobs')
      .select('*')
      .eq('report_id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !reportStatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report not found',
          code: 'REPORT_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: reportStatus.report_id,
        status: reportStatus.status,
        progress: reportStatus.progress || 0,
        createdAt: reportStatus.created_at,
        updatedAt: reportStatus.updated_at,
        completedAt: reportStatus.completed_at,
        outputUrls: reportStatus.output_urls || [],
        error: reportStatus.error_message,
        weddingContext: reportStatus.wedding_context,
        estimatedTimeRemaining: calculateEstimatedTime(reportStatus),
      },
    });
  } catch (error) {
    console.error('❌ Report status check failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check report status',
        code: 'STATUS_CHECK_FAILED',
      },
      { status: 500 },
    );
  }
}

// ===== HELPER FUNCTIONS =====

async function validateAuthentication(
  authToken: string | null,
  userId: string,
  organizationId: string,
): Promise<{ valid: boolean }> {
  if (!authToken) {
    return { valid: false };
  }

  try {
    // Validate JWT token and check user permissions
    // This would integrate with your auth system (Supabase Auth, NextAuth, etc.)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: user, error } = await supabase.auth.getUser(
      authToken.replace('Bearer ', ''),
    );

    if (error || !user.user || user.user.id !== userId) {
      return { valid: false };
    }

    // Check if user belongs to organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError || !membership) {
      return { valid: false };
    }

    return { valid: true };
  } catch (error) {
    console.error('Authentication validation failed:', error);
    return { valid: false };
  }
}

async function checkRateLimit(
  organizationId: string,
  priority: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Implement rate limiting logic
  // Higher limits during wedding season and for emergencies
  const limit =
    priority === 'wedding_day_emergency'
      ? RATE_LIMITS.wedding_day_emergency
      : RATE_LIMITS.default;

  // This would typically use Redis or another store to track requests
  return { allowed: true }; // Placeholder implementation
}

function calculateOptimalTTL(reportType: string, weddingContext?: any): number {
  const baseTTL =
    {
      financial: 1800,
      seasonal_analysis: 86400,
      wedding_portfolio: 43200,
      photographer_metrics: 10800,
    }[reportType] || 3600;

  // Adjust for wedding context
  if (weddingContext?.peak_season_only) {
    return baseTTL * 2; // Cache longer during peak season
  }

  if (weddingContext?.weekend_priority) {
    return baseTTL * 1.5; // Cache longer for weekend data
  }

  return baseTTL;
}

function calculateCacheControl(
  reportType: string,
  weddingContext?: any,
): string {
  const maxAge = calculateOptimalTTL(reportType, weddingContext);

  if (reportType === 'financial' || reportType === 'revenue_optimization') {
    return `private, max-age=${maxAge}, must-revalidate`;
  }

  return `private, max-age=${maxAge}`;
}

function calculateEstimatedTime(reportStatus: any): number {
  // Calculate estimated time remaining based on status and complexity
  const baseTime =
    {
      queued: 30000, // 30 seconds
      processing: 15000, // 15 seconds
      rendering: 5000, // 5 seconds
    }[reportStatus.status] || 0;

  return baseTime;
}

export { POST as post, GET as get };
