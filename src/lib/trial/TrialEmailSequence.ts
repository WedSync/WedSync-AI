/**
 * WS-140: Trial Email Sequence Automation
 * Manages automated email communications throughout the trial lifecycle
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { addDays, differenceInDays, format } from 'date-fns';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  triggerDay: number;
  template: string;
  variables: string[];
  priority: 'high' | 'medium' | 'low';
}

interface EmailSchedule {
  userId: string;
  templateId: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  metadata?: any;
}

interface TrialEmailMetrics {
  opened: boolean;
  clicked: boolean;
  converted: boolean;
  unsubscribed: boolean;
}

export class TrialEmailSequenceService {
  private supabase: SupabaseClient<Database>;
  private emailTemplates: EmailTemplate[];

  constructor() {
    this.supabase = createServerComponentClient<Database>({ cookies });

    // Define email sequence templates
    this.emailTemplates = [
      {
        id: 'welcome',
        name: 'Welcome to Trial',
        subject: 'Welcome to WedSync! Your 30-Day Journey Starts Now 🎉',
        triggerDay: 0,
        template: 'trial_welcome',
        variables: ['firstName', 'trialEndDate', 'quickStartGuide'],
        priority: 'high',
      },
      {
        id: 'day3_checkin',
        name: 'Day 3 Check-in',
        subject: "How's your WedSync experience so far?",
        triggerDay: 3,
        template: 'trial_day3_checkin',
        variables: ['firstName', 'progressPercentage', 'nextMilestone'],
        priority: 'medium',
      },
      {
        id: 'week1_summary',
        name: 'Week 1 Summary',
        subject: 'Your First Week with WedSync - Amazing Progress! 📊',
        triggerDay: 7,
        template: 'trial_week1_summary',
        variables: ['firstName', 'hoursSaved', 'tasksAutomated', 'tip'],
        priority: 'high',
      },
      {
        id: 'feature_spotlight',
        name: 'Feature Spotlight',
        subject: 'Unlock Hidden Time-Savers in WedSync',
        triggerDay: 10,
        template: 'trial_feature_spotlight',
        variables: ['firstName', 'unusedFeature', 'potentialSavings'],
        priority: 'medium',
      },
      {
        id: 'halfway_milestone',
        name: 'Halfway Milestone',
        subject: "You're Halfway Through - See Your Impact! 🎯",
        triggerDay: 15,
        template: 'trial_halfway_milestone',
        variables: ['firstName', 'totalValue', 'achievements', 'successStory'],
        priority: 'high',
      },
      {
        id: 'week3_optimization',
        name: 'Week 3 Optimization',
        subject: 'Pro Tips to Maximize Your WedSync Trial',
        triggerDay: 21,
        template: 'trial_week3_optimization',
        variables: ['firstName', 'optimizationTips', 'roi'],
        priority: 'medium',
      },
      {
        id: 'final_week_alert',
        name: 'Final Week Alert',
        subject: "7 Days Left - Don't Lose Your Progress! ⏰",
        triggerDay: 23,
        template: 'trial_final_week',
        variables: ['firstName', 'dataAtRisk', 'conversionOffer'],
        priority: 'high',
      },
      {
        id: 'day28_conversion',
        name: 'Day 28 Conversion Push',
        subject: 'Your Trial Ends in 2 Days - Special Offer Inside 🎁',
        triggerDay: 28,
        template: 'trial_day28_conversion',
        variables: ['firstName', 'totalSavings', 'discount', 'urgency'],
        priority: 'high',
      },
      {
        id: 'last_day',
        name: 'Last Day Notice',
        subject: 'Final Hours - Preserve Your WedSync Setup',
        triggerDay: 29,
        template: 'trial_last_day',
        variables: ['firstName', 'expiryTime', 'lastChanceOffer'],
        priority: 'high',
      },
      {
        id: 'trial_expired',
        name: 'Trial Expired',
        subject: 'Your WedSync Trial Has Ended - But We Saved Your Data',
        triggerDay: 30,
        template: 'trial_expired',
        variables: ['firstName', 'dataRetention', 'reactivationLink'],
        priority: 'high',
      },
    ];
  }

  /**
   * Initialize email sequence for new trial user
   */
  async initializeSequence(
    userId: string,
    trialStartDate: Date,
  ): Promise<void> {
    try {
      const schedules: EmailSchedule[] = this.emailTemplates.map(
        (template) => ({
          userId,
          templateId: template.id,
          scheduledFor: addDays(trialStartDate, template.triggerDay),
          status: 'pending',
        }),
      );

      // Batch insert all scheduled emails
      const { error } = await this.supabase
        .from('trial_email_schedules')
        .insert(schedules);

      if (error) {
        throw new Error(
          `Failed to initialize email sequence: ${error.message}`,
        );
      }

      // Send welcome email immediately
      await this.sendTrialEmail(userId, 'welcome');

      // Track sequence initialization
      await this.trackEmailEvent(userId, 'sequence_initialized', {
        total_emails: schedules.length,
        trial_start: trialStartDate,
      });
    } catch (error) {
      console.error('[EmailSequence] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send a specific trial email
   */
  async sendTrialEmail(
    userId: string,
    templateId: string,
    customVariables?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const template = this.emailTemplates.find((t) => t.id === templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Fetch user data
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      // Fetch trial metrics
      const metrics = await this.getTrialMetrics(userId);

      // Prepare email variables
      const variables = {
        firstName: user.first_name || 'there',
        trialEndDate: format(
          addDays(new Date(), 30 - metrics.daysUsed),
          'MMMM d',
        ),
        hoursSaved: metrics.hoursSaved,
        tasksAutomated: metrics.tasksAutomated,
        progressPercentage: Math.round((metrics.daysUsed / 30) * 100),
        totalValue: metrics.estimatedValue,
        ...customVariables,
      };

      // Send email via email service
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: template.subject,
          template: template.template,
          variables,
          priority: template.priority,
          tracking: {
            userId,
            templateId,
            sequenceDay: template.triggerDay,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update schedule status
        await this.supabase
          .from('trial_email_schedules')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: result.messageId,
          })
          .eq('user_id', userId)
          .eq('template_id', templateId);

        // Track email sent
        await this.trackEmailEvent(userId, 'email_sent', {
          template_id: templateId,
          day: template.triggerDay,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error(`[EmailSequence] Failed to send ${templateId}:`, error);

      // Mark as failed in schedule
      await this.supabase
        .from('trial_email_schedules')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('user_id', userId)
        .eq('template_id', templateId);

      return false;
    }
  }

  /**
   * Process scheduled emails (called by cron job)
   */
  async processScheduledEmails(): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    try {
      // Fetch pending emails due for sending
      const { data: pendingEmails } = await this.supabase
        .from('trial_email_schedules')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now.toISOString())
        .limit(100);

      if (!pendingEmails || pendingEmails.length === 0) {
        return 0;
      }

      // Process each email
      for (const schedule of pendingEmails) {
        const sent = await this.sendTrialEmail(
          schedule.user_id,
          schedule.template_id,
        );

        if (sent) {
          processedCount++;
        }
      }

      console.log(
        `[EmailSequence] Processed ${processedCount} scheduled emails`,
      );
      return processedCount;
    } catch (error) {
      console.error('[EmailSequence] Processing failed:', error);
      return processedCount;
    }
  }

  /**
   * Handle email engagement events (opens, clicks)
   */
  async handleEmailEngagement(
    messageId: string,
    eventType: 'opened' | 'clicked' | 'unsubscribed',
  ): Promise<void> {
    try {
      // Find the email schedule by message ID
      const { data: schedule } = await this.supabase
        .from('trial_email_schedules')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (!schedule) {
        return;
      }

      // Update engagement metrics
      const metrics: Partial<TrialEmailMetrics> = {};
      metrics[eventType] = true;

      await this.supabase.from('trial_email_metrics').upsert({
        user_id: schedule.user_id,
        template_id: schedule.template_id,
        ...metrics,
        last_engagement: new Date().toISOString(),
      });

      // Track engagement event
      await this.trackEmailEvent(schedule.user_id, `email_${eventType}`, {
        template_id: schedule.template_id,
        message_id: messageId,
      });

      // Handle unsubscribe
      if (eventType === 'unsubscribed') {
        await this.cancelRemainingEmails(schedule.user_id);
      }
    } catch (error) {
      console.error('[EmailSequence] Engagement tracking failed:', error);
    }
  }

  /**
   * Cancel remaining emails in sequence
   */
  async cancelRemainingEmails(userId: string): Promise<void> {
    await this.supabase
      .from('trial_email_schedules')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'pending');
  }

  /**
   * Adjust email sequence based on user behavior
   */
  async adjustSequenceForUser(userId: string): Promise<void> {
    try {
      // Get user engagement metrics
      const { data: metrics } = await this.supabase
        .from('trial_email_metrics')
        .select('*')
        .eq('user_id', userId);

      if (!metrics || metrics.length === 0) {
        return;
      }

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(metrics);

      // Highly engaged users - reduce email frequency
      if (engagementScore > 80) {
        await this.reduceEmailFrequency(userId);
      }

      // Low engagement - add re-engagement emails
      if (engagementScore < 30) {
        await this.addReEngagementEmails(userId);
      }

      // Near conversion - add urgency emails
      const daysRemaining = await this.getDaysRemaining(userId);
      if (daysRemaining <= 5 && engagementScore > 60) {
        await this.addUrgencyEmails(userId);
      }
    } catch (error) {
      console.error('[EmailSequence] Adjustment failed:', error);
    }
  }

  /**
   * Get trial metrics for email personalization
   */
  private async getTrialMetrics(userId: string): Promise<any> {
    // This would fetch actual metrics from the database
    return {
      daysUsed: 15,
      hoursSaved: 25,
      tasksAutomated: 89,
      estimatedValue: 1250,
      engagementScore: 75,
    };
  }

  /**
   * Track email events for analytics
   */
  private async trackEmailEvent(
    userId: string,
    event: string,
    properties: any,
  ): Promise<void> {
    await this.supabase.from('analytics_events').insert({
      user_id: userId,
      event,
      properties,
      category: 'trial_email',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Calculate user engagement score
   */
  private calculateEngagementScore(metrics: any[]): number {
    const weights = {
      opened: 30,
      clicked: 50,
      converted: 100,
      unsubscribed: -100,
    };

    let score = 0;
    let count = 0;

    metrics.forEach((metric) => {
      if (metric.opened) score += weights.opened;
      if (metric.clicked) score += weights.clicked;
      if (metric.converted) score += weights.converted;
      if (metric.unsubscribed) score += weights.unsubscribed;
      count++;
    });

    return Math.max(0, Math.min(100, score / count));
  }

  /**
   * Reduce email frequency for highly engaged users
   */
  private async reduceEmailFrequency(userId: string): Promise<void> {
    // Cancel low-priority emails
    await this.supabase
      .from('trial_email_schedules')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .in('template_id', ['feature_spotlight', 'week3_optimization']);
  }

  /**
   * Add re-engagement emails for low engagement users
   */
  private async addReEngagementEmails(userId: string): Promise<void> {
    // Schedule additional targeted emails
    const reEngagementEmail = {
      userId,
      templateId: 're_engagement_special',
      scheduledFor: addDays(new Date(), 1),
      status: 'pending' as const,
    };

    await this.supabase.from('trial_email_schedules').insert(reEngagementEmail);
  }

  /**
   * Add urgency emails for users near conversion
   */
  private async addUrgencyEmails(userId: string): Promise<void> {
    const urgencyEmail = {
      userId,
      templateId: 'urgent_conversion_offer',
      scheduledFor: new Date(),
      status: 'pending' as const,
      metadata: {
        urgency: 'high',
        discount: '20%',
      },
    };

    await this.supabase.from('trial_email_schedules').insert(urgencyEmail);
  }

  /**
   * Get days remaining in trial
   */
  private async getDaysRemaining(userId: string): Promise<number> {
    const { data: trial } = await this.supabase
      .from('trial_configs')
      .select('trial_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!trial) return 0;

    return differenceInDays(new Date(trial.trial_end), new Date());
  }
}
