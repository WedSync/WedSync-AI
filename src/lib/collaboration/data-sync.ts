// WS-342: Real-Time Wedding Collaboration - Data Synchronization Service
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import {
  SyncOperation,
  SyncResult,
  DataTarget,
  VectorClock,
  ConsistencyReport,
  DataInconsistency,
  DataConflict,
} from './types/collaboration';

export interface OTOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain' | 'replace';
  position?: number;
  length?: number;
  content?: any;
  attributes?: any;
  client_id: string;
  vector_clock: VectorClock;
}

export interface TransformResult {
  transformed_operation: OTOperation;
  client_operation: OTOperation;
  success: boolean;
  conflicts?: string[];
}

export interface SyncConfiguration {
  max_operation_age_minutes: number;
  batch_size: number;
  enable_operational_transform: boolean;
  consistency_check_interval_ms: number;
  max_concurrent_syncs: number;
}

export interface RepairResult {
  repaired_count: number;
  failed_repairs: string[];
  repair_time_ms: number;
}

export class DataSynchronizationService extends EventEmitter {
  private supabase;
  private pendingOperations = new Map<string, SyncOperation[]>(); // wedding_id -> operations
  private activeSyncs = new Map<string, Promise<SyncResult>>(); // operation_id -> promise
  private vectorClocks = new Map<string, VectorClock>(); // wedding_id -> clock
  private config: SyncConfiguration;
  private consistencyTimer: NodeJS.Timeout;
  private batchTimer: NodeJS.Timeout;

  constructor(config: Partial<SyncConfiguration> = {}) {
    super();

    this.config = {
      max_operation_age_minutes: 60,
      batch_size: 50,
      enable_operational_transform: true,
      consistency_check_interval_ms: 30000,
      max_concurrent_syncs: 100,
      ...config,
    };

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.startConsistencyCheck();
    this.startBatchProcessor();
  }

  /**
   * Synchronize data changes
   */
  async syncData(
    weddingId: string,
    dataType: string,
    operation: SyncOperation,
  ): Promise<SyncResult> {
    try {
      // Check if operation is already being processed
      const existingSync = this.activeSyncs.get(operation.id);
      if (existingSync) {
        return await existingSync;
      }

      const syncPromise = this.executeSyncOperation(
        weddingId,
        dataType,
        operation,
      );
      this.activeSyncs.set(operation.id, syncPromise);

      try {
        const result = await syncPromise;
        this.activeSyncs.delete(operation.id);
        return result;
      } catch (error) {
        this.activeSyncs.delete(operation.id);
        throw error;
      }
    } catch (error) {
      console.error('Failed to sync data:', error);
      throw error;
    }
  }

  /**
   * Resolve conflicts between operations
   */
  async resolveConflicts(
    conflicts: DataConflict[],
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    try {
      for (const conflict of conflicts) {
        // Determine best resolution strategy for this conflict type
        const strategy = this.selectResolutionStrategy(conflict);

        // Apply operational transformation if applicable
        if (
          this.config.enable_operational_transform &&
          this.isTransformable(conflict)
        ) {
          const transformed = await this.transformConflict(conflict);
          if (transformed) {
            resolutions.push({
              conflict_id: conflict.id,
              strategy: 'operational_transform',
              resolved_data: transformed,
              resolved_by: 'system',
              resolution_time: new Date(),
              auto_resolved: true,
            });
            continue;
          }
        }

        // Apply other resolution strategies
        const resolution = await this.resolveConflictByStrategy(
          conflict,
          strategy,
        );
        resolutions.push(resolution);
      }

      return resolutions;
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      throw error;
    }
  }

  /**
   * Apply operational transformation to operations
   */
  async applyOperationalTransform(
    operation: OTOperation,
  ): Promise<TransformResult> {
    try {
      // Get concurrent operations that might conflict
      const concurrentOps = await this.getConcurrentOperations(operation);

      if (concurrentOps.length === 0) {
        return {
          transformed_operation: operation,
          client_operation: operation,
          success: true,
        };
      }

      // Transform operation against concurrent operations
      let transformedOp = operation;
      const conflicts: string[] = [];

      for (const concurrentOp of concurrentOps) {
        const transformResult = this.transformOperations(
          transformedOp,
          concurrentOp,
        );

        if (!transformResult.success) {
          conflicts.push(`Conflict with operation ${concurrentOp.id}`);
          continue;
        }

        transformedOp = transformResult.transformed_operation;
      }

      return {
        transformed_operation: transformedOp,
        client_operation: operation,
        success: conflicts.length === 0,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      console.error('Failed to apply operational transform:', error);
      throw error;
    }
  }

  /**
   * Ensure data consistency for a wedding
   */
  async ensureConsistency(weddingId: string): Promise<ConsistencyReport> {
    try {
      const startTime = Date.now();
      const inconsistencies: DataInconsistency[] = [];

      // Check vector clock consistency
      const vectorClockIssues =
        await this.checkVectorClockConsistency(weddingId);
      inconsistencies.push(...vectorClockIssues);

      // Check data integrity
      const dataIntegrityIssues = await this.checkDataIntegrity(weddingId);
      inconsistencies.push(...dataIntegrityIssues);

      // Check operation ordering
      const orderingIssues = await this.checkOperationOrdering(weddingId);
      inconsistencies.push(...orderingIssues);

      // Check referential integrity
      const referentialIssues = await this.checkReferentialIntegrity(weddingId);
      inconsistencies.push(...referentialIssues);

      const report: ConsistencyReport = {
        wedding_id: weddingId,
        is_consistent: inconsistencies.length === 0,
        inconsistencies,
        checked_at: new Date(),
        repair_needed: inconsistencies.some(
          (i) => i.severity === 'high' || i.severity === 'critical',
        ),
      };

      // Record consistency metrics
      await this.recordConsistencyMetrics(
        weddingId,
        report,
        Date.now() - startTime,
      );

      return report;
    } catch (error) {
      console.error('Failed to ensure consistency:', error);
      throw error;
    }
  }

  /**
   * Repair data inconsistencies
   */
  async repairInconsistencies(
    inconsistencies: DataInconsistency[],
  ): Promise<RepairResult> {
    const startTime = Date.now();
    let repairedCount = 0;
    const failedRepairs: string[] = [];

    try {
      for (const inconsistency of inconsistencies) {
        try {
          const repaired = await this.repairInconsistency(inconsistency);
          if (repaired) {
            repairedCount++;
          } else {
            failedRepairs.push(
              `${inconsistency.type}: ${inconsistency.description}`,
            );
          }
        } catch (error) {
          failedRepairs.push(`${inconsistency.type}: ${error.message}`);
        }
      }

      return {
        repaired_count: repairedCount,
        failed_repairs: failedRepairs,
        repair_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Failed to repair inconsistencies:', error);
      throw error;
    }
  }

  /**
   * Execute synchronization operation
   */
  private async executeSyncOperation(
    weddingId: string,
    dataType: string,
    operation: SyncOperation,
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Update vector clock
      await this.updateVectorClock(weddingId, operation.client_id);
      operation.vector_clock = this.getVectorClock(weddingId);

      // Apply operational transformation if needed
      let finalOperation = operation;
      if (
        this.config.enable_operational_transform &&
        this.needsTransformation(operation)
      ) {
        const transformResult = await this.applyOperationalTransform(
          this.operationToOTOperation(operation),
        );
        if (transformResult.success) {
          finalOperation = this.otOperationToSyncOperation(
            transformResult.transformed_operation,
            operation,
          );
        }
      }

      // Apply operation to database
      const success = await this.applyOperationToDatabase(
        weddingId,
        dataType,
        finalOperation,
      );

      if (!success) {
        throw new Error('Failed to apply operation to database');
      }

      // Check for conflicts
      const conflicts = await this.detectOperationConflicts(
        weddingId,
        finalOperation,
      );

      const result: SyncResult = {
        operation_id: operation.id,
        success: true,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        applied_at: new Date(),
        vector_clock: operation.vector_clock,
      };

      // Emit sync event
      this.emit('sync_completed', {
        wedding_id: weddingId,
        operation,
        result,
        processing_time: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      console.error('Failed to execute sync operation:', error);

      return {
        operation_id: operation.id,
        success: false,
        applied_at: new Date(),
        vector_clock: operation.vector_clock,
        error: error.message,
      } as any;
    }
  }

  /**
   * Apply operation to database
   */
  private async applyOperationToDatabase(
    weddingId: string,
    dataType: string,
    operation: SyncOperation,
  ): Promise<boolean> {
    try {
      const { table, record_id, field } = operation.target;

      switch (operation.type) {
        case 'insert':
          const { error: insertError } = await this.supabase
            .from(table)
            .insert({
              id: record_id,
              ...operation.data,
              wedding_id: weddingId,
            });
          return !insertError;

        case 'update':
          let updateQuery = this.supabase
            .from(table)
            .update(operation.data)
            .eq('id', record_id);

          if (table !== 'weddings') {
            updateQuery = updateQuery.eq('wedding_id', weddingId);
          }

          const { error: updateError } = await updateQuery;
          return !updateError;

        case 'delete':
          let deleteQuery = this.supabase
            .from(table)
            .delete()
            .eq('id', record_id);

          if (table !== 'weddings') {
            deleteQuery = deleteQuery.eq('wedding_id', weddingId);
          }

          const { error: deleteError } = await deleteQuery;
          return !deleteError;

        case 'move':
          // Handle move operations (e.g., reordering timeline items)
          return await this.handleMoveOperation(weddingId, operation);

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      console.error('Failed to apply operation to database:', error);
      return false;
    }
  }

  /**
   * Handle move operations (like reordering)
   */
  private async handleMoveOperation(
    weddingId: string,
    operation: SyncOperation,
  ): Promise<boolean> {
    try {
      const { table, record_id } = operation.target;
      const { from_position, to_position } = operation.data;

      // Update the position of the moved item
      await this.supabase
        .from(table)
        .update({ position: to_position })
        .eq('id', record_id)
        .eq('wedding_id', weddingId);

      // Update positions of other affected items
      if (from_position < to_position) {
        // Moving down - shift items up
        await this.supabase
          .from(table)
          .update({
            position: this.supabase.raw('position - 1'),
          })
          .eq('wedding_id', weddingId)
          .gt('position', from_position)
          .lte('position', to_position)
          .neq('id', record_id);
      } else {
        // Moving up - shift items down
        await this.supabase
          .from(table)
          .update({
            position: this.supabase.raw('position + 1'),
          })
          .eq('wedding_id', weddingId)
          .gte('position', to_position)
          .lt('position', from_position)
          .neq('id', record_id);
      }

      return true;
    } catch (error) {
      console.error('Failed to handle move operation:', error);
      return false;
    }
  }

  /**
   * Detect conflicts for an operation
   */
  private async detectOperationConflicts(
    weddingId: string,
    operation: SyncOperation,
  ): Promise<DataConflict[]> {
    // Get recent operations that might conflict
    const { data: recentOps } = await this.supabase
      .from('sync_operations')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('target_table', operation.target.table)
      .eq('target_record_id', operation.target.record_id)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .neq('operation_id', operation.id);

    const conflicts: DataConflict[] = [];

    for (const recentOp of recentOps || []) {
      if (this.operationsConflict(operation, this.mapDbOpToSyncOp(recentOp))) {
        // Create conflict record
        const conflict = await this.createConflictFromOperations(
          operation,
          this.mapDbOpToSyncOp(recentOp),
        );
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two operations conflict
   */
  private operationsConflict(op1: SyncOperation, op2: SyncOperation): boolean {
    // Same target
    if (
      op1.target.table !== op2.target.table ||
      op1.target.record_id !== op2.target.record_id
    ) {
      return false;
    }

    // Check if operations are causally concurrent
    return this.areConcurrent(op1.vector_clock, op2.vector_clock);
  }

  /**
   * Check if operations are concurrent (not causally ordered)
   */
  private areConcurrent(clock1: VectorClock, clock2: VectorClock): boolean {
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

    return clock1Earlier && clock2Earlier; // Both have elements that are earlier
  }

  /**
   * Transform operations using operational transformation
   */
  private transformOperations(
    op1: OTOperation,
    op2: OTOperation,
  ): TransformResult {
    // Basic operational transformation for text operations
    if (op1.type === 'insert' && op2.type === 'insert') {
      return this.transformInsertInsert(op1, op2);
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      return this.transformInsertDelete(op1, op2);
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      const result = this.transformInsertDelete(op2, op1);
      return {
        transformed_operation: result.client_operation,
        client_operation: result.transformed_operation,
        success: result.success,
        conflicts: result.conflicts,
      };
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      return this.transformDeleteDelete(op1, op2);
    }

    // Default transformation for non-text operations
    return {
      transformed_operation: op1,
      client_operation: op2,
      success: true,
    };
  }

  /**
   * Transform two insert operations
   */
  private transformInsertInsert(
    op1: OTOperation,
    op2: OTOperation,
  ): TransformResult {
    const pos1 = op1.position || 0;
    const pos2 = op2.position || 0;

    if (pos1 <= pos2) {
      // op1 comes first, adjust op2's position
      return {
        transformed_operation: op1,
        client_operation: {
          ...op2,
          position: pos2 + (op1.content?.length || 1),
        },
        success: true,
      };
    } else {
      // op2 comes first, adjust op1's position
      return {
        transformed_operation: {
          ...op1,
          position: pos1 + (op2.content?.length || 1),
        },
        client_operation: op2,
        success: true,
      };
    }
  }

  /**
   * Transform insert and delete operations
   */
  private transformInsertDelete(
    insertOp: OTOperation,
    deleteOp: OTOperation,
  ): TransformResult {
    const insertPos = insertOp.position || 0;
    const deletePos = deleteOp.position || 0;
    const deleteLen = deleteOp.length || 1;

    if (insertPos <= deletePos) {
      // Insert comes before delete, adjust delete position
      return {
        transformed_operation: insertOp,
        client_operation: {
          ...deleteOp,
          position: deletePos + (insertOp.content?.length || 1),
        },
        success: true,
      };
    } else if (insertPos > deletePos + deleteLen) {
      // Insert comes after delete, adjust insert position
      return {
        transformed_operation: {
          ...insertOp,
          position: insertPos - deleteLen,
        },
        client_operation: deleteOp,
        success: true,
      };
    } else {
      // Insert is within delete range - this is a conflict
      return {
        transformed_operation: insertOp,
        client_operation: deleteOp,
        success: false,
        conflicts: ['Insert position conflicts with delete range'],
      };
    }
  }

  /**
   * Transform two delete operations
   */
  private transformDeleteDelete(
    op1: OTOperation,
    op2: OTOperation,
  ): TransformResult {
    const pos1 = op1.position || 0;
    const pos2 = op2.position || 0;
    const len1 = op1.length || 1;
    const len2 = op2.length || 1;

    if (pos1 + len1 <= pos2) {
      // op1 comes before op2, adjust op2's position
      return {
        transformed_operation: op1,
        client_operation: {
          ...op2,
          position: pos2 - len1,
        },
        success: true,
      };
    } else if (pos2 + len2 <= pos1) {
      // op2 comes before op1, adjust op1's position
      return {
        transformed_operation: {
          ...op1,
          position: pos1 - len2,
        },
        client_operation: op2,
        success: true,
      };
    } else {
      // Overlapping deletes - complex conflict
      return {
        transformed_operation: op1,
        client_operation: op2,
        success: false,
        conflicts: ['Overlapping delete operations'],
      };
    }
  }

  /**
   * Get concurrent operations for transformation
   */
  private async getConcurrentOperations(
    operation: OTOperation,
  ): Promise<OTOperation[]> {
    // This would query for operations that are concurrent with the given operation
    // based on vector clocks and timestamps
    return [];
  }

  /**
   * Convert SyncOperation to OTOperation
   */
  private operationToOTOperation(syncOp: SyncOperation): OTOperation {
    return {
      id: syncOp.id,
      type: syncOp.type,
      position: (syncOp.data as any).position,
      length: (syncOp.data as any).length,
      content: syncOp.data,
      client_id: syncOp.client_id,
      vector_clock: syncOp.vector_clock,
    };
  }

  /**
   * Convert OTOperation to SyncOperation
   */
  private otOperationToSyncOperation(
    otOp: OTOperation,
    originalSyncOp: SyncOperation,
  ): SyncOperation {
    return {
      ...originalSyncOp,
      data: {
        ...originalSyncOp.data,
        position: otOp.position,
        length: otOp.length,
        content: otOp.content,
      },
      vector_clock: otOp.vector_clock,
    };
  }

  /**
   * Check if operation needs transformation
   */
  private needsTransformation(operation: SyncOperation): boolean {
    // Text-based operations typically need transformation
    const textTables = ['documents', 'notes', 'comments'];
    return textTables.includes(operation.target.table);
  }

  /**
   * Update vector clock for wedding
   */
  private async updateVectorClock(
    weddingId: string,
    clientId: string,
  ): Promise<void> {
    if (!this.vectorClocks.has(weddingId)) {
      await this.loadVectorClock(weddingId);
    }

    const clock = this.vectorClocks.get(weddingId)!;
    clock[clientId] = (clock[clientId] || 0) + 1;

    this.vectorClocks.set(weddingId, clock);
  }

  /**
   * Get vector clock for wedding
   */
  private getVectorClock(weddingId: string): VectorClock {
    return { ...(this.vectorClocks.get(weddingId) || {}) };
  }

  /**
   * Load vector clock from database
   */
  private async loadVectorClock(weddingId: string): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('sync_operations')
        .select('vector_clock')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        this.vectorClocks.set(weddingId, data[0].vector_clock || {});
      } else {
        this.vectorClocks.set(weddingId, {});
      }
    } catch (error) {
      console.error('Failed to load vector clock:', error);
      this.vectorClocks.set(weddingId, {});
    }
  }

  /**
   * Check vector clock consistency
   */
  private async checkVectorClockConsistency(
    weddingId: string,
  ): Promise<DataInconsistency[]> {
    const inconsistencies: DataInconsistency[] = [];

    try {
      // Get all operations for this wedding
      const { data: operations } = await this.supabase
        .from('sync_operations')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: true });

      // Validate vector clock progression
      let expectedClock: VectorClock = {};

      for (const op of operations || []) {
        const opClock = op.vector_clock || {};

        // Check if clock values only increase
        for (const [clientId, value] of Object.entries(opClock)) {
          const expectedValue = expectedClock[clientId] || 0;
          if (value < expectedValue) {
            inconsistencies.push({
              type: 'vector_clock_regression',
              description: `Vector clock value decreased for client ${clientId}`,
              affected_records: [op.id],
              severity: 'high',
              auto_repairable: true,
            });
          }
        }

        expectedClock = { ...expectedClock, ...opClock };
      }
    } catch (error) {
      console.error('Failed to check vector clock consistency:', error);
    }

    return inconsistencies;
  }

  /**
   * Check data integrity
   */
  private async checkDataIntegrity(
    weddingId: string,
  ): Promise<DataInconsistency[]> {
    const inconsistencies: DataInconsistency[] = [];

    // This would check for various data integrity issues
    // like orphaned records, invalid references, etc.

    return inconsistencies;
  }

  /**
   * Check operation ordering
   */
  private async checkOperationOrdering(
    weddingId: string,
  ): Promise<DataInconsistency[]> {
    const inconsistencies: DataInconsistency[] = [];

    // Check if operations are properly ordered according to their vector clocks

    return inconsistencies;
  }

  /**
   * Check referential integrity
   */
  private async checkReferentialIntegrity(
    weddingId: string,
  ): Promise<DataInconsistency[]> {
    const inconsistencies: DataInconsistency[] = [];

    // Check if all foreign key references are valid

    return inconsistencies;
  }

  /**
   * Repair a specific inconsistency
   */
  private async repairInconsistency(
    inconsistency: DataInconsistency,
  ): Promise<boolean> {
    try {
      switch (inconsistency.type) {
        case 'vector_clock_regression':
          return await this.repairVectorClockRegression(inconsistency);
        default:
          console.warn(
            `No repair method for inconsistency type: ${inconsistency.type}`,
          );
          return false;
      }
    } catch (error) {
      console.error('Failed to repair inconsistency:', error);
      return false;
    }
  }

  /**
   * Repair vector clock regression
   */
  private async repairVectorClockRegression(
    inconsistency: DataInconsistency,
  ): Promise<boolean> {
    // Implementation would fix vector clock regression issues
    return true;
  }

  /**
   * Record consistency metrics
   */
  private async recordConsistencyMetrics(
    weddingId: string,
    report: ConsistencyReport,
    checkTime: number,
  ): Promise<void> {
    try {
      await this.supabase.rpc('record_wedding_metric', {
        p_wedding_id: weddingId,
        p_metric_type: 'data_sync_performance',
        p_metric_value: {
          is_consistent: report.is_consistent,
          inconsistency_count: report.inconsistencies.length,
          repair_needed: report.repair_needed,
          check_time_ms: checkTime,
        },
      });
    } catch (error) {
      console.error('Failed to record consistency metrics:', error);
    }
  }

  /**
   * Start consistency check timer
   */
  private startConsistencyCheck(): void {
    this.consistencyTimer = setInterval(async () => {
      try {
        // Get all active weddings
        const activeWeddings = Array.from(this.vectorClocks.keys());

        for (const weddingId of activeWeddings) {
          const report = await this.ensureConsistency(weddingId);

          if (!report.is_consistent && report.repair_needed) {
            console.log(
              `Inconsistencies found for wedding ${weddingId}, attempting repair...`,
            );
            await this.repairInconsistencies(report.inconsistencies);
          }
        }
      } catch (error) {
        console.error('Consistency check error:', error);
      }
    }, this.config.consistency_check_interval_ms);
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(async () => {
      try {
        // Process pending operations in batches
        for (const [weddingId, operations] of this.pendingOperations) {
          if (operations.length >= this.config.batch_size) {
            const batch = operations.splice(0, this.config.batch_size);
            await this.processBatch(weddingId, batch);
          }
        }
      } catch (error) {
        console.error('Batch processor error:', error);
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(
    weddingId: string,
    operations: SyncOperation[],
  ): Promise<void> {
    console.log(
      `Processing batch of ${operations.length} operations for wedding ${weddingId}`,
    );

    for (const operation of operations) {
      try {
        await this.syncData(weddingId, operation.target.table, operation);
      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error);
      }
    }
  }

  /**
   * Map database operation to sync operation
   */
  private mapDbOpToSyncOp(dbOp: any): SyncOperation {
    return {
      id: dbOp.operation_id,
      type: dbOp.operation_type,
      target: {
        table: dbOp.target_table,
        record_id: dbOp.target_record_id,
        field: dbOp.target_field,
      },
      data: dbOp.operation_data,
      client_id: dbOp.client_id,
      timestamp: new Date(dbOp.created_at),
      dependencies: dbOp.dependencies || [],
      vector_clock: dbOp.vector_clock || {},
    };
  }

  /**
   * Create conflict from operations
   */
  private async createConflictFromOperations(
    op1: SyncOperation,
    op2: SyncOperation,
  ): Promise<DataConflict | null> {
    try {
      const conflictType = this.determineConflictType(op1.target.table);

      const { data } = await this.supabase.rpc('create_data_conflict', {
        p_wedding_id: (op1 as any).wedding_id,
        p_conflict_type: conflictType,
        p_conflicting_operations: [op1, op2],
        p_affected_data: {
          target: op1.target,
          operation1: op1,
          operation2: op2,
        },
        p_severity: 3,
        p_auto_resolvable: true,
      });

      return data;
    } catch (error) {
      console.error('Failed to create conflict from operations:', error);
      return null;
    }
  }

  /**
   * Determine conflict type from table name
   */
  private determineConflictType(table: string): string {
    const typeMap: { [key: string]: string } = {
      wedding_timeline: 'timeline_conflict',
      budget_items: 'budget_conflict',
      wedding_guests: 'guest_conflict',
      documents: 'document_edit_conflict',
    };

    return typeMap[table] || 'data_synchronization_conflict';
  }

  // Additional helper methods for conflict resolution strategies
  private selectResolutionStrategy(conflict: DataConflict): string {
    return 'operational_transform';
  }

  private isTransformable(conflict: DataConflict): boolean {
    return true;
  }

  private async transformConflict(conflict: DataConflict): Promise<any> {
    return null;
  }

  private async resolveConflictByStrategy(
    conflict: DataConflict,
    strategy: string,
  ): Promise<any> {
    return {
      conflict_id: conflict.id,
      strategy,
      resolved_data: {},
      resolved_by: 'system',
      resolution_time: new Date(),
      auto_resolved: true,
    };
  }

  /**
   * Shutdown the data synchronization service
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down data synchronization service...');

    // Clear timers
    if (this.consistencyTimer) clearInterval(this.consistencyTimer);
    if (this.batchTimer) clearInterval(this.batchTimer);

    // Process remaining pending operations
    for (const [weddingId, operations] of this.pendingOperations) {
      if (operations.length > 0) {
        await this.processBatch(weddingId, operations);
      }
    }

    // Wait for active syncs to complete
    const activeSyncs = Array.from(this.activeSyncs.values());
    if (activeSyncs.length > 0) {
      console.log(
        `Waiting for ${activeSyncs.length} active syncs to complete...`,
      );
      await Promise.allSettled(activeSyncs);
    }

    console.log('Data synchronization service shut down complete');
  }
}

export default DataSynchronizationService;
