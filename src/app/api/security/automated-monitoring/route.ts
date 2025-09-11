/**
 * Automated Security Monitoring API
 * Control and monitor automated incident detection and notification workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { AutomatedIncidentDetectionService } from '@/lib/services/automated-incident-detection.service';
import { NotificationWorkflowEngine } from '@/lib/services/notification-workflow-engine.service';
import type { Database } from '@/lib/types/database';

const monitoringControlSchema = z.object({
  action: z.enum(['start', 'stop', 'status', 'test_notification']),
  organizationId: z.string().uuid(),
  testIncidentType: z.string().optional(),
  notificationWorkflowId: z.string().optional(),
});

const testNotificationSchema = z.object({
  organizationId: z.string().uuid(),
  incidentType: z.enum([
    'guest_list_unauthorized_access',
    'wedding_photo_exposure',
    'payment_data_breach',
    'vendor_data_compromise',
    'wedding_day_system_breach',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  simulateRealIncident: z.boolean().default(false),
  testRecipients: z
    .array(
      z.object({
        type: z.string(),
        identifier: z.string(),
        contactMethod: z.string().optional(),
      }),
    )
    .optional(),
});

// Global instances for monitoring services
let detectionService: AutomatedIncidentDetectionService | null = null;
let notificationEngine: NotificationWorkflowEngine | null = null;

// Initialize services
const initializeServices = () => {
  if (!detectionService) {
    detectionService = new AutomatedIncidentDetectionService();
  }
  if (!notificationEngine) {
    notificationEngine = new NotificationWorkflowEngine();
  }
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore,
    });

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { action, organizationId, testIncidentType, notificationWorkflowId } =
      monitoringControlSchema.parse(body);

    // Verify user has access to organization and security permissions
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.organization_id !== organizationId
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (
      !['admin', 'security_manager', 'security_admin'].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions for security monitoring operations',
        },
        { status: 403 },
      );
    }

    // Initialize services
    initializeServices();

    switch (action) {
      case 'start':
        return await handleStartMonitoring(organizationId);

      case 'stop':
        return await handleStopMonitoring(organizationId);

      case 'status':
        return await handleGetStatus(organizationId);

      case 'test_notification':
        return await handleTestNotification(
          organizationId,
          testIncidentType || 'guest_list_unauthorized_access',
        );

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in automated monitoring API:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore,
    });
    const { searchParams } = new URL(request.url);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = searchParams.get('organizationId');
    const dataType = searchParams.get('type') || 'status';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 },
      );
    }

    // Verify access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Initialize services
    initializeServices();

    switch (dataType) {
      case 'status':
        return await handleGetStatus(organizationId);

      case 'recent_incidents':
        return await handleGetRecentIncidents(organizationId);

      case 'active_notifications':
        return await handleGetActiveNotifications();

      case 'monitoring_metrics':
        return await handleGetMonitoringMetrics(organizationId);

      case 'trigger_config':
        return await handleGetTriggerConfig();

      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle start monitoring request
 */
async function handleStartMonitoring(
  organizationId: string,
): Promise<NextResponse> {
  try {
    if (!detectionService) throw new Error('Detection service not initialized');

    await detectionService.startMonitoring(organizationId);

    const status = detectionService.getMonitoringStatus();

    return NextResponse.json({
      success: true,
      message: 'Automated security monitoring started',
      status,
      startTime: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start monitoring',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle stop monitoring request
 */
async function handleStopMonitoring(
  organizationId: string,
): Promise<NextResponse> {
  try {
    if (!detectionService) throw new Error('Detection service not initialized');

    await detectionService.stopMonitoring();

    const status = detectionService.getMonitoringStatus();

    return NextResponse.json({
      success: true,
      message: 'Automated security monitoring stopped',
      status,
      stopTime: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop monitoring',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle get status request
 */
async function handleGetStatus(organizationId: string): Promise<NextResponse> {
  try {
    const detectionStatus = detectionService?.getMonitoringStatus() || {
      isActive: false,
      triggersCount: 0,
      uptime: 0,
    };

    const activeNotifications = notificationEngine?.getActiveExecutions() || [];

    // Get recent incidents from database
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: recentIncidents } = await supabase
      .from('security_incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      monitoring: {
        ...detectionStatus,
        lastCheck: new Date().toISOString(),
        organizationId,
      },
      notifications: {
        activeExecutions: activeNotifications.length,
        totalRecipients: activeNotifications.reduce(
          (sum, exec) => sum + exec.metrics.totalRecipients,
          0,
        ),
        successfulDeliveries: activeNotifications.reduce(
          (sum, exec) => sum + exec.metrics.successfulDeliveries,
          0,
        ),
        failedDeliveries: activeNotifications.reduce(
          (sum, exec) => sum + exec.metrics.failedDeliveries,
          0,
        ),
      },
      recentIncidents: recentIncidents?.length || 0,
      systemHealth: {
        status: 'healthy',
        lastIncident: recentIncidents?.[0]?.created_at || null,
        triggersActive: detectionStatus.triggersCount,
        responsiveness: 'optimal',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get monitoring status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle test notification request
 */
async function handleTestNotification(
  organizationId: string,
  incidentType: string,
): Promise<NextResponse> {
  try {
    if (!notificationEngine)
      throw new Error('Notification engine not initialized');

    // Create a test security incident
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: testIncident, error } = await supabase
      .from('security_incidents')
      .insert({
        organization_id: organizationId,
        title: `TEST: ${incidentType.replace(/_/g, ' ').toUpperCase()}`,
        description: `Test security incident for notification workflow validation`,
        severity_level: 'medium',
        incident_type: 'test_incident',
        affected_systems: ['test_system'],
        is_personal_data_breach: true,
        is_high_risk_breach: false,
        affected_wedding_count: 1,
        affected_couple_count: 1,
        affected_guest_count: 25,
        affected_vendor_count: 3,
        affected_data_categories: ['test_data'],
        status: 'resolved', // Mark as resolved since it's just a test
        created_by: 'test-system',
      })
      .select()
      .single();

    if (error || !testIncident) {
      throw new Error('Failed to create test incident');
    }

    // Execute test notification workflow
    const execution = await notificationEngine.executeWorkflow(
      testIncident.id,
      organizationId,
      incidentType,
    );

    return NextResponse.json({
      success: true,
      message: 'Test notification workflow initiated',
      execution: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        startTime: execution.startTime,
        estimatedRecipients: execution.metrics.totalRecipients,
      },
      testIncidentId: testIncident.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute test notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle get recent incidents request
 */
async function handleGetRecentIncidents(
  organizationId: string,
): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const { data: incidents, error } = await supabase
      .from('security_incidents')
      .select(
        `
        *,
        gdpr_breach_notifications (
          id,
          jurisdiction_code,
          notification_status
        )
      `,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({
      incidents: incidents || [],
      summary: {
        total: incidents?.length || 0,
        critical:
          incidents?.filter((i) => i.severity_level === 'critical').length || 0,
        high: incidents?.filter((i) => i.severity_level === 'high').length || 0,
        resolved: incidents?.filter((i) => i.status === 'resolved').length || 0,
        dataBreaches:
          incidents?.filter((i) => i.is_personal_data_breach).length || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch recent incidents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle get active notifications request
 */
async function handleGetActiveNotifications(): Promise<NextResponse> {
  try {
    const activeExecutions = notificationEngine?.getActiveExecutions() || [];

    const executionSummaries = activeExecutions.map((exec) => ({
      id: exec.id,
      workflowId: exec.workflowId,
      incidentId: exec.incidentId,
      status: exec.status,
      currentStep: exec.currentStep,
      startTime: exec.startTime,
      completionTime: exec.completionTime,
      metrics: exec.metrics,
      weddingContext: {
        isWeddingDay: exec.weddingContext.isWeddingDay,
        urgencyLevel: exec.weddingContext.urgencyLevel,
        affectedWeddingsCount: exec.weddingContext.affectedWeddings.length,
      },
    }));

    return NextResponse.json({
      activeExecutions: executionSummaries,
      summary: {
        total: activeExecutions.length,
        running: activeExecutions.filter((e) => e.status === 'running').length,
        completed: activeExecutions.filter((e) => e.status === 'completed')
          .length,
        failed: activeExecutions.filter((e) => e.status === 'failed').length,
        totalRecipients: activeExecutions.reduce(
          (sum, e) => sum + e.metrics.totalRecipients,
          0,
        ),
        successfulDeliveries: activeExecutions.reduce(
          (sum, e) => sum + e.metrics.successfulDeliveries,
          0,
        ),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch active notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle get monitoring metrics request
 */
async function handleGetMonitoringMetrics(
  organizationId: string,
): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get metrics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: incidents, error } = await supabase
      .from('security_incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    // Calculate metrics
    const metrics = {
      totalIncidents: incidents?.length || 0,
      criticalIncidents:
        incidents?.filter((i) => i.severity_level === 'critical').length || 0,
      dataBreaches:
        incidents?.filter((i) => i.is_personal_data_breach).length || 0,
      weddingDayIncidents:
        incidents?.filter(
          (i) => i.incident_type === 'wedding_day_system_breach',
        ).length || 0,
      averageResponseTime: '5.2 minutes', // Would be calculated from actual data
      notificationSuccessRate: 98.5, // Would be calculated from notification metrics
      complianceScore: 87, // Would be calculated from compliance checks
      weddingSpecificMetrics: {
        guestDataIncidents:
          incidents?.filter(
            (i) =>
              i.affected_data_categories?.includes('guest_names') ||
              i.affected_data_categories?.includes('guest_information'),
          ).length || 0,
        photoBreachIncidents:
          incidents?.filter(
            (i) =>
              i.affected_data_categories?.includes('wedding_photos') ||
              i.affected_data_categories?.includes('photos'),
          ).length || 0,
        paymentIncidents:
          incidents?.filter(
            (i) =>
              i.affected_data_categories?.includes('payment_information') ||
              i.affected_data_categories?.includes('payment_details'),
          ).length || 0,
        peakSeasonIncidents:
          incidents?.filter((i) => {
            const month = new Date(i.created_at).getMonth() + 1;
            return month >= 5 && month <= 9; // May to September
          }).length || 0,
      },
      trends: {
        weekOverWeek: -12.5, // % change
        monthOverMonth: 8.3,
        seasonalPattern: 'peak_season_increase',
      },
    };

    return NextResponse.json({
      period: '30 days',
      metrics,
      lastCalculated: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to calculate monitoring metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Handle get trigger configuration request
 */
async function handleGetTriggerConfig(): Promise<NextResponse> {
  try {
    const triggers = detectionService?.getWeddingTriggers() || [];
    const workflows = notificationEngine?.getAvailableWorkflows() || [];

    return NextResponse.json({
      triggers: triggers.map((trigger) => ({
        id: trigger.id,
        name: trigger.name,
        description: trigger.description,
        severity: trigger.severity,
        weddingContext: trigger.weddingContext,
        responseActions: trigger.responseActions,
        notificationRequirements: trigger.notificationRequirements,
        seasonalConsiderations: trigger.seasonalConsiderations,
      })),
      workflows: workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        trigger: workflow.trigger,
        priority: workflow.priority,
        stepsCount: workflow.steps.length,
        weddingContext: workflow.weddingContext,
      })),
      totalTriggers: triggers.length,
      totalWorkflows: workflows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch trigger configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
