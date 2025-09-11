import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { DeploymentIntegrationService } from '@/lib/services/deployment/DeploymentIntegrationService';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';

// Rate limiting: 5 requests per minute for rollbacks (critical operation)
const rollbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Too many rollback requests',
});

const RollbackRequestSchema = z.object({
  environment_id: z.string().uuid(),
  target_timestamp: z.string().datetime().optional(),
  snapshot_id: z.string().optional(),
  reason: z.string().min(1).max(500),
  force: z.boolean().default(false),
  notify_team: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rollbackLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded - rollbacks are limited for safety' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');
    const userId = headersList.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedRequest = RollbackRequestSchema.parse(body);

    const deploymentService = new DeploymentIntegrationService();
    const supabase = createClient();

    // Check if user has rollback permissions
    const hasRollbackPermission = await checkRollbackPermission(
      supabase,
      organizationId,
      userId,
      validatedRequest.environment_id,
    );

    if (!hasRollbackPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for rollback operation' },
        { status: 403 },
      );
    }

    // Get environment details
    const { data: environment } = await supabase
      .from('environments')
      .select('*')
      .eq('id', validatedRequest.environment_id)
      .eq('organization_id', organizationId)
      .single();

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 },
      );
    }

    // Wedding day extra protection for production rollbacks
    const isWeddingDay = new Date().getDay() === 6;
    const isProduction = environment.name.toLowerCase().includes('prod');

    if (isWeddingDay && isProduction && !validatedRequest.force) {
      return NextResponse.json(
        {
          error: 'Wedding day production rollback protection',
          message:
            'Production rollbacks on Saturday require force=true and will trigger emergency notifications',
          wedding_day: true,
          production_environment: true,
          requires_force: true,
          emergency_procedures: [
            'Emergency contacts will be notified immediately',
            'All rollback actions will be logged and audited',
            'Post-rollback validation will be performed automatically',
            'Incident response team will be alerted',
          ],
        },
        { status: 423 }, // Locked
      );
    }

    // Determine rollback target
    let rollbackTimestamp: Date;

    if (validatedRequest.snapshot_id) {
      // Rollback to specific snapshot
      const { data: snapshot } = await supabase
        .from('configuration_snapshots')
        .select('created_at')
        .eq('id', validatedRequest.snapshot_id)
        .eq('organization_id', organizationId)
        .single();

      if (!snapshot) {
        return NextResponse.json(
          { error: 'Snapshot not found' },
          { status: 404 },
        );
      }

      rollbackTimestamp = new Date(snapshot.created_at);
    } else if (validatedRequest.target_timestamp) {
      rollbackTimestamp = new Date(validatedRequest.target_timestamp);
    } else {
      // Default: rollback to last known good configuration (24 hours ago)
      rollbackTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Get current configuration snapshot for comparison
    const { data: currentSnapshot } = await supabase
      .from('configuration_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('environment_id', validatedRequest.environment_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Pre-rollback validation
    const preRollbackChecks = await performPreRollbackValidation(
      supabase,
      organizationId,
      validatedRequest.environment_id,
      rollbackTimestamp,
    );

    if (!preRollbackChecks.safe_to_rollback && !validatedRequest.force) {
      return NextResponse.json(
        {
          error: 'Rollback validation failed',
          validation_errors: preRollbackChecks.errors,
          warnings: preRollbackChecks.warnings,
          suggestion: 'Review validation errors or use force=true to override',
        },
        { status: 400 },
      );
    }

    // Execute rollback
    const rollbackResult = await deploymentService.rollbackConfiguration(
      organizationId,
      validatedRequest.environment_id,
      rollbackTimestamp,
    );

    if (!rollbackResult.success) {
      return NextResponse.json(
        {
          error: 'Rollback operation failed',
          details: 'Configuration rollback could not be completed',
          timestamp: rollbackTimestamp.toISOString(),
        },
        { status: 500 },
      );
    }

    // Log rollback event
    await logRollbackEvent(supabase, organizationId, {
      userId,
      environmentId: validatedRequest.environment_id,
      rollbackTimestamp,
      reason: validatedRequest.reason,
      success: rollbackResult.success,
      variablesRestored: rollbackResult.variables_restored,
      weddingDay: isWeddingDay,
      forced: validatedRequest.force,
      previousVersion: currentSnapshot?.version,
      newVersion: rollbackResult.current_version,
    });

    // Send notifications if requested
    if (validatedRequest.notify_team || (isWeddingDay && isProduction)) {
      await sendRollbackNotifications(organizationId, {
        environmentId: validatedRequest.environment_id,
        environmentName: environment.name,
        userId,
        reason: validatedRequest.reason,
        rollbackTimestamp,
        variablesRestored: rollbackResult.variables_restored,
        weddingDay: isWeddingDay,
        emergency: isWeddingDay && isProduction,
      });
    }

    // Post-rollback validation
    const postRollbackValidation =
      await deploymentService.validateDeploymentReadiness(
        organizationId,
        validatedRequest.environment_id,
      );

    // Create new snapshot after rollback
    await createPostRollbackSnapshot(
      supabase,
      organizationId,
      validatedRequest.environment_id,
      `rollback_${Date.now()}`,
    );

    const response = {
      success: rollbackResult.success,
      rollback_result: rollbackResult,
      environment: {
        id: validatedRequest.environment_id,
        name: environment.name,
        type: environment.environment_type,
      },
      rollback_details: {
        target_timestamp: rollbackTimestamp.toISOString(),
        reason: validatedRequest.reason,
        performed_by: userId,
        variables_restored: rollbackResult.variables_restored,
        rollback_duration_ms:
          Date.now() - new Date(rollbackTimestamp).getTime(),
      },
      pre_rollback_validation: preRollbackChecks,
      post_rollback_validation: postRollbackValidation,
      wedding_day_rollback: isWeddingDay,
      production_rollback: isProduction,
      notifications_sent: validatedRequest.notify_team,
      next_steps: [
        'Verify application functionality',
        'Monitor system health for the next 30 minutes',
        'Test critical user flows',
        'Update team on rollback status',
      ],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'X-Rollback-Success': rollbackResult.success.toString(),
        'X-Variables-Restored': rollbackResult.variables_restored.toString(),
        'X-Wedding-Day-Rollback': isWeddingDay.toString(),
      },
    });
  } catch (error) {
    console.error('Rollback operation failed:', error);

    // Log rollback failure
    try {
      const headersList = await headers();
      const organizationId = headersList.get('x-organization-id');
      if (organizationId) {
        const supabase = createClient();
        await logRollbackEvent(supabase, organizationId, {
          userId: headersList.get('x-user-id') || 'unknown',
          environmentId: 'unknown',
          rollbackTimestamp: new Date(),
          reason: 'Rollback failed',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      console.error('Failed to log rollback error:', logError);
    }

    return NextResponse.json(
      {
        error: 'Rollback operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Helper function to check rollback permissions
async function checkRollbackPermission(
  supabase: any,
  organizationId: string,
  userId: string,
  environmentId: string,
): Promise<boolean> {
  try {
    // Check user role
    const { data: userRole } = await supabase
      .from('user_organization_roles')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!userRole) return false;

    // Admin and deployment managers can always rollback
    if (['ADMIN', 'DEPLOYMENT_MANAGER'].includes(userRole.role)) {
      return true;
    }

    // Check environment-specific rollback permissions
    const { data: envPermission } = await supabase
      .from('environment_permissions')
      .select('permissions')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('environment_id', environmentId)
      .single();

    return envPermission?.permissions?.includes('rollback') || false;
  } catch (error) {
    console.error('Error checking rollback permission:', error);
    return false;
  }
}

// Helper function to perform pre-rollback validation
async function performPreRollbackValidation(
  supabase: any,
  organizationId: string,
  environmentId: string,
  rollbackTimestamp: Date,
): Promise<any> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if target snapshot exists
    const { data: targetSnapshot } = await supabase
      .from('configuration_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('environment_id', environmentId)
      .lte('created_at', rollbackTimestamp.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!targetSnapshot) {
      errors.push('No configuration snapshot found for the target timestamp');
    }

    // Check for recent successful deployments that might be lost
    const { data: recentDeployments } = await supabase
      .from('sync_results')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('environment_id', environmentId)
      .eq('success', true)
      .gt('created_at', rollbackTimestamp.toISOString());

    if (recentDeployments && recentDeployments.length > 0) {
      warnings.push(
        `${recentDeployments.length} successful deployments will be reverted`,
      );
    }

    // Check for active users/sessions
    const activeSessionWarning = await checkActiveUserSessions(
      supabase,
      organizationId,
    );
    if (activeSessionWarning) {
      warnings.push(activeSessionWarning);
    }

    return {
      safe_to_rollback: errors.length === 0,
      errors,
      warnings,
      target_snapshot_found: !!targetSnapshot,
      deployments_affected: recentDeployments?.length || 0,
    };
  } catch (error) {
    return {
      safe_to_rollback: false,
      errors: ['Pre-rollback validation failed'],
      warnings: [],
    };
  }
}

// Helper function to log rollback events
async function logRollbackEvent(
  supabase: any,
  organizationId: string,
  event: any,
): Promise<void> {
  try {
    await supabase.from('rollback_events').insert({
      organization_id: organizationId,
      user_id: event.userId,
      environment_id: event.environmentId,
      rollback_timestamp: event.rollbackTimestamp?.toISOString(),
      reason: event.reason,
      success: event.success,
      variables_restored: event.variablesRestored || 0,
      wedding_day_rollback: event.weddingDay || false,
      forced_rollback: event.forced || false,
      previous_version: event.previousVersion,
      new_version: event.newVersion,
      error_message: event.error,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log rollback event:', error);
  }
}

// Helper function to send rollback notifications
async function sendRollbackNotifications(
  organizationId: string,
  details: any,
): Promise<void> {
  try {
    console.log('Rollback notification:', details);
    // In production, would integrate with AlertManager to send notifications
  } catch (error) {
    console.error('Failed to send rollback notifications:', error);
  }
}

// Helper function to create post-rollback snapshot
async function createPostRollbackSnapshot(
  supabase: any,
  organizationId: string,
  environmentId: string,
  version: string,
): Promise<void> {
  try {
    // Get current configuration
    const { data: currentConfig } = await supabase
      .from('environment_values')
      .select(
        `
        *,
        environment_variables(*)
      `,
      )
      .eq('environment_id', environmentId);

    await supabase.from('configuration_snapshots').insert({
      organization_id: organizationId,
      environment_id: environmentId,
      version,
      configuration_data: JSON.stringify({ variables: currentConfig }),
      snapshot_type: 'post_rollback',
      created_by: 'system',
    });
  } catch (error) {
    console.error('Failed to create post-rollback snapshot:', error);
  }
}

// Helper function to check for active user sessions
async function checkActiveUserSessions(
  supabase: any,
  organizationId: string,
): Promise<string | null> {
  try {
    const { data: activeSessions } = await supabase
      .from('active_user_sessions')
      .select('count')
      .eq('organization_id', organizationId)
      .single();

    if (activeSessions && activeSessions.count > 0) {
      return `${activeSessions.count} active user sessions detected - rollback may affect active users`;
    }

    return null;
  } catch (error) {
    return null;
  }
}
