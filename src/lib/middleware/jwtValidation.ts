/**
 * Enhanced JWT Validation Middleware for WS-167 Trial Management System
 * Addresses security audit findings for JWT validation gaps
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { jwtVerify, errors } from 'jose';

export interface JWTValidationResult {
  valid: boolean;
  user?: any;
  session?: any;
  error?: string;
  tokenExpired?: boolean;
  refreshRequired?: boolean;
}

export class EnhancedJWTValidator {
  // 🔒 SECURITY: Validate SUPABASE_JWT_SECRET at class initialization
  private static readonly JWT_SECRET = (() => {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret || secret.length < 32) {
      const errorMsg = '🚨 CRITICAL SECURITY ERROR: SUPABASE_JWT_SECRET not configured or too weak';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    return new TextEncoder().encode(secret);
  })();

  private static readonly EXPECTED_AUDIENCE = 'authenticated';
  private static readonly EXPECTED_ISSUER = process.env.SUPABASE_URL;
  private static readonly TOKEN_EXPIRY_BUFFER = 60; // 60 seconds buffer before expiry

  /**
   * Comprehensive JWT validation with security checks
   */
  static async validateJWT(request: NextRequest): Promise<JWTValidationResult> {
    try {
      const supabase = createRouteHandlerClient({ cookies });

      // Get session from Supabase (handles token refresh automatically)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          valid: false,
          error: sessionError?.message || 'No valid session found',
          refreshRequired: sessionError?.message?.includes('refresh'),
        };
      }

      // Extract access token for detailed validation
      const accessToken = session.access_token;
      if (!accessToken) {
        return {
          valid: false,
          error: 'No access token in session',
        };
      }

      // Perform comprehensive JWT validation
      const tokenValidation = await this.validateTokenStructure(accessToken);
      if (!tokenValidation.valid) {
        return tokenValidation;
      }

      // Check token expiration with buffer
      const tokenExpiry = session.expires_at;
      if (tokenExpiry) {
        const expiryTime = tokenExpiry * 1000; // Convert to milliseconds
        const bufferTime = this.TOKEN_EXPIRY_BUFFER * 1000;

        if (Date.now() >= expiryTime - bufferTime) {
          return {
            valid: false,
            error: 'Token expiring soon',
            tokenExpired: true,
            refreshRequired: true,
          };
        }
      }

      // Validate user object structure
      if (!session.user || !session.user.id || !session.user.aud) {
        return {
          valid: false,
          error: 'Invalid user data in session',
        };
      }

      // Check if user is confirmed (email verified)
      if (!session.user.email_confirmed_at) {
        return {
          valid: false,
          error: 'Email not verified',
        };
      }

      // Additional security checks
      const securityCheck = this.performSecurityChecks(session, request);
      if (!securityCheck.valid) {
        return securityCheck;
      }

      return {
        valid: true,
        user: session.user,
        session: session,
      };
    } catch (error: any) {
      console.error('JWT validation error:', error);
      return {
        valid: false,
        error: `JWT validation failed: ${error.message}`,
        tokenExpired: error.name === 'JWTExpired',
      };
    }
  }

  /**
   * Validate JWT token structure and signature
   */
  private static async validateTokenStructure(
    token: string,
  ): Promise<JWTValidationResult> {
    try {
      // Verify JWT signature and structure
      const { payload } = await jwtVerify(token, this.JWT_SECRET, {
        audience: this.EXPECTED_AUDIENCE,
        issuer: this.EXPECTED_ISSUER,
        algorithms: ['HS256'],
      });

      // Validate required claims
      if (!payload.sub || !payload.aud || !payload.iss) {
        return {
          valid: false,
          error: 'Missing required JWT claims',
        };
      }

      // Validate audience
      if (payload.aud !== this.EXPECTED_AUDIENCE) {
        return {
          valid: false,
          error: 'Invalid JWT audience',
        };
      }

      // Validate issuer
      if (payload.iss !== this.EXPECTED_ISSUER) {
        return {
          valid: false,
          error: 'Invalid JWT issuer',
        };
      }

      // Check expiration manually as well
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return {
          valid: false,
          error: 'Token has expired',
          tokenExpired: true,
        };
      }

      return { valid: true };
    } catch (error: any) {
      if (error instanceof errors.JWTExpired) {
        return {
          valid: false,
          error: 'Token has expired',
          tokenExpired: true,
        };
      }

      return {
        valid: false,
        error: `Token validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Perform additional security checks
   */
  private static performSecurityChecks(
    session: any,
    request: NextRequest,
  ): JWTValidationResult {
    // Check for suspicious activity patterns
    const userAgent = request.headers.get('user-agent') || '';
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Basic bot detection
    const suspiciousAgents = ['bot', 'crawler', 'spider', 'scraper'];
    if (
      suspiciousAgents.some((agent) => userAgent.toLowerCase().includes(agent))
    ) {
      console.warn(
        `Suspicious user agent detected: ${userAgent} from IP: ${ip}`,
      );
    }

    // Check for session hijacking indicators
    const sessionCreated = new Date(session.user.created_at).getTime();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    // If account is very new and making API requests, be cautious
    if (sessionCreated > twoHoursAgo) {
      console.info(
        `New account activity detected: User ${session.user.id} from IP: ${ip}`,
      );
    }

    // All security checks passed
    return { valid: true };
  }

  /**
   * Generate secure response for invalid tokens
   */
  static generateSecurityResponse(
    error: string,
    status: number = 401,
  ): NextResponse {
    // Log security event without exposing sensitive information
    console.warn(`Security event: ${error} at ${new Date().toISOString()}`);

    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        message: 'Invalid or expired authentication credentials',
        code: 'AUTH_INVALID',
      },
      {
        status,
        headers: {
          'WWW-Authenticate': 'Bearer',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      },
    );
  }
}

/**
 * Middleware wrapper for API routes with enhanced JWT validation
 */
export function withEnhancedAuth() {
  return async function authMiddleware(
    request: NextRequest,
    handler: (
      req: NextRequest,
      context: { user: any; session: any },
    ) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const validation = await EnhancedJWTValidator.validateJWT(request);

    if (!validation.valid) {
      if (validation.refreshRequired) {
        return NextResponse.json(
          {
            success: false,
            error: 'Token refresh required',
            code: 'AUTH_REFRESH_REQUIRED',
          },
          { status: 401 },
        );
      }

      return EnhancedJWTValidator.generateSecurityResponse(
        validation.error || 'Authentication failed',
        validation.tokenExpired ? 401 : 403,
      );
    }

    // Add security headers to response
    const response = await handler(request, {
      user: validation.user!,
      session: validation.session!,
    });

    // Add security headers
    response.headers.set('X-Request-ID', crypto.randomUUID());
    response.headers.set('X-Authenticated-User', validation.user!.id);

    return response;
  };
}

export default EnhancedJWTValidator;
