import { NextRequest, NextResponse } from 'next/server';
import { CSRFTokenService } from '@/lib/csrf-token-edge';

export interface CSRFValidationOptions {
  enforceOrigin?: boolean;
  enforceReferer?: boolean;
  allowedOrigins?: string[];
  enableDoubleSubmit?: boolean;
  requireTokenRotation?: boolean;
}

export interface CSRFValidationResult {
  valid: boolean;
  reason?: string;
  shouldRotateToken?: boolean;
  newToken?: string;
}

/**
 * Enhanced CSRF Protection Service
 * Adds additional validation layers beyond basic token validation
 */
export class EnhancedCSRFProtection {
  private static readonly SENSITIVE_OPERATIONS = [
    'password-change',
    'delete-account',
    'payment-process',
    'mfa-disable',
    'api-key-create',
    'admin-action',
  ];

  /**
   * Comprehensive CSRF validation with multiple security layers
   */
  static async validateRequest(
    request: NextRequest,
    options: CSRFValidationOptions = {},
  ): Promise<CSRFValidationResult> {
    const {
      enforceOrigin = true,
      enforceReferer = true,
      allowedOrigins = [],
      enableDoubleSubmit = true,
      requireTokenRotation = false,
    } = options;

    // 1. Basic CSRF token validation (existing)
    const basicValidation =
      await CSRFTokenService.validateRequestToken(request);
    if (!basicValidation) {
      return {
        valid: false,
        reason: 'Invalid or missing CSRF token',
      };
    }

    // 2. Origin header validation
    if (enforceOrigin) {
      const originValidation = this.validateOriginHeader(
        request,
        allowedOrigins,
      );
      if (!originValidation.valid) {
        return {
          valid: false,
          reason: originValidation.reason,
        };
      }
    }

    // 3. Referer header validation
    if (enforceReferer) {
      const refererValidation = this.validateRefererHeader(
        request,
        allowedOrigins,
      );
      if (!refererValidation.valid) {
        return {
          valid: false,
          reason: refererValidation.reason,
        };
      }
    }

    // 4. Double submit cookie validation
    if (enableDoubleSubmit) {
      const doubleSubmitValidation = this.validateDoubleSubmitCookie(request);
      if (!doubleSubmitValidation.valid) {
        return {
          valid: false,
          reason: doubleSubmitValidation.reason,
        };
      }
    }

    // 5. Check if token rotation is required
    const shouldRotateToken =
      requireTokenRotation ||
      this.isSensitiveOperation(request) ||
      this.isTokenNearExpiry(request);

    let newToken;
    if (shouldRotateToken) {
      const tokenData = await CSRFTokenService.generateToken();
      newToken = tokenData.token;
    }

    return {
      valid: true,
      shouldRotateToken,
      newToken,
    };
  }

  /**
   * Validate Origin header against allowed origins
   */
  private static validateOriginHeader(
    request: NextRequest,
    allowedOrigins: string[],
  ): { valid: boolean; reason?: string } {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (!origin) {
      return {
        valid: false,
        reason: 'Missing Origin header',
      };
    }

    // Default allowed origins if none specified
    const defaultAllowedOrigins = [
      `https://${host}`,
      `http://${host}`, // For development
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean) as string[];

    const allowedOriginsList =
      allowedOrigins.length > 0 ? allowedOrigins : defaultAllowedOrigins;

    if (!allowedOriginsList.includes(origin)) {
      return {
        valid: false,
        reason: `Origin ${origin} not allowed`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate Referer header
   */
  private static validateRefererHeader(
    request: NextRequest,
    allowedOrigins: string[],
  ): { valid: boolean; reason?: string } {
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    if (!referer) {
      // Some browsers/clients may not send referer, but we'll allow it
      // in most cases except for sensitive operations
      if (this.isSensitiveOperation(request)) {
        return {
          valid: false,
          reason: 'Referer header required for sensitive operations',
        };
      }
      return { valid: true };
    }

    try {
      const refererUrl = new URL(referer);
      const allowedHosts =
        allowedOrigins.length > 0
          ? allowedOrigins.map((origin) => new URL(origin).hostname)
          : [
              host,
              new URL(process.env.NEXT_PUBLIC_APP_URL || '').hostname,
            ].filter(Boolean);

      if (!allowedHosts.includes(refererUrl.hostname)) {
        return {
          valid: false,
          reason: `Referer ${refererUrl.hostname} not allowed`,
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        reason: 'Invalid referer URL format',
      };
    }
  }

  /**
   * Validate double submit cookie pattern
   * Compares CSRF token in cookie vs header/body
   */
  private static validateDoubleSubmitCookie(request: NextRequest): {
    valid: boolean;
    reason?: string;
  } {
    const headerToken =
      request.headers.get('X-CSRF-Token') ||
      request.headers.get('x-csrf-token');
    const doubleSubmitHeader = request.headers.get('X-CSRF-Double-Submit');

    if (!headerToken) {
      return {
        valid: false,
        reason: 'Missing CSRF token in headers',
      };
    }

    if (!doubleSubmitHeader) {
      // Allow if double submit header is not present (backwards compatibility)
      return { valid: true };
    }

    try {
      // Decode the double submit token and compare
      const decodedDoubleSubmit = atob(doubleSubmitHeader);
      if (decodedDoubleSubmit !== headerToken) {
        return {
          valid: false,
          reason: 'Double submit cookie mismatch',
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        reason: 'Invalid double submit cookie format',
      };
    }
  }

  /**
   * Check if the request is for a sensitive operation requiring enhanced protection
   */
  private static isSensitiveOperation(request: NextRequest): boolean {
    const path = request.nextUrl.pathname;
    const url = request.url;

    return this.SENSITIVE_OPERATIONS.some(
      (operation) => path.includes(operation) || url.includes(operation),
    );
  }

  /**
   * Check if the current CSRF token is near expiry and should be rotated
   */
  private static isTokenNearExpiry(request: NextRequest): boolean {
    const tokenData = CSRFTokenService.getTokenDataFromCookies(request);

    if (!tokenData) {
      return false;
    }

    // Rotate if token has less than 5 minutes remaining
    const ROTATION_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const timeRemaining = tokenData.timestamp + 30 * 60 * 1000 - Date.now();

    return timeRemaining < ROTATION_THRESHOLD;
  }

  /**
   * Create enhanced CSRF error response with user guidance
   */
  static createEnhancedErrorResponse(
    reason: string,
    includeRetryInstructions = true,
  ): NextResponse {
    const userFriendlyMessages: Record<string, string> = {
      'Invalid or missing CSRF token':
        'Security token expired. Please refresh the page and try again.',
      'Missing Origin header':
        'Request blocked for security. Please use the main website interface.',
      'Origin not allowed':
        'Request from unauthorized source. Please access from the main website.',
      'Referer header required for sensitive operations':
        'This action requires enhanced security verification.',
      'Double submit cookie mismatch':
        'Security validation failed. Please refresh and try again.',
    };

    const userMessage =
      userFriendlyMessages[reason] ||
      'Security validation failed. Please refresh the page and try again.';

    const errorResponse = {
      error: userMessage,
      code: 'CSRF_VALIDATION_FAILED',
      technical_reason: reason,
      ...(includeRetryInstructions && {
        instructions: [
          'Refresh the page to get a new security token',
          "Ensure you're accessing from the main website",
          'Clear browser cache if the problem persists',
          'Contact support if this continues to happen',
        ],
      }),
    };

    return new NextResponse(JSON.stringify(errorResponse), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  /**
   * Middleware helper for applying enhanced CSRF protection
   */
  static async withEnhancedCSRFProtection(
    request: NextRequest,
    options: CSRFValidationOptions = {},
  ): Promise<NextResponse | null> {
    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return null;
    }

    const validationResult = await this.validateRequest(request, options);

    if (!validationResult.valid) {
      return this.createEnhancedErrorResponse(
        validationResult.reason || 'Unknown validation error',
      );
    }

    // If token rotation is needed, set the new token in response
    if (validationResult.shouldRotateToken && validationResult.newToken) {
      const response = NextResponse.next();
      const tokenData = await CSRFTokenService.generateToken();
      CSRFTokenService.setTokenCookie(response, tokenData);

      // Add rotation header to inform client
      response.headers.set('X-CSRF-Token-Rotated', 'true');
      response.headers.set('X-CSRF-New-Token', validationResult.newToken);

      return response;
    }

    return null; // Allow request to continue
  }
}

/**
 * CSRF middleware configuration for different route types
 */
export const CSRFConfig = {
  // Standard protection for most authenticated routes
  standard: {
    enforceOrigin: true,
    enforceReferer: false,
    enableDoubleSubmit: true,
    requireTokenRotation: false,
  },

  // Enhanced protection for sensitive operations
  sensitive: {
    enforceOrigin: true,
    enforceReferer: true,
    enableDoubleSubmit: true,
    requireTokenRotation: true,
  },

  // Relaxed protection for webhooks and external integrations
  relaxed: {
    enforceOrigin: false,
    enforceReferer: false,
    enableDoubleSubmit: false,
    requireTokenRotation: false,
  },
};

/**
 * Route-based CSRF configuration helper
 */
export function getCSRFConfigForRoute(path: string): CSRFValidationOptions {
  // Sensitive operations require enhanced protection
  if (
    EnhancedCSRFProtection['SENSITIVE_OPERATIONS'].some((op) =>
      path.includes(op),
    )
  ) {
    return CSRFConfig.sensitive;
  }

  // Webhooks and external integrations use relaxed protection
  if (path.includes('/webhook') || path.includes('/callback')) {
    return CSRFConfig.relaxed;
  }

  // Default to standard protection
  return CSRFConfig.standard;
}
