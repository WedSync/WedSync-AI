import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { smsService } from '../services/sms-templates';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface SMSExecutionConfig {
  template: string;
  to?: string;
  message?: string; // Custom message override
  variables?: Record<string, any>;
  scheduleFor?: Date;
  mediaUrls?: string[]; // For MMS
  validityPeriod?: number; // Hours
  priority?: 'low' | 'normal' | 'high';
  enableDeliveryTracking?: boolean;
  maxLength?: number;
  shortenUrls?: boolean;
}

export interface SMSExecutionResult {
  messageId: string;
  status: 'sent' | 'scheduled' | 'failed' | 'queued';
  recipient: string;
  template: string;
  message: string;
  timestamp: Date;
  cost?: number;
  segments?: number;
  error?: string;
}

/**
 * SMS Executor - Handles SMS sending with Twilio integration
 */
export class SMSExecutor {
  /**
   * Execute SMS sending
   */
  static async execute(
    instanceId: string,
    clientId: string,
    vendorId: string,
    organizationId: string,
    config: SMSExecutionConfig,
    variables: Record<string, any> = {},
  ): Promise<SMSExecutionResult> {
    try {
      // Check SMS credits/permissions
      await this.checkSMSPermissions(organizationId);

      // Get client details
      const { data: client } = await supabase
        .from('clients')
        .select('phone, first_name, last_name, email, sms_consent')
        .eq('id', clientId)
        .single();

      if (!client || !client.phone) {
        throw new Error('Client phone number not found');
      }

      // Check SMS consent
      if (!client.sms_consent) {
        throw new Error('Client has not consented to SMS communications');
      }

      // Get vendor details
      const { data: vendor } = await supabase
        .from('vendors')
        .select('business_name, phone')
        .eq('id', vendorId)
        .single();

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Get organization tier for SMS limits
      const { data: org } = await supabase
        .from('organizations')
        .select('tier, settings')
        .eq('id', organizationId)
        .single();

      const organizationTier = org?.tier || 'PROFESSIONAL';

      // Prepare SMS variables
      const smsVariables = {
        ...variables,
        client_first_name: client.first_name,
        client_last_name: client.last_name,
        client_phone: client.phone,
        vendor_name: vendor.business_name,
        vendor_phone: vendor.phone,
        ...config.variables,
      };

      // Determine recipient
      const recipient = config.to || client.phone;

      // Generate message from template or use custom message
      const message =
        config.message ||
        (await this.generateMessage(config.template, smsVariables));

      // Validate message length
      if (config.maxLength && message.length > config.maxLength) {
        throw new Error(
          `Message too long: ${message.length} characters (max: ${config.maxLength})`,
        );
      }

      // Process URLs if URL shortening is enabled
      let processedMessage = message;
      if (config.shortenUrls) {
        processedMessage = await this.shortenUrlsInMessage(message);
      }

      let result: SMSExecutionResult;

      if (config.scheduleFor && config.scheduleFor > new Date()) {
        // Schedule SMS for future delivery
        result = await this.scheduleSMS(
          instanceId,
          {
            to: recipient,
            message: processedMessage,
            template: config.template,
            mediaUrls: config.mediaUrls,
          },
          config.scheduleFor,
        );
      } else {
        // Send SMS immediately
        const smsResult = await smsService.sendSMS({
          to: recipient,
          template: config.template as any,
          variables: smsVariables,
          organizationId,
          organizationTier: organizationTier as any,
          customMessage:
            processedMessage !== message ? processedMessage : undefined,
        });

        result = {
          messageId: smsResult.messageId,
          status: 'sent',
          recipient,
          template: config.template,
          message: processedMessage,
          timestamp: new Date(),
          cost: smsResult.cost || 0,
          segments: this.calculateSegments(processedMessage),
        };
      }

      // Record SMS event
      await this.recordSMSEvent(instanceId, clientId, result, config);

      // Set up delivery tracking if enabled
      if (config.enableDeliveryTracking) {
        await this.setupDeliveryTracking(
          result.messageId,
          instanceId,
          clientId,
        );
      }

      // Update SMS usage metrics
      await this.updateSMSUsage(organizationId, result.segments || 1);

      return result;
    } catch (error) {
      console.error('SMS execution failed:', error);

      const failedResult: SMSExecutionResult = {
        messageId: '',
        status: 'failed',
        recipient: config.to || 'unknown',
        template: config.template,
        message: config.message || '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Record failed SMS event
      await this.recordSMSEvent(instanceId, clientId, failedResult, config);

      throw error;
    }
  }

  /**
   * Check SMS permissions and credits
   */
  private static async checkSMSPermissions(organizationId: string) {
    const { data: org } = await supabase
      .from('organizations')
      .select('tier, max_sms_credits, settings')
      .eq('id', organizationId)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if SMS is enabled for this tier
    if (org.max_sms_credits === 0) {
      throw new Error('SMS not available for current plan');
    }

    // Check current usage (this would require a usage tracking table)
    // For now, we'll assume it's allowed
    const currentUsage = 0; // TODO: Implement usage tracking

    if (currentUsage >= org.max_sms_credits) {
      throw new Error('SMS credit limit exceeded');
    }
  }

  /**
   * Generate message from template
   */
  private static async generateMessage(
    template: string,
    variables: Record<string, any>,
  ): Promise<string> {
    const messageTemplates: Record<string, string> = {
      welcome:
        "Hi {client_first_name}! Welcome to {vendor_name}. We're excited to work with you!",
      form_reminder:
        'Hi {client_first_name}, friendly reminder to complete your form for {vendor_name}: {form_url}',
      thank_you:
        'Thank you {client_first_name}! It was a pleasure working with you. - {vendor_name}',
      appointment_reminder:
        'Hi {client_first_name}, this is a reminder of your appointment with {vendor_name} tomorrow at {appointment_time}',
      payment_reminder:
        'Hi {client_first_name}, your payment of ${amount} is due for {vendor_name}. Pay here: {payment_url}',
      contract_reminder:
        'Hi {client_first_name}, please review and sign your contract with {vendor_name}: {contract_url}',
      timeline_update:
        'Hi {client_first_name}, your timeline with {vendor_name} has been updated. View it here: {timeline_url}',
      event_confirmation:
        "Hi {client_first_name}, confirming your event with {vendor_name} on {event_date}. We're ready!",
      day_before_reminder:
        'Hi {client_first_name}, tomorrow is the big day! {vendor_name} is ready to make it perfect.',
      follow_up:
        "Hi {client_first_name}, how was your experience with {vendor_name}? We'd love your feedback: {review_url}",
    };

    let message = messageTemplates[template] || template;

    // Replace variables in message
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    return message;
  }

  /**
   * Schedule SMS for future delivery
   */
  private static async scheduleSMS(
    instanceId: string,
    smsData: any,
    scheduleFor: Date,
  ): Promise<SMSExecutionResult> {
    const { data: schedule } = await supabase
      .from('journey_schedules')
      .insert({
        instance_id: instanceId,
        node_id: 'sms_scheduled',
        scheduled_for: scheduleFor.toISOString(),
        schedule_type: 'sms_delivery',
        status: 'pending',
        metadata: {
          smsData,
          type: 'sms',
        },
      })
      .select()
      .single();

    return {
      messageId: schedule?.id || 'scheduled',
      status: 'scheduled',
      recipient: smsData.to,
      template: smsData.template,
      message: smsData.message,
      timestamp: new Date(),
    };
  }

  /**
   * Shorten URLs in message
   */
  private static async shortenUrlsInMessage(message: string): Promise<string> {
    // Simple URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex) || [];

    let shortenedMessage = message;

    for (const url of urls) {
      try {
        // In a real implementation, you'd use a URL shortening service
        // For now, we'll just use a placeholder
        const shortUrl = `https://short.ly/${Math.random().toString(36).substr(2, 8)}`;
        shortenedMessage = shortenedMessage.replace(url, shortUrl);
      } catch (error) {
        console.error('Failed to shorten URL:', url, error);
        // Continue with original URL if shortening fails
      }
    }

    return shortenedMessage;
  }

  /**
   * Calculate SMS segments
   */
  private static calculateSegments(message: string): number {
    // Standard SMS is 160 characters, but with special characters it can be 70
    // This is a simplified calculation
    const hasSpecialChars = /[^\x00-\x7F]/.test(message);
    const maxLength = hasSpecialChars ? 67 : 153; // Account for concatenation headers

    return Math.ceil(message.length / maxLength);
  }

  /**
   * Record SMS event in the database
   */
  private static async recordSMSEvent(
    instanceId: string,
    clientId: string,
    result: SMSExecutionResult,
    config: SMSExecutionConfig,
  ) {
    try {
      await supabase.from('journey_events').insert({
        instance_id: instanceId,
        client_id: clientId,
        event_type: result.status === 'failed' ? 'sms_failed' : 'sms_sent',
        event_source: 'system',
        event_data: {
          messageId: result.messageId,
          template: result.template,
          recipient: result.recipient,
          message: result.message,
          status: result.status,
          cost: result.cost,
          segments: result.segments,
          timestamp: result.timestamp.toISOString(),
          trackingEnabled: config.enableDeliveryTracking || false,
          error: result.error,
        },
      });
    } catch (error) {
      console.error('Failed to record SMS event:', error);
    }
  }

  /**
   * Set up delivery tracking
   */
  private static async setupDeliveryTracking(
    messageId: string,
    instanceId: string,
    clientId: string,
  ) {
    try {
      const trackingData = {
        message_id: messageId,
        instance_id: instanceId,
        client_id: clientId,
        tracking_enabled: true,
        created_at: new Date().toISOString(),
        status: 'active',
      };

      await supabase.from('journey_events').insert({
        instance_id: instanceId,
        client_id: clientId,
        event_type: 'sms_tracking_setup',
        event_source: 'system',
        event_data: trackingData,
      });
    } catch (error) {
      console.error('Failed to setup SMS tracking:', error);
    }
  }

  /**
   * Update SMS usage metrics
   */
  private static async updateSMSUsage(
    organizationId: string,
    segments: number,
  ) {
    try {
      // This would typically update a usage tracking table
      // For now, we'll just log it
      console.log(`SMS usage for org ${organizationId}: ${segments} segments`);

      // You could implement this by:
      // 1. Creating a usage tracking table
      // 2. Incrementing daily/monthly usage counters
      // 3. Triggering alerts if approaching limits
    } catch (error) {
      console.error('Failed to update SMS usage:', error);
    }
  }

  /**
   * Handle SMS delivery status webhook
   */
  static async handleDeliveryStatus(
    messageId: string,
    status: 'delivered' | 'failed' | 'undelivered',
    errorCode?: string,
    timestamp: Date = new Date(),
  ) {
    try {
      // Find the tracking record
      const { data: events } = await supabase
        .from('journey_events')
        .select('*')
        .eq('event_type', 'sms_tracking_setup')
        .contains('event_data', { message_id: messageId })
        .limit(1);

      if (!events || events.length === 0) {
        console.warn(`No tracking record found for SMS: ${messageId}`);
        return;
      }

      const trackingEvent = events[0];

      // Record the delivery status
      await supabase.from('journey_events').insert({
        instance_id: trackingEvent.instance_id,
        client_id: trackingEvent.client_id,
        event_type: `sms_${status}`,
        event_source: 'webhook',
        event_data: {
          messageId,
          status,
          errorCode,
          deliveredAt: timestamp.toISOString(),
        },
      });

      console.log(
        `SMS delivery status recorded for message: ${messageId}, status: ${status}`,
      );
    } catch (error) {
      console.error('Failed to handle SMS delivery status:', error);
    }
  }

  /**
   * Handle SMS reply webhook
   */
  static async handleSMSReply(
    fromNumber: string,
    toNumber: string,
    message: string,
    timestamp: Date = new Date(),
  ) {
    try {
      // Find the client by phone number
      const { data: client } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('phone', fromNumber)
        .single();

      if (!client) {
        console.warn(`No client found for phone number: ${fromNumber}`);
        return;
      }

      // Record the reply
      await supabase.from('journey_events').insert({
        client_id: client.id,
        event_type: 'sms_reply',
        event_source: 'webhook',
        event_data: {
          fromNumber,
          toNumber,
          message,
          repliedAt: timestamp.toISOString(),
        },
      });

      // Optionally trigger a journey based on reply keywords
      await this.processReplyKeywords(client.id, message);

      console.log(
        `SMS reply recorded from client: ${client.first_name} ${client.last_name}`,
      );
    } catch (error) {
      console.error('Failed to handle SMS reply:', error);
    }
  }

  /**
   * Process reply keywords for automation
   */
  private static async processReplyKeywords(clientId: string, message: string) {
    const keywords = {
      STOP: 'opt_out',
      YES: 'confirmation',
      NO: 'rejection',
      HELP: 'help_request',
      INFO: 'info_request',
    };

    const upperMessage = message.toUpperCase().trim();

    for (const [keyword, eventType] of Object.entries(keywords)) {
      if (upperMessage.includes(keyword)) {
        // Record keyword event
        await supabase.from('journey_events').insert({
          client_id: clientId,
          event_type: `sms_keyword_${eventType}`,
          event_source: 'system',
          event_data: {
            keyword,
            originalMessage: message,
            processedAt: new Date().toISOString(),
          },
        });

        // Handle specific keywords
        if (keyword === 'STOP') {
          // Update client SMS consent
          await supabase
            .from('clients')
            .update({ sms_consent: false })
            .eq('id', clientId);
        }

        break;
      }
    }
  }

  /**
   * Get SMS delivery statistics
   */
  static async getSMSStats(
    instanceId?: string,
    journeyId?: string,
  ): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    replies: number;
    optOuts: number;
  }> {
    try {
      let query = supabase.from('journey_events').select('event_type');

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }
      if (journeyId) {
        query = query.eq('journey_id', journeyId);
      }

      query = query.in('event_type', [
        'sms_sent',
        'sms_delivered',
        'sms_failed',
        'sms_reply',
        'sms_keyword_opt_out',
      ]);

      const { data: events } = await query;

      const stats = {
        sent: 0,
        delivered: 0,
        failed: 0,
        replies: 0,
        optOuts: 0,
      };

      events?.forEach((event) => {
        switch (event.event_type) {
          case 'sms_sent':
            stats.sent++;
            break;
          case 'sms_delivered':
            stats.delivered++;
            break;
          case 'sms_failed':
            stats.failed++;
            break;
          case 'sms_reply':
            stats.replies++;
            break;
          case 'sms_keyword_opt_out':
            stats.optOuts++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get SMS stats:', error);
      return {
        sent: 0,
        delivered: 0,
        failed: 0,
        replies: 0,
        optOuts: 0,
      };
    }
  }

  /**
   * Validate SMS configuration
   */
  static validateConfig(config: SMSExecutionConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.template && !config.message) {
      errors.push('Either template or message is required');
    }

    if (config.to && !this.isValidPhoneNumber(config.to)) {
      errors.push('Invalid phone number format');
    }

    if (config.scheduleFor && config.scheduleFor <= new Date()) {
      errors.push('Schedule time must be in the future');
    }

    if (config.maxLength && config.maxLength < 1) {
      errors.push('Max length must be positive');
    }

    if (
      config.validityPeriod &&
      (config.validityPeriod < 1 || config.validityPeriod > 72)
    ) {
      errors.push('Validity period must be between 1 and 72 hours');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate phone number format
   */
  private static isValidPhoneNumber(phone: string): boolean {
    // Simple E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}
