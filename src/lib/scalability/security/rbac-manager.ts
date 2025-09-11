/**
 * WS-340: Role-Based Access Control Manager
 * Team B - Backend/API Development
 *
 * Enterprise RBAC system for scalability infrastructure
 * Manages permissions for scaling actions and system access
 */

import { z } from 'zod';

// User and Role Definitions
export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  organizationId: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  name: RoleName;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  organizationId?: string;
}

export type RoleName =
  | 'scalability_admin'
  | 'scalability_operator'
  | 'scalability_viewer'
  | 'wedding_coordinator'
  | 'system_admin'
  | 'developer';

export interface Permission {
  id: string;
  name: PermissionName;
  description: string;
  category: PermissionCategory;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export type PermissionName =
  // Read permissions
  | 'scalability_metrics_read'
  | 'scalability_dashboard_view'
  | 'wedding_context_read'
  | 'system_health_read'
  // Write permissions
  | 'scalability_metrics_write'
  | 'scaling_actions_execute'
  | 'scaling_emergency_execute'
  | 'scaling_force_execute'
  // Admin permissions
  | 'scalability_config_manage'
  | 'cost_limits_bypass'
  | 'audit_logs_access'
  | 'user_permissions_manage'
  // Service-specific permissions
  | 'scale_api_service'
  | 'scale_database_service'
  | 'scale_storage_service'
  | 'scale_realtime_service'
  | 'scale_ai_services'
  | 'scale_all_services'
  // Wedding-specific permissions
  | 'wedding_day_override'
  | 'wedding_priority_scaling'
  | 'wedding_budget_increase';

export type PermissionCategory =
  | 'read'
  | 'write'
  | 'admin'
  | 'service'
  | 'wedding'
  | 'emergency';

// Access Control Request/Response
export interface AccessRequest {
  userId: string;
  resource: string;
  action: string;
  context?: AccessContext;
}

export interface AccessContext {
  serviceId?: string;
  weddingId?: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  costImpact?: number;
  isWeddingDay?: boolean;
  requestTime?: Date;
}

export interface AccessResult {
  granted: boolean;
  reason?: string;
  requiredPermissions?: PermissionName[];
  additionalInfo?: string;
  expiresAt?: Date;
}

// Audit Log Entry
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  result: 'granted' | 'denied';
  reason?: string;
  context?: AccessContext;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export class RBACManager {
  private users: Map<string, User> = new Map();
  private roles: Map<string, UserRole> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private sessionCache: Map<
    string,
    { userId: string; permissions: Permission[]; expiresAt: Date }
  > = new Map();

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPermissions(): void {
    const permissions: Permission[] = [
      // Read permissions
      {
        id: 'perm_metrics_read',
        name: 'scalability_metrics_read',
        description: 'View scalability metrics and system performance data',
        category: 'read',
        riskLevel: 'low',
      },
      {
        id: 'perm_dashboard_view',
        name: 'scalability_dashboard_view',
        description: 'Access scalability monitoring dashboard',
        category: 'read',
        riskLevel: 'low',
      },
      {
        id: 'perm_wedding_read',
        name: 'wedding_context_read',
        description: 'View wedding context and related scaling information',
        category: 'wedding',
        riskLevel: 'low',
      },
      {
        id: 'perm_health_read',
        name: 'system_health_read',
        description: 'View system health status and alerts',
        category: 'read',
        riskLevel: 'low',
      },

      // Write permissions
      {
        id: 'perm_metrics_write',
        name: 'scalability_metrics_write',
        description: 'Modify scalability metrics and thresholds',
        category: 'write',
        riskLevel: 'medium',
      },
      {
        id: 'perm_scaling_execute',
        name: 'scaling_actions_execute',
        description: 'Execute standard scaling actions',
        category: 'write',
        riskLevel: 'medium',
      },
      {
        id: 'perm_emergency_scaling',
        name: 'scaling_emergency_execute',
        description: 'Execute emergency scaling actions',
        category: 'emergency',
        riskLevel: 'high',
      },
      {
        id: 'perm_force_scaling',
        name: 'scaling_force_execute',
        description: 'Force scaling actions bypassing safety checks',
        category: 'emergency',
        riskLevel: 'critical',
      },

      // Admin permissions
      {
        id: 'perm_config_manage',
        name: 'scalability_config_manage',
        description: 'Manage scalability configuration and settings',
        category: 'admin',
        riskLevel: 'high',
      },
      {
        id: 'perm_cost_bypass',
        name: 'cost_limits_bypass',
        description: 'Bypass cost limits for scaling actions',
        category: 'admin',
        riskLevel: 'high',
      },
      {
        id: 'perm_audit_access',
        name: 'audit_logs_access',
        description: 'Access and review audit logs',
        category: 'admin',
        riskLevel: 'medium',
      },
      {
        id: 'perm_user_manage',
        name: 'user_permissions_manage',
        description: 'Manage user permissions and roles',
        category: 'admin',
        riskLevel: 'critical',
      },

      // Service-specific permissions
      {
        id: 'perm_scale_api',
        name: 'scale_api_service',
        description: 'Scale API service instances',
        category: 'service',
        riskLevel: 'medium',
      },
      {
        id: 'perm_scale_database',
        name: 'scale_database_service',
        description: 'Scale database service instances',
        category: 'service',
        riskLevel: 'high',
      },
      {
        id: 'perm_scale_storage',
        name: 'scale_storage_service',
        description: 'Scale storage service instances',
        category: 'service',
        riskLevel: 'medium',
      },
      {
        id: 'perm_scale_realtime',
        name: 'scale_realtime_service',
        description: 'Scale real-time service instances',
        category: 'service',
        riskLevel: 'medium',
      },
      {
        id: 'perm_scale_ai',
        name: 'scale_ai_services',
        description: 'Scale AI service instances',
        category: 'service',
        riskLevel: 'medium',
      },
      {
        id: 'perm_scale_all',
        name: 'scale_all_services',
        description: 'Scale any service instances',
        category: 'service',
        riskLevel: 'high',
      },

      // Wedding-specific permissions
      {
        id: 'perm_wedding_override',
        name: 'wedding_day_override',
        description: 'Override normal scaling restrictions on wedding days',
        category: 'wedding',
        riskLevel: 'high',
      },
      {
        id: 'perm_wedding_priority',
        name: 'wedding_priority_scaling',
        description: 'Execute priority scaling for wedding events',
        category: 'wedding',
        riskLevel: 'medium',
      },
      {
        id: 'perm_wedding_budget',
        name: 'wedding_budget_increase',
        description: 'Increase budget limits for wedding-related scaling',
        category: 'wedding',
        riskLevel: 'high',
      },
    ];

    permissions.forEach((permission) => {
      this.permissions.set(permission.name, permission);
    });

    console.log(
      `[RBACManager] Initialized ${permissions.length} default permissions`,
    );
  }

  private initializeDefaultRoles(): void {
    const roles: UserRole[] = [
      {
        id: 'role_scalability_admin',
        name: 'scalability_admin',
        description: 'Full administrative access to scalability system',
        permissions: [
          // All permissions for admin role
          ...Array.from(this.permissions.values()),
        ],
        isSystemRole: true,
      },
      {
        id: 'role_scalability_operator',
        name: 'scalability_operator',
        description: 'Operational access to scaling actions and monitoring',
        permissions: [],
        isSystemRole: true,
      },
      {
        id: 'role_scalability_viewer',
        name: 'scalability_viewer',
        description: 'Read-only access to scalability metrics and dashboards',
        permissions: [],
        isSystemRole: true,
      },
      {
        id: 'role_wedding_coordinator',
        name: 'wedding_coordinator',
        description: 'Wedding-specific scaling permissions',
        permissions: [],
        isSystemRole: true,
      },
      {
        id: 'role_system_admin',
        name: 'system_admin',
        description: 'System-wide administrative access',
        permissions: [],
        isSystemRole: true,
      },
      {
        id: 'role_developer',
        name: 'developer',
        description: 'Development and testing access',
        permissions: [],
        isSystemRole: true,
      },
    ];

    // Assign permissions to roles after permissions are initialized
    this.assignPermissionsToRoles(roles);

    roles.forEach((role) => {
      this.roles.set(role.name, role);
    });

    console.log(`[RBACManager] Initialized ${roles.length} default roles`);
  }

  private assignPermissionsToRoles(roles: UserRole[]): void {
    // Get permissions by name helper
    const getPermissions = (names: PermissionName[]): Permission[] => {
      return names
        .map((name) => this.permissions.get(name))
        .filter(Boolean) as Permission[];
    };

    const rolePermissions: Record<RoleName, PermissionName[]> = {
      scalability_admin: [
        // All permissions
        'scalability_metrics_read',
        'scalability_dashboard_view',
        'wedding_context_read',
        'system_health_read',
        'scalability_metrics_write',
        'scaling_actions_execute',
        'scaling_emergency_execute',
        'scaling_force_execute',
        'scalability_config_manage',
        'cost_limits_bypass',
        'audit_logs_access',
        'user_permissions_manage',
        'scale_all_services',
        'wedding_day_override',
        'wedding_priority_scaling',
        'wedding_budget_increase',
      ],
      scalability_operator: [
        'scalability_metrics_read',
        'scalability_dashboard_view',
        'system_health_read',
        'scaling_actions_execute',
        'scaling_emergency_execute',
        'scale_api_service',
        'scale_storage_service',
        'scale_realtime_service',
        'scale_ai_services',
        'wedding_priority_scaling',
      ],
      scalability_viewer: [
        'scalability_metrics_read',
        'scalability_dashboard_view',
        'wedding_context_read',
        'system_health_read',
      ],
      wedding_coordinator: [
        'scalability_metrics_read',
        'scalability_dashboard_view',
        'wedding_context_read',
        'system_health_read',
        'scaling_actions_execute',
        'wedding_priority_scaling',
        'wedding_day_override',
      ],
      system_admin: [
        // Most permissions except user management
        'scalability_metrics_read',
        'scalability_dashboard_view',
        'wedding_context_read',
        'system_health_read',
        'scalability_metrics_write',
        'scaling_actions_execute',
        'scaling_emergency_execute',
        'scalability_config_manage',
        'cost_limits_bypass',
        'audit_logs_access',
        'scale_all_services',
      ],
      developer: [
        'scalability_metrics_read',
        'scalability_dashboard_view',
        'system_health_read',
        'scale_api_service',
        'scale_storage_service',
      ],
    };

    roles.forEach((role) => {
      const permissionNames = rolePermissions[role.name] || [];
      role.permissions = getPermissions(permissionNames);
    });
  }

  async checkAccess(request: AccessRequest): Promise<AccessResult> {
    try {
      const user = await this.getUser(request.userId);
      if (!user) {
        const result: AccessResult = {
          granted: false,
          reason: 'User not found',
        };
        await this.logAccess(request, result);
        return result;
      }

      if (!user.isActive) {
        const result: AccessResult = {
          granted: false,
          reason: 'User account is inactive',
        };
        await this.logAccess(request, result);
        return result;
      }

      // Check basic resource access
      const resourceAccess = await this.checkResourceAccess(
        user,
        request.resource,
        request.action,
      );
      if (!resourceAccess.granted) {
        await this.logAccess(request, resourceAccess);
        return resourceAccess;
      }

      // Check context-specific access
      if (request.context) {
        const contextAccess = await this.checkContextualAccess(
          user,
          request,
          request.context,
        );
        if (!contextAccess.granted) {
          await this.logAccess(request, contextAccess);
          return contextAccess;
        }
      }

      // Access granted
      const result: AccessResult = {
        granted: true,
        reason: 'Access granted based on user permissions',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      };

      await this.logAccess(request, result);
      return result;
    } catch (error) {
      console.error('[RBACManager] Access check error:', error);
      const result: AccessResult = {
        granted: false,
        reason: 'Internal access control error',
      };
      await this.logAccess(request, result);
      return result;
    }
  }

  private async checkResourceAccess(
    user: User,
    resource: string,
    action: string,
  ): Promise<AccessResult> {
    const requiredPermissions = this.getRequiredPermissions(resource, action);
    const userPermissions = new Set(user.permissions.map((p) => p.name));

    const missingPermissions = requiredPermissions.filter(
      (perm) => !userPermissions.has(perm),
    );

    if (missingPermissions.length > 0) {
      return {
        granted: false,
        reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
        requiredPermissions: missingPermissions,
      };
    }

    return { granted: true };
  }

  private async checkContextualAccess(
    user: User,
    request: AccessRequest,
    context: AccessContext,
  ): Promise<AccessResult> {
    // Emergency scaling checks
    if (context.urgencyLevel === 'emergency') {
      const hasEmergencyPermission = user.permissions.some(
        (p) => p.name === 'scaling_emergency_execute',
      );
      if (!hasEmergencyPermission) {
        return {
          granted: false,
          reason: 'Emergency scaling permission required',
          requiredPermissions: ['scaling_emergency_execute'],
        };
      }
    }

    // Wedding day checks
    if (context.isWeddingDay && request.action === 'scale_down') {
      const hasWeddingOverride = user.permissions.some(
        (p) => p.name === 'wedding_day_override',
      );
      if (!hasWeddingOverride && !context.weddingId) {
        return {
          granted: false,
          reason:
            'Wedding day override permission required for scaling down on wedding days',
          requiredPermissions: ['wedding_day_override'],
        };
      }
    }

    // Cost impact checks
    if (context.costImpact && context.costImpact > 1000) {
      // $1000+ impact
      const hasCostBypass = user.permissions.some(
        (p) => p.name === 'cost_limits_bypass',
      );
      if (!hasCostBypass) {
        return {
          granted: false,
          reason:
            'Cost limits bypass permission required for high-cost scaling actions',
          requiredPermissions: ['cost_limits_bypass'],
        };
      }
    }

    // Service-specific checks
    if (context.serviceId) {
      const servicePermission =
        `scale_${context.serviceId}_service` as PermissionName;
      const hasServicePermission = user.permissions.some(
        (p) => p.name === servicePermission || p.name === 'scale_all_services',
      );

      if (!hasServicePermission) {
        return {
          granted: false,
          reason: `Permission required to scale ${context.serviceId} service`,
          requiredPermissions: [servicePermission],
        };
      }
    }

    return { granted: true };
  }

  private getRequiredPermissions(
    resource: string,
    action: string,
  ): PermissionName[] {
    const permissionMap: Record<string, Record<string, PermissionName[]>> = {
      scalability_metrics: {
        read: ['scalability_metrics_read'],
        write: ['scalability_metrics_write'],
      },
      scalability_dashboard: {
        view: ['scalability_dashboard_view'],
      },
      scaling_actions: {
        execute: ['scaling_actions_execute'],
        force_execute: ['scaling_force_execute'],
        emergency_execute: ['scaling_emergency_execute'],
      },
      system_health: {
        read: ['system_health_read'],
      },
      audit_logs: {
        access: ['audit_logs_access'],
      },
      scalability_config: {
        manage: ['scalability_config_manage'],
      },
      user_permissions: {
        manage: ['user_permissions_manage'],
      },
      wedding_context: {
        read: ['wedding_context_read'],
      },
    };

    return permissionMap[resource]?.[action] || [];
  }

  async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'permissions'>,
  ): Promise<User> {
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...userData,
      permissions: userData.role.permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    console.log(
      `[RBACManager] Created user: ${user.email} with role: ${user.role.name}`,
    );

    return user;
  }

  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async updateUserRole(userId: string, roleId: string): Promise<boolean> {
    const user = this.users.get(userId);
    const role = this.roles.get(roleId);

    if (!user || !role) {
      return false;
    }

    user.role = role;
    user.permissions = role.permissions;
    user.updatedAt = new Date();

    console.log(`[RBACManager] Updated user ${userId} role to ${role.name}`);
    return true;
  }

  async createRole(roleData: Omit<UserRole, 'id'>): Promise<UserRole> {
    const role: UserRole = {
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...roleData,
    };

    this.roles.set(role.name, role);
    console.log(`[RBACManager] Created role: ${role.name}`);

    return role;
  }

  async getRole(roleName: RoleName): Promise<UserRole | null> {
    return this.roles.get(roleName) || null;
  }

  async addPermissionToRole(
    roleName: RoleName,
    permissionName: PermissionName,
  ): Promise<boolean> {
    const role = this.roles.get(roleName);
    const permission = this.permissions.get(permissionName);

    if (!role || !permission) {
      return false;
    }

    if (!role.permissions.find((p) => p.name === permissionName)) {
      role.permissions.push(permission);

      // Update all users with this role
      for (const user of this.users.values()) {
        if (user.role.name === roleName) {
          user.permissions = role.permissions;
          user.updatedAt = new Date();
        }
      }

      console.log(
        `[RBACManager] Added permission ${permissionName} to role ${roleName}`,
      );
    }

    return true;
  }

  async removePermissionFromRole(
    roleName: RoleName,
    permissionName: PermissionName,
  ): Promise<boolean> {
    const role = this.roles.get(roleName);

    if (!role) {
      return false;
    }

    role.permissions = role.permissions.filter(
      (p) => p.name !== permissionName,
    );

    // Update all users with this role
    for (const user of this.users.values()) {
      if (user.role.name === roleName) {
        user.permissions = role.permissions;
        user.updatedAt = new Date();
      }
    }

    console.log(
      `[RBACManager] Removed permission ${permissionName} from role ${roleName}`,
    );
    return true;
  }

  private async logAccess(
    request: AccessRequest,
    result: AccessResult,
  ): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      action: request.action,
      resource: request.resource,
      result: result.granted ? 'granted' : 'denied',
      reason: result.reason,
      context: request.context,
      timestamp: new Date(),
      sessionId: `session_${request.userId}_${Date.now()}`,
    };

    this.auditLogs.push(logEntry);

    // Keep only last 10,000 log entries in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs.splice(0, 1000); // Remove oldest 1000 entries
    }

    // Log denied access attempts for security monitoring
    if (!result.granted) {
      console.warn(
        `[RBACManager] Access denied for user ${request.userId}: ${result.reason}`,
      );
    }
  }

  async getAuditLogs(filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    result?: 'granted' | 'denied';
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let filteredLogs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(
          (log) => log.userId === filters.userId,
        );
      }
      if (filters.resource) {
        filteredLogs = filteredLogs.filter(
          (log) => log.resource === filters.resource,
        );
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(
          (log) => log.action === filters.action,
        );
      }
      if (filters.result) {
        filteredLogs = filteredLogs.filter(
          (log) => log.result === filters.result,
        );
      }
      if (filters.fromDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp >= filters.fromDate!,
        );
      }
      if (filters.toDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp <= filters.toDate!,
        );
      }
    }

    // Sort by timestamp (most recent first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  async getSecuritySummary(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    totalPermissions: number;
    recentAccessAttempts: {
      granted: number;
      denied: number;
    };
    highRiskPermissionsInUse: number;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentLogs = this.auditLogs.filter(
      (log) => log.timestamp >= oneHourAgo,
    );
    const grantedAttempts = recentLogs.filter(
      (log) => log.result === 'granted',
    ).length;
    const deniedAttempts = recentLogs.filter(
      (log) => log.result === 'denied',
    ).length;

    const highRiskPermissions = Array.from(this.permissions.values()).filter(
      (p) => p.riskLevel === 'high' || p.riskLevel === 'critical',
    );

    const highRiskPermissionsInUse = Array.from(this.users.values()).reduce(
      (count, user) => {
        return (
          count +
          user.permissions.filter(
            (p) => p.riskLevel === 'high' || p.riskLevel === 'critical',
          ).length
        );
      },
      0,
    );

    return {
      totalUsers: this.users.size,
      activeUsers: Array.from(this.users.values()).filter((u) => u.isActive)
        .length,
      totalRoles: this.roles.size,
      totalPermissions: this.permissions.size,
      recentAccessAttempts: {
        granted: grantedAttempts,
        denied: deniedAttempts,
      },
      highRiskPermissionsInUse,
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const summary = await this.getSecuritySummary();
    const recentDeniedRate =
      summary.recentAccessAttempts.denied /
      (summary.recentAccessAttempts.granted +
        summary.recentAccessAttempts.denied);

    const details = {
      ...summary,
      auditLogCount: this.auditLogs.length,
      sessionCacheSize: this.sessionCache.size,
      deniedAccessRate: recentDeniedRate || 0,
    };

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (recentDeniedRate > 0.1) {
      // More than 10% denied access
      status = 'degraded';
    }

    if (recentDeniedRate > 0.3 || summary.activeUsers === 0) {
      // More than 30% denied or no active users
      status = 'unhealthy';
    }

    return { status, details };
  }
}
