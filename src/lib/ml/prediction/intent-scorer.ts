// WS-055: Client Intent Scoring Algorithm
// Analyzes client behavior patterns to determine purchase intent

import { createSupabaseClient } from '@/lib/supabase';
import type {
  ClientBehaviorData,
  IntentScore,
  IntentIndicator,
  BehaviorPattern,
  PatternSignal,
  RealTimeActivity,
} from './types';

interface IntentFeatures {
  // Engagement depth
  session_quality: number; // time spent and pages viewed per session
  content_engagement: number; // interaction with key content
  return_visitor_frequency: number; // how often they come back

  // Research behavior
  vendor_research_intensity: number; // depth of vendor research
  pricing_research_depth: number; // time spent on pricing
  comparison_behavior: number; // comparing options

  // Communication patterns
  inquiry_proactiveness: number; // initiating vs responding
  response_urgency: number; // speed of responses
  question_depth: number; // quality and specificity of questions

  // Timeline behavior
  urgency_indicators: number; // timeline-related activities
  planning_progression: number; // moving through planning stages
  deadline_awareness: number; // awareness of time constraints

  // Social proof engagement
  testimonial_engagement: number; // viewing success stories
  social_media_activity: number; // social engagement
  referral_source_quality: number; // how they found us
}

export class ClientIntentScorer {
  private supabase = createSupabaseClient();
  private modelVersion = '1.0.0';

  /**
   * Calculates comprehensive intent score for a client
   */
  async calculateIntentScore(clientId: string): Promise<IntentScore> {
    try {
      // Fetch client behavior data
      const clientData = await this.fetchClientBehaviorData(clientId);
      if (!clientData) {
        throw new Error(`Client data not found for ID: ${clientId}`);
      }

      // Extract intent features
      const features = await this.extractIntentFeatures(clientData);

      // Calculate base intent score
      const score = this.calculateBaseIntentScore(features);

      // Determine intent category
      const category = this.categorizeIntent(score);

      // Identify specific indicators
      const indicators = this.identifyIntentIndicators(features, clientData);

      // Analyze intent trend
      const trend = await this.analyzeIntentTrend(clientId);

      return {
        client_id: clientId,
        score: Math.round(score),
        category,
        indicators,
        trend,
        last_updated: new Date(),
      };
    } catch (error) {
      console.error('Intent scoring failed:', error);
      throw error;
    }
  }

  /**
   * Processes real-time activity to update intent score
   */
  async processRealTimeActivity(
    activity: RealTimeActivity,
  ): Promise<IntentScore> {
    // Update activity in database
    await this.storeActivity(activity);

    // Recalculate intent score with new activity
    const updatedScore = await this.calculateIntentScore(activity.client_id);

    // Trigger real-time updates if significant change
    if (this.isSignificantIntentChange(activity, updatedScore)) {
      await this.triggerRealTimeUpdate(activity.client_id, updatedScore);
    }

    return updatedScore;
  }

  /**
   * Recognizes specific behavior patterns that indicate intent level
   */
  async recognizeBehaviorPattern(
    clientData: ClientBehaviorData,
  ): Promise<BehaviorPattern> {
    const features = await this.extractIntentFeatures(clientData);

    // Analyze for specific patterns
    const patterns = [
      this.detectBookingReadyPattern(features, clientData),
      this.detectPriceShoppingPattern(features, clientData),
      this.detectEarlyResearchPattern(features, clientData),
      this.detectUrgentSeekerPattern(features, clientData),
      this.detectChurnRiskPattern(features, clientData),
    ].filter(Boolean);

    // Return the pattern with highest confidence
    const dominantPattern = patterns.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev,
    );

    return dominantPattern;
  }

  /**
   * Fetches comprehensive behavior data for intent analysis
   */
  private async fetchClientBehaviorData(
    clientId: string,
  ): Promise<ClientBehaviorData | null> {
    const { data, error } = await this.supabase
      .from('clients')
      .select(
        `
        *,
        client_activities!inner (
          activity_type,
          timestamp,
          metadata,
          value_score
        ),
        client_sessions!inner (
          session_duration,
          pages_viewed,
          bounce_rate,
          timestamp
        )
      `,
      )
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client behavior data:', error);
      return null;
    }

    return this.transformToClientBehaviorData(data);
  }

  /**
   * Extracts intent-specific features from client data
   */
  private async extractIntentFeatures(
    clientData: ClientBehaviorData,
  ): Promise<IntentFeatures> {
    const now = new Date();
    const daysSinceContact =
      (now.getTime() - clientData.initial_contact_at.getTime()) /
      (1000 * 60 * 60 * 24);

    return {
      // Engagement depth
      session_quality: this.calculateSessionQuality(clientData),
      content_engagement: this.calculateContentEngagement(clientData),
      return_visitor_frequency: this.calculateReturnFrequency(
        clientData,
        daysSinceContact,
      ),

      // Research behavior
      vendor_research_intensity:
        this.calculateVendorResearchIntensity(clientData),
      pricing_research_depth: this.calculatePricingResearchDepth(clientData),
      comparison_behavior: this.calculateComparisonBehavior(clientData),

      // Communication patterns
      inquiry_proactiveness: this.calculateInquiryProactiveness(clientData),
      response_urgency: this.calculateResponseUrgency(clientData),
      question_depth: this.calculateQuestionDepth(clientData),

      // Timeline behavior
      urgency_indicators: this.calculateUrgencyIndicators(clientData),
      planning_progression: this.calculatePlanningProgression(clientData),
      deadline_awareness: this.calculateDeadlineAwareness(clientData),

      // Social proof engagement
      testimonial_engagement: this.calculateTestimonialEngagement(clientData),
      social_media_activity: this.calculateSocialMediaActivity(clientData),
      referral_source_quality: this.calculateReferralSourceQuality(clientData),
    };
  }

  /**
   * Calculates base intent score using weighted feature combination
   */
  private calculateBaseIntentScore(features: IntentFeatures): number {
    const weights = {
      session_quality: 0.15,
      content_engagement: 0.12,
      return_visitor_frequency: 0.1,
      vendor_research_intensity: 0.14,
      pricing_research_depth: 0.13,
      comparison_behavior: 0.08,
      inquiry_proactiveness: 0.12,
      response_urgency: 0.1,
      question_depth: 0.06,
    };

    let score = 0;
    score += features.session_quality * weights.session_quality;
    score += features.content_engagement * weights.content_engagement;
    score +=
      features.return_visitor_frequency * weights.return_visitor_frequency;
    score +=
      features.vendor_research_intensity * weights.vendor_research_intensity;
    score += features.pricing_research_depth * weights.pricing_research_depth;
    score += features.comparison_behavior * weights.comparison_behavior;
    score += features.inquiry_proactiveness * weights.inquiry_proactiveness;
    score += features.response_urgency * weights.response_urgency;
    score += features.question_depth * weights.question_depth;

    // Apply urgency multiplier
    if (features.urgency_indicators > 0.7) {
      score *= 1.2;
    }

    // Apply planning progression bonus
    score += features.planning_progression * 0.1;

    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, score * 100));
  }

  /**
   * Categorizes intent level based on score
   */
  private categorizeIntent(
    score: number,
  ): 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 80) return 'very_high';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Identifies specific intent indicators from features
   */
  private identifyIntentIndicators(
    features: IntentFeatures,
    clientData: ClientBehaviorData,
  ): IntentIndicator[] {
    const indicators: IntentIndicator[] = [];

    // Active venue search
    if (features.vendor_research_intensity > 0.7) {
      indicators.push({
        indicator_type: 'active_venue_search',
        strength: Math.round(features.vendor_research_intensity * 10),
        description: 'Actively researching multiple vendors',
        detected_at: new Date(),
      });
    }

    // Quick response time
    if (features.response_urgency > 0.8) {
      indicators.push({
        indicator_type: 'quick_response_time',
        strength: Math.round(features.response_urgency * 10),
        description: 'Responds quickly to communications',
        detected_at: new Date(),
      });
    }

    // Multiple vendor inquiries
    if (clientData.vendor_inquiries >= 3) {
      indicators.push({
        indicator_type: 'multiple_vendor_inquiries',
        strength: Math.min(10, clientData.vendor_inquiries),
        description: `Made ${clientData.vendor_inquiries} vendor inquiries`,
        detected_at: new Date(),
      });
    }

    // Pricing research
    if (features.pricing_research_depth > 0.6) {
      indicators.push({
        indicator_type: 'pricing_research',
        strength: Math.round(features.pricing_research_depth * 10),
        description: 'Extensively researching pricing options',
        detected_at: new Date(),
      });
    }

    // Timeline urgency
    if (features.urgency_indicators > 0.7) {
      indicators.push({
        indicator_type: 'timeline_urgency',
        strength: Math.round(features.urgency_indicators * 10),
        description: 'Showing urgency in timeline planning',
        detected_at: new Date(),
      });
    }

    // Repeat visits
    if (features.return_visitor_frequency > 0.5) {
      indicators.push({
        indicator_type: 'repeat_visits',
        strength: Math.round(features.return_visitor_frequency * 10),
        description: 'Frequently returning to review information',
        detected_at: new Date(),
      });
    }

    return indicators;
  }

  /**
   * Analyzes intent trend over time
   */
  private async analyzeIntentTrend(
    clientId: string,
  ): Promise<'increasing' | 'stable' | 'decreasing'> {
    const { data } = await this.supabase
      .from('intent_scores')
      .select('score, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!data || data.length < 2) {
      return 'stable';
    }

    const recent = data.slice(0, 3).map((d) => d.score);
    const older = data.slice(3).map((d) => d.score);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 5) return 'increasing';
    if (difference < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Pattern detection methods
   */
  private detectBookingReadyPattern(
    features: IntentFeatures,
    clientData: ClientBehaviorData,
  ): BehaviorPattern {
    const signals: PatternSignal[] = [];
    let confidence = 0;

    // High engagement + urgency + vendor research
    if (
      features.session_quality > 0.7 &&
      features.urgency_indicators > 0.6 &&
      features.vendor_research_intensity > 0.7
    ) {
      confidence = 0.9;
      signals.push({
        signal_type: 'venue_inquiry_sequence',
        strength: 9,
        description: 'Multiple vendor inquiries in short timeframe',
        data_points: [],
      });
    }

    if (features.pricing_research_depth > 0.8) {
      confidence = Math.max(confidence, 0.85);
      signals.push({
        signal_type: 'pricing_interest',
        strength: 8,
        description: 'Deep pricing research indicates purchase readiness',
        data_points: [],
      });
    }

    return {
      pattern_id: `booking-ready-${clientData.client_id}`,
      pattern_type: 'booking_ready',
      confidence,
      signals,
      typical_outcomes: {
        booking_probability: 0.85,
        average_timeline_to_booking: 7,
        typical_budget_range: clientData.budget_range,
        conversion_factors: [
          'high_engagement',
          'vendor_research',
          'pricing_focus',
        ],
        success_rate: 0.82,
      },
      recommended_actions: [
        'Schedule immediate consultation',
        'Send personalized proposal',
        'Prioritize response time',
      ],
      identified_at: new Date(),
    };
  }

  private detectPriceShoppingPattern(
    features: IntentFeatures,
    clientData: ClientBehaviorData,
  ): BehaviorPattern {
    let confidence = 0;

    if (
      features.pricing_research_depth > 0.8 &&
      features.comparison_behavior > 0.7 &&
      features.vendor_research_intensity < 0.5
    ) {
      confidence = 0.8;
    }

    return {
      pattern_id: `price-shopping-${clientData.client_id}`,
      pattern_type: 'price_shopping',
      confidence,
      signals: [],
      typical_outcomes: {
        booking_probability: 0.45,
        average_timeline_to_booking: 21,
        typical_budget_range: 'medium',
        conversion_factors: ['competitive_pricing', 'value_demonstration'],
        success_rate: 0.48,
      },
      recommended_actions: [
        'Highlight value proposition',
        'Provide detailed cost breakdown',
        'Offer limited-time incentives',
      ],
      identified_at: new Date(),
    };
  }

  private detectEarlyResearchPattern(
    features: IntentFeatures,
    clientData: ClientBehaviorData,
  ): BehaviorPattern {
    let confidence = 0;

    const daysSinceContact =
      (Date.now() - clientData.initial_contact_at.getTime()) /
      (1000 * 60 * 60 * 24);

    if (
      daysSinceContact < 3 &&
      features.content_engagement > 0.6 &&
      features.urgency_indicators < 0.3
    ) {
      confidence = 0.7;
    }

    return {
      pattern_id: `early-research-${clientData.client_id}`,
      pattern_type: 'early_researcher',
      confidence,
      signals: [],
      typical_outcomes: {
        booking_probability: 0.35,
        average_timeline_to_booking: 45,
        typical_budget_range: 'medium',
        conversion_factors: ['education', 'relationship_building'],
        success_rate: 0.38,
      },
      recommended_actions: [
        'Provide educational content',
        'Build relationship gradually',
        'Set up nurture sequence',
      ],
      identified_at: new Date(),
    };
  }

  private detectUrgentSeekerPattern(
    features: IntentFeatures,
    clientData: ClientBehaviorData,
  ): BehaviorPattern {
    let confidence = 0;

    if (
      features.urgency_indicators > 0.8 &&
      features.response_urgency > 0.7 &&
      features.planning_progression > 0.6
    ) {
      confidence = 0.85;
    }

    return {
      pattern_id: `urgent-seeker-${clientData.client_id}`,
      pattern_type: 'urgent_seeker',
      confidence,
      signals: [],
      typical_outcomes: {
        booking_probability: 0.75,
        average_timeline_to_booking: 3,
        typical_budget_range: 'high',
        conversion_factors: ['immediate_availability', 'fast_response'],
        success_rate: 0.71,
      },
      recommended_actions: [
        'Respond immediately',
        'Emphasize availability',
        'Fast-track proposal process',
      ],
      identified_at: new Date(),
    };
  }

  private detectChurnRiskPattern(
    features: IntentFeatures,
    clientData: ClientBehaviorData,
  ): BehaviorPattern {
    let confidence = 0;

    const hoursSinceActivity =
      (Date.now() - clientData.last_activity_at.getTime()) / (1000 * 60 * 60);

    if (
      hoursSinceActivity > 168 &&
      features.session_quality < 0.3 &&
      features.response_urgency < 0.4
    ) {
      // 1 week
      confidence = 0.8;
    }

    return {
      pattern_id: `churn-risk-${clientData.client_id}`,
      pattern_type: 'churn_risk',
      confidence,
      signals: [],
      typical_outcomes: {
        booking_probability: 0.15,
        average_timeline_to_booking: 0,
        typical_budget_range: 'low',
        conversion_factors: ['re_engagement', 'value_reminder'],
        success_rate: 0.12,
      },
      recommended_actions: [
        'Send re-engagement campaign',
        'Offer consultation call',
        'Provide special incentive',
      ],
      identified_at: new Date(),
    };
  }

  /**
   * Feature calculation helper methods
   */
  private calculateSessionQuality(clientData: ClientBehaviorData): number {
    if (clientData.session_duration_avg === 0) return 0;

    const pagesPerSession =
      clientData.page_views_total / Math.max(1, clientData.responses_count);
    const timePerPage =
      clientData.session_duration_avg / Math.max(1, pagesPerSession);

    // Quality = engagement depth * time investment
    return Math.min(1, (pagesPerSession / 10) * (timePerPage / 120)); // 10 pages, 2 min per page = ideal
  }

  private calculateContentEngagement(clientData: ClientBehaviorData): number {
    const totalEngagementActions =
      clientData.form_interactions +
      clientData.document_downloads +
      clientData.vendor_inquiries;
    return Math.min(1, totalEngagementActions / 20); // 20 actions = max engagement
  }

  private calculateReturnFrequency(
    clientData: ClientBehaviorData,
    daysSinceContact: number,
  ): number {
    if (daysSinceContact === 0) return 0;
    const visitsPerDay = clientData.responses_count / daysSinceContact;
    return Math.min(1, visitsPerDay * 7); // Daily visits = max score
  }

  private calculateVendorResearchIntensity(
    clientData: ClientBehaviorData,
  ): number {
    return Math.min(1, clientData.vendor_inquiries / 10); // 10 inquiries = max intensity
  }

  private calculatePricingResearchDepth(
    clientData: ClientBehaviorData,
  ): number {
    if (clientData.page_views_total === 0) return 0;
    const pricingRatio = clientData.pricing_views / clientData.page_views_total;
    return Math.min(1, pricingRatio * 3); // 33% pricing views = max depth
  }

  private calculateComparisonBehavior(clientData: ClientBehaviorData): number {
    // Placeholder - would analyze comparison-related activities
    return Math.min(1, clientData.vendor_inquiries / 5); // 5+ vendors = comparison shopping
  }

  private calculateInquiryProactiveness(
    clientData: ClientBehaviorData,
  ): number {
    return Math.min(1, clientData.vendor_inquiries / 8); // 8 inquiries = very proactive
  }

  private calculateResponseUrgency(clientData: ClientBehaviorData): number {
    if (clientData.response_time_avg === 0) return 0;
    // Convert response time to urgency score (faster = higher score)
    return Math.max(0, 1 - clientData.response_time_avg / 3600); // 1 hour = baseline
  }

  private calculateQuestionDepth(clientData: ClientBehaviorData): number {
    return Math.min(
      1,
      (clientData.questions_asked * clientData.message_length_avg) / 1000,
    );
  }

  private calculateUrgencyIndicators(clientData: ClientBehaviorData): number {
    return Math.min(1, clientData.timeline_interactions / 15); // 15 timeline interactions = urgent
  }

  private calculatePlanningProgression(clientData: ClientBehaviorData): number {
    const progressionScore =
      (clientData.timeline_interactions +
        clientData.vendor_inquiries +
        (clientData.venue_booked ? 10 : 0)) /
      25;
    return Math.min(1, progressionScore);
  }

  private calculateDeadlineAwareness(clientData: ClientBehaviorData): number {
    // Placeholder - would analyze deadline-related content engagement
    return Math.min(1, clientData.timeline_interactions / 10);
  }

  private calculateTestimonialEngagement(
    clientData: ClientBehaviorData,
  ): number {
    // Placeholder - would track testimonial page views
    return 0.5; // Default neutral score
  }

  private calculateSocialMediaActivity(clientData: ClientBehaviorData): number {
    // Placeholder - would track social media referrals and engagement
    return 0.5; // Default neutral score
  }

  private calculateReferralSourceQuality(
    clientData: ClientBehaviorData,
  ): number {
    // Placeholder - would analyze referral source quality
    return 0.7; // Default good score
  }

  /**
   * Helper methods
   */
  private transformToClientBehaviorData(data: any): ClientBehaviorData {
    return {
      client_id: data.id,
      engagement_score: data.engagement_score || 0,
      questionnaire_completed_at: data.questionnaire_completed_at
        ? new Date(data.questionnaire_completed_at)
        : null,
      initial_contact_at: new Date(data.initial_contact_at),
      last_activity_at: new Date(data.last_activity_at),
      responses_count: data.responses_count || 0,
      budget_range: data.budget_range || 'medium',
      venue_booked: data.venue_booked,
      timeline_interactions: data.timeline_interactions || 0,
      vendor_inquiries: data.vendor_inquiries || 0,
      document_downloads: data.document_downloads || 0,
      pricing_views: data.pricing_views || 0,
      session_duration_avg: data.session_duration_avg || 0,
      page_views_total: data.page_views_total || 0,
      form_interactions: data.form_interactions || 0,
      response_time_avg: data.response_time_avg || 0,
      message_length_avg: data.message_length_avg || 0,
      questions_asked: data.questions_asked || 0,
    };
  }

  private async storeActivity(activity: RealTimeActivity): Promise<void> {
    await this.supabase.from('client_activities').insert({
      client_id: activity.client_id,
      activity_type: activity.activity_type,
      timestamp: activity.timestamp.toISOString(),
      metadata: activity.metadata,
      value_score: activity.value_score,
      duration: activity.duration,
    });
  }

  private isSignificantIntentChange(
    activity: RealTimeActivity,
    score: IntentScore,
  ): boolean {
    // Trigger updates for high-value activities or significant score changes
    return activity.value_score >= 7 || score.category === 'very_high';
  }

  private async triggerRealTimeUpdate(
    clientId: string,
    score: IntentScore,
  ): Promise<void> {
    // Would trigger WebSocket update or notification
    console.log(
      `Real-time intent update for client ${clientId}: ${score.score} (${score.category})`,
    );
  }
}
