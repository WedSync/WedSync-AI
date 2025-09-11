/**
 * WS-246: Analytics Audit Logger
 * Team B Round 1: Comprehensive compliance and audit logging
 *
 * Audit logging service for analytics operations with GDPR compliance,
 * data access tracking, and security monitoring for wedding vendor data.
 */

import { createClient } from '@supabase/supabase-js';
import {
  AnalyticsAuditServiceInterface,
  AnalyticsAuditLog,
  AnalyticsQueryRequest,
  ComplianceReport,
  DateRange,
  DataClassification,
} from '@/types/analytics';

export class AnalyticsAuditLogger implements AnalyticsAuditServiceInterface {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // GDPR and compliance requirements
  private readonly COMPLIANCE_SETTINGS = {
    LOG_RETENTION_DAYS: 2557, // 7 years for financial/business records
    SENSITIVE_DATA_RETENTION_DAYS: 1095, // 3 years for personal data
    AUDIT_BATCH_SIZE: 1000,
    SECURITY_ALERT_THRESHOLD: 10, // Suspicious activity threshold per user per hour
  };

  // Data classification mapping
  private readonly DATA_CLASSIFICATION_MAP = {
    vendor_performance: 'internal' as DataClassification,
    client_satisfaction: 'confidential' as DataClassification,
    financial_metrics: 'confidential' as DataClassification,
    benchmark_data: 'public' as DataClassification,
    export_data: 'internal' as DataClassification,
    user_analytics: 'restricted' as DataClassification,
  };

  // Critical operations that require enhanced logging
  private readonly CRITICAL_OPERATIONS = [
    'performance_calculation',
    'data_export',
    'benchmark_update',
    'user_data_access',
    'api_key_usage',
    'bulk_data_query',
  ];

  /**
   * Log user access to analytics resources
   */
  async logAccess(
    userId: string,
    resource: string,
    action: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const auditEntry: Partial<AnalyticsAuditLog> = {
        user_id: userId,
        action,
        resource_type: this.extractResourceType(resource),
        resource_id: this.extractResourceId(resource),
        data_accessed: metadata?.dataAccessed || {},
        data_classification: this.classifyData(resource),
        compliance_flags: await this.generateComplianceFlags(
          userId,
          action,
          resource,
        ),
        created_at: new Date().toISOString(),
      };

      await this.storeAuditLog(auditEntry);

      // Check for suspicious activity
      await this.checkSuspiciousActivity(userId, action);

      // Generate security alerts if needed
      if (this.CRITICAL_OPERATIONS.includes(action)) {
        await this.generateSecurityAlert(userId, action, resource, metadata);
      }
    } catch (error) {
      console.error('Error logging access:', error);
      // Don't throw error - audit logging should not break main functionality
    }
  }

  /**
   * Log analytics query execution
   */
  async logQuery(
    query: AnalyticsQueryRequest,
    result: any,
    processingTime: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const queryComplexity = this.calculateQueryComplexity(query);
      const dataVolume = this.estimateDataVolume(result);

      const auditEntry: Partial<AnalyticsAuditLog> = {
        user_id: userId,
        action: 'analytics_query',
        resource_type: 'analytics_data',
        endpoint: this.constructEndpointFromQuery(query),
        method: 'POST',
        ip_address: ipAddress,
        user_agent: userAgent,
        query_parameters: this.sanitizeQueryParameters(query),
        response_status: 200,
        processing_time_ms: processingTime,
        data_classification: this.classifyQueryData(query),
        compliance_flags: {
          query_complexity: queryComplexity,
          data_volume: dataVolume,
          includes_personal_data: this.containsPersonalData(query),
          cross_vendor_access: this.isCrossVendorQuery(query),
          bulk_export: this.isBulkExport(query),
        },
        created_at: new Date().toISOString(),
      };

      await this.storeAuditLog(auditEntry);

      // Performance monitoring
      if (processingTime > 5000) {
        // 5 seconds
        await this.logPerformanceAlert(query, processingTime);
      }

      // Compliance monitoring
      if (dataVolume > 100000) {
        // Large data access
        await this.logDataAccessAlert(userId, dataVolume, query);
      }
    } catch (error) {
      console.error('Error logging query:', error);
    }
  }

  /**
   * Get audit trail for a specific vendor
   */
  async getAuditTrail(
    vendorId: string,
    dateRange?: DateRange,
  ): Promise<AnalyticsAuditLog[]> {
    try {
      const defaultDateRange = dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        end: new Date().toISOString().split('T')[0],
      };

      const { data, error } = await this.supabase
        .from('analytics_audit_log')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('created_at', defaultDateRange.start)
        .lte('created_at', defaultDateRange.end)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        throw new Error(`Failed to fetch audit trail: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting audit trail:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(period: DateRange): Promise<ComplianceReport> {
    try {
      const reportId = `compliance_${Date.now()}`;

      // Get audit logs for period
      const { data: auditLogs } = await this.supabase
        .from('analytics_audit_log')
        .select('*')
        .gte('created_at', period.start)
        .lte('created_at', period.end);

      if (!auditLogs) {
        throw new Error('Failed to fetch audit logs for compliance report');
      }

      // Calculate compliance metrics
      const totalAccesses = auditLogs.length;
      const uniqueUsers = new Set(
        auditLogs.map((log) => log.user_id).filter(Boolean),
      ).size;

      // Check data retention compliance
      const retentionCompliance = await this.checkDataRetentionCompliance();

      // Identify security violations
      const securityViolations =
        await this.identifySecurityViolations(auditLogs);

      // Calculate privacy impact score
      const privacyScore = this.calculatePrivacyImpactScore(auditLogs);

      // Generate recommendations
      const recommendations = await this.generateComplianceRecommendations(
        auditLogs,
        securityViolations.length,
        privacyScore,
      );

      return {
        report_id: reportId,
        generated_at: new Date().toISOString(),
        period,
        total_data_accesses: totalAccesses,
        unique_users: uniqueUsers,
        data_retention_compliance: retentionCompliance,
        security_violations: securityViolations.length,
        privacy_impact_score: privacyScore,
        recommendations,
      };
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Log security incident
   */
  async logSecurityIncident(
    userId: string,
    incidentType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
  ): Promise<void> {
    try {
      const incident: Partial<AnalyticsAuditLog> = {
        user_id: userId,
        action: `security_incident_${incidentType}`,
        resource_type: 'security',
        data_classification: 'restricted',
        compliance_flags: {
          incident_type: incidentType,
          severity,
          requires_investigation:
            severity === 'high' || severity === 'critical',
          auto_alert: severity === 'critical',
          ...details,
        },
        created_at: new Date().toISOString(),
      };

      await this.storeAuditLog(incident);

      // Automatic escalation for critical incidents
      if (severity === 'critical') {
        await this.escalateCriticalIncident(userId, incidentType, details);
      }
    } catch (error) {
      console.error('Error logging security incident:', error);
    }
  }

  /**
   * Monitor for GDPR compliance violations
   */
  async monitorGDPRCompliance(): Promise<void> {
    try {
      // Check for data retention violations
      const retentionViolations = await this.checkRetentionViolations();

      // Check for unauthorized cross-border data transfers
      const transferViolations = await this.checkDataTransferViolations();

      // Check for missing consent records
      const consentViolations = await this.checkConsentViolations();

      // Log any violations found
      if (retentionViolations.length > 0) {
        await this.logComplianceViolation(
          'data_retention',
          retentionViolations,
        );
      }

      if (transferViolations.length > 0) {
        await this.logComplianceViolation('data_transfer', transferViolations);
      }

      if (consentViolations.length > 0) {
        await this.logComplianceViolation(
          'consent_management',
          consentViolations,
        );
      }
    } catch (error) {
      console.error('Error monitoring GDPR compliance:', error);
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private async storeAuditLog(
    auditEntry: Partial<AnalyticsAuditLog>,
  ): Promise<void> {
    const { error } = await this.supabase.from('analytics_audit_log').insert({
      id: crypto.randomUUID(),
      retention_period: `${this.COMPLIANCE_SETTINGS.LOG_RETENTION_DAYS} days`,
      ...auditEntry,
    });

    if (error) {
      console.error('Failed to store audit log:', error);
    }
  }

  private extractResourceType(resource: string): string {
    // Extract resource type from resource identifier
    const parts = resource.split(':');
    return parts[0] || 'unknown';
  }

  private extractResourceId(resource: string): string | undefined {
    const parts = resource.split(':');
    return parts[1];
  }

  private classifyData(resource: string): DataClassification {
    const resourceType = this.extractResourceType(resource);
    return (
      this.DATA_CLASSIFICATION_MAP[
        resourceType as keyof typeof this.DATA_CLASSIFICATION_MAP
      ] || 'internal'
    );
  }

  private async generateComplianceFlags(
    userId: string,
    action: string,
    resource: string,
  ): Promise<Record<string, any>> {
    return {
      gdpr_applicable: true,
      requires_consent: this.requiresConsent(resource),
      retention_category: this.getRetentionCategory(resource),
      cross_border_transfer: false, // Would be determined by user location
      automated_decision_making: this.isAutomatedDecision(action),
      high_risk_processing: this.isHighRiskProcessing(action, resource),
    };
  }

  private async checkSuspiciousActivity(
    userId: string,
    action: string,
  ): Promise<void> {
    // Get recent activity for this user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data: recentActivity } = await this.supabase
      .from('analytics_audit_log')
      .select('action')
      .eq('user_id', userId)
      .gt('created_at', oneHourAgo.toISOString());

    if (
      recentActivity &&
      recentActivity.length > this.COMPLIANCE_SETTINGS.SECURITY_ALERT_THRESHOLD
    ) {
      await this.logSecurityIncident(userId, 'suspicious_activity', 'medium', {
        action_count: recentActivity.length,
        time_period: '1_hour',
        current_action: action,
      });
    }
  }

  private async generateSecurityAlert(
    userId: string,
    action: string,
    resource: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const alert = {
      alert_type: 'critical_operation',
      user_id: userId,
      action,
      resource,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // In production, this would send alerts to security team
    console.warn('SECURITY ALERT:', alert);
  }

  private calculateQueryComplexity(
    query: AnalyticsQueryRequest,
  ): 'low' | 'medium' | 'high' {
    let complexity = 0;

    // Factor in query parameters
    if (query.vendor_ids && query.vendor_ids.length > 10) complexity += 2;
    if (query.metrics && query.metrics.length > 5) complexity += 1;
    if (query.include_trends) complexity += 2;
    if (query.include_benchmarks) complexity += 1;
    if (query.date_range) {
      const days = Math.ceil(
        (new Date(query.date_range.end).getTime() -
          new Date(query.date_range.start).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (days > 365) complexity += 3;
      else if (days > 90) complexity += 1;
    }

    if (complexity >= 5) return 'high';
    if (complexity >= 2) return 'medium';
    return 'low';
  }

  private estimateDataVolume(result: any): number {
    // Rough estimation of data volume
    return JSON.stringify(result).length;
  }

  private constructEndpointFromQuery(query: AnalyticsQueryRequest): string {
    if (query.vendor_ids && query.vendor_ids.length === 1) {
      return `/api/analytics/vendor-performance/${query.vendor_ids[0]}`;
    }

    if (query.include_benchmarks) {
      return '/api/analytics/benchmarks/';
    }

    if (query.include_trends) {
      return '/api/analytics/trends/';
    }

    return '/api/analytics/query/';
  }

  private sanitizeQueryParameters(
    query: AnalyticsQueryRequest,
  ): Record<string, any> {
    // Remove sensitive data from query parameters for logging
    const sanitized = { ...query };

    // Remove actual vendor IDs in bulk queries (keep count)
    if (sanitized.vendor_ids && sanitized.vendor_ids.length > 5) {
      sanitized.vendor_ids = [`[${sanitized.vendor_ids.length} vendor IDs]`];
    }

    return sanitized;
  }

  private classifyQueryData(query: AnalyticsQueryRequest): DataClassification {
    if (query.vendor_ids && query.vendor_ids.length > 1) {
      return 'confidential'; // Cross-vendor queries are sensitive
    }

    if (query.metrics && query.metrics.includes('client_satisfaction')) {
      return 'confidential'; // Client data is sensitive
    }

    return 'internal';
  }

  private containsPersonalData(query: AnalyticsQueryRequest): boolean {
    return (
      query.metrics?.includes('client_satisfaction') ||
      query.metrics?.includes('vendor_rating') ||
      false
    );
  }

  private isCrossVendorQuery(query: AnalyticsQueryRequest): boolean {
    return (query.vendor_ids?.length || 0) > 1;
  }

  private isBulkExport(query: AnalyticsQueryRequest): boolean {
    return (
      (query.vendor_ids?.length || 0) > 10 ||
      (query.date_range && this.getDateRangeDays(query.date_range) > 365)
    );
  }

  private getDateRangeDays(dateRange: { start: string; end: string }): number {
    return Math.ceil(
      (new Date(dateRange.end).getTime() -
        new Date(dateRange.start).getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }

  private async logPerformanceAlert(
    query: AnalyticsQueryRequest,
    processingTime: number,
  ): Promise<void> {
    console.warn(`PERFORMANCE ALERT: Query took ${processingTime}ms`, {
      query_complexity: this.calculateQueryComplexity(query),
      vendor_count: query.vendor_ids?.length || 0,
      metrics_count: query.metrics?.length || 0,
    });
  }

  private async logDataAccessAlert(
    userId?: string,
    dataVolume?: number,
    query?: AnalyticsQueryRequest,
  ): Promise<void> {
    console.warn(`DATA ACCESS ALERT: Large data access (${dataVolume} bytes)`, {
      user_id: userId,
      is_bulk_export: query ? this.isBulkExport(query) : false,
      is_cross_vendor: query ? this.isCrossVendorQuery(query) : false,
    });
  }

  private async checkDataRetentionCompliance(): Promise<boolean> {
    try {
      // Check if any data exceeds retention periods
      const retentionDate = new Date();
      retentionDate.setDate(
        retentionDate.getDate() - this.COMPLIANCE_SETTINGS.LOG_RETENTION_DAYS,
      );

      const { data: oldLogs } = await this.supabase
        .from('analytics_audit_log')
        .select('id')
        .lt('created_at', retentionDate.toISOString())
        .limit(1);

      return !oldLogs || oldLogs.length === 0;
    } catch (error) {
      console.error('Error checking data retention compliance:', error);
      return false;
    }
  }

  private async identifySecurityViolations(
    auditLogs: AnalyticsAuditLog[],
  ): Promise<any[]> {
    const violations = [];

    // Check for unusual access patterns
    const userActivityMap = new Map<string, number>();
    auditLogs.forEach((log) => {
      if (log.user_id) {
        userActivityMap.set(
          log.user_id,
          (userActivityMap.get(log.user_id) || 0) + 1,
        );
      }
    });

    // Flag users with excessive activity
    userActivityMap.forEach((count, userId) => {
      if (count > 1000) {
        // Threshold for suspicious activity
        violations.push({
          type: 'excessive_activity',
          user_id: userId,
          activity_count: count,
          severity: 'medium',
        });
      }
    });

    return violations;
  }

  private calculatePrivacyImpactScore(auditLogs: AnalyticsAuditLog[]): number {
    let score = 0;
    let totalLogs = auditLogs.length;

    if (totalLogs === 0) return 0;

    auditLogs.forEach((log) => {
      // Higher score for more sensitive data classifications
      switch (log.data_classification) {
        case 'restricted':
          score += 4;
          break;
        case 'confidential':
          score += 2;
          break;
        case 'internal':
          score += 1;
          break;
        case 'public':
          score += 0;
          break;
      }

      // Higher score for cross-vendor queries
      if (log.compliance_flags?.cross_vendor_access) score += 2;

      // Higher score for bulk exports
      if (log.compliance_flags?.bulk_export) score += 3;
    });

    // Normalize to 0-100 scale
    return Math.min(100, (score / totalLogs) * 10);
  }

  private async generateComplianceRecommendations(
    auditLogs: AnalyticsAuditLog[],
    securityViolations: number,
    privacyScore: number,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (securityViolations > 0) {
      recommendations.push('Review and investigate security violations');
      recommendations.push('Consider implementing additional access controls');
    }

    if (privacyScore > 50) {
      recommendations.push(
        'High privacy impact detected - review data processing activities',
      );
      recommendations.push(
        'Consider implementing additional privacy safeguards',
      );
    }

    if (auditLogs.length > 10000) {
      recommendations.push(
        'High volume of data access - consider implementing data minimization practices',
      );
    }

    const crossVendorQueries = auditLogs.filter(
      (log) => log.compliance_flags?.cross_vendor_access,
    ).length;
    if (crossVendorQueries > auditLogs.length * 0.1) {
      recommendations.push(
        'High percentage of cross-vendor queries - review access permissions',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'No significant compliance issues identified - continue monitoring',
      );
    }

    return recommendations;
  }

  private async escalateCriticalIncident(
    userId: string,
    incidentType: string,
    details: Record<string, any>,
  ): Promise<void> {
    // In production, this would integrate with alerting systems
    console.error('CRITICAL SECURITY INCIDENT:', {
      user_id: userId,
      incident_type: incidentType,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  private async checkRetentionViolations(): Promise<any[]> {
    // Implementation would check for data exceeding retention periods
    return [];
  }

  private async checkDataTransferViolations(): Promise<any[]> {
    // Implementation would check for unauthorized data transfers
    return [];
  }

  private async checkConsentViolations(): Promise<any[]> {
    // Implementation would check for missing consent records
    return [];
  }

  private async logComplianceViolation(
    type: string,
    violations: any[],
  ): Promise<void> {
    for (const violation of violations) {
      await this.logSecurityIncident(
        'system',
        `compliance_violation_${type}`,
        'high',
        violation,
      );
    }
  }

  private requiresConsent(resource: string): boolean {
    return (
      this.extractResourceType(resource) === 'client_satisfaction' ||
      this.extractResourceType(resource) === 'user_analytics'
    );
  }

  private getRetentionCategory(resource: string): string {
    const resourceType = this.extractResourceType(resource);

    if (['client_satisfaction', 'user_analytics'].includes(resourceType)) {
      return 'personal_data';
    }

    if (['financial_metrics', 'vendor_performance'].includes(resourceType)) {
      return 'business_data';
    }

    return 'operational_data';
  }

  private isAutomatedDecision(action: string): boolean {
    return (
      action.includes('automated') ||
      action.includes('algorithm') ||
      action.includes('scoring')
    );
  }

  private isHighRiskProcessing(action: string, resource: string): boolean {
    return (
      this.CRITICAL_OPERATIONS.includes(action) ||
      this.classifyData(resource) === 'restricted' ||
      resource.includes('bulk')
    );
  }
}

// Export singleton instance
export const analyticsAuditLogger = new AnalyticsAuditLogger();
