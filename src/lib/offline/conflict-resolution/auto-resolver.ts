/**
 * WedSync Automatic Conflict Resolution System
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Intelligent automatic resolution for compatible changes with safety checks
 * and wedding-specific business logic.
 */

import {
  ConflictDetector,
  createWeddingDataDetector,
} from './conflict-detector';
import {
  ConflictResolver,
  resolveBatchConflicts,
} from './resolution-strategies';
import type {
  DataConflict,
  ResolutionResult,
  ConflictAuditEntry,
  WeddingDataType,
  UserContext,
  VersionedData,
  ConflictResolutionConfig,
} from './types';

import { ConflictResolutionError } from '../../../types/offline';

/**
 * Configuration for automatic resolution behavior
 */
export interface AutoResolutionConfig extends ConflictResolutionConfig {
  readonly enableAutoResolution: boolean;
  readonly maxAutoResolutionAttempts: number;
  readonly autoResolutionTimeout: number; // milliseconds
  readonly safetyChecks: {
    readonly requireDataIntegrity: boolean;
    readonly requireUserPermissions: boolean;
    readonly requireAuditTrail: boolean;
  };
  readonly excludedDataTypes: readonly WeddingDataType[];
  readonly excludedFields: readonly string[];
}

/**
 * Default auto-resolution configuration with conservative settings
 */
export const DEFAULT_AUTO_RESOLUTION_CONFIG: AutoResolutionConfig = {
  enableAutoResolution: true,
  maxAutoResolutionAttempts: 3,
  autoResolutionTimeout: 5000,
  autoResolveThreshold: 30, // 30 seconds
  maxConflictsPerUser: 50,
  auditRetentionDays: 90,
  enableUserNotifications: true,
  priorityWeights: {
    admin: 10,
    bride: 8,
    groom: 8,
    planner: 6,
    vendor: 4,
  },
  safetyChecks: {
    requireDataIntegrity: true,
    requireUserPermissions: true,
    requireAuditTrail: true,
  },
  excludedDataTypes: ['budget-item'], // Never auto-resolve budget conflicts
  excludedFields: [
    'contractStatus',
    'rsvpStatus',
    'startTime',
    'endTime',
    'budget',
  ],
};

/**
 * Statistics for monitoring auto-resolution performance
 */
export interface AutoResolutionStats {
  readonly totalAttempts: number;
  readonly successfulResolutions: number;
  readonly failedResolutions: number;
  readonly manualReviewRequired: number;
  readonly averageResolutionTime: number;
  readonly errorsByType: Record<string, number>;
  readonly resolutionsByDataType: Record<WeddingDataType, number>;
  readonly lastUpdated: Date;
}

/**
 * Main automatic conflict resolution system
 */
export class AutoConflictResolver<T extends Record<string, unknown>> {
  private readonly config: AutoResolutionConfig;
  private readonly detector: ConflictDetector<T>;
  private readonly resolver: ConflictResolver<T>;
  private readonly stats: AutoResolutionStats;
  private readonly activeResolutions = new Map<
    string,
    Promise<ResolutionResult<T>>
  >();

  constructor(
    private readonly dataType: WeddingDataType,
    config: Partial<AutoResolutionConfig> = {},
  ) {
    this.config = { ...DEFAULT_AUTO_RESOLUTION_CONFIG, ...config };
    this.detector = createWeddingDataDetector<T>(dataType);
    this.resolver = new ConflictResolver<T>();
    this.stats = this.initializeStats();
  }

  private initializeStats(): AutoResolutionStats {
    return {
      totalAttempts: 0,
      successfulResolutions: 0,
      failedResolutions: 0,
      manualReviewRequired: 0,
      averageResolutionTime: 0,
      errorsByType: {},
      resolutionsByDataType: { [this.dataType]: 0 } as Record<
        WeddingDataType,
        number
      >,
      lastUpdated: new Date(),
    };
  }

  /**
   * Check if a conflict is eligible for automatic resolution
   */
  private isEligibleForAutoResolution(conflict: DataConflict<T>): {
    eligible: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Check if auto-resolution is enabled
    if (!this.config.enableAutoResolution) {
      reasons.push('Auto-resolution is disabled');
    }

    // Check if data type is excluded
    if (this.config.excludedDataTypes.includes(conflict.dataType)) {
      reasons.push(
        `Data type ${conflict.dataType} is excluded from auto-resolution`,
      );
    }

    // Check if conflict is marked as auto-resolvable
    if (!conflict.metadata.autoResolvable) {
      reasons.push('Conflict is not marked as auto-resolvable');
    }

    // Check severity level
    if (conflict.metadata.severity === 'critical') {
      reasons.push('Critical conflicts require manual review');
    }

    // Check for excluded fields
    const hasExcludedFields = conflict.metadata.affectedFields.some((field) =>
      this.config.excludedFields.includes(field),
    );
    if (hasExcludedFields) {
      reasons.push('Contains excluded fields that require manual review');
    }

    // Check if conflict is already resolved
    if (conflict.isResolved) {
      reasons.push('Conflict is already resolved');
    }

    // Check conflict age (don't auto-resolve very old conflicts)
    const conflictAge = Date.now() - conflict.metadata.detectedAt.timestamp;
    const maxAge = this.config.autoResolveThreshold * 1000; // Convert to milliseconds
    if (conflictAge > maxAge) {
      reasons.push(
        `Conflict is too old (${Math.round(conflictAge / 1000)}s > ${this.config.autoResolveThreshold}s)`,
      );
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Perform safety checks before attempting resolution
   */
  private async performSafetyChecks(conflict: DataConflict<T>): Promise<{
    passed: boolean;
    failures: string[];
  }> {
    const failures: string[] = [];

    try {
      // Data integrity check
      if (this.config.safetyChecks.requireDataIntegrity) {
        const localIntegrity = this.detector.validateDataIntegrity(
          conflict.localVersion,
        );
        const remoteIntegrity = this.detector.validateDataIntegrity(
          conflict.remoteVersion,
        );

        if (!localIntegrity) {
          failures.push('Local data integrity check failed');
        }
        if (!remoteIntegrity) {
          failures.push('Remote data integrity check failed');
        }
      }

      // User permissions check (simplified - would integrate with auth system)
      if (this.config.safetyChecks.requireUserPermissions) {
        const userCanModify = await this.checkUserPermissions(
          conflict.localVersion.modifiedBy,
          conflict.dataType,
        );
        if (!userCanModify) {
          failures.push('User lacks permissions for this data type');
        }
      }

      // Audit trail requirement
      if (this.config.safetyChecks.requireAuditTrail) {
        // Ensure audit trail is being properly maintained
        const auditEntries = this.resolver.getAuditTrail(
          conflict.metadata.conflictId,
        );
        // This would typically check for proper audit setup
      }

      return {
        passed: failures.length === 0,
        failures,
      };
    } catch (error) {
      failures.push(
        `Safety check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { passed: false, failures };
    }
  }

  /**
   * Check user permissions (simplified implementation)
   */
  private async checkUserPermissions(
    user: UserContext,
    dataType: WeddingDataType,
  ): Promise<boolean> {
    // In a real implementation, this would check against the auth system
    // For now, implement basic role-based permissions
    const rolePermissions: Record<UserContext['role'], WeddingDataType[]> = {
      admin: [
        'timeline-item',
        'vendor-contact',
        'guest-list',
        'budget-item',
        'task-assignment',
        'venue-details',
        'photo-album',
        'menu-selection',
        'seating-arrangement',
      ],
      bride: [
        'timeline-item',
        'vendor-contact',
        'guest-list',
        'budget-item',
        'task-assignment',
        'venue-details',
        'photo-album',
        'menu-selection',
        'seating-arrangement',
      ],
      groom: [
        'timeline-item',
        'vendor-contact',
        'guest-list',
        'budget-item',
        'task-assignment',
        'venue-details',
        'photo-album',
        'menu-selection',
        'seating-arrangement',
      ],
      planner: [
        'timeline-item',
        'vendor-contact',
        'guest-list',
        'task-assignment',
        'venue-details',
      ],
      vendor: ['vendor-contact', 'task-assignment'],
    };

    const allowedTypes = rolePermissions[user.role] || [];
    return allowedTypes.includes(dataType);
  }

  /**
   * Attempt automatic resolution with timeout and retry logic
   */
  private async attemptResolution(
    conflict: DataConflict<T>,
  ): Promise<ResolutionResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (
      let attempt = 1;
      attempt <= this.config.maxAutoResolutionAttempts;
      attempt++
    ) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `Auto-resolution timeout after ${this.config.autoResolutionTimeout}ms`,
              ),
            );
          }, this.config.autoResolutionTimeout);
        });

        // Race between resolution and timeout
        const resolutionPromise = this.resolver.resolveConflict(conflict);
        const result = await Promise.race([resolutionPromise, timeoutPromise]);

        // Update statistics
        const resolutionTime = Date.now() - startTime;
        this.updateStats(result, resolutionTime);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxAutoResolutionAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    const failureResult: ResolutionResult<T> = {
      success: false,
      error: new ConflictResolutionError(
        `Auto-resolution failed after ${this.config.maxAutoResolutionAttempts} attempts`,
        'AUTO_RESOLUTION_FAILED',
        conflict.metadata.conflictId,
        {
          lastError: lastError?.message,
          attempts: this.config.maxAutoResolutionAttempts,
        },
      ),
      requiresManualReview: true,
    };

    this.updateStats(failureResult, Date.now() - startTime);
    return failureResult;
  }

  /**
   * Update resolution statistics
   */
  private updateStats(
    result: ResolutionResult<T>,
    resolutionTime: number,
  ): void {
    this.stats.totalAttempts++;

    if (result.success) {
      this.stats.successfulResolutions++;
    } else {
      this.stats.failedResolutions++;

      if (result.requiresManualReview) {
        this.stats.manualReviewRequired++;
      }

      // Track error types
      const errorType = result.error.code;
      this.stats.errorsByType[errorType] =
        (this.stats.errorsByType[errorType] || 0) + 1;
    }

    // Update average resolution time
    const totalTime =
      this.stats.averageResolutionTime * (this.stats.totalAttempts - 1) +
      resolutionTime;
    this.stats.averageResolutionTime = totalTime / this.stats.totalAttempts;

    // Update data type stats
    this.stats.resolutionsByDataType[this.dataType]++;
    this.stats.lastUpdated = new Date();
  }

  /**
   * Main entry point for automatic conflict resolution
   */
  async resolveConflictAutomatically(
    local: VersionedData<T>,
    remote: VersionedData<T>,
  ): Promise<{
    conflict: DataConflict<T> | null;
    result: ResolutionResult<T> | null;
    autoResolved: boolean;
    eligibilityCheck: { eligible: boolean; reasons: string[] };
    safetyCheck: { passed: boolean; failures: string[] };
  }> {
    try {
      // Step 1: Detect conflicts
      const conflict = this.detector.detectConflicts(local, remote);

      if (!conflict) {
        return {
          conflict: null,
          result: null,
          autoResolved: false,
          eligibilityCheck: {
            eligible: false,
            reasons: ['No conflict detected'],
          },
          safetyCheck: { passed: true, failures: [] },
        };
      }

      // Step 2: Check eligibility for auto-resolution
      const eligibilityCheck = this.isEligibleForAutoResolution(conflict);

      if (!eligibilityCheck.eligible) {
        return {
          conflict,
          result: null,
          autoResolved: false,
          eligibilityCheck,
          safetyCheck: { passed: true, failures: [] },
        };
      }

      // Step 3: Perform safety checks
      const safetyCheck = await this.performSafetyChecks(conflict);

      if (!safetyCheck.passed) {
        return {
          conflict,
          result: null,
          autoResolved: false,
          eligibilityCheck,
          safetyCheck,
        };
      }

      // Step 4: Check if resolution is already in progress
      const conflictId = conflict.metadata.conflictId;
      if (this.activeResolutions.has(conflictId)) {
        const existingResult = await this.activeResolutions.get(conflictId)!;
        return {
          conflict,
          result: existingResult,
          autoResolved: existingResult.success,
          eligibilityCheck,
          safetyCheck,
        };
      }

      // Step 5: Attempt automatic resolution
      const resolutionPromise = this.attemptResolution(conflict);
      this.activeResolutions.set(conflictId, resolutionPromise);

      try {
        const result = await resolutionPromise;

        return {
          conflict,
          result,
          autoResolved: result.success,
          eligibilityCheck,
          safetyCheck,
        };
      } finally {
        // Clean up active resolution tracking
        this.activeResolutions.delete(conflictId);
      }
    } catch (error) {
      const errorResult: ResolutionResult<T> = {
        success: false,
        error: new ConflictResolutionError(
          'Automatic resolution system error',
          'AUTO_RESOLVER_ERROR',
          'unknown',
          { originalError: error },
        ),
        requiresManualReview: true,
      };

      return {
        conflict: null,
        result: errorResult,
        autoResolved: false,
        eligibilityCheck: {
          eligible: false,
          reasons: ['System error occurred'],
        },
        safetyCheck: {
          passed: false,
          failures: ['System error during safety checks'],
        },
      };
    }
  }

  /**
   * Batch automatic resolution for multiple data pairs
   */
  async resolveBatchAutomatically(
    dataPairs: Array<{ local: VersionedData<T>; remote: VersionedData<T> }>,
  ): Promise<{
    results: Array<
      Awaited<ReturnType<typeof this.resolveConflictAutomatically>>
    >;
    summary: {
      total: number;
      autoResolved: number;
      manualReviewRequired: number;
      noConflicts: number;
      errors: number;
    };
  }> {
    const results = await Promise.all(
      dataPairs.map((pair) =>
        this.resolveConflictAutomatically(pair.local, pair.remote),
      ),
    );

    const summary = {
      total: results.length,
      autoResolved: results.filter((r) => r.autoResolved).length,
      manualReviewRequired: results.filter(
        (r) => r.result && !r.result.success && r.result.requiresManualReview,
      ).length,
      noConflicts: results.filter((r) => !r.conflict).length,
      errors: results.filter(
        (r) => r.result && !r.result.success && !r.result.requiresManualReview,
      ).length,
    };

    return { results, summary };
  }

  /**
   * Get current resolution statistics
   */
  getStats(): AutoResolutionStats {
    return { ...this.stats };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoResolutionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (creates new instance with updated config)
   */
  withConfig(
    newConfig: Partial<AutoResolutionConfig>,
  ): AutoConflictResolver<T> {
    return new AutoConflictResolver(this.dataType, {
      ...this.config,
      ...newConfig,
    });
  }

  /**
   * Clear active resolutions (for cleanup)
   */
  clearActiveResolutions(): void {
    this.activeResolutions.clear();
  }
}

/**
 * Factory functions for creating specialized auto-resolvers
 */
export function createAutoTimelineResolver(
  config?: Partial<AutoResolutionConfig>,
): AutoConflictResolver<any> {
  return new AutoConflictResolver('timeline-item', config);
}

export function createAutoVendorResolver(
  config?: Partial<AutoResolutionConfig>,
): AutoConflictResolver<any> {
  return new AutoConflictResolver('vendor-contact', config);
}

export function createAutoGuestListResolver(
  config?: Partial<AutoResolutionConfig>,
): AutoConflictResolver<any> {
  return new AutoConflictResolver('guest-list', config);
}
