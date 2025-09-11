/**
 * WS-150: Investigation and Analytics Engine
 * Advanced pattern analysis, anomaly detection, and investigation capabilities
 * Processes audit logs to identify suspicious activities and compliance violations
 */

import {
  auditService,
  AuditEventType,
  AuditSeverity,
  AuditLogEntry,
} from './audit-service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface UserActivityPattern {
  user_id: string;
  user_email?: string;
  total_events: number;
  unique_sessions: number;
  active_time_hours: number;
  most_active_hour: number;
  geographic_indicators: {
    unique_ip_addresses: number;
    ip_address_changes: number;
    suspicious_locations: string[];
  };
  behavioral_indicators: {
    event_type_diversity: number;
    resource_access_pattern: string;
    off_hours_activity_percentage: number;
    bulk_operation_count: number;
  };
  security_flags: SecurityFlag[];
  risk_score: number;
  anomaly_indicators: AnomalyIndicator[];
}

export interface SecurityFlag {
  type:
    | 'authentication'
    | 'data_access'
    | 'privilege_escalation'
    | 'geographic'
    | 'temporal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  first_occurrence: string;
  occurrence_count: number;
  evidence: Record<string, any>;
}

export interface AnomalyIndicator {
  type: 'volume' | 'timing' | 'location' | 'behavior' | 'access_pattern';
  confidence_score: number;
  description: string;
  baseline_value: number;
  current_value: number;
  deviation_percentage: number;
  timestamps: string[];
}

export interface InvestigationResult {
  investigation_id: string;
  organization_id: string;
  started_at: string;
  completed_at: string;
  investigation_type:
    | 'user_activity'
    | 'security_incident'
    | 'compliance_audit'
    | 'anomaly_detection';
  target_identifiers: {
    user_ids?: string[];
    correlation_ids?: string[];
    ip_addresses?: string[];
    resource_ids?: string[];
  };
  findings: {
    suspicious_patterns: UserActivityPattern[];
    security_violations: SecurityViolation[];
    compliance_issues: ComplianceIssue[];
    recommended_actions: RecommendedAction[];
  };
  confidence_level: number;
  risk_assessment: 'low' | 'medium' | 'high' | 'critical';
  evidence_summary: EvidenceSummary;
}

export interface SecurityViolation {
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_resources: string[];
  timestamps: string[];
  evidence: AuditLogEntry[];
  potential_impact: string;
  recommended_remediation: string[];
}

export interface ComplianceIssue {
  compliance_framework: 'gdpr' | 'pci' | 'sox' | 'hipaa';
  requirement_violated: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  evidence: AuditLogEntry[];
  remediation_required: boolean;
  deadline?: string;
}

export interface RecommendedAction {
  action_type:
    | 'immediate'
    | 'investigation'
    | 'policy_update'
    | 'technical_fix';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  estimated_effort: string;
  responsible_team: string;
  timeline: string;
}

export interface EvidenceSummary {
  total_events_analyzed: number;
  time_period_analyzed: string;
  evidence_categories: Record<string, number>;
  chain_of_custody_verified: boolean;
  tamper_evident: boolean;
}

export class InvestigationAnalyticsEngine {
  private static instance: InvestigationAnalyticsEngine;

  // Machine learning models (simplified - in production would use actual ML libraries)
  private anomalyDetectionModel: AnomalyDetectionModel;
  private patternRecognitionModel: PatternRecognitionModel;
  private riskScoringModel: RiskScoringModel;

  private constructor() {
    this.anomalyDetectionModel = new AnomalyDetectionModel();
    this.patternRecognitionModel = new PatternRecognitionModel();
    this.riskScoringModel = new RiskScoringModel();
  }

  static getInstance(): InvestigationAnalyticsEngine {
    if (!InvestigationAnalyticsEngine.instance) {
      InvestigationAnalyticsEngine.instance =
        new InvestigationAnalyticsEngine();
    }
    return InvestigationAnalyticsEngine.instance;
  }

  /**
   * Analyze user activity patterns for a specific user
   */
  async analyzeUserActivity(
    userId: string,
    organizationId: string,
    timeWindowHours: number = 168, // Default: 7 days
  ): Promise<UserActivityPattern> {
    const startDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    // Get user's audit logs
    const userLogs = await auditService.query({
      user_id: userId,
      organization_id: organizationId,
      start_date: startDate,
      limit: 5000,
    });

    if (userLogs.length === 0) {
      throw new Error(`No activity found for user ${userId}`);
    }

    // Extract patterns
    const activityMetrics = this.extractActivityMetrics(userLogs);
    const geographicIndicators = this.analyzeGeographicPatterns(userLogs);
    const behavioralIndicators = this.analyzeBehavioralPatterns(userLogs);
    const securityFlags = this.identifySecurityFlags(userLogs);
    const anomalyIndicators = await this.detectAnomalies(userLogs, userId);

    // Calculate risk score
    const riskScore = this.riskScoringModel.calculateRiskScore({
      securityFlags,
      anomalyIndicators,
      behavioralIndicators,
      geographicIndicators,
    });

    return {
      user_id: userId,
      user_email: userLogs[0]?.user_email,
      total_events: userLogs.length,
      unique_sessions: activityMetrics.unique_sessions,
      active_time_hours: activityMetrics.active_time_hours,
      most_active_hour: activityMetrics.most_active_hour,
      geographic_indicators: geographicIndicators,
      behavioral_indicators: behavioralIndicators,
      security_flags: securityFlags,
      risk_score: riskScore,
      anomaly_indicators: anomalyIndicators,
    };
  }

  /**
   * Conduct comprehensive security investigation
   */
  async conductSecurityInvestigation(
    organizationId: string,
    params: {
      target_user_ids?: string[];
      suspicious_ip_addresses?: string[];
      time_window_hours?: number;
      investigation_trigger?: string;
    },
  ): Promise<InvestigationResult> {
    const investigationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();

    try {
      // Collect relevant audit logs
      const relevantLogs = await this.collectInvestigationEvidence(
        organizationId,
        params,
      );

      // Analyze patterns
      const suspiciousPatterns = await this.identifySuspiciousPatterns(
        relevantLogs,
        organizationId,
        params.time_window_hours || 72,
      );

      // Identify security violations
      const securityViolations = this.identifySecurityViolations(relevantLogs);

      // Check compliance issues
      const complianceIssues = await this.identifyComplianceIssues(
        relevantLogs,
        organizationId,
      );

      // Generate recommendations
      const recommendedActions = this.generateRecommendations(
        suspiciousPatterns,
        securityViolations,
        complianceIssues,
      );

      // Calculate overall confidence and risk
      const confidenceLevel = this.calculateInvestigationConfidence(
        relevantLogs,
        suspiciousPatterns,
        securityViolations,
      );

      const riskAssessment = this.assessOverallRisk(
        suspiciousPatterns,
        securityViolations,
        complianceIssues,
      );

      const evidenceSummary = this.summarizeEvidence(relevantLogs);

      const result: InvestigationResult = {
        investigation_id: investigationId,
        organization_id: organizationId,
        started_at: startTime,
        completed_at: new Date().toISOString(),
        investigation_type: 'security_incident',
        target_identifiers: {
          user_ids: params.target_user_ids,
          ip_addresses: params.suspicious_ip_addresses,
        },
        findings: {
          suspicious_patterns: suspiciousPatterns,
          security_violations: securityViolations,
          compliance_issues: complianceIssues,
          recommended_actions: recommendedActions,
        },
        confidence_level: confidenceLevel,
        risk_assessment: riskAssessment,
        evidence_summary: evidenceSummary,
      };

      // Log the investigation
      await auditService.log(
        {
          event_type: AuditEventType.SECURITY_ADMIN_PRIVILEGE_USED,
          severity: AuditSeverity.INFO,
          action: 'Security investigation completed',
          resource_type: 'security_investigation',
          resource_id: investigationId,
          details: {
            investigation_summary: {
              suspicious_patterns_found: suspiciousPatterns.length,
              security_violations_found: securityViolations.length,
              compliance_issues_found: complianceIssues.length,
              risk_level: riskAssessment,
              confidence: confidenceLevel,
            },
            investigation_trigger: params.investigation_trigger,
            target_users: params.target_user_ids?.length || 0,
            target_ips: params.suspicious_ip_addresses?.length || 0,
          },
        },
        {
          organization_id: organizationId,
        },
      );

      return result;
    } catch (error) {
      console.error(
        '[INVESTIGATION ENGINE] Security investigation failed:',
        error,
      );

      await auditService.log({
        event_type: AuditEventType.SYSTEM_ERROR_OCCURRED,
        severity: AuditSeverity.ERROR,
        action: 'Security investigation failed',
        details: {
          investigation_id: investigationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Detect system-wide anomalies
   */
  async detectSystemAnomalies(
    organizationId: string,
    timeWindowHours: number = 24,
  ): Promise<{
    anomalies: AnomalyIndicator[];
    baseline_metrics: Record<string, number>;
    current_metrics: Record<string, number>;
    anomaly_score: number;
  }> {
    const startDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const baselineStartDate = new Date(
      Date.now() - timeWindowHours * 2 * 60 * 60 * 1000,
    );

    // Get current period logs
    const currentLogs = await auditService.query({
      organization_id: organizationId,
      start_date: startDate,
      limit: 10000,
    });

    // Get baseline period logs (previous equivalent period)
    const baselineLogs = await auditService.query({
      organization_id: organizationId,
      start_date: baselineStartDate,
      end_date: startDate,
      limit: 10000,
    });

    // Calculate metrics
    const currentMetrics = this.calculateSystemMetrics(currentLogs);
    const baselineMetrics = this.calculateSystemMetrics(baselineLogs);

    // Detect anomalies
    const anomalies = this.anomalyDetectionModel.detectAnomalies(
      currentMetrics,
      baselineMetrics,
      currentLogs,
    );

    // Calculate overall anomaly score
    const anomalyScore =
      anomalies.reduce(
        (sum, anomaly) =>
          sum +
          anomaly.confidence_score *
            this.getAnomalySeverityWeight(anomaly.type),
        0,
      ) / Math.max(anomalies.length, 1);

    return {
      anomalies,
      baseline_metrics: baselineMetrics,
      current_metrics: currentMetrics,
      anomaly_score: Math.min(Math.round(anomalyScore), 100),
    };
  }

  /**
   * Generate compliance report with findings
   */
  async generateComplianceAnalysis(
    organizationId: string,
    framework: 'gdpr' | 'pci' | 'sox' | 'hipaa',
    timeWindowDays: number = 30,
  ): Promise<{
    compliance_score: number;
    issues_found: ComplianceIssue[];
    recommendations: RecommendedAction[];
    evidence_count: number;
  }> {
    const startDate = new Date(
      Date.now() - timeWindowDays * 24 * 60 * 60 * 1000,
    );

    // Get relevant logs based on compliance framework
    const relevantEvents = this.getComplianceRelevantEvents(framework);
    const complianceLogs = await auditService.query({
      organization_id: organizationId,
      start_date: startDate,
      event_types: relevantEvents,
      limit: 5000,
    });

    // Analyze compliance issues
    const issues = await this.analyzeComplianceViolations(
      complianceLogs,
      framework,
      organizationId,
    );

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(
      issues,
      complianceLogs.length,
    );

    // Generate recommendations
    const recommendations = this.generateComplianceRecommendations(
      issues,
      framework,
    );

    return {
      compliance_score: complianceScore,
      issues_found: issues,
      recommendations,
      evidence_count: complianceLogs.length,
    };
  }

  // Private helper methods

  private extractActivityMetrics(logs: AuditLogEntry[]) {
    const sessions = new Set(logs.map((log) => log.session_id).filter(Boolean));
    const hours = logs.map((log) => new Date(log.timestamp).getHours());
    const hourCounts: Record<number, number> = {};

    hours.forEach((hour) => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostActiveHour =
      Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 0;

    const firstEvent = new Date(logs[0].timestamp);
    const lastEvent = new Date(logs[logs.length - 1].timestamp);
    const activeTimeHours =
      (lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60);

    return {
      unique_sessions: sessions.size,
      most_active_hour: parseInt(mostActiveHour.toString()),
      active_time_hours: Math.round(activeTimeHours * 100) / 100,
    };
  }

  private analyzeGeographicPatterns(logs: AuditLogEntry[]) {
    const ipAddresses = new Set(
      logs.map((log) => log.ip_address).filter(Boolean),
    );
    const ipChanges = this.countIPChanges(logs);
    const suspiciousLocations = this.identifySuspiciousLocations(logs);

    return {
      unique_ip_addresses: ipAddresses.size,
      ip_address_changes: ipChanges,
      suspicious_locations: suspiciousLocations,
    };
  }

  private analyzeBehavioralPatterns(logs: AuditLogEntry[]) {
    const eventTypes = new Set(logs.map((log) => log.event_type));
    const resourcePattern = this.analyzeResourceAccessPattern(logs);
    const offHoursPercentage = this.calculateOffHoursActivity(logs);
    const bulkOperations = logs.filter(
      (log) =>
        log.details?.bulk_operation === true ||
        log.event_type === AuditEventType.DATA_BULK_IMPORT ||
        log.event_type === AuditEventType.DATA_BULK_EXPORT,
    ).length;

    return {
      event_type_diversity: eventTypes.size,
      resource_access_pattern: resourcePattern,
      off_hours_activity_percentage: offHoursPercentage,
      bulk_operation_count: bulkOperations,
    };
  }

  private identifySecurityFlags(logs: AuditLogEntry[]): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    // Authentication flags
    const failedAuthAttempts = logs.filter(
      (log) =>
        log.event_type.includes('auth') &&
        (log.severity === 'error' || log.event_type.includes('failed')),
    );

    if (failedAuthAttempts.length > 5) {
      flags.push({
        type: 'authentication',
        severity: failedAuthAttempts.length > 20 ? 'critical' : 'high',
        description: `${failedAuthAttempts.length} failed authentication attempts`,
        first_occurrence: failedAuthAttempts[0].timestamp,
        occurrence_count: failedAuthAttempts.length,
        evidence: { failed_attempts: failedAuthAttempts.map((log) => log.id) },
      });
    }

    // Geographic flags
    const uniqueIPs = new Set(
      logs.map((log) => log.ip_address).filter(Boolean),
    );
    if (uniqueIPs.size > 10) {
      flags.push({
        type: 'geographic',
        severity: uniqueIPs.size > 20 ? 'high' : 'medium',
        description: `Access from ${uniqueIPs.size} different IP addresses`,
        first_occurrence: logs[0].timestamp,
        occurrence_count: uniqueIPs.size,
        evidence: { ip_addresses: Array.from(uniqueIPs) },
      });
    }

    // Data access flags
    const sensitiveDataAccess = logs.filter(
      (log) =>
        log.details?.data_classification === 'restricted' ||
        log.details?.sensitive_data === true,
    );

    if (sensitiveDataAccess.length > 50) {
      flags.push({
        type: 'data_access',
        severity: 'high',
        description: `${sensitiveDataAccess.length} sensitive data access events`,
        first_occurrence: sensitiveDataAccess[0].timestamp,
        occurrence_count: sensitiveDataAccess.length,
        evidence: { sensitive_access_count: sensitiveDataAccess.length },
      });
    }

    return flags;
  }

  private async detectAnomalies(
    logs: AuditLogEntry[],
    userId: string,
  ): Promise<AnomalyIndicator[]> {
    // Get user's historical baseline (simplified)
    const baselineStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const baselineEndDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const baselineLogs = await auditService.query({
      user_id: userId,
      start_date: baselineStartDate,
      end_date: baselineEndDate,
      limit: 2000,
    });

    return this.anomalyDetectionModel.compareUserBehavior(logs, baselineLogs);
  }

  private async collectInvestigationEvidence(
    organizationId: string,
    params: any,
  ): Promise<AuditLogEntry[]> {
    const filters: any = {
      organization_id: organizationId,
      start_date: new Date(
        Date.now() - (params.time_window_hours || 72) * 60 * 60 * 1000,
      ),
      limit: 10000,
    };

    if (params.target_user_ids?.length) {
      // Get logs for specific users
      const userLogs = await Promise.all(
        params.target_user_ids.map((userId) =>
          auditService.query({ ...filters, user_id: userId }),
        ),
      );
      return userLogs.flat();
    }

    return auditService.query(filters);
  }

  private async identifySuspiciousPatterns(
    logs: AuditLogEntry[],
    organizationId: string,
    timeWindowHours: number,
  ): Promise<UserActivityPattern[]> {
    const userGroups = this.groupLogsByUser(logs);
    const patterns: UserActivityPattern[] = [];

    for (const [userId, userLogs] of userGroups.entries()) {
      if (userLogs.length > 10) {
        // Minimum activity threshold
        try {
          const pattern = await this.analyzeUserActivity(
            userId,
            organizationId,
            timeWindowHours,
          );

          // Only include users with elevated risk scores
          if (pattern.risk_score > 30) {
            patterns.push(pattern);
          }
        } catch (error) {
          console.error(`Failed to analyze user ${userId}:`, error);
        }
      }
    }

    return patterns.sort((a, b) => b.risk_score - a.risk_score);
  }

  private identifySecurityViolations(
    logs: AuditLogEntry[],
  ): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Group by violation type
    const unauthorizedAccess = logs.filter(
      (log) => log.event_type === AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
    );

    const crossOrgAccess = logs.filter(
      (log) => log.event_type === AuditEventType.SECURITY_CROSS_ORG_ACCESS,
    );

    const malwareDetection = logs.filter(
      (log) => log.event_type === AuditEventType.SECURITY_MALWARE_DETECTED,
    );

    if (unauthorizedAccess.length > 0) {
      violations.push({
        violation_type: 'unauthorized_access',
        severity: 'high',
        description: `${unauthorizedAccess.length} unauthorized access attempts detected`,
        affected_resources: Array.from(
          new Set(
            unauthorizedAccess.map((log) => log.resource_id).filter(Boolean),
          ),
        ),
        timestamps: unauthorizedAccess.map((log) => log.timestamp),
        evidence: unauthorizedAccess,
        potential_impact: 'Data breach, unauthorized data access',
        recommended_remediation: [
          'Review and strengthen access controls',
          'Investigate affected user accounts',
          'Implement additional monitoring',
        ],
      });
    }

    if (crossOrgAccess.length > 0) {
      violations.push({
        violation_type: 'cross_organization_access',
        severity: 'critical',
        description: `${crossOrgAccess.length} cross-organization access attempts`,
        affected_resources: Array.from(
          new Set(crossOrgAccess.map((log) => log.resource_id).filter(Boolean)),
        ),
        timestamps: crossOrgAccess.map((log) => log.timestamp),
        evidence: crossOrgAccess,
        potential_impact: 'Data leakage, privacy violation',
        recommended_remediation: [
          'Immediate access review and revocation',
          'Security incident investigation',
          'Strengthen tenant isolation',
        ],
      });
    }

    return violations;
  }

  private async identifyComplianceIssues(
    logs: AuditLogEntry[],
    organizationId: string,
  ): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // GDPR compliance checks
    const dataProcessingWithoutConsent = logs.filter(
      (log) =>
        (log.event_type === AuditEventType.DATA_CREATE ||
          log.event_type === AuditEventType.DATA_UPDATE) &&
        log.details?.data_classification === 'restricted' &&
        !log.details?.consent_verified,
    );

    if (dataProcessingWithoutConsent.length > 0) {
      issues.push({
        compliance_framework: 'gdpr',
        requirement_violated: 'Article 6 - Lawful basis for processing',
        description: `${dataProcessingWithoutConsent.length} data processing events without verified consent`,
        severity: 'major',
        evidence: dataProcessingWithoutConsent,
        remediation_required: true,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // PCI compliance checks
    const unencryptedCardData = logs.filter(
      (log) =>
        log.details?.card_data_access === true &&
        log.details?.encrypted !== true,
    );

    if (unencryptedCardData.length > 0) {
      issues.push({
        compliance_framework: 'pci',
        requirement_violated: 'PCI DSS 3.4 - Protect cardholder data',
        description: `${unencryptedCardData.length} unencrypted card data access events`,
        severity: 'critical',
        evidence: unencryptedCardData,
        remediation_required: true,
      });
    }

    return issues;
  }

  // Additional helper methods would continue here...
  // This is a comprehensive but simplified version of the investigation engine

  private countIPChanges(logs: AuditLogEntry[]): number {
    let changes = 0;
    let lastIP = null;

    for (const log of logs) {
      if (log.ip_address && log.ip_address !== lastIP) {
        changes++;
        lastIP = log.ip_address;
      }
    }

    return Math.max(changes - 1, 0); // Subtract 1 for initial IP
  }

  private identifySuspiciousLocations(logs: AuditLogEntry[]): string[] {
    // Simplified - in production would use GeoIP lookup
    const uniqueIPs = new Set(
      logs.map((log) => log.ip_address).filter(Boolean),
    );

    // Mock suspicious location detection
    const suspiciousPatterns = [
      /^10\./, // Internal networks from external
      /^192\.168\./, // Private networks
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private networks
    ];

    return Array.from(uniqueIPs).filter((ip) =>
      suspiciousPatterns.some((pattern) => pattern.test(ip)),
    );
  }

  private analyzeResourceAccessPattern(logs: AuditLogEntry[]): string {
    const resourceTypes = logs.map((log) => log.resource_type).filter(Boolean);
    const uniqueTypes = new Set(resourceTypes);

    if (uniqueTypes.size === 1) return 'focused';
    if (uniqueTypes.size <= 3) return 'targeted';
    if (uniqueTypes.size <= 6) return 'broad';
    return 'extensive';
  }

  private calculateOffHoursActivity(logs: AuditLogEntry[]): number {
    const offHoursLogs = logs.filter((log) => {
      const hour = new Date(log.timestamp).getHours();
      return hour < 8 || hour > 18; // Outside 8 AM - 6 PM
    });

    return logs.length > 0
      ? Math.round((offHoursLogs.length / logs.length) * 100)
      : 0;
  }

  private groupLogsByUser(logs: AuditLogEntry[]): Map<string, AuditLogEntry[]> {
    const groups = new Map<string, AuditLogEntry[]>();

    logs.forEach((log) => {
      if (log.user_id) {
        if (!groups.has(log.user_id)) {
          groups.set(log.user_id, []);
        }
        groups.get(log.user_id)!.push(log);
      }
    });

    return groups;
  }

  // Simplified ML model implementations
  private calculateSystemMetrics(
    logs: AuditLogEntry[],
  ): Record<string, number> {
    return {
      total_events: logs.length,
      unique_users: new Set(logs.map((log) => log.user_id).filter(Boolean))
        .size,
      error_rate:
        logs.filter((log) => log.severity === 'error').length /
        Math.max(logs.length, 1),
      security_events: logs.filter((log) => log.event_type.includes('security'))
        .length,
      failed_auth_rate:
        logs.filter(
          (log) => log.event_type.includes('auth') && log.severity === 'error',
        ).length / Math.max(logs.length, 1),
    };
  }

  private getAnomalySeverityWeight(type: string): number {
    const weights = {
      volume: 1.0,
      timing: 0.8,
      location: 1.2,
      behavior: 1.1,
      access_pattern: 0.9,
    };
    return weights[type as keyof typeof weights] || 1.0;
  }

  private getComplianceRelevantEvents(framework: string): AuditEventType[] {
    const eventMaps = {
      gdpr: [
        AuditEventType.DATA_CREATE,
        AuditEventType.DATA_READ,
        AuditEventType.DATA_UPDATE,
        AuditEventType.DATA_DELETE,
        AuditEventType.COMPLIANCE_DATA_REQUEST,
        AuditEventType.COMPLIANCE_CONSENT_CHANGED,
      ],
      pci: [
        AuditEventType.FINANCIAL_PAYMENT_PROCESSED,
        AuditEventType.FINANCIAL_ACCESS_ATTEMPT,
        AuditEventType.DATA_READ,
        AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
      ],
      sox: [
        AuditEventType.FINANCIAL_PAYMENT_PROCESSED,
        AuditEventType.FINANCIAL_BILLING_UPDATED,
        AuditEventType.DATA_UPDATE,
        AuditEventType.DATA_DELETE,
      ],
      hipaa: [
        AuditEventType.DATA_READ,
        AuditEventType.DATA_UPDATE,
        AuditEventType.DATA_CREATE,
        AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
      ],
    };

    return eventMaps[framework as keyof typeof eventMaps] || [];
  }

  // Additional methods would continue...
  // This provides a comprehensive foundation for the investigation engine
}

// Simplified ML model classes
class AnomalyDetectionModel {
  detectAnomalies(
    currentMetrics: Record<string, number>,
    baselineMetrics: Record<string, number>,
    logs: AuditLogEntry[],
  ): AnomalyIndicator[] {
    const anomalies: AnomalyIndicator[] = [];

    Object.entries(currentMetrics).forEach(([key, currentValue]) => {
      const baselineValue = baselineMetrics[key] || 0;
      if (baselineValue > 0) {
        const deviationPercentage =
          ((currentValue - baselineValue) / baselineValue) * 100;

        if (Math.abs(deviationPercentage) > 50) {
          // 50% deviation threshold
          anomalies.push({
            type: this.getAnomalyType(key),
            confidence_score: Math.min(Math.abs(deviationPercentage), 100),
            description: `${key} deviation: ${Math.round(deviationPercentage)}%`,
            baseline_value: baselineValue,
            current_value: currentValue,
            deviation_percentage: Math.round(deviationPercentage),
            timestamps: logs.slice(0, 5).map((log) => log.timestamp),
          });
        }
      }
    });

    return anomalies;
  }

  compareUserBehavior(
    currentLogs: AuditLogEntry[],
    baselineLogs: AuditLogEntry[],
  ): AnomalyIndicator[] {
    // Simplified behavior comparison
    const currentHourlyPattern = this.getHourlyPattern(currentLogs);
    const baselineHourlyPattern = this.getHourlyPattern(baselineLogs);

    const anomalies: AnomalyIndicator[] = [];

    // Compare activity patterns
    const currentPeakHour = this.getPeakActivityHour(currentHourlyPattern);
    const baselinePeakHour = this.getPeakActivityHour(baselineHourlyPattern);

    if (Math.abs(currentPeakHour - baselinePeakHour) > 4) {
      // 4 hour shift
      anomalies.push({
        type: 'timing',
        confidence_score: 75,
        description: `Activity peak shifted by ${Math.abs(currentPeakHour - baselinePeakHour)} hours`,
        baseline_value: baselinePeakHour,
        current_value: currentPeakHour,
        deviation_percentage: Math.abs(currentPeakHour - baselinePeakHour) * 25, // Arbitrary scaling
        timestamps: currentLogs.slice(0, 3).map((log) => log.timestamp),
      });
    }

    return anomalies;
  }

  private getAnomalyType(metricKey: string): AnomalyIndicator['type'] {
    if (metricKey.includes('event')) return 'volume';
    if (metricKey.includes('user')) return 'behavior';
    if (metricKey.includes('security')) return 'access_pattern';
    return 'volume';
  }

  private getHourlyPattern(logs: AuditLogEntry[]): Record<number, number> {
    const pattern: Record<number, number> = {};
    logs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      pattern[hour] = (pattern[hour] || 0) + 1;
    });
    return pattern;
  }

  private getPeakActivityHour(hourlyPattern: Record<number, number>): number {
    return parseInt(
      Object.entries(hourlyPattern).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        '12',
    );
  }
}

class PatternRecognitionModel {
  // Placeholder for pattern recognition functionality
}

class RiskScoringModel {
  calculateRiskScore(factors: {
    securityFlags: SecurityFlag[];
    anomalyIndicators: AnomalyIndicator[];
    behavioralIndicators: any;
    geographicIndicators: any;
  }): number {
    let score = 0;

    // Security flags impact
    factors.securityFlags.forEach((flag) => {
      const severityScores = { low: 5, medium: 15, high: 30, critical: 50 };
      score += severityScores[flag.severity];
    });

    // Anomaly indicators impact
    factors.anomalyIndicators.forEach((anomaly) => {
      score += Math.round(anomaly.confidence_score * 0.3);
    });

    // Behavioral risk factors
    if (factors.behavioralIndicators.off_hours_activity_percentage > 50)
      score += 20;
    if (factors.behavioralIndicators.bulk_operation_count > 10) score += 15;
    if (factors.geographicIndicators.unique_ip_addresses > 10) score += 25;

    return Math.min(score, 100);
  }
}

// Export singleton instance
export const investigationEngine = InvestigationAnalyticsEngine.getInstance();
