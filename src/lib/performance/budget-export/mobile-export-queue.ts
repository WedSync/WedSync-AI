/**
 * WS-166 Mobile Export Queue Manager
 * Team D - Round 1 Implementation
 *
 * Handles offline export requests, queue management, and background sync
 */

import { ExportRequest } from './export-optimizer';

export interface ExportQueueItem {
  exportId: string;
  weddingId: string;
  format: 'csv' | 'pdf' | 'excel' | 'json';
  filters: ExportFilters;
  priority: 'high' | 'normal' | 'low';
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  estimatedSize: number;
  progress: number;
  errorMessage?: string;
  resultUrl?: string;
  expiresAt: Date;
}

export interface ExportFilters {
  categories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  vendors?: string[];
  transactionTypes?: ('expense' | 'payment' | 'refund')[];
  minAmount?: number;
  maxAmount?: number;
  includeMetadata: boolean;
}

export interface ExportStatus {
  exportId: string;
  status: ExportQueueItem['status'];
  progress: number;
  estimatedTimeRemaining?: number;
  errorMessage?: string;
  resultUrl?: string;
}

export interface QueueStatistics {
  totalItems: number;
  pendingItems: number;
  processingItems: number;
  completedItems: number;
  failedItems: number;
  averageProcessingTime: number;
  queueHealthScore: number;
}

export interface NetworkConnectionInfo {
  isOnline: boolean;
  connectionType: 'wifi' | '4g' | '3g' | 'slow' | 'unknown';
  effectiveType: string;
  downlink: number;
  rtt: number;
}

/**
 * Mobile Export Queue Manager
 * Handles offline export requests and background synchronization
 */
export class MobileExportQueue {
  private static readonly DB_NAME = 'WedSyncExportQueue';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'exportQueue';
  private static readonly MAX_QUEUE_SIZE = 50;
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_BASE = 1000; // 1 second
  private static readonly MAX_RETRY_DELAY = 30000; // 30 seconds
  private static readonly QUEUE_PROCESSING_INTERVAL = 5000; // 5 seconds
  private static readonly EXPORT_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

  private static db: IDBDatabase | null = null;
  private static processingInterval: NodeJS.Timeout | null = null;
  private static isProcessing = false;
  private static listeners: Map<string, (status: ExportStatus) => void> =
    new Map();

  /**
   * Initialize the export queue system
   */
  static async initialize(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      this.startQueueProcessing();
      this.setupOnlineEventListeners();
      console.log('Mobile Export Queue initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mobile Export Queue:', error);
      throw error;
    }
  }

  /**
   * Queue an export request with priority
   */
  static async queueExportRequest(
    request: ExportRequest,
    priority: 'high' | 'normal' | 'low' = 'normal',
  ): Promise<string> {
    try {
      const exportId = this.generateExportId();
      const timestamp = new Date();
      const expiresAt = new Date(Date.now() + this.EXPORT_EXPIRY_TIME);

      // Estimate export size for queue management
      const estimatedSize = await this.estimateExportSize(request);

      const queueItem: ExportQueueItem = {
        exportId,
        weddingId: request.weddingId,
        format: request.format,
        filters: {
          categories: request.categories,
          dateRange: request.dateRange,
          includeMetadata: true,
          transactionTypes: ['expense', 'payment', 'refund'],
        },
        priority,
        timestamp,
        status: 'pending',
        retryCount: 0,
        maxRetries: this.DEFAULT_MAX_RETRIES,
        estimatedSize,
        progress: 0,
        expiresAt,
      };

      // Check queue capacity
      await this.enforceQueueCapacity();

      // Add to IndexedDB
      await this.addToQueue(queueItem);

      // Trigger immediate processing if online
      if (navigator.onLine) {
        this.processQueue();
      }

      // Notify listeners
      this.notifyStatusChange({
        exportId,
        status: 'pending',
        progress: 0,
      });

      console.log(
        `Export request queued: ${exportId} with priority ${priority}`,
      );
      return exportId;
    } catch (error) {
      console.error('Error queuing export request:', error);
      throw new Error('Failed to queue export request');
    }
  }

  /**
   * Process offline export queue when connection is restored
   */
  static async processOfflineQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingItems = await this.getPendingQueueItems();
      console.log(`Processing ${pendingItems.length} queued export requests`);

      for (const item of pendingItems) {
        if (item.expiresAt < new Date()) {
          // Remove expired items
          await this.removeFromQueue(item.exportId);
          continue;
        }

        try {
          await this.processQueueItem(item);
        } catch (error) {
          console.error(`Error processing queue item ${item.exportId}:`, error);
          await this.handleProcessingError(item, error);
        }
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync export status with server
   */
  static async syncExportStatus(): Promise<ExportStatus[]> {
    try {
      const processingItems = await this.getProcessingItems();
      const statusUpdates: ExportStatus[] = [];

      for (const item of processingItems) {
        try {
          const status = await this.fetchExportStatus(item.exportId);
          if (status) {
            await this.updateQueueItemStatus(item.exportId, status);
            statusUpdates.push(status);
            this.notifyStatusChange(status);
          }
        } catch (error) {
          console.error(`Error syncing status for ${item.exportId}:`, error);
        }
      }

      return statusUpdates;
    } catch (error) {
      console.error('Error syncing export status:', error);
      return [];
    }
  }

  /**
   * Optimize queue processing based on network conditions
   */
  static async optimizeQueueForNetwork(
    connectionType: 'wifi' | '4g' | '3g' | 'slow',
  ): Promise<void> {
    try {
      const connectionInfo = await this.getNetworkConnectionInfo();

      // Adjust processing strategy based on connection
      let maxConcurrent = 1;
      let priorityThreshold = 'normal';

      switch (connectionType) {
        case 'wifi':
          maxConcurrent = 3;
          priorityThreshold = 'low';
          break;
        case '4g':
          maxConcurrent = 2;
          priorityThreshold = 'normal';
          break;
        case '3g':
          maxConcurrent = 1;
          priorityThreshold = 'normal';
          break;
        case 'slow':
          maxConcurrent = 1;
          priorityThreshold = 'high';
          break;
      }

      // Update queue processing parameters
      await this.updateProcessingStrategy(maxConcurrent, priorityThreshold);

      console.log(
        `Queue optimized for ${connectionType} connection: ${maxConcurrent} concurrent, ${priorityThreshold}+ priority`,
      );
    } catch (error) {
      console.error('Error optimizing queue for network:', error);
    }
  }

  /**
   * Get current queue statistics
   */
  static async getQueueStatistics(): Promise<QueueStatistics> {
    try {
      const allItems = await this.getAllQueueItems();

      const stats: QueueStatistics = {
        totalItems: allItems.length,
        pendingItems: allItems.filter((item) => item.status === 'pending')
          .length,
        processingItems: allItems.filter((item) => item.status === 'processing')
          .length,
        completedItems: allItems.filter((item) => item.status === 'completed')
          .length,
        failedItems: allItems.filter((item) => item.status === 'failed').length,
        averageProcessingTime: this.calculateAverageProcessingTime(allItems),
        queueHealthScore: this.calculateQueueHealthScore(allItems),
      };

      return stats;
    } catch (error) {
      console.error('Error getting queue statistics:', error);
      throw error;
    }
  }

  /**
   * Add status change listener
   */
  static addStatusListener(
    exportId: string,
    callback: (status: ExportStatus) => void,
  ): void {
    this.listeners.set(exportId, callback);
  }

  /**
   * Remove status change listener
   */
  static removeStatusListener(exportId: string): void {
    this.listeners.delete(exportId);
  }

  /**
   * Cancel an export request
   */
  static async cancelExport(exportId: string): Promise<boolean> {
    try {
      const item = await this.getQueueItem(exportId);
      if (!item) {
        return false;
      }

      if (item.status === 'processing') {
        // Try to cancel server-side processing
        await this.cancelServerExport(exportId);
      }

      // Update status to cancelled
      await this.updateQueueItemStatus(exportId, {
        exportId,
        status: 'cancelled',
        progress: 0,
      });

      this.notifyStatusChange({
        exportId,
        status: 'cancelled',
        progress: 0,
      });

      return true;
    } catch (error) {
      console.error(`Error cancelling export ${exportId}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired and old completed exports
   */
  static async cleanupExpiredExports(): Promise<number> {
    try {
      const allItems = await this.getAllQueueItems();
      const now = new Date();
      let removedCount = 0;

      for (const item of allItems) {
        const shouldRemove =
          item.expiresAt < now ||
          (item.status === 'completed' &&
            now.getTime() - item.timestamp.getTime() >
              this.EXPORT_EXPIRY_TIME) ||
          (item.status === 'failed' && item.retryCount >= item.maxRetries);

        if (shouldRemove) {
          await this.removeFromQueue(item.exportId);
          removedCount++;
        }
      }

      console.log(`Cleaned up ${removedCount} expired exports`);
      return removedCount;
    } catch (error) {
      console.error('Error cleaning up expired exports:', error);
      return 0;
    }
  }

  /**
   * Private helper methods
   */
  private static async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'exportId',
          });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('weddingId', 'weddingId', { unique: false });
        }
      };
    });
  }

  private static async addToQueue(item: ExportQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to add item to queue'));
    });
  }

  private static async removeFromQueue(exportId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(exportId);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to remove item from queue'));
    });
  }

  private static async getQueueItem(
    exportId: string,
  ): Promise<ExportQueueItem | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(exportId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Convert date strings back to Date objects
          result.timestamp = new Date(result.timestamp);
          result.expiresAt = new Date(result.expiresAt);
          if (result.filters.dateRange) {
            result.filters.dateRange.start = new Date(
              result.filters.dateRange.start,
            );
            result.filters.dateRange.end = new Date(
              result.filters.dateRange.end,
            );
          }
        }
        resolve(result || null);
      };
      request.onerror = () =>
        reject(new Error('Failed to get item from queue'));
    });
  }

  private static async getAllQueueItems(): Promise<ExportQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          expiresAt: new Date(item.expiresAt),
          filters: {
            ...item.filters,
            dateRange: item.filters.dateRange
              ? {
                  start: new Date(item.filters.dateRange.start),
                  end: new Date(item.filters.dateRange.end),
                }
              : undefined,
          },
        }));
        resolve(items);
      };
      request.onerror = () =>
        reject(new Error('Failed to get all items from queue'));
    });
  }

  private static async getPendingQueueItems(): Promise<ExportQueueItem[]> {
    const allItems = await this.getAllQueueItems();
    return allItems
      .filter((item) => item.status === 'pending')
      .sort((a, b) => {
        // Sort by priority first, then by timestamp
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return a.timestamp.getTime() - b.timestamp.getTime();
      });
  }

  private static async getProcessingItems(): Promise<ExportQueueItem[]> {
    const allItems = await this.getAllQueueItems();
    return allItems.filter((item) => item.status === 'processing');
  }

  private static startQueueProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      if (navigator.onLine && !this.isProcessing) {
        this.processQueue();
      }
    }, this.QUEUE_PROCESSING_INTERVAL);
  }

  private static async processQueue(): Promise<void> {
    await this.processOfflineQueue();
    await this.syncExportStatus();
    await this.cleanupExpiredExports();
  }

  private static async processQueueItem(item: ExportQueueItem): Promise<void> {
    // Update status to processing
    await this.updateQueueItemStatus(item.exportId, {
      exportId: item.exportId,
      status: 'processing',
      progress: 0,
    });

    try {
      // Make API call to start export processing
      const response = await fetch('/api/budget/export/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportId: item.exportId,
          weddingId: item.weddingId,
          format: item.format,
          filters: item.filters,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export API returned ${response.status}`);
      }

      const result = await response.json();

      // Update with server response
      await this.updateQueueItemStatus(item.exportId, {
        exportId: item.exportId,
        status: result.status || 'processing',
        progress: result.progress || 10,
      });
    } catch (error) {
      throw error;
    }
  }

  private static async handleProcessingError(
    item: ExportQueueItem,
    error: any,
  ): Promise<void> {
    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      // Mark as failed
      await this.updateQueueItemStatus(item.exportId, {
        exportId: item.exportId,
        status: 'failed',
        progress: 0,
        errorMessage: error.message || 'Export processing failed',
      });
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(
        this.RETRY_DELAY_BASE * Math.pow(2, newRetryCount),
        this.MAX_RETRY_DELAY,
      );

      setTimeout(async () => {
        const updatedItem = await this.getQueueItem(item.exportId);
        if (updatedItem) {
          updatedItem.retryCount = newRetryCount;
          updatedItem.status = 'pending';
          await this.updateQueueItem(updatedItem);
        }
      }, retryDelay);
    }
  }

  private static async updateQueueItem(item: ExportQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to update queue item'));
    });
  }

  private static async updateQueueItemStatus(
    exportId: string,
    status: ExportStatus,
  ): Promise<void> {
    const item = await this.getQueueItem(exportId);
    if (item) {
      item.status = status.status;
      item.progress = status.progress;
      if (status.errorMessage) item.errorMessage = status.errorMessage;
      if (status.resultUrl) item.resultUrl = status.resultUrl;

      await this.updateQueueItem(item);
    }
  }

  private static notifyStatusChange(status: ExportStatus): void {
    const listener = this.listeners.get(status.exportId);
    if (listener) {
      listener(status);
    }
  }

  private static generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async estimateExportSize(
    request: ExportRequest,
  ): Promise<number> {
    // Rough estimation based on format and filters
    const baseSize = 1024; // 1KB base
    const formatMultiplier = {
      csv: 1,
      json: 2,
      excel: 3,
      pdf: 5,
    };

    return baseSize * formatMultiplier[request.format];
  }

  private static async enforceQueueCapacity(): Promise<void> {
    const allItems = await this.getAllQueueItems();
    if (allItems.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest completed or failed items
      const itemsToRemove = allItems
        .filter(
          (item) => item.status === 'completed' || item.status === 'failed',
        )
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, Math.max(1, allItems.length - this.MAX_QUEUE_SIZE + 1));

      for (const item of itemsToRemove) {
        await this.removeFromQueue(item.exportId);
      }
    }
  }

  private static setupOnlineEventListeners(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored - processing export queue');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost - exports will be queued');
    });
  }

  private static async fetchExportStatus(
    exportId: string,
  ): Promise<ExportStatus | null> {
    try {
      const response = await fetch(`/api/budget/export/status/${exportId}`);
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error(`Error fetching status for ${exportId}:`, error);
      return null;
    }
  }

  private static async cancelServerExport(exportId: string): Promise<void> {
    try {
      await fetch(`/api/budget/export/${exportId}/cancel`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Error cancelling server export ${exportId}:`, error);
    }
  }

  private static async getNetworkConnectionInfo(): Promise<NetworkConnectionInfo> {
    // @ts-ignore - Navigator connection API
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      return {
        isOnline: navigator.onLine,
        connectionType: this.mapConnectionType(connection.effectiveType),
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }

    return {
      isOnline: navigator.onLine,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
    };
  }

  private static mapConnectionType(
    effectiveType: string,
  ): 'wifi' | '4g' | '3g' | 'slow' | 'unknown' {
    switch (effectiveType) {
      case '4g':
        return '4g';
      case '3g':
        return '3g';
      case 'slow-2g':
      case '2g':
        return 'slow';
      default:
        return 'unknown';
    }
  }

  private static async updateProcessingStrategy(
    maxConcurrent: number,
    priorityThreshold: string,
  ): Promise<void> {
    // Implementation would update internal processing parameters
    console.log(
      `Updated processing strategy: ${maxConcurrent} concurrent, ${priorityThreshold}+ priority`,
    );
  }

  private static calculateAverageProcessingTime(
    items: ExportQueueItem[],
  ): number {
    const completedItems = items.filter((item) => item.status === 'completed');
    if (completedItems.length === 0) return 0;

    // Would calculate based on actual processing times
    return 5000; // 5 seconds average (placeholder)
  }

  private static calculateQueueHealthScore(items: ExportQueueItem[]): number {
    if (items.length === 0) return 100;

    const successRate =
      items.filter((item) => item.status === 'completed').length / items.length;
    const averageRetries =
      items.reduce((sum, item) => sum + item.retryCount, 0) / items.length;

    // Health score based on success rate and retry rate
    return Math.max(0, Math.min(100, successRate * 100 - averageRetries * 10));
  }
}
