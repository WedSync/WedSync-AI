/**
 * WedSync Support Offline Manager
 * Handles offline functionality for support tickets with wedding day emergency priority
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  priority: 'normal' | 'high';
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface OfflineData {
  tickets: any[];
  comments: Record<string, any[]>;
  attachments: Record<string, any[]>;
  lastSync: number;
}

class OfflineManager {
  private dbName = 'WedSyncOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
    this.setupEventListeners();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initDB(): Promise<void> {
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Queued requests store
          if (!db.objectStoreNames.contains('requests')) {
            const requestStore = db.createObjectStore('requests', {
              keyPath: 'id',
            });
            requestStore.createIndex('status', 'status', { unique: false });
            requestStore.createIndex('priority', 'priority', { unique: false });
            requestStore.createIndex('timestamp', 'timestamp', {
              unique: false,
            });
          }

          // Offline data cache
          if (!db.objectStoreNames.contains('offlineData')) {
            const dataStore = db.createObjectStore('offlineData', {
              keyPath: 'key',
            });
            dataStore.createIndex('lastUpdated', 'lastUpdated', {
              unique: false,
            });
          }

          // User preferences
          if (!db.objectStoreNames.contains('preferences')) {
            db.createObjectStore('preferences', { keyPath: 'key' });
          }
        };
      });

      console.log('OfflineManager: Database initialized successfully');
    } catch (error) {
      console.error('OfflineManager: Failed to initialize database:', error);
    }
  }

  /**
   * Set up event listeners for online/offline events
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      console.log('OfflineManager: Connection restored');
      this.processQueuedRequests();
      this.notifyConnectionRestored();
    });

    window.addEventListener('offline', () => {
      console.log('OfflineManager: Connection lost');
      this.notifyConnectionLost();
    });
  }

  /**
   * Check if user is currently online
   */
  public isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Queue a request for offline processing
   */
  public async queueRequest(
    url: string,
    method: string = 'GET',
    body?: any,
    options: {
      priority?: 'normal' | 'high';
      headers?: Record<string, string>;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<string> {
    if (!this.db) {
      await this.initDB();
    }

    const requestId = this.generateRequestId();
    const queuedRequest: QueuedRequest = {
      id: requestId,
      url,
      method: method.toUpperCase(),
      headers: options.headers || {},
      body: body ? JSON.stringify(body) : undefined,
      timestamp: Date.now(),
      priority: options.priority || 'normal',
      retryCount: 0,
      status: 'pending',
      metadata: options.metadata,
    };

    try {
      const transaction = this.db!.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      await store.add(queuedRequest);

      console.log(`OfflineManager: Request queued (${requestId}):`, url);

      // If online, try to process immediately
      if (this.isOnline()) {
        setTimeout(() => this.processQueuedRequests(), 100);
      }

      return requestId;
    } catch (error) {
      console.error('OfflineManager: Failed to queue request:', error);
      throw error;
    }
  }

  /**
   * Process all queued requests
   */
  public async processQueuedRequests(): Promise<void> {
    if (!this.db || !this.isOnline()) return;

    try {
      const transaction = this.db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const requests = await this.getAllFromStore(store);

      const pendingRequests = requests
        .filter((req: QueuedRequest) => req.status === 'pending')
        .sort((a: QueuedRequest, b: QueuedRequest) => {
          // Priority: high first, then by timestamp
          if (a.priority === 'high' && b.priority !== 'high') return -1;
          if (a.priority !== 'high' && b.priority === 'high') return 1;
          return a.timestamp - b.timestamp;
        });

      console.log(
        `OfflineManager: Processing ${pendingRequests.length} queued requests`,
      );

      for (const request of pendingRequests) {
        await this.processRequest(request);
      }
    } catch (error) {
      console.error(
        'OfflineManager: Failed to process queued requests:',
        error,
      );
    }
  }

  /**
   * Process individual queued request
   */
  private async processRequest(request: QueuedRequest): Promise<void> {
    if (!this.db) return;

    try {
      // Mark as processing
      await this.updateRequestStatus(request.id, 'processing');

      const response = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        body: request.body,
      });

      if (response.ok) {
        await this.updateRequestStatus(request.id, 'completed');
        console.log(
          `OfflineManager: Successfully processed request ${request.id}`,
        );

        // Notify success for high priority requests (wedding day emergencies)
        if (request.priority === 'high') {
          this.notifyEmergencyRequestProcessed(request);
        }
      } else {
        await this.handleRequestFailure(
          request,
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      await this.handleRequestFailure(
        request,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Handle request processing failure
   */
  private async handleRequestFailure(
    request: QueuedRequest,
    error: string,
  ): Promise<void> {
    const newRetryCount = request.retryCount + 1;
    const maxRetries = request.priority === 'high' ? 5 : 3;

    if (newRetryCount >= maxRetries) {
      await this.updateRequestStatus(request.id, 'failed');
      console.error(
        `OfflineManager: Request ${request.id} failed after ${maxRetries} attempts:`,
        error,
      );

      // Notify failure for high priority requests
      if (request.priority === 'high') {
        this.notifyEmergencyRequestFailed(request, error);
      }
    } else {
      // Update retry count and reset to pending
      if (this.db) {
        const transaction = this.db.transaction(['requests'], 'readwrite');
        const store = transaction.objectStore('requests');
        const updatedRequest = {
          ...request,
          retryCount: newRetryCount,
          status: 'pending' as const,
        };
        await store.put(updatedRequest);
      }

      console.log(
        `OfflineManager: Request ${request.id} will retry (${newRetryCount}/${maxRetries})`,
      );
    }
  }

  /**
   * Update request status
   */
  private async updateRequestStatus(
    requestId: string,
    status: QueuedRequest['status'],
  ): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const request = await store.get(requestId);

      if (request) {
        request.status = status;
        await store.put(request);
      }
    } catch (error) {
      console.error(`OfflineManager: Failed to update request status:`, error);
    }
  }

  /**
   * Get all queued requests
   */
  public async getQueuedRequests(): Promise<QueuedRequest[]> {
    if (!this.db) {
      await this.initDB();
    }

    try {
      const transaction = this.db!.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      return await this.getAllFromStore(store);
    } catch (error) {
      console.error('OfflineManager: Failed to get queued requests:', error);
      return [];
    }
  }

  /**
   * Get queued requests count by status
   */
  public async getQueuedRequestsCount(): Promise<{
    pending: number;
    failed: number;
    total: number;
  }> {
    const requests = await this.getQueuedRequests();

    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      failed: requests.filter((r) => r.status === 'failed').length,
      total: requests.length,
    };
  }

  /**
   * Clear completed requests older than specified hours
   */
  public async cleanupOldRequests(
    olderThanHours: number = 24,
  ): Promise<number> {
    if (!this.db) return 0;

    try {
      const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
      const transaction = this.db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const requests = await this.getAllFromStore(store);

      let deletedCount = 0;

      for (const request of requests) {
        if (
          (request.status === 'completed' || request.status === 'failed') &&
          request.timestamp < cutoffTime
        ) {
          await store.delete(request.id);
          deletedCount++;
        }
      }

      console.log(`OfflineManager: Cleaned up ${deletedCount} old requests`);
      return deletedCount;
    } catch (error) {
      console.error('OfflineManager: Failed to cleanup old requests:', error);
      return 0;
    }
  }

  /**
   * Store data for offline access
   */
  public async storeOfflineData(key: string, data: any): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    try {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');

      await store.put({
        key,
        data,
        lastUpdated: Date.now(),
      });

      console.log(`OfflineManager: Stored offline data for key: ${key}`);
    } catch (error) {
      console.error('OfflineManager: Failed to store offline data:', error);
    }
  }

  /**
   * Get stored offline data
   */
  public async getOfflineData(key: string): Promise<any | null> {
    if (!this.db) {
      await this.initDB();
    }

    try {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const result = await store.get(key);

      return result ? result.data : null;
    } catch (error) {
      console.error('OfflineManager: Failed to get offline data:', error);
      return null;
    }
  }

  /**
   * Helper method to get all items from IndexedDB store
   */
  private getAllFromStore(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notification methods
   */
  private notifyConnectionRestored(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WedSync Support', {
        body: 'Connection restored. Syncing your tickets...',
        icon: '/icons/icon-96x96.png',
        tag: 'connection-restored',
      });
    }
  }

  private notifyConnectionLost(): void {
    // Don't show notification for connection lost - handled by UI components
    console.log('OfflineManager: Connection lost - offline mode activated');
  }

  private notifyEmergencyRequestProcessed(request: QueuedRequest): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Wedding Day Emergency', {
        body: 'Your emergency ticket has been submitted successfully!',
        icon: '/icons/emergency-96x96.png',
        tag: `emergency-processed-${request.id}`,
        requireInteraction: true,
      });
    }
  }

  private notifyEmergencyRequestFailed(
    request: QueuedRequest,
    error: string,
  ): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ Wedding Day Emergency - Action Required', {
        body: 'Failed to submit emergency ticket. Please call support immediately.',
        icon: '/icons/emergency-96x96.png',
        tag: `emergency-failed-${request.id}`,
        requireInteraction: true,
        actions: [
          { action: 'call', title: 'Call Support' },
          { action: 'retry', title: 'Retry' },
        ],
      });
    }
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Export utility functions
export const queueOfflineRequest = (
  url: string,
  method: string,
  body?: any,
  options?: any,
) => offlineManager.queueRequest(url, method, body, options);

export const getOfflineRequestsCount = () =>
  offlineManager.getQueuedRequestsCount();

export const processOfflineQueue = () => offlineManager.processQueuedRequests();

export const storeForOffline = (key: string, data: any) =>
  offlineManager.storeOfflineData(key, data);

export const getOfflineData = (key: string) =>
  offlineManager.getOfflineData(key);

export const isOnline = () => offlineManager.isOnline();
