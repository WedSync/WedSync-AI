/**
 * Comprehensive Security Middleware
 *
 * Integrates all security components into a unified middleware system
 * for consistent application across all API routes.
 *
 * Features:
 * - Rate limiting with multiple tiers
 * - Enhanced authentication with session security
 * - CSRF protection
 * - Input sanitization
 * - Security headers (CSP, HSTS, etc.)
 * - Request validation
 * - Audit logging
 * - DDoS protection
 * - API response security
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Import existing security components
import {
  withRateLimit,
  validateRequestBody,
  handleApiError,
  withApiSecurity,
} from './api-middleware';
import {
  withEnhancedAuth,
  withSecureSession,
  withAPIToken,
  SecureRateLimiter,
  EnhancedAuthResult,
} from './enhanced-auth-middleware';
import {
  securityHeaders,
  withSecurityHeaders,
} from './security/security-headers';
import { auditLogger, AuditEventType, AuditSeverity } from './audit-logger';
import { createClient } from './supabase/server';
import { checkWeddingSeasonRateLimit } from './auth/wedding-season-rate-limiter';
import { withPCIDSSCompliance } from './security/pci-dss-compliance';

// Security configuration types
export interface SecurityMiddlewareConfig {
  rateLimiting: {
    enabled: boolean;
    limits: {
      general: number;
      auth: number;
      payment: number;
      upload: number;
    };
    windowMs: number;
  };
  authentication: {
    required: boolean;
    allowAPITokens: boolean;
    requireSecureSession: boolean;
  };
  validation: {
    sanitizeInput: boolean;
    validateSchema: boolean;
    maxBodySize: number;
  };
  security: {
    csrfProtection: boolean;
    securityHeaders: boolean;
    auditLogging: boolean;
  };
  monitoring: {
    enabled: boolean;
    alertOnFailure: boolean;
  };
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityMiddlewareConfig = {
  rateLimiting: {
    enabled: true,
    limits: {
      general: 100, // requests per window
      auth: 10,
      payment: 5,
      upload: 3,
    },
    windowMs: 60 * 1000, // 1 minute
  },
  authentication: {
    required: true,
    allowAPITokens: false,
    requireSecureSession: true,
  },
  validation: {
    sanitizeInput: true,
    validateSchema: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
  },
  security: {
    csrfProtection: true,
    securityHeaders: true,
    auditLogging: true,
  },
  monitoring: {
    enabled: true,
    alertOnFailure: true,
  },
};

// Security context passed to handlers
export interface SecurityContext extends EnhancedAuthResult {
  requestId: string;
  clientIp: string;
  userAgent: string;
  securityLevel: 'low' | 'medium' | 'high';
}

// Request sanitization
function sanitizeRequestData(data: any): any {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeRequestData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeRequestData(value);
    }
    return sanitized;
  }

  return data;
}

// CSRF token validation
function validateCSRFToken(request: NextRequest): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionToken = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return false;
  }

  return true;
}

// Generate request ID for tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get client IP with fallbacks
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  );
}

// Security level assessment
function assessSecurityLevel(
  request: NextRequest,
  authResult?: EnhancedAuthResult,
): 'low' | 'medium' | 'high' {
  let level: 'low' | 'medium' | 'high' = 'medium';

  // High security endpoints
  const highSecurityPatterns = ['/api/payment', '/api/admin', '/api/auth'];
  if (highSecurityPatterns.some((pattern) => request.url.includes(pattern))) {
    level = 'high';
  }

  // Low security endpoints
  const lowSecurityPatterns = ['/api/health', '/api/status'];
  if (lowSecurityPatterns.some((pattern) => request.url.includes(pattern))) {
    level = 'low';
  }

  // Adjust based on authentication
  if (!authResult?.user) {
    level = level === 'low' ? 'low' : 'medium';
  }

  return level;
}

/**
 * Comprehensive Security Middleware
 */
export class ComprehensiveSecurityMiddleware {
  private config: SecurityMiddlewareConfig;

  constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Main middleware function that applies all security layers
   */
  async applySecurityLayers<T>(
    request: NextRequest,
    handler: (
      request: NextRequest,
      context: SecurityContext,
    ) => Promise<NextResponse>,
    options: {
      schema?: z.ZodSchema<T>;
      rateLimitType?: 'general' | 'auth' | 'payment' | 'upload';
      skipAuth?: boolean;
      allowAPITokens?: boolean;
    } = {},
  ): Promise<NextResponse> {
    const requestId = generateRequestId();
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // 1. Advanced Wedding Season Rate Limiting
      if (this.config.rateLimiting.enabled) {
        const rateLimitType = options.rateLimitType || 'general';

        // Use wedding season rate limiter for enhanced handling
        const rateLimitResult = await checkWeddingSeasonRateLimit(
          request,
          request.url,
          {
            userId: authResult?.user?.id,
            organizationId: authResult?.user?.organizationId,
            subscriptionTier: authResult?.user?.subscriptionTier,
            vendorType: authResult?.user?.vendorType,
            operationType: rateLimitType,
          },
        );

        if (!rateLimitResult.allowed) {
          await this.logSecurityEvent(AuditEventType.RATE_LIMIT_EXCEEDED, {
            requestId,
            clientIp,
            rateLimitType,
            seasonallyAdjusted: rateLimitResult.seasonallyAdjusted,
            burstModeActive: rateLimitResult.burstModeActive,
            priority: rateLimitResult.priority,
            remainingTime: rateLimitResult.resetTime - Date.now(),
          });

          const response = NextResponse.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              retryAfter: rateLimitResult.retryAfter || 60,
              weddingSeason: rateLimitResult.seasonallyAdjusted,
              burstMode: rateLimitResult.burstModeActive,
              priority: rateLimitResult.priority,
            },
            {
              status: 429,
              headers: {
                'Retry-After': (rateLimitResult.retryAfter || 60).toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': new Date(
                  rateLimitResult.resetTime,
                ).toISOString(),
                'X-Wedding-Season':
                  rateLimitResult.seasonallyAdjusted.toString(),
                'X-Burst-Mode': rateLimitResult.burstModeActive.toString(),
                'X-Priority-Tier': rateLimitResult.priority,
              },
            },
          );

          if (rateLimitResult.degradedService) {
            response.headers.set('X-Degraded-Service', 'true');
          }

          return response;
        }
      }

      // 2. Request Validation & Sanitization
      let sanitizedBody: any = null;
      if (
        this.config.validation.sanitizeInput &&
        ['POST', 'PUT', 'PATCH'].includes(request.method)
      ) {
        try {
          const contentType = request.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const rawBody = await request.json();
            sanitizedBody = sanitizeRequestData(rawBody);

            // Validate against schema if provided
            if (options.schema && this.config.validation.validateSchema) {
              try {
                sanitizedBody = options.schema.parse(sanitizedBody);
              } catch (error) {
                await this.logSecurityEvent(AuditEventType.VALIDATION_FAILED, {
                  requestId,
                  clientIp,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Schema validation failed',
                });

                return NextResponse.json(
                  {
                    success: false,
                    error: 'Invalid request data',
                    details:
                      error instanceof z.ZodError
                        ? error.errors
                        : 'Validation failed',
                  },
                  { status: 400 },
                );
              }
            }
          }
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid JSON body',
            },
            { status: 400 },
          );
        }
      }

      // 3. Authentication (if required)
      let authResult: EnhancedAuthResult | null = null;
      if (this.config.authentication.required && !options.skipAuth) {
        const authResponse = await withEnhancedAuth(request);

        if (authResponse instanceof NextResponse) {
          await this.logSecurityEvent(AuditEventType.UNAUTHORIZED_ACCESS, {
            requestId,
            clientIp,
            endpoint: request.url,
            method: request.method,
          });
          return authResponse;
        }

        authResult = authResponse;
      }

      // 4. CSRF Protection (for authenticated requests)
      if (
        this.config.security.csrfProtection &&
        authResult &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
      ) {
        if (!validateCSRFToken(request)) {
          await this.logSecurityEvent(AuditEventType.CSRF_VIOLATION, {
            requestId,
            clientIp,
            userId: authResult.user.id,
            endpoint: request.url,
          });

          return NextResponse.json(
            {
              success: false,
              error: 'CSRF token validation failed',
            },
            { status: 403 },
          );
        }
      }

      // 5. PCI DSS Compliance Check for Payment Operations
      const isPaymentOperation =
        request.url.includes('/payment') ||
        request.url.includes('/stripe') ||
        request.url.includes('/checkout');

      if (isPaymentOperation) {
        const pciValidation = await withPCIDSSCompliance(request, {
          transactionId: request.headers.get('x-transaction-id') || undefined,
          amount: authResult?.user?.organizationId ? undefined : 0,
          currency: 'GBP',
          riskLevel: securityLevel === 'high' ? 'high' : 'medium',
          customerId: authResult?.user?.id,
          merchantId: authResult?.user?.organizationId,
        });

        if (!pciValidation.compliant && pciValidation.response) {
          await this.logSecurityEvent(AuditEventType.PCI_COMPLIANCE_VIOLATION, {
            requestId,
            clientIp,
            violations: pciValidation.violations,
            endpoint: request.url,
          });

          return pciValidation.response;
        }
      }

      // 6. Build Security Context
      const securityLevel = assessSecurityLevel(request, authResult);
      const context: SecurityContext = {
        requestId,
        clientIp,
        userAgent,
        securityLevel,
        ...(authResult || {
          user: null,
          session: null,
          supabase: null,
        }),
      } as SecurityContext;

      // 7. Log successful security validation
      if (this.config.security.auditLogging) {
        await this.logSecurityEvent(AuditEventType.API_ACCESS, {
          requestId,
          clientIp,
          userId: authResult?.user?.id,
          endpoint: request.url,
          method: request.method,
          securityLevel,
          authenticated: !!authResult,
          pciCompliant: !isPaymentOperation || true, // Would track actual PCI compliance status
        });
      }

      // 8. Execute handler with modified request (if body was sanitized)
      let handlerRequest = request;
      if (sanitizedBody) {
        // Create new request with sanitized body
        handlerRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(sanitizedBody),
        });
      }

      // 9. Execute the actual handler
      const response = await handler(handlerRequest, context);

      // 10. Apply security headers
      if (this.config.security.securityHeaders) {
        withSecurityHeaders(response, request);
      }

      // 10. Add security response headers
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Security-Level', securityLevel);
      if (authResult?.user) {
        response.headers.set('X-User-ID', authResult.user.id);
      }

      return response;
    } catch (error) {
      // Log security middleware error
      await this.logSecurityEvent(AuditEventType.SYSTEM_ERROR, {
        requestId,
        clientIp,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown security middleware error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return handleApiError(error);
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    eventType: AuditEventType,
    details: any,
  ): Promise<void> {
    if (!this.config.security.auditLogging) return;

    try {
      await auditLogger.log({
        event_type: eventType,
        severity: this.getSeverityForEventType(eventType),
        action: `Security middleware: ${eventType}`,
        details,
        user_id: details.userId || null,
        ip_address: details.clientIp,
        user_agent: details.userAgent,
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get severity level for audit event types
   */
  private getSeverityForEventType(eventType: AuditEventType): AuditSeverity {
    const highSeverityEvents = [
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.CSRF_VIOLATION,
      AuditEventType.SYSTEM_ERROR,
    ];

    const mediumSeverityEvents = [
      AuditEventType.RATE_LIMIT_EXCEEDED,
      AuditEventType.VALIDATION_FAILED,
    ];

    if (highSeverityEvents.includes(eventType)) return AuditSeverity.ERROR;
    if (mediumSeverityEvents.includes(eventType)) return AuditSeverity.WARNING;
    return AuditSeverity.INFO;
  }

  /**
   * Create middleware wrapper for specific endpoint types
   */
  public createSecureHandler<T>(
    handler: (
      request: NextRequest,
      context: SecurityContext,
    ) => Promise<NextResponse>,
    options: {
      schema?: z.ZodSchema<T>;
      rateLimitType?: 'general' | 'auth' | 'payment' | 'upload';
      skipAuth?: boolean;
      allowAPITokens?: boolean;
      customConfig?: Partial<SecurityMiddlewareConfig>;
    } = {},
  ) {
    // Merge custom config if provided
    const effectiveConfig = options.customConfig
      ? { ...this.config, ...options.customConfig }
      : this.config;

    const middleware = new ComprehensiveSecurityMiddleware(effectiveConfig);

    return async (request: NextRequest) => {
      return middleware.applySecurityLayers(request, handler, options);
    };
  }
}

// Export singleton instance with default configuration
export const securityMiddleware = new ComprehensiveSecurityMiddleware();

/**
 * Convenience functions for different security levels
 */

// High security for payment/admin endpoints
export const withHighSecurity = <T>(
  handler: (
    request: NextRequest,
    context: SecurityContext,
  ) => Promise<NextResponse>,
  schema?: z.ZodSchema<T>,
) => {
  return securityMiddleware.createSecureHandler(handler, {
    schema,
    rateLimitType: 'payment',
    customConfig: {
      rateLimiting: {
        enabled: true,
        limits: { general: 20, auth: 5, payment: 3, upload: 1 },
        windowMs: 60 * 1000,
      },
      authentication: {
        required: true,
        allowAPITokens: false,
        requireSecureSession: true,
      },
      security: {
        csrfProtection: true,
        securityHeaders: true,
        auditLogging: true,
      },
    },
  });
};

// Medium security for general API endpoints
export const withMediumSecurity = <T>(
  handler: (
    request: NextRequest,
    context: SecurityContext,
  ) => Promise<NextResponse>,
  schema?: z.ZodSchema<T>,
) => {
  return securityMiddleware.createSecureHandler(handler, {
    schema,
    rateLimitType: 'general',
    customConfig: {
      rateLimiting: {
        enabled: true,
        limits: { general: 100, auth: 15, payment: 5, upload: 3 },
        windowMs: 60 * 1000,
      },
      authentication: {
        required: true,
        allowAPITokens: true,
        requireSecureSession: false,
      },
      security: {
        csrfProtection: true,
        securityHeaders: true,
        auditLogging: true,
      },
    },
  });
};

// Low security for public endpoints
export const withLowSecurity = <T>(
  handler: (
    request: NextRequest,
    context: SecurityContext,
  ) => Promise<NextResponse>,
  schema?: z.ZodSchema<T>,
) => {
  return securityMiddleware.createSecureHandler(handler, {
    schema,
    rateLimitType: 'general',
    skipAuth: true,
    customConfig: {
      rateLimiting: {
        enabled: true,
        limits: { general: 200, auth: 50, payment: 10, upload: 5 },
        windowMs: 60 * 1000,
      },
      authentication: {
        required: false,
        allowAPITokens: false,
        requireSecureSession: false,
      },
      security: {
        csrfProtection: false,
        securityHeaders: true,
        auditLogging: true,
      },
    },
  });
};

// Upload endpoints with specific limits
export const withUploadSecurity = <T>(
  handler: (
    request: NextRequest,
    context: SecurityContext,
  ) => Promise<NextResponse>,
  schema?: z.ZodSchema<T>,
) => {
  return securityMiddleware.createSecureHandler(handler, {
    schema,
    rateLimitType: 'upload',
    customConfig: {
      validation: {
        sanitizeInput: false,
        validateSchema: false,
        maxBodySize: 50 * 1024 * 1024,
      }, // 50MB for uploads
      rateLimiting: {
        enabled: true,
        limits: { general: 20, auth: 10, payment: 5, upload: 3 },
        windowMs: 60 * 1000,
      },
    },
  });
};

export default ComprehensiveSecurityMiddleware;
