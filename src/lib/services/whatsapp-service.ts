import { createClient } from '@/lib/supabase/server';
import type {
  WhatsAppTemplate,
  WhatsAppConfiguration,
  WhatsAppMessage,
  WhatsAppSendConfig,
  WhatsAppMetrics,
  WhatsAppValidationResult,
  WhatsAppComplianceCheck,
  WhatsAppMedia,
} from '@/types/whatsapp';

interface WhatsAppData {
  to: string;
  message?: string;
  template?: {
    name: string;
    language: string;
    components?: any[];
  };
  media?: WhatsAppMedia;
  replyTo?: string;
}

interface WhatsAppAPIResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

export class WhatsAppService {
  private apiUrl: string;
  private phoneNumberId: string;
  private accessToken: string;
  private isConfigured: boolean;
  private configuration?: WhatsAppConfiguration;
  private webhookVerifyToken: string;

  constructor(configuration?: WhatsAppConfiguration) {
    this.configuration = configuration;

    // Use configuration or environment variables
    this.phoneNumberId =
      configuration?.phone_number_id ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      '';
    this.accessToken =
      configuration?.access_token_encrypted ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      '';
    this.webhookVerifyToken =
      configuration?.webhook_verify_token ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
      '';

    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
    this.isConfigured = !!(this.phoneNumberId && this.accessToken);

    if (!this.isConfigured) {
      console.error(
        'WhatsApp Business API not configured - messaging will fail',
      );
      console.log('Required: Phone Number ID, Access Token');
    }
  }

  /**
   * Initialize WhatsApp service with user configuration
   */
  static async createWithUserConfig(userId: string): Promise<WhatsAppService> {
    const supabase = await createClient();

    const { data: config, error } = await supabase
      .from('whatsapp_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.warn('No WhatsApp configuration found for user:', userId);
    }

    return new WhatsAppService(config || undefined);
  }

  /**
   * Send WhatsApp message (text or template)
   */
  async sendMessage(data: WhatsAppData): Promise<string> {
    try {
      if (!this.isConfigured) {
        console.warn(
          'WhatsApp service not configured - simulating message send',
        );
        console.log('Would send WhatsApp message:', {
          to: data.to,
          message: data.message?.substring(0, 50) + '...' || 'template message',
        });
        return `simulated-whatsapp-${Date.now()}`;
      }

      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(data.to),
      };

      // Handle different message types
      if (data.template) {
        // Template message
        payload.type = 'template';
        payload.template = data.template;
      } else if (data.media) {
        // Media message
        payload.type = data.media.type; // image, video, document, audio
        payload[data.media.type] = {
          link: data.media.url,
          caption: data.message,
        };
      } else if (data.message) {
        // Text message
        payload.type = 'text';
        payload.text = {
          preview_url: true,
          body: data.message,
        };
      }

      // Add context for replies
      if (data.replyTo) {
        payload.context = {
          message_id: data.replyTo,
        };
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result: WhatsAppAPIResponse = await response.json();

      if (result.error) {
        throw new Error(`WhatsApp API error: ${result.error.message}`);
      }

      const messageId = result.messages?.[0]?.id || '';

      console.log('WhatsApp message sent successfully:', {
        messageId,
        to: data.to,
        status: result.messages?.[0]?.message_status,
      });

      return messageId;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send template message with merge fields (extending patterns from Email/SMS)
   */
  async sendTemplateMessage(config: WhatsAppSendConfig): Promise<{
    messageId: string;
    status: 'sent' | 'failed';
    error?: string;
    metrics?: WhatsAppMetrics;
  }> {
    try {
      const supabase = await createClient();

      // Get template if templateId provided
      let template: WhatsAppTemplate | undefined;
      if (config.templateId) {
        const { data, error } = await supabase
          .from('whatsapp_templates')
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

      if (!template) {
        throw new Error('No template provided');
      }

      // Check 24-hour messaging window
      const isWithinWindow = await this.checkMessagingWindow(config.to);
      if (!isWithinWindow && !template.is_approved_template) {
        throw new Error(
          'Outside 24-hour messaging window. Use approved template.',
        );
      }

      // Prepare template components with variables
      const components = await this.prepareTemplateComponents(
        template,
        config.variables || {},
      );

      // Calculate metrics
      const metrics = this.calculateWhatsAppMetrics(template, config.media);

      // Validate message
      const validation = this.validateWhatsAppMessage(template, config);
      if (!validation.isValid) {
        throw new Error(
          `Message validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // Send message
      const messageId = await this.sendMessage({
        to: config.to,
        template: {
          name: template.template_name,
          language: template.language_code || 'en',
          components,
        },
        media: config.media,
      });

      // Log message to database
      await this.logMessage({
        user_id: template.user_id,
        template_id: template.id,
        to_phone: config.to,
        from_phone: this.phoneNumberId,
        message_type: template.is_approved_template ? 'template' : 'session',
        template_name: template.template_name,
        language: template.language_code,
        media_type: config.media?.type,
        media_url: config.media?.url,
        message_id: messageId,
        status: 'sent',
        within_session_window: isWithinWindow,
        cost_charged: metrics.estimated_cost,
      });

      // Update template usage
      await supabase.rpc('increment_whatsapp_template_usage', {
        template_id: template.id,
        user_id: template.user_id,
      });

      return {
        messageId,
        status: 'sent',
        metrics,
      };
    } catch (error) {
      console.error('Failed to send WhatsApp template message:', error);
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkMessages(messages: WhatsAppData[]): Promise<string[]> {
    const results: string[] = [];

    for (const msg of messages) {
      try {
        // Add delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
        const messageId = await this.sendMessage(msg);
        results.push(messageId);
      } catch (error) {
        console.error('Failed to send WhatsApp message to:', msg.to, error);
        results.push('failed');
      }
    }

    return results;
  }

  /**
   * Upload media to WhatsApp
   */
  async uploadMedia(file: {
    buffer: Buffer;
    mimetype: string;
    filename: string;
  }): Promise<string> {
    if (!this.isConfigured) {
      return `simulated-media-${Date.now()}`;
    }

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append(
      'file',
      new Blob([file.buffer], { type: file.mimetype }),
      file.filename,
    );

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: formData,
      },
    );

    const result = await response.json();

    if (result.error) {
      throw new Error(`Media upload failed: ${result.error.message}`);
    }

    return result.id;
  }

  /**
   * Check if recipient is within 24-hour messaging window
   */
  async checkMessagingWindow(phoneNumber: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('last_inbound_at')
      .eq('phone_number', this.formatPhoneNumber(phoneNumber))
      .single();

    if (error || !data) {
      return false;
    }

    const lastInbound = new Date(data.last_inbound_at);
    const now = new Date();
    const hoursSinceLastInbound =
      (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastInbound < 24;
  }

  /**
   * Handle incoming WhatsApp webhook
   */
  async handleWebhook(body: any, signature?: string): Promise<void> {
    try {
      // Verify webhook signature if provided
      if (signature && !this.verifyWebhookSignature(body, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        // Handle incoming messages
        for (const message of value.messages) {
          await this.handleIncomingMessage(message, value.metadata);
        }
      }

      if (value?.statuses) {
        // Handle status updates
        for (const status of value.statuses) {
          await this.handleStatusUpdate(status);
        }
      }
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Verify webhook challenge (for initial setup)
   */
  verifyWebhookChallenge(query: any): string | null {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      console.log('WhatsApp webhook verified');
      return challenge;
    }

    return null;
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(
    message: any,
    metadata: any,
  ): Promise<void> {
    const supabase = await createClient();

    // Update session window
    await supabase.from('whatsapp_sessions').upsert({
      phone_number: message.from,
      last_inbound_at: new Date().toISOString(),
      display_name: message.profile?.name,
      updated_at: new Date().toISOString(),
    });

    // Log incoming message
    await supabase.from('whatsapp_messages').insert({
      message_id: message.id,
      from_phone: message.from,
      to_phone: metadata.phone_number_id,
      message_type: message.type,
      text_body: message.text?.body,
      media_id: message[message.type]?.id,
      media_url: message[message.type]?.url,
      media_caption: message[message.type]?.caption,
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
      status: 'received',
      is_inbound: true,
    });

    console.log(
      `Received WhatsApp message from ${message.from}: ${message.text?.body || message.type}`,
    );
  }

  /**
   * Handle status update
   */
  private async handleStatusUpdate(status: any): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('whatsapp_messages')
      .update({
        status: status.status,
        delivered_at:
          status.status === 'delivered'
            ? new Date(parseInt(status.timestamp) * 1000).toISOString()
            : undefined,
        read_at:
          status.status === 'read'
            ? new Date(parseInt(status.timestamp) * 1000).toISOString()
            : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('message_id', status.id);

    console.log(`WhatsApp message ${status.id} status: ${status.status}`);
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(body: any, signature: string): boolean {
    // Implementation depends on Meta's webhook signature verification
    // This is a placeholder - actual implementation would use crypto
    return true;
  }

  /**
   * Format phone number to WhatsApp format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // If already has country code, return as is
    if (cleaned.length > 10) {
      return cleaned;
    }

    // For US numbers without country code, add 1
    if (cleaned.length === 10) {
      return `1${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Prepare template components with variables
   */
  private async prepareTemplateComponents(
    template: WhatsAppTemplate,
    variables: Record<string, any>,
  ): Promise<any[]> {
    const components: any[] = [];

    // Header component with variables
    if (template.header_variables?.length > 0) {
      components.push({
        type: 'header',
        parameters: template.header_variables.map((varName) => ({
          type: 'text',
          text: String(variables[varName] || ''),
        })),
      });
    }

    // Body component with variables
    if (template.body_variables?.length > 0) {
      components.push({
        type: 'body',
        parameters: template.body_variables.map((varName) => ({
          type: 'text',
          text: String(variables[varName] || ''),
        })),
      });
    }

    return components;
  }

  /**
   * Calculate WhatsApp message metrics
   */
  calculateWhatsAppMetrics(
    template: WhatsAppTemplate,
    media?: WhatsAppMedia,
  ): WhatsAppMetrics {
    const baseCost = this.configuration?.cost_per_message || 0.005;
    let messageType: 'template' | 'session' | 'media' = 'session';
    let estimatedCost = baseCost;

    if (template.is_approved_template) {
      messageType = 'template';
      estimatedCost = baseCost * 1.5; // Templates typically cost more
    }

    if (media) {
      messageType = 'media';
      estimatedCost = baseCost * 2; // Media messages cost more
    }

    return {
      message_type: messageType,
      template_status: template.approval_status,
      estimated_cost: estimatedCost,
      media_included: !!media,
      requires_approval: !template.is_approved_template,
      within_session_window: false, // Will be updated when checking
    };
  }

  /**
   * Validate WhatsApp message
   */
  validateWhatsAppMessage(
    template: WhatsAppTemplate,
    config: WhatsAppSendConfig,
  ): WhatsAppValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const complianceIssues: string[] = [];

    // Check template approval status
    if (
      !template.is_approved_template &&
      template.approval_status === 'REJECTED'
    ) {
      errors.push('Template has been rejected by WhatsApp');
    }

    // Check required variables
    const allVariables = [
      ...(template.header_variables || []),
      ...(template.body_variables || []),
    ];
    const missingVariables = allVariables.filter(
      (v) => !(v in (config.variables || {})),
    );

    if (missingVariables.length > 0) {
      errors.push(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Check media requirements
    if (config.media) {
      const maxSizeMB = 16; // WhatsApp media size limit
      if (config.media.size && config.media.size > maxSizeMB * 1024 * 1024) {
        errors.push(`Media file exceeds ${maxSizeMB}MB limit`);
      }

      const supportedTypes = [
        'image/jpeg',
        'image/png',
        'video/mp4',
        'audio/mpeg',
        'application/pdf',
      ];
      if (
        config.media.mimetype &&
        !supportedTypes.includes(config.media.mimetype)
      ) {
        warnings.push('Media type may not be supported');
      }
    }

    // Compliance checks
    if (!template.is_approved_template) {
      complianceIssues.push(
        'Using unapproved template - ensure 24-hour window compliance',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      compliance_issues: complianceIssues,
      template_status: template.approval_status,
      requires_approval: !template.is_approved_template,
    };
  }

  /**
   * Log WhatsApp message to database
   */
  private async logMessage(
    messageData: Partial<WhatsAppMessage>,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('whatsapp_messages').insert({
      ...messageData,
      sent_at: new Date().toISOString(),
      is_inbound: false,
    });
  }

  /**
   * Get WhatsApp analytics
   */
  async getAnalytics(userId: string, startDate: Date, endDate: Date) {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from('whatsapp_messages')
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
    const readMessages =
      messages?.filter((m) => m.status === 'read').length || 0;
    const templateMessages =
      messages?.filter((m) => m.message_type === 'template').length || 0;
    const mediaMessages = messages?.filter((m) => m.media_type).length || 0;
    const totalCost =
      messages?.reduce((sum, m) => sum + (m.cost_charged || 0), 0) || 0;

    return {
      period: { start: startDate, end: endDate },
      metrics: {
        messages_sent: totalMessages,
        messages_delivered: deliveredMessages,
        messages_read: readMessages,
        delivery_rate:
          totalMessages > 0 ? deliveredMessages / totalMessages : 0,
        read_rate: deliveredMessages > 0 ? readMessages / deliveredMessages : 0,
        template_messages: templateMessages,
        media_messages: mediaMessages,
        total_cost: totalCost,
        average_cost_per_message:
          totalMessages > 0 ? totalCost / totalMessages : 0,
      },
    };
  }
}
