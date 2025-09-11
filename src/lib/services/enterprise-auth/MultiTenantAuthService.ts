/**
 * WS-251 Enterprise SSO Integration System
 * Multi-Tenant Authentication Service
 *
 * Handles enterprise-grade multi-tenant authentication with:
 * - Tenant isolation and cross-tenant security
 * - Wedding vendor organization management
 * - Tenant-specific SSO provider configurations
 * - Cross-vendor collaboration authentication
 * - Tenant lifecycle management
 * - Wedding industry specific multi-tenancy patterns
 */

import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';
import { EnterpriseTokenManager } from './EnterpriseTokenManager';
import { RoleBasedAccessControl } from './RoleBasedAccessControl';

export type TenantType =
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'catering'
  | 'music'
  | 'planning'
  | 'other';

export interface TenantInfo {
  id: string;
  name: string;
  type: TenantType;
  domain?: string;
  settings: {
    ssoEnabled: boolean;
    allowCrossTenantCollaboration: boolean;
    weddingDataSharing: boolean;
    brandingConfig: Record<string, any>;
    securitySettings: {
      requireMFA: boolean;
      sessionTimeout: number;
      allowedIPs?: string[];
      geoRestrictions?: string[];
    };
  };
  status: 'active' | 'suspended' | 'terminated';
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  crossTenantAccess: {
    allowedTenants: string[];
    restrictedTenants: string[];
  };
  weddingAccess: {
    ownedWeddings: string[];
    collaboratingWeddings: string[];
  };
  lastActivity: string;
}

export interface CrossTenantRequest {
  fromTenantId: string;
  toTenantId: string;
  userId: string;
  weddingId: string;
  requestType: 'vendor_collaboration' | 'data_access' | 'service_coordination';
  permissions: string[];
  expiresAt: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

export interface TenantAuthContext {
  tenantId: string;
  userId: string;
  userRole: string;
  tenantPermissions: string[];
  activeTenants: string[];
  currentWedding?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

export class MultiTenantAuthService {
  private supabase = createClient();
  private tokenManager = new EnterpriseTokenManager();
  private rbac = new RoleBasedAccessControl();

  /**
   * Initialize tenant authentication context
   */
  async initializeTenantAuth(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TenantAuthContext> {
    try {
      // Validate tenant exists and is active
      const tenant = await this.getTenantInfo(tenantId);
      if (!tenant || tenant.status !== 'active') {
        throw new Error('Tenant not found or inactive');
      }

      // Validate user has access to tenant
      const tenantUser = await this.getTenantUser(userId, tenantId);
      if (!tenantUser) {
        throw new Error('User does not have access to this tenant');
      }

      // Check IP restrictions if configured
      if (tenant.settings.securitySettings.allowedIPs && ipAddress) {
        const isAllowed =
          tenant.settings.securitySettings.allowedIPs.includes(ipAddress);
        if (!isAllowed) {
          await this.logSecurityEvent(
            tenantId,
            userId,
            'IP_RESTRICTION_VIOLATION',
            {
              ipAddress,
              allowedIPs: tenant.settings.securitySettings.allowedIPs,
            },
          );
          throw new Error('Access denied from this IP address');
        }
      }

      // Get all active tenants for this user
      const activeTenants = await this.getUserActiveTenants(userId);

      // Create session
      const sessionId = await this.createTenantSession(
        userId,
        tenantId,
        ipAddress,
        userAgent,
      );

      // Log tenant access
      await this.logTenantAccess(tenantId, userId, 'TENANT_AUTH_SUCCESS');

      return {
        tenantId,
        userId,
        userRole: tenantUser.role,
        tenantPermissions: tenantUser.permissions,
        activeTenants,
        sessionId,
        ipAddress,
        userAgent,
      };
    } catch (error) {
      await this.logTenantAccess(tenantId, userId, 'TENANT_AUTH_FAILED', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Switch between tenant contexts for multi-tenant users
   */
  async switchTenantContext(
    userId: string,
    fromTenantId: string,
    toTenantId: string,
    sessionId: string,
  ): Promise<TenantAuthContext> {
    try {
      // Validate current session
      const currentSession = await this.validateTenantSession(
        sessionId,
        userId,
        fromTenantId,
      );
      if (!currentSession) {
        throw new Error('Invalid or expired session');
      }

      // Validate access to target tenant
      const targetAccess = await this.getTenantUser(userId, toTenantId);
      if (!targetAccess) {
        throw new Error('User does not have access to target tenant');
      }

      // End current tenant session
      await this.endTenantSession(sessionId, fromTenantId);

      // Initialize new tenant context
      const newContext = await this.initializeTenantAuth(
        userId,
        toTenantId,
        currentSession.ipAddress,
        currentSession.userAgent,
      );

      await this.logTenantAccess(toTenantId, userId, 'TENANT_CONTEXT_SWITCH', {
        fromTenant: fromTenantId,
        toTenant: toTenantId,
      });

      return newContext;
    } catch (error) {
      await this.logTenantAccess(
        toTenantId,
        userId,
        'TENANT_CONTEXT_SWITCH_FAILED',
        {
          fromTenant: fromTenantId,
          error: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Handle cross-tenant collaboration requests for wedding vendors
   */
  async requestCrossTenantAccess(
    fromTenantId: string,
    toTenantId: string,
    userId: string,
    weddingId: string,
    requestType: CrossTenantRequest['requestType'],
    permissions: string[],
    expirationHours: number = 168, // Default 7 days
  ): Promise<string> {
    try {
      // Validate both tenants allow cross-tenant collaboration
      const fromTenant = await this.getTenantInfo(fromTenantId);
      const toTenant = await this.getTenantInfo(toTenantId);

      if (
        !fromTenant?.settings.allowCrossTenantCollaboration ||
        !toTenant?.settings.allowCrossTenantCollaboration
      ) {
        throw new Error(
          'Cross-tenant collaboration not enabled for one or both tenants',
        );
      }

      // Create cross-tenant request
      const { data: request, error } = await this.supabase
        .from('cross_tenant_requests')
        .insert({
          from_tenant_id: fromTenantId,
          to_tenant_id: toTenantId,
          user_id: userId,
          wedding_id: weddingId,
          request_type: requestType,
          permissions: permissions,
          expires_at: new Date(
            Date.now() + expirationHours * 60 * 60 * 1000,
          ).toISOString(),
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Notify tenant administrators
      await this.notifyTenantAdmins(toTenantId, 'CROSS_TENANT_REQUEST', {
        fromTenant: fromTenant.name,
        requestType,
        weddingId,
        permissions,
        requestId: request.id,
      });

      await this.logTenantAccess(
        fromTenantId,
        userId,
        'CROSS_TENANT_REQUEST_CREATED',
        {
          toTenant: toTenantId,
          weddingId,
          requestType,
          requestId: request.id,
        },
      );

      return request.id;
    } catch (error) {
      await this.logTenantAccess(
        fromTenantId,
        userId,
        'CROSS_TENANT_REQUEST_FAILED',
        {
          toTenant: toTenantId,
          error: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Approve or deny cross-tenant access requests
   */
  async handleCrossTenantRequest(
    requestId: string,
    adminUserId: string,
    adminTenantId: string,
    action: 'approve' | 'deny',
    conditions?: Record<string, any>,
  ): Promise<void> {
    try {
      // Validate admin has permission to approve
      const adminAccess = await this.getTenantUser(adminUserId, adminTenantId);
      if (
        !adminAccess ||
        !adminAccess.permissions.includes('manage_cross_tenant_access')
      ) {
        throw new Error(
          'Insufficient permissions to handle cross-tenant requests',
        );
      }

      // Get the request
      const { data: request, error: fetchError } = await this.supabase
        .from('cross_tenant_requests')
        .select('*')
        .eq('id', requestId)
        .eq('to_tenant_id', adminTenantId)
        .single();

      if (fetchError || !request) {
        throw new Error('Cross-tenant request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request has already been processed');
      }

      // Update request status
      const { error: updateError } = await this.supabase
        .from('cross_tenant_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'denied',
          approved_by: adminUserId,
          approved_at: new Date().toISOString(),
          conditions: conditions || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      if (action === 'approve') {
        // Grant temporary cross-tenant access
        await this.grantCrossTenantAccess(request);
      }

      // Notify requestor
      await this.notifyUser(request.user_id, 'CROSS_TENANT_REQUEST_PROCESSED', {
        action,
        requestId,
        tenantName: adminTenantId,
        weddingId: request.wedding_id,
      });

      await this.logTenantAccess(
        adminTenantId,
        adminUserId,
        `CROSS_TENANT_REQUEST_${action.toUpperCase()}`,
        {
          requestId,
          fromTenant: request.from_tenant_id,
          weddingId: request.wedding_id,
        },
      );
    } catch (error) {
      await this.logTenantAccess(
        adminTenantId,
        adminUserId,
        'CROSS_TENANT_REQUEST_HANDLE_FAILED',
        {
          requestId,
          error: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Grant temporary cross-tenant access for wedding collaboration
   */
  private async grantCrossTenantAccess(request: any): Promise<void> {
    // Create temporary role in target tenant
    const temporaryRole = `temp_vendor_${request.from_tenant_id}`;

    await this.rbac.createTemporaryRole({
      userId: request.user_id,
      tenantId: request.to_tenant_id,
      role: temporaryRole,
      permissions: request.permissions,
      weddingId: request.wedding_id,
      expiresAt: request.expires_at,
      grantedBy: request.approved_by,
      reason: `Cross-tenant collaboration for wedding ${request.wedding_id}`,
    });
  }

  /**
   * Validate tenant access for API requests
   */
  async validateTenantAccess(
    sessionId: string,
    userId: string,
    tenantId: string,
    requiredPermission?: string,
  ): Promise<TenantAuthContext> {
    try {
      // Validate session
      const session = await this.validateTenantSession(
        sessionId,
        userId,
        tenantId,
      );
      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Get current tenant context
      const context = await this.getTenantContext(sessionId);
      if (!context || context.tenantId !== tenantId) {
        throw new Error('Tenant context mismatch');
      }

      // Check specific permission if required
      if (
        requiredPermission &&
        !context.tenantPermissions.includes(requiredPermission)
      ) {
        throw new Error(`Missing required permission: ${requiredPermission}`);
      }

      // Update last activity
      await this.updateTenantUserActivity(userId, tenantId);

      return context;
    } catch (error) {
      await this.logTenantAccess(
        tenantId,
        userId,
        'TENANT_ACCESS_VALIDATION_FAILED',
        {
          sessionId,
          requiredPermission,
          error: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Handle tenant-aware wedding data access
   */
  async validateWeddingAccess(
    userId: string,
    tenantId: string,
    weddingId: string,
    accessType: 'read' | 'write' | 'admin',
  ): Promise<boolean> {
    try {
      const tenantUser = await this.getTenantUser(userId, tenantId);
      if (!tenantUser) {
        return false;
      }

      // Check owned weddings
      if (tenantUser.weddingAccess.ownedWeddings.includes(weddingId)) {
        return true;
      }

      // Check collaborative weddings
      if (tenantUser.weddingAccess.collaboratingWeddings.includes(weddingId)) {
        return accessType !== 'admin'; // Collaborators can't have admin access
      }

      // Check cross-tenant temporary access
      const { data: crossTenantAccess } = await this.supabase
        .from('cross_tenant_access')
        .select('*')
        .eq('user_id', userId)
        .eq('wedding_id', weddingId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .single();

      if (crossTenantAccess) {
        const hasPermission =
          accessType === 'read'
            ? crossTenantAccess.permissions.includes('read_wedding_data')
            : accessType === 'write'
              ? crossTenantAccess.permissions.includes('write_wedding_data')
              : crossTenantAccess.permissions.includes('admin_wedding_data');

        return hasPermission;
      }

      return false;
    } catch (error) {
      await this.logTenantAccess(
        tenantId,
        userId,
        'WEDDING_ACCESS_VALIDATION_FAILED',
        {
          weddingId,
          accessType,
          error: error.message,
        },
      );
      return false;
    }
  }

  /**
   * Emergency tenant access for wedding day incidents
   */
  async createEmergencyTenantAccess(
    adminUserId: string,
    targetTenantId: string,
    targetUserId: string,
    weddingId: string,
    reason: string,
    durationHours: number = 2,
  ): Promise<string> {
    try {
      // Verify admin has emergency access permissions
      const adminPermissions = await this.rbac.getUserPermissions(
        adminUserId,
        'system',
      );
      if (!adminPermissions.includes('emergency_tenant_access')) {
        throw new Error('Insufficient permissions for emergency access');
      }

      // Create emergency access token
      const emergencyToken = await this.tokenManager.createEmergencyToken({
        userId: targetUserId,
        tenantId: targetTenantId,
        weddingId,
        permissions: [
          'read_wedding_data',
          'write_wedding_data',
          'emergency_access',
        ],
        reason,
        durationHours,
        grantedBy: adminUserId,
      });

      // Log emergency access
      await this.logSecurityEvent(
        targetTenantId,
        targetUserId,
        'EMERGENCY_ACCESS_GRANTED',
        {
          grantedBy: adminUserId,
          weddingId,
          reason,
          durationHours,
          emergencyToken: emergencyToken.substring(0, 10) + '...',
        },
      );

      return emergencyToken;
    } catch (error) {
      await this.logSecurityEvent(
        targetTenantId,
        targetUserId,
        'EMERGENCY_ACCESS_FAILED',
        {
          grantedBy: adminUserId,
          error: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.vendor_type as TenantType,
      domain: data.domain,
      settings: data.sso_settings || {},
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private async getTenantUser(
    userId: string,
    tenantId: string,
  ): Promise<TenantUser | null> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(
        `
        *,
        user_roles (
          role_name,
          permissions
        )
      `,
      )
      .eq('user_id', userId)
      .eq('organization_id', tenantId)
      .eq('status', 'active')
      .single();

    if (error) return null;

    return {
      userId: data.user_id,
      tenantId: data.organization_id,
      role: data.user_roles?.role_name || 'member',
      permissions: data.user_roles?.permissions || [],
      crossTenantAccess: data.cross_tenant_access || {
        allowedTenants: [],
        restrictedTenants: [],
      },
      weddingAccess: data.wedding_access || {
        ownedWeddings: [],
        collaboratingWeddings: [],
      },
      lastActivity: data.last_activity_at || data.created_at,
    };
  }

  private async getUserActiveTenants(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) return [];
    return data.map((item) => item.organization_id);
  }

  private async createTenantSession(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    const { error } = await this.supabase.from('tenant_sessions').insert({
      id: sessionId,
      user_id: userId,
      tenant_id: tenantId,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return sessionId;
  }

  private async validateTenantSession(
    sessionId: string,
    userId: string,
    tenantId: string,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('tenant_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .gte('expires_at', new Date().toISOString())
      .single();

    return error ? null : data;
  }

  private async getTenantContext(
    sessionId: string,
  ): Promise<TenantAuthContext | null> {
    // This would typically be cached in Redis for performance
    const { data, error } = await this.supabase
      .from('tenant_sessions')
      .select(
        `
        *,
        organization_members!tenant_sessions_user_id_fkey (
          role,
          permissions
        )
      `,
      )
      .eq('id', sessionId)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error) return null;

    const activeTenants = await this.getUserActiveTenants(data.user_id);

    return {
      tenantId: data.tenant_id,
      userId: data.user_id,
      userRole: data.organization_members?.role || 'member',
      tenantPermissions: data.organization_members?.permissions || [],
      activeTenants,
      sessionId: data.id,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
    };
  }

  private async endTenantSession(
    sessionId: string,
    tenantId: string,
  ): Promise<void> {
    await this.supabase
      .from('tenant_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId);
  }

  private async updateTenantUserActivity(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.supabase
      .from('organization_members')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('organization_id', tenantId);
  }

  private async logTenantAccess(
    tenantId: string,
    userId: string,
    event: string,
    metadata?: any,
  ): Promise<void> {
    await this.supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      event_type: event,
      event_data: metadata || {},
      ip_address: metadata?.ipAddress,
      user_agent: metadata?.userAgent,
      created_at: new Date().toISOString(),
    });
  }

  private async logSecurityEvent(
    tenantId: string,
    userId: string,
    event: string,
    metadata: any,
  ): Promise<void> {
    await this.supabase.from('security_events').insert({
      tenant_id: tenantId,
      user_id: userId,
      event_type: event,
      severity: 'high',
      event_data: metadata,
      created_at: new Date().toISOString(),
    });
  }

  private async notifyTenantAdmins(
    tenantId: string,
    type: string,
    data: any,
  ): Promise<void> {
    // This would integrate with notification system
    console.log(`Notifying tenant ${tenantId} admins about ${type}:`, data);
  }

  private async notifyUser(
    userId: string,
    type: string,
    data: any,
  ): Promise<void> {
    // This would integrate with notification system
    console.log(`Notifying user ${userId} about ${type}:`, data);
  }
}

export default MultiTenantAuthService;
