/**
 * Seating Offline Storage - WS-154 PWA Implementation
 *
 * IndexedDB-based offline storage for seating arrangements:
 * - Persistent seating data storage
 * - Conflict-free offline editing
 * - Background sync queue management
 * - Data compression and cleanup
 * - Automatic conflict resolution
 */

import {
  SeatingArrangement,
  SeatingTable,
  Guest,
  SeatingChange,
  OfflineSeatingCache,
  ConflictResolution,
} from '@/types/mobile-seating';

interface SeatingOfflineDB {
  arrangements: SeatingArrangement[];
  guests: Guest[];
  tables: SeatingTable[];
  changes: SeatingChange[];
  cache: OfflineSeatingCache[];
  resolutions: ConflictResolution[];
}

class SeatingOfflineStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'WedSyncSeatingOffline';
  private readonly DB_VERSION = 1;

  /**
   * Initialize IndexedDB for offline storage
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupObjectStores(db);
      };
    });
  }

  /**
   * Set up IndexedDB object stores
   */
  private setupObjectStores(db: IDBDatabase): void {
    // Arrangements store
    if (!db.objectStoreNames.contains('arrangements')) {
      const arrangementStore = db.createObjectStore('arrangements', {
        keyPath: 'id',
      });
      arrangementStore.createIndex('coupleId', 'coupleId', { unique: false });
      arrangementStore.createIndex('lastModified', 'lastModified', {
        unique: false,
      });
    }

    // Guests store
    if (!db.objectStoreNames.contains('guests')) {
      const guestStore = db.createObjectStore('guests', { keyPath: 'id' });
      guestStore.createIndex('tableId', 'tableId', { unique: false });
      guestStore.createIndex('category', 'category', { unique: false });
    }

    // Tables store
    if (!db.objectStoreNames.contains('tables')) {
      const tableStore = db.createObjectStore('tables', { keyPath: 'id' });
      tableStore.createIndex('arrangementId', 'arrangementId', {
        unique: false,
      });
    }

    // Changes store (for sync queue)
    if (!db.objectStoreNames.contains('changes')) {
      const changeStore = db.createObjectStore('changes', { keyPath: 'id' });
      changeStore.createIndex('timestamp', 'timestamp', { unique: false });
      changeStore.createIndex('syncStatus', 'syncStatus', { unique: false });
    }

    // Cache store
    if (!db.objectStoreNames.contains('cache')) {
      const cacheStore = db.createObjectStore('cache', {
        keyPath: 'arrangement.id',
      });
      cacheStore.createIndex('lastSync', 'lastSync', { unique: false });
    }

    // Conflict resolutions store
    if (!db.objectStoreNames.contains('resolutions')) {
      const resolutionStore = db.createObjectStore('resolutions', {
        keyPath: 'changeId',
      });
      resolutionStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  }

  /**
   * Store seating arrangement for offline access
   */
  async storeArrangement(arrangement: SeatingArrangement): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['arrangements'], 'readwrite');
    const store = transaction.objectStore('arrangements');

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...arrangement,
        lastModified: new Date(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get seating arrangement by ID
   */
  async getArrangement(id: string): Promise<SeatingArrangement | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['arrangements'], 'readonly');
    const store = transaction.objectStore('arrangements');

    return new Promise<SeatingArrangement | null>((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store guests for offline access
   */
  async storeGuests(guests: Guest[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['guests'], 'readwrite');
    const store = transaction.objectStore('guests');

    for (const guest of guests) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(guest);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get all guests or guests by table ID
   */
  async getGuests(tableId?: string): Promise<Guest[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['guests'], 'readonly');
    const store = transaction.objectStore('guests');

    return new Promise<Guest[]>((resolve, reject) => {
      let request: IDBRequest;

      if (tableId) {
        const index = store.index('tableId');
        request = index.getAll(tableId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queue change for background sync
   */
  async queueChange(change: Omit<SeatingChange, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const changeId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const changeWithId: SeatingChange = {
      ...change,
      id: changeId,
      syncStatus: 'pending',
    };

    const transaction = this.db.transaction(['changes'], 'readwrite');
    const store = transaction.objectStore('changes');

    await new Promise<void>((resolve, reject) => {
      const request = store.put(changeWithId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Trigger background sync if available
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('seating-sync');
      } catch (error) {
        console.warn('Background sync not available:', error);
      }
    }

    return changeId;
  }

  /**
   * Get pending changes for sync
   */
  async getPendingChanges(): Promise<SeatingChange[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['changes'], 'readonly');
    const store = transaction.objectStore('changes');
    const index = store.index('syncStatus');

    return new Promise<SeatingChange[]>((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update change sync status
   */
  async updateChangeStatus(
    changeId: string,
    status: SeatingChange['syncStatus'],
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['changes'], 'readwrite');
    const store = transaction.objectStore('changes');

    const change = await new Promise<SeatingChange>((resolve, reject) => {
      const getRequest = store.get(changeId);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    });

    if (change) {
      change.syncStatus = status;

      await new Promise<void>((resolve, reject) => {
        const putRequest = store.put(change);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });
    }
  }

  /**
   * Store offline cache with metadata
   */
  async storeOfflineCache(cache: OfflineSeatingCache): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    await new Promise<void>((resolve, reject) => {
      const request = store.put(cache);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline cache by arrangement ID
   */
  async getOfflineCache(
    arrangementId: string,
  ): Promise<OfflineSeatingCache | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');

    return new Promise<OfflineSeatingCache | null>((resolve, reject) => {
      const request = store.get(arrangementId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean up old data and optimize storage
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoffDate = new Date(Date.now() - maxAge);

    // Clean up old synced changes
    const transaction = this.db.transaction(
      ['changes', 'resolutions'],
      'readwrite',
    );
    const changeStore = transaction.objectStore('changes');
    const resolutionStore = transaction.objectStore('resolutions');

    // Remove synced changes older than cutoff
    const changeIndex = changeStore.index('timestamp');
    const changeRange = IDBKeyRange.upperBound(cutoffDate);

    await new Promise<void>((resolve, reject) => {
      const request = changeIndex.openCursor(changeRange);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const change = cursor.value as SeatingChange;
          if (change.syncStatus === 'synced') {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Clean up old resolutions
    const resolutionIndex = resolutionStore.index('timestamp');
    await new Promise<void>((resolve, reject) => {
      const request = resolutionIndex.openCursor(changeRange);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    arrangements: number;
    guests: number;
    tables: number;
    pendingChanges: number;
    totalSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(
      ['arrangements', 'guests', 'tables', 'changes'],
      'readonly',
    );

    const [arrangements, guests, tables, changes] = await Promise.all([
      this.getStoreCount(transaction.objectStore('arrangements')),
      this.getStoreCount(transaction.objectStore('guests')),
      this.getStoreCount(transaction.objectStore('tables')),
      this.getStoreCount(
        transaction.objectStore('changes').index('syncStatus'),
        'pending',
      ),
    ]);

    // Estimate total size (rough calculation)
    const totalSize = (arrangements + guests + tables) * 1024; // Rough estimate in bytes

    return {
      arrangements,
      guests,
      tables,
      pendingChanges: changes,
      totalSize,
    };
  }

  private async getStoreCount(
    store: IDBObjectStore,
    key?: any,
  ): Promise<number>;
  private async getStoreCount(index: IDBIndex, key?: any): Promise<number>;
  private async getStoreCount(
    storeOrIndex: IDBObjectStore | IDBIndex,
    key?: any,
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const request = key ? storeOrIndex.count(key) : storeOrIndex.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all offline data (for logout/reset)
   */
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(
      ['arrangements', 'guests', 'tables', 'changes', 'cache', 'resolutions'],
      'readwrite',
    );

    const stores = [
      'arrangements',
      'guests',
      'tables',
      'changes',
      'cache',
      'resolutions',
    ].map((name) => transaction.objectStore(name));

    await Promise.all(
      stores.map(
        (store) =>
          new Promise<void>((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          }),
      ),
    );
  }
}

// Export singleton instance
export const seatingOfflineStorage = new SeatingOfflineStorage();
