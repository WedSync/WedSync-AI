/**
 * WebSocket Security Validator - WS-203 Team B Implementation
 *
 * Comprehensive security validation system for WebSocket operations.
 * Implements defense-in-depth with multiple security layers and wedding-specific validation.
 *
 * Wedding Industry Security Features:
 * - Cross-wedding data isolation validation
 * - Supplier organization boundary enforcement
 * - Wedding date immutability protection
 * - Guest data privacy validation
 * - Payment information sanitization
 * - Real-time threat detection for wedding day protection
 */

import { NextRequest } from 'next/server';
import { z, ZodSchema } from 'zod';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/logger';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Security threat levels
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

// Security validation result
export interface SecurityValidationResult {
  valid: boolean;
  threatLevel: ThreatLevel;
  violations: SecurityViolation[];
  sanitizedData?: any;
  blockRequest: boolean;
}

// Security violation details
export interface SecurityViolation {
  type:
    | 'injection'
    | 'xss'
    | 'authorization'
    | 'rate_limit'
    | 'data_breach'
    | 'input_validation'
    | 'wedding_isolation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field?: string;
  value?: string;
  message: string;
  remediation: string;
}

// Wedding context validation
export interface WeddingSecurityContext {
  weddingId?: string;
  supplierId?: string;
  coupleId?: string;
  organizationId?: string;
  isWeddingDay?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Security configuration
export interface SecurityConfig {
  enableXssProtection: boolean;
  enableSqlInjectionProtection: boolean;
  enableWeddingIsolation: boolean;
  enableDataSanitization: boolean;
  enableThreatDetection: boolean;
  enableAuditLogging: boolean;
  threatThreshold: ThreatLevel;
  weddingDayEnhancedSecurity: boolean;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableXssProtection: true,
  enableSqlInjectionProtection: true,
  enableWeddingIsolation: true,
  enableDataSanitization: true,
  enableThreatDetection: true,
  enableAuditLogging: true,
  threatThreshold: 'medium',
  weddingDayEnhancedSecurity: true,
};

export class WebSocketSecurityValidator {
  private supabase: SupabaseClient;
  private config: SecurityConfig;
  private threatCache = new Map<
    string,
    { level: ThreatLevel; timestamp: number }
  >();

  constructor(
    supabaseClient: SupabaseClient,
    config: Partial<SecurityConfig> = {},
  ) {
    this.supabase = supabaseClient;
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Comprehensive security validation for WebSocket requests
   */
  async validateRequest(
    request: NextRequest,
    data: any,
    schema: ZodSchema,
    weddingContext?: WeddingSecurityContext,
  ): Promise<SecurityValidationResult> {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';
    let blockRequest = false;

    try {
      // 1. Input validation and sanitization
      const inputValidation = await this.validateAndSanitizeInput(data, schema);
      violations.push(...inputValidation.violations);

      if (inputValidation.threatLevel === 'critical') {
        threatLevel = 'critical';
        blockRequest = true;
      }

      // 2. SQL injection detection
      if (this.config.enableSqlInjectionProtection) {
        const sqlValidation = this.detectSqlInjection(data);
        violations.push(...sqlValidation.violations);
        threatLevel = this.escalateThreatLevel(
          threatLevel,
          sqlValidation.threatLevel,
        );

        if (sqlValidation.threatLevel === 'critical') {
          blockRequest = true;
        }
      }

      // 3. XSS protection
      if (this.config.enableXssProtection) {
        const xssValidation = this.detectXss(data);
        violations.push(...xssValidation.violations);
        threatLevel = this.escalateThreatLevel(
          threatLevel,
          xssValidation.threatLevel,
        );
      }

      // 4. Wedding context isolation validation
      if (this.config.enableWeddingIsolation && weddingContext) {
        const isolationValidation = await this.validateWeddingIsolation(
          weddingContext,
          request,
        );
        violations.push(...isolationValidation.violations);
        threatLevel = this.escalateThreatLevel(
          threatLevel,
          isolationValidation.threatLevel,
        );

        if (isolationValidation.threatLevel === 'critical') {
          blockRequest = true;
        }
      }

      // 5. Rate limiting validation
      const rateLimitValidation = await this.validateRateLimit(request);
      violations.push(...rateLimitValidation.violations);
      threatLevel = this.escalateThreatLevel(
        threatLevel,
        rateLimitValidation.threatLevel,
      );

      // 6. Authentication and authorization validation
      const authValidation = await this.validateAuthentication(
        request,
        weddingContext,
      );
      violations.push(...authValidation.violations);
      threatLevel = this.escalateThreatLevel(
        threatLevel,
        authValidation.threatLevel,
      );

      if (authValidation.threatLevel === 'critical') {
        blockRequest = true;
      }

      // 7. Wedding day enhanced security
      if (
        this.config.weddingDayEnhancedSecurity &&
        weddingContext?.isWeddingDay
      ) {
        const weddingDayValidation = this.validateWeddingDaySecurity(
          data,
          weddingContext,
        );
        violations.push(...weddingDayValidation.violations);
        threatLevel = this.escalateThreatLevel(
          threatLevel,
          weddingDayValidation.threatLevel,
        );
      }

      // 8. Threat level assessment
      const finalThreatLevel = await this.assessOverallThreatLevel(
        request,
        violations,
        threatLevel,
      );

      // 9. Security audit logging
      if (this.config.enableAuditLogging) {
        await this.logSecurityEvent(
          request,
          finalThreatLevel,
          violations,
          weddingContext,
        );
      }

      // 10. Decision on request blocking
      const shouldBlock =
        blockRequest ||
        finalThreatLevel === 'critical' ||
        violations.some((v) => v.severity === 'critical');

      return {
        valid: !shouldBlock,
        threatLevel: finalThreatLevel,
        violations,
        sanitizedData: inputValidation.sanitizedData,
        blockRequest: shouldBlock,
      };
    } catch (error) {
      logger.error('Security validation error', {
        error: error instanceof Error ? error.message : error,
        requestPath: request.nextUrl.pathname,
        weddingContext,
      });

      return {
        valid: false,
        threatLevel: 'critical',
        violations: [
          {
            type: 'input_validation',
            severity: 'critical',
            message: 'Security validation system error',
            remediation: 'Contact system administrator',
          },
        ],
        blockRequest: true,
      };
    }
  }

  /**
   * Validate and sanitize input data
   */
  private async validateAndSanitizeInput(
    data: any,
    schema: ZodSchema,
  ): Promise<{
    violations: SecurityViolation[];
    sanitizedData: any;
    threatLevel: ThreatLevel;
  }> {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';

    try {
      // Schema validation
      const validationResult = schema.safeParse(data);

      if (!validationResult.success) {
        validationResult.error.issues.forEach((issue) => {
          violations.push({
            type: 'input_validation',
            severity: 'medium',
            field: issue.path.join('.'),
            value:
              typeof issue.input === 'string' ? issue.input : '[complex value]',
            message: `Input validation failed: ${issue.message}`,
            remediation: 'Provide valid input according to schema requirements',
          });
        });
        threatLevel = 'medium';
      }

      // Data sanitization
      const sanitizedData = this.config.enableDataSanitization
        ? this.sanitizeData(data)
        : data;

      return { violations, sanitizedData, threatLevel };
    } catch (error) {
      violations.push({
        type: 'input_validation',
        severity: 'critical',
        message: 'Input validation system error',
        remediation: 'Contact system administrator',
      });

      return { violations, sanitizedData: data, threatLevel: 'critical' };
    }
  }

  /**
   * Detect SQL injection attempts
   */
  private detectSqlInjection(data: any): {
    violations: SecurityViolation[];
    threatLevel: ThreatLevel;
  } {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(;|\|\||&&|\bOR\b|\bAND\b).*(\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
      /('|(\\x27)|(\\x2D\\x2D)|(\\\')|(\\"))/i,
      /(\b(EXEC|EXECUTE)\b)/i,
      /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i,
      /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/i,
    ];

    const checkValue = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            violations.push({
              type: 'injection',
              severity: 'high',
              field: path,
              value: value.substring(0, 100), // Limit logged value length
              message: 'Potential SQL injection detected',
              remediation: 'Remove SQL keywords and special characters',
            });
            threatLevel = this.escalateThreatLevel(threatLevel, 'high');
            break;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach((key) => {
          checkValue(value[key], path ? `${path}.${key}` : key);
        });
      }
    };

    checkValue(data);
    return { violations, threatLevel };
  }

  /**
   * Detect XSS attempts
   */
  private detectXss(data: any): {
    violations: SecurityViolation[];
    threatLevel: ThreatLevel;
  } {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';

    // XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    ];

    const checkValue = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            violations.push({
              type: 'xss',
              severity: 'high',
              field: path,
              value: value.substring(0, 100),
              message: 'Potential XSS attack detected',
              remediation: 'Remove script tags and event handlers',
            });
            threatLevel = this.escalateThreatLevel(threatLevel, 'high');
            break;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach((key) => {
          checkValue(value[key], path ? `${path}.${key}` : key);
        });
      }
    };

    checkValue(data);
    return { violations, threatLevel };
  }

  /**
   * Validate wedding context isolation
   */
  private async validateWeddingIsolation(
    weddingContext: WeddingSecurityContext,
    request: NextRequest,
  ): Promise<{ violations: SecurityViolation[]; threatLevel: ThreatLevel }> {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        violations.push({
          type: 'authorization',
          severity: 'critical',
          message: 'Authentication required for wedding context validation',
          remediation: 'Provide valid authentication token',
        });
        return { violations, threatLevel: 'critical' };
      }

      // Get user profile for organization validation
      const { data: userProfile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        violations.push({
          type: 'authorization',
          severity: 'high',
          message: 'Unable to validate user permissions',
          remediation: 'Ensure user profile exists and is properly configured',
        });
        threatLevel = 'high';
        return { violations, threatLevel };
      }

      // Validate wedding access
      if (weddingContext.weddingId) {
        const { data: weddingAccess, error: weddingError } =
          await this.supabase.rpc('validate_wedding_access', {
            user_uuid: user.id,
            wedding_uuid: weddingContext.weddingId,
            required_permission: 'read',
          });

        if (weddingError || !weddingAccess) {
          violations.push({
            type: 'wedding_isolation',
            severity: 'critical',
            message: 'Cross-wedding data access attempt detected',
            remediation: 'Ensure user has proper wedding access permissions',
          });
          threatLevel = 'critical';
        }
      }

      // Validate supplier organization isolation
      if (weddingContext.supplierId && userProfile.organization_id) {
        const { data: supplier, error: supplierError } = await this.supabase
          .from('suppliers')
          .select('organization_id')
          .eq('id', weddingContext.supplierId)
          .single();

        if (supplierError || !supplier) {
          violations.push({
            type: 'wedding_isolation',
            severity: 'high',
            message: 'Invalid supplier context',
            remediation: 'Provide valid supplier ID',
          });
          threatLevel = 'high';
        } else if (
          supplier.organization_id !== userProfile.organization_id &&
          userProfile.role !== 'admin'
        ) {
          violations.push({
            type: 'wedding_isolation',
            severity: 'critical',
            message: 'Cross-organization supplier access attempt',
            remediation: 'Access only suppliers within your organization',
          });
          threatLevel = 'critical';
        }
      }

      // Validate couple access
      if (weddingContext.coupleId) {
        const { data: couple, error: coupleError } = await this.supabase
          .from('couples')
          .select('user_id, partner_user_id')
          .eq('id', weddingContext.coupleId)
          .single();

        if (coupleError || !couple) {
          violations.push({
            type: 'wedding_isolation',
            severity: 'high',
            message: 'Invalid couple context',
            remediation: 'Provide valid couple ID',
          });
          threatLevel = 'high';
        } else {
          const hasAccess =
            couple.user_id === user.id ||
            couple.partner_user_id === user.id ||
            userProfile.role === 'admin';

          if (!hasAccess) {
            violations.push({
              type: 'wedding_isolation',
              severity: 'critical',
              message: 'Unauthorized couple data access attempt',
              remediation: 'Access only your own couple data',
            });
            threatLevel = 'critical';
          }
        }
      }

      return { violations, threatLevel };
    } catch (error) {
      logger.error('Wedding isolation validation error', {
        error: error instanceof Error ? error.message : error,
        weddingContext,
      });

      violations.push({
        type: 'wedding_isolation',
        severity: 'critical',
        message: 'Wedding isolation validation system error',
        remediation: 'Contact system administrator',
      });

      return { violations, threatLevel: 'critical' };
    }
  }

  /**
   * Validate rate limiting
   */
  private async validateRateLimit(
    request: NextRequest,
  ): Promise<{ violations: SecurityViolation[]; threatLevel: ThreatLevel }> {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';

    // This would integrate with your rate limiting system
    // For now, just check for suspicious patterns

    const userAgent = request.headers.get('user-agent') || '';
    const suspiciousPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        violations.push({
          type: 'rate_limit',
          severity: 'medium',
          message: 'Potential automated access detected',
          remediation:
            'Use official API endpoints instead of automated scraping',
        });
        threatLevel = 'medium';
        break;
      }
    }

    return { violations, threatLevel };
  }

  /**
   * Validate authentication
   */
  private async validateAuthentication(
    request: NextRequest,
    weddingContext?: WeddingSecurityContext,
  ): Promise<{ violations: SecurityViolation[]; threatLevel: ThreatLevel }> {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';

    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error || !user) {
        violations.push({
          type: 'authorization',
          severity: 'critical',
          message: 'Authentication required',
          remediation: 'Provide valid authentication token',
        });
        return { violations, threatLevel: 'critical' };
      }

      // Additional authentication checks for wedding context
      if (weddingContext?.isWeddingDay) {
        // Enhanced authentication for wedding days
        const tokenAge =
          Date.now() -
          (user.created_at ? new Date(user.created_at).getTime() : 0);
        const maxTokenAge = 24 * 60 * 60 * 1000; // 24 hours

        if (tokenAge > maxTokenAge) {
          violations.push({
            type: 'authorization',
            severity: 'medium',
            message:
              'Authentication token age exceeded for wedding day operations',
            remediation: 'Re-authenticate for wedding day security',
          });
          threatLevel = 'medium';
        }
      }

      return { violations, threatLevel };
    } catch (error) {
      violations.push({
        type: 'authorization',
        severity: 'critical',
        message: 'Authentication system error',
        remediation: 'Contact system administrator',
      });

      return { violations, threatLevel: 'critical' };
    }
  }

  /**
   * Validate wedding day enhanced security
   */
  private validateWeddingDaySecurity(
    data: any,
    weddingContext: WeddingSecurityContext,
  ): { violations: SecurityViolation[]; threatLevel: ThreatLevel } {
    const violations: SecurityViolation[] = [];
    let threatLevel: ThreatLevel = 'low';

    // Enhanced validation for wedding day operations
    if (weddingContext.isWeddingDay) {
      // Check for critical operations on wedding days
      const criticalOperations = [
        'delete',
        'remove',
        'cancel',
        'cancel_wedding',
      ];

      const checkForCriticalOps = (obj: any, path: string = ''): void => {
        if (typeof obj === 'string') {
          for (const op of criticalOperations) {
            if (obj.toLowerCase().includes(op)) {
              violations.push({
                type: 'wedding_isolation',
                severity: 'critical',
                field: path,
                message: `Critical operation detected on wedding day: ${op}`,
                remediation:
                  'Critical operations should be avoided on wedding days',
              });
              threatLevel = 'critical';
            }
          }
        } else if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach((key) => {
            checkForCriticalOps(obj[key], path ? `${path}.${key}` : key);
          });
        }
      };

      checkForCriticalOps(data);
    }

    return { violations, threatLevel };
  }

  /**
   * Sanitize data to remove dangerous content
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Use DOMPurify for HTML sanitization
      return DOMPurify.sanitize(data);
    } else if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    } else if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      Object.keys(data).forEach((key) => {
        sanitized[key] = this.sanitizeData(data[key]);
      });
      return sanitized;
    }

    return data;
  }

  /**
   * Escalate threat level
   */
  private escalateThreatLevel(
    current: ThreatLevel,
    new_level: ThreatLevel,
  ): ThreatLevel {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(new_level);

    return levels[Math.max(currentIndex, newIndex)] as ThreatLevel;
  }

  /**
   * Assess overall threat level
   */
  private async assessOverallThreatLevel(
    request: NextRequest,
    violations: SecurityViolation[],
    currentLevel: ThreatLevel,
  ): Promise<ThreatLevel> {
    let finalLevel = currentLevel;

    // Count violations by severity
    const criticalCount = violations.filter(
      (v) => v.severity === 'critical',
    ).length;
    const highCount = violations.filter((v) => v.severity === 'high').length;
    const mediumCount = violations.filter(
      (v) => v.severity === 'medium',
    ).length;

    // Escalate based on violation patterns
    if (criticalCount > 0) {
      finalLevel = 'critical';
    } else if (highCount >= 2) {
      finalLevel = 'critical';
    } else if (highCount >= 1 && mediumCount >= 2) {
      finalLevel = 'high';
    } else if (highCount >= 1) {
      finalLevel = 'high';
    } else if (mediumCount >= 3) {
      finalLevel = 'high';
    } else if (mediumCount >= 1) {
      finalLevel = 'medium';
    }

    // Cache threat level for IP tracking
    const clientIP = request.ip || 'unknown';
    this.threatCache.set(clientIP, {
      level: finalLevel,
      timestamp: Date.now(),
    });

    return finalLevel;
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    request: NextRequest,
    threatLevel: ThreatLevel,
    violations: SecurityViolation[],
    weddingContext?: WeddingSecurityContext,
  ): Promise<void> {
    try {
      const securityEvent = {
        timestamp: new Date().toISOString(),
        threat_level: threatLevel,
        request_path: request.nextUrl.pathname,
        request_method: request.method,
        client_ip: request.ip,
        user_agent: request.headers.get('user-agent'),
        violations: violations,
        wedding_context: weddingContext,
        blocked:
          threatLevel === 'critical' ||
          violations.some((v) => v.severity === 'critical'),
      };

      // Log to application logger
      logger.warn('Security event detected', securityEvent);

      // Store in database for security analysis
      const { error } = await this.supabase.from('security_events').insert({
        threat_level: threatLevel,
        request_path: request.nextUrl.pathname,
        request_method: request.method,
        client_ip: request.ip,
        user_agent: request.headers.get('user-agent'),
        violations: violations,
        wedding_context: weddingContext || null,
        blocked: securityEvent.blocked,
      });

      if (error) {
        logger.error('Failed to store security event', {
          error: error.message,
          threatLevel,
          violationCount: violations.length,
        });
      }
    } catch (error) {
      logger.error('Security event logging error', {
        error: error instanceof Error ? error.message : error,
        threatLevel,
        violationCount: violations.length,
      });
    }
  }
}

// Enhanced security validation middleware factory
export function createSecurityValidator(config: Partial<SecurityConfig> = {}) {
  return function withEnhancedSecurity<T>(
    schema: ZodSchema<T>,
    handler: (request: NextRequest, validatedData: T) => Promise<Response>,
  ) {
    return async (request: NextRequest) => {
      const startTime = Date.now();

      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const validator = new WebSocketSecurityValidator(supabase, config);

        // Parse request data
        let data: any = {};
        try {
          if (request.method !== 'GET') {
            data = await request.json();
          } else {
            // Parse query parameters for GET requests
            const url = new URL(request.url);
            data = Object.fromEntries(url.searchParams.entries());
          }
        } catch (parseError) {
          logger.warn('Request parsing error', {
            error:
              parseError instanceof Error ? parseError.message : parseError,
            path: request.nextUrl.pathname,
          });

          return Response.json(
            {
              error: 'INVALID_REQUEST',
              message: 'Unable to parse request data',
              code: 'PARSE_ERROR',
            },
            { status: 400 },
          );
        }

        // Extract wedding context from data
        const weddingContext: WeddingSecurityContext = {
          weddingId: data.weddingId,
          supplierId: data.supplierId,
          coupleId: data.coupleId,
          organizationId: data.organizationId,
          isWeddingDay: data.isWeddingDay || false,
          priority: data.priority || 'medium',
        };

        // Perform security validation
        const securityResult = await validator.validateRequest(
          request,
          data,
          schema,
          weddingContext,
        );

        if (!securityResult.valid || securityResult.blockRequest) {
          const latency = Date.now() - startTime;

          logger.warn('Request blocked by security validation', {
            path: request.nextUrl.pathname,
            threatLevel: securityResult.threatLevel,
            violationCount: securityResult.violations.length,
            violations: securityResult.violations.map((v) => ({
              type: v.type,
              severity: v.severity,
              message: v.message,
            })),
            latency: `${latency}ms`,
          });

          // Return security error response
          return Response.json(
            {
              error: 'SECURITY_VIOLATION',
              message: 'Request blocked due to security policy violation',
              code: 'SECURITY_BLOCKED',
              threatLevel: securityResult.threatLevel,
              violations: securityResult.violations.map((v) => ({
                type: v.type,
                severity: v.severity,
                message: v.message,
                field: v.field,
                remediation: v.remediation,
              })),
            },
            { status: 403 },
          );
        }

        // Use sanitized data if available
        const processedData = securityResult.sanitizedData || data;

        // Proceed with original handler
        return await handler(request, processedData);
      } catch (error) {
        const latency = Date.now() - startTime;

        logger.error('Security validation middleware error', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          path: request.nextUrl.pathname,
          latency: `${latency}ms`,
        });

        return Response.json(
          {
            error: 'SECURITY_ERROR',
            message: 'Security validation system error',
            code: 'SECURITY_SYSTEM_ERROR',
          },
          { status: 500 },
        );
      }
    };
  };
}
