'use client';

import {
  WeddingTimeline,
  TimelineEvent,
  TimelineConflict,
  CreateEventRequest,
  UpdateEventRequest,
  MoveEventRequest,
} from '@/types/timeline';

// IndexedDB database structure for offline timeline storage
interface TimelineOfflineDB {
  timelines: WeddingTimeline[];
  events: TimelineEvent[];
  conflicts: TimelineConflict[];
  pendingChanges: PendingChange[];
  metadata: OfflineMetadata[];
}

interface PendingChange {
  id: string;
  type:
    | 'create_event'
    | 'update_event'
    | 'delete_event'
    | 'move_event'
    | 'resolve_conflict';
  timelineId: string;
  entityId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface OfflineMetadata {
  timelineId: string;
  lastSyncAt: number;
  version: number;
  conflictHash: string;
  isOfflineMode: boolean;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChangesCount: number;
  lastSyncAt?: Date;
  syncError?: string;
}

interface ConflictResolution {
  changeId: string;
  resolution: 'keep_local' | 'keep_remote' | 'merge';
  mergedData?: any;
}

class TimelineOfflineSyncService {
  private db: IDBDatabase | null = null;
  private dbName = 'WedMeTimelineOffline';
  private dbVersion = 1;
  private syncStatusCallbacks: ((status: SyncStatus) => void)[] = [];
  private conflictCallbacks: ((conflicts: PendingChange[]) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Initialize the offline database
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        this.startSyncInterval();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('timelines')) {
          db.createObjectStore('timelines', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('timeline_id', 'timeline_id', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', {
            keyPath: 'id',
          });
          conflictsStore.createIndex('timeline_id', 'timeline_id', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains('pendingChanges')) {
          const changesStore = db.createObjectStore('pendingChanges', {
            keyPath: 'id',
          });
          changesStore.createIndex('timeline_id', 'timelineId', {
            unique: false,
          });
          changesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'timelineId' });
        }
      };
    });
  }

  // Cache timeline data for offline use
  async cacheTimelineData(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    conflicts: TimelineConflict[] = [],
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(
      ['timelines', 'events', 'conflicts', 'metadata'],
      'readwrite',
    );

    try {
      // Store timeline
      await this.putInStore(transaction.objectStore('timelines'), timeline);

      // Store events
      const eventsStore = transaction.objectStore('events');
      for (const event of events) {
        await this.putInStore(eventsStore, event);
      }

      // Store conflicts
      const conflictsStore = transaction.objectStore('conflicts');
      for (const conflict of conflicts) {
        await this.putInStore(conflictsStore, conflict);
      }

      // Update metadata
      const metadata: OfflineMetadata = {
        timelineId: timeline.id,
        lastSyncAt: Date.now(),
        version: timeline.version,
        conflictHash: this.generateConflictHash(conflicts),
        isOfflineMode: !navigator.onLine,
      };
      await this.putInStore(transaction.objectStore('metadata'), metadata);

      await this.waitForTransaction(transaction);
    } catch (error) {
      console.error('Error caching timeline data:', error);
      throw error;
    }
  }

  // Get cached timeline data
  async getCachedTimelineData(timelineId: string): Promise<{
    timeline?: WeddingTimeline;
    events: TimelineEvent[];
    conflicts: TimelineConflict[];
    metadata?: OfflineMetadata;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(
      ['timelines', 'events', 'conflicts', 'metadata'],
      'readonly',
    );

    try {
      const [timeline, events, conflicts, metadata] = await Promise.all([
        this.getFromStore<WeddingTimeline>(
          transaction.objectStore('timelines'),
          timelineId,
        ),
        this.getFromIndex<TimelineEvent[]>(
          transaction.objectStore('events').index('timeline_id'),
          timelineId,
        ),
        this.getFromIndex<TimelineConflict[]>(
          transaction.objectStore('conflicts').index('timeline_id'),
          timelineId,
        ),
        this.getFromStore<OfflineMetadata>(
          transaction.objectStore('metadata'),
          timelineId,
        ),
      ]);

      return {
        timeline,
        events: events || [],
        conflicts: conflicts || [],
        metadata,
      };
    } catch (error) {
      console.error('Error getting cached timeline data:', error);
      return { events: [], conflicts: [] };
    }
  }

  // Create event offline
  async createEventOffline(
    timelineId: string,
    eventData: CreateEventRequest,
  ): Promise<TimelineEvent> {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newEvent: TimelineEvent = {
      id: tempId,
      timeline_id: timelineId,
      title: eventData.title,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      event_type: eventData.event_type,
      category: eventData.category,
      location: eventData.location,
      description: eventData.description,
      priority: eventData.priority || 'medium',
      status: 'pending',
      is_locked: false,
      is_flexible: true,
      weather_dependent: false,
      created_at: now,
      updated_at: now,
    };

    // Store event locally
    if (this.db) {
      const transaction = this.db.transaction(['events'], 'readwrite');
      await this.putInStore(transaction.objectStore('events'), newEvent);
      await this.waitForTransaction(transaction);
    }

    // Queue for sync
    await this.queueChange({
      type: 'create_event',
      timelineId,
      entityId: tempId,
      data: eventData,
    });

    return newEvent;
  }

  // Update event offline
  async updateEventOffline(
    eventId: string,
    updates: UpdateEventRequest,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['events'], 'readwrite');
    const eventsStore = transaction.objectStore('events');

    try {
      const event = await this.getFromStore<TimelineEvent>(
        eventsStore,
        eventId,
      );
      if (!event) throw new Error('Event not found');

      const updatedEvent = {
        ...event,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.putInStore(eventsStore, updatedEvent);
      await this.waitForTransaction(transaction);

      // Queue for sync
      await this.queueChange({
        type: 'update_event',
        timelineId: event.timeline_id,
        entityId: eventId,
        data: updates,
      });
    } catch (error) {
      console.error('Error updating event offline:', error);
      throw error;
    }
  }

  // Delete event offline
  async deleteEventOffline(eventId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['events'], 'readwrite');
    const eventsStore = transaction.objectStore('events');

    try {
      const event = await this.getFromStore<TimelineEvent>(
        eventsStore,
        eventId,
      );
      if (!event) return;

      // Mark as deleted instead of actually deleting (for sync purposes)
      const deletedEvent = {
        ...event,
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        _deleted: true,
      };

      await this.putInStore(eventsStore, deletedEvent);
      await this.waitForTransaction(transaction);

      // Queue for sync
      await this.queueChange({
        type: 'delete_event',
        timelineId: event.timeline_id,
        entityId: eventId,
        data: { deleted: true },
      });
    } catch (error) {
      console.error('Error deleting event offline:', error);
      throw error;
    }
  }

  // Move event offline
  async moveEventOffline(moveRequest: MoveEventRequest): Promise<void> {
    const updates = {
      start_time: moveRequest.new_start_time,
      end_time: moveRequest.new_end_time,
    };

    await this.updateEventOffline(moveRequest.event_id, updates);

    // Additional queue entry for move-specific logic
    if (this.db) {
      const event = await this.getFromStore<TimelineEvent>(
        this.db.transaction(['events'], 'readonly').objectStore('events'),
        moveRequest.event_id,
      );

      if (event) {
        await this.queueChange({
          type: 'move_event',
          timelineId: event.timeline_id,
          entityId: moveRequest.event_id,
          data: moveRequest,
        });
      }
    }
  }

  // Queue changes for sync
  private async queueChange(
    change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    if (!this.db) return;

    const pendingChange: PendingChange = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...change,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
    await this.putInStore(
      transaction.objectStore('pendingChanges'),
      pendingChange,
    );
    await this.waitForTransaction(transaction);

    this.notifySyncStatus();
  }

  // Sync changes when online
  async syncChanges(): Promise<void> {
    if (!navigator.onLine || !this.db) return;

    this.notifySyncStatus({ isSyncing: true });

    try {
      const transaction = this.db.transaction(['pendingChanges'], 'readonly');
      const changes = await this.getAllFromStore<PendingChange>(
        transaction.objectStore('pendingChanges'),
      );

      if (changes.length === 0) {
        this.notifySyncStatus({ isSyncing: false });
        return;
      }

      // Sort changes by timestamp
      const sortedChanges = changes.sort((a, b) => a.timestamp - b.timestamp);
      const successfulChanges: string[] = [];
      const failedChanges: PendingChange[] = [];

      for (const change of sortedChanges) {
        try {
          await this.applySyncChange(change);
          successfulChanges.push(change.id);
        } catch (error) {
          console.error('Error syncing change:', error);
          failedChanges.push({
            ...change,
            retryCount: change.retryCount + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Remove successful changes and update failed ones
      await this.updatePendingChanges(successfulChanges, failedChanges);

      this.notifySyncStatus({
        isSyncing: false,
        lastSyncAt: new Date(),
        syncError:
          failedChanges.length > 0
            ? `${failedChanges.length} changes failed`
            : undefined,
      });
    } catch (error) {
      console.error('Error during sync:', error);
      this.notifySyncStatus({
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  // Apply individual sync change
  private async applySyncChange(change: PendingChange): Promise<void> {
    // This would typically make API calls to sync with the server
    const apiUrl = '/api/timeline';

    switch (change.type) {
      case 'create_event':
        await fetch(`${apiUrl}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change.data),
        });
        break;

      case 'update_event':
        await fetch(`${apiUrl}/events/${change.entityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change.data),
        });
        break;

      case 'delete_event':
        await fetch(`${apiUrl}/events/${change.entityId}`, {
          method: 'DELETE',
        });
        break;

      case 'move_event':
        await fetch(`${apiUrl}/events/${change.entityId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change.data),
        });
        break;

      case 'resolve_conflict':
        await fetch(`${apiUrl}/conflicts/${change.entityId}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change.data),
        });
        break;
    }
  }

  // Update pending changes after sync attempt
  private async updatePendingChanges(
    successfulIds: string[],
    failedChanges: PendingChange[],
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
    const store = transaction.objectStore('pendingChanges');

    // Remove successful changes
    for (const id of successfulIds) {
      store.delete(id);
    }

    // Update failed changes
    for (const change of failedChanges) {
      // Don't retry more than 5 times
      if (change.retryCount < 5) {
        await this.putInStore(store, change);
      } else {
        store.delete(change.id);
      }
    }

    await this.waitForTransaction(transaction);
  }

  // Get sync status
  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.db) {
      return {
        isOnline: navigator.onLine,
        isSyncing: false,
        pendingChangesCount: 0,
      };
    }

    const transaction = this.db.transaction(['pendingChanges'], 'readonly');
    const pendingChanges = await this.getAllFromStore<PendingChange>(
      transaction.objectStore('pendingChanges'),
    );

    return {
      isOnline: navigator.onLine,
      isSyncing: false, // Would track actual sync state
      pendingChangesCount: pendingChanges.length,
    };
  }

  // Subscribe to sync status updates
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusCallbacks.push(callback);
    return () => {
      const index = this.syncStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncStatusCallbacks.splice(index, 1);
      }
    };
  }

  // Notify sync status change
  private async notifySyncStatus(
    overrides: Partial<SyncStatus> = {},
  ): Promise<void> {
    const status = { ...(await this.getSyncStatus()), ...overrides };
    this.syncStatusCallbacks.forEach((callback) => callback(status));
  }

  // Start automatic sync interval
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncChanges().catch(console.error);
      }
    }, 30000);

    // Also sync when coming back online
    window.addEventListener('online', () => {
      this.syncChanges().catch(console.error);
    });

    window.addEventListener('offline', () => {
      this.notifySyncStatus();
    });
  }

  // Utility methods
  private async putInStore<T>(store: IDBObjectStore, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromStore<T>(
    store: IDBObjectStore,
    key: string,
  ): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndex<T>(
    index: IDBIndex,
    key: string,
  ): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const request = index.getAll(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllFromStore<T>(store: IDBObjectStore): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async waitForTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
  }

  private generateConflictHash(conflicts: TimelineConflict[]): string {
    const conflictData = conflicts
      .map((c) => `${c.id}:${c.updated_at || c.detected_at}`)
      .sort();
    return btoa(conflictData.join('|'));
  }

  // Cleanup
  dispose(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.isInitialized = false;
  }
}

// Export singleton instance
export const timelineOfflineSyncService = new TimelineOfflineSyncService();

// React hook for using offline sync
export function useTimelineOfflineSync(timelineId: string) {
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingChangesCount: 0,
  });

  React.useEffect(() => {
    timelineOfflineSyncService.initialize().catch(console.error);

    const unsubscribe =
      timelineOfflineSyncService.onSyncStatusChange(setSyncStatus);

    // Initial status check
    timelineOfflineSyncService
      .getSyncStatus()
      .then(setSyncStatus)
      .catch(console.error);

    return unsubscribe;
  }, []);

  const createEventOffline = React.useCallback(
    (eventData: CreateEventRequest) => {
      return timelineOfflineSyncService.createEventOffline(
        timelineId,
        eventData,
      );
    },
    [timelineId],
  );

  const updateEventOffline = React.useCallback(
    (eventId: string, updates: UpdateEventRequest) => {
      return timelineOfflineSyncService.updateEventOffline(eventId, updates);
    },
    [],
  );

  const deleteEventOffline = React.useCallback((eventId: string) => {
    return timelineOfflineSyncService.deleteEventOffline(eventId);
  }, []);

  const moveEventOffline = React.useCallback(
    (moveRequest: MoveEventRequest) => {
      return timelineOfflineSyncService.moveEventOffline(moveRequest);
    },
    [],
  );

  const forcSync = React.useCallback(() => {
    return timelineOfflineSyncService.syncChanges();
  }, []);

  const getCachedData = React.useCallback(() => {
    return timelineOfflineSyncService.getCachedTimelineData(timelineId);
  }, [timelineId]);

  return {
    syncStatus,
    createEventOffline,
    updateEventOffline,
    deleteEventOffline,
    moveEventOffline,
    forcSync,
    getCachedData,
  };
}

// Add React import for the hook
import React from 'react';
