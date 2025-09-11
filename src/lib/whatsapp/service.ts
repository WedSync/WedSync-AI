import { createClient } from '@supabase/supabase-js';

// WhatsApp Business API Configuration
interface WhatsAppConfig {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  apiVersion: string;
}

// Message Template Types
interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  components: TemplateComponent[];
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    payload?: string;
  }[];
}

// Message Types
interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template' | 'text' | 'image' | 'document' | 'location';
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  text?: { body: string };
  image?: { link: string; caption?: string };
  document?: { link: string; filename: string; caption?: string };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

// Webhook Types
interface WebhookMessage {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: {
    profile: { name: string };
    wa_id: string;
  }[];
  messages?: {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: { id: string; mime_type: string; caption?: string };
    document?: {
      id: string;
      filename: string;
      mime_type: string;
      caption?: string;
    };
    button?: { payload: string; text: string };
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
  }[];
  statuses?: {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
    errors?: {
      code: number;
      title: string;
      message: string;
    }[];
  }[];
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl: string;
  private supabase: ReturnType<typeof createClient>;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.baseUrl = `https://graph.facebook.com/${config.apiVersion}`;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  // Send Template Message
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: any[],
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components || [],
        },
      };

      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send message');
      }

      // Store message in database
      await this.supabase.from('whatsapp_messages').insert({
        message_id: data.messages[0].id,
        phone_number: to,
        template_name: templateName,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: metadata || {},
      });

      return { success: true, messageId: data.messages[0].id };
    } catch (error) {
      console.error('WhatsApp send message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send Text Message (for customer service conversations)
  async sendTextMessage(
    to: string,
    text: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      };

      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send message');
      }

      // Store message in database
      await this.supabase.from('whatsapp_messages').insert({
        message_id: data.messages[0].id,
        phone_number: to,
        message_type: 'text',
        content: text,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: metadata || {},
      });

      return { success: true, messageId: data.messages[0].id };
    } catch (error) {
      console.error('WhatsApp send text message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send Media Message (images, documents)
  async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'document',
    mediaUrl: string,
    caption?: string,
    filename?: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mediaObject: any = { link: mediaUrl };

      if (caption) mediaObject.caption = caption;
      if (filename && mediaType === 'document') mediaObject.filename = filename;

      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to,
        type: mediaType,
        [mediaType]: mediaObject,
      };

      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send media message');
      }

      // Store message in database
      await this.supabase.from('whatsapp_messages').insert({
        message_id: data.messages[0].id,
        phone_number: to,
        message_type: mediaType,
        media_url: mediaUrl,
        content: caption || '',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: metadata || {},
      });

      return { success: true, messageId: data.messages[0].id };
    } catch (error) {
      console.error('WhatsApp send media message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get Message Templates
  async getMessageTemplates(): Promise<{
    success: boolean;
    templates?: MessageTemplate[];
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.businessAccountId}/message_templates?fields=name,status,id,language,category,components`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch templates');
      }

      return { success: true, templates: data.data };
    } catch (error) {
      console.error('WhatsApp get templates error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Process Incoming Webhook
  async processWebhook(
    webhookData: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const entry = webhookData.entry?.[0];
      if (!entry) return { success: false, error: 'Invalid webhook data' };

      const changes = entry.changes?.[0];
      if (!changes) return { success: false, error: 'No changes in webhook' };

      const value = changes.value as WebhookMessage;

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await this.handleIncomingMessage(message, value.metadata);
        }
      }

      // Handle message status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.handleStatusUpdate(status);
        }
      }

      // Handle template status updates
      if (changes.field === 'message_template_status_update') {
        await this.handleTemplateStatusUpdate(value as any);
      }

      return { success: true };
    } catch (error) {
      console.error('WhatsApp webhook processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Handle incoming message
  private async handleIncomingMessage(
    message: any,
    metadata: any,
  ): Promise<void> {
    try {
      // Store incoming message
      await this.supabase.from('whatsapp_messages').insert({
        message_id: message.id,
        phone_number: message.from,
        message_type: message.type,
        content: this.extractMessageContent(message),
        direction: 'incoming',
        received_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        metadata: { ...message, phone_number_id: metadata.phone_number_id },
      });

      // Trigger any automated responses or business logic
      await this.triggerAutomatedResponse(message);
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  // Handle status updates
  private async handleStatusUpdate(status: any): Promise<void> {
    try {
      await this.supabase
        .from('whatsapp_messages')
        .update({
          status: status.status,
          updated_at: new Date().toISOString(),
        })
        .eq('message_id', status.id);
    } catch (error) {
      console.error('Error handling status update:', error);
    }
  }

  // Handle template status updates
  private async handleTemplateStatusUpdate(update: any): Promise<void> {
    try {
      await this.supabase.from('whatsapp_templates').upsert({
        template_id: update.message_template_id,
        name: update.message_template_name,
        language: update.message_template_language,
        status: update.event,
        reason: update.reason,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling template status update:', error);
    }
  }

  // Extract message content based on type
  private extractMessageContent(message: any): string {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';
      case 'image':
        return message.image?.caption || '[Image]';
      case 'document':
        return (
          message.document?.caption ||
          `[Document: ${message.document?.filename || 'Unknown'}]`
        );
      case 'location':
        return `[Location: ${message.location?.name || 'Unknown'}]`;
      case 'button':
        return message.button?.text || '[Button Response]';
      default:
        return `[${message.type}]`;
    }
  }

  // Trigger automated responses
  private async triggerAutomatedResponse(message: any): Promise<void> {
    // This is where you'd implement business logic for automated responses
    // For now, just log that we received a message
    console.log(`Received ${message.type} message from ${message.from}`);

    // Could integrate with journey automation or other business logic here
  }

  // Verify webhook signature
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    verifyToken: string,
  ): boolean {
    const expectedSignature = `sha256=${Buffer.from(payload + verifyToken, 'utf8').toString('hex')}`;
    return signature === expectedSignature;
  }

  // Get media download URL
  async getMediaUrl(
    mediaId: string,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get media URL');
      }

      return { success: true, url: data.url };
    } catch (error) {
      console.error('WhatsApp get media URL error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Factory function to create WhatsApp service instance
export function createWhatsAppService(): WhatsAppService {
  const config: WhatsAppConfig = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  };

  return new WhatsAppService(config);
}

// Export types for use in other parts of the application
export type {
  WhatsAppConfig,
  MessageTemplate,
  TemplateComponent,
  WhatsAppMessage,
  WebhookMessage,
};
