// WS-342: Real-Time Wedding Collaboration - Presence Management API
// Team B Backend Development - Batch 1 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import PresenceManager from '@/lib/collaboration/presence-manager';
import {
  PresenceState,
  UserPresence,
  CursorPosition,
  AvailabilityWindow,
  ActivityType,
} from '@/lib/collaboration/types/collaboration';

// Initialize presence manager (singleton in production)
const presenceManager = new PresenceManager();

interface UpdatePresenceRequest {
  status?: 'online' | 'away' | 'busy' | 'offline';
  current_section?: string;
  active_document?: string;
  cursor_position?: CursorPosition;
  typing?: boolean;
  current_task?: string;
  availability?: AvailabilityWindow[];
}

interface ActivityTrackingRequest {
  type: 'viewing' | 'editing' | 'typing' | 'uploading' | 'calling';
  section: string;
  document_id?: string;
  details?: any;
}

// Get presence information for wedding
export async function GET(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const { searchParams } = new URL(request.url);

    const include_away = searchParams.get('include_away') !== 'false';
    const section = searchParams.get('section');
    const statistics = searchParams.get('statistics') === 'true';

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

    if (statistics) {
      // Return presence statistics
      const stats = await presenceManager.getPresenceStatistics(weddingId, 24);
      return NextResponse.json({ statistics: stats }, { status: 200 });
    }

    // Get active users
    const activeUsers = await presenceManager.getActiveUsers(
      weddingId,
      include_away,
    );

    let filteredUsers = activeUsers;

    // Filter by section if specified
    if (section) {
      const usersInSection = await presenceManager.getUsersInSection(
        weddingId,
        section,
      );
      filteredUsers = usersInSection;
    }

    // Get additional user information
    const userIds = filteredUsers.map((u) => u.user_id);
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', userIds);

    // Combine presence with user profiles
    const enrichedPresence = filteredUsers.map((presence) => ({
      ...presence,
      user_profile:
        userProfiles?.find((profile) => profile.id === presence.user_id) ||
        null,
    }));

    return NextResponse.json(
      {
        active_users: enrichedPresence,
        total_count: activeUsers.length,
        section_count: section ? filteredUsers.length : null,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Get presence error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve presence information' },
      { status: 500 },
    );
  }
}

// Update user presence
export async function POST(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const body: UpdatePresenceRequest = await request.json();

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

    // Build presence update
    const presenceUpdate: Partial<PresenceState> = {
      ...body,
      last_activity: new Date(),
      wedding_role: session.permissions.role,
    };

    // Update presence through presence manager
    await presenceManager.updatePresence(user.id, presenceUpdate);

    // Handle specific presence updates
    if (body.typing !== undefined) {
      await presenceManager.updateTypingStatus(
        user.id,
        weddingId,
        body.typing,
        body.current_section,
      );
    }

    if (body.cursor_position) {
      await presenceManager.updateCursorPosition(
        user.id,
        weddingId,
        body.cursor_position,
      );
    }

    if (body.availability) {
      await presenceManager.setUserAvailability(
        user.id,
        weddingId,
        body.availability,
      );
    }

    // Get updated presence
    const activeUsers = await presenceManager.getActiveUsers(weddingId);
    const updatedPresence = activeUsers.find((u) => u.user_id === user.id);

    return NextResponse.json(
      {
        success: true,
        presence: updatedPresence,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Update presence error:', error);
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 },
    );
  }
}

// Track user activity
export async function PUT(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;
    const body: ActivityTrackingRequest = await request.json();

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

    // Track activity through presence manager
    const activity: ActivityType = {
      type: body.type,
      section: body.section,
      document_id: body.document_id,
      details: body.details,
    };

    await presenceManager.trackUserActivity(user.id, activity);

    return NextResponse.json(
      {
        success: true,
        activity_tracked: activity,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Track activity error:', error);
    return NextResponse.json(
      { error: 'Failed to track activity' },
      { status: 500 },
    );
  }
}

// Mark user as offline (manual logout)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;

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

    // Mark user as offline
    await presenceManager.markUserOffline(user.id, weddingId);

    return NextResponse.json(
      {
        success: true,
        message: 'User marked as offline',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Mark offline error:', error);
    return NextResponse.json(
      { error: 'Failed to mark user as offline' },
      { status: 500 },
    );
  }
}

// Handle WebSocket presence ping
export async function PATCH(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;

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

    // Update last activity timestamp
    const presenceUpdate: Partial<PresenceState> = {
      last_activity: new Date(),
    };

    await presenceManager.updatePresence(user.id, presenceUpdate);

    // Get current presence for response
    const activeUsers = await presenceManager.getActiveUsers(weddingId);
    const currentPresence = activeUsers.find((u) => u.user_id === user.id);

    return NextResponse.json(
      {
        success: true,
        presence: currentPresence,
        server_time: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Presence ping error:', error);
    return NextResponse.json(
      { error: 'Failed to update presence ping' },
      { status: 500 },
    );
  }
}
