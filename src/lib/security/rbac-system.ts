import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';

// Wedding role definitions
export const WEDDING_ROLES = {
  OWNER: 'owner', // Wedding couple - full access
  PLANNER: 'planner', // Wedding planner - planning access
  VENDOR: 'vendor', // Service vendor - vendor access
  FAMILY: 'family', // Family member - limited planning access
  FRIEND: 'friend', // Friend - guest list access
  GUEST: 'guest', // Guest - view only access
} as const;

export type WeddingRole = (typeof WEDDING_ROLES)[keyof typeof WEDDING_ROLES];

// System role definitions
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin', // Full system access
  ADMIN: 'admin', // System administration
  SUPPORT: 'support', // Customer support access
  USER: 'user', // Standard user
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

// Permission categories
export const PERMISSIONS = {
  // Wedding data permissions
  WEDDING_VIEW: 'wedding.view',
  WEDDING_EDIT: 'wedding.edit',
  WEDDING_DELETE: 'wedding.delete',

  // Guest management
  GUEST_VIEW: 'guest.view',
  GUEST_ADD: 'guest.add',
  GUEST_EDIT: 'guest.edit',
  GUEST_DELETE: 'guest.delete',
  GUEST_IMPORT: 'guest.import',

  // Budget management
  BUDGET_VIEW: 'budget.view',
  BUDGET_EDIT: 'budget.edit',
  BUDGET_DELETE: 'budget.delete',

  // Vendor management
  VENDOR_VIEW: 'vendor.view',
  VENDOR_ADD: 'vendor.add',
  VENDOR_EDIT: 'vendor.edit',
  VENDOR_DELETE: 'vendor.delete',

  // Timeline management
  TIMELINE_VIEW: 'timeline.view',
  TIMELINE_EDIT: 'timeline.edit',

  // Communication
  COMMUNICATION_VIEW: 'communication.view',
  COMMUNICATION_SEND: 'communication.send',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_SECURITY: 'settings.security',

  // System permissions
  SYSTEM_ADMIN: 'system.admin',
  SYSTEM_SUPPORT: 'system.support',
  USER_MANAGEMENT: 'user.management',
  AUDIT_VIEW: 'audit.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role-Permission Matrix
export const ROLE_PERMISSIONS: Record<WeddingRole, Permission[]> = {
  [WEDDING_ROLES.OWNER]: [
    PERMISSIONS.WEDDING_VIEW,
    PERMISSIONS.WEDDING_EDIT,
    PERMISSIONS.WEDDING_DELETE,
    PERMISSIONS.GUEST_VIEW,
    PERMISSIONS.GUEST_ADD,
    PERMISSIONS.GUEST_EDIT,
    PERMISSIONS.GUEST_DELETE,
    PERMISSIONS.GUEST_IMPORT,
    PERMISSIONS.BUDGET_VIEW,
    PERMISSIONS.BUDGET_EDIT,
    PERMISSIONS.BUDGET_DELETE,
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.VENDOR_ADD,
    PERMISSIONS.VENDOR_EDIT,
    PERMISSIONS.VENDOR_DELETE,
    PERMISSIONS.TIMELINE_VIEW,
    PERMISSIONS.TIMELINE_EDIT,
    PERMISSIONS.COMMUNICATION_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.SETTINGS_SECURITY,
    PERMISSIONS.AUDIT_VIEW,
  ],
  [WEDDING_ROLES.PLANNER]: [
    PERMISSIONS.WEDDING_VIEW,
    PERMISSIONS.WEDDING_EDIT,
    PERMISSIONS.GUEST_VIEW,
    PERMISSIONS.GUEST_ADD,
    PERMISSIONS.GUEST_EDIT,
    PERMISSIONS.GUEST_IMPORT,
    PERMISSIONS.BUDGET_VIEW,
    PERMISSIONS.BUDGET_EDIT,
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.VENDOR_ADD,
    PERMISSIONS.VENDOR_EDIT,
    PERMISSIONS.TIMELINE_VIEW,
    PERMISSIONS.TIMELINE_EDIT,
    PERMISSIONS.COMMUNICATION_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  [WEDDING_ROLES.VENDOR]: [
    PERMISSIONS.WEDDING_VIEW,
    PERMISSIONS.GUEST_VIEW,
    PERMISSIONS.TIMELINE_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
  ],
  [WEDDING_ROLES.FAMILY]: [
    PERMISSIONS.WEDDING_VIEW,
    PERMISSIONS.GUEST_VIEW,
    PERMISSIONS.GUEST_ADD,
    PERMISSIONS.GUEST_EDIT,
    PERMISSIONS.TIMELINE_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
  ],
  [WEDDING_ROLES.FRIEND]: [
    PERMISSIONS.WEDDING_VIEW,
    PERMISSIONS.GUEST_VIEW,
    PERMISSIONS.TIMELINE_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
  ],
  [WEDDING_ROLES.GUEST]: [
    PERMISSIONS.WEDDING_VIEW,
    PERMISSIONS.TIMELINE_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
  ],
};

// System role permissions
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SYSTEM_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [SYSTEM_ROLES.ADMIN]: [
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.USER_MANAGEMENT,
    PERMISSIONS.AUDIT_VIEW,
  ],
  [SYSTEM_ROLES.SUPPORT]: [PERMISSIONS.SYSTEM_SUPPORT, PERMISSIONS.AUDIT_VIEW],
  [SYSTEM_ROLES.USER]: [], // No system permissions for regular users
};

// Validation schemas
const weddingRoleSchema = z.enum(
  Object.values(WEDDING_ROLES) as [WeddingRole, ...WeddingRole[]],
);
const systemRoleSchema = z.enum(
  Object.values(SYSTEM_ROLES) as [SystemRole, ...SystemRole[]],
);
const permissionSchema = z.enum(
  Object.values(PERMISSIONS) as [Permission, ...Permission[]],
);

export interface UserRoleContext {
  userId: string;
  weddingId?: string;
  weddingRole?: WeddingRole;
  systemRole?: SystemRole;
  permissions: Permission[];
  isOwner: boolean;
  canElevate: boolean;
}

export class RBACSystem {
  private supabase = createClientComponentClient();
  private roleCache = new Map<string, UserRoleContext>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get user's role context for a wedding
   */
  async getUserRoleContext(
    userId: string,
    weddingId?: string,
  ): Promise<UserRoleContext> {
    const cacheKey = `${userId}:${weddingId || 'system'}`;

    // Check cache first
    const cached = this.roleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let weddingRole: WeddingRole | undefined;
      let isOwner = false;
      const permissions: Permission[] = [];

      // Get system role
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('system_role')
        .eq('user_id', userId)
        .single();

      const systemRole =
        (userProfile?.system_role as SystemRole) || SYSTEM_ROLES.USER;

      // Add system permissions
      permissions.push(...SYSTEM_ROLE_PERMISSIONS[systemRole]);

      // Get wedding-specific role if wedding ID provided
      if (weddingId) {
        // Check if user is wedding owner
        const { data: wedding } = await this.supabase
          .from('weddings')
          .select('owner_id')
          .eq('id', weddingId)
          .single();

        if (wedding?.owner_id === userId) {
          isOwner = true;
          weddingRole = WEDDING_ROLES.OWNER;
        } else {
          // Check wedding collaborators
          const { data: collaborator } = await this.supabase
            .from('wedding_collaborators')
            .select('role, status')
            .eq('wedding_id', weddingId)
            .eq('user_id', userId)
            .eq('status', 'accepted')
            .single();

          if (collaborator) {
            weddingRole = collaborator.role as WeddingRole;
          }
        }

        // Add wedding permissions
        if (weddingRole && ROLE_PERMISSIONS[weddingRole]) {
          permissions.push(...ROLE_PERMISSIONS[weddingRole]);
        }
      }

      const context: UserRoleContext = {
        userId,
        weddingId,
        weddingRole,
        systemRole,
        permissions: [...new Set(permissions)], // Remove duplicates
        isOwner,
        canElevate: systemRole === SYSTEM_ROLES.SUPER_ADMIN || isOwner,
      };

      // Cache the context
      this.roleCache.set(cacheKey, context);
      setTimeout(() => this.roleCache.delete(cacheKey), this.CACHE_TTL);

      return context;
    } catch (error) {
      console.error('Failed to get user role context:', error);
      // Return minimal context on error
      return {
        userId,
        weddingId,
        systemRole: SYSTEM_ROLES.USER,
        permissions: [],
        isOwner: false,
        canElevate: false,
      };
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    permission: Permission,
    weddingId?: string,
  ): Promise<boolean> {
    try {
      const context = await this.getUserRoleContext(userId, weddingId);
      return context.permissions.includes(permission);
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    permissions: Permission[],
    weddingId?: string,
  ): Promise<boolean> {
    try {
      const context = await this.getUserRoleContext(userId, weddingId);
      return permissions.some((permission) =>
        context.permissions.includes(permission),
      );
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: Permission[],
    weddingId?: string,
  ): Promise<boolean> {
    try {
      const context = await this.getUserRoleContext(userId, weddingId);
      return permissions.every((permission) =>
        context.permissions.includes(permission),
      );
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Assign wedding role to user
   */
  async assignWeddingRole(
    weddingId: string,
    userId: string,
    role: WeddingRole,
    assignedBy: string,
  ): Promise<void> {
    try {
      weddingRoleSchema.parse(role);

      // Check if assigner has permission
      const assignerContext = await this.getUserRoleContext(
        assignedBy,
        weddingId,
      );
      if (!assignerContext.isOwner && !assignerContext.canElevate) {
        throw new Error('Insufficient permissions to assign roles');
      }

      // Insert or update wedding collaborator
      const { error } = await this.supabase
        .from('wedding_collaborators')
        .upsert({
          wedding_id: weddingId,
          user_id: userId,
          role,
          status: 'accepted',
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Clear cache for affected user
      this.clearUserCache(userId);

      // Log the role assignment
      await this.logRoleAssignment(weddingId, userId, role, assignedBy);
    } catch (error) {
      console.error('Role assignment failed:', error);
      throw new Error('Failed to assign wedding role');
    }
  }

  /**
   * Remove wedding role from user
   */
  async removeWeddingRole(
    weddingId: string,
    userId: string,
    removedBy: string,
  ): Promise<void> {
    try {
      // Check if remover has permission
      const removerContext = await this.getUserRoleContext(
        removedBy,
        weddingId,
      );
      if (!removerContext.isOwner && !removerContext.canElevate) {
        throw new Error('Insufficient permissions to remove roles');
      }

      // Don't allow removing the owner
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('owner_id')
        .eq('id', weddingId)
        .single();

      if (wedding?.owner_id === userId) {
        throw new Error('Cannot remove owner role');
      }

      // Remove wedding collaborator
      const { error } = await this.supabase
        .from('wedding_collaborators')
        .delete()
        .eq('wedding_id', weddingId)
        .eq('user_id', userId);

      if (error) throw error;

      // Clear cache for affected user
      this.clearUserCache(userId);

      // Log the role removal
      await this.logRoleRemoval(weddingId, userId, removedBy);
    } catch (error) {
      console.error('Role removal failed:', error);
      throw new Error('Failed to remove wedding role');
    }
  }

  /**
   * Assign system role to user
   */
  async assignSystemRole(
    userId: string,
    role: SystemRole,
    assignedBy: string,
  ): Promise<void> {
    try {
      systemRoleSchema.parse(role);

      // Check if assigner has permission
      const assignerContext = await this.getUserRoleContext(assignedBy);
      if (!assignerContext.permissions.includes(PERMISSIONS.USER_MANAGEMENT)) {
        throw new Error('Insufficient permissions to assign system roles');
      }

      // Update user profile
      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          system_role: role,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Clear cache for affected user
      this.clearUserCache(userId);

      // Log the role assignment
      await this.logSystemRoleAssignment(userId, role, assignedBy);
    } catch (error) {
      console.error('System role assignment failed:', error);
      throw new Error('Failed to assign system role');
    }
  }

  /**
   * Get wedding collaborators with roles
   */
  async getWeddingCollaborators(weddingId: string) {
    try {
      const { data, error } = await this.supabase
        .from('wedding_collaborators')
        .select(
          `
          *,
          user_profiles!inner(
            user_id,
            full_name,
            email,
            avatar_url
          )
        `,
        )
        .eq('wedding_id', weddingId)
        .eq('status', 'accepted');

      if (error) throw error;

      return data.map((collaborator) => ({
        userId: collaborator.user_id,
        role: collaborator.role,
        assignedAt: collaborator.assigned_at,
        assignedBy: collaborator.assigned_by,
        user: collaborator.user_profiles,
        permissions: ROLE_PERMISSIONS[collaborator.role as WeddingRole] || [],
      }));
    } catch (error) {
      console.error('Failed to get wedding collaborators:', error);
      return [];
    }
  }

  /**
   * Check resource access with row-level permissions
   */
  async checkResourceAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    operation: 'read' | 'write' | 'delete',
  ): Promise<boolean> {
    try {
      // This would integrate with Supabase RLS policies
      // For now, implement basic checks

      if (resourceType === 'wedding') {
        const context = await this.getUserRoleContext(userId, resourceId);

        switch (operation) {
          case 'read':
            return context.permissions.includes(PERMISSIONS.WEDDING_VIEW);
          case 'write':
            return context.permissions.includes(PERMISSIONS.WEDDING_EDIT);
          case 'delete':
            return context.permissions.includes(PERMISSIONS.WEDDING_DELETE);
          default:
            return false;
        }
      }

      // Add more resource types as needed
      return false;
    } catch (error) {
      console.error('Resource access check failed:', error);
      return false;
    }
  }

  /**
   * Clear user cache
   */
  private clearUserCache(userId: string): void {
    // Clear all cache entries for this user
    for (const key of this.roleCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.roleCache.delete(key);
      }
    }
  }

  /**
   * Log role assignment
   */
  private async logRoleAssignment(
    weddingId: string,
    userId: string,
    role: WeddingRole,
    assignedBy: string,
  ): Promise<void> {
    try {
      await this.supabase.from('security_audit_log').insert({
        event_type: 'role_assigned',
        user_id: userId,
        wedding_id: weddingId,
        details: {
          role,
          assigned_by: assignedBy,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log role assignment:', error);
    }
  }

  /**
   * Log role removal
   */
  private async logRoleRemoval(
    weddingId: string,
    userId: string,
    removedBy: string,
  ): Promise<void> {
    try {
      await this.supabase.from('security_audit_log').insert({
        event_type: 'role_removed',
        user_id: userId,
        wedding_id: weddingId,
        details: {
          removed_by: removedBy,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log role removal:', error);
    }
  }

  /**
   * Log system role assignment
   */
  private async logSystemRoleAssignment(
    userId: string,
    role: SystemRole,
    assignedBy: string,
  ): Promise<void> {
    try {
      await this.supabase.from('security_audit_log').insert({
        event_type: 'system_role_assigned',
        user_id: userId,
        details: {
          system_role: role,
          assigned_by: assignedBy,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log system role assignment:', error);
    }
  }
}

// Singleton instance
export const rbacSystem = new RBACSystem();

// Utility functions
export function getRolePermissions(role: WeddingRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function getSystemRolePermissions(role: SystemRole): Permission[] {
  return SYSTEM_ROLE_PERMISSIONS[role] || [];
}

export function canUserPerformAction(
  userPermissions: Permission[],
  requiredPermission: Permission,
): boolean {
  return userPermissions.includes(requiredPermission);
}

// React hook for RBAC
export function useRBAC() {
  return {
    getUserRoleContext: rbacSystem.getUserRoleContext.bind(rbacSystem),
    hasPermission: rbacSystem.hasPermission.bind(rbacSystem),
    hasAnyPermission: rbacSystem.hasAnyPermission.bind(rbacSystem),
    hasAllPermissions: rbacSystem.hasAllPermissions.bind(rbacSystem),
    assignWeddingRole: rbacSystem.assignWeddingRole.bind(rbacSystem),
    removeWeddingRole: rbacSystem.removeWeddingRole.bind(rbacSystem),
    assignSystemRole: rbacSystem.assignSystemRole.bind(rbacSystem),
    getWeddingCollaborators:
      rbacSystem.getWeddingCollaborators.bind(rbacSystem),
    checkResourceAccess: rbacSystem.checkResourceAccess.bind(rbacSystem),
  };
}
