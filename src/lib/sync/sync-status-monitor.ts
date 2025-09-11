'use client';

import { EventEmitter } from 'events';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Sync Status Monitoring System
 *
 * Provides real-time sync progress tracking, conflict alerts,
 * and comprehensive status monitoring for the sync engine
 */

export interface SyncStatus {
  isOnline: boolean;
  isProcessing: boolean;
  lastSyncTime: string | null;
  nextSyncTime: string | null;
  totalPending: number;
  totalFailed: number;
  totalConflicts: number;
  currentBatch?: {
    processed: number;
    total: number;
    progress: number; // 0-100
    status: string;
  };
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
  syncSpeed: 'fast' | 'normal' | 'slow';
  estimatedCompletion?: string;
}

export interface SyncProgressEvent {
  type:
    | 'progress'
    | 'batch_start'
    | 'batch_complete'
    | 'item_processed'
    | 'conflict_detected'
    | 'error';
  timestamp: string;
  data: any;
  batchId?: string;
  itemId?: string;
}

export interface SyncMetrics {
  totalSynced: number;
  totalFailed: number;
  totalConflicts: number;
  averageProcessingTime: number; // ms per item
  successRate: number; // 0-1
  conflictRate: number; // 0-1
  networkUptime: number; // 0-1
  lastHourStats: {
    synced: number;
    failed: number;
    conflicts: number;
  };
  performance: {
    fastestSync: number;
    slowestSync: number;
    averageSync: number;
  };
}

export interface ConflictAlert {
  id: string;
  entityType: string;
  entityId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  conflictFields: string[];
  timestamp: string;
  isWeddingDayRelated: boolean;
  requiresImmediateAttention: boolean;
  suggestedAction: string;
}

export interface NetworkQualityMetrics {
  latency: number; // ms
  throughput: number; // items/second
  errorRate: number; // 0-1
  connectionStability: number; // 0-1
  lastCheck: string;
}

export class SyncStatusMonitor extends EventEmitter {
  private status: SyncStatus;
  private metrics: SyncMetrics;
  private networkMetrics: NetworkQualityMetrics;
  private progressEvents: SyncProgressEvent[] = [];
  private conflictAlerts: ConflictAlert[] = [];
  private networkCheckInterval?: NodeJS.Timeout;
  private metricsUpdateInterval?: NodeJS.Timeout;
  private maxEventHistory = 1000;
  private maxConflictAlerts = 50;

  constructor() {
    super();

    this.status = {
      isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
      isProcessing: false,
      lastSyncTime: null,
      nextSyncTime: null,
      totalPending: 0,
      totalFailed: 0,
      totalConflicts: 0,
      networkQuality: 'good',
      syncSpeed: 'normal',
    };

    this.metrics = {
      totalSynced: 0,
      totalFailed: 0,
      totalConflicts: 0,
      averageProcessingTime: 0,
      successRate: 1.0,
      conflictRate: 0.0,
      networkUptime: 1.0,
      lastHourStats: { synced: 0, failed: 0, conflicts: 0 },
      performance: { fastestSync: 0, slowestSync: 0, averageSync: 0 },
    };

    this.networkMetrics = {
      latency: 0,
      throughput: 0,
      errorRate: 0,
      connectionStability: 1.0,
      lastCheck: new Date().toISOString(),
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring systems
   */
  private initializeMonitoring(): void {
    if (typeof window !== 'undefined') {
      // Network status monitoring
      window.addEventListener('online', this.handleNetworkOnline.bind(this));
      window.addEventListener('offline', this.handleNetworkOffline.bind(this));

      // Start periodic network quality checks
      this.startNetworkQualityChecks();

      // Start metrics updates
      this.startMetricsUpdates();
    }
  }

  /**
   * Update sync status
   */
  updateStatus(updates: Partial<SyncStatus>): void {
    const previousStatus = { ...this.status };
    this.status = { ...this.status, ...updates };

    // Emit status change event
    this.emit('statusChange', {
      previous: previousStatus,
      current: this.status,
      timestamp: new Date().toISOString(),
    });

    // Check for significant changes
    if (previousStatus.isProcessing !== this.status.isProcessing) {
      this.emit(
        this.status.isProcessing ? 'syncStarted' : 'syncCompleted',
        this.status,
      );
    }

    if (previousStatus.totalConflicts !== this.status.totalConflicts) {
      this.emit('conflictsUpdated', {
        previous: previousStatus.totalConflicts,
        current: this.status.totalConflicts,
      });
    }
  }

  /**
   * Record sync progress event
   */
  recordProgress(event: Omit<SyncProgressEvent, 'timestamp'>): void {
    const progressEvent: SyncProgressEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to event history
    this.progressEvents.push(progressEvent);

    // Maintain event history size
    if (this.progressEvents.length > this.maxEventHistory) {
      this.progressEvents = this.progressEvents.slice(-this.maxEventHistory);
    }

    // Emit progress event
    this.emit('progress', progressEvent);

    // Update status based on event
    this.updateStatusFromEvent(progressEvent);

    // Log significant events
    if (event.type === 'conflict_detected' || event.type === 'error') {
      console.warn('[SyncStatusMonitor] Significant event:', progressEvent);
    }
  }

  /**
   * Add conflict alert
   */
  addConflictAlert(alert: Omit<ConflictAlert, 'id' | 'timestamp'>): string {
    const conflictAlert: ConflictAlert = {
      ...alert,
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.conflictAlerts.push(conflictAlert);

    // Maintain alert history size
    if (this.conflictAlerts.length > this.maxConflictAlerts) {
      this.conflictAlerts = this.conflictAlerts.slice(-this.maxConflictAlerts);
    }

    // Emit alert
    this.emit('conflictAlert', conflictAlert);

    // Update metrics
    this.metrics.totalConflicts++;
    this.updateConflictRate();

    console.log(
      `[SyncStatusMonitor] Conflict alert: ${alert.message}`,
      conflictAlert,
    );

    return conflictAlert.id;
  }

  /**
   * Record sync completion metrics
   */
  recordSyncCompletion(result: {
    totalProcessed: number;
    successful: number;
    failed: number;
    conflicts: number;
    processingTime: number;
    batchId?: string;
  }): void {
    const startTime = Date.now();

    // Update metrics
    this.metrics.totalSynced += result.successful;
    this.metrics.totalFailed += result.failed;
    this.metrics.totalConflicts += result.conflicts;

    // Update processing time average
    if (result.totalProcessed > 0) {
      const timePerItem = result.processingTime / result.totalProcessed;
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime + timePerItem) / 2;
    }

    // Update success rate
    const totalAttempts = this.metrics.totalSynced + this.metrics.totalFailed;
    if (totalAttempts > 0) {
      this.metrics.successRate = this.metrics.totalSynced / totalAttempts;
    }

    // Update conflict rate
    this.updateConflictRate();

    // Update performance stats
    this.updatePerformanceStats(result.processingTime);

    // Update last hour stats (simplified - would need proper time window tracking)
    this.metrics.lastHourStats.synced += result.successful;
    this.metrics.lastHourStats.failed += result.failed;
    this.metrics.lastHourStats.conflicts += result.conflicts;

    // Update sync speed assessment
    this.updateSyncSpeedAssessment(
      result.processingTime,
      result.totalProcessed,
    );

    // Record completion event
    this.recordProgress({
      type: 'batch_complete',
      data: result,
      batchId: result.batchId,
    });

    // Update status
    this.updateStatus({
      lastSyncTime: new Date().toISOString(),
      totalPending: Math.max(0, this.status.totalPending - result.successful),
      totalFailed: this.metrics.totalFailed,
      totalConflicts: this.metrics.totalConflicts,
    });

    console.log('[SyncStatusMonitor] Sync completion recorded:', result);
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Get current metrics
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent progress events
   */
  getRecentProgress(limit: number = 50): SyncProgressEvent[] {
    return this.progressEvents.slice(-limit);
  }

  /**
   * Get active conflict alerts
   */
  getConflictAlerts(severity?: ConflictAlert['severity']): ConflictAlert[] {
    let alerts = [...this.conflictAlerts];

    if (severity) {
      alerts = alerts.filter((alert) => alert.severity === severity);
    }

    // Sort by severity and timestamp
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return alerts.sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Get network quality metrics
   */
  getNetworkMetrics(): NetworkQualityMetrics {
    return { ...this.networkMetrics };
  }

  /**
   * Dismiss conflict alert
   */
  dismissConflictAlert(alertId: string): boolean {
    const index = this.conflictAlerts.findIndex(
      (alert) => alert.id === alertId,
    );
    if (index === -1) return false;

    const dismissedAlert = this.conflictAlerts[index];
    this.conflictAlerts.splice(index, 1);

    this.emit('conflictDismissed', dismissedAlert);
    return true;
  }

  /**
   * Generate status summary for UI
   */
  getStatusSummary(): {
    overall: 'excellent' | 'good' | 'warning' | 'error' | 'offline';
    message: string;
    details: string[];
    requiresAttention: boolean;
    criticalAlerts: number;
  } {
    if (!this.status.isOnline) {
      return {
        overall: 'offline',
        message: 'Working offline - changes will sync when connected',
        details: [`${this.status.totalPending} pending changes`],
        requiresAttention: false,
        criticalAlerts: 0,
      };
    }

    const criticalAlerts = this.conflictAlerts.filter(
      (alert) =>
        alert.severity === 'critical' || alert.requiresImmediateAttention,
    ).length;

    if (criticalAlerts > 0) {
      return {
        overall: 'error',
        message: `${criticalAlerts} critical conflict${criticalAlerts !== 1 ? 's' : ''} need attention`,
        details: [
          `${criticalAlerts} critical conflicts`,
          `${this.status.totalFailed} failed syncs`,
          `Success rate: ${(this.metrics.successRate * 100).toFixed(1)}%`,
        ],
        requiresAttention: true,
        criticalAlerts,
      };
    }

    if (this.status.totalFailed > 0 || this.metrics.successRate < 0.9) {
      return {
        overall: 'warning',
        message: 'Some sync issues detected',
        details: [
          `${this.status.totalFailed} failed syncs`,
          `${this.status.totalConflicts} conflicts`,
          `Success rate: ${(this.metrics.successRate * 100).toFixed(1)}%`,
        ],
        requiresAttention: this.status.totalFailed > 5,
        criticalAlerts,
      };
    }

    if (this.status.isProcessing) {
      const progress = this.status.currentBatch?.progress || 0;
      return {
        overall: 'good',
        message: `Syncing... ${progress.toFixed(0)}% complete`,
        details: [
          this.status.currentBatch?.status || 'Processing',
          `Network: ${this.status.networkQuality}`,
          `Speed: ${this.status.syncSpeed}`,
        ],
        requiresAttention: false,
        criticalAlerts,
      };
    }

    // All good
    const lastSyncText = this.status.lastSyncTime
      ? formatDistanceToNow(new Date(this.status.lastSyncTime), {
          addSuffix: true,
        })
      : 'never';

    return {
      overall: 'excellent',
      message: 'All changes synced',
      details: [
        `Last sync: ${lastSyncText}`,
        `Success rate: ${(this.metrics.successRate * 100).toFixed(1)}%`,
        `Network: ${this.status.networkQuality}`,
      ],
      requiresAttention: false,
      criticalAlerts,
    };
  }

  /**
   * Private methods
   */
  private updateStatusFromEvent(event: SyncProgressEvent): void {
    switch (event.type) {
      case 'batch_start':
        this.updateStatus({
          isProcessing: true,
          currentBatch: {
            processed: 0,
            total: event.data.total || 0,
            progress: 0,
            status: 'Starting batch...',
          },
        });
        break;

      case 'progress':
        if (this.status.currentBatch) {
          const progress = event.data.progress || 0;
          this.updateStatus({
            currentBatch: {
              ...this.status.currentBatch,
              progress,
              status: event.data.status || 'Processing...',
            },
          });
        }
        break;

      case 'item_processed':
        if (this.status.currentBatch) {
          const processed = this.status.currentBatch.processed + 1;
          const progress = (processed / this.status.currentBatch.total) * 100;

          this.updateStatus({
            currentBatch: {
              ...this.status.currentBatch,
              processed,
              progress,
              status: `Processed ${processed} of ${this.status.currentBatch.total} items`,
            },
          });
        }
        break;

      case 'batch_complete':
        this.updateStatus({
          isProcessing: false,
          currentBatch: undefined,
        });
        break;

      case 'conflict_detected':
        // Create conflict alert
        this.addConflictAlert({
          entityType: event.data.entityType || 'unknown',
          entityId: event.data.entityId || 'unknown',
          severity: event.data.severity || 'medium',
          message: event.data.message || 'Conflict detected',
          conflictFields: event.data.conflictFields || [],
          isWeddingDayRelated: event.data.isWeddingDayRelated || false,
          requiresImmediateAttention:
            event.data.requiresImmediateAttention || false,
          suggestedAction:
            event.data.suggestedAction || 'Review and resolve manually',
        });
        break;
    }
  }

  private updateConflictRate(): void {
    const totalSyncAttempts =
      this.metrics.totalSynced + this.metrics.totalFailed;
    if (totalSyncAttempts > 0) {
      this.metrics.conflictRate =
        this.metrics.totalConflicts / totalSyncAttempts;
    }
  }

  private updatePerformanceStats(processingTime: number): void {
    const { performance } = this.metrics;

    if (
      performance.fastestSync === 0 ||
      processingTime < performance.fastestSync
    ) {
      performance.fastestSync = processingTime;
    }

    if (processingTime > performance.slowestSync) {
      performance.slowestSync = processingTime;
    }

    performance.averageSync = (performance.averageSync + processingTime) / 2;
  }

  private updateSyncSpeedAssessment(
    processingTime: number,
    itemCount: number,
  ): void {
    if (itemCount === 0) return;

    const timePerItem = processingTime / itemCount;

    // Assess speed based on time per item
    if (timePerItem < 100) {
      // < 100ms per item
      this.status.syncSpeed = 'fast';
    } else if (timePerItem < 500) {
      // < 500ms per item
      this.status.syncSpeed = 'normal';
    } else {
      this.status.syncSpeed = 'slow';
    }
  }

  private startNetworkQualityChecks(): void {
    this.networkCheckInterval = setInterval(async () => {
      await this.checkNetworkQuality();
    }, 30000); // Check every 30 seconds
  }

  private async checkNetworkQuality(): Promise<void> {
    if (!navigator.onLine) {
      this.networkMetrics = {
        ...this.networkMetrics,
        latency: -1,
        throughput: 0,
        errorRate: 1.0,
        connectionStability: 0.0,
        lastCheck: new Date().toISOString(),
      };

      this.updateStatus({ networkQuality: 'offline' });
      return;
    }

    try {
      // Simple ping test (in real implementation, use actual API endpoint)
      const startTime = Date.now();
      await fetch('/api/ping', { cache: 'no-cache' });
      const latency = Date.now() - startTime;

      this.networkMetrics = {
        ...this.networkMetrics,
        latency,
        connectionStability: Math.min(
          1.0,
          this.networkMetrics.connectionStability + 0.1,
        ),
        lastCheck: new Date().toISOString(),
      };

      // Assess network quality
      let quality: SyncStatus['networkQuality'];
      if (latency < 100) {
        quality = 'excellent';
      } else if (latency < 300) {
        quality = 'good';
      } else {
        quality = 'poor';
      }

      this.updateStatus({ networkQuality: quality });
    } catch (error) {
      this.networkMetrics = {
        ...this.networkMetrics,
        connectionStability: Math.max(
          0.0,
          this.networkMetrics.connectionStability - 0.2,
        ),
        errorRate: Math.min(1.0, this.networkMetrics.errorRate + 0.1),
        lastCheck: new Date().toISOString(),
      };

      this.updateStatus({ networkQuality: 'poor' });
    }
  }

  private startMetricsUpdates(): void {
    this.metricsUpdateInterval = setInterval(() => {
      // Reset hourly stats (simplified - would need proper time windowing)
      this.metrics.lastHourStats = { synced: 0, failed: 0, conflicts: 0 };

      // Emit metrics update
      this.emit('metricsUpdated', this.metrics);
    }, 60000); // Update every minute
  }

  private handleNetworkOnline(): void {
    this.updateStatus({ isOnline: true });
    this.emit('networkStatusChanged', {
      isOnline: true,
      timestamp: new Date().toISOString(),
    });
    console.log('[SyncStatusMonitor] Network connection restored');
  }

  private handleNetworkOffline(): void {
    this.updateStatus({ isOnline: false, networkQuality: 'offline' });
    this.emit('networkStatusChanged', {
      isOnline: false,
      timestamp: new Date().toISOString(),
    });
    console.log('[SyncStatusMonitor] Network connection lost');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }

    this.removeAllListeners();

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkOnline);
      window.removeEventListener('offline', this.handleNetworkOffline);
    }
  }
}

// Singleton instance
export const syncStatusMonitor = new SyncStatusMonitor();
