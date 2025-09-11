/**
 * WS-177 Audit Log Analyzer - Team B Pattern Detection Engine
 * ============================================================================
 * Intelligent pattern detection and security analysis for wedding audit logs
 * Detects suspicious activity, anomalies, and compliance violations
 * Integrates with existing audit infrastructure for real-time monitoring
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { weddingAuditLogger } from './audit-logger';
import type {
  SecurityPatternAnalysis,
  SecurityPatternType,
  SecuritySeverity,
  BackendAuditEvent,
  BackendAuditAction,
  BackendAuditResourceType,
} from '../../types/audit';

// Supabase client for analysis queries
const analysisSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Pattern detection thresholds for different security scenarios
 */
const DETECTION_THRESHOLDS = {
  RAPID_GUEST_ACCESS: {
    events_per_hour: 20,
    unique_guests_per_hour: 10,
    dietary_access_burst: 5,
  },
  BULK_VENDOR_OPERATIONS: {
    vendor_actions_per_minute: 10,
    contract_access_burst: 3,
    payment_access_frequency: 5,
  },
  UNUSUAL_TIMING: {
    off_hours_start: 22, // 10 PM
    off_hours_end: 6, // 6 AM
    weekend_activity_threshold: 15,
    holiday_activity_threshold: 10,
  },
  CROSS_ORG_ACCESS: {
    organization_switches_per_hour: 3,
    client_access_cross_org: 1, // Should be 0
  },
  FAILED_AUTH_CLUSTER: {
    failed_attempts_per_5min: 5,
    failed_attempts_per_ip: 10,
    lockout_threshold: 15,
  },
  PRIVILEGE_ESCALATION: {
    admin_actions_per_hour: 5,
    system_config_changes: 2,
    api_key_generations: 3,
  },
  DATA_EXPORT_ANOMALY: {
    bulk_exports_per_hour: 3,
    guest_data_exports: 2,
    financial_exports: 1,
  },
  WEDDING_DAY_IRREGULAR: {
    critical_modifications_wedding_day: 5,
    vendor_access_spikes: 20,
    guest_changes_wedding_day: 10,
  },
};

/**
 * Wedding business context patterns for enhanced detection
 */
interface WeddingBusinessPattern {
  pattern_name: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  business_impact: string;
  recommended_action: string;
}

const WEDDING_BUSINESS_PATTERNS: Record<string, WeddingBusinessPattern> = {
  last_minute_guest_changes: {
    pattern_name: 'Last-minute guest list modifications',
    description: 'High frequency of guest data changes close to wedding date',
    risk_level: 'medium',
    business_impact: 'Potential catering/seating confusion',
    recommended_action: 'Review changes with couple and vendors',
  },
  vendor_payment_access_spike: {
    pattern_name: 'Unusual vendor payment access',
    description:
      'Multiple vendors accessing payment information simultaneously',
    risk_level: 'high',
    business_impact: 'Potential financial fraud or data breach',
    recommended_action: 'Immediate security review and vendor verification',
  },
  dietary_requirements_bulk_access: {
    pattern_name: 'Bulk dietary information access',
    description: 'Mass access to guest dietary requirements',
    risk_level: 'high',
    business_impact: 'Privacy violation, potential discrimination',
    recommended_action:
      'Audit access permissions and notify guests if required',
  },
  weekend_administrative_activity: {
    pattern_name: 'Off-hours administrative changes',
    description: 'System configuration changes during weekends/holidays',
    risk_level: 'medium',
    business_impact: 'Potential unauthorized system access',
    recommended_action:
      'Verify administrator identity and change justification',
  },
};

/**
 * Main Pattern Analysis Engine
 */
export class AuditLogAnalyzer {
  private static instance: AuditLogAnalyzer;
  private analysisCache: Map<string, SecurityPatternAnalysis[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Initialize pattern detection
    this.startPeriodicAnalysis();
  }

  static getInstance(): AuditLogAnalyzer {
    if (!AuditLogAnalyzer.instance) {
      AuditLogAnalyzer.instance = new AuditLogAnalyzer();
    }
    return AuditLogAnalyzer.instance;
  }

  /**
   * Main pattern detection method - analyzes recent audit logs for suspicious patterns
   */
  async detectSuspiciousPatterns(
    organizationId: string,
    timeWindowHours: number = 24,
    useCache: boolean = true,
  ): Promise<SecurityPatternAnalysis[]> {
    const cacheKey = `${organizationId}_${timeWindowHours}`;

    // Check cache first
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.analysisCache.get(cacheKey) || [];
    }

    try {
      const endTime = new Date();
      const startTime = new Date(
        endTime.getTime() - timeWindowHours * 60 * 60 * 1000,
      );

      // Get audit logs for analysis
      const auditLogs = await this.fetchAuditLogsForAnalysis(
        organizationId,
        startTime,
        endTime,
      );

      if (auditLogs.length === 0) {
        return [];
      }

      // Run all pattern detection algorithms in parallel
      const patterns = await Promise.all([
        this.detectRapidGuestDataAccess(auditLogs, timeWindowHours),
        this.detectBulkVendorOperations(auditLogs, timeWindowHours),
        this.detectUnusualTimingPatterns(auditLogs),
        this.detectCrossOrganizationAccess(auditLogs),
        this.detectFailedAuthenticationClusters(auditLogs),
        this.detectPrivilegeEscalationAttempts(auditLogs),
        this.detectDataExportAnomalies(auditLogs),
        this.detectWeddingDayIrregularAccess(auditLogs),
      ]);

      // Flatten and sort by severity
      const allPatterns = patterns.flat().sort((a, b) => {
        const severityOrder = {
          emergency: 6,
          critical: 5,
          high: 4,
          medium: 3,
          low: 2,
          info: 1,
        };
        return (
          severityOrder[b.severity as keyof typeof severityOrder] -
          severityOrder[a.severity as keyof typeof severityOrder]
        );
      });

      // Cache results
      if (useCache) {
        this.analysisCache.set(cacheKey, allPatterns);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);
      }

      // Log analysis completion
      await weddingAuditLogger.logAuditEvent(
        'system.audit_log_access',
        'audit_trail',
        {
          resource_id: `pattern_analysis_${organizationId}`,
          wedding_context: {
            organization_id: organizationId,
            sensitivity_level: 'internal',
            business_impact: 'low',
          },
        },
      );

      return allPatterns;
    } catch (error) {
      console.error('[AUDIT LOG ANALYZER] Pattern detection error:', error);
      return [];
    }
  }

  /**
   * Detect rapid guest data access patterns (compliance critical)
   */
  private async detectRapidGuestDataAccess(
    logs: BackendAuditEvent[],
    timeWindowHours: number,
  ): Promise<SecurityPatternAnalysis[]> {
    const guestAccessLogs = logs.filter(
      (log) =>
        log.action.startsWith('guest.') &&
        [
          'guest.dietary_requirements_access',
          'guest.personal_data_export',
          'guest.contact_info_access',
        ].includes(log.action),
    );

    const patterns: SecurityPatternAnalysis[] = [];

    // Group by user to detect rapid access patterns
    const userAccessMap = new Map<string, BackendAuditEvent[]>();
    guestAccessLogs.forEach((log) => {
      if (log.user_id) {
        if (!userAccessMap.has(log.user_id)) {
          userAccessMap.set(log.user_id, []);
        }
        userAccessMap.get(log.user_id)!.push(log);
      }
    });

    userAccessMap.forEach((userLogs, userId) => {
      const eventsPerHour = userLogs.length / timeWindowHours;
      const uniqueGuests = new Set(
        userLogs.map((log) => log.wedding_context?.guest_id).filter(Boolean),
      ).size;
      const dietaryAccess = userLogs.filter(
        (log) => log.action === 'guest.dietary_requirements_access',
      ).length;

      // Check thresholds
      if (
        eventsPerHour >
          DETECTION_THRESHOLDS.RAPID_GUEST_ACCESS.events_per_hour ||
        uniqueGuests >
          DETECTION_THRESHOLDS.RAPID_GUEST_ACCESS.unique_guests_per_hour ||
        dietaryAccess >
          DETECTION_THRESHOLDS.RAPID_GUEST_ACCESS.dietary_access_burst
      ) {
        patterns.push({
          pattern_type: 'rapid_guest_data_access',
          confidence_score: this.calculateConfidenceScore(
            eventsPerHour,
            DETECTION_THRESHOLDS.RAPID_GUEST_ACCESS.events_per_hour,
          ),
          event_count: userLogs.length,
          time_window_minutes: timeWindowHours * 60,
          description: `User ${userId} accessed ${userLogs.length} guest records (${uniqueGuests} unique guests) with ${dietaryAccess} dietary requirement accesses`,
          severity:
            eventsPerHour > 50
              ? 'critical'
              : eventsPerHour > 30
                ? 'high'
                : 'medium',
          affected_users: [userId],
          recommended_actions: [
            'Review user access permissions',
            'Verify business justification for guest data access',
            'Consider implementing additional access controls',
            'Notify data protection officer if threshold exceeded',
          ],
        });
      }
    });

    return patterns;
  }

  /**
   * Detect bulk vendor operations patterns
   */
  private async detectBulkVendorOperations(
    logs: BackendAuditEvent[],
    timeWindowHours: number,
  ): Promise<SecurityPatternAnalysis[]> {
    const vendorLogs = logs.filter((log) => log.action.startsWith('vendor.'));
    const patterns: SecurityPatternAnalysis[] = [];

    // Group by time windows (15-minute intervals)
    const timeIntervals = Math.ceil(timeWindowHours * 4); // 15-minute intervals
    const intervalSize = (timeWindowHours * 60) / timeIntervals; // minutes per interval

    for (let i = 0; i < timeIntervals; i++) {
      const intervalStart = new Date(
        Date.now() -
          (timeWindowHours - (i * intervalSize) / 60) * 60 * 60 * 1000,
      );
      const intervalEnd = new Date(
        intervalStart.getTime() + intervalSize * 60 * 1000,
      );

      const intervalLogs = vendorLogs.filter((log) => {
        const logTime = new Date(log.created_at);
        return logTime >= intervalStart && logTime <= intervalEnd;
      });

      const contractAccess = intervalLogs.filter(
        (log) => log.action === 'vendor.contract_access',
      ).length;
      const paymentAccess = intervalLogs.filter(
        (log) => log.action === 'vendor.payment_information_access',
      ).length;
      const uniqueVendors = new Set(
        intervalLogs
          .map((log) => log.wedding_context?.supplier_id)
          .filter(Boolean),
      ).size;

      if (
        intervalLogs.length >
          DETECTION_THRESHOLDS.BULK_VENDOR_OPERATIONS
            .vendor_actions_per_minute *
            intervalSize ||
        contractAccess >
          DETECTION_THRESHOLDS.BULK_VENDOR_OPERATIONS.contract_access_burst ||
        paymentAccess >
          DETECTION_THRESHOLDS.BULK_VENDOR_OPERATIONS.payment_access_frequency
      ) {
        patterns.push({
          pattern_type: 'bulk_vendor_operations',
          confidence_score: this.calculateConfidenceScore(
            intervalLogs.length,
            DETECTION_THRESHOLDS.BULK_VENDOR_OPERATIONS
              .vendor_actions_per_minute * intervalSize,
          ),
          event_count: intervalLogs.length,
          time_window_minutes: intervalSize,
          description: `High vendor activity: ${intervalLogs.length} operations (${uniqueVendors} vendors) with ${paymentAccess} payment accesses`,
          severity:
            paymentAccess > 3
              ? 'high'
              : intervalLogs.length > 50
                ? 'medium'
                : 'low',
          affected_users: Array.from(
            new Set(intervalLogs.map((log) => log.user_id).filter(Boolean)),
          ),
          recommended_actions: [
            'Verify legitimate business need for bulk vendor operations',
            'Review vendor access permissions',
            'Check for automated/bot activity',
            'Monitor payment information access closely',
          ],
        });
      }
    }

    return patterns;
  }

  /**
   * Detect unusual timing patterns (off-hours activity)
   */
  private async detectUnusualTimingPatterns(
    logs: BackendAuditEvent[],
  ): Promise<SecurityPatternAnalysis[]> {
    const patterns: SecurityPatternAnalysis[] = [];

    // Analyze off-hours activity
    const offHoursLogs = logs.filter((log) => {
      const logTime = new Date(log.created_at);
      const hour = logTime.getHours();
      const dayOfWeek = logTime.getDay(); // 0 = Sunday, 6 = Saturday

      return (
        hour >= DETECTION_THRESHOLDS.UNUSUAL_TIMING.off_hours_start ||
        hour <= DETECTION_THRESHOLDS.UNUSUAL_TIMING.off_hours_end ||
        dayOfWeek === 0 ||
        dayOfWeek === 6
      ); // Weekend
    });

    if (
      offHoursLogs.length >
      DETECTION_THRESHOLDS.UNUSUAL_TIMING.weekend_activity_threshold
    ) {
      const adminActions = offHoursLogs.filter(
        (log) =>
          log.action.startsWith('system.') ||
          log.action.startsWith('auth.privileged'),
      );

      patterns.push({
        pattern_type: 'unusual_timing_pattern',
        confidence_score: Math.min(
          95,
          (offHoursLogs.length /
            DETECTION_THRESHOLDS.UNUSUAL_TIMING.weekend_activity_threshold) *
            70,
        ),
        event_count: offHoursLogs.length,
        time_window_minutes: 24 * 60,
        description: `${offHoursLogs.length} activities during off-hours/weekends, including ${adminActions.length} administrative actions`,
        severity: adminActions.length > 0 ? 'high' : 'medium',
        affected_users: Array.from(
          new Set(offHoursLogs.map((log) => log.user_id).filter(Boolean)),
        ),
        recommended_actions: [
          'Verify user identity and business justification',
          'Review access logs for legitimate business need',
          'Consider implementing time-based access restrictions',
          'Alert security team for unusual administrative activity',
        ],
      });
    }

    return patterns;
  }

  /**
   * Detect cross-organization access attempts
   */
  private async detectCrossOrganizationAccess(
    logs: BackendAuditEvent[],
  ): Promise<SecurityPatternAnalysis[]> {
    const patterns: SecurityPatternAnalysis[] = [];

    // Group logs by user and check organization consistency
    const userOrgMap = new Map<string, Set<string>>();
    logs.forEach((log) => {
      if (log.user_id && log.organization_id) {
        if (!userOrgMap.has(log.user_id)) {
          userOrgMap.set(log.user_id, new Set());
        }
        userOrgMap.get(log.user_id)!.add(log.organization_id);
      }
    });

    userOrgMap.forEach((organizations, userId) => {
      if (organizations.size > 1) {
        const suspiciousLogs = logs.filter((log) => log.user_id === userId);

        patterns.push({
          pattern_type: 'cross_organization_access',
          confidence_score: 90, // High confidence - this should rarely be legitimate
          event_count: suspiciousLogs.length,
          time_window_minutes: 24 * 60,
          description: `User ${userId} accessed data from ${organizations.size} different organizations`,
          severity: 'critical',
          affected_users: [userId],
          recommended_actions: [
            'IMMEDIATE: Suspend user access pending investigation',
            'Review user account for compromise',
            'Verify legitimate cross-organization access needs',
            'Notify affected organizations',
            'Implement stricter organization boundary controls',
          ],
        });
      }
    });

    return patterns;
  }

  /**
   * Detect failed authentication clusters
   */
  private async detectFailedAuthenticationClusters(
    logs: BackendAuditEvent[],
  ): Promise<SecurityPatternAnalysis[]> {
    // Note: This would typically analyze auth logs, but we'll check for related patterns
    const patterns: SecurityPatternAnalysis[] = [];

    // Look for patterns that might indicate auth issues (repeated access denials, etc.)
    const suspiciousLogs = logs.filter(
      (log) =>
        log.metadata?.security_flags?.authentication_failed ||
        log.metadata?.security_flags?.authorization_bypassed ||
        (log.response_status &&
          log.response_status >= 401 &&
          log.response_status <= 403),
    );

    if (
      suspiciousLogs.length >
      DETECTION_THRESHOLDS.FAILED_AUTH_CLUSTER.failed_attempts_per_5min
    ) {
      // Group by IP address
      const ipGroups = new Map<string, BackendAuditEvent[]>();
      suspiciousLogs.forEach((log) => {
        if (log.ip_address) {
          if (!ipGroups.has(log.ip_address)) {
            ipGroups.set(log.ip_address, []);
          }
          ipGroups.get(log.ip_address)!.push(log);
        }
      });

      ipGroups.forEach((ipLogs, ipAddress) => {
        if (
          ipLogs.length >=
          DETECTION_THRESHOLDS.FAILED_AUTH_CLUSTER.failed_attempts_per_ip
        ) {
          patterns.push({
            pattern_type: 'failed_authentication_cluster',
            confidence_score: Math.min(
              95,
              (ipLogs.length /
                DETECTION_THRESHOLDS.FAILED_AUTH_CLUSTER
                  .failed_attempts_per_ip) *
                80,
            ),
            event_count: ipLogs.length,
            time_window_minutes: 24 * 60,
            description: `${ipLogs.length} authentication/authorization failures from IP ${ipAddress}`,
            severity:
              ipLogs.length >
              DETECTION_THRESHOLDS.FAILED_AUTH_CLUSTER.lockout_threshold
                ? 'critical'
                : 'high',
            affected_users: Array.from(
              new Set(ipLogs.map((log) => log.user_id).filter(Boolean)),
            ),
            recommended_actions: [
              'Block IP address if attack pattern confirmed',
              'Review and strengthen authentication mechanisms',
              'Implement progressive delays for failed attempts',
              'Alert security team for potential brute force attack',
            ],
          });
        }
      });
    }

    return patterns;
  }

  /**
   * Detect privilege escalation attempts
   */
  private async detectPrivilegeEscalationAttempts(
    logs: BackendAuditEvent[],
  ): Promise<SecurityPatternAnalysis[]> {
    const patterns: SecurityPatternAnalysis[] = [];

    const privilegedActions = logs.filter(
      (log) =>
        log.action.startsWith('auth.privileged') ||
        log.action.startsWith('system.') ||
        log.action === 'auth.api_key_generation' ||
        log.metadata?.security_flags?.elevated_privileges_used,
    );

    if (
      privilegedActions.length >
      DETECTION_THRESHOLDS.PRIVILEGE_ESCALATION.admin_actions_per_hour
    ) {
      // Group by user
      const userPrivilegeMap = new Map<string, BackendAuditEvent[]>();
      privilegedActions.forEach((log) => {
        if (log.user_id) {
          if (!userPrivilegeMap.has(log.user_id)) {
            userPrivilegeMap.set(log.user_id, []);
          }
          userPrivilegeMap.get(log.user_id)!.push(log);
        }
      });

      userPrivilegeMap.forEach((userLogs, userId) => {
        if (
          userLogs.length >
          DETECTION_THRESHOLDS.PRIVILEGE_ESCALATION.admin_actions_per_hour
        ) {
          const apiKeyGenerations = userLogs.filter(
            (log) => log.action === 'auth.api_key_generation',
          ).length;
          const systemChanges = userLogs.filter((log) =>
            log.action.startsWith('system.'),
          ).length;

          patterns.push({
            pattern_type: 'privilege_escalation_attempt',
            confidence_score: Math.min(
              90,
              (userLogs.length /
                DETECTION_THRESHOLDS.PRIVILEGE_ESCALATION
                  .admin_actions_per_hour) *
                75,
            ),
            event_count: userLogs.length,
            time_window_minutes: 60,
            description: `User ${userId} performed ${userLogs.length} privileged actions including ${apiKeyGenerations} API key generations and ${systemChanges} system changes`,
            severity:
              apiKeyGenerations > 0
                ? 'critical'
                : systemChanges > 2
                  ? 'high'
                  : 'medium',
            affected_users: [userId],
            recommended_actions: [
              'Review user role and permission assignments',
              'Verify business justification for privileged actions',
              'Implement additional approval workflow for critical operations',
              'Monitor user activity closely for next 24-48 hours',
            ],
          });
        }
      });
    }

    return patterns;
  }

  /**
   * Detect data export anomalies
   */
  private async detectDataExportAnomalies(
    logs: BackendAuditEvent[],
  ): Promise<SecurityPatternAnalysis[]> {
    const patterns: SecurityPatternAnalysis[] = [];

    const exportLogs = logs.filter(
      (log) =>
        log.action.includes('export') ||
        log.action.includes('bulk') ||
        log.metadata?.security_flags?.data_export,
    );

    if (
      exportLogs.length >
      DETECTION_THRESHOLDS.DATA_EXPORT_ANOMALY.bulk_exports_per_hour
    ) {
      const guestExports = exportLogs.filter((log) =>
        log.action.includes('guest'),
      ).length;
      const financialExports = exportLogs.filter(
        (log) =>
          log.action.includes('budget') ||
          log.action.includes('payment') ||
          log.resource_type === 'payment_record',
      ).length;

      patterns.push({
        pattern_type: 'data_export_anomaly',
        confidence_score: Math.min(
          95,
          (exportLogs.length /
            DETECTION_THRESHOLDS.DATA_EXPORT_ANOMALY.bulk_exports_per_hour) *
            80,
        ),
        event_count: exportLogs.length,
        time_window_minutes: 60,
        description: `${exportLogs.length} data export operations including ${guestExports} guest data exports and ${financialExports} financial exports`,
        severity: guestExports > 1 || financialExports > 0 ? 'high' : 'medium',
        affected_users: Array.from(
          new Set(exportLogs.map((log) => log.user_id).filter(Boolean)),
        ),
        recommended_actions: [
          'Review data export permissions and business justification',
          'Verify compliance with data protection regulations',
          'Implement additional approval workflows for sensitive data exports',
          'Monitor exported data usage and retention',
        ],
      });
    }

    return patterns;
  }

  /**
   * Detect wedding day irregular access patterns
   */
  private async detectWeddingDayIrregularAccess(
    logs: BackendAuditEvent[],
  ): Promise<SecurityPatternAnalysis[]> {
    const patterns: SecurityPatternAnalysis[] = [];

    // This would need wedding date information - simplified for now
    const criticalModifications = logs.filter(
      (log) =>
        log.wedding_context?.business_impact === 'wedding_day_critical' ||
        (log.action.includes('critical') && log.action.includes('modify')),
    );

    const vendorAccessSpikes = logs.filter(
      (log) =>
        log.action.startsWith('vendor.') &&
        log.wedding_context?.business_impact === 'critical',
    );

    if (
      criticalModifications.length >
        DETECTION_THRESHOLDS.WEDDING_DAY_IRREGULAR
          .critical_modifications_wedding_day ||
      vendorAccessSpikes.length >
        DETECTION_THRESHOLDS.WEDDING_DAY_IRREGULAR.vendor_access_spikes
    ) {
      patterns.push({
        pattern_type: 'wedding_day_irregular_access',
        confidence_score: 85,
        event_count: criticalModifications.length + vendorAccessSpikes.length,
        time_window_minutes: 24 * 60,
        description: `High-risk wedding day activity: ${criticalModifications.length} critical modifications and ${vendorAccessSpikes.length} vendor access spikes`,
        severity: 'high',
        affected_users: Array.from(
          new Set(
            [
              ...criticalModifications.map((log) => log.user_id),
              ...vendorAccessSpikes.map((log) => log.user_id),
            ].filter(Boolean),
          ),
        ),
        recommended_actions: [
          'Notify wedding coordinators immediately',
          'Verify all changes with couple and primary vendors',
          'Implement change freeze except for genuine emergencies',
          'Prepare contingency plans for detected issues',
        ],
      });
    }

    return patterns;
  }

  /**
   * Helper methods
   */

  private async fetchAuditLogsForAnalysis(
    organizationId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<BackendAuditEvent[]> {
    try {
      const { data, error } = await analysisSupabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(5000); // Reasonable limit for analysis

      if (error) {
        console.error('[AUDIT LOG ANALYZER] Fetch error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[AUDIT LOG ANALYZER] Fetch exception:', error);
      return [];
    }
  }

  private calculateConfidenceScore(
    actualValue: number,
    threshold: number,
  ): number {
    const ratio = actualValue / threshold;
    if (ratio >= 3) return 95;
    if (ratio >= 2) return 85;
    if (ratio >= 1.5) return 75;
    if (ratio >= 1.2) return 65;
    return 50;
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? expiry > Date.now() : false;
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every 15 minutes for real-time monitoring
    setInterval(
      async () => {
        try {
          // This would get organization IDs from active sessions/database
          // For now, we'll just clear cache to ensure fresh analysis
          this.analysisCache.clear();
          this.cacheExpiry.clear();
        } catch (error) {
          console.error('[AUDIT LOG ANALYZER] Periodic analysis error:', error);
        }
      },
      15 * 60 * 1000,
    );
  }

  /**
   * Public API methods for integration with other systems
   */

  async getRealtimeSecurityAlerts(
    organizationId: string,
  ): Promise<SecurityPatternAnalysis[]> {
    const patterns = await this.detectSuspiciousPatterns(
      organizationId,
      1,
      false,
    ); // Last hour, no cache
    return patterns.filter(
      (pattern) =>
        pattern.severity === 'critical' || pattern.severity === 'high',
    );
  }

  async generateSecurityReport(
    organizationId: string,
    days: number = 7,
  ): Promise<{
    summary: {
      total_patterns: number;
      critical_alerts: number;
      high_risk_patterns: number;
      most_common_pattern: string;
    };
    patterns: SecurityPatternAnalysis[];
    recommendations: string[];
  }> {
    const patterns = await this.detectSuspiciousPatterns(
      organizationId,
      days * 24,
      false,
    );

    const critical = patterns.filter((p) => p.severity === 'critical').length;
    const high = patterns.filter((p) => p.severity === 'high').length;

    // Find most common pattern type
    const patternCounts = patterns.reduce(
      (acc, p) => {
        acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommon =
      Object.entries(patternCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'none';

    return {
      summary: {
        total_patterns: patterns.length,
        critical_alerts: critical,
        high_risk_patterns: high,
        most_common_pattern: mostCommon,
      },
      patterns,
      recommendations: this.generateSecurityRecommendations(patterns),
    };
  }

  private generateSecurityRecommendations(
    patterns: SecurityPatternAnalysis[],
  ): string[] {
    const recommendations = new Set<string>();

    patterns.forEach((pattern) => {
      pattern.recommended_actions.forEach((action) =>
        recommendations.add(action),
      );
    });

    // Add general recommendations based on pattern types
    const patternTypes = new Set(patterns.map((p) => p.pattern_type));

    if (patternTypes.has('rapid_guest_data_access')) {
      recommendations.add(
        'Implement role-based access controls for guest data',
      );
      recommendations.add('Add audit alerts for bulk guest data access');
    }

    if (patternTypes.has('cross_organization_access')) {
      recommendations.add('Strengthen organization boundary controls');
      recommendations.add(
        'Implement additional authentication for cross-org access',
      );
    }

    if (patternTypes.has('privilege_escalation_attempt')) {
      recommendations.add(
        'Review and tighten administrative permission assignments',
      );
      recommendations.add(
        'Implement multi-factor authentication for privileged operations',
      );
    }

    return Array.from(recommendations);
  }
}

// Export singleton instance
export const auditLogAnalyzer = AuditLogAnalyzer.getInstance();
