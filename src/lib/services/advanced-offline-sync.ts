/**
 * WS-155: Advanced Offline Sync with Conflict Resolution
 * Intelligent synchronization system for mobile offline capabilities
 */

import { z } from 'zod';
import Dexie, { Table } from 'dexie';
import { supabase } from '@/lib/supabase/client';

// Sync operation types
enum SyncOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

// Conflict resolution strategies
enum ConflictStrategy {
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
  FIRST_WRITE_WINS = 'FIRST_WRITE_WINS',
  MANUAL_RESOLUTION = 'MANUAL_RESOLUTION',
  MERGE = 'MERGE',
  SERVER_WINS = 'SERVER_WINS',
  CLIENT_WINS = 'CLIENT_WINS',
}

// Sync queue item
interface SyncQueueItem {
  id?: number;
  operation: SyncOperation;
  tableName: string;
  recordId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  priority: number;
  conflictStrategy: ConflictStrategy;
}

// Sync status
interface SyncStatus {
  lastSync: number;
  pendingOperations: number;
  failedOperations: number;
  conflicts: number;
  isOnline: boolean;
  isSyncing: boolean;
}

// Conflict record
interface ConflictRecord {
  id?: number;
  tableName: string;
  recordId: string;
  localData: any;
  remoteData: any;
  conflictType: string;
  detectedAt: number;
  resolvedAt?: number;
  resolution?: string;
}

// Sync metadata
interface SyncMetadata {
  tableName: string;
  lastSyncTimestamp: number;
  serverVersion: string;
  localVersion: string;
  checksum: string;
}

class OfflineDatabase extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  conflicts!: Table<ConflictRecord>;
  metadata!: Table<SyncMetadata>;
  messages!: Table<any>;
  guests!: Table<any>;
  templates!: Table<any>;

  constructor() {
    super('WedSyncOfflineDB');

    this.version(1).stores({
      syncQueue: '++id, tableName, recordId, timestamp, priority',
      conflicts: '++id, tableName, recordId, detectedAt, resolvedAt',
      metadata: 'tableName, lastSyncTimestamp',
      messages: 'id, wedding_id, guest_id, created_at, [wedding_id+guest_id]',
      guests: 'id, wedding_id, email, phone',
      templates: 'id, category, usage_count',
    });
  }
}

export class AdvancedOfflineSync {
  private db: OfflineDatabase;
  private syncStatus: SyncStatus;
  private syncInterval: NodeJS.Timeout | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;
  private syncInProgress = false;
  private conflictHandlers: Map<
    string,
    (conflict: ConflictRecord) => Promise<any>
  > = new Map();

  constructor() {
    this.db = new OfflineDatabase();
    this.syncStatus = {
      lastSync: 0,
      pendingOperations: 0,
      failedOperations: 0,
      conflicts: 0,
      isOnline: navigator.onLine,
      isSyncing: false,
    };

    this.initializeSync();
    this.registerConflictHandlers();
  }

  /**
   * Initialize synchronization system
   */
  private initializeSync() {
    // Monitor online/offline status
    this.onlineListener = () => {
      this.syncStatus.isOnline = true;
      this.startAutoSync();
      this.processPendingSync();
    };

    this.offlineListener = () => {
      this.syncStatus.isOnline = false;
      this.stopAutoSync();
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);

    // Start auto-sync if online
    if (navigator.onLine) {
      this.startAutoSync();
    }

    // Register service worker for background sync
    this.registerBackgroundSync();
  }

  /**
   * Register conflict resolution handlers
   */
  private registerConflictHandlers() {
    // Messages conflict handler
    this.conflictHandlers.set('messages', async (conflict) => {
      // For messages, prefer the version with more content
      const localLength = conflict.localData.content?.length || 0;
      const remoteLength = conflict.remoteData.content?.length || 0;

      if (localLength > remoteLength) {
        return conflict.localData;
      } else if (remoteLength > localLength) {
        return conflict.remoteData;
      } else {
        // If equal, use last write wins
        return conflict.localData.updated_at > conflict.remoteData.updated_at
          ? conflict.localData
          : conflict.remoteData;
      }
    });

    // Guests conflict handler
    this.conflictHandlers.set('guests', async (conflict) => {
      // Merge guest data, preferring non-null values
      const merged = { ...conflict.remoteData };

      Object.keys(conflict.localData).forEach((key) => {
        if (
          conflict.localData[key] !== null &&
          conflict.localData[key] !== undefined
        ) {
          if (
            conflict.remoteData[key] === null ||
            conflict.remoteData[key] === undefined
          ) {
            merged[key] = conflict.localData[key];
          } else if (key === 'updated_at') {
            // Use the most recent update
            merged[key] = Math.max(
              conflict.localData[key],
              conflict.remoteData[key],
            );
          }
        }
      });

      return merged;
    });

    // Templates conflict handler
    this.conflictHandlers.set('templates', async (conflict) => {
      // For templates, combine usage counts
      const merged = { ...conflict.remoteData };
      merged.usage_count =
        (conflict.localData.usage_count || 0) +
        (conflict.remoteData.usage_count || 0);
      return merged;
    });
  }

  /**
   * Queue operation for sync
   */
  async queueOperation(
    operation: SyncOperation,
    tableName: string,
    recordId: string,
    data: any,
    options?: {
      priority?: number;
      conflictStrategy?: ConflictStrategy;
    },
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      operation,
      tableName,
      recordId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority: options?.priority || 5,
      conflictStrategy:
        options?.conflictStrategy || ConflictStrategy.LAST_WRITE_WINS,
    };

    await this.db.syncQueue.add(queueItem);
    this.syncStatus.pendingOperations++;

    // Trigger immediate sync if online
    if (this.syncStatus.isOnline && !this.syncInProgress) {
      this.processPendingSync();
    }
  }

  /**
   * Process pending sync operations
   */
  async processPendingSync(): Promise<void> {
    if (this.syncInProgress || !this.syncStatus.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.syncStatus.isSyncing = true;

    try {
      // Get pending operations sorted by priority and timestamp
      const pendingOps = await this.db.syncQueue
        .orderBy('priority')
        .reverse()
        .toArray();

      for (const op of pendingOps) {
        try {
          await this.syncOperation(op);
          await this.db.syncQueue.delete(op.id!);
          this.syncStatus.pendingOperations--;
        } catch (error) {
          console.error('Sync operation failed:', error);
          await this.handleSyncError(op, error);
        }
      }

      // After successful sync, check for remote changes
      await this.pullRemoteChanges();

      this.syncStatus.lastSync = Date.now();
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
      this.syncStatus.isSyncing = false;
    }
  }

  /**
   * Sync individual operation
   */
  private async syncOperation(op: SyncQueueItem): Promise<void> {
    const { operation, tableName, recordId, data } = op;

    switch (operation) {
      case SyncOperation.CREATE:
        await this.syncCreate(tableName, data);
        break;

      case SyncOperation.UPDATE:
        await this.syncUpdate(tableName, recordId, data, op.conflictStrategy);
        break;

      case SyncOperation.DELETE:
        await this.syncDelete(tableName, recordId);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Sync CREATE operation
   */
  private async syncCreate(tableName: string, data: any): Promise<void> {
    const { error } = await supabase.from(tableName).insert(data);

    if (error) {
      if (error.code === '23505') {
        // Duplicate key error
        // Convert to UPDATE operation
        await this.syncUpdate(tableName, data.id, data, ConflictStrategy.MERGE);
      } else {
        throw error;
      }
    }
  }

  /**
   * Sync UPDATE operation with conflict detection
   */
  private async syncUpdate(
    tableName: string,
    recordId: string,
    data: any,
    conflictStrategy: ConflictStrategy,
  ): Promise<void> {
    // Fetch current server version
    const { data: serverData, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Not found
        // Record doesn't exist on server, create it
        await this.syncCreate(tableName, data);
        return;
      }
      throw fetchError;
    }

    // Check for conflicts
    if (this.hasConflict(data, serverData)) {
      const resolved = await this.resolveConflict(
        tableName,
        recordId,
        data,
        serverData,
        conflictStrategy,
      );

      if (resolved) {
        const { error: updateError } = await supabase
          .from(tableName)
          .update(resolved)
          .eq('id', recordId);

        if (updateError) throw updateError;
      }
    } else {
      // No conflict, proceed with update
      const { error: updateError } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', recordId);

      if (updateError) throw updateError;
    }
  }

  /**
   * Sync DELETE operation
   */
  private async syncDelete(tableName: string, recordId: string): Promise<void> {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', recordId);

    if (error && error.code !== 'PGRST116') {
      // Ignore not found errors
      throw error;
    }
  }

  /**
   * Check if there's a conflict between local and server data
   */
  private hasConflict(localData: any, serverData: any): boolean {
    // Simple conflict detection based on updated_at timestamp
    if (localData.updated_at && serverData.updated_at) {
      const localTime = new Date(localData.updated_at).getTime();
      const serverTime = new Date(serverData.updated_at).getTime();

      // If server has been updated after our last known update
      return serverTime > localTime;
    }

    // Check for checksum differences
    if (localData.checksum && serverData.checksum) {
      return localData.checksum !== serverData.checksum;
    }

    return false;
  }

  /**
   * Resolve conflict between local and server data
   */
  private async resolveConflict(
    tableName: string,
    recordId: string,
    localData: any,
    serverData: any,
    strategy: ConflictStrategy,
  ): Promise<any> {
    const conflict: ConflictRecord = {
      tableName,
      recordId,
      localData,
      remoteData: serverData,
      conflictType: strategy,
      detectedAt: Date.now(),
    };

    // Save conflict record
    const conflictId = await this.db.conflicts.add(conflict);
    this.syncStatus.conflicts++;

    let resolvedData: any;

    switch (strategy) {
      case ConflictStrategy.LAST_WRITE_WINS:
        resolvedData =
          localData.updated_at > serverData.updated_at ? localData : serverData;
        break;

      case ConflictStrategy.FIRST_WRITE_WINS:
        resolvedData =
          localData.created_at < serverData.created_at ? localData : serverData;
        break;

      case ConflictStrategy.SERVER_WINS:
        resolvedData = serverData;
        break;

      case ConflictStrategy.CLIENT_WINS:
        resolvedData = localData;
        break;

      case ConflictStrategy.MERGE:
        // Use custom merge handler if available
        const handler = this.conflictHandlers.get(tableName);
        if (handler) {
          resolvedData = await handler(conflict);
        } else {
          // Default merge: combine non-conflicting fields
          resolvedData = this.defaultMerge(localData, serverData);
        }
        break;

      case ConflictStrategy.MANUAL_RESOLUTION:
        // Queue for manual resolution
        await this.queueForManualResolution(conflict);
        return null; // Don't auto-resolve

      default:
        resolvedData = localData; // Default to local
    }

    // Mark conflict as resolved
    await this.db.conflicts.update(conflictId!, {
      resolvedAt: Date.now(),
      resolution: JSON.stringify(resolvedData),
    });

    return resolvedData;
  }

  /**
   * Default merge strategy
   */
  private defaultMerge(localData: any, serverData: any): any {
    const merged = { ...serverData };

    Object.keys(localData).forEach((key) => {
      if (key === 'updated_at') {
        merged[key] = Math.max(localData[key], serverData[key]);
      } else if (
        Array.isArray(localData[key]) &&
        Array.isArray(serverData[key])
      ) {
        // Merge arrays by combining unique values
        merged[key] = [...new Set([...localData[key], ...serverData[key]])];
      } else if (localData[key] !== null && localData[key] !== undefined) {
        // Prefer non-null local values
        if (serverData[key] === null || serverData[key] === undefined) {
          merged[key] = localData[key];
        }
      }
    });

    return merged;
  }

  /**
   * Queue conflict for manual resolution
   */
  private async queueForManualResolution(
    conflict: ConflictRecord,
  ): Promise<void> {
    // Emit event for UI to handle
    window.dispatchEvent(
      new CustomEvent('sync-conflict', {
        detail: conflict,
      }),
    );
  }

  /**
   * Pull remote changes
   */
  private async pullRemoteChanges(): Promise<void> {
    const tables = ['messages', 'guests', 'templates'];

    for (const tableName of tables) {
      try {
        const metadata = await this.db.metadata.get(tableName);
        const lastSync = metadata?.lastSyncTimestamp || 0;

        // Fetch changes since last sync
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .gt('updated_at', new Date(lastSync).toISOString())
          .order('updated_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Update local database
          const table = (this.db as any)[tableName];
          await table.bulkPut(data);

          // Update sync metadata
          await this.db.metadata.put({
            tableName,
            lastSyncTimestamp: Date.now(),
            serverVersion: '1.0',
            localVersion: '1.0',
            checksum: this.calculateChecksum(data),
          });
        }
      } catch (error) {
        console.error(`Error pulling changes for ${tableName}:`, error);
      }
    }
  }

  /**
   * Handle sync error
   */
  private async handleSyncError(op: SyncQueueItem, error: any): Promise<void> {
    op.retryCount++;
    op.lastError = error.message;

    if (op.retryCount < 3) {
      // Retry with exponential backoff
      setTimeout(
        () => {
          this.processPendingSync();
        },
        Math.pow(2, op.retryCount) * 1000,
      );

      await this.db.syncQueue.update(op.id!, {
        retryCount: op.retryCount,
        lastError: op.lastError,
      });
    } else {
      // Move to failed operations
      this.syncStatus.failedOperations++;
      await this.db.syncQueue.delete(op.id!);

      // Emit failure event
      window.dispatchEvent(
        new CustomEvent('sync-failed', {
          detail: { operation: op, error },
        }),
      );
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(16);
  }

  /**
   * Register background sync with service worker
   */
  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('wedsync-offline-sync');
      } catch (error) {
        console.error('Failed to register background sync:', error);
      }
    }
  }

  /**
   * Start automatic synchronization
   */
  private startAutoSync(intervalMs: number = 30000): void {
    this.stopAutoSync();

    this.syncInterval = setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncInProgress) {
        this.processPendingSync();
      }
    }, intervalMs);
  }

  /**
   * Stop automatic synchronization
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get pending operations count
   */
  async getPendingOperationsCount(): Promise<number> {
    return await this.db.syncQueue.count();
  }

  /**
   * Get unresolved conflicts
   */
  async getUnresolvedConflicts(): Promise<ConflictRecord[]> {
    return await this.db.conflicts
      .where('resolvedAt')
      .equals(undefined)
      .toArray();
  }

  /**
   * Manually resolve conflict
   */
  async resolveConflictManually(
    conflictId: number,
    resolution: any,
  ): Promise<void> {
    const conflict = await this.db.conflicts.get(conflictId);

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    // Apply resolution
    await this.queueOperation(
      SyncOperation.UPDATE,
      conflict.tableName,
      conflict.recordId,
      resolution,
      { priority: 10 },
    );

    // Mark as resolved
    await this.db.conflicts.update(conflictId, {
      resolvedAt: Date.now(),
      resolution: JSON.stringify(resolution),
    });

    this.syncStatus.conflicts--;
  }

  /**
   * Force full sync
   */
  async forceFullSync(): Promise<void> {
    // Clear sync queue
    await this.db.syncQueue.clear();

    // Clear metadata to force full sync
    await this.db.metadata.clear();

    // Reset sync status
    this.syncStatus = {
      ...this.syncStatus,
      lastSync: 0,
      pendingOperations: 0,
      failedOperations: 0,
      conflicts: 0,
    };

    // Trigger sync
    await this.processPendingSync();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAutoSync();

    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }

    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
    }
  }
}

export const advancedOfflineSync = new AdvancedOfflineSync();
