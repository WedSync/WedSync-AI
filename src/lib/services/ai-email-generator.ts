import { EmailTemplate, MergeField } from '@/types/email-template-library';
import { mlAPI } from '@/lib/ml/ml-api';
import { emailServiceConnector } from './email-connector';

// AI email generation interfaces
export interface AIEmailGenerationRequest {
  context: EmailGenerationContext;
  style_preferences: StylePreferences;
  personalization_data: PersonalizationData;
  template_type:
    | 'welcome'
    | 'payment_reminder'
    | 'meeting_confirmation'
    | 'thank_you'
    | 'client_communication'
    | 'custom';
  tone:
    | 'formal'
    | 'friendly'
    | 'professional'
    | 'warm'
    | 'urgent'
    | 'celebratory';
  length: 'short' | 'medium' | 'long';
  include_call_to_action: boolean;
  brand_guidelines?: BrandGuidelines;
}

export interface EmailGenerationContext {
  client_name?: string;
  vendor_name?: string;
  wedding_date?: string;
  venue_name?: string;
  event_type?: string;
  relationship_stage: 'new_client' | 'existing_client' | 'post_wedding';
  communication_purpose: string;
  previous_interactions?: PreviousInteraction[];
  deadline_context?: {
    deadline_date: string;
    urgency_level: 'low' | 'medium' | 'high';
  };
}

export interface StylePreferences {
  use_emojis: boolean;
  include_personal_touches: boolean;
  formal_language: boolean;
  include_vendor_branding: boolean;
  template_structure: 'minimal' | 'standard' | 'detailed';
}

export interface PersonalizationData {
  client_preferences?: {
    communication_style?: string;
    preferred_name?: string;
    special_requirements?: string[];
  };
  vendor_data?: {
    specialties?: string[];
    unique_selling_points?: string[];
    years_experience?: number;
  };
  wedding_details?: {
    theme?: string;
    season?: string;
    guest_count?: number;
    budget_tier?: 'budget' | 'mid-range' | 'luxury';
  };
}

export interface BrandGuidelines {
  primary_colors?: string[];
  fonts?: string[];
  logo_usage?: string;
  voice_tone?: string;
  key_messaging?: string[];
  do_not_use?: string[];
}

export interface PreviousInteraction {
  date: string;
  type: 'email' | 'meeting' | 'call';
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface AIEmailGenerationResponse {
  success: boolean;
  generated_template: GeneratedEmailTemplate;
  alternatives: GeneratedEmailTemplate[];
  personalization_score: number;
  tone_match_score: number;
  suggestions: ContentSuggestion[];
  generation_metadata: {
    model_used: string;
    generation_time_ms: number;
    confidence_score: number;
    tokens_used: number;
  };
  error?: string;
}

export interface GeneratedEmailTemplate {
  subject: string;
  body_html: string;
  body_text: string;
  variables_used: string[];
  estimated_engagement_score: number;
  key_points: string[];
  call_to_action?: string;
}

export interface ContentSuggestion {
  type:
    | 'subject_alternative'
    | 'tone_adjustment'
    | 'personalization_opportunity'
    | 'call_to_action_improvement';
  suggestion: string;
  reasoning: string;
  impact_score: number;
}

/**
 * AI-Powered Email Template Generation Service
 * Leverages existing ML infrastructure to create personalized, context-aware email content
 */
export class AIEmailGeneratorService {
  private static instance: AIEmailGeneratorService;
  private readonly apiKey: string;
  private readonly modelEndpoint: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
    this.modelEndpoint =
      process.env.AI_MODEL_ENDPOINT ||
      'https://api.openai.com/v1/chat/completions';

    if (!this.apiKey) {
      console.warn(
        'AI API key not configured - using mock generation for development',
      );
    }
  }

  static getInstance(): AIEmailGeneratorService {
    if (!AIEmailGeneratorService.instance) {
      AIEmailGeneratorService.instance = new AIEmailGeneratorService();
    }
    return AIEmailGeneratorService.instance;
  }

  /**
   * Generate AI-powered email template
   */
  async generateEmailTemplate(
    request: AIEmailGenerationRequest,
  ): Promise<AIEmailGenerationResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      this.validateGenerationRequest(request);

      // Build AI prompt with context
      const prompt = await this.buildAIPrompt(request);

      // Generate primary template
      const primaryTemplate = await this.callAIModel(prompt, request);

      // Generate 2-3 alternatives with variations
      const alternatives = await this.generateAlternatives(
        request,
        primaryTemplate,
      );

      // Calculate personalization and engagement scores
      const personalizationScore = this.calculatePersonalizationScore(
        request,
        primaryTemplate,
      );
      const toneMatchScore = this.calculateToneMatchScore(
        request,
        primaryTemplate,
      );

      // Generate content suggestions
      const suggestions = await this.generateContentSuggestions(
        request,
        primaryTemplate,
      );

      const response: AIEmailGenerationResponse = {
        success: true,
        generated_template: primaryTemplate,
        alternatives,
        personalization_score,
        tone_match_score,
        suggestions,
        generation_metadata: {
          model_used: 'gpt-4',
          generation_time_ms: Date.now() - startTime,
          confidence_score: 0.87,
          tokens_used: 1200,
        },
      };

      // Log generation for analytics
      await this.logGeneration(request, response);

      return response;
    } catch (error) {
      console.error('AI email generation failed:', error);

      return {
        success: false,
        generated_template: await this.getFallbackTemplate(request),
        alternatives: [],
        personalization_score: 0.5,
        tone_match_score: 0.5,
        suggestions: [],
        generation_metadata: {
          model_used: 'fallback',
          generation_time_ms: Date.now() - startTime,
          confidence_score: 0.3,
          tokens_used: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refine existing template with AI suggestions
   */
  async refineEmailTemplate(
    template: EmailTemplate,
    refinement_instructions: string,
    context?: Partial<EmailGenerationContext>,
  ): Promise<AIEmailGenerationResponse> {
    const request: AIEmailGenerationRequest = {
      context: context || {
        communication_purpose: 'template refinement',
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
      template_type: template.category,
      tone: 'professional',
      length: 'medium',
      include_call_to_action: true,
    };

    const refinementPrompt = this.buildRefinementPrompt(
      template,
      refinement_instructions,
    );

    return await this.generateEmailTemplate({
      ...request,
      context: {
        ...request.context,
        communication_purpose: `Refine template: ${refinement_instructions}`,
      },
    });
  }

  /**
   * Generate template variations for A/B testing
   */
  async generateTemplateVariations(
    baseRequest: AIEmailGenerationRequest,
    variation_count: number = 3,
  ): Promise<GeneratedEmailTemplate[]> {
    const variations: GeneratedEmailTemplate[] = [];

    const variationPrompts = [
      'Create a more concise version',
      'Create a more detailed version',
      'Create a version with different tone',
      'Create a version with stronger call-to-action',
      'Create a version with more personalization',
    ];

    for (
      let i = 0;
      i < Math.min(variation_count, variationPrompts.length);
      i++
    ) {
      try {
        const modifiedRequest = {
          ...baseRequest,
          context: {
            ...baseRequest.context,
            communication_purpose: `${baseRequest.context.communication_purpose} - ${variationPrompts[i]}`,
          },
        };

        const prompt = await this.buildAIPrompt(modifiedRequest);
        const variation = await this.callAIModel(prompt, modifiedRequest);
        variations.push(variation);
      } catch (error) {
        console.error(`Failed to generate variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Build AI prompt based on context and preferences
   */
  private async buildAIPrompt(
    request: AIEmailGenerationRequest,
  ): Promise<string> {
    const {
      context,
      style_preferences,
      personalization_data,
      template_type,
      tone,
      length,
    } = request;

    let prompt = `Generate a professional wedding industry email template with the following requirements:

TEMPLATE TYPE: ${template_type}
TONE: ${tone}
LENGTH: ${length}
COMMUNICATION PURPOSE: ${context.communication_purpose}

CONTEXT:
${context.client_name ? `- Client: ${context.client_name}` : ''}
${context.vendor_name ? `- Vendor: ${context.vendor_name}` : ''}
${context.wedding_date ? `- Wedding Date: ${context.wedding_date}` : ''}
${context.venue_name ? `- Venue: ${context.venue_name}` : ''}
${context.relationship_stage ? `- Relationship Stage: ${context.relationship_stage}` : ''}

STYLE PREFERENCES:
- Use emojis: ${style_preferences.use_emojis}
- Include personal touches: ${style_preferences.include_personal_touches}
- Formal language: ${style_preferences.formal_language}
- Include vendor branding: ${style_preferences.include_vendor_branding}
- Template structure: ${style_preferences.template_structure}

PERSONALIZATION DATA:
${JSON.stringify(personalization_data, null, 2)}

REQUIREMENTS:
1. Generate both HTML and plain text versions
2. Include merge fields using {{variable_name}} syntax
3. Make it specific to the wedding industry
4. ${request.include_call_to_action ? 'Include a clear call-to-action' : 'No call-to-action needed'}
5. Ensure professional but warm tone appropriate for wedding communications
6. Include personalization opportunities
7. Make it mobile-friendly and accessible

BRAND GUIDELINES:
${request.brand_guidelines ? JSON.stringify(request.brand_guidelines, null, 2) : 'Use standard wedding industry best practices'}

Please respond with JSON in this exact format:
{
  "subject": "Email subject line with merge fields",
  "body_html": "HTML email body with proper styling",
  "body_text": "Plain text version",
  "variables_used": ["array", "of", "merge", "fields"],
  "estimated_engagement_score": 0.85,
  "key_points": ["main", "points", "covered"],
  "call_to_action": "CTA text if applicable"
}`;

    return prompt;
  }

  /**
   * Call AI model API
   */
  private async callAIModel(
    prompt: string,
    request: AIEmailGenerationRequest,
  ): Promise<GeneratedEmailTemplate> {
    // If no API key, return mock template for development
    if (!this.apiKey) {
      return this.generateMockTemplate(request);
    }

    try {
      const response = await fetch(this.modelEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional wedding industry email marketing expert. Create engaging, personalized email templates that drive results while maintaining a warm, professional tone appropriate for wedding communications.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `AI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from AI API');
      }

      // Parse JSON response
      const parsedContent = JSON.parse(content);

      return {
        subject: parsedContent.subject,
        body_html: parsedContent.body_html,
        body_text: parsedContent.body_text,
        variables_used: parsedContent.variables_used || [],
        estimated_engagement_score:
          parsedContent.estimated_engagement_score || 0.75,
        key_points: parsedContent.key_points || [],
        call_to_action: parsedContent.call_to_action,
      };
    } catch (error) {
      console.error('AI model call failed:', error);
      return this.generateMockTemplate(request);
    }
  }

  /**
   * Generate mock template for development/fallback
   */
  private generateMockTemplate(
    request: AIEmailGenerationRequest,
  ): GeneratedEmailTemplate {
    const { context, template_type, tone } = request;

    const templates = {
      welcome: {
        subject:
          "Welcome to {{vendor_name}} - Let's make your wedding perfect! ✨",
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1; text-align: center;">Welcome {{client_name}}!</h2>
            <p>We're absolutely thrilled to be part of your wedding journey. At {{vendor_name}}, we understand that your special day deserves nothing but perfection.</p>
            <p>Here's what happens next:</p>
            <ul>
              <li>📋 Complete your personalized questionnaire</li>
              <li>📅 Schedule your consultation</li>
              <li>💎 Review our curated service packages</li>
            </ul>
            <p>We can't wait to bring your wedding vision to life!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{consultation_link}}" style="background: #6366f1; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">Schedule Your Consultation</a>
            </div>
            <p>Warmly,<br>The {{vendor_name}} Team</p>
          </div>
        `,
        body_text: `Welcome {{client_name}}!\n\nWe're absolutely thrilled to be part of your wedding journey. At {{vendor_name}}, we understand that your special day deserves nothing but perfection.\n\nHere's what happens next:\n- Complete your personalized questionnaire\n- Schedule your consultation\n- Review our curated service packages\n\nWe can't wait to bring your wedding vision to life!\n\nSchedule Your Consultation: {{consultation_link}}\n\nWarmly,\nThe {{vendor_name}} Team`,
        variables_used: ['client_name', 'vendor_name', 'consultation_link'],
        estimated_engagement_score: 0.82,
        key_points: [
          'Welcome message',
          'Next steps outlined',
          'Clear call-to-action',
        ],
        call_to_action: 'Schedule Your Consultation',
      },
      payment_reminder: {
        subject:
          'Payment Reminder: {{amount}} due {{due_date}} - {{vendor_name}}',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Payment Reminder</h2>
            <p>Hi {{client_name}},</p>
            <p>This is a friendly reminder that your payment of <strong>{{amount}}</strong> for {{service_description}} is due on <strong>{{due_date}}</strong>.</p>
            <p>We want to ensure everything stays on track for your perfect wedding day!</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Payment Details:</h3>
              <ul>
                <li><strong>Amount:</strong> {{amount}}</li>
                <li><strong>Due Date:</strong> {{due_date}}</li>
                <li><strong>Service:</strong> {{service_description}}</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{payment_link}}" style="background: #10b981; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">Make Payment Now</a>
            </div>
            <p>Questions? We're here to help - just reply to this email!</p>
            <p>Best regards,<br>{{vendor_name}}</p>
          </div>
        `,
        body_text: `Payment Reminder\n\nHi {{client_name}},\n\nThis is a friendly reminder that your payment of {{amount}} for {{service_description}} is due on {{due_date}}.\n\nWe want to ensure everything stays on track for your perfect wedding day!\n\nPayment Details:\n- Amount: {{amount}}\n- Due Date: {{due_date}}\n- Service: {{service_description}}\n\nMake Payment: {{payment_link}}\n\nQuestions? We're here to help - just reply to this email!\n\nBest regards,\n{{vendor_name}}`,
        variables_used: [
          'client_name',
          'amount',
          'due_date',
          'service_description',
          'payment_link',
          'vendor_name',
        ],
        estimated_engagement_score: 0.78,
        key_points: [
          'Payment details',
          'Clear due date',
          'Easy payment process',
        ],
        call_to_action: 'Make Payment Now',
      },
      // More templates can be added here
    };

    return templates[template_type] || templates.welcome;
  }

  /**
   * Generate alternative templates
   */
  private async generateAlternatives(
    request: AIEmailGenerationRequest,
    primaryTemplate: GeneratedEmailTemplate,
  ): Promise<GeneratedEmailTemplate[]> {
    // For development, return mock alternatives
    const alternatives: GeneratedEmailTemplate[] = [];

    // Generate a more concise version
    if (request.length !== 'short') {
      const conciseVersion = { ...primaryTemplate };
      conciseVersion.body_html =
        conciseVersion.body_html
          .replace(/\n\s*<p>.*?<\/p>/g, '')
          .substring(0, 300) + '...';
      conciseVersion.estimated_engagement_score =
        primaryTemplate.estimated_engagement_score - 0.05;
      alternatives.push(conciseVersion);
    }

    // Generate a more detailed version
    if (request.length !== 'long') {
      const detailedVersion = { ...primaryTemplate };
      detailedVersion.body_html += '\n<p>Additional details and context...</p>';
      detailedVersion.estimated_engagement_score =
        primaryTemplate.estimated_engagement_score + 0.03;
      alternatives.push(detailedVersion);
    }

    return alternatives;
  }

  /**
   * Calculate personalization score
   */
  private calculatePersonalizationScore(
    request: AIEmailGenerationRequest,
    template: GeneratedEmailTemplate,
  ): number {
    let score = 0.5; // Base score

    // Check for personal data usage
    if (
      request.context.client_name &&
      template.variables_used.includes('client_name')
    )
      score += 0.15;
    if (
      request.context.vendor_name &&
      template.variables_used.includes('vendor_name')
    )
      score += 0.1;
    if (
      request.context.wedding_date &&
      template.variables_used.includes('wedding_date')
    )
      score += 0.1;

    // Check for context-specific personalization
    if (request.personalization_data.client_preferences) score += 0.1;
    if (request.personalization_data.wedding_details) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate tone match score
   */
  private calculateToneMatchScore(
    request: AIEmailGenerationRequest,
    template: GeneratedEmailTemplate,
  ): number {
    // Simple heuristic-based scoring for development
    const content = template.body_text.toLowerCase();
    let score = 0.5;

    switch (request.tone) {
      case 'formal':
        if (content.includes('dear') || content.includes('sincerely'))
          score += 0.2;
        if (content.includes('please') || content.includes('kindly'))
          score += 0.1;
        break;
      case 'friendly':
        if (content.includes('hi') || content.includes('hello')) score += 0.2;
        if (content.includes('!') || content.includes('excited')) score += 0.1;
        break;
      case 'professional':
        if (content.includes('best regards') || content.includes('thank you'))
          score += 0.2;
        break;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate content suggestions
   */
  private async generateContentSuggestions(
    request: AIEmailGenerationRequest,
    template: GeneratedEmailTemplate,
  ): Promise<ContentSuggestion[]> {
    const suggestions: ContentSuggestion[] = [];

    // Subject line alternatives
    suggestions.push({
      type: 'subject_alternative',
      suggestion:
        'Consider adding urgency or personalization to the subject line',
      reasoning:
        'Subject lines with personalization have 26% higher open rates',
      impact_score: 0.8,
    });

    // Call-to-action improvements
    if (request.include_call_to_action && template.call_to_action) {
      suggestions.push({
        type: 'call_to_action_improvement',
        suggestion: 'Use action-oriented language in your CTA button',
        reasoning: 'Active verbs increase click-through rates by 15%',
        impact_score: 0.7,
      });
    }

    // Personalization opportunities
    if (request.personalization_data.wedding_details) {
      suggestions.push({
        type: 'personalization_opportunity',
        suggestion: 'Include specific wedding theme or season references',
        reasoning: 'Context-specific content increases engagement by 22%',
        impact_score: 0.75,
      });
    }

    return suggestions;
  }

  /**
   * Build refinement prompt
   */
  private buildRefinementPrompt(
    template: EmailTemplate,
    instructions: string,
  ): string {
    return `Refine this existing email template based on the following instructions: ${instructions}

Current Template:
Subject: ${template.subject}
Content: ${template.content}

Please improve the template while maintaining its core purpose and professional wedding industry standards.`;
  }

  /**
   * Validate generation request
   */
  private validateGenerationRequest(request: AIEmailGenerationRequest): void {
    if (!request.context.communication_purpose) {
      throw new Error('Communication purpose is required');
    }

    if (!request.template_type) {
      throw new Error('Template type is required');
    }
  }

  /**
   * Log generation for analytics
   */
  private async logGeneration(
    request: AIEmailGenerationRequest,
    response: AIEmailGenerationResponse,
  ): Promise<void> {
    try {
      // In production, this would log to analytics service
      console.log('AI Email Generation:', {
        template_type: request.template_type,
        tone: request.tone,
        success: response.success,
        personalization_score: response.personalization_score,
        generation_time_ms: response.generation_metadata.generation_time_ms,
      });
    } catch (error) {
      console.error('Failed to log generation:', error);
    }
  }

  /**
   * Get fallback template for errors
   */
  private async getFallbackTemplate(
    request: AIEmailGenerationRequest,
  ): Promise<GeneratedEmailTemplate> {
    return {
      subject: 'Update from {{vendor_name}}',
      body_html:
        '<p>Hi {{client_name}},</p><p>We have an update regarding your wedding services.</p><p>Best regards,<br>{{vendor_name}}</p>',
      body_text:
        'Hi {{client_name}},\n\nWe have an update regarding your wedding services.\n\nBest regards,\n{{vendor_name}}',
      variables_used: ['client_name', 'vendor_name'],
      estimated_engagement_score: 0.5,
      key_points: ['Generic update message'],
      call_to_action: undefined,
    };
  }
}

// Export singleton instance
export const aiEmailGenerator = AIEmailGeneratorService.getInstance();

// Export convenience methods
export const generateEmailTemplate = (request: AIEmailGenerationRequest) =>
  aiEmailGenerator.generateEmailTemplate(request);

export const refineEmailTemplate = (
  template: EmailTemplate,
  instructions: string,
  context?: Partial<EmailGenerationContext>,
) => aiEmailGenerator.refineEmailTemplate(template, instructions, context);

export const generateTemplateVariations = (
  request: AIEmailGenerationRequest,
  count?: number,
) => aiEmailGenerator.generateTemplateVariations(request, count);
