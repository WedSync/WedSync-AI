import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';
import type {
  SMSTemplate,
  SMSConfiguration,
  SMSMessage,
  SMSSendConfig,
  SMSMetrics,
  SMSValidationResult,
  SMSComplianceCheck,
} from '@/types/sms';

interface SMSData {
  to: string;
  message: string;
  mediaUrl?: string;
  from?: string;
}

interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  price?: string;
  priceUnit?: string;
  errorCode?: string;
  errorMessage?: string;
}

export class SMSService {
  private client: any;
  private fromNumber: string;
  private isConfigured: boolean;
  private configuration?: SMSConfiguration;

  constructor(configuration?: SMSConfiguration) {
    this.configuration = configuration;

    // Use configuration or environment variables
    const accountSid =
      configuration?.account_sid_encrypted || process.env.TWILIO_ACCOUNT_SID;
    const authToken =
      configuration?.auth_token_encrypted || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber =
      configuration?.phone_number || process.env.TWILIO_PHONE_NUMBER || '';

    this.isConfigured = !!(accountSid && authToken && this.fromNumber);

    if (!this.isConfigured) {
      console.error(
        'Twilio credentials not configured - SMS sending will fail',
      );
      console.log('Required: Account SID, Auth Token, and Phone Number');
    } else {
      this.client = twilio(accountSid, authToken);
    }
  }

  /**
   * Initialize SMS service with user configuration
   */
  static async createWithUserConfig(userId: string): Promise<SMSService> {
    const supabase = await createClient();

    const { data: config, error } = await supabase
      .from('sms_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.warn('No SMS configuration found for user:', userId);
    }

    return new SMSService(config || undefined);
  }

  async sendSMS(data: SMSData): Promise<string> {
    try {
      if (!this.isConfigured) {
        console.warn('SMS service not configured - simulating SMS send');
        console.log('Would send SMS:', {
          to: data.to,
          message: data.message.substring(0, 50) + '...',
          from: this.fromNumber || 'not-configured',
        });
        return `simulated-sms-${Date.now()}`;
      }

      const messageOptions: any = {
        body: data.message,
        to: this.formatPhoneNumber(data.to),
        from: data.from || this.fromNumber,
      };

      if (data.mediaUrl) {
        messageOptions.mediaUrl = [data.mediaUrl];
      }

      const message = await this.client.messages.create(messageOptions);

      console.log('SMS sent successfully:', {
        sid: message.sid,
        to: data.to,
        status: message.status,
      });

      return message.sid;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }

  async sendBulkSMS(messages: SMSData[]): Promise<string[]> {
    const results: string[] = [];

    for (const sms of messages) {
      try {
        const messageSid = await this.sendSMS(sms);
        results.push(messageSid);
      } catch (error) {
        console.error('Failed to send SMS to:', sms.to, error);
        results.push('failed');
      }
    }

    return results;
  }

  async getMessageStatus(messageSid: string): Promise<string> {
    if (!this.isConfigured) {
      return 'simulated-delivered';
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      console.error('Failed to get message status:', error);
      return 'unknown';
    }
  }

  validatePhoneNumber(phone: string): boolean {
    // Basic phone validation - accepts various formats
    const cleaned = phone.replace(/\D/g, '');

    // Check for valid US phone number (10 digits) or international (10-15 digits)
    if (cleaned.length >= 10 && cleaned.length <= 15) {
      return true;
    }

    // Also accept E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  private formatPhoneNumber(phone: string): string {
    // Clean the phone number
    const cleaned = phone.replace(/\D/g, '');

    // If already in E.164 format, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // For US numbers without country code, add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // For numbers with country code
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }

    // Return as is if we can't determine format
    return phone;
  }

  async sendVerificationCode(phone: string, code: string): Promise<string> {
    const message = `Your WedSync verification code is: ${code}. This code will expire in 10 minutes.`;
    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendNotification(phone: string, notification: string): Promise<string> {
    return this.sendSMS({
      to: phone,
      message: notification,
    });
  }

  /**
   * Send SMS using template (extending email template patterns)
   */
  async sendTemplateMessage(config: SMSSendConfig): Promise<{
    messageId: string;
    status: 'sent' | 'failed';
    error?: string;
    metrics?: SMSMetrics;
  }> {
    try {
      const supabase = await createClient();

      // Get template if templateId provided
      let template: SMSTemplate | undefined;
      if (config.templateId) {
        const { data, error } = await supabase
          .from('sms_templates')
          .select('*')
          .eq('id', config.templateId)
          .single();

        if (error) {
          throw new Error(`Template not found: ${config.templateId}`);
        }
        template = data;
      } else if (config.template) {
        template = config.template;
      }

      // Check opt-out status (TCPA compliance)
      const isOptedOut = await this.checkOptOutStatus(config.to);
      if (isOptedOut && !config.bypass_opt_out) {
        throw new Error('Recipient has opted out of SMS messages');
      }

      // Prepare message content
      let content: string;
      if (template) {
        content = await this.interpolateTemplate(
          template.content,
          config.variables || {},
        );

        // Update usage count
        await supabase.rpc('increment_sms_template_usage', {
          template_id: template.id,
          user_id: template.user_id,
        });
      } else if (config.content) {
        content = config.content;
      } else {
        throw new Error('No template or content provided');
      }

      // Calculate metrics
      const metrics = this.calculateSMSMetrics(content);

      // Validate message
      const validation = this.validateSMSMessage(content, template);
      if (!validation.isValid) {
        throw new Error(
          `Message validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // Send message
      const messageOptions: any = {
        body: content,
        to: this.formatPhoneNumber(config.to),
        from: this.fromNumber,
      };

      if (config.scheduled_for) {
        messageOptions.sendAt = config.scheduled_for;
      }

      if (config.webhook_url || this.configuration?.status_callback_url) {
        messageOptions.statusCallback =
          config.webhook_url || this.configuration?.status_callback_url;
      }

      let messageSid: string;
      if (!this.isConfigured) {
        messageSid = `simulated-sms-${Date.now()}`;
        console.log('Would send SMS:', {
          to: config.to,
          content: content.substring(0, 50) + '...',
          metrics,
        });
      } else {
        const message = await this.client.messages.create(messageOptions);
        messageSid = message.sid;
      }

      // Log message to database
      await this.logMessage({
        user_id: template?.user_id || '',
        template_id: template?.id,
        to_phone: config.to,
        from_phone: this.fromNumber,
        content,
        character_count: metrics.character_count,
        segment_count: metrics.segment_count,
        message_sid: messageSid,
        status: 'queued',
        consent_given: config.consent_verified || false,
        tcpa_compliant: template?.tcpa_compliant || false,
        cost_charged: metrics.estimated_cost,
      });

      return {
        messageId: messageSid,
        status: 'sent',
        metrics,
      };
    } catch (error) {
      console.error('Failed to send template SMS:', error);
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate SMS metrics (character count, segments, cost)
   */
  calculateSMSMetrics(content: string): SMSMetrics {
    const characterCount = content.length;
    const hasUnicode = /[^\x00-\x7F]/.test(content);

    let segmentCount = 1;
    let characterLimit = 160;

    if (hasUnicode) {
      // Unicode SMS: 70 chars per segment, 67 for concatenated
      characterLimit = 70;
      if (characterCount <= 70) {
        segmentCount = 1;
      } else {
        segmentCount = Math.ceil(characterCount / 67);
      }
    } else {
      // GSM 7-bit: 160 chars per segment, 153 for concatenated
      characterLimit = 160;
      if (characterCount <= 160) {
        segmentCount = 1;
      } else {
        segmentCount = Math.ceil(characterCount / 153);
      }
    }

    const baseCost = this.configuration?.cost_per_message || 0.0075;
    const estimatedCost = segmentCount * baseCost;

    return {
      character_count: characterCount,
      segment_count: segmentCount,
      has_unicode: hasUnicode,
      encoding: hasUnicode ? 'UCS-2' : 'GSM 7-bit',
      estimated_cost: estimatedCost,
      character_limit: characterLimit,
      characters_remaining: Math.max(
        0,
        characterLimit - (characterCount % characterLimit || characterLimit),
      ),
    };
  }

  /**
   * Validate SMS message content and compliance
   */
  validateSMSMessage(
    content: string,
    template?: SMSTemplate,
  ): SMSValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const complianceIssues: string[] = [];

    const metrics = this.calculateSMSMetrics(content);

    // Check character limits
    if (metrics.character_count > 1600) {
      // 10 segments max
      errors.push(
        'Message exceeds maximum length (1600 characters / 10 segments)',
      );
    }

    // Check for required opt-out language (TCPA compliance)
    const optOutKeywords = ['STOP', 'QUIT', 'UNSUBSCRIBE', 'END', 'CANCEL'];
    const hasOptOut = optOutKeywords.some((keyword) =>
      content.toUpperCase().includes(keyword.toUpperCase()),
    );

    if (template?.opt_out_required && !hasOptOut) {
      complianceIssues.push(
        'Message must include opt-out instructions (e.g., "Reply STOP to opt out")',
      );
    }

    // Check for problematic characters
    const problematicChars = content.match(/[""'']/g);
    if (problematicChars) {
      warnings.push(
        'Message contains smart quotes that may cause encoding issues',
      );
    }

    // Estimate cost warnings
    if (metrics.estimated_cost > 0.05) {
      // More than $0.05
      warnings.push(
        `High cost message: $${metrics.estimated_cost.toFixed(4)} (${metrics.segment_count} segments)`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      compliance_issues: complianceIssues,
      character_count: metrics.character_count,
      segment_count: metrics.segment_count,
      estimated_cost: metrics.estimated_cost,
    };
  }

  /**
   * Check if phone number has opted out
   */
  async checkOptOutStatus(phoneNumber: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sms_opt_outs')
      .select('is_active')
      .eq('phone_number', this.formatPhoneNumber(phoneNumber))
      .eq('is_active', true)
      .single();

    return !error && data?.is_active === true;
  }

  /**
   * Process opt-out request
   */
  async processOptOut(
    phoneNumber: string,
    userId: string,
    method: 'sms' | 'manual' = 'sms',
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('sms_opt_outs').upsert({
      user_id: userId,
      phone_number: this.formatPhoneNumber(phoneNumber),
      opted_out_at: new Date().toISOString(),
      opt_out_method: method,
      is_active: true,
    });
  }

  /**
   * Process opt-in request
   */
  async processOptIn(
    phoneNumber: string,
    userId: string,
    method: 'sms' | 'manual' = 'sms',
  ): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('sms_opt_outs')
      .update({
        opted_in_at: new Date().toISOString(),
        opt_in_method: method,
        is_active: false,
      })
      .eq('user_id', userId)
      .eq('phone_number', this.formatPhoneNumber(phoneNumber));
  }

  /**
   * Interpolate template variables (extending email template patterns)
   */
  private async interpolateTemplate(
    content: string,
    variables: Record<string, any>,
  ): Promise<string> {
    let interpolatedContent = content;

    // Replace variables using {{variable}} syntax (same as email templates)
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      interpolatedContent = interpolatedContent.replace(
        regex,
        String(value || ''),
      );
    });

    // Remove any unmatched placeholders
    interpolatedContent = interpolatedContent.replace(/{{[^}]+}}/g, '');

    return interpolatedContent;
  }

  /**
   * Log SMS message to database
   */
  private async logMessage(messageData: Partial<SMSMessage>): Promise<void> {
    const supabase = await createClient();

    await supabase.from('sms_messages').insert({
      ...messageData,
      sent_at: new Date().toISOString(),
    });
  }

  /**
   * Handle incoming SMS webhook (for opt-out processing)
   */
  async handleWebhook(webhookData: any): Promise<void> {
    const { From, Body, MessageSid } = webhookData;

    if (!From || !Body) return;

    const messageBody = Body.toUpperCase().trim();
    const optOutKeywords = this.configuration?.opt_out_keywords || [
      'STOP',
      'QUIT',
      'UNSUBSCRIBE',
    ];
    const optInKeywords = this.configuration?.opt_in_keywords || [
      'START',
      'YES',
      'UNSTOP',
    ];

    // Check for opt-out
    if (optOutKeywords.some((keyword) => messageBody.includes(keyword))) {
      // Process opt-out - would need user context
      console.log(`Opt-out request from ${From}: ${Body}`);

      // Send confirmation (TCPA requirement)
      await this.sendSMS({
        to: From,
        message:
          'You have been unsubscribed from SMS messages. Reply START to resubscribe.',
        from: this.fromNumber,
      });
    }

    // Check for opt-in
    else if (optInKeywords.some((keyword) => messageBody.includes(keyword))) {
      console.log(`Opt-in request from ${From}: ${Body}`);

      // Send confirmation
      await this.sendSMS({
        to: From,
        message:
          'You have been subscribed to SMS messages. Reply STOP to unsubscribe.',
        from: this.fromNumber,
      });
    }
  }

  /**
   * Update message delivery status
   */
  async updateMessageStatus(
    messageSid: string,
    status: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    const supabase = await createClient();

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    if (errorCode) {
      updateData.error_code = errorCode;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await supabase
      .from('sms_messages')
      .update(updateData)
      .eq('message_sid', messageSid);
  }

  /**
   * Get SMS analytics for user
   */
  async getAnalytics(userId: string, startDate: Date, endDate: Date) {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('user_id', userId)
      .gte('sent_at', startDate.toISOString())
      .lte('sent_at', endDate.toISOString());

    if (error) {
      throw new Error(`Analytics query failed: ${error.message}`);
    }

    const totalMessages = messages?.length || 0;
    const deliveredMessages =
      messages?.filter((m) => m.status === 'delivered').length || 0;
    const totalCost =
      messages?.reduce((sum, m) => sum + (m.cost_charged || 0), 0) || 0;
    const averageSegments =
      messages?.length > 0
        ? messages.reduce((sum, m) => sum + m.segment_count, 0) /
          messages.length
        : 0;

    return {
      period: { start: startDate, end: endDate },
      metrics: {
        messages_sent: totalMessages,
        messages_delivered: deliveredMessages,
        delivery_rate:
          totalMessages > 0 ? deliveredMessages / totalMessages : 0,
        total_cost: totalCost,
        average_segments: averageSegments,
        opt_outs: 0, // Would need separate query
        compliance_violations: 0, // Would need separate query
      },
    };
  }
}
