/**
 * WS-142: Success Event Hub - Real-time Integration Coordinator
 * Orchestrates customer success events across all integrated systems (Teams A, B, D, E)
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { WebSocket } from 'ws';

export interface SuccessEvent {
  id: string;
  supplierId: string;
  organizationId?: string;
  type:
    | 'milestone_achieved'
    | 'health_improved'
    | 'health_declined'
    | 'churn_risk_high'
    | 'churn_risk_resolved'
    | 'success_champion'
    | 'engagement_increased'
    | 'feature_adopted'
    | 'support_resolved'
    | 'intervention_successful';
  severity: 'info' | 'warning' | 'success' | 'critical';
  data: Record<string, any>;
  milestone?: string;
  healthScore?: number;
  churnProbability?: number;
  timestamp: Date;
  metadata: {
    source: string;
    processedSystems: string[];
    correlationId: string;
  };
}

export interface IntegrationResult {
  system: 'viral' | 'marketing' | 'dashboard' | 'offline';
  success: boolean;
  responseTime: number;
  error?: string;
  data?: any;
}

export class SuccessEventHub {
  private static instance: SuccessEventHub;
  private supabase: SupabaseClient;
  private eventQueue: Map<string, SuccessEvent[]> = new Map();
  private integrationMetrics: Map<string, IntegrationResult[]> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private eventProcessingTimeout = 5000; // 5 seconds max per system

  private constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.initializeEventListeners();
    this.startHealthMonitoring();
  }

  public static getInstance(supabase?: SupabaseClient): SuccessEventHub {
    if (!SuccessEventHub.instance) {
      SuccessEventHub.instance = new SuccessEventHub(supabase);
    }
    return SuccessEventHub.instance;
  }

  /**
   * Broadcast success event to all integrated systems
   */
  public static async broadcastSuccessEvent(
    event: SuccessEvent,
  ): Promise<IntegrationResult[]> {
    const hub = SuccessEventHub.getInstance();
    return hub.processEvent(event);
  }

  /**
   * Process and distribute success event to all systems
   */
  private async processEvent(
    event: SuccessEvent,
  ): Promise<IntegrationResult[]> {
    const startTime = Date.now();
    const results: IntegrationResult[] = [];

    try {
      // Add event to processing queue
      await this.queueEvent(event);

      // Broadcast to all integrated systems in parallel with timeout
      const integrationPromises = [
        this.updateViralScoring(event),
        this.triggerMarketingEvents(event),
        this.updateDashboard(event),
        this.queueOfflineSync(event),
      ];

      // Wait for all integrations with timeout
      const integrationResults = await Promise.allSettled(
        integrationPromises.map((promise) =>
          this.withTimeout(promise, this.eventProcessingTimeout),
        ),
      );

      // Process results
      integrationResults.forEach((result, index) => {
        const systems = ['viral', 'marketing', 'dashboard', 'offline'];
        if (result.status === 'fulfilled') {
          results.push(result.value as IntegrationResult);
        } else {
          results.push({
            system: systems[index] as any,
            success: false,
            responseTime: Date.now() - startTime,
            error: result.reason?.message || 'Integration failed',
          });
        }
      });

      // Store metrics for monitoring
      await this.storeIntegrationMetrics(event.id, results);

      // Update event processing status
      await this.updateEventStatus(event.id, 'processed', results);

      // Log successful processing
      await this.logEventProcessing(event, results, Date.now() - startTime);

      return results;
    } catch (error) {
      console.error('Error processing success event:', error);
      await this.handleEventError(event, error as Error);
      throw error;
    }
  }

  /**
   * Update viral scoring based on success events
   */
  private async updateViralScoring(
    event: SuccessEvent,
  ): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      if (
        event.type === 'milestone_achieved' ||
        event.type === 'health_improved' ||
        event.type === 'success_champion'
      ) {
        // Calculate viral boost based on success metrics
        const viralBoost = this.calculateSuccessBoost(event);

        // Send to viral optimization system
        const response = await fetch('/api/viral/health-boost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId: event.supplierId,
            successBoost: viralBoost,
            milestone: event.milestone,
            eventType: event.type,
            healthScore: event.healthScore,
          }),
        });

        if (!response.ok) {
          throw new Error(`Viral update failed: ${response.statusText}`);
        }

        const data = await response.json();

        return {
          system: 'viral',
          success: true,
          responseTime: Date.now() - startTime,
          data,
        };
      }

      return {
        system: 'viral',
        success: true,
        responseTime: Date.now() - startTime,
        data: { skipped: true, reason: 'Event type not applicable' },
      };
    } catch (error) {
      return {
        system: 'viral',
        success: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Trigger marketing automation events
   */
  private async triggerMarketingEvents(
    event: SuccessEvent,
  ): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      // Transform to marketing event format
      const marketingEvent = this.transformToMarketingEvent(event);

      // Send to marketing automation
      const response = await fetch('/api/marketing/success-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(marketingEvent),
      });

      if (!response.ok) {
        throw new Error(`Marketing trigger failed: ${response.statusText}`);
      }

      // Trigger specific campaigns based on event type
      if (event.type === 'churn_risk_high') {
        await this.triggerChurnPreventionCampaign(
          event.supplierId,
          event.churnProbability,
        );
      } else if (event.type === 'success_champion') {
        await this.triggerReferralCampaign(event.supplierId);
      } else if (event.type === 'milestone_achieved') {
        await this.triggerMilestoneCelebration(
          event.supplierId,
          event.milestone!,
        );
      }

      return {
        system: 'marketing',
        success: true,
        responseTime: Date.now() - startTime,
        data: await response.json(),
      };
    } catch (error) {
      return {
        system: 'marketing',
        success: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Update real-time dashboard
   */
  private async updateDashboard(
    event: SuccessEvent,
  ): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      // Send to dashboard WebSocket if connected
      const wsConnection = this.wsConnections.get(event.supplierId);
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(
          JSON.stringify({
            type: 'success_event',
            data: event,
          }),
        );
      }

      // Update dashboard cache
      await redis.hset(
        `dashboard:${event.supplierId}`,
        'lastSuccessEvent',
        JSON.stringify(event),
      );

      await redis.expire(`dashboard:${event.supplierId}`, 3600);

      // Update dashboard components based on event type
      const dashboardUpdates = await this.generateDashboardUpdates(event);

      // Send to dashboard API
      const response = await fetch('/api/dashboard/success-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: event.supplierId,
          event,
          updates: dashboardUpdates,
        }),
      });

      return {
        system: 'dashboard',
        success: true,
        responseTime: Date.now() - startTime,
        data: { updates: dashboardUpdates },
      };
    } catch (error) {
      return {
        system: 'dashboard',
        success: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Queue event for offline sync
   */
  private async queueOfflineSync(
    event: SuccessEvent,
  ): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      // Add to offline sync queue
      await redis.lpush(
        `offline_sync:${event.supplierId}`,
        JSON.stringify({
          ...event,
          queuedAt: new Date().toISOString(),
          priority: this.calculateSyncPriority(event),
        }),
      );

      // Set TTL for offline queue (7 days)
      await redis.expire(`offline_sync:${event.supplierId}`, 604800);

      // If critical event, mark for immediate sync
      if (event.severity === 'critical' || event.type === 'churn_risk_high') {
        await redis.sadd('offline_sync:priority', event.supplierId);
      }

      return {
        system: 'offline',
        success: true,
        responseTime: Date.now() - startTime,
        data: { queued: true, priority: event.severity },
      };
    } catch (error) {
      return {
        system: 'offline',
        success: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Calculate success boost for viral scoring
   */
  private calculateSuccessBoost(event: SuccessEvent): number {
    let boost = 0;

    switch (event.type) {
      case 'milestone_achieved':
        boost = 10 + (event.data.points || 0) / 10;
        break;
      case 'health_improved':
        boost = (event.healthScore || 0) / 10;
        break;
      case 'success_champion':
        boost = 25;
        break;
      case 'engagement_increased':
        boost = 5;
        break;
      default:
        boost = 2;
    }

    // Apply multipliers based on context
    if (event.data.firstTime) boost *= 1.5;
    if (event.data.teamAchievement) boost *= 2;

    return Math.min(boost, 50); // Cap at 50 points
  }

  /**
   * Transform success event to marketing format
   */
  private transformToMarketingEvent(event: SuccessEvent): any {
    return {
      eventType: `success_${event.type}`,
      userId: event.supplierId,
      organizationId: event.organizationId,
      timestamp: event.timestamp,
      properties: {
        severity: event.severity,
        healthScore: event.healthScore,
        churnProbability: event.churnProbability,
        milestone: event.milestone,
        ...event.data,
      },
      context: {
        source: 'customer_success',
        correlationId: event.metadata.correlationId,
      },
    };
  }

  /**
   * Trigger churn prevention campaign
   */
  private async triggerChurnPreventionCampaign(
    supplierId: string,
    churnProbability?: number,
  ): Promise<void> {
    await fetch('/api/marketing/campaigns/churn-prevention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId,
        churnProbability: churnProbability || 0.7,
        urgency: churnProbability && churnProbability > 0.8 ? 'high' : 'medium',
        campaignType: 'multi_channel',
        channels: ['email', 'in_app', 'sms'],
      }),
    });
  }

  /**
   * Trigger referral campaign for success champions
   */
  private async triggerReferralCampaign(supplierId: string): Promise<void> {
    await fetch('/api/marketing/campaigns/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId,
        campaignType: 'success_champion',
        incentive: 'double_points',
        duration: 30, // days
      }),
    });
  }

  /**
   * Trigger milestone celebration
   */
  private async triggerMilestoneCelebration(
    supplierId: string,
    milestone: string,
  ): Promise<void> {
    await fetch('/api/marketing/campaigns/celebration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId,
        milestone,
        celebrationType: 'achievement',
        rewards: ['badge', 'discount', 'feature_unlock'],
      }),
    });
  }

  /**
   * Generate dashboard updates based on event
   */
  private async generateDashboardUpdates(event: SuccessEvent): Promise<any> {
    const updates: any = {
      components: [],
      notifications: [],
      metrics: {},
    };

    switch (event.type) {
      case 'milestone_achieved':
        updates.components.push('MilestoneCard', 'ProgressBar');
        updates.notifications.push({
          type: 'success',
          message: `Milestone achieved: ${event.milestone}`,
          icon: '🎉',
        });
        updates.metrics.milestones = '+1';
        break;

      case 'churn_risk_high':
        updates.components.push('ChurnRiskIndicator', 'InterventionPanel');
        updates.notifications.push({
          type: 'warning',
          message: 'At-risk status detected',
          icon: '⚠️',
        });
        updates.metrics.riskScore = event.churnProbability;
        break;

      case 'health_improved':
        updates.components.push('HealthScoreCard');
        updates.metrics.healthScore = event.healthScore;
        break;

      case 'success_champion':
        updates.components.push('ChampionBadge', 'ReferralCard');
        updates.notifications.push({
          type: 'success',
          message: 'You are a Success Champion!',
          icon: '🏆',
        });
        break;
    }

    return updates;
  }

  /**
   * Calculate sync priority for offline events
   */
  private calculateSyncPriority(event: SuccessEvent): number {
    let priority = 0;

    // Severity-based priority
    switch (event.severity) {
      case 'critical':
        priority += 100;
        break;
      case 'warning':
        priority += 50;
        break;
      case 'success':
        priority += 25;
        break;
      case 'info':
        priority += 10;
        break;
    }

    // Type-based priority
    switch (event.type) {
      case 'churn_risk_high':
        priority += 80;
        break;
      case 'health_declined':
        priority += 60;
        break;
      case 'milestone_achieved':
        priority += 40;
        break;
      case 'success_champion':
        priority += 30;
        break;
    }

    return priority;
  }

  /**
   * Add timeout wrapper for async operations
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs),
      ),
    ]);
  }

  /**
   * Queue event for processing
   */
  private async queueEvent(event: SuccessEvent): Promise<void> {
    const queue = this.eventQueue.get(event.supplierId) || [];
    queue.push(event);

    // Keep only last 100 events per supplier
    if (queue.length > 100) {
      queue.shift();
    }

    this.eventQueue.set(event.supplierId, queue);

    // Store in database for persistence
    await this.supabase.from('success_event_log').insert({
      event_id: event.id,
      supplier_id: event.supplierId,
      event_type: event.type,
      severity: event.severity,
      event_data: event.data,
      metadata: event.metadata,
      created_at: event.timestamp,
    });
  }

  /**
   * Store integration metrics for monitoring
   */
  private async storeIntegrationMetrics(
    eventId: string,
    results: IntegrationResult[],
  ): Promise<void> {
    this.integrationMetrics.set(eventId, results);

    // Store in Redis for monitoring
    await redis.hset(
      'integration_metrics',
      eventId,
      JSON.stringify({
        results,
        timestamp: new Date().toISOString(),
      }),
    );

    await redis.expire('integration_metrics', 86400); // 24 hours
  }

  /**
   * Update event processing status
   */
  private async updateEventStatus(
    eventId: string,
    status: string,
    results: IntegrationResult[],
  ): Promise<void> {
    await this.supabase
      .from('success_event_log')
      .update({
        processing_status: status,
        integration_results: results,
        processed_at: new Date(),
      })
      .eq('event_id', eventId);
  }

  /**
   * Log event processing for analytics
   */
  private async logEventProcessing(
    event: SuccessEvent,
    results: IntegrationResult[],
    processingTime: number,
  ): Promise<void> {
    const successCount = results.filter((r) => r.success).length;
    const avgResponseTime =
      results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    await this.supabase.from('event_processing_analytics').insert({
      event_id: event.id,
      event_type: event.type,
      processing_time: processingTime,
      integrations_successful: successCount,
      integrations_total: results.length,
      avg_response_time: avgResponseTime,
      created_at: new Date(),
    });
  }

  /**
   * Handle event processing errors
   */
  private async handleEventError(
    event: SuccessEvent,
    error: Error,
  ): Promise<void> {
    console.error(`Error processing event ${event.id}:`, error);

    await this.supabase.from('success_event_errors').insert({
      event_id: event.id,
      error_message: error.message,
      error_stack: error.stack,
      event_data: event,
      created_at: new Date(),
    });

    // Alert monitoring system
    await fetch('/api/monitoring/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'success_event_error',
        severity: 'high',
        message: `Failed to process success event: ${error.message}`,
        eventId: event.id,
        supplierId: event.supplierId,
      }),
    });
  }

  /**
   * Initialize event listeners for real-time processing
   */
  private initializeEventListeners(): void {
    // Listen for WebSocket connections
    if (typeof window === 'undefined') {
      // Server-side WebSocket handling would go here
    }
  }

  /**
   * Start health monitoring for the event hub
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const health = await this.checkSystemHealth();
        if (health.status === 'unhealthy') {
          await this.alertOpsTeam(health);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<any> {
    const queueSize = Array.from(this.eventQueue.values()).reduce(
      (sum, q) => sum + q.length,
      0,
    );
    const metrics = Array.from(this.integrationMetrics.values()).flat();
    const failureRate =
      metrics.filter((m) => !m.success).length / (metrics.length || 1);

    return {
      status: failureRate > 0.2 || queueSize > 1000 ? 'unhealthy' : 'healthy',
      queueSize,
      failureRate,
      activeConnections: this.wsConnections.size,
    };
  }

  /**
   * Alert operations team
   */
  private async alertOpsTeam(health: any): Promise<void> {
    await fetch('/api/monitoring/ops-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component: 'success_event_hub',
        health,
        timestamp: new Date(),
      }),
    });
  }
}

// Export singleton instance
export const successEventHub = SuccessEventHub.getInstance();
