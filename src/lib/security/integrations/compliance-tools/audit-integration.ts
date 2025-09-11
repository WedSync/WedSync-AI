/**
 * WS-190: Audit Integration for WedSync Incident Response
 *
 * Comprehensive audit logging and integration system for security incidents,
 * compliance requirements, and regulatory reporting for the wedding platform.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';

// Audit configuration
const AuditConfigSchema = z.object({
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  enableRealTimeLogging: z.boolean().default(true),
  retentionPeriodDays: z.number().default(2555), // 7 years for compliance
  encryptLogs: z.boolean().default(true),
  complianceMode: z.boolean().default(true),
  maxLogSize: z.number().default(10485760), // 10MB
  logRotationInterval: z.number().default(86400000), // 24 hours
  enableRemoteLogging: z.boolean().default(true),
  remoteLogEndpoint: z.string().url().optional(),
});

type AuditConfig = z.infer<typeof AuditConfigSchema>;

// Audit event structure
interface AuditEvent {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'security' | 'compliance' | 'access' | 'data' | 'system' | 'user';
  event_type: string;
  source: string;
  actor: {
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    role?: string;
  };
  target: {
    resource_type?: string;
    resource_id?: string;
    wedding_id?: string;
    supplier_id?: string;
  };
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  details: Record<string, unknown>;
  risk_score: number; // 0-100
  compliance_tags: string[];
  retention_class: 'standard' | 'extended' | 'permanent';
}

// Wedding day incident audit event
interface WeddingDayAuditEvent extends AuditEvent {
  wedding_context: {
    wedding_date: string;
    venue_id?: string;
    coordinator_id?: string;
    guest_count?: number;
    supplier_count?: number;
    emergency_contacts?: string[];
  };
  business_impact: {
    severity: 'minimal' | 'moderate' | 'significant' | 'severe';
    affected_services: string[];
    estimated_financial_impact?: number;
    reputation_impact?: 'low' | 'medium' | 'high';
  };
}

// Compliance report structure
interface ComplianceReport {
  id: string;
  period: {
    start: Date;
    end: Date;
  };
  report_type:
    | 'security_incidents'
    | 'data_breaches'
    | 'access_violations'
    | 'full_audit';
  summary: {
    total_events: number;
    critical_events: number;
    compliance_violations: number;
    resolved_incidents: number;
    avg_resolution_time: number;
  };
  incidents_by_category: Record<string, number>;
  trends: {
    incident_frequency: number[];
    severity_distribution: Record<string, number>;
    response_time_trends: number[];
  };
  recommendations: string[];
  generated_at: Date;
  next_review_date: Date;
}

// Metrics for monitoring
interface AuditMetrics {
  events_logged_24h: number;
  critical_events_24h: number;
  avg_response_time: number;
  compliance_score: number;
  log_storage_used: number;
  retention_policy_compliance: number;
}

/**
 * Comprehensive audit integration system for wedding platform security
 * Provides centralized logging, compliance reporting, and regulatory audit support
 */
export class AuditIntegration {
  private config: AuditConfig;
  private eventBuffer: AuditEvent[] = [];
  private metricsCache: Map<string, unknown> = new Map();
  private logRotationTimer: NodeJS.Timeout | null = null;

  // Risk scoring weights for different event types
  private readonly riskWeights = {
    data_breach: 100,
    unauthorized_access: 90,
    payment_fraud: 95,
    compliance_violation: 80,
    venue_security: 75,
    supplier_compromise: 70,
    platform_outage: 60,
    failed_login: 30,
    permission_denied: 20,
    system_error: 10,
  };

  // Compliance frameworks we need to support
  private readonly complianceFrameworks = [
    'GDPR',
    'PCI_DSS',
    'ISO_27001',
    'SOC_2',
    'UK_DPA',
    'WEDDING_INDUSTRY_STANDARDS',
  ];

  constructor() {
    // Load configuration from environment variables
    this.config = AuditConfigSchema.parse({
      logLevel:
        (process.env.AUDIT_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
        'info',
      enableRealTimeLogging: process.env.AUDIT_REAL_TIME !== 'false',
      retentionPeriodDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'),
      encryptLogs: process.env.AUDIT_ENCRYPT_LOGS !== 'false',
      complianceMode: process.env.AUDIT_COMPLIANCE_MODE !== 'false',
      maxLogSize: parseInt(process.env.AUDIT_MAX_LOG_SIZE || '10485760'),
      logRotationInterval: parseInt(
        process.env.AUDIT_ROTATION_INTERVAL || '86400000',
      ),
      enableRemoteLogging: process.env.AUDIT_REMOTE_LOGGING !== 'false',
      remoteLogEndpoint: process.env.AUDIT_REMOTE_ENDPOINT,
    });

    // Initialize log rotation if enabled
    if (this.config.logRotationInterval > 0) {
      this.initializeLogRotation();
    }
  }

  /**
   * Log security incident for audit trail and compliance
   */
  async logIncident(incident: Incident): Promise<string> {
    const auditEvent: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: incident.timestamp,
      level: this.mapSeverityToLogLevel(incident.severity),
      category: 'security',
      event_type: 'security_incident',
      source: 'wedsync-security',
      actor: {
        user_id: 'system',
        session_id: 'security-system',
      },
      target: {
        resource_type: 'platform',
        wedding_id: incident.weddingId,
        supplier_id: incident.supplierId,
        resource_id: incident.id,
      },
      action: `${incident.type}_detected`,
      outcome: 'success', // Detection was successful
      details: {
        incident_id: incident.id,
        incident_type: incident.type,
        severity: incident.severity,
        title: incident.title,
        description: incident.description,
        affected_users_count: incident.affectedUsers.length,
        metadata: incident.metadata || {},
      },
      risk_score: this.calculateRiskScore(incident),
      compliance_tags: this.generateComplianceTags(incident),
      retention_class: this.determineRetentionClass(incident),
    };

    return this.logEvent(auditEvent);
  }

  /**
   * Log wedding day specific incident with enhanced context
   */
  async logWeddingDayIncident(incident: Incident): Promise<string> {
    const weddingAuditEvent: WeddingDayAuditEvent = {
      ...(await this.createBaseAuditEvent(incident)),
      wedding_context: {
        wedding_date: new Date().toISOString().split('T')[0], // Today's date
        venue_id: incident.venueId,
        guest_count: await this.getWeddingGuestCount(incident.weddingId),
        supplier_count: await this.getWeddingSupplierCount(incident.weddingId),
        emergency_contacts: await this.getEmergencyContacts(incident.weddingId),
      },
      business_impact: {
        severity: this.assessBusinessImpact(incident),
        affected_services: this.identifyAffectedServices(incident),
        estimated_financial_impact: this.estimateFinancialImpact(incident),
        reputation_impact: this.assessReputationImpact(incident),
      },
    };

    return this.logEvent(weddingAuditEvent);
  }

  /**
   * Log user access and permission events
   */
  async logAccessEvent(
    userId: string,
    action: string,
    resource: string,
    outcome: 'success' | 'failure',
    details: Record<string, unknown> = {},
  ): Promise<string> {
    const auditEvent: AuditEvent = {
      id: `access-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level: outcome === 'failure' ? 'warn' : 'info',
      category: 'access',
      event_type: 'access_attempt',
      source: 'wedsync-auth',
      actor: {
        user_id: userId,
        ip_address: details.ip_address as string,
        user_agent: details.user_agent as string,
        session_id: details.session_id as string,
      },
      target: {
        resource_type: 'api_endpoint',
        resource_id: resource,
      },
      action,
      outcome,
      details,
      risk_score: outcome === 'failure' ? 40 : 10,
      compliance_tags: ['ACCESS_CONTROL', 'AUTHENTICATION'],
      retention_class: 'standard',
    };

    return this.logEvent(auditEvent);
  }

  /**
   * Log data processing events for GDPR compliance
   */
  async logDataProcessing(
    operation: string,
    dataType: string,
    userId?: string,
    legalBasis?: string,
    purpose?: string,
  ): Promise<string> {
    const auditEvent: AuditEvent = {
      id: `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level: 'info',
      category: 'data',
      event_type: 'data_processing',
      source: 'wedsync-data',
      actor: {
        user_id: userId || 'system',
      },
      target: {
        resource_type: 'personal_data',
        resource_id: dataType,
      },
      action: operation,
      outcome: 'success',
      details: {
        data_type: dataType,
        legal_basis: legalBasis || 'legitimate_interest',
        processing_purpose: purpose || 'wedding_service_provision',
        timestamp: new Date().toISOString(),
      },
      risk_score: 15,
      compliance_tags: ['GDPR', 'DATA_PROCESSING', 'PRIVACY'],
      retention_class: 'extended',
    };

    return this.logEvent(auditEvent);
  }

  /**
   * Log error events for monitoring and debugging
   */
  async logError(error: {
    type: string;
    message: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const auditEvent: AuditEvent = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: error.timestamp,
      level: 'error',
      category: 'system',
      event_type: 'system_error',
      source: 'wedsync-system',
      actor: {
        user_id: 'system',
      },
      target: {
        resource_type: 'system_component',
      },
      action: 'error_occurred',
      outcome: 'failure',
      details: {
        error_type: error.type,
        error_message: error.message,
        metadata: error.metadata || {},
      },
      risk_score: 25,
      compliance_tags: ['SYSTEM_MONITORING'],
      retention_class: 'standard',
    };

    return this.logEvent(auditEvent);
  }

  /**
   * Record performance and operational metrics
   */
  async recordMetrics(metrics: {
    processingTimeMs: number;
    responseCount: number;
    timestamp: Date;
    activeIncidents: number;
  }): Promise<string> {
    const auditEvent: AuditEvent = {
      id: `metrics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metrics.timestamp,
      level: 'info',
      category: 'system',
      event_type: 'performance_metrics',
      source: 'wedsync-monitoring',
      actor: {
        user_id: 'system',
      },
      target: {
        resource_type: 'system_performance',
      },
      action: 'metrics_recorded',
      outcome: 'success',
      details: {
        processing_time_ms: metrics.processingTimeMs,
        response_count: metrics.responseCount,
        active_incidents: metrics.activeIncidents,
        timestamp: metrics.timestamp.toISOString(),
      },
      risk_score: 0,
      compliance_tags: ['PERFORMANCE', 'MONITORING'],
      retention_class: 'standard',
    };

    return this.logEvent(auditEvent);
  }

  /**
   * Generate compliance report for audit purposes
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType:
      | 'security_incidents'
      | 'data_breaches'
      | 'access_violations'
      | 'full_audit',
  ): Promise<ComplianceReport> {
    // In a real implementation, this would query the audit log database
    // For now, return a mock report structure

    const reportId = `compliance-report-${Date.now()}`;

    const report: ComplianceReport = {
      id: reportId,
      period: {
        start: startDate,
        end: endDate,
      },
      report_type: reportType,
      summary: {
        total_events: 1250,
        critical_events: 15,
        compliance_violations: 2,
        resolved_incidents: 13,
        avg_resolution_time: 45, // minutes
      },
      incidents_by_category: {
        security: 45,
        access: 890,
        data: 215,
        system: 100,
      },
      trends: {
        incident_frequency: [10, 12, 8, 15, 20, 18, 14], // Weekly counts
        severity_distribution: {
          critical: 3,
          high: 12,
          medium: 25,
          low: 45,
          info: 165,
        },
        response_time_trends: [30, 35, 40, 45, 42, 38, 35], // Average response times in minutes
      },
      recommendations: [
        'Implement additional monitoring for payment fraud detection',
        'Enhance user training on security best practices',
        'Review and update incident response procedures',
        'Consider implementing automated threat detection',
      ],
      generated_at: new Date(),
      next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };

    // Log report generation
    await this.logEvent({
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level: 'info',
      category: 'compliance',
      event_type: 'report_generated',
      source: 'wedsync-audit',
      actor: { user_id: 'system' },
      target: { resource_type: 'compliance_report', resource_id: reportId },
      action: 'generate_report',
      outcome: 'success',
      details: {
        report_id: reportId,
        report_type: reportType,
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
        total_events: report.summary.total_events,
      },
      risk_score: 0,
      compliance_tags: ['COMPLIANCE_REPORTING', 'AUDIT'],
      retention_class: 'permanent',
    });

    return report;
  }

  /**
   * Get current audit metrics for monitoring dashboard
   */
  async getAuditMetrics(): Promise<AuditMetrics> {
    // In a real implementation, this would calculate from audit logs
    return {
      events_logged_24h: 1250,
      critical_events_24h: 5,
      avg_response_time: 45,
      compliance_score: 95.5,
      log_storage_used: 2.5 * 1024 * 1024 * 1024, // 2.5 GB
      retention_policy_compliance: 100,
    };
  }

  /**
   * Search audit logs with filters
   */
  async searchAuditLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    level?: string;
    category?: string;
    userId?: string;
    eventType?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    // In a real implementation, this would query the audit database
    // For now, return empty array
    console.log('Searching audit logs with filters:', filters);
    return [];
  }

  /**
   * Core event logging method
   */
  private async logEvent(event: AuditEvent): Promise<string> {
    // Encrypt sensitive data if required
    if (this.config.encryptLogs) {
      event = this.encryptSensitiveFields(event);
    }

    // Add to buffer for batching
    this.eventBuffer.push(event);

    // Real-time logging if enabled
    if (this.config.enableRealTimeLogging) {
      await this.writeEventToLog(event);
    }

    // Remote logging if enabled
    if (this.config.enableRemoteLogging && this.config.remoteLogEndpoint) {
      await this.sendToRemoteLog(event);
    }

    // Flush buffer if it gets too large
    if (this.eventBuffer.length > 100) {
      await this.flushEventBuffer();
    }

    return event.id;
  }

  /**
   * Helper methods for audit event creation and processing
   */
  private async createBaseAuditEvent(incident: Incident): Promise<AuditEvent> {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: incident.timestamp,
      level: this.mapSeverityToLogLevel(incident.severity),
      category: 'security',
      event_type: 'security_incident',
      source: 'wedsync-security',
      actor: {
        user_id: 'system',
        session_id: 'security-system',
      },
      target: {
        resource_type: 'platform',
        wedding_id: incident.weddingId,
        supplier_id: incident.supplierId,
        resource_id: incident.id,
      },
      action: `${incident.type}_detected`,
      outcome: 'success',
      details: {
        incident_id: incident.id,
        incident_type: incident.type,
        severity: incident.severity,
        title: incident.title,
        description: incident.description,
        affected_users_count: incident.affectedUsers.length,
        metadata: incident.metadata || {},
      },
      risk_score: this.calculateRiskScore(incident),
      compliance_tags: this.generateComplianceTags(incident),
      retention_class: this.determineRetentionClass(incident),
    };
  }

  private mapSeverityToLogLevel(
    severity: string,
  ): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }

  private calculateRiskScore(incident: Incident): number {
    const baseScore =
      this.riskWeights[incident.type as keyof typeof this.riskWeights] || 50;

    // Adjust based on affected users
    const userMultiplier = Math.min(incident.affectedUsers.length / 100, 2);

    // Wedding day incidents get higher risk scores
    const weddingMultiplier = incident.weddingId ? 1.5 : 1;

    return Math.min(
      Math.round(baseScore * userMultiplier * weddingMultiplier),
      100,
    );
  }

  private generateComplianceTags(incident: Incident): string[] {
    const tags = ['SECURITY_INCIDENT'];

    if (incident.type === 'data_breach') {
      tags.push('GDPR', 'DATA_BREACH', 'PRIVACY');
    }

    if (incident.type === 'payment_fraud') {
      tags.push('PCI_DSS', 'FINANCIAL');
    }

    if (incident.weddingId) {
      tags.push('WEDDING_DATA');
    }

    tags.push('ISO_27001', 'SOC_2');

    return tags;
  }

  private determineRetentionClass(
    incident: Incident,
  ): 'standard' | 'extended' | 'permanent' {
    if (incident.type === 'data_breach' || incident.severity === 'critical') {
      return 'permanent';
    }

    if (incident.type === 'payment_fraud') {
      return 'extended';
    }

    return 'standard';
  }

  private encryptSensitiveFields(event: AuditEvent): AuditEvent {
    // In a real implementation, this would encrypt sensitive fields
    // For now, just mark as encrypted
    if (event.details.metadata) {
      event.details.metadata = { encrypted: true };
    }
    return event;
  }

  private async writeEventToLog(event: AuditEvent): Promise<void> {
    // In a real implementation, this would write to log files or database
    console.log('Audit event logged:', JSON.stringify(event, null, 2));
  }

  private async sendToRemoteLog(event: AuditEvent): Promise<void> {
    if (!this.config.remoteLogEndpoint) return;

    try {
      await fetch(this.config.remoteLogEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AUDIT_REMOTE_TOKEN || ''}`,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      console.error('Failed to send audit event to remote endpoint:', error);
    }
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    // In a real implementation, this would batch write to storage
    console.log(`Flushing ${this.eventBuffer.length} audit events to storage`);
    this.eventBuffer = [];
  }

  private initializeLogRotation(): void {
    this.logRotationTimer = setInterval(async () => {
      await this.rotateAuditLogs();
    }, this.config.logRotationInterval);
  }

  private async rotateAuditLogs(): Promise<void> {
    console.log('Rotating audit logs...');
    await this.flushEventBuffer();
    // In a real implementation, this would archive old logs and create new ones
  }

  // Mock methods for wedding-specific data (would query database in real implementation)
  private async getWeddingGuestCount(
    weddingId?: string,
  ): Promise<number | undefined> {
    return weddingId ? 150 : undefined;
  }

  private async getWeddingSupplierCount(
    weddingId?: string,
  ): Promise<number | undefined> {
    return weddingId ? 8 : undefined;
  }

  private async getEmergencyContacts(
    weddingId?: string,
  ): Promise<string[] | undefined> {
    return weddingId
      ? ['coordinator@venue.com', '+44 20 7946 0958']
      : undefined;
  }

  private assessBusinessImpact(
    incident: Incident,
  ): 'minimal' | 'moderate' | 'significant' | 'severe' {
    if (incident.severity === 'critical') return 'severe';
    if (incident.severity === 'high') return 'significant';
    if (incident.severity === 'medium') return 'moderate';
    return 'minimal';
  }

  private identifyAffectedServices(incident: Incident): string[] {
    const services = ['WedSync Platform'];

    if (incident.type === 'payment_fraud') {
      services.push('Payment Processing', 'Billing System');
    }

    if (incident.weddingId) {
      services.push('Wedding Management', 'Supplier Communication');
    }

    return services;
  }

  private estimateFinancialImpact(incident: Incident): number | undefined {
    // Rough estimates based on incident type and severity
    if (incident.type === 'payment_fraud' && incident.severity === 'critical') {
      return 50000; // £50k potential fraud
    }

    if (incident.type === 'platform_outage') {
      return 10000; // £10k lost revenue
    }

    return undefined;
  }

  private assessReputationImpact(
    incident: Incident,
  ): 'low' | 'medium' | 'high' {
    if (incident.severity === 'critical' || incident.type === 'data_breach') {
      return 'high';
    }

    if (incident.severity === 'high' || incident.weddingId) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Cleanup resources on shutdown
   */
  async cleanup(): Promise<void> {
    if (this.logRotationTimer) {
      clearInterval(this.logRotationTimer);
      this.logRotationTimer = null;
    }

    await this.flushEventBuffer();
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuditConfig {
    return { ...this.config };
  }
}
