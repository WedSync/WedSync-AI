/**
 * WedSync Conflict Detection Engine
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Advanced conflict detection for wedding planning data with intelligent
 * field-level analysis and wedding-specific conflict severity assessment.
 */

import { createHash } from 'crypto';
import type {
  WeddingDataType,
  VersionedData,
  DataConflict,
  ConflictMetadata,
  ConflictType,
  ResolutionStrategy,
  UserContext,
} from './types';

export class ConflictDetector<T = unknown> {
  private readonly dataType: WeddingDataType;
  private readonly sensitiveFields: readonly string[];
  private readonly criticalFields: readonly string[];
  private readonly autoResolvableFields: readonly string[];

  constructor(
    dataType: WeddingDataType,
    sensitiveFields: readonly string[] = [],
    criticalFields: readonly string[] = [],
    autoResolvableFields: readonly string[] = [],
  ) {
    this.dataType = dataType;
    this.sensitiveFields = sensitiveFields;
    this.criticalFields = criticalFields;
    this.autoResolvableFields = autoResolvableFields;
  }

  /**
   * Generate SHA-256 checksum for data integrity verification
   */
  private generateChecksum(data: T): string {
    try {
      const serialized = JSON.stringify(
        data,
        Object.keys(data as object).sort(),
      );
      return createHash('sha256').update(serialized).digest('hex');
    } catch (error) {
      console.error('Failed to generate checksum:', error);
      return '';
    }
  }

  /**
   * Deep field comparison with type safety for complex data structures
   */
  private compareFields<K extends keyof T>(
    local: T,
    remote: T,
    field: K,
  ): boolean {
    const localValue = local[field];
    const remoteValue = remote[field];

    // Handle null/undefined cases
    if (localValue == null || remoteValue == null) {
      return localValue === remoteValue;
    }

    // Handle arrays (common in wedding data)
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      if (localValue.length !== remoteValue.length) return false;

      // Sort arrays for consistent comparison (tags, assignees, etc.)
      const sortedLocal = [...localValue].sort();
      const sortedRemote = [...remoteValue].sort();

      return JSON.stringify(sortedLocal) === JSON.stringify(sortedRemote);
    }

    // Handle Date objects (critical for timeline items)
    if (localValue instanceof Date && remoteValue instanceof Date) {
      return localValue.getTime() === remoteValue.getTime();
    }

    // Handle nested objects (contact info, budget details)
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return JSON.stringify(localValue) === JSON.stringify(remoteValue);
    }

    // Handle primitives
    return localValue === remoteValue;
  }

  /**
   * Analyze field-level differences for detailed conflict reporting
   */
  private analyzeFieldDifferences(
    local: T,
    remote: T,
  ): {
    conflictingFields: string[];
    fieldAnalysis: Record<
      string,
      { localValue: unknown; remoteValue: unknown; conflictType: string }
    >;
  } {
    const conflictingFields: string[] = [];
    const fieldAnalysis: Record<
      string,
      { localValue: unknown; remoteValue: unknown; conflictType: string }
    > = {};

    const localData = local as Record<string, unknown>;
    const remoteData = remote as Record<string, unknown>;

    // Get all unique field names
    const allFields = new Set([
      ...Object.keys(localData),
      ...Object.keys(remoteData),
    ]);

    for (const field of allFields) {
      const localValue = localData[field];
      const remoteValue = remoteData[field];

      if (!this.compareFields(localData, remoteData, field)) {
        conflictingFields.push(field);

        // Determine conflict type for better resolution strategy
        let conflictType = 'value-change';

        if (localValue == null && remoteValue != null) {
          conflictType = 'field-addition';
        } else if (localValue != null && remoteValue == null) {
          conflictType = 'field-deletion';
        } else if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
          conflictType = 'array-modification';
        } else if (localValue instanceof Date && remoteValue instanceof Date) {
          conflictType = 'timestamp-conflict';
        }

        fieldAnalysis[field] = {
          localValue,
          remoteValue,
          conflictType,
        };
      }
    }

    return { conflictingFields, fieldAnalysis };
  }

  /**
   * Calculate conflict severity based on wedding-specific business logic
   */
  private calculateSeverity(
    conflictingFields: readonly string[],
    fieldAnalysis: Record<string, any>,
  ): ConflictMetadata['severity'] {
    // Critical fields that directly impact wedding logistics
    const weddingCriticalFields = [
      'startTime',
      'endTime',
      'location',
      'contractStatus',
      'rsvpStatus',
      'ceremony',
      'reception',
      'venue',
      'date',
    ];

    // Check for critical field conflicts
    const hasCriticalConflict = conflictingFields.some(
      (field) =>
        weddingCriticalFields.includes(field) ||
        this.criticalFields.includes(field),
    );

    if (hasCriticalConflict) {
      return 'critical';
    }

    // Check for sensitive field conflicts (budget, personal info)
    const hasSensitiveConflict = conflictingFields.some(
      (field) =>
        this.sensitiveFields.includes(field) ||
        field.includes('budget') ||
        field.includes('email') ||
        field.includes('phone'),
    );

    if (hasSensitiveConflict) {
      return 'high';
    }

    // Check for timestamp conflicts (always medium priority)
    const hasTimestampConflict = Object.values(fieldAnalysis).some(
      (analysis) => analysis.conflictType === 'timestamp-conflict',
    );

    if (hasTimestampConflict) {
      return 'medium';
    }

    // Multiple field conflicts indicate medium severity
    if (conflictingFields.length > 3) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine if conflict can be automatically resolved
   */
  private canAutoResolve(
    conflictingFields: readonly string[],
    fieldAnalysis: Record<string, any>,
  ): boolean {
    // Never auto-resolve critical fields
    const hasCriticalFields = conflictingFields.some(
      (field) =>
        this.criticalFields.includes(field) ||
        ['startTime', 'endTime', 'location', 'contractStatus'].includes(field),
    );

    if (hasCriticalFields) {
      return false;
    }

    // Auto-resolvable if all conflicting fields are in the allowed list
    const allAutoResolvable = conflictingFields.every(
      (field) =>
        this.autoResolvableFields.includes(field) ||
        ['tags', 'notes', 'description', 'comments'].includes(field),
    );

    if (allAutoResolvable) {
      return true;
    }

    // Auto-resolve simple array additions (new tags, assignees)
    const onlyArrayAdditions = Object.values(fieldAnalysis).every(
      (analysis) =>
        analysis.conflictType === 'array-modification' ||
        analysis.conflictType === 'field-addition',
    );

    return onlyArrayAdditions && conflictingFields.length <= 2;
  }

  /**
   * Select appropriate resolution strategy based on data type and conflict analysis
   */
  private selectStrategy(
    conflictingFields: readonly string[],
    fieldAnalysis: Record<string, any>,
  ): ResolutionStrategy {
    // Wedding-specific resolution logic
    switch (this.dataType) {
      case 'timeline-item':
        // Timeline items with time conflicts need manual review
        if (
          conflictingFields.some((f) => ['startTime', 'endTime'].includes(f))
        ) {
          return 'timeline-item-manual-review';
        }
        // Other timeline conflicts can be merged
        return 'timeline-item-merge-fields';

      case 'vendor-contact':
        // Vendor contacts usually use last-write-wins for contact info
        if (conflictingFields.some((f) => f.includes('contact'))) {
          return 'vendor-contact-last-write-wins';
        }
        return 'vendor-contact-merge-fields';

      case 'guest-list':
        // Guest list changes are sensitive, prefer priority-based resolution
        return 'guest-list-priority-based';

      case 'budget-item':
        // Budget conflicts need careful consideration
        if (
          conflictingFields.some(
            (f) => f.includes('amount') || f.includes('budget'),
          )
        ) {
          return 'budget-item-manual-review';
        }
        return 'budget-item-merge-fields';

      case 'task-assignment':
        // Task assignments can often be merged (multiple assignees)
        return 'task-assignment-merge-fields';

      default:
        // Default strategy based on field analysis
        const hasTimestampConflict = Object.values(fieldAnalysis).some(
          (analysis) => analysis.conflictType === 'timestamp-conflict',
        );

        return hasTimestampConflict
          ? (`${this.dataType}-manual-review` as ResolutionStrategy)
          : (`${this.dataType}-merge-fields` as ResolutionStrategy);
    }
  }

  /**
   * Create detailed conflict type information
   */
  private createConflictType(
    conflictingFields: string[],
    fieldAnalysis: Record<string, any>,
  ): ConflictType {
    if (conflictingFields.length === 0) {
      throw new Error('Cannot create conflict type with no conflicting fields');
    }

    // Check for deletion conflicts
    const deletionFields = Object.entries(fieldAnalysis).filter(
      ([_, analysis]) => analysis.conflictType === 'field-deletion',
    );

    if (deletionFields.length > 0) {
      return {
        type: 'deletion-conflict',
        deletedBy: {
          id: 'unknown',
          role: 'admin',
          deviceId: 'unknown',
          sessionId: 'unknown',
        } as UserContext,
        modifiedBy: {
          id: 'unknown',
          role: 'admin',
          deviceId: 'unknown',
          sessionId: 'unknown',
        } as UserContext,
      };
    }

    // Default to field conflict with detailed information
    const conflictingValues = conflictingFields
      .flatMap((field) => [
        fieldAnalysis[field]?.localValue,
        fieldAnalysis[field]?.remoteValue,
      ])
      .filter((value) => value != null);

    return {
      type: 'field-conflict',
      field: conflictingFields[0], // Primary conflicting field
      conflictingValues,
    };
  }

  /**
   * Main conflict detection method
   */
  detectConflicts(
    local: VersionedData<T>,
    remote: VersionedData<T>,
  ): DataConflict<T> | null {
    try {
      // Quick integrity check - if checksums match, no conflict
      if (local.checksum === remote.checksum && local.checksum) {
        return null;
      }

      // Analyze field-level differences
      const { conflictingFields, fieldAnalysis } = this.analyzeFieldDifferences(
        local.data,
        remote.data,
      );

      // No conflicts found
      if (conflictingFields.length === 0) {
        return null;
      }

      // Generate conflict metadata
      const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const detectedAt = {
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceTime: Date.now(),
      };

      const severity = this.calculateSeverity(conflictingFields, fieldAnalysis);
      const autoResolvable = this.canAutoResolve(
        conflictingFields,
        fieldAnalysis,
      );
      const resolutionStrategy = this.selectStrategy(
        conflictingFields,
        fieldAnalysis,
      );
      const conflictType = this.createConflictType(
        conflictingFields,
        fieldAnalysis,
      );

      const metadata: ConflictMetadata = {
        conflictId,
        detectedAt,
        affectedFields: conflictingFields,
        severity,
        autoResolvable,
      };

      return {
        metadata,
        dataType: this.dataType,
        localVersion: local,
        remoteVersion: remote,
        conflictType,
        resolutionStrategy,
        isResolved: false,
      };
    } catch (error) {
      console.error('Error during conflict detection:', error);
      return null;
    }
  }

  /**
   * Validate data integrity before conflict detection
   */
  validateDataIntegrity(versionedData: VersionedData<T>): boolean {
    try {
      const calculatedChecksum = this.generateChecksum(versionedData.data);
      return calculatedChecksum === versionedData.checksum;
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Get conflict statistics for monitoring
   */
  getConflictStats(conflicts: DataConflict<T>[]): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    autoResolvableCount: number;
  } {
    return {
      total: conflicts.length,
      bySeverity: conflicts.reduce(
        (acc, conflict) => {
          acc[conflict.metadata.severity] =
            (acc[conflict.metadata.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byType: conflicts.reduce(
        (acc, conflict) => {
          acc[conflict.conflictType.type] =
            (acc[conflict.conflictType.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      autoResolvableCount: conflicts.filter((c) => c.metadata.autoResolvable)
        .length,
    };
  }
}

/**
 * Factory function to create preconfigured detectors for different wedding data types
 */
export function createWeddingDataDetector<T>(
  dataType: WeddingDataType,
): ConflictDetector<T> {
  const configs = {
    'timeline-item': {
      sensitive: ['assignedTo', 'priority'],
      critical: ['startTime', 'endTime', 'location'],
      autoResolvable: ['tags', 'description'],
    },
    'vendor-contact': {
      sensitive: ['contact', 'budget'],
      critical: ['contractStatus'],
      autoResolvable: ['notes', 'tags'],
    },
    'guest-list': {
      sensitive: ['contact', 'dietaryRestrictions'],
      critical: ['rsvpStatus', 'invitedBy'],
      autoResolvable: ['seatingGroup'],
    },
    'budget-item': {
      sensitive: ['amount', 'actual'],
      critical: ['estimated', 'currency'],
      autoResolvable: ['notes', 'category'],
    },
    'task-assignment': {
      sensitive: ['assignedTo'],
      critical: ['dueDate', 'priority'],
      autoResolvable: ['notes', 'tags'],
    },
  };

  const config = configs[dataType] || {
    sensitive: [],
    critical: [],
    autoResolvable: [],
  };

  return new ConflictDetector<T>(
    dataType,
    config.sensitive,
    config.critical,
    config.autoResolvable,
  );
}
