/**
 * Enterprise-grade Audit Logging System
 * Tracks all security-sensitive operations for compliance and monitoring
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILED = 'auth.login.failed',
  LOGOUT = 'auth.logout',

  // PDF operations
  PDF_UPLOAD_ATTEMPT = 'pdf.upload.attempt',
  PDF_UPLOAD_SUCCESS = 'pdf.upload.success',
  PDF_UPLOAD_FAILED = 'pdf.upload.failed',
  PDF_UPLOAD_BLOCKED = 'pdf.upload.blocked',
  PDF_PROCESS_START = 'pdf.process.start',
  PDF_PROCESS_SUCCESS = 'pdf.process.success',
  PDF_PROCESS_FAILED = 'pdf.process.failed',
  PDF_MALWARE_DETECTED = 'pdf.malware.detected',
  PDF_ACCESS_DENIED = 'pdf.access.denied',
  PDF_DELETED = 'pdf.deleted',

  // Security events
  RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',
  UNAUTHORIZED_ACCESS = 'security.unauthorized.access',
  CROSS_ORG_ACCESS_ATTEMPT = 'security.cross_org.attempt',

  // Data operations
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',
  DATA_DELETE = 'data.delete',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id?: string;
  user_email?: string;
  organization_id?: string;
  resource_id?: string;
  resource_type?: string;
  ip_address?: string;
  user_agent?: string;
  action: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
  session_id?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  private constructor() {
    // Start flush interval
    this.startFlushInterval();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Add to buffer
    this.buffer.push(fullEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', {
        type: fullEntry.event_type,
        severity: fullEntry.severity,
        user: fullEntry.user_email,
        details: fullEntry.details,
      });
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }

    // For critical events, flush immediately
    if (entry.severity === AuditSeverity.CRITICAL) {
      await this.flush();
    }
  }

  /**
   * Log PDF upload event
   */
  async logPDFUpload(
    userId: string,
    userEmail: string,
    organizationId: string,
    filename: string,
    fileSize: number,
    success: boolean,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: success
        ? AuditEventType.PDF_UPLOAD_SUCCESS
        : AuditEventType.PDF_UPLOAD_FAILED,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      user_id: userId,
      user_email: userEmail,
      organization_id: organizationId,
      action: `PDF upload ${success ? 'successful' : 'failed'}`,
      details: {
        filename,
        fileSize,
        ...details,
      },
    });
  }

  /**
   * Log security threat detection
   */
  async logSecurityThreat(
    threat: string,
    userId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.CRITICAL,
      user_id: userId,
      action: `Security threat detected: ${threat}`,
      details: details || {},
    });
  }

  /**
   * Log malware detection
   */
  async logMalwareDetection(
    userId: string,
    filename: string,
    threatType: string,
    organizationId?: string,
  ): Promise<void> {
    await this.log({
      event_type: AuditEventType.PDF_MALWARE_DETECTED,
      severity: AuditSeverity.CRITICAL,
      user_id: userId,
      organization_id: organizationId,
      action: 'Malware detected in uploaded file',
      details: {
        filename,
        threatType,
        blocked: true,
      },
    });
  }

  /**
   * Log cross-organization access attempt
   */
  async logCrossOrgAccessAttempt(
    userId: string,
    userOrgId: string,
    targetOrgId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    await this.log({
      event_type: AuditEventType.CROSS_ORG_ACCESS_ATTEMPT,
      severity: AuditSeverity.CRITICAL,
      user_id: userId,
      organization_id: userOrgId,
      action: 'Attempted cross-organization access',
      details: {
        userOrgId,
        targetOrgId,
        resourceType,
        resourceId,
        blocked: true,
      },
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(
    ipAddress: string,
    endpoint: string,
    userId?: string,
  ): Promise<void> {
    await this.log({
      event_type: AuditEventType.RATE_LIMIT_EXCEEDED,
      severity: AuditSeverity.WARNING,
      user_id: userId,
      ip_address: ipAddress,
      action: 'Rate limit exceeded',
      details: {
        endpoint,
        blocked: true,
      },
    });
  }

  /**
   * Query audit logs
   */
  async query(
    filters: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      organizationId?: string;
      eventType?: AuditEventType;
      severity?: AuditSeverity;
    },
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error querying audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Audit query error:', error);
      return [];
    }
  }

  /**
   * Get suspicious activity patterns
   */
  async detectSuspiciousPatterns(
    organizationId: string,
    windowMinutes = 60,
  ): Promise<{
    multipleFailedUploads: number;
    rateLimitViolations: number;
    crossOrgAttempts: number;
    malwareDetections: number;
  }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const logs = await this.query({
      organizationId,
      startDate: windowStart,
    });

    return {
      multipleFailedUploads: logs.filter(
        (log) => log.event_type === AuditEventType.PDF_UPLOAD_FAILED,
      ).length,
      rateLimitViolations: logs.filter(
        (log) => log.event_type === AuditEventType.RATE_LIMIT_EXCEEDED,
      ).length,
      crossOrgAttempts: logs.filter(
        (log) => log.event_type === AuditEventType.CROSS_ORG_ACCESS_ATTEMPT,
      ).length,
      malwareDetections: logs.filter(
        (log) => log.event_type === AuditEventType.PDF_MALWARE_DETECTED,
      ).length,
    };
  }

  /**
   * Flush buffer to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const toFlush = [...this.buffer];
    this.buffer = [];

    try {
      const { error } = await supabase.from('audit_logs').insert(toFlush);

      if (error) {
        console.error('Error flushing audit logs:', error);
        // Re-add to buffer on failure
        this.buffer.unshift(...toFlush);
      }
    } catch (error) {
      console.error('Audit flush error:', error);
      // Re-add to buffer on failure
      this.buffer.unshift(...toFlush);
    }
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop periodic flush
   */
  stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Final flush
    this.flush();
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
