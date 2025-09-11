/**
 * Offline Viral Optimization Integration
 * Seamless viral tracking and referral management in offline mode
 *
 * Features:
 * - Offline viral action tracking
 * - Queue management for viral events
 * - Local metrics calculation
 * - Intelligent sync with Team B's viral system
 * - Conflict-free viral attribution
 */

import { offlineDB, type SyncQueueItem } from './offline-database';
import type { ViralAction, ViralMetrics, ReferralData } from '@/types/viral';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface OfflineViralAction {
  id: string;
  actorId: string;
  recipientEmail: string;
  actionType:
    | 'sent_invite'
    | 'accepted_invite'
    | 'shared_social'
    | 'referred_vendor';
  context: {
    weddingId?: string;
    vendorId?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
  syncStatus: 'pending' | 'syncing' | 'completed' | 'failed';
  attempts?: number;
  lastAttempt?: string;
}

export interface OfflineViralMetrics {
  supplierId: string;
  totalInvitesSent: number;
  totalInvitesAccepted: number;
  viralCoefficient: number;
  referralScore: number;
  lastUpdated: string;
  pendingSyncActions: number;
}

export interface ViralSyncBatch {
  batchId: string;
  actions: OfflineViralAction[];
  priority: number;
  createdAt: string;
  syncAttempts: number;
}

// =====================================================
// OFFLINE VIRAL INTEGRATION CLASS
// =====================================================

export class OfflineViralIntegration {
  private static metricsCache = new Map<string, OfflineViralMetrics>();
  private static syncInProgress = false;
  private static batchProcessor: NodeJS.Timeout | null = null;

  /**
   * Track viral action offline with intelligent queuing
   */
  static async trackViralActionOffline(
    actorId: string,
    recipientEmail: string,
    actionType:
      | 'sent_invite'
      | 'accepted_invite'
      | 'shared_social'
      | 'referred_vendor',
    context: any,
  ): Promise<void> {
    try {
      // Generate unique ID for tracking
      const viralAction: OfflineViralAction = {
        id: crypto.randomUUID(),
        actorId,
        recipientEmail,
        actionType,
        context,
        timestamp: new Date().toISOString(),
        syncStatus: 'pending',
        attempts: 0,
      };

      // Store in offline viral actions table
      await offlineDB.viralActions.add(viralAction);

      // Queue for sync with appropriate priority
      const priority = this.calculateViralPriority(actionType, context);

      await offlineDB.syncQueue.add({
        type: 'viral_action',
        action: 'create',
        data: viralAction,
        attempts: 0,
        timestamp: new Date().toISOString(),
        status: 'pending',
        priority,
        userId: actorId,
        metadata: {
          batchable: true,
          maxBatchSize: 50,
          urgency: this.calculateUrgency(actionType),
        },
      });

      // Update local viral metrics optimistically
      await this.updateLocalViralMetrics(actorId, actionType);

      // Trigger opportunistic sync if online
      if (navigator.onLine) {
        this.scheduleOpportunisticSync();
      }

      console.log(
        `[Offline Viral] Action tracked: ${actionType} by ${actorId}`,
      );
    } catch (error) {
      console.error('[Offline Viral] Failed to track action:', error);
      throw error;
    }
  }

  /**
   * Calculate priority for viral actions
   */
  private static calculateViralPriority(
    actionType: string,
    context: any,
  ): number {
    let priority = 5; // Base priority

    // Accepted invites are high priority (conversion events)
    if (actionType === 'accepted_invite') priority += 3;

    // Vendor referrals are valuable
    if (actionType === 'referred_vendor') priority += 2;

    // Campaign-related actions get boost
    if (context.campaign) priority += 1;

    // Near wedding date increases priority
    if (context.weddingProximity && context.weddingProximity < 30) {
      priority += 2;
    }

    return Math.min(10, priority); // Cap at 10
  }

  /**
   * Calculate urgency for sync timing
   */
  private static calculateUrgency(
    actionType: string,
  ): 'low' | 'medium' | 'high' {
    switch (actionType) {
      case 'accepted_invite':
        return 'high'; // Need to track conversions quickly
      case 'referred_vendor':
        return 'high'; // Revenue-generating action
      case 'sent_invite':
        return 'medium'; // Important but can batch
      default:
        return 'low';
    }
  }

  /**
   * Update local viral metrics optimistically
   */
  private static async updateLocalViralMetrics(
    supplierId: string,
    actionType: string,
  ): Promise<void> {
    try {
      // Get or create metrics
      let metrics = this.metricsCache.get(supplierId);

      if (!metrics) {
        // Load from database or create new
        const stored = await offlineDB.viralMetrics
          .where('supplierId')
          .equals(supplierId)
          .first();

        metrics = stored || {
          supplierId,
          totalInvitesSent: 0,
          totalInvitesAccepted: 0,
          viralCoefficient: 0,
          referralScore: 0,
          lastUpdated: new Date().toISOString(),
          pendingSyncActions: 0,
        };
      }

      // Update metrics based on action
      switch (actionType) {
        case 'sent_invite':
          metrics.totalInvitesSent++;
          break;
        case 'accepted_invite':
          metrics.totalInvitesAccepted++;
          // Recalculate viral coefficient
          if (metrics.totalInvitesSent > 0) {
            metrics.viralCoefficient =
              metrics.totalInvitesAccepted / metrics.totalInvitesSent;
          }
          metrics.referralScore += 10; // Boost score for conversion
          break;
        case 'referred_vendor':
          metrics.referralScore += 25; // High value action
          break;
        case 'shared_social':
          metrics.referralScore += 5;
          break;
      }

      metrics.lastUpdated = new Date().toISOString();
      metrics.pendingSyncActions++;

      // Update cache and database
      this.metricsCache.set(supplierId, metrics);
      await offlineDB.viralMetrics.put(metrics);
    } catch (error) {
      console.error('[Offline Viral] Failed to update metrics:', error);
    }
  }

  /**
   * Process offline viral queue with intelligent batching
   */
  static async processOfflineViralQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[Offline Viral] Sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      // Get pending viral actions sorted by priority
      const viralActions = await offlineDB.syncQueue
        .where('type')
        .equals('viral_action')
        .and((item) => item.status === 'pending')
        .reverse() // Sort by priority (highest first)
        .limit(100) // Process max 100 at a time
        .toArray();

      if (viralActions.length === 0) {
        console.log('[Offline Viral] No pending viral actions');
        return;
      }

      // Group actions into intelligent batches
      const batches = this.createIntelligentBatches(viralActions);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      console.log(
        `[Offline Viral] Processed ${viralActions.length} actions in ${batches.length} batches`,
      );
    } catch (error) {
      console.error('[Offline Viral] Queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Create intelligent batches based on action type and priority
   */
  private static createIntelligentBatches(
    actions: SyncQueueItem[],
  ): ViralSyncBatch[] {
    const batches: ViralSyncBatch[] = [];
    const batchMap = new Map<string, SyncQueueItem[]>();

    // Group by urgency and action type
    actions.forEach((action) => {
      const urgency = action.metadata?.urgency || 'medium';
      const actionType = (action.data as OfflineViralAction).actionType;
      const key = `${urgency}_${actionType}`;

      if (!batchMap.has(key)) {
        batchMap.set(key, []);
      }

      const batch = batchMap.get(key)!;

      // Respect max batch size
      const maxSize = action.metadata?.maxBatchSize || 50;
      if (batch.length < maxSize) {
        batch.push(action);
      } else {
        // Start new batch
        batchMap.set(`${key}_${Date.now()}`, [action]);
      }
    });

    // Convert to batch objects
    batchMap.forEach((items, key) => {
      const [urgency] = key.split('_');
      const priority = urgency === 'high' ? 9 : urgency === 'medium' ? 6 : 3;

      batches.push({
        batchId: crypto.randomUUID(),
        actions: items.map((item) => item.data as OfflineViralAction),
        priority,
        createdAt: new Date().toISOString(),
        syncAttempts: 0,
      });
    });

    // Sort batches by priority
    batches.sort((a, b) => b.priority - a.priority);

    return batches;
  }

  /**
   * Process a single batch of viral actions
   */
  private static async processBatch(batch: ViralSyncBatch): Promise<void> {
    try {
      console.log(
        `[Offline Viral] Processing batch ${batch.batchId} with ${batch.actions.length} actions`,
      );

      // Prepare batch payload
      const payload = {
        batchId: batch.batchId,
        actions: batch.actions,
        syncTimestamp: new Date().toISOString(),
        clientVersion: '2.0.0',
        offlineMode: true,
      };

      // Send to Team B's viral sync endpoint
      const response = await fetch('/api/viral/offline-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Sync': 'true',
          'X-Batch-Id': batch.batchId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      // Process sync results
      await this.processSyncResults(batch, result);

      // Mark batch items as completed
      for (const action of batch.actions) {
        await offlineDB.syncQueue.where('data.id').equals(action.id).modify({
          status: 'completed',
          completedAt: new Date().toISOString(),
        });

        await offlineDB.viralActions
          .where('id')
          .equals(action.id)
          .modify({ syncStatus: 'completed' });
      }

      // Update metrics after successful sync
      await this.updateMetricsAfterSync(batch.actions);
    } catch (error) {
      console.error(
        `[Offline Viral] Batch ${batch.batchId} sync failed:`,
        error,
      );
      await this.handleBatchSyncFailure(batch, error);
    }
  }

  /**
   * Process sync results from server
   */
  private static async processSyncResults(
    batch: ViralSyncBatch,
    result: any,
  ): Promise<void> {
    // Handle any conflicts or updates from server
    if (result.conflicts) {
      for (const conflict of result.conflicts) {
        console.warn(
          `[Offline Viral] Conflict detected for action ${conflict.actionId}`,
        );
        // Could integrate with ML conflict resolver here
      }
    }

    // Update local metrics with server-calculated values
    if (result.updatedMetrics) {
      for (const [supplierId, metrics] of Object.entries(
        result.updatedMetrics,
      )) {
        await offlineDB.viralMetrics.put({
          supplierId,
          ...(metrics as any),
          lastSyncedAt: new Date().toISOString(),
        });

        // Update cache
        this.metricsCache.set(supplierId, metrics as OfflineViralMetrics);
      }
    }

    // Process any rewards or achievements
    if (result.rewards) {
      await this.processViralRewards(result.rewards);
    }
  }

  /**
   * Handle batch sync failure with exponential backoff
   */
  private static async handleBatchSyncFailure(
    batch: ViralSyncBatch,
    error: any,
  ): Promise<void> {
    batch.syncAttempts++;

    // Exponential backoff calculation
    const backoffMs = Math.min(
      1000 * Math.pow(2, batch.syncAttempts),
      60000, // Max 1 minute
    );

    console.log(
      `[Offline Viral] Batch ${batch.batchId} will retry in ${backoffMs}ms`,
    );

    // Update sync status
    for (const action of batch.actions) {
      await offlineDB.viralActions.where('id').equals(action.id).modify({
        syncStatus: 'failed',
        attempts: batch.syncAttempts,
        lastAttempt: new Date().toISOString(),
      });

      // Update sync queue with retry info
      await offlineDB.syncQueue
        .where('data.id')
        .equals(action.id)
        .modify({
          attempts: batch.syncAttempts,
          nextRetry: new Date(Date.now() + backoffMs).toISOString(),
        });
    }

    // Schedule retry
    setTimeout(() => {
      this.processBatch(batch);
    }, backoffMs);
  }

  /**
   * Update metrics after successful sync
   */
  private static async updateMetricsAfterSync(
    actions: OfflineViralAction[],
  ): Promise<void> {
    const supplierIds = new Set(actions.map((a) => a.actorId));

    for (const supplierId of supplierIds) {
      const metrics = await offlineDB.viralMetrics
        .where('supplierId')
        .equals(supplierId)
        .first();

      if (metrics) {
        // Reduce pending sync count
        const supplierActions = actions.filter((a) => a.actorId === supplierId);
        metrics.pendingSyncActions = Math.max(
          0,
          metrics.pendingSyncActions - supplierActions.length,
        );

        await offlineDB.viralMetrics.put(metrics);
        this.metricsCache.set(supplierId, metrics);
      }
    }
  }

  /**
   * Process viral rewards and achievements
   */
  private static async processViralRewards(rewards: any[]): Promise<void> {
    for (const reward of rewards) {
      // Store rewards locally for immediate display
      await offlineDB.viralRewards.add({
        id: reward.id,
        supplierId: reward.supplierId,
        type: reward.type,
        value: reward.value,
        description: reward.description,
        earnedAt: reward.earnedAt || new Date().toISOString(),
        displayed: false,
      });

      // Trigger notification or celebration
      this.triggerRewardCelebration(reward);
    }
  }

  /**
   * Trigger reward celebration UI
   */
  private static triggerRewardCelebration(reward: any): void {
    // Dispatch event for UI to handle
    window.dispatchEvent(
      new CustomEvent('viral-reward-earned', {
        detail: reward,
      }),
    );
  }

  /**
   * Schedule opportunistic sync when network is available
   */
  private static scheduleOpportunisticSync(): void {
    // Clear existing processor
    if (this.batchProcessor) {
      clearTimeout(this.batchProcessor);
    }

    // Schedule sync with small delay to batch actions
    this.batchProcessor = setTimeout(() => {
      this.processOfflineViralQueue();
    }, 2000); // 2 second delay to accumulate actions
  }

  /**
   * Get offline viral metrics for a supplier
   */
  static async getOfflineViralMetrics(
    supplierId: string,
  ): Promise<OfflineViralMetrics | null> {
    // Check cache first
    if (this.metricsCache.has(supplierId)) {
      return this.metricsCache.get(supplierId)!;
    }

    // Load from database
    const metrics = await offlineDB.viralMetrics
      .where('supplierId')
      .equals(supplierId)
      .first();

    if (metrics) {
      this.metricsCache.set(supplierId, metrics);
    }

    return metrics || null;
  }

  /**
   * Get pending viral actions count
   */
  static async getPendingViralActionsCount(): Promise<number> {
    return await offlineDB.syncQueue
      .where('type')
      .equals('viral_action')
      .and((item) => item.status === 'pending')
      .count();
  }

  /**
   * Force sync all pending viral actions
   */
  static async forceSyncViralActions(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot force sync while offline');
    }

    await this.processOfflineViralQueue();
  }

  /**
   * Clear completed viral actions (cleanup)
   */
  static async clearCompletedViralActions(): Promise<void> {
    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Clear old completed actions
    await offlineDB.viralActions
      .where('syncStatus')
      .equals('completed')
      .and((action) => action.timestamp < weekAgo)
      .delete();

    console.log('[Offline Viral] Cleaned up old completed actions');
  }

  /**
   * Initialize viral offline system
   */
  static async initialize(): Promise<void> {
    console.log('[Offline Viral] Initializing offline viral system');

    // Set up periodic sync
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.processOfflineViralQueue();
      }
    }, 30000); // Every 30 seconds

    // Set up cleanup
    setInterval(() => {
      this.clearCompletedViralActions();
    }, 86400000); // Daily

    // Process any pending actions on init
    if (navigator.onLine) {
      setTimeout(() => {
        this.processOfflineViralQueue();
      }, 5000); // 5 second delay after init
    }

    console.log('[Offline Viral] System initialized successfully');
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  OfflineViralIntegration.initialize();
}

export default OfflineViralIntegration;
