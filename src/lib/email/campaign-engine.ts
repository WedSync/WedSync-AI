import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import { sendEmail, trackEmailEvent } from './service';
import { generateABVariant, selectVariantForUser } from './ab-testing';
import { trackCampaignEvent } from '../integrations/email-analytics';

// Types for campaign management
export interface TrialUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  trialStartDate: Date;
  trialEndDate: Date;
  planType: 'basic' | 'professional' | 'enterprise';
  featuresUsed: string[];
  lastActiveAt: Date;
  timezone: string;
  preferredLanguage?: string;
}

export interface TrialEvent {
  userId: string;
  type:
    | 'trial_started'
    | 'feature_used'
    | 'trial_ending'
    | 'extension_requested'
    | 'milestone_reached';
  progress: number; // 0-100
  daysRemaining: number;
  userEmail: string;
  timezone: string;
  metadata?: Record<string, any>;
}

export interface EmailCampaign {
  id: string;
  name: string;
  type: 'onboarding' | 'engagement' | 'conversion' | 'retention';
  triggerEvent: TrialEvent['type'];
  delayMinutes?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  templates: EmailTemplate[];
  conditions: CampaignCondition[];
  abTestEnabled?: boolean;
}

export interface EmailTemplate {
  id: string;
  campaignId: string;
  subject: (data: TemplateData) => string;
  htmlContent: (data: TemplateData) => string;
  textContent: (data: TemplateData) => string;
  previewText?: string;
  personalizations: PersonalizationRule[];
  abTestVariant?: 'A' | 'B';
}

export interface TemplateData {
  user: TrialUser;
  event: TrialEvent;
  customData?: Record<string, any>;
}

export interface PersonalizationRule {
  condition: (user: TrialUser) => boolean;
  contentBlock: string;
  priority: number;
}

export interface CampaignCondition {
  type: 'user_property' | 'event_property' | 'time_based';
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

// Email queue management
interface QueuedEmail {
  id: string;
  campaignId: string;
  templateId: string;
  recipient: string;
  userId: string;
  scheduledFor: Date;
  priority: EmailCampaign['priority'];
  retryCount: number;
  maxRetries: number;
  personalizationData: TemplateData;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
}

// Campaign registry
const TRIAL_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'trial_welcome',
    name: 'Welcome to Trial',
    type: 'onboarding',
    triggerEvent: 'trial_started',
    priority: 'high',
    templates: [], // Will be loaded from template library
    conditions: [],
    abTestEnabled: true,
  },
  {
    id: 'trial_midpoint',
    name: 'Trial Midpoint Check-in',
    type: 'engagement',
    triggerEvent: 'milestone_reached',
    delayMinutes: 60,
    priority: 'normal',
    templates: [],
    conditions: [
      {
        type: 'event_property',
        field: 'progress',
        operator: 'equals',
        value: 50,
      },
    ],
  },
  {
    id: 'trial_ending_soon',
    name: 'Trial Ending Soon',
    type: 'conversion',
    triggerEvent: 'trial_ending',
    priority: 'urgent',
    templates: [],
    conditions: [
      {
        type: 'event_property',
        field: 'daysRemaining',
        operator: 'less_than',
        value: 5,
      },
    ],
    abTestEnabled: true,
  },
  {
    id: 'extension_offered',
    name: 'Extension Offer',
    type: 'retention',
    triggerEvent: 'extension_requested',
    priority: 'high',
    templates: [],
    conditions: [],
  },
];

// Main campaign engine
export class CampaignEngine {
  private emailQueue: Map<string, QueuedEmail> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  async handleTrialEvent(event: TrialEvent): Promise<void> {
    try {
      // Find matching campaigns
      const matchingCampaigns = await this.findMatchingCampaigns(event);

      for (const campaign of matchingCampaigns) {
        await this.processCampaign(campaign, event);
      }

      // Track event for analytics
      await trackCampaignEvent({
        eventType: 'trial_event_processed',
        eventData: event,
        campaignsTriggered: matchingCampaigns.map((c) => c.id),
      });
    } catch (error) {
      console.error('Error handling trial event:', error);
      throw error;
    }
  }

  private async findMatchingCampaigns(
    event: TrialEvent,
  ): Promise<EmailCampaign[]> {
    const supabase = createClient();

    // Get user data for condition evaluation
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', event.userId)
      .single();

    if (!userData) return [];

    const user: TrialUser = {
      id: userData.id,
      email: userData.email,
      name: userData.full_name || '',
      organizationId: userData.organization_id,
      trialStartDate: new Date(userData.trial_started_at),
      trialEndDate: new Date(userData.trial_ends_at),
      planType: userData.plan_type || 'basic',
      featuresUsed: userData.features_used || [],
      lastActiveAt: new Date(userData.last_active_at),
      timezone: userData.timezone || 'UTC',
      preferredLanguage: userData.preferred_language,
    };

    return TRIAL_CAMPAIGNS.filter((campaign) => {
      // Check trigger event
      if (campaign.triggerEvent !== event.type) return false;

      // Check conditions
      return this.evaluateConditions(campaign.conditions, user, event);
    });
  }

  private evaluateConditions(
    conditions: CampaignCondition[],
    user: TrialUser,
    event: TrialEvent,
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every((condition) => {
      const value =
        condition.type === 'user_property'
          ? user[condition.field as keyof TrialUser]
          : event[condition.field as keyof TrialEvent];

      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return String(value).includes(condition.value);
        case 'greater_than':
          return Number(value) > condition.value;
        case 'less_than':
          return Number(value) < condition.value;
        case 'in':
          return (
            Array.isArray(condition.value) && condition.value.includes(value)
          );
        default:
          return false;
      }
    });
  }

  private async processCampaign(
    campaign: EmailCampaign,
    event: TrialEvent,
  ): Promise<void> {
    const supabase = createClient();

    // Get user data for personalization
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', event.userId)
      .single();

    if (!userData) return;

    const user: TrialUser = {
      id: userData.id,
      email: userData.email,
      name: userData.full_name || '',
      organizationId: userData.organization_id,
      trialStartDate: new Date(userData.trial_started_at),
      trialEndDate: new Date(userData.trial_ends_at),
      planType: userData.plan_type || 'basic',
      featuresUsed: userData.features_used || [],
      lastActiveAt: new Date(userData.last_active_at),
      timezone: userData.timezone || 'UTC',
      preferredLanguage: userData.preferred_language,
    };

    // Select template variant if A/B testing is enabled
    let template = campaign.templates[0]; // Default template
    if (campaign.abTestEnabled && campaign.templates.length > 1) {
      const variant = await selectVariantForUser(user.id, campaign.id);
      template =
        campaign.templates.find((t) => t.abTestVariant === variant) || template;
    }

    // Calculate send time
    const sendAt = this.calculateOptimalSendTime(
      user.timezone,
      campaign.delayMinutes || 0,
    );

    // Queue email
    await this.scheduleEmail({
      campaign,
      template,
      recipient: user.email,
      userId: user.id,
      sendAt,
      personalizationData: {
        user,
        event,
        customData: await this.generatePersonalization(user, event),
      },
    });
  }

  async scheduleEmail(params: {
    campaign: EmailCampaign;
    template: EmailTemplate;
    recipient: string;
    userId: string;
    sendAt: Date;
    personalizationData: TemplateData;
  }): Promise<void> {
    const emailId = `${params.campaign.id}_${params.userId}_${Date.now()}`;

    const queuedEmail: QueuedEmail = {
      id: emailId,
      campaignId: params.campaign.id,
      templateId: params.template.id,
      recipient: params.recipient,
      userId: params.userId,
      scheduledFor: params.sendAt,
      priority: params.campaign.priority,
      retryCount: 0,
      maxRetries: 3,
      personalizationData: params.personalizationData,
      status: 'pending',
    };

    // Add to queue
    this.emailQueue.set(emailId, queuedEmail);

    // Store in database for persistence
    const supabase = createClient();
    await supabase.from('email_queue').insert({
      id: emailId,
      campaign_id: params.campaign.id,
      template_id: params.template.id,
      recipient: params.recipient,
      user_id: params.userId,
      scheduled_for: params.sendAt.toISOString(),
      priority: params.campaign.priority,
      personalization_data: params.personalizationData,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Start processing if not already running
    if (!this.processingInterval) {
      this.startEmailProcessor();
    }
  }

  private calculateOptimalSendTime(
    timezone: string,
    delayMinutes: number,
  ): Date {
    const now = new Date();
    const sendTime = new Date(now.getTime() + delayMinutes * 60000);

    // Adjust for timezone and optimal sending hours (9 AM - 5 PM local time)
    const localHour = this.getLocalHour(sendTime, timezone);

    if (localHour < 9) {
      // Schedule for 9 AM local time
      sendTime.setHours(sendTime.getHours() + (9 - localHour));
    } else if (localHour > 17) {
      // Schedule for next day 9 AM
      sendTime.setDate(sendTime.getDate() + 1);
      sendTime.setHours(9 - localHour + sendTime.getHours());
    }

    return sendTime;
  }

  private getLocalHour(date: Date, timezone: string): number {
    // Simple timezone offset calculation (would use a proper library in production)
    const offset = this.getTimezoneOffset(timezone);
    return (date.getUTCHours() + offset + 24) % 24;
  }

  private getTimezoneOffset(timezone: string): number {
    // Simplified timezone offset mapping
    const offsets: Record<string, number> = {
      UTC: 0,
      EST: -5,
      CST: -6,
      MST: -7,
      PST: -8,
      GMT: 0,
      CET: 1,
      AEST: 10,
    };
    return offsets[timezone] || 0;
  }

  private async generatePersonalization(
    user: TrialUser,
    event: TrialEvent,
  ): Promise<Record<string, any>> {
    const supabase = createClient();

    // Get usage stats
    const { data: usageStats } = await supabase
      .from('trial_usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Calculate personalization data
    const daysInTrial = Math.floor(
      (Date.now() - user.trialStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const conversionLikelihood = this.calculateConversionLikelihood(
      user,
      usageStats,
    );

    return {
      firstName: user.name.split(' ')[0],
      daysInTrial,
      daysRemaining: event.daysRemaining,
      mostUsedFeature: usageStats?.most_used_feature || 'Dashboard',
      totalTimeSpent: usageStats?.total_time_minutes || 0,
      conversionLikelihood,
      recommendedAction: this.getRecommendedAction(
        conversionLikelihood,
        event.daysRemaining,
      ),
      discountOffer:
        conversionLikelihood < 50 && event.daysRemaining < 5 ? '20% off' : null,
    };
  }

  private calculateConversionLikelihood(
    user: TrialUser,
    usageStats: any,
  ): number {
    let score = 0;

    // Feature usage (0-40 points)
    score += Math.min(user.featuresUsed.length * 5, 40);

    // Active days (0-30 points)
    const daysSinceLastActive = Math.floor(
      (Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    score += Math.max(30 - daysSinceLastActive * 3, 0);

    // Usage time (0-30 points)
    if (usageStats) {
      score += Math.min(usageStats.total_time_minutes / 10, 30);
    }

    return Math.min(score, 100);
  }

  private getRecommendedAction(
    likelihood: number,
    daysRemaining: number,
  ): string {
    if (likelihood > 70) {
      return 'upgrade_now';
    } else if (likelihood > 40 && daysRemaining < 7) {
      return 'schedule_demo';
    } else if (daysRemaining < 3) {
      return 'extend_trial';
    } else {
      return 'explore_features';
    }
  }

  private startEmailProcessor(): void {
    this.processingInterval = setInterval(() => {
      this.processEmailQueue();
    }, 30000); // Process every 30 seconds
  }

  private async processEmailQueue(): Promise<void> {
    const now = new Date();
    const batch: QueuedEmail[] = [];

    // Find emails ready to send
    this.emailQueue.forEach((email) => {
      if (email.status === 'pending' && email.scheduledFor <= now) {
        batch.push(email);
      }
    });

    // Sort by priority
    batch.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process batch (limit to 100 emails)
    const toProcess = batch.slice(0, 100);

    for (const email of toProcess) {
      await this.sendQueuedEmail(email);
    }
  }

  private async sendQueuedEmail(queuedEmail: QueuedEmail): Promise<void> {
    try {
      queuedEmail.status = 'processing';

      // Generate email content
      const template = await this.loadTemplate(queuedEmail.templateId);
      const subject = template.subject(queuedEmail.personalizationData);
      const htmlContent = template.htmlContent(queuedEmail.personalizationData);
      const textContent = template.textContent(queuedEmail.personalizationData);

      // Send email (using existing service)
      // This would integrate with your existing email service
      // await sendEmail({ ... })

      // Mark as sent
      queuedEmail.status = 'sent';

      // Track email event
      await trackCampaignEvent({
        eventType: 'email_sent',
        campaignId: queuedEmail.campaignId,
        userId: queuedEmail.userId,
        emailId: queuedEmail.id,
      });

      // Remove from queue
      this.emailQueue.delete(queuedEmail.id);

      // Update database
      const supabase = createClient();
      await supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', queuedEmail.id);
    } catch (error) {
      console.error('Error sending email:', error);

      // Handle retry logic
      queuedEmail.retryCount++;
      if (queuedEmail.retryCount < queuedEmail.maxRetries) {
        // Exponential backoff
        const delayMinutes = Math.pow(2, queuedEmail.retryCount) * 5;
        queuedEmail.scheduledFor = new Date(Date.now() + delayMinutes * 60000);
        queuedEmail.status = 'pending';
      } else {
        queuedEmail.status = 'failed';
        this.emailQueue.delete(queuedEmail.id);

        // Update database
        const supabase = createClient();
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: String(error),
            failed_at: new Date().toISOString(),
          })
          .eq('id', queuedEmail.id);
      }
    }
  }

  private async loadTemplate(templateId: string): Promise<EmailTemplate> {
    // This would load templates from the template library
    // For now, returning a mock template
    return {
      id: templateId,
      campaignId: 'trial',
      subject: (data) =>
        `${data.user.name}, your trial ends in ${data.event.daysRemaining} days`,
      htmlContent: (data) => `<h1>Hello ${data.customData?.firstName}!</h1>`,
      textContent: (data) => `Hello ${data.customData?.firstName}!`,
      personalizations: [],
      abTestVariant: 'A',
    };
  }

  // Clean up
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Export singleton instance
export const campaignEngine = new CampaignEngine();

// Export utility functions
export async function trackEmailMetrics(emailEvent: {
  eventType: 'opened' | 'clicked' | 'converted';
  emailId: string;
  userId: string;
  campaignId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}): Promise<void> {
  await trackCampaignEvent({
    eventType: `email_${emailEvent.eventType}`,
    ...emailEvent,
  });
}
