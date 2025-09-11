import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import Twilio from 'twilio';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Enhanced SMS Service Connector with Twilio Integration
 * Integrates with journey builder service connections
 */

export interface SMSTemplate {
  id: string;
  name: string;
  message_template: string;
  template_variables: string[];
  category: 'journey' | 'transactional' | 'marketing';
  is_active: boolean;
  max_length: number;
  created_at: string;
  updated_at: string;
}

export interface SMSDeliveryOptions {
  template_id?: string;
  custom_message?: string;
  recipient: {
    phone: string;
    name?: string;
  };
  variables: Record<string, any>;
  sender_name?: string;
  priority: 'low' | 'normal' | 'high';
  delivery_time?: string; // ISO string for scheduled delivery
  enable_delivery_tracking?: boolean;
  media_urls?: string[]; // For MMS
  validity_period_hours?: number;
  shorten_urls?: boolean;
  compliance_data?: {
    consent_given: boolean;
    consent_timestamp: string;
    opt_in_method: 'double_opt_in' | 'single_opt_in' | 'imported';
  };
}

export interface SMSDeliveryResult {
  message_id: string;
  status: 'sent' | 'scheduled' | 'queued' | 'failed';
  delivery_timestamp: string;
  recipient: string;
  message_content: string;
  segments_used: number;
  cost_estimate?: number;
  error_message?: string;
}

export interface SMSServiceStatus {
  provider: 'twilio';
  is_configured: boolean;
  account_balance?: number;
  daily_quota: number;
  daily_sent: number;
  monthly_quota: number;
  monthly_sent: number;
  phone_numbers: Array<{
    phone_number: string;
    type: 'local' | 'toll_free' | 'short_code';
    capabilities: string[];
  }>;
  last_error?: string;
}

export class SMSServiceConnector {
  private static instance: SMSServiceConnector;
  private twilioClient: Twilio.Twilio | null = null;

  constructor() {
    this.initializeTwilio();
  }

  static getInstance(): SMSServiceConnector {
    if (!SMSServiceConnector.instance) {
      SMSServiceConnector.instance = new SMSServiceConnector();
    }
    return SMSServiceConnector.instance;
  }

  /**
   * Initialize Twilio client
   */
  private initializeTwilio(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        console.log('Twilio client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Twilio client:', error);
      }
    } else {
      console.warn('Twilio credentials not configured');
    }
  }

  /**
   * Send SMS through Twilio
   */
  async sendSMS(options: SMSDeliveryOptions): Promise<SMSDeliveryResult> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured');
      }

      // Validate compliance
      await this.validateCompliance(options);

      // Get or generate message
      const messageContent = await this.prepareMessage(options);

      // Validate message length
      this.validateMessageLength(messageContent, options.template_id);

      // Process URLs if shortening is enabled
      const processedMessage = options.shorten_urls
        ? await this.shortenUrls(messageContent)
        : messageContent;

      // Calculate segments
      const segments = this.calculateSegments(processedMessage);

      // Get sender phone number
      const fromNumber = await this.getSenderPhoneNumber(
        options.recipient.phone,
      );

      let result: SMSDeliveryResult;

      if (
        options.delivery_time &&
        new Date(options.delivery_time) > new Date()
      ) {
        // Schedule SMS for future delivery
        result = await this.scheduleSMS(options, processedMessage, segments);
      } else {
        // Send SMS immediately
        const twilioMessage = await this.twilioClient.messages.create({
          body: processedMessage,
          from: fromNumber,
          to: options.recipient.phone,
          mediaUrl: options.media_urls,
          validityPeriod: options.validity_period_hours
            ? options.validity_period_hours * 3600
            : undefined,
          statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
          provideFeedback: options.enable_delivery_tracking,
        });

        result = {
          message_id: twilioMessage.sid,
          status: twilioMessage.status === 'queued' ? 'queued' : 'sent',
          delivery_timestamp: new Date().toISOString(),
          recipient: options.recipient.phone,
          message_content: processedMessage,
          segments_used: segments,
          cost_estimate: this.estimateCost(
            segments,
            !!options.media_urls?.length,
          ),
        };
      }

      // Record delivery attempt
      await this.recordDeliveryAttempt(result, options);

      // Update usage tracking
      await this.updateUsageTracking(segments, options.media_urls?.length || 0);

      return result;
    } catch (error) {
      console.error('SMS delivery failed:', error);

      const failedResult: SMSDeliveryResult = {
        message_id: '',
        status: 'failed',
        delivery_timestamp: new Date().toISOString(),
        recipient: options.recipient.phone,
        message_content: '',
        segments_used: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.recordDeliveryAttempt(failedResult, options);
      throw error;
    }
  }

  /**
   * Send bulk SMS with rate limiting and compliance checks
   */
  async sendBulkSMS(
    messages: SMSDeliveryOptions[],
  ): Promise<SMSDeliveryResult[]> {
    const results: SMSDeliveryResult[] = [];
    const batchSize = 5; // Conservative batch size for SMS

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map((sms) =>
        this.sendSMS(sms).catch((error) => ({
          message_id: '',
          status: 'failed' as const,
          delivery_timestamp: new Date().toISOString(),
          recipient: sms.recipient.phone,
          message_content: '',
          segments_used: 0,
          error_message: error.message,
        })),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting delay between batches (Twilio has strict rate limits)
      if (i + batchSize < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Get SMS template by ID
   */
  async getTemplate(templateId: string): Promise<SMSTemplate | null> {
    const { data, error } = await supabase
      .from('sms_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching SMS template:', error);
      return null;
    }

    return data as SMSTemplate;
  }

  /**
   * Get all active SMS templates
   */
  async getActiveTemplates(category?: string): Promise<SMSTemplate[]> {
    let query = supabase
      .from('sms_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching SMS templates:', error);
      return [];
    }

    return data as SMSTemplate[];
  }

  /**
   * Create or update SMS template
   */
  async upsertTemplate(
    template: Omit<SMSTemplate, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<SMSTemplate> {
    const { data, error } = await supabase
      .from('sms_templates')
      .upsert({
        ...template,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save SMS template: ${error.message}`);
    }

    return data as SMSTemplate;
  }

  /**
   * Handle Twilio webhook status updates
   */
  async handleTwilioWebhook(webhookData: {
    MessageSid: string;
    MessageStatus: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    From: string;
    To: string;
    Body?: string;
    NumSegments?: string;
    Price?: string;
    PriceUnit?: string;
  }): Promise<void> {
    try {
      const eventType = this.mapTwilioStatus(webhookData.MessageStatus);

      // Record the event
      await supabase.from('sms_events').insert({
        message_id: webhookData.MessageSid,
        event_type: eventType,
        sender: webhookData.From,
        recipient: webhookData.To,
        status: webhookData.MessageStatus,
        error_code: webhookData.ErrorCode,
        error_message: webhookData.ErrorMessage,
        segments_used: parseInt(webhookData.NumSegments || '1'),
        cost: parseFloat(webhookData.Price || '0'),
        currency: webhookData.PriceUnit || 'USD',
        timestamp: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      });

      // Update delivery status
      await supabase
        .from('sms_deliveries')
        .update({
          delivery_status: eventType,
          delivered_at:
            eventType === 'delivered' ? new Date().toISOString() : undefined,
          failed_at:
            eventType === 'failed' ? new Date().toISOString() : undefined,
          error_code: webhookData.ErrorCode,
          error_message: webhookData.ErrorMessage,
          actual_cost: parseFloat(webhookData.Price || '0'),
          actual_segments: parseInt(webhookData.NumSegments || '1'),
        })
        .eq('message_id', webhookData.MessageSid);

      console.log(
        `SMS webhook processed: ${eventType} for ${webhookData.MessageSid}`,
      );
    } catch (error) {
      console.error('SMS webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle incoming SMS messages
   */
  async handleIncomingSMS(webhookData: {
    MessageSid: string;
    From: string;
    To: string;
    Body: string;
    NumMedia?: string;
    MediaUrl0?: string;
  }): Promise<{ response_message?: string }> {
    try {
      // Record incoming message
      await supabase.from('sms_events').insert({
        message_id: webhookData.MessageSid,
        event_type: 'received',
        sender: webhookData.From,
        recipient: webhookData.To,
        message_content: webhookData.Body,
        media_count: parseInt(webhookData.NumMedia || '0'),
        media_urls: webhookData.MediaUrl0 ? [webhookData.MediaUrl0] : [],
        timestamp: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      });

      // Process keywords and auto-responses
      const autoResponse = await this.processKeywords(
        webhookData.From,
        webhookData.Body,
      );

      // Find associated client and journey
      await this.linkToClient(webhookData.From, webhookData.Body);

      console.log(
        `Incoming SMS processed from ${webhookData.From}: ${webhookData.Body}`,
      );

      return autoResponse ? { response_message: autoResponse } : {};
    } catch (error) {
      console.error('Incoming SMS processing failed:', error);
      throw error;
    }
  }

  /**
   * Get SMS service status and quotas
   */
  async getServiceStatus(): Promise<SMSServiceStatus> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured');
      }

      // Get account info
      const account = await this.twilioClient.api
        .accounts(process.env.TWILIO_ACCOUNT_SID!)
        .fetch();

      // Get phone numbers
      const phoneNumbers = await this.twilioClient.incomingPhoneNumbers.list();

      // Get usage statistics (simplified)
      const usage = await this.getUsageStats();

      return {
        provider: 'twilio',
        is_configured: true,
        account_balance: parseFloat(account.balance),
        daily_quota: usage.daily_quota,
        daily_sent: usage.daily_sent,
        monthly_quota: usage.monthly_quota,
        monthly_sent: usage.monthly_sent,
        phone_numbers: phoneNumbers.map((pn) => ({
          phone_number: pn.phoneNumber,
          type:
            pn.phoneNumber.startsWith('+1800') ||
            pn.phoneNumber.startsWith('+1833')
              ? 'toll_free'
              : 'local',
          capabilities: [
            ...(pn.capabilities.sms ? ['sms'] : []),
            ...(pn.capabilities.mms ? ['mms'] : []),
          ],
        })),
      };
    } catch (error) {
      console.error('Failed to get SMS service status:', error);
      return {
        provider: 'twilio',
        is_configured: false,
        daily_quota: 0,
        daily_sent: 0,
        monthly_quota: 0,
        monthly_sent: 0,
        phone_numbers: [],
        last_error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get delivery analytics for SMS
   */
  async getDeliveryAnalytics(params: {
    journey_id?: string;
    start_date?: string;
    end_date?: string;
    template_id?: string;
  }): Promise<{
    total_sent: number;
    total_delivered: number;
    total_failed: number;
    total_replies: number;
    delivery_rate: number;
    response_rate: number;
    total_cost: number;
    average_cost_per_message: number;
  }> {
    try {
      let query = supabase
        .from('sms_events')
        .select('event_type, cost, message_id');

      if (params.start_date) {
        query = query.gte('timestamp', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('timestamp', params.end_date);
      }

      const { data: events } = await query;

      const stats = {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        total_replies: 0,
        total_cost: 0,
      };

      const messageIds = new Set<string>();

      events?.forEach((event) => {
        if (event.event_type === 'sent') {
          stats.total_sent++;
          messageIds.add(event.message_id);
        } else if (event.event_type === 'delivered') {
          stats.total_delivered++;
        } else if (event.event_type === 'failed') {
          stats.total_failed++;
        } else if (event.event_type === 'received') {
          stats.total_replies++;
        }

        if (event.cost) {
          stats.total_cost += event.cost;
        }
      });

      return {
        ...stats,
        delivery_rate:
          stats.total_sent > 0
            ? (stats.total_delivered / stats.total_sent) * 100
            : 0,
        response_rate:
          stats.total_sent > 0
            ? (stats.total_replies / stats.total_sent) * 100
            : 0,
        average_cost_per_message:
          messageIds.size > 0 ? stats.total_cost / messageIds.size : 0,
      };
    } catch (error) {
      console.error('Failed to get SMS analytics:', error);
      throw error;
    }
  }

  /**
   * Validate compliance requirements
   */
  private async validateCompliance(options: SMSDeliveryOptions): Promise<void> {
    // Check if recipient has consented
    if (!options.compliance_data?.consent_given) {
      const { data: client } = await supabase
        .from('clients')
        .select('sms_consent, sms_opt_in_date')
        .eq('phone', options.recipient.phone)
        .single();

      if (!client || !client.sms_consent) {
        throw new Error('Recipient has not consented to SMS communications');
      }
    }

    // Check if recipient has opted out
    const { data: optOut } = await supabase
      .from('sms_opt_outs')
      .select('id')
      .eq('phone_number', options.recipient.phone)
      .single();

    if (optOut) {
      throw new Error('Recipient has opted out of SMS communications');
    }

    // Validate phone number format
    if (!this.isValidPhoneNumber(options.recipient.phone)) {
      throw new Error('Invalid phone number format');
    }
  }

  /**
   * Prepare message content
   */
  private async prepareMessage(options: SMSDeliveryOptions): Promise<string> {
    if (options.custom_message) {
      return this.replaceVariables(options.custom_message, options.variables);
    }

    if (options.template_id) {
      const template = await this.getTemplate(options.template_id);
      if (!template) {
        throw new Error(`SMS template ${options.template_id} not found`);
      }
      return this.replaceVariables(
        template.message_template,
        options.variables,
      );
    }

    throw new Error('Either custom_message or template_id must be provided');
  }

  /**
   * Replace template variables
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any>,
  ): string {
    let message = template;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });
    return message;
  }

  /**
   * Validate message length
   */
  private validateMessageLength(message: string, templateId?: string): void {
    const maxLength = 1600; // SMS limit
    if (message.length > maxLength) {
      throw new Error(
        `Message too long: ${message.length} characters (max: ${maxLength})`,
      );
    }
  }

  /**
   * Calculate SMS segments
   */
  private calculateSegments(message: string): number {
    const hasUnicode = /[^\u0000-\u007F]/.test(message);
    const maxLength = hasUnicode ? 67 : 153; // Account for concatenation
    return Math.ceil(message.length / maxLength);
  }

  /**
   * Get appropriate sender phone number
   */
  private async getSenderPhoneNumber(recipientPhone: string): Promise<string> {
    // Simple logic - in production you might want more sophisticated routing
    const defaultNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!defaultNumber) {
      throw new Error('No Twilio phone number configured');
    }
    return defaultNumber;
  }

  /**
   * Estimate SMS cost
   */
  private estimateCost(segments: number, hasMms: boolean): number {
    // Rough estimates - actual costs vary by destination
    const smsRate = 0.0075; // $0.0075 per SMS segment
    const mmsRate = 0.02; // $0.02 per MMS

    return segments * (hasMms ? mmsRate : smsRate);
  }

  /**
   * Schedule SMS for future delivery
   */
  private async scheduleSMS(
    options: SMSDeliveryOptions,
    message: string,
    segments: number,
  ): Promise<SMSDeliveryResult> {
    const { data, error } = await supabase
      .from('sms_schedules')
      .insert({
        template_id: options.template_id,
        recipient_phone: options.recipient.phone,
        message_content: message,
        variables: options.variables,
        scheduled_for: options.delivery_time!,
        status: 'pending',
        estimated_segments: segments,
        estimated_cost: this.estimateCost(
          segments,
          !!options.media_urls?.length,
        ),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to schedule SMS: ${error.message}`);
    }

    return {
      message_id: data.id,
      status: 'scheduled',
      delivery_timestamp: new Date().toISOString(),
      recipient: options.recipient.phone,
      message_content: message,
      segments_used: segments,
    };
  }

  /**
   * Record delivery attempt
   */
  private async recordDeliveryAttempt(
    result: SMSDeliveryResult,
    options: SMSDeliveryOptions,
  ): Promise<void> {
    try {
      await supabase.from('sms_deliveries').insert({
        message_id: result.message_id,
        template_id: options.template_id,
        recipient_phone: options.recipient.phone,
        recipient_name: options.recipient.name,
        message_content: result.message_content,
        delivery_status: result.status,
        scheduled_for: options.delivery_time,
        sent_at:
          result.status === 'sent' ? result.delivery_timestamp : undefined,
        estimated_segments: result.segments_used,
        estimated_cost: result.cost_estimate,
        variables_used: options.variables,
        error_message: result.error_message,
      });
    } catch (error) {
      console.error('Failed to record SMS delivery attempt:', error);
    }
  }

  /**
   * Update usage tracking
   */
  private async updateUsageTracking(
    segments: number,
    mediaCount: number,
  ): Promise<void> {
    // Implementation would track daily/monthly usage
    console.log(`SMS usage: ${segments} segments, ${mediaCount} media files`);
  }

  /**
   * Map Twilio status to our event types
   */
  private mapTwilioStatus(status: string): string {
    const statusMap: Record<string, string> = {
      accepted: 'accepted',
      queued: 'queued',
      sending: 'sending',
      sent: 'sent',
      received: 'received',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
    };
    return statusMap[status] || status;
  }

  /**
   * Process keywords for auto-responses
   */
  private async processKeywords(
    fromPhone: string,
    message: string,
  ): Promise<string | null> {
    const upperMessage = message.toUpperCase().trim();

    const keywords: Record<string, string> = {
      STOP: 'You have been unsubscribed from SMS messages.',
      HELP: 'For support, please contact your vendor directly.',
      YES: 'Thank you for confirming!',
      NO: 'Thank you for letting us know.',
    };

    for (const [keyword, response] of Object.entries(keywords)) {
      if (upperMessage.includes(keyword)) {
        // Handle STOP specially
        if (keyword === 'STOP') {
          await this.handleOptOut(fromPhone);
        }
        return response;
      }
    }

    return null;
  }

  /**
   * Handle opt-out request
   */
  private async handleOptOut(phoneNumber: string): Promise<void> {
    try {
      // Add to opt-out list
      await supabase.from('sms_opt_outs').upsert({
        phone_number: phoneNumber,
        opted_out_at: new Date().toISOString(),
        method: 'sms_reply',
      });

      // Update client record
      await supabase
        .from('clients')
        .update({
          sms_consent: false,
          sms_opt_out_date: new Date().toISOString(),
        })
        .eq('phone', phoneNumber);

      console.log(`SMS opt-out processed for ${phoneNumber}`);
    } catch (error) {
      console.error('Failed to process SMS opt-out:', error);
    }
  }

  /**
   * Link incoming message to client and journey
   */
  private async linkToClient(
    phoneNumber: string,
    message: string,
  ): Promise<void> {
    // Find client by phone number
    const { data: client } = await supabase
      .from('clients')
      .select('id, vendor_id')
      .eq('phone', phoneNumber)
      .single();

    if (client) {
      // Record as client activity
      await supabase.from('client_activities').insert({
        client_id: client.id,
        vendor_id: client.vendor_id,
        activity_type: 'sms_reply',
        activity_data: { message, phone: phoneNumber },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get usage statistics
   */
  private async getUsageStats(): Promise<{
    daily_quota: number;
    daily_sent: number;
    monthly_quota: number;
    monthly_sent: number;
  }> {
    // This would be implemented based on your usage tracking system
    return {
      daily_quota: 1000,
      daily_sent: 0,
      monthly_quota: 30000,
      monthly_sent: 0,
    };
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Shorten URLs in message
   */
  private async shortenUrls(message: string): Promise<string> {
    // Simple URL shortening - in production you'd use a service like Bitly
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return message.replace(urlRegex, (url) => {
      // Placeholder shortened URL
      return `https://sms.ly/${Math.random().toString(36).substr(2, 6)}`;
    });
  }
}

// Export singleton instance
export const smsServiceConnector = SMSServiceConnector.getInstance();
