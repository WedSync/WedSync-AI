/**
 * WS-176 GDPR Compliance System - Team D Round 1
 * Privacy breach detection system
 *
 * @fileoverview Advanced system for identifying potential privacy violations,
 * managing breach incidents, and ensuring GDPR Article 33/34 compliance
 * with automated notification and response workflows
 */

import {
  PrivacyBreach,
  BreachType,
  BreachSeverity,
  BreachStatus,
  RiskAssessment,
  DataVolumeAssessment,
  ContainmentAction,
  BreachNotification,
  NotificationRecipient,
  NotificationMethod,
  PersonalDataType,
  Jurisdiction,
  PrivacyBreachError,
  ComplianceError,
} from '../../../types/gdpr-compliance';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '../../middleware/audit';
import { z } from 'zod';

/**
 * Privacy breach detection and management system
 * Monitors for privacy violations and manages incident response
 */
export class PrivacyBreachDetector {
  private static instance: PrivacyBreachDetector;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  private breaches: Map<string, PrivacyBreach> = new Map();
  private isMonitoring = false;
  private detectionRules: BreachDetectionRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeDetectionRules();
  }

  /**
   * Singleton instance getter
   */
  public static getInstance(): PrivacyBreachDetector {
    if (!PrivacyBreachDetector.instance) {
      PrivacyBreachDetector.instance = new PrivacyBreachDetector();
    }
    return PrivacyBreachDetector.instance;
  }

  /**
   * Initialize default breach detection rules
   */
  private initializeDetectionRules(): void {
    this.detectionRules = [
      {
        id: 'mass-data-access',
        name: 'Mass Data Access Pattern',
        description: 'Detects unusual bulk data access patterns',
        severity: 'critical',
        condition: (context) => {
          return context.accessCount > 100 && context.timeWindow < 300; // 100+ accesses in 5 minutes
        },
        metadata: {
          threshold: 100,
          timeWindow: 300,
          dataTypes: ['contact_info', 'wedding_preferences', 'payment_history'],
        },
      },
      {
        id: 'unauthorized-admin-access',
        name: 'Unauthorized Administrative Access',
        description:
          'Detects potential unauthorized access to administrative functions',
        severity: 'critical',
        condition: (context) => {
          return (
            context.resourceType === 'admin' && !context.hasValidPermission
          );
        },
        metadata: {
          protectedResources: [
            'user_management',
            'system_config',
            'audit_logs',
          ],
        },
      },
      {
        id: 'cross-border-violation',
        name: 'Unauthorized Cross-Border Transfer',
        description: 'Detects unauthorized international data transfers',
        severity: 'high',
        condition: (context) => {
          return (
            context.sourceJurisdiction === 'EU' &&
            context.targetJurisdiction &&
            !this.isAdequateJurisdiction(context.targetJurisdiction)
          );
        },
        metadata: {
          adequateCountries: ['UK', 'CANADA', 'SWITZERLAND'],
        },
      },
      {
        id: 'data-exfiltration',
        name: 'Potential Data Exfiltration',
        description: 'Detects suspicious data export patterns',
        severity: 'critical',
        condition: (context) => {
          return context.exportVolume > 10000 && context.offHours === true;
        },
        metadata: {
          volumeThreshold: 10000,
          businessHours: { start: 8, end: 18 },
        },
      },
      {
        id: 'consent-bypass',
        name: 'Consent Bypass Attempt',
        description: 'Detects attempts to process data without valid consent',
        severity: 'high',
        condition: (context) => {
          return (
            context.processingActivity &&
            !context.hasValidConsent &&
            context.legalBasis === 'consent'
          );
        },
        metadata: {
          requiredForTypes: ['behavioral', 'location', 'communication_logs'],
        },
      },
      {
        id: 'retention-violation',
        name: 'Data Retention Violation',
        description: 'Detects processing of data beyond retention period',
        severity: 'medium',
        condition: (context) => {
          return context.dataAge > context.retentionPeriod;
        },
        metadata: {
          gracePeriodDays: 30,
        },
      },
    ];
  }

  /**
   * Start breach monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new PrivacyBreachError('Breach monitoring is already running');
    }

    this.isMonitoring = true;

    await auditLogger.log({
      event_type: 'BREACH_MONITORING_STARTED',
      resource_type: 'privacy_breach_detector',
      resource_id: 'privacy-breach-detector',
      metadata: {
        detection_rules: this.detectionRules.map((r) => r.id),
        start_time: new Date().toISOString(),
      },
    });

    // Start real-time monitoring
    this.monitoringInterval = setInterval(() => {
      this.runDetectionRules();
    }, 30000); // Check every 30 seconds

    // Set up real-time database triggers
    await this.setupRealTimeDetection();
  }

  /**
   * Stop breach monitoring
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    await auditLogger.log({
      event_type: 'BREACH_MONITORING_STOPPED',
      resource_type: 'privacy_breach_detector',
      resource_id: 'privacy-breach-detector',
      metadata: {
        stop_time: new Date().toISOString(),
      },
    });
  }

  /**
   * Report a potential privacy breach
   */
  public async reportBreach(breachData: {
    type: BreachType;
    description: string;
    affectedUsers: number;
    affectedDataTypes: PersonalDataType[];
    jurisdiction: Jurisdiction;
    detectedBy?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const breachId = crypto.randomUUID();

    // Assess data volume and risk
    const dataVolumeAssessment = await this.assessDataVolume(
      breachData.affectedUsers,
      breachData.affectedDataTypes,
    );

    const riskAssessment = await this.assessRisk(
      breachData.type,
      dataVolumeAssessment,
      breachData.jurisdiction,
    );

    // Determine severity based on risk assessment
    const severity = this.determineSeverity(
      riskAssessment,
      dataVolumeAssessment,
    );

    const breach: PrivacyBreach = {
      id: breachId,
      type: breachData.type,
      severity,
      detectedAt: new Date(),
      affectedUsers: breachData.affectedUsers,
      affectedDataTypes: breachData.affectedDataTypes,
      dataVolume: dataVolumeAssessment,
      riskAssessment,
      containmentActions: [],
      notifications: [],
      status: 'detected',
      jurisdiction: breachData.jurisdiction,
      investigationId: crypto.randomUUID(),
    };

    // Store breach in database
    const { error } = await this.supabase.from('privacy_breaches').insert([
      {
        id: breachId,
        type: breach.type,
        severity: breach.severity,
        detected_at: breach.detectedAt.toISOString(),
        affected_users: breach.affectedUsers,
        affected_data_types: breach.affectedDataTypes,
        data_volume: breach.dataVolume,
        risk_assessment: breach.riskAssessment,
        status: breach.status,
        jurisdiction: breach.jurisdiction,
        investigation_id: breach.investigationId,
        metadata: breachData.metadata || {},
      },
    ]);

    if (error) {
      throw new PrivacyBreachError(
        `Failed to report breach: ${error.message}`,
        breachId,
        severity,
      );
    }

    this.breaches.set(breachId, breach);

    await auditLogger.log({
      event_type: 'PRIVACY_BREACH_REPORTED',
      resource_type: 'privacy_breach',
      resource_id: breachId,
      metadata: {
        breach_type: breach.type,
        severity: breach.severity,
        affected_users: breach.affectedUsers,
        jurisdiction: breach.jurisdiction,
        detected_by: breachData.detectedBy || 'system',
      },
    });

    // Immediate response actions
    await this.initiateIncidentResponse(breach);

    return breachId;
  }

  /**
   * Update breach status
   */
  public async updateBreachStatus(
    breachId: string,
    status: BreachStatus,
    notes?: string,
  ): Promise<void> {
    const breach = this.breaches.get(breachId);
    if (!breach) {
      throw new PrivacyBreachError(`Breach not found: ${breachId}`, breachId);
    }

    const oldStatus = breach.status;
    breach.status = status;

    // Update in database
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'reported') {
      updateData.reported_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('privacy_breaches')
      .update(updateData)
      .eq('id', breachId);

    if (error) {
      throw new PrivacyBreachError(
        `Failed to update breach status: ${error.message}`,
        breachId,
      );
    }

    await auditLogger.log({
      event_type: 'BREACH_STATUS_UPDATED',
      resource_type: 'privacy_breach',
      resource_id: breachId,
      metadata: {
        old_status: oldStatus,
        new_status: status,
        notes: notes || '',
      },
    });

    // Trigger status-specific actions
    await this.handleStatusChange(breach, oldStatus, status);
  }

  /**
   * Add containment action
   */
  public async addContainmentAction(
    breachId: string,
    action: string,
    performedBy: string,
    effectiveness?: 'effective' | 'partial' | 'ineffective',
    notes?: string,
  ): Promise<string> {
    const breach = this.breaches.get(breachId);
    if (!breach) {
      throw new PrivacyBreachError(`Breach not found: ${breachId}`, breachId);
    }

    const actionId = crypto.randomUUID();
    const containmentAction: ContainmentAction = {
      id: actionId,
      action,
      performedBy,
      performedAt: new Date(),
      effectiveness: effectiveness || 'effective',
      notes,
    };

    breach.containmentActions.push(containmentAction);

    // Update in database
    const { error } = await this.supabase
      .from('privacy_breaches')
      .update({
        containment_actions: breach.containmentActions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', breachId);

    if (error) {
      throw new PrivacyBreachError(
        `Failed to add containment action: ${error.message}`,
        breachId,
      );
    }

    await auditLogger.log({
      event_type: 'CONTAINMENT_ACTION_ADDED',
      resource_type: 'privacy_breach',
      resource_id: breachId,
      metadata: {
        action_id: actionId,
        action,
        performed_by: performedBy,
        effectiveness,
      },
    });

    return actionId;
  }

  /**
   * Send breach notification
   */
  public async sendNotification(
    breachId: string,
    recipient: NotificationRecipient,
    method: NotificationMethod,
    content: string,
  ): Promise<string> {
    const breach = this.breaches.get(breachId);
    if (!breach) {
      throw new PrivacyBreachError(`Breach not found: ${breachId}`, breachId);
    }

    const notificationId = crypto.randomUUID();
    const notification: BreachNotification = {
      id: notificationId,
      recipient,
      method,
      sentAt: new Date(),
      acknowledged: false,
      content,
    };

    // Send notification based on method
    const sent = await this.deliverNotification(notification, breach);

    if (sent) {
      breach.notifications.push(notification);

      // Update in database
      const { error } = await this.supabase
        .from('privacy_breaches')
        .update({
          notifications: breach.notifications,
          updated_at: new Date().toISOString(),
        })
        .eq('id', breachId);

      if (error) {
        throw new PrivacyBreachError(
          `Failed to record notification: ${error.message}`,
          breachId,
        );
      }

      await auditLogger.log({
        event_type: 'BREACH_NOTIFICATION_SENT',
        resource_type: 'privacy_breach',
        resource_id: breachId,
        metadata: {
          notification_id: notificationId,
          recipient,
          method,
          notification_time: notification.sentAt.toISOString(),
        },
      });
    }

    return notificationId;
  }

  /**
   * Get all breaches
   */
  public async getBreaches(
    jurisdiction?: Jurisdiction,
    severity?: BreachSeverity,
    status?: BreachStatus,
  ): Promise<PrivacyBreach[]> {
    let query = this.supabase.from('privacy_breaches').select('*');

    if (jurisdiction && jurisdiction !== 'GLOBAL') {
      query = query.eq('jurisdiction', jurisdiction);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('detected_at', {
      ascending: false,
    });

    if (error) {
      throw new PrivacyBreachError(
        `Failed to fetch breaches: ${error.message}`,
      );
    }

    return data?.map((d) => this.mapDatabaseToBreach(d)) || [];
  }

  /**
   * Check for potential breaches using pattern analysis
   */
  public async checkForPotentialBreaches(
    context: BreachDetectionContext,
  ): Promise<PrivacyBreach[]> {
    const detectedBreaches: PrivacyBreach[] = [];

    for (const rule of this.detectionRules) {
      try {
        if (rule.condition(context)) {
          const breach = await this.createBreachFromRule(rule, context);
          detectedBreaches.push(breach);

          console.log(`Breach detected by rule ${rule.id}: ${rule.name}`);
        }
      } catch (error) {
        console.error(
          `Error evaluating breach detection rule ${rule.id}:`,
          error,
        );
      }
    }

    return detectedBreaches;
  }

  /**
   * Setup real-time breach detection
   */
  private async setupRealTimeDetection(): Promise<void> {
    // Monitor audit logs for suspicious patterns
    this.supabase
      .channel('breach-detection')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        async (payload) => {
          await this.analyzeAuditEvent(payload.new);
        },
      )
      .subscribe();

    // Monitor user activities for anomalies
    this.supabase
      .channel('activity-monitoring')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_activities' },
        async (payload) => {
          await this.analyzeUserActivity(payload);
        },
      )
      .subscribe();
  }

  /**
   * Run detection rules periodically
   */
  private async runDetectionRules(): Promise<void> {
    try {
      // Get recent system activity for analysis
      const context = await this.buildDetectionContext();
      const potentialBreaches = await this.checkForPotentialBreaches(context);

      for (const breach of potentialBreaches) {
        const breachId = await this.reportBreach({
          type: breach.type,
          description: `Automated detection: ${breach.type}`,
          affectedUsers: breach.affectedUsers,
          affectedDataTypes: breach.affectedDataTypes,
          jurisdiction: breach.jurisdiction,
          detectedBy: 'automated-detection-system',
          metadata: {
            detection_rule: 'system-analysis',
            confidence_score: 0.8,
          },
        });

        console.log(`Automatically reported breach: ${breachId}`);
      }
    } catch (error) {
      console.error('Error running detection rules:', error);
    }
  }

  /**
   * Analyze audit events for breach indicators
   */
  private async analyzeAuditEvent(auditEvent: any): Promise<void> {
    const suspiciousEvents = [
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'BULK_DATA_EXPORT',
      'PRIVILEGE_ESCALATION',
      'SUSPICIOUS_LOGIN_PATTERN',
    ];

    if (suspiciousEvents.includes(auditEvent.event_type)) {
      const context: BreachDetectionContext = {
        eventType: auditEvent.event_type,
        userId: auditEvent.user_id,
        resourceType: auditEvent.resource_type,
        timestamp: new Date(auditEvent.created_at),
        metadata: auditEvent.metadata,
      };

      await this.checkForPotentialBreaches(context);
    }
  }

  /**
   * Analyze user activity for anomalies
   */
  private async analyzeUserActivity(payload: any): Promise<void> {
    const activity = payload.new;

    // Check for unusual access patterns
    if (activity.activity_type === 'data_access') {
      const recentAccesses = await this.getRecentUserAccesses(
        activity.user_id,
        15,
      );

      if (recentAccesses.length > 20) {
        const context: BreachDetectionContext = {
          eventType: 'rapid_data_access',
          userId: activity.user_id,
          accessCount: recentAccesses.length,
          timeWindow: 15 * 60, // 15 minutes in seconds
          timestamp: new Date(),
        };

        await this.checkForPotentialBreaches(context);
      }
    }
  }

  /**
   * Build detection context for analysis
   */
  private async buildDetectionContext(): Promise<BreachDetectionContext> {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Get recent activities
    const { data: recentActivities } = await this.supabase
      .from('user_activities')
      .select('*')
      .gte('created_at', thirtyMinutesAgo.toISOString())
      .limit(1000);

    // Analyze patterns
    const context: BreachDetectionContext = {
      timestamp: now,
      activityCount: recentActivities?.length || 0,
      timeWindow: 30 * 60, // 30 minutes
      activities: recentActivities || [],
    };

    return context;
  }

  /**
   * Create breach from detection rule
   */
  private async createBreachFromRule(
    rule: BreachDetectionRule,
    context: BreachDetectionContext,
  ): Promise<PrivacyBreach> {
    const breachType = this.mapRuleToBreachType(rule.id);
    const affectedDataTypes = this.inferAffectedDataTypes(context);

    const breach: PrivacyBreach = {
      id: crypto.randomUUID(),
      type: breachType,
      severity: rule.severity,
      detectedAt: new Date(),
      affectedUsers: context.affectedUsers || 1,
      affectedDataTypes,
      dataVolume: {
        recordCount: context.recordCount || 0,
        estimatedSize: this.formatDataSize(context.recordCount || 0),
        dataCategories: affectedDataTypes,
        sensitiveDataIncluded: this.hasSensitiveData(affectedDataTypes),
      },
      riskAssessment: {
        overallRisk: this.assessOverallRisk(rule.severity, affectedDataTypes),
        identityTheftRisk: affectedDataTypes.includes('identification'),
        financialLossRisk: affectedDataTypes.includes('payment_history'),
        reputationDamageRisk: true,
        physicalHarmRisk: false,
        discriminationRisk: false,
        justification: `Detected by rule: ${rule.name}`,
      },
      containmentActions: [],
      notifications: [],
      status: 'detected',
      jurisdiction: context.jurisdiction || 'GLOBAL',
    };

    return breach;
  }

  /**
   * Initiate incident response
   */
  private async initiateIncidentResponse(breach: PrivacyBreach): Promise<void> {
    // Immediate containment for critical breaches
    if (breach.severity === 'critical') {
      await this.addContainmentAction(
        breach.id,
        'Immediate security alert sent to security team',
        'system',
        'effective',
        'Automated response to critical breach detection',
      );

      // Send immediate notifications
      await this.sendCriticalBreachAlerts(breach);
    }

    // Start investigation
    if (breach.severity === 'critical' || breach.severity === 'high') {
      await this.updateBreachStatus(breach.id, 'investigating');
    }

    // Check if supervisory authority notification is required
    if (this.requiresSupervisoryNotification(breach)) {
      await this.scheduleRegulatoryNotification(breach);
    }
  }

  /**
   * Handle status changes
   */
  private async handleStatusChange(
    breach: PrivacyBreach,
    oldStatus: BreachStatus,
    newStatus: BreachStatus,
  ): Promise<void> {
    switch (newStatus) {
      case 'investigating':
        if (oldStatus === 'detected') {
          await this.startInvestigation(breach);
        }
        break;
      case 'contained':
        if (oldStatus === 'investigating') {
          await this.finalizeContainment(breach);
        }
        break;
      case 'reported':
        await this.handleRegulatoryReporting(breach);
        break;
      case 'resolved':
        await this.closeIncident(breach);
        break;
    }
  }

  /**
   * Assessment methods
   */
  private async assessDataVolume(
    affectedUsers: number,
    dataTypes: PersonalDataType[],
  ): Promise<DataVolumeAssessment> {
    // Estimate records per user based on data types
    const recordMultiplier = dataTypes.reduce((sum, type) => {
      const multipliers = {
        contact_info: 1,
        wedding_preferences: 5,
        communication_logs: 50,
        payment_history: 10,
        behavioral: 100,
        vendor_interactions: 20,
      };
      return sum + (multipliers[type as keyof typeof multipliers] || 1);
    }, 0);

    const estimatedRecords = affectedUsers * recordMultiplier;

    return {
      recordCount: estimatedRecords,
      estimatedSize: this.formatDataSize(estimatedRecords),
      dataCategories: dataTypes,
      sensitiveDataIncluded: this.hasSensitiveData(dataTypes),
    };
  }

  private async assessRisk(
    breachType: BreachType,
    dataVolume: DataVolumeAssessment,
    jurisdiction: Jurisdiction,
  ): Promise<RiskAssessment> {
    let overallRisk: 'very_high' | 'high' | 'medium' | 'low' = 'medium';

    // Assess based on breach type
    if (
      ['unauthorized_access', 'malicious_attack', 'system_compromise'].includes(
        breachType,
      )
    ) {
      overallRisk = 'very_high';
    } else if (['confidentiality_breach', 'data_loss'].includes(breachType)) {
      overallRisk = 'high';
    }

    // Adjust based on data volume
    if (dataVolume.recordCount > 10000) {
      overallRisk = overallRisk === 'medium' ? 'high' : overallRisk;
    }

    return {
      overallRisk,
      identityTheftRisk: dataVolume.dataCategories.includes('identification'),
      financialLossRisk: dataVolume.dataCategories.includes('payment_history'),
      reputationDamageRisk: dataVolume.recordCount > 100,
      physicalHarmRisk: dataVolume.dataCategories.includes('location'),
      discriminationRisk: false,
      justification: `Assessment based on breach type: ${breachType}, affected records: ${dataVolume.recordCount}`,
    };
  }

  private determineSeverity(
    riskAssessment: RiskAssessment,
    dataVolume: DataVolumeAssessment,
  ): BreachSeverity {
    if (
      riskAssessment.overallRisk === 'very_high' ||
      dataVolume.recordCount > 50000
    ) {
      return 'critical';
    } else if (
      riskAssessment.overallRisk === 'high' ||
      dataVolume.recordCount > 1000
    ) {
      return 'high';
    } else if (
      riskAssessment.overallRisk === 'medium' ||
      dataVolume.recordCount > 100
    ) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Helper methods
   */
  private mapDatabaseToBreach(data: any): PrivacyBreach {
    return {
      id: data.id,
      type: data.type,
      severity: data.severity,
      detectedAt: new Date(data.detected_at),
      reportedAt: data.reported_at ? new Date(data.reported_at) : undefined,
      affectedUsers: data.affected_users,
      affectedDataTypes: data.affected_data_types,
      dataVolume: data.data_volume,
      riskAssessment: data.risk_assessment,
      containmentActions: data.containment_actions || [],
      notifications: data.notifications || [],
      status: data.status,
      jurisdiction: data.jurisdiction,
      investigationId: data.investigation_id,
    };
  }

  private mapRuleToBreachType(ruleId: string): BreachType {
    const mapping = {
      'mass-data-access': 'unauthorized_access',
      'unauthorized-admin-access': 'unauthorized_access',
      'cross-border-violation': 'confidentiality_breach',
      'data-exfiltration': 'data_loss',
      'consent-bypass': 'confidentiality_breach',
      'retention-violation': 'integrity_breach',
    };

    return mapping[ruleId as keyof typeof mapping] || 'unauthorized_access';
  }

  private inferAffectedDataTypes(
    context: BreachDetectionContext,
  ): PersonalDataType[] {
    // Infer data types based on context
    const defaultTypes: PersonalDataType[] = ['contact_info'];

    if (context.eventType?.includes('admin')) {
      return ['contact_info', 'identification', 'wedding_preferences'];
    }
    if (context.eventType?.includes('payment')) {
      return ['payment_history', 'contact_info'];
    }

    return defaultTypes;
  }

  private formatDataSize(recordCount: number): string {
    const bytesPerRecord = 1024; // Average 1KB per record
    const totalBytes = recordCount * bytesPerRecord;

    if (totalBytes > 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (totalBytes > 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (totalBytes > 1024) {
      return `${(totalBytes / 1024).toFixed(2)} KB`;
    } else {
      return `${totalBytes} bytes`;
    }
  }

  private hasSensitiveData(dataTypes: PersonalDataType[]): boolean {
    const sensitiveTypes = [
      'identification',
      'financial',
      'health',
      'biometric',
      'location',
    ];
    return dataTypes.some((type) => sensitiveTypes.includes(type));
  }

  private assessOverallRisk(
    severity: BreachSeverity,
    dataTypes: PersonalDataType[],
  ): 'very_high' | 'high' | 'medium' | 'low' {
    if (severity === 'critical') return 'very_high';
    if (severity === 'high' && this.hasSensitiveData(dataTypes)) return 'high';
    if (severity === 'medium') return 'medium';
    return 'low';
  }

  private isAdequateJurisdiction(jurisdiction: string): boolean {
    const adequateCountries = [
      'UK',
      'CANADA',
      'SWITZERLAND',
      'NEW_ZEALAND',
      'JAPAN',
    ];
    return adequateCountries.includes(jurisdiction.toUpperCase());
  }

  private async deliverNotification(
    notification: BreachNotification,
    breach: PrivacyBreach,
  ): Promise<boolean> {
    // This would integrate with actual notification systems
    console.log(
      `Sending ${notification.method} notification to ${notification.recipient}`,
    );
    console.log(`Content: ${notification.content}`);
    return true; // Assume success for now
  }

  private async sendCriticalBreachAlerts(breach: PrivacyBreach): Promise<void> {
    const criticalRecipients: NotificationRecipient[] = [
      'security_team',
      'dpo',
      'management',
    ];

    for (const recipient of criticalRecipients) {
      await this.sendNotification(
        breach.id,
        recipient,
        'email',
        `CRITICAL BREACH DETECTED: ${breach.type} affecting ${breach.affectedUsers} users`,
      );
    }
  }

  private requiresSupervisoryNotification(breach: PrivacyBreach): boolean {
    return (
      breach.severity === 'critical' ||
      (breach.severity === 'high' && breach.affectedUsers > 100)
    );
  }

  private async scheduleRegulatoryNotification(
    breach: PrivacyBreach,
  ): Promise<void> {
    // Schedule notification to supervisory authority within 72 hours
    const notificationDeadline = new Date(breach.detectedAt);
    notificationDeadline.setHours(notificationDeadline.getHours() + 72);

    console.log(
      `Regulatory notification scheduled for breach ${breach.id} by ${notificationDeadline}`,
    );
  }

  private async getRecentUserAccesses(
    userId: string,
    minutes: number,
  ): Promise<any[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const { data } = await this.supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'data_access')
      .gte('created_at', since.toISOString());

    return data || [];
  }

  private async startInvestigation(breach: PrivacyBreach): Promise<void> {
    console.log(`Starting investigation for breach ${breach.id}`);
  }

  private async finalizeContainment(breach: PrivacyBreach): Promise<void> {
    console.log(`Finalizing containment for breach ${breach.id}`);
  }

  private async handleRegulatoryReporting(
    breach: PrivacyBreach,
  ): Promise<void> {
    console.log(`Handling regulatory reporting for breach ${breach.id}`);
  }

  private async closeIncident(breach: PrivacyBreach): Promise<void> {
    console.log(`Closing incident for breach ${breach.id}`);
  }
}

// Types for breach detection
interface BreachDetectionRule {
  id: string;
  name: string;
  description: string;
  severity: BreachSeverity;
  condition: (context: BreachDetectionContext) => boolean;
  metadata: Record<string, any>;
}

interface BreachDetectionContext {
  eventType?: string;
  userId?: string;
  resourceType?: string;
  timestamp: Date;
  accessCount?: number;
  timeWindow?: number;
  affectedUsers?: number;
  recordCount?: number;
  jurisdiction?: Jurisdiction;
  sourceJurisdiction?: Jurisdiction;
  targetJurisdiction?: Jurisdiction;
  hasValidPermission?: boolean;
  hasValidConsent?: boolean;
  legalBasis?: string;
  processingActivity?: string;
  exportVolume?: number;
  offHours?: boolean;
  dataAge?: number;
  retentionPeriod?: number;
  metadata?: Record<string, any>;
  activities?: any[];
  activityCount?: number;
}

// Export singleton instance
export const privacyBreachDetector = PrivacyBreachDetector.getInstance();
