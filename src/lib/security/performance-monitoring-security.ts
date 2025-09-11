/**
 * WS-145: Production Performance Excellence - Security Measures
 *
 * Comprehensive security framework for performance monitoring system
 * Implements data sanitization, access controls, audit logging, and threat detection
 */

import { createHash, randomBytes } from 'crypto';
import { rateLimit } from '@/lib/ratelimit';
import { logger } from '@/lib/monitoring/logger';

interface SecurityContext {
  userId?: string;
  orgId?: string;
  tenantId?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
}

interface PerformanceDataSanitizer {
  sanitizeMetrics(data: any): any;
  validateSource(source: string): boolean;
  detectAnomalies(metrics: any[]): boolean;
}

interface AuditEvent {
  eventType:
    | 'performance_access'
    | 'data_export'
    | 'alert_trigger'
    | 'security_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: SecurityContext;
  metadata: Record<string, any>;
  timestamp: Date;
}

export class PerformanceMonitoringSecurity {
  private static instance: PerformanceMonitoringSecurity;
  private auditLog: AuditEvent[] = [];
  private suspiciousPatterns = new Map<string, number>();
  private encryptionKey: Buffer;

  private constructor() {
    this.encryptionKey = Buffer.from(
      process.env.PERFORMANCE_ENCRYPTION_KEY || randomBytes(32),
    );
  }

  static getInstance(): PerformanceMonitoringSecurity {
    if (!this.instance) {
      this.instance = new PerformanceMonitoringSecurity();
    }
    return this.instance;
  }

  /**
   * Data Sanitization and Validation
   */
  readonly dataSanitizer: PerformanceDataSanitizer = {
    sanitizeMetrics: (data: any) => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid performance data structure');
      }

      // Remove sensitive information
      const sanitized = { ...data };
      delete sanitized.sessionId;
      delete sanitized.userId;
      delete sanitized.personalIdentifiers;

      // Validate numeric metrics
      const numericFields = [
        'lcp',
        'fid',
        'cls',
        'ttfb',
        'inp',
        'loadTime',
        'renderTime',
      ];
      numericFields.forEach((field) => {
        if (sanitized[field] !== undefined) {
          const value = parseFloat(sanitized[field]);
          if (isNaN(value) || value < 0 || value > 300000) {
            // Max 5 minutes
            delete sanitized[field];
          }
          sanitized[field] = Math.round(value * 100) / 100; // 2 decimal precision
        }
      });

      // Validate URLs and remove query parameters with sensitive data
      if (sanitized.url) {
        try {
          const urlObj = new URL(sanitized.url);
          urlObj.search = ''; // Remove query parameters
          urlObj.hash = ''; // Remove fragment
          sanitized.url = urlObj.toString();
        } catch {
          delete sanitized.url;
        }
      }

      // Limit string lengths
      Object.keys(sanitized).forEach((key) => {
        if (
          typeof sanitized[key] === 'string' &&
          sanitized[key].length > 1000
        ) {
          sanitized[key] = sanitized[key].substring(0, 1000);
        }
      });

      return sanitized;
    },

    validateSource: (source: string): boolean => {
      const allowedSources = [
        'navigation-timing',
        'resource-timing',
        'performance-observer',
        'core-web-vitals',
        'bundle-analyzer',
      ];
      return allowedSources.includes(source);
    },

    detectAnomalies: (metrics: any[]): boolean => {
      if (!Array.isArray(metrics) || metrics.length === 0) return false;

      // Check for unusual patterns
      const timestamps = metrics.map((m) => new Date(m.timestamp).getTime());
      const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);

      // Detect rapid-fire submissions (potential bot)
      const rapidSubmissions = intervals.filter(
        (interval) => interval < 100,
      ).length;
      if (rapidSubmissions > metrics.length * 0.5) {
        logger.warn('Detected potential bot behavior in performance metrics');
        return true;
      }

      // Detect impossible performance values
      const suspiciousMetrics = metrics.filter(
        (m) =>
          (m.lcp && m.lcp > 100000) || // LCP > 100s
          (m.cls && m.cls > 10) || // CLS > 10
          (m.fid && m.fid > 30000), // FID > 30s
      );

      if (suspiciousMetrics.length > 0) {
        logger.warn('Detected impossible performance values', {
          count: suspiciousMetrics.length,
          samples: suspiciousMetrics.slice(0, 3),
        });
        return true;
      }

      return false;
    },
  };

  /**
   * Access Control and Authorization
   */
  async validateAccess(
    context: SecurityContext,
    requestedData: string[],
  ): Promise<boolean> {
    try {
      // Rate limiting
      const rateLimitKey = `perf_access:${context.userId || context.ipAddress}`;
      const rateLimitResult = await rateLimit({
        key: rateLimitKey,
        limit: 100, // 100 requests
        window: 60000, // per minute
      });

      if (!rateLimitResult.success) {
        this.logSecurityEvent({
          eventType: 'security_violation',
          severity: 'medium',
          context,
          metadata: { violation: 'rate_limit_exceeded', limit: 100 },
          timestamp: new Date(),
        });
        return false;
      }

      // Check for suspicious patterns
      const pattern = this.generateAccessPattern(context);
      const patternCount = this.suspiciousPatterns.get(pattern) || 0;
      this.suspiciousPatterns.set(pattern, patternCount + 1);

      if (patternCount > 50) {
        // Threshold for suspicious activity
        this.logSecurityEvent({
          eventType: 'security_violation',
          severity: 'high',
          context,
          metadata: { violation: 'suspicious_pattern', count: patternCount },
          timestamp: new Date(),
        });
        return false;
      }

      // Validate tenant access if multi-tenant request
      if (context.tenantId && requestedData.includes('tenant_metrics')) {
        const hasAccess = await this.validateTenantAccess(context);
        if (!hasAccess) {
          this.logSecurityEvent({
            eventType: 'security_violation',
            severity: 'high',
            context,
            metadata: { violation: 'unauthorized_tenant_access' },
            timestamp: new Date(),
          });
          return false;
        }
      }

      this.logSecurityEvent({
        eventType: 'performance_access',
        severity: 'low',
        context,
        metadata: { requestedData, status: 'authorized' },
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      logger.error('Access validation failed', { error, context });
      return false;
    }
  }

  /**
   * Data Encryption for Sensitive Metrics
   */
  encryptSensitiveData(data: any): string {
    try {
      const iv = randomBytes(16);
      const cipher = require('crypto').createCipher(
        'aes-256-cbc',
        this.encryptionKey,
      );
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Data encryption failed', { error });
      throw new Error('Encryption failed');
    }
  }

  decryptSensitiveData(encryptedData: string): any {
    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = require('crypto').createDecipher(
        'aes-256-cbc',
        this.encryptionKey,
      );
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Data decryption failed', { error });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Audit Logging and Monitoring
   */
  private logSecurityEvent(event: AuditEvent): void {
    this.auditLog.push(event);

    // Log to external monitoring system
    logger.info('Performance security event', {
      eventType: event.eventType,
      severity: event.severity,
      userId: event.context.userId,
      tenantId: event.context.tenantId,
      metadata: event.metadata,
    });

    // Alert on critical events
    if (event.severity === 'critical') {
      this.triggerSecurityAlert(event);
    }

    // Cleanup old audit logs (keep last 10000 entries)
    if (this.auditLog.length > 10000) {
      this.auditLog.splice(0, 1000);
    }
  }

  /**
   * Threat Detection and Response
   */
  private async triggerSecurityAlert(event: AuditEvent): Promise<void> {
    try {
      // Send to security monitoring system
      const alertPayload = {
        type: 'performance_security_violation',
        severity: event.severity,
        description: `Critical security event in performance monitoring: ${event.eventType}`,
        context: event.context,
        metadata: event.metadata,
        timestamp: event.timestamp.toISOString(),
      };

      // In production, this would integrate with your security monitoring
      logger.error('CRITICAL SECURITY ALERT', alertPayload);

      // Block IP if severe violation
      if (
        event.metadata.violation === 'data_exfiltration' ||
        event.metadata.violation === 'unauthorized_access'
      ) {
        await this.blockSuspiciousSource(event.context);
      }
    } catch (error) {
      logger.error('Security alert failed', { error, event });
    }
  }

  /**
   * IP and Source Blocking
   */
  private async blockSuspiciousSource(context: SecurityContext): Promise<void> {
    const blockKey = `blocked_ip:${context.ipAddress}`;
    const blockDuration = 24 * 60 * 60 * 1000; // 24 hours

    try {
      // Store block in cache/database
      await rateLimit({
        key: blockKey,
        limit: 0, // Complete block
        window: blockDuration,
      });

      logger.warn('Blocked suspicious source', {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        duration: '24h',
      });
    } catch (error) {
      logger.error('Failed to block suspicious source', { error, context });
    }
  }

  /**
   * Security Metrics and Reporting
   */
  getSecurityMetrics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentViolations: AuditEvent[];
    suspiciousPatterns: number;
  } {
    const eventsByType = this.auditLog.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const recentViolations = this.auditLog
      .filter(
        (event) =>
          event.eventType === 'security_violation' &&
          event.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000,
      )
      .slice(-10);

    return {
      totalEvents: this.auditLog.length,
      eventsByType,
      recentViolations,
      suspiciousPatterns: this.suspiciousPatterns.size,
    };
  }

  /**
   * Helper Methods
   */
  private generateAccessPattern(context: SecurityContext): string {
    return createHash('sha256')
      .update(`${context.ipAddress}:${context.userAgent}`)
      .digest('hex')
      .substring(0, 16);
  }

  private async validateTenantAccess(
    context: SecurityContext,
  ): Promise<boolean> {
    // In production, this would check against your tenant authorization system
    return context.userId !== undefined && context.tenantId !== undefined;
  }

  /**
   * Security Configuration Validation
   */
  validateSecurityConfiguration(): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!process.env.PERFORMANCE_ENCRYPTION_KEY) {
      issues.push('PERFORMANCE_ENCRYPTION_KEY not configured');
    }

    if (!process.env.SECURITY_MONITORING_WEBHOOK) {
      issues.push('SECURITY_MONITORING_WEBHOOK not configured');
    }

    if (!process.env.RATE_LIMIT_REDIS_URL) {
      issues.push(
        'RATE_LIMIT_REDIS_URL not configured - rate limiting may not work',
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Data Privacy Compliance
   */
  async anonymizeOldData(
    daysOld: number = 90,
  ): Promise<{ processed: number; errors: number }> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    let processed = 0;
    let errors = 0;

    try {
      // Remove old audit logs
      const oldLogs = this.auditLog.filter((log) => log.timestamp < cutoffDate);
      this.auditLog = this.auditLog.filter(
        (log) => log.timestamp >= cutoffDate,
      );
      processed += oldLogs.length;

      // Clear old suspicious patterns
      this.suspiciousPatterns.clear();

      logger.info('Performance data anonymization complete', {
        cutoffDate: cutoffDate.toISOString(),
        processed,
        errors,
      });
    } catch (error) {
      errors++;
      logger.error('Data anonymization failed', { error });
    }

    return { processed, errors };
  }
}
