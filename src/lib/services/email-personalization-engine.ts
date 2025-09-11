import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import {
  EmailGenerationContext,
  PersonalizationData,
  AIEmailGenerationRequest,
} from './ai-email-generator';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Personalization interfaces
export interface PersonalizationProfile {
  client_id: string;
  vendor_id?: string;
  communication_preferences: CommunicationPreferences;
  behavioral_data: BehavioralData;
  wedding_context: WeddingContextData;
  interaction_history: InteractionHistory[];
  personalization_score: number;
  last_updated: string;
}

export interface CommunicationPreferences {
  preferred_tone: 'formal' | 'friendly' | 'professional' | 'warm';
  frequency_preference: 'minimal' | 'regular' | 'frequent';
  content_length: 'short' | 'medium' | 'long';
  include_emojis: boolean;
  language: string;
  time_zone: string;
  preferred_contact_time?: {
    start_hour: number;
    end_hour: number;
  };
}

export interface BehavioralData {
  email_engagement: {
    open_rate: number;
    click_rate: number;
    response_rate: number;
    preferred_subject_types: string[];
    engagement_days: string[];
    engagement_times: number[];
  };
  communication_patterns: {
    response_time_avg_hours: number;
    preferred_communication_channels: string[];
    decision_making_style: 'quick' | 'deliberate' | 'collaborative';
  };
  content_preferences: {
    likes_detailed_info: boolean;
    prefers_visual_content: boolean;
    responds_to_urgency: boolean;
    values_personal_touch: boolean;
  };
}

export interface WeddingContextData {
  wedding_date: string;
  days_until_wedding: number;
  wedding_phase:
    | 'early_planning'
    | 'mid_planning'
    | 'final_month'
    | 'post_wedding';
  venue_type: string;
  guest_count: number;
  budget_tier: 'budget' | 'mid-range' | 'luxury';
  wedding_style: string;
  special_requirements: string[];
  vendor_relationships: VendorRelationship[];
}

export interface VendorRelationship {
  vendor_id: string;
  vendor_name: string;
  service_type: string;
  relationship_stage: 'prospective' | 'contracted' | 'active' | 'completed';
  communication_frequency: number;
  satisfaction_score?: number;
  last_interaction_date: string;
}

export interface InteractionHistory {
  date: string;
  type:
    | 'email_sent'
    | 'email_opened'
    | 'email_clicked'
    | 'meeting'
    | 'call'
    | 'payment'
    | 'form_completed';
  details: {
    subject?: string;
    template_type?: string;
    engagement_score?: number;
    sentiment?: 'positive' | 'neutral' | 'negative';
    outcome?: string;
  };
}

export interface PersonalizationRecommendation {
  field: string;
  recommendation: string;
  reasoning: string;
  confidence: number;
  impact_score: number;
}

export interface ContextualInsight {
  type: 'timing' | 'content' | 'tone' | 'format' | 'personalization';
  insight: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Email Personalization Engine
 * Analyzes client behavior, preferences, and context to optimize email content
 */
export class EmailPersonalizationEngine {
  private static instance: EmailPersonalizationEngine;
  private profileCache: Map<string, PersonalizationProfile> = new Map();
  private cacheExpiry = 15 * 60 * 1000; // 15 minutes

  static getInstance(): EmailPersonalizationEngine {
    if (!EmailPersonalizationEngine.instance) {
      EmailPersonalizationEngine.instance = new EmailPersonalizationEngine();
    }
    return EmailPersonalizationEngine.instance;
  }

  /**
   * Get personalization profile for a client
   */
  async getPersonalizationProfile(
    clientId: string,
    vendorId?: string,
  ): Promise<PersonalizationProfile> {
    const cacheKey = `${clientId}_${vendorId || 'global'}`;

    // Check cache first
    const cached = this.profileCache.get(cacheKey);
    if (
      cached &&
      Date.now() - new Date(cached.last_updated).getTime() < this.cacheExpiry
    ) {
      return cached;
    }

    try {
      // Get client data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      // Get interaction history
      const interactionHistory = await this.getInteractionHistory(
        clientId,
        vendorId,
      );

      // Get behavioral data
      const behavioralData = await this.analyzeBehavioralData(
        clientId,
        interactionHistory,
      );

      // Get wedding context
      const weddingContext = await this.getWeddingContext(clientId);

      // Build communication preferences
      const communicationPreferences = await this.inferCommunicationPreferences(
        client,
        behavioralData,
        interactionHistory,
      );

      // Calculate personalization score
      const personalizationScore = this.calculatePersonalizationScore(
        behavioralData,
        interactionHistory,
        weddingContext,
      );

      const profile: PersonalizationProfile = {
        client_id: clientId,
        vendor_id: vendorId,
        communication_preferences: communicationPreferences,
        behavioral_data: behavioralData,
        wedding_context: weddingContext,
        interaction_history: interactionHistory,
        personalization_score,
        last_updated: new Date().toISOString(),
      };

      // Cache the profile
      this.profileCache.set(cacheKey, profile);

      return profile;
    } catch (error) {
      console.error('Failed to build personalization profile:', error);
      return this.getDefaultProfile(clientId, vendorId);
    }
  }

  /**
   * Enhance AI generation request with personalization data
   */
  async enhanceEmailRequest(
    baseRequest: AIEmailGenerationRequest,
    clientId: string,
    vendorId?: string,
  ): Promise<AIEmailGenerationRequest> {
    try {
      const profile = await this.getPersonalizationProfile(clientId, vendorId);

      // Enhance context with personalization data
      const enhancedContext: EmailGenerationContext = {
        ...baseRequest.context,
        client_name: profile.wedding_context.guest_count
          ? await this.getClientName(clientId)
          : baseRequest.context.client_name,
        relationship_stage: this.inferRelationshipStage(profile),
        previous_interactions: profile.interaction_history.slice(0, 5), // Last 5 interactions
      };

      // Enhance personalization data
      const enhancedPersonalization: PersonalizationData = {
        ...baseRequest.personalization_data,
        client_preferences: {
          communication_style: profile.communication_preferences.preferred_tone,
          preferred_name: await this.getPreferredName(clientId),
          special_requirements: profile.wedding_context.special_requirements,
        },
        wedding_details: {
          theme: profile.wedding_context.wedding_style,
          season: this.getSeasonFromDate(profile.wedding_context.wedding_date),
          guest_count: profile.wedding_context.guest_count,
          budget_tier: profile.wedding_context.budget_tier,
        },
      };

      // Adjust tone and style based on preferences
      const adjustedTone = profile.communication_preferences.preferred_tone;
      const adjustedLength = profile.communication_preferences.content_length;

      return {
        ...baseRequest,
        context: enhancedContext,
        personalization_data: enhancedPersonalization,
        tone: adjustedTone,
        length: adjustedLength,
        style_preferences: {
          ...baseRequest.style_preferences,
          use_emojis: profile.communication_preferences.include_emojis,
          include_personal_touches:
            profile.behavioral_data.content_preferences.values_personal_touch,
          template_structure:
            profile.communication_preferences.content_length === 'short'
              ? 'minimal'
              : 'standard',
        },
      };
    } catch (error) {
      console.error('Failed to enhance email request:', error);
      return baseRequest;
    }
  }

  /**
   * Get personalization recommendations for template optimization
   */
  async getPersonalizationRecommendations(
    clientId: string,
    templateType: string,
    vendorId?: string,
  ): Promise<PersonalizationRecommendation[]> {
    const profile = await this.getPersonalizationProfile(clientId, vendorId);
    const recommendations: PersonalizationRecommendation[] = [];

    // Subject line personalization
    if (
      profile.behavioral_data.email_engagement.preferred_subject_types.length >
      0
    ) {
      recommendations.push({
        field: 'subject_line',
        recommendation: `Use ${profile.behavioral_data.email_engagement.preferred_subject_types[0]} style subject lines`,
        reasoning: 'Based on historical engagement patterns',
        confidence: 0.8,
        impact_score: 0.9,
      });
    }

    // Timing recommendations
    if (profile.behavioral_data.email_engagement.engagement_times.length > 0) {
      const bestTime =
        profile.behavioral_data.email_engagement.engagement_times[0];
      recommendations.push({
        field: 'send_time',
        recommendation: `Send emails around ${bestTime}:00`,
        reasoning: 'Highest engagement time based on client behavior',
        confidence: 0.75,
        impact_score: 0.7,
      });
    }

    // Content personalization
    if (profile.behavioral_data.content_preferences.likes_detailed_info) {
      recommendations.push({
        field: 'content_detail',
        recommendation: 'Include detailed information and explanations',
        reasoning: 'Client prefers comprehensive information',
        confidence: 0.85,
        impact_score: 0.6,
      });
    }

    // Wedding phase specific recommendations
    const phaseRecommendation = this.getWeddingPhaseRecommendation(
      profile.wedding_context.wedding_phase,
    );
    if (phaseRecommendation) {
      recommendations.push(phaseRecommendation);
    }

    return recommendations;
  }

  /**
   * Get contextual insights for email optimization
   */
  async getContextualInsights(
    clientId: string,
    templateType: string,
    vendorId?: string,
  ): Promise<ContextualInsight[]> {
    const profile = await this.getPersonalizationProfile(clientId, vendorId);
    const insights: ContextualInsight[] = [];

    // Timing insights
    if (profile.wedding_context.days_until_wedding <= 30) {
      insights.push({
        type: 'timing',
        insight: 'Client is in final wedding month - high stress period',
        recommendation: 'Use calm, reassuring tone and emphasize support',
        priority: 'high',
      });
    }

    // Communication pattern insights
    if (
      profile.behavioral_data.communication_patterns.response_time_avg_hours >
      48
    ) {
      insights.push({
        type: 'content',
        insight: 'Client tends to respond slowly to communications',
        recommendation: 'Include clear deadlines and follow-up schedules',
        priority: 'medium',
      });
    }

    // Engagement insights
    if (profile.behavioral_data.email_engagement.open_rate < 0.5) {
      insights.push({
        type: 'format',
        insight: 'Low email engagement rate detected',
        recommendation:
          'Consider alternative communication methods or subject line optimization',
        priority: 'high',
      });
    }

    return insights;
  }

  /**
   * Track email engagement for continuous learning
   */
  async trackEmailEngagement(
    clientId: string,
    emailData: {
      template_type: string;
      subject: string;
      sent_at: string;
      opened_at?: string;
      clicked_at?: string;
      responded_at?: string;
    },
    vendorId?: string,
  ): Promise<void> {
    try {
      // Record the interaction
      await supabase.from('email_interactions').insert({
        client_id: clientId,
        vendor_id: vendorId,
        template_type: emailData.template_type,
        subject: emailData.subject,
        sent_at: emailData.sent_at,
        opened_at: emailData.opened_at,
        clicked_at: emailData.clicked_at,
        responded_at: emailData.responded_at,
        created_at: new Date().toISOString(),
      });

      // Clear cache to force profile refresh
      const cacheKey = `${clientId}_${vendorId || 'global'}`;
      this.profileCache.delete(cacheKey);
    } catch (error) {
      console.error('Failed to track email engagement:', error);
    }
  }

  // Private helper methods

  private async getInteractionHistory(
    clientId: string,
    vendorId?: string,
  ): Promise<InteractionHistory[]> {
    try {
      let query = supabase
        .from('email_interactions')
        .select('*')
        .eq('client_id', clientId)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((interaction) => ({
        date: interaction.sent_at,
        type: 'email_sent',
        details: {
          subject: interaction.subject,
          template_type: interaction.template_type,
          engagement_score: this.calculateEngagementScore(interaction),
          sentiment: 'neutral', // Could be enhanced with sentiment analysis
        },
      }));
    } catch (error) {
      console.error('Failed to get interaction history:', error);
      return [];
    }
  }

  private async analyzeBehavioralData(
    clientId: string,
    interactions: InteractionHistory[],
  ): Promise<BehavioralData> {
    const emailInteractions = interactions.filter((i) =>
      i.type.startsWith('email_'),
    );

    const openRate =
      emailInteractions.filter(
        (i) => i.details.engagement_score && i.details.engagement_score > 0.3,
      ).length / Math.max(emailInteractions.length, 1);
    const clickRate =
      emailInteractions.filter(
        (i) => i.details.engagement_score && i.details.engagement_score > 0.6,
      ).length / Math.max(emailInteractions.length, 1);
    const responseRate =
      emailInteractions.filter(
        (i) => i.details.engagement_score && i.details.engagement_score > 0.8,
      ).length / Math.max(emailInteractions.length, 1);

    return {
      email_engagement: {
        open_rate: openRate,
        click_rate: clickRate,
        response_rate: responseRate,
        preferred_subject_types: ['personalized'], // Could be enhanced with ML
        engagement_days: ['Monday', 'Tuesday', 'Wednesday'], // Could be analyzed from data
        engagement_times: [10, 14, 16], // Could be analyzed from data
      },
      communication_patterns: {
        response_time_avg_hours: 24, // Could be calculated from actual response times
        preferred_communication_channels: ['email'],
        decision_making_style: 'deliberate', // Could be inferred from interaction patterns
      },
      content_preferences: {
        likes_detailed_info: true,
        prefers_visual_content: false,
        responds_to_urgency: false,
        values_personal_touch: true,
      },
    };
  }

  private async getWeddingContext(
    clientId: string,
  ): Promise<WeddingContextData> {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*, wedding_date, guest_count')
        .eq('id', clientId)
        .single();

      if (error || !client) {
        throw new Error('Client not found');
      }

      const weddingDate =
        client.wedding_date ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const daysUntil = Math.ceil(
        (new Date(weddingDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );

      return {
        wedding_date: weddingDate,
        days_until_wedding: daysUntil,
        wedding_phase: this.determineWeddingPhase(daysUntil),
        venue_type: 'indoor', // Could be fetched from client data
        guest_count: client.guest_count || 100,
        budget_tier: 'mid-range', // Could be inferred from client data
        wedding_style: 'classic', // Could be fetched from client preferences
        special_requirements: [],
        vendor_relationships: [],
      };
    } catch (error) {
      console.error('Failed to get wedding context:', error);
      return this.getDefaultWeddingContext();
    }
  }

  private async inferCommunicationPreferences(
    client: any,
    behavioralData: BehavioralData,
    interactions: InteractionHistory[],
  ): Promise<CommunicationPreferences> {
    return {
      preferred_tone:
        behavioralData.email_engagement.open_rate > 0.7
          ? 'friendly'
          : 'professional',
      frequency_preference: 'regular',
      content_length: behavioralData.content_preferences.likes_detailed_info
        ? 'long'
        : 'medium',
      include_emojis: false, // Could be inferred from successful email patterns
      language: 'en',
      time_zone: 'America/New_York', // Could be fetched from client profile
      preferred_contact_time: {
        start_hour: 9,
        end_hour: 17,
      },
    };
  }

  private calculatePersonalizationScore(
    behavioralData: BehavioralData,
    interactions: InteractionHistory[],
    weddingContext: WeddingContextData,
  ): number {
    let score = 0.5; // Base score

    // Engagement quality
    score += behavioralData.email_engagement.open_rate * 0.2;
    score += behavioralData.email_engagement.click_rate * 0.15;
    score += behavioralData.email_engagement.response_rate * 0.1;

    // Data richness
    score += interactions.length > 5 ? 0.1 : 0.05;
    score += weddingContext.special_requirements.length > 0 ? 0.05 : 0;

    return Math.min(score, 1.0);
  }

  private determineWeddingPhase(
    daysUntil: number,
  ): 'early_planning' | 'mid_planning' | 'final_month' | 'post_wedding' {
    if (daysUntil < 0) return 'post_wedding';
    if (daysUntil <= 30) return 'final_month';
    if (daysUntil <= 180) return 'mid_planning';
    return 'early_planning';
  }

  private calculateEngagementScore(interaction: any): number {
    let score = 0.2; // Base for sent
    if (interaction.opened_at) score += 0.3;
    if (interaction.clicked_at) score += 0.3;
    if (interaction.responded_at) score += 0.2;
    return score;
  }

  private getSeasonFromDate(dateString: string): string {
    const date = new Date(dateString);
    const month = date.getMonth();

    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getWeddingPhaseRecommendation(
    phase: string,
  ): PersonalizationRecommendation | null {
    switch (phase) {
      case 'final_month':
        return {
          field: 'tone',
          recommendation: 'Use calm, supportive tone with reassurance',
          reasoning:
            'Clients in final month often experience pre-wedding stress',
          confidence: 0.9,
          impact_score: 0.85,
        };
      case 'early_planning':
        return {
          field: 'content',
          recommendation: 'Include educational content and planning tips',
          reasoning:
            'Early planning phase clients need guidance and information',
          confidence: 0.8,
          impact_score: 0.7,
        };
      default:
        return null;
    }
  }

  private async getClientName(clientId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('first_name, last_name')
        .eq('id', clientId)
        .single();

      if (error || !data) return 'Valued Client';

      return data.first_name ? `${data.first_name}` : 'Valued Client';
    } catch {
      return 'Valued Client';
    }
  }

  private async getPreferredName(clientId: string): Promise<string> {
    // Could be enhanced to check for preferred name in profile
    return await this.getClientName(clientId);
  }

  private inferRelationshipStage(
    profile: PersonalizationProfile,
  ): 'new_client' | 'existing_client' | 'post_wedding' {
    if (profile.wedding_context.wedding_phase === 'post_wedding')
      return 'post_wedding';
    if (profile.interaction_history.length > 5) return 'existing_client';
    return 'new_client';
  }

  private getDefaultProfile(
    clientId: string,
    vendorId?: string,
  ): PersonalizationProfile {
    return {
      client_id: clientId,
      vendor_id: vendorId,
      communication_preferences: {
        preferred_tone: 'professional',
        frequency_preference: 'regular',
        content_length: 'medium',
        include_emojis: false,
        language: 'en',
        time_zone: 'America/New_York',
      },
      behavioral_data: {
        email_engagement: {
          open_rate: 0.6,
          click_rate: 0.3,
          response_rate: 0.15,
          preferred_subject_types: [],
          engagement_days: [],
          engagement_times: [],
        },
        communication_patterns: {
          response_time_avg_hours: 24,
          preferred_communication_channels: ['email'],
          decision_making_style: 'deliberate',
        },
        content_preferences: {
          likes_detailed_info: true,
          prefers_visual_content: false,
          responds_to_urgency: false,
          values_personal_touch: true,
        },
      },
      wedding_context: this.getDefaultWeddingContext(),
      interaction_history: [],
      personalization_score: 0.5,
      last_updated: new Date().toISOString(),
    };
  }

  private getDefaultWeddingContext(): WeddingContextData {
    const weddingDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const daysUntil = 365;

    return {
      wedding_date: weddingDate,
      days_until_wedding: daysUntil,
      wedding_phase: 'early_planning',
      venue_type: 'indoor',
      guest_count: 100,
      budget_tier: 'mid-range',
      wedding_style: 'classic',
      special_requirements: [],
      vendor_relationships: [],
    };
  }
}

// Export singleton instance
export const emailPersonalizationEngine =
  EmailPersonalizationEngine.getInstance();

// Export convenience methods
export const getPersonalizationProfile = (
  clientId: string,
  vendorId?: string,
) => emailPersonalizationEngine.getPersonalizationProfile(clientId, vendorId);

export const enhanceEmailRequest = (
  request: AIEmailGenerationRequest,
  clientId: string,
  vendorId?: string,
) =>
  emailPersonalizationEngine.enhanceEmailRequest(request, clientId, vendorId);

export const getPersonalizationRecommendations = (
  clientId: string,
  templateType: string,
  vendorId?: string,
) =>
  emailPersonalizationEngine.getPersonalizationRecommendations(
    clientId,
    templateType,
    vendorId,
  );

export const trackEmailEngagement = (
  clientId: string,
  emailData: any,
  vendorId?: string,
) =>
  emailPersonalizationEngine.trackEmailEngagement(
    clientId,
    emailData,
    vendorId,
  );
