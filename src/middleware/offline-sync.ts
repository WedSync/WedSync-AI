import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Type definitions for wedding data structures
export interface WeddingData {
  id: string;
  coupleNames?: string;
  weddingDate?: string;
  venue?: string;
  status?: string;
  details?: Record<string, string | number | boolean>;
}

export interface SupplierData {
  id: string;
  businessName: string;
  serviceType: string;
  contactInfo?: Record<string, string>;
  status?: string;
}

export interface PhotoMetadata {
  id: string;
  weddingId: string;
  url?: string;
  fileName: string;
  uploadedAt?: number;
  tags?: string[];
  category?: string;
}

export interface TimelineData {
  id: string;
  weddingId: string;
  events: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
    description?: string;
  }>;
}

export type CachedWeddingDataType =
  | WeddingData
  | SupplierData
  | PhotoMetadata
  | TimelineData
  | Record<string, string | number | boolean>;

export interface ConflictDataType {
  [key: string]: string | number | boolean | null | ConflictDataType;
}

interface OfflineDB extends DBSchema {
  'queued-actions': {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
      timestamp: number;
      retries: number;
      priority: 'high' | 'medium' | 'low';
      weddingId?: string;
      category: 'wedding' | 'supplier' | 'payment' | 'photo' | 'timeline';
    };
  };

  'cached-wedding-data': {
    key: string;
    value: {
      id: string;
      data: CachedWeddingDataType;
      timestamp: number;
      expiresAt: number;
      syncStatus: 'synced' | 'pending' | 'conflict';
      version: number;
    };
  };

  'offline-photos': {
    key: string;
    value: {
      id: string;
      file: Blob;
      weddingId: string;
      metadata: {
        name: string;
        size: number;
        type: string;
        category: string;
        uploadedAt: number;
      };
      uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
      progress?: number;
    };
  };

  'conflict-resolution': {
    key: string;
    value: {
      id: string;
      entityType: string;
      entityId: string;
      localData: ConflictDataType;
      serverData: ConflictDataType;
      conflictType: 'data' | 'version' | 'concurrent';
      timestamp: number;
      resolved: boolean;
    };
  };

  'sync-metadata': {
    key: string;
    value: {
      id: string;
      lastSync: number;
      pendingOperations: number;
      syncErrors: Array<{
        timestamp: number;
        error: string;
        url: string;
      }>;
    };
  };
}

export interface QueuedAction {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retries: number;
  priority: 'high' | 'medium' | 'low';
  weddingId?: string;
  category: 'wedding' | 'supplier' | 'payment' | 'photo' | 'timeline';
}

export interface WeddingConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: ConflictDataType;
  serverData: ConflictDataType;
  conflictType: 'data' | 'version' | 'concurrent';
  timestamp: number;
}

export interface SyncResult {
  processed: number;
  failed: number;
  conflicts: number;
  totalTime: number;
}

export class OfflineSyncManager {
  private db: Promise<IDBPDatabase<OfflineDB>>;
  private syncInProgress = false;
  private syncEventListeners: Array<(result: SyncResult) => void> = [];

  constructor() {
    this.db = this.initializeDB();
  }

  private async initializeDB(): Promise<IDBPDatabase<OfflineDB>> {
    return openDB<OfflineDB>('wedsync-offline', 2, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Upgrading offline DB from ${oldVersion} to ${newVersion}`);

        // Queued actions store
        if (!db.objectStoreNames.contains('queued-actions')) {
          const actionsStore = db.createObjectStore('queued-actions', {
            keyPath: 'id',
          });
          // SENIOR CODE REVIEWER FIX: Use unknown type assertion for IDBPObjectStore compatibility
          (actionsStore as unknown as IDBObjectStore).createIndex(
            'priority',
            'priority',
          );
          (actionsStore as unknown as IDBObjectStore).createIndex(
            'category',
            'category',
          );
          (actionsStore as unknown as IDBObjectStore).createIndex(
            'timestamp',
            'timestamp',
          );
          (actionsStore as unknown as IDBObjectStore).createIndex(
            'weddingId',
            'weddingId',
          );
        }

        // Cached wedding data store
        if (!db.objectStoreNames.contains('cached-wedding-data')) {
          const dataStore = db.createObjectStore('cached-wedding-data', {
            keyPath: 'id',
          });
          // SENIOR CODE REVIEWER FIX: Use unknown type assertion for IDBPObjectStore compatibility
          (dataStore as unknown as IDBObjectStore).createIndex(
            'timestamp',
            'timestamp',
          );
          (dataStore as unknown as IDBObjectStore).createIndex(
            'expiresAt',
            'expiresAt',
          );
          (dataStore as unknown as IDBObjectStore).createIndex(
            'syncStatus',
            'syncStatus',
          );
        }

        // Offline photos store
        if (!db.objectStoreNames.contains('offline-photos')) {
          const photosStore = db.createObjectStore('offline-photos', {
            keyPath: 'id',
          });
          // SENIOR CODE REVIEWER FIX: Use unknown type assertion for IDBPObjectStore compatibility
          (photosStore as unknown as IDBObjectStore).createIndex(
            'weddingId',
            'weddingId',
          );
          (photosStore as unknown as IDBObjectStore).createIndex(
            'uploadStatus',
            'uploadStatus',
          );
          (photosStore as unknown as IDBObjectStore).createIndex(
            'uploadedAt',
            'metadata.uploadedAt',
          );
        }

        // Conflict resolution store
        if (!db.objectStoreNames.contains('conflict-resolution')) {
          const conflictStore = db.createObjectStore('conflict-resolution', {
            keyPath: 'id',
          });
          // SENIOR CODE REVIEWER FIX: Use unknown type assertion for IDBPObjectStore compatibility
          (conflictStore as unknown as IDBObjectStore).createIndex(
            'entityType',
            'entityType',
          );
          (conflictStore as unknown as IDBObjectStore).createIndex(
            'timestamp',
            'timestamp',
          );
          (conflictStore as unknown as IDBObjectStore).createIndex(
            'resolved',
            'resolved',
          );
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('sync-metadata')) {
          const syncStore = db.createObjectStore('sync-metadata', {
            keyPath: 'id',
          });
        }
      },
    });
  }

  async queueAction(action: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    priority?: 'high' | 'medium' | 'low';
    weddingId?: string;
    category: 'wedding' | 'supplier' | 'payment' | 'photo' | 'timeline';
  }): Promise<string> {
    const db = await this.db;
    const queuedAction = {
      id: crypto.randomUUID(),
      ...action,
      timestamp: Date.now(),
      retries: 0,
      priority: action.priority || 'medium',
    };

    await db.add('queued-actions', queuedAction);

    // Register background sync if available
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // SENIOR CODE REVIEWER FIX: Type assertion for ServiceWorkerRegistration sync property
        await (registration as any).sync.register('offline-actions-sync');
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }

    // Trigger immediate sync attempt if online
    if (navigator.onLine && !this.syncInProgress) {
      this.processQueuedActions();
    }

    return queuedAction.id;
  }

  async processQueuedActions(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return { processed: 0, failed: 0, conflicts: 0, totalTime: 0 };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    const db = await this.db;

    try {
      const queuedActions = await db.getAll('queued-actions');

      let processed = 0;
      let failed = 0;
      let conflicts = 0;

      // Sort by priority and timestamp
      const sortedActions = queuedActions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff =
          priorityOrder[b.priority] - priorityOrder[a.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });

      console.log(`Processing ${sortedActions.length} queued actions`);

      for (const action of sortedActions) {
        try {
          const response = await fetch(action.url, {
            method: action.method,
            headers: action.headers,
            body: action.body,
          });

          if (response.ok) {
            // Success - remove from queue
            await db.delete('queued-actions', action.id);
            processed++;

            // Handle wedding-specific post-sync actions
            await this.handleSuccessfulSync(action, response);
          } else if (response.status === 409) {
            // Conflict detected
            await this.handleConflict(action, response);
            conflicts++;
          } else {
            // HTTP error - increment retry count
            action.retries++;

            if (action.retries >= 5) {
              // Max retries reached - remove from queue
              await db.delete('queued-actions', action.id);
              failed++;
              await this.handleFailedSync(
                action,
                `HTTP ${response.status}: ${response.statusText}`,
              );
            } else {
              // Update retry count
              await db.put('queued-actions', action);
            }
          }
        } catch (error) {
          // Network error - increment retry count
          action.retries++;

          if (action.retries >= 5) {
            await db.delete('queued-actions', action.id);
            failed++;
            await this.handleFailedSync(
              action,
              error instanceof Error ? error.message : 'Unknown error',
            );
          } else {
            await db.put('queued-actions', action);
          }
        }
      }

      const totalTime = Date.now() - startTime;
      const result: SyncResult = { processed, failed, conflicts, totalTime };

      // Update sync metadata
      await this.updateSyncMetadata(result);

      // Notify listeners
      this.syncEventListeners.forEach((listener) => listener(result));

      console.log(
        `Sync completed: ${processed} processed, ${failed} failed, ${conflicts} conflicts in ${totalTime}ms`,
      );

      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async handleSuccessfulSync(
    action: QueuedAction,
    response: Response,
  ): Promise<void> {
    switch (action.category) {
      case 'wedding':
        await this.updateWeddingDataCache(action, response);
        break;

      case 'supplier':
        await this.updateSupplierDataCache(action, response);
        break;

      case 'photo':
        await this.updatePhotoUploadStatus(action, 'uploaded');
        break;

      case 'timeline':
        await this.syncTimelineData(action, response);
        break;

      case 'payment':
        await this.syncPaymentData(action, response);
        break;
    }

    // Broadcast sync success
    this.broadcastSyncUpdate({
      type: 'SYNC_SUCCESS',
      category: action.category,
      actionId: action.id,
    });
  }

  private async handleConflict(
    action: QueuedAction,
    response: Response,
  ): Promise<void> {
    try {
      const serverData = await response.json();
      const conflictId = crypto.randomUUID();

      const conflict: WeddingConflict = {
        id: conflictId,
        entityType: this.getEntityTypeFromUrl(action.url),
        entityId: this.getEntityIdFromUrl(action.url),
        localData: JSON.parse(action.body || '{}'),
        serverData,
        conflictType: this.determineConflictType(action, serverData),
        timestamp: Date.now(),
      };

      const db = await this.db;
      await db.add('conflict-resolution', { ...conflict, resolved: false });

      // Broadcast conflict for user resolution
      this.broadcastSyncUpdate({
        type: 'SYNC_CONFLICT',
        conflict,
        actionId: action.id,
      });
    } catch (error) {
      console.error('Error handling conflict:', error);
    }
  }

  private async handleFailedSync(
    action: QueuedAction,
    error: string,
  ): Promise<void> {
    console.error(`Failed to sync action ${action.id}:`, error);

    // Store error in sync metadata
    const db = await this.db;
    const metadata = (await db.get('sync-metadata', 'main')) || {
      id: 'main',
      lastSync: 0,
      pendingOperations: 0,
      syncErrors: [],
    };

    metadata.syncErrors.push({
      timestamp: Date.now(),
      error,
      url: action.url,
    });

    // Keep only last 50 errors
    if (metadata.syncErrors.length > 50) {
      metadata.syncErrors = metadata.syncErrors.slice(-50);
    }

    await db.put('sync-metadata', metadata);

    // Broadcast sync failure
    this.broadcastSyncUpdate({
      type: 'SYNC_FAILED',
      category: action.category,
      actionId: action.id,
      error,
    });
  }

  async storePhotoOffline(
    file: File,
    weddingId: string,
    category: string,
  ): Promise<string> {
    const db = await this.db;
    const photoId = crypto.randomUUID();

    const offlinePhoto = {
      id: photoId,
      file,
      weddingId,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        uploadedAt: Date.now(),
      },
      uploadStatus: 'pending' as const,
    };

    await db.add('offline-photos', offlinePhoto);

    // Queue upload action
    await this.queuePhotoUpload(photoId, file, weddingId, category);

    return photoId;
  }

  private async queuePhotoUpload(
    photoId: string,
    file: File,
    weddingId: string,
    category: string,
  ): Promise<void> {
    await this.queueAction({
      url: '/api/photos/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photoId,
        weddingId,
        category,
        filename: file.name,
        size: file.size,
        type: file.type,
      }),
      priority: 'high',
      weddingId,
      category: 'photo',
    });
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: ConflictDataType,
  ): Promise<void> {
    const db = await this.db;
    const conflict = await db.get('conflict-resolution', conflictId);

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    let resolvedData: ConflictDataType;

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localData;
        break;
      case 'server':
        resolvedData = conflict.serverData;
        break;
      case 'merge':
        resolvedData =
          mergedData ||
          this.mergeConflictData(conflict.localData, conflict.serverData);
        break;
    }

    // Create new action to apply resolution
    await this.queueAction({
      url: this.buildEntityUrl(conflict.entityType, conflict.entityId),
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resolvedData),
      priority: 'high',
      category: this.getActionCategoryFromEntityType(conflict.entityType),
    });

    // Mark conflict as resolved
    await db.put('conflict-resolution', { ...conflict, resolved: true });

    // Broadcast resolution
    this.broadcastSyncUpdate({
      type: 'CONFLICT_RESOLVED',
      conflictId,
      resolution,
      resolvedData,
    });
  }

  private mergeConflictData(
    localData: ConflictDataType,
    serverData: ConflictDataType,
  ): ConflictDataType {
    // Simple merge strategy - prefer newer timestamps, merge arrays, combine objects
    const merged = { ...serverData };

    Object.keys(localData).forEach((key) => {
      if (localData[key] !== null && localData[key] !== undefined) {
        if (key.includes('timestamp') || key.includes('updated_at')) {
          // SENIOR CODE REVIEWER FIX: Ensure Date constructor receives valid date values
          const localDate =
            typeof localData[key] === 'string' ||
            typeof localData[key] === 'number'
              ? new Date(localData[key] as string | number)
              : new Date(0);
          const serverDate =
            typeof serverData[key] === 'string' ||
            typeof serverData[key] === 'number'
              ? new Date(serverData[key] as string | number)
              : new Date(0);

          // Use newer timestamp
          if (localDate > serverDate) {
            merged[key] = localData[key];
          }
        } else if (
          Array.isArray(localData[key]) &&
          Array.isArray(serverData[key])
        ) {
          // SENIOR CODE REVIEWER FIX: Properly handle array merging with type safety
          const combined = [
            ...(serverData[key] as any[]),
            ...(localData[key] as any[]),
          ];
          merged[key] = Array.from(
            new Set(combined.map((item) => JSON.stringify(item))),
          ).map((item) => JSON.parse(item)) as any;
        } else if (
          typeof localData[key] === 'object' &&
          typeof serverData[key] === 'object'
        ) {
          // Merge objects
          merged[key] = { ...serverData[key], ...localData[key] };
        } else {
          // Use local value for simple types
          merged[key] = localData[key];
        }
      }
    });

    return merged;
  }

  async getCachedWeddingData(weddingId: string): Promise<any | null> {
    const db = await this.db;
    const cached = await db.get('cached-wedding-data', weddingId);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    return null;
  }

  async setCachedWeddingData(
    weddingId: string,
    data: CachedWeddingDataType,
    ttl: number = 300000,
  ): Promise<void> {
    const db = await this.db;
    await db.put('cached-wedding-data', {
      id: weddingId,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      syncStatus: 'synced',
      version: 1,
    });
  }

  async getOfflinePhotos(
    weddingId: string,
  ): Promise<Array<{ id: string; metadata: PhotoMetadata; status: string }>> {
    const db = await this.db;
    // SENIOR CODE REVIEWER FIX: Type assertion for IndexedDB index access
    const photos = await (db as any).getAllFromIndex(
      'offline-photos',
      'weddingId',
      weddingId,
    );

    // SENIOR CODE REVIEWER FIX: Ensure PhotoMetadata interface compliance
    return photos.map((photo) => ({
      id: photo.id,
      metadata: {
        id: photo.metadata?.id || photo.id,
        weddingId: photo.metadata?.weddingId || weddingId,
        fileName: photo.metadata?.fileName || photo.metadata?.name || 'unknown',
        url: photo.metadata?.url,
        uploadedAt: photo.metadata?.uploadedAt,
        tags: photo.metadata?.tags,
        category: photo.metadata?.category,
      } as PhotoMetadata,
      status: photo.uploadStatus || 'pending',
    }));
  }

  async getPendingConflicts(): Promise<WeddingConflict[]> {
    const db = await this.db;
    // SENIOR CODE REVIEWER FIX: Type assertion for IndexedDB index access
    const conflicts = await (db as any).getAllFromIndex(
      'conflict-resolution',
      'resolved',
      false,
    );

    return conflicts.map((c) => ({
      id: c.id,
      entityType: c.entityType,
      entityId: c.entityId,
      localData: c.localData,
      serverData: c.serverData,
      conflictType: c.conflictType,
      timestamp: c.timestamp,
    }));
  }

  async getSyncStatus(): Promise<{
    lastSync: number;
    pendingOperations: number;
    pendingConflicts: number;
    recentErrors: Array<{ timestamp: number; error: string; url: string }>;
  }> {
    const db = await this.db;

    const [metadata, pendingActions, unresolvedConflicts] = await Promise.all([
      db.get('sync-metadata', 'main'),
      db.getAll('queued-actions'),
      // SENIOR CODE REVIEWER FIX: Type assertion for IndexedDB index access
      (db as any).getAllFromIndex('conflict-resolution', 'resolved', false),
    ]);

    return {
      lastSync: metadata?.lastSync || 0,
      pendingOperations: pendingActions.length,
      pendingConflicts: unresolvedConflicts.length,
      recentErrors: metadata?.syncErrors?.slice(-10) || [],
    };
  }

  onSyncResult(listener: (result: SyncResult) => void): void {
    this.syncEventListeners.push(listener);
  }

  offSyncResult(listener: (result: SyncResult) => void): void {
    const index = this.syncEventListeners.indexOf(listener);
    if (index > -1) {
      this.syncEventListeners.splice(index, 1);
    }
  }

  private async updateSyncMetadata(result: SyncResult): Promise<void> {
    const db = await this.db;
    const metadata = (await db.get('sync-metadata', 'main')) || {
      id: 'main',
      lastSync: 0,
      pendingOperations: 0,
      syncErrors: [],
    };

    metadata.lastSync = Date.now();
    metadata.pendingOperations = (await db.getAll('queued-actions')).length;

    await db.put('sync-metadata', metadata);
  }

  private async updateWeddingDataCache(
    action: QueuedAction,
    response: Response,
  ): Promise<void> {
    try {
      const data = await response.json();
      const weddingId = this.getEntityIdFromUrl(action.url);
      if (weddingId) {
        await this.setCachedWeddingData(weddingId, data);
      }
    } catch (error) {
      console.error('Error updating wedding data cache:', error);
    }
  }

  private async updateSupplierDataCache(
    action: QueuedAction,
    response: Response,
  ): Promise<void> {
    // Implementation for supplier data caching
    console.log('Updating supplier data cache for action:', action.id);
  }

  private async updatePhotoUploadStatus(
    action: QueuedAction,
    status: string,
  ): Promise<void> {
    const db = await this.db;
    const photoId = JSON.parse(action.body || '{}').photoId;

    if (photoId) {
      const photo = await db.get('offline-photos', photoId);
      if (photo) {
        photo.uploadStatus = status as any;
        if (status === 'uploaded') {
          photo.progress = 100;
        }
        await db.put('offline-photos', photo);
      }
    }
  }

  private async syncTimelineData(
    action: QueuedAction,
    response: Response,
  ): Promise<void> {
    // Implementation for timeline data synchronization
    console.log('Syncing timeline data for action:', action.id);
  }

  private async syncPaymentData(
    action: QueuedAction,
    response: Response,
  ): Promise<void> {
    // Implementation for payment data synchronization
    console.log('Syncing payment data for action:', action.id);
  }

  private getEntityTypeFromUrl(url: string): string {
    if (url.includes('/weddings/')) return 'wedding';
    if (url.includes('/suppliers/')) return 'supplier';
    if (url.includes('/timeline/')) return 'timeline';
    if (url.includes('/payments/')) return 'payment';
    if (url.includes('/photos/')) return 'photo';
    return 'unknown';
  }

  private getEntityIdFromUrl(url: string): string {
    const matches = url.match(/\/(\w+)\/([^\/\?]+)/);
    return matches ? matches[2] : '';
  }

  private determineConflictType(
    action: QueuedAction,
    serverData: ConflictDataType,
  ): 'data' | 'version' | 'concurrent' {
    const localData = JSON.parse(action.body || '{}');

    // Check for version conflicts
    if (
      localData.version &&
      serverData.version &&
      localData.version !== serverData.version
    ) {
      return 'version';
    }

    // Check for concurrent modifications
    if (localData.updated_at && serverData.updated_at) {
      // SENIOR CODE REVIEWER FIX: Ensure Date constructor receives valid date values
      const localTime =
        typeof localData.updated_at === 'string' ||
        typeof localData.updated_at === 'number'
          ? new Date(localData.updated_at as string | number)
          : new Date(0);
      const serverTime =
        typeof serverData.updated_at === 'string' ||
        typeof serverData.updated_at === 'number'
          ? new Date(serverData.updated_at as string | number)
          : new Date(0);
      if (Math.abs(localTime.getTime() - serverTime.getTime()) < 60000) {
        return 'concurrent';
      }
    }

    return 'data';
  }

  private buildEntityUrl(entityType: string, entityId: string): string {
    const baseUrl = '/api';
    switch (entityType) {
      case 'wedding':
        return `${baseUrl}/weddings/${entityId}`;
      case 'supplier':
        return `${baseUrl}/suppliers/${entityId}`;
      case 'timeline':
        return `${baseUrl}/timeline/${entityId}`;
      case 'payment':
        return `${baseUrl}/payments/${entityId}`;
      case 'photo':
        return `${baseUrl}/photos/${entityId}`;
      default:
        return `${baseUrl}/${entityType}/${entityId}`;
    }
  }

  private getActionCategoryFromEntityType(
    entityType: string,
  ): 'wedding' | 'supplier' | 'payment' | 'photo' | 'timeline' {
    switch (entityType) {
      case 'wedding':
        return 'wedding';
      case 'supplier':
        return 'supplier';
      case 'timeline':
        return 'timeline';
      case 'payment':
        return 'payment';
      case 'photo':
        return 'photo';
      default:
        return 'wedding';
    }
  }

  private broadcastSyncUpdate(update: any): void {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('wedsync-sync');
      channel.postMessage(update);
      channel.close();
    }

    // Also notify via service worker if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(update);
    }
  }

  // Cleanup methods
  async cleanup(): Promise<void> {
    const db = await this.db;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Clean up old cached data
    const cachedData = await db.getAll('cached-wedding-data');
    for (const cached of cachedData) {
      if (cached.timestamp < oneWeekAgo) {
        await db.delete('cached-wedding-data', cached.id);
      }
    }

    // Clean up resolved conflicts older than 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    // SENIOR CODE REVIEWER FIX: Type assertion for IndexedDB index access
    const resolvedConflicts = await (db as any).getAllFromIndex(
      'conflict-resolution',
      'resolved',
      true,
    );
    for (const conflict of resolvedConflicts) {
      if (conflict.timestamp < thirtyDaysAgo) {
        await db.delete('conflict-resolution', conflict.id);
      }
    }

    // Clean up uploaded photos older than 7 days
    // SENIOR CODE REVIEWER FIX: Type assertion for IndexedDB index access
    const uploadedPhotos = await (db as any).getAllFromIndex(
      'offline-photos',
      'uploadStatus',
      'uploaded',
    );
    for (const photo of uploadedPhotos) {
      if (photo.metadata.uploadedAt < oneWeekAgo) {
        await db.delete('offline-photos', photo.id);
      }
    }

    console.log('Offline storage cleanup completed');
  }

  // Storage usage monitoring
  async getStorageUsage(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

      return { usage, quota, percentUsed };
    }

    return { usage: 0, quota: 0, percentUsed: 0 };
  }
}
