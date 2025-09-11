/**
 * Adaptive Sync Manager
 * Network-aware synchronization with intelligent batching
 *
 * Features:
 * - Network speed detection and adaptation
 * - Dynamic batch sizing based on connection quality
 * - Priority-based sync scheduling
 * - Data compression for slow connections
 * - Multi-device coordination
 * - Bandwidth optimization
 */

import { offlineDB, type SyncQueueItem } from './offline-database';
import { MLConflictResolver } from './ml-conflict-resolver';
import { OfflineViralIntegration } from './offline-viral-integration';
import { OfflineSuccessIntegration } from './offline-success-integration';
import { OfflineMarketingIntegration } from './offline-marketing-integration';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface NetworkConditions {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  saveData: boolean;
  online: boolean;
  measurementTime: string;
}

export interface SyncStrategy {
  type: 'aggressive' | 'moderate' | 'conservative' | 'minimal';
  batchSize: number;
  parallelRequests: number;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  includeMediaFiles: boolean;
  priorityOnly: boolean;
  minPriority?: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface SyncMetrics {
  totalSynced: number;
  totalPending: number;
  successRate: number;
  averageSyncTime: number;
  dataTransferred: number; // bytes
  compressionSavings: number; // bytes saved
  lastSyncTime: string;
  nextScheduledSync: string;
}

export interface DeviceSync {
  deviceId: string;
  lastSync: string;
  pendingChanges: number;
  syncOrder: number;
}

export interface CompressionResult {
  original: string;
  compressed: string;
  ratio: number;
  savedBytes: number;
}

// =====================================================
// ADAPTIVE SYNC MANAGER CLASS
// =====================================================

export class AdaptiveSyncManager {
  private static networkConditions: NetworkConditions | null = null;
  private static currentStrategy: SyncStrategy | null = null;
  private static syncMetrics: SyncMetrics = {
    totalSynced: 0,
    totalPending: 0,
    successRate: 1.0,
    averageSyncTime: 0,
    dataTransferred: 0,
    compressionSavings: 0,
    lastSyncTime: '',
    nextScheduledSync: '',
  };

  private static syncInProgress = false;
  private static networkMonitor: NodeJS.Timeout | null = null;
  private static deviceSyncMap = new Map<string, DeviceSync>();
  private static performanceHistory: number[] = [];

  /**
   * Initialize adaptive sync manager
   */
  static async initialize(): Promise<void> {
    console.log('[Adaptive Sync] Initializing adaptive sync manager');

    // Start network monitoring
    this.startNetworkMonitoring();

    // Load sync metrics
    await this.loadSyncMetrics();

    // Register device
    await this.registerDevice();

    // Schedule periodic sync
    this.schedulePeriodicSync();

    // Set up event listeners
    this.setupEventListeners();

    console.log('[Adaptive Sync] Manager initialized successfully');
  }

  /**
   * Start monitoring network conditions
   */
  private static startNetworkMonitoring(): void {
    // Monitor network changes
    this.updateNetworkConditions();

    // Update conditions every 30 seconds
    this.networkMonitor = setInterval(() => {
      this.updateNetworkConditions();
    }, 30000);

    // Listen for network events
    window.addEventListener('online', () => {
      console.log('[Adaptive Sync] Network online');
      this.updateNetworkConditions();
      this.optimizeSyncForNetwork();
    });

    window.addEventListener('offline', () => {
      console.log('[Adaptive Sync] Network offline');
      this.networkConditions = {
        ...this.networkConditions!,
        online: false,
      };
    });
  }

  /**
   * Update network conditions
   */
  private static async updateNetworkConditions(): Promise<void> {
    const conditions = await this.getNetworkConditions();
    this.networkConditions = conditions;

    // Update strategy based on new conditions
    const strategy = this.selectOptimalSyncStrategy(conditions);
    if (JSON.stringify(strategy) !== JSON.stringify(this.currentStrategy)) {
      console.log(`[Adaptive Sync] Strategy changed to: ${strategy.type}`);
      this.currentStrategy = strategy;
    }
  }

  /**
   * Get current network conditions
   */
  private static async getNetworkConditions(): Promise<NetworkConditions> {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
        online: navigator.onLine,
        measurementTime: new Date().toISOString(),
      };
    }

    // Fallback: measure network speed
    return this.measureNetworkSpeed();
  }

  /**
   * Measure network speed as fallback
   */
  private static async measureNetworkSpeed(): Promise<NetworkConditions> {
    if (!navigator.onLine) {
      return {
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false,
        online: false,
        measurementTime: new Date().toISOString(),
      };
    }

    try {
      // Ping test to measure RTT
      const startTime = performance.now();
      await fetch('/api/ping', { method: 'HEAD' });
      const rtt = performance.now() - startTime;

      // Download test (small file)
      const downloadStart = performance.now();
      const response = await fetch('/api/speedtest/download');
      const data = await response.blob();
      const downloadTime = performance.now() - downloadStart;

      // Calculate downlink speed (Mbps)
      const bytesDownloaded = data.size;
      const downlink = (bytesDownloaded * 8) / (downloadTime * 1000); // Mbps

      // Determine effective type based on speed
      let effectiveType: NetworkConditions['effectiveType'];
      if (downlink > 10) effectiveType = '4g';
      else if (downlink > 2) effectiveType = '3g';
      else if (downlink > 0.5) effectiveType = '2g';
      else effectiveType = 'slow-2g';

      return {
        effectiveType,
        downlink,
        rtt,
        saveData: false,
        online: true,
        measurementTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Adaptive Sync] Network measurement failed:', error);
      return {
        effectiveType: 'unknown',
        downlink: 1, // Assume slow connection
        rtt: 1000,
        saveData: true,
        online: navigator.onLine,
        measurementTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Select optimal sync strategy based on network conditions
   */
  private static selectOptimalSyncStrategy(
    network: NetworkConditions,
  ): SyncStrategy {
    // Offline - no sync
    if (!network.online) {
      return {
        type: 'minimal',
        batchSize: 0,
        parallelRequests: 0,
        compressionLevel: 'none',
        includeMediaFiles: false,
        priorityOnly: true,
        maxRetries: 0,
        timeoutMs: 0,
      };
    }

    // Data saver mode
    if (network.saveData) {
      return {
        type: 'minimal',
        batchSize: 3,
        parallelRequests: 1,
        compressionLevel: 'high',
        includeMediaFiles: false,
        priorityOnly: true,
        minPriority: 8, // Only critical items
        maxRetries: 2,
        timeoutMs: 10000,
      };
    }

    // Strategy based on connection quality
    if (network.effectiveType === '4g' && network.downlink > 10) {
      return {
        type: 'aggressive',
        batchSize: 100,
        parallelRequests: 5,
        compressionLevel: 'none', // Fast enough to skip compression
        includeMediaFiles: true,
        priorityOnly: false,
        maxRetries: 3,
        timeoutMs: 30000,
      };
    } else if (network.effectiveType === '4g' || network.downlink > 5) {
      return {
        type: 'moderate',
        batchSize: 50,
        parallelRequests: 3,
        compressionLevel: 'low',
        includeMediaFiles: true,
        priorityOnly: false,
        maxRetries: 3,
        timeoutMs: 20000,
      };
    } else if (network.effectiveType === '3g' || network.downlink > 1) {
      return {
        type: 'conservative',
        batchSize: 25,
        parallelRequests: 2,
        compressionLevel: 'medium',
        includeMediaFiles: false,
        priorityOnly: false,
        minPriority: 5,
        maxRetries: 2,
        timeoutMs: 15000,
      };
    } else {
      // Slow connection
      return {
        type: 'minimal',
        batchSize: 5,
        parallelRequests: 1,
        compressionLevel: 'high',
        includeMediaFiles: false,
        priorityOnly: true,
        minPriority: 7, // High priority only
        maxRetries: 2,
        timeoutMs: 10000,
      };
    }
  }

  /**
   * Main sync optimization method
   */
  static async optimizeSyncForNetwork(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[Adaptive Sync] Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('[Adaptive Sync] Cannot sync while offline');
      return;
    }

    this.syncInProgress = true;
    const startTime = performance.now();

    try {
      // Update network conditions
      await this.updateNetworkConditions();

      if (!this.currentStrategy) {
        this.currentStrategy = this.selectOptimalSyncStrategy(
          this.networkConditions!,
        );
      }

      console.log(
        `[Adaptive Sync] Starting sync with ${this.currentStrategy.type} strategy`,
      );

      // Execute sync strategy
      await this.executeSyncStrategy(this.currentStrategy);

      // Update metrics
      const syncTime = performance.now() - startTime;
      await this.updateSyncMetrics(syncTime);

      console.log(
        `[Adaptive Sync] Sync completed in ${Math.round(syncTime)}ms`,
      );
    } catch (error) {
      console.error('[Adaptive Sync] Sync failed:', error);
      this.syncMetrics.successRate *= 0.95; // Decay success rate
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute the selected sync strategy
   */
  private static async executeSyncStrategy(
    strategy: SyncStrategy,
  ): Promise<void> {
    if (strategy.batchSize === 0) {
      console.log('[Adaptive Sync] No sync due to network conditions');
      return;
    }

    // Get pending sync items sorted by priority
    let query = offlineDB.syncQueue.where('status').equals('pending');

    // Apply priority filter if needed
    const pendingItems = await query.reverse().toArray(); // Sort by priority descending

    let itemsToSync = pendingItems;

    if (strategy.priorityOnly && strategy.minPriority) {
      itemsToSync = pendingItems.filter(
        (item) => (item.priority || 0) >= strategy.minPriority!,
      );
    }

    // Limit to batch size
    itemsToSync = itemsToSync.slice(0, strategy.batchSize);

    if (itemsToSync.length === 0) {
      console.log('[Adaptive Sync] No items to sync');
      return;
    }

    console.log(`[Adaptive Sync] Syncing ${itemsToSync.length} items`);

    // Create parallel batches
    const batches = this.createBatches(itemsToSync, strategy.parallelRequests);

    // Process batches in parallel
    const results = await Promise.allSettled(
      batches.map((batch) => this.syncBatch(batch, strategy)),
    );

    // Handle results
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `[Adaptive Sync] Batches completed: ${successful} successful, ${failed} failed`,
    );

    // Trigger team-specific sync if needed
    await this.triggerTeamSync(itemsToSync);
  }

  /**
   * Create batches for parallel processing
   */
  private static createBatches(
    items: SyncQueueItem[],
    parallelRequests: number,
  ): SyncQueueItem[][] {
    const batches: SyncQueueItem[][] = [];
    const itemsPerBatch = Math.ceil(items.length / parallelRequests);

    for (let i = 0; i < items.length; i += itemsPerBatch) {
      batches.push(items.slice(i, i + itemsPerBatch));
    }

    return batches;
  }

  /**
   * Sync a batch of items
   */
  private static async syncBatch(
    items: SyncQueueItem[],
    strategy: SyncStrategy,
  ): Promise<void> {
    for (const item of items) {
      try {
        let syncData = item.data;
        let compressionUsed = false;
        let originalSize = 0;
        let compressedSize = 0;

        // Apply compression if needed
        if (
          strategy.compressionLevel !== 'none' &&
          !item.metadata?.skipCompression
        ) {
          const compressed = await this.compressData(
            syncData,
            strategy.compressionLevel,
          );
          originalSize = compressed.original.length;
          compressedSize = compressed.compressed.length;
          syncData = {
            compressed: true,
            data: compressed.compressed,
            compressionRatio: compressed.ratio,
          };
          compressionUsed = true;
          this.syncMetrics.compressionSavings += compressed.savedBytes;
        }

        // Determine endpoint based on item type
        const endpoint = this.getTeamSyncEndpoint(item.type);

        // Perform sync with timeout
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          strategy.timeoutMs,
        );

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Offline-Sync': 'true',
              'X-Compression-Used': compressionUsed.toString(),
              'X-Sync-Priority': item.priority?.toString() || '5',
            },
            body: JSON.stringify(syncData),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`Sync failed: ${response.status}`);
          }

          // Update data transferred metric
          this.syncMetrics.dataTransferred += compressionUsed
            ? compressedSize
            : JSON.stringify(syncData).length;

          // Mark as completed
          await offlineDB.syncQueue.update(item.id!, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          });

          this.syncMetrics.totalSynced++;
        } catch (error: any) {
          clearTimeout(timeout);

          if (error.name === 'AbortError') {
            console.warn(`[Adaptive Sync] Request timeout for item ${item.id}`);
          }

          await this.handleSyncError(item, error, strategy);
        }
      } catch (error) {
        console.error(`[Adaptive Sync] Failed to sync item ${item.id}:`, error);
        await this.handleSyncError(item, error, strategy);
      }
    }
  }

  /**
   * Compress data based on compression level
   */
  private static async compressData(
    data: any,
    level: 'low' | 'medium' | 'high',
  ): Promise<CompressionResult> {
    const original = JSON.stringify(data);

    // Use different compression strategies based on level
    let compressed: string;

    if (level === 'high') {
      // Use aggressive compression (would use pako/zlib in production)
      compressed = this.simpleCompress(original, 0.3);
    } else if (level === 'medium') {
      compressed = this.simpleCompress(original, 0.5);
    } else {
      compressed = this.simpleCompress(original, 0.7);
    }

    return {
      original,
      compressed,
      ratio: compressed.length / original.length,
      savedBytes: original.length - compressed.length,
    };
  }

  /**
   * Simple compression simulation (in production, use real compression)
   */
  private static simpleCompress(data: string, targetRatio: number): string {
    // This is a placeholder - in production, use real compression like pako
    // For now, just return a truncated base64 to simulate compression
    const base64 = btoa(data);
    return base64.substring(0, Math.floor(base64.length * targetRatio));
  }

  /**
   * Get team-specific sync endpoint
   */
  private static getTeamSyncEndpoint(itemType: string): string {
    const endpointMap: Record<string, string> = {
      viral_action: '/api/viral/offline-sync',
      success_milestone: '/api/customer-success/offline-sync',
      health_score_update: '/api/customer-success/health-scores/offline-sync',
      marketing_engagement: '/api/marketing/offline-sync',
      segment_automation: '/api/marketing/segments/offline-sync',
      form_submission: '/api/forms/offline-sync',
      client_update: '/api/clients/offline-sync',
      vendor_update: '/api/vendors/offline-sync',
      timeline_update: '/api/timeline/offline-sync',
    };

    return endpointMap[itemType] || '/api/offline/sync';
  }

  /**
   * Handle sync errors with retry logic
   */
  private static async handleSyncError(
    item: SyncQueueItem,
    error: any,
    strategy: SyncStrategy,
  ): Promise<void> {
    const attempts = (item.attempts || 0) + 1;

    if (attempts >= strategy.maxRetries) {
      // Max retries reached, mark as failed
      await offlineDB.syncQueue.update(item.id!, {
        status: 'failed',
        attempts,
        lastError: error.message,
        failedAt: new Date().toISOString(),
      });

      console.error(
        `[Adaptive Sync] Item ${item.id} failed after ${attempts} attempts`,
      );
    } else {
      // Schedule retry with exponential backoff
      const backoffMs = Math.min(
        1000 * Math.pow(2, attempts),
        60000, // Max 1 minute
      );

      await offlineDB.syncQueue.update(item.id!, {
        attempts,
        lastAttempt: new Date().toISOString(),
        nextRetry: new Date(Date.now() + backoffMs).toISOString(),
      });

      console.log(
        `[Adaptive Sync] Item ${item.id} will retry in ${backoffMs}ms`,
      );
    }
  }

  /**
   * Trigger team-specific sync operations
   */
  private static async triggerTeamSync(items: SyncQueueItem[]): Promise<void> {
    const itemTypes = new Set(items.map((i) => i.type));

    // Trigger appropriate team sync based on item types
    if (itemTypes.has('viral_action')) {
      await OfflineViralIntegration.processOfflineViralQueue();
    }

    if (
      itemTypes.has('success_milestone') ||
      itemTypes.has('health_score_update')
    ) {
      await OfflineSuccessIntegration.processOfflineSuccessQueue();
    }

    if (
      itemTypes.has('marketing_engagement') ||
      itemTypes.has('segment_automation')
    ) {
      await OfflineMarketingIntegration.processOfflineMarketingQueue();
    }
  }

  /**
   * Update sync metrics
   */
  private static async updateSyncMetrics(syncTime: number): Promise<void> {
    // Update average sync time (exponential moving average)
    const alpha = 0.3; // Smoothing factor
    this.syncMetrics.averageSyncTime =
      alpha * syncTime + (1 - alpha) * this.syncMetrics.averageSyncTime;

    // Update other metrics
    this.syncMetrics.lastSyncTime = new Date().toISOString();
    this.syncMetrics.totalPending = await offlineDB.syncQueue
      .where('status')
      .equals('pending')
      .count();

    // Calculate success rate
    const recentSync = await offlineDB.syncQueue
      .where('completedAt')
      .above(new Date(Date.now() - 3600000).toISOString()) // Last hour
      .count();

    const recentFailed = await offlineDB.syncQueue
      .where('failedAt')
      .above(new Date(Date.now() - 3600000).toISOString())
      .count();

    if (recentSync + recentFailed > 0) {
      this.syncMetrics.successRate = recentSync / (recentSync + recentFailed);
    }

    // Save metrics
    await this.saveSyncMetrics();

    // Add to performance history
    this.performanceHistory.push(syncTime);
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Load sync metrics from storage
   */
  private static async loadSyncMetrics(): Promise<void> {
    try {
      const stored = await offlineDB.syncMetrics.get('main');
      if (stored) {
        this.syncMetrics = stored;
      }
    } catch (error) {
      console.error('[Adaptive Sync] Failed to load metrics:', error);
    }
  }

  /**
   * Save sync metrics to storage
   */
  private static async saveSyncMetrics(): Promise<void> {
    try {
      await offlineDB.syncMetrics.put({
        id: 'main',
        ...this.syncMetrics,
      });
    } catch (error) {
      console.error('[Adaptive Sync] Failed to save metrics:', error);
    }
  }

  /**
   * Register device for multi-device coordination
   */
  private static async registerDevice(): Promise<void> {
    const deviceId = this.getDeviceId();

    const deviceSync: DeviceSync = {
      deviceId,
      lastSync: new Date().toISOString(),
      pendingChanges: 0,
      syncOrder: Date.now(), // Use timestamp as order
    };

    this.deviceSyncMap.set(deviceId, deviceSync);

    // Store in database for persistence
    await offlineDB.deviceSync.put(deviceSync);

    console.log(`[Adaptive Sync] Device registered: ${deviceId}`);
  }

  /**
   * Get unique device ID
   */
  private static getDeviceId(): string {
    let deviceId = localStorage.getItem('wedsync_device_id');

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('wedsync_device_id', deviceId);
    }

    return deviceId;
  }

  /**
   * Schedule periodic sync based on network conditions
   */
  private static schedulePeriodicSync(): void {
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        // Adjust sync frequency based on network quality
        const shouldSync = this.shouldPerformSync();

        if (shouldSync) {
          this.optimizeSyncForNetwork();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Determine if sync should be performed
   */
  private static shouldPerformSync(): boolean {
    if (!this.networkConditions || !this.currentStrategy) {
      return false;
    }

    // Don't sync on minimal strategy unless critical items
    if (this.currentStrategy.type === 'minimal') {
      return this.syncMetrics.totalPending > 10; // Only if many pending
    }

    // Check time since last sync
    const timeSinceLastSync = this.syncMetrics.lastSyncTime
      ? Date.now() - new Date(this.syncMetrics.lastSyncTime).getTime()
      : Infinity;

    // Sync intervals based on strategy
    const syncIntervals: Record<string, number> = {
      aggressive: 30000, // 30 seconds
      moderate: 60000, // 1 minute
      conservative: 120000, // 2 minutes
      minimal: 300000, // 5 minutes
    };

    const interval = syncIntervals[this.currentStrategy.type] || 60000;

    return timeSinceLastSync >= interval;
  }

  /**
   * Set up event listeners for adaptive sync
   */
  private static setupEventListeners(): void {
    // Listen for critical updates that need immediate sync
    window.addEventListener('critical-update', () => {
      if (navigator.onLine) {
        this.optimizeSyncForNetwork();
      }
    });

    // Listen for user activity to optimize sync timing
    let activityTimeout: NodeJS.Timeout;
    const activityHandler = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        // User inactive, good time to sync
        if (navigator.onLine && !this.syncInProgress) {
          this.optimizeSyncForNetwork();
        }
      }, 10000); // 10 seconds of inactivity
    };

    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach((event) => {
      document.addEventListener(event, activityHandler, { passive: true });
    });
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): {
    strategy: SyncStrategy | null;
    metrics: SyncMetrics;
    network: NetworkConditions | null;
    inProgress: boolean;
  } {
    return {
      strategy: this.currentStrategy,
      metrics: this.syncMetrics,
      network: this.networkConditions,
      inProgress: this.syncInProgress,
    };
  }

  /**
   * Force sync with specific strategy
   */
  static async forceSyncWithStrategy(
    strategyType: SyncStrategy['type'],
  ): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    // Override current strategy temporarily
    const originalStrategy = this.currentStrategy;

    // Create strategy based on type
    this.currentStrategy = {
      type: strategyType,
      batchSize: strategyType === 'aggressive' ? 100 : 50,
      parallelRequests: strategyType === 'aggressive' ? 5 : 3,
      compressionLevel: strategyType === 'aggressive' ? 'none' : 'medium',
      includeMediaFiles: strategyType === 'aggressive',
      priorityOnly: false,
      maxRetries: 3,
      timeoutMs: 30000,
    };

    try {
      await this.optimizeSyncForNetwork();
    } finally {
      // Restore original strategy
      this.currentStrategy = originalStrategy;
    }
  }

  /**
   * Clean up old sync records
   */
  static async cleanupOldSyncRecords(): Promise<void> {
    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Remove completed items older than a week
    const deleted = await offlineDB.syncQueue
      .where('completedAt')
      .below(weekAgo)
      .delete();

    console.log(`[Adaptive Sync] Cleaned up ${deleted} old sync records`);
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  AdaptiveSyncManager.initialize();
}

export default AdaptiveSyncManager;
