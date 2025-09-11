/**
 * Team Management API Routes
 * WS-073: Team Management - Wedding Business Collaboration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RBACService } from '@/lib/auth/rbac';
import {
  TeamService,
  CreateTeamData,
  UpdateTeamData,
} from '@/lib/services/teamService';

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const rbac = new RBACService(supabase);
const teamService = new TeamService(supabase, rbac);

/**
 * GET /api/team - Get user's teams or specific team
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

    // Initialize RBAC for user
    await rbac.initialize(userId);

    if (teamId) {
      // Get specific team
      const team = await teamService.getTeam(teamId);

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      // Check if user has access to this team
      const hasAccess = await rbac.hasPermission(teamId, 'team', 'read');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Get additional team data
      const [members, invitations, stats, activity] = await Promise.all([
        teamService.getTeamMembers(teamId),
        teamService.getTeamInvitations(teamId),
        teamService.getTeamStats(teamId),
        teamService.getTeamActivity(teamId, 10),
      ]);

      return NextResponse.json({
        team,
        members,
        invitations,
        stats,
        activity,
      });
    } else {
      // Get user's teams
      const teams = await teamService.getUserTeams(userId);

      // Get stats for each team
      const teamsWithStats = await Promise.all(
        teams.map(async (team) => {
          const stats = await teamService.getTeamStats(team.id);
          return { ...team, stats };
        }),
      );

      return NextResponse.json({ teams: teamsWithStats });
    }
  } catch (error) {
    console.error('GET /api/team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/team - Create new team
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const teamData: CreateTeamData = await request.json();

    // Validate required fields
    if (!teamData.name || teamData.name.length < 2) {
      return NextResponse.json(
        { error: 'Team name must be at least 2 characters' },
        { status: 400 },
      );
    }

    // Initialize RBAC for user
    await rbac.initialize(userId);

    // Create team
    const team = await teamService.createTeam(userId, teamData);

    if (!team) {
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: 'Team created successfully',
        team,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/team - Update team
 */
export async function PUT(request: NextRequest) {
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

    const updateData: UpdateTeamData = await request.json();

    // Initialize RBAC for user
    await rbac.initialize(userId);

    // Check permissions
    const canManage = await rbac.hasPermission(teamId, 'team', 'manage');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update team' },
        { status: 403 },
      );
    }

    // Update team
    const success = await teamService.updateTeam(teamId, userId, updateData);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 },
      );
    }

    // Get updated team
    const updatedTeam = await teamService.getTeam(teamId);

    return NextResponse.json({
      message: 'Team updated successfully',
      team: updatedTeam,
    });
  } catch (error) {
    console.error('PUT /api/team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/team - Delete team
 */
export async function DELETE(request: NextRequest) {
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

    // Check if user is team owner
    const isOwner = await rbac.isTeamOwner(teamId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only team owner can delete team' },
        { status: 403 },
      );
    }

    // Delete team
    const success = await teamService.deleteTeam(teamId, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Team deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
