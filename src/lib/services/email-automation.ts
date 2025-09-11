/**
 * WS-142: Customer Success - Email Automation Service
 * Automated email sequences and intervention communications
 */

import { z } from 'zod';

// Type definitions
export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  metadata: EmailTemplateMetadata;
  isActive: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailTemplateType =
  | 'onboarding_welcome'
  | 'milestone_celebration'
  | 'risk_intervention'
  | 'feature_promotion'
  | 'engagement_boost'
  | 'support_followup'
  | 'success_check_in'
  | 'renewal_reminder'
  | 'churn_prevention'
  | 'feedback_request';

export interface EmailTemplateMetadata {
  category: 'transactional' | 'marketing' | 'support' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedOpenRate: number;
  expectedClickRate: number;
  tags: string[];
}

export interface EmailSequence {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  steps: EmailSequenceStep[];
  triggers: EmailSequenceTrigger[];
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSequenceStep {
  stepId: string;
  templateId: string;
  delayHours: number;
  conditions?: EmailStepCondition[];
  isActive: boolean;
}

export interface EmailStepCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: any;
}

export interface EmailSequenceTrigger {
  event: string;
  conditions: Record<string, any>;
}

export interface EmailJob {
  id: string;
  userId: string;
  templateId: string;
  sequenceId?: string;
  sequenceStepId?: string;
  personalizations: Record<string, any>;
  scheduledAt: Date;
  status: EmailJobStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
  error?: string;
  deliveryResult?: EmailDeliveryResult;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailJobStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'cancelled'
  | 'bounced'
  | 'spam'
  | 'unsubscribed';

export interface EmailDeliveryResult {
  messageId: string;
  provider: 'sendgrid' | 'resend' | 'ses';
  deliveredAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  spamAt?: Date;
  unsubscribedAt?: Date;
  events: EmailEvent[];
}

export interface EmailEvent {
  type:
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'spam'
    | 'unsubscribed';
  timestamp: Date;
  data?: Record<string, any>;
}

export interface EmailMetrics {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  spamRate: number;
  unsubscribeRate: number;
  averageDeliveryTime: number;
}

export interface UserEmailPreferences {
  userId: string;
  allowMarketing: boolean;
  allowTransactional: boolean;
  allowSupport: boolean;
  allowSuccess: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  timezone: string;
  quietHours: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  unsubscribedFrom: string[];
  lastUpdated: Date;
}

// Validation schemas
const emailTemplateSchema = z.object({
  name: z.string().min(3).max(100),
  type: z.enum([
    'onboarding_welcome',
    'milestone_celebration',
    'risk_intervention',
    'feature_promotion',
    'engagement_boost',
    'support_followup',
    'success_check_in',
    'renewal_reminder',
    'churn_prevention',
    'feedback_request',
  ]),
  subject: z.string().min(5).max(200),
  htmlContent: z.string(),
  textContent: z.string(),
  variables: z.array(z.string()).default([]),
  metadata: z.object({
    category: z.enum(['transactional', 'marketing', 'support', 'success']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    expectedOpenRate: z.number().min(0).max(1).default(0.25),
    expectedClickRate: z.number().min(0).max(1).default(0.05),
    tags: z.array(z.string()).default([]),
  }),
  isActive: z.boolean().default(true),
  organizationId: z.string().uuid().optional(),
});

const emailJobSchema = z.object({
  userId: z.string().uuid(),
  templateId: z.string(),
  sequenceId: z.string().optional(),
  sequenceStepId: z.string().optional(),
  personalizations: z.record(z.any()).default({}),
  scheduledAt: z.date().default(() => new Date()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  maxAttempts: z.number().min(1).max(5).default(3),
});

class EmailAutomationService {
  private templates = new Map<string, EmailTemplate>();
  private sequences = new Map<string, EmailSequence>();
  private jobs = new Map<string, EmailJob>();
  private userPreferences = new Map<string, UserEmailPreferences>();
  private isProcessing = false;

  /**
   * Create an email template
   */
  async createEmailTemplate(
    templateData: z.infer<typeof emailTemplateSchema>,
    organizationId?: string,
  ): Promise<EmailTemplate> {
    const validatedData = emailTemplateSchema.parse(templateData);

    const template: EmailTemplate = {
      id: crypto.randomUUID(),
      name: validatedData.name,
      type: validatedData.type,
      subject: validatedData.subject,
      htmlContent: validatedData.htmlContent,
      textContent: validatedData.textContent,
      variables: validatedData.variables,
      metadata: validatedData.metadata,
      isActive: validatedData.isActive,
      organizationId: organizationId || validatedData.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Send intervention email
   */
  async sendInterventionEmail(
    userId: string,
    templateId: string,
    personalizations: Record<string, any> = {},
  ): Promise<EmailDeliveryResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Email template not found: ${templateId}`);
    }

    if (!template.isActive) {
      throw new Error(`Email template is inactive: ${templateId}`);
    }

    // Check user email preferences
    const canSend = await this.checkUserEmailPermissions(userId, template);
    if (!canSend) {
      throw new Error(
        `User has opted out of ${template.metadata.category} emails`,
      );
    }

    // Create email job
    const job = await this.createEmailJob({
      userId,
      templateId,
      personalizations,
      scheduledAt: new Date(),
      priority: template.metadata.priority,
    });

    // Process email immediately for intervention emails
    return await this.processEmailJob(job.id);
  }

  /**
   * Start email sequence for user
   */
  async startEmailSequence(
    userId: string,
    sequenceId: string,
    personalizations: Record<string, any> = {},
  ): Promise<EmailJob[]> {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Email sequence not found: ${sequenceId}`);
    }

    if (!sequence.isActive) {
      throw new Error(`Email sequence is inactive: ${sequenceId}`);
    }

    const jobs: EmailJob[] = [];
    let cumulativeDelay = 0;

    for (const step of sequence.steps) {
      if (!step.isActive) continue;

      const template = this.templates.get(step.templateId);
      if (!template || !template.isActive) continue;

      // Check step conditions if any
      if (step.conditions && step.conditions.length > 0) {
        const conditionsMet = await this.evaluateStepConditions(
          step.conditions,
          userId,
          personalizations,
        );
        if (!conditionsMet) continue;
      }

      cumulativeDelay += step.delayHours;
      const scheduledAt = new Date(
        Date.now() + cumulativeDelay * 60 * 60 * 1000,
      );

      const job = await this.createEmailJob({
        userId,
        templateId: step.templateId,
        sequenceId,
        sequenceStepId: step.stepId,
        personalizations,
        scheduledAt,
        priority: template.metadata.priority,
      });

      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Create email job
   */
  private async createEmailJob(
    jobData: z.infer<typeof emailJobSchema>,
  ): Promise<EmailJob> {
    const validatedData = emailJobSchema.parse(jobData);

    const job: EmailJob = {
      id: crypto.randomUUID(),
      userId: validatedData.userId,
      templateId: validatedData.templateId,
      sequenceId: validatedData.sequenceId,
      sequenceStepId: validatedData.sequenceStepId,
      personalizations: validatedData.personalizations,
      scheduledAt: validatedData.scheduledAt,
      status: 'pending',
      priority: validatedData.priority,
      attempts: 0,
      maxAttempts: validatedData.maxAttempts,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Process email job
   */
  async processEmailJob(jobId: string): Promise<EmailDeliveryResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Email job not found: ${jobId}`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Email job cannot be processed in status: ${job.status}`);
    }

    job.status = 'processing';
    job.attempts++;
    job.lastAttemptAt = new Date();
    job.updatedAt = new Date();

    try {
      // Get template
      const template = this.templates.get(job.templateId);
      if (!template) {
        throw new Error(`Template not found: ${job.templateId}`);
      }

      // Check user preferences again (they might have changed)
      const canSend = await this.checkUserEmailPermissions(
        job.userId,
        template,
      );
      if (!canSend) {
        job.status = 'cancelled';
        job.updatedAt = new Date();
        throw new Error('User has opted out of this email type');
      }

      // Get user data for personalization
      const userData = await this.getUserData(job.userId);

      // Merge personalizations
      const allPersonalizations = {
        ...userData,
        ...job.personalizations,
      };

      // Render template
      const renderedEmail = await this.renderTemplate(
        template,
        allPersonalizations,
      );

      // Send email via provider
      const deliveryResult = await this.sendViaProvider(
        userData.email,
        renderedEmail.subject,
        renderedEmail.htmlContent,
        renderedEmail.textContent,
      );

      // Update job status
      job.status = 'sent';
      job.completedAt = new Date();
      job.deliveryResult = deliveryResult;
      job.updatedAt = new Date();

      this.jobs.set(jobId, job);

      return deliveryResult;
    } catch (error) {
      console.error(`Email job ${jobId} failed:`, error);

      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
      } else {
        job.status = 'pending'; // Will be retried
      }

      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      throw error;
    }
  }

  /**
   * Check user email permissions
   */
  private async checkUserEmailPermissions(
    userId: string,
    template: EmailTemplate,
  ): Promise<boolean> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) {
      // Default to allowing all if no preferences set
      return true;
    }

    // Check if user has unsubscribed from this template type
    if (preferences.unsubscribedFrom.includes(template.type)) {
      return false;
    }

    // Check category permissions
    switch (template.metadata.category) {
      case 'transactional':
        return preferences.allowTransactional;
      case 'marketing':
        return preferences.allowMarketing;
      case 'support':
        return preferences.allowSupport;
      case 'success':
        return preferences.allowSuccess;
      default:
        return true;
    }
  }

  /**
   * Evaluate step conditions
   */
  private async evaluateStepConditions(
    conditions: EmailStepCondition[],
    userId: string,
    personalizations: Record<string, any>,
  ): Promise<boolean> {
    // This would typically evaluate conditions against user data
    // For now, return true (all conditions met)
    return true;
  }

  /**
   * Get user data for personalization
   */
  private async getUserData(userId: string): Promise<Record<string, any>> {
    // This would typically fetch user data from database
    // Mock implementation for now
    return {
      userId,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      organizationName: 'Example Corp',
      timezone: 'UTC',
    };
  }

  /**
   * Render email template with personalizations
   */
  private async renderTemplate(
    template: EmailTemplate,
    personalizations: Record<string, any>,
  ): Promise<{ subject: string; htmlContent: string; textContent: string }> {
    const renderText = (text: string): string => {
      let rendered = text;

      // Replace template variables with personalized values
      for (const [key, value] of Object.entries(personalizations)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        rendered = rendered.replace(regex, String(value));
      }

      return rendered;
    };

    return {
      subject: renderText(template.subject),
      htmlContent: renderText(template.htmlContent),
      textContent: renderText(template.textContent),
    };
  }

  /**
   * Send email via provider
   */
  private async sendViaProvider(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string,
  ): Promise<EmailDeliveryResult> {
    // This would typically use SendGrid, Resend, or SES
    // Mock implementation for now
    const messageId = crypto.randomUUID();

    return {
      messageId,
      provider: 'sendgrid',
      deliveredAt: new Date(),
      events: [
        {
          type: 'sent',
          timestamp: new Date(),
        },
      ],
    };
  }

  /**
   * Process scheduled email jobs
   */
  async processScheduledJobs(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const pendingJobs = Array.from(this.jobs.values())
        .filter((job) => job.status === 'pending' && job.scheduledAt <= now)
        .sort((a, b) => {
          // Process high priority jobs first
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

      for (const job of pendingJobs) {
        try {
          await this.processEmailJob(job.id);
        } catch (error) {
          console.error(`Failed to process email job ${job.id}:`, error);
        }

        // Small delay between jobs to avoid overwhelming the provider
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get email metrics
   */
  getEmailMetrics(
    templateId?: string,
    timeframe?: { start: Date; end: Date },
  ): EmailMetrics {
    let jobs = Array.from(this.jobs.values());

    // Filter by template if specified
    if (templateId) {
      jobs = jobs.filter((job) => job.templateId === templateId);
    }

    // Filter by timeframe if specified
    if (timeframe) {
      jobs = jobs.filter(
        (job) =>
          job.createdAt >= timeframe.start && job.createdAt <= timeframe.end,
      );
    }

    const totalSent = jobs.filter((job) =>
      ['sent', 'delivered', 'opened', 'clicked'].includes(job.status),
    ).length;

    if (totalSent === 0) {
      return {
        totalSent: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        spamRate: 0,
        unsubscribeRate: 0,
        averageDeliveryTime: 0,
      };
    }

    const delivered = jobs.filter(
      (job) => job.status === 'delivered' || job.deliveryResult?.deliveredAt,
    ).length;
    const opened = jobs.filter(
      (job) => job.status === 'opened' || job.deliveryResult?.openedAt,
    ).length;
    const clicked = jobs.filter(
      (job) => job.status === 'clicked' || job.deliveryResult?.clickedAt,
    ).length;
    const bounced = jobs.filter((job) => job.status === 'bounced').length;
    const spam = jobs.filter((job) => job.status === 'spam').length;
    const unsubscribed = jobs.filter(
      (job) => job.status === 'unsubscribed',
    ).length;

    return {
      totalSent,
      deliveryRate: delivered / totalSent,
      openRate: opened / totalSent,
      clickRate: clicked / totalSent,
      bounceRate: bounced / totalSent,
      spamRate: spam / totalSent,
      unsubscribeRate: unsubscribed / totalSent,
      averageDeliveryTime: 0, // Would calculate from actual delivery times
    };
  }

  /**
   * Cancel email job
   */
  async cancelEmailJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      job.status = 'cancelled';
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);
      return true;
    }

    return false;
  }

  /**
   * Update user email preferences
   */
  async updateUserEmailPreferences(
    userId: string,
    preferences: Partial<UserEmailPreferences>,
  ): Promise<UserEmailPreferences> {
    const existing = this.userPreferences.get(userId) || {
      userId,
      allowMarketing: true,
      allowTransactional: true,
      allowSupport: true,
      allowSuccess: true,
      frequency: 'immediate',
      timezone: 'UTC',
      quietHours: { start: '22:00', end: '08:00' },
      unsubscribedFrom: [],
      lastUpdated: new Date(),
    };

    const updated: UserEmailPreferences = {
      ...existing,
      ...preferences,
      lastUpdated: new Date(),
    };

    this.userPreferences.set(userId, updated);
    return updated;
  }

  /**
   * Get user email preferences
   */
  getUserEmailPreferences(userId: string): UserEmailPreferences | null {
    return this.userPreferences.get(userId) || null;
  }

  /**
   * Get email template by ID
   */
  getEmailTemplate(templateId: string): EmailTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all email templates
   */
  getEmailTemplates(organizationId?: string): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(
      (template) =>
        !organizationId || template.organizationId === organizationId,
    );
  }

  /**
   * Get email job status
   */
  getEmailJobStatus(jobId: string): EmailJob | null {
    return this.jobs.get(jobId) || null;
  }
}

// Export singleton instance
export const emailAutomation = new EmailAutomationService();
