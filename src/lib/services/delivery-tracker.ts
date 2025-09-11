import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Service Delivery Tracker
 * Unified tracking system for email and SMS delivery across journey executions
 */

export interface DeliveryEvent {
  id: string;
  journey_id: string;
  instance_id: string;
  client_id: string;
  message_type: 'email' | 'sms';
  message_id: string;
  template_id?: string;
  recipient: string;
  event_type:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'failed'
    | 'replied'
    | 'unsubscribed';
  timestamp: string;
  event_data: Record<string, any>;
  provider: 'resend' | 'twilio' | 'sendgrid' | 'ses';
  cost?: number;
  segments_used?: number;
  processed_at: string;
}

export interface DeliveryMetrics {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_failed: number;
  total_replies: number;
  total_unsubscribed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  response_rate: number;
  total_cost: number;
  average_cost_per_message: number;
}

export interface DeliveryStatus {
  message_id: string;
  current_status: string;
  delivery_timeline: Array<{
    event_type: string;
    timestamp: string;
    details?: any;
  }>;
  recipient: string;
  message_type: 'email' | 'sms';
  template_used?: string;
  cost: number;
  segments_used?: number;
  error_message?: string;
}

export class DeliveryTracker {
  private static instance: DeliveryTracker;

  static getInstance(): DeliveryTracker {
    if (!DeliveryTracker.instance) {
      DeliveryTracker.instance = new DeliveryTracker();
    }
    return DeliveryTracker.instance;
  }

  /**
   * Track a delivery event
   */
  async trackEvent(
    event: Omit<DeliveryEvent, 'id' | 'processed_at'>,
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('delivery_events')
        .insert({
          ...event,
          processed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to track delivery event: ${error.message}`);
      }

      // Update delivery status summary
      await this.updateDeliveryStatus(event);

      // Update real-time analytics
      await this.updateRealtimeMetrics(event);

      // Check for delivery failures and trigger alerts
      if (event.event_type === 'failed' || event.event_type === 'bounced') {
        await this.handleDeliveryFailure(event);
      }

      console.log(
        `Delivery event tracked: ${event.event_type} for ${event.message_id}`,
      );
      return data.id;
    } catch (error) {
      console.error('Failed to track delivery event:', error);
      throw error;
    }
  }

  /**
   * Get delivery status for a specific message
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus | null> {
    try {
      // Get all events for this message
      const { data: events, error } = await supabase
        .from('delivery_events')
        .select('*')
        .eq('message_id', messageId)
        .order('timestamp', { ascending: true });

      if (error || !events || events.length === 0) {
        return null;
      }

      const latestEvent = events[events.length - 1];
      const totalCost = events.reduce(
        (sum, event) => sum + (event.cost || 0),
        0,
      );
      const totalSegments = events.reduce(
        (sum, event) => sum + (event.segments_used || 0),
        0,
      );

      return {
        message_id: messageId,
        current_status: latestEvent.event_type,
        delivery_timeline: events.map((event) => ({
          event_type: event.event_type,
          timestamp: event.timestamp,
          details: event.event_data,
        })),
        recipient: latestEvent.recipient,
        message_type: latestEvent.message_type,
        template_used: latestEvent.template_id,
        cost: totalCost,
        segments_used: totalSegments,
        error_message:
          latestEvent.event_type === 'failed'
            ? latestEvent.event_data?.error_message
            : undefined,
      };
    } catch (error) {
      console.error('Failed to get delivery status:', error);
      return null;
    }
  }

  /**
   * Get delivery metrics for a journey or time period
   */
  async getDeliveryMetrics(params: {
    journey_id?: string;
    instance_id?: string;
    client_id?: string;
    message_type?: 'email' | 'sms';
    start_date?: string;
    end_date?: string;
    template_id?: string;
  }): Promise<DeliveryMetrics> {
    try {
      let query = supabase
        .from('delivery_events')
        .select('event_type, cost, segments_used, message_id');

      // Apply filters
      if (params.journey_id) {
        query = query.eq('journey_id', params.journey_id);
      }
      if (params.instance_id) {
        query = query.eq('instance_id', params.instance_id);
      }
      if (params.client_id) {
        query = query.eq('client_id', params.client_id);
      }
      if (params.message_type) {
        query = query.eq('message_type', params.message_type);
      }
      if (params.template_id) {
        query = query.eq('template_id', params.template_id);
      }
      if (params.start_date) {
        query = query.gte('timestamp', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('timestamp', params.end_date);
      }

      const { data: events } = await query;

      const metrics = {
        total_sent: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_failed: 0,
        total_replies: 0,
        total_unsubscribed: 0,
        total_cost: 0,
      };

      const uniqueMessages = new Set<string>();

      events?.forEach((event) => {
        // Count unique messages only once for sent
        if (event.event_type === 'sent') {
          if (!uniqueMessages.has(event.message_id)) {
            metrics.total_sent++;
            uniqueMessages.add(event.message_id);
          }
        }

        // Count all other events
        switch (event.event_type) {
          case 'delivered':
            metrics.total_delivered++;
            break;
          case 'opened':
            metrics.total_opened++;
            break;
          case 'clicked':
            metrics.total_clicked++;
            break;
          case 'bounced':
            metrics.total_bounced++;
            break;
          case 'failed':
            metrics.total_failed++;
            break;
          case 'replied':
            metrics.total_replies++;
            break;
          case 'unsubscribed':
            metrics.total_unsubscribed++;
            break;
        }

        metrics.total_cost += event.cost || 0;
      });

      // Calculate rates
      const deliveryRate =
        metrics.total_sent > 0
          ? (metrics.total_delivered / metrics.total_sent) * 100
          : 0;
      const openRate =
        metrics.total_delivered > 0
          ? (metrics.total_opened / metrics.total_delivered) * 100
          : 0;
      const clickRate =
        metrics.total_opened > 0
          ? (metrics.total_clicked / metrics.total_opened) * 100
          : 0;
      const bounceRate =
        metrics.total_sent > 0
          ? (metrics.total_bounced / metrics.total_sent) * 100
          : 0;
      const responseRate =
        metrics.total_sent > 0
          ? (metrics.total_replies / metrics.total_sent) * 100
          : 0;
      const averageCostPerMessage =
        uniqueMessages.size > 0 ? metrics.total_cost / uniqueMessages.size : 0;

      return {
        ...metrics,
        delivery_rate: Math.round(deliveryRate * 100) / 100,
        open_rate: Math.round(openRate * 100) / 100,
        click_rate: Math.round(clickRate * 100) / 100,
        bounce_rate: Math.round(bounceRate * 100) / 100,
        response_rate: Math.round(responseRate * 100) / 100,
        average_cost_per_message:
          Math.round(averageCostPerMessage * 10000) / 10000,
      };
    } catch (error) {
      console.error('Failed to get delivery metrics:', error);

      // Return empty metrics on error
      return {
        total_sent: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_failed: 0,
        total_replies: 0,
        total_unsubscribed: 0,
        delivery_rate: 0,
        open_rate: 0,
        click_rate: 0,
        bounce_rate: 0,
        response_rate: 0,
        total_cost: 0,
        average_cost_per_message: 0,
      };
    }
  }

  /**
   * Get delivery analytics dashboard data
   */
  async getDashboardData(journeyId?: string): Promise<{
    today_metrics: DeliveryMetrics;
    week_metrics: DeliveryMetrics;
    month_metrics: DeliveryMetrics;
    recent_failures: Array<{
      message_id: string;
      recipient: string;
      message_type: string;
      error_message: string;
      timestamp: string;
    }>;
    top_performing_templates: Array<{
      template_id: string;
      template_name: string;
      sent_count: number;
      delivery_rate: number;
      open_rate: number;
    }>;
  }> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const monthAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const baseParams = journeyId ? { journey_id: journeyId } : {};

    const [
      todayMetrics,
      weekMetrics,
      monthMetrics,
      recentFailures,
      topTemplates,
    ] = await Promise.all([
      this.getDeliveryMetrics({ ...baseParams, start_date: today }),
      this.getDeliveryMetrics({ ...baseParams, start_date: weekAgo }),
      this.getDeliveryMetrics({ ...baseParams, start_date: monthAgo }),
      this.getRecentFailures(journeyId),
      this.getTopPerformingTemplates(journeyId),
    ]);

    return {
      today_metrics: todayMetrics,
      week_metrics: weekMetrics,
      month_metrics: monthMetrics,
      recent_failures: recentFailures,
      top_performing_templates: topTemplates,
    };
  }

  /**
   * Get real-time delivery status for active journeys
   */
  async getRealtimeDeliveryStatus(journeyIds: string[]): Promise<
    Record<
      string,
      {
        active_messages: number;
        delivered_today: number;
        failed_today: number;
        pending_deliveries: number;
      }
    >
  > {
    const today = new Date().toISOString().split('T')[0];
    const status: Record<string, any> = {};

    for (const journeyId of journeyIds) {
      const { data: events } = await supabase
        .from('delivery_events')
        .select('event_type, timestamp')
        .eq('journey_id', journeyId)
        .gte('timestamp', today);

      const todayEvents = events || [];

      status[journeyId] = {
        active_messages: todayEvents.filter((e) => e.event_type === 'sent')
          .length,
        delivered_today: todayEvents.filter((e) => e.event_type === 'delivered')
          .length,
        failed_today: todayEvents.filter((e) =>
          ['failed', 'bounced'].includes(e.event_type),
        ).length,
        pending_deliveries:
          todayEvents.filter((e) => e.event_type === 'sent').length -
          todayEvents.filter((e) =>
            ['delivered', 'failed', 'bounced'].includes(e.event_type),
          ).length,
      };
    }

    return status;
  }

  /**
   * Handle delivery webhook events
   */
  async handleWebhookEvent(webhookData: {
    provider: 'resend' | 'twilio' | 'sendgrid' | 'ses';
    message_id: string;
    event_type: string;
    timestamp: string;
    recipient: string;
    event_data: Record<string, any>;
  }): Promise<void> {
    try {
      // Find the original message context
      const { data: originalEvent } = await supabase
        .from('delivery_events')
        .select('journey_id, instance_id, client_id, message_type, template_id')
        .eq('message_id', webhookData.message_id)
        .eq('event_type', 'sent')
        .single();

      if (!originalEvent) {
        console.warn(
          `No original event found for webhook: ${webhookData.message_id}`,
        );
        return;
      }

      // Track the webhook event
      await this.trackEvent({
        journey_id: originalEvent.journey_id,
        instance_id: originalEvent.instance_id,
        client_id: originalEvent.client_id,
        message_type: originalEvent.message_type,
        message_id: webhookData.message_id,
        template_id: originalEvent.template_id,
        recipient: webhookData.recipient,
        event_type: this.normalizeEventType(webhookData.event_type) as any,
        timestamp: webhookData.timestamp,
        event_data: webhookData.event_data,
        provider: webhookData.provider,
        cost: webhookData.event_data.cost,
        segments_used: webhookData.event_data.segments,
      });

      console.log(
        `Webhook event processed: ${webhookData.event_type} for ${webhookData.message_id}`,
      );
    } catch (error) {
      console.error('Webhook event processing failed:', error);
      throw error;
    }
  }

  /**
   * Update delivery status summary
   */
  private async updateDeliveryStatus(
    event: Omit<DeliveryEvent, 'id' | 'processed_at'>,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('delivery_status_summary').upsert({
        message_id: event.message_id,
        journey_id: event.journey_id,
        instance_id: event.instance_id,
        client_id: event.client_id,
        current_status: event.event_type,
        last_updated: event.timestamp,
        message_type: event.message_type,
        recipient: event.recipient,
        template_id: event.template_id,
        provider: event.provider,
      });

      if (error) {
        console.error('Failed to update delivery status summary:', error);
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  /**
   * Update real-time metrics
   */
  private async updateRealtimeMetrics(
    event: Omit<DeliveryEvent, 'id' | 'processed_at'>,
  ): Promise<void> {
    // This would typically update a real-time dashboard
    // For now, we'll just publish to a channel
    try {
      await supabase.channel('delivery_metrics').send({
        type: 'broadcast',
        event: 'metric_update',
        payload: {
          journey_id: event.journey_id,
          event_type: event.event_type,
          message_type: event.message_type,
          timestamp: event.timestamp,
        },
      });
    } catch (error) {
      console.error('Failed to broadcast metric update:', error);
    }
  }

  /**
   * Handle delivery failures
   */
  private async handleDeliveryFailure(
    event: Omit<DeliveryEvent, 'id' | 'processed_at'>,
  ): Promise<void> {
    try {
      // Count recent failures for this journey
      const { data: recentFailures } = await supabase
        .from('delivery_events')
        .select('id')
        .eq('journey_id', event.journey_id)
        .eq('event_type', event.event_type)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      const failureCount = recentFailures?.length || 0;

      // If failure rate is high, create an alert
      if (failureCount > 10) {
        await this.createDeliveryAlert({
          journey_id: event.journey_id,
          alert_type: 'high_failure_rate',
          severity: failureCount > 50 ? 'critical' : 'warning',
          message: `High ${event.message_type} failure rate: ${failureCount} failures in the last hour`,
          details: {
            event_type: event.event_type,
            message_type: event.message_type,
            failure_count: failureCount,
            recent_error: event.event_data,
          },
        });
      }

      // Handle specific failure types
      if (event.event_type === 'bounced' && event.message_type === 'email') {
        await this.handleEmailBounce(event);
      }
    } catch (error) {
      console.error('Failed to handle delivery failure:', error);
    }
  }

  /**
   * Handle email bounces
   */
  private async handleEmailBounce(
    event: Omit<DeliveryEvent, 'id' | 'processed_at'>,
  ): Promise<void> {
    const bounceType = event.event_data.bounce_type || 'unknown';

    if (bounceType === 'hard') {
      // Mark email as invalid
      await supabase
        .from('clients')
        .update({
          email_status: 'invalid',
          email_bounce_reason: event.event_data.reason,
        })
        .eq('id', event.client_id);
    }
  }

  /**
   * Create delivery alert
   */
  private async createDeliveryAlert(alert: {
    journey_id: string;
    alert_type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    details: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('delivery_alerts').insert({
        ...alert,
        created_at: new Date().toISOString(),
        status: 'active',
      });

      console.log(
        `Delivery alert created: ${alert.alert_type} for journey ${alert.journey_id}`,
      );
    } catch (error) {
      console.error('Failed to create delivery alert:', error);
    }
  }

  /**
   * Get recent failures
   */
  private async getRecentFailures(journeyId?: string): Promise<
    Array<{
      message_id: string;
      recipient: string;
      message_type: string;
      error_message: string;
      timestamp: string;
    }>
  > {
    let query = supabase
      .from('delivery_events')
      .select('message_id, recipient, message_type, event_data, timestamp')
      .in('event_type', ['failed', 'bounced'])
      .order('timestamp', { ascending: false })
      .limit(10);

    if (journeyId) {
      query = query.eq('journey_id', journeyId);
    }

    const { data } = await query;

    return (
      data?.map((event) => ({
        message_id: event.message_id,
        recipient: event.recipient,
        message_type: event.message_type,
        error_message:
          event.event_data?.error_message ||
          event.event_data?.reason ||
          'Unknown error',
        timestamp: event.timestamp,
      })) || []
    );
  }

  /**
   * Get top performing templates
   */
  private async getTopPerformingTemplates(journeyId?: string): Promise<
    Array<{
      template_id: string;
      template_name: string;
      sent_count: number;
      delivery_rate: number;
      open_rate: number;
    }>
  > {
    // This would require more complex aggregation queries
    // For now, returning empty array as placeholder
    return [];
  }

  /**
   * Normalize event type from different providers
   */
  private normalizeEventType(eventType: string): string {
    const typeMap: Record<string, string> = {
      // Resend events
      delivery: 'delivered',
      bounce: 'bounced',
      complaint: 'complained',

      // Twilio events
      delivered: 'delivered',
      undelivered: 'failed',
      receiving: 'replied',

      // SendGrid events
      processed: 'sent',
      dropped: 'failed',
      deferred: 'queued',
      delivered: 'delivered',
      bounce: 'bounced',
      open: 'opened',
      click: 'clicked',
      spamreport: 'complained',
      unsubscribe: 'unsubscribed',
    };

    return typeMap[eventType.toLowerCase()] || eventType;
  }
}

// Export singleton instance
export const deliveryTracker = DeliveryTracker.getInstance();
