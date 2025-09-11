/**
 * Viral Security Middleware - WS-141 Round 2
 * Centralized security middleware for all viral optimization endpoints
 * INTEGRATION: Works with existing rate limiting and authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// SENIOR CODE REVIEWER FIX: Use relative imports and correct file for authOptions
import { authOptions } from '../lib/auth/config';
import {
  ViralSecurityService,
  type FraudDetection,
  type DoSProtection,
} from '../lib/services/viral-security-service';

// Security configuration for different endpoint types
interface SecurityConfig {
  enableFraudDetection: boolean;
  enableDoSProtection: boolean;
  enableInputValidation: boolean;
  enablePrivacyProtection: boolean;
  fraudThreshold: number;
  dosThreshold: number;
  blockOnFraud: boolean;
  logAllRequests: boolean;
}

// Default security configurations by endpoint pattern
const SECURITY_CONFIGS: Record<string, SecurityConfig> = {
  '/api/viral/rewards': {
    enableFraudDetection: true,
    enableDoSProtection: true,
    enableInputValidation: true,
    enablePrivacyProtection: true,
    fraudThreshold: 0.7,
    dosThreshold: 50,
    blockOnFraud: true,
    logAllRequests: true,
  },
  '/api/viral/ab-testing': {
    enableFraudDetection: false,
    enableDoSProtection: true,
    enableInputValidation: true,
    enablePrivacyProtection: false,
    fraudThreshold: 0.8,
    dosThreshold: 100,
    blockOnFraud: false,
    logAllRequests: false,
  },
  '/api/viral/super-connectors': {
    enableFraudDetection: true,
    enableDoSProtection: true,
    enableInputValidation: true,
    enablePrivacyProtection: true,
    fraudThreshold: 0.6,
    dosThreshold: 30,
    blockOnFraud: false,
    logAllRequests: true,
  },
  '/api/viral/analytics': {
    enableFraudDetection: false,
    enableDoSProtection: true,
    enableInputValidation: true,
    enablePrivacyProtection: true,
    fraudThreshold: 0.9,
    dosThreshold: 25,
    blockOnFraud: false,
    logAllRequests: true,
  },
};

// Default configuration for unspecified endpoints
const DEFAULT_CONFIG: SecurityConfig = {
  enableFraudDetection: true,
  enableDoSProtection: true,
  enableInputValidation: true,
  enablePrivacyProtection: true,
  fraudThreshold: 0.7,
  dosThreshold: 50,
  blockOnFraud: true,
  logAllRequests: false,
};

/**
 * Security middleware result
 */
export interface SecurityMiddlewareResult {
  allowed: boolean;
  response?: NextResponse;
  securityHeaders: Record<string, string>;
  warnings: string[];
  blocked_reason?: string;
  fraud_detection?: FraudDetection;
  dos_protection?: DoSProtection;
}

/**
 * Main security middleware function
 * Call this at the beginning of viral API route handlers
 */
export async function viralSecurityMiddleware(
  request: NextRequest,
  endpoint?: string,
): Promise<SecurityMiddlewareResult> {
  const startTime = Date.now();
  const pathname = endpoint || new URL(request.url).pathname;

  // Get security configuration for this endpoint
  const config = getSecurityConfig(pathname);

  // Initialize result
  const result: SecurityMiddlewareResult = {
    allowed: true,
    securityHeaders: {
      'X-Security-Version': '2.0',
      'X-Security-Scan-Time': '',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
    warnings: [],
  };

  try {
    const ipAddress = extractClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Get user session if available
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // 1. DoS Protection (high priority - check first)
    if (config.enableDoSProtection) {
      const dosResult = await ViralSecurityService.detectDoS(
        ipAddress,
        pathname,
        userAgent,
      );

      result.dos_protection = dosResult;

      if (dosResult.is_dos_attack) {
        result.allowed = false;
        result.blocked_reason = 'DoS attack detected';
        result.securityHeaders['X-DoS-Protection'] = 'blocked';
        result.securityHeaders['Retry-After'] = (
          dosResult.block_duration_minutes! * 60
        ).toString();

        result.response = NextResponse.json(
          {
            error: 'SECURITY_VIOLATION',
            message: 'Request blocked due to suspicious activity',
            code: 'DOS_PROTECTION',
            retry_after: dosResult.block_duration_minutes! * 60,
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: result.securityHeaders,
          },
        );
        return result;
      }

      if (dosResult.source_analysis.ip_reputation !== 'good') {
        result.warnings.push('Source IP flagged with suspicious reputation');
        result.securityHeaders['X-Source-Reputation'] =
          dosResult.source_analysis.ip_reputation;
      }
    }

    // 2. Input Validation (for POST/PUT requests)
    if (
      config.enableInputValidation &&
      ['POST', 'PUT', 'PATCH'].includes(request.method)
    ) {
      try {
        // Clone request to read body without consuming original stream
        const requestClone = request.clone();
        const body = await requestClone.json().catch(() => ({}));

        if (Object.keys(body).length > 0) {
          const validationResult = ViralSecurityService.validateSecureInput(
            body,
            {},
          );

          if (!validationResult.is_valid) {
            const highSeverityIssues = validationResult.security_issues.filter(
              (issue) => issue.severity === 'high',
            );

            if (highSeverityIssues.length > 0) {
              result.allowed = false;
              result.blocked_reason =
                'Input validation failed - security threat detected';
              result.securityHeaders['X-Input-Validation'] = 'blocked';

              result.response = NextResponse.json(
                {
                  error: 'SECURITY_VIOLATION',
                  message: 'Request blocked due to invalid input',
                  code: 'INPUT_VALIDATION_FAILED',
                  details: highSeverityIssues.map((issue) => ({
                    field: issue.field,
                    type: issue.type,
                    severity: issue.severity,
                  })),
                  timestamp: new Date().toISOString(),
                },
                {
                  status: 400,
                  headers: result.securityHeaders,
                },
              );
              return result;
            }

            // Add warnings for medium/low severity issues
            const warnings = validationResult.security_issues.map(
              (issue) =>
                `Input validation warning: ${issue.type} in ${issue.field}`,
            );
            result.warnings.push(...warnings);
            result.securityHeaders['X-Input-Warnings'] =
              warnings.length.toString();
          }
        }
      } catch (error) {
        // If we can't parse the body, continue but log warning
        result.warnings.push(
          'Unable to validate request body - potential parsing issue',
        );
      }
    }

    // 3. Fraud Detection (for authenticated users)
    if (config.enableFraudDetection && userId) {
      // Extract request data for fraud analysis
      const requestData = {
        method: request.method,
        url: request.url,
        // SENIOR CODE REVIEWER FIX: Convert Headers to plain object using forEach
        headers: (() => {
          const headerObj: Record<string, string> = {};
          request.headers.forEach((value, key) => {
            headerObj[key] = value;
          });
          return headerObj;
        })(),
        timestamp: Date.now(),
      };

      const fraudResult = await ViralSecurityService.detectFraud(
        userId,
        pathname,
        requestData,
        ipAddress,
        userAgent,
      );

      result.fraud_detection = fraudResult;

      if (fraudResult.is_fraudulent && config.blockOnFraud) {
        result.allowed = false;
        result.blocked_reason = 'Fraudulent activity detected';
        result.securityHeaders['X-Fraud-Detection'] = 'blocked';

        result.response = NextResponse.json(
          {
            error: 'SECURITY_VIOLATION',
            message: 'Request blocked due to suspicious activity',
            code: 'FRAUD_DETECTED',
            timestamp: new Date().toISOString(),
          },
          {
            status: 403,
            headers: result.securityHeaders,
          },
        );
        return result;
      }

      if (fraudResult.requires_manual_review) {
        result.warnings.push('Account flagged for manual security review');
        result.securityHeaders['X-Security-Review'] = 'required';
      }

      result.securityHeaders['X-Fraud-Score'] =
        fraudResult.confidence_score.toFixed(3);
    }

    // 4. Privacy Protection (log all requests if enabled)
    if (config.logAllRequests) {
      // This would typically log to a security audit system
      const auditData = {
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        user_id: userId,
        endpoint: pathname,
        method: request.method,
        security_warnings: result.warnings,
      };

      // Apply privacy protection to audit data
      if (config.enablePrivacyProtection) {
        const privacyResult = ViralSecurityService.protectPrivacy(
          auditData,
          'logging',
        );
        // Log the redacted version (implementation would send to audit system)
        console.log('Security audit:', privacyResult.redacted_data);
      }
    }

    // Add final security headers
    const processingTime = Date.now() - startTime;
    result.securityHeaders['X-Security-Scan-Time'] = `${processingTime}ms`;
    result.securityHeaders['X-Security-Warnings'] =
      result.warnings.length.toString();

    if (result.warnings.length > 0) {
      result.securityHeaders['X-Security-Status'] = 'warnings';
    } else {
      result.securityHeaders['X-Security-Status'] = 'passed';
    }

    return result;
  } catch (error) {
    console.error('Security middleware error:', error);

    // On error, log but don't block (fail open for availability)
    result.warnings.push('Security middleware encountered an error');
    result.securityHeaders['X-Security-Status'] = 'error';
    result.securityHeaders['X-Security-Error'] = 'internal-error';

    return result;
  }
}

/**
 * Get security configuration for a specific endpoint
 */
function getSecurityConfig(pathname: string): SecurityConfig {
  // Find exact match first
  if (SECURITY_CONFIGS[pathname]) {
    return SECURITY_CONFIGS[pathname];
  }

  // Find pattern match
  for (const [pattern, config] of Object.entries(SECURITY_CONFIGS)) {
    if (pathname.startsWith(pattern)) {
      return config;
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Extract client IP address from request
 */
function extractClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  return (
    cfConnectingIP ||
    xRealIP ||
    xForwardedFor?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Wrapper function to easily integrate with existing route handlers
 *
 * Usage in route handlers:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const security = await withViralSecurity(request)
 *   if (!security.allowed) return security.response
 *
 *   // Add security headers to your response
 *   return NextResponse.json(data, { headers: security.securityHeaders })
 * }
 * ```
 */
export async function withViralSecurity(
  request: NextRequest,
  endpoint?: string,
): Promise<SecurityMiddlewareResult> {
  return viralSecurityMiddleware(request, endpoint);
}

/**
 * Enhanced rate limiting with security integration
 * Combines standard rate limiting with security-based rate adjustments
 */
export function getSecurityAdjustedRateLimit(
  baseLimit: number,
  securityResult: SecurityMiddlewareResult,
): { limit: number; window: number } {
  let adjustedLimit = baseLimit;
  let window = 300; // 5 minutes default

  // Reduce rate limit for suspicious activity
  if (securityResult.fraud_detection?.confidence_score) {
    const fraudScore = securityResult.fraud_detection.confidence_score;
    if (fraudScore > 0.5) {
      adjustedLimit = Math.floor(baseLimit * (1 - fraudScore * 0.5));
    }
  }

  // Extend window for DoS protection
  if (
    securityResult.dos_protection?.source_analysis.ip_reputation ===
    'suspicious'
  ) {
    window = 600; // 10 minutes
    adjustedLimit = Math.floor(adjustedLimit * 0.7);
  }

  // Minimum limits
  adjustedLimit = Math.max(adjustedLimit, 5);

  return { limit: adjustedLimit, window };
}

/**
 * Security headers for all viral API responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}
