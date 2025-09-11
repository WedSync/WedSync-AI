/**
 * WS-336: Calendar Integration System - Timeline Sync API
 *
 * POST /api/calendar/sync - Initiate timeline synchronization
 * GET /api/calendar/sync - Get sync status and history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { TimelineSyncService } from '@/lib/calendar/timeline-sync-service';

// Input validation schemas
const SyncRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  weddingId: z.string().uuid('Invalid wedding ID'),
  connectionId: z.string().uuid('Invalid connection ID').optional(),
  syncDirection: z
    .enum(['to_calendar', 'from_calendar', 'bidirectional'])
    .default('to_calendar'),
  forceSync: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

const SyncStatusSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  weddingId: z.string().uuid('Invalid wedding ID').optional(),
  connectionId: z.string().uuid('Invalid connection ID').optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Rate limiting for sync operations
const syncRateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

async function checkSyncRateLimit(organizationId: string): Promise<boolean> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 sync operations per organization per minute

  const key = `sync_rate:${organizationId}`;
  const existing = syncRateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    syncRateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count += 1;
  return true;
}

/**
 * POST /api/calendar/sync - Initiate timeline synchronization
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const syncService = new TimelineSyncService();

  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Input validation
    const body = await request.json();
    const validationResult = SyncRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      organizationId,
      weddingId,
      connectionId,
      syncDirection,
      forceSync,
      dryRun,
    } = validationResult.data;

    // Verify user access to organization
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', (session.user as any).id)
      .single();

    if (!userProfile || userProfile.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 },
      );
    }

    // Rate limiting
    if (!(await checkSyncRateLimit(organizationId))) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many sync operations. Please wait before trying again.',
        },
        { status: 429 },
      );
    }

    // Verify wedding belongs to organization
    const { data: wedding } = await supabase
      .from('weddings')
      .select('id, organization_id, wedding_date, status')
      .eq('id', weddingId)
      .eq('organization_id', organizationId)
      .single();

    if (!wedding) {
      return NextResponse.json(
        { error: 'Wedding not found or access denied' },
        { status: 404 },
      );
    }

    // Wedding day protection - no sync changes on Saturdays
    const weddingDate = new Date(wedding.wedding_date);
    const today = new Date();
    const isWeddingDay = weddingDate.toDateString() === today.toDateString();
    const isSaturday = today.getDay() === 6;

    if (isWeddingDay && isSaturday && !dryRun) {
      return NextResponse.json(
        {
          error: 'Wedding day protection active',
          message:
            'Calendar sync is disabled on wedding days. Use dry-run mode to preview changes.',
          weddingDate: weddingDate.toISOString(),
        },
        { status: 423 }, // Locked
      );
    }

    // Get active calendar connections
    let connectionsQuery = supabase
      .from('calendar_connections')
      .select('id, provider, status, sync_enabled, last_sync_at')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .eq('sync_enabled', true);

    if (connectionId) {
      connectionsQuery = connectionsQuery.eq('id', connectionId);
    }

    const { data: connections } = await connectionsQuery;

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        {
          error: 'No active calendar connections found',
          message: 'Please connect a calendar provider before syncing',
        },
        { status: 404 },
      );
    }

    // Check for concurrent sync operations
    const { data: activeSyncs } = await supabase
      .from('calendar_sync_logs')
      .select('id, operation_status')
      .eq('organization_id', organizationId)
      .eq('wedding_id', weddingId)
      .in('operation_status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (activeSyncs && activeSyncs.length > 0 && !forceSync) {
      return NextResponse.json(
        {
          error: 'Sync already in progress',
          message:
            'Another sync operation is currently running. Use forceSync=true to override.',
          activeSyncId: activeSyncs[0].id,
        },
        { status: 409 },
      );
    }

    // Initiate sync operations for each connection
    const syncOperations = [];
    const syncPromises = [];

    for (const connection of connections) {
      const syncPromise = syncService.syncTimelineToCalendar(
        organizationId,
        weddingId,
        connection.id,
        {
          syncDirection,
          forceSync,
          dryRun,
        },
      );

      syncPromises.push(syncPromise);
    }

    // Execute sync operations
    const results = await Promise.allSettled(syncPromises);

    results.forEach((result, index) => {
      const connection = connections[index];

      if (result.status === 'fulfilled' && result.value) {
        syncOperations.push({
          connectionId: connection.id,
          provider: connection.provider,
          status: 'completed',
          operation: result.value,
        });
      } else {
        syncOperations.push({
          connectionId: connection.id,
          provider: connection.provider,
          status: 'failed',
          error:
            result.status === 'rejected'
              ? result.reason?.message
              : 'Unknown error',
        });
      }
    });

    // Calculate summary statistics
    const summary = {
      totalConnections: connections.length,
      successfulSyncs: syncOperations.filter((op) => op.status === 'completed')
        .length,
      failedSyncs: syncOperations.filter((op) => op.status === 'failed').length,
      processingTime: Date.now() - startTime,
      dryRun,
    };

    return NextResponse.json({
      success: true,
      summary,
      operations: syncOperations,
      wedding: {
        id: wedding.id,
        weddingDate: wedding.wedding_date,
      },
    });
  } catch (error) {
    console.error('Calendar sync API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process sync request',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/calendar/sync - Get sync status and history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      organizationId: searchParams.get('organizationId'),
      weddingId: searchParams.get('weddingId'),
      connectionId: searchParams.get('connectionId'),
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const validationResult = SyncStatusSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { organizationId, weddingId, connectionId, limit, offset } =
      validationResult.data;

    // Verify user access to organization
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', (session.user as any).id)
      .single();

    if (!userProfile || userProfile.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 },
      );
    }

    const syncService = new TimelineSyncService();

    // Get sync status for specific wedding
    if (weddingId) {
      const syncStatus = await syncService.getSyncStatus(
        organizationId,
        weddingId,
      );

      if (!syncStatus) {
        return NextResponse.json(
          { error: 'Failed to retrieve sync status' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        syncStatus,
        wedding: { id: weddingId },
      });
    }

    // Get sync history/logs
    let logsQuery = supabase
      .from('calendar_sync_logs')
      .select(
        `
        id,
        operation_type,
        operation_status,
        events_processed,
        conflicts_detected,
        error_message,
        operation_duration_ms,
        created_at,
        wedding_id,
        calendar_connection_id,
        calendar_connections (
          provider,
          provider_email
        )
      `,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (connectionId) {
      logsQuery = logsQuery.eq('calendar_connection_id', connectionId);
    }

    if (weddingId) {
      logsQuery = logsQuery.eq('wedding_id', weddingId);
    }

    const { data: syncLogs, error } = await logsQuery;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to retrieve sync logs' },
        { status: 500 },
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('calendar_sync_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (connectionId) {
      countQuery = countQuery.eq('calendar_connection_id', connectionId);
    }

    if (weddingId) {
      countQuery = countQuery.eq('wedding_id', weddingId);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      success: true,
      syncLogs: syncLogs || [],
      pagination: {
        limit,
        offset,
        totalCount: totalCount || 0,
        hasMore: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Calendar sync status API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve sync status',
      },
      { status: 500 },
    );
  }
}
