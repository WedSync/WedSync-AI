/**
 * @fileoverview Security Validation and PII Protection for Analytics System
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 *
 * Comprehensive security measures for analytics data handling and user protection
 */

import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

// Security configuration
export const SECURITY_CONFIG = {
  // PII protection settings
  maxTextLength: 200,
  allowedFields: [
    'id',
    'rating',
    'platform',
    'created_at',
    'sentiment_score',
    'response_time',
    'supplier_id',
  ],
  sensitiveFields: [
    'review_text',
    'customer_name',
    'customer_email',
    'phone_number',
  ],

  // Rate limiting settings
  rateLimits: {
    analytics: { requests: 100, window: 60 * 1000 }, // 100/minute
    export: { requests: 10, window: 60 * 1000 }, // 10/minute
    campaign: { requests: 50, window: 60 * 1000 }, // 50/minute
  },

  // Data retention settings
  logRetention: 90, // days
  cacheMaxAge: 300, // 5 minutes
  sessionTimeout: 24 * 60 * 60, // 24 hours

  // Access control
  requiredRoles: ['admin', 'supplier', 'analytics'],
  adminOnlyFeatures: ['all_suppliers', 'system_metrics', 'user_management'],
} as const;

// PII Protection utilities
export class PIIProtection {
  /**
   * Sanitize review text to prevent PII exposure
   */
  static sanitizeReviewText(text: string): string {
    if (!text) return '';

    // Truncate to maximum length
    let sanitized = text.substring(0, SECURITY_CONFIG.maxTextLength);

    // Remove potential PII patterns
    sanitized = this.removePIIPatterns(sanitized);

    // Add truncation indicator if needed
    if (text.length > SECURITY_CONFIG.maxTextLength) {
      sanitized = sanitized.trim() + '...';
    }

    return sanitized;
  }

  /**
   * Remove common PII patterns from text
   */
  private static removePIIPatterns(text: string): string {
    return (
      text
        // Remove email addresses
        .replace(
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
          '[EMAIL]',
        )
        // Remove phone numbers (various formats)
        .replace(
          /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
          '[PHONE]',
        )
        // Remove potential credit card numbers
        .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CARD]')
        // Remove SSN-like patterns
        .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[ID]')
        // Remove potential addresses (simplified)
        .replace(
          /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd)\b/gi,
          '[ADDRESS]',
        )
    );
  }

  /**
   * Hash sensitive identifiers for logging
   */
  static hashSensitiveId(id: string, salt?: string): string {
    const actualSalt = salt || 'analytics_salt_2024';
    return createHash('sha256')
      .update(id + actualSalt)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate anonymized export data
   */
  static anonymizeExportData(data: any[]): any[] {
    return data.map((row) => {
      const sanitized = { ...row };

      // Remove or sanitize sensitive fields
      SECURITY_CONFIG.sensitiveFields.forEach((field) => {
        if (field === 'review_text' && sanitized[field]) {
          sanitized.review_text_excerpt = this.sanitizeReviewText(
            sanitized[field],
          );
          delete sanitized[field];
        } else {
          delete sanitized[field];
        }
      });

      // Hash user identifiers
      if (sanitized.customer_id) {
        sanitized.customer_hash = this.hashSensitiveId(sanitized.customer_id);
        delete sanitized.customer_id;
      }

      return sanitized;
    });
  }

  /**
   * Validate that only allowed fields are included in queries
   */
  static validateFieldAccess(
    requestedFields: string[],
    userRole: string,
  ): string[] {
    const allowedForRole = this.getAllowedFieldsForRole(userRole);
    return requestedFields.filter((field) => allowedForRole.includes(field));
  }

  private static getAllowedFieldsForRole(role: string): string[] {
    if (role === 'admin') {
      return [...SECURITY_CONFIG.allowedFields, 'review_text']; // Admin can see truncated review text
    }
    return SECURITY_CONFIG.allowedFields;
  }
}

// Access control and authorization
export class AccessControl {
  /**
   * Verify user has access to supplier data
   */
  static async verifySupplierAccess(
    userId: string,
    supplierId: string,
    userRole: string,
    userSupplierId?: string,
  ): Promise<boolean> {
    // Admins have access to all suppliers
    if (userRole === 'admin' || userRole === 'analytics') {
      return true;
    }

    // Suppliers can only access their own data
    if (userRole === 'supplier') {
      return userSupplierId === supplierId;
    }

    return false;
  }

  /**
   * Check if user can export data
   */
  static canExportData(userRole: string): boolean {
    return ['admin', 'analytics', 'supplier'].includes(userRole);
  }

  /**
   * Check if user can access campaign analytics
   */
  static canAccessCampaigns(userRole: string): boolean {
    return ['admin', 'analytics', 'supplier'].includes(userRole);
  }

  /**
   * Get allowed date range for user role
   */
  static getAllowedDateRange(userRole: string): { maxDays: number } {
    switch (userRole) {
      case 'admin':
      case 'analytics':
        return { maxDays: 365 };
      case 'supplier':
        return { maxDays: 180 };
      default:
        return { maxDays: 30 };
    }
  }

  /**
   * Validate user session and permissions
   */
  static validateSession(session: any): {
    isValid: boolean;
    user?: any;
    error?: string;
  } {
    if (!session || !session.user) {
      return { isValid: false, error: 'No valid session' };
    }

    if (!session.user.id || !session.user.email) {
      return { isValid: false, error: 'Invalid user data' };
    }

    // Check session expiry
    const sessionAge =
      Date.now() - new Date(session.user.created_at || 0).getTime();
    if (sessionAge > SECURITY_CONFIG.sessionTimeout * 1000) {
      return { isValid: false, error: 'Session expired' };
    }

    return { isValid: true, user: session.user };
  }
}

// Input validation and sanitization
export class SecurityValidator {
  private static readonly uuidSchema = z.string().uuid('Invalid UUID format');
  private static readonly dateSchema = z
    .string()
    .datetime('Invalid date format');
  private static readonly limitSchema = z.number().min(1).max(10000);

  /**
   * Validate supplier ID parameter
   */
  static validateSupplierId(supplierId: string): {
    isValid: boolean;
    error?: string;
  } {
    const result = this.uuidSchema.safeParse(supplierId);
    return {
      isValid: result.success,
      error: result.success ? undefined : 'Invalid supplier ID format',
    };
  }

  /**
   * Validate campaign ID parameter
   */
  static validateCampaignId(campaignId: string): {
    isValid: boolean;
    error?: string;
  } {
    const result = this.uuidSchema.safeParse(campaignId);
    return {
      isValid: result.success,
      error: result.success ? undefined : 'Invalid campaign ID format',
    };
  }

  /**
   * Validate date range parameters
   */
  static validateDateRange(
    startDate: string,
    endDate: string,
    maxDays: number = 365,
  ): { isValid: boolean; error?: string } {
    const startResult = this.dateSchema.safeParse(startDate);
    const endResult = this.dateSchema.safeParse(endDate);

    if (!startResult.success || !endResult.success) {
      return { isValid: false, error: 'Invalid date format' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return { isValid: false, error: 'Start date must be before end date' };
    }

    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxDays) {
      return {
        isValid: false,
        error: `Date range cannot exceed ${maxDays} days`,
      };
    }

    if (start > new Date()) {
      return { isValid: false, error: 'Start date cannot be in the future' };
    }

    return { isValid: true };
  }

  /**
   * Validate export request parameters
   */
  static validateExportRequest(request: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate format
    if (!request.format || !['csv', 'json'].includes(request.format)) {
      errors.push('Format must be csv or json');
    }

    // Validate date range
    if (request.dateRange) {
      const dateValidation = this.validateDateRange(
        request.dateRange.start,
        request.dateRange.end,
        90, // Export limit is 90 days
      );
      if (!dateValidation.isValid) {
        errors.push(dateValidation.error!);
      }
    }

    // Validate max records
    const limitResult = this.limitSchema.safeParse(request.maxRecords);
    if (!limitResult.success) {
      errors.push('Max records must be between 1 and 10,000');
    }

    // Validate include fields
    if (request.includeFields && !Array.isArray(request.includeFields)) {
      errors.push('Include fields must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize query parameters to prevent injection
   */
  static sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    Object.entries(params).forEach(([key, value]) => {
      // Only allow alphanumeric keys
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
        return;
      }

      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        sanitized[key] = value
          .replace(/[<>'"&]/g, '')
          .trim()
          .substring(0, 1000); // Limit length
      } else if (typeof value === 'number') {
        // Ensure numbers are within reasonable bounds
        sanitized[key] = Math.max(-999999999, Math.min(999999999, value));
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Ignore other types
    });

    return sanitized;
  }
}

// Security headers and response handling
export class SecurityHeaders {
  /**
   * Get security headers for analytics responses
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'",
      'Cache-Control': `public, max-age=${SECURITY_CONFIG.cacheMaxAge}, must-revalidate`,
      Vary: 'Accept-Encoding, Authorization',
    };
  }

  /**
   * Add security headers to response
   */
  static addSecurityHeaders(headers: Headers): void {
    const securityHeaders = this.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  /**
   * Create secure API response
   */
  static createSecureResponse(
    data: any,
    status: number = 200,
    additionalHeaders?: Record<string, string>,
  ): Response {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...this.getSecurityHeaders(),
      ...additionalHeaders,
    });

    return new Response(JSON.stringify(data), {
      status,
      headers,
    });
  }
}

// Audit logging for security events
export class SecurityAuditLogger {
  /**
   * Log analytics access attempt
   */
  static async logAnalyticsAccess(
    userId: string,
    supplierId: string,
    action: string,
    success: boolean,
    ipAddress?: string,
  ): Promise<void> {
    const logEntry = {
      userId: PIIProtection.hashSensitiveId(userId),
      supplierId: PIIProtection.hashSensitiveId(supplierId),
      action,
      success,
      ipAddress: ipAddress
        ? PIIProtection.hashSensitiveId(ipAddress)
        : undefined,
      timestamp: new Date().toISOString(),
      service: 'analytics',
    };

    // In production, this would write to a secure logging service
    console.log('Security Audit:', JSON.stringify(logEntry));
  }

  /**
   * Log export activity
   */
  static async logExportActivity(
    userId: string,
    exportType: string,
    recordCount: number,
    success: boolean,
  ): Promise<void> {
    const logEntry = {
      userId: PIIProtection.hashSensitiveId(userId),
      exportType,
      recordCount,
      success,
      timestamp: new Date().toISOString(),
      service: 'export',
    };

    console.log('Export Audit:', JSON.stringify(logEntry));
  }

  /**
   * Log security violation
   */
  static async logSecurityViolation(
    userId: string,
    violation: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<void> {
    const logEntry = {
      userId: userId ? PIIProtection.hashSensitiveId(userId) : 'anonymous',
      violation,
      details: this.sanitizeLogDetails(details),
      severity,
      timestamp: new Date().toISOString(),
      service: 'security',
    };

    console.error('Security Violation:', JSON.stringify(logEntry));

    // In production, would trigger alerts for high/critical violations
    if (['high', 'critical'].includes(severity)) {
      console.error('CRITICAL SECURITY ALERT:', violation);
    }
  }

  private static sanitizeLogDetails(details: any): any {
    if (typeof details === 'string') {
      return details.substring(0, 1000);
    }

    if (typeof details === 'object' && details !== null) {
      const sanitized: any = {};
      Object.entries(details).forEach(([key, value]) => {
        if (typeof value === 'string') {
          sanitized[key] = value.substring(0, 500);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitized[key] = value;
        }
      });
      return sanitized;
    }

    return String(details).substring(0, 1000);
  }
}

// Rate limiting implementation
export class RateLimit {
  private static attempts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(
    identifier: string,
    limit: { requests: number; window: number },
  ): { limited: boolean; retryAfter?: number } {
    const now = Date.now();
    const key = identifier;
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      // First request or window expired
      this.attempts.set(key, {
        count: 1,
        resetTime: now + limit.window,
      });
      return { limited: false };
    }

    if (attempt.count >= limit.requests) {
      // Rate limit exceeded
      return {
        limited: true,
        retryAfter: Math.ceil((attempt.resetTime - now) / 1000),
      };
    }

    // Increment count
    attempt.count++;
    return { limited: false };
  }

  /**
   * Clear rate limit data (for testing)
   */
  static clearAll(): void {
    this.attempts.clear();
  }

  /**
   * Get current usage for identifier
   */
  static getUsage(
    identifier: string,
  ): { count: number; resetTime: number } | null {
    return this.attempts.get(identifier) || null;
  }
}

// Configuration validation
export class SecurityConfigValidator {
  /**
   * Validate security configuration on startup
   */
  static validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate rate limits
    Object.entries(SECURITY_CONFIG.rateLimits).forEach(([key, limit]) => {
      if (limit.requests <= 0 || limit.window <= 0) {
        errors.push(`Invalid rate limit configuration for ${key}`);
      }
    });

    // Validate retention settings
    if (SECURITY_CONFIG.logRetention <= 0) {
      errors.push('Invalid log retention setting');
    }

    if (SECURITY_CONFIG.maxTextLength <= 0) {
      errors.push('Invalid max text length setting');
    }

    // Validate required environment variables (in production)
    if (process.env.NODE_ENV === 'production') {
      const requiredEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ];

      requiredEnvVars.forEach((envVar) => {
        if (!process.env[envVar]) {
          errors.push(`Missing required environment variable: ${envVar}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export main security functions
export const Security = {
  PIIProtection,
  AccessControl,
  SecurityValidator,
  SecurityHeaders,
  SecurityAuditLogger,
  RateLimit,
  SecurityConfigValidator,
  SECURITY_CONFIG,
};
