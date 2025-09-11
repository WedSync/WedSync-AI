import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Email Provider Integration Service
 * Enhanced webhook handling for Resend/SendGrid with comprehensive delivery monitoring
 */

export interface EmailDeliveryEvent {
  id: string;
  message_id: string;
  event_type:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'failed'
    | 'complained'
    | 'unsubscribed';
  recipient: string;
  subject?: string;
  provider: 'resend' | 'sendgrid';
  timestamp: Date;
  guest_id?: string;
  couple_id?: string;
  journey_id?: string;
  instance_id?: string;
  raw_event: any;
  metadata: {
    campaign_id?: string;
    template_id?: string;
    tags?: string[];
    user_agent?: string;
    ip_address?: string;
    location?: string;
  };
}

export interface EmailDeliveryStatus {
  message_id: string;
  current_status: string;
  delivery_attempted_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  first_click_at?: Date;
  bounced_at?: Date;
  failed_at?: Date;
  unsubscribed_at?: Date;
  failure_reason?: string;
  bounce_type?: 'hard' | 'soft';
  open_count: number;
  click_count: number;
  provider: string;
  guest_id?: string;
  couple_id?: string;
}

export class EmailProviderIntegration {
  private static instance: EmailProviderIntegration;

  static getInstance(): EmailProviderIntegration {
    if (!EmailProviderIntegration.instance) {
      EmailProviderIntegration.instance = new EmailProviderIntegration();
    }
    return EmailProviderIntegration.instance;
  }

  /**
   * Process Resend webhook events with enhanced tracking
   */
  async processResendWebhook(webhookData: any): Promise<void> {
    try {
      const events = Array.isArray(webhookData.data)
        ? webhookData.data
        : [webhookData.data];

      for (const event of events) {
        await this.processEmailEvent({
          id: `resend_${event.event_id}`,
          message_id: event.email_id,
          event_type: this.mapResendEventType(event.type),
          recipient: event.email,
          subject: event.subject,
          provider: 'resend',
          timestamp: new Date(event.created_at),
          raw_event: event,
          metadata: {
            tags: event.tags || [],
          },
        });
      }
    } catch (error) {
      console.error('Error processing Resend webhook:', error);
      throw error;
    }
  }

  /**
   * Process SendGrid webhook events with enhanced tracking
   */
  async processSendGridWebhook(webhookData: any): Promise<void> {
    try {
      const events = Array.isArray(webhookData) ? webhookData : [webhookData];

      for (const event of events) {
        await this.processEmailEvent({
          id: `sendgrid_${event.sg_event_id}`,
          message_id: event.sg_message_id,
          event_type: this.mapSendGridEventType(event.event),
          recipient: event.email,
          subject: event.subject,
          provider: 'sendgrid',
          timestamp: new Date(event.timestamp * 1000),
          raw_event: event,
          metadata: {
            campaign_id: event.category,
            user_agent: event.useragent,
            ip_address: event.ip,
            location: event.geo?.city,
          },
        });
      }
    } catch (error) {
      console.error('Error processing SendGrid webhook:', error);
      throw error;
    }
  }

  /**
   * Process individual email delivery event
   */
  private async processEmailEvent(event: EmailDeliveryEvent): Promise<void> {
    // Find associated guest if possible
    const guestInfo = await this.findGuestByEmail(event.recipient);
    if (guestInfo) {
      event.guest_id = guestInfo.id;
      event.couple_id = guestInfo.couple_id;
    }

    // Store delivery event
    await this.storeDeliveryEvent(event);

    // Update delivery status
    await this.updateDeliveryStatus(event);

    // Trigger real-time updates
    await this.broadcastStatusUpdate(event);

    // Handle failed messages
    if (event.event_type === 'failed' || event.event_type === 'bounced') {
      await this.handleFailedMessage(event);
    }

    // Handle unsubscribes
    if (event.event_type === 'unsubscribed') {
      await this.handleUnsubscribe(event);
    }
  }

  /**
   * Find guest by email address
   */
  private async findGuestByEmail(
    email: string,
  ): Promise<{ id: string; couple_id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, couple_id')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !data) return null;
      return data;
    } catch (error) {
      console.error('Error finding guest by email:', error);
      return null;
    }
  }

  /**
   * Store delivery event in database
   */
  private async storeDeliveryEvent(event: EmailDeliveryEvent): Promise<void> {
    const { error } = await supabase.from('communication_events').insert({
      id: event.id,
      message_id: event.message_id,
      event_type: event.event_type,
      recipient: event.recipient,
      subject: event.subject,
      provider: event.provider,
      timestamp: event.timestamp.toISOString(),
      guest_id: event.guest_id,
      couple_id: event.couple_id,
      journey_id: event.journey_id,
      instance_id: event.instance_id,
      raw_event: event.raw_event,
      metadata: event.metadata,
      communication_type: 'email',
    });

    if (error) {
      console.error('Error storing delivery event:', error);
      throw error;
    }
  }

  /**
   * Update delivery status tracking
   */
  private async updateDeliveryStatus(event: EmailDeliveryEvent): Promise<void> {
    const updateData: Partial<EmailDeliveryStatus> = {
      current_status: event.event_type,
      provider: event.provider,
      guest_id: event.guest_id,
      couple_id: event.couple_id,
    };

    // Set specific timestamps based on event type
    switch (event.event_type) {
      case 'delivered':
        updateData.delivered_at = event.timestamp;
        break;
      case 'opened':
        updateData.opened_at = event.timestamp;
        updateData.open_count = 1; // Will be incremented if already exists
        break;
      case 'clicked':
        updateData.first_click_at = event.timestamp;
        updateData.click_count = 1; // Will be incremented if already exists
        break;
      case 'bounced':
        updateData.bounced_at = event.timestamp;
        updateData.bounce_type = this.determineBounceType(event.raw_event);
        break;
      case 'failed':
        updateData.failed_at = event.timestamp;
        updateData.failure_reason = this.extractFailureReason(event.raw_event);
        break;
      case 'unsubscribed':
        updateData.unsubscribed_at = event.timestamp;
        break;
    }

    // Upsert delivery status
    const { error } = await supabase.from('email_delivery_status').upsert(
      {
        message_id: event.message_id,
        ...updateData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'message_id',
      },
    );

    if (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Broadcast real-time status updates via WebSocket
   */
  private async broadcastStatusUpdate(
    event: EmailDeliveryEvent,
  ): Promise<void> {
    if (event.couple_id) {
      // Broadcast to couple's communication channel
      await supabase.channel(`couple_${event.couple_id}_communications`).send({
        type: 'broadcast',
        event: 'email_delivery_update',
        payload: {
          message_id: event.message_id,
          event_type: event.event_type,
          recipient: event.recipient,
          timestamp: event.timestamp,
          guest_id: event.guest_id,
        },
      });
    }
  }

  /**
   * Handle failed message events
   */
  private async handleFailedMessage(event: EmailDeliveryEvent): Promise<void> {
    // Store failure for retry logic
    const { error } = await supabase.from('failed_messages').insert({
      message_id: event.message_id,
      recipient: event.recipient,
      failure_type: 'email',
      provider: event.provider,
      failure_reason: this.extractFailureReason(event.raw_event),
      failed_at: event.timestamp.toISOString(),
      guest_id: event.guest_id,
      couple_id: event.couple_id,
      retry_count: 0,
      should_retry: this.shouldRetryFailure(event.raw_event),
    });

    if (error) {
      console.error('Error storing failed message:', error);
    }
  }

  /**
   * Handle unsubscribe events
   */
  private async handleUnsubscribe(event: EmailDeliveryEvent): Promise<void> {
    if (event.guest_id) {
      // Update guest communication preferences
      const { error } = await supabase
        .from('guest_communication_preferences')
        .upsert(
          {
            guest_id: event.guest_id,
            email_unsubscribed: true,
            email_unsubscribed_at: event.timestamp.toISOString(),
            unsubscribe_reason: 'webhook_event',
          },
          {
            onConflict: 'guest_id',
          },
        );

      if (error) {
        console.error('Error updating unsubscribe preferences:', error);
      }
    }
  }

  /**
   * Map Resend event types to standard format
   */
  private mapResendEventType(
    resendEvent: string,
  ): EmailDeliveryEvent['event_type'] {
    const mapping: Record<string, EmailDeliveryEvent['event_type']> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.delivery_delayed': 'failed',
      'email.complained': 'complained',
    };
    return mapping[resendEvent] || 'failed';
  }

  /**
   * Map SendGrid event types to standard format
   */
  private mapSendGridEventType(
    sendGridEvent: string,
  ): EmailDeliveryEvent['event_type'] {
    const mapping: Record<string, EmailDeliveryEvent['event_type']> = {
      processed: 'sent',
      delivered: 'delivered',
      open: 'opened',
      click: 'clicked',
      bounce: 'bounced',
      dropped: 'failed',
      deferred: 'failed',
      spamreport: 'complained',
      unsubscribe: 'unsubscribed',
    };
    return mapping[sendGridEvent] || 'failed';
  }

  /**
   * Determine bounce type from raw event
   */
  private determineBounceType(rawEvent: any): 'hard' | 'soft' {
    if (
      rawEvent.reason?.includes('mailbox') ||
      rawEvent.reason?.includes('invalid')
    ) {
      return 'hard';
    }
    return 'soft';
  }

  /**
   * Extract failure reason from raw event
   */
  private extractFailureReason(rawEvent: any): string {
    return (
      rawEvent.reason ||
      rawEvent.error ||
      rawEvent.response ||
      'Unknown failure'
    );
  }

  /**
   * Determine if failure should be retried
   */
  private shouldRetryFailure(rawEvent: any): boolean {
    const reason = this.extractFailureReason(rawEvent).toLowerCase();

    // Don't retry hard bounces or permanent failures
    if (
      reason.includes('mailbox') ||
      reason.includes('invalid') ||
      reason.includes('blocked') ||
      reason.includes('rejected')
    ) {
      return false;
    }

    // Retry temporary failures
    return true;
  }

  /**
   * Get delivery metrics for a couple
   */
  async getDeliveryMetrics(
    coupleId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<any> {
    let query = supabase
      .from('communication_events')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('communication_type', 'email');

    if (dateRange) {
      query = query
        .gte('timestamp', dateRange.from.toISOString())
        .lte('timestamp', dateRange.to.toISOString());
    }

    const { data: events, error } = await query;

    if (error) throw error;

    // Calculate metrics
    const metrics = {
      total_sent: events?.filter((e) => e.event_type === 'sent').length || 0,
      total_delivered:
        events?.filter((e) => e.event_type === 'delivered').length || 0,
      total_opened:
        events?.filter((e) => e.event_type === 'opened').length || 0,
      total_clicked:
        events?.filter((e) => e.event_type === 'clicked').length || 0,
      total_bounced:
        events?.filter((e) => e.event_type === 'bounced').length || 0,
      total_failed:
        events?.filter((e) => e.event_type === 'failed').length || 0,
      total_complaints:
        events?.filter((e) => e.event_type === 'complained').length || 0,
      total_unsubscribed:
        events?.filter((e) => e.event_type === 'unsubscribed').length || 0,
    };

    // Calculate rates
    return {
      ...metrics,
      delivery_rate: metrics.total_sent
        ? (metrics.total_delivered / metrics.total_sent) * 100
        : 0,
      open_rate: metrics.total_delivered
        ? (metrics.total_opened / metrics.total_delivered) * 100
        : 0,
      click_rate: metrics.total_opened
        ? (metrics.total_clicked / metrics.total_opened) * 100
        : 0,
      bounce_rate: metrics.total_sent
        ? (metrics.total_bounced / metrics.total_sent) * 100
        : 0,
    };
  }
}

export const emailProviderIntegration = EmailProviderIntegration.getInstance();
