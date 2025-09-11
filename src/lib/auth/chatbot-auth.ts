// ==========================================
// WS-243: AI Chatbot Authentication Utilities
// ==========================================

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

// ==========================================
// Supabase Client for Server-Side Operations
// ==========================================

export async function createAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

// ==========================================
// User Authentication & Organization Access
// ==========================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  permissions: string[];
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createAuthenticatedSupabaseClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return null;
    }

    // Get user profile with organization info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        `
        organization_id,
        role,
        permissions,
        organizations:organization_id (
          id,
          business_name,
          status
        )
      `,
      )
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return null;
    }

    // Check if organization is active
    const organization = profile.organizations as any;
    if (!organization || organization.status !== 'active') {
      console.error('Organization inactive or not found');
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      organization_id: profile.organization_id,
      role: profile.role || 'user',
      permissions: profile.permissions || [],
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// ==========================================
// Request Authentication Middleware
// ==========================================

export async function authenticateRequest(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  try {
    // Extract auth token from request
    const authHeader = request.headers.get('authorization');
    const token =
      authHeader?.replace('Bearer ', '') ||
      request.cookies.get('supabase-auth-token')?.value;

    if (!token) {
      return null;
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll() {
            // No-op for read-only request context
          },
        },
      },
    );

    // Verify the token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Get user organization info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role, permissions')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      organization_id: profile.organization_id,
      role: profile.role || 'user',
      permissions: profile.permissions || [],
    };
  } catch (error) {
    console.error('Request authentication error:', error);
    return null;
  }
}

// ==========================================
// Permission Checking
// ==========================================

export function hasPermission(
  user: AuthenticatedUser,
  permission: string,
): boolean {
  // Admin role has all permissions
  if (user.role === 'admin' || user.role === 'owner') {
    return true;
  }

  // Check specific permissions
  return user.permissions.includes(permission);
}

export function canAccessChatbot(user: AuthenticatedUser): boolean {
  return (
    hasPermission(user, 'chatbot:access') ||
    user.role === 'admin' ||
    user.role === 'owner' ||
    user.role === 'staff'
  );
}

export function canManageConversations(user: AuthenticatedUser): boolean {
  return (
    hasPermission(user, 'chatbot:manage') ||
    user.role === 'admin' ||
    user.role === 'owner'
  );
}

// ==========================================
// Organization Validation
// ==========================================

export async function validateOrganizationAccess(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  try {
    const supabase = await createAuthenticatedSupabaseClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    return !error && data !== null;
  } catch (error) {
    console.error('Organization access validation error:', error);
    return false;
  }
}

// ==========================================
// Error Response Helpers
// ==========================================

export function createAuthErrorResponse(
  message: string = 'Authentication required',
) {
  return Response.json(
    {
      error: message,
      code: 'AUTH_REQUIRED',
      timestamp: new Date().toISOString(),
    },
    { status: 401 },
  );
}

export function createForbiddenResponse(
  message: string = 'Insufficient permissions',
) {
  return Response.json(
    {
      error: message,
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString(),
    },
    { status: 403 },
  );
}

export function createNotFoundResponse(message: string = 'Resource not found') {
  return Response.json(
    {
      error: message,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
    },
    { status: 404 },
  );
}

// ==========================================
// Rate Limiting Helpers
// ==========================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000, // 1 minute
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    const resetTime = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetTime });

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
      limit,
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      limit,
    };
  }

  // Increment count
  record.count++;
  rateLimitMap.set(key, record);

  return {
    allowed: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
    limit,
  };
}

export function createRateLimitResponse(rateLimit: RateLimitResult) {
  return Response.json(
    {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString(),
      },
    },
  );
}
