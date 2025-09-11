/**
 * WedSync Conflict Resolution Strategies
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Advanced merge algorithms and resolution strategies for wedding planning data
 * with intelligent field-level merging and data integrity preservation.
 */

import type {
  DataConflict,
  ConflictAuditEntry,
  ResolutionResult,
  UserContext,
  VersionedData,
  TimelineItem,
  VendorContact,
  GuestEntry,
} from './types';

import { ConflictResolutionError } from '../../../types/offline';

/**
 * Main conflict resolver with strategy pattern implementation
 */
export class ConflictResolver<T extends Record<string, unknown>> {
  private readonly auditTrail: ConflictAuditEntry[] = [];

  /**
   * Create audit entry for resolution tracking
   */
  private createAuditEntry(
    conflict: DataConflict<T>,
    action: ConflictAuditEntry['action'],
    details: Record<string, unknown>,
    resolvedData?: T,
  ): ConflictAuditEntry {
    return {
      entryId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conflictId: conflict.metadata.conflictId,
      action,
      timestamp: {
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceTime: Date.now(),
      },
      user: conflict.localVersion.modifiedBy, // Current user context
      details,
      dataSnapshot: resolvedData,
    };
  }

  /**
   * Last write wins strategy - uses timestamps to determine winner
   */
  private resolveLastWriteWins(conflict: DataConflict<T>): ResolutionResult<T> {
    try {
      const localTimestamp = conflict.localVersion.lastModified.timestamp;
      const remoteTimestamp = conflict.remoteVersion.lastModified.timestamp;

      const winner =
        localTimestamp > remoteTimestamp
          ? conflict.localVersion
          : conflict.remoteVersion;

      const audit = this.createAuditEntry(
        conflict,
        'resolved',
        {
          strategy: 'last-write-wins',
          localTimestamp,
          remoteTimestamp,
          winner: winner === conflict.localVersion ? 'local' : 'remote',
          winningVersion: winner.version,
        },
        winner.data,
      );

      this.auditTrail.push(audit);

      return {
        success: true,
        resolvedData: winner.data,
        audit,
      };
    } catch (error) {
      const errorResult = new ConflictResolutionError(
        'Failed to resolve using last-write-wins strategy',
        'LAST_WRITE_WINS_FAILED',
        conflict.metadata.conflictId,
        { originalError: error },
      );

      return {
        success: false,
        error: errorResult,
        requiresManualReview: true,
      };
    }
  }

  /**
   * Intelligent field merging with wedding-specific logic
   */
  private resolveMergeFields(conflict: DataConflict<T>): ResolutionResult<T> {
    try {
      const merged = { ...conflict.localVersion.data };
      const remoteData = conflict.remoteVersion.data;
      const conflictingFields = conflict.metadata.affectedFields;
      const mergeDetails: Record<string, any> = {};

      for (const field of conflictingFields) {
        const localValue = merged[field];
        const remoteValue = remoteData[field];

        const mergeResult = this.mergeField(
          field,
          localValue,
          remoteValue,
          conflict.dataType,
        );
        merged[field] = mergeResult.value as T[keyof T];
        mergeDetails[field] = mergeResult.strategy;
      }

      const audit = this.createAuditEntry(
        conflict,
        'merged',
        {
          strategy: 'merge-fields',
          conflictingFields,
          mergeDetails,
          totalFieldsMerged: conflictingFields.length,
        },
        merged,
      );

      this.auditTrail.push(audit);

      return {
        success: true,
        resolvedData: merged,
        audit,
      };
    } catch (error) {
      return {
        success: false,
        error: new ConflictResolutionError(
          'Failed to merge conflicting fields',
          'FIELD_MERGE_FAILED',
          conflict.metadata.conflictId,
          { originalError: error },
        ),
        requiresManualReview: true,
      };
    }
  }

  /**
   * Smart field merging logic based on data type and field characteristics
   */
  private mergeField(
    field: string,
    localValue: unknown,
    remoteValue: unknown,
    dataType: string,
  ): { value: unknown; strategy: string } {
    // Handle null/undefined values
    if (localValue == null && remoteValue != null) {
      return { value: remoteValue, strategy: 'use-remote-non-null' };
    }
    if (localValue != null && remoteValue == null) {
      return { value: localValue, strategy: 'use-local-non-null' };
    }
    if (localValue == null && remoteValue == null) {
      return { value: null, strategy: 'both-null' };
    }

    // Array merging (tags, assignees, notes, etc.)
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return this.mergeArrays(localValue, remoteValue, field);
    }

    // String merging with wedding context
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      return this.mergeStrings(localValue, remoteValue, field, dataType);
    }

    // Number merging (budget, priority, etc.)
    if (typeof localValue === 'number' && typeof remoteValue === 'number') {
      return this.mergeNumbers(localValue, remoteValue, field, dataType);
    }

    // Date merging (critical for timeline items)
    if (localValue instanceof Date && remoteValue instanceof Date) {
      return this.mergeDates(localValue, remoteValue, field);
    }

    // Object merging (contact info, budget details)
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return this.mergeObjects(
        localValue as Record<string, unknown>,
        remoteValue as Record<string, unknown>,
        field,
      );
    }

    // Boolean merging
    if (typeof localValue === 'boolean' && typeof remoteValue === 'boolean') {
      return this.mergeBooleans(localValue, remoteValue, field, dataType);
    }

    // Default: use more recent value (requires timestamps in context)
    return { value: localValue, strategy: 'default-local-fallback' };
  }

  /**
   * Array merging with deduplication and intelligent ordering
   */
  private mergeArrays(
    localArray: unknown[],
    remoteArray: unknown[],
    field: string,
  ): { value: unknown[]; strategy: string } {
    // Special handling for different array types
    if (field === 'tags' || field === 'categories') {
      // Tags: union with deduplication, sorted alphabetically
      const merged = [...new Set([...localArray, ...remoteArray])];
      return {
        value: merged.sort(),
        strategy: 'union-deduplicated-sorted',
      };
    }

    if (field === 'assignedTo' || field === 'invitedBy') {
      // Assignments: union but preserve order, no duplicates
      const merged = [...localArray];
      for (const item of remoteArray) {
        if (!merged.includes(item)) {
          merged.push(item);
        }
      }
      return {
        value: merged,
        strategy: 'union-preserve-order',
      };
    }

    if (field === 'notes' || field === 'comments') {
      // Notes: concatenate with timestamps if possible
      const merged = [...localArray, ...remoteArray];
      return {
        value: merged,
        strategy: 'concatenate-preserve-all',
      };
    }

    // Default: union with deduplication
    const merged = [...new Set([...localArray, ...remoteArray])];
    return {
      value: merged,
      strategy: 'union-deduplicated',
    };
  }

  /**
   * String merging with wedding-specific intelligence
   */
  private mergeStrings(
    local: string,
    remote: string,
    field: string,
    dataType: string,
  ): { value: string; strategy: string } {
    // Identical strings
    if (local === remote) {
      return { value: local, strategy: 'identical' };
    }

    // Empty string handling
    if (local === '' && remote !== '') {
      return { value: remote, strategy: 'use-non-empty-remote' };
    }
    if (remote === '' && local !== '') {
      return { value: local, strategy: 'use-non-empty-local' };
    }

    // Description/notes fields: merge with separator
    if (
      field === 'description' ||
      field === 'notes' ||
      field.includes('comment')
    ) {
      const separator = field === 'description' ? '\n\n' : '\n';
      return {
        value: `${local}${separator}${remote}`,
        strategy: 'concatenate-with-separator',
      };
    }

    // Name fields: prefer longer, more detailed version
    if (field === 'name' || field === 'title' || field.includes('Name')) {
      const longerString = local.length >= remote.length ? local : remote;
      return {
        value: longerString,
        strategy: 'prefer-longer',
      };
    }

    // Location fields: prefer more specific location
    if (field === 'location' || field === 'venue' || field === 'address') {
      const moreSpecific = local.length >= remote.length ? local : remote;
      return {
        value: moreSpecific,
        strategy: 'prefer-more-specific',
      };
    }

    // Default: prefer local (current user's change)
    return { value: local, strategy: 'prefer-local-default' };
  }

  /**
   * Number merging for budget, priority, and count fields
   */
  private mergeNumbers(
    local: number,
    remote: number,
    field: string,
    dataType: string,
  ): { value: number; strategy: string } {
    if (local === remote) {
      return { value: local, strategy: 'identical' };
    }

    // Budget fields: prefer higher value (more conservative estimate)
    if (
      field.includes('budget') ||
      field.includes('cost') ||
      field.includes('price')
    ) {
      const higher = Math.max(local, remote);
      return {
        value: higher,
        strategy: 'prefer-higher-budget',
      };
    }

    // Priority fields: prefer higher priority (lower number typically)
    if (field === 'priority') {
      const higherPriority = Math.min(local, remote);
      return {
        value: higherPriority,
        strategy: 'prefer-higher-priority',
      };
    }

    // Count fields: prefer higher count
    if (
      field.includes('count') ||
      field.includes('quantity') ||
      field.includes('guests')
    ) {
      const higher = Math.max(local, remote);
      return {
        value: higher,
        strategy: 'prefer-higher-count',
      };
    }

    // Default: prefer local value
    return { value: local, strategy: 'prefer-local-number' };
  }

  /**
   * Date merging for timeline and scheduling conflicts
   */
  private mergeDates(
    local: Date,
    remote: Date,
    field: string,
  ): { value: Date; strategy: string } {
    if (local.getTime() === remote.getTime()) {
      return { value: local, strategy: 'identical' };
    }

    // For start times, prefer earlier time (more preparation time)
    if (field === 'startTime' || field.includes('start')) {
      const earlier = local < remote ? local : remote;
      return {
        value: earlier,
        strategy: 'prefer-earlier-start',
      };
    }

    // For end times, prefer later time (more buffer time)
    if (field === 'endTime' || field.includes('end')) {
      const later = local > remote ? local : remote;
      return {
        value: later,
        strategy: 'prefer-later-end',
      };
    }

    // For deadlines, prefer earlier (more conservative)
    if (field.includes('deadline') || field.includes('due')) {
      const earlier = local < remote ? local : remote;
      return {
        value: earlier,
        strategy: 'prefer-earlier-deadline',
      };
    }

    // Default: prefer more recent timestamp (latest information)
    const moreRecent = local > remote ? local : remote;
    return {
      value: moreRecent,
      strategy: 'prefer-more-recent',
    };
  }

  /**
   * Object merging for nested structures
   */
  private mergeObjects(
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
    field: string,
  ): { value: Record<string, unknown>; strategy: string } {
    const merged = { ...local };
    let mergeStrategy = 'deep-merge';

    // Merge all fields from remote that don't exist in local or are null/undefined
    for (const [key, value] of Object.entries(remote)) {
      if (!(key in merged) || merged[key] == null) {
        merged[key] = value;
      } else if (merged[key] !== value) {
        // For nested conflicts, prefer non-empty values
        if (typeof value === 'string' && typeof merged[key] === 'string') {
          if (value.length > (merged[key] as string).length) {
            merged[key] = value;
          }
        }
      }
    }

    return { value: merged, strategy: mergeStrategy };
  }

  /**
   * Boolean merging with context awareness
   */
  private mergeBooleans(
    local: boolean,
    remote: boolean,
    field: string,
    dataType: string,
  ): { value: boolean; strategy: string } {
    if (local === remote) {
      return { value: local, strategy: 'identical' };
    }

    // For critical boolean fields, prefer true (more conservative)
    const criticalFields = [
      'confirmed',
      'booked',
      'paid',
      'completed',
      'approved',
    ];
    if (criticalFields.includes(field)) {
      return {
        value: local || remote,
        strategy: 'prefer-true-critical',
      };
    }

    // For optional features, prefer true (user wants the feature)
    const optionalFields = ['notifications', 'reminders', 'public', 'visible'];
    if (optionalFields.includes(field)) {
      return {
        value: local || remote,
        strategy: 'prefer-true-optional',
      };
    }

    // Default: prefer local user's choice
    return { value: local, strategy: 'prefer-local-boolean' };
  }

  /**
   * Priority-based resolution using user roles and hierarchy
   */
  private resolvePriorityBased(conflict: DataConflict<T>): ResolutionResult<T> {
    try {
      const localUser = conflict.localVersion.modifiedBy;
      const remoteUser = conflict.remoteVersion.modifiedBy;

      // Define wedding-specific role priority
      const priorityMap: Record<UserContext['role'], number> = {
        admin: 10, // Highest priority
        bride: 8, // High priority
        groom: 8, // High priority (equal to bride)
        planner: 6, // Medium-high priority
        vendor: 4, // Lower priority
      };

      const localPriority = priorityMap[localUser.role] ?? 1;
      const remotePriority = priorityMap[remoteUser.role] ?? 1;

      // Handle equal priority (bride/groom scenario)
      if (localPriority === remotePriority && localPriority === 8) {
        // For bride/groom conflicts, merge fields when possible
        return this.resolveMergeFields(conflict);
      }

      const winner =
        localPriority >= remotePriority
          ? conflict.localVersion
          : conflict.remoteVersion;

      const audit = this.createAuditEntry(
        conflict,
        'resolved',
        {
          strategy: 'priority-based',
          localUser: localUser.role,
          remoteUser: remoteUser.role,
          localPriority,
          remotePriority,
          winner: winner === conflict.localVersion ? 'local' : 'remote',
        },
        winner.data,
      );

      this.auditTrail.push(audit);

      return {
        success: true,
        resolvedData: winner.data,
        audit,
      };
    } catch (error) {
      return {
        success: false,
        error: new ConflictResolutionError(
          'Failed to resolve using priority-based strategy',
          'PRIORITY_RESOLUTION_FAILED',
          conflict.metadata.conflictId,
          { originalError: error },
        ),
        requiresManualReview: true,
      };
    }
  }

  /**
   * Main resolution dispatcher
   */
  async resolveConflict(
    conflict: DataConflict<T>,
  ): Promise<ResolutionResult<T>> {
    // Validate conflict state
    if (conflict.isResolved) {
      return {
        success: false,
        error: new ConflictResolutionError(
          'Conflict already resolved',
          'ALREADY_RESOLVED',
          conflict.metadata.conflictId,
        ),
        requiresManualReview: false,
      };
    }

    // Route to appropriate resolution strategy
    try {
      switch (true) {
        case conflict.resolutionStrategy.includes('last-write-wins'):
          return this.resolveLastWriteWins(conflict);

        case conflict.resolutionStrategy.includes('merge-fields'):
          return this.resolveMergeFields(conflict);

        case conflict.resolutionStrategy.includes('priority-based'):
          return this.resolvePriorityBased(conflict);

        case conflict.resolutionStrategy.includes('manual-review'):
          return {
            success: false,
            error: new ConflictResolutionError(
              'Manual review required - conflict too complex for automatic resolution',
              'MANUAL_REVIEW_REQUIRED',
              conflict.metadata.conflictId,
              {
                reason: 'Strategy explicitly requires manual intervention',
                severity: conflict.metadata.severity,
                affectedFields: conflict.metadata.affectedFields,
              },
            ),
            requiresManualReview: true,
          };

        default:
          return {
            success: false,
            error: new ConflictResolutionError(
              `Unknown resolution strategy: ${conflict.resolutionStrategy}`,
              'UNKNOWN_STRATEGY',
              conflict.metadata.conflictId,
              { strategy: conflict.resolutionStrategy },
            ),
            requiresManualReview: true,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: new ConflictResolutionError(
          'Unexpected error during conflict resolution',
          'RESOLUTION_ERROR',
          conflict.metadata.conflictId,
          { originalError: error },
        ),
        requiresManualReview: true,
      };
    }
  }

  /**
   * Get audit trail for a specific conflict
   */
  getAuditTrail(conflictId: string): readonly ConflictAuditEntry[] {
    return this.auditTrail.filter((entry) => entry.conflictId === conflictId);
  }

  /**
   * Get all audit entries (for monitoring and reporting)
   */
  getAllAuditEntries(): readonly ConflictAuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Clear audit trail (for cleanup/privacy)
   */
  clearAuditTrail(beforeTimestamp?: number): void {
    if (beforeTimestamp) {
      const index = this.auditTrail.findIndex(
        (entry) => entry.timestamp.timestamp >= beforeTimestamp,
      );
      if (index > 0) {
        this.auditTrail.splice(0, index);
      }
    } else {
      this.auditTrail.length = 0;
    }
  }
}

/**
 * Factory functions for creating specialized resolvers
 */
export function createTimelineResolver(): ConflictResolver<TimelineItem> {
  return new ConflictResolver<TimelineItem>();
}

export function createVendorResolver(): ConflictResolver<VendorContact> {
  return new ConflictResolver<VendorContact>();
}

export function createGuestListResolver(): ConflictResolver<GuestEntry> {
  return new ConflictResolver<GuestEntry>();
}

/**
 * Batch conflict resolution for multiple conflicts
 */
export async function resolveBatchConflicts<T extends Record<string, unknown>>(
  conflicts: DataConflict<T>[],
  resolver: ConflictResolver<T>,
): Promise<{
  resolved: Array<{ conflict: DataConflict<T>; result: ResolutionResult<T> }>;
  failed: Array<{ conflict: DataConflict<T>; result: ResolutionResult<T> }>;
  manualReviewRequired: Array<{
    conflict: DataConflict<T>;
    result: ResolutionResult<T>;
  }>;
}> {
  const results = {
    resolved: [] as Array<{
      conflict: DataConflict<T>;
      result: ResolutionResult<T>;
    }>,
    failed: [] as Array<{
      conflict: DataConflict<T>;
      result: ResolutionResult<T>;
    }>,
    manualReviewRequired: [] as Array<{
      conflict: DataConflict<T>;
      result: ResolutionResult<T>;
    }>,
  };

  for (const conflict of conflicts) {
    try {
      const result = await resolver.resolveConflict(conflict);

      if (result.success) {
        results.resolved.push({ conflict, result });
      } else if (result.requiresManualReview) {
        results.manualReviewRequired.push({ conflict, result });
      } else {
        results.failed.push({ conflict, result });
      }
    } catch (error) {
      results.failed.push({
        conflict,
        result: {
          success: false,
          error: new ConflictResolutionError(
            'Batch resolution failed',
            'BATCH_RESOLUTION_ERROR',
            conflict.metadata.conflictId,
            { originalError: error },
          ),
          requiresManualReview: true,
        },
      });
    }
  }

  return results;
}
