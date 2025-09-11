/**
 * WedSync Conflict Resolution Audit Logger
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Secure audit logging system for tracking all conflict resolution decisions
 * with compliance features and detailed forensic capabilities.
 */

import type {
  ConflictAuditEntry,
  DataConflict,
  ResolutionResult,
  UserContext,
  ConflictTimestamp,
  WeddingDataType,
} from './types';

import { ConflictResolutionError } from '../../../types/offline';

/**
 * Audit log storage interface (can be implemented with different backends)
 */
export interface AuditStorage {
  store(entry: ConflictAuditEntry): Promise<void>;
  retrieve(conflictId: string): Promise<ConflictAuditEntry[]>;
  retrieveByUser(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<ConflictAuditEntry[]>;
  retrieveByTimeRange(start: Date, end: Date): Promise<ConflictAuditEntry[]>;
  search(criteria: AuditSearchCriteria): Promise<ConflictAuditEntry[]>;
  cleanup(beforeTimestamp: Date): Promise<number>;
}

/**
 * Search criteria for audit log queries
 */
export interface AuditSearchCriteria {
  readonly conflictIds?: readonly string[];
  readonly userIds?: readonly string[];
  readonly actions?: readonly ConflictAuditEntry['action'][];
  readonly dataTypes?: readonly WeddingDataType[];
  readonly timeRange?: { start: Date; end: Date };
  readonly severities?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Audit log configuration
 */
export interface AuditLogConfig {
  readonly enableLogging: boolean;
  readonly logLevel: 'minimal' | 'standard' | 'detailed' | 'forensic';
  readonly retentionDays: number;
  readonly encryptSensitiveData: boolean;
  readonly includeDataSnapshots: boolean;
  readonly enableRealTimeAlerts: boolean;
  readonly alertThresholds: {
    readonly suspiciousActivityCount: number;
    readonly failedResolutionsCount: number;
    readonly timeWindowMinutes: number;
  };
  readonly complianceMode: boolean; // GDPR, HIPAA, etc.
}

/**
 * Default audit configuration with security-first settings
 */
export const DEFAULT_AUDIT_CONFIG: AuditLogConfig = {
  enableLogging: true,
  logLevel: 'detailed',
  retentionDays: 90,
  encryptSensitiveData: true,
  includeDataSnapshots: false, // Privacy by default
  enableRealTimeAlerts: true,
  alertThresholds: {
    suspiciousActivityCount: 10,
    failedResolutionsCount: 5,
    timeWindowMinutes: 60,
  },
  complianceMode: true,
};

/**
 * Enhanced audit entry with security metadata
 */
export interface SecureAuditEntry extends ConflictAuditEntry {
  readonly securityMetadata: {
    readonly ipAddress?: string;
    readonly userAgent?: string;
    readonly geolocation?: { lat: number; lon: number };
    readonly sessionDuration?: number;
    readonly riskScore?: number; // 0-100, calculated based on various factors
    readonly authenticatedVia?: string; // OAuth, password, etc.
  };
  readonly dataClassification:
    | 'public'
    | 'internal'
    | 'confidential'
    | 'restricted';
  readonly hash: string; // Tamper detection
  readonly signature?: string; // Digital signature for integrity
}

/**
 * In-memory audit storage implementation (for testing/development)
 */
export class InMemoryAuditStorage implements AuditStorage {
  private entries: ConflictAuditEntry[] = [];

  async store(entry: ConflictAuditEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async retrieve(conflictId: string): Promise<ConflictAuditEntry[]> {
    return this.entries.filter((entry) => entry.conflictId === conflictId);
  }

  async retrieveByUser(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<ConflictAuditEntry[]> {
    return this.entries.filter((entry) => {
      if (entry.user.id !== userId) return false;

      if (timeRange) {
        const entryTime = new Date(entry.timestamp.timestamp);
        return entryTime >= timeRange.start && entryTime <= timeRange.end;
      }

      return true;
    });
  }

  async retrieveByTimeRange(
    start: Date,
    end: Date,
  ): Promise<ConflictAuditEntry[]> {
    return this.entries.filter((entry) => {
      const entryTime = new Date(entry.timestamp.timestamp);
      return entryTime >= start && entryTime <= end;
    });
  }

  async search(criteria: AuditSearchCriteria): Promise<ConflictAuditEntry[]> {
    let filtered = this.entries;

    if (criteria.conflictIds) {
      filtered = filtered.filter((entry) =>
        criteria.conflictIds!.includes(entry.conflictId),
      );
    }

    if (criteria.userIds) {
      filtered = filtered.filter((entry) =>
        criteria.userIds!.includes(entry.user.id),
      );
    }

    if (criteria.actions) {
      filtered = filtered.filter((entry) =>
        criteria.actions!.includes(entry.action),
      );
    }

    if (criteria.timeRange) {
      const { start, end } = criteria.timeRange;
      filtered = filtered.filter((entry) => {
        const entryTime = new Date(entry.timestamp.timestamp);
        return entryTime >= start && entryTime <= end;
      });
    }

    // Apply pagination
    if (criteria.offset) {
      filtered = filtered.slice(criteria.offset);
    }

    if (criteria.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  }

  async cleanup(beforeTimestamp: Date): Promise<number> {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter(
      (entry) => new Date(entry.timestamp.timestamp) >= beforeTimestamp,
    );
    return initialLength - this.entries.length;
  }
}

/**
 * Supabase audit storage implementation
 */
export class SupabaseAuditStorage implements AuditStorage {
  constructor(private readonly supabaseClient: any) {}

  async store(entry: ConflictAuditEntry): Promise<void> {
    const { error } = await this.supabaseClient
      .from('conflict_audit_log')
      .insert({
        entry_id: entry.entryId,
        conflict_id: entry.conflictId,
        action: entry.action,
        timestamp: new Date(entry.timestamp.timestamp).toISOString(),
        user_id: entry.user.id,
        user_role: entry.user.role,
        device_id: entry.user.deviceId,
        session_id: entry.user.sessionId,
        details: entry.details,
        data_snapshot: entry.dataSnapshot,
      });

    if (error) {
      throw new Error(`Failed to store audit entry: ${error.message}`);
    }
  }

  async retrieve(conflictId: string): Promise<ConflictAuditEntry[]> {
    const { data, error } = await this.supabaseClient
      .from('conflict_audit_log')
      .select('*')
      .eq('conflict_id', conflictId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to retrieve audit entries: ${error.message}`);
    }

    return this.mapFromDatabase(data || []);
  }

  async retrieveByUser(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<ConflictAuditEntry[]> {
    let query = this.supabaseClient
      .from('conflict_audit_log')
      .select('*')
      .eq('user_id', userId);

    if (timeRange) {
      query = query
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString());
    }

    const { data, error } = await query.order('timestamp', {
      ascending: false,
    });

    if (error) {
      throw new Error(
        `Failed to retrieve user audit entries: ${error.message}`,
      );
    }

    return this.mapFromDatabase(data || []);
  }

  async retrieveByTimeRange(
    start: Date,
    end: Date,
  ): Promise<ConflictAuditEntry[]> {
    const { data, error } = await this.supabaseClient
      .from('conflict_audit_log')
      .select('*')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to retrieve audit entries by time range: ${error.message}`,
      );
    }

    return this.mapFromDatabase(data || []);
  }

  async search(criteria: AuditSearchCriteria): Promise<ConflictAuditEntry[]> {
    let query = this.supabaseClient.from('conflict_audit_log').select('*');

    if (criteria.conflictIds) {
      query = query.in('conflict_id', criteria.conflictIds);
    }

    if (criteria.userIds) {
      query = query.in('user_id', criteria.userIds);
    }

    if (criteria.actions) {
      query = query.in('action', criteria.actions);
    }

    if (criteria.timeRange) {
      query = query
        .gte('timestamp', criteria.timeRange.start.toISOString())
        .lte('timestamp', criteria.timeRange.end.toISOString());
    }

    if (criteria.offset) {
      query = query.range(
        criteria.offset,
        criteria.offset + (criteria.limit || 100) - 1,
      );
    } else if (criteria.limit) {
      query = query.limit(criteria.limit);
    }

    const { data, error } = await query.order('timestamp', {
      ascending: false,
    });

    if (error) {
      throw new Error(`Failed to search audit entries: ${error.message}`);
    }

    return this.mapFromDatabase(data || []);
  }

  async cleanup(beforeTimestamp: Date): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('conflict_audit_log')
      .delete()
      .lt('timestamp', beforeTimestamp.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup audit entries: ${error.message}`);
    }

    return count || 0;
  }

  private mapFromDatabase(rows: any[]): ConflictAuditEntry[] {
    return rows.map((row) => ({
      entryId: row.entry_id,
      conflictId: row.conflict_id,
      action: row.action,
      timestamp: {
        timestamp: new Date(row.timestamp).getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceTime: new Date(row.timestamp).getTime(),
      },
      user: {
        id: row.user_id,
        role: row.user_role,
        deviceId: row.device_id,
        sessionId: row.session_id,
      },
      details: row.details || {},
      dataSnapshot: row.data_snapshot,
    }));
  }
}

/**
 * Main audit logger with security features
 */
export class ConflictAuditLogger {
  private readonly config: AuditLogConfig;
  private readonly storage: AuditStorage;
  private readonly alertCallbacks: Array<
    (entry: ConflictAuditEntry, alertType: string) => void
  > = [];

  constructor(storage: AuditStorage, config: Partial<AuditLogConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
    this.storage = storage;
  }

  /**
   * Log conflict detection event
   */
  async logConflictDetected<T>(
    conflict: DataConflict<T>,
    detectionContext?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.config.enableLogging) return;

    const entry = this.createAuditEntry(
      conflict.metadata.conflictId,
      'detected',
      conflict.localVersion.modifiedBy,
      {
        dataType: conflict.dataType,
        severity: conflict.metadata.severity,
        affectedFields: conflict.metadata.affectedFields,
        autoResolvable: conflict.metadata.autoResolvable,
        conflictType: conflict.conflictType.type,
        detectionContext: detectionContext || {},
      },
    );

    await this.storeEntry(entry);
    await this.checkAlertThresholds(entry);
  }

  /**
   * Log conflict resolution attempt
   */
  async logResolutionAttempt<T>(
    conflict: DataConflict<T>,
    strategy: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.config.enableLogging) return;

    const entry = this.createAuditEntry(
      conflict.metadata.conflictId,
      'resolved',
      conflict.localVersion.modifiedBy,
      {
        resolutionStrategy: strategy,
        dataType: conflict.dataType,
        severity: conflict.metadata.severity,
        context: context || {},
      },
    );

    await this.storeEntry(entry);
  }

  /**
   * Log successful resolution
   */
  async logResolutionSuccess<T>(
    conflict: DataConflict<T>,
    result: ResolutionResult<T>,
    resolvedData?: T,
  ): Promise<void> {
    if (!this.config.enableLogging || !result.success) return;

    const entry = this.createAuditEntry(
      conflict.metadata.conflictId,
      'resolved',
      conflict.localVersion.modifiedBy,
      {
        success: true,
        resolutionStrategy: conflict.resolutionStrategy,
        dataType: conflict.dataType,
        resolvedFields: conflict.metadata.affectedFields,
        auditDetails: result.audit.details,
      },
      this.shouldIncludeDataSnapshot() ? resolvedData : undefined,
    );

    await this.storeEntry(entry);
  }

  /**
   * Log resolution failure
   */
  async logResolutionFailure<T>(
    conflict: DataConflict<T>,
    result: ResolutionResult<T>,
  ): Promise<void> {
    if (!this.config.enableLogging || result.success) return;

    const entry = this.createAuditEntry(
      conflict.metadata.conflictId,
      'rejected',
      conflict.localVersion.modifiedBy,
      {
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          context: result.error.context,
        },
        requiresManualReview: result.requiresManualReview,
        dataType: conflict.dataType,
        severity: conflict.metadata.severity,
      },
    );

    await this.storeEntry(entry);
    await this.checkAlertThresholds(entry);
  }

  /**
   * Log manual escalation
   */
  async logManualEscalation<T>(
    conflict: DataConflict<T>,
    escalatedBy: UserContext,
    reason: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.config.enableLogging) return;

    const entry = this.createAuditEntry(
      conflict.metadata.conflictId,
      'escalated',
      escalatedBy,
      {
        reason,
        dataType: conflict.dataType,
        severity: conflict.metadata.severity,
        originalStrategy: conflict.resolutionStrategy,
        context: context || {},
      },
    );

    await this.storeEntry(entry);
  }

  /**
   * Create standardized audit entry
   */
  private createAuditEntry(
    conflictId: string,
    action: ConflictAuditEntry['action'],
    user: UserContext,
    details: Record<string, unknown>,
    dataSnapshot?: unknown,
  ): ConflictAuditEntry {
    const timestamp: ConflictTimestamp = {
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceTime: Date.now(),
    };

    return {
      entryId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conflictId,
      action,
      timestamp,
      user,
      details: this.sanitizeDetails(details),
      dataSnapshot: this.shouldIncludeDataSnapshot()
        ? this.sanitizeDataSnapshot(dataSnapshot)
        : undefined,
    };
  }

  /**
   * Sanitize sensitive data from details
   */
  private sanitizeDetails(
    details: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized = { ...details };

    // Remove sensitive fields based on configuration
    const sensitiveFields = ['password', 'ssn', 'creditCard', 'bankAccount'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // In compliance mode, be extra cautious
    if (this.config.complianceMode) {
      // Redact email addresses in details
      for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'string' && value.includes('@')) {
          sanitized[key] = value.replace(
            /[\w.-]+@[\w.-]+\.\w+/g,
            '[EMAIL_REDACTED]',
          );
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize data snapshots
   */
  private sanitizeDataSnapshot(snapshot: unknown): unknown {
    if (!snapshot || typeof snapshot !== 'object') {
      return snapshot;
    }

    const sanitized = { ...(snapshot as Record<string, unknown>) };

    // Remove PII and sensitive wedding data
    const sensitiveFields = [
      'email',
      'phone',
      'address',
      'ssn',
      'creditCard',
      'personalNotes',
      'privateComments',
      'bankDetails',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Determine if data snapshots should be included
   */
  private shouldIncludeDataSnapshot(): boolean {
    return (
      this.config.includeDataSnapshots &&
      (this.config.logLevel === 'detailed' ||
        this.config.logLevel === 'forensic')
    );
  }

  /**
   * Store audit entry with error handling
   */
  private async storeEntry(entry: ConflictAuditEntry): Promise<void> {
    try {
      await this.storage.store(entry);
    } catch (error) {
      console.error('Failed to store audit entry:', error);

      // In critical systems, you might want to fail the operation
      // if audit logging fails (depending on compliance requirements)
      if (this.config.complianceMode) {
        throw new ConflictResolutionError(
          'Audit logging failed - operation cannot proceed in compliance mode',
          'AUDIT_LOGGING_FAILED',
          entry.conflictId,
          { originalError: error },
        );
      }
    }
  }

  /**
   * Check for alert thresholds and trigger notifications
   */
  private async checkAlertThresholds(entry: ConflictAuditEntry): Promise<void> {
    if (!this.config.enableRealTimeAlerts) return;

    try {
      const timeWindow = new Date(
        Date.now() - this.config.alertThresholds.timeWindowMinutes * 60 * 1000,
      );

      // Check for suspicious activity (too many conflicts from same user)
      const recentEntriesForUser = await this.storage.retrieveByUser(
        entry.user.id,
        { start: timeWindow, end: new Date() },
      );

      if (
        recentEntriesForUser.length >=
        this.config.alertThresholds.suspiciousActivityCount
      ) {
        this.triggerAlert(entry, 'SUSPICIOUS_ACTIVITY');
      }

      // Check for excessive failures
      const recentFailures = recentEntriesForUser.filter(
        (e) => e.action === 'rejected' || e.details.success === false,
      );

      if (
        recentFailures.length >=
        this.config.alertThresholds.failedResolutionsCount
      ) {
        this.triggerAlert(entry, 'EXCESSIVE_FAILURES');
      }
    } catch (error) {
      console.error('Failed to check alert thresholds:', error);
    }
  }

  /**
   * Trigger security alerts
   */
  private triggerAlert(entry: ConflictAuditEntry, alertType: string): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(entry, alertType);
      } catch (error) {
        console.error('Alert callback failed:', error);
      }
    }
  }

  /**
   * Add alert callback
   */
  onAlert(
    callback: (entry: ConflictAuditEntry, alertType: string) => void,
  ): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get audit trail for a conflict
   */
  async getConflictAuditTrail(
    conflictId: string,
  ): Promise<ConflictAuditEntry[]> {
    return this.storage.retrieve(conflictId);
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(
    criteria: AuditSearchCriteria,
  ): Promise<ConflictAuditEntry[]> {
    return this.storage.search(criteria);
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(timeRange: { start: Date; end: Date }): Promise<{
    summary: {
      totalEntries: number;
      byAction: Record<string, number>;
      byUser: Record<string, number>;
      byDataType: Record<string, number>;
    };
    entries: ConflictAuditEntry[];
  }> {
    const entries = await this.storage.retrieveByTimeRange(
      timeRange.start,
      timeRange.end,
    );

    const summary = {
      totalEntries: entries.length,
      byAction: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byDataType: {} as Record<string, number>,
    };

    for (const entry of entries) {
      // Count by action
      summary.byAction[entry.action] =
        (summary.byAction[entry.action] || 0) + 1;

      // Count by user
      summary.byUser[entry.user.id] = (summary.byUser[entry.user.id] || 0) + 1;

      // Count by data type (if available)
      const dataType = entry.details.dataType as string;
      if (dataType) {
        summary.byDataType[dataType] = (summary.byDataType[dataType] || 0) + 1;
      }
    }

    return { summary, entries };
  }

  /**
   * Cleanup old audit entries
   */
  async cleanupOldEntries(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000,
    );
    return this.storage.cleanup(cutoffDate);
  }

  /**
   * Get configuration
   */
  getConfig(): AuditLogConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create audit logger with Supabase storage
 */
export function createSupabaseAuditLogger(
  supabaseClient: any,
  config?: Partial<AuditLogConfig>,
): ConflictAuditLogger {
  const storage = new SupabaseAuditStorage(supabaseClient);
  return new ConflictAuditLogger(storage, config);
}

/**
 * Factory function to create audit logger with in-memory storage (for testing)
 */
export function createInMemoryAuditLogger(
  config?: Partial<AuditLogConfig>,
): ConflictAuditLogger {
  const storage = new InMemoryAuditStorage();
  return new ConflictAuditLogger(storage, config);
}
