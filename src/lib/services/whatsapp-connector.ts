import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface WhatsAppMessage {
  to: string;
  message: string;
  templateName?: string;
  templateData?: Record<string, any>;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video';
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'booking' | 'reminder' | 'confirmation' | 'marketing';
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  components: Array<{
    type: 'header' | 'body' | 'footer' | 'button';
    text?: string;
    parameters?: string[];
  }>;
  created_at: string;
  updated_at: string;
}

export class WhatsAppConnector {
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private webhookVerifyToken: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!;
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!;

    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp API credentials not configured');
    }
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResult> {
    try {
      const payload = await this.buildMessagePayload(message);

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'WhatsApp API error');
      }

      const whatsappResult: WhatsAppResult = {
        success: true,
        messageId: result.messages?.[0]?.id,
        cost: this.estimateCost(message.templateName ? 'template' : 'freeform'),
      };

      // Log the message
      await this.logMessage({
        messageId: whatsappResult.messageId!,
        to: message.to,
        content: message.message,
        templateName: message.templateName,
        status: 'sent',
        cost: whatsappResult.cost,
      });

      return whatsappResult;
    } catch (error: any) {
      const failedResult: WhatsAppResult = {
        success: false,
        error: error.message || 'Unknown WhatsApp error',
      };

      // Log the failed attempt
      await this.logMessage({
        messageId: '',
        to: message.to,
        content: message.message,
        templateName: message.templateName,
        status: 'failed',
        error: failedResult.error,
      });

      return failedResult;
    }
  }

  async sendBookingConfirmation(data: {
    clientPhone: string;
    clientName: string;
    plannerName: string;
    meetingType: string;
    date: string;
    time: string;
    location?: string;
    notes?: string;
    bookingId: string;
  }): Promise<WhatsAppResult> {
    const message = this.formatBookingConfirmationMessage(data);

    return await this.sendMessage({
      to: data.clientPhone,
      message,
      templateName: 'booking_confirmation',
      templateData: data,
    });
  }

  async sendBookingReminder(data: {
    clientPhone: string;
    clientName: string;
    meetingType: string;
    date: string;
    time: string;
    location?: string;
    hoursUntil: number;
    bookingId: string;
  }): Promise<WhatsAppResult> {
    const message = this.formatReminderMessage(data);

    return await this.sendMessage({
      to: data.clientPhone,
      message,
      templateName: 'booking_reminder',
      templateData: data,
    });
  }

  async sendReschedulingConfirmation(data: {
    clientPhone: string;
    clientName: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    meetingType: string;
    bookingId: string;
  }): Promise<WhatsAppResult> {
    const message = this.formatReschedulingMessage(data);

    return await this.sendMessage({
      to: data.clientPhone,
      message,
      templateName: 'booking_rescheduled',
      templateData: data,
    });
  }

  async sendCancellationConfirmation(data: {
    clientPhone: string;
    clientName: string;
    meetingType: string;
    date: string;
    time: string;
    reason?: string;
    bookingId: string;
  }): Promise<WhatsAppResult> {
    const message = this.formatCancellationMessage(data);

    return await this.sendMessage({
      to: data.clientPhone,
      message,
      templateName: 'booking_cancelled',
      templateData: data,
    });
  }

  async handleWebhook(
    body: any,
    signature: string,
  ): Promise<{ success: boolean; response?: string }> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(body, signature)) {
        throw new Error('Invalid webhook signature');
      }

      // Handle verification challenge
      if (body.hub && body.hub.challenge) {
        if (body.hub.verify_token === this.webhookVerifyToken) {
          return { success: true, response: body.hub.challenge };
        } else {
          throw new Error('Invalid verify token');
        }
      }

      // Process webhook events
      if (body.object === 'whatsapp_business_account') {
        await this.processWebhookEvents(body.entry || []);
        return { success: true };
      }

      return { success: false };
    } catch (error: any) {
      console.error('WhatsApp webhook error:', error);
      return { success: false };
    }
  }

  private async buildMessagePayload(message: WhatsAppMessage): Promise<any> {
    const basePayload = {
      messaging_product: 'whatsapp',
      to: this.normalizePhoneNumber(message.to),
    };

    if (message.templateName) {
      // Template message
      return {
        ...basePayload,
        type: 'template',
        template: {
          name: message.templateName,
          language: { code: 'en_US' },
          components: this.buildTemplateComponents(message.templateData || {}),
        },
      };
    } else if (message.mediaUrl) {
      // Media message
      return {
        ...basePayload,
        type: message.mediaType || 'image',
        [message.mediaType || 'image']: {
          link: message.mediaUrl,
          caption: message.message,
        },
      };
    } else {
      // Text message
      return {
        ...basePayload,
        type: 'text',
        text: {
          body: message.message,
        },
      };
    }
  }

  private buildTemplateComponents(data: Record<string, any>): any[] {
    // Build template components based on the data
    // This would be customized based on your approved templates
    return [
      {
        type: 'body',
        parameters: Object.values(data).map((value) => ({
          type: 'text',
          text: String(value),
        })),
      },
    ];
  }

  private formatBookingConfirmationMessage(data: any): string {
    let message = `🎉 *Meeting Confirmed!*\n\n`;
    message += `Hi ${data.clientName}! Your ${data.meetingType.toLowerCase()} is confirmed with ${data.plannerName}.\n\n`;
    message += `📅 *Date:* ${data.date}\n`;
    message += `⏰ *Time:* ${data.time}\n`;

    if (data.location) {
      message += `📍 *Location:* ${data.location}\n`;
    }

    if (data.notes) {
      message += `📝 *Notes:* ${data.notes}\n`;
    }

    message += `\n💍 We're excited to help make your wedding perfect!\n\n`;
    message += `*Booking ID:* ${data.bookingId}\n\n`;
    message += `Need to make changes? Reply to this message or call us directly.`;

    return message;
  }

  private formatReminderMessage(data: any): string {
    const timeText =
      data.hoursUntil === 24
        ? 'tomorrow'
        : data.hoursUntil === 1
          ? 'in 1 hour'
          : `in ${data.hoursUntil} hours`;

    let message = `⏰ *Meeting Reminder*\n\n`;
    message += `Hi ${data.clientName}! Don't forget about your ${data.meetingType.toLowerCase()} ${timeText}.\n\n`;
    message += `📅 *Date:* ${data.date}\n`;
    message += `⏰ *Time:* ${data.time}\n`;

    if (data.location) {
      message += `📍 *Location:* ${data.location}\n`;
    }

    message += `\n💍 Looking forward to seeing you!\n\n`;
    message += `*Booking ID:* ${data.bookingId}\n\n`;
    message += `Need to make changes? Reply RESCHEDULE or CANCEL`;

    return message;
  }

  private formatReschedulingMessage(data: any): string {
    let message = `📅 *Meeting Rescheduled*\n\n`;
    message += `Hi ${data.clientName}! Your ${data.meetingType.toLowerCase()} has been rescheduled.\n\n`;
    message += `❌ *Previous:* ${data.oldDate} at ${data.oldTime}\n`;
    message += `✅ *New:* ${data.newDate} at ${data.newTime}\n\n`;
    message += `💍 Thank you for letting us know!\n\n`;
    message += `*Booking ID:* ${data.bookingId}`;

    return message;
  }

  private formatCancellationMessage(data: any): string {
    let message = `❌ *Meeting Cancelled*\n\n`;
    message += `Hi ${data.clientName}! Your ${data.meetingType.toLowerCase()} scheduled for ${data.date} at ${data.time} has been cancelled.\n\n`;

    if (data.reason) {
      message += `*Reason:* ${data.reason}\n\n`;
    }

    message += `💍 We understand plans can change. Please reach out when you're ready to reschedule!\n\n`;
    message += `*Booking ID:* ${data.bookingId}`;

    return message;
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let normalized = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assume US +1)
    if (normalized.length === 10) {
      normalized = '1' + normalized;
    }

    return normalized;
  }

  private estimateCost(messageType: 'template' | 'freeform'): number {
    // WhatsApp Business API pricing (varies by region)
    // Template messages: ~$0.005 - $0.009
    // Freeform messages: ~$0.015 - $0.025
    return messageType === 'template' ? 0.007 : 0.02;
  }

  private async logMessage(logData: {
    messageId: string;
    to: string;
    content: string;
    templateName?: string;
    status: 'sent' | 'delivered' | 'failed' | 'read';
    cost?: number;
    error?: string;
  }): Promise<void> {
    try {
      await supabase.from('whatsapp_messages').insert({
        message_id: logData.messageId,
        to_phone: logData.to,
        message_content: logData.content,
        template_name: logData.templateName,
        status: logData.status,
        cost: logData.cost,
        error_message: logData.error,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log WhatsApp message:', error);
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // Implement WhatsApp webhook signature verification
    // This is crucial for security
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET!)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  private async processWebhookEvents(entries: any[]): Promise<void> {
    for (const entry of entries) {
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await this.processMessageEvents(change.value);
          }
        }
      }
    }
  }

  private async processMessageEvents(value: any): Promise<void> {
    // Process incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        await this.handleIncomingMessage(message, value.contacts?.[0]);
      }
    }

    // Process message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        await this.handleMessageStatusUpdate(status);
      }
    }
  }

  private async handleIncomingMessage(
    message: any,
    contact: any,
  ): Promise<void> {
    try {
      const phoneNumber = message.from;
      const messageText = message.text?.body || '';
      const messageType = message.type;

      // Log incoming message
      await supabase.from('whatsapp_messages').insert({
        message_id: message.id,
        to_phone: this.phoneNumberId, // Our number
        from_phone: phoneNumber,
        message_content: messageText,
        message_type: messageType,
        status: 'received',
        received_at: new Date().toISOString(),
      });

      // Process keywords and auto-responses
      const response = await this.processIncomingKeywords(
        phoneNumber,
        messageText,
      );
      if (response) {
        await this.sendMessage({
          to: phoneNumber,
          message: response,
        });
      }

      // Link to client and create activity
      await this.linkToClient(phoneNumber, messageText);
    } catch (error) {
      console.error('Error processing incoming WhatsApp message:', error);
    }
  }

  private async handleMessageStatusUpdate(status: any): Promise<void> {
    try {
      const messageId = status.id;
      const statusType = status.status; // sent, delivered, read, failed
      const timestamp = status.timestamp;

      await supabase
        .from('whatsapp_messages')
        .update({
          status: statusType,
          delivered_at:
            statusType === 'delivered'
              ? new Date(timestamp * 1000).toISOString()
              : undefined,
          read_at:
            statusType === 'read'
              ? new Date(timestamp * 1000).toISOString()
              : undefined,
          failed_at:
            statusType === 'failed'
              ? new Date(timestamp * 1000).toISOString()
              : undefined,
        })
        .eq('message_id', messageId);
    } catch (error) {
      console.error('Error updating WhatsApp message status:', error);
    }
  }

  private async processIncomingKeywords(
    phoneNumber: string,
    message: string,
  ): Promise<string | null> {
    const upperMessage = message.toUpperCase().trim();

    const keywords: Record<string, string> = {
      RESCHEDULE:
        "I'll help you reschedule your meeting. Please call us at (555) 123-4567 or visit our booking page to select a new time.",
      CANCEL:
        'I understand you need to cancel. Your meeting has been cancelled. If you need to reschedule later, just let us know!',
      HELP: 'For assistance, please contact us directly at (555) 123-4567 or email support@wedsync.com',
      STATUS: 'Let me check your upcoming meetings...',
      CONFIRM: 'Thank you for confirming! We look forward to seeing you.',
      YES: 'Great! Thank you for confirming.',
      NO: 'Thank you for letting us know. Please reach out if you need to make changes.',
    };

    for (const [keyword, response] of Object.entries(keywords)) {
      if (upperMessage.includes(keyword)) {
        // Handle specific keywords
        if (keyword === 'CANCEL') {
          await this.handleCancellationRequest(phoneNumber);
        } else if (keyword === 'RESCHEDULE') {
          await this.handleRescheduleRequest(phoneNumber);
        }

        return response;
      }
    }

    return null;
  }

  private async handleCancellationRequest(phoneNumber: string): Promise<void> {
    // Find active bookings for this phone number and mark them as requiring attention
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, meeting_type, scheduled_for')
      .eq('client_phone', phoneNumber)
      .eq('status', 'confirmed')
      .gte('scheduled_for', new Date().toISOString());

    if (bookings?.length) {
      await supabase.from('booking_requests').insert({
        booking_id: bookings[0].id,
        request_type: 'cancellation',
        requested_via: 'whatsapp',
        request_details: {
          message: 'Client requested cancellation via WhatsApp',
        },
        status: 'pending',
      });
    }
  }

  private async handleRescheduleRequest(phoneNumber: string): Promise<void> {
    // Find active bookings for this phone number and mark them as requiring attention
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, meeting_type, scheduled_for')
      .eq('client_phone', phoneNumber)
      .eq('status', 'confirmed')
      .gte('scheduled_for', new Date().toISOString());

    if (bookings?.length) {
      await supabase.from('booking_requests').insert({
        booking_id: bookings[0].id,
        request_type: 'reschedule',
        requested_via: 'whatsapp',
        request_details: {
          message: 'Client requested reschedule via WhatsApp',
        },
        status: 'pending',
      });
    }
  }

  private async linkToClient(
    phoneNumber: string,
    message: string,
  ): Promise<void> {
    // Find client by phone number
    const { data: client } = await supabase
      .from('clients')
      .select('id, wedding_planner_id')
      .eq('phone', phoneNumber)
      .single();

    if (client) {
      // Record as client activity
      await supabase.from('client_activities').insert({
        client_id: client.id,
        wedding_planner_id: client.wedding_planner_id,
        activity_type: 'whatsapp_message',
        activity_data: { message, phone: phoneNumber },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getMessageStatus(
    messageId: string,
  ): Promise<{ status: string; delivered_at?: string; read_at?: string }> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('status, delivered_at, read_at')
        .eq('message_id', messageId)
        .single();

      if (error) {
        throw new Error('Message not found');
      }

      return {
        status: data.status,
        delivered_at: data.delivered_at,
        read_at: data.read_at,
      };
    } catch (error) {
      return { status: 'unknown' };
    }
  }

  async getAvailableTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch templates');
      }

      return (
        result.data?.map((template: any) => ({
          id: template.id,
          name: template.name,
          category: template.category,
          language: template.language,
          status: template.status,
          components: template.components,
          created_at: template.created_at,
          updated_at: template.updated_at,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching WhatsApp templates:', error);
      return [];
    }
  }
}

export const whatsappConnector = new WhatsAppConnector();
