import { createClient } from '@/lib/supabase/server';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  mfaEnabled: boolean;
  lastLoginAt?: string;
  ipWhitelist?: string[];
}

export interface AdminPermission {
  resource: string;
  actions: string[];
}

// Define admin permission constants
export const ADMIN_PERMISSIONS = {
  SYSTEM_CONTROL: 'system:control',
  USER_MANAGEMENT: 'users:manage',
  EMERGENCY_ACTIONS: 'emergency:execute',
  AUDIT_VIEW: 'audit:view',
  SETTINGS_MANAGE: 'settings:manage',
  BACKUP_MANAGE: 'backup:manage',
  ANALYTICS_VIEW: 'analytics:view',
} as const;

// Define critical actions that require elevated permissions
export const CRITICAL_ACTIONS = [
  'maintenance-mode',
  'emergency-user-suspend',
  'force-logout-all',
  'emergency-backup',
] as const;

export async function verifyAdminAccess(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get user profile with role information
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        email,
        role,
        status,
        admin_permissions,
        mfa_enabled,
        last_login_at,
        ip_whitelist
      `,
      )
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      console.error('Failed to fetch user profile:', error);
      return false;
    }

    // Check if user has admin role
    if (userProfile.role !== 'admin' && userProfile.role !== 'super_admin') {
      return false;
    }

    // Check if user is active
    if (userProfile.status !== 'active') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return false;
  }
}

export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    const supabase = await createClient();

    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        email,
        role,
        admin_permissions,
        mfa_enabled,
        last_login_at,
        ip_whitelist
      `,
      )
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      return null;
    }

    return {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      permissions: userProfile.admin_permissions || [],
      mfaEnabled: userProfile.mfa_enabled || false,
      lastLoginAt: userProfile.last_login_at,
      ipWhitelist: userProfile.ip_whitelist || [],
    };
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

export async function verifyAdminPermission(
  userId: string,
  permission: string,
): Promise<boolean> {
  try {
    const adminUser = await getAdminUser(userId);
    if (!adminUser) {
      return false;
    }

    // Super admins have all permissions
    if (adminUser.role === 'super_admin') {
      return true;
    }

    // Check specific permission
    return adminUser.permissions.includes(permission);
  } catch (error) {
    console.error('Error verifying admin permission:', error);
    return false;
  }
}

export async function verifyIPWhitelist(
  userId: string,
  clientIP: string,
): Promise<boolean> {
  try {
    const adminUser = await getAdminUser(userId);
    if (!adminUser) {
      return false;
    }

    // If no IP whitelist is configured, allow access
    if (!adminUser.ipWhitelist || adminUser.ipWhitelist.length === 0) {
      return true;
    }

    // Check if client IP is in whitelist
    const isWhitelisted = adminUser.ipWhitelist.some((whitelistedIP) => {
      // Handle CIDR notation and exact matches
      if (whitelistedIP.includes('/')) {
        // TODO: Implement CIDR range checking
        return false;
      }
      return whitelistedIP === clientIP;
    });

    return isWhitelisted;
  } catch (error) {
    console.error('Error verifying IP whitelist:', error);
    return false;
  }
}

export async function verifyMfaCode(
  userId: string,
  code: string,
): Promise<boolean> {
  try {
    // TODO: Implement actual MFA verification with TOTP
    // This would typically involve:
    // 1. Getting the user's MFA secret from secure storage
    // 2. Generating the expected TOTP code for the current time window
    // 3. Comparing with the provided code
    // 4. Checking for replay attacks

    // For now, return true for development
    // In production, integrate with a proper MFA service
    console.warn(
      'MFA verification not implemented - allowing access for development',
    );
    return true;
  } catch (error) {
    console.error('Error verifying MFA code:', error);
    return false;
  }
}

export async function logAdminLogin(
  userId: string,
  clientIP: string,
  userAgent: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    // Update last login timestamp
    await supabase
      .from('user_profiles')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: clientIP,
      })
      .eq('id', userId);

    // Log the login event
    await supabase.from('admin_login_log').insert({
      admin_id: userId,
      login_at: new Date().toISOString(),
      client_ip: clientIP,
      user_agent: userAgent,
      success: true,
    });
  } catch (error) {
    console.error('Error logging admin login:', error);
  }
}

export async function logFailedAdminLogin(
  email: string,
  clientIP: string,
  userAgent: string,
  reason: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('admin_login_log').insert({
      attempted_email: email,
      login_at: new Date().toISOString(),
      client_ip: clientIP,
      user_agent: userAgent,
      success: false,
      failure_reason: reason,
    });

    // Create security alert for multiple failed attempts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('admin_login_log')
      .select('*', { count: 'exact', head: true })
      .eq('attempted_email', email)
      .eq('success', false)
      .gte('login_at', fiveMinutesAgo);

    if ((count || 0) >= 5) {
      await supabase.from('system_alerts').insert({
        type: 'error',
        category: 'security',
        message: `Multiple failed admin login attempts for ${email}`,
        details: {
          email,
          client_ip: clientIP,
          attempt_count: count,
          time_window: '5 minutes',
        },
        acknowledged: false,
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error logging failed admin login:', error);
  }
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  windowMinutes: number = 5,
  maxAttempts: number = 10,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const windowStart = new Date(
      Date.now() - windowMinutes * 60 * 1000,
    ).toISOString();

    const { count } = await supabase
      .from('admin_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('created_at', windowStart);

    const currentAttempts = count || 0;

    // Log this attempt
    await supabase.from('admin_rate_limits').insert({
      identifier,
      action,
      created_at: new Date().toISOString(),
    });

    return currentAttempts < maxAttempts;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Allow the action if rate limiting fails
    return true;
  }
}

export function sanitizeClientIP(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // Priority order for IP detection
  const ip =
    cfConnectingIP ||
    xRealIP ||
    (xForwardedFor ? xForwardedFor.split(',')[0].trim() : null) ||
    'unknown';

  // Basic IP validation
  const ipRegex =
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipRegex.test(ip) ? ip : 'unknown';
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
