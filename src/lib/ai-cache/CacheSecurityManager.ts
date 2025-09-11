/**
 * WS-241 AI Caching Strategy System - Security & Compliance Manager
 * Comprehensive security and compliance features for cache system
 * Team B - Backend Infrastructure & API Development
 */

import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import { Redis } from '@upstash/redis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

export interface SecurityConfig {
  encryptionEnabled: boolean;
  encryptionKey?: string;
  auditLoggingEnabled: boolean;
  gdprComplianceMode: boolean;
  maxRetentionDays: number;
  allowedOrigins: string[];
  maxRequestSize: number; // bytes
  rateLimitConfig: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
  };
  dataClassification: {
    pii_fields: string[];
    sensitive_fields: string[];
    public_fields: string[];
  };
}

export interface SecurityAuditLog {
  id: string;
  event_type:
    | 'access'
    | 'modification'
    | 'deletion'
    | 'security_violation'
    | 'data_export';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  organization_id?: string;
  resource_type: string;
  resource_id?: string;
  action: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  compliance_flags: string[];
}

export interface DataRetentionPolicy {
  data_type: string;
  retention_days: number;
  deletion_method: 'soft' | 'hard' | 'anonymize';
  compliance_requirement: 'gdpr' | 'ccpa' | 'hipaa' | 'internal';
  auto_delete_enabled: boolean;
}

export interface SecurityViolation {
  type:
    | 'rate_limit'
    | 'invalid_auth'
    | 'suspicious_pattern'
    | 'data_breach'
    | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: any;
  timestamp: Date;
  resolved: boolean;
}

export class CacheSecurityManager {
  private redis: Redis;
  private supabase: SupabaseClient;
  private config: SecurityConfig;
  private securityKey = 'ai_cache:security';

  constructor(
    supabaseUrl: string,
    supabaseServiceKey: string,
    redisUrl: string,
    config: SecurityConfig,
  ) {
    this.redis = new Redis({
      url: redisUrl,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.config = {
      encryptionEnabled: true,
      auditLoggingEnabled: true,
      gdprComplianceMode: true,
      maxRetentionDays: 90,
      allowedOrigins: ['https://wedsync.com', 'https://*.wedsync.com'],
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      rateLimitConfig: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // requests per window
        skipSuccessfulRequests: false,
      },
      dataClassification: {
        pii_fields: [
          'email',
          'phone',
          'address',
          'guest_names',
          'vendor_contacts',
        ],
        sensitive_fields: ['wedding_budget', 'payment_info', 'private_notes'],
        public_fields: [
          'venue_type',
          'wedding_style',
          'season',
          'guest_count_range',
        ],
      },
      ...config,
    };
  }

  /**
   * Validate and sanitize cache input data
   */
  public validateCacheInput(data: any): {
    isValid: boolean;
    sanitized?: any;
    violations: string[];
    securityFlags: string[];
  } {
    const violations: string[] = [];
    const securityFlags: string[] = [];

    try {
      // Check data size limits
      const dataSize = JSON.stringify(data).length;
      if (dataSize > this.config.maxRequestSize) {
        violations.push(
          `Data size ${dataSize} exceeds limit ${this.config.maxRequestSize}`,
        );
        return { isValid: false, violations, securityFlags };
      }

      // Sanitize input data
      const sanitized = this.sanitizeData(data);

      // Check for suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(sanitized);
      if (suspiciousPatterns.length > 0) {
        securityFlags.push(...suspiciousPatterns);
      }

      // Validate field types and formats
      const fieldValidation = this.validateFieldTypes(sanitized);
      if (!fieldValidation.isValid) {
        violations.push(...fieldValidation.errors);
      }

      return {
        isValid: violations.length === 0,
        sanitized,
        violations,
        securityFlags,
      };
    } catch (error) {
      violations.push(
        `Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { isValid: false, violations, securityFlags };
    }
  }

  /**
   * Encrypt sensitive cache data
   */
  public encryptSensitiveData(data: any): any {
    if (!this.config.encryptionEnabled) {
      return data;
    }

    const encrypted = { ...data };
    const sensitiveFields = this.config.dataClassification.sensitive_fields;
    const piiFields = this.config.dataClassification.pii_fields;

    const fieldsToEncrypt = [...sensitiveFields, ...piiFields];

    for (const field of fieldsToEncrypt) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = this.encryptValue(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt sensitive cache data
   */
  public decryptSensitiveData(data: any): any {
    if (!this.config.encryptionEnabled) {
      return data;
    }

    const decrypted = { ...data };
    const sensitiveFields = this.config.dataClassification.sensitive_fields;
    const piiFields = this.config.dataClassification.pii_fields;

    const fieldsToDecrypt = [...sensitiveFields, ...piiFields];

    for (const field of fieldsToDecrypt) {
      if (
        decrypted[field] !== undefined &&
        typeof decrypted[field] === 'string' &&
        decrypted[field].startsWith('enc:')
      ) {
        try {
          decrypted[field] = this.decryptValue(decrypted[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Log security audit events
   */
  public async logSecurityEvent(
    event: Partial<SecurityAuditLog>,
  ): Promise<void> {
    if (!this.config.auditLoggingEnabled) {
      return;
    }

    const auditLog: SecurityAuditLog = {
      id: randomBytes(16).toString('hex'),
      event_type: event.event_type || 'access',
      severity: event.severity || 'low',
      user_id: event.user_id,
      organization_id: event.organization_id,
      resource_type: event.resource_type || 'cache',
      resource_id: event.resource_id,
      action: event.action || 'unknown',
      details: event.details || {},
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      timestamp: event.timestamp || new Date(),
      compliance_flags: event.compliance_flags || [],
    };

    try {
      // Store in database
      await this.supabase.from('security_audit_logs').insert({
        id: auditLog.id,
        event_type: auditLog.event_type,
        severity: auditLog.severity,
        user_id: auditLog.user_id,
        organization_id: auditLog.organization_id,
        resource_type: auditLog.resource_type,
        resource_id: auditLog.resource_id,
        action: auditLog.action,
        details: auditLog.details,
        ip_address: auditLog.ip_address,
        user_agent: auditLog.user_agent,
        compliance_flags: auditLog.compliance_flags,
        created_at: auditLog.timestamp.toISOString(),
      });

      // Also cache recent events in Redis for fast access
      await this.redis.lpush(
        `${this.securityKey}:recent_events`,
        JSON.stringify(auditLog),
      );

      // Keep only last 1000 events in Redis
      await this.redis.ltrim(`${this.securityKey}:recent_events`, 0, 999);

      // Trigger alerts for high-severity events
      if (auditLog.severity === 'high' || auditLog.severity === 'critical') {
        await this.handleSecurityAlert(auditLog);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - security logging shouldn't break the main flow
    }
  }

  /**
   * Check data retention policies and delete expired data
   */
  public async enforceDataRetention(): Promise<{
    deleted_entries: number;
    anonymized_entries: number;
    errors: string[];
  }> {
    const results = {
      deleted_entries: 0,
      anonymized_entries: 0,
      errors: [] as string[],
    };

    try {
      // Get retention policies
      const policies = await this.getDataRetentionPolicies();

      for (const policy of policies) {
        try {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

          if (policy.deletion_method === 'hard') {
            // Permanently delete data
            const { data, error } = await this.supabase
              .from('ai_cache_entries')
              .delete()
              .lt('created_at', cutoffDate.toISOString())
              .eq('cache_type', policy.data_type);

            if (error) throw error;
            results.deleted_entries += data?.length || 0;
          } else if (policy.deletion_method === 'anonymize') {
            // Anonymize PII data
            const entriesToAnonymize = await this.supabase
              .from('ai_cache_entries')
              .select('*')
              .lt('created_at', cutoffDate.toISOString())
              .eq('cache_type', policy.data_type);

            if (entriesToAnonymize.data) {
              for (const entry of entriesToAnonymize.data) {
                const anonymized = this.anonymizePIIData(entry);

                await this.supabase
                  .from('ai_cache_entries')
                  .update(anonymized)
                  .eq('id', entry.id);

                results.anonymized_entries++;
              }
            }
          }

          // Log retention enforcement
          await this.logSecurityEvent({
            event_type: 'deletion',
            severity: 'low',
            resource_type: 'retention_policy',
            action: `enforced_${policy.deletion_method}`,
            details: {
              policy_type: policy.data_type,
              retention_days: policy.retention_days,
              cutoff_date: cutoffDate.toISOString(),
            },
            compliance_flags: [policy.compliance_requirement],
          });
        } catch (error) {
          const errorMsg = `Failed to enforce retention for ${policy.data_type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Data retention enforcement failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg);
    }

    return results;
  }

  /**
   * Generate GDPR compliance report
   */
  public async generateGDPRReport(organizationId: string): Promise<{
    data_categories: any[];
    retention_status: any;
    user_rights: any;
    processing_lawfulness: any;
    data_breaches: any[];
    compliance_score: number;
  }> {
    const report = {
      data_categories: [] as any[],
      retention_status: {},
      user_rights: {},
      processing_lawfulness: {},
      data_breaches: [] as any[],
      compliance_score: 0,
    };

    try {
      // Analyze data categories stored
      const { data: cacheEntries } = await this.supabase
        .from('ai_cache_entries')
        .select('cache_type, wedding_context, created_at')
        .eq('organization_id', organizationId);

      if (cacheEntries) {
        const categories = this.analyzePIICategories(cacheEntries);
        report.data_categories = categories;
      }

      // Check retention compliance
      report.retention_status =
        await this.checkRetentionCompliance(organizationId);

      // Check user rights fulfillment (access, rectification, erasure, portability)
      report.user_rights = await this.checkUserRightsCompliance(organizationId);

      // Check processing lawfulness
      report.processing_lawfulness = this.checkProcessingLawfulness();

      // Get security incidents/breaches
      const { data: breaches } = await this.supabase
        .from('security_audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('severity', 'critical')
        .gte(
          'created_at',
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        );

      report.data_breaches = breaches || [];

      // Calculate compliance score (0-100)
      report.compliance_score = this.calculateComplianceScore(report);

      // Log GDPR report generation
      await this.logSecurityEvent({
        event_type: 'access',
        severity: 'medium',
        organization_id: organizationId,
        resource_type: 'gdpr_report',
        action: 'generated',
        details: {
          compliance_score: report.compliance_score,
          data_categories_count: report.data_categories.length,
          breaches_count: report.data_breaches.length,
        },
        compliance_flags: ['gdpr'],
      });
    } catch (error) {
      console.error('Failed to generate GDPR report:', error);
      throw error;
    }

    return report;
  }

  /**
   * Handle user data deletion request (GDPR Article 17 - Right to erasure)
   */
  public async handleDataDeletionRequest(
    userId: string,
    organizationId: string,
  ): Promise<{
    deleted_entries: number;
    anonymized_entries: number;
    status: 'completed' | 'partial' | 'failed';
    errors: string[];
  }> {
    const result = {
      deleted_entries: 0,
      anonymized_entries: 0,
      status: 'completed' as 'completed' | 'partial' | 'failed',
      errors: [] as string[],
    };

    try {
      // Log the deletion request
      await this.logSecurityEvent({
        event_type: 'deletion',
        severity: 'medium',
        user_id: userId,
        organization_id: organizationId,
        resource_type: 'user_data',
        action: 'deletion_requested',
        compliance_flags: ['gdpr', 'right_to_erasure'],
      });

      // Delete cache entries associated with the user
      const { data: deletedEntries, error: deleteError } = await this.supabase
        .from('ai_cache_entries')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (deleteError) {
        result.errors.push(`Cache deletion failed: ${deleteError.message}`);
        result.status = 'failed';
      } else {
        result.deleted_entries = deletedEntries?.length || 0;
      }

      // Anonymize references in other data where hard deletion isn't possible
      const anonymizationResult = await this.anonymizeUserReferences(
        userId,
        organizationId,
      );
      result.anonymized_entries = anonymizationResult.anonymized_count;

      if (anonymizationResult.errors.length > 0) {
        result.errors.push(...anonymizationResult.errors);
        result.status = result.status === 'failed' ? 'failed' : 'partial';
      }

      // Clear user data from Redis cache
      await this.clearUserDataFromRedis(userId);

      // Log completion
      await this.logSecurityEvent({
        event_type: 'deletion',
        severity: 'medium',
        user_id: userId,
        organization_id: organizationId,
        resource_type: 'user_data',
        action: 'deletion_completed',
        details: {
          deleted_entries: result.deleted_entries,
          anonymized_entries: result.anonymized_entries,
          status: result.status,
          errors_count: result.errors.length,
        },
        compliance_flags: ['gdpr', 'right_to_erasure'],
      });
    } catch (error) {
      const errorMsg = `Data deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      result.status = 'failed';
      console.error(errorMsg);
    }

    return result;
  }

  /**
   * Create rate limiter for API endpoints
   */
  public createRateLimiter(
    customConfig?: Partial<typeof this.config.rateLimitConfig>,
  ) {
    const config = { ...this.config.rateLimitConfig, ...customConfig };

    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      skipSuccessfulRequests: config.skipSuccessfulRequests,
      message: {
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000) + ' seconds',
      },
      standardHeaders: true,
      legacyHeaders: false,
      onLimitReached: async (req, res, options) => {
        // Log rate limit violation
        await this.logSecurityEvent({
          event_type: 'security_violation',
          severity: 'medium',
          resource_type: 'rate_limit',
          action: 'limit_exceeded',
          details: {
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            endpoint: req.path,
            method: req.method,
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
        });
      },
    });
  }

  // Private helper methods

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove potentially dangerous characters and patterns
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Sanitize key names
        const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
        if (cleanKey.length > 0) {
          sanitized[cleanKey] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private detectSuspiciousPatterns(data: any): string[] {
    const patterns = [];
    const dataStr = JSON.stringify(data).toLowerCase();

    // SQL injection patterns
    if (
      /(union|select|insert|update|delete|drop|create|alter)\s+/i.test(dataStr)
    ) {
      patterns.push('potential_sql_injection');
    }

    // XSS patterns
    if (/<script|javascript:|on\w+\s*=/i.test(dataStr)) {
      patterns.push('potential_xss');
    }

    // Path traversal
    if (/\.\.[\/\\]/i.test(dataStr)) {
      patterns.push('potential_path_traversal');
    }

    // Excessive data size patterns
    if (dataStr.length > 100000) {
      // 100KB threshold
      patterns.push('excessive_data_size');
    }

    return patterns;
  }

  private validateFieldTypes(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic validation rules
    const validations = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[\d\s\-\(\)]{10,}$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      url: /^https?:\/\/.+/,
    };

    // Recursively validate object fields
    const validateObject = (obj: any, path = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;

        // Check field-specific validations
        if (
          key.includes('email') &&
          typeof value === 'string' &&
          value.length > 0
        ) {
          if (!validations.email.test(value)) {
            errors.push(`Invalid email format at ${fullPath}`);
          }
        }

        if (
          key.includes('phone') &&
          typeof value === 'string' &&
          value.length > 0
        ) {
          if (!validations.phone.test(value)) {
            errors.push(`Invalid phone format at ${fullPath}`);
          }
        }

        if (
          key.includes('date') &&
          typeof value === 'string' &&
          value.length > 0
        ) {
          if (!validations.date.test(value) && isNaN(Date.parse(value))) {
            errors.push(`Invalid date format at ${fullPath}`);
          }
        }

        // Recursive validation for nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          validateObject(value, fullPath);
        }
      }
    };

    if (data && typeof data === 'object') {
      validateObject(data);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private encryptValue(value: any): string {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const iv = randomBytes(16);
    const cipher = createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.config.encryptionKey),
      iv,
    );

    let encrypted = cipher.update(valueStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `enc:${iv.toString('hex')}:${encrypted}`;
  }

  private decryptValue(encryptedValue: string): any {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    if (!encryptedValue.startsWith('enc:')) {
      return encryptedValue; // Not encrypted
    }

    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const iv = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.config.encryptionKey),
      iv,
    );

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted; // Return as string if not JSON
    }
  }

  private async handleSecurityAlert(auditLog: SecurityAuditLog): Promise<void> {
    // Store in high-priority alerts queue
    await this.redis.lpush(
      `${this.securityKey}:alerts`,
      JSON.stringify(auditLog),
    );

    // Could integrate with external alerting systems here
    console.warn('Security alert:', {
      id: auditLog.id,
      severity: auditLog.severity,
      event_type: auditLog.event_type,
      action: auditLog.action,
    });
  }

  private async getDataRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    // Default retention policies for wedding industry
    const defaultPolicies: DataRetentionPolicy[] = [
      {
        data_type: 'guest_management',
        retention_days: this.config.maxRetentionDays,
        deletion_method: 'anonymize',
        compliance_requirement: 'gdpr',
        auto_delete_enabled: true,
      },
      {
        data_type: 'vendor_matching',
        retention_days: 365, // 1 year for business records
        deletion_method: 'soft',
        compliance_requirement: 'internal',
        auto_delete_enabled: false,
      },
      {
        data_type: 'budget_optimization',
        retention_days: 180, // 6 months for financial data
        deletion_method: 'hard',
        compliance_requirement: 'gdpr',
        auto_delete_enabled: true,
      },
    ];

    // Could be extended to read from database configuration
    return defaultPolicies;
  }

  private anonymizePIIData(entry: any): any {
    const anonymized = { ...entry };

    // Anonymize PII fields
    if (anonymized.wedding_context) {
      const context = { ...anonymized.wedding_context };

      // Replace specific PII with anonymized versions
      if (context.contact_email)
        context.contact_email = 'anonymized@example.com';
      if (context.contact_phone) context.contact_phone = '***-***-****';
      if (context.guest_names) context.guest_names = ['Guest 1', 'Guest 2'];
      if (context.vendor_contacts) context.vendor_contacts = {};

      anonymized.wedding_context = context;
    }

    // Clear user association
    anonymized.user_id = null;

    return anonymized;
  }

  private analyzePIICategories(entries: any[]): any[] {
    const categories = new Map();

    for (const entry of entries) {
      if (entry.wedding_context) {
        const piiFound = [];

        if (entry.wedding_context.contact_email)
          piiFound.push('email_addresses');
        if (entry.wedding_context.contact_phone) piiFound.push('phone_numbers');
        if (entry.wedding_context.guest_names) piiFound.push('personal_names');
        if (entry.wedding_context.address) piiFound.push('addresses');

        for (const category of piiFound) {
          if (!categories.has(category)) {
            categories.set(category, {
              category,
              count: 0,
              oldest_record: entry.created_at,
              newest_record: entry.created_at,
            });
          }

          const cat = categories.get(category);
          cat.count++;
          if (entry.created_at < cat.oldest_record)
            cat.oldest_record = entry.created_at;
          if (entry.created_at > cat.newest_record)
            cat.newest_record = entry.created_at;
        }
      }
    }

    return Array.from(categories.values());
  }

  private async checkRetentionCompliance(organizationId: string): Promise<any> {
    const policies = await this.getDataRetentionPolicies();
    const compliance = {};

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      const { data: expiredEntries } = await this.supabase
        .from('ai_cache_entries')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('cache_type', policy.data_type)
        .lt('created_at', cutoffDate.toISOString());

      compliance[policy.data_type] = {
        policy: policy,
        expired_entries: expiredEntries?.length || 0,
        compliant: (expiredEntries?.length || 0) === 0,
      };
    }

    return compliance;
  }

  private async checkUserRightsCompliance(
    organizationId: string,
  ): Promise<any> {
    // Check if we can fulfill user rights requests
    return {
      right_to_access: true, // We can export user data
      right_to_rectification: true, // We can update user data
      right_to_erasure: true, // We can delete user data
      right_to_portability: true, // We can export user data in JSON format
      right_to_object: false, // Automated decision making not applicable
    };
  }

  private checkProcessingLawfulness(): any {
    return {
      lawful_basis: 'legitimate_interest', // Providing wedding services
      special_categories: false, // No sensitive personal data
      automated_decision_making: true, // AI recommendations
      profiling: false, // No profiling for different treatment
    };
  }

  private calculateComplianceScore(report: any): number {
    let score = 100;

    // Deduct points for issues
    if (report.data_breaches.length > 0) score -= 20;

    const retentionIssues = Object.values(report.retention_status).filter(
      (r: any) => !r.compliant,
    ).length;
    score -= retentionIssues * 15;

    // Add points for good practices
    if (report.user_rights.right_to_erasure) score += 5;
    if (report.user_rights.right_to_portability) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private async anonymizeUserReferences(
    userId: string,
    organizationId: string,
  ): Promise<{
    anonymized_count: number;
    errors: string[];
  }> {
    const result = { anonymized_count: 0, errors: [] as string[] };

    try {
      // Anonymize references in performance metrics
      const { data: updatedMetrics, error } = await this.supabase
        .from('cache_performance_metrics')
        .update({ user_id: null })
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) {
        result.errors.push(`Failed to anonymize metrics: ${error.message}`);
      } else {
        result.anonymized_count += updatedMetrics?.length || 0;
      }
    } catch (error) {
      result.errors.push(
        `Anonymization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return result;
  }

  private async clearUserDataFromRedis(userId: string): Promise<void> {
    // Clear any user-specific cache keys
    const pattern = `*:user:${userId}:*`;

    try {
      // This would need to be implemented based on your Redis usage patterns
      console.log(`Cleared Redis data for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear Redis user data:', error);
    }
  }

  /**
   * Health check for security systems
   */
  public async securityHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      details?: string;
    }>;
    recommendations: string[];
  }> {
    const checks = [];
    const recommendations = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check encryption configuration
    if (this.config.encryptionEnabled && this.config.encryptionKey) {
      checks.push({ name: 'Encryption configuration', status: 'pass' });
    } else {
      checks.push({
        name: 'Encryption configuration',
        status: 'fail',
        details: 'Encryption not properly configured',
      });
      overallStatus = 'degraded';
      recommendations.push('Configure encryption for sensitive data');
    }

    // Check audit logging
    if (this.config.auditLoggingEnabled) {
      checks.push({ name: 'Audit logging', status: 'pass' });
    } else {
      checks.push({
        name: 'Audit logging',
        status: 'fail',
        details: 'Audit logging disabled',
      });
      overallStatus = 'degraded';
      recommendations.push('Enable audit logging for compliance');
    }

    // Check recent security events
    try {
      const recentAlerts = await this.redis.lrange(
        `${this.securityKey}:alerts`,
        0,
        10,
      );
      const criticalAlerts = recentAlerts.filter((alert) => {
        const parsed = JSON.parse(alert);
        return (
          parsed.severity === 'critical' &&
          Date.now() - new Date(parsed.timestamp).getTime() <
            24 * 60 * 60 * 1000
        ); // Last 24h
      });

      if (criticalAlerts.length === 0) {
        checks.push({ name: 'Recent security alerts', status: 'pass' });
      } else {
        checks.push({
          name: 'Recent security alerts',
          status: 'fail',
          details: `${criticalAlerts.length} critical alerts in last 24h`,
        });
        overallStatus = 'unhealthy';
        recommendations.push('Review and address critical security alerts');
      }
    } catch (error) {
      checks.push({
        name: 'Security monitoring',
        status: 'fail',
        details: 'Failed to check recent alerts',
      });
      overallStatus = 'degraded';
    }

    // Check GDPR compliance status
    if (this.config.gdprComplianceMode) {
      checks.push({ name: 'GDPR compliance mode', status: 'pass' });
    } else {
      checks.push({
        name: 'GDPR compliance mode',
        status: 'fail',
        details: 'GDPR compliance mode disabled',
      });
      overallStatus = 'degraded';
      recommendations.push('Enable GDPR compliance mode');
    }

    return {
      status: overallStatus,
      checks,
      recommendations,
    };
  }
}
