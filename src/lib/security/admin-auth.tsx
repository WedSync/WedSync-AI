/**
 * WS-168: Admin Authentication Security Layer
 * Comprehensive security wrapper for admin-only components
 */

import React, { Suspense, use } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { logAdminAccess } from './audit-logger';

// Admin user interface with strict typing
interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly permissions: ReadonlyArray<string>;
  readonly department?: string;
  readonly lastLogin: string;
  readonly mfaEnabled: boolean;
}

// Authentication options
interface AuthOptions {
  readonly requiredPermissions: ReadonlyArray<string>;
  readonly requiredRole?: string;
  readonly redirectOnUnauthorized?: string;
  readonly logAccess?: boolean;
}

// Authentication result
interface AuthResult {
  readonly user: AdminUser | null;
  readonly isAuthenticated: boolean;
  readonly hasPermissions: boolean;
  readonly error?: string;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Admin roles hierarchy
const ROLE_HIERARCHY = {
  super_admin: ['admin', 'manager', 'user'],
  admin: ['manager', 'user'],
  manager: ['user'],
  user: [],
} as const;

type AdminRole = keyof typeof ROLE_HIERARCHY;

// Permission validation utility
function hasRequiredPermissions(
  userPermissions: ReadonlyArray<string>,
  requiredPermissions: ReadonlyArray<string>,
): boolean {
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission),
  );
}

// Role validation utility
function hasRequiredRole(userRole: string, requiredRole?: string): boolean {
  if (!requiredRole) return true;

  const userRoleKey = userRole as AdminRole;
  const requiredRoleKey = requiredRole as AdminRole;

  if (userRole === requiredRole) return true;

  // Check if user role includes required role in hierarchy
  return ROLE_HIERARCHY[userRoleKey]?.includes(requiredRoleKey) ?? false;
}

// Get current admin user from session
async function getCurrentAdminUser(): Promise<AdminUser | null> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }

    if (!session?.user) {
      return null;
    }

    // Fetch admin user details from database
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select(
        `
        id,
        email,
        role,
        permissions,
        department,
        last_login,
        mfa_enabled
      `,
      )
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (adminError) {
      console.error('Admin data fetch error:', adminError);
      return null;
    }

    if (!adminData) {
      console.warn('No admin profile found for user:', session.user.id);
      return null;
    }

    return {
      id: adminData.id,
      email: adminData.email,
      role: adminData.role,
      permissions: adminData.permissions || [],
      department: adminData.department,
      lastLogin: adminData.last_login,
      mfaEnabled: adminData.mfa_enabled || false,
    };
  } catch (error) {
    console.error('Error getting current admin user:', error);
    return null;
  }
}

// Validate admin authentication and permissions
async function validateAdminAuth(options: AuthOptions): Promise<AuthResult> {
  try {
    const user = await getCurrentAdminUser();

    if (!user) {
      return {
        user: null,
        isAuthenticated: false,
        hasPermissions: false,
        error: 'Not authenticated',
      };
    }

    // Check role requirements
    if (!hasRequiredRole(user.role, options.requiredRole)) {
      return {
        user,
        isAuthenticated: true,
        hasPermissions: false,
        error: `Insufficient role. Required: ${options.requiredRole}, Current: ${user.role}`,
      };
    }

    // Check permission requirements
    if (
      !hasRequiredPermissions(user.permissions, options.requiredPermissions)
    ) {
      const missingPermissions = options.requiredPermissions.filter(
        (permission) => !user.permissions.includes(permission),
      );

      return {
        user,
        isAuthenticated: true,
        hasPermissions: false,
        error: `Missing permissions: ${missingPermissions.join(', ')}`,
      };
    }

    // Log access if required
    if (options.logAccess !== false) {
      await logAdminAccess(user.id, 'component_access', {
        component: 'admin_protected',
        permissions: options.requiredPermissions,
        role: options.requiredRole,
      });
    }

    return {
      user,
      isAuthenticated: true,
      hasPermissions: true,
    };
  } catch (error) {
    console.error('Admin auth validation error:', error);

    return {
      user: null,
      isAuthenticated: false,
      hasPermissions: false,
      error: 'Authentication validation failed',
    };
  }
}

// Unauthorized component
const UnauthorizedMessage: React.FC<{
  error?: string;
  redirectPath?: string;
}> = ({ error, redirectPath }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md mx-auto text-center">
      <div className="w-20 h-20 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-error-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>

      <p className="text-gray-600 mb-6">
        {error || 'You do not have permission to access this resource.'}
      </p>

      <div className="space-y-3">
        {redirectPath && (
          <a
            href={redirectPath}
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Sign In
          </a>
        )}

        <div>
          <button
            onClick={() => window.history.back()}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Loading component for auth check
const AuthLoadingComponent: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Verifying admin access...</p>
    </div>
  </div>
);

// Higher-order component for admin authentication
export function withAdminAuth<P extends object>(
  WrappedComponent: React.ComponentType<P & { adminUser: AdminUser }>,
  options: AuthOptions,
): React.ComponentType<P> {
  const AdminAuthWrapper: React.FC<P> = (props) => {
    // Create auth validation promise
    const authPromise = validateAdminAuth(options);

    // Use React 19 use() hook for auth validation
    const authResult = use(authPromise);

    // Handle authentication failure
    if (!authResult.isAuthenticated || !authResult.hasPermissions) {
      if (options.redirectOnUnauthorized) {
        redirect(options.redirectOnUnauthorized);
      }

      return (
        <UnauthorizedMessage
          error={authResult.error}
          redirectPath={options.redirectOnUnauthorized}
        />
      );
    }

    // Render protected component with admin user
    return <WrappedComponent {...props} adminUser={authResult.user!} />;
  };

  AdminAuthWrapper.displayName = `withAdminAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  // Return wrapper with Suspense for async auth
  return (props: P) => (
    <Suspense fallback={<AuthLoadingComponent />}>
      <AdminAuthWrapper {...props} />
    </Suspense>
  );
}

// Hook for getting current admin user in client components
export function useAdminAuth(): AdminUser | null {
  const authPromise = getCurrentAdminUser();
  return use(authPromise);
}

// Hook for checking specific permissions
export function useAdminPermissions(
  requiredPermissions: ReadonlyArray<string>,
): {
  hasPermissions: boolean;
  user: AdminUser | null;
  loading: boolean;
} {
  const user = useAdminAuth();

  const hasPermissions = user
    ? hasRequiredPermissions(user.permissions, requiredPermissions)
    : false;

  return {
    hasPermissions,
    user,
    loading: false, // React 19 use() handles loading states
  };
}

// Utility for server-side admin auth checking
export async function checkAdminAuth(
  options: AuthOptions,
): Promise<AuthResult> {
  return validateAdminAuth(options);
}

// Admin role checker utility
export function canAccessResource(
  userRole: string,
  userPermissions: ReadonlyArray<string>,
  requiredRole?: string,
  requiredPermissions: ReadonlyArray<string> = [],
): boolean {
  const hasRole = hasRequiredRole(userRole, requiredRole);
  const hasPerms = hasRequiredPermissions(userPermissions, requiredPermissions);

  return hasRole && hasPerms;
}

export type { AdminUser, AuthOptions, AuthResult };
export { ROLE_HIERARCHY, hasRequiredPermissions, hasRequiredRole };
