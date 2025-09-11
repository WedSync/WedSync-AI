/**
 * Team Members Management API Routes
 * WS-073: Team Management - Wedding Business Collaboration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RBACService, TeamRole } from '@/lib/auth/rbac';
import { TeamService } from '@/lib/services/teamService';

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const rbac = new RBACService(supabase);
const teamService = new TeamService(supabase, rbac);

/**
 * GET /api/team/members - Get team members
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 },
      );
    }

    // Initialize RBAC for user
    await rbac.initialize(userId);

    // Check permissions
    const canRead = await rbac.hasPermission(teamId, 'team', 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get team members
    const members = await teamService.getTeamMembers(teamId);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('GET /api/team/members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/team/members - Invite team member
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 },
      );
    }

    const { email, role, message } = await request.json();

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 },
      );
    }

    // Validate role
    const validRoles: TeamRole[] = [
      'viewer',
      'photographer',
      'coordinator',
      'senior_photographer',
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Initialize RBAC for user
    await rbac.initialize(userId);

    // Check permissions
    const canInvite = await rbac.hasPermission(teamId, 'team', 'invite');
    if (!canInvite) {
      return NextResponse.json(
        { error: 'Insufficient permissions to invite team members' },
        { status: 403 },
      );
    }

    // Invite team member
    const result = await teamService.inviteTeamMember(
      teamId,
      userId,
      email,
      role,
      message,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to invite team member' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: 'Team member invited successfully',
        invitationId: result.invitationId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/team/members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/team/members - Update team member
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const memberId = searchParams.get('memberId');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (!teamId || !memberId) {
      return NextResponse.json(
        { error: 'Team ID and Member ID are required' },
        { status: 400 },
      );
    }

    const { role, assignedClients } = await request.json();

    // Initialize RBAC for user
    await rbac.initialize(userId);

    // Check permissions
    const canManage = await rbac.hasPermission(teamId, 'team', 'manage');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update team member' },
        { status: 403 },
      );
    }

    let success = true;

    // Update role if provided
    if (role) {
      const validRoles: TeamRole[] = [
        'viewer',
        'photographer',
        'coordinator',
        'senior_photographer',
      ];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      success = await teamService.updateMemberRole(
        teamId,
        memberId,
        role,
        userId,
      );
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update member role' },
          { status: 500 },
        );
      }
    }

    // Update assigned clients if provided
    if (assignedClients && Array.isArray(assignedClients)) {
      success = await teamService.assignClients(
        teamId,
        memberId,
        assignedClients,
        userId,
      );
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to assign clients' },
          { status: 500 },
        );
      }
    }

    // Get updated member
    const updatedMember = await teamService.getTeamMember(memberId);

    return NextResponse.json({
      message: 'Team member updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    console.error('PUT /api/team/members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/team/members - Remove team member
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const memberId = searchParams.get('memberId');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (!teamId || !memberId) {
      return NextResponse.json(
        { error: 'Team ID and Member ID are required' },
        { status: 400 },
      );
    }

    // Initialize RBAC for user
    await rbac.initialize(userId);

    // Check permissions
    const canManage = await rbac.hasPermission(teamId, 'team', 'manage');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove team member' },
        { status: 403 },
      );
    }

    // Remove team member
    const success = await teamService.removeMember(teamId, memberId, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('DELETE /api/team/members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
