/**
 * WS-172: Offline Sync Engine - Advanced Conflict Resolution & Transaction Management
 * Team B - Round 3 - Batch 21
 *
 * Core sync engine with robust conflict detection, resolution algorithms,
 * and transaction-safe batch operations with retry logic.
 */

import { z } from 'zod';

// Types and Interfaces
export interface SyncChange {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  timestamp: string;
  userId: string;
  deviceId?: string;
  checksum?: string;
  metadata?: Record<string, any>;
}

export interface ConflictData {
  id: string;
  table: string;
  recordId: string;
  clientData: Record<string, any>;
  serverData: Record<string, any>;
  clientTimestamp: string;
  serverTimestamp: string;
  conflictFields: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConflictResolution {
  strategy: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  resolvedData?: Record<string, any>;
  confidence: number;
  explanation: string;
  applied: boolean;
  serverId?: string;
}

export interface SyncResult {
  success: boolean;
  sessionId: string;
  processed: Array<{
    changeId: string;
    serverId: string;
    action: string;
  }>;
  conflicts: Array<{
    changeId: string;
    table: string;
    conflict: ConflictData;
    resolution: ConflictResolution;
  }>;
  failures: Array<{
    changeId: string;
    table: string;
    error: string;
    retryable: boolean;
    retryCount?: number;
  }>;
  serverChanges: SyncChange[];
  metrics: {
    processingTime: number;
    itemsProcessed: number;
    conflictCount: number;
    errorCount: number;
    throughput: number;
  };
}

export interface SyncOptions {
  conflictResolution: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  transactionTimeout: number;
  validateChecksums: boolean;
  enableDryRun: boolean;
}

// Validation schemas
const SyncChangeSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['create', 'update', 'delete']),
  table: z.string().min(1).max(50),
  data: z.record(z.any()),
  timestamp: z.string().datetime(),
  userId: z.string().uuid(),
  deviceId: z.string().optional(),
  checksum: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Advanced Offline Sync Engine
 * Handles complex conflict resolution, transaction management, and retry logic
 */
export class OfflineSyncEngine {
  private supabase: any;
  private options: SyncOptions;
  private activeTransactions: Map<string, any> = new Map();
  private retryQueue: Map<
    string,
    { change: SyncChange; retryCount: number; nextRetry: Date }
  > = new Map();

  constructor(supabaseClient: any, options: Partial<SyncOptions> = {}) {
    this.supabase = supabaseClient;
    this.options = {
      conflictResolution: 'server_wins',
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds base delay
      batchSize: 10,
      transactionTimeout: 30000, // 30 seconds
      validateChecksums: true,
      enableDryRun: false,
      ...options,
    };

    // Start retry processor
    this.startRetryProcessor();
  }

  /**
   * Process a batch of sync changes with full transaction safety
   */
  async processSyncBatch(
    changes: SyncChange[],
    sessionId: string,
    options?: Partial<SyncOptions>,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const effectiveOptions = { ...this.options, ...options };

    // Validate all changes first
    const validationResult = this.validateChanges(changes);
    if (!validationResult.valid) {
      throw new Error(
        `Invalid sync changes: ${validationResult.errors.join(', ')}`,
      );
    }

    const result: SyncResult = {
      success: false,
      sessionId,
      processed: [],
      conflicts: [],
      failures: [],
      serverChanges: [],
      metrics: {
        processingTime: 0,
        itemsProcessed: 0,
        conflictCount: 0,
        errorCount: 0,
        throughput: 0,
      },
    };

    // Start transaction
    const transaction = await this.beginTransaction(sessionId);
    this.activeTransactions.set(sessionId, transaction);

    try {
      // Process changes in batches
      const batches = this.createBatches(changes, effectiveOptions.batchSize);

      for (const batch of batches) {
        const batchResult = await this.processBatch(
          batch,
          sessionId,
          effectiveOptions,
        );

        // Merge results
        result.processed.push(...batchResult.processed);
        result.conflicts.push(...batchResult.conflicts);
        result.failures.push(...batchResult.failures);
      }

      // Get server changes if needed
      const userId = changes[0]?.userId;
      if (userId) {
        result.serverChanges = await this.getServerChanges(userId, sessionId);
      }

      // Commit transaction
      await this.commitTransaction(sessionId);
      result.success = true;

      // Calculate metrics
      result.metrics = {
        processingTime: Date.now() - startTime,
        itemsProcessed: result.processed.length,
        conflictCount: result.conflicts.length,
        errorCount: result.failures.length,
        throughput: result.processed.length / ((Date.now() - startTime) / 1000),
      };

      // Record performance metrics
      await this.recordSyncMetrics(sessionId, result.metrics);
    } catch (error) {
      // Rollback transaction
      await this.rollbackTransaction(sessionId, error);
      result.success = false;
      throw error;
    } finally {
      this.activeTransactions.delete(sessionId);
    }

    return result;
  }

  /**
   * Advanced conflict detection with sophisticated algorithms
   */
  async detectConflicts(change: SyncChange): Promise<ConflictData | null> {
    try {
      // Get current server state
      const serverData = await this.getServerRecord(change.table, change.id);

      if (!serverData) {
        // No conflict if record doesn't exist on server
        return null;
      }

      // Timestamp-based conflict detection
      const clientTime = new Date(change.timestamp);
      const serverTime = new Date(serverData.updated_at);

      if (serverTime <= clientTime) {
        // Client change is newer, no conflict
        return null;
      }

      // Field-level conflict analysis
      const conflictFields = this.analyzeFieldConflicts(
        change.data,
        serverData,
      );

      if (conflictFields.length === 0) {
        // No actual data conflicts
        return null;
      }

      // Calculate conflict severity
      const severity = this.calculateConflictSeverity(
        conflictFields,
        change.table,
      );

      const conflictData: ConflictData = {
        id: crypto.randomUUID(),
        table: change.table,
        recordId: change.id,
        clientData: change.data,
        serverData: serverData,
        clientTimestamp: change.timestamp,
        serverTimestamp: serverData.updated_at,
        conflictFields,
        severity,
      };

      // Log conflict for analytics
      await this.logConflict(conflictData, change.userId);

      return conflictData;
    } catch (error) {
      console.error('[Conflict Detection Error]:', error);
      return null;
    }
  }

  /**
   * Intelligent conflict resolution with multiple strategies
   */
  async resolveConflict(
    conflict: ConflictData,
    strategy: string,
    userContext?: { userId: string; role: string },
  ): Promise<ConflictResolution> {
    let resolution: ConflictResolution;

    switch (strategy) {
      case 'client_wins':
        resolution = await this.resolveClientWins(conflict);
        break;
      case 'server_wins':
        resolution = await this.resolveServerWins(conflict);
        break;
      case 'merge':
        resolution = await this.resolveMerge(conflict);
        break;
      case 'manual':
        resolution = await this.resolveManual(conflict);
        break;
      default:
        // Use AI-powered resolution
        resolution = await this.resolveIntelligent(conflict, userContext);
    }

    // Record resolution for learning
    await this.recordConflictResolution(conflict, resolution);

    return resolution;
  }

  /**
   * Transaction-safe batch processing
   */
  private async processBatch(
    batch: SyncChange[],
    sessionId: string,
    options: SyncOptions,
  ): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      processed: [],
      conflicts: [],
      failures: [],
    };

    for (const change of batch) {
      try {
        // Detect conflicts first
        const conflict = await this.detectConflicts(change);

        if (conflict) {
          // Handle conflict
          const resolution = await this.resolveConflict(
            conflict,
            options.conflictResolution,
          );

          result.conflicts!.push({
            changeId: change.id,
            table: change.table,
            conflict,
            resolution,
          });

          if (resolution.applied && resolution.serverId) {
            result.processed!.push({
              changeId: change.id,
              serverId: resolution.serverId,
              action: 'resolved',
            });
          }
        } else {
          // No conflict, apply change directly
          const serverId = await this.applyChange(change);

          result.processed!.push({
            changeId: change.id,
            serverId,
            action: change.action,
          });
        }
      } catch (error) {
        const retryable = this.isRetryableError(error);

        result.failures!.push({
          changeId: change.id,
          table: change.table,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable,
        });

        // Add to retry queue if retryable
        if (retryable && !this.retryQueue.has(change.id)) {
          this.addToRetryQueue(change);
        }
      }
    }

    return result;
  }

  /**
   * Apply a single change to the database
   */
  private async applyChange(change: SyncChange): Promise<string> {
    const { action, table, id, data, userId } = change;

    switch (action) {
      case 'create':
        const { data: created, error: createError } = await this.supabase
          .from(table)
          .insert({ id, user_id: userId, ...data })
          .select('id')
          .single();

        if (createError) throw createError;
        return created.id;

      case 'update':
        const { data: updated, error: updateError } = await this.supabase
          .from(table)
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)
          .select('id')
          .single();

        if (updateError) throw updateError;
        return updated.id;

      case 'delete':
        const { error: deleteError } = await this.supabase
          .from(table)
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        return id;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Sophisticated field-level conflict analysis
   */
  private analyzeFieldConflicts(
    clientData: Record<string, any>,
    serverData: Record<string, any>,
  ): string[] {
    const conflicts: string[] = [];

    const clientFields = new Set(Object.keys(clientData));
    const serverFields = new Set(Object.keys(serverData));
    const allFields = new Set([...clientFields, ...serverFields]);

    for (const field of allFields) {
      if (field === 'id' || field === 'user_id' || field === 'created_at') {
        continue; // Skip system fields
      }

      const clientValue = clientData[field];
      const serverValue = serverData[field];

      if (this.valuesConflict(clientValue, serverValue)) {
        conflicts.push(field);
      }
    }

    return conflicts;
  }

  /**
   * Determine if two values are in conflict
   */
  private valuesConflict(clientValue: any, serverValue: any): boolean {
    // Handle null/undefined
    if (clientValue == null && serverValue == null) return false;
    if (clientValue == null || serverValue == null) return true;

    // Handle objects
    if (typeof clientValue === 'object' && typeof serverValue === 'object') {
      return JSON.stringify(clientValue) !== JSON.stringify(serverValue);
    }

    // Handle primitives
    return clientValue !== serverValue;
  }

  /**
   * Calculate conflict severity based on fields and table importance
   */
  private calculateConflictSeverity(
    conflictFields: string[],
    table: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical fields that should never conflict
    const criticalFields = ['email', 'phone', 'wedding_date', 'budget'];
    const highPriorityFields = ['name', 'status', 'notes', 'address'];

    if (conflictFields.some((field) => criticalFields.includes(field))) {
      return 'critical';
    }

    if (conflictFields.some((field) => highPriorityFields.includes(field))) {
      return 'high';
    }

    if (conflictFields.length > 3) {
      return 'high';
    }

    if (conflictFields.length > 1) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Intelligent merge resolution using field-level analysis
   */
  private async resolveMerge(
    conflict: ConflictData,
  ): Promise<ConflictResolution> {
    const mergedData = { ...conflict.serverData };

    // Apply client changes for non-conflicting fields
    for (const [field, value] of Object.entries(conflict.clientData)) {
      if (!conflict.conflictFields.includes(field)) {
        mergedData[field] = value;
      }
    }

    // For conflicting fields, use intelligent merge strategies
    for (const field of conflict.conflictFields) {
      const clientValue = conflict.clientData[field];
      const serverValue = conflict.serverData[field];

      // Use field-specific merge logic
      mergedData[field] = this.mergeFieldValues(
        field,
        clientValue,
        serverValue,
        conflict.table,
      );
    }

    return {
      strategy: 'merge',
      resolvedData: mergedData,
      confidence: 0.8,
      explanation: `Merged ${conflict.conflictFields.length} conflicting fields using intelligent merge strategy`,
      applied: true,
    };
  }

  /**
   * Field-specific merge logic
   */
  private mergeFieldValues(
    field: string,
    clientValue: any,
    serverValue: any,
    table: string,
  ): any {
    // Notes fields - concatenate
    if (field.includes('note') || field.includes('comment')) {
      return `${serverValue}\n\n[Client Update]: ${clientValue}`;
    }

    // Array fields - merge unique values
    if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
      return [...new Set([...serverValue, ...clientValue])];
    }

    // Numeric fields - take the higher value (assuming it's more recent)
    if (typeof clientValue === 'number' && typeof serverValue === 'number') {
      return Math.max(clientValue, serverValue);
    }

    // Timestamp fields - take the more recent one
    if (field.includes('date') || field.includes('time')) {
      const clientDate = new Date(clientValue);
      const serverDate = new Date(serverValue);
      return clientDate > serverDate ? clientValue : serverValue;
    }

    // Default to client value for most cases
    return clientValue;
  }

  /**
   * Client wins resolution strategy
   */
  private async resolveClientWins(
    conflict: ConflictData,
  ): Promise<ConflictResolution> {
    return {
      strategy: 'client_wins',
      resolvedData: conflict.clientData,
      confidence: 1.0,
      explanation: 'Client data takes precedence',
      applied: true,
    };
  }

  /**
   * Server wins resolution strategy
   */
  private async resolveServerWins(
    conflict: ConflictData,
  ): Promise<ConflictResolution> {
    return {
      strategy: 'server_wins',
      resolvedData: conflict.serverData,
      confidence: 1.0,
      explanation: 'Server data takes precedence',
      applied: false, // No changes needed
    };
  }

  /**
   * Manual resolution (queue for human intervention)
   */
  private async resolveManual(
    conflict: ConflictData,
  ): Promise<ConflictResolution> {
    // Queue for manual resolution
    await this.supabase.from('sync_conflict_log').insert({
      conflict_id: conflict.id,
      table_name: conflict.table,
      record_id: conflict.recordId,
      client_data: conflict.clientData,
      server_data: conflict.serverData,
      resolution_strategy: 'manual',
      resolution_applied: false,
    });

    return {
      strategy: 'manual',
      confidence: 0.0,
      explanation: 'Conflict requires manual resolution',
      applied: false,
    };
  }

  /**
   * AI-powered intelligent resolution
   */
  private async resolveIntelligent(
    conflict: ConflictData,
    userContext?: { userId: string; role: string },
  ): Promise<ConflictResolution> {
    // This would integrate with ML models for intelligent conflict resolution
    // For now, use rule-based intelligent resolution

    const severity = conflict.severity;
    const fieldCount = conflict.conflictFields.length;

    if (severity === 'critical') {
      // Critical conflicts always go to manual resolution
      return this.resolveManual(conflict);
    }

    if (fieldCount === 1 && conflict.conflictFields[0].includes('note')) {
      // Single note field conflict - merge
      return this.resolveMerge(conflict);
    }

    if (userContext?.role === 'admin' || userContext?.role === 'coordinator') {
      // Trust coordinators and admins
      return this.resolveClientWins(conflict);
    }

    // Default to server wins for safety
    return this.resolveServerWins(conflict);
  }

  /**
   * Retry logic for failed sync operations
   */
  private addToRetryQueue(change: SyncChange): void {
    const retryCount = this.retryQueue.get(change.id)?.retryCount || 0;

    if (retryCount >= this.options.maxRetries) {
      // Max retries exceeded, remove from queue
      this.retryQueue.delete(change.id);
      return;
    }

    const nextRetry = new Date(
      Date.now() + this.options.retryDelay * Math.pow(2, retryCount),
    );

    this.retryQueue.set(change.id, {
      change,
      retryCount: retryCount + 1,
      nextRetry,
    });
  }

  /**
   * Background retry processor
   */
  private startRetryProcessor(): void {
    setInterval(async () => {
      const now = new Date();

      for (const [changeId, retryItem] of this.retryQueue.entries()) {
        if (retryItem.nextRetry <= now) {
          try {
            await this.applyChange(retryItem.change);
            this.retryQueue.delete(changeId);
          } catch (error) {
            // Re-add with incremented retry count
            this.addToRetryQueue(retryItem.change);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Utility methods for database operations
   */
  private async beginTransaction(sessionId: string): Promise<any> {
    // Start database transaction
    const { data, error } = await this.supabase.rpc('begin_sync_transaction', {
      p_session_id: sessionId,
    });

    if (error) throw error;
    return data;
  }

  private async commitTransaction(sessionId: string): Promise<void> {
    const { error } = await this.supabase.rpc('commit_sync_transaction', {
      p_session_id: sessionId,
    });

    if (error) throw error;
  }

  private async rollbackTransaction(
    sessionId: string,
    error: any,
  ): Promise<void> {
    await this.supabase.rpc('rollback_sync_transaction', {
      p_session_id: sessionId,
      p_error: error.message,
    });
  }

  private async getServerRecord(table: string, id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Not found is OK
      throw error;
    }

    return data;
  }

  private async getServerChanges(
    userId: string,
    sessionId: string,
  ): Promise<SyncChange[]> {
    // Implementation would fetch server changes since last sync
    return [];
  }

  private validateChanges(changes: SyncChange[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const change of changes) {
      const validation = SyncChangeSchema.safeParse(change);
      if (!validation.success) {
        errors.push(`Change ${change.id}: ${validation.error.message}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'network error',
      'connection timeout',
      'rate limit exceeded',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return retryableErrors.some((msg) => errorMessage.includes(msg));
  }

  private async logConflict(
    conflict: ConflictData,
    userId: string,
  ): Promise<void> {
    await this.supabase.from('sync_conflict_log').insert({
      conflict_id: conflict.id,
      user_id: userId,
      table_name: conflict.table,
      record_id: conflict.recordId,
      client_data: conflict.clientData,
      server_data: conflict.serverData,
      conflict_fields: conflict.conflictFields,
      severity: conflict.severity,
    });
  }

  private async recordConflictResolution(
    conflict: ConflictData,
    resolution: ConflictResolution,
  ): Promise<void> {
    await this.supabase
      .from('sync_conflict_log')
      .update({
        resolution_strategy: resolution.strategy,
        resolution_applied: resolution.applied,
        resolved_data: resolution.resolvedData,
        confidence_score: resolution.confidence,
        resolution_explanation: resolution.explanation,
        resolved_at: new Date().toISOString(),
      })
      .eq('conflict_id', conflict.id);
  }

  private async recordSyncMetrics(
    sessionId: string,
    metrics: any,
  ): Promise<void> {
    await this.supabase.from('sync_performance_metrics').insert({
      sync_session_id: sessionId,
      ...metrics,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get sync queue status
   */
  async getSyncQueueStatus(userId: string): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_user_sync_status', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Clear completed sync items
   */
  async clearCompletedItems(userId: string, olderThan: Date): Promise<number> {
    const { data, error } = await this.supabase
      .from('offline_sync_queue')
      .delete()
      .eq('user_id', userId)
      .eq('sync_status', 'completed')
      .lt('updated_at', olderThan.toISOString());

    if (error) throw error;
    return data?.length || 0;
  }
}
