import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/monitoring/logger';

export interface ViralEvent {
  id: string;
  type:
    | 'invitation_sent'
    | 'invitation_converted'
    | 'super_connector_identified'
    | 'viral_milestone_reached'
    | 'attribution_tracked'
    | 'reward_earned';
  actorId: string;
  actorType: 'supplier' | 'couple' | 'super_connector';
  targetId?: string;
  metadata: {
    relationship?: string;
    channel?: 'email' | 'sms' | 'whatsapp';
    templateVariant?: string;
    viralChainDepth?: number;
    revenueImpact?: number;
    abTestId?: string;
  };
  coefficientImpact: number;
  timestamp: Date;
}

export class ViralEventStream {
  private static supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  /**
   * Broadcast viral event to all integrated systems
   */
  static async broadcastViralEvent(event: ViralEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // Log the event for monitoring
      logger.info('Broadcasting viral event', {
        eventType: event.type,
        actorId: event.actorId,
        coefficientImpact: event.coefficientImpact,
      });

      // Execute all broadcasts in parallel for performance
      await Promise.all([
        this.broadcastToViralDashboard(event),
        this.sendAttributionEvent(event),
        this.updateExternalMetrics(event),
        this.queueForOfflineSync(event),
        this.updateCachedMetrics(event),
        this.notifySuperConnectors(event),
      ]);

      // Track performance
      const duration = Date.now() - startTime;
      if (duration > 50) {
        logger.warn('Viral event broadcast took longer than expected', {
          duration,
          eventType: event.type,
        });
      }

      // Store event for analytics
      await this.storeEventForAnalytics(event);
    } catch (error) {
      logger.error('Failed to broadcast viral event', {
        error,
        eventType: event.type,
        actorId: event.actorId,
      });
      throw error;
    }
  }

  /**
   * Broadcast to Team A's Viral Dashboard for real-time updates
   */
  private static async broadcastToViralDashboard(
    event: ViralEvent,
  ): Promise<void> {
    const channel = this.supabase.channel('viral-metrics');

    await channel.send({
      type: 'broadcast',
      event: 'viral-update',
      payload: {
        eventId: event.id,
        eventType: event.type,
        coefficientChange: event.coefficientImpact,
        newInvitation: event.type === 'invitation_sent',
        conversion: event.type === 'invitation_converted',
        superConnectorUpdate: event.actorType === 'super_connector',
        timestamp: event.timestamp.toISOString(),
        metadata: event.metadata,
      },
    });

    // Update real-time activity metrics
    if (
      event.type === 'invitation_sent' ||
      event.type === 'invitation_converted'
    ) {
      await redis.hincrby('viral:realtime:activity', event.type, 1);
      await redis.expire('viral:realtime:activity', 3600); // 1 hour TTL
    }
  }

  /**
   * Send attribution events to Team D's marketing automation
   */
  private static async sendAttributionEvent(event: ViralEvent): Promise<void> {
    if (!['invitation_converted', 'attribution_tracked'].includes(event.type)) {
      return;
    }

    const attributionPayload = {
      userId: event.targetId,
      referrerId: event.actorId,
      eventType: 'viral_attribution',
      channel: event.metadata.channel,
      campaignId: event.metadata.abTestId,
      revenueImpact: event.metadata.revenueImpact || 0,
      viralChainDepth: event.metadata.viralChainDepth || 1,
      timestamp: event.timestamp,
    };

    // Send to marketing automation system
    await fetch('/api/marketing/attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attributionPayload),
    });

    // Update user segments for targeted campaigns
    if (event.actorType === 'super_connector') {
      await this.updateMarketingSegments(event.actorId, 'super_connector');
    }
  }

  /**
   * Update metrics for Team C's external integrations
   */
  private static async updateExternalMetrics(event: ViralEvent): Promise<void> {
    const metricsPayload = {
      metric: 'viral_activity',
      value: 1,
      dimensions: {
        eventType: event.type,
        channel: event.metadata.channel,
        actorType: event.actorType,
      },
      timestamp: event.timestamp,
    };

    // Send to webhook endpoints for external systems
    const webhookUrls = await this.getActiveWebhookUrls('viral_events');

    await Promise.all(
      webhookUrls.map((url) =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'viral_metric_update',
            data: metricsPayload,
          }),
        }).catch((error) => {
          logger.error('Failed to send viral metric to webhook', {
            url,
            error,
          });
        }),
      ),
    );

    // Update multi-channel delivery stats
    if (event.metadata.channel) {
      await redis.hincrby(
        `viral:channel:stats:${event.metadata.channel}`,
        event.type,
        1,
      );
    }
  }

  /**
   * Queue events for Team E's offline sync functionality
   */
  private static async queueForOfflineSync(event: ViralEvent): Promise<void> {
    const syncPayload = {
      id: event.id,
      type: 'viral_event',
      priority: event.actorType === 'super_connector' ? 'high' : 'normal',
      data: event,
      createdAt: event.timestamp,
    };

    // Add to offline sync queue
    await redis.zadd(
      'offline:sync:queue:viral',
      Date.now(),
      JSON.stringify(syncPayload),
    );

    // Store in IndexedDB-compatible format for offline access
    await this.supabase.from('offline_sync_queue').insert({
      entity_type: 'viral_event',
      entity_id: event.id,
      action: 'sync',
      payload: syncPayload,
      priority: syncPayload.priority === 'high' ? 1 : 2,
      created_at: event.timestamp.toISOString(),
    });
  }

  /**
   * Update cached viral coefficient and metrics
   */
  private static async updateCachedMetrics(event: ViralEvent): Promise<void> {
    // Update viral coefficient cache
    if (event.coefficientImpact !== 0) {
      const currentCoefficient = await redis.get('viral:coefficient:current');
      const newCoefficient =
        parseFloat(currentCoefficient || '1.0') + event.coefficientImpact;

      await redis.setex(
        'viral:coefficient:current',
        300, // 5 minute TTL
        newCoefficient.toFixed(3),
      );

      // Check if we hit the target
      if (newCoefficient >= 1.2) {
        await this.triggerViralMilestone(
          'coefficient_target_reached',
          newCoefficient,
        );
      }
    }

    // Update conversion rate cache
    if (
      event.type === 'invitation_sent' ||
      event.type === 'invitation_converted'
    ) {
      const sent = await redis.hincrby(
        'viral:stats:total',
        'sent',
        event.type === 'invitation_sent' ? 1 : 0,
      );
      const accepted = await redis.hincrby(
        'viral:stats:total',
        'accepted',
        event.type === 'invitation_converted' ? 1 : 0,
      );

      const conversionRate = accepted / sent;
      await redis.setex(
        'viral:conversion:rate',
        300,
        conversionRate.toFixed(3),
      );
    }
  }

  /**
   * Notify super-connectors of relevant events
   */
  private static async notifySuperConnectors(event: ViralEvent): Promise<void> {
    if (
      event.type !== 'super_connector_identified' &&
      event.type !== 'viral_milestone_reached'
    ) {
      return;
    }

    // Get super-connector notification preferences
    const { data: preferences } = await this.supabase
      .from('super_connector_preferences')
      .select('user_id, notification_channels')
      .eq('notifications_enabled', true);

    if (!preferences || preferences.length === 0) return;

    // Send notifications based on preferences
    for (const pref of preferences) {
      const channels = pref.notification_channels as string[];

      if (channels.includes('in_app')) {
        await this.sendInAppNotification(pref.user_id, event);
      }

      if (
        channels.includes('email') &&
        event.type === 'viral_milestone_reached'
      ) {
        await this.queueEmailNotification(pref.user_id, event);
      }
    }
  }

  /**
   * Store event for long-term analytics
   */
  private static async storeEventForAnalytics(
    event: ViralEvent,
  ): Promise<void> {
    await this.supabase.from('viral_events_analytics').insert({
      event_id: event.id,
      event_type: event.type,
      actor_id: event.actorId,
      actor_type: event.actorType,
      target_id: event.targetId,
      metadata: event.metadata,
      coefficient_impact: event.coefficientImpact,
      created_at: event.timestamp.toISOString(),
    });
  }

  /**
   * Update marketing segments for user targeting
   */
  private static async updateMarketingSegments(
    userId: string,
    segment: string,
  ): Promise<void> {
    await fetch('/api/marketing/segments/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        segments: [segment],
        source: 'viral_optimization',
      }),
    });
  }

  /**
   * Get active webhook URLs for event type
   */
  private static async getActiveWebhookUrls(
    eventType: string,
  ): Promise<string[]> {
    const { data } = await this.supabase
      .from('webhook_subscriptions')
      .select('url')
      .eq('event_type', eventType)
      .eq('active', true);

    return data?.map((d) => d.url) || [];
  }

  /**
   * Trigger viral milestone celebration
   */
  private static async triggerViralMilestone(
    milestone: string,
    value: number,
  ): Promise<void> {
    const milestoneEvent: ViralEvent = {
      id: `milestone_${Date.now()}`,
      type: 'viral_milestone_reached',
      actorId: 'system',
      actorType: 'supplier',
      metadata: {
        milestone,
        value,
      },
      coefficientImpact: 0,
      timestamp: new Date(),
    };

    // Broadcast milestone internally (avoid recursion)
    await this.broadcastToViralDashboard(milestoneEvent);
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(
    userId: string,
    event: ViralEvent,
  ): Promise<void> {
    await this.supabase.from('notifications').insert({
      user_id: userId,
      type: 'viral_event',
      title: 'Viral Growth Update',
      message: `Your viral ${event.type.replace('_', ' ')}!`,
      data: { eventId: event.id },
      read: false,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Queue email notification
   */
  private static async queueEmailNotification(
    userId: string,
    event: ViralEvent,
  ): Promise<void> {
    await redis.rpush(
      'email:queue:viral',
      JSON.stringify({
        userId,
        templateId: 'viral_milestone',
        data: event,
        priority: 'low',
      }),
    );
  }
}
