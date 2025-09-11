/**
 * Advanced Form Builder Engine - Email Automation Engine
 * Handles sophisticated email sequences and automation for wedding suppliers
 *
 * Wedding Industry Focus:
 * - Welcome sequences for new inquiries
 * - Contract follow-up automation
 * - Wedding timeline coordination
 * - Post-wedding review requests
 * - Seasonal promotional campaigns
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bull';
import {
  FormSubmission,
  WeddingClientInfo,
  FormIntegrationConfig,
  ResendConfig,
  FormIntegrationResult,
} from '@/types/integrations';

// Email-Specific Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  template_variables: string[];
  wedding_context?:
    | 'inquiry'
    | 'contract'
    | 'timeline'
    | 'post_wedding'
    | 'promotional';
  service_type?: string[];
  personalization_rules?: PersonalizationRule[];
}

export interface PersonalizationRule {
  condition: string; // JavaScript expression
  modifications: {
    subject?: string;
    content_additions?: string;
    tone?: 'formal' | 'casual' | 'luxury' | 'friendly';
    timing_adjustment?: number; // minutes
  };
}

export interface EmailSequence {
  id: string;
  name: string;
  description: string;
  trigger_type:
    | 'form_submission'
    | 'date_based'
    | 'manual'
    | 'webhook'
    | 'behavior';
  trigger_condition?: string;
  emails: SequenceEmail[];
  wedding_context?: WeddingSequenceContext;
  active: boolean;
}

export interface SequenceEmail {
  email_template_id: string;
  delay_minutes: number;
  conditions?: string[]; // JavaScript expressions for conditional sending
  personalization_overrides?: Record<string, any>;
  wedding_specific_logic?: {
    skip_if_wedding_within_days?: number;
    priority_if_urgent?: boolean;
    seasonal_adjustments?: boolean;
  };
}

export interface WeddingSequenceContext {
  service_type: string;
  typical_inquiry_to_booking: number; // days
  contract_send_delay: number; // days after inquiry
  timeline_coordination_start: number; // days before wedding
  post_wedding_followup: number; // days after wedding
  seasonal_promotions?: {
    peak_season_months: number[];
    off_season_incentives: string[];
  };
}

export interface EmailJob {
  id: string;
  recipient_email: string;
  template_id: string;
  sequence_id?: string;
  variables: Record<string, any>;
  scheduled_for: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  wedding_context?: {
    wedding_date?: string;
    days_until_wedding?: number;
    service_type?: string;
    urgency_level?: 'low' | 'medium' | 'high' | 'critical';
  };
  retry_count: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
}

export interface EmailResult {
  success: boolean;
  message_id?: string;
  recipient: string;
  template_used: string;
  delivery_time: number; // ms
  opens?: number;
  clicks?: number;
  bounced?: boolean;
  complained?: boolean;
  error_message?: string;
}

export interface EmailAnalytics {
  template_id: string;
  sequence_id?: string;
  period_start: string;
  period_end: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  conversion_rate?: number; // bookings from this email
  wedding_performance?: {
    by_service_type: Record<string, EmailMetrics>;
    by_season: Record<string, EmailMetrics>;
    by_urgency: Record<string, EmailMetrics>;
  };
}

export interface EmailMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

// Main Email Automation Engine
export class EmailAutomationEngine {
  private resend: Resend;
  private supabase: any;
  private emailQueue: Queue;
  private templates: Map<string, EmailTemplate>;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY!);

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.emailQueue = new Queue('email-automation-jobs', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.templates = new Map();
    this.initializeEmailProcessor();
    this.loadEmailTemplates();
  }

  /**
   * Process form submission and trigger appropriate email sequences
   */
  async processFormSubmission(
    submission: FormSubmission,
    config: FormIntegrationConfig,
  ): Promise<FormIntegrationResult> {
    const startTime = Date.now();

    try {
      console.log(
        `📧 Processing email automation for submission ${submission.id}`,
      );

      // Determine appropriate email sequence based on submission data
      const sequences = await this.getTriggeredSequences(submission);

      if (sequences.length === 0) {
        console.log(
          `ℹ️ No email sequences triggered for ${submission.client_info.email}`,
        );
        return {
          integration_id: `email_${submission.id}_${startTime}`,
          provider: 'resend',
          status: 'success',
          records_created: 0,
          execution_time: Date.now() - startTime,
          retry_count: 0,
        };
      }

      let totalEmailsScheduled = 0;
      const results: EmailResult[] = [];

      // Process each triggered sequence
      for (const sequence of sequences) {
        try {
          const sequenceResult = await this.startEmailSequence(
            submission,
            sequence,
          );
          totalEmailsScheduled += sequenceResult.emails_scheduled;
          results.push(...sequenceResult.results);

          console.log(
            `✅ Started sequence '${sequence.name}' for ${submission.client_info.email}`,
          );
        } catch (error) {
          console.error(
            `❌ Failed to start sequence '${sequence.name}':`,
            error,
          );
        }
      }

      // Log email automation activity
      await this.logEmailActivity('form_submission_processed', {
        submission_id: submission.id,
        sequences_triggered: sequences.map((s) => s.id),
        total_emails_scheduled: totalEmailsScheduled,
        execution_time: Date.now() - startTime,
      });

      console.log(
        `📧 Email automation completed for ${submission.client_info.email} - ${totalEmailsScheduled} emails scheduled`,
      );

      return {
        integration_id: `email_${submission.id}_${startTime}`,
        provider: 'resend',
        status: 'success',
        records_created: totalEmailsScheduled,
        execution_time: Date.now() - startTime,
        retry_count: 0,
        wedding_context: {
          affects_wedding_day: this.checkWeddingDayImpact(submission),
          urgency_level: this.calculateEmailUrgency(submission),
          wedding_date: submission.client_info.wedding_date,
          days_until_wedding: this.getDaysUntilWedding(submission),
          service_criticality: 'important',
        },
      };
    } catch (error) {
      console.error(`💥 Email automation failed for ${submission.id}:`, error);

      await this.logEmailActivity('processing_failed', {
        submission_id: submission.id,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - startTime,
      });

      return {
        integration_id: `email_${submission.id}_${startTime}`,
        provider: 'resend',
        status: 'failed',
        records_created: 0,
        records_failed: 1,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - startTime,
        retry_count: 0,
      };
    }
  }

  /**
   * Create and configure email sequence for wedding workflows
   */
  async createEmailSequence(config: EmailSequence): Promise<string> {
    try {
      // Validate sequence configuration
      const validation = this.validateSequenceConfig(config);
      if (!validation.valid) {
        throw new Error(
          `Invalid sequence config: ${validation.errors.join(', ')}`,
        );
      }

      // Save sequence to database
      const { data, error } = await this.supabase
        .from('email_sequences')
        .insert({
          name: config.name,
          description: config.description,
          trigger_type: config.trigger_type,
          trigger_condition: config.trigger_condition,
          emails: config.emails,
          wedding_context: config.wedding_context,
          active: config.active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save email sequence: ${error.message}`);
      }

      console.log(
        `✅ Created email sequence '${config.name}' with ID: ${data.id}`,
      );
      return data.id;
    } catch (error) {
      console.error(`❌ Failed to create email sequence:`, error);
      throw error;
    }
  }

  /**
   * Trigger welcome email sequence for new inquiry
   */
  async triggerWelcomeEmail(
    submission: FormSubmission,
    customizations?: {
      template_overrides?: Record<string, any>;
      delay_override?: number;
      priority_level?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ): Promise<EmailResult> {
    try {
      // Get welcome email template based on service type
      const template = await this.getWelcomeTemplate(
        submission.client_info.service_type,
      );
      if (!template) {
        throw new Error(
          `No welcome template found for service type: ${submission.client_info.service_type}`,
        );
      }

      // Personalize template variables
      const variables = this.buildTemplateVariables(submission, template);

      // Apply customizations if provided
      if (customizations?.template_overrides) {
        Object.assign(variables, customizations.template_overrides);
      }

      // Apply wedding-specific personalization
      const personalizedTemplate = await this.personalizeForWedding(
        template,
        submission,
      );

      // Schedule immediate email or with delay
      const delay = customizations?.delay_override || 0;
      const priority =
        customizations?.priority_level ||
        this.calculateEmailPriority(submission);

      const emailJob: EmailJob = {
        id: `welcome_${submission.id}_${Date.now()}`,
        recipient_email: submission.client_info.email,
        template_id: personalizedTemplate.id,
        variables,
        scheduled_for: new Date(Date.now() + delay * 60000).toISOString(),
        priority,
        wedding_context: {
          wedding_date: submission.client_info.wedding_date,
          days_until_wedding: this.getDaysUntilWedding(submission),
          service_type: submission.client_info.service_type,
          urgency_level: this.calculateEmailUrgency(submission),
        },
        retry_count: 0,
        status: 'pending',
      };

      // Add to email queue
      await this.emailQueue.add('send-welcome-email', emailJob, {
        priority: this.getQueuePriority(priority),
        delay: delay * 60000,
      });

      console.log(
        `📧 Welcome email scheduled for ${submission.client_info.email} with ${delay} minute delay`,
      );

      return {
        success: true,
        recipient: submission.client_info.email,
        template_used: personalizedTemplate.id,
        delivery_time: 0, // Will be updated when actually sent
      };
    } catch (error) {
      console.error(`❌ Failed to trigger welcome email:`, error);
      return {
        success: false,
        recipient: submission.client_info.email,
        template_used: '',
        delivery_time: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule follow-up emails based on wedding timeline
   */
  async scheduleFollowUpEmails(
    clientId: string,
    weddingDate: string,
    serviceType: string,
    schedule: { template_id: string; days_before_wedding: number }[],
  ): Promise<void> {
    try {
      const weddingDateTime = new Date(weddingDate).getTime();
      const now = Date.now();

      for (const item of schedule) {
        const daysBeforeWedding = item.days_before_wedding;
        const scheduledTime =
          weddingDateTime - daysBeforeWedding * 24 * 60 * 60 * 1000;

        // Only schedule future emails
        if (scheduledTime > now) {
          const template = await this.getTemplate(item.template_id);
          if (!template) {
            console.warn(`Template ${item.template_id} not found, skipping`);
            continue;
          }

          // Get client information
          const { data: client } = await this.supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

          if (!client) {
            console.warn(
              `Client ${clientId} not found, skipping follow-up emails`,
            );
            return;
          }

          const emailJob: EmailJob = {
            id: `followup_${clientId}_${item.template_id}_${Date.now()}`,
            recipient_email: client.email,
            template_id: item.template_id,
            variables: this.buildClientVariables(client, daysBeforeWedding),
            scheduled_for: new Date(scheduledTime).toISOString(),
            priority: daysBeforeWedding <= 7 ? 'high' : 'normal',
            wedding_context: {
              wedding_date: weddingDate,
              days_until_wedding: daysBeforeWedding,
              service_type: serviceType,
              urgency_level:
                daysBeforeWedding <= 3
                  ? 'critical'
                  : daysBeforeWedding <= 7
                    ? 'high'
                    : 'medium',
            },
            retry_count: 0,
            status: 'pending',
          };

          await this.emailQueue.add('send-followup-email', emailJob, {
            delay: scheduledTime - now,
            priority: this.getQueuePriority(emailJob.priority),
          });

          console.log(
            `📧 Follow-up email scheduled for ${daysBeforeWedding} days before wedding`,
          );
        }
      }
    } catch (error) {
      console.error(`❌ Failed to schedule follow-up emails:`, error);
      throw error;
    }
  }

  /**
   * Process email templates with wedding-specific variables
   */
  async processEmailTemplates(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): Promise<{ subject: string; html: string; text?: string }> {
    try {
      // Process subject line
      let subject = template.subject;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        subject = subject.replace(placeholder, String(value || ''));
      }

      // Process HTML content
      let html = template.html_content;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        html = html.replace(placeholder, String(value || ''));
      }

      // Process text content if available
      let text = template.text_content;
      if (text) {
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          text = text.replace(placeholder, String(value || ''));
        }
      }

      return { subject, html, text };
    } catch (error) {
      console.error(`❌ Failed to process email template:`, error);
      throw error;
    }
  }

  /**
   * Track email engagement and analytics
   */
  async trackEmailEngagement(emailId: string): Promise<EmailAnalytics> {
    try {
      // Get email engagement data from Resend
      // This would integrate with Resend's webhook system or API

      const { data: emailRecord } = await this.supabase
        .from('email_logs')
        .select('*')
        .eq('id', emailId)
        .single();

      if (!emailRecord) {
        throw new Error(`Email record ${emailId} not found`);
      }

      // Calculate engagement metrics
      const analytics: EmailAnalytics = {
        template_id: emailRecord.template_id,
        sequence_id: emailRecord.sequence_id,
        period_start: emailRecord.sent_at,
        period_end: new Date().toISOString(),
        total_sent: 1,
        total_delivered: emailRecord.delivered ? 1 : 0,
        total_opened: emailRecord.opens || 0,
        total_clicked: emailRecord.clicks || 0,
        total_bounced: emailRecord.bounced ? 1 : 0,
        total_complained: emailRecord.complained ? 1 : 0,
        open_rate: emailRecord.opens > 0 ? 100 : 0,
        click_rate:
          emailRecord.clicks > 0
            ? (emailRecord.clicks / (emailRecord.opens || 1)) * 100
            : 0,
        bounce_rate: emailRecord.bounced ? 100 : 0,
        conversion_rate: emailRecord.converted ? 100 : 0,
      };

      return analytics;
    } catch (error) {
      console.error(`❌ Failed to track email engagement:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async getTriggeredSequences(
    submission: FormSubmission,
  ): Promise<EmailSequence[]> {
    const { data: sequences } = await this.supabase
      .from('email_sequences')
      .select('*')
      .eq('active', true)
      .eq('trigger_type', 'form_submission');

    if (!sequences) return [];

    return sequences.filter((sequence: any) => {
      if (sequence.trigger_condition) {
        try {
          // Safe evaluation of trigger condition
          const conditionFn = new Function(
            'submission',
            `return ${sequence.trigger_condition}`,
          );
          return conditionFn(submission);
        } catch (error) {
          console.warn(
            `Invalid trigger condition for sequence ${sequence.id}:`,
            error,
          );
          return false;
        }
      }
      return true;
    });
  }

  private async startEmailSequence(
    submission: FormSubmission,
    sequence: EmailSequence,
  ): Promise<{ emails_scheduled: number; results: EmailResult[] }> {
    const results: EmailResult[] = [];
    let emailsScheduled = 0;

    for (const sequenceEmail of sequence.emails) {
      try {
        // Check conditions if specified
        if (sequenceEmail.conditions) {
          const shouldSend = sequenceEmail.conditions.every((condition) => {
            try {
              const conditionFn = new Function(
                'submission',
                `return ${condition}`,
              );
              return conditionFn(submission);
            } catch (error) {
              console.warn(`Invalid condition: ${condition}`, error);
              return false;
            }
          });

          if (!shouldSend) {
            console.log(`Skipping email due to failed conditions`);
            continue;
          }
        }

        // Apply wedding-specific logic
        if (sequenceEmail.wedding_specific_logic) {
          const logic = sequenceEmail.wedding_specific_logic;
          const daysUntilWedding = this.getDaysUntilWedding(submission);

          if (
            logic.skip_if_wedding_within_days &&
            daysUntilWedding <= logic.skip_if_wedding_within_days
          ) {
            console.log(
              `Skipping email - wedding is within ${logic.skip_if_wedding_within_days} days`,
            );
            continue;
          }
        }

        // Get template and build variables
        const template = await this.getTemplate(
          sequenceEmail.email_template_id,
        );
        if (!template) {
          console.warn(`Template ${sequenceEmail.email_template_id} not found`);
          continue;
        }

        const variables = this.buildTemplateVariables(submission, template);

        // Apply personalization overrides
        if (sequenceEmail.personalization_overrides) {
          Object.assign(variables, sequenceEmail.personalization_overrides);
        }

        // Calculate priority
        let priority = 'normal' as 'low' | 'normal' | 'high' | 'urgent';
        if (sequenceEmail.wedding_specific_logic?.priority_if_urgent) {
          priority = this.calculateEmailPriority(submission);
        }

        // Schedule email
        const emailJob: EmailJob = {
          id: `seq_${sequence.id}_${sequenceEmail.email_template_id}_${Date.now()}`,
          recipient_email: submission.client_info.email,
          template_id: sequenceEmail.email_template_id,
          sequence_id: sequence.id,
          variables,
          scheduled_for: new Date(
            Date.now() + sequenceEmail.delay_minutes * 60000,
          ).toISOString(),
          priority,
          wedding_context: {
            wedding_date: submission.client_info.wedding_date,
            days_until_wedding: this.getDaysUntilWedding(submission),
            service_type: submission.client_info.service_type,
            urgency_level: this.calculateEmailUrgency(submission),
          },
          retry_count: 0,
          status: 'pending',
        };

        await this.emailQueue.add('send-sequence-email', emailJob, {
          delay: sequenceEmail.delay_minutes * 60000,
          priority: this.getQueuePriority(priority),
        });

        emailsScheduled++;

        results.push({
          success: true,
          recipient: submission.client_info.email,
          template_used: sequenceEmail.email_template_id,
          delivery_time: 0,
        });
      } catch (error) {
        console.error(`Failed to schedule sequence email:`, error);
        results.push({
          success: false,
          recipient: submission.client_info.email,
          template_used: sequenceEmail.email_template_id,
          delivery_time: 0,
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { emails_scheduled: emailsScheduled, results };
  }

  private async initializeEmailProcessor(): Promise<void> {
    // Process welcome emails
    this.emailQueue.process('send-welcome-email', async (job) => {
      return await this.sendEmail(job.data);
    });

    // Process sequence emails
    this.emailQueue.process('send-sequence-email', async (job) => {
      return await this.sendEmail(job.data);
    });

    // Process follow-up emails
    this.emailQueue.process('send-followup-email', async (job) => {
      return await this.sendEmail(job.data);
    });

    // Event listeners
    this.emailQueue.on('completed', (job, result) => {
      console.log(`✅ Email job ${job.id} completed successfully`);
    });

    this.emailQueue.on('failed', (job, error) => {
      console.error(`❌ Email job ${job.id} failed:`, error);
    });
  }

  private async sendEmail(emailJob: EmailJob): Promise<EmailResult> {
    const startTime = Date.now();

    try {
      // Get template
      const template = await this.getTemplate(emailJob.template_id);
      if (!template) {
        throw new Error(`Template ${emailJob.template_id} not found`);
      }

      // Process template with variables
      const processedEmail = await this.processEmailTemplates(
        template,
        emailJob.variables,
      );

      // Send via Resend
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@wedsync.com',
        to: emailJob.recipient_email,
        subject: processedEmail.subject,
        html: processedEmail.html,
        text: processedEmail.text,
        headers: {
          'X-Email-Job-ID': emailJob.id,
          'X-Sequence-ID': emailJob.sequence_id || '',
          'X-Wedding-Context': JSON.stringify(emailJob.wedding_context || {}),
        },
      });

      if (error) {
        throw error;
      }

      // Log successful send
      await this.logEmailSend(emailJob, data?.id || '', true);

      return {
        success: true,
        message_id: data?.id,
        recipient: emailJob.recipient_email,
        template_used: emailJob.template_id,
        delivery_time: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`Failed to send email:`, error);

      // Log failed send
      await this.logEmailSend(
        emailJob,
        '',
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );

      return {
        success: false,
        recipient: emailJob.recipient_email,
        template_used: emailJob.template_id,
        delivery_time: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async loadEmailTemplates(): Promise<void> {
    try {
      const { data: templates } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('active', true);

      if (templates) {
        this.templates.clear();
        templates.forEach((template: EmailTemplate) => {
          this.templates.set(template.id, template);
        });
        console.log(`Loaded ${templates.length} email templates`);
      }
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  }

  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  private async getWelcomeTemplate(
    serviceType: string,
  ): Promise<EmailTemplate | null> {
    for (const [id, template] of this.templates) {
      if (
        template.wedding_context === 'inquiry' &&
        template.service_type?.includes(serviceType)
      ) {
        return template;
      }
    }
    return null;
  }

  private buildTemplateVariables(
    submission: FormSubmission,
    template: EmailTemplate,
  ): Record<string, any> {
    const variables: Record<string, any> = {
      client_name: submission.client_info.name,
      client_email: submission.client_info.email,
      partner_name: submission.client_info.partner_name || '',
      wedding_date: this.formatWeddingDate(submission.client_info.wedding_date),
      venue_name: submission.client_info.venue_name || '',
      guest_count: submission.client_info.guest_count || '',
      service_type: submission.client_info.service_type,
      budget_range: submission.client_info.budget_range || '',
      current_date: new Date().toLocaleDateString(),
      current_year: new Date().getFullYear(),
      days_until_wedding: this.getDaysUntilWedding(submission),
      season: this.getWeddingSeason(submission.client_info.wedding_date),
      urgency_indicator: this.getUrgencyIndicator(submission),
      // Company/vendor specific variables would be added here
      company_name: 'Your Wedding Company', // This would come from organization settings
      company_phone: '(555) 123-4567',
      company_email: 'info@yourcompany.com',
    };

    // Add custom submission data
    Object.keys(submission.submission_data).forEach((key) => {
      variables[`custom_${key}`] = submission.submission_data[key];
    });

    return variables;
  }

  private buildClientVariables(
    client: any,
    daysBeforeWedding: number,
  ): Record<string, any> {
    return {
      client_name: client.name,
      client_email: client.email,
      partner_name: client.partner_name || '',
      wedding_date: this.formatWeddingDate(client.wedding_date),
      venue_name: client.venue_name || '',
      guest_count: client.guest_count || '',
      days_until_wedding: daysBeforeWedding,
      urgency_level: daysBeforeWedding <= 7 ? 'high' : 'normal',
      current_date: new Date().toLocaleDateString(),
    };
  }

  private async personalizeForWedding(
    template: EmailTemplate,
    submission: FormSubmission,
  ): Promise<EmailTemplate> {
    if (!template.personalization_rules) return template;

    let personalizedTemplate = { ...template };

    for (const rule of template.personalization_rules) {
      try {
        const conditionFn = new Function(
          'submission',
          `return ${rule.condition}`,
        );
        if (conditionFn(submission)) {
          // Apply modifications
          if (rule.modifications.subject) {
            personalizedTemplate.subject = rule.modifications.subject;
          }
          if (rule.modifications.content_additions) {
            personalizedTemplate.html_content +=
              rule.modifications.content_additions;
          }
        }
      } catch (error) {
        console.warn(`Invalid personalization rule condition:`, error);
      }
    }

    return personalizedTemplate;
  }

  private checkWeddingDayImpact(submission: FormSubmission): boolean {
    const daysUntilWedding = this.getDaysUntilWedding(submission);
    return daysUntilWedding <= 7 && daysUntilWedding >= 0;
  }

  private calculateEmailUrgency(
    submission: FormSubmission,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntilWedding = this.getDaysUntilWedding(submission);

    if (daysUntilWedding <= 1) return 'critical';
    if (daysUntilWedding <= 7) return 'high';
    if (daysUntilWedding <= 30) return 'medium';
    return 'low';
  }

  private calculateEmailPriority(
    submission: FormSubmission,
  ): 'low' | 'normal' | 'high' | 'urgent' {
    const urgency = this.calculateEmailUrgency(submission);
    const budgetRange = submission.client_info.budget_range;

    if (urgency === 'critical') return 'urgent';
    if (
      urgency === 'high' ||
      budgetRange === 'luxury' ||
      budgetRange === 'ultra-luxury'
    )
      return 'high';
    if (urgency === 'medium') return 'normal';
    return 'low';
  }

  private getDaysUntilWedding(submission: FormSubmission): number {
    if (!submission.client_info.wedding_date) return 999;

    const weddingDate = new Date(submission.client_info.wedding_date);
    const now = new Date();
    return Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private formatWeddingDate(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private getWeddingSeason(dateString?: string): string {
    if (!dateString) return 'unknown';

    const date = new Date(dateString);
    const month = date.getMonth(); // 0-based

    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getUrgencyIndicator(submission: FormSubmission): string {
    const days = this.getDaysUntilWedding(submission);

    if (days <= 1) return '🚨 URGENT - Wedding Tomorrow!';
    if (days <= 7) return '⚡ High Priority - Wedding This Week';
    if (days <= 30) return '📅 Wedding This Month';
    return '';
  }

  private getQueuePriority(
    priority: 'low' | 'normal' | 'high' | 'urgent',
  ): number {
    const priorities = { urgent: 1, high: 5, normal: 10, low: 15 };
    return priorities[priority];
  }

  private validateSequenceConfig(config: EmailSequence): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name) errors.push('Sequence name is required');
    if (!config.trigger_type) errors.push('Trigger type is required');
    if (!config.emails || config.emails.length === 0)
      errors.push('At least one email is required');

    config.emails.forEach((email, index) => {
      if (!email.email_template_id)
        errors.push(`Email ${index + 1} is missing template ID`);
      if (email.delay_minutes < 0)
        errors.push(`Email ${index + 1} has invalid delay`);
    });

    return { valid: errors.length === 0, errors };
  }

  private async logEmailActivity(action: string, details: any): Promise<void> {
    try {
      await this.supabase.from('email_activity_logs').insert({
        action,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log email activity:', error);
    }
  }

  private async logEmailSend(
    emailJob: EmailJob,
    messageId: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.supabase.from('email_logs').insert({
        job_id: emailJob.id,
        recipient: emailJob.recipient_email,
        template_id: emailJob.template_id,
        sequence_id: emailJob.sequence_id,
        message_id: messageId,
        status: success ? 'sent' : 'failed',
        error_message: errorMessage,
        wedding_context: emailJob.wedding_context,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log email send:', error);
    }
  }
}

// Export singleton instance
export const emailAutomationEngine = new EmailAutomationEngine();
