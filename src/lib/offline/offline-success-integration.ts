/**
 * Offline Customer Success Integration
 * Milestone tracking and success metrics in offline mode
 *
 * Features:
 * - Offline milestone tracking and celebrations
 * - Health score calculation without connectivity
 * - Intervention scheduling and coaching
 * - Success dashboard data caching
 * - Intelligent sync with Team C's success system
 */

import { offlineDB, type SyncQueueItem } from './offline-database';
import type {
  Milestone,
  HealthScore,
  Intervention,
  SuccessMetrics,
} from '@/types/customer-success';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface OfflineMilestone {
  id: string;
  supplierId: string;
  milestoneType: string;
  achievedAt: string;
  metadata: {
    formCount?: number;
    clientCount?: number;
    revenue?: number;
    customFields?: Record<string, any>;
  };
  celebrated: boolean;
  celebrationType?: 'confetti' | 'badge' | 'notification' | 'email';
  syncStatus: 'pending' | 'syncing' | 'completed' | 'failed';
  attempts?: number;
}

export interface OfflineHealthScore {
  supplierId: string;
  score: number;
  riskLevel: 'healthy' | 'at_risk' | 'critical';
  factors: {
    engagement: number;
    adoption: number;
    satisfaction: number;
    growth: number;
    retention: number;
  };
  lastUpdated: string;
  syncStatus: 'pending' | 'synced';
  interventions?: string[]; // Intervention IDs
}

export interface OfflineActivity {
  id: string;
  supplierId: string;
  type:
    | 'login'
    | 'form_created'
    | 'client_added'
    | 'feature_used'
    | 'support_ticket';
  timestamp: string;
  metadata?: Record<string, any>;
  impactScore: number; // Impact on health score
}

export interface OfflineIntervention {
  id: string;
  supplierId: string;
  type: 'email' | 'in_app' | 'phone' | 'coaching';
  reason: string;
  scheduledFor: string;
  status: 'pending' | 'sent' | 'completed' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  content?: string;
  syncStatus: 'pending' | 'synced';
}

export interface SuccessCelebration {
  type: 'confetti' | 'badge' | 'notification' | 'reward';
  message: string;
  icon?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// =====================================================
// OFFLINE SUCCESS INTEGRATION CLASS
// =====================================================

export class OfflineSuccessIntegration {
  private static healthScoreCache = new Map<string, OfflineHealthScore>();
  private static celebrationQueue: SuccessCelebration[] = [];
  private static syncInProgress = false;

  /**
   * Track milestone achievement offline
   */
  static async trackMilestoneOffline(
    supplierId: string,
    milestoneType: string,
    metadata: any,
  ): Promise<void> {
    try {
      // Create milestone record
      const milestone: OfflineMilestone = {
        id: crypto.randomUUID(),
        supplierId,
        milestoneType,
        achievedAt: new Date().toISOString(),
        metadata,
        celebrated: false,
        syncStatus: 'pending',
        attempts: 0,
      };

      // Determine celebration type based on milestone
      milestone.celebrationType = this.determineCelebrationType(milestoneType);

      // Store milestone locally
      await offlineDB.milestones.add(milestone);

      // Queue for sync with high priority
      await offlineDB.syncQueue.add({
        type: 'success_milestone',
        action: 'create',
        data: milestone,
        attempts: 0,
        timestamp: new Date().toISOString(),
        status: 'pending',
        priority: 8, // High priority for milestones
        userId: supplierId,
        metadata: {
          celebrationType: milestone.celebrationType,
          immediate: true,
        },
      });

      // Trigger offline celebration immediately
      await this.triggerOfflineCelebration(
        milestoneType,
        milestone.celebrationType,
      );

      // Update health score based on milestone
      await this.updateHealthScoreForMilestone(supplierId, milestoneType);

      console.log(
        `[Offline Success] Milestone tracked: ${milestoneType} for ${supplierId}`,
      );
    } catch (error) {
      console.error('[Offline Success] Failed to track milestone:', error);
      throw error;
    }
  }

  /**
   * Determine celebration type based on milestone importance
   */
  private static determineCelebrationType(
    milestoneType: string,
  ): OfflineMilestone['celebrationType'] {
    const celebrationMap: Record<string, OfflineMilestone['celebrationType']> =
      {
        first_form_created: 'confetti',
        first_client_added: 'badge',
        tenth_client: 'confetti',
        first_payment: 'confetti',
        hundred_forms: 'badge',
        anniversary: 'confetti',
        high_engagement: 'notification',
        feature_adoption: 'notification',
      };

    return celebrationMap[milestoneType] || 'notification';
  }

  /**
   * Trigger offline celebration UI
   */
  static async triggerOfflineCelebration(
    milestoneType: string,
    celebrationType?: OfflineMilestone['celebrationType'],
  ): Promise<void> {
    const celebration: SuccessCelebration = {
      type: celebrationType || 'notification',
      message: this.getCelebrationMessage(milestoneType),
      icon: this.getCelebrationIcon(milestoneType),
      duration: celebrationType === 'confetti' ? 5000 : 3000,
      metadata: {
        milestoneType,
        timestamp: new Date().toISOString(),
      },
    };

    // Add to celebration queue
    this.celebrationQueue.push(celebration);

    // Dispatch event for UI
    window.dispatchEvent(
      new CustomEvent('success-celebration', {
        detail: celebration,
      }),
    );

    // Store celebration for persistence
    await offlineDB.celebrations.add({
      ...celebration,
      id: crypto.randomUUID(),
      displayedAt: new Date().toISOString(),
    });
  }

  /**
   * Get celebration message for milestone
   */
  private static getCelebrationMessage(milestoneType: string): string {
    const messages: Record<string, string> = {
      first_form_created: '🎉 Congratulations! You created your first form!',
      first_client_added: '👏 Amazing! Your first client is onboard!',
      tenth_client: '🚀 Incredible! You reached 10 clients!',
      first_payment: '💰 Fantastic! You received your first payment!',
      hundred_forms: "📝 Wow! 100 forms created! You're on fire!",
      anniversary: '🎂 Happy Anniversary with WedSync!',
      high_engagement: '⭐ Your engagement is outstanding!',
      feature_adoption: '✨ Great job exploring new features!',
    };

    return messages[milestoneType] || `🎊 Milestone achieved: ${milestoneType}`;
  }

  /**
   * Get celebration icon for milestone
   */
  private static getCelebrationIcon(milestoneType: string): string {
    const icons: Record<string, string> = {
      first_form_created: '📝',
      first_client_added: '👥',
      tenth_client: '🚀',
      first_payment: '💰',
      hundred_forms: '💯',
      anniversary: '🎂',
      high_engagement: '⭐',
      feature_adoption: '✨',
    };

    return icons[milestoneType] || '🎊';
  }

  /**
   * Update health score offline based on activities
   */
  static async updateHealthScoreOffline(
    supplierId: string,
    activities: OfflineActivity[],
  ): Promise<void> {
    try {
      // Calculate offline health score
      const offlineScore = await this.calculateOfflineHealthScore(
        supplierId,
        activities,
      );

      // Cache updated score
      await offlineDB.healthScores.put(offlineScore);
      this.healthScoreCache.set(supplierId, offlineScore);

      // Check if intervention needed
      if (offlineScore.riskLevel !== 'healthy') {
        await this.scheduleOfflineIntervention(supplierId, offlineScore);
      }

      // Queue for sync with Team C
      await offlineDB.syncQueue.add({
        type: 'health_score_update',
        action: 'update',
        data: {
          supplierId,
          activities,
          calculatedScore: offlineScore,
        },
        priority: 6, // Medium-high priority
        timestamp: new Date().toISOString(),
        status: 'pending',
        userId: supplierId,
      });

      console.log(
        `[Offline Success] Health score updated: ${offlineScore.score} for ${supplierId}`,
      );
    } catch (error) {
      console.error('[Offline Success] Failed to update health score:', error);
    }
  }

  /**
   * Calculate health score based on offline activities
   */
  private static async calculateOfflineHealthScore(
    supplierId: string,
    activities: OfflineActivity[],
  ): Promise<OfflineHealthScore> {
    // Get previous score for trending
    const previousScore = this.healthScoreCache.get(supplierId);

    // Calculate engagement score (login frequency, feature usage)
    const engagementScore = this.calculateEngagementScore(activities);

    // Calculate adoption score (features used, depth of usage)
    const adoptionScore = this.calculateAdoptionScore(activities);

    // Calculate satisfaction score (support tickets, feedback)
    const satisfactionScore = this.calculateSatisfactionScore(activities);

    // Calculate growth score (new clients, forms created)
    const growthScore = this.calculateGrowthScore(activities);

    // Calculate retention score (consistent usage over time)
    const retentionScore = this.calculateRetentionScore(
      activities,
      previousScore,
    );

    // Weighted average for overall score
    const overallScore =
      engagementScore * 0.25 +
      adoptionScore * 0.2 +
      satisfactionScore * 0.2 +
      growthScore * 0.2 +
      retentionScore * 0.15;

    // Determine risk level
    let riskLevel: OfflineHealthScore['riskLevel'];
    if (overallScore >= 80) {
      riskLevel = 'healthy';
    } else if (overallScore >= 60) {
      riskLevel = 'at_risk';
    } else {
      riskLevel = 'critical';
    }

    return {
      supplierId,
      score: Math.round(overallScore),
      riskLevel,
      factors: {
        engagement: Math.round(engagementScore),
        adoption: Math.round(adoptionScore),
        satisfaction: Math.round(satisfactionScore),
        growth: Math.round(growthScore),
        retention: Math.round(retentionScore),
      },
      lastUpdated: new Date().toISOString(),
      syncStatus: 'pending',
    };
  }

  /**
   * Calculate engagement score from activities
   */
  private static calculateEngagementScore(
    activities: OfflineActivity[],
  ): number {
    const recentActivities = activities.filter((a) => {
      const daysSince =
        (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7; // Last 7 days
    });

    const loginCount = recentActivities.filter(
      (a) => a.type === 'login',
    ).length;
    const featureUseCount = recentActivities.filter(
      (a) => a.type === 'feature_used',
    ).length;

    // Score based on activity frequency
    let score = 50; // Base score

    if (loginCount >= 7)
      score += 30; // Daily logins
    else if (loginCount >= 4)
      score += 20; // Regular logins
    else if (loginCount >= 2) score += 10; // Some logins

    if (featureUseCount >= 20)
      score += 20; // High feature usage
    else if (featureUseCount >= 10) score += 15;
    else if (featureUseCount >= 5) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate adoption score from activities
   */
  private static calculateAdoptionScore(activities: OfflineActivity[]): number {
    const uniqueFeatures = new Set(
      activities
        .filter((a) => a.type === 'feature_used')
        .map((a) => a.metadata?.featureName),
    );

    const formsCreated = activities.filter(
      (a) => a.type === 'form_created',
    ).length;
    const clientsAdded = activities.filter(
      (a) => a.type === 'client_added',
    ).length;

    let score = 40; // Base score

    // Feature breadth
    if (uniqueFeatures.size >= 10) score += 30;
    else if (uniqueFeatures.size >= 5) score += 20;
    else if (uniqueFeatures.size >= 3) score += 10;

    // Core feature usage
    if (formsCreated >= 5) score += 15;
    if (clientsAdded >= 3) score += 15;

    return Math.min(100, score);
  }

  /**
   * Calculate satisfaction score from activities
   */
  private static calculateSatisfactionScore(
    activities: OfflineActivity[],
  ): number {
    const supportTickets = activities.filter(
      (a) => a.type === 'support_ticket',
    );
    const recentTickets = supportTickets.filter((a) => {
      const daysSince =
        (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });

    let score = 80; // Start with good satisfaction

    // Deduct for support tickets (indicates issues)
    score -= recentTickets.length * 5;

    // Check for resolved vs unresolved
    const unresolvedCount = recentTickets.filter(
      (t) => t.metadata?.status !== 'resolved',
    ).length;

    score -= unresolvedCount * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate growth score from activities
   */
  private static calculateGrowthScore(activities: OfflineActivity[]): number {
    const recentActivities = activities.filter((a) => {
      const daysSince =
        (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });

    const newClients = recentActivities.filter(
      (a) => a.type === 'client_added',
    ).length;
    const newForms = recentActivities.filter(
      (a) => a.type === 'form_created',
    ).length;

    let score = 30; // Base score

    // Client growth
    if (newClients >= 10) score += 35;
    else if (newClients >= 5) score += 25;
    else if (newClients >= 2) score += 15;

    // Form creation growth
    if (newForms >= 20) score += 35;
    else if (newForms >= 10) score += 25;
    else if (newForms >= 5) score += 15;

    return Math.min(100, score);
  }

  /**
   * Calculate retention score from activities
   */
  private static calculateRetentionScore(
    activities: OfflineActivity[],
    previousScore?: OfflineHealthScore,
  ): number {
    // Check consistency over time
    const weeks = new Map<number, number>();

    activities.forEach((activity) => {
      const weekNum = Math.floor(
        (Date.now() - new Date(activity.timestamp).getTime()) /
          (1000 * 60 * 60 * 24 * 7),
      );
      weeks.set(weekNum, (weeks.get(weekNum) || 0) + 1);
    });

    const activeWeeks = weeks.size;
    const totalWeeks = 4; // Look at last 4 weeks

    let score = 50; // Base score

    // Consistency bonus
    const consistencyRatio = activeWeeks / totalWeeks;
    score += consistencyRatio * 30;

    // Trending bonus/penalty
    if (previousScore) {
      const trend = previousScore.score;
      if (trend >= 70)
        score += 20; // Maintaining good health
      else if (trend >= 50) score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Update health score based on milestone achievement
   */
  private static async updateHealthScoreForMilestone(
    supplierId: string,
    milestoneType: string,
  ): Promise<void> {
    const currentScore =
      this.healthScoreCache.get(supplierId) ||
      (await offlineDB.healthScores
        .where('supplierId')
        .equals(supplierId)
        .first());

    if (currentScore) {
      // Boost health score for milestone achievement
      const boostAmount = this.getMilestoneHealthBoost(milestoneType);

      currentScore.score = Math.min(100, currentScore.score + boostAmount);

      // Improve risk level if needed
      if (currentScore.score >= 80) {
        currentScore.riskLevel = 'healthy';
      } else if (currentScore.score >= 60) {
        currentScore.riskLevel = 'at_risk';
      }

      currentScore.lastUpdated = new Date().toISOString();

      // Update cache and database
      this.healthScoreCache.set(supplierId, currentScore);
      await offlineDB.healthScores.put(currentScore);
    }
  }

  /**
   * Get health score boost for milestone
   */
  private static getMilestoneHealthBoost(milestoneType: string): number {
    const boostMap: Record<string, number> = {
      first_form_created: 5,
      first_client_added: 5,
      tenth_client: 10,
      first_payment: 8,
      hundred_forms: 15,
      anniversary: 10,
      high_engagement: 5,
      feature_adoption: 3,
    };

    return boostMap[milestoneType] || 3;
  }

  /**
   * Schedule offline intervention for at-risk suppliers
   */
  private static async scheduleOfflineIntervention(
    supplierId: string,
    healthScore: OfflineHealthScore,
  ): Promise<void> {
    // Determine intervention type based on risk factors
    const interventionType = this.determineInterventionType(healthScore);

    const intervention: OfflineIntervention = {
      id: crypto.randomUUID(),
      supplierId,
      type: interventionType,
      reason: this.getInterventionReason(healthScore),
      scheduledFor: this.calculateInterventionTime(healthScore.riskLevel),
      status: 'pending',
      priority:
        healthScore.riskLevel === 'critical'
          ? 'critical'
          : healthScore.riskLevel === 'at_risk'
            ? 'medium'
            : 'low',
      syncStatus: 'pending',
    };

    // Store intervention
    await offlineDB.interventions.add(intervention);

    // Queue for sync
    await offlineDB.syncQueue.add({
      type: 'success_intervention',
      action: 'create',
      data: intervention,
      priority: intervention.priority === 'critical' ? 9 : 6,
      timestamp: new Date().toISOString(),
      status: 'pending',
      userId: supplierId,
    });

    // Store intervention ID in health score
    if (!healthScore.interventions) {
      healthScore.interventions = [];
    }
    healthScore.interventions.push(intervention.id);

    await offlineDB.healthScores.put(healthScore);
  }

  /**
   * Determine intervention type based on health score
   */
  private static determineInterventionType(
    healthScore: OfflineHealthScore,
  ): OfflineIntervention['type'] {
    const lowestFactor = Object.entries(healthScore.factors).sort(
      ([, a], [, b]) => a - b,
    )[0][0];

    switch (lowestFactor) {
      case 'engagement':
        return 'email'; // Re-engagement email
      case 'adoption':
        return 'coaching'; // Feature coaching
      case 'satisfaction':
        return 'phone'; // Personal outreach
      case 'growth':
        return 'in_app'; // Growth tips
      case 'retention':
        return 'email'; // Retention campaign
      default:
        return 'in_app';
    }
  }

  /**
   * Get intervention reason based on health score
   */
  private static getInterventionReason(
    healthScore: OfflineHealthScore,
  ): string {
    const factors = healthScore.factors;
    const issues: string[] = [];

    if (factors.engagement < 60) issues.push('low engagement');
    if (factors.adoption < 60) issues.push('limited feature adoption');
    if (factors.satisfaction < 60) issues.push('potential satisfaction issues');
    if (factors.growth < 60) issues.push('slow growth');
    if (factors.retention < 60) issues.push('retention risk');

    return issues.length > 0
      ? `Intervention needed due to: ${issues.join(', ')}`
      : 'Proactive check-in';
  }

  /**
   * Calculate when intervention should happen
   */
  private static calculateInterventionTime(riskLevel: string): string {
    const now = new Date();

    switch (riskLevel) {
      case 'critical':
        // Immediate intervention
        return now.toISOString();
      case 'at_risk':
        // Within 24 hours
        now.setHours(now.getHours() + 24);
        return now.toISOString();
      default:
        // Within 3 days
        now.setDate(now.getDate() + 3);
        return now.toISOString();
    }
  }

  /**
   * Process offline success queue
   */
  static async processOfflineSuccessQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[Offline Success] Sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      // Get pending success items
      const successItems = await offlineDB.syncQueue
        .where('type')
        .anyOf([
          'success_milestone',
          'health_score_update',
          'success_intervention',
        ])
        .and((item) => item.status === 'pending')
        .reverse() // Sort by priority
        .limit(50)
        .toArray();

      if (successItems.length === 0) {
        console.log('[Offline Success] No pending success items');
        return;
      }

      // Group by type for batch processing
      const grouped = this.groupSuccessItems(successItems);

      // Process each group
      for (const [type, items] of Object.entries(grouped)) {
        await this.processSuccessGroup(type, items);
      }

      console.log(`[Offline Success] Processed ${successItems.length} items`);
    } catch (error) {
      console.error('[Offline Success] Queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Group success items by type
   */
  private static groupSuccessItems(
    items: SyncQueueItem[],
  ): Record<string, SyncQueueItem[]> {
    const grouped: Record<string, SyncQueueItem[]> = {};

    items.forEach((item) => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item);
    });

    return grouped;
  }

  /**
   * Process a group of success items
   */
  private static async processSuccessGroup(
    type: string,
    items: SyncQueueItem[],
  ): Promise<void> {
    try {
      const endpoint = this.getSuccessEndpoint(type);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Sync': 'true',
        },
        body: JSON.stringify({
          type,
          items: items.map((i) => i.data),
          syncTimestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      // Process results
      await this.processSuccessSyncResults(type, items, result);

      // Mark as completed
      for (const item of items) {
        await offlineDB.syncQueue.update(item.id!, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`[Offline Success] Failed to sync ${type}:`, error);
      await this.handleSuccessSyncFailure(items, error);
    }
  }

  /**
   * Get endpoint for success sync
   */
  private static getSuccessEndpoint(type: string): string {
    const endpoints: Record<string, string> = {
      success_milestone: '/api/customer-success/milestones/offline-sync',
      health_score_update: '/api/customer-success/health-scores/offline-sync',
      success_intervention: '/api/customer-success/interventions/offline-sync',
    };

    return endpoints[type] || '/api/customer-success/offline-sync';
  }

  /**
   * Process success sync results
   */
  private static async processSuccessSyncResults(
    type: string,
    items: SyncQueueItem[],
    result: any,
  ): Promise<void> {
    // Update local records with server responses
    if (result.processed) {
      for (const processed of result.processed) {
        if (type === 'success_milestone') {
          await offlineDB.milestones
            .where('id')
            .equals(processed.localId)
            .modify({
              syncStatus: 'completed',
              serverId: processed.serverId,
            });
        }
      }
    }

    // Handle any coaching recommendations
    if (result.coachingRecommendations) {
      await this.storeCoachingRecommendations(result.coachingRecommendations);
    }
  }

  /**
   * Handle success sync failure
   */
  private static async handleSuccessSyncFailure(
    items: SyncQueueItem[],
    error: any,
  ): Promise<void> {
    for (const item of items) {
      const attempts = (item.attempts || 0) + 1;
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 30000);

      await offlineDB.syncQueue.update(item.id!, {
        attempts,
        lastAttempt: new Date().toISOString(),
        nextRetry: new Date(Date.now() + backoffMs).toISOString(),
      });
    }
  }

  /**
   * Store coaching recommendations from server
   */
  private static async storeCoachingRecommendations(
    recommendations: any[],
  ): Promise<void> {
    for (const rec of recommendations) {
      await offlineDB.coachingRecommendations.add({
        id: rec.id,
        supplierId: rec.supplierId,
        type: rec.type,
        content: rec.content,
        priority: rec.priority,
        createdAt: rec.createdAt,
        status: 'pending',
      });
    }
  }

  /**
   * Get offline success metrics for supplier
   */
  static async getOfflineSuccessMetrics(
    supplierId: string,
  ): Promise<SuccessMetrics> {
    const milestones = await offlineDB.milestones
      .where('supplierId')
      .equals(supplierId)
      .toArray();

    const healthScore =
      this.healthScoreCache.get(supplierId) ||
      (await offlineDB.healthScores
        .where('supplierId')
        .equals(supplierId)
        .first());

    const interventions = await offlineDB.interventions
      .where('supplierId')
      .equals(supplierId)
      .toArray();

    return {
      milestones: milestones.length,
      healthScore: healthScore?.score || 0,
      riskLevel: healthScore?.riskLevel || 'healthy',
      activeInterventions: interventions.filter((i) => i.status === 'pending')
        .length,
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Initialize offline success system
   */
  static async initialize(): Promise<void> {
    console.log('[Offline Success] Initializing offline success system');

    // Set up periodic sync
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.processOfflineSuccessQueue();
      }
    }, 45000); // Every 45 seconds

    // Process celebrations
    setInterval(() => {
      this.processCelebrationQueue();
    }, 1000); // Every second

    // Process any pending items on init
    if (navigator.onLine) {
      setTimeout(() => {
        this.processOfflineSuccessQueue();
      }, 7000); // 7 second delay after init
    }

    console.log('[Offline Success] System initialized successfully');
  }

  /**
   * Process celebration queue
   */
  private static processCelebrationQueue(): void {
    if (this.celebrationQueue.length > 0) {
      const celebration = this.celebrationQueue.shift()!;

      // Dispatch to UI
      window.dispatchEvent(
        new CustomEvent('show-celebration', {
          detail: celebration,
        }),
      );
    }
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  OfflineSuccessIntegration.initialize();
}

export default OfflineSuccessIntegration;
