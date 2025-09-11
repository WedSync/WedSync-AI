/**
 * WS-144: Optimized Background Sync Service
 * Intelligent batching and prioritization for sync operations
 *
 * Features:
 * - Smart batch optimization based on data type and size
 * - Priority queue for critical updates
 * - Network-aware sync strategies
 * - Exponential backoff for failed syncs
 * - Parallel sync for independent data
 */

import { offlineDB } from '@/lib/database/offline-database';
import { advancedConflictResolver } from './advanced-conflict-resolver';
import { createClient } from '@/lib/supabase/client';
import type { ConflictContext } from './advanced-conflict-resolver';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export type SyncPriority = 'critical' | 'high' | 'medium' | 'low';
export type SyncStatus =
  | 'pending'
  | 'syncing'
  | 'completed'
  | 'failed'
  | 'conflict';

export interface SyncBatch {
  id: string;
  priority: SyncPriority;
  items: SyncItem[];
  retryCount: number;
  maxRetries: number;
  nextRetryTime?: number;
  createdAt: number;
  size: number;
}

export interface SyncItem {
  id: string;
  entityType: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  localVersion?: number;
  timestamp: number;
  dependencies?: string[];
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsResolved: number;
  averageSyncTime: number;
  dataSynced: number; // in bytes
  lastSyncTime?: string;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface NetworkConditions {
  type: 'wifi' | '4g' | '3g' | '2g' | 'offline';
  downlink?: number; // Mbps
  rtt?: number; // Round trip time in ms
  saveData?: boolean;
}

// =====================================================
// OPTIMIZED BACKGROUND SYNC SERVICE
// =====================================================

export class OptimizedBackgroundSync {
  private static instance: OptimizedBackgroundSync;
  private syncQueue: Map<string, SyncBatch> = new Map();
  private activeSyncs: Set<string> = new Set();
  private syncMetrics: SyncMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    conflictsResolved: 0,
    averageSyncTime: 0,
    dataSynced: 0,
  };
  private syncWorker?: Worker;
  private batchOptimizer = new BatchOptimizer();
  private networkMonitor = new NetworkMonitor();

  public static getInstance(): OptimizedBackgroundSync {
    if (!OptimizedBackgroundSync.instance) {
      OptimizedBackgroundSync.instance = new OptimizedBackgroundSync();
    }
    return OptimizedBackgroundSync.instance;
  }

  constructor() {
    this.initializeWorker();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  private initializeWorker() {
    if (typeof Worker !== 'undefined') {
      // Create dedicated worker for background sync
      const workerCode = `
        self.addEventListener('message', async (event) => {
          const { type, payload } = event.data
          
          switch (type) {
            case 'sync':
              // Perform sync operation
              self.postMessage({ type: 'sync-progress', progress: 0 })
              // Sync logic here
              self.postMessage({ type: 'sync-complete', result: payload })
              break
            case 'batch':
              // Process batch
              self.postMessage({ type: 'batch-complete', result: payload })
              break
          }
        })
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.syncWorker = new Worker(URL.createObjectURL(blob));

      this.syncWorker.addEventListener(
        'message',
        this.handleWorkerMessage.bind(this),
      );
    }
  }

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onNetworkChange(true));
      window.addEventListener('offline', () => this.onNetworkChange(false));

      // Monitor connection quality
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.addEventListener('change', () => {
          this.networkMonitor.updateConditions();
          this.optimizeSyncStrategy();
        });
      }
    }
  }

  private startPeriodicSync() {
    // Periodic sync every 30 seconds when online
    setInterval(async () => {
      if (this.networkMonitor.isOnline()) {
        await this.processSyncQueue();
      }
    }, 30000);
  }

  // =====================================================
  // CORE SYNC OPERATIONS
  // =====================================================

  async addToSyncQueue(
    items: SyncItem | SyncItem[],
    priority: SyncPriority = 'medium',
  ): Promise<string> {
    const itemsArray = Array.isArray(items) ? items : [items];

    // Optimize batch creation
    const batch = await this.batchOptimizer.createOptimalBatch(
      itemsArray,
      priority,
    );

    // Add to queue
    this.syncQueue.set(batch.id, batch);

    // Process immediately if critical
    if (priority === 'critical' && this.networkMonitor.isOnline()) {
      await this.processBatch(batch);
    }

    return batch.id;
  }

  async processSyncQueue(): Promise<void> {
    if (!this.networkMonitor.isOnline()) {
      console.log('[BackgroundSync] Offline, skipping sync');
      return;
    }

    const startTime = performance.now();
    const batches = this.getPrioritizedBatches();

    // Process batches in parallel based on network conditions
    const parallelLimit = this.getParallelLimit();
    const chunks = this.chunkBatches(batches, parallelLimit);

    for (const chunk of chunks) {
      await Promise.all(chunk.map((batch) => this.processBatch(batch)));
    }

    // Update metrics
    const syncTime = performance.now() - startTime;
    this.updateMetrics(syncTime);
  }

  private async processBatch(batch: SyncBatch): Promise<void> {
    if (this.activeSyncs.has(batch.id)) {
      console.log(`[BackgroundSync] Batch ${batch.id} already syncing`);
      return;
    }

    this.activeSyncs.add(batch.id);

    try {
      console.log(
        `[BackgroundSync] Processing batch ${batch.id} with ${batch.items.length} items`,
      );

      // Group items by entity type for efficient syncing
      const grouped = this.groupByEntityType(batch.items);

      for (const [entityType, items] of grouped.entries()) {
        await this.syncEntityBatch(entityType, items);
      }

      // Remove from queue on success
      this.syncQueue.delete(batch.id);
      this.syncMetrics.successfulSyncs++;
    } catch (error) {
      console.error(`[BackgroundSync] Batch ${batch.id} failed:`, error);
      await this.handleSyncFailure(batch, error);
    } finally {
      this.activeSyncs.delete(batch.id);
    }
  }

  private async syncEntityBatch(
    entityType: string,
    items: SyncItem[],
  ): Promise<void> {
    const supabase = createClient();

    // Batch operations by type
    const creates = items.filter((i) => i.operation === 'create');
    const updates = items.filter((i) => i.operation === 'update');
    const deletes = items.filter((i) => i.operation === 'delete');

    // Process creates in batch
    if (creates.length > 0) {
      const { error } = await supabase
        .from(entityType)
        .insert(creates.map((i) => i.data));

      if (error) throw error;
    }

    // Process updates with conflict detection
    for (const update of updates) {
      const { data: serverData, error: fetchError } = await supabase
        .from(entityType)
        .select('*')
        .eq('id', update.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (serverData) {
        // Check for conflicts
        const hasConflict = await this.detectConflict(update, serverData);

        if (hasConflict) {
          const context: ConflictContext = {
            entityType,
            entityId: update.id,
            conflictType: 'field_update',
            localVersion: update.data,
            serverVersion: serverData,
            metadata: {
              localTimestamp: new Date(update.timestamp).toISOString(),
              serverTimestamp:
                serverData.updated_at || new Date().toISOString(),
            },
          };

          const resolution =
            await advancedConflictResolver.resolveConflict(context);

          if (!resolution.requiresUserReview) {
            const { error } = await supabase
              .from(entityType)
              .update(resolution.resolved)
              .eq('id', update.id);

            if (error) throw error;
            this.syncMetrics.conflictsResolved++;
          }
        } else {
          // No conflict, update directly
          const { error } = await supabase
            .from(entityType)
            .update(update.data)
            .eq('id', update.id);

          if (error) throw error;
        }
      }
    }

    // Process deletes
    if (deletes.length > 0) {
      const { error } = await supabase
        .from(entityType)
        .delete()
        .in(
          'id',
          deletes.map((d) => d.id),
        );

      if (error) throw error;
    }
  }

  private async detectConflict(
    localItem: SyncItem,
    serverData: any,
  ): Promise<boolean> {
    // Check if server version is newer than local version
    const serverTimestamp = new Date(serverData.updated_at || 0).getTime();
    const localTimestamp = localItem.timestamp;

    if (serverTimestamp > localTimestamp) {
      // Check if any fields actually differ
      for (const key in localItem.data) {
        if (localItem.data[key] !== serverData[key]) {
          return true;
        }
      }
    }

    return false;
  }

  // =====================================================
  // BATCH OPTIMIZATION
  // =====================================================

  private getPrioritizedBatches(): SyncBatch[] {
    const batches = Array.from(this.syncQueue.values());

    // Sort by priority and age
    return batches.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // For same priority, older batches first
      return a.createdAt - b.createdAt;
    });
  }

  private groupByEntityType(items: SyncItem[]): Map<string, SyncItem[]> {
    const grouped = new Map<string, SyncItem[]>();

    items.forEach((item) => {
      const existing = grouped.get(item.entityType) || [];
      existing.push(item);
      grouped.set(item.entityType, existing);
    });

    return grouped;
  }

  private chunkBatches(batches: SyncBatch[], chunkSize: number): SyncBatch[][] {
    const chunks: SyncBatch[][] = [];

    for (let i = 0; i < batches.length; i += chunkSize) {
      chunks.push(batches.slice(i, i + chunkSize));
    }

    return chunks;
  }

  private getParallelLimit(): number {
    const conditions = this.networkMonitor.getConditions();

    switch (conditions.type) {
      case 'wifi':
        return 5;
      case '4g':
        return 3;
      case '3g':
        return 2;
      default:
        return 1;
    }
  }

  // =====================================================
  // ERROR HANDLING
  // =====================================================

  private async handleSyncFailure(batch: SyncBatch, error: any): Promise<void> {
    batch.retryCount++;

    if (batch.retryCount >= batch.maxRetries) {
      console.error(`[BackgroundSync] Batch ${batch.id} exceeded max retries`);
      this.syncQueue.delete(batch.id);
      this.syncMetrics.failedSyncs++;

      // Store in failed queue for manual intervention
      await offlineDB.saveToIndexedDB({
        storeName: 'failed_syncs',
        data: { batch, error: error.message, timestamp: Date.now() },
        id: batch.id,
      });
    } else {
      // Calculate exponential backoff
      const backoffTime = Math.min(
        1000 * Math.pow(2, batch.retryCount),
        300000, // Max 5 minutes
      );

      batch.nextRetryTime = Date.now() + backoffTime;
      console.log(
        `[BackgroundSync] Batch ${batch.id} will retry in ${backoffTime}ms`,
      );

      // Schedule retry
      setTimeout(() => this.processBatch(batch), backoffTime);
    }
  }

  // =====================================================
  // METRICS AND MONITORING
  // =====================================================

  private updateMetrics(syncTime: number) {
    this.syncMetrics.totalSyncs++;
    this.syncMetrics.averageSyncTime =
      (this.syncMetrics.averageSyncTime * (this.syncMetrics.totalSyncs - 1) +
        syncTime) /
      this.syncMetrics.totalSyncs;
    this.syncMetrics.lastSyncTime = new Date().toISOString();
    this.syncMetrics.networkQuality = this.networkMonitor.getQuality();
  }

  getMetrics(): SyncMetrics {
    return { ...this.syncMetrics };
  }

  async getQueueStatus(): Promise<{
    pending: number;
    active: number;
    failed: number;
    nextSync?: string;
  }> {
    const failedSyncs = await offlineDB.getAllFromStore('failed_syncs');

    return {
      pending: this.syncQueue.size,
      active: this.activeSyncs.size,
      failed: failedSyncs.length,
      nextSync: this.getNextSyncTime(),
    };
  }

  private getNextSyncTime(): string | undefined {
    const batches = Array.from(this.syncQueue.values());
    const nextBatch = batches
      .filter((b) => b.nextRetryTime)
      .sort((a, b) => (a.nextRetryTime || 0) - (b.nextRetryTime || 0))[0];

    return nextBatch
      ? new Date(nextBatch.nextRetryTime || 0).toISOString()
      : undefined;
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  private handleWorkerMessage(event: MessageEvent) {
    const { type, payload } = event.data;

    switch (type) {
      case 'sync-progress':
        console.log(`[BackgroundSync] Progress: ${payload.progress}%`);
        break;
      case 'sync-complete':
        console.log('[BackgroundSync] Worker sync complete');
        break;
      case 'batch-complete':
        console.log('[BackgroundSync] Worker batch complete');
        break;
    }
  }

  private async onNetworkChange(isOnline: boolean) {
    console.log(
      `[BackgroundSync] Network status: ${isOnline ? 'online' : 'offline'}`,
    );

    if (isOnline) {
      // Resume sync when coming online
      await this.processSyncQueue();
    }
  }

  private optimizeSyncStrategy() {
    const conditions = this.networkMonitor.getConditions();

    // Adjust batch sizes based on network quality
    if (conditions.saveData || conditions.type === '2g') {
      this.batchOptimizer.setMaxBatchSize(10);
    } else if (conditions.type === 'wifi') {
      this.batchOptimizer.setMaxBatchSize(100);
    } else {
      this.batchOptimizer.setMaxBatchSize(50);
    }
  }
}

// =====================================================
// HELPER CLASSES
// =====================================================

class BatchOptimizer {
  private maxBatchSize = 50;
  private maxBatchBytes = 1024 * 1024; // 1MB

  async createOptimalBatch(
    items: SyncItem[],
    priority: SyncPriority,
  ): Promise<SyncBatch> {
    // Calculate optimal batch size
    let batchItems: SyncItem[] = [];
    let batchSize = 0;

    for (const item of items) {
      const itemSize = JSON.stringify(item).length;

      if (
        batchItems.length >= this.maxBatchSize ||
        batchSize + itemSize > this.maxBatchBytes
      ) {
        break;
      }

      batchItems.push(item);
      batchSize += itemSize;
    }

    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority,
      items: batchItems,
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
      size: batchSize,
    };
  }

  setMaxBatchSize(size: number) {
    this.maxBatchSize = size;
  }
}

class NetworkMonitor {
  private conditions: NetworkConditions = {
    type: 'wifi',
  };

  isOnline(): boolean {
    return typeof window !== 'undefined' ? navigator.onLine : true;
  }

  getConditions(): NetworkConditions {
    return this.conditions;
  }

  updateConditions() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;

      this.conditions = {
        type: this.getConnectionType(connection),
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      };
    }
  }

  private getConnectionType(connection: any): NetworkConditions['type'] {
    if (!this.isOnline()) return 'offline';
    if (!connection) return 'wifi';

    const effectiveType = connection.effectiveType;

    switch (effectiveType) {
      case '4g':
        return '4g';
      case '3g':
        return '3g';
      case '2g':
        return '2g';
      default:
        return 'wifi';
    }
  }

  getQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const { type, rtt = 0 } = this.conditions;

    if (type === 'offline') return 'poor';
    if (type === 'wifi' && rtt < 50) return 'excellent';
    if (type === '4g' && rtt < 100) return 'good';
    if (type === '3g' || rtt < 200) return 'fair';

    return 'poor';
  }
}

// Export singleton instance
export const optimizedBackgroundSync = OptimizedBackgroundSync.getInstance();
