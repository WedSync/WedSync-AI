/**
 * WS-153: Advanced Offline Sync for Photo Groups
 * Handles conflict resolution, bandwidth-aware sync, and emergency recovery
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

interface ConflictResolution {
  strategy: 'last-write-wins' | 'merge' | 'manual';
  resolver?: (local: any, remote: any) => any;
}

interface SyncStatus {
  lastSync: Date | null;
  pendingOperations: number;
  failedOperations: number;
  isOnline: boolean;
  isSyncing: boolean;
  bandwidth: 'high' | 'medium' | 'low' | 'offline';
}

export class AdvancedPhotoGroupSync {
  private supabase = createClientComponentClient<Database>();
  private syncQueue: SyncOperation[] = [];
  private syncStatus: SyncStatus = {
    lastSync: null,
    pendingOperations: 0,
    failedOperations: 0,
    isOnline: navigator.onLine,
    isSyncing: false,
    bandwidth: 'high',
  };
  private db: IDBDatabase | null = null;
  private conflictResolution: ConflictResolution = {
    strategy: 'last-write-wins',
  };

  constructor() {
    this.initializeIndexedDB();
    this.setupNetworkListeners();
    this.setupBandwidthMonitoring();
    this.loadPendingOperations();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncOffline', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Photo groups store
        if (!db.objectStoreNames.contains('photoGroups')) {
          const photoStore = db.createObjectStore('photoGroups', {
            keyPath: 'id',
          });
          photoStore.createIndex('updated_at', 'updated_at');
          photoStore.createIndex('wedding_id', 'wedding_id');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('status', 'status');
        }

        // Conflict store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', {
            keyPath: 'id',
          });
          conflictStore.createIndex('resolved', 'resolved');
        }
      };
    });
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.startSync();
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.syncStatus.bandwidth = 'offline';
    });

    // Listen for visibility changes to sync when app returns to foreground
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.syncStatus.isOnline) {
        this.startSync();
      }
    });
  }

  /**
   * Monitor network bandwidth for adaptive sync
   */
  private setupBandwidthMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateBandwidth = () => {
        const downlink = connection.downlink;
        if (downlink > 10) {
          this.syncStatus.bandwidth = 'high';
        } else if (downlink > 2) {
          this.syncStatus.bandwidth = 'medium';
        } else {
          this.syncStatus.bandwidth = 'low';
        }
      };

      connection.addEventListener('change', updateBandwidth);
      updateBandwidth();
    }
  }

  /**
   * Load pending operations from IndexedDB
   */
  private async loadPendingOperations(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const pendingOps = await this.promisifyRequest(
      store.index('status').getAll('pending'),
    );

    this.syncQueue = pendingOps;
    this.syncStatus.pendingOperations = pendingOps.length;

    // Auto-start sync if online
    if (this.syncStatus.isOnline && this.syncQueue.length > 0) {
      this.startSync();
    }
  }

  /**
   * Queue an operation for sync
   */
  public async queueOperation(
    operation: Omit<SyncOperation, 'id' | 'retries' | 'status'>,
  ): Promise<void> {
    const op: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      retries: 0,
      status: 'pending',
    };

    // Store in IndexedDB
    if (this.db) {
      const tx = this.db.transaction('syncQueue', 'readwrite');
      await this.promisifyRequest(tx.objectStore('syncQueue').add(op));
    }

    this.syncQueue.push(op);
    this.syncStatus.pendingOperations++;

    // Try to sync immediately if online
    if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
      this.startSync();
    }
  }

  /**
   * Start sync process
   */
  public async startSync(): Promise<void> {
    if (this.syncStatus.isSyncing || !this.syncStatus.isOnline) {
      return;
    }

    this.syncStatus.isSyncing = true;

    try {
      // Process queue based on bandwidth
      const batchSize = this.getBatchSize();
      const operations = this.syncQueue
        .filter((op) => op.status === 'pending')
        .slice(0, batchSize);

      for (const operation of operations) {
        await this.processOperation(operation);
      }

      // Update last sync time
      this.syncStatus.lastSync = new Date();

      // Store sync status
      localStorage.setItem(
        'lastSyncTime',
        this.syncStatus.lastSync.toISOString(),
      );
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';

    try {
      switch (operation.type) {
        case 'create':
          await this.syncCreate(operation);
          break;
        case 'update':
          await this.syncUpdate(operation);
          break;
        case 'delete':
          await this.syncDelete(operation);
          break;
      }

      operation.status = 'completed';
      this.removeFromQueue(operation.id);
    } catch (error) {
      operation.retries++;
      operation.status = 'pending';

      if (operation.retries > 3) {
        operation.status = 'failed';
        this.syncStatus.failedOperations++;
      }

      // Update in IndexedDB
      if (this.db) {
        const tx = this.db.transaction('syncQueue', 'readwrite');
        await this.promisifyRequest(tx.objectStore('syncQueue').put(operation));
      }
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreate(operation: SyncOperation): Promise<void> {
    const { data, error } = await this.supabase
      .from(operation.table)
      .insert(operation.data);

    if (error) throw error;
  }

  /**
   * Sync update operation with conflict resolution
   */
  private async syncUpdate(operation: SyncOperation): Promise<void> {
    // Fetch remote version
    const { data: remote, error: fetchError } = await this.supabase
      .from(operation.table)
      .select('*')
      .eq('id', operation.data.id)
      .single();

    if (fetchError) throw fetchError;

    // Check for conflicts
    if (remote && remote.updated_at > operation.data.updated_at) {
      await this.handleConflict(operation.data, remote);
      return;
    }

    // No conflict, proceed with update
    const { error: updateError } = await this.supabase
      .from(operation.table)
      .update(operation.data)
      .eq('id', operation.data.id);

    if (updateError) throw updateError;
  }

  /**
   * Sync delete operation
   */
  private async syncDelete(operation: SyncOperation): Promise<void> {
    const { error } = await this.supabase
      .from(operation.table)
      .delete()
      .eq('id', operation.data.id);

    if (error) throw error;
  }

  /**
   * Handle sync conflicts
   */
  private async handleConflict(local: any, remote: any): Promise<void> {
    switch (this.conflictResolution.strategy) {
      case 'last-write-wins':
        // Remote wins, update local
        await this.updateLocal(remote);
        break;

      case 'merge':
        // Merge changes
        const merged = this.mergeChanges(local, remote);
        await this.updateRemote(merged);
        await this.updateLocal(merged);
        break;

      case 'manual':
        // Store conflict for manual resolution
        await this.storeConflict(local, remote);
        break;
    }
  }

  /**
   * Merge local and remote changes
   */
  private mergeChanges(local: any, remote: any): any {
    // Simple merge strategy - combine non-conflicting fields
    const merged = { ...remote };

    // Keep local changes for fields that haven't changed remotely
    for (const key in local) {
      if (local[key] !== remote[key] && local.updated_at > remote.updated_at) {
        merged[key] = local[key];
      }
    }

    merged.updated_at = new Date().toISOString();
    return merged;
  }

  /**
   * Update local storage
   */
  private async updateLocal(data: any): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('photoGroups', 'readwrite');
    await this.promisifyRequest(tx.objectStore('photoGroups').put(data));
  }

  /**
   * Update remote database
   */
  private async updateRemote(data: any): Promise<void> {
    const { error } = await this.supabase
      .from('photo_groups')
      .update(data)
      .eq('id', data.id);

    if (error) throw error;
  }

  /**
   * Store conflict for manual resolution
   */
  private async storeConflict(local: any, remote: any): Promise<void> {
    if (!this.db) return;

    const conflict = {
      id: crypto.randomUUID(),
      localData: local,
      remoteData: remote,
      timestamp: Date.now(),
      resolved: false,
    };

    const tx = this.db.transaction('conflicts', 'readwrite');
    await this.promisifyRequest(tx.objectStore('conflicts').add(conflict));
  }

  /**
   * Get batch size based on bandwidth
   */
  private getBatchSize(): number {
    switch (this.syncStatus.bandwidth) {
      case 'high':
        return 20;
      case 'medium':
        return 10;
      case 'low':
        return 5;
      default:
        return 0;
    }
  }

  /**
   * Remove operation from queue
   */
  private removeFromQueue(id: string): void {
    this.syncQueue = this.syncQueue.filter((op) => op.id !== id);
    this.syncStatus.pendingOperations--;

    // Remove from IndexedDB
    if (this.db) {
      const tx = this.db.transaction('syncQueue', 'readwrite');
      tx.objectStore('syncQueue').delete(id);
    }
  }

  /**
   * Helper to promisify IndexedDB requests
   */
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Force sync (for emergency situations)
   */
  public async forceSync(): Promise<void> {
    this.syncStatus.isOnline = true;
    await this.startSync();
  }

  /**
   * Clear all offline data (emergency reset)
   */
  public async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    const stores = ['photoGroups', 'syncQueue', 'conflicts'];
    for (const storeName of stores) {
      const tx = this.db.transaction(storeName, 'readwrite');
      await this.promisifyRequest(tx.objectStore(storeName).clear());
    }

    this.syncQueue = [];
    this.syncStatus.pendingOperations = 0;
    this.syncStatus.failedOperations = 0;
  }
}
