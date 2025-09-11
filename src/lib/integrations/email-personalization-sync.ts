/**
 * EmailPersonalizationSync - WS-209 Content Personalization Engine
 *
 * Synchronizes personalized content with email automation systems.
 * Handles email campaigns, transactional emails, and drip sequences with AI personalization.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import PersonalizationOrchestrator from './personalization-orchestrator';

interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  audienceSegment: string;
  scheduledDate: string;
  personalizationRules: PersonalizationRule[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
}

interface PersonalizationRule {
  condition: string;
  field: string;
  personalizationType:
    | 'dynamic_content'
    | 'send_time'
    | 'subject_line'
    | 'call_to_action';
  fallbackValue: string;
}

interface EmailPersonalizationRequest {
  campaignId: string;
  recipientId: string;
  organizationId: string;
  templateVariables: Record<string, any>;
  deliveryOptions: DeliveryOptions;
}

interface DeliveryOptions {
  sendTime?: string;
  priority: 'high' | 'normal' | 'low';
  deliveryMethod: 'immediate' | 'scheduled' | 'optimized';
  trackingEnabled: boolean;
}

interface PersonalizedEmail {
  emailId: string;
  recipientId: string;
  personalizedSubject: string;
  personalizedContent: string;
  personalizedSendTime: string;
  personalizationScore: number;
  deliveryChannel: 'transactional' | 'marketing' | 'nurture';
  trackingPixel?: string;
  dynamicLinks: Record<string, string>;
}

interface EmailPerformanceMetrics {
  deliveryRate: number;
  openRate: number;
  clickThroughRate: number;
  conversionRate: number;
  personalizationImpact: number;
  segmentPerformance: Record<string, number>;
}

export class EmailPersonalizationSync {
  private supabase;
  private personalizationOrchestrator: PersonalizationOrchestrator;
  private emailProviders: Map<string, any>;
  private deliveryQueue: Map<string, PersonalizedEmail[]>;
  private performanceTracker: Map<string, EmailPerformanceMetrics>;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );
    this.personalizationOrchestrator = new PersonalizationOrchestrator();
    this.emailProviders = new Map();
    this.deliveryQueue = new Map();
    this.performanceTracker = new Map();

    // Initialize email providers
    this.initializeEmailProviders();
  }

  /**
   * Initialize supported email service providers
   */
  private initializeEmailProviders() {
    // Resend integration
    this.emailProviders.set('resend', {
      apiKey: process.env.RESEND_API_KEY,
      baseUrl: 'https://api.resend.com',
      provider: 'resend',
    });

    // Mailgun integration
    this.emailProviders.set('mailgun', {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      provider: 'mailgun',
    });

    // SendGrid integration
    this.emailProviders.set('sendgrid', {
      apiKey: process.env.SENDGRID_API_KEY,
      provider: 'sendgrid',
    });
  }

  /**
   * Personalize and sync email campaign
   */
  async personalizeEmailCampaign(campaignId: string): Promise<void> {
    try {
      // Get campaign details
      const campaign = await this.getEmailCampaign(campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      // Get campaign recipients
      const recipients = await this.getCampaignRecipients(campaignId);

      // Process each recipient
      const personalizedEmails: PersonalizedEmail[] = [];

      for (const recipient of recipients) {
        const personalizedEmail = await this.personalizeEmailForRecipient(
          campaign,
          recipient,
        );
        personalizedEmails.push(personalizedEmail);
      }

      // Queue for delivery
      await this.queuePersonalizedEmails(campaignId, personalizedEmails);

      // Update campaign status
      await this.updateCampaignStatus(campaignId, 'scheduled');

      console.log(
        `Personalized ${personalizedEmails.length} emails for campaign ${campaignId}`,
      );
    } catch (error) {
      console.error('Error personalizing email campaign:', error);
      await this.updateCampaignStatus(campaignId, 'paused');
      throw error;
    }
  }

  /**
   * Personalize email for individual recipient
   */
  private async personalizeEmailForRecipient(
    campaign: EmailCampaign,
    recipient: any,
  ): Promise<PersonalizedEmail> {
    try {
      // Build personalization context
      const context = await this.buildEmailPersonalizationContext(
        recipient,
        campaign,
      );

      // Request personalization from orchestrator
      const personalizedContent =
        await this.personalizationOrchestrator.personalizeContent({
          userId: recipient.user_id,
          organizationId: recipient.organization_id,
          contentType: 'email',
          templateId: campaign.templateId,
          context,
          deliveryChannel: 'email',
        });

      // Optimize send time based on recipient behavior
      const optimizedSendTime = await this.optimizeSendTime(
        recipient,
        campaign,
      );

      // Generate tracking elements
      const trackingElements = await this.generateTrackingElements(
        recipient.user_id,
        campaign.id,
      );

      return {
        emailId: `${campaign.id}-${recipient.user_id}-${Date.now()}`,
        recipientId: recipient.user_id,
        personalizedSubject:
          personalizedContent.personalizedSubject || campaign.name,
        personalizedContent: personalizedContent.personalizedText,
        personalizedSendTime: optimizedSendTime,
        personalizationScore: personalizedContent.personalizationScore,
        deliveryChannel: this.determineDeliveryChannel(campaign),
        trackingPixel: trackingElements.pixelUrl,
        dynamicLinks: trackingElements.trackedLinks,
      };
    } catch (error) {
      console.error('Error personalizing email for recipient:', error);

      // Return fallback email
      return await this.generateFallbackEmail(campaign, recipient);
    }
  }

  /**
   * Build personalization context for email
   */
  private async buildEmailPersonalizationContext(
    recipient: any,
    campaign: EmailCampaign,
  ) {
    // Get recipient's email engagement history
    const emailHistory = await this.getRecipientEmailHistory(recipient.user_id);

    // Get wedding context if available
    const weddingContext = await this.getWeddingContextForRecipient(
      recipient.user_id,
    );

    // Get vendor preferences
    const vendorPreferences = await this.getVendorPreferences(
      recipient.organization_id,
    );

    return {
      weddingId: weddingContext?.wedding_id,
      vendorType: vendorPreferences?.vendor_type,
      weddingStage: weddingContext?.stage,
      userPreferences: recipient.email_preferences,
      behaviorData: {
        lastActive: recipient.last_active,
        engagementScore: this.calculateEmailEngagementScore(emailHistory),
        preferredCommunicationTime: recipient.preferred_email_time,
        clickThroughHistory: emailHistory.map((h) => h.clicked_links).flat(),
        contentInteractions: emailHistory.map((h) => ({
          contentId: h.email_id,
          interaction: h.opened ? 'click' : 'view',
          timestamp: h.sent_at,
          duration: h.engagement_duration,
        })),
      },
      demographicData: {
        location: recipient.location,
        timezone: recipient.timezone,
        language: recipient.preferred_language,
        budgetRange: weddingContext?.budget_range,
        weddingSize: weddingContext?.guest_count > 100 ? 'large' : 'intimate',
      },
    };
  }

  /**
   * Optimize send time based on recipient behavior
   */
  private async optimizeSendTime(
    recipient: any,
    campaign: EmailCampaign,
  ): Promise<string> {
    try {
      // Get recipient's email engagement patterns
      const engagementPatterns = await this.getRecipientEngagementPatterns(
        recipient.user_id,
      );

      // If no patterns, use campaign scheduled time
      if (!engagementPatterns?.optimal_send_times?.length) {
        return campaign.scheduledDate;
      }

      // Find optimal send time for this recipient
      const optimalHour = engagementPatterns.optimal_send_times[0];
      const campaignDate = new Date(campaign.scheduledDate);

      // Set optimal hour while keeping the same date
      campaignDate.setHours(optimalHour, 0, 0, 0);

      return campaignDate.toISOString();
    } catch (error) {
      console.error('Error optimizing send time:', error);
      return campaign.scheduledDate;
    }
  }

  /**
   * Generate tracking elements for email
   */
  private async generateTrackingElements(userId: string, campaignId: string) {
    const trackingId = `${campaignId}-${userId}-${Date.now()}`;

    return {
      pixelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/open/${trackingId}`,
      trackedLinks: {
        cta_primary: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/click/${trackingId}/cta-primary`,
        cta_secondary: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/click/${trackingId}/cta-secondary`,
        unsubscribe: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe/${trackingId}`,
      },
    };
  }

  /**
   * Queue personalized emails for delivery
   */
  private async queuePersonalizedEmails(
    campaignId: string,
    emails: PersonalizedEmail[],
  ) {
    // Group emails by delivery channel and send time
    const deliveryGroups = this.groupEmailsByDelivery(emails);

    for (const [deliveryTime, emailGroup] of deliveryGroups.entries()) {
      // Store in delivery queue
      this.deliveryQueue.set(`${campaignId}-${deliveryTime}`, emailGroup);

      // Schedule delivery job
      await this.scheduleEmailDelivery(campaignId, deliveryTime, emailGroup);
    }

    // Update campaign metrics
    await this.updateCampaignMetrics(campaignId, {
      total_recipients: emails.length,
      personalization_rate:
        emails.filter((e) => e.personalizationScore > 0.5).length /
        emails.length,
      scheduled_sends: deliveryGroups.size,
    });
  }

  /**
   * Group emails by delivery time and channel
   */
  private groupEmailsByDelivery(
    emails: PersonalizedEmail[],
  ): Map<string, PersonalizedEmail[]> {
    const groups = new Map<string, PersonalizedEmail[]>();

    emails.forEach((email) => {
      const deliveryKey = `${email.personalizedSendTime}-${email.deliveryChannel}`;

      if (!groups.has(deliveryKey)) {
        groups.set(deliveryKey, []);
      }

      groups.get(deliveryKey)!.push(email);
    });

    return groups;
  }

  /**
   * Schedule email delivery job
   */
  private async scheduleEmailDelivery(
    campaignId: string,
    deliveryTime: string,
    emails: PersonalizedEmail[],
  ) {
    try {
      // Create delivery job in database
      await this.supabase.from('email_delivery_jobs').insert({
        campaign_id: campaignId,
        scheduled_time: deliveryTime,
        email_count: emails.length,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      });

      // Store emails for delivery
      await this.supabase.from('personalized_emails').insert(
        emails.map((email) => ({
          email_id: email.emailId,
          campaign_id: campaignId,
          recipient_id: email.recipientId,
          personalized_subject: email.personalizedSubject,
          personalized_content: email.personalizedContent,
          scheduled_send_time: email.personalizedSendTime,
          personalization_score: email.personalizationScore,
          tracking_pixel: email.trackingPixel,
          dynamic_links: email.dynamicLinks,
          status: 'queued',
        })),
      );
    } catch (error) {
      console.error('Error scheduling email delivery:', error);
      throw error;
    }
  }

  /**
   * Process email delivery queue
   */
  async processEmailDeliveryQueue(): Promise<void> {
    try {
      // Get pending delivery jobs
      const { data: pendingJobs } = await this.supabase
        .from('email_delivery_jobs')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_time', new Date().toISOString());

      if (!pendingJobs?.length) {
        return;
      }

      // Process each job
      for (const job of pendingJobs) {
        await this.processDeliveryJob(job);
      }
    } catch (error) {
      console.error('Error processing email delivery queue:', error);
    }
  }

  /**
   * Process individual delivery job
   */
  private async processDeliveryJob(job: any) {
    try {
      // Update job status
      await this.supabase
        .from('email_delivery_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id);

      // Get emails for this job
      const { data: emails } = await this.supabase
        .from('personalized_emails')
        .select('*')
        .eq('campaign_id', job.campaign_id)
        .eq('status', 'queued');

      if (!emails?.length) {
        await this.supabase
          .from('email_delivery_jobs')
          .update({ status: 'completed' })
          .eq('id', job.id);
        return;
      }

      // Send emails
      const deliveryResults = await this.deliverPersonalizedEmails(emails);

      // Update job status
      await this.supabase
        .from('email_delivery_jobs')
        .update({
          status: 'completed',
          delivered_count: deliveryResults.successful,
          failed_count: deliveryResults.failed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    } catch (error) {
      console.error('Error processing delivery job:', error);

      // Mark job as failed
      await this.supabase
        .from('email_delivery_jobs')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', job.id);
    }
  }

  /**
   * Deliver personalized emails via provider
   */
  private async deliverPersonalizedEmails(
    emails: any[],
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        // Get recipient details
        const recipient = await this.getRecipientDetails(email.recipient_id);

        // Send via email provider
        const deliveryResult = await this.sendEmailViaProvider(
          email,
          recipient,
        );

        if (deliveryResult.success) {
          successful++;
          await this.updateEmailStatus(
            email.email_id,
            'sent',
            deliveryResult.providerId,
          );
        } else {
          failed++;
          await this.updateEmailStatus(
            email.email_id,
            'failed',
            null,
            deliveryResult.error,
          );
        }
      } catch (error) {
        failed++;
        await this.updateEmailStatus(
          email.email_id,
          'failed',
          null,
          error.message,
        );
      }
    }

    return { successful, failed };
  }

  /**
   * Send email via configured provider
   */
  private async sendEmailViaProvider(email: any, recipient: any) {
    const provider = this.emailProviders.get('resend'); // Default to Resend

    if (!provider) {
      throw new Error('No email provider configured');
    }

    try {
      // Format email for provider
      const emailPayload = {
        from: 'WedSync <noreply@wedsync.com>',
        to: recipient.email,
        subject: email.personalized_subject,
        html: this.addTrackingToContent(
          email.personalized_content,
          email.tracking_pixel,
          email.dynamic_links,
        ),
        headers: {
          'X-Campaign-ID': email.campaign_id,
          'X-Email-ID': email.email_id,
          'X-Personalization-Score': email.personalization_score.toString(),
        },
      };

      // Send via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const result = await response.json();

      return {
        success: response.ok,
        providerId: result.id,
        error: result.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add tracking elements to email content
   */
  private addTrackingToContent(
    content: string,
    trackingPixel: string,
    dynamicLinks: Record<string, string>,
  ): string {
    let trackedContent = content;

    // Replace dynamic links
    Object.entries(dynamicLinks).forEach(([key, trackedUrl]) => {
      trackedContent = trackedContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        trackedUrl,
      );
    });

    // Add tracking pixel
    if (trackingPixel) {
      trackedContent += `<img src="${trackingPixel}" width="1" height="1" style="display:none;" />`;
    }

    return trackedContent;
  }

  /**
   * Get email campaign details
   */
  private async getEmailCampaign(
    campaignId: string,
  ): Promise<EmailCampaign | null> {
    const { data: campaign } = await this.supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    return campaign;
  }

  /**
   * Get campaign recipients
   */
  private async getCampaignRecipients(campaignId: string) {
    const { data: recipients } = await this.supabase
      .from('campaign_recipients')
      .select(
        `
        user_id,
        organization_id,
        user_profiles!inner(email, preferred_language, timezone, location, last_active),
        email_preferences
      `,
      )
      .eq('campaign_id', campaignId)
      .eq('status', 'active');

    return recipients || [];
  }

  /**
   * Calculate email engagement score
   */
  private calculateEmailEngagementScore(emailHistory: any[]): number {
    if (!emailHistory?.length) return 0.5;

    const totalEmails = emailHistory.length;
    const openedEmails = emailHistory.filter((h) => h.opened).length;
    const clickedEmails = emailHistory.filter((h) => h.clicked).length;

    const openRate = openedEmails / totalEmails;
    const clickRate = clickedEmails / totalEmails;

    return openRate * 0.6 + clickRate * 0.4;
  }

  /**
   * Get recipient email history
   */
  private async getRecipientEmailHistory(userId: string) {
    const { data: history } = await this.supabase
      .from('email_tracking')
      .select('*')
      .eq('recipient_id', userId)
      .order('sent_at', { ascending: false })
      .limit(50);

    return history || [];
  }

  /**
   * Generate fallback email when personalization fails
   */
  private async generateFallbackEmail(
    campaign: EmailCampaign,
    recipient: any,
  ): Promise<PersonalizedEmail> {
    return {
      emailId: `fallback-${campaign.id}-${recipient.user_id}`,
      recipientId: recipient.user_id,
      personalizedSubject: campaign.name,
      personalizedContent: 'Default email content',
      personalizedSendTime: campaign.scheduledDate,
      personalizationScore: 0.1,
      deliveryChannel: 'marketing',
      dynamicLinks: {},
    };
  }

  /**
   * Update email status
   */
  private async updateEmailStatus(
    emailId: string,
    status: string,
    providerId?: string,
    errorMessage?: string,
  ) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (providerId) updateData.provider_id = providerId;
    if (errorMessage) updateData.error_message = errorMessage;
    if (status === 'sent') updateData.sent_at = new Date().toISOString();

    await this.supabase
      .from('personalized_emails')
      .update(updateData)
      .eq('email_id', emailId);
  }

  /**
   * Get email personalization analytics
   */
  async getEmailPersonalizationAnalytics(
    organizationId: string,
    timeRange: string = '30d',
  ) {
    const startDate = new Date();
    startDate.setDate(
      startDate.getDate() - parseInt(timeRange.replace('d', '')),
    );

    const { data: analytics } = await this.supabase
      .from('personalized_emails')
      .select(
        `
        personalization_score,
        status,
        sent_at,
        email_tracking!inner(opened, clicked, bounced)
      `,
      )
      .gte('created_at', startDate.toISOString());

    return {
      totalEmails: analytics?.length || 0,
      deliveryRate: this.calculateDeliveryRate(analytics || []),
      personalizationImpact: this.calculatePersonalizationImpact(
        analytics || [],
      ),
      performanceByScore: this.analyzePerformanceByScore(analytics || []),
    };
  }

  private calculateDeliveryRate(analytics: any[]): number {
    const delivered = analytics.filter((a) => a.status === 'sent').length;
    return analytics.length > 0 ? delivered / analytics.length : 0;
  }

  private calculatePersonalizationImpact(analytics: any[]): number {
    const highPersonalization = analytics.filter(
      (a) => a.personalization_score > 0.7,
    );
    const lowPersonalization = analytics.filter(
      (a) => a.personalization_score < 0.3,
    );

    const highEngagement = highPersonalization.filter(
      (a) => a.email_tracking?.opened || a.email_tracking?.clicked,
    ).length;
    const lowEngagement = lowPersonalization.filter(
      (a) => a.email_tracking?.opened || a.email_tracking?.clicked,
    ).length;

    const highRate =
      highPersonalization.length > 0
        ? highEngagement / highPersonalization.length
        : 0;
    const lowRate =
      lowPersonalization.length > 0
        ? lowEngagement / lowPersonalization.length
        : 0;

    return highRate - lowRate; // Positive value indicates personalization impact
  }

  private analyzePerformanceByScore(analytics: any[]) {
    const buckets = {
      high: analytics.filter((a) => a.personalization_score > 0.7),
      medium: analytics.filter(
        (a) => a.personalization_score >= 0.4 && a.personalization_score <= 0.7,
      ),
      low: analytics.filter((a) => a.personalization_score < 0.4),
    };

    return Object.entries(buckets).map(([bucket, emails]) => ({
      bucket,
      count: emails.length,
      openRate:
        emails.filter((e) => e.email_tracking?.opened).length /
        (emails.length || 1),
      clickRate:
        emails.filter((e) => e.email_tracking?.clicked).length /
        (emails.length || 1),
    }));
  }

  /**
   * Additional helper methods
   */
  private determineDeliveryChannel(
    campaign: EmailCampaign,
  ): PersonalizedEmail['deliveryChannel'] {
    // Logic to determine delivery channel based on campaign type
    return 'marketing';
  }

  private async getRecipientEngagementPatterns(userId: string) {
    const { data: patterns } = await this.supabase
      .from('user_engagement_patterns')
      .select('*')
      .eq('user_id', userId)
      .single();

    return patterns;
  }

  private async getWeddingContextForRecipient(userId: string) {
    const { data: context } = await this.supabase
      .from('weddings')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return context;
  }

  private async getVendorPreferences(organizationId: string) {
    const { data: prefs } = await this.supabase
      .from('organizations')
      .select('vendor_type, communication_preferences')
      .eq('id', organizationId)
      .single();

    return prefs;
  }

  private async getRecipientDetails(recipientId: string) {
    const { data: recipient } = await this.supabase
      .from('user_profiles')
      .select('email, first_name, last_name')
      .eq('id', recipientId)
      .single();

    return recipient;
  }

  private async updateCampaignStatus(
    campaignId: string,
    status: EmailCampaign['status'],
  ) {
    await this.supabase
      .from('email_campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', campaignId);
  }

  private async updateCampaignMetrics(campaignId: string, metrics: any) {
    await this.supabase
      .from('email_campaigns')
      .update({
        metrics,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
  }
}

export default EmailPersonalizationSync;
