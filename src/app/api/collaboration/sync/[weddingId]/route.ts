// WS-342: Real-Time Wedding Collaboration - Data Synchronization API
// Team B Backend Development - Batch 1 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import DataSynchronizationService from '@/lib/collaboration/data-sync';
import ConflictResolutionEngine from '@/lib/collaboration/conflict-resolver';
import {
  SyncOperation,
  SyncResult,
  DataTarget,
} from '@/lib/collaboration/types/collaboration';

// Initialize services (singleton in production)
const dataSyncService = new DataSynchronizationService();
const conflictResolver = new ConflictResolutionEngine();

interface SyncRequest {
  operations: Array<{
    id: string;
    type: 'insert' | 'update' | 'delete' | 'move';
    target: DataTarget;
    data: any;
    dependencies?: string[];
    vector_clock?: any;
  }>;
  batch_id?: string;
}

// Synchronize data changes
export async function POST(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const body: SyncRequest = await request.json();

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify active collaboration session
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'No active collaboration session' },
        { status: 403 },
      );
    }

    // Convert operations to SyncOperation format
    const syncOperations: SyncOperation[] = body.operations.map((op) => ({
      id: op.id,
      type: op.type,
      target: op.target,
      data: op.data,
      client_id: user.id,
      timestamp: new Date(),
      dependencies: op.dependencies || [],
      vector_clock: op.vector_clock || {},
    }));

    // Process each operation
    const syncResults: SyncResult[] = [];
    const allConflicts: any[] = [];

    for (const operation of syncOperations) {
      try {
        // Check permissions for this operation
        const hasPermission = await checkSyncPermission(
          operation,
          session.permissions,
        );
        if (!hasPermission) {
          syncResults.push({
            operation_id: operation.id,
            success: false,
            applied_at: new Date(),
            vector_clock: operation.vector_clock,
            error: 'Insufficient permissions',
          } as any);
          continue;
        }

        // Synchronize the operation
        const result = await dataSyncService.syncData(
          weddingId,
          operation.target.table,
          operation,
        );

        syncResults.push(result);

        // Collect conflicts if any
        if (result.conflicts) {
          allConflicts.push(...result.conflicts);
        }
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        syncResults.push({
          operation_id: operation.id,
          success: false,
          applied_at: new Date(),
          vector_clock: operation.vector_clock,
          error: error.message,
        } as any);
      }
    }

    // Detect additional conflicts between operations
    const detectedConflicts =
      await conflictResolver.detectConflicts(syncOperations);
    allConflicts.push(...detectedConflicts);

    // Resolve conflicts if any
    let conflictResolutions: any[] = [];
    if (allConflicts.length > 0) {
      try {
        conflictResolutions =
          await conflictResolver.resolveConflicts(allConflicts);

        // Apply resolutions
        for (const resolution of conflictResolutions) {
          await conflictResolver.applyResolution(resolution);
        }
      } catch (error) {
        console.error('Failed to resolve conflicts:', error);
      }
    }

    // Record sync metrics
    await recordSyncMetrics(supabase, weddingId, syncResults, allConflicts);

    return NextResponse.json(
      {
        success: true,
        sync_results: syncResults,
        conflicts:
          allConflicts.length > 0
            ? {
                detected: allConflicts.length,
                resolved: conflictResolutions.length,
                resolutions: conflictResolutions,
              }
            : null,
        batch_id: body.batch_id,
        processed_at: new Date().toISOString(),
        statistics: {
          total_operations: syncOperations.length,
          successful_operations: syncResults.filter((r) => r.success).length,
          failed_operations: syncResults.filter((r) => !r.success).length,
          conflicts_detected: allConflicts.length,
          conflicts_resolved: conflictResolutions.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Sync data error:', error);
    return NextResponse.json(
      { error: 'Failed to synchronize data' },
      { status: 500 },
    );
  }
}

// Get sync status and pending operations
export async function GET(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const { searchParams } = new URL(request.url);

    const since = searchParams.get('since');
    const table = searchParams.get('table');
    const user_id = searchParams.get('user_id');
    const conflicts_only = searchParams.get('conflicts_only') === 'true';

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify active collaboration session
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'No active collaboration session' },
        { status: 403 },
      );
    }

    if (conflicts_only) {
      // Return unresolved conflicts
      const { data: conflicts } = await supabase.rpc(
        'get_unresolved_conflicts',
        {
          p_wedding_id: weddingId,
          p_include_auto: true,
        },
      );

      return NextResponse.json(
        {
          conflicts: conflicts || [],
          conflict_count: conflicts?.length || 0,
        },
        { status: 200 },
      );
    }

    // Get recent sync operations
    let query = supabase
      .from('sync_operations')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (since) {
      query = query.gte('created_at', since);
    }

    if (table) {
      query = query.eq('target_table', table);
    }

    if (user_id) {
      query = query.eq('client_id', user_id);
    }

    const { data: operations, error: opsError } = await query;

    if (opsError) {
      console.error('Failed to get sync operations:', opsError);
      return NextResponse.json(
        { error: 'Failed to retrieve sync status' },
        { status: 500 },
      );
    }

    // Get consistency report
    const consistencyReport =
      await dataSyncService.ensureConsistency(weddingId);

    return NextResponse.json(
      {
        operations: operations || [],
        consistency: {
          is_consistent: consistencyReport.is_consistent,
          inconsistencies_count: consistencyReport.inconsistencies.length,
          repair_needed: consistencyReport.repair_needed,
          last_checked: consistencyReport.checked_at,
        },
        statistics: {
          total_operations: operations?.length || 0,
          recent_operations:
            operations?.filter(
              (op) => new Date(op.created_at) > new Date(Date.now() - 60000),
            ).length || 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 },
    );
  }
}

// Force consistency check and repair
export async function PATCH(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const body = await request.json();
    const { force_repair = false } = body;

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify session and permissions
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!session || !session.permissions.can_moderate) {
      return NextResponse.json(
        { error: 'Insufficient permissions for consistency operations' },
        { status: 403 },
      );
    }

    // Run consistency check
    const consistencyReport =
      await dataSyncService.ensureConsistency(weddingId);

    let repairResult = null;
    if (force_repair && !consistencyReport.is_consistent) {
      repairResult = await dataSyncService.repairInconsistencies(
        consistencyReport.inconsistencies,
      );
    }

    return NextResponse.json(
      {
        consistency_report: consistencyReport,
        repair_result: repairResult,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Consistency check error:', error);
    return NextResponse.json(
      { error: 'Failed to perform consistency check' },
      { status: 500 },
    );
  }
}

// Helper function to check sync permissions
async function checkSyncPermission(
  operation: SyncOperation,
  permissions: any,
): Promise<boolean> {
  const tablePermissionMap: { [table: string]: string } = {
    wedding_timeline: 'can_edit_timeline',
    budget_items: 'can_edit_budget',
    wedding_guests: 'can_manage_guests',
    documents: 'can_edit_documents',
    tasks: 'can_manage_tasks',
    photos: 'can_upload_photos',
    vendor_assignments: 'can_assign_vendors',
  };

  const requiredPermission = tablePermissionMap[operation.target.table];

  // No specific permission required
  if (!requiredPermission) return true;

  return permissions[requiredPermission] === true;
}

// Helper function to record sync metrics
async function recordSyncMetrics(
  supabase: any,
  weddingId: string,
  syncResults: SyncResult[],
  conflicts: any[],
): Promise<void> {
  try {
    await supabase.rpc('record_wedding_metric', {
      p_wedding_id: weddingId,
      p_metric_type: 'data_sync_performance',
      p_metric_value: {
        total_operations: syncResults.length,
        successful_operations: syncResults.filter((r) => r.success).length,
        failed_operations: syncResults.filter((r) => !r.success).length,
        conflicts_detected: conflicts.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to record sync metrics:', error);
  }
}
