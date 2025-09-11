import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { DeploymentIntegrationService } from '@/lib/services/deployment/DeploymentIntegrationService';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';

// Rate limiting: 10 requests per minute for deployment syncs
const deploymentSyncLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many deployment sync requests',
});

const SyncRequestSchema = z.object({
  target_type: z.enum(['github_actions', 'vercel', 'docker', 'kubernetes']),
  target_id: z.string(),
  environment_id: z.string().uuid(),
  variables: z.array(z.string().uuid()).optional(),
  force: z.boolean().default(false),
  dry_run: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await deploymentSyncLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitResult.message,
          retry_after: Math.ceil(rateLimitResult.retryAfter / 1000),
        },
        { status: 429 },
      );
    }

    // Get authentication context
    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');
    const userId = headersList.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check if it's wedding day (Saturday)
    const isWeddingDay = new Date().getDay() === 6;
    const body = await request.json();
    const { force } = body;

    // Wedding day protection - block non-emergency deployments
    if (isWeddingDay && !force) {
      return NextResponse.json(
        {
          error: 'Wedding day protection active',
          message:
            'Deployments are restricted on Saturdays to protect wedding operations. Use force=true for emergency deployments only.',
          wedding_day: true,
          requires_force: true,
        },
        { status: 423 }, // Locked
      );
    }

    // Validate request body
    const validatedRequest = SyncRequestSchema.parse(body);

    const deploymentService = new DeploymentIntegrationService();
    const supabase = createClient();

    // Check deployment target exists and is enabled
    const { data: deploymentTarget } = await supabase
      .from('deployment_targets')
      .select('*')
      .eq('target_id', validatedRequest.target_id)
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .single();

    if (!deploymentTarget) {
      return NextResponse.json(
        { error: 'Deployment target not found or disabled' },
        { status: 404 },
      );
    }

    // Check user permissions for deployment
    const hasDeploymentPermission = await checkDeploymentPermission(
      supabase,
      organizationId,
      userId,
      validatedRequest.environment_id,
    );

    if (!hasDeploymentPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for deployment' },
        { status: 403 },
      );
    }

    // Pre-deployment validation (unless forced)
    if (!validatedRequest.force && !validatedRequest.dry_run) {
      const validation = await deploymentService.validateDeploymentReadiness(
        organizationId,
        validatedRequest.environment_id,
      );

      if (!validation.deployment_readiness) {
        return NextResponse.json(
          {
            error: 'Deployment validation failed',
            validation_result: validation,
            suggestion: 'Fix validation issues or use force=true to override',
          },
          { status: 400 },
        );
      }
    }

    let syncResult;

    // Route to appropriate deployment integration
    switch (validatedRequest.target_type) {
      case 'github_actions':
        syncResult = await deploymentService.syncToGitHubActions(
          organizationId,
          validatedRequest,
        );
        break;

      case 'vercel':
        syncResult = await deploymentService.syncToVercel(
          organizationId,
          validatedRequest,
        );
        break;

      case 'docker':
        // For Docker, generate env file instead of direct sync
        const envFileContent = await deploymentService.generateDockerEnvFile(
          organizationId,
          validatedRequest.environment_id,
        );
        return NextResponse.json({
          success: true,
          target_type: 'docker',
          environment_id: validatedRequest.environment_id,
          docker_env_file: envFileContent,
          instructions: [
            'Save the env file content to your Docker container',
            'Use docker run --env-file .env or docker-compose env_file configuration',
            'Never commit .env files to version control',
          ],
        });

      case 'kubernetes':
        // Get variables for Kubernetes sync
        const { data: variables } = await supabase
          .from('environment_variables')
          .select(
            `
            *,
            environment_values!inner(value, is_encrypted)
          `,
          )
          .eq('organization_id', organizationId)
          .eq(
            'environment_values.environment_id',
            validatedRequest.environment_id,
          )
          .eq('is_active', true);

        syncResult = await deploymentService.syncToKubernetes(
          organizationId,
          validatedRequest.environment_id,
          variables || [],
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported deployment target type' },
          { status: 400 },
        );
    }

    // Log deployment sync event
    await logDeploymentSync(supabase, organizationId, {
      userId,
      targetType: validatedRequest.target_type,
      targetId: validatedRequest.target_id,
      environmentId: validatedRequest.environment_id,
      success: syncResult.success,
      weddingDay: isWeddingDay,
      forced: force || false,
      dryRun: validatedRequest.dry_run,
    });

    // Send notification for production deployments
    if (deploymentTarget.configuration?.notify_on_sync && syncResult.success) {
      await sendDeploymentNotification(organizationId, {
        type: 'deployment_sync_success',
        targetType: validatedRequest.target_type,
        environmentId: validatedRequest.environment_id,
        variablesSynced: syncResult.variables_synced,
      });
    }

    const response = {
      success: syncResult.success,
      sync_result: syncResult,
      deployment_target: {
        id: deploymentTarget.target_id,
        type: deploymentTarget.type,
        name: deploymentTarget.name,
      },
      environment_id: validatedRequest.environment_id,
      wedding_day_deployment: isWeddingDay,
      forced_deployment: force || false,
      dry_run: validatedRequest.dry_run,
      timestamp: new Date().toISOString(),
    };

    const httpStatus = syncResult.success
      ? 200
      : syncResult.variables_failed > 0
        ? 207 // Multi-status
        : 500;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'X-Sync-Success': syncResult.success.toString(),
        'X-Variables-Synced': syncResult.variables_synced.toString(),
        'X-Sync-Duration': syncResult.sync_duration_ms.toString(),
      },
    });
  } catch (error) {
    console.error('Deployment sync failed:', error);

    // Try to log the failure
    try {
      const headersList = await headers();
      const organizationId = headersList.get('x-organization-id');
      if (organizationId) {
        const supabase = createClient();
        await logDeploymentSync(supabase, organizationId, {
          userId: headersList.get('x-user-id') || 'unknown',
          targetType: 'unknown',
          targetId: 'unknown',
          environmentId: 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      console.error('Failed to log deployment error:', logError);
    }

    return NextResponse.json(
      {
        error: 'Deployment sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Helper function to check deployment permissions
async function checkDeploymentPermission(
  supabase: any,
  organizationId: string,
  userId: string,
  environmentId: string,
): Promise<boolean> {
  try {
    // Check user role and permissions
    const { data: userRole } = await supabase
      .from('user_organization_roles')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!userRole) {
      return false;
    }

    // Admin and deployment roles can deploy
    if (['ADMIN', 'DEPLOYMENT_MANAGER'].includes(userRole.role)) {
      return true;
    }

    // Check environment-specific permissions
    const { data: envPermission } = await supabase
      .from('environment_permissions')
      .select('permissions')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('environment_id', environmentId)
      .single();

    return envPermission?.permissions?.includes('deploy') || false;
  } catch (error) {
    console.error('Error checking deployment permission:', error);
    return false;
  }
}

// Helper function to log deployment sync events
async function logDeploymentSync(
  supabase: any,
  organizationId: string,
  event: any,
): Promise<void> {
  try {
    await supabase.from('deployment_sync_logs').insert({
      organization_id: organizationId,
      user_id: event.userId,
      target_type: event.targetType,
      target_id: event.targetId,
      environment_id: event.environmentId,
      success: event.success,
      wedding_day_deployment: event.weddingDay || false,
      forced_deployment: event.forced || false,
      dry_run: event.dryRun || false,
      error_message: event.error,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log deployment sync:', error);
  }
}

// Helper function to send deployment notifications
async function sendDeploymentNotification(
  organizationId: string,
  notification: any,
): Promise<void> {
  try {
    // This would integrate with the AlertManager for notifications
    console.log('Deployment notification:', notification);
    // In production, would send actual notifications via email/Slack/etc.
  } catch (error) {
    console.error('Failed to send deployment notification:', error);
  }
}
