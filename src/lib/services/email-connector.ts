import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Enhanced Email Service Connector with Supabase Edge Functions
 * Integrates with journey builder service connections
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject_template: string;
  html_template: string;
  text_template?: string;
  template_variables: string[];
  category: 'journey' | 'transactional' | 'marketing';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailDeliveryOptions {
  template_id: string;
  recipient: {
    email: string;
    name?: string;
  };
  variables: Record<string, any>;
  sender?: {
    email: string;
    name: string;
  };
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  priority: 'low' | 'normal' | 'high';
  delivery_time?: string; // ISO string for scheduled delivery
  track_opens?: boolean;
  track_clicks?: boolean;
  attachments?: Array<{
    filename: string;
    content_type: string;
    content: string; // base64 encoded
  }>;
}

export interface EmailDeliveryResult {
  message_id: string;
  status: 'sent' | 'scheduled' | 'queued' | 'failed';
  delivery_timestamp: string;
  tracking_id?: string;
  error_message?: string;
}

export interface EmailServiceStatus {
  provider: 'resend' | 'sendgrid' | 'ses';
  is_configured: boolean;
  daily_quota: number;
  daily_sent: number;
  monthly_quota: number;
  monthly_sent: number;
  last_error?: string;
}

export class EmailServiceConnector {
  private static instance: EmailServiceConnector;
  private edgeFunctionUrl: string;

  constructor() {
    this.edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-service`;
  }

  static getInstance(): EmailServiceConnector {
    if (!EmailServiceConnector.instance) {
      EmailServiceConnector.instance = new EmailServiceConnector();
    }
    return EmailServiceConnector.instance;
  }

  /**
   * Send email through Supabase Edge Function
   */
  async sendEmail(options: EmailDeliveryOptions): Promise<EmailDeliveryResult> {
    try {
      // Validate template exists and is active
      const template = await this.getTemplate(options.template_id);
      if (!template || !template.is_active) {
        throw new Error(
          `Template ${options.template_id} not found or inactive`,
        );
      }

      // Validate required variables
      this.validateTemplateVariables(template, options.variables);

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('email-service', {
        body: {
          action: 'send_email',
          template_id: options.template_id,
          recipient: options.recipient,
          variables: options.variables,
          sender: options.sender,
          reply_to: options.reply_to,
          cc: options.cc,
          bcc: options.bcc,
          priority: options.priority,
          delivery_time: options.delivery_time,
          track_opens: options.track_opens,
          track_clicks: options.track_clicks,
          attachments: options.attachments,
        },
      });

      if (error) {
        throw new Error(`Email service error: ${error.message}`);
      }

      // Record delivery attempt
      await this.recordDeliveryAttempt(data, options);

      return data as EmailDeliveryResult;
    } catch (error) {
      console.error('Email delivery failed:', error);

      const failedResult: EmailDeliveryResult = {
        message_id: '',
        status: 'failed',
        delivery_timestamp: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.recordDeliveryAttempt(failedResult, options);
      throw error;
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(
    emails: EmailDeliveryOptions[],
  ): Promise<EmailDeliveryResult[]> {
    const results: EmailDeliveryResult[] = [];
    const batchSize = 10; // Process in batches to avoid rate limits

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map((email) =>
        this.sendEmail(email).catch((error) => ({
          message_id: '',
          status: 'failed' as const,
          delivery_timestamp: new Date().toISOString(),
          error_message: error.message,
        })),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting delay between batches
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get email template by ID
   */
  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    return data as EmailTemplate;
  }

  /**
   * Get all active templates
   */
  async getActiveTemplates(category?: string): Promise<EmailTemplate[]> {
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return data as EmailTemplate[];
  }

  /**
   * Create or update email template
   */
  async upsertTemplate(
    template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .upsert({
        ...template,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save template: ${error.message}`);
    }

    return data as EmailTemplate;
  }

  /**
   * Test email template with sample data
   */
  async testTemplate(
    templateId: string,
    sampleData: Record<string, any>,
  ): Promise<{
    subject: string;
    html: string;
    text?: string;
    variables_used: string[];
    missing_variables: string[];
  }> {
    const { data, error } = await supabase.functions.invoke('email-service', {
      body: {
        action: 'test_template',
        template_id: templateId,
        sample_data: sampleData,
      },
    });

    if (error) {
      throw new Error(`Template test failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Get email service status and quotas
   */
  async getServiceStatus(): Promise<EmailServiceStatus> {
    const { data, error } = await supabase.functions.invoke('email-service', {
      body: { action: 'get_status' },
    });

    if (error) {
      throw new Error(`Failed to get service status: ${error.message}`);
    }

    return data as EmailServiceStatus;
  }

  /**
   * Handle webhook events from email provider
   */
  async handleWebhook(event: {
    type:
      | 'delivered'
      | 'opened'
      | 'clicked'
      | 'bounced'
      | 'complained'
      | 'unsubscribed';
    message_id: string;
    timestamp: string;
    recipient: string;
    data?: any;
  }): Promise<void> {
    try {
      // Record the event
      await supabase.from('email_events').insert({
        message_id: event.message_id,
        event_type: event.type,
        recipient: event.recipient,
        timestamp: event.timestamp,
        event_data: event.data,
        processed_at: new Date().toISOString(),
      });

      // Update delivery status if needed
      if (['delivered', 'bounced'].includes(event.type)) {
        await supabase
          .from('email_deliveries')
          .update({
            delivery_status: event.type,
            delivered_at:
              event.type === 'delivered' ? event.timestamp : undefined,
            bounce_reason:
              event.type === 'bounced' ? event.data?.reason : undefined,
          })
          .eq('message_id', event.message_id);
      }

      // Handle unsubscribe
      if (event.type === 'unsubscribed') {
        await this.handleUnsubscribe(event.recipient);
      }

      console.log(
        `Email webhook processed: ${event.type} for ${event.message_id}`,
      );
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Get delivery analytics for a specific journey or time period
   */
  async getDeliveryAnalytics(params: {
    journey_id?: string;
    start_date?: string;
    end_date?: string;
    template_id?: string;
  }): Promise<{
    total_sent: number;
    total_delivered: number;
    total_opened: number;
    total_clicked: number;
    total_bounced: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  }> {
    const { data, error } = await supabase.functions.invoke('email-service', {
      body: {
        action: 'get_analytics',
        ...params,
      },
    });

    if (error) {
      throw new Error(`Analytics query failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Validate template variables
   */
  private validateTemplateVariables(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): void {
    const missingVariables = template.template_variables.filter(
      (variable) => !(variable in variables),
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required variables: ${missingVariables.join(', ')}`,
      );
    }
  }

  /**
   * Record delivery attempt in database
   */
  private async recordDeliveryAttempt(
    result: EmailDeliveryResult,
    options: EmailDeliveryOptions,
  ): Promise<void> {
    try {
      await supabase.from('email_deliveries').insert({
        message_id: result.message_id,
        template_id: options.template_id,
        recipient_email: options.recipient.email,
        recipient_name: options.recipient.name,
        delivery_status: result.status,
        scheduled_for: options.delivery_time,
        sent_at:
          result.status === 'sent' ? result.delivery_timestamp : undefined,
        tracking_enabled: options.track_opens || options.track_clicks,
        variables_used: options.variables,
        error_message: result.error_message,
      });
    } catch (error) {
      console.error('Failed to record delivery attempt:', error);
    }
  }

  /**
   * Handle unsubscribe request
   */
  private async handleUnsubscribe(email: string): Promise<void> {
    try {
      // Find client by email and mark as unsubscribed
      const { error } = await supabase
        .from('clients')
        .update({
          email_subscribed: false,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (error) {
        console.error('Failed to process unsubscribe:', error);
      } else {
        console.log(`Client unsubscribed: ${email}`);
      }
    } catch (error) {
      console.error('Unsubscribe processing failed:', error);
    }
  }

  /**
   * Schedule email for future delivery
   */
  async scheduleEmail(
    options: EmailDeliveryOptions,
    deliveryTime: Date,
  ): Promise<{ schedule_id: string }> {
    const { data, error } = await supabase
      .from('email_schedules')
      .insert({
        template_id: options.template_id,
        recipient_email: options.recipient.email,
        variables: options.variables,
        scheduled_for: deliveryTime.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to schedule email: ${error.message}`);
    }

    return { schedule_id: data.id };
  }

  /**
   * Cancel scheduled email
   */
  async cancelScheduledEmail(scheduleId: string): Promise<boolean> {
    const { error } = await supabase
      .from('email_schedules')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .eq('status', 'pending');

    return !error;
  }
}

// Export singleton instance
export const emailServiceConnector = EmailServiceConnector.getInstance();
