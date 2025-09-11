/**
 * Production Security Headers and CORS Configuration
 * Implements comprehensive security headers for production deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { XSSProtection } from './xss-protection';

export interface SecurityConfig {
  // CSP Configuration
  contentSecurityPolicy: {
    directives: Record<string, string[]>;
    reportUri?: string;
    reportOnly?: boolean;
  };

  // CORS Configuration
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };

  // HSTS Configuration
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };

  // Additional Security
  frameOptions: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions: boolean;
  referrerPolicy: string;
  permissionsPolicy: Record<string, string[]>;
}

// Production security configuration
export const productionSecurityConfig: SecurityConfig = {
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Next.js in production
        "'unsafe-eval'", // Required for React DevTools (dev only)
        'https://js.stripe.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://www.google.com',
        'https://www.gstatic.com',
        'https://cdnjs.cloudflare.com',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS and Tailwind
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'https://*.supabase.co',
        'https://*.amazonaws.com',
        'https://*.cloudfront.net',
      ],
      'media-src': [
        "'self'",
        'https://*.supabase.co',
        'https://*.amazonaws.com',
      ],
      'connect-src': [
        "'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://api.stripe.com',
        'https://*.stripe.com',
        'https://api.openai.com',
        'https://api.resend.com',
        'https://vision.googleapis.com',
      ],
      'frame-src': [
        "'self'",
        'https://js.stripe.com',
        'https://hooks.stripe.com',
      ],
      'worker-src': ["'self'", 'blob:'],
      'child-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
    },
    reportUri: '/api/security/csp-report',
    reportOnly: false,
  },

  cors: {
    allowedOrigins: [
      'https://wedsync.com',
      'https://www.wedsync.com',
      'https://app.wedsync.com',
      'https://staging.wedsync.com',
      ...(process.env.NODE_ENV === 'development'
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : []),
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-API-Key',
      'X-Client-Version',
      'X-Request-ID',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',

  permissionsPolicy: {
    accelerometer: [],
    camera: [],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    microphone: [],
    payment: ["'self'", 'https://*.stripe.com'],
    usb: [],
    'web-share': ["'self'"],
  },
};

export class SecurityHeadersManager {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // Apply all security headers to response
  applySecurityHeaders(
    response: NextResponse,
    req?: NextRequest,
  ): NextResponse {
    // Content Security Policy
    this.applyCspHeader(response);

    // CORS headers (if this is a CORS request)
    if (req) {
      this.applyCorsHeaders(response, req);
    }

    // HSTS
    this.applyHstsHeader(response);

    // Frame Options
    response.headers.set('X-Frame-Options', this.config.frameOptions);

    // Content Type Options
    if (this.config.contentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // Referrer Policy
    response.headers.set('Referrer-Policy', this.config.referrerPolicy);

    // Permissions Policy
    this.applyPermissionsPolicyHeader(response);

    // Additional security headers
    this.applyAdditionalSecurityHeaders(response);

    return response;
  }

  private applyCspHeader(response: NextResponse): void {
    const { directives, reportUri, reportOnly } =
      this.config.contentSecurityPolicy;

    let cspValue = '';

    for (const [directive, sources] of Object.entries(directives)) {
      if (sources.length === 0) {
        cspValue += `${directive}; `;
      } else {
        cspValue += `${directive} ${sources.join(' ')}; `;
      }
    }

    if (reportUri) {
      cspValue += `report-uri ${reportUri}; `;
    }

    const headerName = reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    response.headers.set(headerName, cspValue.trim());
  }

  private applyCorsHeaders(response: NextResponse, req: NextRequest): void {
    const origin = req.headers.get('origin');
    const {
      allowedOrigins,
      allowedMethods,
      allowedHeaders,
      exposedHeaders,
      credentials,
      maxAge,
    } = this.config.cors;

    // Check if origin is allowed
    if (
      origin &&
      (allowedOrigins.includes('*') || allowedOrigins.includes(origin))
    ) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.includes('*')) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    // Allow credentials
    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Allow methods
    response.headers.set(
      'Access-Control-Allow-Methods',
      allowedMethods.join(', '),
    );

    // Allow headers
    response.headers.set(
      'Access-Control-Allow-Headers',
      allowedHeaders.join(', '),
    );

    // Expose headers
    if (exposedHeaders.length > 0) {
      response.headers.set(
        'Access-Control-Expose-Headers',
        exposedHeaders.join(', '),
      );
    }

    // Max age for preflight requests
    response.headers.set('Access-Control-Max-Age', maxAge.toString());
  }

  private applyHstsHeader(response: NextResponse): void {
    const { maxAge, includeSubDomains, preload } = this.config.hsts;

    let hstsValue = `max-age=${maxAge}`;

    if (includeSubDomains) {
      hstsValue += '; includeSubDomains';
    }

    if (preload) {
      hstsValue += '; preload';
    }

    response.headers.set('Strict-Transport-Security', hstsValue);
  }

  private applyPermissionsPolicyHeader(response: NextResponse): void {
    const policies = [];

    for (const [feature, allowlist] of Object.entries(
      this.config.permissionsPolicy,
    )) {
      if (allowlist.length === 0) {
        policies.push(`${feature}=()`);
      } else {
        policies.push(`${feature}=(${allowlist.join(' ')})`);
      }
    }

    if (policies.length > 0) {
      response.headers.set('Permissions-Policy', policies.join(', '));
    }
  }

  private applyAdditionalSecurityHeaders(response: NextResponse): void {
    // Enhanced XSS Protection Headers
    const xssHeaders = XSSProtection.getCSPHeaders();
    Object.entries(xssHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // X-XSS-Protection (legacy but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // X-Download-Options (IE8+)
    response.headers.set('X-Download-Options', 'noopen');

    // X-Permitted-Cross-Domain-Policies (Flash/PDF)
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // X-DNS-Prefetch-Control
    response.headers.set('X-DNS-Prefetch-Control', 'off');

    // Server header removal/modification
    response.headers.set('Server', 'WedSync');

    // Remove potentially sensitive headers
    response.headers.delete('X-Powered-By');

    // Cache control for security-sensitive responses
    const url = response.url;
    if (url && (url.includes('/api/auth') || url.includes('/api/admin'))) {
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
  }

  // Handle CORS preflight requests
  handlePreflightRequest(req: NextRequest): NextResponse {
    const response = new NextResponse(null, { status: 204 });
    this.applyCorsHeaders(response, req);
    return response;
  }

  // Validate CSP violations
  async handleCspReport(req: NextRequest): Promise<NextResponse> {
    try {
      const report = await req.json();

      // Log CSP violation
      console.warn('CSP Violation Report:', {
        'document-uri': report['csp-report']?.['document-uri'],
        'violated-directive': report['csp-report']?.['violated-directive'],
        'blocked-uri': report['csp-report']?.['blocked-uri'],
        'effective-directive': report['csp-report']?.['effective-directive'],
        'original-policy': report['csp-report']?.['original-policy'],
        'source-file': report['csp-report']?.['source-file'],
        'line-number': report['csp-report']?.['line-number'],
      });

      // You could also send this to your monitoring system
      // await this.sendToMonitoring(report);

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Failed to process CSP report:', error);
      return new NextResponse('Bad Request', { status: 400 });
    }
  }

  // Update CSP for specific pages/API routes
  updateCspForRoute(
    route: string,
    additionalSources: Record<string, string[]>,
  ): SecurityConfig {
    const updatedConfig = { ...this.config };

    for (const [directive, sources] of Object.entries(additionalSources)) {
      if (updatedConfig.contentSecurityPolicy.directives[directive]) {
        updatedConfig.contentSecurityPolicy.directives[directive] = [
          ...updatedConfig.contentSecurityPolicy.directives[directive],
          ...sources,
        ];
      } else {
        updatedConfig.contentSecurityPolicy.directives[directive] = sources;
      }
    }

    return updatedConfig;
  }

  // Dynamic CSP for different environments
  static getConfigForEnvironment(
    env: 'development' | 'staging' | 'production',
  ): SecurityConfig {
    const baseConfig = { ...productionSecurityConfig };

    if (env === 'development') {
      // Relax CSP for development
      baseConfig.contentSecurityPolicy.directives['script-src'].push(
        "'unsafe-eval'",
      );
      baseConfig.contentSecurityPolicy.directives['connect-src'].push(
        'ws://localhost:*',
      );
      baseConfig.contentSecurityPolicy.reportOnly = true;

      // Add localhost to CORS origins
      baseConfig.cors.allowedOrigins.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      );
    } else if (env === 'staging') {
      // Add staging-specific origins
      baseConfig.cors.allowedOrigins.push('https://staging.wedsync.com');
      baseConfig.contentSecurityPolicy.directives['connect-src'].push(
        'https://staging-api.wedsync.com',
      );
    }

    return baseConfig;
  }
}

// Create security headers manager instance
export const securityHeaders = new SecurityHeadersManager(
  SecurityHeadersManager.getConfigForEnvironment(
    (process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_ENV === 'staging'
        ? 'staging'
        : 'production'
      : 'development') as 'development' | 'staging' | 'production',
  ),
);

// Middleware helper for applying security headers
export function withSecurityHeaders(
  response: NextResponse,
  req?: NextRequest,
): NextResponse {
  return securityHeaders.applySecurityHeaders(response, req);
}

// CORS preflight handler
export function handleCorsPreflightRequest(req: NextRequest): NextResponse {
  return securityHeaders.handlePreflightRequest(req);
}

// CSP report handler
export function handleCspReport(req: NextRequest): Promise<NextResponse> {
  return securityHeaders.handleCspReport(req);
}
