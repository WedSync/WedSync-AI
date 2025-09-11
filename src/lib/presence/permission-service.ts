/**
 * WS-204: Presence Tracking System - Permission Service
 *
 * Relationship-based access control for presence data with wedding industry context.
 * Handles privacy enforcement, relationship validation, and permission caching.
 *
 * Features:
 * - Wedding-specific relationship validation (supplier-client, organization teams)
 * - Granular privacy controls with user preference enforcement
 * - Performance-optimized permission caching with TTL
 * - Bulk permission checking for efficient queries
 * - Enterprise compliance with audit trail support
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { PresenceSettings } from './presence-manager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum RelationshipType {
  SAME_USER = 'same_user',
  ORGANIZATION_MEMBER = 'organization_member',
  WEDDING_COLLABORATOR = 'wedding_collaborator',
  PUBLIC = 'public',
  NONE = 'none',
}

export enum VisibilityLevel {
  EVERYONE = 'everyone',
  TEAM = 'team',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

export interface RelationshipData {
  type: RelationshipType;
  canViewPresence: boolean;
  canViewActivity: boolean;
  canViewCurrentPage: boolean;
  organizationId?: string;
  weddingId?: string;
  connectionType?: string;
}

export interface PermissionContext {
  viewerId: string;
  targetUserId: string;
  requestType: 'presence' | 'activity' | 'current_page';
  weddingContext?: string;
  organizationContext?: string;
}

export interface BulkPermissionResult {
  userId: string;
  canView: boolean;
  relationshipType: RelationshipType;
  restrictions: string[];
}

export interface PermissionAuditLog {
  viewerId: string;
  targetUserId: string;
  action: 'granted' | 'denied';
  reason: string;
  context: any;
  timestamp: Date;
}

// ============================================================================
// PERMISSION SERVICE CLASS
// ============================================================================

export class PresencePermissionService {
  private supabase: SupabaseClient<Database>;
  private permissionCache: Map<
    string,
    { data: RelationshipData; expires: Date }
  > = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // CORE PERMISSION CHECKING
  // ============================================================================

  /**
   * Check if viewer can access target user's presence data
   */
  async checkViewPermission(
    targetUserId: string,
    viewerId: string,
  ): Promise<boolean> {
    try {
      // Users can always see their own presence
      if (targetUserId === viewerId) {
        return true;
      }

      // Check cache first for performance
      const cached = this.getCachedPermission(viewerId, targetUserId);
      if (cached) {
        return cached.canViewPresence;
      }

      // Get target user's privacy settings
      const settings = await this.getPresenceSettings(targetUserId);

      // Apply privacy settings
      if (settings.appearOffline || settings.visibility === 'nobody') {
        await this.cachePermission(viewerId, targetUserId, {
          type: RelationshipType.NONE,
          canViewPresence: false,
          canViewActivity: false,
          canViewCurrentPage: false,
        });
        return false;
      }

      // Validate relationship based on visibility level
      const relationship = await this.validateRelationship(
        viewerId,
        targetUserId,
      );
      const canView = this.evaluatePermission(
        settings.visibility,
        relationship.type,
      );

      // Cache the result
      await this.cachePermission(viewerId, targetUserId, {
        ...relationship,
        canViewPresence: canView,
        canViewActivity: canView && settings.showActivity,
        canViewCurrentPage: canView && settings.showCurrentPage,
      });

      return canView;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Filter presence data array by viewer permissions
   */
  async filterPresenceByPermissions<T extends { userId: string }>(
    presenceData: T[],
    viewerId: string,
  ): Promise<T[]> {
    try {
      // Get all unique user IDs
      const userIds = [...new Set(presenceData.map((p) => p.userId))];

      // Check permissions in parallel
      const permissionPromises = userIds.map(async (userId) => ({
        userId,
        canView: await this.checkViewPermission(userId, viewerId),
      }));

      const permissions = await Promise.all(permissionPromises);
      const allowedUserIds = new Set(
        permissions.filter((p) => p.canView).map((p) => p.userId),
      );

      // Filter original array
      return presenceData.filter((item) => allowedUserIds.has(item.userId));
    } catch (error) {
      console.error('Failed to filter presence by permissions:', error);
      return [];
    }
  }

  /**
   * Bulk permission check for multiple users
   */
  async checkBulkPermissions(
    targetUserIds: string[],
    viewerId: string,
  ): Promise<BulkPermissionResult[]> {
    const results: BulkPermissionResult[] = [];

    try {
      // Process permissions in parallel
      const permissionPromises = targetUserIds.map(async (userId) => {
        const canView = await this.checkViewPermission(userId, viewerId);
        const relationship = await this.validateRelationship(viewerId, userId);

        return {
          userId,
          canView,
          relationshipType: relationship.type,
          restrictions: this.getPermissionRestrictions(
            userId,
            viewerId,
            relationship,
          ),
        };
      });

      const permissionResults = await Promise.all(permissionPromises);
      results.push(...permissionResults);

      return results;
    } catch (error) {
      console.error('Bulk permission check failed:', error);
      return results;
    }
  }

  /**
   * Check specific permission type (presence, activity, current page)
   */
  async checkSpecificPermission(context: PermissionContext): Promise<boolean> {
    try {
      const cached = this.getCachedPermission(
        context.viewerId,
        context.targetUserId,
      );

      if (cached) {
        switch (context.requestType) {
          case 'presence':
            return cached.canViewPresence;
          case 'activity':
            return cached.canViewActivity;
          case 'current_page':
            return cached.canViewCurrentPage;
          default:
            return false;
        }
      }

      // Fallback to full permission check
      const canViewPresence = await this.checkViewPermission(
        context.targetUserId,
        context.viewerId,
      );

      if (!canViewPresence) {
        return false;
      }

      // Get specific permission based on settings
      const settings = await this.getPresenceSettings(context.targetUserId);

      switch (context.requestType) {
        case 'presence':
          return true; // Already validated above
        case 'activity':
          return settings.showActivity;
        case 'current_page':
          return settings.showCurrentPage;
        default:
          return false;
      }
    } catch (error) {
      console.error('Specific permission check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // RELATIONSHIP VALIDATION
  // ============================================================================

  /**
   * Validate relationship between two users
   */
  async validateRelationship(
    userId1: string,
    userId2: string,
  ): Promise<RelationshipData> {
    try {
      // Same user check
      if (userId1 === userId2) {
        return {
          type: RelationshipType.SAME_USER,
          canViewPresence: true,
          canViewActivity: true,
          canViewCurrentPage: true,
        };
      }

      // Check organization membership
      const orgRelationship = await this.checkOrganizationRelationship(
        userId1,
        userId2,
      );
      if (orgRelationship) {
        return {
          type: RelationshipType.ORGANIZATION_MEMBER,
          canViewPresence: false, // Determined by privacy settings
          canViewActivity: false,
          canViewCurrentPage: false,
          organizationId: orgRelationship.organizationId,
        };
      }

      // Check wedding collaboration
      const weddingRelationship =
        await this.checkWeddingCollaborationRelationship(userId1, userId2);
      if (weddingRelationship) {
        return {
          type: RelationshipType.WEDDING_COLLABORATOR,
          canViewPresence: false, // Determined by privacy settings
          canViewActivity: false,
          canViewCurrentPage: false,
          weddingId: weddingRelationship.weddingId,
          connectionType: weddingRelationship.connectionType,
        };
      }

      // No relationship found
      return {
        type: RelationshipType.NONE,
        canViewPresence: false,
        canViewActivity: false,
        canViewCurrentPage: false,
      };
    } catch (error) {
      console.error('Relationship validation failed:', error);
      return {
        type: RelationshipType.NONE,
        canViewPresence: false,
        canViewActivity: false,
        canViewCurrentPage: false,
      };
    }
  }

  /**
   * Get visibility level for user
   */
  async getVisibilityLevel(userId: string): Promise<VisibilityLevel> {
    try {
      const settings = await this.getPresenceSettings(userId);
      return settings.visibility as VisibilityLevel;
    } catch {
      return VisibilityLevel.CONTACTS; // Default visibility
    }
  }

  // ============================================================================
  // WEDDING INDUSTRY SPECIFIC METHODS
  // ============================================================================

  /**
   * Get wedding team presence with context-based filtering
   */
  async getWeddingTeamPresence(
    weddingId: string,
    viewerId: string,
  ): Promise<string[]> {
    try {
      // Get all wedding collaborators
      const { data: collaborators, error } = await this.supabase
        .from('vendor_wedding_connections')
        .select('supplier_id, client_id')
        .eq('wedding_id', weddingId)
        .eq('connection_status', 'active');

      if (error || !collaborators) {
        return [];
      }

      // Extract all user IDs
      const allUserIds = new Set<string>();
      collaborators.forEach((collab) => {
        if (collab.supplier_id) allUserIds.add(collab.supplier_id);
        if (collab.client_id) allUserIds.add(collab.client_id);
      });

      // Filter by permissions
      const userIds = Array.from(allUserIds);
      const permissionResults = await this.checkBulkPermissions(
        userIds,
        viewerId,
      );

      return permissionResults
        .filter((result) => result.canView)
        .map((result) => result.userId);
    } catch (error) {
      console.error('Failed to get wedding team presence:', error);
      return [];
    }
  }

  /**
   * Get organization team presence with role-based filtering
   */
  async getOrganizationTeamPresence(
    organizationId: string,
    viewerId: string,
  ): Promise<string[]> {
    try {
      // Get all organization members
      const { data: members, error } = await this.supabase
        .from('user_profiles')
        .select('user_id')
        .eq('organization_id', organizationId);

      if (error || !members) {
        return [];
      }

      const userIds = members.map((member) => member.user_id);
      const permissionResults = await this.checkBulkPermissions(
        userIds,
        viewerId,
      );

      return permissionResults
        .filter((result) => result.canView)
        .map((result) => result.userId);
    } catch (error) {
      console.error('Failed to get organization team presence:', error);
      return [];
    }
  }

  /**
   * Check if user can manage presence settings for target user
   */
  async canManagePresenceSettings(
    targetUserId: string,
    managerId: string,
  ): Promise<boolean> {
    try {
      // Users can always manage their own settings
      if (targetUserId === managerId) {
        return true;
      }

      // Check if manager is organization admin
      const { data: targetProfile } = await this.supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .single();

      if (!targetProfile?.organization_id) {
        return false;
      }

      const { data: managerProfile } = await this.supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', managerId)
        .eq('organization_id', targetProfile.organization_id)
        .single();

      return (
        managerProfile?.role === 'admin' || managerProfile?.role === 'owner'
      );
    } catch (error) {
      console.error('Failed to check management permissions:', error);
      return false;
    }
  }

  // ============================================================================
  // CACHING AND PERFORMANCE
  // ============================================================================

  /**
   * Get cached permission data
   */
  private getCachedPermission(
    viewerId: string,
    targetUserId: string,
  ): RelationshipData | null {
    const key = `${viewerId}:${targetUserId}`;
    const cached = this.permissionCache.get(key);

    if (cached && cached.expires > new Date()) {
      return cached.data;
    }

    // Clean up expired cache entry
    if (cached) {
      this.permissionCache.delete(key);
    }

    return null;
  }

  /**
   * Cache permission data
   */
  private async cachePermission(
    viewerId: string,
    targetUserId: string,
    data: RelationshipData,
  ): Promise<void> {
    const key = `${viewerId}:${targetUserId}`;
    const expires = new Date(Date.now() + this.CACHE_TTL);

    this.permissionCache.set(key, { data, expires });

    // Also persist to database cache table
    try {
      await this.supabase.from('presence_relationship_cache').upsert({
        user_id: viewerId,
        target_user_id: targetUserId,
        relationship_type: data.type,
        can_view_presence: data.canViewPresence,
        can_view_activity: data.canViewActivity,
        can_view_current_page: data.canViewCurrentPage,
        expires_at: expires.toISOString(),
      });
    } catch (error) {
      // Cache persistence failures are non-critical
      console.warn('Failed to persist permission cache:', error);
    }
  }

  /**
   * Invalidate permission cache for user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    // Clear in-memory cache
    const keysToDelete: string[] = [];
    for (const key of this.permissionCache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.permissionCache.delete(key));

    // Clear database cache
    try {
      await this.supabase
        .from('presence_relationship_cache')
        .delete()
        .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);
    } catch (error) {
      console.warn('Failed to invalidate database cache:', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getPresenceSettings(userId: string): Promise<PresenceSettings> {
    try {
      const { data, error } = await this.supabase
        .from('presence_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return this.getDefaultSettings();
      }

      return {
        visibility: data.visibility as any,
        showActivity: data.show_activity,
        showCurrentPage: data.show_current_page,
        appearOffline: data.appear_offline,
        customStatus: data.custom_status || undefined,
        customEmoji: data.custom_status_emoji || undefined,
      };
    } catch {
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): PresenceSettings {
    return {
      visibility: 'contacts',
      showActivity: true,
      showCurrentPage: false,
      appearOffline: false,
    };
  }

  private evaluatePermission(
    visibility: string,
    relationshipType: RelationshipType,
  ): boolean {
    switch (visibility) {
      case 'everyone':
        return true;
      case 'team':
        return relationshipType === RelationshipType.ORGANIZATION_MEMBER;
      case 'contacts':
        return relationshipType === RelationshipType.WEDDING_COLLABORATOR;
      case 'nobody':
        return false;
      default:
        return false;
    }
  }

  private async checkOrganizationRelationship(
    userId1: string,
    userId2: string,
  ): Promise<{ organizationId: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('user_id, organization_id')
        .in('user_id', [userId1, userId2])
        .not('organization_id', 'is', null);

      if (error || !data || data.length !== 2) {
        return null;
      }

      const [profile1, profile2] = data;
      if (profile1.organization_id === profile2.organization_id) {
        return { organizationId: profile1.organization_id };
      }

      return null;
    } catch {
      return null;
    }
  }

  private async checkWeddingCollaborationRelationship(
    userId1: string,
    userId2: string,
  ): Promise<{ weddingId: string; connectionType: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('vendor_wedding_connections')
        .select('wedding_id, connection_type')
        .or(
          `and(supplier_id.eq.${userId1},client_id.eq.${userId2}),and(client_id.eq.${userId1},supplier_id.eq.${userId2})`,
        )
        .eq('connection_status', 'active')
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        weddingId: data.wedding_id,
        connectionType: data.connection_type,
      };
    } catch {
      return null;
    }
  }

  private getPermissionRestrictions(
    userId: string,
    viewerId: string,
    relationship: RelationshipData,
  ): string[] {
    const restrictions: string[] = [];

    if (!relationship.canViewPresence) {
      restrictions.push('presence_hidden');
    }
    if (!relationship.canViewActivity) {
      restrictions.push('activity_hidden');
    }
    if (!relationship.canViewCurrentPage) {
      restrictions.push('current_page_hidden');
    }
    if (relationship.type === RelationshipType.NONE) {
      restrictions.push('no_relationship');
    }

    return restrictions;
  }
}

// ============================================================================
// SINGLETON INSTANCE AND HELPER FUNCTIONS
// ============================================================================

let permissionService: PresencePermissionService | null = null;

export function getPermissionService(): PresencePermissionService {
  if (!permissionService) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    permissionService = new PresencePermissionService(supabaseUrl, supabaseKey);
  }
  return permissionService;
}

/**
 * Helper function to check presence permissions
 */
export async function checkPresencePermissions(
  targetUserId: string,
  viewerId: string,
): Promise<boolean> {
  const service = getPermissionService();
  return service.checkViewPermission(targetUserId, viewerId);
}

/**
 * Helper function for bulk permission validation
 */
export async function validateBulkPresenceAccess(
  targetUserIds: string[],
  viewerId: string,
): Promise<string[]> {
  const service = getPermissionService();
  const results = await service.checkBulkPermissions(targetUserIds, viewerId);
  return results.filter((r) => r.canView).map((r) => r.userId);
}

export default PresencePermissionService;
