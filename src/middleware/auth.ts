import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
// SENIOR CODE REVIEWER FIX: Corrected import paths to match actual file structure
import { mfaService, AuthenticatorAssuranceLevel } from '@/lib/auth/mfa';
import { logger } from '@/lib/monitoring/edge-logger';
import { Session } from '@supabase/supabase-js';

interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

interface SessionData {
  userId: string;
  email?: string;
  role?: string;
  permissions?: string[];
}

// Define sensitive operations that require MFA
const MFA_REQUIRED_OPERATIONS = [
  '/api/payments',
  '/api/contracts',
  '/api/vendor-payments',
  '/api/api-keys',
  '/api/billing',
  '/api/team/permissions',
  '/api/security/settings',
  '/settings/security',
  '/billing',
  '/vendor-contracts',
];

// Define endpoints that can bypass MFA temporarily
const MFA_SETUP_PATHS = [
  '/settings/security/mfa-setup',
  '/api/auth/mfa/enroll',
  '/api/auth/mfa/verify',
];

export interface AuthMiddlewareResult {
  authenticated: boolean;
  userId?: string;
  aalLevel?: AuthenticatorAssuranceLevel;
  requiresMFA?: boolean;
  sessionExpired?: boolean;
  accountLocked?: boolean;
  response?: NextResponse;
}

/**
 * Enhanced authentication middleware with MFA support
 * Implements OWASP authentication best practices
 */
export class AuthMiddleware {
  private static instance: AuthMiddleware;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {}

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }
    return AuthMiddleware.instance;
  }

  /**
   * Process authentication for a request
   */
  async processAuth(request: NextRequest): Promise<AuthMiddlewareResult> {
    const path = request.nextUrl.pathname;
    const supabase = this.createSupabaseClient(request);

    try {
      // Get current session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return {
          authenticated: false,
          sessionExpired: !!error,
        };
      }

      const userId = session.user.id;

      // Check session expiry
      if (this.isSessionExpired(session)) {
        const refreshResult = await this.refreshSession(
          request,
          session.refresh_token,
        );
        if (!refreshResult.authenticated) {
          return refreshResult;
        }
      }

      // Check if MFA is required for this path
      const requiresMFA = this.requiresMFA(path);

      if (requiresMFA && !this.isMFASetupPath(path)) {
        // Get current AAL level
        const aalData = await mfaService.getAuthenticatorAssuranceLevel();

        if (aalData.data?.currentLevel !== AuthenticatorAssuranceLevel.AAL2) {
          // Check if user has MFA set up
          const hasMFA = await mfaService.isMFARequired(userId);

          if (hasMFA) {
            // User has MFA but hasn't verified for this session
            return {
              authenticated: true,
              userId,
              aalLevel: aalData.data?.currentLevel,
              requiresMFA: true,
              response: this.createMFARequiredResponse(request),
            };
          } else {
            // Sensitive operation requires MFA setup
            return {
              authenticated: true,
              userId,
              aalLevel: aalData.data?.currentLevel,
              requiresMFA: true,
              response: this.createMFASetupRequiredResponse(request),
            };
          }
        }
      }

      // Log successful authentication
      await this.logAuthEvent(userId, 'auth_success', path);

      return {
        authenticated: true,
        userId,
        aalLevel: (await mfaService.getAuthenticatorAssuranceLevel()).data
          ?.currentLevel,
        requiresMFA: false,
      };
    } catch (error) {
      logger.error(
        'Authentication error',
        error instanceof Error ? error : new Error('Unknown error'),
        { path },
      );

      return {
        authenticated: false,
        sessionExpired: true,
      };
    }
  }

  /**
   * Create Supabase client for server-side auth
   */
  private createSupabaseClient(request: NextRequest) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Cookies are set in the response
          },
          remove(name: string, options: CookieOptions) {
            // Cookies are removed in the response
          },
        },
      },
    );
  }

  /**
   * Check if session has expired
   */
  private isSessionExpired(session: Session): boolean {
    if (!session.expires_at) return false;

    const expiresAt = new Date(session.expires_at).getTime();
    const now = Date.now();

    return now >= expiresAt;
  }

  /**
   * Refresh an expired session
   */
  private async refreshSession(
    request: NextRequest,
    refreshToken?: string,
  ): Promise<AuthMiddlewareResult> {
    if (!refreshToken) {
      return {
        authenticated: false,
        sessionExpired: true,
      };
    }

    const supabase = this.createSupabaseClient(request);
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return {
        authenticated: false,
        sessionExpired: true,
      };
    }

    // Create response with new session cookies
    const response = NextResponse.next();

    // Set new session cookies
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.sessionTimeout / 1000,
    });

    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.refreshTokenExpiry / 1000,
    });

    return {
      authenticated: true,
      userId: data.session.user.id,
      response,
    };
  }

  /**
   * Check if MFA is required for this path
   */
  private requiresMFA(path: string): boolean {
    return MFA_REQUIRED_OPERATIONS.some((op) => path.startsWith(op));
  }

  /**
   * Check if this is an MFA setup path
   */
  private isMFASetupPath(path: string): boolean {
    return MFA_SETUP_PATHS.some((p) => path.startsWith(p));
  }

  /**
   * Create response requiring MFA verification
   */
  private createMFARequiredResponse(request: NextRequest): NextResponse {
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

    if (isApiRoute) {
      return NextResponse.json(
        {
          error: 'MFA_REQUIRED',
          message: 'This operation requires multi-factor authentication',
          aalRequired: 'aal2',
        },
        { status: 403 },
      );
    }

    // Redirect to MFA verification page
    const url = new URL('/auth/mfa-verify', request.url);
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  /**
   * Create response requiring MFA setup
   */
  private createMFASetupRequiredResponse(request: NextRequest): NextResponse {
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

    if (isApiRoute) {
      return NextResponse.json(
        {
          error: 'MFA_SETUP_REQUIRED',
          message:
            'This sensitive operation requires MFA to be set up on your account',
          setupUrl: '/settings/security/mfa-setup',
        },
        { status: 403 },
      );
    }

    // Redirect to MFA setup page
    const url = new URL('/settings/security/mfa-setup', request.url);
    url.searchParams.set('redirect', request.nextUrl.pathname);
    url.searchParams.set('reason', 'sensitive_operation');
    return NextResponse.redirect(url);
  }

  /**
   * Log authentication events for audit trail
   */
  private async logAuthEvent(
    userId: string,
    event: string,
    path: string,
  ): Promise<void> {
    try {
      const logEntry = {
        datetime: new Date().toISOString(),
        appid: 'wedsync.auth',
        event: `${event}:${userId}`,
        level: 'INFO',
        description: `Authentication event for path: ${path}`,
        user_id: userId,
        path,
      };

      logger.info('Auth event', logEntry);
    } catch (error) {
      logger.error(
        'Failed to log auth event',
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }

  /**
   * Validate session security requirements
   */
  async validateSessionSecurity(
    request: NextRequest,
    userId: string,
  ): Promise<boolean> {
    // Check for session fixation attacks
    const sessionId = request.cookies.get('session-id')?.value;
    const storedSessionId = request.cookies.get('stored-session-id')?.value;

    if (sessionId && storedSessionId && sessionId !== storedSessionId) {
      await this.logAuthEvent(
        userId,
        'session_fixation_detected',
        request.nextUrl.pathname,
      );
      return false;
    }

    // Check for concurrent session limits
    // In production, this would check against a session store

    return true;
  }

  /**
   * Create secure session with proper attributes
   */
  createSecureSession(response: NextResponse, sessionData: SessionData): void {
    const sessionId = crypto.randomUUID();

    // Set secure session cookie
    response.cookies.set('session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.sessionTimeout / 1000,
      path: '/',
    });

    // Store session reference for validation
    response.cookies.set('stored-session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.sessionTimeout / 1000,
      path: '/',
    });

    // Set CSRF token for session
    response.cookies.set('csrf-token', crypto.randomUUID(), {
      httpOnly: false, // Needs to be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.sessionTimeout / 1000,
      path: '/',
    });
  }
}

// Export singleton instance
export const authMiddleware = AuthMiddleware.getInstance();
