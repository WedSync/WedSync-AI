import {
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from '@/lib/security/audit-logger';
import { AdminAuditEntry } from '@/lib/admin/auditLogger';

interface DatadogLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  ddsource: string;
  ddtags: string;
  timestamp: string;
  hostname: string;
  [key: string]: any;
}

interface DatadogMetrics {
  metric: string;
  points: Array<[number, number]>;
  tags: string[];
  type?: 'count' | 'gauge' | 'rate';
}

export class DatadogAuditLogger {
  private readonly apiKey: string;
  private readonly baseUrl: string =
    'https://http-intake.logs.datadoghq.com/v1/input';
  private readonly metricsUrl: string =
    'https://api.datadoghq.com/api/v1/series';
  private readonly service: string = 'wedsync-audit';
  private readonly hostname: string;
  private batchBuffer: DatadogLog[] = [];
  private metricsBuffer: DatadogMetrics[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly batchSize = 100;
  private readonly batchIntervalMs = 5000; // 5 seconds

  constructor() {
    this.apiKey = process.env.DATADOG_API_KEY || '';
    this.hostname = process.env.HOSTNAME || 'unknown-host';

    if (!this.apiKey) {
      console.warn(
        'DataDog API key not configured. Audit logging to DataDog will be disabled.',
      );
    }

    // Start batch processing
    this.scheduleBatchFlush();
  }

  /**
   * Log a security audit event to DataDog
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    if (!this.apiKey) {
      console.debug('DataDog not configured, skipping security event log');
      return;
    }

    try {
      const datadogLog = this.formatSecurityEvent(event);
      this.addToBatch(datadogLog);

      // Send metrics for critical events
      if (event.severity === SecurityEventSeverity.CRITICAL) {
        await this.sendMetric({
          metric: 'wedsync.audit.critical_events',
          points: [[Date.now() / 1000, 1]],
          tags: [
            `event_type:${event.event_type}`,
            `user_id:${event.user_id || 'unknown'}`,
            `severity:${event.severity}`,
          ],
          type: 'count',
        });
      }

      // Track event type metrics
      await this.sendMetric({
        metric: 'wedsync.audit.events',
        points: [[Date.now() / 1000, 1]],
        tags: [`event_type:${event.event_type}`, `severity:${event.severity}`],
        type: 'count',
      });
    } catch (error) {
      console.error('Failed to log security event to DataDog:', error);
    }
  }

  /**
   * Log an admin audit event to DataDog
   */
  async logAdminEvent(event: AdminAuditEntry): Promise<void> {
    if (!this.apiKey) {
      console.debug('DataDog not configured, skipping admin event log');
      return;
    }

    try {
      const datadogLog = this.formatAdminEvent(event);
      this.addToBatch(datadogLog);

      // Send metrics for failed admin actions
      if (event.status === 'failed' || event.status === 'error') {
        await this.sendMetric({
          metric: 'wedsync.audit.admin_failures',
          points: [[Date.now() / 1000, 1]],
          tags: [
            `action:${event.action}`,
            `admin:${event.adminId}`,
            `status:${event.status}`,
            `mfa_required:${event.requiresMFA}`,
          ],
          type: 'count',
        });
      }

      // Track MFA events
      if (event.requiresMFA) {
        await this.sendMetric({
          metric: 'wedsync.audit.mfa_events',
          points: [[Date.now() / 1000, 1]],
          tags: [`action:${event.action}`, `status:${event.status}`],
          type: 'count',
        });
      }
    } catch (error) {
      console.error('Failed to log admin event to DataDog:', error);
    }
  }

  /**
   * Log a custom audit event with structured data
   */
  async logCustomEvent(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    if (!this.apiKey) {
      console.debug('DataDog not configured, skipping custom event log');
      return;
    }

    try {
      const datadogLog: DatadogLog = {
        level,
        message,
        service: this.service,
        ddsource: 'wedsync-custom-audit',
        ddtags: `env:${process.env.NODE_ENV || 'unknown'},service:${this.service}`,
        timestamp: new Date().toISOString(),
        hostname: this.hostname,
        ...data,
        audit_category: 'custom',
        application: 'wedsync',
      };

      this.addToBatch(datadogLog);
    } catch (error) {
      console.error('Failed to log custom event to DataDog:', error);
    }
  }

  /**
   * Log compliance-related events
   */
  async logComplianceEvent(
    eventType:
      | 'gdpr_request'
      | 'data_breach'
      | 'consent_change'
      | 'data_export'
      | 'data_deletion',
    details: Record<string, any>,
  ): Promise<void> {
    if (!this.apiKey) {
      console.debug('DataDog not configured, skipping compliance event log');
      return;
    }

    try {
      const datadogLog: DatadogLog = {
        level: eventType === 'data_breach' ? 'error' : 'info',
        message: `Compliance event: ${eventType}`,
        service: this.service,
        ddsource: 'wedsync-compliance',
        ddtags: `env:${process.env.NODE_ENV},compliance:true,event_type:${eventType}`,
        timestamp: new Date().toISOString(),
        hostname: this.hostname,
        ...details,
        audit_category: 'compliance',
        compliance_event_type: eventType,
        application: 'wedsync',
      };

      this.addToBatch(datadogLog);

      // Send compliance metrics
      await this.sendMetric({
        metric: 'wedsync.compliance.events',
        points: [[Date.now() / 1000, 1]],
        tags: [`event_type:${eventType}`, 'category:compliance'],
        type: 'count',
      });
    } catch (error) {
      console.error('Failed to log compliance event to DataDog:', error);
    }
  }

  /**
   * Send performance metrics for audit system
   */
  async logPerformanceMetrics(metrics: {
    auditLogLatency?: number;
    eventsPerSecond?: number;
    databaseConnections?: number;
    errorRate?: number;
  }): Promise<void> {
    if (!this.apiKey) return;

    try {
      const timestamp = Date.now() / 1000;
      const performanceMetrics: DatadogMetrics[] = [];

      if (metrics.auditLogLatency !== undefined) {
        performanceMetrics.push({
          metric: 'wedsync.audit.latency',
          points: [[timestamp, metrics.auditLogLatency]],
          tags: ['service:audit'],
          type: 'gauge',
        });
      }

      if (metrics.eventsPerSecond !== undefined) {
        performanceMetrics.push({
          metric: 'wedsync.audit.events_per_second',
          points: [[timestamp, metrics.eventsPerSecond]],
          tags: ['service:audit'],
          type: 'gauge',
        });
      }

      if (metrics.databaseConnections !== undefined) {
        performanceMetrics.push({
          metric: 'wedsync.audit.database_connections',
          points: [[timestamp, metrics.databaseConnections]],
          tags: ['service:audit'],
          type: 'gauge',
        });
      }

      if (metrics.errorRate !== undefined) {
        performanceMetrics.push({
          metric: 'wedsync.audit.error_rate',
          points: [[timestamp, metrics.errorRate]],
          tags: ['service:audit'],
          type: 'gauge',
        });
      }

      // Send all performance metrics
      await Promise.all(
        performanceMetrics.map((metric) => this.sendMetric(metric)),
      );
    } catch (error) {
      console.error('Failed to log performance metrics to DataDog:', error);
    }
  }

  /**
   * Create DataDog dashboard query for audit events
   */
  buildDashboardQuery(eventType?: string, timeRange: string = '1h'): string {
    let query = `logs("service:${this.service}")`;

    if (eventType) {
      query += ` AND @event_type:${eventType}`;
    }

    query += ` | group by [event_type], @severity | count() by [event_type, severity]`;

    return query;
  }

  /**
   * Format security event for DataDog
   */
  private formatSecurityEvent(event: SecurityEvent): DatadogLog {
    const severity = this.mapSecuritySeverityToLogLevel(event.severity);

    return {
      level: severity,
      message: `Security Event: ${event.event_type} - ${event.description}`,
      service: this.service,
      ddsource: 'wedsync-security-audit',
      ddtags: `env:${process.env.NODE_ENV},event_type:${event.event_type},severity:${event.severity}`,
      timestamp: event.created_at?.toISOString() || new Date().toISOString(),
      hostname: this.hostname,
      event_type: event.event_type,
      severity: event.severity,
      user_id: event.user_id,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      metadata: event.metadata,
      audit_category: 'security',
      application: 'wedsync',
    };
  }

  /**
   * Format admin event for DataDog
   */
  private formatAdminEvent(event: AdminAuditEntry): DatadogLog {
    const level = event.status === 'success' ? 'info' : 'warn';

    return {
      level,
      message: `Admin Action: ${event.action} by ${event.adminEmail} - ${event.status}`,
      service: this.service,
      ddsource: 'wedsync-admin-audit',
      ddtags: `env:${process.env.NODE_ENV},action:${event.action},status:${event.status},mfa:${event.requiresMFA}`,
      timestamp: event.timestamp,
      hostname: this.hostname,
      admin_id: event.adminId,
      admin_email: event.adminEmail,
      action: event.action,
      status: event.status,
      details: event.details,
      client_ip: event.clientIP,
      requires_mfa: event.requiresMFA,
      user_agent: event.userAgent,
      audit_category: 'admin',
      application: 'wedsync',
    };
  }

  /**
   * Map security severity to log level
   */
  private mapSecuritySeverityToLogLevel(
    severity: SecurityEventSeverity,
  ): 'info' | 'warn' | 'error' | 'debug' {
    switch (severity) {
      case SecurityEventSeverity.CRITICAL:
        return 'error';
      case SecurityEventSeverity.HIGH:
        return 'error';
      case SecurityEventSeverity.MEDIUM:
        return 'warn';
      case SecurityEventSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * Add log to batch buffer
   */
  private addToBatch(log: DatadogLog): void {
    this.batchBuffer.push(log);

    if (this.batchBuffer.length >= this.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * Schedule batch flush
   */
  private scheduleBatchFlush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
      this.scheduleBatchFlush();
    }, this.batchIntervalMs);
  }

  /**
   * Flush batch buffer to DataDog
   */
  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      const response = await fetch(this.baseUrl + '/' + this.apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.apiKey,
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(
          `DataDog API error: ${response.status} ${response.statusText}`,
        );
      }

      console.debug(`Successfully sent ${batch.length} audit logs to DataDog`);
    } catch (error) {
      console.error('Failed to send batch to DataDog:', error);

      // Re-queue failed logs (with limit to prevent infinite growth)
      if (this.batchBuffer.length < this.batchSize * 2) {
        this.batchBuffer.unshift(...batch.slice(0, this.batchSize));
      }
    }
  }

  /**
   * Send metric to DataDog
   */
  private async sendMetric(metric: DatadogMetrics): Promise<void> {
    try {
      const response = await fetch(this.metricsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          series: [metric],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `DataDog Metrics API error: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error('Failed to send metric to DataDog:', error);
    }
  }

  /**
   * Clean shutdown - flush remaining logs
   */
  async shutdown(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Final flush
    if (this.batchBuffer.length > 0) {
      await this.flushBatch();
    }
  }

  /**
   * Health check for DataDog integration
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.apiKey) {
      return { healthy: false, message: 'DataDog API key not configured' };
    }

    try {
      // Send a test log
      await this.logCustomEvent('debug', 'DataDog health check', {
        check_time: new Date().toISOString(),
        service_status: 'healthy',
      });

      return { healthy: true, message: 'DataDog integration healthy' };
    } catch (error) {
      return {
        healthy: false,
        message: `DataDog integration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const datadogAuditLogger = new DatadogAuditLogger();

// Graceful shutdown handling
process.on('SIGINT', () => {
  datadogAuditLogger.shutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  datadogAuditLogger.shutdown().finally(() => process.exit(0));
});
