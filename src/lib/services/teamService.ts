/**
 * Team Service Layer
 * WS-073: Team Management - Wedding Business Collaboration
 */

import { createClient } from '@supabase/supabase-js';
import { RBACService, Team, TeamMember, TeamRole } from '../auth/rbac';

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  message?: string;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface TeamActivity {
  id: string;
  teamId: string;
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  businessType?: string;
  subscriptionPlan?: string;
  maxTeamMembers?: number;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  businessType?: string;
  subscriptionPlan?: string;
  maxTeamMembers?: number;
  settings?: {
    allowInvitations?: boolean;
    requireApproval?: boolean;
    defaultRole?: TeamRole;
  };
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  roleDistribution: Record<TeamRole, number>;
  recentActivity: number;
}

export class TeamService {
  private supabase: ReturnType<typeof createClient>;
  private rbac: RBACService;

  constructor(
    supabaseClient: ReturnType<typeof createClient>,
    rbacService: RBACService,
  ) {
    this.supabase = supabaseClient;
    this.rbac = rbacService;
  }

  /**
   * Get team by ID with full details
   */
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      const { data: team, error } = await this.supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error || !team) {
        console.error('Failed to fetch team:', error);
        return null;
      }

      return this.mapTeamFromDB(team);
    } catch (error) {
      console.error('Error fetching team:', error);
      return null;
    }
  }

  /**
   * Get user's teams
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    try {
      const { data: teams, error } = await this.supabase
        .from('teams')
        .select(
          `
          *,
          team_members!inner(user_id, status)
        `,
        )
        .or(`owner_id.eq.${userId},team_members.user_id.eq.${userId}`)
        .eq('team_members.status', 'active');

      if (error) {
        console.error('Failed to fetch user teams:', error);
        return [];
      }

      return teams?.map(this.mapTeamFromDB) || [];
    } catch (error) {
      console.error('Error fetching user teams:', error);
      return [];
    }
  }

  /**
   * Create new team
   */
  async createTeam(
    userId: string,
    teamData: CreateTeamData,
  ): Promise<Team | null> {
    try {
      const { data: team, error } = await this.supabase
        .from('teams')
        .insert({
          name: teamData.name,
          description: teamData.description,
          owner_id: userId,
          business_type: teamData.businessType || 'photography',
          subscription_plan: teamData.subscriptionPlan || 'professional',
          max_team_members: teamData.maxTeamMembers || 10,
        })
        .select()
        .single();

      if (error || !team) {
        console.error('Failed to create team:', error);
        return null;
      }

      // Log activity
      await this.logActivity(team.id, userId, 'team_created', 'team', team.id, {
        name: teamData.name,
        businessType: teamData.businessType || 'photography',
      });

      return this.mapTeamFromDB(team);
    } catch (error) {
      console.error('Error creating team:', error);
      return null;
    }
  }

  /**
   * Update team
   */
  async updateTeam(
    teamId: string,
    userId: string,
    updateData: UpdateTeamData,
  ): Promise<boolean> {
    try {
      // Check if user can manage team
      const canManage = await this.rbac.hasPermission(teamId, 'team', 'manage');
      if (!canManage) {
        console.error('User does not have permission to update team');
        return false;
      }

      const updateFields: any = {};
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.description !== undefined)
        updateFields.description = updateData.description;
      if (updateData.businessType)
        updateFields.business_type = updateData.businessType;
      if (updateData.subscriptionPlan)
        updateFields.subscription_plan = updateData.subscriptionPlan;
      if (updateData.maxTeamMembers)
        updateFields.max_team_members = updateData.maxTeamMembers;
      if (updateData.settings) updateFields.settings = updateData.settings;

      const { error } = await this.supabase
        .from('teams')
        .update(updateFields)
        .eq('id', teamId);

      if (error) {
        console.error('Failed to update team:', error);
        return false;
      }

      // Log activity
      await this.logActivity(
        teamId,
        userId,
        'team_updated',
        'team',
        teamId,
        updateFields,
      );

      return true;
    } catch (error) {
      console.error('Error updating team:', error);
      return false;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is team owner
      const isOwner = await this.rbac.isTeamOwner(teamId);
      if (!isOwner) {
        console.error('Only team owner can delete team');
        return false;
      }

      const { error } = await this.supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('owner_id', userId);

      if (error) {
        console.error('Failed to delete team:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      return false;
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const { data: members, error } = await this.supabase
        .from('team_members')
        .select(
          `
          *,
          users:user_id(id, email, raw_user_meta_data),
          invited_by_user:invited_by(id, email, raw_user_meta_data)
        `,
        )
        .eq('team_id', teamId)
        .neq('status', 'removed')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch team members:', error);
        return [];
      }

      return members?.map(this.mapTeamMemberFromDB) || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }

  /**
   * Get team member by ID
   */
  async getTeamMember(memberId: string): Promise<TeamMember | null> {
    try {
      const { data: member, error } = await this.supabase
        .from('team_members')
        .select(
          `
          *,
          users:user_id(id, email, raw_user_meta_data),
          invited_by_user:invited_by(id, email, raw_user_meta_data)
        `,
        )
        .eq('id', memberId)
        .single();

      if (error || !member) {
        console.error('Failed to fetch team member:', error);
        return null;
      }

      return this.mapTeamMemberFromDB(member);
    } catch (error) {
      console.error('Error fetching team member:', error);
      return null;
    }
  }

  /**
   * Invite team member
   */
  async inviteTeamMember(
    teamId: string,
    invitedBy: string,
    email: string,
    role: TeamRole,
    message?: string,
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    try {
      // Use RBAC service to handle invitation
      return await this.rbac.inviteTeamMember(teamId, email, role, message);
    } catch (error) {
      console.error('Error inviting team member:', error);
      return { success: false, error: 'Failed to invite team member' };
    }
  }

  /**
   * Resend team invitation
   */
  async resendInvitation(
    invitationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data: invitation, error: fetchError } = await this.supabase
        .from('team_invitations')
        .select('*, teams(*)')
        .eq('id', invitationId)
        .single();

      if (fetchError || !invitation) {
        console.error('Failed to fetch invitation:', fetchError);
        return false;
      }

      // Check permissions
      const canInvite = await this.rbac.hasPermission(
        invitation.team_id,
        'team',
        'invite',
      );
      if (!canInvite) {
        console.error('User does not have permission to resend invitation');
        return false;
      }

      // Generate new token and extend expiry
      const newToken = crypto.randomUUID();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error } = await this.supabase
        .from('team_invitations')
        .update({
          token: newToken,
          expires_at: newExpiresAt.toISOString(),
          status: 'pending',
        })
        .eq('id', invitationId);

      if (error) {
        console.error('Failed to resend invitation:', error);
        return false;
      }

      // Log activity
      await this.logActivity(
        invitation.team_id,
        userId,
        'invitation_resent',
        'team_invitation',
        invitationId,
        {
          email: invitation.email,
          role: invitation.role,
        },
      );

      return true;
    } catch (error) {
      console.error('Error resending invitation:', error);
      return false;
    }
  }

  /**
   * Revoke team invitation
   */
  async revokeInvitation(
    invitationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data: invitation, error: fetchError } = await this.supabase
        .from('team_invitations')
        .select('team_id, email, role')
        .eq('id', invitationId)
        .single();

      if (fetchError || !invitation) {
        console.error('Failed to fetch invitation:', fetchError);
        return false;
      }

      // Check permissions
      const canInvite = await this.rbac.hasPermission(
        invitation.team_id,
        'team',
        'invite',
      );
      if (!canInvite) {
        console.error('User does not have permission to revoke invitation');
        return false;
      }

      const { error } = await this.supabase
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) {
        console.error('Failed to revoke invitation:', error);
        return false;
      }

      // Log activity
      await this.logActivity(
        invitation.team_id,
        userId,
        'invitation_revoked',
        'team_invitation',
        invitationId,
        {
          email: invitation.email,
          role: invitation.role,
        },
      );

      return true;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return false;
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<{
    success: boolean;
    teamId?: string;
    error?: string;
  }> {
    try {
      return await this.rbac.acceptInvitation(token);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  /**
   * Update team member role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: TeamRole,
    updatedBy: string,
  ): Promise<boolean> {
    try {
      const success = await this.rbac.updateMemberRole(
        teamId,
        memberId,
        newRole,
      );

      if (success) {
        // Log activity
        await this.logActivity(
          teamId,
          updatedBy,
          'member_role_updated',
          'team_member',
          memberId,
          {
            newRole,
          },
        );
      }

      return success;
    } catch (error) {
      console.error('Error updating member role:', error);
      return false;
    }
  }

  /**
   * Remove team member
   */
  async removeMember(
    teamId: string,
    memberId: string,
    removedBy: string,
  ): Promise<boolean> {
    try {
      const success = await this.rbac.removeTeamMember(teamId, memberId);

      if (success) {
        // Log activity
        await this.logActivity(
          teamId,
          removedBy,
          'member_removed',
          'team_member',
          memberId,
        );
      }

      return success;
    } catch (error) {
      console.error('Error removing team member:', error);
      return false;
    }
  }

  /**
   * Assign clients to team member
   */
  async assignClients(
    teamId: string,
    memberId: string,
    clientIds: string[],
    assignedBy: string,
  ): Promise<boolean> {
    try {
      const success = await this.rbac.assignClients(
        teamId,
        memberId,
        clientIds,
      );

      if (success) {
        // Log activity
        await this.logActivity(
          teamId,
          assignedBy,
          'clients_assigned',
          'team_member',
          memberId,
          {
            clientIds,
            count: clientIds.length,
          },
        );
      }

      return success;
    } catch (error) {
      console.error('Error assigning clients:', error);
      return false;
    }
  }

  /**
   * Get team invitations
   */
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    try {
      const { data: invitations, error } = await this.supabase
        .from('team_invitations')
        .select(
          `
          *,
          invited_by_user:invited_by(id, email, raw_user_meta_data),
          accepted_by_user:accepted_by(id, email, raw_user_meta_data)
        `,
        )
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch team invitations:', error);
        return [];
      }

      return invitations?.map(this.mapInvitationFromDB) || [];
    } catch (error) {
      console.error('Error fetching team invitations:', error);
      return [];
    }
  }

  /**
   * Get team activity log
   */
  async getTeamActivity(
    teamId: string,
    limit: number = 50,
  ): Promise<TeamActivity[]> {
    try {
      const { data: activities, error } = await this.supabase
        .from('team_activity_log')
        .select(
          `
          *,
          users:user_id(id, email, raw_user_meta_data)
        `,
        )
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch team activity:', error);
        return [];
      }

      return activities?.map(this.mapActivityFromDB) || [];
    } catch (error) {
      console.error('Error fetching team activity:', error);
      return [];
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<TeamStats> {
    try {
      const [members, invitations, recentActivity] = await Promise.all([
        this.getTeamMembers(teamId),
        this.getTeamInvitations(teamId),
        this.getTeamActivity(teamId, 10),
      ]);

      const activeMembers = members.filter((m) => m.status === 'active');
      const pendingInvitations = invitations.filter(
        (i) => i.status === 'pending',
      );

      const roleDistribution: Record<TeamRole, number> = {
        owner: 0,
        senior_photographer: 0,
        photographer: 0,
        coordinator: 0,
        viewer: 0,
      };

      activeMembers.forEach((member) => {
        roleDistribution[member.role]++;
      });

      return {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        pendingInvitations: pendingInvitations.length,
        roleDistribution,
        recentActivity: recentActivity.length,
      };
    } catch (error) {
      console.error('Error calculating team stats:', error);
      return {
        totalMembers: 0,
        activeMembers: 0,
        pendingInvitations: 0,
        roleDistribution: {
          owner: 0,
          senior_photographer: 0,
          photographer: 0,
          coordinator: 0,
          viewer: 0,
        },
        recentActivity: 0,
      };
    }
  }

  /**
   * Update member last active timestamp
   */
  async updateMemberActivity(memberId: string): Promise<void> {
    try {
      await this.supabase
        .from('team_members')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', memberId);
    } catch (error) {
      console.error('Error updating member activity:', error);
    }
  }

  // Private helper methods
  private mapTeamFromDB(dbTeam: any): Team {
    return {
      id: dbTeam.id,
      name: dbTeam.name,
      ownerId: dbTeam.owner_id,
      description: dbTeam.description,
      businessType: dbTeam.business_type,
      subscriptionPlan: dbTeam.subscription_plan,
      maxTeamMembers: dbTeam.max_team_members,
      settings: dbTeam.settings || {
        allowInvitations: true,
        requireApproval: true,
        defaultRole: 'viewer' as TeamRole,
      },
      createdAt: new Date(dbTeam.created_at),
      updatedAt: new Date(dbTeam.updated_at),
    };
  }

  private mapTeamMemberFromDB(dbMember: any): TeamMember {
    return {
      id: dbMember.id,
      teamId: dbMember.team_id,
      userId: dbMember.user_id,
      email: dbMember.email,
      role: dbMember.role as TeamRole,
      status: dbMember.status,
      permissions: dbMember.permissions || {},
      assignedClients: dbMember.assigned_clients || [],
      lastActiveAt: dbMember.last_active_at
        ? new Date(dbMember.last_active_at)
        : undefined,
      invitedAt: new Date(dbMember.invited_at),
      acceptedAt: dbMember.accepted_at
        ? new Date(dbMember.accepted_at)
        : undefined,
    };
  }

  private mapInvitationFromDB(dbInvitation: any): TeamInvitation {
    return {
      id: dbInvitation.id,
      teamId: dbInvitation.team_id,
      email: dbInvitation.email,
      role: dbInvitation.role as TeamRole,
      invitedBy: dbInvitation.invited_by,
      token: dbInvitation.token,
      expiresAt: new Date(dbInvitation.expires_at),
      status: dbInvitation.status,
      message: dbInvitation.message,
      acceptedAt: dbInvitation.accepted_at
        ? new Date(dbInvitation.accepted_at)
        : undefined,
      createdAt: new Date(dbInvitation.created_at),
    };
  }

  private mapActivityFromDB(dbActivity: any): TeamActivity {
    return {
      id: dbActivity.id,
      teamId: dbActivity.team_id,
      userId: dbActivity.user_id,
      action: dbActivity.action,
      resource: dbActivity.resource,
      resourceId: dbActivity.resource_id,
      details: dbActivity.details || {},
      ipAddress: dbActivity.ip_address,
      userAgent: dbActivity.user_agent,
      createdAt: new Date(dbActivity.created_at),
    };
  }

  private async logActivity(
    teamId: string,
    userId: string,
    action: string,
    resource?: string,
    resourceId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_team_activity', {
        p_team_id: teamId,
        p_user_id: userId,
        p_action: action,
        p_resource: resource,
        p_resource_id: resourceId,
        p_details: details || {},
      });
    } catch (error) {
      console.error('Failed to log team activity:', error);
    }
  }
}
