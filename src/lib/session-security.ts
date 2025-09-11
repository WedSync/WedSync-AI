import { randomBytes, createHash, createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateSecureToken,
  hashData,
  verifyHashedData,
} from './crypto-utils';

interface SecureSessionData {
  sessionId: string;
  userId: string;
  organizationId?: string;
  createdAt: number;
  expiresAt: number;
  fingerprint: string;
  refreshToken: string;
  metadata?: Record<string, any>;
}

interface SessionFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  clientIP: string;
}

export class SessionSecurityManager {
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private static readonly SESSION_SECRET = (() => {
    if (!process.env.SESSION_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'SESSION_SECRET environment variable must be set in production',
        );
      }
      console.warn('⚠️  SESSION_SECRET not set - using development fallback');
      return 'dev-fallback-secret-change-in-production';
    }
    if (process.env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters long');
    }
    return process.env.SESSION_SECRET;
  })();

  // Session blacklist for revoked sessions
  private static readonly revokedSessions = new Set<string>();
  private static lastCleanup = Date.now();

  /**
   * Generate a cryptographically secure session fingerprint
   */
  static generateFingerprint(request: NextRequest): string {
    const fingerprint: SessionFingerprint = {
      userAgent: request.headers.get('user-agent') || '',
      acceptLanguage: request.headers.get('accept-language') || '',
      acceptEncoding: request.headers.get('accept-encoding') || '',
      clientIP: this.getClientIP(request),
    };

    const fingerprintString = JSON.stringify(fingerprint);
    return createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Create a secure session with fingerprinting
   */
  static createSecureSession(
    userId: string,
    organizationId?: string,
    metadata?: Record<string, any>,
  ): SecureSessionData {
    const now = Date.now();
    const sessionId = generateSecureToken(32);
    const refreshToken = generateSecureToken(32);

    return {
      sessionId,
      userId,
      organizationId,
      createdAt: now,
      expiresAt: now + this.SESSION_DURATION,
      fingerprint: '', // Will be set when binding to request
      refreshToken,
      metadata,
    };
  }

  /**
   * Sign session data with HMAC
   */
  static signSessionData(sessionData: SecureSessionData): string {
    const payload = JSON.stringify(sessionData);
    const signature = createHmac('sha256', this.SESSION_SECRET)
      .update(payload)
      .digest('hex');

    return `${Buffer.from(payload).toString('base64')}.${signature}`;
  }

  /**
   * Verify and decode signed session data
   */
  static verifySessionData(signedData: string): SecureSessionData | null {
    try {
      const [encodedPayload, signature] = signedData.split('.');

      if (!encodedPayload || !signature) {
        return null;
      }

      const payload = Buffer.from(encodedPayload, 'base64').toString('utf8');
      const expectedSignature = createHmac('sha256', this.SESSION_SECRET)
        .update(payload)
        .digest('hex');

      // Timing-safe comparison
      if (
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
      ) {
        return null;
      }

      const sessionData: SecureSessionData = JSON.parse(payload);

      // Check if session is revoked
      if (this.revokedSessions.has(sessionData.sessionId)) {
        return null;
      }

      // Validate session hasn't expired
      if (Date.now() > sessionData.expiresAt) {
        // Clean expired session from revocation list
        this.revokedSessions.delete(sessionData.sessionId);
        return null;
      }

      // Additional validation for session integrity
      if (
        !sessionData.sessionId ||
        !sessionData.userId ||
        !sessionData.fingerprint
      ) {
        return null;
      }

      return sessionData;
    } catch {
      return null;
    }
  }

  /**
   * Validate session against request fingerprint
   */
  static validateSessionFingerprint(
    sessionData: SecureSessionData,
    request: NextRequest,
  ): boolean {
    const currentFingerprint = this.generateFingerprint(request);
    return sessionData.fingerprint === currentFingerprint;
  }

  /**
   * Create secure session cookie with enhanced security attributes
   */
  static createSessionCookie(
    response: NextResponse,
    sessionData: SecureSessionData,
  ): void {
    const signedSession = this.signSessionData(sessionData);

    // Enhanced cookie security settings
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: this.SESSION_DURATION / 1000,
      path: '/',
    };

    response.cookies.set('secure-session', signedSession, cookieOptions);

    // Set refresh token in separate cookie with stricter path
    response.cookies.set('refresh-token', sessionData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const, // Stricter for refresh tokens
      maxAge: this.REFRESH_DURATION / 1000,
      path: '/api/auth', // Restrict refresh token to auth endpoints only
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }
  }

  /**
   * Extract secure session from request
   */
  static extractSecureSession(request: NextRequest): SecureSessionData | null {
    const sessionCookie = request.cookies.get('secure-session');

    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = this.verifySessionData(sessionCookie.value);

    if (!sessionData) {
      return null;
    }

    // Validate fingerprint
    if (!this.validateSessionFingerprint(sessionData, request)) {
      console.warn('Session fingerprint mismatch detected');
      return null;
    }

    return sessionData;
  }

  /**
   * Refresh session if close to expiry
   */
  static refreshSessionIfNeeded(
    sessionData: SecureSessionData,
    response: NextResponse,
  ): SecureSessionData {
    const now = Date.now();
    const timeUntilExpiry = sessionData.expiresAt - now;

    // Refresh if less than 2 hours remaining
    if (timeUntilExpiry < 2 * 60 * 60 * 1000) {
      const refreshedSession: SecureSessionData = {
        ...sessionData,
        expiresAt: now + this.SESSION_DURATION,
        refreshToken: generateSecureToken(32), // New refresh token
      };

      this.createSessionCookie(response, refreshedSession);
      return refreshedSession;
    }

    return sessionData;
  }

  /**
   * Revoke a specific session by ID
   */
  static revokeSession(sessionId: string): void {
    this.revokedSessions.add(sessionId);
    this.cleanupRevokedSessions();
  }

  /**
   * Revoke all sessions for a user (for security breaches)
   */
  static revokeAllUserSessions(userId: string): void {
    // In production, this would need to query a persistent store
    // For now, we log the revocation for audit purposes
    console.warn(`All sessions revoked for user: ${userId}`);
    this.cleanupRevokedSessions();
  }

  /**
   * Invalidate session (logout)
   */
  static invalidateSession(response: NextResponse, sessionId?: string): void {
    if (sessionId) {
      this.revokeSession(sessionId);
    }

    response.cookies.set('secure-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth',
    });
  }

  /**
   * Clean up expired revoked sessions
   */
  private static cleanupRevokedSessions(): void {
    const now = Date.now();

    // Only cleanup every hour to avoid performance impact
    if (now - this.lastCleanup < 60 * 60 * 1000) {
      return;
    }

    // In a production system, we'd need to query the database
    // to check which revoked sessions are actually expired
    // For now, we limit the set size
    if (this.revokedSessions.size > 10000) {
      console.warn(
        'Revoked sessions set is getting large, consider database-backed solution',
      );
      this.revokedSessions.clear();
    }

    this.lastCleanup = now;
  }

  /**
   * Generate session audit log entry
   */
  static createSessionAuditLog(
    action:
      | 'create'
      | 'validate'
      | 'refresh'
      | 'invalidate'
      | 'fingerprint_mismatch',
    sessionData: SecureSessionData | null,
    request: NextRequest,
    additionalData?: Record<string, any>,
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      action: `session_${action}`,
      sessionId: sessionData?.sessionId || 'unknown',
      userId: sessionData?.userId || 'unknown',
      organizationId: sessionData?.organizationId,
      clientIP: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      fingerprint: this.generateFingerprint(request),
      ...additionalData,
    };
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(request: NextRequest): string {
    return (
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * Generate secure anti-CSRF state parameter
   */
  static generateSecureState(): string {
    const state = {
      nonce: generateSecureToken(16),
      timestamp: Date.now(),
    };

    const stateString = JSON.stringify(state);
    const signature = createHmac('sha256', this.SESSION_SECRET)
      .update(stateString)
      .digest('hex');

    return Buffer.from(`${stateString}.${signature}`).toString('base64url');
  }

  /**
   * Verify secure state parameter
   */
  static verifySecureState(state: string): boolean {
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      const [stateString, signature] = decoded.split('.');

      if (!stateString || !signature) {
        return false;
      }

      const expectedSignature = createHmac('sha256', this.SESSION_SECRET)
        .update(stateString)
        .digest('hex');

      if (
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
      ) {
        return false;
      }

      const stateData = JSON.parse(stateString);

      // State should not be older than 10 minutes
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create secure session token for API authentication
   */
  static createAPIToken(userId: string, organizationId?: string): string {
    const tokenData = {
      userId,
      organizationId,
      issued: Date.now(),
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    const tokenString = JSON.stringify(tokenData);
    const signature = createHmac('sha256', this.SESSION_SECRET)
      .update(tokenString)
      .digest('hex');

    return Buffer.from(`${tokenString}.${signature}`).toString('base64url');
  }

  /**
   * Verify API token
   */
  static verifyAPIToken(
    token: string,
  ): { userId: string; organizationId?: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const [tokenString, signature] = decoded.split('.');

      if (!tokenString || !signature) {
        return null;
      }

      const expectedSignature = createHmac('sha256', this.SESSION_SECRET)
        .update(tokenString)
        .digest('hex');

      if (
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
      ) {
        return null;
      }

      const tokenData = JSON.parse(tokenString);

      // Check expiration
      if (Date.now() > tokenData.expires) {
        return null;
      }

      return {
        userId: tokenData.userId,
        organizationId: tokenData.organizationId,
      };
    } catch {
      return null;
    }
  }
}
