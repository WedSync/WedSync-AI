/**
 * Timeline Permission Service - WS-160
 * Handles sharing, permissions, and access control for timelines
 */

import { createClient } from '@supabase/supabase-js';
import {
  TimelineCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
} from '@/types/timeline';

interface ShareSettings {
  allowVendorEdits: boolean;
  requireApproval: boolean;
  allowComments: boolean;
  allowSharing: boolean;
  linkExpiry?: string;
}

interface ShareLink {
  id: string;
  timelineId: string;
  token: string;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canComment: boolean;
  };
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

interface TimelineAccess {
  userId: string;
  timelineId: string;
  role: CollaboratorRole;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canComment: boolean;
    canManageVendors: boolean;
    canExport: boolean;
  };
  restrictions: {
    editableEventTypes?: string[];
    editableTimeRanges?: { start: string; end: string }[];
    maxEventsPerDay?: number;
  };
}

export class TimelinePermissionService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  /**
   * Add collaborator to timeline
   */
  async addCollaborator(
    timelineId: string,
    userEmail: string,
    role: CollaboratorRole,
    permissions: Partial<TimelineAccess['permissions']> = {},
    invitedBy: string,
  ): Promise<{
    success: boolean;
    collaborator?: TimelineCollaborator;
    error?: string;
  }> {
    try {
      // Check if user exists
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('email', userEmail.toLowerCase())
        .single();

      if (!user) {
        // Send invitation email to create account
        return this.sendInvitationEmail(timelineId, userEmail, role, invitedBy);
      }

      // Check if already a collaborator
      const { data: existingCollaborator } = await this.supabase
        .from('timeline_collaborators')
        .select('*')
        .eq('timeline_id', timelineId)
        .eq('user_id', user.id)
        .single();

      if (existingCollaborator) {
        // Update existing collaborator
        const { data: updatedCollaborator } = await this.supabase
          .from('timeline_collaborators')
          .update({
            role,
            ...this.getDefaultPermissions(role, permissions),
            status: 'active',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', existingCollaborator.id)
          .select('*')
          .single();

        return { success: true, collaborator: updatedCollaborator };
      }

      // Create new collaborator
      const collaboratorData = {
        timeline_id: timelineId,
        user_id: user.id,
        role,
        status: 'active' as CollaboratorStatus,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        ...this.getDefaultPermissions(role, permissions),
      };

      const { data: newCollaborator, error } = await this.supabase
        .from('timeline_collaborators')
        .insert(collaboratorData)
        .select('*')
        .single();

      if (error) throw error;

      // Log activity
      await this.logPermissionActivity(
        timelineId,
        invitedBy,
        'collaborator_added',
        {
          collaboratorId: newCollaborator.id,
          userEmail,
          role,
        },
      );

      return { success: true, collaborator: newCollaborator };
    } catch (error) {
      console.error('Failed to add collaborator:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Remove collaborator from timeline
   */
  async removeCollaborator(
    timelineId: string,
    collaboratorId: string,
    removedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get collaborator info for logging
      const { data: collaborator } = await this.supabase
        .from('timeline_collaborators')
        .select('*, user_profiles(*)')
        .eq('id', collaboratorId)
        .single();

      // Remove collaborator
      const { error } = await this.supabase
        .from('timeline_collaborators')
        .delete()
        .eq('id', collaboratorId)
        .eq('timeline_id', timelineId);

      if (error) throw error;

      // Log activity
      await this.logPermissionActivity(
        timelineId,
        removedBy,
        'collaborator_removed',
        {
          collaboratorId,
          userEmail: collaborator?.user_profiles?.email,
        },
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update collaborator permissions
   */
  async updateCollaboratorPermissions(
    timelineId: string,
    collaboratorId: string,
    permissions: Partial<TimelineAccess['permissions']>,
    restrictions: Partial<TimelineAccess['restrictions']>,
    updatedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('timeline_collaborators')
        .update({
          ...permissions,
          restrictions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collaboratorId)
        .eq('timeline_id', timelineId);

      if (error) throw error;

      // Log activity
      await this.logPermissionActivity(
        timelineId,
        updatedBy,
        'permissions_updated',
        {
          collaboratorId,
          permissions,
          restrictions,
        },
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to update permissions:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create shareable link
   */
  async createShareLink(
    timelineId: string,
    permissions: ShareLink['permissions'],
    expiresAt?: string,
    createdBy?: string,
  ): Promise<{ success: boolean; shareLink?: ShareLink; error?: string }> {
    try {
      const token = this.generateSecureToken();

      const shareLinkData = {
        timeline_id: timelineId,
        token,
        permissions,
        expires_at: expiresAt,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        access_count: 0,
      };

      const { data: shareLink, error } = await this.supabase
        .from('timeline_share_links')
        .insert(shareLinkData)
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, shareLink };
    } catch (error) {
      console.error('Failed to create share link:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Revoke share link
   */
  async revokeShareLink(
    linkId: string,
    timelineId: string,
    revokedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('timeline_share_links')
        .delete()
        .eq('id', linkId)
        .eq('timeline_id', timelineId);

      if (error) throw error;

      // Log activity
      await this.logPermissionActivity(
        timelineId,
        revokedBy,
        'share_link_revoked',
        {
          linkId,
        },
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to revoke share link:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Validate share link access
   */
  async validateShareLinkAccess(
    token: string,
  ): Promise<{ success: boolean; shareLink?: ShareLink; error?: string }> {
    try {
      const { data: shareLink, error } = await this.supabase
        .from('timeline_share_links')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !shareLink) {
        return { success: false, error: 'Invalid or expired share link' };
      }

      // Check if expired
      if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
        return { success: false, error: 'Share link has expired' };
      }

      // Update access tracking
      await this.supabase
        .from('timeline_share_links')
        .update({
          access_count: shareLink.access_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', shareLink.id);

      return { success: true, shareLink };
    } catch (error) {
      console.error('Failed to validate share link:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check user permissions for timeline
   */
  async checkUserPermissions(
    userId: string,
    timelineId: string,
  ): Promise<{ access: TimelineAccess | null; isOwner: boolean }> {
    try {
      // Check if user is timeline owner
      const { data: timeline } = await this.supabase
        .from('wedding_timelines')
        .select('created_by')
        .eq('id', timelineId)
        .single();

      const isOwner = timeline?.created_by === userId;

      if (isOwner) {
        return {
          access: {
            userId,
            timelineId,
            role: 'owner',
            permissions: {
              canView: true,
              canEdit: true,
              canDelete: true,
              canShare: true,
              canComment: true,
              canManageVendors: true,
              canExport: true,
            },
            restrictions: {},
          },
          isOwner: true,
        };
      }

      // Check collaborator permissions
      const { data: collaborator } = await this.supabase
        .from('timeline_collaborators')
        .select('*')
        .eq('timeline_id', timelineId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!collaborator) {
        return { access: null, isOwner: false };
      }

      return {
        access: {
          userId,
          timelineId,
          role: collaborator.role,
          permissions: {
            canView: collaborator.can_view ?? true,
            canEdit: collaborator.can_edit ?? false,
            canDelete: collaborator.can_delete ?? false,
            canShare: collaborator.can_share ?? false,
            canComment: collaborator.can_comment ?? true,
            canManageVendors: collaborator.can_manage_vendors ?? false,
            canExport: collaborator.can_export ?? true,
          },
          restrictions: collaborator.restrictions || {},
        },
        isOwner: false,
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return { access: null, isOwner: false };
    }
  }

  /**
   * Get all collaborators for timeline
   */
  async getTimelineCollaborators(
    timelineId: string,
  ): Promise<TimelineCollaborator[]> {
    const { data: collaborators } = await this.supabase
      .from('timeline_collaborators')
      .select(
        `
        *,
        user_profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `,
      )
      .eq('timeline_id', timelineId)
      .order('created_at', { ascending: true });

    return collaborators || [];
  }

  /**
   * Get active share links for timeline
   */
  async getTimelineShareLinks(timelineId: string): Promise<ShareLink[]> {
    const { data: shareLinks } = await this.supabase
      .from('timeline_share_links')
      .select('*')
      .eq('timeline_id', timelineId)
      .order('created_at', { ascending: false });

    return shareLinks || [];
  }

  /**
   * Update timeline sharing settings
   */
  async updateSharingSettings(
    timelineId: string,
    settings: ShareSettings,
    updatedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('wedding_timelines')
        .update({
          allow_vendor_edits: settings.allowVendorEdits,
          require_approval: settings.requireApproval,
          sharing_settings: {
            allowComments: settings.allowComments,
            allowSharing: settings.allowSharing,
            linkExpiry: settings.linkExpiry,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', timelineId);

      if (error) throw error;

      // Log activity
      await this.logPermissionActivity(
        timelineId,
        updatedBy,
        'sharing_settings_updated',
        settings,
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to update sharing settings:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send invitation email for new users
   */
  private async sendInvitationEmail(
    timelineId: string,
    email: string,
    role: CollaboratorRole,
    invitedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create pending invitation
      const invitation = {
        timeline_id: timelineId,
        email: email.toLowerCase(),
        role,
        invited_by: invitedBy,
        invited_at: new Date().toISOString(),
        status: 'pending',
        token: this.generateSecureToken(),
      };

      const { error } = await this.supabase
        .from('timeline_invitations')
        .insert(invitation);

      if (error) throw error;

      // TODO: Send actual email invitation
      // This would integrate with your email service
      console.log(`Invitation sent to ${email} for timeline ${timelineId}`);

      return { success: true };
    } catch (error) {
      console.error('Failed to send invitation:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get default permissions for role
   */
  private getDefaultPermissions(
    role: CollaboratorRole,
    overrides: Partial<TimelineAccess['permissions']> = {},
  ): Partial<TimelineCollaborator> {
    const defaults = {
      owner: {
        can_edit: true,
        can_comment: true,
        can_share: true,
        can_delete: true,
        can_manage_vendors: true,
        can_export: true,
      },
      editor: {
        can_edit: true,
        can_comment: true,
        can_share: false,
        can_delete: false,
        can_manage_vendors: true,
        can_export: true,
      },
      viewer: {
        can_edit: false,
        can_comment: true,
        can_share: false,
        can_delete: false,
        can_manage_vendors: false,
        can_export: true,
      },
    };

    return { ...defaults[role], ...overrides };
  }

  /**
   * Generate secure token for share links
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  /**
   * Log permission-related activity
   */
  private async logPermissionActivity(
    timelineId: string,
    userId: string,
    action: string,
    details: any,
  ): Promise<void> {
    try {
      await this.supabase.from('timeline_activity_logs').insert({
        timeline_id: timelineId,
        user_id: userId,
        action,
        entity_type: 'permissions',
        new_values: details,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log permission activity:', error);
    }
  }

  /**
   * Bulk update permissions for multiple collaborators
   */
  async bulkUpdatePermissions(
    timelineId: string,
    updates: Array<{
      collaboratorId: string;
      permissions: Partial<TimelineAccess['permissions']>;
      restrictions?: Partial<TimelineAccess['restrictions']>;
    }>,
    updatedBy: string,
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const update of updates) {
      const result = await this.updateCollaboratorPermissions(
        timelineId,
        update.collaboratorId,
        update.permissions,
        update.restrictions || {},
        updatedBy,
      );

      if (!result.success) {
        errors.push(result.error || 'Unknown error');
      }
    }

    return { success: errors.length === 0, errors };
  }
}

export default TimelinePermissionService;
