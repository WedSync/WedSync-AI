import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import crypto from 'crypto';

// Audit Event Types
export const AUDIT_EVENT_TYPES = {
  // Privacy & Compliance
  PRIVACY_REQUEST: 'privacy_request',
  CONSENT_CHANGE: 'consent_change',
  DATA_ACCESS: 'data_access',
  DATA_EXPORT: 'data_export',
  DATA_DELETION: 'data_deletion',
  DATA_BREACH: 'data_breach',

  // Authentication & Authorization
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PERMISSION_CHANGE: 'permission_change',
  ROLE_ASSIGNMENT: 'role_assignment',

  // Data Operations
  DATA_CREATE: 'data_create',
  DATA_UPDATE: 'data_update',
  DATA_DELETE: 'data_delete',
  BULK_OPERATION: 'bulk_operation',

  // System Events
  SYSTEM_ERROR: 'system_error',
  SECURITY_VIOLATION: 'security_violation',
  COMPLIANCE_CHECK: 'compliance_check',
} as const;

export type AuditEventType =
  (typeof AUDIT_EVENT_TYPES)[keyof typeof AUDIT_EVENT_TYPES];

// Risk Levels
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

export interface AuditEvent {
  id?: string;
  event_type: AuditEventType;
  actor_id: string;
  actor_type: 'user' | 'system' | 'admin' | 'vendor';
  resource_type: string;
  resource_id: string;
  action: string;
  timestamp: Date;
  risk_level: RiskLevel;
  metadata: Record<string, any>;
  context: {
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    request_id?: string;
    wedding_id?: string;
  };
  hash: string;
  previous_hash?: string;
  signature?: string;
  created_at: Date;
}

export interface AuditTrailVerification {
  isValid: boolean;
  totalEvents: number;
  brokenChainAt?: string;
  tamperedEvents?: string[];
  verificationTime: Date;
}

export interface ComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  eventCounts: Record<AuditEventType, number>;
  riskDistribution: Record<RiskLevel, number>;
  privacyRequests: number;
  dataBreaches: number;
  consentChanges: number;
  complianceScore: number;
  recommendations: string[];
}

export class TamperProofAuditLogger {
  private supabase = createClientComponentClient();
  private secretKey: string;

  constructor() {
    // In production, this should come from secure environment variables
    this.secretKey = process.env.AUDIT_SIGNING_KEY || 'development-key-only';
  }

  /**
   * Log a privacy-related event
   */
  async logPrivacyEvent(event: {
    action: string;
    userId: string;
    requestType?: string;
    requestId?: string;
    processorId?: string;
    riskLevel?: RiskLevel;
    metadata?: Record<string, any>;
    context?: Partial<AuditEvent['context']>;
  }): Promise<void> {
    const auditEvent: Partial<AuditEvent> = {
      event_type: AUDIT_EVENT_TYPES.PRIVACY_REQUEST,
      actor_id: event.processorId || event.userId,
      actor_type: event.processorId ? 'admin' : 'user',
      resource_type: 'privacy_request',
      resource_id: event.requestId || 'unknown',
      action: event.action,
      risk_level: event.riskLevel || RISK_LEVELS.MEDIUM,
      metadata: {
        request_type: event.requestType,
        data_subject_id: event.userId,
        processor_id: event.processorId,
        ...event.metadata,
      },
      context: event.context || {},
    };

    await this.logEvent(auditEvent);
  }

  /**
   * Log consent change events
   */
  async logConsentChange(event: {
    userId: string;
    consentType: string;
    previousValue: boolean;
    newValue: boolean;
    purpose: string;
    legalBasis: string;
    metadata?: Record<string, any>;
    context?: Partial<AuditEvent['context']>;
  }): Promise<void> {
    const riskLevel = event.newValue ? RISK_LEVELS.LOW : RISK_LEVELS.MEDIUM;

    const auditEvent: Partial<AuditEvent> = {
      event_type: AUDIT_EVENT_TYPES.CONSENT_CHANGE,
      actor_id: event.userId,
      actor_type: 'user',
      resource_type: 'consent',
      resource_id: `${event.userId}_${event.consentType}`,
      action: event.newValue ? 'GRANT' : 'WITHDRAW',
      risk_level: riskLevel,
      metadata: {
        consent_type: event.consentType,
        previous_value: event.previousValue,
        new_value: event.newValue,
        purpose: event.purpose,
        legal_basis: event.legalBasis,
        ...event.metadata,
      },
      context: event.context || {},
    };

    await this.logEvent(auditEvent);
  }

  /**
   * Log data access events
   */
  async logDataAccess(event: {
    userId: string;
    accessedBy: string;
    resourceType: string;
    resourceId: string;
    purpose: string;
    dataTypes: string[];
    metadata?: Record<string, any>;
    context?: Partial<AuditEvent['context']>;
  }): Promise<void> {
    // Determine risk level based on data sensitivity
    const riskLevel = this.calculateDataAccessRisk(
      event.dataTypes,
      event.resourceType,
    );

    const auditEvent: Partial<AuditEvent> = {
      event_type: AUDIT_EVENT_TYPES.DATA_ACCESS,
      actor_id: event.accessedBy,
      actor_type: this.determineActorType(event.accessedBy),
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      action: 'READ',
      risk_level: riskLevel,
      metadata: {
        data_subject_id: event.userId,
        purpose: event.purpose,
        data_types: event.dataTypes,
        access_granted: true,
        ...event.metadata,
      },
      context: event.context || {},
    };

    await this.logEvent(auditEvent);
  }

  /**
   * Log data breach incidents
   */
  async logDataBreach(event: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedUsers: number;
    dataTypes: string[];
    discoveryMethod: string;
    containmentMeasures: string[];
    notificationRequired: boolean;
    metadata?: Record<string, any>;
    context?: Partial<AuditEvent['context']>;
  }): Promise<void> {
    const auditEvent: Partial<AuditEvent> = {
      event_type: AUDIT_EVENT_TYPES.DATA_BREACH,
      actor_id: 'system',
      actor_type: 'system',
      resource_type: 'data_breach',
      resource_id: crypto.randomUUID(),
      action: 'DETECTED',
      risk_level: event.severity as RiskLevel,
      metadata: {
        affected_users: event.affectedUsers,
        data_types: event.dataTypes,
        discovery_method: event.discoveryMethod,
        containment_measures: event.containmentMeasures,
        notification_required: event.notificationRequired,
        ...event.metadata,
      },
      context: event.context || {},
    };

    await this.logEvent(auditEvent);

    // Trigger breach notification workflow if required
    if (event.notificationRequired) {
      await this.triggerBreachNotification(auditEvent);
    }
  }

  /**
   * Log system security violations
   */
  async logSecurityViolation(event: {
    violationType: string;
    severity: RiskLevel;
    actorId: string;
    description: string;
    preventedAction: string;
    metadata?: Record<string, any>;
    context?: Partial<AuditEvent['context']>;
  }): Promise<void> {
    const auditEvent: Partial<AuditEvent> = {
      event_type: AUDIT_EVENT_TYPES.SECURITY_VIOLATION,
      actor_id: event.actorId,
      actor_type: 'user',
      resource_type: 'security',
      resource_id: 'system',
      action: event.violationType,
      risk_level: event.severity,
      metadata: {
        description: event.description,
        prevented_action: event.preventedAction,
        violation_type: event.violationType,
        ...event.metadata,
      },
      context: event.context || {},
    };

    await this.logEvent(auditEvent);
  }

  /**
   * Core event logging with tamper-proof features
   */
  private async logEvent(event: Partial<AuditEvent>): Promise<AuditEvent> {
    try {
      // Get the last event's hash for chain integrity
      const previousHash = await this.getLastEventHash();

      // Create complete event object
      const completeEvent: AuditEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        previous_hash: previousHash,
        created_at: new Date(),
      } as AuditEvent;

      // Generate tamper-proof hash
      completeEvent.hash = this.generateEventHash(completeEvent);

      // Generate cryptographic signature
      completeEvent.signature = this.signEvent(completeEvent);

      // Store in database
      const { data, error } = await this.supabase
        .from('audit_trail')
        .insert(this.serializeEvent(completeEvent))
        .select()
        .single();

      if (error) {
        console.error('Failed to log audit event:', error);
        throw new Error('Audit logging failed');
      }

      return completeEvent;
    } catch (error) {
      console.error('Audit logging error:', error);

      // Critical: Audit logging failure should be escalated
      await this.escalateAuditFailure(event, error);
      throw error;
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditTrailIntegrity(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditTrailVerification> {
    try {
      let query = this.supabase
        .from('audit_trail')
        .select('*')
        .order('timestamp', { ascending: true });

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data: events, error } = await query;

      if (error) throw error;

      const verification: AuditTrailVerification = {
        isValid: true,
        totalEvents: events?.length || 0,
        verificationTime: new Date(),
      };

      if (!events || events.length === 0) {
        return verification;
      }

      const tamperedEvents: string[] = [];

      // Verify hash chain integrity
      for (let i = 1; i < events.length; i++) {
        const currentEvent = events[i];
        const previousEvent = events[i - 1];

        // Check hash chain
        if (currentEvent.previous_hash !== previousEvent.hash) {
          verification.isValid = false;
          if (!verification.brokenChainAt) {
            verification.brokenChainAt = currentEvent.id;
          }
        }

        // Verify individual event hash
        const calculatedHash = this.generateEventHash(currentEvent);
        if (calculatedHash !== currentEvent.hash) {
          verification.isValid = false;
          tamperedEvents.push(currentEvent.id);
        }

        // Verify cryptographic signature if present
        if (
          currentEvent.signature &&
          !this.verifyEventSignature(currentEvent)
        ) {
          verification.isValid = false;
          tamperedEvents.push(currentEvent.id);
        }
      }

      if (tamperedEvents.length > 0) {
        verification.tamperedEvents = tamperedEvents;
      }

      return verification;
    } catch (error) {
      console.error('Audit trail verification failed:', error);
      throw new Error('Failed to verify audit trail');
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReport> {
    try {
      const { data: events, error } = await this.supabase
        .from('audit_trail')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) throw error;

      const report: ComplianceReport = {
        period: { start: startDate, end: endDate },
        eventCounts: {} as Record<AuditEventType, number>,
        riskDistribution: {} as Record<RiskLevel, number>,
        privacyRequests: 0,
        dataBreaches: 0,
        consentChanges: 0,
        complianceScore: 0,
        recommendations: [],
      };

      // Initialize counters
      Object.values(AUDIT_EVENT_TYPES).forEach((type) => {
        report.eventCounts[type] = 0;
      });
      Object.values(RISK_LEVELS).forEach((level) => {
        report.riskDistribution[level] = 0;
      });

      // Process events
      events?.forEach((event) => {
        report.eventCounts[event.event_type as AuditEventType]++;
        report.riskDistribution[event.risk_level as RiskLevel]++;

        if (event.event_type === AUDIT_EVENT_TYPES.PRIVACY_REQUEST) {
          report.privacyRequests++;
        }
        if (event.event_type === AUDIT_EVENT_TYPES.DATA_BREACH) {
          report.dataBreaches++;
        }
        if (event.event_type === AUDIT_EVENT_TYPES.CONSENT_CHANGE) {
          report.consentChanges++;
        }
      });

      // Calculate compliance score (0-100)
      report.complianceScore = this.calculateComplianceScore(report);

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Compliance report generation failed');
    }
  }

  /**
   * Search audit events with filters
   */
  async searchAuditEvents(filters: {
    eventType?: AuditEventType;
    actorId?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    riskLevel?: RiskLevel;
    limit?: number;
  }): Promise<AuditEvent[]> {
    try {
      let query = this.supabase
        .from('audit_trail')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.actorId) {
        query = query.eq('actor_id', filters.actorId);
      }
      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }
      if (filters.riskLevel) {
        query = query.eq('risk_level', filters.riskLevel);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Audit search failed:', error);
      throw new Error('Failed to search audit events');
    }
  }

  /**
   * Helper methods
   */
  private async getLastEventHash(): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('audit_trail')
        .select('hash')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Failed to get last event hash:', error);
      }

      return data?.hash || null;
    } catch (error) {
      return null;
    }
  }

  private generateEventHash(event: AuditEvent): string {
    const eventString = JSON.stringify({
      event_type: event.event_type,
      actor_id: event.actor_id,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      action: event.action,
      timestamp: event.timestamp,
      metadata: event.metadata,
      previous_hash: event.previous_hash,
    });

    return crypto.createHash('sha256').update(eventString).digest('hex');
  }

  private signEvent(event: AuditEvent): string {
    const eventData = JSON.stringify({
      hash: event.hash,
      timestamp: event.timestamp,
      event_type: event.event_type,
    });

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(eventData)
      .digest('hex');
  }

  private verifyEventSignature(event: AuditEvent): boolean {
    if (!event.signature) return false;

    const expectedSignature = this.signEvent(event);
    return crypto.timingSafeEqual(
      Buffer.from(event.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  private calculateDataAccessRisk(
    dataTypes: string[],
    resourceType: string,
  ): RiskLevel {
    const sensitiveData = [
      'personal_data',
      'financial_data',
      'health_data',
      'biometric_data',
    ];
    const hasSensitiveData = dataTypes.some((type) =>
      sensitiveData.includes(type),
    );

    if (hasSensitiveData) return RISK_LEVELS.HIGH;
    if (resourceType === 'guest_data') return RISK_LEVELS.MEDIUM;
    return RISK_LEVELS.LOW;
  }

  private determineActorType(actorId: string): AuditEvent['actor_type'] {
    // This would typically check the user's role/permissions
    if (actorId === 'system') return 'system';
    // Add logic to determine if user is admin, vendor, etc.
    return 'user';
  }

  private calculateComplianceScore(report: ComplianceReport): number {
    let score = 100;

    // Deduct points for high-risk events
    score -= report.riskDistribution[RISK_LEVELS.CRITICAL] * 20;
    score -= report.riskDistribution[RISK_LEVELS.HIGH] * 10;
    score -= report.dataBreaches * 25;

    // Bonus points for good practices
    if (report.consentChanges > 0) score += 5;
    if (report.privacyRequests > 0) score += 3;

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(report: ComplianceReport): string[] {
    const recommendations: string[] = [];

    if (report.dataBreaches > 0) {
      recommendations.push('Review and strengthen data security measures');
    }
    if (report.riskDistribution[RISK_LEVELS.HIGH] > 10) {
      recommendations.push(
        'Investigate high-risk activities and implement additional controls',
      );
    }
    if (report.consentChanges === 0) {
      recommendations.push('Consider reviewing consent management processes');
    }
    if (report.complianceScore < 80) {
      recommendations.push(
        'Implement additional compliance monitoring and controls',
      );
    }

    return recommendations;
  }

  private serializeEvent(event: AuditEvent): any {
    return {
      ...event,
      timestamp: event.timestamp.toISOString(),
      created_at: event.created_at.toISOString(),
    };
  }

  private async triggerBreachNotification(
    event: Partial<AuditEvent>,
  ): Promise<void> {
    // Implementation would trigger breach notification workflow
    console.log('Breach notification triggered for event:', event.id);
  }

  private async escalateAuditFailure(
    event: Partial<AuditEvent>,
    error: any,
  ): Promise<void> {
    // Implementation would escalate audit logging failures
    console.error('CRITICAL: Audit logging failure escalated:', {
      event,
      error,
    });
  }
}

// Export singleton instance
export const auditLogger = new TamperProofAuditLogger();
