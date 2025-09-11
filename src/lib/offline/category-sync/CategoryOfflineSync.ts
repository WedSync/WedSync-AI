import {
  TaskCategory,
  CategoryTask,
  CategorySyncStatus,
} from '@/types/task-categories';

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'category' | 'task';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge';
  resolver?: (clientData: any, serverData: any) => any;
}

export class CategoryOfflineSync {
  private dbName = 'wedsync_offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private syncInterval: NodeJS.Timer | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor(
    private organizationId: string,
    private conflictResolution: ConflictResolution = {
      strategy: 'client-wins',
    },
  ) {
    this.initializeDB();
    this.setupEventListeners();
    this.startSyncInterval();
  }

  // Initialize IndexedDB
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const categoriesStore = db.createObjectStore('categories', {
            keyPath: 'id',
          });
          categoriesStore.createIndex('organization_id', 'organization_id', {
            unique: false,
          });
          categoriesStore.createIndex('name', 'name', { unique: false });
          categoriesStore.createIndex('sync_status', 'sync_status', {
            unique: false,
          });
        }

        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
          tasksStore.createIndex('category', 'category', { unique: false });
          tasksStore.createIndex('status', 'status', { unique: false });
          tasksStore.createIndex('sync_status', 'sync_status', {
            unique: false,
          });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('entity', 'entity', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Setup online/offline event listeners
  private setupEventListeners(): void {
    this.onlineListener = () => {
      console.log('Network connection restored - syncing categories');
      this.syncAll();
    };

    this.offlineListener = () => {
      console.log('Network connection lost - entering offline mode');
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  // Start periodic sync interval
  private startSyncInterval(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncAll();
      }
    }, 30000);
  }

  // Save category to IndexedDB
  public async saveCategory(category: TaskCategory): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['categories', 'sync_queue'],
        'readwrite',
      );
      const categoriesStore = transaction.objectStore('categories');
      const syncStore = transaction.objectStore('sync_queue');

      // Mark category as pending sync
      const categoryWithSync = {
        ...category,
        sync_status: 'pending',
        local_timestamp: Date.now(),
      };

      categoriesStore.put(categoryWithSync);

      // Add to sync queue if offline
      if (!navigator.onLine) {
        const syncOp: SyncOperation = {
          id: `sync_${Date.now()}_${Math.random()}`,
          type: 'update',
          entity: 'category',
          data: category,
          timestamp: Date.now(),
          retryCount: 0,
        };
        syncStore.add(syncOp);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Save task to IndexedDB
  public async saveTask(task: CategoryTask): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['tasks', 'sync_queue'],
        'readwrite',
      );
      const tasksStore = transaction.objectStore('tasks');
      const syncStore = transaction.objectStore('sync_queue');

      // Mark task as pending sync
      const taskWithSync = {
        ...task,
        sync_status: 'pending',
        local_timestamp: Date.now(),
      };

      tasksStore.put(taskWithSync);

      // Add to sync queue if offline
      if (!navigator.onLine) {
        const syncOp: SyncOperation = {
          id: `sync_${Date.now()}_${Math.random()}`,
          type: 'update',
          entity: 'task',
          data: task,
          timestamp: Date.now(),
          retryCount: 0,
        };
        syncStore.add(syncOp);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get all categories from IndexedDB
  public async getCategories(): Promise<TaskCategory[]> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readonly');
      const store = transaction.objectStore('categories');
      const index = store.index('organization_id');
      const request = index.getAll(this.organizationId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get tasks by category
  public async getTasksByCategory(
    categoryName: string,
  ): Promise<CategoryTask[]> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const index = store.index('category');
      const request = index.getAll(categoryName);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync all pending changes
  public async syncAll(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;

    try {
      // Get pending sync operations
      const pendingOps = await this.getPendingSyncOperations();

      // Process each operation
      for (const op of pendingOps) {
        try {
          await this.processSyncOperation(op);
          await this.removeSyncOperation(op.id);
        } catch (error) {
          console.error('Sync operation failed:', error);
          await this.incrementRetryCount(op.id);
        }
      }

      // Update sync metadata
      await this.updateSyncMetadata();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Get pending sync operations
  private async getPendingSyncOperations(): Promise<SyncOperation[]> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        const operations = request.result || [];
        // Sort by timestamp to maintain order
        operations.sort((a, b) => a.timestamp - b.timestamp);
        resolve(operations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Process a single sync operation
  private async processSyncOperation(op: SyncOperation): Promise<void> {
    const endpoint =
      op.entity === 'category'
        ? '/api/workflow/task-categories'
        : '/api/workflow/tasks';

    const method =
      op.type === 'delete' ? 'DELETE' : op.type === 'create' ? 'POST' : 'PUT';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(op.data),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    // Handle conflict resolution if needed
    if (response.status === 409) {
      await this.handleConflict(op, await response.json());
    }
  }

  // Handle sync conflicts
  private async handleConflict(
    op: SyncOperation,
    serverData: any,
  ): Promise<void> {
    let resolvedData: any;

    switch (this.conflictResolution.strategy) {
      case 'client-wins':
        // Client data takes precedence
        resolvedData = op.data;
        break;

      case 'server-wins':
        // Server data takes precedence
        resolvedData = serverData;
        break;

      case 'merge':
        // Custom merge logic
        if (this.conflictResolution.resolver) {
          resolvedData = this.conflictResolution.resolver(op.data, serverData);
        } else {
          // Default merge: newer timestamp wins
          resolvedData =
            op.data.updated_at > serverData.updated_at ? op.data : serverData;
        }
        break;
    }

    // Save resolved data
    if (op.entity === 'category') {
      await this.saveCategory(resolvedData);
    } else {
      await this.saveTask(resolvedData);
    }
  }

  // Remove completed sync operation
  private async removeSyncOperation(id: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      store.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Increment retry count for failed operation
  private async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.get(id);

      request.onsuccess = () => {
        const op = request.result;
        if (op) {
          op.retryCount++;

          // Remove if max retries exceeded
          if (op.retryCount > 3) {
            store.delete(id);
          } else {
            store.put(op);
          }
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Update sync metadata
  private async updateSyncMetadata(): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_metadata'], 'readwrite');
      const store = transaction.objectStore('sync_metadata');

      store.put({
        key: 'last_sync',
        value: new Date().toISOString(),
        organization_id: this.organizationId,
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get sync status
  public async getSyncStatus(): Promise<CategorySyncStatus[]> {
    const categories = await this.getCategories();
    const pendingOps = await this.getPendingSyncOperations();

    return categories.map((category) => {
      const categoryOps = pendingOps.filter(
        (op) => op.entity === 'category' && op.data.id === category.id,
      );

      return {
        categoryId: category.id,
        lastSynced: new Date((category as any).local_timestamp || Date.now()),
        pendingChanges: categoryOps.length,
        syncError: categoryOps.some((op) => op.retryCount > 0)
          ? 'Sync failed - will retry'
          : undefined,
        isOnline: navigator.onLine,
      };
    });
  }

  // Clear all offline data
  public async clearOfflineData(): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['categories', 'tasks', 'sync_queue', 'sync_metadata'],
        'readwrite',
      );

      transaction.objectStore('categories').clear();
      transaction.objectStore('tasks').clear();
      transaction.objectStore('sync_queue').clear();
      transaction.objectStore('sync_metadata').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Cleanup
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }

    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
    }

    if (this.db) {
      this.db.close();
    }
  }
}
