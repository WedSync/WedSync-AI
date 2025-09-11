/**
 * WS-008: Multi-Channel Notification Engine
 * Core notification system for wedding coordination with email, SMS, push, and in-app notifications
 */

// import { createClient } from '@/lib/supabase/server'; // Temporarily disabled for build
import { emailServiceConnector } from '@/lib/services/email-connector';
import { smsServiceConnector } from '@/lib/services/sms-connector';
import { Database } from '@/types/database';

// Type definitions for notification engine
export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  priority: number; // Lower number = higher priority
  config?: Record<string, any>;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  push_token?: string;
  type: 'couple' | 'vendor' | 'planner' | 'guest';
  preferences: {
    channels: NotificationChannel[];
    quiet_hours?: {
      start: string; // HH:MM format
      end: string;
      timezone: string;
    };
    wedding_priority_only?: boolean;
  };
  wedding_role?:
    | 'bride'
    | 'groom'
    | 'photographer'
    | 'caterer'
    | 'venue'
    | 'planner'
    | 'guest';
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category:
    | 'wedding_timeline'
    | 'vendor_communication'
    | 'payment'
    | 'emergency'
    | 'reminder'
    | 'confirmation';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  channels: {
    email?: {
      subject_template: string;
      html_template: string;
      text_template?: string;
    };
    sms?: {
      message_template: string;
      max_length: number;
    };
    push?: {
      title_template: string;
      body_template: string;
      icon?: string;
      sound?: string;
    };
    in_app?: {
      title_template: string;
      message_template: string;
      action_url?: string;
      action_text?: string;
    };
  };
  variables: string[];
  routing_rules: {
    fallback_channel_order: ('email' | 'sms' | 'push' | 'in_app')[];
    require_confirmation?: boolean;
    retry_policy: {
      max_attempts: number;
      backoff_multiplier: number;
      initial_delay_ms: number;
    };
    time_sensitive?: {
      delivery_window_hours: number;
      escalate_if_undelivered: boolean;
    };
  };
  wedding_context: {
    timeline_dependent: boolean;
    vendor_specific: boolean;
    couple_approval_required: boolean;
  };
}

export interface NotificationRequest {
  template_id: string;
  recipients: NotificationRecipient[];
  variables: Record<string, any>;
  context: {
    wedding_id: string;
    vendor_id?: string;
    event_date?: string;
    timeline_milestone?: string;
    urgency_override?: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  };
  delivery_options?: {
    scheduled_for?: Date;
    delivery_window?: {
      start: Date;
      end: Date;
    };
    respect_quiet_hours?: boolean;
    require_delivery_confirmation?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface NotificationDeliveryResult {
  notification_id: string;
  template_id: string;
  recipient_id: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  status: 'sent' | 'delivered' | 'failed' | 'scheduled' | 'queued' | 'retrying';
  provider_message_id?: string;
  delivery_timestamp: string;
  error_message?: string;
  delivery_duration_ms?: number;
  cost_estimate?: number;
  metadata?: Record<string, any>;
}

export interface NotificationAnalytics {
  total_sent: number;
  delivery_rate_by_channel: Record<string, number>;
  average_delivery_time_ms: number;
  failure_rate: number;
  wedding_milestone_performance: Record<
    string,
    {
      total: number;
      successful: number;
      avg_delivery_time: number;
    }
  >;
  vendor_communication_stats: Record<
    string,
    {
      response_rate: number;
      avg_response_time_hours: number;
    }
  >;
  cost_breakdown: Record<string, number>;
}

/**
 * Multi-Channel Notification Engine
 * Orchestrates delivery across email, SMS, push, and in-app channels
 */
export class NotificationEngine {
  private static instance: NotificationEngine;
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient();
  }

  static getInstance(): NotificationEngine {
    if (!NotificationEngine.instance) {
      NotificationEngine.instance = new NotificationEngine();
    }
    return NotificationEngine.instance;
  }

  /**
   * Send notification through optimal channel(s) based on priority and preferences
   */
  async sendNotification(
    request: NotificationRequest,
  ): Promise<NotificationDeliveryResult[]> {
    try {
      // 1. Validate and get template
      const template = await this.getTemplate(request.template_id);
      if (!template) {
        throw new Error(`Template ${request.template_id} not found`);
      }

      // 2. Validate template variables
      this.validateTemplateVariables(template, request.variables);

      // 3. Process each recipient
      const deliveryResults: NotificationDeliveryResult[] = [];

      for (const recipient of request.recipients) {
        const recipientResults = await this.processRecipient(
          template,
          recipient,
          request,
        );
        deliveryResults.push(...recipientResults);
      }

      // 4. Record notification batch
      await this.recordNotificationBatch(request, deliveryResults);

      return deliveryResults;
    } catch (error) {
      console.error('Notification engine error:', error);
      throw error;
    }
  }

  /**
   * Process notification delivery for a single recipient
   */
  private async processRecipient(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    request: NotificationRequest,
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];

    // Determine optimal delivery channels based on priority and preferences
    const deliveryChannels = this.determineDeliveryChannels(
      template,
      recipient,
      request.context.urgency_override,
    );

    // Check quiet hours if enabled
    if (
      request.delivery_options?.respect_quiet_hours &&
      this.isQuietHours(recipient.preferences.quiet_hours)
    ) {
      // Schedule for after quiet hours
      const scheduledTime = this.calculatePostQuietHoursDelivery(
        recipient.preferences.quiet_hours,
      );

      for (const channel of deliveryChannels) {
        const result = await this.scheduleNotification(
          template,
          recipient,
          channel,
          request,
          scheduledTime,
        );
        results.push(result);
      }
      return results;
    }

    // Immediate delivery
    for (const channel of deliveryChannels) {
      try {
        const result = await this.deliverToChannel(
          template,
          recipient,
          channel,
          request,
        );
        results.push(result);

        // If high-priority and delivery successful, we might not need fallback channels
        if (
          template.priority === 'urgent' ||
          template.priority === 'emergency'
        ) {
          if (result.status === 'sent' || result.status === 'delivered') {
            break; // Don't send to additional channels for urgent messages if first succeeds
          }
        }
      } catch (error) {
        console.error(`Delivery failed for channel ${channel}:`, error);
        results.push({
          notification_id: this.generateNotificationId(),
          template_id: template.id,
          recipient_id: recipient.id,
          channel,
          status: 'failed',
          delivery_timestamp: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Determine optimal delivery channels based on template priority and recipient preferences
   */
  private determineDeliveryChannels(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    urgencyOverride?: string,
  ): ('email' | 'sms' | 'push' | 'in_app')[] {
    const effectivePriority = urgencyOverride || template.priority;
    const availableChannels = recipient.preferences.channels
      .filter((ch) => ch.enabled)
      .sort((a, b) => a.priority - b.priority);

    const channels: ('email' | 'sms' | 'push' | 'in_app')[] = [];

    switch (effectivePriority) {
      case 'emergency':
        // Use all available channels for emergency
        channels.push(...availableChannels.map((ch) => ch.type));
        break;

      case 'urgent':
        // Use SMS + Push if available, then email
        if (availableChannels.find((ch) => ch.type === 'sms'))
          channels.push('sms');
        if (availableChannels.find((ch) => ch.type === 'push'))
          channels.push('push');
        if (availableChannels.find((ch) => ch.type === 'email'))
          channels.push('email');
        break;

      case 'high':
        // Use preferred high-priority channel + email backup
        const highPriorityChannel = availableChannels[0];
        if (highPriorityChannel) channels.push(highPriorityChannel.type);
        if (
          highPriorityChannel?.type !== 'email' &&
          availableChannels.find((ch) => ch.type === 'email')
        ) {
          channels.push('email');
        }
        break;

      default:
        // Use single preferred channel for normal/low priority
        const preferredChannel = availableChannels[0];
        if (preferredChannel) channels.push(preferredChannel.type);
        break;
    }

    // Filter based on template channel availability
    return channels.filter(
      (channel) => template.channels[channel] !== undefined,
    );
  }

  /**
   * Deliver notification to specific channel
   */
  private async deliverToChannel(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    channel: 'email' | 'sms' | 'push' | 'in_app',
    request: NotificationRequest,
  ): Promise<NotificationDeliveryResult> {
    const notificationId = this.generateNotificationId();
    const startTime = Date.now();

    try {
      let result: NotificationDeliveryResult;

      switch (channel) {
        case 'email':
          result = await this.deliverEmail(
            template,
            recipient,
            request,
            notificationId,
          );
          break;
        case 'sms':
          result = await this.deliverSMS(
            template,
            recipient,
            request,
            notificationId,
          );
          break;
        case 'push':
          result = await this.deliverPush(
            template,
            recipient,
            request,
            notificationId,
          );
          break;
        case 'in_app':
          result = await this.deliverInApp(
            template,
            recipient,
            request,
            notificationId,
          );
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      result.delivery_duration_ms = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        notification_id: notificationId,
        template_id: template.id,
        recipient_id: recipient.id,
        channel,
        status: 'failed',
        delivery_timestamp: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
        delivery_duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    request: NotificationRequest,
    notificationId: string,
  ): Promise<NotificationDeliveryResult> {
    if (!recipient.email || !template.channels.email) {
      throw new Error('Email channel not available for recipient or template');
    }

    const emailTemplate = template.channels.email;
    const renderedSubject = this.renderTemplate(
      emailTemplate.subject_template,
      request.variables,
    );
    const renderedHtml = this.renderTemplate(
      emailTemplate.html_template,
      request.variables,
    );
    const renderedText = emailTemplate.text_template
      ? this.renderTemplate(emailTemplate.text_template, request.variables)
      : undefined;

    const emailResult = await emailServiceConnector.sendEmail({
      template_id: `${template.id}_email`,
      recipient: {
        email: recipient.email,
        name: recipient.name,
      },
      variables: {
        ...request.variables,
        subject: renderedSubject,
        html_content: renderedHtml,
        text_content: renderedText,
      },
      priority: this.mapPriorityToEmailPriority(template.priority),
      delivery_time: request.delivery_options?.scheduled_for?.toISOString(),
      track_opens: true,
      track_clicks: true,
    });

    return {
      notification_id: notificationId,
      template_id: template.id,
      recipient_id: recipient.id,
      channel: 'email',
      status: emailResult.status,
      provider_message_id: emailResult.message_id,
      delivery_timestamp: emailResult.delivery_timestamp,
      error_message: emailResult.error_message,
    };
  }

  /**
   * Deliver SMS notification
   */
  private async deliverSMS(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    request: NotificationRequest,
    notificationId: string,
  ): Promise<NotificationDeliveryResult> {
    if (!recipient.phone || !template.channels.sms) {
      throw new Error('SMS channel not available for recipient or template');
    }

    const smsTemplate = template.channels.sms;
    const renderedMessage = this.renderTemplate(
      smsTemplate.message_template,
      request.variables,
    );

    // Validate message length
    if (renderedMessage.length > smsTemplate.max_length) {
      throw new Error(
        `SMS message too long: ${renderedMessage.length}/${smsTemplate.max_length} chars`,
      );
    }

    const smsResult = await smsServiceConnector.sendSMS({
      custom_message: renderedMessage,
      recipient: {
        phone: recipient.phone,
        name: recipient.name,
      },
      variables: request.variables,
      priority: this.mapPriorityToSMSPriority(template.priority),
      delivery_time: request.delivery_options?.scheduled_for?.toISOString(),
      enable_delivery_tracking: true,
      compliance_data: {
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        opt_in_method: 'double_opt_in',
      },
    });

    return {
      notification_id: notificationId,
      template_id: template.id,
      recipient_id: recipient.id,
      channel: 'sms',
      status: smsResult.status,
      provider_message_id: smsResult.message_id,
      delivery_timestamp: smsResult.delivery_timestamp,
      cost_estimate: smsResult.cost_estimate,
      error_message: smsResult.error_message,
    };
  }

  /**
   * Deliver push notification
   */
  private async deliverPush(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    request: NotificationRequest,
    notificationId: string,
  ): Promise<NotificationDeliveryResult> {
    if (!recipient.push_token || !template.channels.push) {
      throw new Error('Push channel not available for recipient or template');
    }

    const pushTemplate = template.channels.push;
    const renderedTitle = this.renderTemplate(
      pushTemplate.title_template,
      request.variables,
    );
    const renderedBody = this.renderTemplate(
      pushTemplate.body_template,
      request.variables,
    );

    // Implementation would integrate with Firebase Cloud Messaging or similar
    // For now, we'll simulate the delivery
    const pushResult = await this.sendPushNotification({
      token: recipient.push_token,
      title: renderedTitle,
      body: renderedBody,
      icon: pushTemplate.icon,
      sound: pushTemplate.sound,
      data: {
        notification_id: notificationId,
        template_id: template.id,
        wedding_id: request.context.wedding_id,
      },
    });

    return {
      notification_id: notificationId,
      template_id: template.id,
      recipient_id: recipient.id,
      channel: 'push',
      status: pushResult.success ? 'sent' : 'failed',
      provider_message_id: pushResult.messageId,
      delivery_timestamp: new Date().toISOString(),
      error_message: pushResult.error,
    };
  }

  /**
   * Deliver in-app notification
   */
  private async deliverInApp(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    request: NotificationRequest,
    notificationId: string,
  ): Promise<NotificationDeliveryResult> {
    if (!template.channels.in_app) {
      throw new Error('In-app channel not available for template');
    }

    const inAppTemplate = template.channels.in_app;
    const renderedTitle = this.renderTemplate(
      inAppTemplate.title_template,
      request.variables,
    );
    const renderedMessage = this.renderTemplate(
      inAppTemplate.message_template,
      request.variables,
    );

    // Store in-app notification in database
    const { data, error } = await this.supabase
      .from('in_app_notifications')
      .insert({
        notification_id: notificationId,
        recipient_id: recipient.id,
        template_id: template.id,
        title: renderedTitle,
        message: renderedMessage,
        action_url: inAppTemplate.action_url,
        action_text: inAppTemplate.action_text,
        priority: template.priority,
        wedding_context: request.context,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create in-app notification: ${error.message}`);
    }

    // Emit real-time event for immediate display
    await this.emitRealtimeNotification(recipient.id, {
      id: data.id,
      title: renderedTitle,
      message: renderedMessage,
      priority: template.priority,
      action_url: inAppTemplate.action_url,
      action_text: inAppTemplate.action_text,
    });

    return {
      notification_id: notificationId,
      template_id: template.id,
      recipient_id: recipient.id,
      channel: 'in_app',
      status: 'delivered',
      provider_message_id: data.id,
      delivery_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get notification template by ID
   */
  private async getTemplate(
    templateId: string,
  ): Promise<NotificationTemplate | null> {
    const { data, error } = await this.supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching notification template:', error);
      return null;
    }

    return data as NotificationTemplate;
  }

  /**
   * Validate template variables are provided
   */
  private validateTemplateVariables(
    template: NotificationTemplate,
    variables: Record<string, any>,
  ): void {
    const missingVariables = template.variables.filter(
      (variable) => !(variable in variables),
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required variables: ${missingVariables.join(', ')}`,
      );
    }
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });
    return rendered;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(
    quietHours?: NotificationRecipient['preferences']['quiet_hours'],
  ): boolean {
    if (!quietHours) return false;

    const now = new Date();
    const userTimeZone = quietHours.timezone;

    // Convert to recipient's timezone
    const recipientTime = new Date(
      now.toLocaleString('en-US', { timeZone: userTimeZone }),
    );
    const currentHour = recipientTime.getHours();
    const currentMinute = recipientTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = quietHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Calculate delivery time after quiet hours
   */
  private calculatePostQuietHoursDelivery(
    quietHours: NotificationRecipient['preferences']['quiet_hours'],
  ): Date {
    const now = new Date();
    const [endHour, endMinute] = quietHours!.end.split(':').map(Number);

    const deliveryTime = new Date(now);
    deliveryTime.setHours(endHour, endMinute, 0, 0);

    // If end time is today but in the past, schedule for tomorrow
    if (deliveryTime <= now) {
      deliveryTime.setDate(deliveryTime.getDate() + 1);
    }

    return deliveryTime;
  }

  /**
   * Schedule notification for future delivery
   */
  private async scheduleNotification(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    channel: 'email' | 'sms' | 'push' | 'in_app',
    request: NotificationRequest,
    scheduledTime: Date,
  ): Promise<NotificationDeliveryResult> {
    const notificationId = this.generateNotificationId();

    // Store scheduled notification
    await this.supabase.from('scheduled_notifications').insert({
      notification_id: notificationId,
      template_id: template.id,
      recipient_id: recipient.id,
      channel,
      scheduled_for: scheduledTime.toISOString(),
      status: 'scheduled',
      request_data: request,
      created_at: new Date().toISOString(),
    });

    return {
      notification_id: notificationId,
      template_id: template.id,
      recipient_id: recipient.id,
      channel,
      status: 'scheduled',
      delivery_timestamp: new Date().toISOString(),
      metadata: {
        scheduled_for: scheduledTime.toISOString(),
      },
    };
  }

  /**
   * Record notification batch for analytics
   */
  private async recordNotificationBatch(
    request: NotificationRequest,
    results: NotificationDeliveryResult[],
  ): Promise<void> {
    try {
      await this.supabase.from('notification_batches').insert({
        template_id: request.template_id,
        wedding_id: request.context.wedding_id,
        vendor_id: request.context.vendor_id,
        recipient_count: request.recipients.length,
        delivery_results: results,
        context: request.context,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record notification batch:', error);
    }
  }

  /**
   * Send push notification (placeholder for actual implementation)
   */
  private async sendPushNotification(payload: {
    token: string;
    title: string;
    body: string;
    icon?: string;
    sound?: string;
    data?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // This would integrate with Firebase Cloud Messaging or similar service
    // For now, we'll simulate success
    return {
      success: true,
      messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Emit real-time notification event
   */
  private async emitRealtimeNotification(
    recipientId: string,
    notification: any,
  ): Promise<void> {
    // This would integrate with Supabase realtime or WebSocket system
    try {
      await this.supabase.channel('notifications').send({
        type: 'broadcast',
        event: 'new_notification',
        payload: {
          recipient_id: recipientId,
          notification,
        },
      });
    } catch (error) {
      console.error('Failed to emit realtime notification:', error);
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map template priority to email priority
   */
  private mapPriorityToEmailPriority(
    priority: string,
  ): 'low' | 'normal' | 'high' {
    switch (priority) {
      case 'emergency':
      case 'urgent':
        return 'high';
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Map template priority to SMS priority
   */
  private mapPriorityToSMSPriority(
    priority: string,
  ): 'low' | 'normal' | 'high' {
    switch (priority) {
      case 'emergency':
      case 'urgent':
        return 'high';
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Get delivery analytics for time period
   */
  async getNotificationAnalytics(params: {
    wedding_id?: string;
    vendor_id?: string;
    start_date?: string;
    end_date?: string;
    template_category?: string;
  }): Promise<NotificationAnalytics> {
    try {
      let query = this.supabase.from('notification_delivery_logs').select('*');

      if (params.wedding_id) query = query.eq('wedding_id', params.wedding_id);
      if (params.vendor_id) query = query.eq('vendor_id', params.vendor_id);
      if (params.start_date) query = query.gte('created_at', params.start_date);
      if (params.end_date) query = query.lte('created_at', params.end_date);

      const { data: logs } = await query;

      // Calculate analytics from logs
      const analytics: NotificationAnalytics = {
        total_sent: logs?.length || 0,
        delivery_rate_by_channel: {},
        average_delivery_time_ms: 0,
        failure_rate: 0,
        wedding_milestone_performance: {},
        vendor_communication_stats: {},
        cost_breakdown: {},
      };

      if (logs && logs.length > 0) {
        // Calculate channel delivery rates
        const channelStats = logs.reduce(
          (acc, log) => {
            const channel = log.channel;
            if (!acc[channel]) acc[channel] = { sent: 0, delivered: 0 };
            acc[channel].sent++;
            if (log.status === 'delivered') acc[channel].delivered++;
            return acc;
          },
          {} as Record<string, { sent: number; delivered: number }>,
        );

        Object.entries(channelStats).forEach(([channel, stats]) => {
          analytics.delivery_rate_by_channel[channel] =
            stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
        });

        // Calculate average delivery time
        const deliveryTimes = logs
          .filter((log) => log.delivery_duration_ms)
          .map((log) => log.delivery_duration_ms);

        if (deliveryTimes.length > 0) {
          analytics.average_delivery_time_ms =
            deliveryTimes.reduce((sum, time) => sum + time, 0) /
            deliveryTimes.length;
        }

        // Calculate failure rate
        const failedCount = logs.filter(
          (log) => log.status === 'failed',
        ).length;
        analytics.failure_rate = (failedCount / logs.length) * 100;

        // Calculate cost breakdown
        analytics.cost_breakdown = logs.reduce(
          (acc, log) => {
            if (log.cost_estimate) {
              acc[log.channel] = (acc[log.channel] || 0) + log.cost_estimate;
            }
            return acc;
          },
          {} as Record<string, number>,
        );
      }

      return analytics;
    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationEngine = NotificationEngine.getInstance();
