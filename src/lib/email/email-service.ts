import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export interface ReviewRequestEmailData {
  to: string;
  clientName: string;
  supplierName: string;
  message: string;
  reviewUrl: string;
  unsubscribeUrl: string;
}

export interface FollowUpEmailData {
  to: string;
  clientName: string;
  supplierName: string;
  reviewUrl: string;
  followUpNumber: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_template: string;
  text_template: string;
  variables: string[];
}

const EmailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  from: z.string().email().optional(),
  reply_to: z.string().email().optional(),
  template_variables: z.record(z.string()).optional(),
});

export class EmailService {
  private supabase = createClient();
  private provider: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid';
  }

  /**
   * Send a review request email
   */
  async sendReviewRequest(data: ReviewRequestEmailData): Promise<void> {
    try {
      // Get review request email template
      const template = await this.getEmailTemplate('review_request');

      const variables = {
        client_name: data.clientName,
        supplier_name: data.supplierName,
        personalized_message: data.message,
        review_url: data.reviewUrl,
        unsubscribe_url: data.unsubscribeUrl,
        current_year: new Date().getFullYear().toString(),
      };

      const emailData = {
        to: data.to,
        subject: this.processTemplate(template.subject, variables),
        html: this.processTemplate(template.html_template, variables),
        text: this.processTemplate(template.text_template, variables),
        template_variables: variables,
      };

      await this.sendEmail(emailData);

      // Log email sent
      await this.logEmailEvent('review_request', data.to, 'sent', {
        supplier_name: data.supplierName,
        client_name: data.clientName,
      });
    } catch (error) {
      console.error('Failed to send review request email:', error);

      // Log email failure
      await this.logEmailEvent('review_request', data.to, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Send a follow-up email
   */
  async sendFollowUpRequest(data: FollowUpEmailData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('review_followup');

      const variables = {
        client_name: data.clientName,
        supplier_name: data.supplierName,
        review_url: data.reviewUrl,
        followup_number: data.followUpNumber.toString(),
        current_year: new Date().getFullYear().toString(),
      };

      const emailData = {
        to: data.to,
        subject: this.processTemplate(template.subject, variables),
        html: this.processTemplate(template.html_template, variables),
        text: this.processTemplate(template.text_template, variables),
        template_variables: variables,
      };

      await this.sendEmail(emailData);

      await this.logEmailEvent('review_followup', data.to, 'sent', {
        supplier_name: data.supplierName,
        followup_number: data.followUpNumber,
      });
    } catch (error) {
      console.error('Failed to send follow-up email:', error);

      await this.logEmailEvent('review_followup', data.to, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Send thank you email after review submission
   */
  async sendThankYouEmail(
    to: string,
    clientName: string,
    supplierName: string,
    rating: number,
  ): Promise<void> {
    try {
      const template = await this.getEmailTemplate('review_thank_you');

      const variables = {
        client_name: clientName,
        supplier_name: supplierName,
        rating: rating.toString(),
        rating_stars: '⭐'.repeat(rating),
        current_year: new Date().getFullYear().toString(),
      };

      const emailData = {
        to,
        subject: this.processTemplate(template.subject, variables),
        html: this.processTemplate(template.html_template, variables),
        text: this.processTemplate(template.text_template, variables),
        template_variables: variables,
      };

      await this.sendEmail(emailData);

      await this.logEmailEvent('review_thank_you', to, 'sent', {
        supplier_name: supplierName,
        rating,
      });
    } catch (error) {
      console.error('Failed to send thank you email:', error);
      throw error;
    }
  }

  /**
   * Get email template from database
   */
  private async getEmailTemplate(templateName: string): Promise<EmailTemplate> {
    const { data: template, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('name', templateName)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      // Fallback to default templates
      return this.getDefaultTemplate(templateName);
    }

    return template;
  }

  /**
   * Default email templates (fallback)
   */
  private getDefaultTemplate(templateName: string): EmailTemplate {
    const templates = {
      review_request: {
        id: 'default_review_request',
        name: 'review_request',
        subject: 'Share your experience with {supplier_name}',
        html_template: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2>Hi {client_name}! 👋</h2>
                <p>{personalized_message}</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p>We'd love to hear about your experience with <strong>{supplier_name}</strong>!</p>
                  <p>Your feedback helps us improve and helps other couples make informed decisions.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="{review_url}" 
                       style="background: #007bff; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold;">
                      Leave a Review
                    </a>
                  </div>
                </div>
                
                <p style="font-size: 12px; color: #666;">
                  If you don't want to receive these emails, you can 
                  <a href="{unsubscribe_url}">unsubscribe here</a>.
                </p>
                
                <p style="font-size: 12px; color: #666;">
                  © {current_year} WedSync. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
        text_template: `
          Hi {client_name}!
          
          {personalized_message}
          
          We'd love to hear about your experience with {supplier_name}!
          
          Please leave a review at: {review_url}
          
          Your feedback helps us improve and helps other couples make informed decisions.
          
          If you don't want to receive these emails, you can unsubscribe here: {unsubscribe_url}
          
          © {current_year} WedSync. All rights reserved.
        `,
        variables: [
          'client_name',
          'supplier_name',
          'personalized_message',
          'review_url',
          'unsubscribe_url',
          'current_year',
        ],
      },

      review_followup: {
        id: 'default_review_followup',
        name: 'review_followup',
        subject: 'Quick reminder: Share your {supplier_name} experience',
        html_template: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2>Hi {client_name}! 👋</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p>We hope you're doing well! This is a quick reminder about sharing your experience with <strong>{supplier_name}</strong>.</p>
                  
                  <p>Your review would mean a lot to us and help other couples planning their special day.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="{review_url}" 
                       style="background: #28a745; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold;">
                      Leave Your Review
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666;">
                    This is follow-up #{followup_number}. We'll only send a couple of these reminders.
                  </p>
                </div>
                
                <p style="font-size: 12px; color: #666;">
                  © {current_year} WedSync. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
        text_template: `
          Hi {client_name}!
          
          We hope you're doing well! This is a quick reminder about sharing your experience with {supplier_name}.
          
          Your review would mean a lot to us and help other couples planning their special day.
          
          Please leave your review at: {review_url}
          
          This is follow-up #{followup_number}. We'll only send a couple of these reminders.
          
          © {current_year} WedSync. All rights reserved.
        `,
        variables: [
          'client_name',
          'supplier_name',
          'review_url',
          'followup_number',
          'current_year',
        ],
      },

      review_thank_you: {
        id: 'default_thank_you',
        name: 'review_thank_you',
        subject: 'Thank you for your {rating}-star review!',
        html_template: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2>Thank you, {client_name}! 🙏</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p>We're thrilled that you took the time to share your experience with <strong>{supplier_name}</strong>!</p>
                  
                  <div style="text-align: center; margin: 20px 0;">
                    <div style="font-size: 24px;">{rating_stars}</div>
                    <p style="font-size: 18px; color: #28a745; font-weight: bold;">
                      {rating} out of 5 stars
                    </p>
                  </div>
                  
                  <p>Your feedback helps us continuously improve our services and assists other couples in making informed decisions for their special day.</p>
                  
                  <p>We're grateful to have been part of your wedding journey! 💕</p>
                </div>
                
                <p style="font-size: 12px; color: #666;">
                  © {current_year} WedSync. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
        text_template: `
          Thank you, {client_name}!
          
          We're thrilled that you took the time to share your experience with {supplier_name}!
          
          {rating_stars} - {rating} out of 5 stars
          
          Your feedback helps us continuously improve our services and assists other couples in making informed decisions for their special day.
          
          We're grateful to have been part of your wedding journey!
          
          © {current_year} WedSync. All rights reserved.
        `,
        variables: [
          'client_name',
          'supplier_name',
          'rating',
          'rating_stars',
          'current_year',
        ],
      },
    };

    const template = templates[templateName as keyof typeof templates];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return template;
  }

  /**
   * Send email via configured provider
   */
  private async sendEmail(
    emailData: z.infer<typeof EmailRequestSchema>,
  ): Promise<void> {
    const validated = EmailRequestSchema.parse(emailData);

    switch (this.provider) {
      case 'sendgrid':
        await this.sendViaProvider(validated);
        break;
      case 'postmark':
        await this.sendViaProvider(validated);
        break;
      case 'ses':
        await this.sendViaProvider(validated);
        break;
      default:
        // Queue for background processing
        await this.queueEmail(validated);
    }
  }

  /**
   * Send via external email provider
   */
  private async sendViaProvider(
    emailData: z.infer<typeof EmailRequestSchema>,
  ): Promise<void> {
    // Implementation would depend on the specific provider
    // This is a placeholder for the actual provider integration

    const payload = {
      to: emailData.to,
      from: emailData.from || process.env.FROM_EMAIL || 'noreply@wedsync.com',
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      reply_to: emailData.reply_to,
    };

    // Simulate sending (replace with actual provider API call)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email would be sent:', {
        to: payload.to,
        subject: payload.subject,
        provider: this.provider,
      });
      return;
    }

    // Actual provider implementation would go here
    // throw new Error('Email provider not configured');
  }

  /**
   * Queue email for background processing
   */
  private async queueEmail(
    emailData: z.infer<typeof EmailRequestSchema>,
  ): Promise<void> {
    await this.supabase.from('email_queue').insert({
      id: crypto.randomUUID(),
      to_email: emailData.to,
      from_email:
        emailData.from || process.env.FROM_EMAIL || 'noreply@wedsync.com',
      subject: emailData.subject,
      html_content: emailData.html,
      text_content: emailData.text,
      template_variables: emailData.template_variables,
      status: 'queued',
      priority: 'normal',
      scheduled_for: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Process template variables
   */
  private processTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let processed = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, value || '');
    });

    return processed;
  }

  /**
   * Log email events
   */
  private async logEmailEvent(
    type: string,
    recipient: string,
    status: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase.from('email_logs').insert({
        id: crypto.randomUUID(),
        email_type: type,
        recipient_email: recipient,
        status,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log email event:', error);
      // Don't throw - logging failures shouldn't break email sending
    }
  }

  /**
   * Handle email webhook events (bounces, opens, clicks)
   */
  async handleWebhookEvent(
    provider: string,
    eventType: string,
    payload: any,
  ): Promise<void> {
    try {
      // Extract relevant data based on provider
      let emailAddress: string | undefined;
      let messageId: string | undefined;
      let timestamp: string | undefined;

      switch (provider) {
        case 'sendgrid':
          emailAddress = payload.email;
          messageId = payload.sg_message_id;
          timestamp = new Date(payload.timestamp * 1000).toISOString();
          break;

        case 'postmark':
          emailAddress = payload.Recipient;
          messageId = payload.MessageID;
          timestamp = payload.ReceivedAt;
          break;

        case 'ses':
          emailAddress = payload.mail?.destination?.[0];
          messageId = payload.mail?.messageId;
          timestamp = payload.mail?.timestamp;
          break;
      }

      if (!emailAddress || !eventType) {
        console.warn('Invalid webhook payload:', { provider, eventType });
        return;
      }

      // Log the webhook event
      await this.supabase.from('email_webhook_events').insert({
        id: crypto.randomUUID(),
        provider,
        event_type: eventType,
        recipient_email: emailAddress,
        message_id: messageId,
        payload: payload,
        processed_at: new Date().toISOString(),
      });

      // Handle specific event types
      switch (eventType) {
        case 'bounce':
        case 'dropped':
          await this.handleBounce(emailAddress, payload);
          break;

        case 'open':
          await this.handleOpen(emailAddress, messageId, timestamp);
          break;

        case 'click':
          await this.handleClick(
            emailAddress,
            messageId,
            payload.url,
            timestamp,
          );
          break;

        case 'unsubscribe':
          await this.handleUnsubscribe(emailAddress);
          break;
      }
    } catch (error) {
      console.error('Failed to process email webhook:', error);
    }
  }

  /**
   * Handle email bounce
   */
  private async handleBounce(
    emailAddress: string,
    payload: any,
  ): Promise<void> {
    // Mark email as bounced
    await this.supabase.from('email_bounces').insert({
      id: crypto.randomUUID(),
      email_address: emailAddress,
      bounce_type: payload.type || 'unknown',
      bounce_reason: payload.reason || 'Unknown',
      bounced_at: new Date().toISOString(),
    });

    // Update any pending review requests
    await this.supabase
      .from('review_requests')
      .update({
        status: 'bounced',
        updated_at: new Date().toISOString(),
      })
      .eq('client_email', emailAddress)
      .in('status', ['pending', 'sent']);
  }

  /**
   * Handle email open
   */
  private async handleOpen(
    emailAddress: string,
    messageId?: string,
    timestamp?: string,
  ): Promise<void> {
    // Find review request by email and update opened status
    await this.supabase
      .from('review_requests')
      .update({
        opened_at: timestamp || new Date().toISOString(),
        status: 'opened',
        updated_at: new Date().toISOString(),
      })
      .eq('client_email', emailAddress)
      .eq('status', 'sent');
  }

  /**
   * Handle email click
   */
  private async handleClick(
    emailAddress: string,
    messageId?: string,
    clickedUrl?: string,
    timestamp?: string,
  ): Promise<void> {
    // Log click event
    await this.supabase.from('email_clicks').insert({
      id: crypto.randomUUID(),
      recipient_email: emailAddress,
      message_id: messageId,
      clicked_url: clickedUrl,
      clicked_at: timestamp || new Date().toISOString(),
    });
  }

  /**
   * Handle unsubscribe
   */
  private async handleUnsubscribe(emailAddress: string): Promise<void> {
    // Add to unsubscribe list
    await this.supabase.from('email_unsubscribes').insert({
      id: crypto.randomUUID(),
      email_address: emailAddress,
      unsubscribed_at: new Date().toISOString(),
    });

    // Update any pending review requests
    await this.supabase
      .from('review_requests')
      .update({
        status: 'unsubscribed',
        updated_at: new Date().toISOString(),
      })
      .eq('client_email', emailAddress)
      .in('status', ['pending', 'sent', 'opened']);
  }

  /**
   * Check if email address is unsubscribed
   */
  async isUnsubscribed(emailAddress: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('email_unsubscribes')
      .select('id')
      .eq('email_address', emailAddress)
      .single();

    return !!data;
  }

  /**
   * Get email statistics
   */
  async getEmailStats(dateFrom?: string, dateTo?: string) {
    let query = this.supabase.from('email_logs').select('status, email_type');

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data } = await query;

    const stats =
      data?.reduce(
        (acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          acc.by_type = acc.by_type || {};
          acc.by_type[log.email_type] = acc.by_type[log.email_type] || {};
          acc.by_type[log.email_type][log.status] =
            (acc.by_type[log.email_type][log.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, any>,
      ) || {};

    return stats;
  }
}
