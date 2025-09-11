/**
 * WS-155: Audit Trail Service
 * Team C - Batch 15 - Round 3
 * Comprehensive communication audit trail logging
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType: string;
  resourceId: string;
  action: string;
  details: any;
  metadata: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  compliance?: string[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface CommunicationAuditEntry {
  messageId: string;
  messageType: 'email' | 'sms' | 'push' | 'slack' | 'whatsapp';
  sender: string;
  recipients: string[];
  subject?: string;
  contentHash: string;
  provider: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
  timestamp: Date;
  deliveryTime?: number;
  ipAddress?: string;
  userAgent?: string;
  complianceChecks: any[];
  privacyFlags: string[];
  weddingContext?: {
    clientId: string;
    weddingDate: Date;
    timeToWedding: number;
    urgency: string;
  };
}

export interface DataAccessAuditEntry {
  accessId: string;
  userId: string;
  dataType: string;
  resourceId: string;
  operation: 'read' | 'write' | 'delete' | 'export';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  purpose: string;
  lawfulBasis?: string;
  dataSubjects?: string[];
  retention?: {
    policy: string;
    expiryDate: Date;
  };
}

export interface ComplianceAuditEntry {
  checkId: string;
  messageId: string;
  regulation: 'CAN-SPAM' | 'GDPR' | 'CCPA' | 'PECR';
  checkType: string;
  result: 'pass' | 'fail' | 'warning';
  violations: string[];
  timestamp: Date;
  remediation?: string;
  reviewedBy?: string;
  reviewDate?: Date;
}

export class AuditTrailService {
  private supabase: SupabaseClient;
  private redis: Redis;
  private encryptionKey: string;
  private retentionPolicies: Map<string, number>;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.encryptionKey =
      process.env.AUDIT_ENCRYPTION_KEY || 'default-audit-key-32chars!!!!!';

    // Define retention policies (in days)
    this.retentionPolicies = new Map([
      ['communication', 2555], // 7 years
      ['data_access', 2555], // 7 years
      ['compliance', 2555], // 7 years
      ['security', 2920], // 8 years
      ['financial', 2555], // 7 years
      ['general', 1095], // 3 years
    ]);
  }

  /**
   * Log communication event
   */
  public async logCommunication(
    entry: Partial<CommunicationAuditEntry>,
  ): Promise<void> {
    const auditEntry: CommunicationAuditEntry = {
      messageId: entry.messageId || crypto.randomUUID(),
      messageType: entry.messageType || 'email',
      sender: entry.sender || '',
      recipients: entry.recipients || [],
      subject: entry.subject,
      contentHash: entry.contentHash || this.hashContent(entry),
      provider: entry.provider || '',
      status: entry.status || 'queued',
      timestamp: new Date(),
      deliveryTime: entry.deliveryTime,
      ipAddress: this.hashIP(entry.ipAddress || ''),
      userAgent: entry.userAgent,
      complianceChecks: entry.complianceChecks || [],
      privacyFlags: entry.privacyFlags || [],
      weddingContext: entry.weddingContext,
    };

    // Store in database
    await this.supabase.from('communication_audit_logs').insert({
      message_id: auditEntry.messageId,
      message_type: auditEntry.messageType,
      sender: auditEntry.sender,
      recipients: JSON.stringify(auditEntry.recipients),
      subject: auditEntry.subject,
      content_hash: auditEntry.contentHash,
      provider: auditEntry.provider,
      status: auditEntry.status,
      timestamp: auditEntry.timestamp,
      delivery_time: auditEntry.deliveryTime,
      ip_address_hash: auditEntry.ipAddress,
      user_agent: auditEntry.userAgent,
      compliance_checks: JSON.stringify(auditEntry.complianceChecks),
      privacy_flags: JSON.stringify(auditEntry.privacyFlags),
      wedding_context: auditEntry.weddingContext
        ? JSON.stringify(auditEntry.weddingContext)
        : null,
    });

    // Store in Redis for real-time access
    await this.redis.lpush(
      'audit:communications:recent',
      JSON.stringify(auditEntry),
    );

    // Trim to last 1000 entries
    await this.redis.ltrim('audit:communications:recent', 0, 999);

    // Create general audit event
    await this.logAuditEvent({
      eventType: 'communication',
      userId: entry.sender,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      resourceType: 'message',
      resourceId: auditEntry.messageId,
      action: `${auditEntry.messageType}_${auditEntry.status}`,
      details: {
        provider: auditEntry.provider,
        recipientCount: auditEntry.recipients.length,
        deliveryTime: auditEntry.deliveryTime,
      },
      metadata: {
        weddingContext: auditEntry.weddingContext,
        complianceChecks: auditEntry.complianceChecks.length,
      },
      severity: this.determineSeverity(auditEntry),
      compliance: this.extractComplianceTypes(auditEntry.complianceChecks),
      dataClassification: this.classifyData(auditEntry),
    });
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    entry: Partial<DataAccessAuditEntry>,
  ): Promise<void> {
    const auditEntry: DataAccessAuditEntry = {
      accessId: entry.accessId || crypto.randomUUID(),
      userId: entry.userId || '',
      dataType: entry.dataType || '',
      resourceId: entry.resourceId || '',
      operation: entry.operation || 'read',
      timestamp: new Date(),
      ipAddress: this.hashIP(entry.ipAddress || ''),
      userAgent: entry.userAgent || '',
      purpose: entry.purpose || '',
      lawfulBasis: entry.lawfulBasis,
      dataSubjects: entry.dataSubjects,
      retention: entry.retention,
    };

    // Store in database
    await this.supabase.from('data_access_audit_logs').insert({
      access_id: auditEntry.accessId,
      user_id: auditEntry.userId,
      data_type: auditEntry.dataType,
      resource_id: auditEntry.resourceId,
      operation: auditEntry.operation,
      timestamp: auditEntry.timestamp,
      ip_address_hash: auditEntry.ipAddress,
      user_agent: auditEntry.userAgent,
      purpose: auditEntry.purpose,
      lawful_basis: auditEntry.lawfulBasis,
      data_subjects: auditEntry.dataSubjects
        ? JSON.stringify(auditEntry.dataSubjects)
        : null,
      retention_policy: auditEntry.retention
        ? JSON.stringify(auditEntry.retention)
        : null,
    });

    // Create general audit event
    await this.logAuditEvent({
      eventType: 'data_access',
      userId: auditEntry.userId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      resourceType: auditEntry.dataType,
      resourceId: auditEntry.resourceId,
      action: auditEntry.operation,
      details: {
        purpose: auditEntry.purpose,
        lawfulBasis: auditEntry.lawfulBasis,
        dataSubjectCount: auditEntry.dataSubjects?.length || 0,
      },
      metadata: {
        retention: auditEntry.retention,
      },
      severity: this.determineDataAccessSeverity(auditEntry),
      compliance: ['GDPR', 'CCPA'],
      dataClassification: this.classifyDataAccess(auditEntry),
    });
  }

  /**
   * Log compliance check result
   */
  public async logComplianceCheck(
    entry: Partial<ComplianceAuditEntry>,
  ): Promise<void> {
    const auditEntry: ComplianceAuditEntry = {
      checkId: entry.checkId || crypto.randomUUID(),
      messageId: entry.messageId || '',
      regulation: entry.regulation || 'CAN-SPAM',
      checkType: entry.checkType || '',
      result: entry.result || 'pass',
      violations: entry.violations || [],
      timestamp: new Date(),
      remediation: entry.remediation,
      reviewedBy: entry.reviewedBy,
      reviewDate: entry.reviewDate,
    };

    // Store in database
    await this.supabase.from('compliance_audit_logs').insert({
      check_id: auditEntry.checkId,
      message_id: auditEntry.messageId,
      regulation: auditEntry.regulation,
      check_type: auditEntry.checkType,
      result: auditEntry.result,
      violations: JSON.stringify(auditEntry.violations),
      timestamp: auditEntry.timestamp,
      remediation: auditEntry.remediation,
      reviewed_by: auditEntry.reviewedBy,
      review_date: auditEntry.reviewDate,
    });

    // Alert on compliance failures
    if (auditEntry.result === 'fail') {
      await this.alertComplianceFailure(auditEntry);
    }

    // Create general audit event
    await this.logAuditEvent({
      eventType: 'compliance_check',
      resourceType: 'message',
      resourceId: auditEntry.messageId,
      action: `${auditEntry.regulation.toLowerCase()}_${auditEntry.result}`,
      details: {
        regulation: auditEntry.regulation,
        checkType: auditEntry.checkType,
        violations: auditEntry.violations,
      },
      metadata: {
        remediation: auditEntry.remediation,
        reviewStatus: auditEntry.reviewedBy ? 'reviewed' : 'pending',
      },
      severity: auditEntry.result === 'fail' ? 'high' : 'low',
      compliance: [auditEntry.regulation],
      dataClassification: 'internal',
    });
  }

  /**
   * Log general audit event
   */
  public async logAuditEvent(entry: Partial<AuditEvent>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: entry.id || crypto.randomUUID(),
      timestamp: new Date(),
      eventType: entry.eventType || 'general',
      userId: entry.userId,
      sessionId: entry.sessionId,
      ipAddress: entry.ipAddress ? this.hashIP(entry.ipAddress) : undefined,
      userAgent: entry.userAgent,
      resourceType: entry.resourceType || '',
      resourceId: entry.resourceId || '',
      action: entry.action || '',
      details: entry.details || {},
      metadata: entry.metadata || {},
      severity: entry.severity || 'low',
      compliance: entry.compliance || [],
      dataClassification: entry.dataClassification || 'internal',
    };

    // Encrypt sensitive data
    const encryptedDetails = this.encryptData(
      JSON.stringify(auditEvent.details),
    );
    const encryptedMetadata = this.encryptData(
      JSON.stringify(auditEvent.metadata),
    );

    // Store in database
    await this.supabase.from('audit_events').insert({
      event_id: auditEvent.id,
      timestamp: auditEvent.timestamp,
      event_type: auditEvent.eventType,
      user_id: auditEvent.userId,
      session_id: auditEvent.sessionId,
      ip_address_hash: auditEvent.ipAddress,
      user_agent: auditEvent.userAgent,
      resource_type: auditEvent.resourceType,
      resource_id: auditEvent.resourceId,
      action: auditEvent.action,
      details_encrypted: encryptedDetails,
      metadata_encrypted: encryptedMetadata,
      severity: auditEvent.severity,
      compliance_types: JSON.stringify(auditEvent.compliance),
      data_classification: auditEvent.dataClassification,
    });

    // Store in Redis for real-time monitoring
    await this.redis.lpush(
      `audit:events:${auditEvent.severity}`,
      JSON.stringify({
        id: auditEvent.id,
        timestamp: auditEvent.timestamp,
        eventType: auditEvent.eventType,
        action: auditEvent.action,
        severity: auditEvent.severity,
      }),
    );

    // Trim to last 100 events per severity level
    await this.redis.ltrim(`audit:events:${auditEvent.severity}`, 0, 99);

    // Real-time alerting for high severity events
    if (auditEvent.severity === 'critical' || auditEvent.severity === 'high') {
      await this.sendRealTimeAlert(auditEvent);
    }
  }

  /**
   * Query audit trail
   */
  public async queryAuditTrail(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    eventType?: string;
    resourceType?: string;
    action?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditEvent[]> {
    let query = this.supabase.from('audit_events').select('*');

    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate.toISOString());
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    query = query
      .order('timestamp', { ascending: false })
      .range(
        filters.offset || 0,
        (filters.offset || 0) + (filters.limit || 100) - 1,
      );

    const { data, error } = await query;
    if (error) throw error;

    return (
      data?.map((record) => ({
        id: record.event_id,
        timestamp: new Date(record.timestamp),
        eventType: record.event_type,
        userId: record.user_id,
        sessionId: record.session_id,
        ipAddress: record.ip_address_hash,
        userAgent: record.user_agent,
        resourceType: record.resource_type,
        resourceId: record.resource_id,
        action: record.action,
        details: JSON.parse(this.decryptData(record.details_encrypted)),
        metadata: JSON.parse(this.decryptData(record.metadata_encrypted)),
        severity: record.severity,
        compliance: JSON.parse(record.compliance_types || '[]'),
        dataClassification: record.data_classification,
      })) || []
    );
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    regulation: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Get compliance checks
    const { data: checks } = await this.supabase
      .from('compliance_audit_logs')
      .select('*')
      .eq('regulation', regulation)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    // Get related communications
    const messageIds = checks?.map((c) => c.message_id) || [];
    let communications = [];

    if (messageIds.length > 0) {
      const { data: comms } = await this.supabase
        .from('communication_audit_logs')
        .select('*')
        .in('message_id', messageIds);
      communications = comms || [];
    }

    // Calculate metrics
    const totalChecks = checks?.length || 0;
    const passedChecks = checks?.filter((c) => c.result === 'pass').length || 0;
    const failedChecks = checks?.filter((c) => c.result === 'fail').length || 0;
    const complianceRate =
      totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

    // Group violations by type
    const violationsByType: any = {};
    checks?.forEach((check) => {
      if (check.result === 'fail') {
        const violations = JSON.parse(check.violations || '[]');
        violations.forEach((violation: string) => {
          violationsByType[violation] = (violationsByType[violation] || 0) + 1;
        });
      }
    });

    return {
      regulation,
      period: { startDate, endDate },
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        complianceRate: complianceRate.toFixed(2),
      },
      violations: {
        byType: violationsByType,
        total: failedChecks,
      },
      communications: communications.length,
      recommendations: this.generateComplianceRecommendations(
        regulation,
        violationsByType,
        complianceRate,
      ),
    };
  }

  /**
   * Export audit data
   */
  public async exportAuditData(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const events = await this.queryAuditTrail({
      startDate,
      endDate,
      limit: 10000,
    });

    if (format === 'csv') {
      return this.convertToCSV(events);
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Data retention cleanup
   */
  public async cleanupExpiredAuditData(): Promise<void> {
    for (const [eventType, retentionDays] of this.retentionPolicies) {
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
      );

      try {
        // Archive before deletion (if needed)
        await this.archiveAuditData(eventType, cutoffDate);

        // Delete expired data
        await this.supabase
          .from('audit_events')
          .delete()
          .eq('event_type', eventType)
          .lt('timestamp', cutoffDate.toISOString());

        console.log(
          `Cleaned up ${eventType} audit data older than ${retentionDays} days`,
        );
      } catch (error) {
        console.error(`Failed to cleanup ${eventType} audit data:`, error);
      }
    }
  }

  // Private helper methods

  private hashContent(entry: any): string {
    const content = entry.subject || entry.body || JSON.stringify(entry);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private hashIP(ip: string): string {
    if (!ip) return '';
    return crypto.createHash('sha256').update(ip).digest('hex');
  }

  private encryptData(data: string): string {
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptData(encryptedData: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt audit data:', error);
      return '{}';
    }
  }

  private determineSeverity(
    entry: CommunicationAuditEntry,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (
      entry.status === 'failed' &&
      entry.complianceChecks.some((c) => !c.passed)
    ) {
      return 'high';
    }
    if (entry.privacyFlags.length > 0) {
      return 'medium';
    }
    return 'low';
  }

  private determineDataAccessSeverity(
    entry: DataAccessAuditEntry,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (entry.operation === 'delete' || entry.operation === 'export') {
      return 'high';
    }
    if (entry.dataType.includes('pii') || entry.dataType.includes('personal')) {
      return 'medium';
    }
    return 'low';
  }

  private extractComplianceTypes(checks: any[]): string[] {
    return [...new Set(checks.map((c) => c.regulation).filter(Boolean))];
  }

  private classifyData(
    entry: CommunicationAuditEntry,
  ): 'public' | 'internal' | 'confidential' | 'restricted' {
    if (
      entry.privacyFlags.includes('pii') ||
      entry.privacyFlags.includes('financial')
    ) {
      return 'restricted';
    }
    if (entry.weddingContext) {
      return 'confidential';
    }
    return 'internal';
  }

  private classifyDataAccess(
    entry: DataAccessAuditEntry,
  ): 'public' | 'internal' | 'confidential' | 'restricted' {
    if (
      entry.dataType.includes('pii') ||
      entry.dataType.includes('financial')
    ) {
      return 'restricted';
    }
    if (entry.dataType.includes('personal')) {
      return 'confidential';
    }
    return 'internal';
  }

  private async alertComplianceFailure(
    entry: ComplianceAuditEntry,
  ): Promise<void> {
    // Send alert to compliance team
    console.log('Compliance failure alert:', {
      regulation: entry.regulation,
      messageId: entry.messageId,
      violations: entry.violations,
    });

    // Store in high priority alert queue
    await this.redis.lpush(
      'alerts:compliance:high',
      JSON.stringify({
        checkId: entry.checkId,
        regulation: entry.regulation,
        violations: entry.violations,
        timestamp: entry.timestamp,
      }),
    );
  }

  private async sendRealTimeAlert(event: AuditEvent): Promise<void> {
    // Send to monitoring system
    console.log('High severity audit event:', {
      id: event.id,
      eventType: event.eventType,
      action: event.action,
      severity: event.severity,
    });

    // Store in alert queue for processing
    await this.redis.lpush(
      `alerts:security:${event.severity}`,
      JSON.stringify({
        eventId: event.id,
        eventType: event.eventType,
        action: event.action,
        timestamp: event.timestamp,
      }),
    );
  }

  private generateComplianceRecommendations(
    regulation: string,
    violations: any,
    complianceRate: number,
  ): string[] {
    const recommendations = [];

    if (complianceRate < 95) {
      recommendations.push(
        `Compliance rate below 95% for ${regulation} - review procedures`,
      );
    }

    Object.entries(violations).forEach(([violation, count]) => {
      if ((count as number) > 10) {
        recommendations.push(
          `High frequency of "${violation}" violations - implement preventive measures`,
        );
      }
    });

    if (regulation === 'GDPR' && violations['no_consent']) {
      recommendations.push(
        'Implement explicit consent collection for all personal data processing',
      );
    }

    if (regulation === 'CAN-SPAM' && violations['missing_unsubscribe']) {
      recommendations.push(
        'Ensure all marketing emails include clear unsubscribe mechanisms',
      );
    }

    return recommendations;
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'ID',
      'Timestamp',
      'Event Type',
      'User ID',
      'Resource Type',
      'Resource ID',
      'Action',
      'Severity',
    ];
    const rows = events.map((event) => [
      event.id,
      event.timestamp.toISOString(),
      event.eventType,
      event.userId || '',
      event.resourceType,
      event.resourceId,
      event.action,
      event.severity,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private async archiveAuditData(
    eventType: string,
    cutoffDate: Date,
  ): Promise<void> {
    // Implementation would archive data to long-term storage
    console.log(
      `Archiving ${eventType} audit data before ${cutoffDate.toISOString()}`,
    );
  }

  /**
   * Get audit trail statistics
   */
  public async getAuditStatistics(days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: events } = await this.supabase
      .from('audit_events')
      .select('event_type, severity, timestamp')
      .gte('timestamp', startDate.toISOString());

    const { data: communications } = await this.supabase
      .from('communication_audit_logs')
      .select('message_type, status, timestamp')
      .gte('timestamp', startDate.toISOString());

    const { data: compliance } = await this.supabase
      .from('compliance_audit_logs')
      .select('regulation, result, timestamp')
      .gte('timestamp', startDate.toISOString());

    return {
      period: { days, startDate, endDate: new Date() },
      events: {
        total: events?.length || 0,
        byType: this.groupBy(events || [], 'event_type'),
        bySeverity: this.groupBy(events || [], 'severity'),
      },
      communications: {
        total: communications?.length || 0,
        byType: this.groupBy(communications || [], 'message_type'),
        byStatus: this.groupBy(communications || [], 'status'),
      },
      compliance: {
        total: compliance?.length || 0,
        byRegulation: this.groupBy(compliance || [], 'regulation'),
        byResult: this.groupBy(compliance || [], 'result'),
      },
    };
  }

  private groupBy(array: any[], key: string): any {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }
}

export default AuditTrailService;
