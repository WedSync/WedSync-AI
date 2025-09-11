// WS-342: Real-Time Wedding Collaboration - Collaboration Events API
// Team B Backend Development - Batch 1 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import EventStreamingService from '@/lib/collaboration/event-streaming';
import WebSocketManager from '@/lib/collaboration/websocket-manager';
import {
  CollaborationEvent,
  CollaborationEventType,
  VectorClock,
  EventMetadata,
} from '@/lib/collaboration/types/collaboration';

// Initialize services (in production, these would be singleton instances)
const eventStreaming = new EventStreamingService();
const websocketManager = new WebSocketManager();

interface BroadcastEventRequest {
  type: CollaborationEventType;
  data: any;
  metadata?: Partial<EventMetadata>;
  priority?: number;
  vector_clock?: VectorClock;
  causality?: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const body: BroadcastEventRequest = await request.json();

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

    // Verify user has active collaboration session
    const { data: session, error: sessionError } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No active collaboration session' },
        { status: 403 },
      );
    }

    // Check if user has permission for this event type
    const hasPermission = await checkEventPermission(
      body.type,
      session.permissions,
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this action' },
        { status: 403 },
      );
    }

    // Create collaboration event
    const event: CollaborationEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: body.type,
      wedding_id: weddingId,
      user_id: user.id,
      timestamp: new Date(),
      data: body.data,
      metadata: {
        source: 'api',
        ...body.metadata,
      },
      vector_clock: body.vector_clock || {},
      causality: body.causality,
      priority: body.priority || 0,
    };

    // Publish event through event streaming service
    await eventStreaming.publishEvent(event);

    // Broadcast to WebSocket connections
    await websocketManager.broadcastToRoom(weddingId, event);

    // Record event metrics
    await recordEventMetrics(supabase, weddingId, event);

    return NextResponse.json(
      {
        success: true,
        event_id: event.id,
        timestamp: event.timestamp.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Broadcast collaboration event error:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast event' },
      { status: 500 },
    );
  }
}

// Get collaboration events
export async function GET(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const { searchParams } = new URL(request.url);

    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50');
    const event_types = searchParams.get('event_types')?.split(',');
    const user_id = searchParams.get('user_id');

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

    // Verify user has access to this wedding
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

    // Build query
    let query = supabase
      .from('collaboration_events')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gte('created_at', since);
    }

    if (event_types && event_types.length > 0) {
      query = query.in('event_type', event_types);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Failed to get collaboration events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to retrieve events' },
        { status: 500 },
      );
    }

    // Transform events to match frontend format
    const transformedEvents = events.map((event) => ({
      id: event.id,
      type: event.event_type,
      wedding_id: event.wedding_id,
      user_id: event.user_id,
      timestamp: event.created_at,
      data: event.event_data,
      metadata: {
        source: 'database',
      },
      vector_clock: event.vector_clock || {},
      causality: event.causality,
      priority: event.priority || 0,
      processed_at: event.processed_at,
    }));

    return NextResponse.json(
      {
        events: transformedEvents,
        count: transformedEvents.length,
        has_more: transformedEvents.length === limit,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Get collaboration events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Delete/cancel an event (for corrections)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 },
      );
    }

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

    // Get the event to verify ownership/permissions
    const { data: event, error: eventError } = await supabase
      .from('collaboration_events')
      .select('*')
      .eq('id', eventId)
      .eq('wedding_id', weddingId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user can cancel this event (owner or moderator)
    const { data: session } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const canCancel =
      event.user_id === user.id || session?.permissions?.can_moderate;

    if (!canCancel) {
      return NextResponse.json(
        { error: 'Insufficient permissions to cancel this event' },
        { status: 403 },
      );
    }

    // Create cancellation event instead of deleting
    const cancellationEvent: CollaborationEvent = {
      id: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'event_cancelled',
      wedding_id: weddingId,
      user_id: user.id,
      timestamp: new Date(),
      data: {
        cancelled_event_id: eventId,
        original_event: event,
        reason: 'User requested cancellation',
      },
      metadata: {
        source: 'api',
      },
      vector_clock: {},
      priority: 5, // High priority for cancellations
    };

    // Publish cancellation event
    await eventStreaming.publishEvent(cancellationEvent);

    // Broadcast cancellation
    await websocketManager.broadcastToRoom(weddingId, cancellationEvent);

    return NextResponse.json(
      {
        success: true,
        message: 'Event cancelled successfully',
        cancellation_event_id: cancellationEvent.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Cancel collaboration event error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel event' },
      { status: 500 },
    );
  }
}

// Helper function to check event permissions
async function checkEventPermission(
  eventType: CollaborationEventType,
  permissions: any,
): Promise<boolean> {
  const eventPermissionMap: { [key in CollaborationEventType]: string } = {
    timeline_update: 'can_edit_timeline',
    budget_change: 'can_edit_budget',
    vendor_assignment: 'can_assign_vendors',
    guest_update: 'can_manage_guests',
    document_edit: 'can_edit_documents',
    photo_upload: 'can_upload_photos',
    task_completion: 'can_manage_tasks',
    message_sent: 'can_send_messages',
    presence_change: '', // Always allowed
    permission_update: 'can_moderate',
    conflict_detected: '', // System event
    conflict_resolved: '', // System event
  };

  const requiredPermission = eventPermissionMap[eventType];

  // No permission required or system event
  if (!requiredPermission) return true;

  return permissions[requiredPermission] === true;
}

// Helper function to record event metrics
async function recordEventMetrics(
  supabase: any,
  weddingId: string,
  event: CollaborationEvent,
): Promise<void> {
  try {
    await supabase.rpc('record_wedding_metric', {
      p_wedding_id: weddingId,
      p_metric_type: 'collaboration_event',
      p_metric_value: {
        event_type: event.type,
        event_id: event.id,
        user_id: event.user_id,
        priority: event.priority,
        timestamp: event.timestamp.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to record event metrics:', error);
  }
}
