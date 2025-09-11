import { createClient } from '@/lib/supabase/server';

export interface AuthOptions {
  requireAuth: boolean;
  requireRole?: string[];
  requirePermissions?: string[];
  bypassForDevelopment?: boolean;
}

export class AuthValidator {
  private supabase;

  constructor() {
    this.supabase = null;
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
  }

  async validateAuth(options: AuthOptions): Promise<{
    valid: boolean;
    user?: any;
    profile?: any;
    error?: string;
  }> {
    await this.initSupabase();

    try {
      // Skip auth in development if specified
      if (
        process.env.NODE_ENV === 'development' &&
        options.bypassForDevelopment
      ) {
        return { valid: true };
      }

      if (!options.requireAuth) {
        return { valid: true };
      }

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return { valid: false, error: 'Authentication required' };
      }

      // Get user profile if role/permission checks needed
      let profile = null;
      if (options.requireRole || options.requirePermissions) {
        const { data: profileData, error: profileError } = await this.supabase
          .from('user_profiles')
          .select('role, permissions, organization_id')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profileData) {
          return { valid: false, error: 'User profile not found' };
        }

        profile = profileData;

        // Check role requirements
        if (options.requireRole && options.requireRole.length > 0) {
          if (!options.requireRole.includes(profile.role)) {
            return { valid: false, error: 'Insufficient role permissions' };
          }
        }

        // Check permission requirements
        if (
          options.requirePermissions &&
          options.requirePermissions.length > 0
        ) {
          const userPermissions = profile.permissions || [];
          const hasAllPermissions = options.requirePermissions.every(
            (permission) => userPermissions.includes(permission),
          );

          if (!hasAllPermissions) {
            return { valid: false, error: 'Insufficient permissions' };
          }
        }
      }

      return { valid: true, user, profile };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      };
    }
  }
}

export const authValidator = new AuthValidator();

// Common auth option presets
export const AUTH_PRESETS = {
  PUBLIC: { requireAuth: false },
  AUTHENTICATED: { requireAuth: true },
  ADMIN_ONLY: { requireAuth: true, requireRole: ['admin', 'super_admin'] },
  SUPER_ADMIN_ONLY: { requireAuth: true, requireRole: ['super_admin'] },
  VENDOR_ONLY: { requireAuth: true, requireRole: ['vendor'] },
  CLIENT_ONLY: { requireAuth: true, requireRole: ['client'] },
  WITH_BACKUP_PERMISSIONS: {
    requireAuth: true,
    requirePermissions: ['backup:manage', 'backup:create'],
  },
};
