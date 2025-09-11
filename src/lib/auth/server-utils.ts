import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  organization_id?: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get additional profile information
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      role: profile?.role,
      organization_id: profile?.organization_id,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

export async function requireRole(allowedRoles: string[]): Promise<AuthUser> {
  const user = await requireAuth();

  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error(
      `Access denied. Required roles: ${allowedRoles.join(', ')}`,
    );
  }

  return user;
}

export async function getSession() {
  const supabase = createServerClient();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}
