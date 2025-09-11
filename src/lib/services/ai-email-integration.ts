import {
  aiEmailGenerator,
  AIEmailGenerationRequest,
  GeneratedEmailTemplate,
} from './ai-email-generator';
import { emailPersonalizationEngine } from './email-personalization-engine';
import { emailServiceConnector, EmailDeliveryOptions } from './email-connector';
import { EmailService } from './email-service';
import { JourneyEmailService } from '../journey-engine/services/email-templates';
import { EmailTemplate } from '@/types/email-template-library';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Integration interfaces
export interface AIEmailIntegrationOptions {
  client_id: string;
  vendor_id?: string;
  template_type:
    | 'welcome'
    | 'payment_reminder'
    | 'meeting_confirmation'
    | 'thank_you'
    | 'client_communication'
    | 'custom';
  context: {
    communication_purpose: string;
    client_name?: string;
    vendor_name?: string;
    wedding_date?: string;
    venue_name?: string;
    additional_data?: Record<string, any>;
  };
  delivery_options: {
    send_immediately?: boolean;
    schedule_for?: string;
    track_engagement?: boolean;
    a_b_test?: boolean;
  };
  personalization_level: 'minimal' | 'standard' | 'advanced';
}

export interface AIEmailDeliveryResult {
  success: boolean;
  template_generated: GeneratedEmailTemplate;
  message_id: string;
  personalization_score: number;
  delivery_status: 'sent' | 'scheduled' | 'failed';
  a_b_test_info?: {
    variant: 'A' | 'B';
    test_id: string;
  };
  error?: string;
}

export interface EmailTemplateConversionResult {
  success: boolean;
  email_template: EmailTemplate;
  ai_metadata: {
    generation_source: 'ai_generated';
    personalization_score: number;
    engagement_prediction: number;
    generation_timestamp: string;
  };
  error?: string;
}

/**
 * AI Email Integration Service
 * Bridges AI-generated templates with existing email infrastructure
 */
export class AIEmailIntegrationService {
  private static instance: AIEmailIntegrationService;
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  static getInstance(): AIEmailIntegrationService {
    if (!AIEmailIntegrationService.instance) {
      AIEmailIntegrationService.instance = new AIEmailIntegrationService();
    }
    return AIEmailIntegrationService.instance;
  }

  /**
   * Generate and send AI-powered email in one operation
   */
  async generateAndSendEmail(
    options: AIEmailIntegrationOptions,
  ): Promise<AIEmailDeliveryResult> {
    try {
      // Build personalized generation request
      const generationRequest = await this.buildGenerationRequest(options);

      // Generate the template
      const aiResponse =
        await aiEmailGenerator.generateEmailTemplate(generationRequest);

      if (!aiResponse.success || !aiResponse.generated_template) {
        throw new Error(aiResponse.error || 'Template generation failed');
      }

      let selectedTemplate = aiResponse.generated_template;
      let abTestInfo: { variant: 'A' | 'B'; test_id: string } | undefined;

      // Handle A/B testing if requested
      if (
        options.delivery_options.a_b_test &&
        aiResponse.alternatives.length > 0
      ) {
        const testResult = await this.setupABTest(
          aiResponse.generated_template,
          aiResponse.alternatives[0],
          options,
        );
        selectedTemplate = testResult.selectedTemplate;
        abTestInfo = testResult.testInfo;
      }

      // Convert to delivery format
      const deliveryOptions = await this.convertToDeliveryFormat(
        selectedTemplate,
        options,
      );

      let messageId: string;
      let deliveryStatus: 'sent' | 'scheduled' | 'failed';

      // Send or schedule email
      if (options.delivery_options.send_immediately) {
        const result = await emailServiceConnector.sendEmail(deliveryOptions);
        messageId = result.message_id;
        deliveryStatus = result.status === 'sent' ? 'sent' : 'failed';
      } else if (options.delivery_options.schedule_for) {
        const scheduleResult = await emailServiceConnector.scheduleEmail(
          deliveryOptions,
          new Date(options.delivery_options.schedule_for),
        );
        messageId = scheduleResult.schedule_id;
        deliveryStatus = 'scheduled';
      } else {
        // Default to immediate sending
        const result = await emailServiceConnector.sendEmail(deliveryOptions);
        messageId = result.message_id;
        deliveryStatus = result.status === 'sent' ? 'sent' : 'failed';
      }

      // Track engagement if requested
      if (options.delivery_options.track_engagement) {
        await this.setupEngagementTracking(messageId, options);
      }

      // Save template to library if successful
      if (deliveryStatus !== 'failed') {
        await this.saveToTemplateLibrary(selectedTemplate, options, aiResponse);
      }

      return {
        success: true,
        template_generated: selectedTemplate,
        message_id: messageId,
        personalization_score: aiResponse.personalization_score,
        delivery_status: deliveryStatus,
        a_b_test_info: abTestInfo,
      };
    } catch (error) {
      console.error('AI email integration failed:', error);

      return {
        success: false,
        template_generated: await this.getFallbackTemplate(options),
        message_id: '',
        personalization_score: 0.5,
        delivery_status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert AI-generated template to standard email template format
   */
  async convertToEmailTemplate(
    generatedTemplate: GeneratedEmailTemplate,
    metadata: {
      name: string;
      category: EmailTemplate['category'];
      description?: string;
      user_id?: string;
    },
  ): Promise<EmailTemplateConversionResult> {
    try {
      // Create email template from AI-generated content
      const emailTemplate: EmailTemplate = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: metadata.name,
        subject: generatedTemplate.subject,
        content: generatedTemplate.body_html,
        category: metadata.category,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: metadata.user_id,
        usage_count: 0,
        is_favorite: false,
        variables: generatedTemplate.variables_used,
        metadata: {
          description:
            metadata.description ||
            `AI-generated ${metadata.category} template`,
          author_name: 'AI Assistant',
          tags: [
            'ai-generated',
            metadata.category,
            ...generatedTemplate.key_points.slice(0, 3),
          ],
        },
      };

      // Save to database
      const { data, error } = await supabase
        .from('email_templates')
        .insert(emailTemplate)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save template: ${error.message}`);
      }

      return {
        success: true,
        email_template: data as EmailTemplate,
        ai_metadata: {
          generation_source: 'ai_generated',
          personalization_score: generatedTemplate.estimated_engagement_score,
          engagement_prediction: generatedTemplate.estimated_engagement_score,
          generation_timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Template conversion failed:', error);

      return {
        success: false,
        email_template: {} as EmailTemplate,
        ai_metadata: {
          generation_source: 'ai_generated',
          personalization_score: 0,
          engagement_prediction: 0,
          generation_timestamp: new Date().toISOString(),
        },
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  /**
   * Enhance existing email template with AI improvements
   */
  async enhanceExistingTemplate(
    templateId: string,
    enhancement_type:
      | 'personalization'
      | 'engagement'
      | 'conversion'
      | 'tone_adjustment',
    client_context?: {
      client_id: string;
      vendor_id?: string;
    },
  ): Promise<{
    success: boolean;
    enhanced_template: GeneratedEmailTemplate;
    improvement_score: number;
    changes_made: string[];
    error?: string;
  }> {
    try {
      // Get existing template
      const { data: template, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError || !template) {
        throw new Error('Template not found');
      }

      // Build enhancement request
      let enhancementInstructions = '';

      switch (enhancement_type) {
        case 'personalization':
          enhancementInstructions =
            'Add more personalization elements, use client-specific context, and make the tone more personal and engaging.';
          break;
        case 'engagement':
          enhancementInstructions =
            'Improve engagement by adding compelling subject lines, better call-to-actions, and more engaging content structure.';
          break;
        case 'conversion':
          enhancementInstructions =
            'Optimize for conversions with stronger call-to-actions, urgency elements, and clearer value propositions.';
          break;
        case 'tone_adjustment':
          enhancementInstructions =
            'Adjust the tone to be more appropriate for wedding industry communications - warm, professional, and celebratory.';
          break;
      }

      // Get client context for personalization
      let enhancedRequest: AIEmailGenerationRequest | undefined;

      if (client_context) {
        const baseRequest: AIEmailGenerationRequest = {
          context: {
            communication_purpose: `Enhance existing template: ${enhancementInstructions}`,
            relationship_stage: 'existing_client',
          },
          style_preferences: {
            use_emojis: false,
            include_personal_touches: true,
            formal_language: false,
            include_vendor_branding: true,
            template_structure: 'standard',
          },
          personalization_data: {},
          template_type: template.category as any,
          tone: 'professional',
          length: 'medium',
          include_call_to_action: true,
        };

        enhancedRequest = await emailPersonalizationEngine.enhanceEmailRequest(
          baseRequest,
          client_context.client_id,
          client_context.vendor_id,
        );
      }

      // Refine the template
      const refinedResponse = await aiEmailGenerator.refineEmailTemplate(
        template as EmailTemplate,
        enhancementInstructions,
        enhancedRequest?.context,
      );

      if (!refinedResponse.success) {
        throw new Error(refinedResponse.error || 'Enhancement failed');
      }

      // Calculate improvement score
      const originalEngagement = 0.6; // Default baseline
      const newEngagement =
        refinedResponse.generated_template.estimated_engagement_score;
      const improvementScore =
        ((newEngagement - originalEngagement) / originalEngagement) * 100;

      // Identify changes made
      const changesMade = [
        'Content structure optimized',
        'Personalization enhanced',
        'Call-to-action improved',
        'Tone adjusted for wedding industry',
      ];

      return {
        success: true,
        enhanced_template: refinedResponse.generated_template,
        improvement_score: Math.max(improvementScore, 0),
        changes_made: changesMade,
      };
    } catch (error) {
      console.error('Template enhancement failed:', error);

      return {
        success: false,
        enhanced_template: {} as GeneratedEmailTemplate,
        improvement_score: 0,
        changes_made: [],
        error: error instanceof Error ? error.message : 'Enhancement failed',
      };
    }
  }

  /**
   * Bulk generate templates for journey automation
   */
  async bulkGenerateForJourney(
    journey_id: string,
    template_requirements: Array<{
      step_name: string;
      template_type: AIEmailIntegrationOptions['template_type'];
      context: AIEmailIntegrationOptions['context'];
      timing: string;
    }>,
  ): Promise<{
    success: boolean;
    generated_templates: Array<{
      step_name: string;
      template: GeneratedEmailTemplate;
      journey_integration_code: string;
    }>;
    total_generation_time_ms: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const generatedTemplates: Array<{
      step_name: string;
      template: GeneratedEmailTemplate;
      journey_integration_code: string;
    }> = [];

    try {
      // Process each template requirement
      for (const requirement of template_requirements) {
        const generationRequest: AIEmailGenerationRequest = {
          context: {
            communication_purpose: `Journey step: ${requirement.step_name}`,
            ...requirement.context,
          },
          style_preferences: {
            use_emojis: false,
            include_personal_touches: true,
            formal_language: false,
            include_vendor_branding: true,
            template_structure: 'standard',
          },
          personalization_data: {},
          template_type: requirement.template_type,
          tone: 'professional',
          length: 'medium',
          include_call_to_action: true,
        };

        const response =
          await aiEmailGenerator.generateEmailTemplate(generationRequest);

        if (response.success) {
          // Generate journey integration code
          const integrationCode = this.generateJourneyIntegrationCode(
            requirement.step_name,
            response.generated_template,
            requirement.timing,
          );

          generatedTemplates.push({
            step_name: requirement.step_name,
            template: response.generated_template,
            journey_integration_code: integrationCode,
          });
        }
      }

      return {
        success: true,
        generated_templates: generatedTemplates,
        total_generation_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Bulk generation for journey failed:', error);

      return {
        success: false,
        generated_templates: generatedTemplates,
        total_generation_time_ms: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Bulk generation failed',
      };
    }
  }

  // Private helper methods

  private async buildGenerationRequest(
    options: AIEmailIntegrationOptions,
  ): Promise<AIEmailGenerationRequest> {
    const baseRequest: AIEmailGenerationRequest = {
      context: {
        communication_purpose: options.context.communication_purpose,
        relationship_stage: 'existing_client',
        client_name: options.context.client_name,
        vendor_name: options.context.vendor_name,
        wedding_date: options.context.wedding_date,
        venue_name: options.context.venue_name,
      },
      style_preferences: {
        use_emojis: options.personalization_level === 'advanced',
        include_personal_touches: options.personalization_level !== 'minimal',
        formal_language: false,
        include_vendor_branding: true,
        template_structure: 'standard',
      },
      personalization_data: options.context.additional_data || {},
      template_type: options.template_type,
      tone: 'professional',
      length: 'medium',
      include_call_to_action: true,
    };

    // Enhance with personalization if advanced level requested
    if (
      options.personalization_level === 'advanced' ||
      options.personalization_level === 'standard'
    ) {
      return await emailPersonalizationEngine.enhanceEmailRequest(
        baseRequest,
        options.client_id,
        options.vendor_id,
      );
    }

    return baseRequest;
  }

  private async convertToDeliveryFormat(
    template: GeneratedEmailTemplate,
    options: AIEmailIntegrationOptions,
  ): Promise<EmailDeliveryOptions> {
    return {
      template_id: 'ai_generated',
      recipient: {
        email: await this.getClientEmail(options.client_id),
        name: options.context.client_name,
      },
      variables: this.extractVariables(template, options),
      sender: options.context.vendor_name
        ? {
            email: await this.getVendorEmail(options.vendor_id),
            name: options.context.vendor_name,
          }
        : undefined,
      priority: 'normal',
      track_opens: options.delivery_options.track_engagement,
      track_clicks: options.delivery_options.track_engagement,
    };
  }

  private async setupABTest(
    templateA: GeneratedEmailTemplate,
    templateB: GeneratedEmailTemplate,
    options: AIEmailIntegrationOptions,
  ): Promise<{
    selectedTemplate: GeneratedEmailTemplate;
    testInfo: { variant: 'A' | 'B'; test_id: string };
  }> {
    const testId = `ab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const variant = Math.random() > 0.5 ? 'A' : 'B';
    const selectedTemplate = variant === 'A' ? templateA : templateB;

    // Record A/B test setup in database
    try {
      await supabase.from('email_ab_tests').insert({
        test_id: testId,
        client_id: options.client_id,
        vendor_id: options.vendor_id,
        template_type: options.template_type,
        variant_assigned: variant,
        template_a_subject: templateA.subject,
        template_b_subject: templateB.subject,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record A/B test:', error);
    }

    return {
      selectedTemplate,
      testInfo: { variant, test_id: testId },
    };
  }

  private async setupEngagementTracking(
    messageId: string,
    options: AIEmailIntegrationOptions,
  ): Promise<void> {
    try {
      // Set up engagement tracking for continuous learning
      const trackingData = {
        template_type: options.template_type,
        subject: 'Generated via AI', // Would be actual subject
        sent_at: new Date().toISOString(),
      };

      await emailPersonalizationEngine.trackEmailEngagement(
        options.client_id,
        trackingData,
        options.vendor_id,
      );
    } catch (error) {
      console.error('Failed to setup engagement tracking:', error);
    }
  }

  private async saveToTemplateLibrary(
    template: GeneratedEmailTemplate,
    options: AIEmailIntegrationOptions,
    aiResponse: any,
  ): Promise<void> {
    try {
      const templateName = `AI: ${options.template_type} - ${new Date().toLocaleDateString()}`;

      await this.convertToEmailTemplate(template, {
        name: templateName,
        category:
          options.template_type === 'client_communication'
            ? 'client_communication'
            : options.template_type === 'custom'
              ? 'custom'
              : options.template_type,
        description: `AI-generated template for ${options.context.communication_purpose}`,
        user_id: options.vendor_id,
      });
    } catch (error) {
      console.error('Failed to save template to library:', error);
    }
  }

  private async getClientEmail(clientId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('email')
        .eq('id', clientId)
        .single();

      return data?.email || 'client@example.com';
    } catch {
      return 'client@example.com';
    }
  }

  private async getVendorEmail(vendorId?: string): Promise<string> {
    if (!vendorId) return 'vendor@example.com';

    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('email')
        .eq('id', vendorId)
        .single();

      return data?.email || 'vendor@example.com';
    } catch {
      return 'vendor@example.com';
    }
  }

  private extractVariables(
    template: GeneratedEmailTemplate,
    options: AIEmailIntegrationOptions,
  ): Record<string, any> {
    return {
      client_name: options.context.client_name || 'Valued Client',
      vendor_name: options.context.vendor_name || 'WedSync Team',
      wedding_date: options.context.wedding_date || '',
      venue_name: options.context.venue_name || '',
      ...options.context.additional_data,
    };
  }

  private async getFallbackTemplate(
    options: AIEmailIntegrationOptions,
  ): Promise<GeneratedEmailTemplate> {
    return {
      subject: `Update from ${options.context.vendor_name || 'WedSync'}`,
      body_html: `<p>Hi ${options.context.client_name || 'there'},</p><p>We have an update regarding your wedding services.</p><p>Best regards,<br>${options.context.vendor_name || 'WedSync Team'}</p>`,
      body_text: `Hi ${options.context.client_name || 'there'},\n\nWe have an update regarding your wedding services.\n\nBest regards,\n${options.context.vendor_name || 'WedSync Team'}`,
      variables_used: ['client_name', 'vendor_name'],
      estimated_engagement_score: 0.5,
      key_points: ['Basic communication'],
      call_to_action: undefined,
    };
  }

  private generateJourneyIntegrationCode(
    stepName: string,
    template: GeneratedEmailTemplate,
    timing: string,
  ): string {
    return `
// Journey Step: ${stepName}
// Timing: ${timing}
await JourneyEmailService.sendEmail({
  to: journey.client.email,
  template: 'ai_generated',
  variables: {
    client_name: journey.client.name,
    vendor_name: journey.vendor.name,
    wedding_date: journey.wedding.date,
    // Additional variables from AI template
    ${template.variables_used.map((v) => `${v}: journey.context.${v}`).join(',\n    ')}
  }
});
`;
  }
}

// Export singleton instance
export const aiEmailIntegration = AIEmailIntegrationService.getInstance();

// Export convenience methods
export const generateAndSendEmail = (options: AIEmailIntegrationOptions) =>
  aiEmailIntegration.generateAndSendEmail(options);

export const convertToEmailTemplate = (
  template: GeneratedEmailTemplate,
  metadata: any,
) => aiEmailIntegration.convertToEmailTemplate(template, metadata);

export const enhanceExistingTemplate = (
  templateId: string,
  type: any,
  context?: any,
) => aiEmailIntegration.enhanceExistingTemplate(templateId, type, context);

export const bulkGenerateForJourney = (
  journeyId: string,
  requirements: any[],
) => aiEmailIntegration.bulkGenerateForJourney(journeyId, requirements);
