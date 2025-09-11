'use client';

// =====================================================
// BACKGROUND SYNC SERVICE
// Intelligent retry mechanisms for offline actions
// =====================================================

export interface SyncAction {
  id: string;
  type:
    | 'vendor_checkin'
    | 'timeline_update'
    | 'issue_create'
    | 'issue_update'
    | 'status_update'
    | 'form_submission';
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  weddingId?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryTime?: string;
  status: 'pending' | 'syncing' | 'success' | 'failed' | 'expired';
  metadata?: Record<string, any>;
}

export interface SyncStats {
  totalActions: number;
  pendingActions: number;
  successfulActions: number;
  failedActions: number;
  avgRetryCount: number;
  lastSyncTime: string | null;
  nextSyncTime: string | null;
}

export interface SyncConfig {
  maxRetries: number;
  retryDelayBase: number; // Base delay in ms
  retryDelayMultiplier: number; // Exponential backoff multiplier
  maxRetryDelay: number; // Maximum delay in ms
  batchSize: number;
  syncInterval: number; // Auto-sync interval in ms
  priorityQueues: boolean;
}

class BackgroundSyncService {
  private readonly IDB_NAME = 'WedSyncSyncDB';
  private readonly IDB_VERSION = 1;
  private readonly STORE_NAME = 'syncActions';

  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;

  private config: SyncConfig = {
    maxRetries: 5,
    retryDelayBase: 1000, // 1 second
    retryDelayMultiplier: 2,
    maxRetryDelay: 300000, // 5 minutes
    batchSize: 10,
    syncInterval: 30000, // 30 seconds
    priorityQueues: true,
  };

  constructor() {
    this.initializeIndexedDB();
    this.setupEventListeners();
    this.startAutoSync();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.IDB_NAME, this.IDB_VERSION);

      request.onerror = () => {
        console.error(
          '[Background Sync] IndexedDB initialization failed:',
          request.error,
        );
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Background Sync] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
          });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('weddingId', 'weddingId', { unique: false });
          store.createIndex('nextRetryTime', 'nextRetryTime', {
            unique: false,
          });
        }
      };
    });
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      console.log('[Background Sync] Connection restored');
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[Background Sync] Connection lost');
      this.isOnline = false;
    });

    // Visibility change for aggressive syncing when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });

    // Service worker communication
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;

        if (type === 'BACKGROUND_SYNC_REQUEST') {
          this.triggerSync();
        } else if (type === 'SYNC_ACTION_SUCCESS') {
          this.markActionSuccess(data.actionId);
        } else if (type === 'SYNC_ACTION_FAILED') {
          this.handleActionFailure(data.actionId, data.error);
        }
      });
    }
  }

  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.triggerSync();
      }
    }, this.config.syncInterval);
  }

  // =====================================================
  // ACTION QUEUEING
  // =====================================================

  public async queueAction(
    action: Omit<SyncAction, 'id' | 'retryCount' | 'status' | 'timestamp'>,
  ): Promise<string> {
    const syncAction: SyncAction = {
      ...action,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
      status: 'pending',
      timestamp: new Date().toISOString(),
      maxRetries:
        action.priority === 'critical'
          ? this.config.maxRetries + 2
          : this.config.maxRetries,
    };

    try {
      await this.storeAction(syncAction);
      console.log(
        `[Background Sync] Queued ${action.type} action:`,
        syncAction.id,
      );

      // Try immediate sync if online
      if (this.isOnline) {
        setTimeout(() => this.triggerSync(), 100);
      }

      return syncAction.id;
    } catch (error) {
      console.error('[Background Sync] Failed to queue action:', error);
      throw error;
    }
  }

  private async storeAction(action: SyncAction): Promise<void> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // =====================================================
  // SYNC EXECUTION
  // =====================================================

  public async triggerSync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    try {
      this.isSyncing = true;
      console.log('[Background Sync] Starting sync process...');

      const pendingActions = await this.getPendingActions();

      if (pendingActions.length === 0) {
        console.log('[Background Sync] No pending actions');
        return;
      }

      console.log(
        `[Background Sync] Found ${pendingActions.length} pending actions`,
      );

      // Sort by priority and timestamp
      const sortedActions = this.sortActionsByPriority(pendingActions);

      // Process in batches
      await this.processSyncBatch(
        sortedActions.slice(0, this.config.batchSize),
      );
    } catch (error) {
      console.error('[Background Sync] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async getPendingActions(): Promise<SyncAction[]> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        const actions = request.result || [];

        // Filter actions that are ready for retry
        const readyActions = actions.filter((action) => {
          if (!action.nextRetryTime) return true;
          return new Date(action.nextRetryTime) <= new Date();
        });

        resolve(readyActions);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private sortActionsByPriority(actions: SyncAction[]): SyncAction[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return actions.sort((a, b) => {
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Same priority, sort by timestamp (older first)
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  private async processSyncBatch(actions: SyncAction[]): Promise<void> {
    const promises = actions.map((action) => this.executeAction(action));
    await Promise.allSettled(promises);
  }

  private async executeAction(action: SyncAction): Promise<void> {
    try {
      console.log(
        `[Background Sync] Executing ${action.type} action:`,
        action.id,
      );

      // Update status to syncing
      await this.updateActionStatus(action.id, 'syncing');

      const requestConfig: RequestInit = {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
          // 'Authorization': 'Bearer ' + await getAuthToken(),
        },
        body:
          action.method !== 'DELETE' ? JSON.stringify(action.data) : undefined,
      };

      const response = await fetch(action.url, requestConfig);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success
      await this.markActionSuccess(action.id);
      console.log(
        `[Background Sync] Successfully synced ${action.type} action:`,
        action.id,
      );

      // Notify components of success
      this.broadcastSyncResult('success', action);
    } catch (error) {
      console.error(`[Background Sync] Action ${action.id} failed:`, error);
      await this.handleActionFailure(action.id, error as Error);
    }
  }

  // =====================================================
  // RETRY LOGIC WITH EXPONENTIAL BACKOFF
  // =====================================================

  private async handleActionFailure(
    actionId: string,
    error: Error,
  ): Promise<void> {
    try {
      const action = await this.getAction(actionId);
      if (!action) {
        console.error(
          '[Background Sync] Action not found for retry:',
          actionId,
        );
        return;
      }

      const newRetryCount = action.retryCount + 1;

      if (newRetryCount >= action.maxRetries) {
        // Mark as permanently failed
        await this.updateActionStatus(actionId, 'failed');
        console.error(
          `[Background Sync] Action ${actionId} permanently failed after ${newRetryCount} attempts`,
        );

        this.broadcastSyncResult('failed', action, error);
        return;
      }

      // Calculate next retry time with exponential backoff
      const delay = Math.min(
        this.config.retryDelayBase *
          Math.pow(this.config.retryDelayMultiplier, newRetryCount - 1),
        this.config.maxRetryDelay,
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      const nextRetryTime = new Date(Date.now() + totalDelay).toISOString();

      // Update action with new retry info
      const updatedAction: SyncAction = {
        ...action,
        retryCount: newRetryCount,
        status: 'pending',
        nextRetryTime,
      };

      await this.storeAction(updatedAction);

      console.log(
        `[Background Sync] Action ${actionId} will retry in ${Math.round(totalDelay / 1000)}s (attempt ${newRetryCount}/${action.maxRetries})`,
      );

      // Schedule the retry
      setTimeout(() => {
        if (this.isOnline) {
          this.executeAction(updatedAction);
        }
      }, totalDelay);
    } catch (retryError) {
      console.error(
        '[Background Sync] Failed to handle action failure:',
        retryError,
      );
    }
  }

  // =====================================================
  // ACTION MANAGEMENT
  // =====================================================

  private async getAction(actionId: string): Promise<SyncAction | null> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(actionId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async updateActionStatus(
    actionId: string,
    status: SyncAction['status'],
  ): Promise<void> {
    const action = await this.getAction(actionId);
    if (action) {
      action.status = status;
      await this.storeAction(action);
    }
  }

  private async markActionSuccess(actionId: string): Promise<void> {
    await this.updateActionStatus(actionId, 'success');

    // Clean up successful actions after a delay
    setTimeout(async () => {
      await this.removeAction(actionId);
    }, 60000); // Keep for 1 minute for debugging
  }

  private async removeAction(actionId: string): Promise<void> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(actionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // =====================================================
  // STATISTICS AND MONITORING
  // =====================================================

  public async getSyncStats(): Promise<SyncStats> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const actions = request.result || [];

        const stats: SyncStats = {
          totalActions: actions.length,
          pendingActions: actions.filter((a) => a.status === 'pending').length,
          successfulActions: actions.filter((a) => a.status === 'success')
            .length,
          failedActions: actions.filter((a) => a.status === 'failed').length,
          avgRetryCount:
            actions.length > 0
              ? actions.reduce((sum, a) => sum + a.retryCount, 0) /
                actions.length
              : 0,
          lastSyncTime: localStorage.getItem('last-sync-time'),
          nextSyncTime: this.getNextSyncTime(),
        };

        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private getNextSyncTime(): string | null {
    if (!this.isOnline) return null;

    const nextSync = new Date(Date.now() + this.config.syncInterval);
    return nextSync.toISOString();
  }

  // =====================================================
  // COMMUNICATION AND EVENTS
  // =====================================================

  private broadcastSyncResult(
    result: 'success' | 'failed',
    action: SyncAction,
    error?: Error,
  ): void {
    const event = new CustomEvent('wedsync-sync-result', {
      detail: { result, action, error },
    });
    window.dispatchEvent(event);

    // Also broadcast to service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_RESULT',
        data: { result, actionId: action.id, error: error?.message },
      });
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  public async clearAllActions(): Promise<void> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[Background Sync] All actions cleared');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async retryFailedActions(): Promise<void> {
    const failedActions = await this.getFailedActions();

    for (const action of failedActions) {
      // Reset status and retry count
      action.status = 'pending';
      action.retryCount = 0;
      action.nextRetryTime = undefined;

      await this.storeAction(action);
    }

    console.log(
      `[Background Sync] Reset ${failedActions.length} failed actions for retry`,
    );

    if (this.isOnline) {
      this.triggerSync();
    }
  }

  private async getFailedActions(): Promise<SyncAction[]> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('failed');

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart auto-sync with new interval
    if (newConfig.syncInterval) {
      this.startAutoSync();
    }

    console.log('[Background Sync] Configuration updated:', this.config);
  }

  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  public isSyncingStatus(): boolean {
    return this.isSyncing;
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSyncService();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).backgroundSync = backgroundSync;
}
