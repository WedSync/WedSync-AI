/**
 * WS-342 Real-Time Wedding Collaboration - Wedding Integration Sync API
 * Team C: Integration & System Architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RealTimeSyncOrchestrator } from '@/lib/integrations/real-time-sync-orchestrator';
import { vendorIntegrationManager } from '@/lib/integrations/vendor-integration-manager';
import { z } from 'zod';

// Validation schema
const SyncRequestSchema = z.object({
  systems: z.array(z.string()).optional(),
  syncType: z.enum([
    'full',
    'incremental',
    'vendor_updates',
    'timeline_update',
    'payment_update',
  ]),
  forceSync: z.boolean().optional().default(false),
  priority: z
    .enum(['low', 'normal', 'high', 'critical'])
    .optional()
    .default('normal'),
});

const syncOrchestrator = new RealTimeSyncOrchestrator();

export async function POST(
  req: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    console.log(
      `🔄 Triggering integration sync for wedding: ${params.weddingId}`,
    );

    // Validate wedding ID format
    if (!params.weddingId || params.weddingId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid wedding ID format' },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = SyncRequestSchema.parse(body);

    // Get authenticated user
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 },
      );
    }

    // Verify user has access to this wedding
    const { data: weddingAccess } = await supabase
      .from('wedding_access')
      .select('role')
      .eq('wedding_id', params.weddingId)
      .eq('user_id', user.id)
      .single();

    if (!weddingAccess) {
      return NextResponse.json(
        { error: 'Access denied to this wedding' },
        { status: 403 },
      );
    }

    // Get wedding details
    const { data: wedding } = await supabase
      .from('weddings')
      .select('wedding_date, status')
      .eq('id', params.weddingId)
      .single();

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    // Check if it's wedding day (higher priority)
    const weddingDate = new Date(wedding.wedding_date);
    const isWeddingDay = isToday(weddingDate);
    const effectivePriority = isWeddingDay
      ? 'critical'
      : validatedData.priority;

    // Get systems to sync
    let systemsToSync = validatedData.systems;
    if (!systemsToSync || systemsToSync.length === 0) {
      // Get all active integrations for this wedding
      const { data: integrations } = await supabase
        .from('wedding_vendor_integrations')
        .select('vendor_integration_id')
        .eq('wedding_id', params.weddingId)
        .eq('status', 'active');

      systemsToSync = integrations?.map((i) => i.vendor_integration_id) || [];
    }

    if (systemsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No integrated systems found for this wedding',
        syncResults: [],
      });
    }

    // Create collaboration event for sync
    const collaborationEvent = {
      id: `sync_${params.weddingId}_${Date.now()}`,
      weddingId: params.weddingId,
      eventType: getEventTypeFromSyncType(validatedData.syncType),
      data: {
        syncType: validatedData.syncType,
        forceSync: validatedData.forceSync,
        requestedSystems: systemsToSync,
      },
      priority: effectivePriority,
      timestamp: new Date(),
      initiatedBy: user.id,
      affectedSystems: systemsToSync,
    };

    // Execute cross-system sync
    const syncResults =
      await syncOrchestrator.orchestrateCrossSystemSync(collaborationEvent);

    // Extract conflicts for response
    const conflicts = syncResults
      .filter((result) => result.conflicts && result.conflicts.length > 0)
      .flatMap((result) => result.conflicts!);

    // Calculate sync summary
    const totalRecords = syncResults.reduce(
      (sum, result) => sum + result.syncedRecords,
      0,
    );
    const successfulSyncs = syncResults.filter(
      (result) => result.success,
    ).length;
    const failedSyncs = syncResults.length - successfulSyncs;

    // Store sync history
    await supabase.from('integration_sync_log').insert({
      wedding_id: params.weddingId,
      sync_type: validatedData.syncType,
      systems_synced: systemsToSync,
      records_synced: totalRecords,
      success: failedSyncs === 0,
      conflicts_detected: conflicts.length,
      initiated_by: user.id,
      sync_results: syncResults,
    });

    console.log(
      `✅ Sync completed: ${successfulSyncs}/${syncResults.length} systems successful`,
    );

    return NextResponse.json({
      success: true,
      syncResults: {
        totalSystems: systemsToSync.length,
        successfulSyncs,
        failedSyncs,
        totalRecords,
        conflictsDetected: conflicts.length,
        duration: syncResults.reduce((sum, result) => sum + result.duration, 0),
      },
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      details: syncResults.map((result) => ({
        success: result.success,
        recordsProcessed: result.syncedRecords,
        duration: result.duration,
        errors: result.errors,
      })),
    });
  } catch (error) {
    console.error('❌ Integration sync failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Sync operation failed' },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get authenticated user
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this wedding
    const { data: weddingAccess } = await supabase
      .from('wedding_access')
      .select('role')
      .eq('wedding_id', params.weddingId)
      .eq('user_id', user.id)
      .single();

    if (!weddingAccess) {
      return NextResponse.json(
        { error: 'Access denied to this wedding' },
        { status: 403 },
      );
    }

    // Get sync history
    const { data: syncHistory, error } = await supabase
      .from('integration_sync_log')
      .select('*')
      .eq('wedding_id', params.weddingId)
      .order('synced_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get integration status
    const integrationStatus =
      await vendorIntegrationManager.getWeddingIntegrationStatus(
        params.weddingId,
      );

    // Get active data flows
    const activeFlows = await syncOrchestrator.getActiveDataFlows(
      params.weddingId,
    );

    // Get last sync time
    const lastSync = await syncOrchestrator.getLastSyncTime(params.weddingId);

    return NextResponse.json({
      success: true,
      integrationStatus: {
        ...integrationStatus,
        lastSync,
        activeFlows: activeFlows.length,
        totalIntegrations: integrationStatus.integrations.length,
      },
      syncHistory: syncHistory || [],
      pagination: {
        limit,
        offset,
        hasMore: (syncHistory?.length || 0) === limit,
      },
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 },
    );
  }
}

// Helper functions
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getEventTypeFromSyncType(syncType: string): any {
  const eventTypeMap: Record<string, string> = {
    full: 'wedding_timeline_update',
    incremental: 'vendor_status_change',
    vendor_updates: 'vendor_status_change',
    timeline_update: 'wedding_timeline_update',
    payment_update: 'payment_status_change',
  };

  return eventTypeMap[syncType] || 'vendor_status_change';
}
