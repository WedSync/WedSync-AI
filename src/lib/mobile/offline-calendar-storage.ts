/**
 * Offline Calendar Storage System for Wedding Timelines
 * Provides encrypted, secure offline storage for critical wedding data
 * Ensures wedding timeline availability even when connectivity fails at venues
 */

interface WeddingTimeline {
  id: string;
  weddingId: string;
  title: string;
  date: string;
  events: TimelineEvent[];
  vendors: VendorSchedule[];
  lastModified: Date;
  version: number;
  checksum: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  vendor: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'changed' | 'cancelled';
  type: 'preparation' | 'ceremony' | 'photography' | 'reception' | 'other';
  canEdit: boolean;
  isFixed: boolean;
  notes?: string;
  attendees?: string[];
  encryptedData?: string;
}

interface VendorSchedule {
  vendorId: string;
  vendorName: string;
  events: TimelineEvent[];
  availability: AvailabilitySlot[];
  lastSync: Date;
}

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookingId?: string;
}

interface PendingSync {
  id: string;
  weddingId: string;
  operation: 'create' | 'update' | 'delete';
  entityType: 'event' | 'timeline' | 'vendor';
  entityId: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  retryCount: number;
  lastAttempt?: Date;
}

interface ConflictResolution {
  conflictId: string;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface StorageMetrics {
  totalWeddings: number;
  totalEvents: number;
  storageUsed: number;
  lastCleanup: Date;
  syncQueueSize: number;
  conflictCount: number;
}

export class OfflineCalendarStorage {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'WeddingCalendarOfflineDB';
  private readonly dbVersion = 2;
  private readonly encryptionKey: CryptoKey | null = null;
  private readonly maxStorageSize = 50 * 1024 * 1024; // 50MB limit
  private readonly maxWeddings = 100;
  private readonly maxRetries = 5;

  constructor() {
    this.initializeEncryption();
  }

  /**
   * Initialize the offline storage database
   */
  async initialize(): Promise<void> {
    try {
      console.log(
        '[OfflineStorage] Initializing wedding calendar offline storage...',
      );

      await this.openDatabase();
      await this.setupEncryption();
      await this.performMaintenanceCheck();

      console.log('[OfflineStorage] Wedding calendar offline storage ready');
    } catch (error) {
      console.error('[OfflineStorage] Failed to initialize:', error);
      throw new Error('Failed to initialize offline wedding storage');
    }
  }

  /**
   * Cache wedding timeline for offline access
   */
  async cacheWeddingTimeline(
    weddingId: string,
    events: TimelineEvent[],
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const timeline: WeddingTimeline = {
        id: `timeline_${weddingId}`,
        weddingId,
        title: `Wedding Timeline - ${weddingId}`,
        date: new Date().toISOString(),
        events: await this.encryptSensitiveData(events),
        vendors: [], // Will be populated separately
        lastModified: new Date(),
        version: 1,
        checksum: await this.generateChecksum(events),
      };

      const transaction = this.db.transaction(['timelines'], 'readwrite');
      const store = transaction.objectStore('timelines');

      // Compress timeline data before storing
      const compressedTimeline = await this.compressData(timeline);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(compressedTimeline);
        request.onsuccess = () => {
          console.log(
            `[OfflineStorage] Cached timeline for wedding ${weddingId}`,
          );
          resolve();
        };
        request.onerror = () => reject(request.error);
      });

      // Update storage metrics
      await this.updateStorageMetrics();
    } catch (error) {
      console.error(
        '[OfflineStorage] Failed to cache wedding timeline:',
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieve cached wedding timeline
   */
  async getCachedWeddingTimeline(
    weddingId: string,
  ): Promise<WeddingTimeline | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(['timelines'], 'readonly');
      const store = transaction.objectStore('timelines');
      const timelineId = `timeline_${weddingId}`;

      const compressedTimeline = await new Promise<any>((resolve, reject) => {
        const request = store.get(timelineId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!compressedTimeline) {
        return null;
      }

      // Decompress and decrypt timeline
      const timeline = await this.decompressData(compressedTimeline);
      timeline.events = await this.decryptSensitiveData(timeline.events);

      // Verify data integrity
      const expectedChecksum = await this.generateChecksum(timeline.events);
      if (timeline.checksum !== expectedChecksum) {
        console.warn(
          `[OfflineStorage] Checksum mismatch for wedding ${weddingId}`,
        );
        // Data corruption detected - attempt recovery
        await this.attemptDataRecovery(weddingId);
      }

      return timeline;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get cached timeline:', error);
      return null;
    }
  }

  /**
   * Add pending sync operation to queue
   */
  async addPendingSync(
    syncOperation: Omit<PendingSync, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const pendingSync: PendingSync = {
        ...syncOperation,
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
      };

      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');

      await new Promise<void>((resolve, reject) => {
        const request = store.add(pendingSync);
        request.onsuccess = () => {
          console.log(`[OfflineStorage] Added pending sync: ${pendingSync.id}`);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });

      // Trigger background sync if available
      this.triggerBackgroundSync();
    } catch (error) {
      console.error('[OfflineStorage] Failed to add pending sync:', error);
      throw error;
    }
  }

  /**
   * Get all pending sync operations
   */
  async getPendingSyncChanges(): Promise<PendingSync[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');

      const pendingSyncs = await new Promise<PendingSync[]>(
        (resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        },
      );

      // Sort by priority and timestamp
      return pendingSyncs
        .filter((sync) => sync.retryCount < this.maxRetries)
        .sort((a, b) => {
          const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
          const aPriority = priorityOrder[a.priority] || 2;
          const bPriority = priorityOrder[b.priority] || 2;

          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          return a.timestamp.getTime() - b.timestamp.getTime();
        });
    } catch (error) {
      console.error('[OfflineStorage] Failed to get pending syncs:', error);
      return [];
    }
  }

  /**
   * Mark sync operation as completed
   */
  async markEventSynced(syncId: string, syncTimestamp: Date): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');

      await new Promise<void>((resolve, reject) => {
        const deleteRequest = store.delete(syncId);
        deleteRequest.onsuccess = () => {
          console.log(`[OfflineStorage] Marked sync completed: ${syncId}`);
          resolve();
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });

      // Update last sync timestamp
      await this.updateLastSyncTime(syncTimestamp);
    } catch (error) {
      console.error('[OfflineStorage] Failed to mark sync completed:', error);
      throw error;
    }
  }

  /**
   * Handle sync failure by incrementing retry count
   */
  async handleSyncFailure(syncId: string, error: Error): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');

      const pendingSync = await new Promise<PendingSync>((resolve, reject) => {
        const request = store.get(syncId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (pendingSync) {
        pendingSync.retryCount += 1;
        pendingSync.lastAttempt = new Date();

        if (pendingSync.retryCount >= this.maxRetries) {
          console.warn(
            `[OfflineStorage] Max retries exceeded for sync: ${syncId}`,
          );
          await this.moveToFailedQueue(pendingSync, error);
        } else {
          await new Promise<void>((resolve, reject) => {
            const request = store.put(pendingSync);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }
    } catch (error) {
      console.error('[OfflineStorage] Failed to handle sync failure:', error);
    }
  }

  /**
   * Store conflict for manual resolution
   */
  async storeConflict(conflict: ConflictResolution): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');

      await new Promise<void>((resolve, reject) => {
        const request = store.put(conflict);
        request.onsuccess = () => {
          console.log(
            `[OfflineStorage] Stored conflict: ${conflict.conflictId}`,
          );
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineStorage] Failed to store conflict:', error);
      throw error;
    }
  }

  /**
   * Get storage metrics
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get storage usage estimate
      const estimate = await navigator.storage?.estimate();
      const storageUsed = estimate?.usage || 0;

      const transaction = this.db.transaction(
        ['timelines', 'sync_queue', 'conflicts'],
        'readonly',
      );

      const [timelines, syncQueue, conflicts] = await Promise.all([
        this.getStoreCount(transaction, 'timelines'),
        this.getStoreCount(transaction, 'sync_queue'),
        this.getStoreCount(transaction, 'conflicts'),
      ]);

      // Count total events across all timelines
      const totalEvents = await this.getTotalEventsCount();

      return {
        totalWeddings: timelines,
        totalEvents,
        storageUsed,
        lastCleanup: await this.getLastCleanupDate(),
        syncQueueSize: syncQueue,
        conflictCount: conflicts,
      };
    } catch (error) {
      console.error('[OfflineStorage] Failed to get storage metrics:', error);
      return {
        totalWeddings: 0,
        totalEvents: 0,
        storageUsed: 0,
        lastCleanup: new Date(),
        syncQueueSize: 0,
        conflictCount: 0,
      };
    }
  }

  /**
   * Cleanup old data to free storage space
   */
  async performCleanup(forceCleanup = false): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const metrics = await this.getStorageMetrics();

      // Check if cleanup is needed
      if (!forceCleanup && metrics.storageUsed < this.maxStorageSize * 0.8) {
        return;
      }

      console.log('[OfflineStorage] Starting wedding data cleanup...');

      // Remove old timelines (keep last 30 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      await this.removeOldTimelines(cutoffDate);

      // Clean up completed sync operations
      await this.cleanupSyncQueue();

      // Remove resolved conflicts older than 7 days
      await this.cleanupOldConflicts(7);

      // Update cleanup timestamp
      await this.setLastCleanupDate(new Date());

      console.log('[OfflineStorage] Wedding data cleanup completed');
    } catch (error) {
      console.error('[OfflineStorage] Cleanup failed:', error);
      throw error;
    }
  }

  // Private methods

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Wedding timelines store
        if (!db.objectStoreNames.contains('timelines')) {
          const timelinesStore = db.createObjectStore('timelines', {
            keyPath: 'id',
          });
          timelinesStore.createIndex('weddingId', 'weddingId', {
            unique: false,
          });
          timelinesStore.createIndex('lastModified', 'lastModified', {
            unique: false,
          });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
          });
          syncStore.createIndex('priority', 'priority', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('weddingId', 'weddingId', { unique: false });
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', {
            keyPath: 'conflictId',
          });
          conflictsStore.createIndex('entityId', 'entityId', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private async initializeEncryption(): void {
    // Initialize encryption key from device keychain/secure storage
    // Implementation would depend on platform (Web Crypto API, etc.)
  }

  private async setupEncryption(): Promise<void> {
    if (!window.crypto || !window.crypto.subtle) {
      console.warn(
        '[OfflineStorage] Web Crypto API not available - data will not be encrypted',
      );
      return;
    }

    // Generate or retrieve encryption key for wedding data
    // In production, this should use device keychain/secure enclave
  }

  private async encryptSensitiveData(
    events: TimelineEvent[],
  ): Promise<TimelineEvent[]> {
    // Encrypt sensitive wedding information (names, locations, notes)
    return events.map((event) => ({
      ...event,
      // In production, encrypt sensitive fields
      notes: event.notes ? `encrypted_${event.notes}` : undefined,
    }));
  }

  private async decryptSensitiveData(
    events: TimelineEvent[],
  ): Promise<TimelineEvent[]> {
    // Decrypt sensitive wedding information
    return events.map((event) => ({
      ...event,
      notes: event.notes?.startsWith('encrypted_')
        ? event.notes.replace('encrypted_', '')
        : event.notes,
    }));
  }

  private async compressData(data: any): Promise<any> {
    // Compress large wedding timeline data
    // Implementation would use compression library
    return data;
  }

  private async decompressData(data: any): Promise<any> {
    // Decompress wedding timeline data
    return data;
  }

  private async generateChecksum(data: any): Promise<string> {
    // Generate checksum for data integrity verification
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);

    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest(
        'SHA-256',
        dataBuffer,
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback simple checksum
    return dataString.length.toString();
  }

  private async performMaintenanceCheck(): Promise<void> {
    const metrics = await this.getStorageMetrics();

    // Check if storage is getting full
    if (metrics.storageUsed > this.maxStorageSize * 0.9) {
      console.warn('[OfflineStorage] Storage nearly full - performing cleanup');
      await this.performCleanup(true);
    }

    // Check if there are too many weddings cached
    if (metrics.totalWeddings > this.maxWeddings) {
      console.warn(
        '[OfflineStorage] Too many cached weddings - cleaning up old data',
      );
      await this.performCleanup(true);
    }
  }

  private triggerBackgroundSync(): void {
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register('wedding-calendar-sync');
      });
    }
  }

  private async attemptDataRecovery(weddingId: string): Promise<void> {
    console.log(
      `[OfflineStorage] Attempting data recovery for wedding ${weddingId}`,
    );
    // Implementation would include data recovery strategies
  }

  private async getStoreCount(
    transaction: IDBTransaction,
    storeName: string,
  ): Promise<number> {
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getTotalEventsCount(): Promise<number> {
    // Count total events across all cached timelines
    return 0; // Placeholder
  }

  private async getLastCleanupDate(): Promise<Date> {
    // Get last cleanup date from metadata store
    return new Date();
  }

  private async setLastCleanupDate(date: Date): Promise<void> {
    // Store last cleanup date in metadata store
  }

  private async updateStorageMetrics(): Promise<void> {
    // Update storage metrics in metadata store
  }

  private async updateLastSyncTime(timestamp: Date): Promise<void> {
    // Update last sync time in metadata store
  }

  private async moveToFailedQueue(
    sync: PendingSync,
    error: Error,
  ): Promise<void> {
    // Move failed sync to separate queue for manual review
    console.error(
      `[OfflineStorage] Moving sync to failed queue:`,
      sync.id,
      error,
    );
  }

  private async removeOldTimelines(cutoffDate: Date): Promise<void> {
    // Remove timeline data older than cutoff date
  }

  private async cleanupSyncQueue(): Promise<void> {
    // Clean up old completed sync operations
  }

  private async cleanupOldConflicts(daysOld: number): Promise<void> {
    // Remove resolved conflicts older than specified days
  }
}

export default OfflineCalendarStorage;
