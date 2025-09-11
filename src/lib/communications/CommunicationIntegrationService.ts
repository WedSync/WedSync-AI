import { createClient } from '@/lib/supabase/client';
import { Logger } from '@/lib/logging/Logger';
import { userContextService } from '@/lib/feature-requests/services/UserContextEnrichmentService';

export interface CommunicationRequest {
  type: 'feature_announcement' | 'status_update' | 'client_notification';
  recipient_id: string;
  feature_request_id?: string;
  template_id: string;
  data: Record<string, any>;
  channels: ('email' | 'sms' | 'in_app')[];
  wedding_context?: {
    wedding_date?: string;
    days_until_wedding?: number;
    urgency_level: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: string;
  audience: 'vendor' | 'couple' | 'admin';
  channels: {
    email?: {
      subject: string;
      body_html: string;
      body_text: string;
    };
    sms?: {
      message: string;
      max_length: number;
    };
    in_app?: {
      title: string;
      message: string;
      action_url?: string;
    };
  };
  wedding_specific: boolean;
  tier_requirements?: string[];
}

/**
 * CommunicationIntegrationService - Wedding industry communication coordinator
 * Handles multi-channel messaging for feature requests with wedding context
 */
export class CommunicationIntegrationService {
  private supabase = createClient();
  private logger = new Logger('CommunicationIntegration');
  private templates: Map<string, CommunicationTemplate> = new Map();

  constructor() {
    this.initializeWeddingTemplates();
  }

  /**
   * Initialize wedding industry communication templates
   */
  private initializeWeddingTemplates(): void {
    // Feature Request Approved - Client Notification
    this.templates.set('feature_approved_client', {
      id: 'feature_approved_client',
      name: 'Feature Request Approved - Client Notification',
      type: 'client_notification',
      audience: 'couple',
      wedding_specific: true,
      channels: {
        email: {
          subject: 'Great news! A feature you requested is coming to WedSync',
          body_html: `
            <h2>Your Feature Request Has Been Approved! 🎉</h2>
            <p>Hi {{couple_names}},</p>
            <p>We have some exciting news! The feature you requested "<strong>{{feature_title}}</strong>" has been approved and is now in development.</p>
            
            {{#if wedding_date}}
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Wedding Timeline Impact:</strong>
              <ul>
                <li>Your wedding is {{days_until_wedding}} days away</li>
                <li>Expected feature release: {{expected_release}}</li>
                <li>{{#if available_before_wedding}}✅ This will be available before your wedding!{{else}}⏰ This may not be ready before your wedding, but will help future couples{{/if}}</li>
              </ul>
            </div>
            {{/if}}

            <h3>What Happens Next?</h3>
            <p>Our development team is working hard to bring this feature to life. We'll keep you updated on the progress and notify you as soon as it's available.</p>

            <p>Thank you for helping us make WedSync better for all couples! 💕</p>
            
            <p><a href="{{feature_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Feature Request</a></p>
            
            <hr>
            <p><small>This notification was sent because you requested this feature. You can manage your notification preferences in your <a href="{{preferences_url}}">account settings</a>.</small></p>
          `,
          body_text: `
            Your Feature Request Has Been Approved! 

            Hi {{couple_names}},

            Great news! The feature you requested "{{feature_title}}" has been approved and is now in development.

            {{#if wedding_date}}Wedding Timeline:
            - Your wedding is {{days_until_wedding}} days away
            - Expected release: {{expected_release}}
            - {{#if available_before_wedding}}This will be available before your wedding!{{else}}This may not be ready before your wedding, but will help future couples{{/if}}
            {{/if}}

            Our development team is working hard to bring this feature to life. We'll keep you updated on progress.

            Thank you for helping us make WedSync better for all couples!

            View feature request: {{feature_url}}
          `,
        },
        sms: {
          message:
            '🎉 Your WedSync feature request "{{feature_title}}" has been approved and is in development! {{#if days_until_wedding}}{{days_until_wedding}} days to your wedding. {{/if}}View: {{short_url}}',
          max_length: 160,
        },
        in_app: {
          title: 'Feature Request Approved!',
          message: 'Your request for "{{feature_title}}" is now in development',
          action_url: '{{feature_url}}',
        },
      },
    });

    // Vendor Feature Update
    this.templates.set('vendor_feature_update', {
      id: 'vendor_feature_update',
      name: 'Vendor Feature Update',
      type: 'feature_announcement',
      audience: 'vendor',
      wedding_specific: true,
      tier_requirements: ['professional', 'scale', 'enterprise'],
      channels: {
        email: {
          subject: 'New WedSync Feature: {{feature_title}}',
          body_html: `
            <h2>New Feature Available: {{feature_title}}</h2>
            <p>Hi {{business_name}},</p>
            
            <p>We're excited to announce a new feature that will help you serve your clients better:</p>
            
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">{{feature_title}}</h3>
              <p>{{feature_description}}</p>
            </div>

            <h3>How This Helps Your Wedding Business:</h3>
            {{#each business_benefits}}
            <li>{{this}}</li>
            {{/each}}

            {{#if peak_season}}
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>💡 Peak Season Tip:</strong> This feature is especially valuable during peak wedding season ({{peak_months}}) when you're managing multiple clients.
            </div>
            {{/if}}

            <p><a href="{{feature_demo_url}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Try It Now</a></p>

            <p>Questions? Reply to this email or contact our support team.</p>

            <p>Here's to making your wedding business even more successful!</p>
            <p>The WedSync Team</p>
          `,
          body_text: `
            New Feature Available: {{feature_title}}

            Hi {{business_name}},

            We're excited to announce: {{feature_title}}

            {{feature_description}}

            Business Benefits:
            {{#each business_benefits}}
            - {{this}}
            {{/each}}

            {{#if peak_season}}Peak Season Tip: This feature is especially valuable during {{peak_months}} when managing multiple clients.{{/if}}

            Try it now: {{feature_demo_url}}

            Questions? Contact our support team.

            The WedSync Team
          `,
        },
        sms: {
          message:
            '🚀 New WedSync feature: {{feature_title}}! Perfect for your {{business_type}} business. Try it: {{short_url}}',
          max_length: 160,
        },
      },
    });

    // Timeline Feature Integration
    this.templates.set('timeline_feature_integration', {
      id: 'timeline_feature_integration',
      name: 'Timeline Feature Integration',
      type: 'feature_announcement',
      audience: 'couple',
      wedding_specific: true,
      channels: {
        email: {
          subject: 'Your wedding timeline just got smarter! ✨',
          body_html: `
            <h2>Timeline Update: {{feature_title}} ✨</h2>
            <p>Hi {{couple_names}},</p>
            
            <p>Great news! We've added "{{feature_title}}" to help make your wedding timeline even more organized.</p>

            {{#if wedding_date}}
            <div style="background: #f0f8f0; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
              <strong>Your Wedding Timeline ({{days_until_wedding}} days to go!):</strong>
              <ul>
                <li>📅 Wedding Date: {{wedding_date}}</li>
                <li>📋 Timeline Items: {{timeline_items_count}}</li>
                <li>👥 Vendors Involved: {{vendor_count}}</li>
                <li>✨ New Feature: {{feature_title}}</li>
              </ul>
            </div>
            {{/if}}

            <h3>How This Helps Your Wedding Planning:</h3>
            {{#each planning_benefits}}
            <li>{{this}}</li>
            {{/each}}

            {{#if urgent_timeline}}
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>⏰ Timeline Reminder:</strong> With your wedding coming up soon, this feature can help you stay organized during these final weeks!
            </div>
            {{/if}}

            <p><a href="{{timeline_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Timeline</a></p>

            <p>Happy planning! 💕</p>
            <p>The WedSync Team</p>
          `,
          body_text: `
            Timeline Update: {{feature_title}}

            Hi {{couple_names}},

            Great news! We've added "{{feature_title}}" to your wedding timeline tools.

            {{#if wedding_date}}Your Wedding Status:
            - Wedding Date: {{wedding_date}} ({{days_until_wedding}} days!)
            - Timeline Items: {{timeline_items_count}}
            - Vendors: {{vendor_count}}
            {{/if}}

            Planning Benefits:
            {{#each planning_benefits}}
            - {{this}}
            {{/each}}

            View your timeline: {{timeline_url}}

            Happy planning!
            The WedSync Team
          `,
        },
      },
    });

    this.logger.info('Wedding communication templates initialized', {
      template_count: this.templates.size,
    });
  }

  /**
   * Send feature request communication
   */
  async sendFeatureRequestCommunication(
    request: CommunicationRequest,
  ): Promise<void> {
    try {
      this.logger.info('Sending feature request communication', {
        type: request.type,
        recipient_id: request.recipient_id,
        channels: request.channels,
      });

      // Get user context for personalization
      const userContext = await userContextService.enrichUserContext(
        request.recipient_id,
        { depth: 'standard' },
      );

      // Get template
      const template = this.templates.get(request.template_id);
      if (!template) {
        throw new Error(`Template not found: ${request.template_id}`);
      }

      // Check tier requirements
      if (
        !this.checkTierAccess(
          userContext.userProfile.subscriptionTier,
          template.tier_requirements,
        )
      ) {
        this.logger.info('Communication skipped due to tier restrictions', {
          user_tier: userContext.userProfile.subscriptionTier,
          required_tiers: template.tier_requirements,
        });
        return;
      }

      // Prepare template data
      const templateData = await this.prepareTemplateData(request, userContext);

      // Send via each requested channel
      for (const channel of request.channels) {
        await this.sendViaChannel(
          channel,
          request.recipient_id,
          template,
          templateData,
        );
      }

      // Log successful communication
      await this.logCommunication(request, 'sent');
    } catch (error) {
      this.logger.error('Failed to send feature request communication', {
        error: error.message,
        request_type: request.type,
        recipient_id: request.recipient_id,
      });

      await this.logCommunication(request, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Integrate with existing wedding communications
   */
  async integrateWithWeddingCommunications(featureRequest: any): Promise<void> {
    try {
      // Update client communication templates if relevant
      if (featureRequest.category === 'communications') {
        await this.updateCommunicationTemplates(featureRequest);
      }

      // Integrate with timeline management
      if (featureRequest.category === 'timeline_management') {
        await this.syncWithTimelineIntegrations(featureRequest);
      }

      // Create customer journey integration
      await this.integrateWithCustomerJourneys(featureRequest);
    } catch (error) {
      this.logger.error('Failed to integrate with wedding communications', {
        error: error.message,
        feature_request_id: featureRequest.id,
      });
    }
  }

  /**
   * Check if user tier has access to communication features
   */
  private checkTierAccess(userTier: string, requiredTiers?: string[]): boolean {
    if (!requiredTiers || requiredTiers.length === 0) return true;

    const tierHierarchy = [
      'free',
      'starter',
      'professional',
      'scale',
      'enterprise',
    ];
    const userTierIndex = tierHierarchy.indexOf(userTier);
    const minRequiredIndex = Math.min(
      ...requiredTiers.map((tier) => tierHierarchy.indexOf(tier)),
    );

    return userTierIndex >= minRequiredIndex;
  }

  /**
   * Prepare template data with wedding context
   */
  private async prepareTemplateData(
    request: CommunicationRequest,
    userContext: any,
  ): Promise<Record<string, any>> {
    const data = {
      ...request.data,
      // User context
      business_name: userContext.userProfile.businessName,
      couple_names:
        userContext.userProfile.personalNames?.partner1 &&
        userContext.userProfile.personalNames?.partner2
          ? `${userContext.userProfile.personalNames.partner1} & ${userContext.userProfile.personalNames.partner2}`
          : userContext.userProfile.personalNames?.partner1 || 'Wedding Couple',
      business_type:
        userContext.weddingContext.supplierContext?.businessType ||
        'wedding professional',
      subscription_tier: userContext.userProfile.subscriptionTier,

      // Wedding context
      wedding_date: request.wedding_context?.wedding_date,
      days_until_wedding: request.wedding_context?.days_until_wedding,
      urgency_level: request.wedding_context?.urgency_level,

      // URLs
      feature_url: `${process.env.NEXT_PUBLIC_APP_URL}/feature-requests/${request.feature_request_id}`,
      timeline_url: `${process.env.NEXT_PUBLIC_APP_URL}/timeline`,
      preferences_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
      short_url: `${process.env.NEXT_PUBLIC_APP_URL}/f/${request.feature_request_id}`,

      // Conditional flags
      available_before_wedding: request.wedding_context?.days_until_wedding
        ? request.wedding_context.days_until_wedding > 30
        : false,
      urgent_timeline: request.wedding_context?.days_until_wedding
        ? request.wedding_context.days_until_wedding <= 30
        : false,
      peak_season: this.isPeakWeddingSeason(),
      peak_months: 'May through September',
    };

    return data;
  }

  /**
   * Send communication via specific channel
   */
  private async sendViaChannel(
    channel: 'email' | 'sms' | 'in_app',
    recipientId: string,
    template: CommunicationTemplate,
    data: Record<string, any>,
  ): Promise<void> {
    switch (channel) {
      case 'email':
        if (template.channels.email) {
          await this.sendEmail(recipientId, template.channels.email, data);
        }
        break;
      case 'sms':
        if (template.channels.sms) {
          await this.sendSMS(recipientId, template.channels.sms, data);
        }
        break;
      case 'in_app':
        if (template.channels.in_app) {
          await this.sendInApp(recipientId, template.channels.in_app, data);
        }
        break;
    }
  }

  /**
   * Send email using Resend
   */
  private async sendEmail(
    recipientId: string,
    template: any,
    data: Record<string, any>,
  ): Promise<void> {
    // Get user email
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('email')
      .eq('id', recipientId)
      .single();

    if (!profile?.email) {
      throw new Error('User email not found');
    }

    // Render template
    const subject = this.renderTemplate(template.subject, data);
    const bodyHtml = this.renderTemplate(template.body_html, data);
    const bodyText = this.renderTemplate(template.body_text, data);

    // Send via Resend (implementation would use actual Resend client)
    this.logger.info('Email would be sent via Resend', {
      to: profile.email,
      subject,
      body_length: bodyHtml.length,
    });
  }

  /**
   * Send SMS using Twilio
   */
  private async sendSMS(
    recipientId: string,
    template: any,
    data: Record<string, any>,
  ): Promise<void> {
    // Get user phone
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('phone')
      .eq('id', recipientId)
      .single();

    if (!profile?.phone) {
      throw new Error('User phone not found');
    }

    // Render and truncate message
    let message = this.renderTemplate(template.message, data);
    if (message.length > template.max_length) {
      message = message.substring(0, template.max_length - 3) + '...';
    }

    // Send via Twilio (implementation would use actual Twilio client)
    this.logger.info('SMS would be sent via Twilio', {
      to: profile.phone,
      message,
      length: message.length,
    });
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(
    recipientId: string,
    template: any,
    data: Record<string, any>,
  ): Promise<void> {
    const title = this.renderTemplate(template.title, data);
    const message = this.renderTemplate(template.message, data);
    const actionUrl = template.action_url
      ? this.renderTemplate(template.action_url, data)
      : null;

    // Store in database
    const { error } = await this.supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'feature_request',
      title,
      message,
      action_url: actionUrl,
      read: false,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Simple template rendering
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;

    // Replace {{variable}}
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    // Handle {{#if condition}}...{{/if}}
    rendered = rendered.replace(
      /{{#if\s+(\w+)}}(.*?){{\/if}}/gs,
      (match, condition, content) => {
        return data[condition] ? content : '';
      },
    );

    // Handle {{#each array}}...{{/each}}
    rendered = rendered.replace(
      /{{#each\s+(\w+)}}(.*?){{\/each}}/gs,
      (match, arrayName, content) => {
        const array = data[arrayName];
        if (!Array.isArray(array)) return '';
        return array.map((item) => content.replace(/{{this}}/g, item)).join('');
      },
    );

    return rendered;
  }

  /**
   * Check if current period is peak wedding season
   */
  private isPeakWeddingSeason(): boolean {
    const month = new Date().getMonth(); // 0-11
    // Peak season: May (4) through September (8)
    return month >= 4 && month <= 8;
  }

  /**
   * Update communication templates for feature integration
   */
  private async updateCommunicationTemplates(
    featureRequest: any,
  ): Promise<void> {
    // Add client update template for communication features
    const template = {
      name: `Client Update: ${featureRequest.title}`,
      type: 'feature_announcement',
      subject: 'New communication feature in WedSync!',
      body: `Hi {{client_name}}, we've added a new feature to help us communicate better: ${featureRequest.title}`,
      category: 'feature_announcements',
      wedding_contexts: ['planning', 'execution'],
      automated_trigger: {
        event: 'feature_request_completed',
        conditions: [`feature_request_id = '${featureRequest.id}'`],
      },
    };

    // Store template (implementation would save to templates table)
    this.logger.info('Communication template would be created', { template });
  }

  /**
   * Sync with timeline integrations
   */
  private async syncWithTimelineIntegrations(
    featureRequest: any,
  ): Promise<void> {
    // Integration with calendar services would go here
    this.logger.info('Timeline integration would be updated', {
      feature_request_id: featureRequest.id,
      category: featureRequest.category,
    });
  }

  /**
   * Integrate with customer journeys
   */
  private async integrateWithCustomerJourneys(
    featureRequest: any,
  ): Promise<void> {
    // Customer journey integration would go here
    this.logger.info('Customer journey integration would be updated', {
      feature_request_id: featureRequest.id,
    });
  }

  /**
   * Log communication for audit trail
   */
  private async logCommunication(
    request: CommunicationRequest,
    status: 'sent' | 'failed',
    error?: string,
  ): Promise<void> {
    const { error: logError } = await this.supabase
      .from('communication_logs')
      .insert({
        type: request.type,
        recipient_id: request.recipient_id,
        template_id: request.template_id,
        channels: request.channels,
        status,
        error_message: error,
        feature_request_id: request.feature_request_id,
      });

    if (logError) {
      this.logger.error('Failed to log communication', {
        error: logError.message,
      });
    }
  }
}

// Singleton instance
export const communicationService = new CommunicationIntegrationService();
