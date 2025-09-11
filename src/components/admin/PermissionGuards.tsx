'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// Permission types for wedding admin system
type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'support'
  | 'emergency_response'
  | 'read_only';

type WeddingPermission =
  | 'wedding.view'
  | 'wedding.edit'
  | 'wedding.delete'
  | 'wedding.emergency_access'
  | 'guest.view'
  | 'guest.edit'
  | 'guest.bulk_operations'
  | 'vendor.view'
  | 'vendor.edit'
  | 'vendor.emergency_access'
  | 'system.emergency_override'
  | 'system.database_access'
  | 'system.user_management'
  | 'billing.view'
  | 'billing.edit'
  | 'audit.view'
  | 'audit.export';

interface AdminPermissions {
  role: AdminRole;
  permissions: WeddingPermission[];
  organizationAccess: string[];
  emergencyOverride: boolean;
  weddingContextAccess: boolean;
  lastPermissionCheck: Date;
}

interface PermissionContext {
  permissions: AdminPermissions | null;
  loading: boolean;
  error: string | null;
  checkPermission: (permission: WeddingPermission) => boolean;
  checkRole: (roles: AdminRole[]) => boolean;
  checkWeddingAccess: (weddingId: string) => boolean;
  requestEmergencyAccess: () => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContext | null>(null);

// Permission matrix for different admin roles
const ROLE_PERMISSIONS: Record<AdminRole, WeddingPermission[]> = {
  super_admin: [
    'wedding.view',
    'wedding.edit',
    'wedding.delete',
    'wedding.emergency_access',
    'guest.view',
    'guest.edit',
    'guest.bulk_operations',
    'vendor.view',
    'vendor.edit',
    'vendor.emergency_access',
    'system.emergency_override',
    'system.database_access',
    'system.user_management',
    'billing.view',
    'billing.edit',
    'audit.view',
    'audit.export',
  ],
  admin: [
    'wedding.view',
    'wedding.edit',
    'wedding.emergency_access',
    'guest.view',
    'guest.edit',
    'guest.bulk_operations',
    'vendor.view',
    'vendor.edit',
    'vendor.emergency_access',
    'billing.view',
    'audit.view',
  ],
  support: [
    'wedding.view',
    'guest.view',
    'guest.edit',
    'vendor.view',
    'vendor.emergency_access',
    'audit.view',
  ],
  emergency_response: [
    'wedding.view',
    'wedding.emergency_access',
    'guest.view',
    'vendor.view',
    'vendor.emergency_access',
    'system.emergency_override',
  ],
  read_only: ['wedding.view', 'guest.view', 'vendor.view', 'audit.view'],
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({
  children,
}) => {
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile with role and organization access
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(
          `
          role,
          organization_id,
          organization:organizations(id, name)
        `,
        )
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('User profile not found');

      const role = profile.role as AdminRole;
      const rolePermissions = ROLE_PERMISSIONS[role] || [];

      const adminPermissions: AdminPermissions = {
        role,
        permissions: rolePermissions,
        organizationAccess: [profile.organization_id],
        emergencyOverride:
          role === 'super_admin' || role === 'emergency_response',
        weddingContextAccess: rolePermissions.includes('wedding.view'),
        lastPermissionCheck: new Date(),
      };

      setPermissions(adminPermissions);
    } catch (err) {
      console.error('Permission check failed:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load permissions',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const checkPermission = (permission: WeddingPermission): boolean => {
    if (!permissions) return false;
    return permissions.permissions.includes(permission);
  };

  const checkRole = (roles: AdminRole[]): boolean => {
    if (!permissions) return false;
    return roles.includes(permissions.role);
  };

  const checkWeddingAccess = (weddingId: string): boolean => {
    if (!permissions) return false;
    // Additional wedding-specific access logic would go here
    return permissions.weddingContextAccess;
  };

  const requestEmergencyAccess = async (): Promise<boolean> => {
    if (!permissions) return false;

    try {
      // Emergency access logic - would typically involve escalation
      if (permissions.emergencyOverride) {
        // Log emergency access request
        await supabase.from('audit_logs').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'emergency_access_requested',
          resource_type: 'system',
          severity: 'critical',
          category: 'emergency_response',
          details: { timestamp: new Date().toISOString() },
        });

        return true;
      }
      return false;
    } catch (err) {
      console.error('Emergency access request failed:', err);
      return false;
    }
  };

  const refreshPermissions = async (): Promise<void> => {
    await fetchPermissions();
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        error,
        checkPermission,
        checkRole,
        checkWeddingAccess,
        requestEmergencyAccess,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContext => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

// Higher-order component for permission-based rendering
interface WithPermissionProps {
  permission?: WeddingPermission;
  roles?: AdminRole[];
  fallback?: ReactNode;
  showError?: boolean;
  children: ReactNode;
}

export const WithPermission: React.FC<WithPermissionProps> = ({
  permission,
  roles,
  fallback,
  showError = true,
  children,
}) => {
  const { checkPermission, checkRole, loading, error } = usePermissions();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-8 w-24 rounded" />;
  }

  if (error && showError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Permission check failed: {error}</AlertDescription>
      </Alert>
    );
  }

  let hasAccess = true;

  if (permission) {
    hasAccess = checkPermission(permission);
  }

  if (roles && roles.length > 0) {
    hasAccess = hasAccess && checkRole(roles);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback || null}</>;
};

// Permission Guard Component
interface PermissionGuardProps {
  permission: WeddingPermission;
  roles?: AdminRole[];
  weddingId?: string;
  fallback?: ReactNode;
  showDeniedMessage?: boolean;
  children: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  roles,
  weddingId,
  fallback,
  showDeniedMessage = false,
  children,
}) => {
  const { checkPermission, checkRole, checkWeddingAccess, permissions } =
    usePermissions();

  let hasAccess = checkPermission(permission);

  if (roles && roles.length > 0) {
    hasAccess = hasAccess && checkRole(roles);
  }

  if (weddingId) {
    hasAccess = hasAccess && checkWeddingAccess(weddingId);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showDeniedMessage) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Access denied. Required permission: {permission}
          {roles && ` (Role: ${roles.join(', ')})`}
          <div className="mt-2">
            <Badge variant="outline">Current role: {permissions?.role}</Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{fallback || null}</>;
};

// Emergency Access Guard
interface EmergencyGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  autoRequest?: boolean;
}

export const EmergencyGuard: React.FC<EmergencyGuardProps> = ({
  children,
  fallback,
  autoRequest = false,
}) => {
  const { permissions, requestEmergencyAccess } = usePermissions();
  const [hasEmergencyAccess, setHasEmergencyAccess] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (permissions?.emergencyOverride) {
      setHasEmergencyAccess(true);
    } else if (autoRequest && !requesting) {
      setRequesting(true);
      requestEmergencyAccess()
        .then(setHasEmergencyAccess)
        .finally(() => {
          setRequesting(false);
        });
    }
  }, [permissions, autoRequest, requestEmergencyAccess, requesting]);

  if (hasEmergencyAccess || permissions?.emergencyOverride) {
    return <>{children}</>;
  }

  if (requesting) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 animate-pulse" />
        <AlertDescription>Requesting emergency access...</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {fallback || (
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Emergency access required. This action requires elevated
            permissions.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

// Wedding Day Access Guard
interface WeddingDayGuardProps {
  weddingId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const WeddingDayGuard: React.FC<WeddingDayGuardProps> = ({
  weddingId,
  children,
  fallback,
}) => {
  const { checkWeddingAccess, checkPermission } = usePermissions();

  const hasWeddingAccess = checkWeddingAccess(weddingId);
  const hasWeddingPermission = checkPermission('wedding.view');

  if (hasWeddingAccess && hasWeddingPermission) {
    return <>{children}</>;
  }

  return (
    <>
      {fallback || (
        <Alert className="border-blue-200 bg-blue-50">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Wedding access required. You don't have permission to view this
            wedding's data.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

// Permission Status Indicator
export const PermissionStatus: React.FC = () => {
  const { permissions, loading, error } = usePermissions();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded" />;
  }

  if (error) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Permission Error
      </Badge>
    );
  }

  if (!permissions) {
    return (
      <Badge variant="outline" className="text-xs">
        <EyeOff className="w-3 h-3 mr-1" />
        No Access
      </Badge>
    );
  }

  const roleColors = {
    super_admin: 'bg-purple-500 text-white',
    admin: 'bg-blue-500 text-white',
    support: 'bg-green-500 text-white',
    emergency_response: 'bg-red-500 text-white',
    read_only: 'bg-gray-500 text-white',
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={`text-xs ${roleColors[permissions.role]}`}>
        <Shield className="w-3 h-3 mr-1" />
        {permissions.role.replace('_', ' ').toUpperCase()}
      </Badge>
      {permissions.emergencyOverride && (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Emergency
        </Badge>
      )}
    </div>
  );
};

// Hook for permission-aware actions
export const usePermissionAwareActions = () => {
  const { checkPermission, checkRole, requestEmergencyAccess } =
    usePermissions();

  const canPerformAction = (
    permission: WeddingPermission,
    roles?: AdminRole[],
  ): boolean => {
    let hasAccess = checkPermission(permission);
    if (roles && roles.length > 0) {
      hasAccess = hasAccess && checkRole(roles);
    }
    return hasAccess;
  };

  const performWithPermissionCheck = async <T,>(
    permission: WeddingPermission,
    action: () => Promise<T>,
    roles?: AdminRole[],
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    try {
      if (!canPerformAction(permission, roles)) {
        // Try emergency access for critical actions
        const emergencyAccess = await requestEmergencyAccess();
        if (!emergencyAccess) {
          return {
            success: false,
            error: `Insufficient permissions. Required: ${permission}`,
          };
        }
      }

      const data = await action();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action failed',
      };
    }
  };

  return {
    canPerformAction,
    performWithPermissionCheck,
    checkPermission,
    checkRole,
  };
};

export default PermissionGuards;
