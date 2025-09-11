/**
 * WS-008: Notification Delivery Tracking & Monitoring
 * Real-time tracking of notification delivery status with failure handling and analytics
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import { NotificationDeliveryResult, NotificationAnalytics } from './engine';

export interface DeliveryTrackingEntry {
  id: string;
  notification_id: string;
  template_id: string;
  recipient_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  status:
    | 'pending'
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'failed'
    | 'bounced'
    | 'unsubscribed';
  provider_message_id?: string;
  provider_name?: string;

  // Timing information
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  failed_at?: string;

  // Delivery metrics
  delivery_duration_ms?: number;
  attempt_count: number;
  retry_after?: string;

  // Error handling
  error_code?: string;
  error_message?: string;
  is_retryable: boolean;

  // Cost tracking
  cost_estimate?: number;
  actual_cost?: number;

  // Wedding context
  wedding_id?: string;
  vendor_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  wedding_timeline_milestone?: string;

  // Metadata
  user_agent?: string;
  ip_address?: string;
  device_info?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DeliveryFailureAnalysis {
  failure_rate: number;
  common_errors: Array<{
    error_code: string;
    error_message: string;
    count: number;
    percentage: number;
  }>;
  failure_patterns: {
    by_channel: Record<string, number>;
    by_time_of_day: Record<string, number>;
    by_day_of_week: Record<string, number>;
    by_vendor: Record<string, number>;
  };
  recommendations: string[];
}

export interface RealTimeDeliveryStatus {
  notification_id: string;
  status: string;
  timestamp: string;
  channel: string;
  recipient_id: string;
  wedding_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification Delivery Tracking System
 * Monitors and tracks notification delivery across all channels
 */
export class NotificationDeliveryTracker {
  private static instance: NotificationDeliveryTracker;
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient();
  }

  static getInstance(): NotificationDeliveryTracker {
    if (!NotificationDeliveryTracker.instance) {
      NotificationDeliveryTracker.instance = new NotificationDeliveryTracker();
    }
    return NotificationDeliveryTracker.instance;
  }

  /**
   * Record notification delivery attempt
   */
  async trackDeliveryAttempt(
    result: NotificationDeliveryResult,
  ): Promise<void> {
    try {
      const trackingEntry: Omit<DeliveryTrackingEntry, 'id' | 'created_at'> = {
        notification_id: result.notification_id,
        template_id: result.template_id,
        recipient_id: result.recipient_id,
        channel: result.channel,
        status: this.mapStatusToTrackingStatus(result.status),
        provider_message_id: result.provider_message_id,
        sent_at:
          result.status === 'sent' ? result.delivery_timestamp : undefined,
        delivered_at:
          result.status === 'delivered' ? result.delivery_timestamp : undefined,
        failed_at:
          result.status === 'failed' ? result.delivery_timestamp : undefined,
        delivery_duration_ms: result.delivery_duration_ms,
        attempt_count: 1,
        error_message: result.error_message,
        is_retryable: this.isRetryableError(result.error_message),
        cost_estimate: result.cost_estimate,
        priority: 'normal', // Will be updated with actual priority
        metadata: result.metadata,
      };

      const { error } = await this.supabase
        .from('notification_delivery_tracking')
        .insert({
          ...trackingEntry,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to track delivery attempt:', error);
      }

      // Emit real-time status update
      await this.emitDeliveryStatusUpdate({
        notification_id: result.notification_id,
        status: result.status,
        timestamp: result.delivery_timestamp,
        channel: result.channel,
        recipient_id: result.recipient_id,
        metadata: result.metadata,
      });
    } catch (error) {
      console.error('Error tracking delivery attempt:', error);
    }
  }

  /**
   * Update delivery status based on provider webhook
   */
  async updateDeliveryStatus(
    providerMessageId: string,
    status:
      | 'delivered'
      | 'opened'
      | 'clicked'
      | 'bounced'
      | 'failed'
      | 'unsubscribed',
    providerData?: Record<string, any>,
  ): Promise<void> {
    try {
      const updateData: Partial<DeliveryTrackingEntry> = {
        status,
        metadata: providerData,
      };

      // Set appropriate timestamp
      const timestamp = new Date().toISOString();
      switch (status) {
        case 'delivered':
          updateData.delivered_at = timestamp;
          break;
        case 'opened':
          updateData.opened_at = timestamp;
          break;
        case 'clicked':
          updateData.clicked_at = timestamp;
          break;
        case 'failed':
        case 'bounced':
          updateData.failed_at = timestamp;
          updateData.error_message = providerData?.error || `Message ${status}`;
          break;
      }

      const { data, error } = await this.supabase
        .from('notification_delivery_tracking')
        .update(updateData)
        .eq('provider_message_id', providerMessageId)
        .select('notification_id, recipient_id, wedding_id, channel')
        .single();

      if (error) {
        console.error('Failed to update delivery status:', error);
        return;
      }

      // Emit real-time update
      if (data) {
        await this.emitDeliveryStatusUpdate({
          notification_id: data.notification_id,
          status,
          timestamp,
          channel: data.channel,
          recipient_id: data.recipient_id,
          wedding_id: data.wedding_id,
          metadata: providerData,
        });
      }

      // Handle special cases
      if (status === 'bounced' || status === 'failed') {
        await this.handleDeliveryFailure(
          providerMessageId,
          status,
          providerData,
        );
      }

      if (status === 'unsubscribed') {
        await this.handleUnsubscribe(data.recipient_id, data.channel);
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  /**
   * Get delivery status for a notification
   */
  async getDeliveryStatus(
    notificationId: string,
  ): Promise<DeliveryTrackingEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('notification_delivery_tracking')
        .select('*')
        .eq('notification_id', notificationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data as DeliveryTrackingEntry[];
    } catch (error) {
      console.error('Error getting delivery status:', error);
      return [];
    }
  }

  /**
   * Get delivery analytics for time period
   */
  async getDeliveryAnalytics(params: {
    wedding_id?: string;
    vendor_id?: string;
    start_date?: string;
    end_date?: string;
    channel?: string;
    template_id?: string;
  }): Promise<NotificationAnalytics> {
    try {
      let query = this.supabase
        .from('notification_delivery_tracking')
        .select('*');

      if (params.wedding_id) query = query.eq('wedding_id', params.wedding_id);
      if (params.vendor_id) query = query.eq('vendor_id', params.vendor_id);
      if (params.start_date) query = query.gte('created_at', params.start_date);
      if (params.end_date) query = query.lte('created_at', params.end_date);
      if (params.channel) query = query.eq('channel', params.channel);
      if (params.template_id)
        query = query.eq('template_id', params.template_id);

      const { data: deliveries } = await query;

      if (!deliveries || deliveries.length === 0) {
        return this.getEmptyAnalytics();
      }

      return this.calculateAnalytics(deliveries as DeliveryTrackingEntry[]);
    } catch (error) {
      console.error('Error getting delivery analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get failed deliveries for retry processing
   */
  async getFailedDeliveries(
    maxAttempts: number = 3,
  ): Promise<DeliveryTrackingEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('notification_delivery_tracking')
        .select('*')
        .eq('status', 'failed')
        .eq('is_retryable', true)
        .lt('attempt_count', maxAttempts)
        .is('retry_after', null)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data as DeliveryTrackingEntry[];
    } catch (error) {
      console.error('Error getting failed deliveries:', error);
      return [];
    }
  }

  /**
   * Retry failed delivery
   */
  async retryFailedDelivery(trackingId: string): Promise<boolean> {
    try {
      // Update attempt count and retry timestamp
      const { error } = await this.supabase
        .from('notification_delivery_tracking')
        .update({
          attempt_count: this.supabase.raw('attempt_count + 1'),
          retry_after: new Date().toISOString(),
          status: 'pending',
        })
        .eq('id', trackingId);

      if (error) {
        console.error('Failed to update retry status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error retrying failed delivery:', error);
      return false;
    }
  }

  /**
   * Analyze delivery failures and provide recommendations
   */
  async analyzeDeliveryFailures(params: {
    wedding_id?: string;
    vendor_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<DeliveryFailureAnalysis> {
    try {
      let query = this.supabase
        .from('notification_delivery_tracking')
        .select('*');

      if (params.wedding_id) query = query.eq('wedding_id', params.wedding_id);
      if (params.vendor_id) query = query.eq('vendor_id', params.vendor_id);
      if (params.start_date) query = query.gte('created_at', params.start_date);
      if (params.end_date) query = query.lte('created_at', params.end_date);

      const { data: deliveries } = await query;

      if (!deliveries || deliveries.length === 0) {
        return {
          failure_rate: 0,
          common_errors: [],
          failure_patterns: {
            by_channel: {},
            by_time_of_day: {},
            by_day_of_week: {},
            by_vendor: {},
          },
          recommendations: [],
        };
      }

      return this.analyzeFailures(deliveries as DeliveryTrackingEntry[]);
    } catch (error) {
      console.error('Error analyzing delivery failures:', error);
      throw error;
    }
  }

  /**
   * Get real-time delivery dashboard data
   */
  async getDeliveryDashboard(weddingId?: string): Promise<{
    total_notifications: number;
    successful_deliveries: number;
    failed_deliveries: number;
    pending_deliveries: number;
    recent_activity: DeliveryTrackingEntry[];
    channel_performance: Record<
      string,
      {
        sent: number;
        delivered: number;
        failed: number;
        delivery_rate: number;
      }
    >;
  }> {
    try {
      let query = this.supabase
        .from('notification_delivery_tracking')
        .select('*');

      if (weddingId) {
        query = query.eq('wedding_id', weddingId);
      }

      // Get last 24 hours of data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      query = query.gte('created_at', yesterday.toISOString());

      const { data: deliveries } = await query;

      if (!deliveries || deliveries.length === 0) {
        return {
          total_notifications: 0,
          successful_deliveries: 0,
          failed_deliveries: 0,
          pending_deliveries: 0,
          recent_activity: [],
          channel_performance: {},
        };
      }

      const entries = deliveries as DeliveryTrackingEntry[];

      // Calculate metrics
      const total = entries.length;
      const successful = entries.filter((e) =>
        ['delivered', 'opened', 'clicked'].includes(e.status),
      ).length;
      const failed = entries.filter((e) =>
        ['failed', 'bounced'].includes(e.status),
      ).length;
      const pending = entries.filter((e) =>
        ['pending', 'sent'].includes(e.status),
      ).length;

      // Calculate channel performance
      const channelPerformance: Record<string, any> = {};
      ['email', 'sms', 'push', 'in_app'].forEach((channel) => {
        const channelEntries = entries.filter((e) => e.channel === channel);
        const channelSent = channelEntries.length;
        const channelDelivered = channelEntries.filter((e) =>
          ['delivered', 'opened', 'clicked'].includes(e.status),
        ).length;
        const channelFailed = channelEntries.filter((e) =>
          ['failed', 'bounced'].includes(e.status),
        ).length;

        channelPerformance[channel] = {
          sent: channelSent,
          delivered: channelDelivered,
          failed: channelFailed,
          delivery_rate:
            channelSent > 0 ? (channelDelivered / channelSent) * 100 : 0,
        };
      });

      // Get recent activity (last 20 entries)
      const recentActivity = entries
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 20);

      return {
        total_notifications: total,
        successful_deliveries: successful,
        failed_deliveries: failed,
        pending_deliveries: pending,
        recent_activity: recentActivity,
        channel_performance: channelPerformance,
      };
    } catch (error) {
      console.error('Error getting delivery dashboard:', error);
      throw error;
    }
  }

  /**
   * Get wedding-specific delivery metrics
   */
  async getWeddingDeliveryMetrics(weddingId: string): Promise<{
    timeline_notifications: {
      total: number;
      delivered: number;
      failed: number;
      pending: number;
    };
    vendor_communications: {
      total: number;
      delivered: number;
      response_rate: number;
    };
    emergency_alerts: {
      total: number;
      delivered: number;
      avg_delivery_time_ms: number;
    };
    day_of_coordination: {
      total: number;
      delivered: number;
      real_time_delivery_rate: number;
    };
  }> {
    try {
      const { data: deliveries } = await this.supabase
        .from('notification_delivery_tracking')
        .select('*')
        .eq('wedding_id', weddingId);

      if (!deliveries || deliveries.length === 0) {
        return {
          timeline_notifications: {
            total: 0,
            delivered: 0,
            failed: 0,
            pending: 0,
          },
          vendor_communications: { total: 0, delivered: 0, response_rate: 0 },
          emergency_alerts: { total: 0, delivered: 0, avg_delivery_time_ms: 0 },
          day_of_coordination: {
            total: 0,
            delivered: 0,
            real_time_delivery_rate: 0,
          },
        };
      }

      const entries = deliveries as DeliveryTrackingEntry[];

      // Get template information to categorize notifications
      const { data: templates } = await this.supabase
        .from('notification_templates')
        .select('id, category, priority');

      const templateMap = new Map(templates?.map((t) => [t.id, t]) || []);

      // Categorize deliveries
      const timelineNotifications = entries.filter((e) => {
        const template = templateMap.get(e.template_id);
        return template?.category === 'wedding_timeline';
      });

      const vendorCommunications = entries.filter((e) => {
        const template = templateMap.get(e.template_id);
        return template?.category === 'vendor_communication';
      });

      const emergencyAlerts = entries.filter((e) => {
        const template = templateMap.get(e.template_id);
        return template?.priority === 'emergency';
      });

      const dayOfCoordination = entries.filter((e) => {
        const template = templateMap.get(e.template_id);
        return e.wedding_timeline_milestone === 'day_of_wedding';
      });

      // Calculate metrics
      const calculateMetrics = (notifications: DeliveryTrackingEntry[]) => {
        const total = notifications.length;
        const delivered = notifications.filter((n) =>
          ['delivered', 'opened', 'clicked'].includes(n.status),
        ).length;
        const failed = notifications.filter((n) =>
          ['failed', 'bounced'].includes(n.status),
        ).length;
        const pending = notifications.filter((n) =>
          ['pending', 'sent'].includes(n.status),
        ).length;
        return { total, delivered, failed, pending };
      };

      const timelineMetrics = calculateMetrics(timelineNotifications);
      const vendorMetrics = calculateMetrics(vendorCommunications);
      const emergencyMetrics = calculateMetrics(emergencyAlerts);
      const dayOfMetrics = calculateMetrics(dayOfCoordination);

      // Calculate average delivery time for emergency alerts
      const emergencyDeliveryTimes = emergencyAlerts
        .filter((e) => e.delivery_duration_ms)
        .map((e) => e.delivery_duration_ms!);
      const avgEmergencyDeliveryTime =
        emergencyDeliveryTimes.length > 0
          ? emergencyDeliveryTimes.reduce((sum, time) => sum + time, 0) /
            emergencyDeliveryTimes.length
          : 0;

      // Calculate real-time delivery rate for day-of coordination (< 30 seconds)
      const realTimeDeliveries = dayOfCoordination.filter(
        (e) => e.delivery_duration_ms && e.delivery_duration_ms < 30000,
      ).length;
      const realTimeDeliveryRate =
        dayOfMetrics.total > 0
          ? (realTimeDeliveries / dayOfMetrics.total) * 100
          : 0;

      return {
        timeline_notifications: timelineMetrics,
        vendor_communications: {
          ...vendorMetrics,
          response_rate: 0, // Would calculate based on vendor response tracking
        },
        emergency_alerts: {
          ...emergencyMetrics,
          avg_delivery_time_ms: avgEmergencyDeliveryTime,
        },
        day_of_coordination: {
          ...dayOfMetrics,
          real_time_delivery_rate: realTimeDeliveryRate,
        },
      };
    } catch (error) {
      console.error('Error getting wedding delivery metrics:', error);
      throw error;
    }
  }

  /**
   * Map notification status to tracking status
   */
  private mapStatusToTrackingStatus(
    status: string,
  ): DeliveryTrackingEntry['status'] {
    const statusMap: Record<string, DeliveryTrackingEntry['status']> = {
      queued: 'pending',
      scheduled: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorMessage?: string): boolean {
    if (!errorMessage) return false;

    const retryableErrors = [
      'rate limit',
      'temporary failure',
      'timeout',
      'network error',
      'service unavailable',
      '429',
      '500',
      '502',
      '503',
      '504',
    ];

    const lowerError = errorMessage.toLowerCase();
    return retryableErrors.some((error) => lowerError.includes(error));
  }

  /**
   * Calculate analytics from delivery entries
   */
  private calculateAnalytics(
    deliveries: DeliveryTrackingEntry[],
  ): NotificationAnalytics {
    const total = deliveries.length;

    // Calculate delivery rates by channel
    const channelStats: Record<string, { sent: number; delivered: number }> =
      {};
    deliveries.forEach((delivery) => {
      if (!channelStats[delivery.channel]) {
        channelStats[delivery.channel] = { sent: 0, delivered: 0 };
      }
      channelStats[delivery.channel].sent++;
      if (['delivered', 'opened', 'clicked'].includes(delivery.status)) {
        channelStats[delivery.channel].delivered++;
      }
    });

    const deliveryRateByChannel: Record<string, number> = {};
    Object.entries(channelStats).forEach(([channel, stats]) => {
      deliveryRateByChannel[channel] =
        stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
    });

    // Calculate average delivery time
    const deliveryTimes = deliveries
      .filter((d) => d.delivery_duration_ms)
      .map((d) => d.delivery_duration_ms!);
    const averageDeliveryTimeMs =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) /
          deliveryTimes.length
        : 0;

    // Calculate failure rate
    const failedCount = deliveries.filter((d) =>
      ['failed', 'bounced'].includes(d.status),
    ).length;
    const failureRate = total > 0 ? (failedCount / total) * 100 : 0;

    // Calculate cost breakdown
    const costBreakdown: Record<string, number> = {};
    deliveries.forEach((delivery) => {
      if (delivery.actual_cost || delivery.cost_estimate) {
        const cost = delivery.actual_cost || delivery.cost_estimate || 0;
        costBreakdown[delivery.channel] =
          (costBreakdown[delivery.channel] || 0) + cost;
      }
    });

    return {
      total_sent: total,
      delivery_rate_by_channel: deliveryRateByChannel,
      average_delivery_time_ms: averageDeliveryTimeMs,
      failure_rate: failureRate,
      wedding_milestone_performance: {}, // Would calculate from milestone data
      vendor_communication_stats: {}, // Would calculate from vendor response data
      cost_breakdown: costBreakdown,
    };
  }

  /**
   * Get empty analytics structure
   */
  private getEmptyAnalytics(): NotificationAnalytics {
    return {
      total_sent: 0,
      delivery_rate_by_channel: {},
      average_delivery_time_ms: 0,
      failure_rate: 0,
      wedding_milestone_performance: {},
      vendor_communication_stats: {},
      cost_breakdown: {},
    };
  }

  /**
   * Analyze failure patterns
   */
  private analyzeFailures(
    deliveries: DeliveryTrackingEntry[],
  ): DeliveryFailureAnalysis {
    const totalDeliveries = deliveries.length;
    const failedDeliveries = deliveries.filter((d) =>
      ['failed', 'bounced'].includes(d.status),
    );
    const failureRate =
      totalDeliveries > 0
        ? (failedDeliveries.length / totalDeliveries) * 100
        : 0;

    // Analyze common errors
    const errorCounts: Record<string, number> = {};
    failedDeliveries.forEach((delivery) => {
      if (delivery.error_message) {
        errorCounts[delivery.error_message] =
          (errorCounts[delivery.error_message] || 0) + 1;
      }
    });

    const commonErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({
        error_code: '',
        error_message: error,
        count,
        percentage: (count / failedDeliveries.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Analyze failure patterns
    const failurePatterns = {
      by_channel: this.groupFailuresByField(failedDeliveries, 'channel'),
      by_time_of_day: this.groupFailuresByTimeOfDay(failedDeliveries),
      by_day_of_week: this.groupFailuresByDayOfWeek(failedDeliveries),
      by_vendor: this.groupFailuresByField(failedDeliveries, 'vendor_id'),
    };

    // Generate recommendations
    const recommendations = this.generateFailureRecommendations(
      failureRate,
      commonErrors,
      failurePatterns,
    );

    return {
      failure_rate: failureRate,
      common_errors: commonErrors,
      failure_patterns: failurePatterns,
      recommendations,
    };
  }

  /**
   * Group failures by field
   */
  private groupFailuresByField(
    failures: DeliveryTrackingEntry[],
    field: keyof DeliveryTrackingEntry,
  ): Record<string, number> {
    const groups: Record<string, number> = {};
    failures.forEach((failure) => {
      const value = String(failure[field] || 'unknown');
      groups[value] = (groups[value] || 0) + 1;
    });
    return groups;
  }

  /**
   * Group failures by time of day
   */
  private groupFailuresByTimeOfDay(
    failures: DeliveryTrackingEntry[],
  ): Record<string, number> {
    const groups: Record<string, number> = {};
    failures.forEach((failure) => {
      const hour = new Date(failure.failed_at || failure.created_at).getHours();
      const hourRange = `${hour}:00-${hour + 1}:00`;
      groups[hourRange] = (groups[hourRange] || 0) + 1;
    });
    return groups;
  }

  /**
   * Group failures by day of week
   */
  private groupFailuresByDayOfWeek(
    failures: DeliveryTrackingEntry[],
  ): Record<string, number> {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const groups: Record<string, number> = {};
    failures.forEach((failure) => {
      const day =
        days[new Date(failure.failed_at || failure.created_at).getDay()];
      groups[day] = (groups[day] || 0) + 1;
    });
    return groups;
  }

  /**
   * Generate failure recommendations
   */
  private generateFailureRecommendations(
    failureRate: number,
    commonErrors: Array<{ error_message: string; percentage: number }>,
    patterns: Record<string, Record<string, number>>,
  ): string[] {
    const recommendations: string[] = [];

    if (failureRate > 10) {
      recommendations.push(
        'High failure rate detected. Review provider configuration and credentials.',
      );
    }

    if (
      commonErrors.some((error) => error.error_message.includes('rate limit'))
    ) {
      recommendations.push(
        'Rate limiting detected. Consider implementing exponential backoff or upgrading provider plan.',
      );
    }

    if (patterns.by_channel.sms > patterns.by_channel.email) {
      recommendations.push(
        'SMS failures higher than email. Verify phone number formats and SMS consent.',
      );
    }

    if (Object.keys(patterns.by_time_of_day).length > 0) {
      const peakFailureHour = Object.entries(patterns.by_time_of_day).sort(
        ([, a], [, b]) => b - a,
      )[0];
      if (peakFailureHour) {
        recommendations.push(
          `Peak failures occur during ${peakFailureHour[0]}. Consider adjusting send times.`,
        );
      }
    }

    return recommendations;
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(
    providerMessageId: string,
    status: 'bounced' | 'failed',
    providerData?: Record<string, any>,
  ): Promise<void> {
    try {
      // Log failure for analysis
      await this.supabase.from('delivery_failure_log').insert({
        provider_message_id: providerMessageId,
        failure_type: status,
        provider_data: providerData,
        timestamp: new Date().toISOString(),
      });

      // If it's a hard bounce (permanent failure), mark recipient as problematic
      if (status === 'bounced' && providerData?.bounce_type === 'Permanent') {
        const { data: tracking } = await this.supabase
          .from('notification_delivery_tracking')
          .select('recipient_id, channel')
          .eq('provider_message_id', providerMessageId)
          .single();

        if (tracking) {
          await this.markRecipientProblematic(
            tracking.recipient_id,
            tracking.channel,
            'hard_bounce',
          );
        }
      }
    } catch (error) {
      console.error('Error handling delivery failure:', error);
    }
  }

  /**
   * Handle unsubscribe request
   */
  private async handleUnsubscribe(
    recipientId: string,
    channel: string,
  ): Promise<void> {
    try {
      // Update recipient preferences
      await this.supabase
        .from('notification_preferences')
        .update({
          [`${channel}_enabled`]: false,
          [`${channel}_consent`]: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', recipientId);

      // Log unsubscribe event
      await this.supabase.from('unsubscribe_log').insert({
        user_id: recipientId,
        channel,
        timestamp: new Date().toISOString(),
        method: 'provider_webhook',
      });
    } catch (error) {
      console.error('Error handling unsubscribe:', error);
    }
  }

  /**
   * Mark recipient as problematic
   */
  private async markRecipientProblematic(
    recipientId: string,
    channel: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.supabase.from('problematic_recipients').upsert({
        user_id: recipientId,
        channel,
        reason,
        first_flagged: new Date().toISOString(),
        last_flagged: new Date().toISOString(),
        flag_count: 1,
      });
    } catch (error) {
      console.error('Error marking recipient as problematic:', error);
    }
  }

  /**
   * Emit real-time delivery status update
   */
  private async emitDeliveryStatusUpdate(
    status: RealTimeDeliveryStatus,
  ): Promise<void> {
    try {
      await this.supabase.channel('delivery-tracking').send({
        type: 'broadcast',
        event: 'delivery_status_update',
        payload: status,
      });
    } catch (error) {
      console.error('Failed to emit delivery status update:', error);
    }
  }
}

// Export singleton instance
export const notificationDeliveryTracker =
  NotificationDeliveryTracker.getInstance();
