/**
 * WS-258: Backup Strategy Implementation System
 * Team B: Backend API Development
 *
 * Individual Backup Configuration Management API
 * Handles GET, PUT, DELETE operations for specific backup configurations
 *
 * Endpoints:
 * GET    /api/backup/configurations/:id          // Get specific backup config
 * PUT    /api/backup/configurations/:id          // Update backup configuration
 * DELETE /api/backup/configurations/:id          // Delete backup configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// =====================================================================================
// VALIDATION SCHEMAS
// =====================================================================================

const BackupConfigurationUpdateSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  backup_type: z.enum(['full', 'incremental', 'differential']).optional(),
  source_type: z
    .enum(['database', 'files', 'application', 'wedding_data'])
    .optional(),
  source_identifier: z.string().min(1).optional(),
  backup_frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  backup_schedule: z
    .object({
      hour: z.string().optional(),
      day_of_week: z.string().optional(),
      day_of_month: z.string().optional(),
      timezone: z.string().default('UTC'),
    })
    .optional(),
  retention_policy: z
    .object({
      local_retention_days: z.number().min(1).optional(),
      cloud_retention_days: z.number().min(7).optional(),
      archive_retention_days: z.number().min(30).optional(),
      legal_hold_enabled: z.boolean().optional(),
    })
    .optional(),
  encryption_enabled: z.boolean().optional(),
  compression_enabled: z.boolean().optional(),
  storage_destinations: z
    .object({
      local: z.boolean().optional(),
      cloud_primary: z.boolean().optional(),
      cloud_secondary: z.boolean().optional(),
      offsite: z.boolean().optional(),
    })
    .optional(),
  is_wedding_critical: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

// =====================================================================================
// TYPES
// =====================================================================================

interface BackupConfiguration {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  backup_type: 'full' | 'incremental' | 'differential';
  source_type: 'database' | 'files' | 'application' | 'wedding_data';
  source_identifier: string;
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  backup_schedule: Record<string, unknown>;
  retention_policy: Record<string, unknown>;
  encryption_enabled: boolean;
  encryption_key_id?: string;
  compression_enabled: boolean;
  storage_destinations: Record<string, unknown>;
  is_wedding_critical: boolean;
  is_active: boolean;
  backup_size_estimate: number;
  last_backup_at?: string;
  next_backup_at?: string;
  configuration_version: number;
  created_at: string;
  updated_at: string;
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

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('Profile lookup error:', profileError);
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
): Promise<BackupConfiguration | null> {
  const { data, error } = await supabase
    .from('backup_configurations')
    .select('*')
    .eq('id', configId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    console.error('Configuration lookup error:', error);
    return null;
  }

  return data;
}

function calculateNextBackupTime(
  frequency: string,
  schedule: Record<string, unknown>,
): Date {
  const now = new Date();
  let nextBackup = new Date(now);

  switch (frequency) {
    case 'hourly':
      nextBackup.setHours(now.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      nextBackup.setDate(now.getDate() + 1);
      nextBackup.setHours(
        parseInt((schedule.hour as string) || '2', 10),
        0,
        0,
        0,
      );
      break;
    case 'weekly':
      const dayOfWeek = parseInt((schedule.day_of_week as string) || '0', 10);
      const daysUntilNext = (7 - now.getDay() + dayOfWeek) % 7 || 7;
      nextBackup.setDate(now.getDate() + daysUntilNext);
      nextBackup.setHours(
        parseInt((schedule.hour as string) || '2', 10),
        0,
        0,
        0,
      );
      break;
    case 'monthly':
      nextBackup.setMonth(
        now.getMonth() + 1,
        parseInt((schedule.day_of_month as string) || '1', 10),
      );
      nextBackup.setHours(
        parseInt((schedule.hour as string) || '2', 10),
        0,
        0,
        0,
      );
      break;
    default:
      nextBackup.setDate(now.getDate() + 1); // Default to daily
  }

  return nextBackup;
}

// =====================================================================================
// GET - RETRIEVE SPECIFIC BACKUP CONFIGURATION
// =====================================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<
  NextResponse<
    ApiResponse<{
      configuration: BackupConfiguration;
      executions_summary: {
        total_executions: number;
        successful_executions: number;
        failed_executions: number;
        last_execution_at: string | null;
        next_execution_at: string | null;
      };
      recovery_points_summary: {
        total_recovery_points: number;
        oldest_recovery_point: string | null;
        newest_recovery_point: string | null;
        total_backup_size: number;
      };
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
          error: 'Unauthorized: Invalid authentication or organization access',
        },
        { status: 401 },
      );
    }

    const { organization_id } = userAccess;
    const configId = params.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(configId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration ID format',
        },
        { status: 400 },
      );
    }

    // Get backup configuration
    const configuration = await getBackupConfiguration(
      supabase,
      configId,
      organization_id,
    );
    if (!configuration) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup configuration not found',
        },
        { status: 404 },
      );
    }

    // Get executions summary
    const { data: executions } = await supabase
      .from('backup_executions')
      .select('execution_status, started_at, completed_at')
      .eq('backup_config_id', configId);

    const executions_summary = {
      total_executions: executions?.length || 0,
      successful_executions:
        executions?.filter((e) => e.execution_status === 'completed').length ||
        0,
      failed_executions:
        executions?.filter((e) => e.execution_status === 'failed').length || 0,
      last_execution_at:
        executions?.length > 0
          ? executions.sort(
              (a, b) =>
                new Date(b.started_at).getTime() -
                new Date(a.started_at).getTime(),
            )[0].started_at
          : null,
      next_execution_at: configuration.next_backup_at,
    };

    // Get recovery points summary
    const { data: recoveryPoints } = await supabase
      .from('recovery_points')
      .select('data_timestamp, backup_size')
      .eq('backup_config_id', configId);

    const recovery_points_summary = {
      total_recovery_points: recoveryPoints?.length || 0,
      oldest_recovery_point:
        recoveryPoints?.length > 0
          ? recoveryPoints.sort(
              (a, b) =>
                new Date(a.data_timestamp).getTime() -
                new Date(b.data_timestamp).getTime(),
            )[0].data_timestamp
          : null,
      newest_recovery_point:
        recoveryPoints?.length > 0
          ? recoveryPoints.sort(
              (a, b) =>
                new Date(b.data_timestamp).getTime() -
                new Date(a.data_timestamp).getTime(),
            )[0].data_timestamp
          : null,
      total_backup_size:
        recoveryPoints?.reduce((sum, rp) => sum + (rp.backup_size || 0), 0) ||
        0,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          configuration,
          executions_summary,
          recovery_points_summary,
        },
        message: 'Backup configuration retrieved successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/backup/configurations/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          'An unexpected error occurred while retrieving the backup configuration',
      },
      { status: 500 },
    );
  }
}

// =====================================================================================
// PUT - UPDATE BACKUP CONFIGURATION
// =====================================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<BackupConfiguration>>> {
  try {
    const supabase = await createClient();

    // Validate user authentication and authorization
    const userAccess = await validateUserAccess(supabase);
    if (!userAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid authentication or organization access',
        },
        { status: 401 },
      );
    }

    const { user, organization_id } = userAccess;
    const configId = params.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(configId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration ID format',
        },
        { status: 400 },
      );
    }

    // Get existing configuration
    const existingConfig = await getBackupConfiguration(
      supabase,
      configId,
      organization_id,
    );
    if (!existingConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup configuration not found',
        },
        { status: 404 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = BackupConfigurationUpdateSchema.safeParse(body);

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

    const updateData = validationResult.data;

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingConfig.name) {
      const { data: conflictConfig } = await supabase
        .from('backup_configurations')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('name', updateData.name)
        .neq('id', configId)
        .single();

      if (conflictConfig) {
        return NextResponse.json(
          {
            success: false,
            error: 'Configuration name already exists',
            message: `A backup configuration named "${updateData.name}" already exists in your organization`,
          },
          { status: 409 },
        );
      }
    }

    // Check if currently running backup would be affected by updates
    const { data: runningExecution } = await supabase
      .from('backup_executions')
      .select('id, execution_status')
      .eq('backup_config_id', configId)
      .in('execution_status', [
        'initializing',
        'preparing',
        'backing_up',
        'verifying',
      ])
      .single();

    if (runningExecution) {
      // Critical configuration changes should not be allowed during active backups
      const criticalFields = [
        'source_type',
        'source_identifier',
        'encryption_enabled',
        'storage_destinations',
      ];
      const hasCriticalChanges = criticalFields.some(
        (field) =>
          updateData[field as keyof typeof updateData] !== undefined &&
          updateData[field as keyof typeof updateData] !==
            existingConfig[field as keyof typeof existingConfig],
      );

      if (hasCriticalChanges) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot update critical configuration during active backup',
            message: `Backup execution ${runningExecution.id} is currently running. Wait for completion or cancel the execution before making critical changes.`,
          },
          { status: 409 },
        );
      }
    }

    // Calculate new next backup time if schedule changed
    let next_backup_at = existingConfig.next_backup_at;
    if (updateData.backup_frequency || updateData.backup_schedule) {
      const frequency =
        updateData.backup_frequency || existingConfig.backup_frequency;
      const schedule =
        updateData.backup_schedule || existingConfig.backup_schedule;
      next_backup_at = calculateNextBackupTime(
        frequency,
        schedule,
      ).toISOString();
    }

    // Prepare update data
    const updatePayload = {
      ...updateData,
      configuration_version: existingConfig.configuration_version + 1,
      next_backup_at: updateData.is_active === false ? null : next_backup_at,
    };

    // Update backup configuration
    const { data: updatedConfig, error: updateError } = await supabase
      .from('backup_configurations')
      .update(updatePayload)
      .eq('id', configId)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update backup configuration',
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    // Log the update for audit purposes
    await supabase.from('backup_system_monitoring').insert({
      organization_id,
      metric_name: 'backup_configuration_updated',
      metric_value: 1,
      metric_category: 'availability',
      context_data: {
        config_id: configId,
        config_name: updatedConfig.name,
        version_increment: existingConfig.configuration_version + 1,
        updated_fields: Object.keys(updateData),
        updated_by: user.id,
      },
      data_source: 'backup_api',
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedConfig,
        message: 'Backup configuration updated successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('PUT /api/backup/configurations/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          'An unexpected error occurred while updating the backup configuration',
      },
      { status: 500 },
    );
  }
}

// =====================================================================================
// DELETE - DELETE BACKUP CONFIGURATION
// =====================================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<{ deleted_id: string }>>> {
  try {
    const supabase = await createClient();

    // Validate user authentication and authorization
    const userAccess = await validateUserAccess(supabase);
    if (!userAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid authentication or organization access',
        },
        { status: 401 },
      );
    }

    const { user, organization_id } = userAccess;
    const configId = params.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(configId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration ID format',
        },
        { status: 400 },
      );
    }

    // Get existing configuration
    const existingConfig = await getBackupConfiguration(
      supabase,
      configId,
      organization_id,
    );
    if (!existingConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup configuration not found',
        },
        { status: 404 },
      );
    }

    // Check for running backups
    const { data: runningExecution } = await supabase
      .from('backup_executions')
      .select('id, execution_status')
      .eq('backup_config_id', configId)
      .in('execution_status', [
        'initializing',
        'preparing',
        'backing_up',
        'verifying',
      ])
      .single();

    if (runningExecution) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete configuration with active backup',
          message: `Backup execution ${runningExecution.id} is currently running. Cancel the execution before deleting the configuration.`,
        },
        { status: 409 },
      );
    }

    // Check if this is wedding-critical data and require confirmation
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    if (existingConfig.is_wedding_critical && !forceDelete) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wedding-critical configuration requires force deletion',
          message:
            'This configuration protects wedding-critical data. Add ?force=true to confirm deletion.',
        },
        { status: 400 },
      );
    }

    // Count existing recovery points and executions
    const [{ count: recoveryPointsCount }, { count: executionsCount }] =
      await Promise.all([
        supabase
          .from('recovery_points')
          .select('*', { count: 'exact', head: true })
          .eq('backup_config_id', configId),
        supabase
          .from('backup_executions')
          .select('*', { count: 'exact', head: true })
          .eq('backup_config_id', configId),
      ]);

    // Delete the backup configuration (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('backup_configurations')
      .delete()
      .eq('id', configId)
      .eq('organization_id', organization_id);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete backup configuration',
          message: deleteError.message,
        },
        { status: 500 },
      );
    }

    // Log the deletion for audit purposes
    await supabase.from('backup_system_monitoring').insert({
      organization_id,
      metric_name: 'backup_configuration_deleted',
      metric_value: 1,
      metric_category: 'availability',
      context_data: {
        config_id: configId,
        config_name: existingConfig.name,
        was_wedding_critical: existingConfig.is_wedding_critical,
        recovery_points_deleted: recoveryPointsCount || 0,
        executions_deleted: executionsCount || 0,
        deleted_by: user.id,
        force_deleted: forceDelete,
      },
      data_source: 'backup_api',
    });

    return NextResponse.json(
      {
        success: true,
        data: { deleted_id: configId },
        message: `Backup configuration deleted successfully. ${recoveryPointsCount || 0} recovery points and ${executionsCount || 0} execution records were also removed.`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('DELETE /api/backup/configurations/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          'An unexpected error occurred while deleting the backup configuration',
      },
      { status: 500 },
    );
  }
}
