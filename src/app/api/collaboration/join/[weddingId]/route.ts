/**
 * WS-342 Real-Time Wedding Collaboration - Join Session API
 * Team B Backend Development - API endpoint for joining collaboration sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WebSocketManager } from '@/lib/collaboration/websocket-manager';
import { PresenceManager } from '@/lib/collaboration/presence-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Join Wedding Collaboration Session
 * POST /api/collaboration/join/[weddingId]
 *
 * Creates a new collaboration session and returns WebSocket connection details
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    // Validate wedding exists and user has access
    const { data: participation, error: participationError } = await supabase
      .from('wedding_participants')
      .select(
        `
        id,
        role,
        permissions,
        wedding:weddings (
          id,
          wedding_date,
          status,
          title
        )
      `,
      )
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { error: 'Access denied to wedding collaboration' },
        { status: 403 },
      );
    }

    // Check if wedding is active
    if (participation.wedding.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot collaborate on cancelled wedding' },
        { status: 400 },
      );
    }

    // Generate secure session token
    const sessionToken = await generateSessionToken();

    // Create collaboration session
    const { data: session, error: sessionError } = await supabase
      .from('collaboration_sessions')
      .insert({
        wedding_id: weddingId,
        user_id: user.id,
        session_token: sessionToken,
        permissions: mapRoleToPermissions(participation.role),
        device_info: {
          userAgent: request.headers.get('user-agent'),
          platform: getPlatformFromUserAgent(request.headers.get('user-agent')),
          timestamp: new Date().toISOString(),
        },
        ip_address: getClientIP(request),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating collaboration session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create collaboration session' },
        { status: 500 },
      );
    }

    // Initialize WebSocket connection through manager
    const wsManager = WebSocketManager.getInstance();
    const presenceManager = PresenceManager.getInstance();

    try {
      // Pre-initialize connection (actual WebSocket will connect separately)
      await wsManager.handleConnection(user.id, weddingId);

      // Track initial presence
      await presenceManager.trackPresence(user.id, weddingId, {
        status: 'online',
        currentSection: 'dashboard',
        lastActivity: new Date(),
        weddingRole: participation.role,
        availability: [],
        deviceType: getDeviceType(request.headers.get('user-agent')),
        timezone: 'UTC', // Could be derived from request or user profile
      });
    } catch (wsError) {
      console.error('Error initializing WebSocket connection:', wsError);
      // Continue even if WebSocket initialization fails
    }

    // Get current active collaborators
    const activeCollaborators = await presenceManager.getActiveUsers(weddingId);

    // Return session details
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionToken,
        weddingId,
        userId: user.id,
        permissions: session.permissions,
        expiresAt: session.expires_at,
      },
      websocket: {
        url: process.env.WEBSOCKET_URL || 'ws://localhost:3001',
        protocols: ['collaboration-v1'],
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
      },
      wedding: {
        id: participation.wedding.id,
        title: participation.wedding.title,
        date: participation.wedding.wedding_date,
        status: participation.wedding.status,
      },
      user: {
        id: user.id,
        role: participation.role,
        permissions: session.permissions,
      },
      collaboration: {
        activeCollaborators: activeCollaborators.length,
        collaboratorsList: activeCollaborators.slice(0, 10), // Limit for initial response
      },
    });
  } catch (error) {
    console.error('Error in join collaboration endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Get Active Collaboration Session
 * GET /api/collaboration/join/[weddingId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    // Get active session
    const { data: session, error: sessionError } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No active collaboration session found' },
        { status: 404 },
      );
    }

    // Get current collaborators
    const presenceManager = PresenceManager.getInstance();
    const activeCollaborators = await presenceManager.getActiveUsers(weddingId);
    const collaborativePresence =
      await presenceManager.getCollaborativePresence(weddingId);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionToken: session.session_token,
        weddingId: session.wedding_id,
        userId: session.user_id,
        permissions: session.permissions,
        expiresAt: session.expires_at,
        lastActivity: session.last_activity,
      },
      collaboration: {
        activeCollaborators: activeCollaborators.length,
        collaboratorsList: activeCollaborators,
        currentlyEditing: Object.fromEntries(
          collaborativePresence.currentlyEditing,
        ),
        recentActivity: collaborativePresence.recentActivity.slice(0, 20),
        conflictZones: collaborativePresence.conflictZones,
      },
    });
  } catch (error) {
    console.error('Error getting collaboration session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Leave Collaboration Session
 * DELETE /api/collaboration/join/[weddingId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const { weddingId } = params;

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    // Deactivate session
    const { error: updateError } = await supabase
      .from('collaboration_sessions')
      .update({
        is_active: false,
        last_activity: new Date().toISOString(),
      })
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (updateError) {
      console.error('Error deactivating session:', updateError);
    }

    // Clean up WebSocket connection
    const wsManager = WebSocketManager.getInstance();
    const presenceManager = PresenceManager.getInstance();

    try {
      await wsManager.handleDisconnection(user.id);
      await presenceManager.updatePresence(user.id, {
        status: 'offline',
        lastActivity: new Date(),
      });
    } catch (error) {
      console.error('Error cleaning up connection:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left collaboration session',
    });
  } catch (error) {
    console.error('Error leaving collaboration session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Helper functions
 */
async function generateSessionToken(): Promise<string> {
  const { data } = await supabase.rpc('generate_session_token');
  return (
    data ||
    Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2)
  );
}

function mapRoleToPermissions(role: string): object {
  const basePermissions = {
    canEdit: false,
    canView: true,
    canInvite: false,
    canManageTimeline: false,
    canManageBudget: false,
    canManageVendors: false,
    canManageGuests: false,
    role,
  };

  switch (role) {
    case 'couple_primary':
    case 'couple_secondary':
      return {
        ...basePermissions,
        canEdit: true,
        canInvite: true,
        canManageTimeline: true,
        canManageBudget: true,
        canManageVendors: true,
        canManageGuests: true,
      };

    case 'wedding_planner':
      return {
        ...basePermissions,
        canEdit: true,
        canInvite: true,
        canManageTimeline: true,
        canManageVendors: true,
        canManageGuests: true,
      };

    case 'vendor_photographer':
    case 'vendor_venue':
    case 'vendor_catering':
    case 'vendor_florist':
    case 'vendor_music':
    case 'vendor_transport':
    case 'vendor_other':
      return {
        ...basePermissions,
        canEdit: true,
        canManageTimeline: true,
      };

    case 'family_immediate':
      return {
        ...basePermissions,
        canManageGuests: true,
      };

    default:
      return basePermissions;
  }
}

function getPlatformFromUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'unknown';

  if (userAgent.includes('Mobile') || userAgent.includes('Android'))
    return 'mobile';
  if (userAgent.includes('iPad') || userAgent.includes('Tablet'))
    return 'tablet';
  return 'desktop';
}

function getDeviceType(
  userAgent: string | null,
): 'desktop' | 'mobile' | 'tablet' | 'smart_watch' {
  if (!userAgent) return 'desktop';

  if (userAgent.includes('Mobile') || userAgent.includes('Android'))
    return 'mobile';
  if (userAgent.includes('iPad') || userAgent.includes('Tablet'))
    return 'tablet';
  return 'desktop';
}

function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cloudflareIP = request.headers.get('cf-connecting-ip');

  return cloudflareIP || realIP || forwarded?.split(',')[0] || null;
}
