import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: SMS Provider Integration Service
 * Enhanced Twilio webhook handling with comprehensive delivery monitoring
 */

export interface SMSDeliveryEvent {
  id: string;
  message_sid: string;
  event_type:
    | 'sent'
    | 'delivered'
    | 'failed'
    | 'undelivered'
    | 'read'
    | 'received';
  recipient: string;
  sender: string;
  message_body?: string;
  provider: 'twilio';
  timestamp: Date;
  guest_id?: string;
  couple_id?: string;
  journey_id?: string;
  instance_id?: string;
  raw_event: any;
  metadata: {
    error_code?: string;
    error_message?: string;
    num_segments?: number;
    num_media?: number;
    price?: string;
    price_unit?: string;
    account_sid?: string;
    from_country?: string;
    to_country?: string;
  };
}

export interface SMSDeliveryStatus {
  message_sid: string;
  current_status: string;
  sent_at?: Date;
  delivered_at?: Date;
  failed_at?: Date;
  read_at?: Date;
  failure_reason?: string;
  error_code?: string;
  num_segments: number;
  price?: number;
  price_unit?: string;
  provider: string;
  guest_id?: string;
  couple_id?: string;
}

export class SMSProviderIntegration {
  private static instance: SMSProviderIntegration;

  static getInstance(): SMSProviderIntegration {
    if (!SMSProviderIntegration.instance) {
      SMSProviderIntegration.instance = new SMSProviderIntegration();
    }
    return SMSProviderIntegration.instance;
  }

  /**
   * Process Twilio status callback webhook
   */
  async processTwilioStatusCallback(webhookData: any): Promise<void> {
    try {
      await this.processSMSEvent({
        id: `twilio_${webhookData.MessageSid}_${Date.now()}`,
        message_sid: webhookData.MessageSid,
        event_type: this.mapTwilioMessageStatus(webhookData.MessageStatus),
        recipient: webhookData.To,
        sender: webhookData.From,
        provider: 'twilio',
        timestamp: new Date(),
        raw_event: webhookData,
        metadata: {
          error_code: webhookData.ErrorCode,
          error_message: webhookData.ErrorMessage,
          num_segments: parseInt(webhookData.NumSegments) || 1,
          num_media: parseInt(webhookData.NumMedia) || 0,
          price: webhookData.Price,
          price_unit: webhookData.PriceUnit,
          account_sid: webhookData.AccountSid,
          from_country: webhookData.FromCountry,
          to_country: webhookData.ToCountry,
        },
      });
    } catch (error) {
      console.error('Error processing Twilio status callback:', error);
      throw error;
    }
  }

  /**
   * Process incoming Twilio SMS webhook
   */
  async processTwilioIncomingSMS(
    webhookData: any,
  ): Promise<{ shouldRespond: boolean; response?: string }> {
    try {
      await this.processSMSEvent({
        id: `twilio_incoming_${webhookData.MessageSid}`,
        message_sid: webhookData.MessageSid,
        event_type: 'received',
        recipient: webhookData.To,
        sender: webhookData.From,
        message_body: webhookData.Body,
        provider: 'twilio',
        timestamp: new Date(),
        raw_event: webhookData,
        metadata: {
          num_segments: parseInt(webhookData.NumSegments) || 1,
          num_media: parseInt(webhookData.NumMedia) || 0,
          account_sid: webhookData.AccountSid,
          from_country: webhookData.FromCountry,
          to_country: webhookData.ToCountry,
        },
      });

      // Check for auto-response patterns
      return await this.handleIncomingSMSAutoResponse(
        webhookData.Body,
        webhookData.From,
      );
    } catch (error) {
      console.error('Error processing incoming SMS:', error);
      throw error;
    }
  }

  /**
   * Process individual SMS delivery event
   */
  private async processSMSEvent(event: SMSDeliveryEvent): Promise<void> {
    // Find associated guest by phone number
    const guestInfo = await this.findGuestByPhone(event.recipient);
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
    if (event.event_type === 'failed' || event.event_type === 'undelivered') {
      await this.handleFailedMessage(event);
    }

    // Handle incoming messages (guest responses)
    if (event.event_type === 'received') {
      await this.handleIncomingSMS(event);
    }
  }

  /**
   * Find guest by phone number (with phone number normalization)
   */
  private async findGuestByPhone(
    phone: string,
  ): Promise<{ id: string; couple_id: string } | null> {
    try {
      // Normalize phone number (remove +1, spaces, hyphens, parentheses)
      const normalizedPhone = phone.replace(/[\s\-\(\)\+1]/g, '');

      const { data, error } = await supabase
        .from('guests')
        .select('id, couple_id, phone')
        .not('phone', 'is', null);

      if (error || !data) return null;

      // Find matching guest by normalized phone
      const matchingGuest = data.find((guest) => {
        if (!guest.phone) return false;
        const guestPhone = guest.phone.replace(/[\s\-\(\)\+1]/g, '');
        return (
          guestPhone === normalizedPhone ||
          guestPhone.endsWith(normalizedPhone.slice(-10))
        );
      });

      return matchingGuest
        ? { id: matchingGuest.id, couple_id: matchingGuest.couple_id }
        : null;
    } catch (error) {
      console.error('Error finding guest by phone:', error);
      return null;
    }
  }

  /**
   * Store SMS delivery event in database
   */
  private async storeDeliveryEvent(event: SMSDeliveryEvent): Promise<void> {
    const { error } = await supabase.from('communication_events').insert({
      id: event.id,
      message_id: event.message_sid,
      event_type: event.event_type,
      recipient: event.recipient,
      sender: event.sender,
      message_body: event.message_body,
      provider: event.provider,
      timestamp: event.timestamp.toISOString(),
      guest_id: event.guest_id,
      couple_id: event.couple_id,
      journey_id: event.journey_id,
      instance_id: event.instance_id,
      raw_event: event.raw_event,
      metadata: event.metadata,
      communication_type: 'sms',
    });

    if (error) {
      console.error('Error storing SMS delivery event:', error);
      throw error;
    }
  }

  /**
   * Update SMS delivery status tracking
   */
  private async updateDeliveryStatus(event: SMSDeliveryEvent): Promise<void> {
    const updateData: Partial<SMSDeliveryStatus> = {
      current_status: event.event_type,
      provider: event.provider,
      guest_id: event.guest_id,
      couple_id: event.couple_id,
      num_segments: event.metadata.num_segments || 1,
      price: event.metadata.price
        ? parseFloat(event.metadata.price)
        : undefined,
      price_unit: event.metadata.price_unit,
    };

    // Set specific timestamps based on event type
    switch (event.event_type) {
      case 'sent':
        updateData.sent_at = event.timestamp;
        break;
      case 'delivered':
        updateData.delivered_at = event.timestamp;
        break;
      case 'failed':
      case 'undelivered':
        updateData.failed_at = event.timestamp;
        updateData.failure_reason =
          event.metadata.error_message || 'Unknown failure';
        updateData.error_code = event.metadata.error_code;
        break;
      case 'read':
        updateData.read_at = event.timestamp;
        break;
    }

    // Upsert delivery status
    const { error } = await supabase.from('sms_delivery_status').upsert(
      {
        message_sid: event.message_sid,
        ...updateData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'message_sid',
      },
    );

    if (error) {
      console.error('Error updating SMS delivery status:', error);
      throw error;
    }
  }

  /**
   * Broadcast real-time status updates via WebSocket
   */
  private async broadcastStatusUpdate(event: SMSDeliveryEvent): Promise<void> {
    if (event.couple_id) {
      // Broadcast to couple's communication channel
      await supabase.channel(`couple_${event.couple_id}_communications`).send({
        type: 'broadcast',
        event: 'sms_delivery_update',
        payload: {
          message_sid: event.message_sid,
          event_type: event.event_type,
          recipient: event.recipient,
          timestamp: event.timestamp,
          guest_id: event.guest_id,
          segments: event.metadata.num_segments,
          price: event.metadata.price,
        },
      });
    }
  }

  /**
   * Handle failed SMS messages
   */
  private async handleFailedMessage(event: SMSDeliveryEvent): Promise<void> {
    // Store failure for retry logic
    const { error } = await supabase.from('failed_messages').insert({
      message_id: event.message_sid,
      recipient: event.recipient,
      failure_type: 'sms',
      provider: event.provider,
      failure_reason: event.metadata.error_message || 'Unknown failure',
      error_code: event.metadata.error_code,
      failed_at: event.timestamp.toISOString(),
      guest_id: event.guest_id,
      couple_id: event.couple_id,
      retry_count: 0,
      should_retry: this.shouldRetryFailure(event.metadata.error_code),
    });

    if (error) {
      console.error('Error storing failed SMS:', error);
    }
  }

  /**
   * Handle incoming SMS messages (guest responses)
   */
  private async handleIncomingSMS(event: SMSDeliveryEvent): Promise<void> {
    if (!event.guest_id || !event.message_body) return;

    // Store guest response
    const { error } = await supabase.from('guest_responses').insert({
      guest_id: event.guest_id,
      couple_id: event.couple_id,
      response_type: 'sms',
      response_body: event.message_body,
      received_at: event.timestamp.toISOString(),
      sender_phone: event.sender,
      raw_data: event.raw_event,
    });

    if (error) {
      console.error('Error storing guest response:', error);
    }

    // Check for RSVP keywords and auto-process
    await this.processRSVPKeywords(event);
  }

  /**
   * Handle auto-response patterns for incoming SMS
   */
  private async handleIncomingSMSAutoResponse(
    messageBody: string,
    fromPhone: string,
  ): Promise<{ shouldRespond: boolean; response?: string }> {
    const body = messageBody.toLowerCase().trim();

    // STOP/Unsubscribe handling
    if (body === 'stop' || body === 'unsubscribe' || body === 'opt out') {
      await this.handleSMSUnsubscribe(fromPhone);
      return {
        shouldRespond: true,
        response:
          'You have been unsubscribed from SMS notifications. Reply START to resubscribe.',
      };
    }

    // START/Subscribe handling
    if (body === 'start' || body === 'subscribe' || body === 'opt in') {
      await this.handleSMSResubscribe(fromPhone);
      return {
        shouldRespond: true,
        response:
          'You have been resubscribed to SMS notifications. Reply STOP to unsubscribe.',
      };
    }

    // HELP handling
    if (body === 'help' || body === 'info') {
      return {
        shouldRespond: true,
        response:
          'Reply STOP to unsubscribe, START to resubscribe, or contact the couple directly for questions.',
      };
    }

    return { shouldRespond: false };
  }

  /**
   * Process RSVP keywords in incoming messages
   */
  private async processRSVPKeywords(event: SMSDeliveryEvent): Promise<void> {
    if (!event.message_body || !event.guest_id) return;

    const body = event.message_body.toLowerCase();
    let rsvpStatus = null;

    // Check for acceptance keywords
    if (
      body.includes('yes') ||
      body.includes('accept') ||
      body.includes('attending') ||
      body.includes('will be there')
    ) {
      rsvpStatus = 'accepted';
    }
    // Check for decline keywords
    else if (
      body.includes('no') ||
      body.includes('decline') ||
      body.includes('cannot') ||
      body.includes("can't") ||
      body.includes('regret')
    ) {
      rsvpStatus = 'declined';
    }

    if (rsvpStatus) {
      // Update RSVP status
      const { error } = await supabase.from('guest_rsvp_status').upsert(
        {
          guest_id: event.guest_id,
          status: rsvpStatus,
          response_method: 'sms',
          responded_at: event.timestamp.toISOString(),
          notes: event.message_body,
        },
        {
          onConflict: 'guest_id',
        },
      );

      if (error) {
        console.error('Error updating RSVP status:', error);
      }
    }
  }

  /**
   * Handle SMS unsubscribe
   */
  private async handleSMSUnsubscribe(phone: string): Promise<void> {
    const guestInfo = await this.findGuestByPhone(phone);
    if (guestInfo) {
      const { error } = await supabase
        .from('guest_communication_preferences')
        .upsert(
          {
            guest_id: guestInfo.id,
            sms_unsubscribed: true,
            sms_unsubscribed_at: new Date().toISOString(),
            unsubscribe_reason: 'sms_stop',
          },
          {
            onConflict: 'guest_id',
          },
        );

      if (error) {
        console.error('Error updating SMS unsubscribe:', error);
      }
    }
  }

  /**
   * Handle SMS resubscribe
   */
  private async handleSMSResubscribe(phone: string): Promise<void> {
    const guestInfo = await this.findGuestByPhone(phone);
    if (guestInfo) {
      const { error } = await supabase
        .from('guest_communication_preferences')
        .upsert(
          {
            guest_id: guestInfo.id,
            sms_unsubscribed: false,
            sms_resubscribed_at: new Date().toISOString(),
          },
          {
            onConflict: 'guest_id',
          },
        );

      if (error) {
        console.error('Error updating SMS resubscribe:', error);
      }
    }
  }

  /**
   * Map Twilio message status to standard format
   */
  private mapTwilioMessageStatus(
    twilioStatus: string,
  ): SMSDeliveryEvent['event_type'] {
    const mapping: Record<string, SMSDeliveryEvent['event_type']> = {
      queued: 'sent',
      sending: 'sent',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'undelivered',
      failed: 'failed',
      read: 'read',
    };
    return mapping[twilioStatus] || 'failed';
  }

  /**
   * Determine if SMS failure should be retried
   */
  private shouldRetryFailure(errorCode?: string): boolean {
    if (!errorCode) return true;

    // Don't retry permanent failures
    const permanentErrorCodes = [
      '21211', // Invalid phone number
      '21614', // Not a mobile number
      '21408', // Permission denied
      '21610', // Message filtered
    ];

    return !permanentErrorCodes.includes(errorCode);
  }

  /**
   * Get SMS delivery metrics for a couple
   */
  async getDeliveryMetrics(
    coupleId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<any> {
    let query = supabase
      .from('communication_events')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('communication_type', 'sms');

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
      total_failed:
        events?.filter(
          (e) => e.event_type === 'failed' || e.event_type === 'undelivered',
        ).length || 0,
      total_received:
        events?.filter((e) => e.event_type === 'received').length || 0,
      total_read: events?.filter((e) => e.event_type === 'read').length || 0,
    };

    // Calculate costs and segments
    const costData = events?.reduce(
      (acc, event) => {
        if (event.metadata?.price) {
          acc.totalCost += parseFloat(event.metadata.price);
        }
        if (event.metadata?.num_segments) {
          acc.totalSegments += parseInt(event.metadata.num_segments);
        }
        return acc;
      },
      { totalCost: 0, totalSegments: 0 },
    ) || { totalCost: 0, totalSegments: 0 };

    // Calculate rates
    return {
      ...metrics,
      ...costData,
      delivery_rate: metrics.total_sent
        ? (metrics.total_delivered / metrics.total_sent) * 100
        : 0,
      failure_rate: metrics.total_sent
        ? (metrics.total_failed / metrics.total_sent) * 100
        : 0,
      response_rate: metrics.total_sent
        ? (metrics.total_received / metrics.total_sent) * 100
        : 0,
      read_rate: metrics.total_delivered
        ? (metrics.total_read / metrics.total_delivered) * 100
        : 0,
    };
  }
}

export const smsProviderIntegration = SMSProviderIntegration.getInstance();
