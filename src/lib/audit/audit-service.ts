/**
 * WS-150: Comprehensive Audit Logging System
 * High-performance audit service with automatic enrichment and specialized logging
 * Handles 1000+ events/sec with performance optimization and change tracking
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import diff from 'deep-diff';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Extended audit event types for comprehensive logging
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILED = 'auth.login.failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_SESSION_EXPIRED = 'auth.session.expired',
  AUTH_PASSWORD_CHANGED = 'auth.password.changed',
  AUTH_MFA_ENABLED = 'auth.mfa.enabled',
  AUTH_MFA_DISABLED = 'auth.mfa.disabled',

  // Data operations with change tracking
  DATA_CREATE = 'data.create',
  DATA_READ = 'data.read',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  DATA_BULK_IMPORT = 'data.bulk.import',
  DATA_BULK_EXPORT = 'data.bulk.export',

  // Financial operations (PCI compliance)
  FINANCIAL_PAYMENT_PROCESSED = 'financial.payment.processed',
  FINANCIAL_REFUND_ISSUED = 'financial.refund.issued',
  FINANCIAL_SUBSCRIPTION_CHANGED = 'financial.subscription.changed',
  FINANCIAL_BILLING_UPDATED = 'financial.billing.updated',
  FINANCIAL_ACCESS_ATTEMPT = 'financial.access.attempt',

  // Security events with enhanced tracking
  SECURITY_UNAUTHORIZED_ACCESS = 'security.unauthorized.access',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',
  SECURITY_MALWARE_DETECTED = 'security.malware.detected',
  SECURITY_CROSS_ORG_ACCESS = 'security.cross_org.access',
  SECURITY_ADMIN_PRIVILEGE_USED = 'security.admin.privilege.used',
  SECURITY_DATA_BREACH_ATTEMPT = 'security.data_breach.attempt',

  // System operations
  SYSTEM_BACKUP_CREATED = 'system.backup.created',
  SYSTEM_RESTORE_PERFORMED = 'system.restore.performed',
  SYSTEM_MAINTENANCE_START = 'system.maintenance.start',
  SYSTEM_MAINTENANCE_END = 'system.maintenance.end',
  SYSTEM_ERROR_OCCURRED = 'system.error.occurred',

  // Compliance events (GDPR/CCPA)
  COMPLIANCE_DATA_REQUEST = 'compliance.data.request',
  COMPLIANCE_DATA_DELETION = 'compliance.data.deletion',
  COMPLIANCE_DATA_EXPORT = 'compliance.data.export',
  COMPLIANCE_CONSENT_CHANGED = 'compliance.consent.changed',
  COMPLIANCE_RETENTION_APPLIED = 'compliance.retention.applied',

  // API operations
  API_KEY_GENERATED = 'api.key.generated',
  API_KEY_REVOKED = 'api.key.revoked',
  API_RATE_LIMIT_HIT = 'api.rate_limit.hit',
  API_WEBHOOK_SENT = 'api.webhook.sent',
  API_EXTERNAL_REQUEST = 'api.external.request',
}

export enum AuditSeverity {
  DEBUG = 'debug',
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
  correlation_id?: string;
  request_id?: string;
  change_diff?: any;
  performance_metrics?: {
    duration_ms?: number;
    memory_usage?: number;
    cpu_usage?: number;
  };
}

export interface AuditContext {
  user_id?: string;
  user_email?: string;
  organization_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  correlation_id?: string;
}

export interface BatchAuditEntry {
  entries: AuditLogEntry[];
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface AuditMetrics {
  total_events: number;
  events_per_second: number;
  buffer_size: number;
  flush_frequency: number;
  failed_writes: number;
  average_response_time: number;
}

export class ComprehensiveAuditService {
  private static instance: ComprehensiveAuditService;

  // High-performance buffering system
  private criticalBuffer: AuditLogEntry[] = [];
  private highPriorityBuffer: AuditLogEntry[] = [];
  private normalBuffer: AuditLogEntry[] = [];
  private lowPriorityBuffer: AuditLogEntry[] = [];

  // Performance tracking
  private metrics: AuditMetrics = {
    total_events: 0,
    events_per_second: 0,
    buffer_size: 0,
    flush_frequency: 0,
    failed_writes: 0,
    average_response_time: 0,
  };

  // Configuration
  private readonly CRITICAL_BUFFER_SIZE = 10; // Immediate flush
  private readonly HIGH_BUFFER_SIZE = 25;
  private readonly NORMAL_BUFFER_SIZE = 100;
  private readonly LOW_BUFFER_SIZE = 500;

  private readonly CRITICAL_FLUSH_INTERVAL = 1000; // 1 second
  private readonly HIGH_FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly NORMAL_FLUSH_INTERVAL = 15000; // 15 seconds
  private readonly LOW_FLUSH_INTERVAL = 60000; // 1 minute

  private flushIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown = false;

  private constructor() {
    this.startFlushIntervals();
    this.setupGracefulShutdown();
  }

  static getInstance(): ComprehensiveAuditService {
    if (!ComprehensiveAuditService.instance) {
      ComprehensiveAuditService.instance = new ComprehensiveAuditService();
    }
    return ComprehensiveAuditService.instance;
  }

  /**
   * Main audit logging method with automatic enrichment
   */
  async log(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
    context?: AuditContext,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Create enriched audit entry
      const enrichedEntry: AuditLogEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        correlation_id: context?.correlation_id || randomUUID(),
        request_id: context?.request_id,
        ...entry,
        // Merge context data
        user_id: entry.user_id || context?.user_id,
        user_email: entry.user_email || context?.user_email,
        organization_id: entry.organization_id || context?.organization_id,
        session_id: entry.session_id || context?.session_id,
        ip_address: entry.ip_address || context?.ip_address,
        user_agent: entry.user_agent || context?.user_agent,
        metadata: {
          ...entry.metadata,
          logged_at: new Date().toISOString(),
          audit_version: '2.0',
          environment: process.env.NODE_ENV || 'unknown',
        },
      };

      // Add performance metrics
      const endTime = performance.now();
      enrichedEntry.performance_metrics = {
        duration_ms: endTime - startTime,
        memory_usage: process.memoryUsage().heapUsed,
      };

      // Route to appropriate buffer based on severity
      this.routeToBuffer(enrichedEntry);

      // Update metrics
      this.updateMetrics(enrichedEntry);

      // Console logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUDIT]', {
          type: enrichedEntry.event_type,
          severity: enrichedEntry.severity,
          user: enrichedEntry.user_email,
          action: enrichedEntry.action,
          correlation_id: enrichedEntry.correlation_id,
        });
      }
    } catch (error) {
      console.error('[AUDIT SERVICE] Error logging audit entry:', error);
      // Fallback to direct console logging
      console.warn('[AUDIT FALLBACK]', JSON.stringify(entry, null, 2));
      this.metrics.failed_writes++;
    }
  }

  /**
   * Specialized security audit logging
   */
  async logSecurityEvent(
    event_type: AuditEventType,
    action: string,
    details: Record<string, any>,
    context?: AuditContext,
    threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<void> {
    const severityMap = {
      low: AuditSeverity.INFO,
      medium: AuditSeverity.WARNING,
      high: AuditSeverity.ERROR,
      critical: AuditSeverity.CRITICAL,
    };

    await this.log(
      {
        event_type,
        severity: severityMap[threatLevel],
        action,
        details: {
          ...details,
          threat_level: threatLevel,
          security_event: true,
          requires_investigation:
            threatLevel === 'high' || threatLevel === 'critical',
        },
      },
      context,
    );

    // Create security alert for high/critical threats
    if (threatLevel === 'high' || threatLevel === 'critical') {
      await this.createSecurityAlert(event_type, action, details, context);
    }
  }

  /**
   * Financial audit logging (PCI compliance)
   */
  async logFinancialEvent(
    event_type: AuditEventType,
    action: string,
    amount?: number,
    currency?: string,
    transaction_id?: string,
    details: Record<string, any> = {},
    context?: AuditContext,
  ): Promise<void> {
    // Sanitize sensitive financial data
    const sanitizedDetails = {
      ...details,
      // Remove sensitive card information if present
      card_number: details.card_number
        ? `****-****-****-${details.card_number?.slice(-4)}`
        : undefined,
      cvv: details.cvv ? '***' : undefined,
      routing_number: details.routing_number
        ? `****${details.routing_number?.slice(-4)}`
        : undefined,
    };

    await this.log(
      {
        event_type,
        severity: AuditSeverity.INFO,
        action,
        resource_type: 'financial_transaction',
        resource_id: transaction_id,
        details: {
          ...sanitizedDetails,
          amount,
          currency,
          transaction_id,
          financial_event: true,
          pci_compliant: true,
          data_classification: 'sensitive',
        },
      },
      context,
    );
  }

  /**
   * Data access audit with change tracking
   */
  async logDataAccess(
    event_type: AuditEventType,
    resource_type: string,
    resource_id: string,
    action: string,
    old_data?: any,
    new_data?: any,
    context?: AuditContext,
  ): Promise<void> {
    let change_diff;
    if (old_data && new_data) {
      change_diff = diff(old_data, new_data);
    }

    await this.log(
      {
        event_type,
        severity: AuditSeverity.INFO,
        action,
        resource_type,
        resource_id,
        change_diff,
        details: {
          data_access_event: true,
          has_changes: !!change_diff,
          change_count: change_diff ? change_diff.length : 0,
          data_classification: this.classifyData(resource_type),
        },
      },
      context,
    );
  }

  /**
   * Batch audit logging for high-volume operations
   */
  async logBatch(entries: BatchAuditEntry): Promise<void> {
    const enrichedEntries = entries.entries.map((entry) => ({
      ...entry,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      metadata: {
        ...entry.metadata,
        batch_operation: true,
        batch_priority: entries.priority,
        batch_size: entries.entries.length,
      },
    }));

    // Route based on batch priority
    switch (entries.priority) {
      case 'critical':
        this.criticalBuffer.push(...enrichedEntries);
        break;
      case 'high':
        this.highPriorityBuffer.push(...enrichedEntries);
        break;
      case 'normal':
        this.normalBuffer.push(...enrichedEntries);
        break;
      case 'low':
        this.lowPriorityBuffer.push(...enrichedEntries);
        break;
    }

    // Check if immediate flush needed
    if (
      entries.priority === 'critical' ||
      this.criticalBuffer.length >= this.CRITICAL_BUFFER_SIZE
    ) {
      await this.flushBuffer('critical');
    }
  }

  /**
   * Query audit logs with advanced filtering
   */
  async query(filters: {
    start_date?: Date;
    end_date?: Date;
    user_id?: string;
    organization_id?: string;
    event_types?: AuditEventType[];
    severities?: AuditSeverity[];
    resource_type?: string;
    resource_id?: string;
    correlation_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filters.start_date) {
        query = query.gte('timestamp', filters.start_date.toISOString());
      }
      if (filters.end_date) {
        query = query.lte('timestamp', filters.end_date.toISOString());
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }
      if (filters.event_types?.length) {
        query = query.in('event_type', filters.event_types);
      }
      if (filters.severities?.length) {
        query = query.in('severity', filters.severities);
      }
      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id);
      }
      if (filters.correlation_id) {
        query = query.eq('correlation_id', filters.correlation_id);
      }

      // Apply pagination
      const limit = Math.min(filters.limit || 100, 1000);
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('[AUDIT SERVICE] Query error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[AUDIT SERVICE] Query exception:', error);
      return [];
    }
  }

  /**
   * Get audit metrics and performance statistics
   */
  getMetrics(): AuditMetrics {
    return {
      ...this.metrics,
      buffer_size: this.getTotalBufferSize(),
    };
  }

  /**
   * Analyze audit patterns for anomalies
   */
  async analyzePatterns(
    organization_id: string,
    time_window_hours = 24,
  ): Promise<{
    suspicious_activity_count: number;
    failed_auth_attempts: number;
    unusual_data_access: number;
    security_violations: number;
    patterns: Array<{
      pattern_type: string;
      count: number;
      severity: string;
      description: string;
    }>;
  }> {
    const start_date = new Date(
      Date.now() - time_window_hours * 60 * 60 * 1000,
    );

    const logs = await this.query({
      organization_id,
      start_date,
      limit: 1000,
    });

    const analysis = {
      suspicious_activity_count: 0,
      failed_auth_attempts: 0,
      unusual_data_access: 0,
      security_violations: 0,
      patterns: [] as Array<{
        pattern_type: string;
        count: number;
        severity: string;
        description: string;
      }>,
    };

    // Analyze patterns
    const eventCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const userActivity: Record<string, number> = {};

    logs.forEach((log) => {
      eventCounts[log.event_type] = (eventCounts[log.event_type] || 0) + 1;
      severityCounts[log.severity] = (severityCounts[log.severity] || 0) + 1;

      if (log.user_id) {
        userActivity[log.user_id] = (userActivity[log.user_id] || 0) + 1;
      }

      // Count specific categories
      if (log.event_type.includes('suspicious')) {
        analysis.suspicious_activity_count++;
      }
      if (log.event_type.includes('auth') && log.severity === 'error') {
        analysis.failed_auth_attempts++;
      }
      if (log.event_type.includes('data') && log.severity === 'warning') {
        analysis.unusual_data_access++;
      }
      if (log.event_type.includes('security')) {
        analysis.security_violations++;
      }
    });

    // Identify patterns
    Object.entries(eventCounts).forEach(([event_type, count]) => {
      if (count > 10) {
        // Threshold for pattern detection
        analysis.patterns.push({
          pattern_type: 'high_frequency_event',
          count,
          severity: 'warning',
          description: `High frequency of ${event_type} events (${count} occurrences)`,
        });
      }
    });

    Object.entries(userActivity).forEach(([user_id, count]) => {
      if (count > 50) {
        // High activity threshold
        analysis.patterns.push({
          pattern_type: 'high_user_activity',
          count,
          severity: 'info',
          description: `User ${user_id} has high activity (${count} events)`,
        });
      }
    });

    return analysis;
  }

  /**
   * Private helper methods
   */
  private routeToBuffer(entry: AuditLogEntry): void {
    switch (entry.severity) {
      case AuditSeverity.CRITICAL:
        this.criticalBuffer.push(entry);
        if (this.criticalBuffer.length >= this.CRITICAL_BUFFER_SIZE) {
          this.flushBuffer('critical');
        }
        break;
      case AuditSeverity.ERROR:
        this.highPriorityBuffer.push(entry);
        if (this.highPriorityBuffer.length >= this.HIGH_BUFFER_SIZE) {
          this.flushBuffer('high');
        }
        break;
      case AuditSeverity.WARNING:
        this.normalBuffer.push(entry);
        if (this.normalBuffer.length >= this.NORMAL_BUFFER_SIZE) {
          this.flushBuffer('normal');
        }
        break;
      default:
        this.lowPriorityBuffer.push(entry);
        if (this.lowPriorityBuffer.length >= this.LOW_BUFFER_SIZE) {
          this.flushBuffer('low');
        }
        break;
    }
  }

  private async flushBuffer(
    priority: 'critical' | 'high' | 'normal' | 'low',
  ): Promise<void> {
    let buffer: AuditLogEntry[];

    switch (priority) {
      case 'critical':
        buffer = [...this.criticalBuffer];
        this.criticalBuffer = [];
        break;
      case 'high':
        buffer = [...this.highPriorityBuffer];
        this.highPriorityBuffer = [];
        break;
      case 'normal':
        buffer = [...this.normalBuffer];
        this.normalBuffer = [];
        break;
      case 'low':
        buffer = [...this.lowPriorityBuffer];
        this.lowPriorityBuffer = [];
        break;
    }

    if (buffer.length === 0) return;

    try {
      const { error } = await supabase.from('audit_logs').insert(buffer);

      if (error) {
        console.error(`[AUDIT SERVICE] Flush error for ${priority}:`, error);
        // Return entries to buffer on failure
        switch (priority) {
          case 'critical':
            this.criticalBuffer.unshift(...buffer);
            break;
          case 'high':
            this.highPriorityBuffer.unshift(...buffer);
            break;
          case 'normal':
            this.normalBuffer.unshift(...buffer);
            break;
          case 'low':
            this.lowPriorityBuffer.unshift(...buffer);
            break;
        }
        this.metrics.failed_writes++;
      }
    } catch (error) {
      console.error(`[AUDIT SERVICE] Flush exception for ${priority}:`, error);
      this.metrics.failed_writes++;
    }
  }

  private startFlushIntervals(): void {
    // Critical buffer - immediate flush on fill, periodic flush for cleanup
    this.flushIntervals.set(
      'critical',
      setInterval(() => {
        this.flushBuffer('critical');
      }, this.CRITICAL_FLUSH_INTERVAL),
    );

    this.flushIntervals.set(
      'high',
      setInterval(() => {
        this.flushBuffer('high');
      }, this.HIGH_FLUSH_INTERVAL),
    );

    this.flushIntervals.set(
      'normal',
      setInterval(() => {
        this.flushBuffer('normal');
      }, this.NORMAL_FLUSH_INTERVAL),
    );

    this.flushIntervals.set(
      'low',
      setInterval(() => {
        this.flushBuffer('low');
      }, this.LOW_FLUSH_INTERVAL),
    );
  }

  private updateMetrics(entry: AuditLogEntry): void {
    this.metrics.total_events++;
    this.metrics.buffer_size = this.getTotalBufferSize();

    // Update events per second (simple moving average)
    const now = Date.now();
    this.metrics.events_per_second = this.calculateEventsPerSecond();
  }

  private getTotalBufferSize(): number {
    return (
      this.criticalBuffer.length +
      this.highPriorityBuffer.length +
      this.normalBuffer.length +
      this.lowPriorityBuffer.length
    );
  }

  private calculateEventsPerSecond(): number {
    // Simple calculation - in production, use a more sophisticated sliding window
    return Math.round(this.metrics.total_events / (Date.now() / 1000));
  }

  private classifyData(
    resource_type: string,
  ): 'public' | 'internal' | 'confidential' | 'restricted' {
    const sensitiveTypes = ['payment', 'financial', 'personal', 'medical'];
    const confidentialTypes = ['user', 'client', 'organization'];

    if (
      sensitiveTypes.some((type) => resource_type.toLowerCase().includes(type))
    ) {
      return 'restricted';
    }
    if (
      confidentialTypes.some((type) =>
        resource_type.toLowerCase().includes(type),
      )
    ) {
      return 'confidential';
    }
    return 'internal';
  }

  private async createSecurityAlert(
    event_type: AuditEventType,
    action: string,
    details: Record<string, any>,
    context?: AuditContext,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('system_alerts').insert({
        type: 'security',
        category: 'audit',
        message: `Security event detected: ${action}`,
        details: {
          event_type,
          audit_details: details,
          context,
        },
        acknowledged: false,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[AUDIT SERVICE] Security alert creation failed:', error);
      }
    } catch (error) {
      console.error('[AUDIT SERVICE] Security alert exception:', error);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log('[AUDIT SERVICE] Shutting down gracefully...');

      // Clear intervals
      this.flushIntervals.forEach((interval) => {
        clearInterval(interval);
      });

      // Flush all buffers
      await Promise.all([
        this.flushBuffer('critical'),
        this.flushBuffer('high'),
        this.flushBuffer('normal'),
        this.flushBuffer('low'),
      ]);

      console.log('[AUDIT SERVICE] Shutdown complete');
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('beforeExit', shutdown);
  }
}

// Export singleton instance
export const auditService = ComprehensiveAuditService.getInstance();
