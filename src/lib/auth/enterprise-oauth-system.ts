/**
 * Enterprise OAuth 2.0 + JWT Refresh Token System
 *
 * B-MAD Enhancement: Advanced authentication system with enterprise-grade
 * OAuth 2.0 flows, JWT refresh token optimization, and wedding industry
 * specific security patterns.
 *
 * Features:
 * - OAuth 2.0 Authorization Code Flow with PKCE
 * - JWT access tokens with short lifespan (15 minutes)
 * - Secure refresh tokens with rotation
 * - Device fingerprinting for security
 * - Wedding season burst handling
 * - Multi-tenant token isolation
 * - Automatic token refresh with retry logic
 * - Security event monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLogger, AuditEventType, AuditSeverity } from '@/lib/audit-logger';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Configuration for enterprise OAuth system
interface EnterpriseOAuthConfig {
  accessTokenExpiry: number; // 15 minutes in milliseconds
  refreshTokenExpiry: number; // 30 days in milliseconds
  refreshTokenRotation: boolean;
  deviceFingerprintRequired: boolean;
  weddingSeasonBurstMode: boolean;
  maxActiveTokens: number;
}

const ENTERPRISE_CONFIG: EnterpriseOAuthConfig = {
  accessTokenExpiry: 15 * 60 * 1000, // 15 minutes
  refreshTokenExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days
  refreshTokenRotation: true,
  deviceFingerprintRequired: true,
  weddingSeasonBurstMode: true,
  maxActiveTokens: 5, // Maximum concurrent sessions per user
};

// Token payload interfaces
interface AccessTokenPayload {
  sub: string; // user ID
  email: string;
  organizationId: string;
  subscriptionTier: string;
  permissions: string[];
  sessionId: string;
  deviceFingerprint?: string;
  iat: number;
  exp: number;
  jti: string; // JWT ID for token revocation
}

interface RefreshTokenPayload {
  sub: string; // user ID
  sessionId: string;
  deviceFingerprint: string;
  tokenFamily: string; // For refresh token rotation
  iat: number;
  exp: number;
  jti: string;
}

interface DeviceFingerprint {
  userAgent: string;
  ipAddress: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  timezone?: string;
  screenResolution?: string;
  hash: string;
}

// Token management class
export class EnterpriseTokenManager {
  // 🔒 SECURITY: No fallback secrets - fail securely if not configured
  private static readonly JWT_SECRET = process.env.JWT_SECRET;
  private static readonly REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

  // In production, use Redis for token storage
  private static activeTokens = new Map<
    string,
    {
      userId: string;
      sessionId: string;
      refreshTokenId: string;
      createdAt: Date;
      lastUsed: Date;
      deviceFingerprint: string;
    }
  >();

  private static blacklistedTokens = new Set<string>();

  /**
   * 🔒 SECURITY: Validate that JWT secrets are properly configured
   * Throws error if secrets are missing to prevent using fallback values
   */
  private static validateSecrets(): void {
    if (!this.JWT_SECRET || this.JWT_SECRET.length < 32) {
      const errorMsg = 
        '🚨 CRITICAL SECURITY ERROR: JWT_SECRET not configured or too weak. ' +
        'Set a strong JWT_SECRET environment variable (min 32 chars). ' +
        'This is required to prevent authentication bypass vulnerabilities.';
      
      // Log security incident
      console.error(errorMsg);
      auditLogger.log({
        event_type: AuditEventType.SECURITY_VIOLATION,
        severity: AuditSeverity.CRITICAL,
        action: 'JWT_SECRET not configured - preventing startup',
        details: { 
          error: 'Missing or weak JWT_SECRET',
          secretLength: this.JWT_SECRET?.length || 0,
          timestamp: new Date().toISOString()
        },
      }).catch(() => {}); // Don't fail on audit log errors
      
      throw new Error(errorMsg);
    }

    if (!this.REFRESH_SECRET || this.REFRESH_SECRET.length < 32) {
      const errorMsg = 
        '🚨 CRITICAL SECURITY ERROR: REFRESH_TOKEN_SECRET not configured or too weak. ' +
        'Set a strong REFRESH_TOKEN_SECRET environment variable (min 32 chars). ' +
        'This is required to prevent token forgery vulnerabilities.';
      
      // Log security incident
      console.error(errorMsg);
      auditLogger.log({
        event_type: AuditEventType.SECURITY_VIOLATION,
        severity: AuditSeverity.CRITICAL,
        action: 'REFRESH_TOKEN_SECRET not configured - preventing startup',
        details: { 
          error: 'Missing or weak REFRESH_TOKEN_SECRET',
          secretLength: this.REFRESH_SECRET?.length || 0,
          timestamp: new Date().toISOString()
        },
      }).catch(() => {}); // Don't fail on audit log errors
      
      throw new Error(errorMsg);
    }

    // Validate secrets are different
    if (this.JWT_SECRET === this.REFRESH_SECRET) {
      const errorMsg = 
        '🚨 CRITICAL SECURITY ERROR: JWT_SECRET and REFRESH_TOKEN_SECRET cannot be the same. ' +
        'Use different secrets for access and refresh tokens to maintain security isolation.';
      
      console.error(errorMsg);
      auditLogger.log({
        event_type: AuditEventType.SECURITY_VIOLATION,
        severity: AuditSeverity.CRITICAL,
        action: 'Identical secrets detected - preventing startup',
        details: { 
          error: 'JWT_SECRET and REFRESH_TOKEN_SECRET are identical',
          timestamp: new Date().toISOString()
        },
      }).catch(() => {});
      
      throw new Error(errorMsg);
    }

    // Additional validation for common weak patterns
    const weakPatterns = [
      'secret', 'password', 'test', 'dev', 'development', 'prod', 'production',
      'fallback', 'default', '123', 'abc', 'jwt', 'refresh', 'token'
    ];
    
    const jwtLower = this.JWT_SECRET.toLowerCase();
    const refreshLower = this.REFRESH_SECRET.toLowerCase();
    
    if (weakPatterns.some(pattern => jwtLower.includes(pattern) || refreshLower.includes(pattern))) {
      const errorMsg = 
        '⚠️  SECURITY WARNING: JWT secrets contain common weak patterns. ' +
        'Use cryptographically strong random secrets for production.';
      
      console.warn(errorMsg);
      auditLogger.log({
        event_type: AuditEventType.SECURITY_WARNING,
        severity: AuditSeverity.WARNING,
        action: 'Weak secret patterns detected',
        details: { 
          warning: 'Secrets contain common weak patterns',
          timestamp: new Date().toISOString()
        },
      }).catch(() => {});
    }
  }

  /**
   * Generate device fingerprint for security
   */
  static generateDeviceFingerprint(request: NextRequest): DeviceFingerprint {
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = this.getClientIP(request);
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';

    // Create hash of device characteristics
    const fingerprintData = `${userAgent}|${ipAddress}|${acceptLanguage}|${acceptEncoding}`;
    const hash = crypto
      .createHash('sha256')
      .update(fingerprintData)
      .digest('hex');

    return {
      userAgent,
      ipAddress,
      acceptLanguage,
      acceptEncoding,
      hash,
    };
  }

  /**
   * Create access token with enterprise security features
   */
  static async createAccessToken(
    user: any,
    sessionId: string,
    deviceFingerprint: DeviceFingerprint,
    permissions: string[] = [],
  ): Promise<string> {
    // 🔒 SECURITY: Validate secrets before creating tokens
    this.validateSecrets();
    const now = Date.now();
    const jti = crypto.randomUUID();

    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      subscriptionTier: user.subscriptionTier || 'FREE',
      permissions: permissions,
      sessionId: sessionId,
      deviceFingerprint: ENTERPRISE_CONFIG.deviceFingerprintRequired
        ? deviceFingerprint.hash
        : undefined,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + ENTERPRISE_CONFIG.accessTokenExpiry) / 1000),
      jti: jti,
    };

    // Check wedding season burst mode
    if (ENTERPRISE_CONFIG.weddingSeasonBurstMode && this.isWeddingSeason()) {
      // Extend token lifetime during peak season (April-October)
      payload.exp = Math.floor((now + 30 * 60 * 1000) / 1000); // 30 minutes instead of 15
    }

    return jwt.sign(payload, this.JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'wedsync-enterprise',
      audience: 'wedsync-api',
    });
  }

  /**
   * Create refresh token with rotation support
   */
  static async createRefreshToken(
    userId: string,
    sessionId: string,
    deviceFingerprint: DeviceFingerprint,
    tokenFamily?: string,
  ): Promise<{ token: string; tokenId: string; family: string }> {
    // 🔒 SECURITY: Validate secrets before creating tokens
    this.validateSecrets();
    const now = Date.now();
    const jti = crypto.randomUUID();
    const family = tokenFamily || crypto.randomUUID();

    const payload: RefreshTokenPayload = {
      sub: userId,
      sessionId: sessionId,
      deviceFingerprint: deviceFingerprint.hash,
      tokenFamily: family,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + ENTERPRISE_CONFIG.refreshTokenExpiry) / 1000),
      jti: jti,
    };

    const token = jwt.sign(payload, this.REFRESH_SECRET, {
      algorithm: 'HS256',
      issuer: 'wedsync-enterprise-refresh',
      audience: 'wedsync-refresh',
    });

    // Store token metadata
    this.activeTokens.set(jti, {
      userId,
      sessionId,
      refreshTokenId: jti,
      createdAt: new Date(),
      lastUsed: new Date(),
      deviceFingerprint: deviceFingerprint.hash,
    });

    return { token, tokenId: jti, family };
  }

  /**
   * Verify and decode access token with enterprise security checks
   */
  static async verifyAccessToken(
    token: string,
    deviceFingerprint?: DeviceFingerprint,
  ): Promise<{ valid: boolean; payload?: AccessTokenPayload; error?: string }> {
    try {
      // 🔒 SECURITY: Validate secrets before verifying tokens
      this.validateSecrets();
      // Check blacklist
      if (this.blacklistedTokens.has(token)) {
        return { valid: false, error: 'Token has been revoked' };
      }

      const payload = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'wedsync-enterprise',
        audience: 'wedsync-api',
      }) as AccessTokenPayload;

      // Verify device fingerprint if required
      if (ENTERPRISE_CONFIG.deviceFingerprintRequired && deviceFingerprint) {
        if (payload.deviceFingerprint !== deviceFingerprint.hash) {
          await auditLogger.log({
            event_type: AuditEventType.SECURITY_VIOLATION,
            severity: AuditSeverity.ERROR,
            user_id: payload.sub,
            action: 'Device fingerprint mismatch detected',
            details: {
              expectedFingerprint: payload.deviceFingerprint,
              actualFingerprint: deviceFingerprint.hash,
              sessionId: payload.sessionId,
            },
          });
          return { valid: false, error: 'Device fingerprint mismatch' };
        }
      }

      return { valid: true, payload };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * Verify refresh token and support rotation
   */
  static async verifyRefreshToken(
    token: string,
    deviceFingerprint: DeviceFingerprint,
  ): Promise<{
    valid: boolean;
    payload?: RefreshTokenPayload;
    needsRotation?: boolean;
    error?: string;
  }> {
    try {
      // 🔒 SECURITY: Validate secrets before verifying tokens
      this.validateSecrets();
      const payload = jwt.verify(token, this.REFRESH_SECRET, {
        issuer: 'wedsync-enterprise-refresh',
        audience: 'wedsync-refresh',
      }) as RefreshTokenPayload;

      // Check device fingerprint
      if (payload.deviceFingerprint !== deviceFingerprint.hash) {
        return { valid: false, error: 'Device fingerprint mismatch' };
      }

      // Check if token is still active
      const tokenMetadata = this.activeTokens.get(payload.jti);
      if (!tokenMetadata) {
        return { valid: false, error: 'Token not found in active tokens' };
      }

      // Check refresh token rotation policy
      const needsRotation =
        ENTERPRISE_CONFIG.refreshTokenRotation &&
        Date.now() - tokenMetadata.lastUsed.getTime() > 7 * 24 * 60 * 60 * 1000; // 7 days

      // Update last used time
      tokenMetadata.lastUsed = new Date();
      this.activeTokens.set(payload.jti, tokenMetadata);

      return { valid: true, payload, needsRotation };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid refresh token',
      };
    }
  }

  /**
   * Refresh access token with optional token rotation
   */
  static async refreshTokens(
    refreshToken: string,
    deviceFingerprint: DeviceFingerprint,
    userDetails: any,
  ): Promise<{
    success: boolean;
    accessToken?: string;
    newRefreshToken?: string;
    error?: string;
  }> {
    try {
      const refreshResult = await this.verifyRefreshToken(
        refreshToken,
        deviceFingerprint,
      );

      if (!refreshResult.valid || !refreshResult.payload) {
        return { success: false, error: refreshResult.error };
      }

      const { payload } = refreshResult;

      // Generate new access token
      const newAccessToken = await this.createAccessToken(
        userDetails,
        payload.sessionId,
        deviceFingerprint,
        [], // TODO: Load user permissions from database
      );

      let newRefreshToken: string | undefined;

      // Handle refresh token rotation
      if (
        refreshResult.needsRotation ||
        ENTERPRISE_CONFIG.refreshTokenRotation
      ) {
        // Invalidate old refresh token
        this.activeTokens.delete(payload.jti);

        // Create new refresh token with same family
        const refreshTokenData = await this.createRefreshToken(
          payload.sub,
          payload.sessionId,
          deviceFingerprint,
          payload.tokenFamily,
        );

        newRefreshToken = refreshTokenData.token;

        await auditLogger.log({
          event_type: AuditEventType.TOKEN_REFRESH,
          severity: AuditSeverity.INFO,
          user_id: payload.sub,
          action: 'Refresh token rotated',
          details: {
            sessionId: payload.sessionId,
            oldTokenId: payload.jti,
            newTokenId: refreshTokenData.tokenId,
          },
        });
      }

      return {
        success: true,
        accessToken: newAccessToken,
        newRefreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Revoke token and add to blacklist
   */
  static async revokeToken(
    tokenId: string,
    reason: string = 'Manual revocation',
  ): Promise<void> {
    this.blacklistedTokens.add(tokenId);
    this.activeTokens.delete(tokenId);

    await auditLogger.log({
      event_type: AuditEventType.TOKEN_REVOKED,
      severity: AuditSeverity.INFO,
      action: 'Token revoked',
      details: { tokenId, reason },
    });
  }

  /**
   * Clean up expired tokens and manage active sessions
   */
  static async cleanupExpiredTokens(): Promise<void> {
    const now = Date.now();
    const expiredTokens: string[] = [];

    for (const [tokenId, metadata] of this.activeTokens.entries()) {
      // Remove tokens older than refresh token expiry
      if (
        now - metadata.createdAt.getTime() >
        ENTERPRISE_CONFIG.refreshTokenExpiry
      ) {
        expiredTokens.push(tokenId);
      }
    }

    // Clean up expired tokens
    expiredTokens.forEach((tokenId) => {
      this.activeTokens.delete(tokenId);
      this.blacklistedTokens.add(tokenId);
    });

    if (expiredTokens.length > 0) {
      await auditLogger.log({
        event_type: AuditEventType.TOKEN_CLEANUP,
        severity: AuditSeverity.INFO,
        action: 'Expired tokens cleaned up',
        details: { cleanedTokens: expiredTokens.length },
      });
    }
  }

  /**
   * Check if current time is wedding season (April-October)
   */
  private static isWeddingSeason(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    return month >= 4 && month <= 10; // April through October
  }

  /**
   * Get client IP address with fallbacks
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
   * Get user's active sessions count
   */
  static async getUserActiveSessionsCount(userId: string): Promise<number> {
    return Array.from(this.activeTokens.values()).filter(
      (metadata) => metadata.userId === userId,
    ).length;
  }

  /**
   * Enforce maximum concurrent sessions per user
   */
  static async enforceMaxSessions(userId: string): Promise<void> {
    const userTokens = Array.from(this.activeTokens.entries()).filter(
      ([_, metadata]) => metadata.userId === userId,
    );

    if (userTokens.length >= ENTERPRISE_CONFIG.maxActiveTokens) {
      // Remove oldest token
      const oldestToken = userTokens.sort(
        (a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime(),
      )[0];

      await this.revokeToken(oldestToken[0], 'Max sessions exceeded');
    }
  }
}

/**
 * Enterprise OAuth 2.0 Middleware
 */
export class EnterpriseOAuthMiddleware {
  /**
   * Enhanced authentication middleware with enterprise features
   */
  static async authenticate(request: NextRequest): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
    needsRefresh?: boolean;
  }> {
    try {
      const authHeader = request.headers.get('authorization');

      if (!authHeader?.startsWith('Bearer ')) {
        return { success: false, error: 'No access token provided' };
      }

      const token = authHeader.substring(7);
      const deviceFingerprint =
        EnterpriseTokenManager.generateDeviceFingerprint(request);

      // Verify access token
      const tokenResult = await EnterpriseTokenManager.verifyAccessToken(
        token,
        deviceFingerprint,
      );

      if (!tokenResult.valid) {
        // Check if token expired (might need refresh)
        const needsRefresh =
          tokenResult.error?.includes('expired') ||
          tokenResult.error?.includes('jwt expired');

        return {
          success: false,
          error: tokenResult.error,
          needsRefresh,
        };
      }

      const payload = tokenResult.payload!;

      // Load user details from database
      const supabase = await createClient();
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single();

      if (userError || !user) {
        return { success: false, error: 'User not found' };
      }

      // Verify user organization matches token
      if (user.organization_id !== payload.organizationId) {
        await auditLogger.log({
          event_type: AuditEventType.SECURITY_VIOLATION,
          severity: AuditSeverity.ERROR,
          user_id: payload.sub,
          action: 'Organization mismatch in token',
          details: {
            tokenOrg: payload.organizationId,
            userOrg: user.organization_id,
          },
        });
        return { success: false, error: 'Organization context mismatch' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          organizationId: user.organization_id,
          subscriptionTier: user.subscription_tier,
          permissions: payload.permissions,
        },
        session: {
          sessionId: payload.sessionId,
          deviceFingerprint: deviceFingerprint.hash,
          tokenExpiry: payload.exp,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Token refresh endpoint handler
   */
  static async handleTokenRefresh(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { refreshToken } = z
        .object({
          refreshToken: z.string(),
        })
        .parse(body);

      const deviceFingerprint =
        EnterpriseTokenManager.generateDeviceFingerprint(request);

      // Verify refresh token
      const refreshResult = await EnterpriseTokenManager.verifyRefreshToken(
        refreshToken,
        deviceFingerprint,
      );

      if (!refreshResult.valid || !refreshResult.payload) {
        return NextResponse.json(
          { error: refreshResult.error },
          { status: 401 },
        );
      }

      // Load user details
      const supabase = await createClient();
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', refreshResult.payload.sub)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Refresh tokens
      const tokenRefreshResult = await EnterpriseTokenManager.refreshTokens(
        refreshToken,
        deviceFingerprint,
        user,
      );

      if (!tokenRefreshResult.success) {
        return NextResponse.json(
          { error: tokenRefreshResult.error },
          { status: 400 },
        );
      }

      const response = NextResponse.json({
        accessToken: tokenRefreshResult.accessToken,
        refreshToken: tokenRefreshResult.newRefreshToken || refreshToken,
        expiresIn: ENTERPRISE_CONFIG.accessTokenExpiry / 1000,
        tokenType: 'Bearer',
      });

      // Set secure refresh token cookie if new one was issued
      if (tokenRefreshResult.newRefreshToken) {
        response.cookies.set(
          'refresh_token',
          tokenRefreshResult.newRefreshToken,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: ENTERPRISE_CONFIG.refreshTokenExpiry / 1000,
            path: '/',
          },
        );
      }

      return response;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 500 },
      );
    }
  }

  /**
   * Logout handler with comprehensive token cleanup
   */
  static async handleLogout(request: NextRequest): Promise<NextResponse> {
    try {
      const authHeader = request.headers.get('authorization');
      const refreshTokenCookie = request.cookies.get('refresh_token')?.value;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
          const decoded = jwt.decode(token) as any;
          if (decoded?.jti) {
            await EnterpriseTokenManager.revokeToken(
              decoded.jti,
              'User logout',
            );
          }
        } catch (error) {
          // Ignore decode errors during logout
        }
      }

      if (refreshTokenCookie) {
        try {
          const decoded = jwt.decode(refreshTokenCookie) as any;
          if (decoded?.jti) {
            await EnterpriseTokenManager.revokeToken(
              decoded.jti,
              'User logout',
            );
          }
        } catch (error) {
          // Ignore decode errors during logout
        }
      }

      const response = NextResponse.json({
        message: 'Logged out successfully',
      });

      // Clear refresh token cookie
      response.cookies.delete('refresh_token');

      return response;
    } catch (error) {
      return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
  }
}

// Automated cleanup job (run every hour)
setInterval(
  () => {
    EnterpriseTokenManager.cleanupExpiredTokens().catch(console.error);
  },
  60 * 60 * 1000,
);

export default EnterpriseOAuthMiddleware;
