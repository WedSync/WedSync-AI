/**
 * Offline Marketing Automation Integration
 * Campaign tracking and attribution in offline mode
 *
 * Features:
 * - Offline campaign engagement tracking
 * - Local attribution calculation
 * - Email/SMS queue management
 * - Behavioral segmentation caching
 * - Intelligent sync with Team D's marketing system
 */

import { offlineDB, type SyncQueueItem } from './offline-database';
import type {
  Campaign,
  Attribution,
  Segment,
  MarketingMetrics,
} from '@/types/marketing';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface OfflineMarketingEngagement {
  id: string;
  userId: string;
  campaignId: string;
  engagementType:
    | 'opened'
    | 'clicked'
    | 'converted'
    | 'shared'
    | 'unsubscribed';
  timestamp: string;
  metadata: {
    source?: string;
    medium?: string;
    content?: string;
    term?: string;
    deviceType?: string;
    location?: string;
    customFields?: Record<string, any>;
  };
  syncStatus: 'pending' | 'syncing' | 'completed' | 'failed';
  attributionCalculated?: boolean;
}

export interface OfflineAttribution {
  userId: string;
  touchpoints: TouchPoint[];
  firstTouch: TouchPoint | null;
  lastTouch: TouchPoint | null;
  multiTouch: MultiTouchAttribution;
  conversionValue?: number;
  lastUpdated: string;
  syncStatus: 'pending' | 'synced';
}

export interface TouchPoint {
  campaignId: string;
  timestamp: string;
  channel: string;
  weight: number;
  interaction: string;
}

export interface MultiTouchAttribution {
  linear: Record<string, number>;
  timeDecay: Record<string, number>;
  positionBased: Record<string, number>;
  dataDriver: Record<string, number>;
}

export interface OfflineSegment {
  id: string;
  name: string;
  criteria: SegmentCriteria[];
  memberCount: number;
  members: string[]; // User IDs
  lastUpdated: string;
  syncStatus: 'pending' | 'synced';
}

export interface SegmentCriteria {
  field: string;
  operator:
    | 'equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'in'
    | 'not_in';
  value: any;
}

export interface OfflineEmailQueue {
  id: string;
  campaignId: string;
  recipientId: string;
  subject: string;
  content: string;
  scheduledFor: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  attempts: number;
  metadata?: Record<string, any>;
}

// =====================================================
// OFFLINE MARKETING INTEGRATION CLASS
// =====================================================

export class OfflineMarketingIntegration {
  private static attributionCache = new Map<string, OfflineAttribution>();
  private static segmentCache = new Map<string, OfflineSegment>();
  private static emailBatchProcessor: NodeJS.Timeout | null = null;
  private static syncInProgress = false;

  /**
   * Track campaign engagement offline
   */
  static async trackCampaignEngagementOffline(
    userId: string,
    campaignId: string,
    engagementType: OfflineMarketingEngagement['engagementType'],
    metadata: any,
  ): Promise<void> {
    try {
      // Create engagement record
      const engagement: OfflineMarketingEngagement = {
        id: crypto.randomUUID(),
        userId,
        campaignId,
        engagementType,
        timestamp: new Date().toISOString(),
        metadata,
        syncStatus: 'pending',
        attributionCalculated: false,
      };

      // Store engagement locally
      await offlineDB.marketingEngagements.add(engagement);

      // Calculate priority based on engagement type
      const priority = this.calculateEngagementPriority(engagementType);

      // Queue for attribution processing with Team D
      await offlineDB.syncQueue.add({
        type: 'marketing_engagement',
        action: 'create',
        data: engagement,
        priority,
        timestamp: new Date().toISOString(),
        status: 'pending',
        userId,
        metadata: {
          batchable: true,
          maxBatchSize: 100,
          requiresAttribution: engagementType === 'converted',
        },
      });

      // Update local attribution optimistically
      await this.updateLocalAttribution(
        userId,
        campaignId,
        engagementType,
        metadata,
      );

      // Update segment membership if needed
      await this.updateSegmentMembership(userId, engagement);

      // Schedule opportunistic sync if online
      if (navigator.onLine) {
        this.scheduleMarketingSync();
      }

      console.log(
        `[Offline Marketing] Engagement tracked: ${engagementType} for campaign ${campaignId}`,
      );
    } catch (error) {
      console.error('[Offline Marketing] Failed to track engagement:', error);
      throw error;
    }
  }

  /**
   * Calculate priority for marketing engagements
   */
  private static calculateEngagementPriority(engagementType: string): number {
    const priorityMap: Record<string, number> = {
      converted: 9, // Highest - revenue event
      clicked: 7, // High - strong interest
      opened: 5, // Medium - engagement
      shared: 6, // Medium-high - viral potential
      unsubscribed: 8, // High - need to process immediately
    };

    return priorityMap[engagementType] || 5;
  }

  /**
   * Update local attribution model
   */
  static async updateLocalAttribution(
    userId: string,
    campaignId: string,
    engagementType: string,
    metadata: any,
  ): Promise<void> {
    try {
      // Get or create attribution record
      let attribution = this.attributionCache.get(userId);

      if (!attribution) {
        const stored = await offlineDB.attributions
          .where('userId')
          .equals(userId)
          .first();

        attribution = stored || {
          userId,
          touchpoints: [],
          firstTouch: null,
          lastTouch: null,
          multiTouch: {
            linear: {},
            timeDecay: {},
            positionBased: {},
            dataDriver: {},
          },
          lastUpdated: new Date().toISOString(),
          syncStatus: 'pending',
        };
      }

      // Create new touchpoint
      const touchpoint: TouchPoint = {
        campaignId,
        timestamp: new Date().toISOString(),
        channel: metadata.source || 'direct',
        weight: this.calculateTouchpointWeight(engagementType),
        interaction: engagementType,
      };

      // Add to touchpoints
      attribution.touchpoints.push(touchpoint);

      // Update first/last touch
      if (
        !attribution.firstTouch ||
        new Date(touchpoint.timestamp) <
          new Date(attribution.firstTouch.timestamp)
      ) {
        attribution.firstTouch = touchpoint;
      }

      attribution.lastTouch = touchpoint;

      // Recalculate multi-touch attribution
      attribution.multiTouch = this.calculateMultiTouchAttribution(
        attribution.touchpoints,
      );

      // Handle conversion
      if (engagementType === 'converted' && metadata.value) {
        attribution.conversionValue = metadata.value;
      }

      attribution.lastUpdated = new Date().toISOString();

      // Update cache and database
      this.attributionCache.set(userId, attribution);
      await offlineDB.attributions.put(attribution);
    } catch (error) {
      console.error('[Offline Marketing] Failed to update attribution:', error);
    }
  }

  /**
   * Calculate touchpoint weight based on engagement
   */
  private static calculateTouchpointWeight(engagementType: string): number {
    const weights: Record<string, number> = {
      converted: 1.0,
      clicked: 0.7,
      shared: 0.6,
      opened: 0.3,
      unsubscribed: 0.0,
    };

    return weights[engagementType] || 0.1;
  }

  /**
   * Calculate multi-touch attribution models
   */
  private static calculateMultiTouchAttribution(
    touchpoints: TouchPoint[],
  ): MultiTouchAttribution {
    const models: MultiTouchAttribution = {
      linear: {},
      timeDecay: {},
      positionBased: {},
      dataDriver: {},
    };

    if (touchpoints.length === 0) return models;

    // Linear attribution - equal credit
    const linearCredit = 1 / touchpoints.length;
    touchpoints.forEach((tp) => {
      models.linear[tp.campaignId] =
        (models.linear[tp.campaignId] || 0) + linearCredit;
    });

    // Time decay - recent touches get more credit
    const now = Date.now();
    const decayRate = 0.1; // 10% decay per day
    let totalDecayWeight = 0;
    const decayWeights: number[] = [];

    touchpoints.forEach((tp) => {
      const daysAgo =
        (now - new Date(tp.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-decayRate * daysAgo);
      decayWeights.push(weight);
      totalDecayWeight += weight;
    });

    touchpoints.forEach((tp, index) => {
      const credit = decayWeights[index] / totalDecayWeight;
      models.timeDecay[tp.campaignId] =
        (models.timeDecay[tp.campaignId] || 0) + credit;
    });

    // Position-based - 40% first, 40% last, 20% middle
    if (touchpoints.length === 1) {
      models.positionBased[touchpoints[0].campaignId] = 1;
    } else if (touchpoints.length === 2) {
      models.positionBased[touchpoints[0].campaignId] = 0.5;
      models.positionBased[touchpoints[1].campaignId] = 0.5;
    } else {
      // First touch
      models.positionBased[touchpoints[0].campaignId] = 0.4;

      // Last touch
      const lastIndex = touchpoints.length - 1;
      models.positionBased[touchpoints[lastIndex].campaignId] =
        (models.positionBased[touchpoints[lastIndex].campaignId] || 0) + 0.4;

      // Middle touches
      const middleCredit = 0.2 / (touchpoints.length - 2);
      for (let i = 1; i < lastIndex; i++) {
        models.positionBased[touchpoints[i].campaignId] =
          (models.positionBased[touchpoints[i].campaignId] || 0) + middleCredit;
      }
    }

    // Data-driven (simplified - weight-based)
    const totalWeight = touchpoints.reduce((sum, tp) => sum + tp.weight, 0);
    if (totalWeight > 0) {
      touchpoints.forEach((tp) => {
        const credit = tp.weight / totalWeight;
        models.dataDriver[tp.campaignId] =
          (models.dataDriver[tp.campaignId] || 0) + credit;
      });
    }

    return models;
  }

  /**
   * Update segment membership based on engagement
   */
  private static async updateSegmentMembership(
    userId: string,
    engagement: OfflineMarketingEngagement,
  ): Promise<void> {
    try {
      // Get all segments from cache
      const segments = await this.getAllCachedSegments();

      for (const segment of segments) {
        const wasInSegment = segment.members.includes(userId);
        const nowInSegment = this.evaluateSegmentCriteria(
          segment.criteria,
          userId,
          engagement,
        );

        if (!wasInSegment && nowInSegment) {
          // Add to segment
          segment.members.push(userId);
          segment.memberCount++;
          segment.lastUpdated = new Date().toISOString();

          await this.updateSegmentCache(segment);

          // Trigger segment entry automation
          await this.triggerSegmentAutomation(userId, segment.id, 'entry');
        } else if (wasInSegment && !nowInSegment) {
          // Remove from segment
          segment.members = segment.members.filter((id) => id !== userId);
          segment.memberCount--;
          segment.lastUpdated = new Date().toISOString();

          await this.updateSegmentCache(segment);

          // Trigger segment exit automation
          await this.triggerSegmentAutomation(userId, segment.id, 'exit');
        }
      }
    } catch (error) {
      console.error('[Offline Marketing] Failed to update segments:', error);
    }
  }

  /**
   * Get all cached segments
   */
  private static async getAllCachedSegments(): Promise<OfflineSegment[]> {
    if (this.segmentCache.size === 0) {
      // Load from database
      const segments = await offlineDB.segments.toArray();
      segments.forEach((seg) => this.segmentCache.set(seg.id, seg));
    }

    return Array.from(this.segmentCache.values());
  }

  /**
   * Evaluate if user meets segment criteria
   */
  private static evaluateSegmentCriteria(
    criteria: SegmentCriteria[],
    userId: string,
    engagement: OfflineMarketingEngagement,
  ): boolean {
    // Simplified evaluation - in production would check all criteria
    for (const criterion of criteria) {
      if (criterion.field === 'engagement_type') {
        if (
          criterion.operator === 'equals' &&
          engagement.engagementType !== criterion.value
        ) {
          return false;
        }
      }

      if (criterion.field === 'campaign_source') {
        if (
          criterion.operator === 'equals' &&
          engagement.metadata.source !== criterion.value
        ) {
          return false;
        }
      }

      // Add more criteria evaluation as needed
    }

    return true;
  }

  /**
   * Update segment cache
   */
  private static async updateSegmentCache(
    segment: OfflineSegment,
  ): Promise<void> {
    this.segmentCache.set(segment.id, segment);
    await offlineDB.segments.put(segment);
  }

  /**
   * Trigger automation for segment entry/exit
   */
  private static async triggerSegmentAutomation(
    userId: string,
    segmentId: string,
    event: 'entry' | 'exit',
  ): Promise<void> {
    // Queue automation trigger
    await offlineDB.syncQueue.add({
      type: 'segment_automation',
      action: 'trigger',
      data: {
        userId,
        segmentId,
        event,
        timestamp: new Date().toISOString(),
      },
      priority: 7,
      timestamp: new Date().toISOString(),
      status: 'pending',
      userId,
    });
  }

  /**
   * Queue email for offline sending
   */
  static async queueEmailOffline(
    campaignId: string,
    recipientId: string,
    subject: string,
    content: string,
    scheduledFor?: Date,
  ): Promise<void> {
    const email: OfflineEmailQueue = {
      id: crypto.randomUUID(),
      campaignId,
      recipientId,
      subject,
      content,
      scheduledFor: scheduledFor?.toISOString() || new Date().toISOString(),
      status: 'queued',
      attempts: 0,
    };

    await offlineDB.emailQueue.add(email);

    // Schedule batch processing
    this.scheduleEmailBatchProcessing();
  }

  /**
   * Schedule email batch processing
   */
  private static scheduleEmailBatchProcessing(): void {
    if (this.emailBatchProcessor) {
      clearTimeout(this.emailBatchProcessor);
    }

    this.emailBatchProcessor = setTimeout(() => {
      this.processEmailQueue();
    }, 5000); // 5 second delay for batching
  }

  /**
   * Process queued emails
   */
  private static async processEmailQueue(): Promise<void> {
    if (!navigator.onLine) {
      console.log('[Offline Marketing] Cannot send emails while offline');
      return;
    }

    try {
      const queuedEmails = await offlineDB.emailQueue
        .where('status')
        .equals('queued')
        .and((email) => new Date(email.scheduledFor) <= new Date())
        .limit(50)
        .toArray();

      if (queuedEmails.length === 0) return;

      // Batch send emails
      const response = await fetch('/api/marketing/emails/batch-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: queuedEmails,
          offlineSync: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update email statuses
        for (const email of queuedEmails) {
          const status = result.sent.includes(email.id) ? 'sent' : 'failed';
          await offlineDB.emailQueue
            .where('id')
            .equals(email.id)
            .modify({ status, sentAt: new Date().toISOString() });
        }
      }
    } catch (error) {
      console.error(
        '[Offline Marketing] Email queue processing failed:',
        error,
      );
    }
  }

  /**
   * Process offline marketing queue
   */
  static async processOfflineMarketingQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[Offline Marketing] Sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      // Get pending marketing events
      const marketingEvents = await offlineDB.syncQueue
        .where('type')
        .anyOf(['marketing_engagement', 'segment_automation'])
        .and((item) => item.status === 'pending')
        .sortBy('timestamp'); // Process in chronological order for attribution

      if (marketingEvents.length === 0) {
        console.log('[Offline Marketing] No pending marketing events');
        return;
      }

      // Batch process marketing events for efficiency
      const batches = this.batchMarketingEvents(marketingEvents, 50);

      for (const batch of batches) {
        await this.processMarketingBatch(batch);
      }

      console.log(
        `[Offline Marketing] Processed ${marketingEvents.length} events in ${batches.length} batches`,
      );
    } catch (error) {
      console.error('[Offline Marketing] Queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Batch marketing events for efficient processing
   */
  private static batchMarketingEvents(
    events: SyncQueueItem[],
    batchSize: number,
  ): SyncQueueItem[][] {
    const batches: SyncQueueItem[][] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Process a batch of marketing events
   */
  private static async processMarketingBatch(
    batch: SyncQueueItem[],
  ): Promise<void> {
    try {
      const response = await fetch('/api/marketing/offline-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Sync': 'true',
        },
        body: JSON.stringify({
          engagements: batch.map((item) => item.data),
          batchTimestamp: new Date().toISOString(),
          requiresAttribution: batch.some(
            (item) => item.metadata?.requiresAttribution,
          ),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      // Process attribution updates from server
      if (result.attributionUpdates) {
        await this.processAttributionUpdates(result.attributionUpdates);
      }

      // Process segment updates
      if (result.segmentUpdates) {
        await this.processSegmentUpdates(result.segmentUpdates);
      }

      // Mark batch as completed
      for (const item of batch) {
        await offlineDB.syncQueue.update(item.id!, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[Offline Marketing] Batch sync failed:', error);
      await this.handleMarketingSyncFailure(batch, error);
    }
  }

  /**
   * Process attribution updates from server
   */
  private static async processAttributionUpdates(
    updates: any[],
  ): Promise<void> {
    for (const update of updates) {
      const attribution: OfflineAttribution = {
        ...update,
        syncStatus: 'synced',
      };

      this.attributionCache.set(update.userId, attribution);
      await offlineDB.attributions.put(attribution);
    }
  }

  /**
   * Process segment updates from server
   */
  private static async processSegmentUpdates(updates: any[]): Promise<void> {
    for (const update of updates) {
      const segment: OfflineSegment = {
        ...update,
        syncStatus: 'synced',
      };

      this.segmentCache.set(update.id, segment);
      await offlineDB.segments.put(segment);
    }
  }

  /**
   * Handle marketing sync failure
   */
  private static async handleMarketingSyncFailure(
    batch: SyncQueueItem[],
    error: any,
  ): Promise<void> {
    for (const item of batch) {
      const attempts = (item.attempts || 0) + 1;
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 60000);

      await offlineDB.syncQueue.update(item.id!, {
        attempts,
        lastAttempt: new Date().toISOString(),
        nextRetry: new Date(Date.now() + backoffMs).toISOString(),
      });
    }
  }

  /**
   * Schedule marketing sync
   */
  private static scheduleMarketingSync(): void {
    setTimeout(() => {
      this.processOfflineMarketingQueue();
    }, 3000); // 3 second delay to batch events
  }

  /**
   * Get offline marketing metrics
   */
  static async getOfflineMarketingMetrics(
    userId: string,
  ): Promise<MarketingMetrics> {
    const engagements = await offlineDB.marketingEngagements
      .where('userId')
      .equals(userId)
      .toArray();

    const attribution =
      this.attributionCache.get(userId) ||
      (await offlineDB.attributions.where('userId').equals(userId).first());

    const segments = await this.getUserSegments(userId);

    return {
      totalEngagements: engagements.length,
      conversionRate: this.calculateConversionRate(engagements),
      attributionModel: attribution?.multiTouch || null,
      segments: segments.map((s) => s.name),
      lastEngagement: engagements[engagements.length - 1]?.timestamp || null,
    };
  }

  /**
   * Calculate conversion rate from engagements
   */
  private static calculateConversionRate(
    engagements: OfflineMarketingEngagement[],
  ): number {
    if (engagements.length === 0) return 0;

    const conversions = engagements.filter(
      (e) => e.engagementType === 'converted',
    ).length;
    const uniqueCampaigns = new Set(engagements.map((e) => e.campaignId)).size;

    return uniqueCampaigns > 0 ? conversions / uniqueCampaigns : 0;
  }

  /**
   * Get user's segments
   */
  private static async getUserSegments(
    userId: string,
  ): Promise<OfflineSegment[]> {
    const allSegments = await this.getAllCachedSegments();
    return allSegments.filter((s) => s.members.includes(userId));
  }

  /**
   * Initialize offline marketing system
   */
  static async initialize(): Promise<void> {
    console.log('[Offline Marketing] Initializing offline marketing system');

    // Set up periodic sync
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.processOfflineMarketingQueue();
      }
    }, 60000); // Every minute

    // Set up email queue processing
    setInterval(() => {
      if (navigator.onLine) {
        this.processEmailQueue();
      }
    }, 30000); // Every 30 seconds

    // Process any pending items on init
    if (navigator.onLine) {
      setTimeout(() => {
        this.processOfflineMarketingQueue();
        this.processEmailQueue();
      }, 10000); // 10 second delay after init
    }

    console.log('[Offline Marketing] System initialized successfully');
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  OfflineMarketingIntegration.initialize();
}

export default OfflineMarketingIntegration;
