/**
 * PersonalizationOrchestrator - WS-209 Content Personalization Engine
 *
 * Orchestrates AI-driven content personalization across email, messaging, and CRM platforms.
 * Coordinates personalized content delivery based on user behavior, preferences, and wedding context.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

interface PersonalizationRequest {
  userId: string;
  organizationId: string;
  contentType: 'email' | 'sms' | 'push' | 'in_app';
  templateId: string;
  context: PersonalizationContext;
  deliveryChannel: string;
}

interface PersonalizationContext {
  weddingId?: string;
  vendorType?: string;
  weddingStage?: 'planning' | 'upcoming' | 'day_of' | 'post_wedding';
  userPreferences?: Record<string, any>;
  behaviorData?: BehaviorData;
  demographicData?: DemographicData;
}

interface BehaviorData {
  lastActive: string;
  engagementScore: number;
  preferredCommunicationTime?: string;
  clickThroughHistory: string[];
  contentInteractions: ContentInteraction[];
}

interface DemographicData {
  location?: string;
  timezone?: string;
  language?: string;
  budgetRange?: string;
  weddingSize?: 'intimate' | 'medium' | 'large';
}

interface ContentInteraction {
  contentId: string;
  interaction: 'view' | 'click' | 'share' | 'save' | 'skip';
  timestamp: string;
  duration?: number;
}

interface PersonalizedContent {
  contentId: string;
  personalizedText: string;
  personalizedSubject?: string;
  mediaAssets?: string[];
  ctaText?: string;
  personalizationScore: number;
  adaptations: ContentAdaptation[];
}

interface ContentAdaptation {
  field: string;
  originalValue: string;
  personalizedValue: string;
  reason: string;
}

export class PersonalizationOrchestrator {
  private supabase;
  private aiProviders: Map<string, any>;
  private contentCache: Map<string, PersonalizedContent>;
  private maxRetries: number = 3;

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
    this.aiProviders = new Map();
    this.contentCache = new Map();
  }

  /**
   * Main orchestration method - coordinates personalization across all channels
   */
  async personalizeContent(
    request: PersonalizationRequest,
  ): Promise<PersonalizedContent> {
    try {
      // 1. Validate request and get user profile
      const userProfile = await this.getUserProfile(
        request.userId,
        request.organizationId,
      );

      // 2. Enrich context with behavioral and demographic data
      const enrichedContext = await this.enrichPersonalizationContext(
        request.context,
        userProfile,
      );

      // 3. Generate personalized content using AI
      const personalizedContent = await this.generatePersonalizedContent(
        request.templateId,
        enrichedContext,
        request.contentType,
      );

      // 4. Apply channel-specific optimizations
      const optimizedContent = await this.optimizeForChannel(
        personalizedContent,
        request.deliveryChannel,
        enrichedContext,
      );

      // 5. Log personalization event
      await this.logPersonalizationEvent(request, optimizedContent);

      // 6. Cache personalized content
      this.contentCache.set(
        `${request.userId}-${request.templateId}`,
        optimizedContent,
      );

      return optimizedContent;
    } catch (error) {
      console.error('PersonalizationOrchestrator error:', error);
      return await this.getFallbackContent(
        request.templateId,
        request.contentType,
      );
    }
  }

  /**
   * Get user profile with personalization preferences
   */
  private async getUserProfile(userId: string, organizationId: string) {
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select(
        `
        *,
        personalization_preferences,
        communication_preferences,
        behavioral_data
      `,
      )
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile;
  }

  /**
   * Enrich personalization context with additional data
   */
  private async enrichPersonalizationContext(
    context: PersonalizationContext,
    userProfile: any,
  ): Promise<PersonalizationContext> {
    const enrichedContext = { ...context };

    try {
      // Add behavioral data
      if (userProfile?.behavioral_data) {
        enrichedContext.behaviorData = {
          ...context.behaviorData,
          ...userProfile.behavioral_data,
        };
      }

      // Add demographic data from profile
      enrichedContext.demographicData = {
        location: userProfile?.location,
        timezone: userProfile?.timezone,
        language: userProfile?.preferred_language || 'en',
        budgetRange: userProfile?.budget_range,
        weddingSize: userProfile?.wedding_size,
      };

      // Get wedding context if wedding ID provided
      if (context.weddingId) {
        const weddingData = await this.getWeddingContext(context.weddingId);
        enrichedContext.weddingStage = this.determineWeddingStage(weddingData);
      }

      // Get recent content interactions
      const recentInteractions = await this.getRecentContentInteractions(
        userProfile.id,
      );
      enrichedContext.behaviorData = {
        ...enrichedContext.behaviorData,
        contentInteractions: recentInteractions,
      };
    } catch (error) {
      console.error('Error enriching personalization context:', error);
    }

    return enrichedContext;
  }

  /**
   * Generate personalized content using AI providers
   */
  private async generatePersonalizedContent(
    templateId: string,
    context: PersonalizationContext,
    contentType: string,
  ): Promise<PersonalizedContent> {
    try {
      // Get base template
      const template = await this.getContentTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Build personalization prompt
      const prompt = this.buildPersonalizationPrompt(
        template,
        context,
        contentType,
      );

      // Call AI service for personalization
      const aiResponse = await this.callAIPersonalizationService(
        prompt,
        context,
      );

      // Parse and structure the response
      const personalizedContent: PersonalizedContent = {
        contentId: `${templateId}-${Date.now()}`,
        personalizedText: aiResponse.personalizedText,
        personalizedSubject: aiResponse.personalizedSubject,
        mediaAssets: aiResponse.mediaAssets || [],
        ctaText: aiResponse.ctaText,
        personalizationScore: aiResponse.confidence || 0.8,
        adaptations: aiResponse.adaptations || [],
      };

      return personalizedContent;
    } catch (error) {
      console.error('Error generating personalized content:', error);
      throw error;
    }
  }

  /**
   * Build AI prompt for personalization
   */
  private buildPersonalizationPrompt(
    template: any,
    context: PersonalizationContext,
    contentType: string,
  ): string {
    const userContext = JSON.stringify({
      weddingStage: context.weddingStage,
      vendorType: context.vendorType,
      preferences: context.userPreferences,
      location: context.demographicData?.location,
      weddingSize: context.demographicData?.weddingSize,
      engagementHistory: context.behaviorData?.contentInteractions?.slice(0, 5),
    });

    return `
      Personalize this ${contentType} content for a wedding vendor platform user:
      
      Template Content: ${template.content}
      User Context: ${userContext}
      
      Requirements:
      1. Personalize based on wedding stage and vendor type
      2. Adapt tone for user's engagement level
      3. Include relevant local/cultural context
      4. Optimize call-to-action for user behavior
      5. Maintain professional wedding industry tone
      
      Return JSON with: personalizedText, personalizedSubject, ctaText, adaptations array
    `;
  }

  /**
   * Call AI service for content personalization
   */
  private async callAIPersonalizationService(
    prompt: string,
    context: PersonalizationContext,
  ) {
    // This would integrate with OpenAI, Claude, or other AI services
    // For now, returning mock structured response

    const mockResponse = {
      personalizedText: 'Personalized content based on user context...',
      personalizedSubject: 'Your Wedding Planning Update',
      ctaText: 'Continue Your Planning',
      confidence: 0.85,
      adaptations: [
        {
          field: 'greeting',
          originalValue: 'Hello',
          personalizedValue: 'Good morning',
          reason: 'User typically engages in morning hours',
        },
      ],
    };

    return mockResponse;
  }

  /**
   * Optimize content for specific delivery channel
   */
  private async optimizeForChannel(
    content: PersonalizedContent,
    channel: string,
    context: PersonalizationContext,
  ): Promise<PersonalizedContent> {
    const optimized = { ...content };

    switch (channel) {
      case 'email':
        optimized.personalizedText = await this.optimizeForEmail(
          content.personalizedText,
          context,
        );
        break;
      case 'sms':
        optimized.personalizedText = await this.optimizeForSMS(
          content.personalizedText,
        );
        break;
      case 'push':
        optimized.personalizedText = await this.optimizeForPush(
          content.personalizedText,
        );
        break;
      case 'in_app':
        optimized.personalizedText = await this.optimizeForInApp(
          content.personalizedText,
          context,
        );
        break;
    }

    return optimized;
  }

  /**
   * Email-specific optimizations
   */
  private async optimizeForEmail(
    text: string,
    context: PersonalizationContext,
  ): Promise<string> {
    // Add email-specific formatting, links, unsubscribe options
    return text + '\n\nBest regards,\nThe WedSync Team';
  }

  /**
   * SMS-specific optimizations
   */
  private async optimizeForSMS(text: string): Promise<string> {
    // Truncate and optimize for SMS character limits
    return text.length > 160 ? text.substring(0, 157) + '...' : text;
  }

  /**
   * Push notification optimizations
   */
  private async optimizeForPush(text: string): Promise<string> {
    // Optimize for push notification character limits and impact
    return text.length > 100 ? text.substring(0, 97) + '...' : text;
  }

  /**
   * In-app message optimizations
   */
  private async optimizeForInApp(
    text: string,
    context: PersonalizationContext,
  ): Promise<string> {
    // Add interactive elements for in-app messages
    return text;
  }

  /**
   * Get wedding context for personalization
   */
  private async getWeddingContext(weddingId: string) {
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('wedding_date, venue_type, guest_count, budget_range')
      .eq('id', weddingId)
      .single();

    return wedding;
  }

  /**
   * Determine wedding stage based on wedding date
   */
  private determineWeddingStage(
    weddingData: any,
  ): PersonalizationContext['weddingStage'] {
    if (!weddingData?.wedding_date) return 'planning';

    const weddingDate = new Date(weddingData.wedding_date);
    const now = new Date();
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding < 0) return 'post_wedding';
    if (daysUntilWedding <= 7) return 'day_of';
    if (daysUntilWedding <= 30) return 'upcoming';
    return 'planning';
  }

  /**
   * Get recent content interactions for user
   */
  private async getRecentContentInteractions(
    userId: string,
  ): Promise<ContentInteraction[]> {
    const { data: interactions } = await this.supabase
      .from('content_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return interactions || [];
  }

  /**
   * Get content template
   */
  private async getContentTemplate(templateId: string) {
    const { data: template } = await this.supabase
      .from('content_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    return template;
  }

  /**
   * Get fallback content when personalization fails
   */
  private async getFallbackContent(
    templateId: string,
    contentType: string,
  ): Promise<PersonalizedContent> {
    const template = await this.getContentTemplate(templateId);

    return {
      contentId: `fallback-${templateId}`,
      personalizedText: template?.content || 'Default content',
      personalizationScore: 0.1,
      adaptations: [],
    };
  }

  /**
   * Log personalization event for analytics
   */
  private async logPersonalizationEvent(
    request: PersonalizationRequest,
    result: PersonalizedContent,
  ) {
    try {
      await this.supabase.from('personalization_events').insert({
        user_id: request.userId,
        organization_id: request.organizationId,
        template_id: request.templateId,
        content_type: request.contentType,
        personalization_score: result.personalizationScore,
        adaptations_count: result.adaptations.length,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging personalization event:', error);
    }
  }

  /**
   * Get personalization analytics
   */
  async getPersonalizationAnalytics(
    organizationId: string,
    timeRange: string = '7d',
  ) {
    const { data: analytics } = await this.supabase
      .from('personalization_events')
      .select(
        `
        content_type,
        personalization_score,
        created_at,
        adaptations_count
      `,
      )
      .eq('organization_id', organizationId)
      .gte(
        'created_at',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      );

    return {
      totalPersonalizations: analytics?.length || 0,
      averageScore:
        analytics?.reduce((acc, item) => acc + item.personalization_score, 0) /
        (analytics?.length || 1),
      contentTypeBreakdown: this.groupByContentType(analytics || []),
      trends: this.calculateTrends(analytics || []),
    };
  }

  private groupByContentType(analytics: any[]) {
    return analytics.reduce((acc, item) => {
      acc[item.content_type] = (acc[item.content_type] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateTrends(analytics: any[]) {
    // Calculate personalization trends over time
    return {
      daily: [],
      weekly: [],
      improvement: 0,
    };
  }
}

export default PersonalizationOrchestrator;
