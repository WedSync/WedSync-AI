import { NextRequest, NextResponse } from 'next/server';
import { SessionSecurityManager } from '@/lib/session-security';
import { withEnhancedAuth } from '@/lib/enhanced-auth-middleware';

/**
 * Get current session information
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await withEnhancedAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const secureSession = SessionSecurityManager.extractSecureSession(request);

    const response = NextResponse.json({
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        organizationId: authResult.user.organizationId,
        role: authResult.user.role,
      },
      session: {
        expiresAt: authResult.session.expires_at,
        isSecure: !!secureSession,
      },
      fingerprint: SessionSecurityManager.generateFingerprint(request),
    });

    // Create secure session if it doesn't exist
    if (!secureSession) {
      const newSecureSession = SessionSecurityManager.createSecureSession(
        authResult.user.id,
        authResult.user.organizationId,
      );

      newSecureSession.fingerprint =
        SessionSecurityManager.generateFingerprint(request);
      SessionSecurityManager.createSessionCookie(response, newSecureSession);

      const auditLog = SessionSecurityManager.createSessionAuditLog(
        'create',
        newSecureSession,
        request,
        { trigger: 'session_info_request' },
      );
      console.log('SESSION_AUDIT:', JSON.stringify(auditLog));
    }

    return response;
  } catch (error) {
    console.error('Session info error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session information' },
      { status: 500 },
    );
  }
}

/**
 * Refresh session
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await withEnhancedAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const secureSession = SessionSecurityManager.extractSecureSession(request);

    if (!secureSession) {
      return NextResponse.json(
        { error: 'No secure session found' },
        { status: 400 },
      );
    }

    // Force refresh the session
    const now = Date.now();
    const refreshedSession = {
      ...secureSession,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      fingerprint: SessionSecurityManager.generateFingerprint(request),
    };

    const response = NextResponse.json({
      message: 'Session refreshed successfully',
      expiresAt: new Date(refreshedSession.expiresAt).toISOString(),
    });

    SessionSecurityManager.createSessionCookie(response, refreshedSession);

    const auditLog = SessionSecurityManager.createSessionAuditLog(
      'refresh',
      refreshedSession,
      request,
      { trigger: 'manual_refresh' },
    );
    console.log('SESSION_AUDIT:', JSON.stringify(auditLog));

    return response;
  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 },
    );
  }
}

/**
 * Invalidate session (logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    const secureSession = SessionSecurityManager.extractSecureSession(request);

    const response = NextResponse.json({
      message: 'Session invalidated successfully',
    });

    // Enhanced session invalidation with revocation
    SessionSecurityManager.invalidateSession(
      response,
      secureSession?.sessionId,
    );

    const auditLog = SessionSecurityManager.createSessionAuditLog(
      'invalidate',
      secureSession,
      request,
      { trigger: 'logout' },
    );
    console.log('SESSION_AUDIT:', JSON.stringify(auditLog));

    return response;
  } catch (error) {
    console.error('Session invalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate session' },
      { status: 500 },
    );
  }
}
