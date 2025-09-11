// WS-342: Real-Time Wedding Collaboration - Conflict Resolution Engine
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import {
  DataConflict,
  ConflictResolution,
  SyncOperation,
  ResolutionStrategy,
  ConflictType,
  VectorClock,
  CollaborationEvent,
} from './types/collaboration';

export interface VendorConflict extends DataConflict {
  vendor_id: string;
  conflicting_assignments: any[];
  timeline_impact: any[];
}

export interface VendorResolution extends ConflictResolution {
  final_assignment: any;
  affected_vendors: string[];
  timeline_adjustments: any[];
}

export interface PriorityLevel {
  level: number;
  reason: string;
  user_role: string;
  urgency_factor: number;
}

export interface ConflictResolutionConfig {
  auto_resolution_enabled: boolean;
  max_resolution_time_ms: number;
  escalation_threshold: number;
  wedding_hierarchy: { [role: string]: number };
  conflict_priorities: { [type: string]: number };
}

export class ConflictResolutionEngine extends EventEmitter {
  private supabase;
  private resolutionQueue = new Map<string, DataConflict[]>(); // wedding_id -> conflicts
  private activeResolutions = new Map<string, Promise<ConflictResolution>>(); // conflict_id -> promise
  private config: ConflictResolutionConfig;
  private resolutionTimer: NodeJS.Timeout;

  constructor(config: Partial<ConflictResolutionConfig> = {}) {
    super();

    this.config = {
      auto_resolution_enabled: true,
      max_resolution_time_ms: 30000, // 30 seconds
      escalation_threshold: 5, // 5 unresolved conflicts
      wedding_hierarchy: {
        couple: 10,
        planner: 8,
        vendor: 6,
        family: 4,
        friend: 2,
        guest: 1,
      },
      conflict_priorities: {
        timeline_conflict: 9,
        budget_conflict: 8,
        vendor_assignment_conflict: 7,
        guest_conflict: 5,
        document_edit_conflict: 4,
        permission_conflict: 6,
        data_synchronization_conflict: 3,
        concurrent_edit_conflict: 4,
      },
      ...config,
    };

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.startResolutionProcessor();
  }

  /**
   * Detect conflicts between operations
   */
  async detectConflicts(operations: SyncOperation[]): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];

    try {
      // Group operations by target for efficient conflict detection
      const operationGroups = this.groupOperationsByTarget(operations);

      for (const [target, ops] of operationGroups) {
        if (ops.length > 1) {
          // Check for conflicts within the group
          const groupConflicts = await this.detectGroupConflicts(ops);
          conflicts.push(...groupConflicts);
        }
      }

      // Check for cross-target conflicts (e.g., budget vs timeline)
      const crossConflicts = await this.detectCrossTargetConflicts(operations);
      conflicts.push(...crossConflicts);

      console.log(
        `Detected ${conflicts.length} conflicts from ${operations.length} operations`,
      );

      return conflicts;
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
      throw error;
    }
  }

  /**
   * Resolve a specific conflict
   */
  async resolveConflict(
    conflict: DataConflict,
    strategy: ResolutionStrategy,
  ): Promise<ConflictResolution> {
    const conflictId = conflict.id;

    // Check if already being resolved
    if (this.activeResolutions.has(conflictId)) {
      return await this.activeResolutions.get(conflictId)!;
    }

    const resolutionPromise = this.executeResolution(conflict, strategy);
    this.activeResolutions.set(conflictId, resolutionPromise);

    try {
      const resolution = await resolutionPromise;
      this.activeResolutions.delete(conflictId);
      return resolution;
    } catch (error) {
      this.activeResolutions.delete(conflictId);
      throw error;
    }
  }

  /**
   * Apply conflict resolution
   */
  async applyResolution(resolution: ConflictResolution): Promise<void> {
    try {
      // Mark conflict as resolved in database
      await this.supabase.rpc('resolve_data_conflict', {
        p_conflict_id: resolution.conflict_id,
        p_resolved_by: resolution.resolved_by,
        p_resolution_strategy: resolution.strategy,
        p_resolution_data: resolution.resolved_data,
      });

      // Apply the resolved data to the system
      await this.applyResolvedData(resolution);

      // Remove from resolution queue
      this.removeFromQueue(resolution.conflict_id);

      // Emit resolution event
      this.emit('conflict_resolved', resolution);

      console.log(
        `Conflict ${resolution.conflict_id} resolved using ${resolution.strategy}`,
      );
    } catch (error) {
      console.error('Failed to apply resolution:', error);
      throw error;
    }
  }

  /**
   * Get wedding priority for conflict resolution
   */
  async getWeddingPriority(conflict: DataConflict): Promise<PriorityLevel> {
    try {
      // Get the users involved in the conflict
      const userIds = conflict.conflicting_operations.map(
        (op: any) => op.user_id,
      );

      // Get their roles in the wedding
      const { data: teamMembers } = await this.supabase
        .from('wedding_team')
        .select('user_id, role')
        .eq('wedding_id', conflict.wedding_id)
        .in('user_id', userIds);

      // Calculate priority based on roles and conflict type
      let maxPriority = 0;
      let primaryRole = 'guest';

      for (const member of teamMembers || []) {
        const rolePriority = this.config.wedding_hierarchy[member.role] || 0;
        if (rolePriority > maxPriority) {
          maxPriority = rolePriority;
          primaryRole = member.role;
        }
      }

      // Factor in conflict type priority
      const conflictTypePriority =
        this.config.conflict_priorities[conflict.conflict_type] || 1;

      // Calculate urgency factor (time-sensitive conflicts get higher priority)
      const timeSinceCreation =
        Date.now() - new Date(conflict.created_at || Date.now()).getTime();
      const urgencyFactor = Math.min(
        10,
        Math.max(1, 10 - timeSinceCreation / 60000),
      ); // Decrease over time

      const finalPriority = Math.min(
        10,
        (maxPriority + conflictTypePriority) * (urgencyFactor / 10),
      );

      return {
        level: finalPriority,
        reason: `${primaryRole} role with ${conflict.conflict_type}`,
        user_role: primaryRole,
        urgency_factor: urgencyFactor,
      };
    } catch (error) {
      console.error('Failed to get wedding priority:', error);
      return {
        level: 5,
        reason: 'default priority',
        user_role: 'unknown',
        urgency_factor: 1,
      };
    }
  }

  /**
   * Resolve vendor-specific conflicts
   */
  async resolveVendorConflicts(
    conflict: VendorConflict,
  ): Promise<VendorResolution> {
    try {
      const startTime = Date.now();

      // Get vendor details and current assignments
      const { data: vendor } = await this.supabase
        .from('vendors')
        .select('*')
        .eq('id', conflict.vendor_id)
        .single();

      if (!vendor) {
        throw new Error(`Vendor ${conflict.vendor_id} not found`);
      }

      // Analyze conflicting assignments
      const assignments = conflict.conflicting_assignments;

      // Use wedding hierarchy to resolve
      let finalAssignment = assignments[0];
      let maxPriority = 0;

      for (const assignment of assignments) {
        const { data: user } = await this.supabase
          .from('wedding_team')
          .select('role')
          .eq('wedding_id', conflict.wedding_id)
          .eq('user_id', assignment.assigned_by)
          .single();

        const priority =
          this.config.wedding_hierarchy[user?.role || 'guest'] || 0;
        if (priority > maxPriority) {
          maxPriority = priority;
          finalAssignment = assignment;
        }
      }

      // Calculate timeline adjustments if needed
      const timelineAdjustments = await this.calculateTimelineAdjustments(
        conflict.wedding_id,
        finalAssignment,
      );

      const resolution: VendorResolution = {
        conflict_id: conflict.id,
        strategy: 'wedding_hierarchy',
        resolved_data: finalAssignment,
        resolved_by: finalAssignment.assigned_by,
        resolution_time: new Date(),
        auto_resolved: true,
        final_assignment: finalAssignment,
        affected_vendors: [conflict.vendor_id],
        timeline_adjustments: timelineAdjustments,
      };

      // Apply timeline adjustments
      if (timelineAdjustments.length > 0) {
        await this.applyTimelineAdjustments(
          conflict.wedding_id,
          timelineAdjustments,
        );
      }

      return resolution;
    } catch (error) {
      console.error('Failed to resolve vendor conflicts:', error);
      throw error;
    }
  }

  /**
   * Execute conflict resolution based on strategy
   */
  private async executeResolution(
    conflict: DataConflict,
    strategy: ResolutionStrategy,
  ): Promise<ConflictResolution> {
    const startTime = Date.now();

    try {
      let resolvedData: any;
      let resolvedBy: string | undefined;
      let autoResolved = true;

      switch (strategy) {
        case 'last_writer_wins':
          resolvedData = await this.resolveLastWriterWins(conflict);
          break;

        case 'merge_changes':
          resolvedData = await this.resolveMergeChanges(conflict);
          break;

        case 'priority_based':
          resolvedData = await this.resolvePriorityBased(conflict);
          break;

        case 'wedding_hierarchy':
          resolvedData = await this.resolveWeddingHierarchy(conflict);
          break;

        case 'auto_merge':
          resolvedData = await this.resolveAutoMerge(conflict);
          break;

        case 'user_choice':
          // This would typically involve user interaction
          autoResolved = false;
          resolvedData = await this.requestUserChoice(conflict);
          break;

        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }

      const resolution: ConflictResolution = {
        conflict_id: conflict.id,
        strategy,
        resolved_data: resolvedData,
        resolved_by: resolvedBy,
        resolution_time: new Date(),
        auto_resolved: autoResolved,
      };

      // Record resolution metrics
      await this.recordResolutionMetrics(
        conflict,
        resolution,
        Date.now() - startTime,
      );

      return resolution;
    } catch (error) {
      console.error('Failed to execute resolution:', error);
      throw error;
    }
  }

  /**
   * Resolve using last writer wins strategy
   */
  private async resolveLastWriterWins(conflict: DataConflict): Promise<any> {
    const operations = conflict.conflicting_operations;

    // Sort by timestamp and return the latest
    const sortedOps = operations.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return sortedOps[0].data;
  }

  /**
   * Resolve by merging changes
   */
  private async resolveMergeChanges(conflict: DataConflict): Promise<any> {
    const operations = conflict.conflicting_operations;
    let mergedData = {};

    // Merge all operations data
    for (const op of operations) {
      if (op.type === 'update' && typeof op.data === 'object') {
        mergedData = { ...mergedData, ...op.data };
      }
    }

    // Add merge metadata
    return {
      ...mergedData,
      _merged_from: operations.map((op) => op.id),
      _merge_timestamp: new Date(),
    };
  }

  /**
   * Resolve based on priority
   */
  private async resolvePriorityBased(conflict: DataConflict): Promise<any> {
    const operations = conflict.conflicting_operations;
    let highestPriority = -1;
    let selectedOperation = operations[0];

    for (const op of operations) {
      // Get user priority based on their role
      const { data: user } = await this.supabase
        .from('wedding_team')
        .select('role')
        .eq('wedding_id', conflict.wedding_id)
        .eq('user_id', op.client_id)
        .single();

      const priority =
        this.config.wedding_hierarchy[user?.role || 'guest'] || 0;

      if (priority > highestPriority) {
        highestPriority = priority;
        selectedOperation = op;
      }
    }

    return selectedOperation.data;
  }

  /**
   * Resolve using wedding hierarchy
   */
  private async resolveWeddingHierarchy(conflict: DataConflict): Promise<any> {
    // This is similar to priority-based but with wedding-specific rules
    return await this.resolvePriorityBased(conflict);
  }

  /**
   * Resolve using auto merge
   */
  private async resolveAutoMerge(conflict: DataConflict): Promise<any> {
    // Smart merge based on conflict type
    switch (conflict.conflict_type) {
      case 'budget_conflict':
        return await this.autoMergeBudgetConflict(conflict);
      case 'timeline_conflict':
        return await this.autoMergeTimelineConflict(conflict);
      case 'guest_conflict':
        return await this.autoMergeGuestConflict(conflict);
      default:
        return await this.resolveMergeChanges(conflict);
    }
  }

  /**
   * Request user choice for conflict resolution
   */
  private async requestUserChoice(conflict: DataConflict): Promise<any> {
    // Create a user choice request
    const choiceRequest = {
      conflict_id: conflict.id,
      wedding_id: conflict.wedding_id,
      conflict_type: conflict.conflict_type,
      options: conflict.conflicting_operations.map((op) => ({
        operation_id: op.id,
        user_id: op.client_id,
        data: op.data,
        timestamp: op.timestamp,
      })),
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    // Store choice request
    await this.supabase.from('conflict_choice_requests').insert(choiceRequest);

    // Emit event for user interface
    this.emit('user_choice_required', choiceRequest);

    // For now, return the first option (would be replaced by actual user choice)
    return conflict.conflicting_operations[0].data;
  }

  /**
   * Auto merge budget conflicts
   */
  private async autoMergeBudgetConflict(conflict: DataConflict): Promise<any> {
    const operations = conflict.conflicting_operations;
    let totalBudgetChange = 0;
    let category = null;

    for (const op of operations) {
      if (op.data.amount) {
        totalBudgetChange += op.data.amount;
      }
      if (op.data.category_id) {
        category = op.data.category_id;
      }
    }

    return {
      category_id: category,
      amount: totalBudgetChange,
      reason: 'Merged budget changes',
      merged_operations: operations.length,
    };
  }

  /**
   * Auto merge timeline conflicts
   */
  private async autoMergeTimelineConflict(
    conflict: DataConflict,
  ): Promise<any> {
    const operations = conflict.conflicting_operations;

    // For timeline conflicts, we typically can't merge - use hierarchy
    return await this.resolveWeddingHierarchy(conflict);
  }

  /**
   * Auto merge guest conflicts
   */
  private async autoMergeGuestConflict(conflict: DataConflict): Promise<any> {
    const operations = conflict.conflicting_operations;
    let mergedGuest = {};

    // Merge guest information
    for (const op of operations) {
      mergedGuest = { ...mergedGuest, ...op.data };
    }

    return {
      ...mergedGuest,
      _conflict_resolved: true,
      _merged_from: operations.length,
    };
  }

  /**
   * Group operations by target for efficient processing
   */
  private groupOperationsByTarget(
    operations: SyncOperation[],
  ): Map<string, SyncOperation[]> {
    const groups = new Map<string, SyncOperation[]>();

    for (const op of operations) {
      const targetKey = `${op.target.table}:${op.target.record_id}`;

      if (!groups.has(targetKey)) {
        groups.set(targetKey, []);
      }

      groups.get(targetKey)!.push(op);
    }

    return groups;
  }

  /**
   * Detect conflicts within operation groups
   */
  private async detectGroupConflicts(
    operations: SyncOperation[],
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];

    // Check for concurrent modifications
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1 = operations[i];
        const op2 = operations[j];

        // Check if operations conflict based on vector clocks
        const conflictsDetected = this.operationsConflict(op1, op2);

        if (conflictsDetected) {
          const conflict = await this.createConflictFromOperations(op1, op2);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect cross-target conflicts
   */
  private async detectCrossTargetConflicts(
    operations: SyncOperation[],
  ): Promise<DataConflict[]> {
    // Implementation for detecting conflicts between different targets
    // (e.g., budget changes affecting timeline, vendor changes affecting availability)
    return [];
  }

  /**
   * Check if two operations conflict
   */
  private operationsConflict(op1: SyncOperation, op2: SyncOperation): boolean {
    // Same target and overlapping time windows
    if (
      op1.target.table === op2.target.table &&
      op1.target.record_id === op2.target.record_id
    ) {
      // Check vector clock causality
      return !this.isCausallyOrdered(op1.vector_clock, op2.vector_clock);
    }

    return false;
  }

  /**
   * Check if operations are causally ordered
   */
  private isCausallyOrdered(clock1: VectorClock, clock2: VectorClock): boolean {
    const users1 = Object.keys(clock1);
    const users2 = Object.keys(clock2);
    const allUsers = [...new Set([...users1, ...users2])];

    let clock1Earlier = false;
    let clock2Earlier = false;

    for (const user of allUsers) {
      const val1 = clock1[user] || 0;
      const val2 = clock2[user] || 0;

      if (val1 < val2) clock1Earlier = true;
      if (val2 < val1) clock2Earlier = true;
    }

    return clock1Earlier !== clock2Earlier; // One is clearly before the other
  }

  /**
   * Create conflict from two operations
   */
  private async createConflictFromOperations(
    op1: SyncOperation,
    op2: SyncOperation,
  ): Promise<DataConflict | null> {
    try {
      const conflictType = this.determineConflictType(op1, op2);
      const severity = this.calculateConflictSeverity(conflictType, op1, op2);

      const { data, error } = await this.supabase.rpc('create_data_conflict', {
        p_wedding_id: this.extractWeddingId(op1),
        p_conflict_type: conflictType,
        p_conflicting_operations: [op1, op2],
        p_affected_data: {
          target: op1.target,
          operation1: op1,
          operation2: op2,
        },
        p_severity: severity,
        p_auto_resolvable: this.isAutoResolvable(conflictType),
      });

      if (error) {
        throw new Error(`Failed to create conflict: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to create conflict from operations:', error);
      return null;
    }
  }

  /**
   * Determine conflict type from operations
   */
  private determineConflictType(
    op1: SyncOperation,
    op2: SyncOperation,
  ): ConflictType {
    const table = op1.target.table;

    switch (table) {
      case 'wedding_timeline':
        return 'timeline_conflict';
      case 'budget_items':
        return 'budget_conflict';
      case 'vendor_assignments':
        return 'vendor_assignment_conflict';
      case 'wedding_guests':
        return 'guest_conflict';
      case 'documents':
        return 'document_edit_conflict';
      default:
        return 'concurrent_edit_conflict';
    }
  }

  /**
   * Calculate conflict severity
   */
  private calculateConflictSeverity(
    conflictType: ConflictType,
    op1: SyncOperation,
    op2: SyncOperation,
  ): number {
    const baseSeverity = this.config.conflict_priorities[conflictType] || 1;

    // Increase severity if operations are very recent
    const timeDiff = Math.abs(
      new Date(op1.timestamp).getTime() - new Date(op2.timestamp).getTime(),
    );
    const timeBonus = timeDiff < 60000 ? 2 : 0; // Less than 1 minute

    return Math.min(5, baseSeverity + timeBonus);
  }

  /**
   * Check if conflict type is auto-resolvable
   */
  private isAutoResolvable(conflictType: ConflictType): boolean {
    const autoResolvableTypes = [
      'document_edit_conflict',
      'data_synchronization_conflict',
      'concurrent_edit_conflict',
    ];

    return autoResolvableTypes.includes(conflictType);
  }

  /**
   * Extract wedding ID from operation
   */
  private extractWeddingId(operation: SyncOperation): string {
    // This would extract wedding ID from the operation context
    // Implementation depends on how operations store wedding context
    return (operation as any).wedding_id || '';
  }

  /**
   * Apply resolved data to the system
   */
  private async applyResolvedData(
    resolution: ConflictResolution,
  ): Promise<void> {
    // Apply the resolved data back to the database/system
    // This would depend on the specific conflict type and resolution

    // Emit event for other systems to react
    const event: CollaborationEvent = {
      id: `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'conflict_resolved',
      wedding_id: (resolution as any).wedding_id || '',
      user_id: resolution.resolved_by || 'system',
      timestamp: resolution.resolution_time,
      data: {
        conflict_id: resolution.conflict_id,
        strategy: resolution.strategy,
        resolved_data: resolution.resolved_data,
      },
      metadata: {
        source: 'system',
      },
      vector_clock: {},
      priority: 5,
    };

    this.emit('resolution_applied', event);
  }

  /**
   * Calculate timeline adjustments for vendor conflicts
   */
  private async calculateTimelineAdjustments(
    weddingId: string,
    vendorAssignment: any,
  ): Promise<any[]> {
    // This would calculate necessary timeline adjustments
    // when vendor assignments change
    return [];
  }

  /**
   * Apply timeline adjustments
   */
  private async applyTimelineAdjustments(
    weddingId: string,
    adjustments: any[],
  ): Promise<void> {
    // Apply timeline adjustments to the wedding timeline
    for (const adjustment of adjustments) {
      // Implementation would update timeline based on adjustment
    }
  }

  /**
   * Remove conflict from processing queue
   */
  private removeFromQueue(conflictId: string): void {
    for (const [weddingId, conflicts] of this.resolutionQueue) {
      const index = conflicts.findIndex((c) => c.id === conflictId);
      if (index !== -1) {
        conflicts.splice(index, 1);
        if (conflicts.length === 0) {
          this.resolutionQueue.delete(weddingId);
        }
        break;
      }
    }
  }

  /**
   * Record resolution metrics
   */
  private async recordResolutionMetrics(
    conflict: DataConflict,
    resolution: ConflictResolution,
    resolutionTime: number,
  ): Promise<void> {
    try {
      await this.supabase.rpc('record_wedding_metric', {
        p_wedding_id: conflict.wedding_id,
        p_metric_type: 'conflict_resolution_time',
        p_metric_value: {
          conflict_type: conflict.conflict_type,
          resolution_strategy: resolution.strategy,
          resolution_time_ms: resolutionTime,
          auto_resolved: resolution.auto_resolved,
          severity: conflict.severity,
        },
      });
    } catch (error) {
      console.error('Failed to record resolution metrics:', error);
    }
  }

  /**
   * Start resolution processor
   */
  private startResolutionProcessor(): void {
    this.resolutionTimer = setInterval(async () => {
      try {
        // Auto-resolve conflicts if enabled
        if (this.config.auto_resolution_enabled) {
          const resolved = await this.supabase.rpc('auto_resolve_conflicts');

          if (resolved > 0) {
            console.log(`Auto-resolved ${resolved} conflicts`);
          }
        }

        // Escalate timed-out conflicts
        const escalated = await this.supabase.rpc(
          'escalate_timed_out_conflicts',
        );

        if (escalated > 0) {
          console.log(`Escalated ${escalated} timed-out conflicts`);
        }
      } catch (error) {
        console.error('Resolution processor error:', error);
      }
    }, 30000); // Run every 30 seconds
  }

  /**
   * Shutdown the conflict resolution engine
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down conflict resolution engine...');

    // Clear resolution timer
    if (this.resolutionTimer) {
      clearInterval(this.resolutionTimer);
    }

    // Wait for active resolutions to complete
    const activePromises = Array.from(this.activeResolutions.values());
    if (activePromises.length > 0) {
      console.log(
        `Waiting for ${activePromises.length} active resolutions to complete...`,
      );
      await Promise.allSettled(activePromises);
    }

    console.log('Conflict resolution engine shut down complete');
  }
}

export default ConflictResolutionEngine;
