/**
 * Authentication Middleware for API Routes
 * Provides common authentication and authorization utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './config';

/**
 * Authentication result interface
 */
interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    organizationId?: string;
    role?: string;
    isAdmin?: boolean;
  };
  error?: string;
}

/**
 * Middleware to check if request is authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return {
        authenticated: false,
        error: 'Authentication required',
      };
    }

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        organizationId: session.user.organizationId,
        role: session.user.role,
        isAdmin: session.user.isAdmin,
      },
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Middleware to check if user is admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated) {
    return authResult;
  }

  if (!authResult.user?.isAdmin) {
    return {
      authenticated: false,
      error: 'Admin access required',
    };
  }

  return authResult;
}

/**
 * Middleware to check if user belongs to specific organization
 */
export async function requireOrganization(
  request: NextRequest,
  organizationId: string,
): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated) {
    return authResult;
  }

  if (
    authResult.user?.organizationId !== organizationId &&
    !authResult.user?.isAdmin
  ) {
    return {
      authenticated: false,
      error: 'Access denied to organization data',
    };
  }

  return authResult;
}

/**
 * Higher-order function to wrap API routes with authentication
 */
export function withAuth(
  handler: (
    request: NextRequest,
    user: NonNullable<AuthResult['user']>,
  ) => Promise<NextResponse>,
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const authResult = await requireAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 },
      );
    }

    return handler(request, authResult.user);
  };
}

/**
 * Higher-order function to wrap API routes with admin authentication
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    user: NonNullable<AuthResult['user']>,
  ) => Promise<NextResponse>,
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const authResult = await requireAdmin(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Admin access required' },
        { status: 403 },
      );
    }

    return handler(request, authResult.user);
  };
}

/**
 * Higher-order function to wrap API routes with organization-specific authentication
 */
export function withOrganizationAuth(
  handler: (
    request: NextRequest,
    user: NonNullable<AuthResult['user']>,
  ) => Promise<NextResponse>,
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const authResult = await requireAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 },
      );
    }

    // Extract organization ID from URL params or request body
    const url = new URL(request.url);
    const organizationId =
      url.searchParams.get('organizationId') ||
      url.pathname.match(/\/organizations\/([^\/]+)/)?.[1];

    if (organizationId) {
      const orgAuthResult = await requireOrganization(request, organizationId);

      if (!orgAuthResult.authenticated) {
        return NextResponse.json(
          { error: orgAuthResult.error || 'Access denied to organization' },
          { status: 403 },
        );
      }
    }

    return handler(request, authResult.user);
  };
}
