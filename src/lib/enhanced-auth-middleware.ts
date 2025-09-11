import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from './auth-middleware';
import { SessionSecurityManager } from './session-security';

export interface EnhancedAuthResult {
  user: AuthUser;
  session: any;
  supabase: any;
  secureSession?: any;
}

/**
 * Enhanced authentication middleware with additional session security
 * This works alongside Supabase auth to add cryptographic session validation
 */
export async function withEnhancedAuth(
  request: NextRequest,
): Promise<EnhancedAuthResult | NextResponse> {
  try {
    // First, validate with standard Supabase auth
    const authResult = await withAuth(request);

    if ('error' in authResult) {
      // Log failed authentication attempt
      const auditLog = SessionSecurityManager.createSessionAuditLog(
        'validate',
        null,
        request,
        { result: 'auth_failed' },
      );
      console.log('SESSION_AUDIT:', JSON.stringify(auditLog));

      return authResult;
    }

    // Extract secure session for additional validation
    const secureSession = SessionSecurityManager.extractSecureSession(request);

    if (secureSession) {
      // Validate secure session matches current user
      if (secureSession.userId !== authResult.user.id) {
        const auditLog = SessionSecurityManager.createSessionAuditLog(
          'fingerprint_mismatch',
          secureSession,
          request,
          { supabaseUserId: authResult.user.id },
        );
        console.warn('SESSION_AUDIT:', JSON.stringify(auditLog));

        // Clear invalid secure session
        const response = NextResponse.json(
          { error: 'Session validation failed', code: 'SESSION_MISMATCH' },
          { status: 401 },
        );
        SessionSecurityManager.invalidateSession(response);
        return response;
      }

      // Log successful secure session validation
      const auditLog = SessionSecurityManager.createSessionAuditLog(
        'validate',
        secureSession,
        request,
        { result: 'success', supabaseAuth: true },
      );
      console.log('SESSION_AUDIT:', JSON.stringify(auditLog));
    } else {
      // Create new secure session if none exists
      const newSecureSession = SessionSecurityManager.createSecureSession(
        authResult.user.id,
        authResult.user.organizationId,
      );

      // Bind fingerprint to session
      newSecureSession.fingerprint =
        SessionSecurityManager.generateFingerprint(request);

      // Log new secure session creation
      const auditLog = SessionSecurityManager.createSessionAuditLog(
        'create',
        newSecureSession,
        request,
        { trigger: 'missing_secure_session' },
      );
      console.log('SESSION_AUDIT:', JSON.stringify(auditLog));
    }

    return {
      ...authResult,
      secureSession,
    };
  } catch (error) {
    console.error('Enhanced auth middleware error:', error);

    const auditLog = SessionSecurityManager.createSessionAuditLog(
      'validate',
      null,
      request,
      { error: error instanceof Error ? error.message : 'unknown_error' },
    );
    console.error('SESSION_AUDIT:', JSON.stringify(auditLog));

    return NextResponse.json(
      { error: 'Internal authentication error', code: 'INTERNAL_AUTH_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * Middleware wrapper that adds secure session management to existing API routes
 */
export function withSecureSession(
  handler: (
    req: NextRequest,
    context: EnhancedAuthResult,
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const authResult = await withEnhancedAuth(req);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    try {
      const response = await handler(req, authResult);

      // Refresh secure session if needed
      if (authResult.secureSession) {
        const refreshedSession = SessionSecurityManager.refreshSessionIfNeeded(
          authResult.secureSession,
          response,
        );

        if (refreshedSession !== authResult.secureSession) {
          const auditLog = SessionSecurityManager.createSessionAuditLog(
            'refresh',
            refreshedSession,
            req,
          );
          console.log('SESSION_AUDIT:', JSON.stringify(auditLog));
        }
      }

      return response;
    } catch (error) {
      console.error('Secure session handler error:', error);

      const auditLog = SessionSecurityManager.createSessionAuditLog(
        'validate',
        authResult.secureSession,
        req,
        {
          handler_error:
            error instanceof Error ? error.message : 'unknown_error',
        },
      );
      console.error('SESSION_AUDIT:', JSON.stringify(auditLog));

      return NextResponse.json(
        { error: 'Request processing failed' },
        { status: 500 },
      );
    }
  };
}

/**
 * API Token validation for machine-to-machine authentication
 */
export function withAPIToken(
  handler: (
    req: NextRequest,
    context: { userId: string; organizationId?: string },
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const authHeader = req.headers.get('authorization');

      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'API token required', code: 'NO_API_TOKEN' },
          { status: 401 },
        );
      }

      const token = authHeader.substring(7);
      const tokenData = SessionSecurityManager.verifyAPIToken(token);

      if (!tokenData) {
        const auditLog = SessionSecurityManager.createSessionAuditLog(
          'validate',
          null,
          req,
          { result: 'invalid_api_token' },
        );
        console.warn('SESSION_AUDIT:', JSON.stringify(auditLog));

        return NextResponse.json(
          { error: 'Invalid API token', code: 'INVALID_API_TOKEN' },
          { status: 401 },
        );
      }

      // Log successful API token validation
      const auditLog = SessionSecurityManager.createSessionAuditLog(
        'validate',
        null,
        req,
        { result: 'api_token_success', userId: tokenData.userId },
      );
      console.log('SESSION_AUDIT:', JSON.stringify(auditLog));

      return handler(req, tokenData);
    } catch (error) {
      console.error('API token validation error:', error);
      return NextResponse.json(
        { error: 'Token validation failed' },
        { status: 500 },
      );
    }
  };
}

/**
 * Rate limiting with session-aware tracking
 */
export class SecureRateLimiter {
  private static attempts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static async checkRateLimit(
    request: NextRequest,
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const key = `${identifier}:${this.getClientIP(request)}`;

    const current = this.attempts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: now + windowMs,
      };
    }

    if (current.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetTime: current.resetTime };
    }

    // Increment count
    current.count += 1;
    this.attempts.set(key, current);

    return {
      allowed: true,
      remaining: maxAttempts - current.count,
      resetTime: current.resetTime,
    };
  }

  private static getClientIP(request: NextRequest): string {
    return (
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      'unknown'
    );
  }

  // Clean up old entries periodically
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.attempts.entries()) {
      if (now > value.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// Clean up rate limiter every hour with process manager integration
const rateLimiterCleanupInterval = setInterval(
  () => SecureRateLimiter.cleanup(),
  60 * 60 * 1000,
);

// Register cleanup with process manager
import { processManager } from './system-stability/process-manager';
processManager.registerCleanupHandler(
  'rateLimiterCleanup',
  () => {
    clearInterval(rateLimiterCleanupInterval);
    SecureRateLimiter.cleanup();
  },
  25,
);
