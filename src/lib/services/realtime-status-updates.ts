import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { deliveryStatusAggregator } from './delivery-status-aggregator';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Real-time Status Updates Service
 * WebSocket-based real-time delivery status updates for communication monitoring
 */

export interface RealtimeStatusUpdate {
  type:
    | 'delivery_update'
    | 'batch_complete'
    | 'failure_alert'
    | 'metrics_update';
  message_id?: string;
  recipient?: string;
  guest_id?: string;
  status: string;
  timestamp: Date;
  provider: string;
  communication_type: 'email' | 'sms';
  metadata?: any;
}

export interface BatchStatusUpdate {
  batch_id: string;
  total_messages: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  completion_percentage: number;
  estimated_completion: Date | null;
  status: 'sending' | 'completed' | 'failed';
}

export interface MetricsSnapshot {
  couple_id: string;
  timestamp: Date;
  delivery_rate: number;
  failure_rate: number;
  engagement_rate: number;
  total_sent: number;
  total_delivered: number;
  active_campaigns: number;
  recent_failures: number;
}

export class RealtimeStatusUpdates {
  private static instance: RealtimeStatusUpdates;
  private activeSubscriptions = new Map<string, any>();
  private metricsUpdateInterval = new Map<string, NodeJS.Timeout>();

  static getInstance(): RealtimeStatusUpdates {
    if (!RealtimeStatusUpdates.instance) {
      RealtimeStatusUpdates.instance = new RealtimeStatusUpdates();
    }
    return RealtimeStatusUpdates.instance;
  }

  /**
   * Subscribe to real-time delivery updates for a couple
   */
  async subscribeToDeliveryUpdates(
    coupleId: string,
    callback: (update: RealtimeStatusUpdate) => void,
  ): Promise<() => void> {
    const channelName = `couple_${coupleId}_communications`;

    // Create Supabase realtime subscription
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: '*' }, (payload) => {
        this.handleRealtimeEvent(payload, callback);
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_events',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          this.handleDatabaseEvent(payload, callback);
        },
      )
      .subscribe();

    // Store subscription for cleanup
    this.activeSubscriptions.set(coupleId, channel);

    // Start periodic metrics updates
    this.startMetricsUpdates(coupleId);

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromDeliveryUpdates(coupleId);
    };
  }

  /**
   * Unsubscribe from delivery updates
   */
  async unsubscribeFromDeliveryUpdates(coupleId: string): Promise<void> {
    const channel = this.activeSubscriptions.get(coupleId);
    if (channel) {
      await supabase.removeChannel(channel);
      this.activeSubscriptions.delete(coupleId);
    }

    // Stop metrics updates
    const interval = this.metricsUpdateInterval.get(coupleId);
    if (interval) {
      clearInterval(interval);
      this.metricsUpdateInterval.delete(coupleId);
    }
  }

  /**
   * Broadcast delivery status update to subscribers
   */
  async broadcastDeliveryUpdate(
    update: RealtimeStatusUpdate,
    coupleId: string,
  ): Promise<void> {
    const channelName = `couple_${coupleId}_communications`;

    try {
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'delivery_update',
        payload: {
          ...update,
          timestamp: update.timestamp.toISOString(),
        },
      });

      // Also store in real-time events table for history
      await this.storeRealtimeEvent(coupleId, update);
    } catch (error) {
      console.error('Error broadcasting delivery update:', error);
    }
  }

  /**
   * Broadcast batch completion status
   */
  async broadcastBatchStatus(
    batchUpdate: BatchStatusUpdate,
    coupleId: string,
  ): Promise<void> {
    const channelName = `couple_${coupleId}_communications`;

    try {
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'batch_update',
        payload: batchUpdate,
      });
    } catch (error) {
      console.error('Error broadcasting batch status:', error);
    }
  }

  /**
   * Broadcast failure alert
   */
  async broadcastFailureAlert(
    alert: {
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      failed_count: number;
      affected_guests?: string[];
    },
    coupleId: string,
  ): Promise<void> {
    const channelName = `couple_${coupleId}_communications`;

    try {
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'failure_alert',
        payload: {
          ...alert,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error broadcasting failure alert:', error);
    }
  }

  /**
   * Get current delivery status for active messages
   */
  async getCurrentDeliveryStatus(coupleId: string): Promise<{
    active_messages: Array<{
      message_id: string;
      recipient: string;
      status: string;
      sent_at: Date;
      time_since_sent: number;
      expected_delivery_time: number;
    }>;
    pending_deliveries: number;
    recent_failures: Array<{
      message_id: string;
      recipient: string;
      failure_reason: string;
      failed_at: Date;
    }>;
  }> {
    // Get messages from last 4 hours that might still be in transit
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const { data: recentEvents, error } = await supabase
      .from('communication_events')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('timestamp', fourHoursAgo.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Group by message_id to get latest status
    const messageMap = new Map<string, any>();
    recentEvents?.forEach((event) => {
      const existing = messageMap.get(event.message_id);
      if (
        !existing ||
        new Date(event.timestamp) > new Date(existing.timestamp)
      ) {
        messageMap.set(event.message_id, event);
      }
    });

    const activeMessages = [];
    const recentFailures = [];

    for (const [messageId, event] of messageMap) {
      const timeSinceSent = Date.now() - new Date(event.timestamp).getTime();

      if (event.event_type === 'sent' && timeSinceSent < 2 * 60 * 60 * 1000) {
        // 2 hours
        activeMessages.push({
          message_id: messageId,
          recipient: event.recipient,
          status: event.event_type,
          sent_at: new Date(event.timestamp),
          time_since_sent: Math.floor(timeSinceSent / 1000 / 60), // minutes
          expected_delivery_time: event.communication_type === 'sms' ? 5 : 60, // SMS: 5min, Email: 60min
        });
      } else if (
        ['failed', 'bounced', 'undelivered'].includes(event.event_type)
      ) {
        recentFailures.push({
          message_id: messageId,
          recipient: event.recipient,
          failure_reason: event.metadata?.error_message || 'Unknown failure',
          failed_at: new Date(event.timestamp),
        });
      }
    }

    return {
      active_messages: activeMessages,
      pending_deliveries: activeMessages.filter((m) => m.status === 'sent')
        .length,
      recent_failures: recentFailures,
    };
  }

  /**
   * Start periodic metrics updates for a couple
   */
  private startMetricsUpdates(coupleId: string): void {
    // Clear existing interval
    const existingInterval = this.metricsUpdateInterval.get(coupleId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Update metrics every 30 seconds
    const interval = setInterval(async () => {
      try {
        await this.broadcastMetricsUpdate(coupleId);
      } catch (error) {
        console.error(`Error updating metrics for couple ${coupleId}:`, error);
      }
    }, 30000);

    this.metricsUpdateInterval.set(coupleId, interval);
  }

  /**
   * Broadcast metrics update
   */
  private async broadcastMetricsUpdate(coupleId: string): Promise<void> {
    try {
      // Get current metrics
      const metrics = await deliveryStatusAggregator.getUnifiedMetrics(
        coupleId,
        {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          to: new Date(),
        },
      );

      // Get current status
      const currentStatus = await this.getCurrentDeliveryStatus(coupleId);

      const metricsSnapshot: MetricsSnapshot = {
        couple_id: coupleId,
        timestamp: new Date(),
        delivery_rate: metrics.delivery_rate,
        failure_rate: metrics.failure_rate,
        engagement_rate: metrics.engagement_rate,
        total_sent: metrics.total_sent,
        total_delivered: metrics.total_delivered,
        active_campaigns: 0, // Would need campaign tracking
        recent_failures: currentStatus.recent_failures.length,
      };

      const channelName = `couple_${coupleId}_communications`;

      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'metrics_update',
        payload: {
          metrics: metricsSnapshot,
          current_status: currentStatus,
        },
      });
    } catch (error) {
      console.error('Error broadcasting metrics update:', error);
    }
  }

  /**
   * Handle real-time broadcast events
   */
  private handleRealtimeEvent(
    payload: any,
    callback: (update: RealtimeStatusUpdate) => void,
  ): void {
    try {
      const { event, payload: data } = payload;

      if (event === 'delivery_update' && data) {
        callback({
          type: 'delivery_update',
          message_id: data.message_id,
          recipient: data.recipient,
          guest_id: data.guest_id,
          status: data.status,
          timestamp: new Date(data.timestamp),
          provider: data.provider,
          communication_type: data.communication_type,
          metadata: data.metadata,
        });
      } else if (event === 'batch_update') {
        callback({
          type: 'batch_complete',
          status: data.status,
          timestamp: new Date(),
          provider: 'batch',
          communication_type: 'email', // Default
          metadata: data,
        });
      } else if (event === 'failure_alert') {
        callback({
          type: 'failure_alert',
          status: 'failed',
          timestamp: new Date(data.timestamp),
          provider: 'system',
          communication_type: 'email', // Default
          metadata: data,
        });
      } else if (event === 'metrics_update') {
        callback({
          type: 'metrics_update',
          status: 'updated',
          timestamp: new Date(),
          provider: 'system',
          communication_type: 'email', // Default
          metadata: data,
        });
      }
    } catch (error) {
      console.error('Error handling realtime event:', error);
    }
  }

  /**
   * Handle database change events
   */
  private handleDatabaseEvent(
    payload: any,
    callback: (update: RealtimeStatusUpdate) => void,
  ): void {
    try {
      const { new: newRecord } = payload;

      if (newRecord) {
        callback({
          type: 'delivery_update',
          message_id: newRecord.message_id,
          recipient: newRecord.recipient,
          guest_id: newRecord.guest_id,
          status: newRecord.event_type,
          timestamp: new Date(newRecord.timestamp),
          provider: newRecord.provider,
          communication_type: newRecord.communication_type,
          metadata: newRecord.metadata,
        });
      }
    } catch (error) {
      console.error('Error handling database event:', error);
    }
  }

  /**
   * Store real-time event for history
   */
  private async storeRealtimeEvent(
    coupleId: string,
    update: RealtimeStatusUpdate,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('realtime_events').insert({
        couple_id: coupleId,
        event_type: update.type,
        message_id: update.message_id,
        recipient: update.recipient,
        guest_id: update.guest_id,
        status: update.status,
        provider: update.provider,
        communication_type: update.communication_type,
        timestamp: update.timestamp.toISOString(),
        metadata: update.metadata,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error storing realtime event:', error);
      }
    } catch (error) {
      console.error('Error storing realtime event:', error);
    }
  }

  /**
   * Get real-time event history
   */
  async getRealtimeEventHistory(
    coupleId: string,
    options?: {
      eventType?: string;
      messageId?: string;
      limit?: number;
      dateRange?: { from: Date; to: Date };
    },
  ): Promise<
    Array<{
      event_type: string;
      message_id?: string;
      recipient?: string;
      status: string;
      timestamp: Date;
      provider: string;
      communication_type: string;
      metadata?: any;
    }>
  > {
    let query = supabase
      .from('realtime_events')
      .select('*')
      .eq('couple_id', coupleId)
      .order('timestamp', { ascending: false });

    if (options?.eventType) {
      query = query.eq('event_type', options.eventType);
    }

    if (options?.messageId) {
      query = query.eq('message_id', options.messageId);
    }

    if (options?.dateRange) {
      query = query
        .gte('timestamp', options.dateRange.from.toISOString())
        .lte('timestamp', options.dateRange.to.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    return (
      events?.map((event) => ({
        event_type: event.event_type,
        message_id: event.message_id,
        recipient: event.recipient,
        status: event.status,
        timestamp: new Date(event.timestamp),
        provider: event.provider,
        communication_type: event.communication_type,
        metadata: event.metadata,
      })) || []
    );
  }

  /**
   * Monitor delivery health and send alerts
   */
  async monitorDeliveryHealth(coupleId: string): Promise<void> {
    try {
      // Get recent delivery stats
      const recentMetrics = await deliveryStatusAggregator.getUnifiedMetrics(
        coupleId,
        {
          from: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          to: new Date(),
        },
      );

      // Check for concerning patterns
      const alerts = [];

      if (recentMetrics.failure_rate > 15) {
        alerts.push({
          type: 'high_failure_rate',
          message: `High failure rate detected: ${recentMetrics.failure_rate.toFixed(1)}%`,
          severity: 'high' as const,
          failed_count: recentMetrics.total_failed,
        });
      }

      if (recentMetrics.delivery_rate < 85 && recentMetrics.total_sent > 5) {
        alerts.push({
          type: 'low_delivery_rate',
          message: `Low delivery rate: ${recentMetrics.delivery_rate.toFixed(1)}%`,
          severity: 'medium' as const,
          failed_count: recentMetrics.total_failed,
        });
      }

      // Get stuck messages (sent more than 2 hours ago, no delivery confirmation)
      const currentStatus = await this.getCurrentDeliveryStatus(coupleId);
      const stuckMessages = currentStatus.active_messages.filter(
        (msg) => msg.time_since_sent > msg.expected_delivery_time * 2,
      );

      if (stuckMessages.length > 0) {
        alerts.push({
          type: 'stuck_messages',
          message: `${stuckMessages.length} messages appear stuck in delivery`,
          severity: 'medium' as const,
          failed_count: stuckMessages.length,
          affected_guests: stuckMessages.map((msg) => msg.recipient),
        });
      }

      // Send alerts
      for (const alert of alerts) {
        await this.broadcastFailureAlert(alert, coupleId);
      }
    } catch (error) {
      console.error('Error monitoring delivery health:', error);
    }
  }

  /**
   * Get connection status for a couple's subscription
   */
  isConnected(coupleId: string): boolean {
    return this.activeSubscriptions.has(coupleId);
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.activeSubscriptions.size;
  }
}

export const realtimeStatusUpdates = RealtimeStatusUpdates.getInstance();
