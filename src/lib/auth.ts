/**
 * Authentication utilities using Supabase Auth
 * Replaces NextAuth + Prisma setup with pure Supabase approach
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export type UserRole = 'user' | 'vendor' | 'admin' | 'super_admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile?: {
    full_name?: string;
    avatar_url?: string;
    phone?: string;
    business_name?: string;
    vendor_type?: string;
  };
}

/**
 * Get current user on server-side
 */
export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            return cookieStore.getAll().map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get user profile and role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(
        `
        full_name,
        avatar_url,
        phone,
        role,
        business_name,
        vendor_type
      `,
      )
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      role: (profile?.role as UserRole) || 'user',
      profile: profile
        ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            phone: profile.phone,
            business_name: profile.business_name,
            vendor_type: profile.vendor_type,
          }
        : undefined,
    };
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

/**
 * Require authentication (redirect to login if not authenticated)
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Require specific role
 */
export async function requireRole(
  role: UserRole | UserRole[],
): Promise<AuthUser> {
  const user = await requireAuth();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Role ${user.role} not authorized. Required: ${allowedRoles.join(', ')}`,
    );
  }

  return user;
}

/**
 * Check if user has permission for a wedding
 */
export async function checkWeddingAccess(
  weddingId: string,
  userId?: string,
): Promise<{ hasAccess: boolean; role?: string }> {
  try {
    const user = userId ? { id: userId } : await getServerUser();

    if (!user) {
      return { hasAccess: false };
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            return cookieStore.getAll().map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll: () => {},
        },
      },
    );

    // Check if user is part of the wedding team
    const { data: teamMember } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamMember) {
      return { hasAccess: true, role: teamMember.role };
    }

    // Check if user is a vendor for this wedding
    const { data: vendor } = await supabase
      .from('wedding_vendors')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('vendor_id', user.id)
      .single();

    if (vendor) {
      return { hasAccess: true, role: vendor.role };
    }

    return { hasAccess: false };
  } catch (error) {
    console.error('Error checking wedding access:', error);
    return { hasAccess: false };
  }
}

/**
 * Middleware helper for API routes
 */
export function withAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const user = await getServerUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }

      return await handler(req, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 },
      );
    }
  };
}

/**
 * Role-based middleware for API routes
 */
export function withRole(
  role: UserRole | UserRole[],
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    const allowedRoles = Array.isArray(role) ? role : [role];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: `Access denied. Required role: ${allowedRoles.join(', ')}` },
        { status: 403 },
      );
    }

    return await handler(req, user);
  });
}
