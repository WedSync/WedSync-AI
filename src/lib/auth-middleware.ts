import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthUser {
  id: string;
  email: string;
  organizationId?: string;
  role?: string;
  aud?: string;
  exp?: number;
}

/**
 * Supabase authentication middleware for protecting API routes
 * Returns user data and Supabase client if authenticated
 */
export async function withAuth(request: NextRequest) {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      },
    );

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'NO_SESSION' },
        { status: 401 },
      );
    }

    // Get user profile to include organization info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role, first_name, last_name')
      .eq('user_id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
    }

    const authUser: AuthUser = {
      id: session.user.id,
      email: session.user.email!,
      organizationId: profile?.organization_id,
      role: profile?.role,
      aud: session.user.aud,
      exp: session.expires_at,
    };

    return {
      user: authUser,
      session,
      supabase,
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Internal authentication error', code: 'INTERNAL_AUTH_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * Create authenticated Supabase client for API routes
 */
export async function createAuthenticatedSupabaseClient(request: NextRequest) {
  const authResult = await withAuth(request);

  if ('error' in authResult) {
    return null;
  }

  return authResult.supabase;
}

/**
 * Extract user from request without full middleware
 */
export async function getUserFromRequest(
  request: NextRequest,
): Promise<AuthUser | null> {
  try {
    const authResult = await withAuth(request);

    if ('error' in authResult) {
      return null;
    }

    return authResult.user;
  } catch {
    return null;
  }
}

/**
 * Check if request has valid authentication
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const user = await getUserFromRequest(request);
  return user !== null;
}

/**
 * Role-based access control helper
 */
export function hasRole(user: AuthUser | null, requiredRole: string): boolean {
  return user?.role === requiredRole;
}

/**
 * Organization access control helper
 */
export function belongsToOrganization(
  user: AuthUser | null,
  organizationId: string,
): boolean {
  return user?.organizationId === organizationId;
}

/**
 * Admin role check helper
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'OWNER';
}

/**
 * Validate authentication for API routes
 * Returns success/failure with user data
 */
export async function validateAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      },
    );

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    // Get user profile to include organization info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role, first_name, last_name')
      .eq('user_id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
    }

    const authUser: AuthUser = {
      id: session.user.id,
      email: session.user.email!,
      organizationId: profile?.organization_id,
      role: profile?.role,
      aud: session.user.aud,
      exp: session.expires_at,
    };

    return {
      success: true,
      user: authUser,
    };
  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      success: false,
      error: 'Internal authentication error',
    };
  }
}
