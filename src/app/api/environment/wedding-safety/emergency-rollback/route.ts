import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WeddingDaySafetyService } from '@/lib/services/wedding-safety/WeddingDaySafetyService';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';

// Emergency rollback rate limiting (very restrictive for safety)
const emergencyRollbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 2, // Only 2 emergency rollbacks per minute
  message:
    'Emergency rollback rate limit exceeded - contact support if genuine emergency',
});

const EmergencyRollbackRequestSchema = z.object({
  environment_id: z.string().uuid(),
  rollback_reason: z.string().min(10).max(1000),
  severity_level: z.enum(['P0', 'P1', 'P2']).default('P0'),
  notify_stakeholders: z.boolean().default(true),
  confirm_data_loss: z.boolean().default(false), // Explicit confirmation required
  emergency_contact_authorization: z.string().uuid().optional(), // Emergency contact who authorized this
});

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting
    const rateLimitResult = await emergencyRollbackLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Emergency rollback rate limit exceeded',
          message:
            'Emergency rollbacks are strictly limited. Contact support if this is a genuine emergency.',
          support_contact: 'emergency@wedsync.com',
        },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');
    const userId = headersList.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Authentication required for emergency rollback' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedRequest = EmergencyRollbackRequestSchema.parse(body);

    const safetyService = new WeddingDaySafetyService();
    const supabase = createClient();

    // Verify user has emergency rollback permissions
    const hasRollbackPermission = await checkEmergencyRollbackPermission(
      supabase,
      organizationId,
      userId,
    );

    if (!hasRollbackPermission) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions for emergency rollback',
          required_roles: [
            'ADMIN',
            'WEDDING_DAY_EMERGENCY',
            'DEPLOYMENT_MANAGER',
          ],
          message: 'Emergency rollback requires elevated privileges',
        },
        { status: 403 },
      );
    }

    // Get environment details for validation
    const { data: environment } = await supabase
      .from('environments')
      .select('*')
      .eq('id', validatedRequest.environment_id)
      .eq('organization_id', organizationId)
      .single();

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found or access denied' },
        { status: 404 },
      );
    }

    // Wedding day extra protection for production environments
    const isWeddingDay = new Date().getDay() === 6;
    const isProduction = environment.name.toLowerCase().includes('prod');
    const weddingDayStatus =
      await safetyService.isWeddingDayProtectionActive(organizationId);

    if (
      isWeddingDay &&
      isProduction &&
      !weddingDayStatus.emergency_override_active
    ) {
      return NextResponse.json(
        {
          error: 'Wedding day production rollback protection',
          message:
            'Production rollbacks on Saturday require active emergency override',
          required_steps: [
            'Enable emergency override first',
            'Verify with emergency contact',
            'Confirm rollback necessity',
            'Execute rollback with enhanced monitoring',
          ],
          emergency_procedures:
            '/api/environment/wedding-safety/emergency-override',
        },
        { status: 423 }, // Locked
      );
    }

    // Require explicit data loss confirmation for production
    if (isProduction && !validatedRequest.confirm_data_loss) {
      return NextResponse.json(
        {
          error: 'Production rollback requires explicit data loss confirmation',
          message:
            'Rolling back production may result in data loss. Set confirm_data_loss=true if you accept this risk.',
          warnings: [
            'Recent changes since last snapshot will be lost',
            'Any deployments after snapshot will be reverted',
            'User data changes may be affected',
            'This action cannot be undone automatically',
          ],
        },
        { status: 400 },
      );
    }

    // Validate that there's a recent snapshot to rollback to
    const { data: availableSnapshots } = await supabase
      .from('configuration_snapshots')
      .select('id, created_at, version, status')
      .eq('organization_id', organizationId)
      .eq('environment_id', validatedRequest.environment_id)
      .eq('status', 'successful')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false })
      .limit(1);

    if (!availableSnapshots || availableSnapshots.length === 0) {
      return NextResponse.json(
        {
          error: 'No recent snapshots available for rollback',
          message:
            'Cannot perform emergency rollback without a recent successful configuration snapshot',
          suggestion:
            'Check configuration snapshots or contact support for manual recovery',
        },
        { status: 409 },
      );
    }

    const latestSnapshot = availableSnapshots[0];
    const snapshotAge =
      (Date.now() - new Date(latestSnapshot.created_at).getTime()) /
      (1000 * 60); // minutes

    // Pre-rollback safety checks
    const safetyChecks = await performPreRollbackSafetyChecks(
      supabase,
      organizationId,
      validatedRequest.environment_id,
      isWeddingDay,
    );

    if (
      !safetyChecks.safe_to_proceed &&
      validatedRequest.severity_level !== 'P0'
    ) {
      return NextResponse.json(
        {
          error: 'Safety checks failed',
          safety_issues: safetyChecks.issues,
          warnings: safetyChecks.warnings,
          message: 'Only P0 severity emergencies can override safety checks',
          current_severity: validatedRequest.severity_level,
        },
        { status: 400 },
      );
    }

    // Execute emergency rollback
    console.log(
      `🚨 EMERGENCY ROLLBACK INITIATED - Environment: ${environment.name}, User: ${userId}, Reason: ${validatedRequest.rollback_reason}`,
    );

    const rollbackResult = await safetyService.performEmergencyRollback(
      organizationId,
      userId,
      validatedRequest.environment_id,
      validatedRequest.rollback_reason,
    );

    if (!rollbackResult.success) {
      return NextResponse.json(
        {
          error: 'Emergency rollback failed',
          message: 'Rollback operation could not be completed',
          rollback_id: rollbackResult.rollback_id,
        },
        { status: 500 },
      );
    }

    // Log critical security event
    await logCriticalSecurityEvent(supabase, organizationId, {
      event_type: 'emergency_rollback_executed',
      severity: 'CRITICAL',
      user_id: userId,
      environment_id: validatedRequest.environment_id,
      rollback_id: rollbackResult.rollback_id,
      reason: validatedRequest.rollback_reason,
      wedding_day: isWeddingDay,
      production_environment: isProduction,
      variables_restored: rollbackResult.variables_restored,
    });

    // Send immediate notifications
    if (validatedRequest.notify_stakeholders || isWeddingDay) {
      await sendEmergencyRollbackNotifications(organizationId, {
        rollbackId: rollbackResult.rollback_id,
        environmentName: environment.name,
        reason: validatedRequest.rollback_reason,
        severity: validatedRequest.severity_level,
        variablesRestored: rollbackResult.variables_restored,
        weddingDay: isWeddingDay,
        userId,
      });
    }

    // Schedule post-rollback validation
    await schedulePostRollbackValidation(supabase, organizationId, {
      rollbackId: rollbackResult.rollback_id,
      environmentId: validatedRequest.environment_id,
      scheduledAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes later
    });

    const response = {
      success: true,
      rollback_result: {
        rollback_id: rollbackResult.rollback_id,
        variables_restored: rollbackResult.variables_restored,
        rollback_timestamp: rollbackResult.rollback_timestamp.toISOString(),
        snapshot_used: {
          snapshot_id: latestSnapshot.id,
          snapshot_age_minutes: Math.round(snapshotAge),
          snapshot_version: latestSnapshot.version,
        },
      },
      environment: {
        id: validatedRequest.environment_id,
        name: environment.name,
        type: environment.environment_type,
      },
      safety_context: {
        wedding_day_rollback: isWeddingDay,
        production_environment: isProduction,
        emergency_override_active: weddingDayStatus.emergency_override_active,
        severity_level: validatedRequest.severity_level,
      },
      immediate_actions_required: [
        '1. Verify system functionality immediately',
        '2. Test critical user workflows',
        '3. Monitor system health for next 30 minutes',
        '4. Document any remaining issues',
        '5. Update stakeholders on system status',
      ],
      monitoring: {
        enhanced_monitoring_active: true,
        health_check_interval: '30 seconds',
        alert_threshold: 'Reduced for maximum sensitivity',
        automatic_escalation: isWeddingDay,
      },
      notifications_sent: validatedRequest.notify_stakeholders,
      post_rollback_validation_scheduled: true,
      timestamp: new Date().toISOString(),
    };

    // Return appropriate HTTP status
    const httpStatus = rollbackResult.success ? 200 : 500;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'X-Emergency-Rollback': 'true',
        'X-Wedding-Day': isWeddingDay.toString(),
        'X-Production': isProduction.toString(),
        'X-Variables-Restored': rollbackResult.variables_restored.toString(),
        'X-Rollback-ID': rollbackResult.rollback_id,
      },
    });
  } catch (error) {
    console.error('🚨 EMERGENCY ROLLBACK FAILED:', error);

    // Critical error logging
    try {
      const headersList = await headers();
      const organizationId = headersList.get('x-organization-id');
      const userId = headersList.get('x-user-id');

      if (organizationId) {
        const supabase = createClient();
        await logCriticalSecurityEvent(supabase, organizationId, {
          event_type: 'emergency_rollback_failed',
          severity: 'CRITICAL',
          user_id: userId || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          ip_address: headersList.get('x-forwarded-for') || 'unknown',
        });
      }
    } catch (logError) {
      console.error('Failed to log critical rollback failure:', logError);
    }

    return NextResponse.json(
      {
        error: 'Emergency rollback system failure',
        message:
          error instanceof Error ? error.message : 'Unknown system error',
        emergency_contact: 'Immediately contact emergency support',
        support_phone: '+1-XXX-XXX-XXXX', // Would be real emergency number
        support_email: 'emergency@wedsync.com',
      },
      { status: 500 },
    );
  }
}

// Helper functions
async function checkEmergencyRollbackPermission(
  supabase: any,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data: userRole } = await supabase
      .from('user_organization_roles')
      .select('role, permissions')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!userRole) return false;

    return (
      ['ADMIN', 'WEDDING_DAY_EMERGENCY', 'DEPLOYMENT_MANAGER'].includes(
        userRole.role,
      ) || userRole.permissions?.includes('emergency_rollback')
    );
  } catch (error) {
    console.error('Error checking emergency rollback permission:', error);
    return false;
  }
}

async function performPreRollbackSafetyChecks(
  supabase: any,
  organizationId: string,
  environmentId: string,
  isWeddingDay: boolean,
): Promise<{
  safe_to_proceed: boolean;
  issues: string[];
  warnings: string[];
}> {
  try {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for active user sessions
    const { data: activeSessions } = await supabase
      .from('active_user_sessions')
      .select('count')
      .eq('organization_id', organizationId)
      .single();

    if (activeSessions && activeSessions.count > 0) {
      warnings.push(
        `${activeSessions.count} active user sessions - users may be affected`,
      );
    }

    // Check for ongoing deployments
    const { data: ongoingDeployments } = await supabase
      .from('deployment_sync_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('environment_id', environmentId)
      .is('completed_at', null)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (ongoingDeployments && ongoingDeployments.length > 0) {
      issues.push(
        'Ongoing deployments detected - complete or abort before rollback',
      );
    }

    // Wedding day specific checks
    if (isWeddingDay) {
      const { data: activeWeddings } = await supabase
        .from('weddings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('wedding_date', new Date().toISOString().split('T')[0]);

      if (activeWeddings && activeWeddings.length > 0) {
        warnings.push(
          `${activeWeddings.length} weddings today - exercise extreme caution`,
        );
      }
    }

    return {
      safe_to_proceed: issues.length === 0,
      issues,
      warnings,
    };
  } catch (error) {
    return {
      safe_to_proceed: false,
      issues: ['Safety check failed'],
      warnings: [],
    };
  }
}

async function logCriticalSecurityEvent(
  supabase: any,
  organizationId: string,
  event: any,
): Promise<void> {
  try {
    await supabase.from('critical_security_events').insert({
      organization_id: organizationId,
      event_type: event.event_type,
      severity: event.severity,
      user_id: event.user_id,
      event_data: {
        environment_id: event.environment_id,
        rollback_id: event.rollback_id,
        reason: event.reason,
        wedding_day: event.wedding_day,
        production_environment: event.production_environment,
        variables_restored: event.variables_restored,
        error: event.error,
        ip_address: event.ip_address,
      },
      requires_review: true,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log critical security event:', error);
  }
}

async function sendEmergencyRollbackNotifications(
  organizationId: string,
  details: any,
): Promise<void> {
  try {
    console.log('🚨 EMERGENCY ROLLBACK NOTIFICATION:', details);
    // In production, would integrate with AlertManager for immediate notifications
    // Would send SMS, email, Slack alerts, etc.
  } catch (error) {
    console.error('Failed to send emergency rollback notifications:', error);
  }
}

async function schedulePostRollbackValidation(
  supabase: any,
  organizationId: string,
  details: any,
): Promise<void> {
  try {
    await supabase.from('scheduled_validations').insert({
      organization_id: organizationId,
      validation_type: 'post_rollback',
      rollback_id: details.rollbackId,
      environment_id: details.environmentId,
      scheduled_at: details.scheduledAt.toISOString(),
      status: 'pending',
    });
  } catch (error) {
    console.error('Failed to schedule post-rollback validation:', error);
  }
}
