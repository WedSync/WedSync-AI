/**
 * WS-333 Team B: Report Scheduling API Endpoint
 * Automated report scheduling with wedding season awareness
 * Supports cron-based scheduling with peak season optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createWeddingReportingEngine } from '../../../../lib/reports/ReportingEngineFactory';
import {
  ReportSchedule,
  PeakSeasonAdjustment,
} from '../../../../types/reporting-backend';
import { createClient } from '@supabase/supabase-js';

const ReportScheduleSchema = z.object({
  scheduleId: z.string().min(1, 'Schedule ID is required'),
  reportConfiguration: z.object({
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
    title: z.string().min(1),
    dataFilters: z.object({
      dateRange: z
        .object({
          start: z.string().datetime(),
          end: z.string().datetime(),
        })
        .optional(),
      dynamicDateRange: z
        .object({
          period: z.enum([
            'last_week',
            'last_month',
            'last_quarter',
            'last_year',
            'current_season',
          ]),
          offset: z.number().default(0),
        })
        .optional(),
    }),
    outputFormat: z.array(
      z.enum(['pdf', 'excel', 'csv', 'json', 'wedding_portfolio']),
    ),
    recipients: z
      .array(z.string().email())
      .min(1, 'At least one recipient is required'),
  }),
  cronExpression: z.string().min(1, 'Cron expression is required'),
  timezone: z.string().default('UTC'),
  deliveryMethod: z.object({
    type: z.enum(['email', 'webhook', 'sftp', 'wedding_portal']),
    configuration: z
      .object({
        emailTemplate: z.string().optional(),
        webhookUrl: z.string().url().optional(),
        sftpConfig: z
          .object({
            host: z.string(),
            username: z.string(),
            path: z.string(),
          })
          .optional(),
      })
      .optional(),
  }),
  weddingSeasonAware: z.boolean().default(true),
  peakSeasonAdjustments: z
    .array(
      z.object({
        season: z.enum([
          'spring',
          'summer',
          'fall',
          'winter',
          'peak',
          'off_season',
        ]),
        frequency_multiplier: z.number().min(0.1).max(10),
        priority_boost: z.number().min(0).max(5),
        resource_allocation: z.number().min(0.1).max(3),
      }),
    )
    .optional(),
  expirationDate: z.string().datetime().optional(),
  retryPolicy: z
    .object({
      maxRetries: z.number().min(0).max(5).default(3),
      retryDelayMs: z.number().min(1000).max(300000).default(30000),
      exponentialBackoff: z.boolean().default(true),
    })
    .optional(),
});

let reportingEngine: any = null;

function getReportingEngine() {
  if (!reportingEngine) {
    reportingEngine = createWeddingReportingEngine({
      weddingSeasonScaling: true,
      enablePerformanceMonitoring: true,
    });
  }
  return reportingEngine;
}

/**
 * POST /api/reports/schedule
 * Create a new automated report schedule
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📅 Creating new report schedule');

    // Parse and validate request
    const body = await request.json();
    const validationResult = ReportScheduleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid schedule configuration',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    const scheduleData = validationResult.data;

    // Extract user context
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');
    const authToken = request.headers.get('authorization');

    if (!userId || !organizationId || !authToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 },
      );
    }

    // Validate cron expression
    if (!isValidCronExpression(scheduleData.cronExpression)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid cron expression',
          code: 'INVALID_CRON',
        },
        { status: 400 },
      );
    }

    // Build complete schedule object with wedding optimizations
    const reportSchedule: ReportSchedule = {
      scheduleId: scheduleData.scheduleId,
      reportConfiguration: {
        ...scheduleData.reportConfiguration,
        userId,
        organizationId,
      },
      cronExpression: scheduleData.cronExpression,
      timezone: scheduleData.timezone,
      deliveryMethod: scheduleData.deliveryMethod,
      retryPolicy: scheduleData.retryPolicy || {
        maxRetries: 3,
        retryDelayMs: 30000,
        exponentialBackoff: true,
      },
      expirationDate: scheduleData.expirationDate
        ? new Date(scheduleData.expirationDate)
        : undefined,
      weddingSeasonAware: scheduleData.weddingSeasonAware,
      peakSeasonAdjustments:
        scheduleData.peakSeasonAdjustments ||
        generateDefaultSeasonAdjustments(),
    };

    // Create schedule using reporting engine
    const engine = getReportingEngine();
    const scheduleId = await engine.scheduleReport(reportSchedule);

    // Store schedule metadata in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: dbError } = await supabase.from('report_schedules').upsert({
      schedule_id: scheduleId,
      user_id: userId,
      organization_id: organizationId,
      schedule_config: reportSchedule,
      is_active: true,
      next_execution: calculateNextExecution(
        scheduleData.cronExpression,
        scheduleData.timezone,
      ),
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (dbError) {
      console.error('Failed to store schedule metadata:', dbError);
      // Continue anyway - the schedule is created in the engine
    }

    console.log(`✅ Report schedule created: ${scheduleId}`);

    return NextResponse.json({
      success: true,
      data: {
        scheduleId,
        status: 'active',
        nextExecution: calculateNextExecution(
          scheduleData.cronExpression,
          scheduleData.timezone,
        ),
        weddingOptimizations: {
          seasonAware: reportSchedule.weddingSeasonAware,
          peakSeasonAdjustments:
            reportSchedule.peakSeasonAdjustments?.length || 0,
        },
        configuration: reportSchedule,
      },
    });
  } catch (error) {
    console.error('❌ Schedule creation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create schedule',
        code: 'SCHEDULE_CREATION_FAILED',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/reports/schedule
 * List all active schedules for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

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

    // Get schedules from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: schedules, error } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Enhance with execution status
    const enhancedSchedules = await Promise.all(
      (schedules || []).map(async (schedule) => {
        const nextExecution = calculateNextExecution(
          schedule.schedule_config.cronExpression,
          schedule.schedule_config.timezone,
        );

        const lastExecution = await getLastExecution(schedule.schedule_id);

        return {
          scheduleId: schedule.schedule_id,
          reportType: schedule.schedule_config.reportConfiguration.reportType,
          title: schedule.schedule_config.reportConfiguration.title,
          cronExpression: schedule.schedule_config.cronExpression,
          timezone: schedule.schedule_config.timezone,
          isActive: schedule.is_active,
          createdAt: schedule.created_at,
          nextExecution,
          lastExecution,
          weddingOptimizations: {
            seasonAware: schedule.schedule_config.weddingSeasonAware,
            currentSeason: getCurrentWeddingSeason(),
            peakSeasonActive: isPeakWeddingSeason(),
          },
          deliveryMethod: schedule.schedule_config.deliveryMethod.type,
          recipients:
            schedule.schedule_config.reportConfiguration.recipients.length,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        schedules: enhancedSchedules,
        total: enhancedSchedules.length,
        active: enhancedSchedules.filter((s) => s.isActive).length,
        weddingSeasonOptimizations: {
          currentSeason: getCurrentWeddingSeason(),
          isPeakSeason: isPeakWeddingSeason(),
          optimizedSchedules: enhancedSchedules.filter(
            (s) => s.weddingOptimizations.seasonAware,
          ).length,
        },
      },
    });
  } catch (error) {
    console.error('❌ Failed to list schedules:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list schedules',
        code: 'SCHEDULE_LIST_FAILED',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/reports/schedule?scheduleId=xxx
 * Deactivate a report schedule
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

    if (!scheduleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule ID is required',
          code: 'MISSING_SCHEDULE_ID',
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

    // Deactivate schedule in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await supabase
      .from('report_schedules')
      .update({
        is_active: false,
        updated_at: new Date(),
      })
      .eq('schedule_id', scheduleId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to deactivate schedule: ${error.message}`);
    }

    // TODO: Also cancel the job in the reporting engine
    // const engine = getReportingEngine();
    // await engine.cancelSchedule(scheduleId);

    console.log(`🗑️ Report schedule deactivated: ${scheduleId}`);

    return NextResponse.json({
      success: true,
      data: {
        scheduleId,
        status: 'deactivated',
        deactivatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('❌ Schedule deactivation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deactivate schedule',
        code: 'SCHEDULE_DEACTIVATION_FAILED',
      },
      { status: 500 },
    );
  }
}

// ===== HELPER FUNCTIONS =====

function isValidCronExpression(expression: string): boolean {
  // Basic cron validation - in production you'd use a proper cron parser
  const parts = expression.split(' ');
  return parts.length >= 5 && parts.length <= 6;
}

function generateDefaultSeasonAdjustments(): PeakSeasonAdjustment[] {
  return [
    {
      season: 'summer',
      frequency_multiplier: 2.0,
      priority_boost: 1,
      resource_allocation: 1.5,
    },
    {
      season: 'spring',
      frequency_multiplier: 1.5,
      priority_boost: 0,
      resource_allocation: 1.2,
    },
    {
      season: 'fall',
      frequency_multiplier: 1.5,
      priority_boost: 0,
      resource_allocation: 1.2,
    },
    {
      season: 'winter',
      frequency_multiplier: 0.5,
      priority_boost: -1,
      resource_allocation: 0.8,
    },
  ];
}

function calculateNextExecution(
  cronExpression: string,
  timezone: string,
): Date {
  // In production, use a proper cron parser like node-cron or cron-parser
  // This is a simplified calculation
  const now = new Date();
  return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day placeholder
}

async function getLastExecution(scheduleId: string): Promise<Date | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from('report_generation_jobs')
      .select('created_at')
      .eq('schedule_id', scheduleId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return new Date(data.created_at);
  } catch (error) {
    return null;
  }
}

function getCurrentWeddingSeason(): string {
  const month = new Date().getMonth() + 1;

  if (month >= 6 && month <= 9) return 'summer';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 10 && month <= 11) return 'fall';
  return 'winter';
}

function isPeakWeddingSeason(): boolean {
  const month = new Date().getMonth() + 1;
  return month >= 5 && month <= 10; // May through October
}

export { POST as post, GET as get, DELETE as delete };
