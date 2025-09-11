import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { emailService } from '../services/email-templates';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface EmailExecutionConfig {
  template: string;
  subject?: string;
  to?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  priority?: 'low' | 'normal' | 'high';
  variables?: Record<string, any>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  scheduleFor?: Date;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export interface EmailExecutionResult {
  messageId: string;
  status: 'sent' | 'scheduled' | 'failed';
  recipient: string;
  template: string;
  timestamp: Date;
  trackingId?: string;
  error?: string;
}

/**
 * Email Executor - Handles email sending with tracking and template support
 */
export class EmailExecutor {
  /**
   * Execute email sending
   */
  static async execute(
    instanceId: string,
    clientId: string,
    vendorId: string,
    config: EmailExecutionConfig,
    variables: Record<string, any> = {},
  ): Promise<EmailExecutionResult> {
    try {
      // Get client details for email
      const { data: client } = await supabase
        .from('clients')
        .select('email, first_name, last_name, phone')
        .eq('id', clientId)
        .single();

      if (!client || !client.email) {
        throw new Error('Client email not found');
      }

      // Get vendor details
      const { data: vendor } = await supabase
        .from('vendors')
        .select('business_name, email, phone')
        .eq('id', vendorId)
        .single();

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Prepare email variables
      const emailVariables = {
        ...variables,
        client_first_name: client.first_name,
        client_last_name: client.last_name,
        client_email: client.email,
        client_phone: client.phone,
        vendor_name: vendor.business_name,
        vendor_email: vendor.email,
        vendor_phone: vendor.phone,
        ...config.variables,
      };

      // Determine recipient
      const recipient = config.to || client.email;

      // Prepare email data
      const emailData = {
        to: recipient,
        templateType: config.template as any,
        templateProps: emailVariables,
        subject:
          config.subject ||
          this.generateSubject(config.template, emailVariables),
        priority: config.priority || 'normal',
        replyTo: config.replyTo || vendor.email,
      };

      // Add CC/BCC if specified
      if (config.cc?.length) {
        (emailData as any).cc = config.cc;
      }
      if (config.bcc?.length) {
        (emailData as any).bcc = config.bcc;
      }

      let result: EmailExecutionResult;

      if (config.scheduleFor && config.scheduleFor > new Date()) {
        // Schedule email for future delivery
        result = await this.scheduleEmail(
          instanceId,
          emailData,
          config.scheduleFor,
        );
      } else {
        // Send email immediately
        const emailResult = await emailService.sendTemplateEmail(emailData);

        result = {
          messageId: emailResult.messageId,
          status: 'sent',
          recipient,
          template: config.template,
          timestamp: new Date(),
          trackingId: emailResult.messageId,
        };
      }

      // Record email event
      await this.recordEmailEvent(instanceId, clientId, result, config);

      // Set up tracking if enabled
      if (config.trackOpens || config.trackClicks) {
        await this.setupEmailTracking(
          result.messageId,
          instanceId,
          clientId,
          config,
        );
      }

      return result;
    } catch (error) {
      console.error('Email execution failed:', error);

      const failedResult: EmailExecutionResult = {
        messageId: '',
        status: 'failed',
        recipient: config.to || 'unknown',
        template: config.template,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Record failed email event
      await this.recordEmailEvent(instanceId, clientId, failedResult, config);

      throw error;
    }
  }

  /**
   * Schedule email for future delivery
   */
  private static async scheduleEmail(
    instanceId: string,
    emailData: any,
    scheduleFor: Date,
  ): Promise<EmailExecutionResult> {
    // In a real implementation, you might use a job queue like Bull or Agenda
    // For now, we'll store in our schedules table

    const { data: schedule } = await supabase
      .from('journey_schedules')
      .insert({
        instance_id: instanceId,
        node_id: 'email_scheduled',
        scheduled_for: scheduleFor.toISOString(),
        schedule_type: 'email_delivery',
        status: 'pending',
        metadata: {
          emailData,
          type: 'email',
        },
      })
      .select()
      .single();

    return {
      messageId: schedule?.id || 'scheduled',
      status: 'scheduled',
      recipient: emailData.to,
      template: emailData.templateType,
      timestamp: new Date(),
    };
  }

  /**
   * Generate subject line if not provided
   */
  private static generateSubject(
    template: string,
    variables: Record<string, any>,
  ): string {
    const subjectMap: Record<string, string> = {
      welcome_vendor_onboarding: 'Welcome to {vendor_name}!',
      form_shared_with_couple: 'Please complete your {vendor_name} form',
      form_reminder: 'Reminder: Complete your form for {vendor_name}',
      timeline_planning: "Let's plan your timeline - {vendor_name}",
      thank_you: 'Thank you from {vendor_name}!',
      contract_reminder: 'Contract reminder from {vendor_name}',
      payment_due: 'Payment due - {vendor_name}',
      event_confirmation: 'Event confirmation - {vendor_name}',
    };

    let subject = subjectMap[template] || 'Message from {vendor_name}';

    // Replace variables in subject
    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    return subject;
  }

  /**
   * Record email event in the database
   */
  private static async recordEmailEvent(
    instanceId: string,
    clientId: string,
    result: EmailExecutionResult,
    config: EmailExecutionConfig,
  ) {
    try {
      await supabase.from('journey_events').insert({
        instance_id: instanceId,
        client_id: clientId,
        event_type: result.status === 'failed' ? 'email_failed' : 'email_sent',
        event_source: 'system',
        event_data: {
          messageId: result.messageId,
          template: result.template,
          recipient: result.recipient,
          subject: config.subject,
          status: result.status,
          timestamp: result.timestamp.toISOString(),
          trackingEnabled: {
            opens: config.trackOpens || false,
            clicks: config.trackClicks || false,
          },
          error: result.error,
        },
      });
    } catch (error) {
      console.error('Failed to record email event:', error);
    }
  }

  /**
   * Set up email tracking
   */
  private static async setupEmailTracking(
    messageId: string,
    instanceId: string,
    clientId: string,
    config: EmailExecutionConfig,
  ) {
    // Create tracking record
    try {
      const trackingData = {
        message_id: messageId,
        instance_id: instanceId,
        client_id: clientId,
        template: config.template,
        track_opens: config.trackOpens || false,
        track_clicks: config.trackClicks || false,
        created_at: new Date().toISOString(),
        status: 'active',
      };

      // Store tracking data (you might want to create a separate tracking table)
      await supabase.from('journey_events').insert({
        instance_id: instanceId,
        client_id: clientId,
        event_type: 'email_tracking_setup',
        event_source: 'system',
        event_data: trackingData,
      });
    } catch (error) {
      console.error('Failed to setup email tracking:', error);
    }
  }

  /**
   * Handle email opened event
   */
  static async handleEmailOpened(
    messageId: string,
    timestamp: Date = new Date(),
  ) {
    try {
      // Find the tracking record
      const { data: events } = await supabase
        .from('journey_events')
        .select('*')
        .eq('event_type', 'email_tracking_setup')
        .contains('event_data', { message_id: messageId })
        .limit(1);

      if (!events || events.length === 0) {
        console.warn(`No tracking record found for message: ${messageId}`);
        return;
      }

      const trackingEvent = events[0];

      // Record the open event
      await supabase.from('journey_events').insert({
        instance_id: trackingEvent.instance_id,
        client_id: trackingEvent.client_id,
        event_type: 'email_opened',
        event_source: 'webhook',
        event_data: {
          messageId,
          openedAt: timestamp.toISOString(),
          userAgent: '', // Could be populated from webhook data
          ipAddress: '', // Could be populated from webhook data
        },
      });

      console.log(`Email opened event recorded for message: ${messageId}`);
    } catch (error) {
      console.error('Failed to handle email opened event:', error);
    }
  }

  /**
   * Handle email clicked event
   */
  static async handleEmailClicked(
    messageId: string,
    clickedUrl: string,
    timestamp: Date = new Date(),
  ) {
    try {
      // Find the tracking record
      const { data: events } = await supabase
        .from('journey_events')
        .select('*')
        .eq('event_type', 'email_tracking_setup')
        .contains('event_data', { message_id: messageId })
        .limit(1);

      if (!events || events.length === 0) {
        console.warn(`No tracking record found for message: ${messageId}`);
        return;
      }

      const trackingEvent = events[0];

      // Record the click event
      await supabase.from('journey_events').insert({
        instance_id: trackingEvent.instance_id,
        client_id: trackingEvent.client_id,
        event_type: 'email_clicked',
        event_source: 'webhook',
        event_data: {
          messageId,
          clickedUrl,
          clickedAt: timestamp.toISOString(),
          userAgent: '', // Could be populated from webhook data
          ipAddress: '', // Could be populated from webhook data
        },
      });

      console.log(
        `Email clicked event recorded for message: ${messageId}, URL: ${clickedUrl}`,
      );
    } catch (error) {
      console.error('Failed to handle email clicked event:', error);
    }
  }

  /**
   * Handle email bounced event
   */
  static async handleEmailBounced(
    messageId: string,
    bounceType: 'hard' | 'soft',
    reason: string,
    timestamp: Date = new Date(),
  ) {
    try {
      // Find the tracking record
      const { data: events } = await supabase
        .from('journey_events')
        .select('*')
        .eq('event_type', 'email_tracking_setup')
        .contains('event_data', { message_id: messageId })
        .limit(1);

      if (!events || events.length === 0) {
        console.warn(`No tracking record found for message: ${messageId}`);
        return;
      }

      const trackingEvent = events[0];

      // Record the bounce event
      await supabase.from('journey_events').insert({
        instance_id: trackingEvent.instance_id,
        client_id: trackingEvent.client_id,
        event_type: 'email_bounced',
        event_source: 'webhook',
        event_data: {
          messageId,
          bounceType,
          reason,
          bouncedAt: timestamp.toISOString(),
        },
      });

      // If hard bounce, mark email as invalid
      if (bounceType === 'hard') {
        await supabase
          .from('clients')
          .update({
            email_status: 'invalid',
            email_bounce_reason: reason,
          })
          .eq('id', trackingEvent.client_id);
      }

      console.log(
        `Email bounced event recorded for message: ${messageId}, type: ${bounceType}`,
      );
    } catch (error) {
      console.error('Failed to handle email bounced event:', error);
    }
  }

  /**
   * Get email delivery statistics
   */
  static async getEmailStats(
    instanceId?: string,
    journeyId?: string,
  ): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  }> {
    try {
      let query = supabase.from('journey_events').select('event_type');

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }
      if (journeyId) {
        query = query.eq('journey_id', journeyId);
      }

      query = query.in('event_type', [
        'email_sent',
        'email_delivered',
        'email_opened',
        'email_clicked',
        'email_bounced',
        'email_failed',
      ]);

      const { data: events } = await query;

      const stats = {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
      };

      events?.forEach((event) => {
        switch (event.event_type) {
          case 'email_sent':
            stats.sent++;
            break;
          case 'email_delivered':
            stats.delivered++;
            break;
          case 'email_opened':
            stats.opened++;
            break;
          case 'email_clicked':
            stats.clicked++;
            break;
          case 'email_bounced':
            stats.bounced++;
            break;
          case 'email_failed':
            stats.failed++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get email stats:', error);
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
      };
    }
  }

  /**
   * Validate email configuration
   */
  static validateConfig(config: EmailExecutionConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.template) {
      errors.push('Template is required');
    }

    if (config.to && !this.isValidEmail(config.to)) {
      errors.push('Invalid recipient email address');
    }

    if (config.cc?.some((email) => !this.isValidEmail(email))) {
      errors.push('Invalid CC email address');
    }

    if (config.bcc?.some((email) => !this.isValidEmail(email))) {
      errors.push('Invalid BCC email address');
    }

    if (config.replyTo && !this.isValidEmail(config.replyTo)) {
      errors.push('Invalid reply-to email address');
    }

    if (config.scheduleFor && config.scheduleFor <= new Date()) {
      errors.push('Schedule time must be in the future');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email address format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
