'use client';

import {
  coreSyncEngine,
  type SyncQueueItem,
  type BatchSyncResult,
} from './core-sync-engine';
import {
  conflictResolver,
  type ConflictContext,
  type ResolvedConflict,
} from './conflict-resolver';
import {
  syncPriorityManager,
  type PriorityContext,
  type PriorityAnalysis,
} from './sync-priority-manager';
import {
  syncStatusMonitor,
  type SyncStatus,
  type ConflictAlert,
} from './sync-status-monitor';
import { offlineDB } from '@/lib/database/offline-database';
import { addSeconds, addMinutes } from 'date-fns';

/**
 * Comprehensive Sync Manager
 *
 * Main orchestrator for the WedSync offline-first synchronization system.
 * Integrates all sync components for seamless data synchronization with
 * intelligent conflict resolution and wedding day prioritization.
 */

export interface SyncManagerConfig {
  weddingId?: string;
  weddingDate?: string;
  userRole?: 'coordinator' | 'photographer' | 'vendor' | 'planner';
  userId?: string;
  isActiveCoordinator?: boolean;
  autoSyncEnabled?: boolean;
  autoSyncInterval?: number; // seconds
  conflictResolutionMode?: 'automatic' | 'manual' | 'smart';
  weddingDayMode?: boolean; // Enhanced monitoring for wedding day
}

export interface SyncManagerStatus {
  isInitialized: boolean;
  isOnline: boolean;
  isProcessing: boolean;
  lastSyncTime: string | null;
  pendingItems: number;
  failedItems: number;
  conflictItems: number;
  queueHealth: 'excellent' | 'good' | 'warning' | 'critical';
  estimatedSyncTime: number; // seconds
}

export interface ConflictResolutionRequest {
  conflictId: string;
  entityType: string;
  entityId: string;
  userResolution: 'local' | 'server' | 'custom';
  customData?: any;
  skipSimilar?: boolean;
}

export class ComprehensiveSyncManager {
  private config: SyncManagerConfig;
  private isInitialized = false;
  private autoSyncTimer?: NodeJS.Timeout;
  private conflictQueue: Map<string, ConflictContext> = new Map();
  private pendingResolutions: Map<string, ResolvedConflict> = new Map();

  // Event callbacks
  private onStatusChangeCallback?: (status: SyncManagerStatus) => void;
  private onConflictCallback?: (alert: ConflictAlert) => void;
  private onProgressCallback?: (progress: number, message: string) => void;

  constructor(config: SyncManagerConfig = {}) {
    this.config = {
      autoSyncEnabled: true,
      autoSyncInterval: 30, // 30 seconds
      conflictResolutionMode: 'smart',
      weddingDayMode: false,
      ...config,
    };

    this.setupEventListeners();
  }

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ComprehensiveSyncManager] Already initialized');
      return;
    }

    console.log('[ComprehensiveSyncManager] Initializing sync manager');

    try {
      // Initialize core components
      await this.initializeCoreComponents();

      // Setup auto-sync if enabled
      if (this.config.autoSyncEnabled) {
        this.startAutoSync();
      }

      // Enable wedding day mode if configured
      if (this.config.weddingDayMode) {
        this.enableWeddingDayMode();
      }

      this.isInitialized = true;

      // Initial sync check
      if (navigator.onLine) {
        setTimeout(() => this.performSync(), 1000);
      }

      console.log('[ComprehensiveSyncManager] Initialization complete');
    } catch (error) {
      console.error('[ComprehensiveSyncManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Add item to sync queue with intelligent prioritization
   */
  async queueSyncItem(item: {
    type: SyncQueueItem['type'];
    action: SyncQueueItem['action'];
    data: any;
    entityType?: string;
    entityId?: string;
  }): Promise<string> {
    const queueItem: Omit<
      SyncQueueItem,
      'id' | 'attempts' | 'timestamp' | 'status' | 'priority'
    > = {
      ...item,
      weddingId: this.config.weddingId,
      userId: this.config.userId,
      userRole: this.config.userRole,
      isWeddingDay: this.config.weddingDayMode,
    };

    const itemId = await coreSyncEngine.addToQueue(queueItem);

    // Update status
    this.updateSyncStatus();

    // Trigger immediate sync if high priority
    const context = this.buildPriorityContext();
    if (
      syncPriorityManager.requiresImmediateProcessing(
        {
          ...queueItem,
          id: itemId,
          attempts: 0,
          timestamp: new Date().toISOString(),
          status: 'pending',
        },
        context,
      )
    ) {
      setTimeout(() => this.performSync(), 100);
    }

    return itemId;
  }

  /**
   * Perform manual sync
   */
  async performSync(): Promise<BatchSyncResult> {
    console.log('[ComprehensiveSyncManager] Starting manual sync');

    syncStatusMonitor.recordProgress({
      type: 'batch_start',
      data: { manual: true },
    });

    try {
      // Get pending items and prioritize them
      const context = this.buildPriorityContext();
      const result = await coreSyncEngine.processSyncQueue();

      // Record completion
      syncStatusMonitor.recordSyncCompletion(result);

      // Process any conflicts that were detected
      await this.processDetectedConflicts();

      // Update overall status
      this.updateSyncStatus();

      console.log('[ComprehensiveSyncManager] Sync completed:', result);

      return result;
    } catch (error) {
      console.error('[ComprehensiveSyncManager] Sync failed:', error);

      syncStatusMonitor.recordProgress({
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(request: ConflictResolutionRequest): Promise<boolean> {
    const conflict = this.conflictQueue.get(request.conflictId);
    if (!conflict) {
      console.error(
        '[ComprehensiveSyncManager] Conflict not found:',
        request.conflictId,
      );
      return false;
    }

    try {
      console.log(
        '[ComprehensiveSyncManager] Resolving conflict manually:',
        request.conflictId,
      );

      // Apply user resolution to conflict context
      const resolvedContext = this.applyUserResolution(conflict, request);

      // Get resolution from conflict resolver
      const resolution =
        await conflictResolver.resolveConflict(resolvedContext);

      // Apply the resolution
      await this.applyConflictResolution(resolution);

      // Remove from conflict queue
      this.conflictQueue.delete(request.conflictId);

      // If user wants to skip similar conflicts, update resolution patterns
      if (request.skipSimilar) {
        await this.learnFromResolution(resolution, request);
      }

      console.log('[ComprehensiveSyncManager] Conflict resolved successfully');

      return true;
    } catch (error) {
      console.error(
        '[ComprehensiveSyncManager] Failed to resolve conflict:',
        error,
      );
      return false;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncManagerStatus {
    const coreStatus = syncStatusMonitor.getStatus();
    const metrics = syncStatusMonitor.getMetrics();

    // Calculate queue health
    const queueHealth = this.calculateQueueHealth(coreStatus, metrics);

    return {
      isInitialized: this.isInitialized,
      isOnline: coreStatus.isOnline,
      isProcessing: coreStatus.isProcessing,
      lastSyncTime: coreStatus.lastSyncTime,
      pendingItems: coreStatus.totalPending,
      failedItems: coreStatus.totalFailed,
      conflictItems: coreStatus.totalConflicts,
      queueHealth,
      estimatedSyncTime: this.estimateSyncTime(coreStatus),
    };
  }

  /**
   * Get pending conflicts that need user attention
   */
  getPendingConflicts(): ConflictAlert[] {
    return syncStatusMonitor
      .getConflictAlerts()
      .filter(
        (alert) =>
          alert.requiresImmediateAttention || alert.severity === 'critical',
      );
  }

  /**
   * Set up event callbacks
   */
  onStatusChange(callback: (status: SyncManagerStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  onConflictDetected(callback: (alert: ConflictAlert) => void): void {
    this.onConflictCallback = callback;
  }

  onProgress(callback: (progress: number, message: string) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Enable/disable auto-sync
   */
  setAutoSyncEnabled(enabled: boolean): void {
    this.config.autoSyncEnabled = enabled;

    if (enabled && this.isInitialized) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SyncManagerConfig>): void {
    this.config = { ...this.config, ...updates };

    // Apply configuration changes
    if (updates.weddingDayMode !== undefined) {
      if (updates.weddingDayMode) {
        this.enableWeddingDayMode();
      } else {
        this.disableWeddingDayMode();
      }
    }

    if (updates.autoSyncInterval && this.config.autoSyncEnabled) {
      this.startAutoSync(); // Restart with new interval
    }
  }

  /**
   * Get sync statistics for monitoring
   */
  getStatistics(): {
    metrics: any;
    queueStats: any;
    networkQuality: any;
    recentActivity: any[];
  } {
    const context = this.buildPriorityContext();

    return {
      metrics: syncStatusMonitor.getMetrics(),
      queueStats: {}, // Would get from priority manager
      networkQuality: syncStatusMonitor.getNetworkMetrics(),
      recentActivity: syncStatusMonitor.getRecentProgress(20),
    };
  }

  /**
   * Force conflict resolution mode
   */
  setConflictResolutionMode(mode: 'automatic' | 'manual' | 'smart'): void {
    this.config.conflictResolutionMode = mode;
    console.log(
      `[ComprehensiveSyncManager] Conflict resolution mode set to: ${mode}`,
    );
  }

  /**
   * Private implementation methods
   */
  private async initializeCoreComponents(): Promise<void> {
    // Initialize offline database if needed
    try {
      await offlineDB.initializeDatabase();
    } catch (error) {
      console.warn(
        '[ComprehensiveSyncManager] Database initialization warning:',
        error,
      );
    }

    // Set up sync engine event handlers
    coreSyncEngine.onConflict(this.handleConflictDetected.bind(this));
    coreSyncEngine.onSyncProgress(this.handleSyncProgress.bind(this));
    coreSyncEngine.onConnectionChange(this.handleConnectionChange.bind(this));
  }

  private setupEventListeners(): void {
    // Status monitor events
    syncStatusMonitor.on('conflictAlert', this.handleConflictAlert.bind(this));
    syncStatusMonitor.on('statusChange', this.handleStatusChange.bind(this));
    syncStatusMonitor.on('progress', this.handleProgressUpdate.bind(this));
  }

  private buildPriorityContext(): PriorityContext {
    return {
      weddingId: this.config.weddingId,
      weddingDate: this.config.weddingDate,
      currentTime: new Date().toISOString(),
      userRole: this.config.userRole,
      userId: this.config.userId,
      isActiveCoordinator: this.config.isActiveCoordinator,
      locationContext: 'mobile', // Could be determined from GPS/context
    };
  }

  private async processDetectedConflicts(): Promise<void> {
    const pendingConflicts = Array.from(this.conflictQueue.values());

    for (const conflict of pendingConflicts) {
      try {
        if (
          this.config.conflictResolutionMode === 'automatic' ||
          (this.config.conflictResolutionMode === 'smart' &&
            !this.config.weddingDayMode)
        ) {
          const resolution = await conflictResolver.resolveConflict(conflict);

          if (resolution.automaticResolution) {
            await this.applyConflictResolution(resolution);
            this.conflictQueue.delete(conflict.entityId);
          }
        }
      } catch (error) {
        console.error(
          '[ComprehensiveSyncManager] Failed to process conflict:',
          error,
        );
      }
    }
  }

  private applyUserResolution(
    conflict: ConflictContext,
    request: ConflictResolutionRequest,
  ): ConflictContext {
    // Modify conflict context based on user's resolution choice
    const modifiedFields = conflict.conflictFields.map((field) => ({
      ...field,
      localValue:
        request.userResolution === 'local'
          ? field.localValue
          : request.userResolution === 'server'
            ? field.serverValue
            : (request.customData?.[field.field] ?? field.localValue),
    }));

    return {
      ...conflict,
      conflictFields: modifiedFields,
    };
  }

  private async applyConflictResolution(
    resolution: ResolvedConflict,
  ): Promise<void> {
    // Apply the resolved data back to the local store and queue for sync
    console.log(
      '[ComprehensiveSyncManager] Applying conflict resolution:',
      resolution.entityId,
    );

    // Store the resolution for tracking
    this.pendingResolutions.set(resolution.entityId, resolution);

    // Queue the resolved data for sync
    await this.queueSyncItem({
      type: 'client_update',
      action: 'update',
      data: resolution.mergedData,
      entityType: resolution.entityType,
      entityId: resolution.entityId,
    });
  }

  private async learnFromResolution(
    resolution: ResolvedConflict,
    request: ConflictResolutionRequest,
  ): Promise<void> {
    // TODO: Implement machine learning from user decisions
    console.log('[ComprehensiveSyncManager] Learning from resolution pattern');
  }

  private calculateQueueHealth(
    status: SyncStatus,
    metrics: any,
  ): 'excellent' | 'good' | 'warning' | 'critical' {
    if (!status.isOnline) return 'warning';
    if (status.totalFailed > 10) return 'critical';
    if (status.totalConflicts > 5) return 'warning';
    if (metrics.successRate < 0.8) return 'warning';
    if (status.totalPending > 50) return 'warning';
    return status.totalPending > 20 ? 'good' : 'excellent';
  }

  private estimateSyncTime(status: SyncStatus): number {
    if (!status.isOnline) return -1;
    if (status.totalPending === 0) return 0;

    // Rough estimate: 200ms per item average
    const baseTime = status.totalPending * 0.2;

    // Adjust for network quality
    const networkMultiplier =
      status.networkQuality === 'excellent'
        ? 1
        : status.networkQuality === 'good'
          ? 1.5
          : status.networkQuality === 'poor'
            ? 3
            : 1;

    return Math.ceil(baseTime * networkMultiplier);
  }

  private startAutoSync(): void {
    this.stopAutoSync(); // Clear any existing timer

    const intervalMs = (this.config.autoSyncInterval || 30) * 1000;
    this.autoSyncTimer = setInterval(async () => {
      if (!navigator.onLine || syncStatusMonitor.getStatus().isProcessing) {
        return;
      }

      try {
        await this.performSync();
      } catch (error) {
        console.error('[ComprehensiveSyncManager] Auto-sync failed:', error);
      }
    }, intervalMs);

    console.log(
      `[ComprehensiveSyncManager] Auto-sync enabled (${this.config.autoSyncInterval}s interval)`,
    );
  }

  private stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = undefined;
    }
  }

  private enableWeddingDayMode(): void {
    console.log(
      '[ComprehensiveSyncManager] Wedding day mode enabled - enhanced monitoring active',
    );

    // Reduce auto-sync interval for wedding day
    this.config.autoSyncInterval = 15; // 15 seconds

    // Set conflict resolution to manual for safety
    this.config.conflictResolutionMode = 'manual';

    if (this.config.autoSyncEnabled) {
      this.startAutoSync();
    }
  }

  private disableWeddingDayMode(): void {
    console.log('[ComprehensiveSyncManager] Wedding day mode disabled');

    // Restore normal auto-sync interval
    this.config.autoSyncInterval = 30; // 30 seconds

    // Restore smart conflict resolution
    this.config.conflictResolutionMode = 'smart';

    if (this.config.autoSyncEnabled) {
      this.startAutoSync();
    }
  }

  private updateSyncStatus(): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(this.getSyncStatus());
    }
  }

  // Event handlers
  private handleConflictDetected(conflictData: any): void {
    const conflictId = `conflict-${Date.now()}-${conflictData.entityId}`;

    const conflict: ConflictContext = {
      entityType: conflictData.entityType,
      entityId: conflictData.entityId,
      weddingId: this.config.weddingId,
      isWeddingDay: this.config.weddingDayMode,
      activeWeddingDate: this.config.weddingDate,
      currentUserRole: this.config.userRole,
      conflictTimestamp: new Date().toISOString(),
      localVersion: conflictData.localVersion || 1,
      serverVersion: conflictData.serverVersion || 1,
      conflictFields: conflictData.conflictFields || [],
    };

    this.conflictQueue.set(conflictId, conflict);

    console.log(
      '[ComprehensiveSyncManager] Conflict detected and queued:',
      conflictId,
    );
  }

  private handleSyncProgress(progress: number, status: string): void {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress, status);
    }
  }

  private handleConnectionChange(isOnline: boolean): void {
    console.log(
      `[ComprehensiveSyncManager] Connection changed: ${isOnline ? 'online' : 'offline'}`,
    );

    if (isOnline) {
      // Trigger sync when connection is restored
      setTimeout(() => this.performSync(), 2000);
    }

    this.updateSyncStatus();
  }

  private handleConflictAlert(alert: ConflictAlert): void {
    console.log('[ComprehensiveSyncManager] Conflict alert:', alert.message);

    if (this.onConflictCallback) {
      this.onConflictCallback(alert);
    }
  }

  private handleStatusChange(statusData: any): void {
    this.updateSyncStatus();
  }

  private handleProgressUpdate(progressData: any): void {
    if (progressData.type === 'progress' && this.onProgressCallback) {
      this.onProgressCallback(
        progressData.data.progress || 0,
        progressData.data.status || 'Processing...',
      );
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoSync();

    // Clean up event listeners
    syncStatusMonitor.removeAllListeners();
    coreSyncEngine.destroy();
    syncStatusMonitor.destroy();

    // Clear queues
    this.conflictQueue.clear();
    this.pendingResolutions.clear();

    this.isInitialized = false;
    console.log('[ComprehensiveSyncManager] Sync manager destroyed');
  }
}

// Singleton instance for global use
export const comprehensiveSyncManager = new ComprehensiveSyncManager();
