import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTouchpoint {
  id: number;
  name: string;
  triggerDay: number; // Day of trial to send
  subject: string;
  template: string;
  personalizationVars: string[];
  priority: 'immediate' | 'high' | 'normal' | 'low';
}

export interface EmailCampaignMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  unsubscribed: number;
}

export class TrialEmailAutomation {
  private supabase = createClient();

  // 7-touchpoint email sequence
  private emailSequence: EmailTouchpoint[] = [
    {
      id: 1,
      name: 'welcome_to_trial',
      triggerDay: 0,
      subject: 'Welcome to WedSync! Your 30-day journey starts now 🎉',
      template: 'trial-welcome',
      personalizationVars: ['firstName', 'supplierType', 'trialEndDate'],
      priority: 'immediate',
    },
    {
      id: 2,
      name: 'getting_started_guide',
      triggerDay: 1,
      subject: 'Quick wins: 3 features {{supplierType}}s love most',
      template: 'trial-getting-started',
      personalizationVars: [
        'firstName',
        'supplierType',
        'topFeatures',
        'setupLink',
      ],
      priority: 'high',
    },
    {
      id: 3,
      name: 'roi_calculator_introduction',
      triggerDay: 3,
      subject: 'See your potential savings with WedSync',
      template: 'trial-roi-intro',
      personalizationVars: ['firstName', 'estimatedSavings', 'roiLink'],
      priority: 'normal',
    },
    {
      id: 4,
      name: 'milestone_celebration',
      triggerDay: 7,
      subject: "🎯 You've hit your first milestone!",
      template: 'trial-milestone',
      personalizationVars: [
        'firstName',
        'milestoneAchieved',
        'nextMilestone',
        'celebrationMessage',
      ],
      priority: 'high',
    },
    {
      id: 5,
      name: 'personalized_roi_report',
      triggerDay: 14,
      subject: 'Your personalized ROI report is ready',
      template: 'trial-roi-report',
      personalizationVars: [
        'firstName',
        'totalROI',
        'timeSaved',
        'revenueImpact',
        'reportLink',
      ],
      priority: 'high',
    },
    {
      id: 6,
      name: 'conversion_offer',
      triggerDay: 21,
      subject: 'Special offer: Save 20% when you upgrade today',
      template: 'trial-conversion-offer',
      personalizationVars: [
        'firstName',
        'discountAmount',
        'expiryDate',
        'upgradeLink',
      ],
      priority: 'high',
    },
    {
      id: 7,
      name: 'trial_ending_reminder',
      triggerDay: 28,
      subject: "Your trial ends in 2 days - don't lose your progress!",
      template: 'trial-ending',
      personalizationVars: [
        'firstName',
        'dataExportLink',
        'finalROI',
        'upgradeLink',
      ],
      priority: 'immediate',
    },
  ];

  async sendTrialEmail(
    trialSessionId: string,
    touchpointId: number,
    overrideData?: Record<string, any>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get trial session data
      const { data: trial } = await this.supabase
        .from('trial_sessions')
        .select(
          '*, organizations(name), user_profiles(first_name, last_name, email)',
        )
        .eq('id', trialSessionId)
        .single();

      if (!trial) {
        return { success: false, error: 'Trial session not found' };
      }

      const touchpoint = this.emailSequence.find(
        (tp) => tp.id === touchpointId,
      );
      if (!touchpoint) {
        return { success: false, error: 'Invalid touchpoint ID' };
      }

      // Get personalization data
      const personalizationData = await this.getPersonalizationData(
        trialSessionId,
        trial.supplier_type,
        touchpoint.personalizationVars,
        overrideData,
      );

      // Get email template content
      const emailContent = await this.generateEmailContent(
        touchpoint.template,
        personalizationData,
        trial.supplier_type,
      );

      // Send email via Resend
      const { data, error } = await resend.emails.send({
        from: 'WedSync Trial <trial@wedsync.com>',
        to: trial.user_profiles.email,
        subject: this.personalizeSubject(
          touchpoint.subject,
          personalizationData,
        ),
        html: emailContent.html,
        text: emailContent.text,
        tags: [
          { name: 'trial_id', value: trialSessionId },
          { name: 'touchpoint', value: touchpoint.name },
          { name: 'supplier_type', value: trial.supplier_type },
        ],
      });

      if (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
      }

      // Record email sent
      await this.recordEmailActivity(
        trialSessionId,
        touchpointId,
        data?.id || '',
        'sent',
      );

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Error sending trial email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async scheduleEmailSequence(trialSessionId: string): Promise<void> {
    const { data: trial } = await this.supabase
      .from('trial_sessions')
      .select('started_at')
      .eq('id', trialSessionId)
      .single();

    if (!trial) return;

    const startDate = new Date(trial.started_at);

    for (const touchpoint of this.emailSequence) {
      const sendDate = new Date(startDate);
      sendDate.setDate(sendDate.getDate() + touchpoint.triggerDay);

      // Schedule email (in production, use a job queue like BullMQ)
      await this.scheduleEmail(trialSessionId, touchpoint.id, sendDate);
    }
  }

  private async getPersonalizationData(
    trialSessionId: string,
    supplierType: string,
    requiredVars: string[],
    overrideData?: Record<string, any>,
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = { ...overrideData };

    // Get user profile data
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', trialSessionId)
      .single();

    if (profile) {
      data.firstName = profile.first_name;
      data.lastName = profile.last_name;
      data.email = profile.email;
    }

    // Get supplier-specific data
    data.supplierType = this.formatSupplierType(supplierType);
    data.topFeatures = this.getTopFeaturesForSupplier(supplierType);

    // Get ROI data if needed
    if (
      requiredVars.includes('totalROI') ||
      requiredVars.includes('estimatedSavings')
    ) {
      const { data: roi } = await this.supabase
        .from('trial_roi_calculations')
        .select('total_roi_value, time_savings_value, revenue_impact')
        .eq('trial_session_id', trialSessionId)
        .order('calculation_date', { ascending: false })
        .limit(1)
        .single();

      if (roi) {
        data.totalROI = Math.round(roi.total_roi_value);
        data.estimatedSavings = Math.round(roi.time_savings_value);
        data.timeSaved = Math.round(roi.time_savings_value / 50); // Assuming $50/hour
        data.revenueImpact = Math.round(roi.revenue_impact);
      }
    }

    // Get milestone data if needed
    if (requiredVars.includes('milestoneAchieved')) {
      const milestones = await this.getAchievedMilestones(trialSessionId);
      data.milestoneAchieved = milestones[0]?.name || 'First Steps';
      data.nextMilestone = this.getNextMilestone(milestones);
    }

    // Set URLs
    data.setupLink = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`;
    data.roiLink = `${process.env.NEXT_PUBLIC_APP_URL}/trial/roi`;
    data.reportLink = `${process.env.NEXT_PUBLIC_APP_URL}/trial/report`;
    data.upgradeLink = `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`;
    data.dataExportLink = `${process.env.NEXT_PUBLIC_APP_URL}/export`;

    return data;
  }

  private async generateEmailContent(
    templateName: string,
    data: Record<string, any>,
    supplierType: string,
  ): Promise<{ html: string; text: string }> {
    // In production, use a proper email template engine
    const templates = {
      'trial-welcome': this.getWelcomeTemplate,
      'trial-getting-started': this.getGettingStartedTemplate,
      'trial-roi-intro': this.getROIIntroTemplate,
      'trial-milestone': this.getMilestoneTemplate,
      'trial-roi-report': this.getROIReportTemplate,
      'trial-conversion-offer': this.getConversionOfferTemplate,
      'trial-ending': this.getTrialEndingTemplate,
    };

    const templateFn = templates[templateName as keyof typeof templates];
    if (!templateFn) {
      throw new Error(`Template ${templateName} not found`);
    }

    return templateFn.call(this, data, supplierType);
  }

  private getWelcomeTemplate(
    data: Record<string, any>,
    supplierType: string,
  ): { html: string; text: string } {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 40px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #7F56D9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
            .features { margin: 30px 0; }
            .feature { padding: 15px; background: #F9FAFB; border-left: 4px solid #7F56D9; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WedSync, ${data.firstName}! 🎉</h1>
              <p>Your 30-day trial for ${data.supplierType} professionals starts now</p>
            </div>
            <div class="content">
              <h2>Here's what you can accomplish in the next 30 days:</h2>
              <div class="features">
                ${this.getSupplierSpecificFeatures(supplierType)}
              </div>
              <p>We're here to help you succeed. Over the next few weeks, we'll share tips, calculate your ROI, and celebrate your milestones.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.setupLink}" class="button">Start Your Setup</a>
              </div>
              <p style="color: #6B7280; font-size: 14px;">Your trial ends on ${data.trialEndDate}. Make the most of it!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to WedSync, ${data.firstName}!

Your 30-day trial for ${data.supplierType} professionals starts now.

Here's what you can accomplish:
${this.getSupplierSpecificFeaturesText(supplierType)}

Start your setup: ${data.setupLink}

Your trial ends on ${data.trialEndDate}.

Best regards,
The WedSync Team
    `;

    return { html, text };
  }

  private getGettingStartedTemplate(
    data: Record<string, any>,
    supplierType: string,
  ): { html: string; text: string } {
    // Similar template structure for getting started guide
    return {
      html: `<html>...</html>`,
      text: `Getting started guide...`,
    };
  }

  private getROIIntroTemplate(
    data: Record<string, any>,
    supplierType: string,
  ): { html: string; text: string } {
    // ROI introduction template
    return {
      html: `<html>...</html>`,
      text: `ROI calculator introduction...`,
    };
  }

  private getMilestoneTemplate(
    data: Record<string, any>,
    supplierType: string,
  ): { html: string; text: string } {
    // Milestone celebration template
    return {
      html: `<html>...</html>`,
      text: `Milestone achieved...`,
    };
  }

  private getROIReportTemplate(
    data: Record<string, any>,
    supplierType: string,
  ): { html: string; text: string } {
    // Personalized ROI report template
    return {
      html: `<html>...</html>`,
      text: `Your ROI report...`,
    };
  }

  private getConversionOfferTemplate(
    data: Record<string, any>,
    supplierType: string,
  ): { html: string; text: string } {
    // Conversion offer template
    return {
      html: `<html>...</html>`,
      text: `Special upgrade offer...`,
    };
  }

  private getTrialEndingTemplate(
    data: Record<string, any>,
    supplierType: string,
  ): { html: string; text: string } {
    // Trial ending reminder template
    return {
      html: `<html>...</html>`,
      text: `Trial ending soon...`,
    };
  }

  private getSupplierSpecificFeatures(supplierType: string): string {
    const features = {
      photographer: `
        <div class="feature">📸 Organize and share client galleries effortlessly</div>
        <div class="feature">📅 Automate booking and scheduling</div>
        <div class="feature">💰 Track payments and generate contracts</div>
      `,
      planner: `
        <div class="feature">📋 Coordinate all vendors in one place</div>
        <div class="feature">⏰ Create and share detailed timelines</div>
        <div class="feature">💬 Streamline client communication</div>
      `,
      florist: `
        <div class="feature">🌸 Manage orders and inventory</div>
        <div class="feature">🚚 Schedule deliveries efficiently</div>
        <div class="feature">💐 Create digital proposals</div>
      `,
      venue: `
        <div class="feature">📅 Prevent double bookings</div>
        <div class="feature">💳 Process payments securely</div>
        <div class="feature">📊 Track venue performance</div>
      `,
    };
    return (
      features[supplierType as keyof typeof features] || features.photographer
    );
  }

  private getSupplierSpecificFeaturesText(supplierType: string): string {
    const features = {
      photographer: `
- Organize and share client galleries effortlessly
- Automate booking and scheduling
- Track payments and generate contracts`,
      planner: `
- Coordinate all vendors in one place
- Create and share detailed timelines
- Streamline client communication`,
      florist: `
- Manage orders and inventory
- Schedule deliveries efficiently
- Create digital proposals`,
      venue: `
- Prevent double bookings
- Process payments securely
- Track venue performance`,
    };
    return (
      features[supplierType as keyof typeof features] || features.photographer
    );
  }

  private formatSupplierType(type: string): string {
    const formatted = {
      photographer: 'Photography',
      planner: 'Wedding Planning',
      florist: 'Floral Design',
      venue: 'Venue Management',
      caterer: 'Catering',
      dj: 'DJ & Entertainment',
    };
    return formatted[type as keyof typeof formatted] || type;
  }

  private getTopFeaturesForSupplier(supplierType: string): string[] {
    const features = {
      photographer: [
        'Client Galleries',
        'Contract Management',
        'Payment Tracking',
      ],
      planner: ['Vendor Coordination', 'Timeline Builder', 'Budget Tracking'],
      florist: ['Order Management', 'Delivery Scheduling', 'Proposal Builder'],
      venue: ['Booking Calendar', 'Payment Processing', 'Event Coordination'],
      caterer: ['Menu Management', 'Headcount Tracking', 'Dietary Management'],
      dj: ['Music Library', 'Event Timeline', 'Request Management'],
    };
    return (
      features[supplierType as keyof typeof features] || features.photographer
    );
  }

  private personalizeSubject(
    template: string,
    data: Record<string, any>,
  ): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => data[key] || match,
    );
  }

  private async recordEmailActivity(
    trialSessionId: string,
    touchpointId: number,
    messageId: string,
    activity: 'sent' | 'opened' | 'clicked' | 'converted' | 'unsubscribed',
  ): Promise<void> {
    await this.supabase.from('trial_email_activities').insert({
      trial_session_id: trialSessionId,
      touchpoint_id: touchpointId,
      message_id: messageId,
      activity,
      activity_timestamp: new Date().toISOString(),
    });
  }

  private async scheduleEmail(
    trialSessionId: string,
    touchpointId: number,
    sendDate: Date,
  ): Promise<void> {
    // In production, use a job queue like BullMQ or similar
    // For now, store in database for cron job processing
    await this.supabase.from('trial_email_schedule').insert({
      trial_session_id: trialSessionId,
      touchpoint_id: touchpointId,
      scheduled_send_date: sendDate.toISOString(),
      status: 'pending',
    });
  }

  private async getAchievedMilestones(trialSessionId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('trial_milestones')
      .select('*')
      .eq('trial_session_id', trialSessionId)
      .eq('achieved', true)
      .order('achieved_at', { ascending: false });

    return data || [];
  }

  private getNextMilestone(achievedMilestones: any[]): string {
    const allMilestones = [
      'First Client Added',
      'First Automation Created',
      'First Integration Connected',
      'ROI Threshold Reached',
      'Full Feature Adoption',
    ];

    const achieved = new Set(achievedMilestones.map((m) => m.name));
    return allMilestones.find((m) => !achieved.has(m)) || 'Trial Master';
  }

  // A/B Testing for email subjects and content
  async getABTestVariant(
    trialSessionId: string,
    touchpointId: number,
  ): Promise<'control' | 'variant'> {
    // Simple hash-based assignment for consistency
    const hash = this.hashCode(trialSessionId + touchpointId);
    return hash % 2 === 0 ? 'control' : 'variant';
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Email performance tracking
  async trackEmailPerformance(
    messageId: string,
    activity: 'opened' | 'clicked',
  ): Promise<void> {
    const { data: email } = await this.supabase
      .from('trial_email_activities')
      .select('trial_session_id, touchpoint_id')
      .eq('message_id', messageId)
      .eq('activity', 'sent')
      .single();

    if (email) {
      await this.recordEmailActivity(
        email.trial_session_id,
        email.touchpoint_id,
        messageId,
        activity,
      );

      // Update conversion score based on email engagement
      if (activity === 'clicked') {
        await this.updateEngagementScore(email.trial_session_id, 5);
      }
    }
  }

  private async updateEngagementScore(
    trialSessionId: string,
    points: number,
  ): Promise<void> {
    // Update conversion score based on email engagement
    const { data: score } = await this.supabase
      .from('trial_conversion_scores')
      .select('support_interaction_score')
      .eq('trial_session_id', trialSessionId)
      .order('score_date', { ascending: false })
      .limit(1)
      .single();

    if (score) {
      const newScore = Math.min(100, score.support_interaction_score + points);
      await this.supabase
        .from('trial_conversion_scores')
        .update({ support_interaction_score: newScore })
        .eq('trial_session_id', trialSessionId);
    }
  }
}
