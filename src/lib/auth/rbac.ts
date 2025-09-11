/**
 * Role-Based Access Control (RBAC) System
 * WS-073: Team Management - Wedding Business Collaboration
 */

import { createClient } from '@supabase/supabase-js';

// Team roles enum matching database
export type TeamRole =
  | 'owner'
  | 'senior_photographer'
  | 'photographer'
  | 'coordinator'
  | 'viewer';

// Resource types
export type Resource = 'clients' | 'analytics' | 'forms' | 'billing' | 'team';

// Action types
export type Action = 'read' | 'write' | 'delete' | 'invite' | 'manage';

// Permission interface
export interface Permission {
  resource: Resource;
  action: Action;
  allowed: boolean;
}

// Team member interface
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  email: string;
  role: TeamRole;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  permissions: Record<Resource, Record<Action, boolean>>;
  assignedClients: string[];
  lastActiveAt?: Date;
  invitedAt: Date;
  acceptedAt?: Date;
}

// Team interface
export interface Team {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  businessType: string;
  subscriptionPlan: string;
  maxTeamMembers: number;
  settings: {
    allowInvitations: boolean;
    requireApproval: boolean;
    defaultRole: TeamRole;
  };
  createdAt: Date;
  updatedAt: Date;
}

// RBAC Service Class
export class RBACService {
  private supabase: ReturnType<typeof createClient>;
  private userId: string | null = null;
  private userTeams: Map<string, TeamMember> = new Map();

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient;
  }

  /**
   * Initialize RBAC for current user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadUserTeams();
  }

  /**
   * Load user's team memberships
   */
  private async loadUserTeams(): Promise<void> {
    if (!this.userId) return;

    const { data: memberships, error } = await this.supabase
      .from('team_members')
      .select(
        `
        *,
        teams:team_id (
          id,
          name,
          owner_id,
          description,
          business_type,
          subscription_plan,
          max_team_members,
          settings
        )
      `,
      )
      .eq('user_id', this.userId)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to load user teams:', error);
      return;
    }

    this.userTeams.clear();
    memberships?.forEach((membership) => {
      this.userTeams.set(membership.team_id, {
        id: membership.id,
        teamId: membership.team_id,
        userId: membership.user_id,
        email: membership.email,
        role: membership.role as TeamRole,
        status: membership.status as any,
        permissions:
          membership.permissions ||
          this.getDefaultPermissions(membership.role as TeamRole),
        assignedClients: membership.assigned_clients || [],
        lastActiveAt: membership.last_active_at
          ? new Date(membership.last_active_at)
          : undefined,
        invitedAt: new Date(membership.invited_at),
        acceptedAt: membership.accepted_at
          ? new Date(membership.accepted_at)
          : undefined,
      });
    });
  }

  /**
   * Check if user has permission for specific action
   */
  async hasPermission(
    teamId: string,
    resource: Resource,
    action: Action,
    resourceId?: string,
  ): Promise<boolean> {
    if (!this.userId) return false;

    // Check if user is team owner
    const { data: team } = await this.supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    if (team?.owner_id === this.userId) {
      return true; // Owners have all permissions
    }

    // Get user's team membership
    const membership = this.userTeams.get(teamId);
    if (!membership || membership.status !== 'active') {
      return false;
    }

    // Use database function for permission check
    const { data: hasPermission } = await this.supabase.rpc(
      'has_team_permission',
      {
        p_team_id: teamId,
        p_user_id: this.userId,
        p_resource: resource,
        p_action: action,
      },
    );

    if (!hasPermission) return false;

    // Additional client-specific checks for photographers
    if (
      resource === 'clients' &&
      membership.role === 'photographer' &&
      resourceId
    ) {
      return membership.assignedClients.includes(resourceId);
    }

    return true;
  }

  /**
   * Get user's role in a specific team
   */
  getUserRole(teamId: string): TeamRole | null {
    const membership = this.userTeams.get(teamId);
    return membership?.role || null;
  }

  /**
   * Get user's teams
   */
  getUserTeams(): TeamMember[] {
    return Array.from(this.userTeams.values());
  }

  /**
   * Check if user owns a team
   */
  async isTeamOwner(teamId: string): Promise<boolean> {
    if (!this.userId) return false;

    const { data: team } = await this.supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    return team?.owner_id === this.userId;
  }

  /**
   * Get team details
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const { data: team, error } = await this.supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error || !team) return null;

    return {
      id: team.id,
      name: team.name,
      ownerId: team.owner_id,
      description: team.description,
      businessType: team.business_type,
      subscriptionPlan: team.subscription_plan,
      maxTeamMembers: team.max_team_members,
      settings: team.settings || {
        allowInvitations: true,
        requireApproval: true,
        defaultRole: 'viewer' as TeamRole,
      },
      createdAt: new Date(team.created_at),
      updatedAt: new Date(team.updated_at),
    };
  }

  /**
   * Create new team
   */
  async createTeam(teamData: {
    name: string;
    description?: string;
    businessType?: string;
    subscriptionPlan?: string;
  }): Promise<Team | null> {
    if (!this.userId) return null;

    const { data: team, error } = await this.supabase
      .from('teams')
      .insert({
        name: teamData.name,
        description: teamData.description,
        owner_id: this.userId,
        business_type: teamData.businessType || 'photography',
        subscription_plan: teamData.subscriptionPlan || 'professional',
      })
      .select()
      .single();

    if (error || !team) {
      console.error('Failed to create team:', error);
      return null;
    }

    // Log activity
    await this.logActivity(team.id, 'team_created', 'team', team.id);

    // Reload user teams
    await this.loadUserTeams();

    return this.getTeam(team.id);
  }

  /**
   * Invite team member
   */
  async inviteTeamMember(
    teamId: string,
    email: string,
    role: TeamRole,
    message?: string,
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    if (!this.userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user has permission to invite
    const canInvite = await this.hasPermission(teamId, 'team', 'invite');
    if (!canInvite) {
      return {
        success: false,
        error: 'Insufficient permissions to invite team members',
      };
    }

    // Generate invitation token
    const token = crypto.randomUUID();

    const { data: invitation, error } = await this.supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
        invited_by: this.userId,
        token,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create invitation:', error);
      return { success: false, error: 'Failed to create invitation' };
    }

    // Log activity
    await this.logActivity(
      teamId,
      'team_member_invited',
      'team_invitation',
      invitation.id,
      {
        email,
        role,
      },
    );

    return { success: true, invitationId: invitation.id };
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(token: string): Promise<{
    success: boolean;
    teamId?: string;
    error?: string;
  }> {
    if (!this.userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: result } = await this.supabase.rpc('accept_team_invitation', {
      p_token: token,
      p_user_id: this.userId,
    });

    if (!result?.success) {
      return {
        success: false,
        error: result?.error || 'Failed to accept invitation',
      };
    }

    // Reload user teams
    await this.loadUserTeams();

    return { success: true, teamId: result.team_id };
  }

  /**
   * Remove team member
   */
  async removeTeamMember(teamId: string, memberId: string): Promise<boolean> {
    const canManage = await this.hasPermission(teamId, 'team', 'manage');
    if (!canManage) return false;

    const { error } = await this.supabase
      .from('team_members')
      .update({ status: 'removed' })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Failed to remove team member:', error);
      return false;
    }

    // Log activity
    await this.logActivity(
      teamId,
      'team_member_removed',
      'team_member',
      memberId,
    );

    return true;
  }

  /**
   * Update team member role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: TeamRole,
  ): Promise<boolean> {
    const canManage = await this.hasPermission(teamId, 'team', 'manage');
    if (!canManage) return false;

    const { error } = await this.supabase
      .from('team_members')
      .update({
        role: newRole,
        permissions: this.getDefaultPermissions(newRole),
      })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Failed to update member role:', error);
      return false;
    }

    // Log activity
    await this.logActivity(
      teamId,
      'team_member_role_updated',
      'team_member',
      memberId,
      {
        newRole,
      },
    );

    // Reload user teams
    await this.loadUserTeams();

    return true;
  }

  /**
   * Assign clients to photographer
   */
  async assignClients(
    teamId: string,
    memberId: string,
    clientIds: string[],
  ): Promise<boolean> {
    const canManage = await this.hasPermission(teamId, 'team', 'manage');
    if (!canManage) return false;

    const { error } = await this.supabase
      .from('team_members')
      .update({ assigned_clients: clientIds })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Failed to assign clients:', error);
      return false;
    }

    // Log activity
    await this.logActivity(
      teamId,
      'clients_assigned',
      'team_member',
      memberId,
      {
        clientIds,
        count: clientIds.length,
      },
    );

    return true;
  }

  /**
   * Log team activity
   */
  private async logActivity(
    teamId: string,
    action: string,
    resource?: string,
    resourceId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    if (!this.userId) return;

    await this.supabase.rpc('log_team_activity', {
      p_team_id: teamId,
      p_user_id: this.userId,
      p_action: action,
      p_resource: resource,
      p_resource_id: resourceId,
      p_details: details || {},
    });
  }

  /**
   * Get default permissions for role
   */
  private getDefaultPermissions(
    role: TeamRole,
  ): Record<Resource, Record<Action, boolean>> {
    const permissions: Record<Resource, Record<Action, boolean>> = {
      clients: {
        read: false,
        write: false,
        delete: false,
        invite: false,
        manage: false,
      },
      analytics: {
        read: false,
        write: false,
        delete: false,
        invite: false,
        manage: false,
      },
      forms: {
        read: false,
        write: false,
        delete: false,
        invite: false,
        manage: false,
      },
      billing: {
        read: false,
        write: false,
        delete: false,
        invite: false,
        manage: false,
      },
      team: {
        read: false,
        write: false,
        delete: false,
        invite: false,
        manage: false,
      },
    };

    switch (role) {
      case 'owner':
        return {
          clients: {
            read: true,
            write: true,
            delete: true,
            invite: false,
            manage: false,
          },
          analytics: {
            read: true,
            write: true,
            delete: false,
            invite: false,
            manage: false,
          },
          forms: {
            read: true,
            write: true,
            delete: true,
            invite: false,
            manage: false,
          },
          billing: {
            read: true,
            write: true,
            delete: false,
            invite: false,
            manage: false,
          },
          team: {
            read: true,
            write: true,
            delete: false,
            invite: true,
            manage: true,
          },
        };

      case 'senior_photographer':
        return {
          clients: {
            read: true,
            write: true,
            delete: false,
            invite: false,
            manage: false,
          },
          analytics: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          forms: {
            read: true,
            write: true,
            delete: false,
            invite: false,
            manage: false,
          },
          billing: {
            read: false,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          team: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
        };

      case 'photographer':
        return {
          clients: {
            read: true,
            write: true,
            delete: false,
            invite: false,
            manage: false,
          },
          analytics: {
            read: false,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          forms: {
            read: true,
            write: true,
            delete: false,
            invite: false,
            manage: false,
          },
          billing: {
            read: false,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          team: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
        };

      case 'coordinator':
        return {
          clients: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          analytics: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          forms: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          billing: {
            read: false,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          team: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
        };

      case 'viewer':
      default:
        return {
          clients: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          analytics: {
            read: false,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          forms: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          billing: {
            read: false,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
          team: {
            read: true,
            write: false,
            delete: false,
            invite: false,
            manage: false,
          },
        };
    }
  }
}

// RBAC Hook for React components
export function createRBACHook(
  supabaseClient: ReturnType<typeof createClient>,
) {
  const rbac = new RBACService(supabaseClient);

  return {
    rbac,
    useRBAC: () => {
      return {
        hasPermission: rbac.hasPermission.bind(rbac),
        getUserRole: rbac.getUserRole.bind(rbac),
        getUserTeams: rbac.getUserTeams.bind(rbac),
        isTeamOwner: rbac.isTeamOwner.bind(rbac),
        createTeam: rbac.createTeam.bind(rbac),
        inviteTeamMember: rbac.inviteTeamMember.bind(rbac),
        acceptInvitation: rbac.acceptInvitation.bind(rbac),
        removeTeamMember: rbac.removeTeamMember.bind(rbac),
        updateMemberRole: rbac.updateMemberRole.bind(rbac),
        assignClients: rbac.assignClients.bind(rbac),
      };
    },
  };
}

// Permission constants for easier usage
export const PERMISSIONS = {
  CLIENTS: {
    READ: { resource: 'clients' as Resource, action: 'read' as Action },
    WRITE: { resource: 'clients' as Resource, action: 'write' as Action },
    DELETE: { resource: 'clients' as Resource, action: 'delete' as Action },
  },
  ANALYTICS: {
    READ: { resource: 'analytics' as Resource, action: 'read' as Action },
    WRITE: { resource: 'analytics' as Resource, action: 'write' as Action },
  },
  FORMS: {
    READ: { resource: 'forms' as Resource, action: 'read' as Action },
    WRITE: { resource: 'forms' as Resource, action: 'write' as Action },
    DELETE: { resource: 'forms' as Resource, action: 'delete' as Action },
  },
  BILLING: {
    READ: { resource: 'billing' as Resource, action: 'read' as Action },
    WRITE: { resource: 'billing' as Resource, action: 'write' as Action },
  },
  TEAM: {
    READ: { resource: 'team' as Resource, action: 'read' as Action },
    WRITE: { resource: 'team' as Resource, action: 'write' as Action },
    INVITE: { resource: 'team' as Resource, action: 'invite' as Action },
    MANAGE: { resource: 'team' as Resource, action: 'manage' as Action },
  },
} as const;
