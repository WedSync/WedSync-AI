import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET =
  (typeof process !== 'undefined' && process.env?.CSRF_SECRET) ||
  'fallback-secret-for-dev-only-change-in-production';
const CSRF_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

export interface CSRFTokenData {
  token: string;
  hash: string;
  timestamp: number;
  sessionId?: string;
}

// Simple hash function for Edge Runtime
async function simpleHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data + CSRF_SECRET);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Generate random token
function generateRandomToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export class CSRFTokenService {
  /**
   * Generate a cryptographically secure CSRF token
   */
  static async generateToken(sessionId?: string): Promise<CSRFTokenData> {
    const token = generateRandomToken();
    const timestamp = Date.now();
    const payload = `${token}:${timestamp}:${sessionId || ''}`;
    const hash = await simpleHash(payload);

    return {
      token,
      hash,
      timestamp,
      sessionId,
    };
  }

  /**
   * Validate CSRF token against the provided hash
   */
  static async validateToken(
    token: string,
    hash: string,
    timestamp: number,
    sessionId?: string,
  ): Promise<boolean> {
    // Check token expiry
    if (Date.now() - timestamp > CSRF_TOKEN_EXPIRY) {
      return false;
    }

    // Recreate hash for validation
    const payload = `${token}:${timestamp}:${sessionId || ''}`;
    const expectedHash = await simpleHash(payload);

    // Simple comparison
    return hash === expectedHash;
  }

  /**
   * Extract CSRF token from request headers or body
   */
  static extractTokenFromRequest(request: NextRequest): string | null {
    // Check X-CSRF-Token header first
    const headerToken = request.headers.get('X-CSRF-Token');
    if (headerToken) return headerToken;

    // Check x-csrf-token header (lowercase)
    const lowerHeaderToken = request.headers.get('x-csrf-token');
    if (lowerHeaderToken) return lowerHeaderToken;

    return null;
  }

  /**
   * Set CSRF token in response cookies
   */
  static setTokenCookie(
    response: NextResponse,
    tokenData: CSRFTokenData,
  ): void {
    const cookieValue = JSON.stringify({
      hash: tokenData.hash,
      timestamp: tokenData.timestamp,
      sessionId: tokenData.sessionId,
    });

    // Set token data cookie (httpOnly for security)
    response.cookies.set('csrf-token-data', cookieValue, {
      httpOnly: true,
      secure:
        (typeof process !== 'undefined' && process.env?.NODE_ENV) ===
        'production',
      sameSite: 'lax',
      maxAge: CSRF_TOKEN_EXPIRY / 1000,
      path: '/',
    });

    // Set the actual token in a separate cookie for client access
    response.cookies.set('csrf-token', tokenData.token, {
      httpOnly: false, // Client needs to access this
      secure:
        (typeof process !== 'undefined' && process.env?.NODE_ENV) ===
        'production',
      sameSite: 'lax',
      maxAge: CSRF_TOKEN_EXPIRY / 1000,
      path: '/',
    });
  }

  /**
   * Get CSRF token data from request cookies
   */
  static getTokenDataFromCookies(request: NextRequest): CSRFTokenData | null {
    const tokenDataCookie = request.cookies.get('csrf-token-data');
    const tokenCookie = request.cookies.get('csrf-token');

    if (!tokenDataCookie || !tokenCookie) {
      return null;
    }

    try {
      const tokenData = JSON.parse(tokenDataCookie.value);
      return {
        token: tokenCookie.value,
        hash: tokenData.hash,
        timestamp: tokenData.timestamp,
        sessionId: tokenData.sessionId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Validate CSRF token from request
   */
  static async validateRequestToken(request: NextRequest): Promise<boolean> {
    const token = this.extractTokenFromRequest(request);
    const tokenData = this.getTokenDataFromCookies(request);

    if (!token || !tokenData) {
      return false;
    }

    return await this.validateToken(
      token,
      tokenData.hash,
      tokenData.timestamp,
      tokenData.sessionId,
    );
  }

  /**
   * Create error response for CSRF failures
   */
  static createErrorResponse(
    reason: 'missing' | 'invalid' | 'expired',
  ): NextResponse {
    const messages = {
      missing: 'CSRF token missing',
      invalid: 'Invalid CSRF token',
      expired: 'CSRF token expired',
    };

    return NextResponse.json({ error: messages[reason] }, { status: 403 });
  }
}
