/**
 * Review Email Service
 * WS-047: Review Collection System - Email Integration
 *
 * Automated email scheduling, personalized message templates,
 * email tracking, and unsubscribe handling for review requests
 */

import { EncryptionService } from '@/middleware/encryption';
import { createClient } from '@supabase/supabase-js';
import { SlidingWindowRateLimiter } from '@/lib/rate-limiter/sliding-window';
import crypto from 'crypto';

export interface EmailTemplate {
  id: string;
  type: 'review_request' | 'thank_you' | 'follow_up' | 'reminder';
  subject: string;
  html_content: string;
  text_content: string;
  variables: string[];
  supplier_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewEmailRequest {
  id: string;
  supplier_id: string;
  couple_id: string;
  wedding_id: string;
  template_type: 'review_request' | 'follow_up' | 'reminder';
  scheduled_for: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  tracking_token: string;
  unsubscribe_token: string;
  email_data: {
    to_email: string;
    couple_names: string;
    supplier_name: string;
    wedding_date: string;
    review_url: string;
    unsubscribe_url: string;
  };
  delivery_attempts: number;
  last_error?: string;
}

export interface EmailMetrics {
  total_sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  failed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}

export class ReviewEmailService {
  private encryption: EncryptionService;
  private supabase;
  private rateLimiter: SlidingWindowRateLimiter;
  private emailProvider: 'resend' | 'sendgrid' | 'ses';

  constructor(emailProvider: 'resend' | 'sendgrid' | 'ses' = 'resend') {
    this.encryption = new EncryptionService();
    this.emailProvider = emailProvider;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Rate limiting for email sending (prevent spam)
    this.rateLimiter = new SlidingWindowRateLimiter({
      windowSizeMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100, // Max 100 emails per hour per supplier
    });
  }

  /**
   * Create and schedule a review request email
   */
  async scheduleReviewRequest(
    supplierId: string,
    coupleId: string,
    weddingId: string,
    scheduledFor: Date,
    templateType:
      | 'review_request'
      | 'follow_up'
      | 'reminder' = 'review_request',
  ): Promise<string> {
    const identifier = `email_${supplierId}`;

    if (!(await this.rateLimiter.isAllowed(identifier))) {
      throw new Error('Email rate limit exceeded for supplier');
    }

    // Get couple and supplier information
    const [coupleData, supplierData, weddingData] = await Promise.all([
      this.getCoupleData(coupleId),
      this.getSupplierData(supplierId),
      this.getWeddingData(weddingId),
    ]);

    if (!coupleData || !supplierData || !weddingData) {
      throw new Error('Missing required data for email scheduling');
    }

    // Generate secure tokens
    const trackingToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    // Create review URL with tracking
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/${trackingToken}?supplier=${supplierId}`;
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${unsubscribeToken}`;

    const emailRequest: Partial<ReviewEmailRequest> = {
      supplier_id: supplierId,
      couple_id: coupleId,
      wedding_id: weddingId,
      template_type: templateType,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
      tracking_token: trackingToken,
      unsubscribe_token: this.encryption.encrypt(unsubscribeToken),
      email_data: {
        to_email: coupleData.email,
        couple_names: `${coupleData.partner1_name} & ${coupleData.partner2_name}`,
        supplier_name: supplierData.business_name,
        wedding_date: new Date(weddingData.wedding_date).toLocaleDateString(),
        review_url: reviewUrl,
        unsubscribe_url: unsubscribeUrl,
      },
      delivery_attempts: 0,
    };

    const { data, error } = await this.supabase
      .from('review_email_requests')
      .insert(emailRequest)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to schedule email: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Process pending email requests
   */
  async processPendingEmails(): Promise<number> {
    const { data: pendingEmails } = await this.supabase
      .from('review_email_requests')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50); // Process in batches

    if (!pendingEmails || pendingEmails.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const emailRequest of pendingEmails) {
      try {
        await this.sendReviewRequestEmail(emailRequest.id);
        processedCount++;
      } catch (error) {
        console.error(`Failed to send email ${emailRequest.id}:`, error);

        // Update with error status
        await this.supabase
          .from('review_email_requests')
          .update({
            status: 'failed',
            last_error:
              error instanceof Error ? error.message : 'Unknown error',
            delivery_attempts: emailRequest.delivery_attempts + 1,
          })
          .eq('id', emailRequest.id);
      }
    }

    return processedCount;
  }

  /**
   * Send individual review request email
   */
  async sendReviewRequestEmail(requestId: string): Promise<boolean> {
    const { data: emailRequest } = await this.supabase
      .from('review_email_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!emailRequest) {
      throw new Error('Email request not found');
    }

    // Get email template
    const template = await this.getEmailTemplate(
      emailRequest.supplier_id,
      emailRequest.template_type,
    );

    if (!template) {
      throw new Error(
        `Email template not found: ${emailRequest.template_type}`,
      );
    }

    // Render template with data
    const renderedContent = this.renderTemplate(
      template,
      emailRequest.email_data,
    );

    // Send email using selected provider
    const success = await this.sendEmail({
      to: emailRequest.email_data.to_email,
      subject: renderedContent.subject,
      html: renderedContent.html,
      text: renderedContent.text,
      trackingToken: emailRequest.tracking_token,
      unsubscribeUrl: emailRequest.email_data.unsubscribe_url,
    });

    // Update email request status
    await this.supabase
      .from('review_email_requests')
      .update({
        status: success ? 'sent' : 'failed',
        sent_at: success ? new Date().toISOString() : undefined,
        delivery_attempts: emailRequest.delivery_attempts + 1,
        last_error: success ? undefined : 'Email delivery failed',
      })
      .eq('id', requestId);

    return success;
  }

  /**
   * Render email template with personalization data
   */
  private renderTemplate(
    template: EmailTemplate,
    data: any,
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    let subject = template.subject;
    let html = template.html_content;
    let text = template.text_content;

    // Replace variables in template
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      html = html.replace(new RegExp(placeholder, 'g'), String(value));
      text = text.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { subject, html, text };
  }

  /**
   * Send email using configured provider
   */
  private async sendEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    text: string;
    trackingToken: string;
    unsubscribeUrl: string;
  }): Promise<boolean> {
    try {
      switch (this.emailProvider) {
        case 'resend':
          return await this.sendViaResend(emailData);
        case 'sendgrid':
          return await this.sendViaSendGrid(emailData);
        case 'ses':
          return await this.sendViaSES(emailData);
        default:
          throw new Error(`Unsupported email provider: ${this.emailProvider}`);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send email via Resend
   */
  private async sendViaResend(emailData: any): Promise<boolean> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'noreply@wedsync.com',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        headers: {
          'List-Unsubscribe': `<${emailData.unsubscribeUrl}>`,
          'X-Tracking-Token': emailData.trackingToken,
        },
      }),
    });

    return response.ok;
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(emailData: any): Promise<boolean> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: emailData.to }],
            custom_args: {
              tracking_token: emailData.trackingToken,
            },
          },
        ],
        from: { email: process.env.FROM_EMAIL || 'noreply@wedsync.com' },
        subject: emailData.subject,
        content: [
          { type: 'text/html', value: emailData.html },
          { type: 'text/plain', value: emailData.text },
        ],
        headers: {
          'List-Unsubscribe': `<${emailData.unsubscribeUrl}>`,
        },
      }),
    });

    return response.ok;
  }

  /**
   * Send email via Amazon SES
   */
  private async sendViaSES(emailData: any): Promise<boolean> {
    // AWS SES implementation would go here
    // For now, return false as not implemented
    return false;
  }

  /**
   * Handle email tracking events (delivery, open, click)
   */
  async handleEmailTracking(event: {
    type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
    tracking_token: string;
    timestamp: string;
    metadata?: any;
  }): Promise<void> {
    const { data: emailRequest } = await this.supabase
      .from('review_email_requests')
      .select('id, status')
      .eq('tracking_token', event.tracking_token)
      .single();

    if (!emailRequest) {
      console.warn(
        `Email tracking event received for unknown token: ${event.tracking_token}`,
      );
      return;
    }

    // Update email request status
    const statusMap: Record<string, string> = {
      delivered: 'delivered',
      opened: 'opened',
      clicked: 'clicked',
      bounced: 'failed',
      complained: 'failed',
    };

    await this.supabase
      .from('review_email_requests')
      .update({
        status: statusMap[event.type] || emailRequest.status,
      })
      .eq('id', emailRequest.id);

    // Log the tracking event
    await this.supabase.from('email_tracking_events').insert({
      email_request_id: emailRequest.id,
      event_type: event.type,
      timestamp: event.timestamp,
      metadata: event.metadata,
    });
  }

  /**
   * Handle unsubscribe requests
   */
  async handleUnsubscribe(unsubscribeToken: string): Promise<boolean> {
    try {
      const decryptedToken = this.encryption.decrypt(unsubscribeToken);

      const { data: emailRequest } = await this.supabase
        .from('review_email_requests')
        .select('couple_id, supplier_id')
        .eq('unsubscribe_token', unsubscribeToken)
        .single();

      if (!emailRequest) {
        return false;
      }

      // Add to unsubscribe list
      await this.supabase.from('email_unsubscribes').insert({
        couple_id: emailRequest.couple_id,
        supplier_id: emailRequest.supplier_id,
        email_type: 'review_requests',
        unsubscribed_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Unsubscribe handling failed:', error);
      return false;
    }
  }

  /**
   * Get email metrics for a supplier
   */
  async getEmailMetrics(
    supplierId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<EmailMetrics> {
    const baseQuery = this.supabase
      .from('review_email_requests')
      .select('status')
      .eq('supplier_id', supplierId);

    if (dateFrom) {
      baseQuery.gte('sent_at', dateFrom.toISOString());
    }

    if (dateTo) {
      baseQuery.lte('sent_at', dateTo.toISOString());
    }

    const { data: emails } = await baseQuery;

    if (!emails || emails.length === 0) {
      return {
        total_sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        unsubscribed: 0,
        failed: 0,
        delivery_rate: 0,
        open_rate: 0,
        click_rate: 0,
      };
    }

    const metrics = {
      total_sent: emails.length,
      delivered: emails.filter((e) =>
        ['delivered', 'opened', 'clicked'].includes(e.status),
      ).length,
      opened: emails.filter((e) => ['opened', 'clicked'].includes(e.status))
        .length,
      clicked: emails.filter((e) => e.status === 'clicked').length,
      unsubscribed: 0, // Would need separate query
      failed: emails.filter((e) => e.status === 'failed').length,
    };

    return {
      ...metrics,
      delivery_rate:
        metrics.total_sent > 0
          ? (metrics.delivered / metrics.total_sent) * 100
          : 0,
      open_rate:
        metrics.delivered > 0 ? (metrics.opened / metrics.delivered) * 100 : 0,
      click_rate:
        metrics.opened > 0 ? (metrics.clicked / metrics.opened) * 100 : 0,
    };
  }

  /**
   * Helper methods for data retrieval
   */
  private async getCoupleData(coupleId: string): Promise<any> {
    const { data } = await this.supabase
      .from('couples')
      .select('email, partner1_name, partner2_name')
      .eq('id', coupleId)
      .single();
    return data;
  }

  private async getSupplierData(supplierId: string): Promise<any> {
    const { data } = await this.supabase
      .from('suppliers')
      .select('business_name')
      .eq('id', supplierId)
      .single();
    return data;
  }

  private async getWeddingData(weddingId: string): Promise<any> {
    const { data } = await this.supabase
      .from('weddings')
      .select('wedding_date')
      .eq('id', weddingId)
      .single();
    return data;
  }

  private async getEmailTemplate(
    supplierId: string,
    templateType: string,
  ): Promise<EmailTemplate | null> {
    const { data } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('type', templateType)
      .eq('is_active', true)
      .single();
    return data;
  }
}

export default ReviewEmailService;
