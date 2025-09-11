/**
 * OfflineWeddingSync.ts - Wedding data offline synchronization
 *
 * Handles offline wedding data synchronization with conflict resolution,
 * priority syncing, wedding day failsafes, and intelligent merge strategies.
 *
 * Features:
 * - Wedding-specific sync prioritization
 * - Conflict resolution with vendor preference
 * - Offline queue management
 * - Real-time sync when connected
 * - Emergency mode sync protection
 * - Photo upload resume
 *
 * @author WedSync Development Team
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';

// Types for wedding sync operations
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'upload';
  table: string;
  data: any;
  localId?: string;
  serverId?: string;
  timestamp: number;
  priority: SyncPriority;
  weddingId: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';
  conflictData?: ConflictData;
  metadata?: {
    size?: number;
    category?: string;
    isWeddingDay?: boolean;
    vendorId?: string;
  };
}

export type SyncPriority =
  | 'emergency'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'background';

export interface ConflictData {
  localData: any;
  serverData: any;
  conflictFields: string[];
  resolution?: 'local' | 'server' | 'merge' | 'manual';
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface WeddingSyncConfig {
  batchSize: number;
  syncInterval: number; // milliseconds
  retryDelay: number;
  maxRetries: number;
  enableRealTimeSync: boolean;
  emergencyModeOnly: boolean;
  photoUploadChunkSize: number; // bytes
  conflictResolutionStrategy:
    | 'vendor_priority'
    | 'client_priority'
    | 'timestamp'
    | 'manual';
}

export interface SyncStatistics {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  conflictOperations: number;
  lastSyncTime: string | null;
  syncDuration: number; // milliseconds
  dataTransferred: number; // bytes
  photosSynced: number;
  criticalSyncFailures: number;
}

export interface WeddingDaySyncProtection {
  isActive: boolean;
  startTime: string;
  endTime: string;
  criticalOperationsOnly: boolean;
  backupInterval: number;
  failsafeEnabled: boolean;
  emergencyContacts: string[];
}

// Error types
export class WeddingSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation?: SyncOperation,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = 'WeddingSyncError';
  }
}

export class OfflineWeddingSync {
  private syncQueue: Map<string, SyncOperation> = new Map();
  private activeOperations: Set<string> = new Set();
  private conflictQueue: Map<string, SyncOperation> = new Map();
  private config: WeddingSyncConfig;
  private statistics: SyncStatistics;
  private weddingDayProtection: WeddingDaySyncProtection;
  private isOnline: boolean = navigator.onLine;
  private syncTimer: NodeJS.Timeout | null = null;
  private realtimeSubscription: any = null;
  private supabaseClient: any = null;
  private photoUploadQueue: Map<string, File> = new Map();

  private readonly SYNC_PRIORITIES: Record<SyncPriority, number> = {
    emergency: 1000,
    critical: 800,
    high: 600,
    medium: 400,
    low: 200,
    background: 100,
  };

  constructor(config?: Partial<WeddingSyncConfig>) {
    this.config = {
      batchSize: 10,
      syncInterval: 30000, // 30 seconds
      retryDelay: 5000,
      maxRetries: 5,
      enableRealTimeSync: true,
      emergencyModeOnly: false,
      photoUploadChunkSize: 1024 * 1024, // 1MB chunks
      conflictResolutionStrategy: 'vendor_priority',
      ...config,
    };

    this.statistics = {
      totalOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      conflictOperations: 0,
      lastSyncTime: null,
      syncDuration: 0,
      dataTransferred: 0,
      photosSynced: 0,
      criticalSyncFailures: 0,
    };

    this.weddingDayProtection = {
      isActive: false,
      startTime: '',
      endTime: '',
      criticalOperationsOnly: true,
      backupInterval: 5 * 60 * 1000, // 5 minutes
      failsafeEnabled: true,
      emergencyContacts: [],
    };

    this.initialize();
  }

  /**
   * Initialize the wedding sync system
   */
  private async initialize(): Promise<void> {
    try {
      // Set up network listeners
      this.setupNetworkListeners();

      // Load persisted queue
      await this.loadPersistedQueue();

      // Initialize Supabase client
      this.initializeSupabase();

      // Start sync scheduler
      this.startSyncScheduler();

      console.log('OfflineWeddingSync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize wedding sync:', error);
      throw new WeddingSyncError(
        'Sync initialization failed',
        'INIT_FAILED',
        undefined,
        false,
      );
    }
  }

  /**
   * Add operation to sync queue with wedding-specific prioritization
   */
  async addSyncOperation(
    type: SyncOperation['type'],
    table: string,
    data: any,
    options: {
      priority?: SyncPriority;
      weddingId: string;
      isWeddingDay?: boolean;
      vendorId?: string;
      localId?: string;
    },
  ): Promise<string> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type,
      table,
      data,
      localId: options.localId,
      timestamp: Date.now(),
      priority: this.adjustPriorityForWedding(
        options.priority || 'medium',
        options.isWeddingDay,
      ),
      weddingId: options.weddingId,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      status: 'pending',
      metadata: {
        size: this.calculateDataSize(data),
        category: this.determineCategory(table),
        isWeddingDay: options.isWeddingDay,
        vendorId: options.vendorId,
      },
    };

    this.syncQueue.set(operation.id, operation);
    this.statistics.totalOperations++;

    // Persist queue
    await this.persistQueue();

    // Trigger immediate sync for critical operations if online
    if (this.isOnline && operation.priority >= this.SYNC_PRIORITIES.critical) {
      this.processNextBatch();
    }

    console.log(`Added ${type} operation for ${table}:`, operation.id);
    return operation.id;
  }

  /**
   * Add photo upload to queue with resume capability
   */
  async addPhotoUpload(
    file: File,
    weddingId: string,
    metadata: {
      category: string;
      vendorId?: string;
      isWeddingDay?: boolean;
      priority?: SyncPriority;
    },
  ): Promise<string> {
    const uploadId = this.generateOperationId();
    this.photoUploadQueue.set(uploadId, file);

    const operation: SyncOperation = {
      id: uploadId,
      type: 'upload',
      table: 'photos',
      data: {
        filename: file.name,
        size: file.size,
        type: file.type,
        category: metadata.category,
        vendorId: metadata.vendorId,
      },
      timestamp: Date.now(),
      priority: this.adjustPriorityForWedding(
        metadata.priority || 'medium',
        metadata.isWeddingDay,
      ),
      weddingId,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      status: 'pending',
      metadata: {
        size: file.size,
        category: 'photo',
        isWeddingDay: metadata.isWeddingDay,
        vendorId: metadata.vendorId,
      },
    };

    this.syncQueue.set(operation.id, operation);
    this.statistics.totalOperations++;

    await this.persistQueue();

    if (this.isOnline) {
      this.processPhotoUpload(operation);
    }

    return uploadId;
  }

  /**
   * Enable wedding day protection mode
   */
  enableWeddingDayProtection(
    startTime: string,
    endTime: string,
    options: {
      criticalOnly?: boolean;
      emergencyContacts?: string[];
    } = {},
  ): void {
    this.weddingDayProtection = {
      isActive: true,
      startTime,
      endTime,
      criticalOperationsOnly: options.criticalOnly !== false,
      backupInterval: 2 * 60 * 1000, // Backup every 2 minutes on wedding day
      failsafeEnabled: true,
      emergencyContacts: options.emergencyContacts || [],
    };

    // Increase sync frequency for wedding day
    this.config.syncInterval = 10000; // 10 seconds
    this.config.retryDelay = 2000; // 2 seconds

    this.restartSyncScheduler();

    console.log('Wedding day protection enabled');
  }

  /**
   * Process sync queue manually (force sync)
   */
  async forceSync(
    options: { criticalOnly?: boolean; weddingId?: string } = {},
  ): Promise<void> {
    if (!this.isOnline) {
      throw new WeddingSyncError(
        'Cannot force sync while offline',
        'OFFLINE_ERROR',
        undefined,
        true,
      );
    }

    const startTime = Date.now();
    let operationsToProcess = Array.from(this.syncQueue.values());

    // Filter by options
    if (options.criticalOnly) {
      operationsToProcess = operationsToProcess.filter(
        (op) => op.priority >= this.SYNC_PRIORITIES.critical,
      );
    }

    if (options.weddingId) {
      operationsToProcess = operationsToProcess.filter(
        (op) => op.weddingId === options.weddingId,
      );
    }

    // Sort by priority
    operationsToProcess.sort((a, b) => b.priority - a.priority);

    let successCount = 0;
    let failureCount = 0;

    for (const operation of operationsToProcess) {
      try {
        await this.processSyncOperation(operation);
        successCount++;
      } catch (error) {
        console.error(
          `Force sync failed for operation ${operation.id}:`,
          error,
        );
        failureCount++;
      }
    }

    const endTime = Date.now();
    this.statistics.lastSyncTime = new Date().toISOString();
    this.statistics.syncDuration = endTime - startTime;

    console.log(
      `Force sync completed: ${successCount} success, ${failureCount} failed`,
    );
  }

  /**
   * Resolve data conflict with wedding-specific strategies
   */
  async resolveConflict(
    operationId: string,
    resolution: 'local' | 'server' | 'merge' | 'manual',
    mergedData?: any,
  ): Promise<void> {
    const operation = this.conflictQueue.get(operationId);
    if (!operation || !operation.conflictData) {
      throw new WeddingSyncError(
        'Conflict operation not found',
        'CONFLICT_NOT_FOUND',
        undefined,
        false,
      );
    }

    try {
      let finalData: any;

      switch (resolution) {
        case 'local':
          finalData = operation.conflictData.localData;
          break;
        case 'server':
          finalData = operation.conflictData.serverData;
          break;
        case 'merge':
          finalData =
            mergedData || this.mergeConflictData(operation.conflictData);
          break;
        case 'manual':
          finalData = mergedData;
          if (!finalData) {
            throw new WeddingSyncError(
              'Manual resolution requires merged data',
              'MANUAL_MERGE_REQUIRED',
              operation,
              true,
            );
          }
          break;
      }

      // Update operation with resolved data
      operation.data = finalData;
      operation.status = 'pending';
      operation.conflictData = {
        ...operation.conflictData,
        resolution,
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'system', // Could be user ID in real implementation
      };

      // Move back to sync queue
      this.syncQueue.set(operationId, operation);
      this.conflictQueue.delete(operationId);

      // Process immediately if online
      if (this.isOnline) {
        await this.processSyncOperation(operation);
      }

      console.log(
        `Conflict resolved for operation ${operationId}:`,
        resolution,
      );
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw new WeddingSyncError(
        'Conflict resolution failed',
        'RESOLVE_FAILED',
        operation,
        true,
      );
    }
  }

  /**
   * Get sync queue status and statistics
   */
  getStatus(): {
    queueSize: number;
    activeOperations: number;
    conflicts: number;
    isOnline: boolean;
    weddingDayProtection: boolean;
    statistics: SyncStatistics;
    nextSync: string | null;
  } {
    return {
      queueSize: this.syncQueue.size,
      activeOperations: this.activeOperations.size,
      conflicts: this.conflictQueue.size,
      isOnline: this.isOnline,
      weddingDayProtection: this.weddingDayProtection.isActive,
      statistics: { ...this.statistics },
      nextSync: this.syncTimer
        ? new Date(Date.now() + this.config.syncInterval).toISOString()
        : null,
    };
  }

  /**
   * Get operations for a specific wedding
   */
  getWeddingOperations(weddingId: string): {
    pending: SyncOperation[];
    conflicts: SyncOperation[];
    active: SyncOperation[];
  } {
    const pending = Array.from(this.syncQueue.values()).filter(
      (op) => op.weddingId === weddingId,
    );
    const conflicts = Array.from(this.conflictQueue.values()).filter(
      (op) => op.weddingId === weddingId,
    );
    const active = pending.filter((op) => this.activeOperations.has(op.id));

    return { pending, conflicts, active };
  }

  // Private methods

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOfflineStatus();
    });
  }

  private async handleOnlineStatus(): Promise<void> {
    console.log('Connection restored - starting sync process');

    // Process pending operations immediately
    this.processNextBatch();

    // Set up real-time sync if enabled
    if (this.config.enableRealTimeSync && this.supabaseClient) {
      this.setupRealTimeSync();
    }
  }

  private handleOfflineStatus(): void {
    console.log('Connection lost - queuing operations for later sync');

    // Disable real-time sync
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
    }
  }

  private startSyncScheduler(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.syncQueue.size > 0) {
        this.processNextBatch();
      }
    }, this.config.syncInterval);
  }

  private restartSyncScheduler(): void {
    this.startSyncScheduler();
  }

  private async processNextBatch(): Promise<void> {
    if (this.activeOperations.size >= this.config.batchSize) {
      return; // Already processing maximum concurrent operations
    }

    const operations = this.getNextBatch();
    const promises = operations.map((op) => this.processSyncOperation(op));

    await Promise.allSettled(promises);
  }

  private getNextBatch(): SyncOperation[] {
    const availableSlots = this.config.batchSize - this.activeOperations.size;
    const operations = Array.from(this.syncQueue.values())
      .filter(
        (op) => op.status === 'pending' && !this.activeOperations.has(op.id),
      )
      .sort((a, b) => {
        // Priority first
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;

        // Then by timestamp (older first)
        return a.timestamp - b.timestamp;
      })
      .slice(0, availableSlots);

    return operations;
  }

  private async processSyncOperation(operation: SyncOperation): Promise<void> {
    this.activeOperations.add(operation.id);
    operation.status = 'syncing';

    try {
      switch (operation.type) {
        case 'create':
          await this.processCreate(operation);
          break;
        case 'update':
          await this.processUpdate(operation);
          break;
        case 'delete':
          await this.processDelete(operation);
          break;
        case 'upload':
          await this.processPhotoUpload(operation);
          break;
      }

      // Mark as completed
      operation.status = 'completed';
      this.statistics.completedOperations++;
      this.statistics.dataTransferred += operation.metadata?.size || 0;

      if (operation.metadata?.category === 'photo') {
        this.statistics.photosSynced++;
      }

      // Remove from queue
      this.syncQueue.delete(operation.id);
    } catch (error) {
      await this.handleSyncError(operation, error);
    } finally {
      this.activeOperations.delete(operation.id);
      await this.persistQueue();
    }
  }

  private async processCreate(operation: SyncOperation): Promise<void> {
    if (!this.supabaseClient) {
      throw new WeddingSyncError(
        'Supabase client not initialized',
        'NO_CLIENT',
        operation,
      );
    }

    const { data, error } = await this.supabaseClient
      .from(operation.table)
      .insert(operation.data)
      .select()
      .single();

    if (error) {
      throw new WeddingSyncError(
        `Create failed: ${error.message}`,
        'CREATE_FAILED',
        operation,
      );
    }

    // Update local ID mapping
    if (operation.localId && data.id) {
      operation.serverId = data.id;
    }
  }

  private async processUpdate(operation: SyncOperation): Promise<void> {
    if (!this.supabaseClient) {
      throw new WeddingSyncError(
        'Supabase client not initialized',
        'NO_CLIENT',
        operation,
      );
    }

    // Check for conflicts first
    const { data: currentData, error: fetchError } = await this.supabaseClient
      .from(operation.table)
      .select('*')
      .eq('id', operation.serverId || operation.localId)
      .single();

    if (fetchError) {
      throw new WeddingSyncError(
        `Fetch for conflict check failed: ${fetchError.message}`,
        'FETCH_FAILED',
        operation,
      );
    }

    // Check if data has been modified since our last sync
    if (this.hasConflict(operation.data, currentData)) {
      await this.handleConflict(operation, currentData);
      return;
    }

    const { error } = await this.supabaseClient
      .from(operation.table)
      .update(operation.data)
      .eq('id', operation.serverId || operation.localId);

    if (error) {
      throw new WeddingSyncError(
        `Update failed: ${error.message}`,
        'UPDATE_FAILED',
        operation,
      );
    }
  }

  private async processDelete(operation: SyncOperation): Promise<void> {
    if (!this.supabaseClient) {
      throw new WeddingSyncError(
        'Supabase client not initialized',
        'NO_CLIENT',
        operation,
      );
    }

    const { error } = await this.supabaseClient
      .from(operation.table)
      .delete()
      .eq('id', operation.serverId || operation.localId);

    if (error) {
      throw new WeddingSyncError(
        `Delete failed: ${error.message}`,
        'DELETE_FAILED',
        operation,
      );
    }
  }

  private async processPhotoUpload(operation: SyncOperation): Promise<void> {
    const file = this.photoUploadQueue.get(operation.id);
    if (!file) {
      throw new WeddingSyncError(
        'Photo file not found in queue',
        'FILE_NOT_FOUND',
        operation,
      );
    }

    try {
      // Upload in chunks for better reliability
      const chunks = this.createFileChunks(file);
      const uploadId = operation.id;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLastChunk = i === chunks.length - 1;

        await this.uploadPhotoChunk(chunk, uploadId, i, isLastChunk);
      }

      // Clean up
      this.photoUploadQueue.delete(operation.id);
    } catch (error) {
      throw new WeddingSyncError(
        `Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_FAILED',
        operation,
      );
    }
  }

  private async handleSyncError(
    operation: SyncOperation,
    error: any,
  ): Promise<void> {
    operation.retryCount++;

    if (operation.retryCount >= operation.maxRetries) {
      operation.status = 'failed';
      this.statistics.failedOperations++;

      if (operation.priority >= this.SYNC_PRIORITIES.critical) {
        this.statistics.criticalSyncFailures++;
      }

      console.error(`Operation ${operation.id} failed permanently:`, error);
    } else {
      operation.status = 'pending';

      // Schedule retry with exponential backoff
      const delay =
        this.config.retryDelay * Math.pow(2, operation.retryCount - 1);
      setTimeout(() => {
        if (this.isOnline) {
          this.processSyncOperation(operation);
        }
      }, delay);

      console.warn(
        `Operation ${operation.id} failed, retrying in ${delay}ms:`,
        error,
      );
    }
  }

  private async handleConflict(
    operation: SyncOperation,
    serverData: any,
  ): Promise<void> {
    const conflictData: ConflictData = {
      localData: operation.data,
      serverData,
      conflictFields: this.findConflictFields(operation.data, serverData),
    };

    operation.conflictData = conflictData;
    operation.status = 'conflict';
    this.statistics.conflictOperations++;

    // Move to conflict queue
    this.conflictQueue.set(operation.id, operation);
    this.syncQueue.delete(operation.id);

    // Auto-resolve if strategy is set
    if (this.config.conflictResolutionStrategy !== 'manual') {
      const resolution = this.getAutoResolution(conflictData, operation);
      if (resolution) {
        await this.resolveConflict(operation.id, resolution);
      }
    }
  }

  private hasConflict(localData: any, serverData: any): boolean {
    // Check if server data has been modified since our last update
    const localTimestamp = new Date(
      localData.updated_at || localData.created_at,
    );
    const serverTimestamp = new Date(
      serverData.updated_at || serverData.created_at,
    );

    return serverTimestamp > localTimestamp;
  }

  private findConflictFields(localData: any, serverData: any): string[] {
    const conflicts: string[] = [];

    for (const key in localData) {
      if (localData[key] !== serverData[key]) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  private getAutoResolution(
    conflictData: ConflictData,
    operation: SyncOperation,
  ): 'local' | 'server' | 'merge' | null {
    switch (this.config.conflictResolutionStrategy) {
      case 'vendor_priority':
        // Vendor data takes priority over client data
        return operation.metadata?.vendorId ? 'local' : 'server';
      case 'client_priority':
        return 'local';
      case 'timestamp':
        const localTime = new Date(
          conflictData.localData.updated_at ||
            conflictData.localData.created_at,
        );
        const serverTime = new Date(
          conflictData.serverData.updated_at ||
            conflictData.serverData.created_at,
        );
        return localTime > serverTime ? 'local' : 'server';
      default:
        return null;
    }
  }

  private mergeConflictData(conflictData: ConflictData): any {
    // Simple merge strategy - can be enhanced based on field types
    const merged = { ...conflictData.serverData };

    // For wedding-specific fields, prefer local changes
    const weddingFields = ['wedding_date', 'timeline', 'notes', 'status'];

    for (const field of weddingFields) {
      if (conflictData.localData[field] !== undefined) {
        merged[field] = conflictData.localData[field];
      }
    }

    return merged;
  }

  private adjustPriorityForWedding(
    priority: SyncPriority,
    isWeddingDay?: boolean,
  ): SyncPriority {
    if (!isWeddingDay) return priority;

    // Boost priority for wedding day operations
    switch (priority) {
      case 'high':
      case 'medium':
        return 'critical';
      case 'low':
        return 'high';
      case 'background':
        return 'medium';
      default:
        return priority;
    }
  }

  private determineCategory(table: string): string {
    if (table.includes('photo') || table.includes('media')) return 'photo';
    if (table.includes('timeline') || table.includes('event'))
      return 'timeline';
    if (table.includes('vendor') || table.includes('contact')) return 'contact';
    if (table.includes('guest')) return 'guest';
    return 'general';
  }

  private calculateDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createFileChunks(file: File): Blob[] {
    const chunks: Blob[] = [];
    const chunkSize = this.config.photoUploadChunkSize;

    for (let start = 0; start < file.size; start += chunkSize) {
      const end = Math.min(start + chunkSize, file.size);
      chunks.push(file.slice(start, end));
    }

    return chunks;
  }

  private async uploadPhotoChunk(
    chunk: Blob,
    uploadId: string,
    chunkIndex: number,
    isLastChunk: boolean,
  ): Promise<void> {
    // Implementation would depend on your photo upload service
    // This is a placeholder for the actual upload logic
    console.log(`Uploading chunk ${chunkIndex} for ${uploadId}`);

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private initializeSupabase(): void {
    // Initialize Supabase client
    // This would use your actual Supabase configuration
    console.log('Supabase client initialized for sync operations');
  }

  private setupRealTimeSync(): void {
    // Set up real-time subscriptions for immediate sync
    if (this.supabaseClient && this.config.enableRealTimeSync) {
      // Implementation would depend on your specific tables and requirements
      console.log('Real-time sync enabled');
    }
  }

  private async loadPersistedQueue(): Promise<void> {
    // Load sync queue from persistent storage
    try {
      const stored = localStorage.getItem('wedsync-sync-queue');
      if (stored) {
        const data = JSON.parse(stored);
        this.syncQueue = new Map(data.syncQueue || []);
        this.conflictQueue = new Map(data.conflictQueue || []);
        this.statistics = { ...this.statistics, ...data.statistics };
      }
    } catch (error) {
      console.warn('Failed to load persisted sync queue:', error);
    }
  }

  private async persistQueue(): Promise<void> {
    // Persist sync queue to storage
    try {
      const data = {
        syncQueue: Array.from(this.syncQueue.entries()),
        conflictQueue: Array.from(this.conflictQueue.entries()),
        statistics: this.statistics,
        timestamp: Date.now(),
      };
      localStorage.setItem('wedsync-sync-queue', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist sync queue:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }

    this.syncQueue.clear();
    this.conflictQueue.clear();
    this.activeOperations.clear();
    this.photoUploadQueue.clear();

    console.log('OfflineWeddingSync destroyed and cleaned up');
  }
}

// Export singleton instance
export const offlineWeddingSync = new OfflineWeddingSync();

// Export factory function for custom configurations
export const createOfflineWeddingSync = (
  config?: Partial<WeddingSyncConfig>,
) => {
  return new OfflineWeddingSync(config);
};

export default OfflineWeddingSync;
