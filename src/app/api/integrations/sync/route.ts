import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { VendorIntegrationManager } from '@/lib/integrations/vendor-integration-manager';
import { RealTimeSyncOrchestrator } from '@/lib/integrations/real-time-sync-orchestrator';
import { z } from 'zod';

// Request validation schemas
const SyncRequestSchema = z.object({
  integrationId: z.string().min(1),
  syncType: z.enum(['full', 'incremental', 'force']).default('incremental'),
  dataTypes: z
    .array(
      z.enum(['contacts', 'events', 'invoices', 'projects', 'communications']),
    )
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

const BulkSyncRequestSchema = z.object({
  weddingId: z.string().min(1),
  integrationIds: z.array(z.string()).optional(), // If not provided, sync all for wedding
  syncType: z.enum(['full', 'incremental', 'force']).default('incremental'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

// Initialize services
const integrationManager = new VendorIntegrationManager();
const syncOrchestrator = new RealTimeSyncOrchestrator();

/**
 * GET /api/integrations/sync - Get sync status for integrations
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const weddingId = searchParams.get('weddingId');
    const status = searchParams.get('status');

    // Build query for sync status
    let query = supabase
      .from('sync_sessions')
      .select(
        `
        *,
        integrations:integration_id (
          id,
          integration_type,
          vendor_id,
          wedding_id,
          status
        )
      `,
      )
      .eq('integrations.created_by', user.id);

    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }

    if (weddingId) {
      query = query.eq('integrations.wedding_id', weddingId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: syncSessions, error } = await query
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Sync status query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sync status' },
        { status: 500 },
      );
    }

    // Transform data for API response
    const transformedSessions =
      syncSessions?.map((session) => ({
        id: session.id,
        integrationId: session.integration_id,
        status: session.status,
        syncType: session.sync_type,
        dataTypes: session.data_types,
        priority: session.priority,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        duration: session.duration_ms,
        recordsProcessed: session.records_processed,
        recordsUpdated: session.records_updated,
        recordsCreated: session.records_created,
        recordsDeleted: session.records_deleted,
        errorCount: session.error_count,
        errorMessage: session.error_message,
        integration: session.integrations
          ? {
              id: session.integrations.id,
              type: session.integrations.integration_type,
              vendorId: session.integrations.vendor_id,
              weddingId: session.integrations.wedding_id,
              status: session.integrations.status,
            }
          : null,
      })) || [];

    return NextResponse.json({
      success: true,
      syncSessions: transformedSessions,
      total: transformedSessions.length,
    });
  } catch (error) {
    console.error('GET /api/integrations/sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/integrations/sync - Trigger sync for specific integration
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = SyncRequestSchema.parse(body);

    // Verify integration belongs to user
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', validatedData.integrationId)
      .eq('created_by', user.id)
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 403 },
      );
    }

    // Check if there's already a running sync for this integration
    const { data: runningSyncs, error: runningError } = await supabase
      .from('sync_sessions')
      .select('id')
      .eq('integration_id', validatedData.integrationId)
      .eq('status', 'running')
      .limit(1);

    if (runningError) {
      console.error('Running sync check error:', runningError);
      return NextResponse.json(
        { error: 'Failed to check sync status' },
        { status: 500 },
      );
    }

    if (
      runningSyncs &&
      runningSyncs.length > 0 &&
      validatedData.syncType !== 'force'
    ) {
      return NextResponse.json(
        { error: 'Sync already in progress for this integration' },
        { status: 409 },
      );
    }

    // Create sync session record
    const { data: syncSession, error: sessionError } = await supabase
      .from('sync_sessions')
      .insert({
        integration_id: validatedData.integrationId,
        status: 'queued',
        sync_type: validatedData.syncType,
        data_types: validatedData.dataTypes || [],
        priority: validatedData.priority,
        started_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (sessionError || !syncSession) {
      console.error('Sync session creation error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create sync session' },
        { status: 500 },
      );
    }

    // Check if this is a wedding day - if so, use emergency priority
    const isWeddingDay = await checkWeddingDay(
      supabase,
      integration.wedding_id,
    );
    const finalPriority = isWeddingDay ? 'critical' : validatedData.priority;

    // Trigger sync via orchestrator
    const syncResult = await syncOrchestrator.orchestrateSync({
      integrationId: validatedData.integrationId,
      sessionId: syncSession.id,
      eventType: 'manual_trigger',
      priority: finalPriority,
      sourceSystem: 'api',
      syncType: validatedData.syncType,
      dataTypes: validatedData.dataTypes,
      timestamp: new Date(),
    });

    if (!syncResult.success) {
      // Update session with error
      await supabase
        .from('sync_sessions')
        .update({
          status: 'failed',
          error_message: syncResult.error,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(syncSession.started_at).getTime(),
        })
        .eq('id', syncSession.id);

      return NextResponse.json({ error: syncResult.error }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        syncSessionId: syncSession.id,
        estimatedDuration: syncResult.estimatedDuration,
        priority: finalPriority,
        isWeddingDay,
        message: isWeddingDay
          ? 'Wedding day sync triggered with critical priority'
          : 'Sync triggered successfully',
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('POST /api/integrations/sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/integrations/sync - Trigger bulk sync for wedding integrations
 */
export async function PUT(request: NextRequest) {
  try {
    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = BulkSyncRequestSchema.parse(body);

    // Get integrations to sync
    let query = supabase
      .from('integrations')
      .select('*')
      .eq('wedding_id', validatedData.weddingId)
      .eq('created_by', user.id)
      .eq('status', 'active');

    if (validatedData.integrationIds) {
      query = query.in('id', validatedData.integrationIds);
    }

    const { data: integrations, error: integrationsError } = await query;

    if (integrationsError) {
      console.error('Integrations query error:', integrationsError);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 },
      );
    }

    if (!integrations || integrations.length === 0) {
      return NextResponse.json(
        { error: 'No integrations found for this wedding' },
        { status: 404 },
      );
    }

    // Check if this is a wedding day
    const isWeddingDay = await checkWeddingDay(
      supabase,
      validatedData.weddingId,
    );
    const finalPriority = isWeddingDay ? 'critical' : validatedData.priority;

    // Create sync sessions for all integrations
    const syncSessions: any[] = [];
    const failedSessions: string[] = [];

    for (const integration of integrations) {
      try {
        // Check for running syncs unless force sync
        if (validatedData.syncType !== 'force') {
          const { data: runningSyncs } = await supabase
            .from('sync_sessions')
            .select('id')
            .eq('integration_id', integration.id)
            .eq('status', 'running')
            .limit(1);

          if (runningSyncs && runningSyncs.length > 0) {
            failedSessions.push(
              `Integration ${integration.id}: Sync already running`,
            );
            continue;
          }
        }

        // Create sync session
        const { data: syncSession, error: sessionError } = await supabase
          .from('sync_sessions')
          .insert({
            integration_id: integration.id,
            status: 'queued',
            sync_type: validatedData.syncType,
            data_types: [],
            priority: finalPriority,
            started_at: new Date().toISOString(),
            created_by: user.id,
          })
          .select()
          .single();

        if (sessionError || !syncSession) {
          failedSessions.push(
            `Integration ${integration.id}: Failed to create session`,
          );
          continue;
        }

        // Trigger sync
        const syncResult = await syncOrchestrator.orchestrateSync({
          integrationId: integration.id,
          sessionId: syncSession.id,
          eventType: 'bulk_sync',
          priority: finalPriority,
          sourceSystem: 'api',
          syncType: validatedData.syncType,
          timestamp: new Date(),
        });

        if (syncResult.success) {
          syncSessions.push({
            integrationId: integration.id,
            sessionId: syncSession.id,
            integrationType: integration.integration_type,
            status: 'queued',
          });
        } else {
          // Update session with error
          await supabase
            .from('sync_sessions')
            .update({
              status: 'failed',
              error_message: syncResult.error,
              completed_at: new Date().toISOString(),
              duration_ms:
                Date.now() - new Date(syncSession.started_at).getTime(),
            })
            .eq('id', syncSession.id);

          failedSessions.push(
            `Integration ${integration.id}: ${syncResult.error}`,
          );
        }
      } catch (error) {
        failedSessions.push(`Integration ${integration.id}: Unexpected error`);
      }
    }

    return NextResponse.json({
      success: true,
      weddingId: validatedData.weddingId,
      syncSessions,
      failedSessions,
      totalTriggered: syncSessions.length,
      totalFailed: failedSessions.length,
      isWeddingDay,
      priority: finalPriority,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('PUT /api/integrations/sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/integrations/sync - Cancel running sync
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncSessionId = searchParams.get('syncSessionId');

    if (!syncSessionId) {
      return NextResponse.json(
        { error: 'Sync session ID is required' },
        { status: 400 },
      );
    }

    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify sync session belongs to user
    const { data: syncSession, error: sessionError } = await supabase
      .from('sync_sessions')
      .select('*, integrations!inner(*)')
      .eq('id', syncSessionId)
      .eq('integrations.created_by', user.id)
      .single();

    if (sessionError || !syncSession) {
      return NextResponse.json(
        { error: 'Sync session not found or access denied' },
        { status: 403 },
      );
    }

    // Check if sync is in a cancellable state
    if (!['queued', 'running'].includes(syncSession.status)) {
      return NextResponse.json(
        { error: `Cannot cancel sync in ${syncSession.status} state` },
        { status: 400 },
      );
    }

    // Cancel sync via orchestrator
    const cancelResult = await syncOrchestrator.cancelSync(syncSessionId);

    if (cancelResult.success) {
      // Update sync session status
      await supabase
        .from('sync_sessions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(syncSession.started_at).getTime(),
          error_message: 'Cancelled by user request',
        })
        .eq('id', syncSessionId);

      return NextResponse.json({
        success: true,
        message: 'Sync cancelled successfully',
      });
    } else {
      return NextResponse.json({ error: cancelResult.error }, { status: 500 });
    }
  } catch (error) {
    console.error('DELETE /api/integrations/sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper functions

async function checkWeddingDay(
  supabase: any,
  weddingId: string,
): Promise<boolean> {
  try {
    const { data: wedding, error } = await supabase
      .from('weddings')
      .select('wedding_date')
      .eq('id', weddingId)
      .single();

    if (error || !wedding) {
      return false;
    }

    const today = new Date();
    const weddingDate = new Date(wedding.wedding_date);

    // Check if today is within 2 days of wedding (wedding day priority window)
    const timeDiff = Math.abs(weddingDate.getTime() - today.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return daysDiff <= 2;
  } catch (error) {
    console.error('Wedding day check error:', error);
    return false;
  }
}
