import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { emailProviderIntegration } from './email-provider-integration';
import { smsProviderIntegration } from './sms-provider-integration';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Delivery Status Aggregator Service
 * Unified collection and reporting of delivery status across all communication providers
 */

export interface UnifiedDeliveryMetrics {
  // Overall metrics
  total_messages: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;

  // Rates
  delivery_rate: number;
  failure_rate: number;
  engagement_rate: number;
  response_rate: number;

  // By communication type
  email: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    complained: number;
    unsubscribed: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  };

  sms: {
    sent: number;
    delivered: number;
    failed: number;
    read: number;
    replied: number;
    undelivered: number;
    delivery_rate: number;
    read_rate: number;
    response_rate: number;
    total_cost: number;
    total_segments: number;
  };

  // By provider
  providers: {
    [key: string]: {
      sent: number;
      delivered: number;
      failed: number;
      cost?: number;
      segments?: number;
    };
  };

  // Time-series data
  daily_stats: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    opened?: number;
    clicked?: number;
  }>;
}

export interface MessageStatusSummary {
  message_id: string;
  message_type: 'email' | 'sms';
  recipient: string;
  guest_id?: string;
  status:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'failed'
    | 'bounced'
    | 'read';
  sent_at: Date;
  delivered_at?: Date;
  last_activity_at?: Date;
  provider: string;
  failure_reason?: string;
  engagement_score: number;
  segments_used?: number;
  cost?: number;
}

export interface CommunicationCampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  unique_opens: number;
  unique_clicks: number;
  responses_received: number;
  unsubscribes: number;
  total_cost: number;
  roi_metrics: {
    cost_per_send: number;
    cost_per_delivery: number;
    cost_per_engagement: number;
  };
  performance_by_segment: Array<{
    segment_name: string;
    recipients: number;
    delivery_rate: number;
    engagement_rate: number;
  }>;
}

export class DeliveryStatusAggregator {
  private static instance: DeliveryStatusAggregator;

  static getInstance(): DeliveryStatusAggregator {
    if (!DeliveryStatusAggregator.instance) {
      DeliveryStatusAggregator.instance = new DeliveryStatusAggregator();
    }
    return DeliveryStatusAggregator.instance;
  }

  /**
   * Get unified delivery metrics for a couple across all providers
   */
  async getUnifiedMetrics(
    coupleId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<UnifiedDeliveryMetrics> {
    // Get metrics from each provider
    const [emailMetrics, smsMetrics] = await Promise.all([
      emailProviderIntegration.getDeliveryMetrics(coupleId, dateRange),
      smsProviderIntegration.getDeliveryMetrics(coupleId, dateRange),
    ]);

    // Get provider-specific breakdowns
    const providerBreakdown = await this.getProviderBreakdown(
      coupleId,
      dateRange,
    );

    // Get daily time-series data
    const dailyStats = await this.getDailyStats(coupleId, dateRange);

    // Calculate unified metrics
    const totalSent = emailMetrics.total_sent + smsMetrics.total_sent;
    const totalDelivered =
      emailMetrics.total_delivered + smsMetrics.total_delivered;
    const totalFailed = emailMetrics.total_failed + smsMetrics.total_failed;
    const totalEngagements =
      emailMetrics.total_opened +
      emailMetrics.total_clicked +
      smsMetrics.total_read +
      smsMetrics.total_received;

    return {
      // Overall metrics
      total_messages: totalSent,
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_failed: totalFailed,
      total_opened: emailMetrics.total_opened,
      total_clicked: emailMetrics.total_clicked,
      total_replied: smsMetrics.total_received,

      // Rates
      delivery_rate: totalSent ? (totalDelivered / totalSent) * 100 : 0,
      failure_rate: totalSent ? (totalFailed / totalSent) * 100 : 0,
      engagement_rate: totalDelivered
        ? (totalEngagements / totalDelivered) * 100
        : 0,
      response_rate: totalSent
        ? (smsMetrics.total_received / totalSent) * 100
        : 0,

      // By communication type
      email: emailMetrics,
      sms: smsMetrics,

      // By provider
      providers: providerBreakdown,

      // Time-series data
      daily_stats: dailyStats,
    };
  }

  /**
   * Get message status summaries for all messages
   */
  async getMessageStatusSummaries(
    coupleId: string,
    filters?: {
      messageType?: 'email' | 'sms';
      status?: string;
      dateRange?: { from: Date; to: Date };
      guestId?: string;
    },
  ): Promise<MessageStatusSummary[]> {
    let query = supabase
      .from('communication_events')
      .select(
        `
        message_id,
        communication_type,
        recipient,
        guest_id,
        event_type,
        timestamp,
        provider,
        metadata
      `,
      )
      .eq('couple_id', coupleId)
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters?.messageType) {
      query = query.eq('communication_type', filters.messageType);
    }
    if (filters?.status) {
      query = query.eq('event_type', filters.status);
    }
    if (filters?.guestId) {
      query = query.eq('guest_id', filters.guestId);
    }
    if (filters?.dateRange) {
      query = query
        .gte('timestamp', filters.dateRange.from.toISOString())
        .lte('timestamp', filters.dateRange.to.toISOString());
    }

    const { data: events, error } = await query;
    if (error) throw error;

    // Group events by message_id to get latest status
    const messageMap = new Map<string, any>();
    events?.forEach((event) => {
      const existing = messageMap.get(event.message_id);
      if (
        !existing ||
        new Date(event.timestamp) > new Date(existing.timestamp)
      ) {
        messageMap.set(event.message_id, event);
      }
    });

    // Convert to status summaries
    const summaries: MessageStatusSummary[] = [];
    for (const [messageId, event] of messageMap) {
      // Get all events for this message to calculate engagement score
      const messageEvents =
        events?.filter((e) => e.message_id === messageId) || [];
      const engagementScore = this.calculateEngagementScore(messageEvents);

      // Find sent and delivered timestamps
      const sentEvent = messageEvents.find((e) => e.event_type === 'sent');
      const deliveredEvent = messageEvents.find(
        (e) => e.event_type === 'delivered',
      );
      const lastActivity = messageEvents.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0];

      summaries.push({
        message_id: messageId,
        message_type: event.communication_type,
        recipient: event.recipient,
        guest_id: event.guest_id,
        status: event.event_type,
        sent_at: sentEvent
          ? new Date(sentEvent.timestamp)
          : new Date(event.timestamp),
        delivered_at: deliveredEvent
          ? new Date(deliveredEvent.timestamp)
          : undefined,
        last_activity_at: new Date(lastActivity.timestamp),
        provider: event.provider,
        failure_reason:
          event.metadata?.error_message || event.metadata?.failure_reason,
        engagement_score: engagementScore,
        segments_used: event.metadata?.num_segments,
        cost: event.metadata?.price
          ? parseFloat(event.metadata.price)
          : undefined,
      });
    }

    return summaries.sort((a, b) => b.sent_at.getTime() - a.sent_at.getTime());
  }

  /**
   * Get campaign-level metrics
   */
  async getCampaignMetrics(
    coupleId: string,
    campaignId: string,
  ): Promise<CommunicationCampaignMetrics> {
    // Get all events for this campaign
    const { data: events, error } = await supabase
      .from('communication_events')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('metadata->campaign_id', campaignId);

    if (error) throw error;

    // Get unique recipients
    const uniqueRecipients = new Set(events?.map((e) => e.recipient) || []);
    const uniqueMessages = new Set(events?.map((e) => e.message_id) || []);

    // Calculate metrics
    const sentEvents = events?.filter((e) => e.event_type === 'sent') || [];
    const deliveredEvents =
      events?.filter((e) => e.event_type === 'delivered') || [];
    const failedEvents =
      events?.filter(
        (e) =>
          e.event_type === 'failed' ||
          e.event_type === 'bounced' ||
          e.event_type === 'undelivered',
      ) || [];
    const openEvents = events?.filter((e) => e.event_type === 'opened') || [];
    const clickEvents = events?.filter((e) => e.event_type === 'clicked') || [];
    const responseEvents =
      events?.filter((e) => e.event_type === 'received') || [];
    const unsubscribeEvents =
      events?.filter((e) => e.event_type === 'unsubscribed') || [];

    // Calculate costs
    const totalCost =
      events?.reduce((sum, event) => {
        return (
          sum + (event.metadata?.price ? parseFloat(event.metadata.price) : 0)
        );
      }, 0) || 0;

    // Get performance by segment (if segments are tracked)
    const performanceBySegment = await this.getPerformanceBySegment(
      coupleId,
      campaignId,
    );

    const messagesDelivered = deliveredEvents.length;
    const messagesEngaged =
      openEvents.length + clickEvents.length + responseEvents.length;

    return {
      campaign_id: campaignId,
      campaign_name: `Campaign ${campaignId}`,
      total_recipients: uniqueRecipients.size,
      messages_sent: sentEvents.length,
      messages_delivered: messagesDelivered,
      messages_failed: failedEvents.length,
      unique_opens: new Set(openEvents.map((e) => e.recipient)).size,
      unique_clicks: new Set(clickEvents.map((e) => e.recipient)).size,
      responses_received: responseEvents.length,
      unsubscribes: unsubscribeEvents.length,
      total_cost: totalCost,
      roi_metrics: {
        cost_per_send: sentEvents.length ? totalCost / sentEvents.length : 0,
        cost_per_delivery: messagesDelivered
          ? totalCost / messagesDelivered
          : 0,
        cost_per_engagement: messagesEngaged ? totalCost / messagesEngaged : 0,
      },
      performance_by_segment: performanceBySegment,
    };
  }

  /**
   * Get real-time delivery status for active messages
   */
  async getRealTimeStatus(
    coupleId: string,
    messageIds?: string[],
  ): Promise<Map<string, MessageStatusSummary>> {
    let query = supabase
      .from('communication_events')
      .select('*')
      .eq('couple_id', coupleId)
      .gte(
        'timestamp',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ); // Last 24 hours

    if (messageIds && messageIds.length > 0) {
      query = query.in('message_id', messageIds);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    const statusMap = new Map<string, MessageStatusSummary>();

    // Group by message_id and get latest status
    const messageGroups = new Map<string, any[]>();
    events?.forEach((event) => {
      if (!messageGroups.has(event.message_id)) {
        messageGroups.set(event.message_id, []);
      }
      messageGroups.get(event.message_id)?.push(event);
    });

    for (const [messageId, messageEvents] of messageGroups) {
      const latestEvent = messageEvents.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0];

      const sentEvent = messageEvents.find((e) => e.event_type === 'sent');
      const deliveredEvent = messageEvents.find(
        (e) => e.event_type === 'delivered',
      );

      statusMap.set(messageId, {
        message_id: messageId,
        message_type: latestEvent.communication_type,
        recipient: latestEvent.recipient,
        guest_id: latestEvent.guest_id,
        status: latestEvent.event_type,
        sent_at: sentEvent
          ? new Date(sentEvent.timestamp)
          : new Date(latestEvent.timestamp),
        delivered_at: deliveredEvent
          ? new Date(deliveredEvent.timestamp)
          : undefined,
        last_activity_at: new Date(latestEvent.timestamp),
        provider: latestEvent.provider,
        failure_reason: latestEvent.metadata?.error_message,
        engagement_score: this.calculateEngagementScore(messageEvents),
        segments_used: latestEvent.metadata?.num_segments,
        cost: latestEvent.metadata?.price
          ? parseFloat(latestEvent.metadata.price)
          : undefined,
      });
    }

    return statusMap;
  }

  /**
   * Get provider-specific breakdown
   */
  private async getProviderBreakdown(
    coupleId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<{ [key: string]: any }> {
    let query = supabase
      .from('communication_events')
      .select('provider, event_type, metadata')
      .eq('couple_id', coupleId);

    if (dateRange) {
      query = query
        .gte('timestamp', dateRange.from.toISOString())
        .lte('timestamp', dateRange.to.toISOString());
    }

    const { data: events, error } = await query;
    if (error) throw error;

    const breakdown: { [key: string]: any } = {};

    events?.forEach((event) => {
      if (!breakdown[event.provider]) {
        breakdown[event.provider] = {
          sent: 0,
          delivered: 0,
          failed: 0,
          cost: 0,
          segments: 0,
        };
      }

      const provider = breakdown[event.provider];

      switch (event.event_type) {
        case 'sent':
          provider.sent++;
          break;
        case 'delivered':
          provider.delivered++;
          break;
        case 'failed':
        case 'bounced':
        case 'undelivered':
          provider.failed++;
          break;
      }

      // Add cost and segments
      if (event.metadata?.price) {
        provider.cost += parseFloat(event.metadata.price);
      }
      if (event.metadata?.num_segments) {
        provider.segments += parseInt(event.metadata.num_segments);
      }
    });

    return breakdown;
  }

  /**
   * Get daily statistics time-series
   */
  private async getDailyStats(
    coupleId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<Array<any>> {
    const endDate = dateRange?.to || new Date();
    const startDate =
      dateRange?.from || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days back

    const { data: events, error } = await supabase
      .from('communication_events')
      .select('event_type, timestamp, communication_type')
      .eq('couple_id', coupleId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    if (error) throw error;

    // Group by date
    const dailyMap = new Map<string, any>();

    events?.forEach((event) => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          sent: 0,
          delivered: 0,
          failed: 0,
          opened: 0,
          clicked: 0,
        });
      }

      const day = dailyMap.get(date);

      switch (event.event_type) {
        case 'sent':
          day.sent++;
          break;
        case 'delivered':
          day.delivered++;
          break;
        case 'failed':
        case 'bounced':
        case 'undelivered':
          day.failed++;
          break;
        case 'opened':
          day.opened++;
          break;
        case 'clicked':
          day.clicked++;
          break;
      }
    });

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * Get performance by segment
   */
  private async getPerformanceBySegment(
    coupleId: string,
    campaignId: string,
  ): Promise<Array<any>> {
    // This would query guest segments and calculate performance
    // For now, return empty array - would need segment tracking implementation
    return [];
  }

  /**
   * Calculate engagement score for a message
   */
  private calculateEngagementScore(events: any[]): number {
    let score = 0;

    events.forEach((event) => {
      switch (event.event_type) {
        case 'delivered':
          score += 1;
          break;
        case 'opened':
          score += 2;
          break;
        case 'clicked':
          score += 3;
          break;
        case 'received': // SMS response
          score += 4;
          break;
        case 'read': // SMS read receipt
          score += 2;
          break;
        case 'failed':
        case 'bounced':
        case 'undelivered':
          score -= 1;
          break;
      }
    });

    return Math.max(0, Math.min(10, score)); // Score between 0-10
  }

  /**
   * Get alerts for delivery issues
   */
  async getDeliveryAlerts(coupleId: string): Promise<
    Array<{
      type:
        | 'high_failure_rate'
        | 'low_delivery_rate'
        | 'provider_issue'
        | 'cost_spike';
      message: string;
      severity: 'low' | 'medium' | 'high';
      metric_value: number;
      threshold: number;
      timestamp: Date;
    }>
  > {
    const alerts = [];

    // Get recent metrics (last 24 hours)
    const recentMetrics = await this.getUnifiedMetrics(coupleId, {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000),
      to: new Date(),
    });

    // Check failure rate
    if (recentMetrics.failure_rate > 10) {
      alerts.push({
        type: 'high_failure_rate',
        message: `High failure rate detected: ${recentMetrics.failure_rate.toFixed(1)}%`,
        severity: recentMetrics.failure_rate > 20 ? 'high' : 'medium',
        metric_value: recentMetrics.failure_rate,
        threshold: 10,
        timestamp: new Date(),
      });
    }

    // Check delivery rate
    if (recentMetrics.delivery_rate < 90 && recentMetrics.total_sent > 10) {
      alerts.push({
        type: 'low_delivery_rate',
        message: `Low delivery rate: ${recentMetrics.delivery_rate.toFixed(1)}%`,
        severity: recentMetrics.delivery_rate < 80 ? 'high' : 'medium',
        metric_value: recentMetrics.delivery_rate,
        threshold: 90,
        timestamp: new Date(),
      });
    }

    return alerts;
  }
}

export const deliveryStatusAggregator = DeliveryStatusAggregator.getInstance();
