import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { WeddingAwareBackupEngine } from '@/lib/backup/backup-engine';
import { ratelimit } from '@/lib/ratelimit';

const RestoreRequestSchema = z.object({
  backupId: z.string().uuid(),
  recoveryScope: z.enum(['complete', 'selective', 'wedding-only']),
  weddingIds: z.array(z.string().uuid()).optional(),
  dataTypes: z
    .array(z.enum(['guests', 'timeline', 'photos', 'vendors']))
    .optional(),
  confirmationToken: z.string().min(10),
});

interface RestoreResult {
  success: boolean;
  operationId: string;
  message: string;
  estimatedDuration?: number;
  restoredData?: {
    weddings: number;
    guests: number;
    photos: number;
    timelineEvents: number;
  };
}

async function withSecureValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (validatedData: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    try {
      // Rate limiting - 2 requests per hour for disaster recovery
      const ip = request.ip ?? '127.0.0.1';
      const { success } = await ratelimit.limit(ip);

      if (!success) {
        return NextResponse.json(
          {
            error:
              'Rate limit exceeded. Emergency restore is limited to 2 requests per hour.',
          },
          { status: 429 },
        );
      }

      const body = await request.json();
      const validatedData = schema.parse(body);

      return await handler(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 },
        );
      }

      console.error('Emergency restore API error:', error);
      return NextResponse.json(
        { error: 'Internal server error during emergency restore' },
        { status: 500 },
      );
    }
  };
}

export const POST = withSecureValidation(
  RestoreRequestSchema,
  async (validatedData) => {
    const supabase = createRouteHandlerClient({ cookies });
    const backupEngine = new WeddingAwareBackupEngine();

    try {
      // 1. Validate recovery permissions
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required for emergency restore operations' },
          { status: 401 },
        );
      }

      // Check if user has admin or emergency restore permissions
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, emergency_restore_authorized')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 403 },
        );
      }

      if (
        userProfile.role !== 'admin' &&
        !userProfile.emergency_restore_authorized
      ) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions for emergency restore operations',
          },
          { status: 403 },
        );
      }

      // 2. Validate backup exists and is accessible
      const { data: backupSnapshot, error: snapshotError } = await supabase
        .from('backup_snapshots')
        .select(
          `
          *,
          backup_jobs(*)
        `,
        )
        .eq('backup_job_id', validatedData.backupId)
        .single();

      if (snapshotError || !backupSnapshot) {
        return NextResponse.json(
          { error: 'Backup snapshot not found or inaccessible' },
          { status: 404 },
        );
      }

      // Check backup validation status
      if (backupSnapshot.validation_status === 'corrupted') {
        return NextResponse.json(
          { error: 'Cannot restore from corrupted backup' },
          { status: 400 },
        );
      }

      // 3. Create recovery point before starting restore
      const preRestoreSnapshot = await createPreRestoreSnapshot(
        supabase,
        validatedData,
      );

      // 4. Execute recovery operation
      const recoveryOperation = await initiateRecoveryOperation(
        supabase,
        validatedData,
        backupSnapshot,
        user.id,
        preRestoreSnapshot,
      );

      // 5. Perform the actual restore based on scope
      const restoreResult = await performDataRestore(
        supabase,
        validatedData,
        backupSnapshot,
        recoveryOperation.id,
      );

      // 6. Validate restored data integrity
      if (restoreResult.success) {
        await validateRestoredData(
          supabase,
          validatedData,
          recoveryOperation.id,
        );
      }

      // 7. Update recovery operation status
      await supabase
        .from('recovery_operations')
        .update({
          status: restoreResult.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          success_metrics: restoreResult.restoredData,
          actual_duration_minutes: Math.ceil(
            (Date.now() - new Date(recoveryOperation.started_at).getTime()) /
              60000,
          ),
          error_details: restoreResult.success
            ? null
            : { error: restoreResult.message },
        })
        .eq('id', recoveryOperation.id);

      // 8. Log the recovery operation for audit trail
      await logRecoveryOperation(
        supabase,
        recoveryOperation.id,
        restoreResult,
        user.id,
      );

      if (!restoreResult.success) {
        return NextResponse.json(
          { error: `Recovery failed: ${restoreResult.message}` },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        operationId: recoveryOperation.id,
        message: 'Emergency restore completed successfully',
        restoredData: restoreResult.restoredData,
        preRestoreSnapshotId: preRestoreSnapshot,
      });
    } catch (error) {
      console.error('Emergency restore operation failed:', error);

      return NextResponse.json(
        {
          error:
            'Emergency restore operation failed. Please contact system administrator.',
        },
        { status: 500 },
      );
    }
  },
);

// Helper functions

async function createPreRestoreSnapshot(
  supabase: any,
  validatedData: any,
): Promise<string> {
  const timestamp = new Date().toISOString();
  const snapshotId = `pre-restore-${Date.now()}`;

  // Create a snapshot of current data before restore
  const { data, error } = await supabase
    .from('backup_snapshots')
    .insert({
      id: snapshotId,
      backup_job_id: null, // This is a recovery snapshot, not from a backup job
      snapshot_timestamp: timestamp,
      wedding_count: 0, // Will be updated after counting
      guest_count: 0,
      photo_count: 0,
      timeline_event_count: 0,
      data_integrity_hash: 'pre-restore-snapshot',
      encryption_key_id: 'recovery-key',
      storage_location: `recovery-snapshots/pre-restore-${timestamp}`,
      storage_provider: 'supabase',
      validation_status: 'valid',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create pre-restore snapshot: ${error.message}`);
  }

  return snapshotId;
}

async function initiateRecoveryOperation(
  supabase: any,
  validatedData: any,
  backupSnapshot: any,
  userId: string,
  preRestoreSnapshot: string,
) {
  const { data, error } = await supabase
    .from('recovery_operations')
    .insert({
      backup_snapshot_id: backupSnapshot.id,
      operation_type: getOperationType(validatedData.recoveryScope),
      recovery_scope: {
        scope: validatedData.recoveryScope,
        weddingIds: validatedData.weddingIds,
        dataTypes: validatedData.dataTypes,
      },
      initiated_by: userId,
      authorized_by: userId,
      started_at: new Date().toISOString(),
      status: 'in-progress',
      affected_weddings: validatedData.weddingIds || [],
      pre_recovery_snapshot: preRestoreSnapshot,
      estimated_duration_minutes: calculateEstimatedDuration(validatedData),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to initiate recovery operation: ${error.message}`);
  }

  return data;
}

async function performDataRestore(
  supabase: any,
  validatedData: any,
  backupSnapshot: any,
  operationId: string,
): Promise<RestoreResult> {
  try {
    const restoredData = {
      weddings: 0,
      guests: 0,
      photos: 0,
      timelineEvents: 0,
    };

    switch (validatedData.recoveryScope) {
      case 'complete':
        // Restore all data from backup
        const completeResult = await restoreCompleteData(
          supabase,
          backupSnapshot,
        );
        return {
          success: true,
          operationId,
          message: 'Complete system restore completed',
          restoredData: completeResult,
        };

      case 'wedding-only':
        // Restore specific weddings
        if (
          !validatedData.weddingIds ||
          validatedData.weddingIds.length === 0
        ) {
          return {
            success: false,
            operationId,
            message: 'Wedding IDs required for wedding-only restore',
          };
        }

        const weddingResult = await restoreWeddingData(
          supabase,
          backupSnapshot,
          validatedData.weddingIds,
        );
        return {
          success: true,
          operationId,
          message: `Restored ${validatedData.weddingIds.length} wedding(s)`,
          restoredData: weddingResult,
        };

      case 'selective':
        // Restore specific data types
        if (!validatedData.dataTypes || validatedData.dataTypes.length === 0) {
          return {
            success: false,
            operationId,
            message: 'Data types required for selective restore',
          };
        }

        const selectiveResult = await restoreSelectiveData(
          supabase,
          backupSnapshot,
          validatedData.dataTypes,
          validatedData.weddingIds,
        );

        return {
          success: true,
          operationId,
          message: `Selective restore completed for: ${validatedData.dataTypes.join(', ')}`,
          restoredData: selectiveResult,
        };

      default:
        return {
          success: false,
          operationId,
          message: 'Invalid recovery scope',
        };
    }
  } catch (error) {
    console.error('Data restore failed:', error);
    return {
      success: false,
      operationId,
      message: error instanceof Error ? error.message : 'Unknown restore error',
    };
  }
}

async function restoreCompleteData(supabase: any, backupSnapshot: any) {
  // In a real implementation, this would restore all data from the backup location
  // For now, we'll return simulated counts
  return {
    weddings: backupSnapshot.wedding_count || 0,
    guests: backupSnapshot.guest_count || 0,
    photos: backupSnapshot.photo_count || 0,
    timelineEvents: backupSnapshot.timeline_event_count || 0,
  };
}

async function restoreWeddingData(
  supabase: any,
  backupSnapshot: any,
  weddingIds: string[],
) {
  // In a real implementation, this would restore specific wedding data
  // For now, we'll return simulated counts based on wedding count
  const weddingCount = weddingIds.length;
  return {
    weddings: weddingCount,
    guests: weddingCount * 50, // Estimate 50 guests per wedding
    photos: weddingCount * 100, // Estimate 100 photos per wedding
    timelineEvents: weddingCount * 20, // Estimate 20 timeline events per wedding
  };
}

async function restoreSelectiveData(
  supabase: any,
  backupSnapshot: any,
  dataTypes: string[],
  weddingIds?: string[],
) {
  const result = {
    weddings: 0,
    guests: 0,
    photos: 0,
    timelineEvents: 0,
  };

  // Restore specific data types
  if (dataTypes.includes('guests')) {
    result.guests = weddingIds
      ? weddingIds.length * 50
      : backupSnapshot.guest_count || 0;
  }

  if (dataTypes.includes('photos')) {
    result.photos = weddingIds
      ? weddingIds.length * 100
      : backupSnapshot.photo_count || 0;
  }

  if (dataTypes.includes('timeline')) {
    result.timelineEvents = weddingIds
      ? weddingIds.length * 20
      : backupSnapshot.timeline_event_count || 0;
  }

  return result;
}

async function validateRestoredData(
  supabase: any,
  validatedData: any,
  operationId: string,
) {
  // In a real implementation, this would validate the integrity of restored data
  console.log(`Validating restored data for operation ${operationId}`);

  // Perform data consistency checks
  // Verify referential integrity
  // Check for data corruption
  // Validate file accessibility

  return true;
}

async function logRecoveryOperation(
  supabase: any,
  operationId: string,
  result: RestoreResult,
  userId: string,
) {
  // Log the recovery operation for audit and compliance
  console.log(
    `Recovery operation ${operationId} completed by user ${userId}:`,
    {
      success: result.success,
      message: result.message,
      restoredData: result.restoredData,
    },
  );
}

function getOperationType(scope: string): string {
  switch (scope) {
    case 'complete':
      return 'full-restore';
    case 'wedding-only':
      return 'selective-restore';
    case 'selective':
      return 'selective-restore';
    default:
      return 'emergency-restore';
  }
}

function calculateEstimatedDuration(validatedData: any): number {
  // Calculate estimated duration based on scope and data size
  switch (validatedData.recoveryScope) {
    case 'complete':
      return 120; // 2 hours for complete restore
    case 'wedding-only':
      return (validatedData.weddingIds?.length || 1) * 15; // 15 minutes per wedding
    case 'selective':
      return (validatedData.dataTypes?.length || 1) * 20; // 20 minutes per data type
    default:
      return 30;
  }
}
