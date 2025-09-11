/**
 * Authentication middleware for Health API endpoints
 * Supports both admin user authentication and API key authentication for monitoring systems
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

export interface HealthAuthResult {
  authorized: boolean;
  user?: any;
  authType: 'admin' | 'api_key' | 'none';
  error?: string;
  permissions?: string[];
}

/**
 * Verify admin user authentication
 */
async function verifyAdminAuth(token: string): Promise<HealthAuthResult> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { authorized: false, authType: 'none', error: 'Invalid token' };
    }

    // Check if user has admin privileges or health monitoring permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, permissions, organization_id')
      .eq('id', user.id)
      .single();

    const isAdmin =
      profile?.role === 'admin' || profile?.role === 'super_admin';
    const hasHealthPermission =
      profile?.permissions?.includes('health_monitor') ||
      profile?.permissions?.includes('system_admin');

    if (!isAdmin && !hasHealthPermission) {
      return {
        authorized: false,
        user,
        authType: 'admin',
        error: 'Insufficient permissions for health monitoring',
      };
    }

    return {
      authorized: true,
      user,
      authType: 'admin',
      permissions: profile?.permissions || [],
    };
  } catch (error) {
    return {
      authorized: false,
      authType: 'none',
      error: 'Authentication failed',
    };
  }
}

/**
 * Verify API key authentication for monitoring systems
 */
async function verifyApiKeyAuth(apiKey: string): Promise<HealthAuthResult> {
  try {
    // Check if API key exists and is valid
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !keyData) {
      return {
        authorized: false,
        authType: 'api_key',
        error: 'Invalid API key',
      };
    }

    // Check if API key has health monitoring permissions
    if (!keyData.permissions?.includes('health_monitor')) {
      return {
        authorized: false,
        authType: 'api_key',
        error: 'API key lacks health monitoring permissions',
      };
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    return {
      authorized: true,
      authType: 'api_key',
      permissions: keyData.permissions || [],
    };
  } catch (error) {
    return {
      authorized: false,
      authType: 'api_key',
      error: 'API key validation failed',
    };
  }
}

/**
 * Main authentication function for health endpoints
 */
export async function authenticateHealthRequest(
  request: NextRequest,
): Promise<HealthAuthResult> {
  // Check for Bearer token (admin user authentication)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return await verifyAdminAuth(token);
  }

  // Check for API key in header or query parameter
  const apiKeyHeader = request.headers.get('x-api-key');
  const { searchParams } = new URL(request.url);
  const apiKeyQuery = searchParams.get('api_key');

  if (apiKeyHeader || apiKeyQuery) {
    const apiKey = apiKeyHeader || apiKeyQuery;
    if (apiKey) {
      return await verifyApiKeyAuth(apiKey);
    }
  }

  return {
    authorized: false,
    authType: 'none',
    error: 'No valid authentication provided',
  };
}

/**
 * Check if request can access detailed health information
 */
export function canAccessDetailedHealth(authResult: HealthAuthResult): boolean {
  if (!authResult.authorized) return false;

  // Admin users can access everything
  if (authResult.authType === 'admin') return true;

  // API keys need specific permission for detailed data
  return authResult.permissions?.includes('health_detailed') || false;
}

/**
 * Check if request can modify health settings (alerts, etc.)
 */
export function canModifyHealthSettings(authResult: HealthAuthResult): boolean {
  if (!authResult.authorized) return false;

  // Only admin users can modify health settings
  if (authResult.authType === 'admin') {
    return (
      authResult.permissions?.includes('system_admin') ||
      authResult.user?.role === 'super_admin' ||
      false
    );
  }

  return false;
}

/**
 * Rate limiting configuration for health endpoints
 */
export function getHealthRateLimit(authResult: HealthAuthResult): {
  maxRequests: number;
  windowMs: number;
} {
  if (!authResult.authorized) {
    return { maxRequests: 10, windowMs: 60000 }; // Very limited for unauthenticated
  }

  if (authResult.authType === 'admin') {
    return { maxRequests: 100, windowMs: 60000 }; // Higher limit for admin users
  }

  if (authResult.authType === 'api_key') {
    return { maxRequests: 60, windowMs: 60000 }; // Standard monitoring rate
  }

  return { maxRequests: 20, windowMs: 60000 }; // Default
}
