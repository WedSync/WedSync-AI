import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET =
  (typeof process !== 'undefined' && process.env?.CSRF_SECRET) ||
  'fallback-secret-for-dev-only-change-in-production';
const CSRF_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Edge-compatible crypto functions
const randomBytes = (length: number): Buffer => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes);
  }
  // Fallback for non-Edge environments
  const cryptoModule = require('crypto');
  return cryptoModule.randomBytes(length);
};

const createHmac = (algorithm: string, key: string) => {
  // Use Web Crypto API for Edge Runtime
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return {
      update: (data: string) => ({
        digest: async (format: string) => {
          const encoder = new TextEncoder();
          const keyData = encoder.encode(key);
          const dataBytes = encoder.encode(data);

          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign'],
          );

          const signature = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            dataBytes,
          );
          return Buffer.from(signature).toString(format);
        },
      }),
    };
  }
  // Fallback for Node.js
  const cryptoModule = require('crypto');
  return cryptoModule.createHmac(algorithm, key);
};

const timingSafeEqual = (a: Buffer, b: Buffer): boolean => {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
};

export interface CSRFTokenData {
  token: string;
  hash: string;
  timestamp: number;
  sessionId?: string;
}

export class CSRFTokenService {
  /**
   * Generate a cryptographically secure CSRF token
   */
  static generateToken(sessionId?: string): CSRFTokenData {
    const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
    const timestamp = Date.now();
    const payload = `${token}:${timestamp}:${sessionId || ''}`;
    const hash = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');

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
  static validateToken(
    token: string,
    hash: string,
    timestamp: number,
    sessionId?: string,
  ): boolean {
    // Check token expiry
    if (Date.now() - timestamp > CSRF_TOKEN_EXPIRY) {
      return false;
    }

    // Recreate hash for validation
    const payload = `${token}:${timestamp}:${sessionId || ''}`;
    const expectedHash = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');

    // Timing-safe comparison
    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
    } catch {
      return false;
    }
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CSRF_TOKEN_EXPIRY / 1000,
      path: '/',
    });

    // Set the actual token in a separate cookie for client access
    response.cookies.set('csrf-token', tokenData.token, {
      httpOnly: false, // Client needs to access this
      secure: process.env.NODE_ENV === 'production',
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

    if (!tokenDataCookie?.value || !tokenCookie?.value) {
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
  static validateRequestToken(request: NextRequest): boolean {
    const submittedToken = this.extractTokenFromRequest(request);
    const tokenData = this.getTokenDataFromCookies(request);

    if (!submittedToken || !tokenData) {
      return false;
    }

    return this.validateToken(
      submittedToken,
      tokenData.hash,
      tokenData.timestamp,
      tokenData.sessionId,
    );
  }

  /**
   * Create CSRF error response
   */
  static createErrorResponse(
    errorType: 'missing' | 'invalid' | 'expired',
  ): NextResponse {
    const errorMessages = {
      missing: 'CSRF token missing',
      invalid: 'Invalid CSRF token',
      expired: 'CSRF token expired',
    };

    return new NextResponse(
      JSON.stringify({
        error: errorMessages[errorType],
        code: `CSRF_TOKEN_${errorType.toUpperCase()}`,
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  }
}
