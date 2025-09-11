/**
 * WS-258: Backup Strategy Implementation System
 * Team B: Backend API Development
 *
 * Backup Execution API
 * Handles immediate backup execution requests
 *
 * Endpoints:
 * POST   /api/backup/execute                     // Execute immediate backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { BackupOrchestrationService } from '@/lib/services/backup/BackupOrchestrationService';

// =====================================================================================
// VALIDATION SCHEMAS
// =====================================================================================

const BackupExecutionSchema = z.object({
  backup_config_id: z.string().uuid(),
  execution_type: z.enum(['manual', 'emergency', 'test']).default('manual'),
  execution_priority: z
    .enum(['low', 'normal', 'high', 'critical'])
    .default('normal'),
  override_schedule: z.boolean().default(false), // Allow execution even if not scheduled
  backup_options: z
    .object({
      verify_integrity: z.boolean().default(true),
      compress_data: z.boolean().optional(),
      encrypt_data: z.boolean().optional(),
      storage_tiers: z
        .array(z.enum(['local', 'cloud_primary', 'cloud_secondary', 'offsite']))
        .optional(),
    })
    .optional()
    .default({}),
  notification_settings: z
    .object({
      notify_on_completion: z.boolean().default(true),
      notify_on_failure: z.boolean().default(true),
      notification_channels: z
        .array(z.enum(['email', 'sms', 'webhook']))
        .default(['email']),
    })
    .optional()
    .default({}),
});

// =====================================================================================
// TYPES
// =====================================================================================

interface BackupExecution {
  id: string;
  backup_config_id: string;
  execution_type: 'scheduled' | 'manual' | 'emergency' | 'test';
  execution_status:
    | 'initializing'
    | 'preparing'
    | 'backing_up'
    | 'verifying'
    | 'completed'
    | 'failed'
    | 'cancelled';
  execution_priority: 'low' | 'normal' | 'high' | 'critical';
  backup_size_estimate: number;
  backup_size_actual: number;
  compression_ratio: number;
  duration_seconds: number;
  progress_percentage: number;
  error_message?: string;
  error_code?: string;
  retry_count: number;
  max_retries: number;
  verification_status?: 'pending' | 'verified' | 'failed' | 'skipped';
  verification_hash?: string;
  backup_locations: Array<Record<string, unknown>>;
  recovery_point_created: boolean;
  completion_details: Record<string, unknown>;
  performance_metrics: Record<string, unknown>;
  started_by?: string;
  started_at: string;
  completed_at?: string;
  failed_at?: string;
  cancelled_at?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

async function validateUserAccess(
  supabase: any,
): Promise<{ user: any; organization_id: string } | null> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return null;
    }

    // Get user's organization and role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('Profile lookup error:', profileError);
      return null;
    }

    // Check if user has backup execution permissions
    const allowedRoles = ['admin', 'owner', 'backup_admin', 'backup_operator'];
    if (!allowedRoles.includes(profile.role)) {
      console.error(
        'Insufficient permissions for backup execution:',
        profile.role,
      );
      return null;
    }

    return { user, organization_id: profile.organization_id };
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
}

async function getBackupConfiguration(
  supabase: any,
  configId: string,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from('backup_configurations')
    .select('*')
    .eq('id', configId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Configuration lookup error:', error);
    return null;
  }

  return data;
}

async function checkConcurrentExecutions(
  supabase: any,
  configId: string,
  organizationId: string,
  priority: string,
): Promise<{ canExecute: boolean; reason?: string }> {
  // Check for running executions on the same configuration
  const { data: runningExecutions } = await supabase
    .from('backup_executions')
    .select('id, execution_status, execution_priority')
    .eq('backup_config_id', configId)
    .in('execution_status', [
      'initializing',
      'preparing',
      'backing_up',
      'verifying',
    ]);

  if (runningExecutions && runningExecutions.length > 0) {
    const runningExecution = runningExecutions[0];

    // Allow higher priority executions to proceed (they will cancel lower priority ones)
    const priorityLevels = { low: 1, normal: 2, high: 3, critical: 4 };
    const currentPriority =
      priorityLevels[priority as keyof typeof priorityLevels];
    const runningPriority =
      priorityLevels[
        runningExecution.execution_priority as keyof typeof priorityLevels
      ];

    if (currentPriority <= runningPriority) {
      return {
        canExecute: false,
        reason: `Backup execution ${runningExecution.id} with ${runningExecution.execution_priority} priority is currently running`,
      };
    }
  }

  // Check organization-wide concurrent execution limits
  const { data: orgExecutions } = await supabase
    .from('backup_executions')
    .select('id, execution_priority')
    .eq('organization_id', organizationId)
    .in('execution_status', [
      'initializing',
      'preparing',
      'backing_up',
      'verifying',
    ]);

  // Wedding-critical and critical priority backups always get through
  if (priority === 'critical') {
    return { canExecute: true };
  }

  // Limit concurrent executions based on organization tier (simplified logic)
  const maxConcurrentExecutions = 10; // This would be dynamic based on organization tier
  if (orgExecutions && orgExecutions.length >= maxConcurrentExecutions) {
    return {
      canExecute: false,
      reason: `Organization has reached maximum concurrent backup limit (${maxConcurrentExecutions})`,
    };
  }

  return { canExecute: true };
}

// =====================================================================================
// POST - EXECUTE IMMEDIATE BACKUP
// =====================================================================================

export async function POST(request: NextRequest): Promise<
  NextResponse<
    ApiResponse<{
      execution: BackupExecution;
      estimated_duration_minutes: number;
      monitoring_url: string;
      websocket_url?: string;
    }>
  >
> {
  try {
    const supabase = await createClient();

    // Validate user authentication and authorization
    const userAccess = await validateUserAccess(supabase);
    if (!userAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized: Invalid authentication or insufficient permissions for backup execution',
        },
        { status: 401 },
      );
    }

    const { user, organization_id } = userAccess;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = BackupExecutionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validationResult.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', '),
        },
        { status: 400 },
      );
    }

    const executionData = validationResult.data;

    // Get and validate backup configuration
    const backupConfig = await getBackupConfiguration(
      supabase,
      executionData.backup_config_id,
      organization_id,
    );
    if (!backupConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup configuration not found or inactive',
          message:
            'The specified backup configuration does not exist or has been deactivated',
        },
        { status: 404 },
      );
    }

    // Check for concurrent executions and priority handling
    const concurrencyCheck = await checkConcurrentExecutions(
      supabase,
      executionData.backup_config_id,
      organization_id,
      executionData.execution_priority,
    );

    if (!concurrencyCheck.canExecute) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup execution blocked',
          message: concurrencyCheck.reason,
        },
        { status: 409 },
      );
    }

    // Validate schedule override for non-emergency executions
    if (
      !executionData.override_schedule &&
      executionData.execution_type !== 'emergency'
    ) {
      const now = new Date();
      const nextScheduled = new Date(backupConfig.next_backup_at);
      const timeDifference = nextScheduled.getTime() - now.getTime();
      const hoursUntilScheduled = timeDifference / (1000 * 60 * 60);

      // Only allow manual execution if within 2 hours of scheduled time
      if (hoursUntilScheduled > 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Backup not scheduled for execution',
            message: `Next scheduled backup is in ${Math.round(hoursUntilScheduled)} hours. Use override_schedule=true to force execution.`,
          },
          { status: 400 },
        );
      }
    }

    // Initialize backup orchestration service
    const orchestrationService = new BackupOrchestrationService();

    // Create backup execution record
    const executionId = crypto.randomUUID();

    const { data: execution, error: insertError } = await supabase
      .from('backup_executions')
      .insert({
        id: executionId,
        backup_config_id: executionData.backup_config_id,
        execution_type: executionData.execution_type,
        execution_status: 'initializing',
        execution_priority: executionData.execution_priority,
        backup_size_estimate:
          await orchestrationService.estimateBackupSize(backupConfig),
        started_by: user.id,
        started_at: new Date().toISOString(),
        max_retries: executionData.execution_type === 'emergency' ? 5 : 3,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create backup execution record:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initialize backup execution',
          message: insertError.message,
        },
        { status: 500 },
      );
    }

    // Calculate estimated duration based on configuration and historical data
    const { data: historicalExecutions } = await supabase
      .from('backup_executions')
      .select('duration_seconds')
      .eq('backup_config_id', executionData.backup_config_id)
      .eq('execution_status', 'completed')
      .order('started_at', { ascending: false })
      .limit(5);

    let estimatedDurationMinutes = 30; // Default estimate
    if (historicalExecutions && historicalExecutions.length > 0) {
      const avgDuration =
        historicalExecutions.reduce(
          (sum, exec) => sum + exec.duration_seconds,
          0,
        ) / historicalExecutions.length;
      estimatedDurationMinutes = Math.ceil(avgDuration / 60);
    }

    // Start backup execution asynchronously
    try {
      await orchestrationService.executeBackup(executionData.backup_config_id, {
        executionType: executionData.execution_type,
        priority: executionData.execution_priority,
        startedBy: user.id,
        backupOptions: executionData.backup_options,
        notificationSettings: executionData.notification_settings,
      });
    } catch (orchestrationError) {
      // Update execution status to failed if orchestration fails to start
      await supabase
        .from('backup_executions')
        .update({
          execution_status: 'failed',
          error_message: `Failed to start backup orchestration: ${orchestrationError}`,
          error_code: 'ORCHESTRATION_START_FAILED',
          failed_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to start backup execution',
          message: `Backup orchestration failed to start: ${orchestrationError}`,
        },
        { status: 500 },
      );
    }

    // Log the execution for monitoring
    await supabase.from('backup_system_monitoring').insert({
      organization_id,
      metric_name: 'backup_execution_started',
      metric_value: 1,
      metric_category: 'performance',
      context_data: {
        execution_id: executionId,
        config_id: executionData.backup_config_id,
        config_name: backupConfig.name,
        execution_type: executionData.execution_type,
        execution_priority: executionData.execution_priority,
        is_wedding_critical: backupConfig.is_wedding_critical,
        started_by: user.id,
      },
      data_source: 'backup_api',
    });

    // Generate monitoring and WebSocket URLs
    const baseUrl = new URL(request.url).origin;
    const monitoringUrl = `${baseUrl}/api/backup/progress/${executionId}`;
    const websocketUrl = `${baseUrl.replace(/^http/, 'ws')}/api/backup/monitoring?execution_id=${executionId}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          execution,
          estimated_duration_minutes: estimatedDurationMinutes,
          monitoring_url: monitoringUrl,
          websocket_url: websocketUrl,
        },
        message: 'Backup execution started successfully',
      },
      { status: 202 },
    ); // 202 Accepted for async operation
  } catch (error) {
    console.error('POST /api/backup/execute error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          'An unexpected error occurred while starting the backup execution',
      },
      { status: 500 },
    );
  }
}
