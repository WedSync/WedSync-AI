'use client';

import { format, parseISO, isAfter, isBefore } from 'date-fns';

/**
 * Advanced Conflict Resolution System for WedSync
 *
 * Handles field-level conflict detection, three-way merge algorithms,
 * and intelligent conflict resolution with wedding day priority logic
 */

export interface ConflictField {
  field: string;
  localValue: any;
  serverValue: any;
  baseValue?: any; // For three-way merge
  timestamp: string;
  conflictType: 'content' | 'timestamp' | 'delete' | 'create' | 'permission';
  priority: 'critical' | 'high' | 'medium' | 'low';
  metadata?: {
    userRole?: string;
    isWeddingDay?: boolean;
    userId?: string;
    deviceId?: string;
  };
}

export interface ConflictResolution {
  field: string;
  resolvedValue: any;
  strategy: ConflictResolutionStrategy;
  confidence: number; // 0-1, how confident we are in the resolution
  requiresUserInput: boolean;
  explanation: string;
}

export type ConflictResolutionStrategy =
  | 'last_writer_wins'
  | 'coordinator_priority'
  | 'three_way_merge'
  | 'wedding_day_priority'
  | 'field_level_merge'
  | 'user_guided'
  | 'smart_merge';

export interface ConflictContext {
  entityType: 'wedding' | 'vendor' | 'timeline' | 'issue' | 'guest' | 'note';
  entityId: string;
  weddingId?: string;
  isWeddingDay?: boolean;
  activeWeddingDate?: string;
  currentUserRole?: 'coordinator' | 'photographer' | 'vendor' | 'planner';
  conflictTimestamp: string;
  localVersion: number;
  serverVersion: number;
  conflictFields: ConflictField[];
}

export interface ResolvedConflict {
  entityType: string;
  entityId: string;
  resolutions: ConflictResolution[];
  mergedData: any;
  confidence: number; // Overall confidence in the resolution
  requiresUserReview: boolean;
  automaticResolution: boolean;
  resolutionStrategy: string;
  timestamp: string;
}

export class ConflictResolver {
  private weddingDayPriorityFields = [
    'timeline.startTime',
    'timeline.endTime',
    'timeline.status',
    'vendor.status',
    'vendor.checkInTime',
    'vendor.location',
    'issue.status',
    'issue.severity',
    'issue.assignedTo',
    'coordination.weddingStatus',
    'coordination.emergencyContacts',
  ];

  private criticalFields = [
    'timeline.startTime',
    'timeline.endTime',
    'vendor.emergencyContact',
    'vendor.specialRequirements',
    'issue.severity',
    'issue.status',
    'wedding.venue',
    'wedding.date',
  ];

  /**
   * Main conflict resolution entry point
   */
  async resolveConflict(context: ConflictContext): Promise<ResolvedConflict> {
    const startTime = Date.now();
    console.log(
      `[ConflictResolver] Resolving conflict for ${context.entityType}:${context.entityId}`,
    );

    const resolutions: ConflictResolution[] = [];
    let overallConfidence = 1.0;
    let requiresUserReview = false;

    // Process each conflicted field
    for (const field of context.conflictFields) {
      const resolution = await this.resolveFieldConflict(field, context);
      resolutions.push(resolution);

      // Update overall metrics
      overallConfidence = Math.min(overallConfidence, resolution.confidence);
      if (resolution.requiresUserInput) {
        requiresUserReview = true;
      }
    }

    // Merge resolved values into final object
    const mergedData = this.buildMergedData(context, resolutions);

    // Determine overall strategy
    const primaryStrategy = this.determinePrimaryStrategy(resolutions);

    const resolved: ResolvedConflict = {
      entityType: context.entityType,
      entityId: context.entityId,
      resolutions,
      mergedData,
      confidence: overallConfidence,
      requiresUserReview,
      automaticResolution: !requiresUserReview && overallConfidence >= 0.8,
      resolutionStrategy: primaryStrategy,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[ConflictResolver] Resolved conflict in ${Date.now() - startTime}ms with confidence ${overallConfidence.toFixed(2)}`,
    );

    return resolved;
  }

  /**
   * Resolve conflict for a single field
   */
  private async resolveFieldConflict(
    field: ConflictField,
    context: ConflictContext,
  ): Promise<ConflictResolution> {
    // Wedding day coordinator priority (highest precedence)
    if (context.isWeddingDay && this.isWeddingDayPriorityField(field.field)) {
      const coordinatorResolution = this.resolveWithCoordinatorPriority(
        field,
        context,
      );
      if (coordinatorResolution) {
        return coordinatorResolution;
      }
    }

    // Three-way merge for complex conflicts
    if (field.baseValue !== undefined) {
      const threeWayResult = this.performThreeWayMerge(field, context);
      if (threeWayResult.confidence >= 0.7) {
        return threeWayResult;
      }
    }

    // Field-specific resolution strategies
    const fieldSpecificResult = this.resolveFieldSpecific(field, context);
    if (fieldSpecificResult.confidence >= 0.6) {
      return fieldSpecificResult;
    }

    // Timestamp-based resolution (last writer wins with intelligence)
    return this.resolveWithTimestampStrategy(field, context);
  }

  /**
   * Wedding day coordinator priority resolution
   */
  private resolveWithCoordinatorPriority(
    field: ConflictField,
    context: ConflictContext,
  ): ConflictResolution | null {
    const metadata = field.metadata;
    if (!metadata) return null;

    // Active wedding day coordinator changes take absolute priority
    if (context.isWeddingDay && metadata.userRole === 'coordinator') {
      return {
        field: field.field,
        resolvedValue: field.localValue,
        strategy: 'coordinator_priority',
        confidence: 1.0,
        requiresUserInput: false,
        explanation: 'Wedding day coordinator decision takes precedence',
      };
    }

    // Server value is from coordinator during wedding day
    if (
      context.isWeddingDay &&
      this.isCoordinatorChange(field.serverValue, metadata)
    ) {
      return {
        field: field.field,
        resolvedValue: field.serverValue,
        strategy: 'wedding_day_priority',
        confidence: 0.95,
        requiresUserInput: false,
        explanation: 'Server value from wedding day coordinator',
      };
    }

    return null;
  }

  /**
   * Three-way merge algorithm
   */
  private performThreeWayMerge(
    field: ConflictField,
    context: ConflictContext,
  ): ConflictResolution {
    const { localValue, serverValue, baseValue } = field;

    // If local and server are both different from base, it's a true conflict
    if (
      !this.deepEqual(localValue, baseValue) &&
      !this.deepEqual(serverValue, baseValue)
    ) {
      // Try smart merge for specific field types
      const smartMerge = this.attemptSmartMerge(field, context);
      if (smartMerge) {
        return {
          field: field.field,
          resolvedValue: smartMerge.value,
          strategy: 'smart_merge',
          confidence: smartMerge.confidence,
          requiresUserInput: smartMerge.confidence < 0.8,
          explanation: smartMerge.explanation,
        };
      }

      // Complex conflict - requires user input
      return {
        field: field.field,
        resolvedValue: localValue, // Default to local while awaiting user input
        strategy: 'user_guided',
        confidence: 0.3,
        requiresUserInput: true,
        explanation: 'Complex three-way conflict requires user decision',
      };
    }

    // One side unchanged, take the changed value
    if (this.deepEqual(localValue, baseValue)) {
      return {
        field: field.field,
        resolvedValue: serverValue,
        strategy: 'three_way_merge',
        confidence: 0.9,
        requiresUserInput: false,
        explanation: 'Server value chosen - local unchanged',
      };
    } else {
      return {
        field: field.field,
        resolvedValue: localValue,
        strategy: 'three_way_merge',
        confidence: 0.9,
        requiresUserInput: false,
        explanation: 'Local value chosen - server unchanged',
      };
    }
  }

  /**
   * Smart merge for specific field types
   */
  private attemptSmartMerge(
    field: ConflictField,
    context: ConflictContext,
  ): { value: any; confidence: number; explanation: string } | null {
    const fieldPath = field.field;

    // Timeline event smart merging
    if (fieldPath.includes('timeline')) {
      return this.smartMergeTimelineField(field, context);
    }

    // Vendor information smart merging
    if (fieldPath.includes('vendor')) {
      return this.smartMergeVendorField(field, context);
    }

    // Issue smart merging
    if (fieldPath.includes('issue')) {
      return this.smartMergeIssueField(field, context);
    }

    // Array merging
    if (Array.isArray(field.localValue) && Array.isArray(field.serverValue)) {
      return this.smartMergeArrayField(field, context);
    }

    return null;
  }

  /**
   * Smart merge timeline fields
   */
  private smartMergeTimelineField(
    field: ConflictField,
    context: ConflictContext,
  ): { value: any; confidence: number; explanation: string } | null {
    const fieldName = field.field.split('.').pop();

    // Time conflicts - prefer wedding day coordinator
    if (fieldName === 'startTime' || fieldName === 'endTime') {
      if (context.isWeddingDay && field.metadata?.userRole === 'coordinator') {
        return {
          value: field.localValue,
          confidence: 0.95,
          explanation: 'Wedding day coordinator time change takes priority',
        };
      }

      // Prefer more recent but reasonable time changes
      if (
        this.isReasonableTimeChange(
          field.localValue,
          field.serverValue,
          context,
        )
      ) {
        const localTime = new Date(field.localValue);
        const serverTime = new Date(field.serverValue);

        return {
          value: isAfter(localTime, serverTime)
            ? field.localValue
            : field.serverValue,
          confidence: 0.8,
          explanation: 'More recent reasonable time change selected',
        };
      }
    }

    // Status changes - prefer more advanced status
    if (fieldName === 'status') {
      const statusPriority = {
        pending: 1,
        'in-progress': 2,
        completed: 3,
        cancelled: 0,
      };
      const localPriority =
        statusPriority[field.localValue as keyof typeof statusPriority] || 0;
      const serverPriority =
        statusPriority[field.serverValue as keyof typeof statusPriority] || 0;

      if (localPriority !== serverPriority) {
        return {
          value:
            localPriority > serverPriority
              ? field.localValue
              : field.serverValue,
          confidence: 0.85,
          explanation: 'More advanced status selected',
        };
      }
    }

    return null;
  }

  /**
   * Smart merge vendor fields
   */
  private smartMergeVendorField(
    field: ConflictField,
    context: ConflictContext,
  ): { value: any; confidence: number; explanation: string } | null {
    const fieldName = field.field.split('.').pop();

    // Check-in status - prefer checked-in status
    if (fieldName === 'status') {
      const statusOrder = {
        'not-arrived': 0,
        'en-route': 1,
        'checked-in': 2,
        working: 3,
        completed: 4,
      };
      const localOrder =
        statusOrder[field.localValue as keyof typeof statusOrder] || 0;
      const serverOrder =
        statusOrder[field.serverValue as keyof typeof statusOrder] || 0;

      return {
        value: localOrder > serverOrder ? field.localValue : field.serverValue,
        confidence: 0.9,
        explanation: 'More advanced vendor status selected',
      };
    }

    // Location updates - prefer most recent if reasonable
    if (fieldName === 'location' || fieldName === 'checkInTime') {
      if (context.isWeddingDay) {
        const localTime = this.extractTimestamp(field.localValue);
        const serverTime = this.extractTimestamp(field.serverValue);

        if (localTime && serverTime) {
          return {
            value: isAfter(parseISO(localTime), parseISO(serverTime))
              ? field.localValue
              : field.serverValue,
            confidence: 0.85,
            explanation: 'Most recent wedding day location/check-in used',
          };
        }
      }
    }

    return null;
  }

  /**
   * Smart merge issue fields
   */
  private smartMergeIssueField(
    field: ConflictField,
    context: ConflictContext,
  ): { value: any; confidence: number; explanation: string } | null {
    const fieldName = field.field.split('.').pop();

    // Severity escalation - prefer higher severity
    if (fieldName === 'severity') {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      const localSeverity =
        severityOrder[field.localValue as keyof typeof severityOrder] || 0;
      const serverSeverity =
        severityOrder[field.serverValue as keyof typeof severityOrder] || 0;

      return {
        value:
          localSeverity > serverSeverity ? field.localValue : field.serverValue,
        confidence: 0.9,
        explanation: 'Higher severity level selected',
      };
    }

    // Status progression - prefer resolved states
    if (fieldName === 'status') {
      const statusProgression = {
        open: 0,
        'in-progress': 1,
        resolved: 2,
        closed: 3,
      };
      const localProgress =
        statusProgression[field.localValue as keyof typeof statusProgression] ||
        0;
      const serverProgress =
        statusProgression[
          field.serverValue as keyof typeof statusProgression
        ] || 0;

      // Don't auto-close issues - prefer open states for safety
      if (
        (field.localValue === 'closed' || field.serverValue === 'closed') &&
        context.isWeddingDay
      ) {
        return {
          value:
            field.localValue === 'closed'
              ? field.serverValue
              : field.localValue,
          confidence: 0.7,
          explanation: 'Kept issue open during wedding day for safety',
        };
      }

      return {
        value:
          localProgress > serverProgress ? field.localValue : field.serverValue,
        confidence: 0.8,
        explanation: 'More progressed issue status selected',
      };
    }

    return null;
  }

  /**
   * Smart merge array fields
   */
  private smartMergeArrayField(
    field: ConflictField,
    context: ConflictContext,
  ): { value: any; confidence: number; explanation: string } | null {
    const localArray = field.localValue as any[];
    const serverArray = field.serverValue as any[];
    const baseArray = (field.baseValue as any[]) || [];

    // Union merge - combine unique items
    if (this.isUnionMergeSafe(field.field)) {
      const merged = this.unionMergeArrays(localArray, serverArray, baseArray);
      return {
        value: merged,
        confidence: 0.8,
        explanation: 'Combined unique items from both versions',
      };
    }

    // Additive merge for certain field types
    if (this.isAdditiveMergeSafe(field.field)) {
      const addedItems = this.getAddedItems(localArray, baseArray).concat(
        this.getAddedItems(serverArray, baseArray),
      );
      const merged = baseArray.concat(addedItems);

      return {
        value: merged,
        confidence: 0.85,
        explanation: 'Combined additions from both versions',
      };
    }

    return null;
  }

  /**
   * Field-specific resolution strategies
   */
  private resolveFieldSpecific(
    field: ConflictField,
    context: ConflictContext,
  ): ConflictResolution {
    const fieldPath = field.field;

    // Critical fields need manual review during wedding day
    if (this.isCriticalField(fieldPath) && context.isWeddingDay) {
      return {
        field: field.field,
        resolvedValue: field.localValue,
        strategy: 'user_guided',
        confidence: 0.4,
        requiresUserInput: true,
        explanation: `Critical field ${fieldPath} conflict requires manual review during wedding day`,
      };
    }

    // Email/phone - prefer most recently updated
    if (fieldPath.includes('email') || fieldPath.includes('phone')) {
      return {
        field: field.field,
        resolvedValue: field.localValue, // Assume local is more recent for demo
        strategy: 'field_level_merge',
        confidence: 0.7,
        requiresUserInput: false,
        explanation: 'Contact information - using most recent update',
      };
    }

    // Notes/comments - concatenate with attribution
    if (fieldPath.includes('notes') || fieldPath.includes('comment')) {
      const merged = this.mergeNotes(
        field.localValue,
        field.serverValue,
        context,
      );
      return {
        field: field.field,
        resolvedValue: merged,
        strategy: 'smart_merge',
        confidence: 0.8,
        requiresUserInput: false,
        explanation: 'Combined notes with attribution',
      };
    }

    // Default to timestamp-based resolution
    return this.resolveWithTimestampStrategy(field, context);
  }

  /**
   * Last writer wins with intelligent timestamp analysis
   */
  private resolveWithTimestampStrategy(
    field: ConflictField,
    context: ConflictContext,
  ): ConflictResolution {
    const localTime =
      this.extractTimestamp(field.localValue) || field.timestamp;
    const serverTime =
      this.extractTimestamp(field.serverValue) || new Date().toISOString();

    const isLocalNewer = isAfter(parseISO(localTime), parseISO(serverTime));

    // During wedding day, be more conservative with automatic resolution
    if (context.isWeddingDay && this.isCriticalField(field.field)) {
      return {
        field: field.field,
        resolvedValue: field.localValue,
        strategy: 'user_guided',
        confidence: 0.5,
        requiresUserInput: true,
        explanation: 'Wedding day critical field - needs manual verification',
      };
    }

    return {
      field: field.field,
      resolvedValue: isLocalNewer ? field.localValue : field.serverValue,
      strategy: 'last_writer_wins',
      confidence: 0.75,
      requiresUserInput: false,
      explanation: `${isLocalNewer ? 'Local' : 'Server'} value is more recent`,
    };
  }

  /**
   * Build merged data object from resolutions
   */
  private buildMergedData(
    context: ConflictContext,
    resolutions: ConflictResolution[],
  ): any {
    const merged: any = {};

    resolutions.forEach((resolution) => {
      this.setNestedProperty(
        merged,
        resolution.field,
        resolution.resolvedValue,
      );
    });

    return merged;
  }

  /**
   * Utility methods
   */
  private isWeddingDayPriorityField(fieldPath: string): boolean {
    return this.weddingDayPriorityFields.some(
      (priority) =>
        fieldPath.includes(priority.split('.')[0]) &&
        fieldPath.includes(priority.split('.')[1]),
    );
  }

  private isCriticalField(fieldPath: string): boolean {
    return this.criticalFields.some(
      (critical) =>
        fieldPath.includes(critical.split('.')[0]) &&
        fieldPath.includes(critical.split('.')[1]),
    );
  }

  private isCoordinatorChange(value: any, metadata: any): boolean {
    return metadata?.userRole === 'coordinator';
  }

  private isReasonableTimeChange(
    localTime: string,
    serverTime: string,
    context: ConflictContext,
  ): boolean {
    const timeDiff = Math.abs(
      parseISO(localTime).getTime() - parseISO(serverTime).getTime(),
    );
    const hourInMs = 60 * 60 * 1000;

    // Wedding day: allow changes up to 2 hours
    if (context.isWeddingDay) {
      return timeDiff <= 2 * hourInMs;
    }

    // Regular day: allow changes up to 24 hours
    return timeDiff <= 24 * hourInMs;
  }

  private extractTimestamp(value: any): string | null {
    if (
      typeof value === 'string' &&
      value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    ) {
      return value;
    }
    if (typeof value === 'object' && value?.timestamp) {
      return value.timestamp;
    }
    if (typeof value === 'object' && value?.updatedAt) {
      return value.updatedAt;
    }
    return null;
  }

  private deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  private determinePrimaryStrategy(resolutions: ConflictResolution[]): string {
    const strategyCounts = resolutions.reduce(
      (acc, r) => {
        acc[r.strategy] = (acc[r.strategy] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(strategyCounts).reduce((a, b) =>
      strategyCounts[a] > strategyCounts[b] ? a : b,
    );
  }

  private unionMergeArrays(local: any[], server: any[], base: any[]): any[] {
    const seen = new Set(base.map((item) => this.getItemId(item)));
    const result = [...base];

    [...local, ...server].forEach((item) => {
      const id = this.getItemId(item);
      if (!seen.has(id)) {
        result.push(item);
        seen.add(id);
      }
    });

    return result;
  }

  private getAddedItems(current: any[], base: any[]): any[] {
    const baseIds = new Set(base.map((item) => this.getItemId(item)));
    return current.filter((item) => !baseIds.has(this.getItemId(item)));
  }

  private getItemId(item: any): string {
    return item?.id || item?.key || JSON.stringify(item);
  }

  private isUnionMergeSafe(fieldPath: string): boolean {
    return (
      fieldPath.includes('tags') ||
      fieldPath.includes('categories') ||
      fieldPath.includes('assignedVendors')
    );
  }

  private isAdditiveMergeSafe(fieldPath: string): boolean {
    return (
      fieldPath.includes('notes') ||
      fieldPath.includes('photos') ||
      fieldPath.includes('documents')
    );
  }

  private mergeNotes(
    localNote: string,
    serverNote: string,
    context: ConflictContext,
  ): string {
    const timestamp = format(new Date(), 'MM/dd HH:mm');
    return `${localNote}\n\n[Merged ${timestamp}]\n${serverNote}`;
  }
}

// Singleton instance
export const conflictResolver = new ConflictResolver();
