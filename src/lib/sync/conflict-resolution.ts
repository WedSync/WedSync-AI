/**
 * WedSync Conflict Resolution System
 * Advanced conflict detection and resolution for offline-first wedding coordination
 *
 * Features:
 * - Three-way merge algorithms
 * - Field-level conflict detection
 * - Priority-based resolution strategies
 * - User-guided conflict resolution
 * - Operational transformation for real-time conflicts
 */

import {
  offlineDB,
  type CachedWedding,
  type CachedTimelineEvent,
  type VendorContact,
  type CachedIssue,
  type SyncMetadata,
} from '@/lib/database/offline-database';
import { SecureOfflineStorage } from '@/lib/security/offline-encryption';

// =====================================================
// CONFLICT RESOLUTION INTERFACES
// =====================================================

export interface ConflictData {
  id: string;
  entityType: 'wedding' | 'timeline' | 'vendor' | 'issue';
  entityId: string;
  conflictType: 'data' | 'version' | 'operational' | 'structural';
  localData: any;
  serverData: any;
  baseData?: any; // Common ancestor for three-way merge
  conflictFields: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  autoResolvable: boolean;
  resolutionStrategy?: ResolutionStrategy;
}

export interface ResolutionStrategy {
  strategy:
    | 'latest_wins'
    | 'priority_wins'
    | 'field_merge'
    | 'user_choice'
    | 'operational_transform';
  rules?: ConflictRule[];
  userChoice?: any;
}

export interface ConflictRule {
  field: string;
  priority: 'local' | 'server' | 'latest' | 'custom';
  customResolver?: (local: any, server: any, base?: any) => any;
}

export interface MergeResult {
  success: boolean;
  mergedData: any;
  remainingConflicts: ConflictData[];
  appliedResolutions: string[];
  warnings: string[];
}

// =====================================================
// CONFLICT RESOLUTION ENGINE
// =====================================================

export class ConflictResolutionEngine {
  private static instance: ConflictResolutionEngine;
  private pendingConflicts: Map<string, ConflictData> = new Map();
  private resolutionCallbacks: Map<string, (result: MergeResult) => void> =
    new Map();

  public static getInstance(): ConflictResolutionEngine {
    if (!ConflictResolutionEngine.instance) {
      ConflictResolutionEngine.instance = new ConflictResolutionEngine();
    }
    return ConflictResolutionEngine.instance;
  }

  // =====================================================
  // CONFLICT DETECTION
  // =====================================================

  async detectConflicts(
    entityType: string,
    entityId: string,
    localData: any,
    serverData: any,
  ): Promise<ConflictData | null> {
    try {
      // Get sync metadata for version comparison
      const syncMeta = await offlineDB.syncMetadata.get(
        `${entityType}-${entityId}`,
      );

      if (!syncMeta) {
        // No metadata means first sync, no conflict
        return null;
      }

      // Check for version conflicts
      if (syncMeta.localVersion > syncMeta.serverVersion) {
        const conflictData = await this.analyzeDataConflict(
          entityType,
          entityId,
          localData,
          serverData,
          syncMeta,
        );
        if (conflictData) {
          this.pendingConflicts.set(conflictData.id, conflictData);
          return conflictData;
        }
      }

      return null;
    } catch (error) {
      console.error('[Conflict] Detection failed:', error);
      return null;
    }
  }

  private async analyzeDataConflict(
    entityType: string,
    entityId: string,
    localData: any,
    serverData: any,
    syncMeta: SyncMetadata,
  ): Promise<ConflictData | null> {
    const conflictFields = this.findConflictingFields(localData, serverData);

    if (conflictFields.length === 0) {
      return null; // No actual conflicts
    }

    // Determine conflict priority based on field importance
    const priority = this.calculateConflictPriority(entityType, conflictFields);

    // Check if auto-resolvable
    const autoResolvable = this.isAutoResolvable(
      entityType,
      conflictFields,
      localData,
      serverData,
    );

    const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: conflictId,
      entityType: entityType as any,
      entityId,
      conflictType: 'data',
      localData,
      serverData,
      conflictFields,
      priority,
      timestamp: new Date().toISOString(),
      autoResolvable,
      resolutionStrategy: autoResolvable
        ? this.getAutoResolutionStrategy(entityType, conflictFields)
        : undefined,
    };
  }

  private findConflictingFields(
    local: any,
    server: any,
    path: string = '',
  ): string[] {
    const conflicts: string[] = [];

    for (const key in local) {
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in server)) {
        conflicts.push(currentPath); // Field exists in local but not server
        continue;
      }

      const localValue = local[key];
      const serverValue = server[key];

      if (typeof localValue === 'object' && typeof serverValue === 'object') {
        if (localValue !== null && serverValue !== null) {
          // Recursively check nested objects
          conflicts.push(
            ...this.findConflictingFields(localValue, serverValue, currentPath),
          );
        } else if (localValue !== serverValue) {
          conflicts.push(currentPath);
        }
      } else if (localValue !== serverValue) {
        conflicts.push(currentPath);
      }
    }

    // Check for fields that exist in server but not local
    for (const key in server) {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in local)) {
        conflicts.push(currentPath);
      }
    }

    return conflicts;
  }

  private calculateConflictPriority(
    entityType: string,
    conflictFields: string[],
  ): ConflictData['priority'] {
    // Define critical fields that require immediate attention
    const criticalFields = {
      wedding: ['status', 'weddingDate', 'venue'],
      timeline: ['startTime', 'endTime', 'status', 'priority'],
      vendor: ['status', 'checkInTime', 'contact'],
      issue: ['severity', 'status', 'resolution'],
    };

    const critical =
      criticalFields[entityType as keyof typeof criticalFields] || [];

    if (
      conflictFields.some((field) => critical.some((cf) => field.includes(cf)))
    ) {
      return 'critical';
    }

    if (conflictFields.length > 5) {
      return 'high';
    }

    if (conflictFields.length > 2) {
      return 'medium';
    }

    return 'low';
  }

  private isAutoResolvable(
    entityType: string,
    conflictFields: string[],
    localData: any,
    serverData: any,
  ): boolean {
    // Define auto-resolvable scenarios
    const autoResolvableFields = {
      wedding: ['lastSync', 'syncStatus', 'cacheSize'],
      timeline: ['lastUpdated', 'bufferTime'],
      vendor: ['lastUpdated', 'notes'],
      issue: ['updatedAt'],
    };

    const resolvable =
      autoResolvableFields[entityType as keyof typeof autoResolvableFields] ||
      [];

    // Check if all conflicts are in auto-resolvable fields
    return conflictFields.every((field) =>
      resolvable.some((rf) => field.includes(rf)),
    );
  }

  private getAutoResolutionStrategy(
    entityType: string,
    conflictFields: string[],
  ): ResolutionStrategy {
    // Smart resolution strategies based on entity type and fields
    if (entityType === 'timeline') {
      // For timeline events, prioritize latest updates for most fields
      return {
        strategy: 'latest_wins',
        rules: [
          { field: 'startTime', priority: 'latest' },
          { field: 'endTime', priority: 'latest' },
          { field: 'status', priority: 'latest' },
          { field: 'priority', priority: 'server' }, // Server wins for priority changes
        ],
      };
    }

    if (entityType === 'vendor') {
      // For vendors, local status changes win (coordinators know better)
      return {
        strategy: 'field_merge',
        rules: [
          { field: 'status', priority: 'local' },
          { field: 'checkInTime', priority: 'local' },
          { field: 'contact', priority: 'server' }, // Server contact info is authoritative
          { field: 'notes', priority: 'local' }, // Local notes from coordinators
        ],
      };
    }

    if (entityType === 'issue') {
      // For issues, merge based on severity and status logic
      return {
        strategy: 'field_merge',
        rules: [
          {
            field: 'severity',
            priority: 'custom',
            customResolver: this.resolveSeverityConflict,
          },
          { field: 'status', priority: 'latest' },
          { field: 'resolution', priority: 'latest' },
          { field: 'assignedTo', priority: 'server' },
        ],
      };
    }

    // Default strategy
    return {
      strategy: 'latest_wins',
    };
  }

  // =====================================================
  // CONFLICT RESOLUTION
  // =====================================================

  async resolveConflict(
    conflictId: string,
    userStrategy?: ResolutionStrategy,
  ): Promise<MergeResult> {
    try {
      const conflict = this.pendingConflicts.get(conflictId);
      if (!conflict) {
        throw new Error(`Conflict ${conflictId} not found`);
      }

      const strategy = userStrategy ||
        conflict.resolutionStrategy || { strategy: 'latest_wins' };

      let mergeResult: MergeResult;

      switch (strategy.strategy) {
        case 'latest_wins':
          mergeResult = await this.resolveLatestWins(conflict);
          break;

        case 'priority_wins':
          mergeResult = await this.resolvePriorityWins(conflict, strategy);
          break;

        case 'field_merge':
          mergeResult = await this.resolveFieldMerge(conflict, strategy);
          break;

        case 'user_choice':
          mergeResult = await this.resolveUserChoice(conflict, strategy);
          break;

        case 'operational_transform':
          mergeResult = await this.resolveOperationalTransform(conflict);
          break;

        default:
          mergeResult = await this.resolveLatestWins(conflict);
      }

      if (mergeResult.success) {
        // Apply the merged data
        await this.applyResolvedData(conflict, mergeResult.mergedData);

        // Remove resolved conflict
        this.pendingConflicts.delete(conflictId);

        console.log(
          `[Conflict] Resolved ${conflictId} using ${strategy.strategy}`,
        );
      }

      return mergeResult;
    } catch (error) {
      console.error('[Conflict] Resolution failed:', error);
      return {
        success: false,
        mergedData: null,
        remainingConflicts: [],
        appliedResolutions: [],
        warnings: [`Resolution failed: ${error.message}`],
      };
    }
  }

  private async resolveLatestWins(
    conflict: ConflictData,
  ): Promise<MergeResult> {
    // Determine which data is more recent
    const localTimestamp = new Date(
      conflict.localData.updatedAt || conflict.localData.lastUpdated || 0,
    );
    const serverTimestamp = new Date(
      conflict.serverData.updatedAt || conflict.serverData.lastUpdated || 0,
    );

    const mergedData =
      localTimestamp > serverTimestamp
        ? conflict.localData
        : conflict.serverData;
    const winner = localTimestamp > serverTimestamp ? 'local' : 'server';

    return {
      success: true,
      mergedData,
      remainingConflicts: [],
      appliedResolutions: [`latest_wins (${winner})`],
      warnings: [],
    };
  }

  private async resolveFieldMerge(
    conflict: ConflictData,
    strategy: ResolutionStrategy,
  ): Promise<MergeResult> {
    if (!strategy.rules) {
      return this.resolveLatestWins(conflict);
    }

    const mergedData = { ...conflict.localData };
    const appliedResolutions: string[] = [];
    const warnings: string[] = [];

    for (const rule of strategy.rules) {
      try {
        const fieldValue = this.getFieldValue(mergedData, rule.field);
        const localValue = this.getFieldValue(conflict.localData, rule.field);
        const serverValue = this.getFieldValue(conflict.serverData, rule.field);

        let resolvedValue;

        switch (rule.priority) {
          case 'local':
            resolvedValue = localValue;
            break;
          case 'server':
            resolvedValue = serverValue;
            break;
          case 'latest':
            const localTime = new Date(conflict.localData.updatedAt || 0);
            const serverTime = new Date(conflict.serverData.updatedAt || 0);
            resolvedValue = localTime > serverTime ? localValue : serverValue;
            break;
          case 'custom':
            if (rule.customResolver) {
              resolvedValue = rule.customResolver(
                localValue,
                serverValue,
                conflict.baseData,
              );
            } else {
              resolvedValue = localValue;
              warnings.push(`Custom resolver not provided for ${rule.field}`);
            }
            break;
          default:
            resolvedValue = localValue;
        }

        this.setFieldValue(mergedData, rule.field, resolvedValue);
        appliedResolutions.push(`${rule.field}: ${rule.priority}`);
      } catch (error) {
        warnings.push(
          `Failed to resolve field ${rule.field}: ${error.message}`,
        );
      }
    }

    return {
      success: true,
      mergedData,
      remainingConflicts: [],
      appliedResolutions,
      warnings,
    };
  }

  private async resolveUserChoice(
    conflict: ConflictData,
    strategy: ResolutionStrategy,
  ): Promise<MergeResult> {
    if (!strategy.userChoice) {
      throw new Error('User choice strategy requires userChoice data');
    }

    return {
      success: true,
      mergedData: strategy.userChoice,
      remainingConflicts: [],
      appliedResolutions: ['user_choice'],
      warnings: [],
    };
  }

  private async resolvePriorityWins(
    conflict: ConflictData,
    strategy: ResolutionStrategy,
  ): Promise<MergeResult> {
    // Wedding day coordinators have priority during active events
    const isWeddingDay =
      conflict.entityType === 'wedding' &&
      new Date(conflict.localData.date).toDateString() ===
        new Date().toDateString();

    const mergedData = isWeddingDay ? conflict.localData : conflict.serverData;
    const winner = isWeddingDay
      ? 'local (wedding day priority)'
      : 'server (default priority)';

    return {
      success: true,
      mergedData,
      remainingConflicts: [],
      appliedResolutions: [`priority_wins (${winner})`],
      warnings: [],
    };
  }

  private async resolveOperationalTransform(
    conflict: ConflictData,
  ): Promise<MergeResult> {
    // Simplified operational transformation for timeline events
    if (conflict.entityType !== 'timeline') {
      return this.resolveLatestWins(conflict);
    }

    try {
      const mergedData = { ...conflict.localData };

      // Transform timeline adjustments
      if (conflict.serverData.startTime !== conflict.localData.startTime) {
        // Apply time transformation logic
        const localDiff =
          new Date(conflict.localData.startTime).getTime() -
          new Date(conflict.baseData?.startTime || 0).getTime();
        const serverDiff =
          new Date(conflict.serverData.startTime).getTime() -
          new Date(conflict.baseData?.startTime || 0).getTime();

        // Combine the changes if they don't conflict
        if (Math.abs(localDiff - serverDiff) < 15 * 60 * 1000) {
          // 15 minutes threshold
          const avgTime = (localDiff + serverDiff) / 2;
          mergedData.startTime = new Date(
            new Date(conflict.baseData?.startTime || 0).getTime() + avgTime,
          ).toISOString();
        }
      }

      return {
        success: true,
        mergedData,
        remainingConflicts: [],
        appliedResolutions: ['operational_transform'],
        warnings: [],
      };
    } catch (error) {
      return this.resolveLatestWins(conflict);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private getFieldValue(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setFieldValue(obj: any, fieldPath: string, value: any): void {
    const keys = fieldPath.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private async applyResolvedData(
    conflict: ConflictData,
    resolvedData: any,
  ): Promise<void> {
    try {
      // Apply resolved data to database
      switch (conflict.entityType) {
        case 'wedding':
          await offlineDB.weddings.put(resolvedData);
          break;
        case 'timeline':
          await offlineDB.timeline.put(resolvedData);
          break;
        case 'vendor':
          await offlineDB.vendors.put(resolvedData);
          break;
        case 'issue':
          await offlineDB.issues.put(resolvedData);
          break;
      }

      // Update sync metadata
      const syncMeta = await offlineDB.syncMetadata.get(
        `${conflict.entityType}-${conflict.entityId}`,
      );
      if (syncMeta) {
        syncMeta.conflictCount = Math.max(0, syncMeta.conflictCount - 1);
        syncMeta.isLocked = false;
        syncMeta.lastLocalSync = new Date().toISOString();
        await offlineDB.syncMetadata.put(syncMeta);
      }

      console.log(
        `[Conflict] Applied resolved data for ${conflict.entityType}:${conflict.entityId}`,
      );
    } catch (error) {
      console.error('[Conflict] Failed to apply resolved data:', error);
      throw error;
    }
  }

  // =====================================================
  // CUSTOM RESOLVERS
  // =====================================================

  private resolveSeverityConflict = (
    local: any,
    server: any,
    base?: any,
  ): any => {
    // For issue severity, take the higher severity
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const localSeverity =
      severityOrder[local as keyof typeof severityOrder] ?? 0;
    const serverSeverity =
      severityOrder[server as keyof typeof severityOrder] ?? 0;

    return localSeverity > serverSeverity ? local : server;
  };

  // =====================================================
  // PUBLIC API
  // =====================================================

  getPendingConflicts(): ConflictData[] {
    return Array.from(this.pendingConflicts.values());
  }

  getPendingConflictsByPriority(
    priority: ConflictData['priority'],
  ): ConflictData[] {
    return this.getPendingConflicts().filter((c) => c.priority === priority);
  }

  async resolveAllAutoResolvable(): Promise<MergeResult[]> {
    const autoResolvable = this.getPendingConflicts().filter(
      (c) => c.autoResolvable,
    );
    const results: MergeResult[] = [];

    for (const conflict of autoResolvable) {
      try {
        const result = await this.resolveConflict(conflict.id);
        results.push(result);
      } catch (error) {
        console.error(
          `[Conflict] Auto-resolution failed for ${conflict.id}:`,
          error,
        );
      }
    }

    return results;
  }

  onConflictResolved(callback: (result: MergeResult) => void): string {
    const callbackId = `callback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.resolutionCallbacks.set(callbackId, callback);
    return callbackId;
  }

  offConflictResolved(callbackId: string): void {
    this.resolutionCallbacks.delete(callbackId);
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const conflictResolver = ConflictResolutionEngine.getInstance();

// Auto-resolve conflicts in background
if (typeof window !== 'undefined') {
  setInterval(async () => {
    try {
      await conflictResolver.resolveAllAutoResolvable();
    } catch (error) {
      console.error('[Conflict] Background resolution failed:', error);
    }
  }, 30000); // Check every 30 seconds
}
