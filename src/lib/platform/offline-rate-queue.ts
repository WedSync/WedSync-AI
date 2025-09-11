'use client';

/**
 * Offline Request Queue for Rate Limited Operations
 * Handles queuing and processing of rate-limited requests when offline/poor connectivity
 */

interface QueuedRateLimitRequest {
  id: string;
  userId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body?: any;
  retryAfter: number;
  rateLimitReason: string;
  queuedAt: number;
  expectedProcessingTime: number;
  weddingPriority: number;
  isWeddingCritical: boolean;
  retryAttempts: number;
  maxRetries: number;
  action: string;
  weddingContext?: {
    weddingDate?: Date;
    isWeddingDay: boolean;
    vendorType?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface QueueProcessingResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  results: Array<{
    request: QueuedRateLimitRequest;
    status: 'success' | 'failed' | 'retry';
    result?: any;
    error?: any;
  }>;
}

interface OfflineQueueStats {
  totalQueued: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  averageWaitTime: number;
  weddingCriticalCount: number;
  nextProcessingTime: number;
}

export class OfflineRateLimitQueue {
  private static instance: OfflineRateLimitQueue;
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly dbName = 'WedSyncOfflineQueue';
  private readonly dbVersion = 1;
  private readonly storeName = 'rateLimitQueue';

  private constructor() {
    this.initializeIndexedDB();
    this.setupProcessingSchedule();
    this.setupNetworkListeners();
  }

  static getInstance(): OfflineRateLimitQueue {
    if (!OfflineRateLimitQueue.instance) {
      OfflineRateLimitQueue.instance = new OfflineRateLimitQueue();
    }
    return OfflineRateLimitQueue.instance;
  }

  /**
   * Queue a rate-limited request for later processing
   */
  async queueRateLimitedRequest(
    request: Omit<
      QueuedRateLimitRequest,
      | 'id'
      | 'queuedAt'
      | 'expectedProcessingTime'
      | 'weddingPriority'
      | 'isWeddingCritical'
      | 'retryAttempts'
    >,
  ): Promise<string> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    const queuedRequest: QueuedRateLimitRequest = {
      ...request,
      id: this.generateRequestId(),
      queuedAt: Date.now(),
      expectedProcessingTime: request.retryAfter * 1000,
      weddingPriority: this.calculateWeddingPriority(
        request.action,
        request.weddingContext,
      ),
      isWeddingCritical: this.isWeddingCriticalAction(
        request.action,
        request.weddingContext,
      ),
      retryAttempts: 0,
      maxRetries: request.maxRetries || 3,
    };

    try {
      await this.storeRequest(queuedRequest);

      // Schedule processing
      this.scheduleRequestProcessing(queuedRequest);

      // Emit event for UI updates
      this.emitQueueEvent('request_queued', { request: queuedRequest });

      console.log(
        `Queued rate-limited request: ${queuedRequest.action} (Priority: ${queuedRequest.weddingPriority})`,
      );

      return queuedRequest.id;
    } catch (error) {
      console.error('Failed to queue rate-limited request:', error);
      throw new Error('Failed to queue request for offline processing');
    }
  }

  /**
   * Process all queued requests (usually called when connectivity returns)
   */
  async processQueuedRequests(): Promise<QueueProcessingResult> {
    if (!this.db || this.isProcessing) {
      return { success: false, processedCount: 0, failedCount: 0, results: [] };
    }

    this.isProcessing = true;
    const results: QueueProcessingResult['results'] = [];

    try {
      // Get all pending requests sorted by priority
      const requests = await this.getPendingRequests();
      console.log(`Processing ${requests.length} queued rate-limited requests`);

      for (const request of requests) {
        try {
          const result = await this.executeQueuedRequest(request);

          if (result.success) {
            await this.markRequestCompleted(request.id, result.data);
            results.push({ request, status: 'success', result: result.data });
          } else {
            // Check if we should retry
            if (request.retryAttempts < request.maxRetries) {
              await this.incrementRetryCount(request.id);
              results.push({ request, status: 'retry', error: result.error });
            } else {
              await this.markRequestFailed(request.id, result.error);
              results.push({ request, status: 'failed', error: result.error });
            }
          }
        } catch (error) {
          console.error(`Failed to process request ${request.id}:`, error);
          await this.markRequestFailed(request.id, error);
          results.push({ request, status: 'failed', error });
        }

        // Add small delay between requests to avoid overwhelming the server
        await this.delay(200);
      }

      const processedCount = results.filter(
        (r) => r.status === 'success',
      ).length;
      const failedCount = results.filter((r) => r.status === 'failed').length;

      this.emitQueueEvent('batch_processed', {
        processedCount,
        failedCount,
        totalRequests: requests.length,
      });

      return {
        success: true,
        processedCount,
        failedCount,
        results,
      };
    } catch (error) {
      console.error('Queue processing failed:', error);
      return { success: false, processedCount: 0, failedCount: 0, results };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<OfflineQueueStats> {
    if (!this.db) {
      return this.getEmptyStats();
    }

    try {
      const allRequests = await this.getAllRequests();
      const pending = allRequests.filter((r) => r.status === 'pending');
      const processing = allRequests.filter((r) => r.status === 'processing');
      const completed = allRequests.filter((r) => r.status === 'completed');
      const failed = allRequests.filter((r) => r.status === 'failed');

      const weddingCritical = pending.filter((r) => r.isWeddingCritical);

      const waitTimes = completed
        .map((r) => r.completedAt - r.queuedAt)
        .filter((t) => t > 0);
      const averageWaitTime =
        waitTimes.length > 0
          ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
          : 0;

      const nextProcessingTime =
        pending.length > 0
          ? Math.min(
              ...pending.map((r) => r.queuedAt + r.expectedProcessingTime),
            )
          : 0;

      return {
        totalQueued: allRequests.length,
        pendingCount: pending.length,
        processingCount: processing.length,
        completedCount: completed.length,
        failedCount: failed.length,
        averageWaitTime,
        weddingCriticalCount: weddingCritical.length,
        nextProcessingTime,
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Remove old completed/failed requests to keep database lean
   */
  async cleanupOldRequests(olderThanHours: number = 24): Promise<number> {
    if (!this.db) return 0;

    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore('rateLimitQueue');
      const index = store.index('queuedAt');

      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const record = cursor.value;
            if (record.status === 'completed' || record.status === 'failed') {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            console.log(`Cleaned up ${deletedCount} old queue records`);
            resolve(deletedCount);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to cleanup old requests:', error);
      return 0;
    }
  }

  /**
   * Clear all pending requests (use carefully)
   */
  async clearQueue(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore('rateLimitQueue');
      await store.clear();

      this.emitQueueEvent('queue_cleared', {});
      console.log('Queue cleared');
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not available, offline queue disabled');
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Offline queue database initialized');
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('queuedAt', 'queuedAt', { unique: false });
          store.createIndex('weddingPriority', 'weddingPriority', {
            unique: false,
          });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('isWeddingCritical', 'isWeddingCritical', {
            unique: false,
          });
        }
      };
    });
  }

  /**
   * Execute a queued request
   */
  private async executeQueuedRequest(
    request: QueuedRateLimitRequest,
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const response = await fetch(request.endpoint, {
        method: request.method,
        headers: {
          ...request.headers,
          'X-Queued-Request': 'true',
          'X-Queue-Request-Id': request.id,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Network error' };
    }
  }

  /**
   * Store request in IndexedDB
   */
  private async storeRequest(request: QueuedRateLimitRequest): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const dbRequest = store.add({ ...request, status: 'pending' });

      dbRequest.onsuccess = () => resolve();
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  /**
   * Get pending requests sorted by priority
   */
  private async getPendingRequests(): Promise<QueuedRateLimitRequest[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore('rateLimitQueue');
      const index = store.index('weddingPriority');

      const request = index.openCursor(null, 'prev'); // Descending order (highest priority first)
      const results: QueuedRateLimitRequest[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          if (
            record.status === 'pending' &&
            Date.now() >= record.queuedAt + record.expectedProcessingTime
          ) {
            results.push(record);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Wedding priority calculation
   */
  private calculateWeddingPriority(
    action: string,
    weddingContext?: QueuedRateLimitRequest['weddingContext'],
  ): number {
    let basePriority = this.getActionBasePriority(action);

    if (weddingContext) {
      // Wedding day gets maximum priority boost
      if (weddingContext.isWeddingDay) {
        basePriority += 50;
      }

      // Urgency multiplier
      const urgencyMultiplier = {
        critical: 40,
        high: 30,
        medium: 20,
        low: 10,
      };

      basePriority += urgencyMultiplier[weddingContext.urgency] || 0;

      // Wedding proximity boost
      if (weddingContext.weddingDate) {
        const daysUntilWedding = Math.ceil(
          (weddingContext.weddingDate.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysUntilWedding <= 7)
          basePriority += 20; // Week before
        else if (daysUntilWedding <= 30) basePriority += 10; // Month before
      }
    }

    return Math.min(100, basePriority); // Cap at 100
  }

  private getActionBasePriority(action: string): number {
    const priorities: Record<string, number> = {
      vendor_emergency_contact: 90,
      wedding_day_task_update: 85,
      vendor_coordination: 80,
      timeline_update: 75,
      guest_communication: 70,
      task_status_update: 65,
      guest_list_update: 60,
      photo_upload: 50,
      form_submission: 45,
      client_import: 40,
      supplier_search: 30,
      portfolio_browsing: 20,
    };

    return priorities[action] || 25;
  }

  private isWeddingCriticalAction(
    action: string,
    weddingContext?: QueuedRateLimitRequest['weddingContext'],
  ): boolean {
    const criticalActions = [
      'vendor_emergency_contact',
      'wedding_day_task_update',
      'vendor_coordination',
    ];

    const isActionCritical = criticalActions.includes(action);
    const isWeddingDay = weddingContext?.isWeddingDay || false;
    const isCriticalUrgency = weddingContext?.urgency === 'critical';

    return isActionCritical || isWeddingDay || isCriticalUrgency;
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private scheduleRequestProcessing(request: QueuedRateLimitRequest): void {
    const delay = Math.max(
      0,
      request.expectedProcessingTime - (Date.now() - request.queuedAt),
    );

    setTimeout(async () => {
      if (navigator.onLine) {
        await this.processQueuedRequests();
      }
    }, delay);
  }

  private setupProcessingSchedule(): void {
    // Process queue every minute when online
    this.processingInterval = setInterval(async () => {
      if (navigator.onLine && !this.isProcessing) {
        await this.processQueuedRequests();
      }
    }, 60000);

    // Cleanup old requests daily
    setInterval(
      async () => {
        await this.cleanupOldRequests(24);
      },
      24 * 60 * 60 * 1000,
    );
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', async () => {
      console.log('Network reconnected, processing queue');
      setTimeout(() => this.processQueuedRequests(), 1000);
    });

    window.addEventListener('offline', () => {
      console.log('Network disconnected, queue mode active');
    });
  }

  private async markRequestCompleted(
    requestId: string,
    result: any,
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore('rateLimitQueue');

    const request = await store.get(requestId);
    if (request) {
      await store.put({
        ...request,
        status: 'completed',
        completedAt: Date.now(),
        result,
      });
    }
  }

  private async markRequestFailed(
    requestId: string,
    error: any,
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore('rateLimitQueue');

    const request = await store.get(requestId);
    if (request) {
      await store.put({
        ...request,
        status: 'failed',
        failedAt: Date.now(),
        error: error.message || error,
      });
    }
  }

  private async incrementRetryCount(requestId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore('rateLimitQueue');

    const request = await store.get(requestId);
    if (request) {
      await store.put({
        ...request,
        retryAttempts: request.retryAttempts + 1,
        expectedProcessingTime: request.expectedProcessingTime * 1.5, // Exponential backoff
      });
    }
  }

  private async getAllRequests(): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore('rateLimitQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getEmptyStats(): OfflineQueueStats {
    return {
      totalQueued: 0,
      pendingCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      averageWaitTime: 0,
      weddingCriticalCount: 0,
      nextProcessingTime: 0,
    };
  }

  private emitQueueEvent(eventType: string, data: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`offlineQueue:${eventType}`, { detail: data }),
      );
    }
  }
}

// Export singleton instance
export const offlineRateLimitQueue = OfflineRateLimitQueue.getInstance();
