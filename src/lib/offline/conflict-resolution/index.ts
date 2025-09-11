/**
 * WedSync Conflict Resolution System - Main Exports
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Complete conflict resolution system for wedding planning data with
 * intelligent merging, automatic resolution, and comprehensive audit logging.
 */

// Type exports
export type {
  UserContext,
  ConflictTimestamp,
  VersionedData,
  ConflictMetadata,
  WeddingDataType,
  ResolutionStrategy,
  ConflictType,
  DataConflict,
  ConflictAuditEntry,
  ResolutionResult,
  TimelineItem,
  VendorContact,
  GuestEntry,
  MergeableFields,
  ConflictResolutionConfig,
} from './types';

export { ConflictResolutionError } from '../../../types/offline';

// Core conflict detection
export {
  ConflictDetector,
  createWeddingDataDetector,
} from './conflict-detector';

// Resolution strategies and merging
export {
  ConflictResolver,
  createTimelineResolver,
  createVendorResolver,
  createGuestListResolver,
  resolveBatchConflicts,
} from './resolution-strategies';

// Automatic resolution system
export {
  AutoConflictResolver,
  createAutoTimelineResolver,
  createAutoVendorResolver,
  createAutoGuestListResolver,
  DEFAULT_AUTO_RESOLUTION_CONFIG,
} from './auto-resolver';

export type {
  AutoResolutionConfig,
  AutoResolutionStats,
} from './auto-resolver';

// Audit logging system
export {
  ConflictAuditLogger,
  InMemoryAuditStorage,
  SupabaseAuditStorage,
  createSupabaseAuditLogger,
  createInMemoryAuditLogger,
  DEFAULT_AUDIT_CONFIG,
} from './audit-logger';

export type {
  AuditStorage,
  AuditSearchCriteria,
  AuditLogConfig,
  SecureAuditEntry,
} from './audit-logger';

/**
 * Main conflict resolution orchestrator
 * Combines detection, resolution, and audit logging
 */
export class ConflictResolutionOrchestrator<T extends Record<string, unknown>> {
  constructor(
    private readonly detector: ConflictDetector<T>,
    private readonly resolver: ConflictResolver<T>,
    private readonly autoResolver: AutoConflictResolver<T>,
    private readonly auditLogger: ConflictAuditLogger,
  ) {}

  /**
   * Complete conflict resolution workflow
   */
  async resolveConflictWithAudit(
    local: VersionedData<T>,
    remote: VersionedData<T>,
    preferAutoResolution = true,
  ): Promise<{
    conflict: DataConflict<T> | null;
    result: ResolutionResult<T> | null;
    autoResolved: boolean;
    auditEntries: ConflictAuditEntry[];
  }> {
    try {
      // Step 1: Detect conflicts
      const conflict = this.detector.detectConflicts(local, remote);

      if (!conflict) {
        return {
          conflict: null,
          result: null,
          autoResolved: false,
          auditEntries: [],
        };
      }

      // Log conflict detection
      await this.auditLogger.logConflictDetected(conflict, {
        preferAutoResolution,
        detectionTimestamp: Date.now(),
      });

      let result: ResolutionResult<T> | null = null;
      let autoResolved = false;

      // Step 2: Attempt automatic resolution if preferred
      if (preferAutoResolution && conflict.metadata.autoResolvable) {
        const autoResult = await this.autoResolver.resolveConflictAutomatically(
          local,
          remote,
        );

        if (autoResult.autoResolved && autoResult.result) {
          result = autoResult.result;
          autoResolved = true;

          await this.auditLogger.logResolutionSuccess(
            conflict,
            result,
            result.resolvedData,
          );
        } else if (autoResult.result && !autoResult.result.success) {
          await this.auditLogger.logResolutionFailure(
            conflict,
            autoResult.result,
          );
        }
      }

      // Step 3: Manual resolution if auto-resolution failed or wasn't attempted
      if (!result || !result.success) {
        result = await this.resolver.resolveConflict(conflict);

        if (result.success) {
          await this.auditLogger.logResolutionSuccess(
            conflict,
            result,
            result.resolvedData,
          );
        } else {
          await this.auditLogger.logResolutionFailure(conflict, result);

          // If requires manual review, escalate
          if (result.requiresManualReview) {
            await this.auditLogger.logManualEscalation(
              conflict,
              conflict.localVersion.modifiedBy,
              'Automatic resolution failed - manual review required',
              {
                errorCode: result.error.code,
                errorMessage: result.error.message,
              },
            );
          }
        }
      }

      // Get complete audit trail
      const auditEntries = await this.auditLogger.getConflictAuditTrail(
        conflict.metadata.conflictId,
      );

      return {
        conflict,
        result,
        autoResolved,
        auditEntries,
      };
    } catch (error) {
      console.error('Conflict resolution orchestration failed:', error);

      return {
        conflict: null,
        result: {
          success: false,
          error: new ConflictResolutionError(
            'Orchestration failed',
            'ORCHESTRATION_ERROR',
            'unknown',
            { originalError: error },
          ),
          requiresManualReview: true,
        },
        autoResolved: false,
        auditEntries: [],
      };
    }
  }

  /**
   * Batch resolution with full audit trail
   */
  async resolveBatchWithAudit(
    dataPairs: Array<{ local: VersionedData<T>; remote: VersionedData<T> }>,
  ): Promise<{
    results: Array<Awaited<ReturnType<typeof this.resolveConflictWithAudit>>>;
    summary: {
      total: number;
      resolved: number;
      autoResolved: number;
      manualReviewRequired: number;
      errors: number;
    };
  }> {
    const results = await Promise.all(
      dataPairs.map((pair) =>
        this.resolveConflictWithAudit(pair.local, pair.remote),
      ),
    );

    const summary = {
      total: results.length,
      resolved: results.filter((r) => r.result?.success).length,
      autoResolved: results.filter((r) => r.autoResolved).length,
      manualReviewRequired: results.filter(
        (r) => r.result && !r.result.success && r.result.requiresManualReview,
      ).length,
      errors: results.filter(
        (r) => r.result && !r.result.success && !r.result.requiresManualReview,
      ).length,
    };

    return { results, summary };
  }

  /**
   * Get comprehensive system statistics
   */
  async getSystemStats(): Promise<{
    autoResolution: AutoResolutionStats;
    auditSummary: Awaited<
      ReturnType<typeof this.auditLogger.generateAuditReport>
    >['summary'];
  }> {
    const autoResolution = this.autoResolver.getStats();

    // Get audit summary for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const auditReport = await this.auditLogger.generateAuditReport({
      start: thirtyDaysAgo,
      end: new Date(),
    });

    return {
      autoResolution,
      auditSummary: auditReport.summary,
    };
  }
}

/**
 * Factory function to create a complete conflict resolution system
 */
export function createConflictResolutionSystem<
  T extends Record<string, unknown>,
>(
  dataType: WeddingDataType,
  auditStorage: AuditStorage,
  config?: {
    autoResolution?: Partial<AutoResolutionConfig>;
    audit?: Partial<AuditLogConfig>;
  },
): ConflictResolutionOrchestrator<T> {
  const detector = createWeddingDataDetector<T>(dataType);
  const resolver = new ConflictResolver<T>();
  const autoResolver = new AutoConflictResolver<T>(
    dataType,
    config?.autoResolution,
  );
  const auditLogger = new ConflictAuditLogger(auditStorage, config?.audit);

  return new ConflictResolutionOrchestrator(
    detector,
    resolver,
    autoResolver,
    auditLogger,
  );
}

/**
 * Utility functions for common wedding data types
 */
export const WeddingConflictResolvers = {
  timeline: () =>
    createConflictResolutionSystem<TimelineItem>(
      'timeline-item',
      new InMemoryAuditStorage(),
    ),
  vendors: () =>
    createConflictResolutionSystem<VendorContact>(
      'vendor-contact',
      new InMemoryAuditStorage(),
    ),
  guests: () =>
    createConflictResolutionSystem<GuestEntry>(
      'guest-list',
      new InMemoryAuditStorage(),
    ),
};

// Import for direct use of all interface types
import type { AuditStorage } from './audit-logger';
export type { AuditStorage };
