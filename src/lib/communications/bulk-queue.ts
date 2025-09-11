import { createClient } from '@/lib/supabase/server';
import { EmailService } from '@/lib/email/service';
import { smsService } from '@/lib/sms/twilio';
import { Database } from '@/types/database';

interface QueuedEmailMessage {
  campaignId: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  templateType: string;
  organizationId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
}

interface QueuedSMSMessage {
  campaignId: string;
  recipientId: string;
  recipientPhone: string;
  recipientName: string;
  message: string;
  templateType: string;
  organizationId: string;
  organizationTier:
    | 'FREE'
    | 'STARTER'
    | 'PROFESSIONAL'
    | 'SCALE'
    | 'ENTERPRISE';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
}

type BulkMessageRecipientInsert =
  Database['public']['Tables']['bulk_message_recipients']['Insert'];
type EmailNotificationInsert =
  Database['public']['Tables']['email_notifications']['Insert'];

/**
 * BulkMessageQueue handles queuing and processing of bulk messages
 * with rate limiting, retry logic, and delivery tracking
 */
export class BulkMessageQueue {
  private static processingQueue = false;
  private static readonly BATCH_SIZE = 50; // Process 50 messages at a time
  private static readonly RETRY_DELAYS = [5000, 15000, 60000, 300000]; // 5s, 15s, 1m, 5m
  private static readonly MAX_RETRIES = 3;

  /**
   * Add email message to processing queue
   */
  static async addEmailToQueue(message: QueuedEmailMessage): Promise<void> {
    const supabase = await createClient();

    try {
      // Create bulk message recipient record
      const recipientData: BulkMessageRecipientInsert = {
        campaign_id: message.campaignId,
        recipient_id: message.recipientId,
        recipient_type: 'guest', // Default to guest, could be parameterized
        recipient_email: message.recipientEmail,
        recipient_name: message.recipientName,
        channels: ['email'],
        email_status:
          message.scheduledFor && message.scheduledFor > new Date()
            ? 'pending'
            : 'queued',
      };

      await supabase.from('bulk_message_recipients').insert(recipientData);

      // If scheduled for future, don't queue immediately
      if (message.scheduledFor && message.scheduledFor > new Date()) {
        return;
      }

      // Queue for immediate processing
      await this.queueEmailForProcessing(message);
    } catch (error) {
      console.error('Error adding email to queue:', error);
      throw error;
    }
  }

  /**
   * Add SMS message to processing queue
   */
  static async addSMSToQueue(message: QueuedSMSMessage): Promise<void> {
    const supabase = await createClient();

    try {
      // Create SMS notification record
      const smsData = {
        organization_id: message.organizationId,
        campaign_id: message.campaignId,
        recipient_phone: message.recipientPhone,
        recipient_name: message.recipientName,
        recipient_id: message.recipientId,
        template_type: message.templateType,
        message_content: message.message,
        status:
          message.scheduledFor && message.scheduledFor > new Date()
            ? 'pending'
            : 'queued',
        priority: message.priority,
        scheduled_for: message.scheduledFor?.toISOString() || null,
      };

      const { data: smsNotification } = await supabase
        .from('sms_notifications')
        .insert(smsData)
        .select()
        .single();

      // Update bulk message recipient record
      await supabase
        .from('bulk_message_recipients')
        .update({
          channels: ['sms'],
          sms_status:
            message.scheduledFor && message.scheduledFor > new Date()
              ? 'pending'
              : 'queued',
        })
        .eq('campaign_id', message.campaignId)
        .eq('recipient_id', message.recipientId);

      // If scheduled for future, don't queue immediately
      if (message.scheduledFor && message.scheduledFor > new Date()) {
        return;
      }

      // Queue for immediate processing
      await this.queueSMSForProcessing(message, smsNotification?.id);
    } catch (error) {
      console.error('Error adding SMS to queue:', error);
      throw error;
    }
  }

  /**
   * Process all queued messages (called by background job)
   */
  static async processQueue(): Promise<void> {
    if (this.processingQueue) {
      return; // Prevent concurrent processing
    }

    this.processingQueue = true;

    try {
      await Promise.all([
        this.processEmailQueue(),
        this.processSMSQueue(),
        this.processScheduledMessages(),
      ]);
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process email queue
   */
  private static async processEmailQueue(): Promise<void> {
    const supabase = await createClient();

    // Get queued email notifications
    const { data: queuedEmails } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false }) // High priority first
      .order('created_at', { ascending: true }) // Oldest first
      .limit(this.BATCH_SIZE);

    if (!queuedEmails || queuedEmails.length === 0) {
      return;
    }

    // Process emails in parallel batches
    const promises = queuedEmails.map((email) =>
      this.processEmailMessage(email),
    );
    await Promise.allSettled(promises);
  }

  /**
   * Process SMS queue
   */
  private static async processSMSQueue(): Promise<void> {
    const supabase = await createClient();

    // Get queued SMS notifications
    const { data: queuedSMS } = await supabase
      .from('sms_notifications')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false }) // High priority first
      .order('created_at', { ascending: true }) // Oldest first
      .limit(this.BATCH_SIZE);

    if (!queuedSMS || queuedSMS.length === 0) {
      return;
    }

    // Process SMS in parallel batches
    const promises = queuedSMS.map((sms) => this.processSMSMessage(sms));
    await Promise.allSettled(promises);
  }

  /**
   * Process scheduled messages that are now ready
   */
  private static async processScheduledMessages(): Promise<void> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Update scheduled email notifications to queued
    await supabase
      .from('email_notifications')
      .update({ status: 'queued' })
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    // Update scheduled SMS notifications to queued
    await supabase
      .from('sms_notifications')
      .update({ status: 'queued' })
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    // Update bulk message recipients status
    await supabase
      .from('bulk_message_recipients')
      .update({
        email_status: 'queued',
        sms_status: 'queued',
      })
      .or('email_status.eq.pending,sms_status.eq.pending');
  }

  /**
   * Process individual email message
   */
  private static async processEmailMessage(email: any): Promise<void> {
    const supabase = await createClient();

    try {
      // Update status to sending
      await supabase
        .from('email_notifications')
        .update({ status: 'sent' }) // Will be updated by EmailService
        .eq('id', email.id);

      // Send via EmailService (it handles its own status updates)
      const result = await EmailService['sendEmail']({
        to: email.recipient_email,
        subject: email.subject,
        template: this.createEmailTemplate(email.html_content),
        organizationId: email.organization_id,
        recipientId: email.recipient_id,
        recipientType: email.recipient_type,
        templateType: email.template_type,
        priority: email.priority,
        variables: email.variables,
      });

      // Update bulk message recipient status
      if (email.campaign_id) {
        await supabase
          .from('bulk_message_recipients')
          .update({
            email_status: 'sent',
            email_message_id: result.data?.id,
            email_sent_at: new Date().toISOString(),
          })
          .eq('campaign_id', email.campaign_id)
          .eq('recipient_email', email.recipient_email);
      }
    } catch (error) {
      console.error(`Error sending email ${email.id}:`, error);

      // Handle retry logic
      const newRetryCount = (email.retry_count || 0) + 1;
      const shouldRetry = newRetryCount <= this.MAX_RETRIES;

      if (shouldRetry) {
        const nextRetryAt = new Date(
          Date.now() + this.RETRY_DELAYS[newRetryCount - 1],
        );

        await supabase
          .from('email_notifications')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            scheduled_for: nextRetryAt.toISOString(),
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', email.id);
      } else {
        await supabase
          .from('email_notifications')
          .update({
            status: 'failed',
            error_message:
              error instanceof Error ? error.message : 'Max retries exceeded',
          })
          .eq('id', email.id);

        // Update bulk message recipient status
        if (email.campaign_id) {
          await supabase
            .from('bulk_message_recipients')
            .update({
              email_status: 'failed',
              email_error_message:
                error instanceof Error ? error.message : 'Max retries exceeded',
            })
            .eq('campaign_id', email.campaign_id)
            .eq('recipient_email', email.recipient_email);
        }
      }
    }
  }

  /**
   * Process individual SMS message
   */
  private static async processSMSMessage(sms: any): Promise<void> {
    const supabase = await createClient();

    try {
      // Get organization tier for SMS limits
      const { data: org } = await supabase
        .from('organizations')
        .select('pricing_tier')
        .eq('id', sms.organization_id)
        .single();

      if (!org) {
        throw new Error('Organization not found');
      }

      // Send via SMS service
      const result = await smsService.sendSMS({
        to: sms.recipient_phone,
        templateType: 'custom', // Use custom since we have the message content
        variables: { message: sms.message_content },
        organizationId: sms.organization_id,
        organizationTier: org.pricing_tier as any,
        priority: sms.priority as any,
      });

      // Update SMS notification status
      await supabase
        .from('sms_notifications')
        .update({
          status: 'sent',
          provider_id: result.messageId,
          sent_at: new Date().toISOString(),
          cost: result.cost,
          segments: result.segments,
        })
        .eq('id', sms.id);

      // Update bulk message recipient status
      if (sms.campaign_id) {
        await supabase
          .from('bulk_message_recipients')
          .update({
            sms_status: 'sent',
            sms_message_id: result.messageId,
            sms_sent_at: new Date().toISOString(),
            sms_cost: result.cost,
            sms_segments: result.segments,
          })
          .eq('campaign_id', sms.campaign_id)
          .eq('recipient_phone', sms.recipient_phone);
      }
    } catch (error) {
      console.error(`Error sending SMS ${sms.id}:`, error);

      // Handle retry logic
      const newRetryCount = (sms.retry_count || 0) + 1;
      const shouldRetry = newRetryCount <= this.MAX_RETRIES;

      if (shouldRetry) {
        const nextRetryAt = new Date(
          Date.now() + this.RETRY_DELAYS[newRetryCount - 1],
        );

        await supabase
          .from('sms_notifications')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            scheduled_for: nextRetryAt.toISOString(),
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', sms.id);
      } else {
        await supabase
          .from('sms_notifications')
          .update({
            status: 'failed',
            error_message:
              error instanceof Error ? error.message : 'Max retries exceeded',
          })
          .eq('id', sms.id);

        // Update bulk message recipient status
        if (sms.campaign_id) {
          await supabase
            .from('bulk_message_recipients')
            .update({
              sms_status: 'failed',
              sms_error_message:
                error instanceof Error ? error.message : 'Max retries exceeded',
            })
            .eq('campaign_id', sms.campaign_id)
            .eq('recipient_phone', sms.recipient_phone);
        }
      }
    }
  }

  /**
   * Queue email for processing
   */
  private static async queueEmailForProcessing(
    message: QueuedEmailMessage,
  ): Promise<void> {
    const supabase = await createClient();

    const emailData: EmailNotificationInsert = {
      organization_id: message.organizationId,
      recipient_email: message.recipientEmail,
      recipient_name: message.recipientName,
      recipient_id: message.recipientId,
      recipient_type: 'guest',
      template_type: message.templateType,
      subject: message.subject,
      html_content: this.createEmailHTML(message.message),
      text_content: this.stripHTML(message.message),
      status: 'queued',
      provider: 'resend',
      priority: message.priority,
      retry_count: 0,
    };

    await supabase.from('email_notifications').insert(emailData);
  }

  /**
   * Queue SMS for processing
   */
  private static async queueSMSForProcessing(
    message: QueuedSMSMessage,
    smsId?: string,
  ): Promise<void> {
    // SMS is already created in addSMSToQueue, just update status if needed
    if (smsId) {
      const supabase = await createClient();
      await supabase
        .from('sms_notifications')
        .update({ status: 'queued' })
        .eq('id', smsId);
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(organizationId: string): Promise<{
    email: { pending: number; queued: number; failed: number };
    sms: { pending: number; queued: number; failed: number };
  }> {
    const supabase = await createClient();

    // Get email stats
    const [
      { count: emailPending },
      { count: emailQueued },
      { count: emailFailed },
    ] = await Promise.all([
      supabase
        .from('email_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending'),
      supabase
        .from('email_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'queued'),
      supabase
        .from('email_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'failed'),
    ]);

    // Get SMS stats
    const [{ count: smsPending }, { count: smsQueued }, { count: smsFailed }] =
      await Promise.all([
        supabase
          .from('sms_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'pending'),
        supabase
          .from('sms_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'queued'),
        supabase
          .from('sms_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'failed'),
      ]);

    return {
      email: {
        pending: emailPending || 0,
        queued: emailQueued || 0,
        failed: emailFailed || 0,
      },
      sms: {
        pending: smsPending || 0,
        queued: smsQueued || 0,
        failed: smsFailed || 0,
      },
    };
  }

  /**
   * Helper to create email template component
   */
  private static createEmailTemplate(htmlContent: string): React.ReactElement {
    // This is a simplified version - in practice, you'd want a proper React component
    return {
      type: 'div',
      props: {
        dangerouslySetInnerHTML: { __html: htmlContent },
      },
    } as any;
  }

  /**
   * Helper to create HTML from message content
   */
  private static createEmailHTML(message: string): string {
    return message.replace(/\n/g, '<br>');
  }

  /**
   * Helper to strip HTML for text content
   */
  private static stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/<br>/gi, '\n');
  }
}

// Export singleton instance
export const bulkMessageQueue = new BulkMessageQueue();
