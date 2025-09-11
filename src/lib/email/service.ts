import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import {
  MessageNotificationEmail,
  FormSubmissionEmail,
  BookingUpdateEmail,
  PaymentNotificationEmail,
  WelcomeEmail,
} from './templates';

type EmailNotificationInsert =
  Database['public']['Tables']['email_notifications']['Insert'];

interface EmailUpdateData {
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  provider_response?: Record<string, unknown>;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  provider_id?: string;
}

interface ProviderResponse {
  id?: string;
  message?: string;
  [key: string]: unknown;
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  template: React.ReactElement;
  organizationId: string;
  recipientId?: string;
  recipientType?: 'client' | 'vendor' | 'admin';
  templateType: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  variables?: Record<string, any>;
}

interface MessageNotificationData {
  recipientEmail: string;
  recipientName: string;
  recipientId: string;
  recipientType: 'client' | 'vendor';
  senderName: string;
  messageContent: string;
  conversationId: string;
  organizationId: string;
  organizationName?: string;
}

interface FormSubmissionData {
  recipientEmail: string;
  recipientName: string;
  formName: string;
  submissionId: string;
  clientName: string;
  clientId: string;
  weddingDate?: string;
  organizationId: string;
  organizationName?: string;
}

interface BookingUpdateData {
  recipientEmail: string;
  recipientName: string;
  updateType: 'created' | 'updated' | 'cancelled';
  bookingDetails: string;
  bookingId: string;
  clientName: string;
  clientId: string;
  organizationId: string;
  organizationName?: string;
}

interface PaymentNotificationData {
  recipientEmail: string;
  recipientName: string;
  paymentType: 'received' | 'failed' | 'reminder';
  amount: string;
  currency: string;
  clientName: string;
  clientId: string;
  invoiceId?: string;
  dueDate?: string;
  organizationId: string;
  organizationName?: string;
}

export class EmailService {
  private static async recordNotification(data: EmailNotificationInsert) {
    const supabase = await createClient();

    const { data: notification, error } = await supabase
      .from('email_notifications')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error recording email notification:', error);
      throw error;
    }

    return notification;
  }

  private static async updateNotificationStatus(
    notificationId: string,
    status: 'sent' | 'delivered' | 'failed' | 'bounced',
    providerId?: string,
    providerResponse?: ProviderResponse,
    errorMessage?: string,
  ) {
    const supabase = await createClient();

    const updateData: EmailUpdateData = {
      status,
      provider_response: providerResponse,
    };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
      updateData.provider_id = providerId;
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'failed' || status === 'bounced') {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('email_notifications')
      .update(updateData)
      .eq('id', notificationId);

    if (error) {
      console.error('Error updating notification status:', error);
    }
  }

  private static async sendEmail(options: SendEmailOptions) {
    const {
      to,
      subject,
      template,
      organizationId,
      recipientId,
      recipientType,
      templateType,
      priority = 'normal',
      scheduledFor,
      variables,
    } = options;

    // Render template to HTML
    const html = render(template);
    const text = render(template, { plainText: true });

    // Record notification in database
    const notificationData: EmailNotificationInsert = {
      organization_id: organizationId,
      recipient_email: to,
      recipient_name: variables?.recipientName || null,
      recipient_id: recipientId || null,
      recipient_type: recipientType || 'client',
      template_type: templateType,
      subject,
      html_content: html,
      text_content: text,
      variables: variables || null,
      status: scheduledFor ? 'pending' : 'pending',
      provider: 'resend',
      priority,
      scheduled_for: scheduledFor?.toISOString() || null,
      retry_count: 0,
    };

    const notification = await this.recordNotification(notificationData);

    // If scheduled for later, don't send immediately
    if (scheduledFor && scheduledFor > new Date()) {
      return { success: true, notification, status: 'scheduled' };
    }

    try {
      // Send email via Resend
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'WedSync <noreply@wedsync.com>',
        to: [to],
        subject,
        html,
        text,
      });

      if (error) {
        await this.updateNotificationStatus(
          notification.id,
          'failed',
          undefined,
          error,
          error.message,
        );
        throw error;
      }

      // Update notification status
      await this.updateNotificationStatus(
        notification.id,
        'sent',
        data?.id,
        data,
      );

      return { success: true, notification, data };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  static async sendMessageNotification(data: MessageNotificationData) {
    const conversationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messages?conversation=${data.conversationId}`;

    const template = MessageNotificationEmail({
      recipientName: data.recipientName,
      senderName: data.senderName,
      messageContent: data.messageContent,
      conversationUrl,
      senderType: data.recipientType === 'client' ? 'vendor' : 'client',
      organizationName: data.organizationName,
    });

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `New message from ${data.senderName}`,
      template,
      organizationId: data.organizationId,
      recipientId: data.recipientId,
      recipientType: data.recipientType,
      templateType: 'message_notification',
      priority: 'normal',
      variables: data,
    });
  }

  static async sendFormSubmissionNotification(data: FormSubmissionData) {
    const submissionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/forms/submissions/${data.submissionId}`;

    const template = FormSubmissionEmail({
      recipientName: data.recipientName,
      formName: data.formName,
      submissionUrl,
      clientName: data.clientName,
      weddingDate: data.weddingDate,
      organizationName: data.organizationName,
    });

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `New form submission: ${data.formName}`,
      template,
      organizationId: data.organizationId,
      recipientType: 'vendor',
      templateType: 'form_submission',
      priority: 'high',
      variables: data,
    });
  }

  static async sendBookingUpdateNotification(data: BookingUpdateData) {
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${data.bookingId}`;

    const template = BookingUpdateEmail({
      recipientName: data.recipientName,
      updateType: data.updateType,
      bookingDetails: data.bookingDetails,
      bookingUrl,
      clientName: data.clientName,
      organizationName: data.organizationName,
    });

    const actionMap = {
      created: 'created',
      updated: 'updated',
      cancelled: 'cancelled',
    };

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Booking ${actionMap[data.updateType]} for ${data.clientName}`,
      template,
      organizationId: data.organizationId,
      recipientType: 'vendor',
      templateType: 'booking_update',
      priority: data.updateType === 'cancelled' ? 'high' : 'normal',
      variables: data,
    });
  }

  static async sendPaymentNotification(data: PaymentNotificationData) {
    const invoiceUrl = data.invoiceId
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${data.invoiceId}`
      : undefined;

    const template = PaymentNotificationEmail({
      recipientName: data.recipientName,
      paymentType: data.paymentType,
      amount: data.amount,
      currency: data.currency,
      clientName: data.clientName,
      invoiceUrl,
      dueDate: data.dueDate,
      organizationName: data.organizationName,
    });

    const typeMap = {
      received: 'Payment received',
      failed: 'Payment failed',
      reminder: 'Payment reminder',
    };

    const priority = data.paymentType === 'failed' ? 'high' : 'normal';

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `${typeMap[data.paymentType]}: ${data.currency}${data.amount}`,
      template,
      organizationId: data.organizationId,
      recipientType: 'vendor',
      templateType: 'payment_notification',
      priority,
      variables: data,
    });
  }

  static async sendWelcomeEmail(
    recipientEmail: string,
    recipientName: string,
    organizationId: string,
    organizationName?: string,
  ) {
    const template = WelcomeEmail({
      recipientName,
      organizationName: organizationName || 'WedSync',
    });

    return this.sendEmail({
      to: recipientEmail,
      subject: `Welcome to ${organizationName || 'WedSync'}!`,
      template,
      organizationId,
      templateType: 'welcome',
      priority: 'normal',
      variables: { recipientName, organizationName },
    });
  }

  // Webhook handler for Resend events
  static async handleWebhook(payload: {
    type: string;
    data: { email_id?: string; [key: string]: unknown };
  }) {
    const { type, data } = payload;

    if (!data?.email_id) return;

    const supabase = await createClient();

    // Find notification by provider ID
    const { data: notification } = await supabase
      .from('email_notifications')
      .select('id')
      .eq('provider_id', data.email_id)
      .single();

    if (!notification) return;

    let status: 'delivered' | 'bounced' | 'failed' | undefined;

    switch (type) {
      case 'email.delivered':
        status = 'delivered';
        break;
      case 'email.bounced':
        status = 'bounced';
        break;
      case 'email.complained':
        status = 'failed';
        break;
      default:
        return;
    }

    if (status) {
      await this.updateNotificationStatus(
        notification.id,
        status,
        undefined,
        payload,
      );
    }
  }

  // Get notification history
  static async getNotificationHistory(
    organizationId: string,
    limit = 50,
    offset = 0,
    status?: string,
  ) {
    const supabase = await createClient();

    let query = supabase
      .from('email_notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notification history:', error);
      throw error;
    }

    return data || [];
  }
}

// Export a singleton instance
export const emailService = new EmailService();
