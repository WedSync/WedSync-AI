/**
 * AI-Powered Wedding Optimization - Personalization Engine
 * WS-341 Team B - Backend Implementation
 *
 * Advanced personalization system for wedding AI recommendations with sophisticated
 * user profiling, behavior pattern analysis, and social influence modeling.
 *
 * Features:
 * - Deep user profiling with personality and preference analysis
 * - Behavior pattern recognition and learning
 * - Social influence and peer recommendation integration
 * - Collaborative filtering and recommendation scoring
 * - Real-time personalization adaptation
 * - Wedding-specific context understanding
 *
 * Team B - Backend Development - 2025-01-25
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type {
  WeddingContext,
  AIRecommendation,
  UserInteraction,
  OptimizationFeedback,
  CoupleProfile,
  PersonalizationConfig,
} from './types';

// ====================================================================
// TYPES AND SCHEMAS
// ====================================================================

export const PersonalityTraits = [
  'extroverted',
  'introverted',
  'detail_oriented',
  'spontaneous',
  'traditional',
  'modern',
  'budget_conscious',
  'quality_focused',
  'planning_ahead',
  'last_minute',
  'social',
  'intimate',
] as const;

export const WeddingPreferenceCategories = [
  'venue',
  'catering',
  'photography',
  'flowers',
  'music',
  'decor',
  'transportation',
  'entertainment',
  'stationery',
  'fashion',
  'honeymoon',
  'timeline',
  'budget_allocation',
  'guest_experience',
] as const;

export type PersonalityTrait = (typeof PersonalityTraits)[number];
export type WeddingPreferenceCategory =
  (typeof WeddingPreferenceCategories)[number];

export interface UserProfile {
  coupleId: string;
  personalityProfile: {
    traits: Record<PersonalityTrait, number>; // 0-1 scoring
    dominantTraits: PersonalityTrait[];
    conflictAreas: string[];
    communicationStyle: 'direct' | 'collaborative' | 'delegative';
    decisionMaking: 'quick' | 'analytical' | 'consensus';
  };
  preferences: {
    category: WeddingPreferenceCategory;
    importance: number; // 0-1
    specificPreferences: Record<string, number>;
    dealBreakers: string[];
    flexibilityLevel: number; // 0-1
  }[];
  behaviors: {
    planningStyle: 'structured' | 'flexible' | 'mixed';
    researchDepth: 'surface' | 'moderate' | 'extensive';
    budgetBehavior: 'strict' | 'flexible' | 'optimistic';
    timelineAdherence: 'early' | 'on_time' | 'last_minute';
    vendorInteractionStyle: 'detailed' | 'trusting' | 'skeptical';
  };
  socialInfluences: {
    familyInfluence: number; // 0-1
    friendInfluence: number; // 0-1
    socialMediaInfluence: number; // 0-1
    trendFollowing: number; // 0-1
    uniquenessDesire: number; // 0-1
  };
  learningHistory: {
    interactions: UserInteraction[];
    feedbackPatterns: string[];
    adaptationRate: number; // 0-1
    preferenceStability: number; // 0-1
  };
}

export interface BehaviorPattern {
  id: string;
  coupleId: string;
  patternType: 'interaction' | 'preference' | 'decision' | 'feedback';
  pattern: {
    trigger: string;
    action: string;
    context: Record<string, any>;
    frequency: number;
    confidence: number;
  };
  discoveredAt: Date;
  lastSeen: Date;
  strength: number; // 0-1
}

export interface PersonalizationScore {
  overallScore: number; // 0-1
  categoryScores: Record<WeddingPreferenceCategory, number>;
  personalityMatch: number; // 0-1
  behaviorAlignment: number; // 0-1
  socialFit: number; // 0-1
  contextRelevance: number; // 0-1
  confidence: number; // 0-1
  reasoning: {
    positiveFactors: string[];
    negativeFactors: string[];
    personalityInsights: string[];
    behaviorInsights: string[];
    socialInsights: string[];
  };
}

export interface PersonalizationInsight {
  id: string;
  coupleId: string;
  type:
    | 'preference_discovery'
    | 'behavior_change'
    | 'personality_insight'
    | 'social_influence';
  insight: string;
  confidence: number;
  supportingData: Record<string, any>;
  actionable: boolean;
  recommendations: string[];
  discoveredAt: Date;
}

// ====================================================================
// PERSONALIZATION ENGINE
// ====================================================================

export class PersonalizationEngine {
  private supabase: ReturnType<typeof createClient>;
  private config: PersonalizationConfig;
  private profileCache = new Map<string, UserProfile>();
  private behaviorCache = new Map<string, BehaviorPattern[]>();

  constructor(config: PersonalizationConfig) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
    this.config = config;
  }

  /**
   * Score a recommendation for a specific user based on their personalization profile
   */
  async scoreForUser(
    recommendation: AIRecommendation,
    coupleId: string,
  ): Promise<number> {
    try {
      const profile = await this.getUserProfile(coupleId);
      if (!profile) {
        return 0.5; // Neutral score for unknown users
      }

      const personalizationScore = await this.calculatePersonalizationScore(
        recommendation,
        profile,
      );

      return personalizationScore.overallScore;
    } catch (error) {
      console.error('Error scoring recommendation for user:', error);
      return 0.5; // Fallback neutral score
    }
  }

  /**
   * Generate detailed explanation for why a recommendation is personalized for the user
   */
  async explainRecommendation(
    recommendation: AIRecommendation,
    context: WeddingContext,
  ): Promise<string> {
    try {
      const profile = await this.getUserProfile(context.coupleId);
      if (!profile) {
        return 'This recommendation is based on general wedding best practices.';
      }

      const personalizationScore = await this.calculatePersonalizationScore(
        recommendation,
        profile,
      );

      const explanation = this.buildPersonalizedExplanation(
        recommendation,
        profile,
        personalizationScore,
      );

      return explanation;
    } catch (error) {
      console.error('Error explaining recommendation:', error);
      return 'This recommendation aligns with your wedding preferences and style.';
    }
  }

  /**
   * Update user profile based on interactions and feedback
   */
  async updatePersonalization(
    coupleId: string,
    interactions: UserInteraction[],
  ): Promise<void> {
    try {
      const profile =
        (await this.getUserProfile(coupleId)) ||
        (await this.initializeProfile(coupleId));

      // Analyze interactions for behavior patterns
      const newPatterns = await this.analyzeInteractionPatterns(
        interactions,
        profile,
      );

      // Update personality insights
      await this.updatePersonalityProfile(profile, interactions);

      // Update preference weights
      await this.updatePreferences(profile, interactions);

      // Update social influence factors
      await this.updateSocialInfluences(profile, interactions);

      // Store behavior patterns
      for (const pattern of newPatterns) {
        await this.storeBehaviorPattern(pattern);
      }

      // Update profile in database
      await this.saveUserProfile(profile);

      // Clear cache to force refresh
      this.profileCache.delete(coupleId);
      this.behaviorCache.delete(coupleId);
    } catch (error) {
      console.error('Error updating personalization:', error);
      throw error;
    }
  }

  /**
   * Learn from optimization feedback to improve personalization
   */
  async incorporateFeedback(feedback: OptimizationFeedback): Promise<void> {
    try {
      const profile = await this.getUserProfile(feedback.coupleId);
      if (!profile) return;

      // Analyze feedback patterns
      const feedbackPattern = this.analyzeFeedbackPattern(feedback, profile);

      // Update preference weights based on feedback
      if (feedback.rating >= 4) {
        await this.reinforcePositiveFeedback(feedback, profile);
      } else if (feedback.rating <= 2) {
        await this.incorporateNegativeFeedback(feedback, profile);
      }

      // Store feedback pattern for learning
      profile.learningHistory.feedbackPatterns.push(feedbackPattern);

      // Adjust adaptation rate based on feedback consistency
      this.adjustAdaptationRate(profile, feedback);

      // Save updated profile
      await this.saveUserProfile(profile);

      // Clear cache
      this.profileCache.delete(feedback.coupleId);
    } catch (error) {
      console.error('Error incorporating feedback:', error);
    }
  }

  /**
   * Generate personalization insights for a couple
   */
  async generatePersonalizationInsights(
    coupleId: string,
  ): Promise<PersonalizationInsight[]> {
    try {
      const profile = await this.getUserProfile(coupleId);
      if (!profile) return [];

      const insights: PersonalizationInsight[] = [];

      // Personality-based insights
      const personalityInsights =
        await this.generatePersonalityInsights(profile);
      insights.push(...personalityInsights);

      // Behavior pattern insights
      const behaviorInsights = await this.generateBehaviorInsights(profile);
      insights.push(...behaviorInsights);

      // Preference discovery insights
      const preferenceInsights = await this.generatePreferenceInsights(profile);
      insights.push(...preferenceInsights);

      // Social influence insights
      const socialInsights = await this.generateSocialInsights(profile);
      insights.push(...socialInsights);

      return insights.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error generating personalization insights:', error);
      return [];
    }
  }

  /**
   * Calculate detailed personalization score
   */
  private async calculatePersonalizationScore(
    recommendation: AIRecommendation,
    profile: UserProfile,
  ): Promise<PersonalizationScore> {
    // Personality match scoring
    const personalityMatch = this.calculatePersonalityMatch(
      recommendation,
      profile.personalityProfile,
    );

    // Behavior alignment scoring
    const behaviorAlignment = this.calculateBehaviorAlignment(
      recommendation,
      profile.behaviors,
    );

    // Social fit scoring
    const socialFit = this.calculateSocialFit(
      recommendation,
      profile.socialInfluences,
    );

    // Context relevance scoring
    const contextRelevance = this.calculateContextRelevance(
      recommendation,
      profile,
    );

    // Category-specific scoring
    const categoryScores: Record<WeddingPreferenceCategory, number> = {} as any;
    for (const category of WeddingPreferenceCategories) {
      categoryScores[category] = this.calculateCategoryScore(
        recommendation,
        profile,
        category,
      );
    }

    // Calculate weighted overall score
    const weights = this.getPersonalizationWeights(profile);
    const overallScore =
      personalityMatch * weights.personality +
      behaviorAlignment * weights.behavior +
      socialFit * weights.social +
      contextRelevance * weights.context;

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(profile, recommendation);

    // Generate reasoning
    const reasoning = this.generateReasoningFactors(recommendation, profile, {
      personalityMatch,
      behaviorAlignment,
      socialFit,
      contextRelevance,
    });

    return {
      overallScore,
      categoryScores,
      personalityMatch,
      behaviorAlignment,
      socialFit,
      contextRelevance,
      confidence,
      reasoning,
    };
  }

  /**
   * Get user profile with caching
   */
  private async getUserProfile(coupleId: string): Promise<UserProfile | null> {
    if (this.profileCache.has(coupleId)) {
      return this.profileCache.get(coupleId)!;
    }

    try {
      const { data, error } = await this.supabase
        .from('personalization_profiles')
        .select('*')
        .eq('couple_id', coupleId)
        .single();

      if (error || !data) {
        return null;
      }

      const profile: UserProfile = {
        coupleId: data.couple_id,
        personalityProfile: data.personality_profile,
        preferences: data.preferences,
        behaviors: data.behaviors,
        socialInfluences: data.social_influences,
        learningHistory: data.learning_history,
      };

      this.profileCache.set(coupleId, profile);
      return profile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  /**
   * Initialize a new user profile
   */
  private async initializeProfile(coupleId: string): Promise<UserProfile> {
    const profile: UserProfile = {
      coupleId,
      personalityProfile: {
        traits: Object.fromEntries(
          PersonalityTraits.map((trait) => [trait, 0.5]),
        ) as Record<PersonalityTrait, number>,
        dominantTraits: [],
        conflictAreas: [],
        communicationStyle: 'collaborative',
        decisionMaking: 'consensus',
      },
      preferences: WeddingPreferenceCategories.map((category) => ({
        category,
        importance: 0.5,
        specificPreferences: {},
        dealBreakers: [],
        flexibilityLevel: 0.7,
      })),
      behaviors: {
        planningStyle: 'flexible',
        researchDepth: 'moderate',
        budgetBehavior: 'flexible',
        timelineAdherence: 'on_time',
        vendorInteractionStyle: 'trusting',
      },
      socialInfluences: {
        familyInfluence: 0.5,
        friendInfluence: 0.5,
        socialMediaInfluence: 0.5,
        trendFollowing: 0.5,
        uniquenessDesire: 0.5,
      },
      learningHistory: {
        interactions: [],
        feedbackPatterns: [],
        adaptationRate: 0.3,
        preferenceStability: 0.5,
      },
    };

    await this.saveUserProfile(profile);
    return profile;
  }

  /**
   * Analyze interaction patterns to discover behavior insights
   */
  private async analyzeInteractionPatterns(
    interactions: UserInteraction[],
    profile: UserProfile,
  ): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];

    // Group interactions by type and context
    const interactionGroups = this.groupInteractions(interactions);

    for (const [groupKey, groupInteractions] of Object.entries(
      interactionGroups,
    )) {
      if (groupInteractions.length < 3) continue; // Need minimum data points

      // Analyze frequency patterns
      const frequency = this.calculateInteractionFrequency(groupInteractions);

      // Identify common triggers and actions
      const commonTriggers = this.identifyCommonTriggers(groupInteractions);
      const commonActions = this.identifyCommonActions(groupInteractions);

      for (const trigger of commonTriggers) {
        for (const action of commonActions) {
          const pattern: BehaviorPattern = {
            id: `${profile.coupleId}-${groupKey}-${Date.now()}`,
            coupleId: profile.coupleId,
            patternType: 'interaction',
            pattern: {
              trigger: trigger.trigger,
              action: action.action,
              context: { groupKey, ...trigger.context },
              frequency,
              confidence: Math.min(trigger.confidence, action.confidence),
            },
            discoveredAt: new Date(),
            lastSeen: new Date(
              Math.max(...groupInteractions.map((i) => i.timestamp.getTime())),
            ),
            strength: this.calculatePatternStrength(
              trigger.confidence,
              action.confidence,
              frequency,
            ),
          };

          if (pattern.strength > 0.3) {
            // Only store significant patterns
            patterns.push(pattern);
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Calculate personality match score
   */
  private calculatePersonalityMatch(
    recommendation: AIRecommendation,
    personalityProfile: UserProfile['personalityProfile'],
  ): number {
    let score = 0.5; // Base score

    // Analyze recommendation content for personality alignment
    const recommendationTraits =
      this.extractRecommendationTraits(recommendation);

    for (const [trait, strength] of Object.entries(recommendationTraits)) {
      const userStrength =
        personalityProfile.traits[trait as PersonalityTrait] || 0.5;
      const alignment = 1 - Math.abs(userStrength - strength);
      score += alignment * 0.1; // Each trait contributes up to 0.1
    }

    // Communication style alignment
    const communicationAlignment = this.assessCommunicationAlignment(
      recommendation,
      personalityProfile.communicationStyle,
    );
    score += communicationAlignment * 0.2;

    // Decision making style alignment
    const decisionAlignment = this.assessDecisionMakingAlignment(
      recommendation,
      personalityProfile.decisionMaking,
    );
    score += decisionAlignment * 0.15;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Calculate behavior alignment score
   */
  private calculateBehaviorAlignment(
    recommendation: AIRecommendation,
    behaviors: UserProfile['behaviors'],
  ): number {
    let score = 0.5; // Base score

    // Planning style alignment
    const planningAlignment = this.assessPlanningStyleAlignment(
      recommendation,
      behaviors.planningStyle,
    );
    score += planningAlignment * 0.25;

    // Budget behavior alignment
    const budgetAlignment = this.assessBudgetBehaviorAlignment(
      recommendation,
      behaviors.budgetBehavior,
    );
    score += budgetAlignment * 0.25;

    // Timeline adherence alignment
    const timelineAlignment = this.assessTimelineAlignment(
      recommendation,
      behaviors.timelineAdherence,
    );
    score += timelineAlignment * 0.2;

    // Research depth alignment
    const researchAlignment = this.assessResearchAlignment(
      recommendation,
      behaviors.researchDepth,
    );
    score += researchAlignment * 0.15;

    // Vendor interaction alignment
    const vendorAlignment = this.assessVendorInteractionAlignment(
      recommendation,
      behaviors.vendorInteractionStyle,
    );
    score += vendorAlignment * 0.15;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Calculate social fit score
   */
  private calculateSocialFit(
    recommendation: AIRecommendation,
    socialInfluences: UserProfile['socialInfluences'],
  ): number {
    let score = 0.5; // Base score

    // Assess social validation needs
    if (recommendation.socialValidation) {
      if (socialInfluences.socialMediaInfluence > 0.7) {
        score += 0.2; // High social media influence benefits from social validation
      }
      if (socialInfluences.friendInfluence > 0.6) {
        score += 0.15; // Friend influence aligns with social validation
      }
    }

    // Assess uniqueness vs. trend following
    const trendFollowing = socialInfluences.trendFollowing;
    const uniquenessDesire = socialInfluences.uniquenessDesire;

    if (recommendation.trendy && trendFollowing > 0.6) {
      score += 0.2;
    } else if (recommendation.unique && uniquenessDesire > 0.6) {
      score += 0.2;
    } else if (recommendation.trendy && uniquenessDesire > 0.7) {
      score -= 0.1; // Penalty for trendy recommendations when uniqueness is desired
    }

    // Family influence consideration
    if (
      recommendation.traditionalElements &&
      socialInfluences.familyInfluence > 0.6
    ) {
      score += 0.15;
    }

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Save user profile to database
   */
  private async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('personalization_profiles')
        .upsert({
          couple_id: profile.coupleId,
          personality_profile: profile.personalityProfile,
          preferences: profile.preferences,
          behaviors: profile.behaviors,
          social_influences: profile.socialInfluences,
          learning_history: profile.learningHistory,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Update cache
      this.profileCache.set(profile.coupleId, profile);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  /**
   * Store behavior pattern in database
   */
  private async storeBehaviorPattern(pattern: BehaviorPattern): Promise<void> {
    try {
      const { error } = await this.supabase.from('behavior_patterns').upsert({
        id: pattern.id,
        couple_id: pattern.coupleId,
        pattern_type: pattern.patternType,
        pattern: pattern.pattern,
        discovered_at: pattern.discoveredAt.toISOString(),
        last_seen: pattern.lastSeen.toISOString(),
        strength: pattern.strength,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error storing behavior pattern:', error);
    }
  }

  // ====================================================================
  // UTILITY METHODS
  // ====================================================================

  private groupInteractions(
    interactions: UserInteraction[],
  ): Record<string, UserInteraction[]> {
    return interactions.reduce(
      (groups, interaction) => {
        const key = `${interaction.type}-${interaction.context?.category || 'general'}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(interaction);
        return groups;
      },
      {} as Record<string, UserInteraction[]>,
    );
  }

  private calculateInteractionFrequency(
    interactions: UserInteraction[],
  ): number {
    if (interactions.length < 2) return 0;

    const timeSpan =
      Math.max(...interactions.map((i) => i.timestamp.getTime())) -
      Math.min(...interactions.map((i) => i.timestamp.getTime()));

    const days = timeSpan / (1000 * 60 * 60 * 24);
    return interactions.length / Math.max(days, 1);
  }

  private identifyCommonTriggers(interactions: UserInteraction[]): Array<{
    trigger: string;
    confidence: number;
    context: Record<string, any>;
  }> {
    // Analyze interaction contexts to identify common triggers
    const triggerCounts = new Map<string, number>();

    interactions.forEach((interaction) => {
      const trigger = interaction.trigger || 'unknown';
      triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
    });

    return Array.from(triggerCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([trigger, count]) => ({
        trigger,
        confidence: count / interactions.length,
        context: this.extractTriggerContext(interactions, trigger),
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  private identifyCommonActions(interactions: UserInteraction[]): Array<{
    action: string;
    confidence: number;
  }> {
    const actionCounts = new Map<string, number>();

    interactions.forEach((interaction) => {
      const action = interaction.action || interaction.type;
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    });

    return Array.from(actionCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([action, count]) => ({
        action,
        confidence: count / interactions.length,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  private extractTriggerContext(
    interactions: UserInteraction[],
    trigger: string,
  ): Record<string, any> {
    const contextEntries = interactions
      .filter((i) => (i.trigger || 'unknown') === trigger)
      .map((i) => i.context)
      .filter(Boolean);

    if (contextEntries.length === 0) return {};

    // Merge common context properties
    const mergedContext: Record<string, any> = {};
    contextEntries.forEach((context) => {
      Object.entries(context!).forEach(([key, value]) => {
        if (!mergedContext[key]) mergedContext[key] = [];
        if (!mergedContext[key].includes(value)) {
          mergedContext[key].push(value);
        }
      });
    });

    return mergedContext;
  }

  private calculatePatternStrength(
    triggerConfidence: number,
    actionConfidence: number,
    frequency: number,
  ): number {
    const baseStrength = (triggerConfidence + actionConfidence) / 2;
    const frequencyBonus = Math.min(frequency * 0.1, 0.3);
    return Math.min(baseStrength + frequencyBonus, 1);
  }

  private buildPersonalizedExplanation(
    recommendation: AIRecommendation,
    profile: UserProfile,
    score: PersonalizationScore,
  ): string {
    let explanation = 'This recommendation is personalized for you because ';
    const reasons: string[] = [];

    // Add personality-based reasoning
    if (score.personalityMatch > 0.7) {
      reasons.push(
        `it aligns with your ${this.getPersonalityDescription(profile.personalityProfile)} style`,
      );
    }

    // Add behavior-based reasoning
    if (score.behaviorAlignment > 0.7) {
      reasons.push(
        `it matches your ${this.getBehaviorDescription(profile.behaviors)} approach to wedding planning`,
      );
    }

    // Add social fit reasoning
    if (score.socialFit > 0.7) {
      reasons.push(
        `it considers your ${this.getSocialDescription(profile.socialInfluences)} preferences`,
      );
    }

    // Add category-specific reasoning
    const topCategories = Object.entries(score.categoryScores)
      .filter(([_, score]) => score > 0.8)
      .map(([category, _]) => category);

    if (topCategories.length > 0) {
      reasons.push(
        `it strongly aligns with your preferences in ${topCategories.join(', ')}`,
      );
    }

    if (reasons.length === 0) {
      return 'This recommendation is based on general wedding best practices and your basic preferences.';
    }

    explanation += reasons.join(', and ') + '.';

    // Add confidence indicator
    if (score.confidence > 0.8) {
      explanation +=
        " We're highly confident this will be a great fit for you.";
    } else if (score.confidence < 0.5) {
      explanation +=
        ' This recommendation is based on limited data about your preferences.';
    }

    return explanation;
  }

  private getPersonalityDescription(
    personality: UserProfile['personalityProfile'],
  ): string {
    const dominantTraits = personality.dominantTraits;
    if (dominantTraits.length === 0) return 'balanced';

    const traitDescriptions = {
      detail_oriented: 'detail-oriented',
      quality_focused: 'quality-focused',
      traditional: 'traditional',
      modern: 'modern',
      budget_conscious: 'budget-conscious',
      planning_ahead: 'organized',
    };

    return dominantTraits
      .map(
        (trait) =>
          traitDescriptions[trait as keyof typeof traitDescriptions] || trait,
      )
      .join(' and ');
  }

  private getBehaviorDescription(behaviors: UserProfile['behaviors']): string {
    const descriptions = [];

    if (behaviors.planningStyle === 'structured') {
      descriptions.push('structured');
    } else if (behaviors.planningStyle === 'flexible') {
      descriptions.push('flexible');
    }

    if (behaviors.researchDepth === 'extensive') {
      descriptions.push('thorough research');
    }

    if (behaviors.budgetBehavior === 'strict') {
      descriptions.push('budget-conscious');
    }

    return descriptions.length > 0 ? descriptions.join(' and ') : 'balanced';
  }

  private getSocialDescription(
    social: UserProfile['socialInfluences'],
  ): string {
    const descriptions = [];

    if (social.familyInfluence > 0.7) {
      descriptions.push('family-focused');
    }

    if (social.socialMediaInfluence > 0.7) {
      descriptions.push('social media-aware');
    }

    if (social.uniquenessDesire > 0.7) {
      descriptions.push('uniqueness-seeking');
    }

    if (social.trendFollowing > 0.7) {
      descriptions.push('trend-following');
    }

    return descriptions.length > 0
      ? descriptions.join(' and ')
      : 'balanced social';
  }

  // Placeholder implementations for helper methods
  private extractRecommendationTraits(
    recommendation: AIRecommendation,
  ): Record<string, number> {
    // Analyze recommendation content to extract personality-relevant traits
    const traits: Record<string, number> = {};

    if (recommendation.category === 'budget') {
      traits['budget_conscious'] = 0.8;
    }
    if (recommendation.implementationSteps?.length > 5) {
      traits['detail_oriented'] = 0.7;
    }
    if (recommendation.title?.toLowerCase().includes('traditional')) {
      traits['traditional'] = 0.8;
    }
    if (recommendation.title?.toLowerCase().includes('modern')) {
      traits['modern'] = 0.8;
    }

    return traits;
  }

  private assessCommunicationAlignment(
    recommendation: AIRecommendation,
    style: 'direct' | 'collaborative' | 'delegative',
  ): number {
    // Assess how well recommendation communication style matches user preference
    const hasDetailedSteps =
      (recommendation.implementationSteps?.length || 0) > 3;
    const hasCollaborativeElements =
      recommendation.description?.includes('discuss') ||
      recommendation.description?.includes('consult');

    switch (style) {
      case 'direct':
        return hasDetailedSteps ? 0.8 : 0.4;
      case 'collaborative':
        return hasCollaborativeElements ? 0.8 : 0.5;
      case 'delegative':
        return recommendation.category === 'vendor' ? 0.7 : 0.5;
      default:
        return 0.5;
    }
  }

  private assessDecisionMakingAlignment(
    recommendation: AIRecommendation,
    style: 'quick' | 'analytical' | 'consensus',
  ): number {
    const hasAnalyticalContent =
      recommendation.description?.includes('compare') ||
      recommendation.description?.includes('analyze');
    const requiresConsensus =
      recommendation.title?.toLowerCase().includes('both') ||
      recommendation.description?.includes('together');

    switch (style) {
      case 'quick':
        return (recommendation.implementationSteps?.length || 0) <= 3
          ? 0.8
          : 0.4;
      case 'analytical':
        return hasAnalyticalContent ? 0.8 : 0.5;
      case 'consensus':
        return requiresConsensus ? 0.8 : 0.6;
      default:
        return 0.5;
    }
  }

  private assessPlanningStyleAlignment(
    recommendation: AIRecommendation,
    style: 'structured' | 'flexible' | 'mixed',
  ): number {
    const hasStructuredSteps =
      (recommendation.implementationSteps?.length || 0) > 4;
    const hasFlexibleOptions = recommendation.alternativeOptions?.length > 0;

    switch (style) {
      case 'structured':
        return hasStructuredSteps ? 0.8 : 0.4;
      case 'flexible':
        return hasFlexibleOptions ? 0.8 : 0.5;
      case 'mixed':
        return hasStructuredSteps && hasFlexibleOptions ? 0.9 : 0.6;
      default:
        return 0.5;
    }
  }

  private assessBudgetBehaviorAlignment(
    recommendation: AIRecommendation,
    behavior: 'strict' | 'flexible' | 'optimistic',
  ): number {
    const hasCostSavings = (recommendation.potentialSavings || 0) > 0;
    const hasInvestmentFocus =
      recommendation.description?.includes('invest') ||
      recommendation.description?.includes('upgrade');

    switch (behavior) {
      case 'strict':
        return hasCostSavings ? 0.8 : 0.3;
      case 'flexible':
        return 0.7; // Flexible budgeters are open to various recommendations
      case 'optimistic':
        return hasInvestmentFocus ? 0.8 : 0.6;
      default:
        return 0.5;
    }
  }

  private assessTimelineAlignment(
    recommendation: AIRecommendation,
    adherence: 'early' | 'on_time' | 'last_minute',
  ): number {
    const implementationTime = recommendation.implementationTime || 'medium';

    switch (adherence) {
      case 'early':
        return implementationTime === 'long' ? 0.8 : 0.6;
      case 'on_time':
        return implementationTime === 'medium' ? 0.8 : 0.6;
      case 'last_minute':
        return implementationTime === 'short' ? 0.8 : 0.4;
      default:
        return 0.5;
    }
  }

  private assessResearchAlignment(
    recommendation: AIRecommendation,
    depth: 'surface' | 'moderate' | 'extensive',
  ): number {
    const hasDetailedInfo = (recommendation.description?.length || 0) > 200;
    const hasMultipleOptions =
      (recommendation.alternativeOptions?.length || 0) > 2;

    switch (depth) {
      case 'surface':
        return !hasDetailedInfo ? 0.7 : 0.4;
      case 'moderate':
        return 0.7; // Moderate researchers are flexible
      case 'extensive':
        return hasDetailedInfo && hasMultipleOptions ? 0.9 : 0.5;
      default:
        return 0.5;
    }
  }

  private assessVendorInteractionAlignment(
    recommendation: AIRecommendation,
    style: 'detailed' | 'trusting' | 'skeptical',
  ): number {
    const isVendorRecommendation = recommendation.category === 'vendor';
    const hasVendorChecks =
      recommendation.description?.includes('verify') ||
      recommendation.description?.includes('check');

    if (!isVendorRecommendation) return 0.6; // Neutral for non-vendor recommendations

    switch (style) {
      case 'detailed':
        return hasVendorChecks ? 0.8 : 0.5;
      case 'trusting':
        return !hasVendorChecks ? 0.7 : 0.5;
      case 'skeptical':
        return hasVendorChecks ? 0.9 : 0.4;
      default:
        return 0.5;
    }
  }

  private calculateContextRelevance(
    recommendation: AIRecommendation,
    profile: UserProfile,
  ): number {
    // Calculate how relevant the recommendation is to the user's current context
    let relevance = 0.5;

    // Category importance scoring
    const categoryPreference = profile.preferences.find(
      (p) => p.category === recommendation.category,
    );

    if (categoryPreference) {
      relevance += categoryPreference.importance * 0.3;
    }

    // Timing relevance
    if (recommendation.timingSensitive) {
      relevance += 0.2;
    }

    return Math.min(relevance, 1);
  }

  private calculateCategoryScore(
    recommendation: AIRecommendation,
    profile: UserProfile,
    category: WeddingPreferenceCategory,
  ): number {
    const categoryPreference = profile.preferences.find(
      (p) => p.category === category,
    );

    if (!categoryPreference || recommendation.category !== category) {
      return 0.5; // Neutral score
    }

    let score = categoryPreference.importance;

    // Check specific preferences alignment
    Object.entries(categoryPreference.specificPreferences).forEach(
      ([key, value]) => {
        if (recommendation.tags?.includes(key)) {
          score += value * 0.2;
        }
      },
    );

    // Check deal breakers
    const hasDeallBreaker = categoryPreference.dealBreakers.some((breaker) =>
      recommendation.description?.toLowerCase().includes(breaker.toLowerCase()),
    );

    if (hasDeallBreaker) {
      score *= 0.3; // Significant penalty for deal breakers
    }

    return Math.min(Math.max(score, 0), 1);
  }

  private getPersonalizationWeights(profile: UserProfile): {
    personality: number;
    behavior: number;
    social: number;
    context: number;
  } {
    // Dynamic weight calculation based on profile maturity and data quality
    const interactionCount = profile.learningHistory.interactions.length;
    const profileMaturity = Math.min(interactionCount / 50, 1); // Mature after 50 interactions

    if (profileMaturity < 0.3) {
      // Early stage - rely more on context and basic preferences
      return { personality: 0.2, behavior: 0.2, social: 0.2, context: 0.4 };
    } else if (profileMaturity < 0.7) {
      // Growing stage - balanced approach
      return { personality: 0.25, behavior: 0.25, social: 0.25, context: 0.25 };
    } else {
      // Mature stage - rely more on learned personality and behaviors
      return { personality: 0.35, behavior: 0.35, social: 0.15, context: 0.15 };
    }
  }

  private calculateConfidence(
    profile: UserProfile,
    recommendation: AIRecommendation,
  ): number {
    let confidence = 0.5;

    // Data quality factors
    const interactionCount = profile.learningHistory.interactions.length;
    confidence += Math.min(interactionCount / 100, 0.3); // Up to 0.3 boost from interaction count

    // Preference stability
    confidence += profile.learningHistory.preferenceStability * 0.2;

    // Category-specific confidence
    const categoryPreference = profile.preferences.find(
      (p) => p.category === recommendation.category,
    );
    if (categoryPreference) {
      confidence += categoryPreference.importance * 0.3;
    }

    return Math.min(Math.max(confidence, 0.1), 0.95); // Cap between 0.1 and 0.95
  }

  private generateReasoningFactors(
    recommendation: AIRecommendation,
    profile: UserProfile,
    scores: {
      personalityMatch: number;
      behaviorAlignment: number;
      socialFit: number;
      contextRelevance: number;
    },
  ) {
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];
    const personalityInsights: string[] = [];
    const behaviorInsights: string[] = [];
    const socialInsights: string[] = [];

    // Personality factors
    if (scores.personalityMatch > 0.7) {
      positiveFactors.push('Strong personality alignment');
      personalityInsights.push(
        'Matches your decision-making and communication style',
      );
    } else if (scores.personalityMatch < 0.4) {
      negativeFactors.push('Limited personality alignment');
    }

    // Behavior factors
    if (scores.behaviorAlignment > 0.7) {
      positiveFactors.push('Aligns with your planning behavior');
      behaviorInsights.push(
        `Matches your ${profile.behaviors.planningStyle} planning approach`,
      );
    } else if (scores.behaviorAlignment < 0.4) {
      negativeFactors.push('May not align with your planning style');
    }

    // Social factors
    if (scores.socialFit > 0.7) {
      positiveFactors.push('Good social fit');
      socialInsights.push('Considers your social preferences and influences');
    } else if (scores.socialFit < 0.4) {
      negativeFactors.push('May not align with your social preferences');
    }

    // Context factors
    if (scores.contextRelevance > 0.7) {
      positiveFactors.push('Highly relevant to your current needs');
    }

    return {
      positiveFactors,
      negativeFactors,
      personalityInsights,
      behaviorInsights,
      socialInsights,
    };
  }

  // Placeholder implementations for feedback and insight methods
  private analyzeFeedbackPattern(
    feedback: OptimizationFeedback,
    profile: UserProfile,
  ): string {
    return `${feedback.type}_${feedback.rating > 3 ? 'positive' : 'negative'}_${Date.now()}`;
  }

  private async reinforcePositiveFeedback(
    feedback: OptimizationFeedback,
    profile: UserProfile,
  ): Promise<void> {
    // Strengthen preferences and patterns associated with positive feedback
    const categoryPreference = profile.preferences.find(
      (p) => p.category === feedback.category,
    );
    if (categoryPreference && feedback.rating >= 4) {
      categoryPreference.importance = Math.min(
        categoryPreference.importance + 0.1,
        1,
      );
    }
  }

  private async incorporateNegativeFeedback(
    feedback: OptimizationFeedback,
    profile: UserProfile,
  ): Promise<void> {
    // Adjust preferences based on negative feedback
    const categoryPreference = profile.preferences.find(
      (p) => p.category === feedback.category,
    );
    if (categoryPreference && feedback.rating <= 2) {
      categoryPreference.importance = Math.max(
        categoryPreference.importance - 0.05,
        0.1,
      );

      // Add to deal breakers if consistently negative
      if (
        feedback.rejectionReason &&
        !categoryPreference.dealBreakers.includes(feedback.rejectionReason)
      ) {
        categoryPreference.dealBreakers.push(feedback.rejectionReason);
      }
    }
  }

  private adjustAdaptationRate(
    profile: UserProfile,
    feedback: OptimizationFeedback,
  ): void {
    // Adjust how quickly the system adapts based on feedback consistency
    const recentFeedback = profile.learningHistory.feedbackPatterns.slice(-5);
    const consistentFeedback = recentFeedback.filter((f) =>
      f.includes(feedback.type),
    ).length;

    if (consistentFeedback >= 3) {
      profile.learningHistory.adaptationRate = Math.min(
        profile.learningHistory.adaptationRate + 0.1,
        0.8,
      );
    } else {
      profile.learningHistory.adaptationRate = Math.max(
        profile.learningHistory.adaptationRate - 0.05,
        0.1,
      );
    }
  }

  private async updatePersonalityProfile(
    profile: UserProfile,
    interactions: UserInteraction[],
  ): Promise<void> {
    // Analyze interactions to update personality traits
    interactions.forEach((interaction) => {
      if (interaction.type === 'detailed_research') {
        profile.personalityProfile.traits.detail_oriented = Math.min(
          profile.personalityProfile.traits.detail_oriented + 0.05,
          1,
        );
      }
      if (interaction.type === 'budget_focus') {
        profile.personalityProfile.traits.budget_conscious = Math.min(
          profile.personalityProfile.traits.budget_conscious + 0.05,
          1,
        );
      }
    });

    // Update dominant traits
    profile.personalityProfile.dominantTraits = Object.entries(
      profile.personalityProfile.traits,
    )
      .filter(([_, score]) => score > 0.7)
      .map(([trait, _]) => trait as PersonalityTrait);
  }

  private async updatePreferences(
    profile: UserProfile,
    interactions: UserInteraction[],
  ): Promise<void> {
    // Update preferences based on interaction patterns
    interactions.forEach((interaction) => {
      const category = interaction.context
        ?.category as WeddingPreferenceCategory;
      if (category) {
        const preference = profile.preferences.find(
          (p) => p.category === category,
        );
        if (preference) {
          // Increase importance for categories with more interactions
          preference.importance = Math.min(preference.importance + 0.02, 1);

          // Update specific preferences
          if (interaction.context?.specific_preference) {
            const key = interaction.context.specific_preference;
            preference.specificPreferences[key] =
              (preference.specificPreferences[key] || 0) + 0.1;
          }
        }
      }
    });
  }

  private async updateSocialInfluences(
    profile: UserProfile,
    interactions: UserInteraction[],
  ): Promise<void> {
    // Analyze social patterns in interactions
    interactions.forEach((interaction) => {
      if (interaction.context?.source === 'social_media') {
        profile.socialInfluences.socialMediaInfluence = Math.min(
          profile.socialInfluences.socialMediaInfluence + 0.05,
          1,
        );
      }
      if (interaction.context?.influenced_by === 'family') {
        profile.socialInfluences.familyInfluence = Math.min(
          profile.socialInfluences.familyInfluence + 0.05,
          1,
        );
      }
    });
  }

  private async generatePersonalityInsights(
    profile: UserProfile,
  ): Promise<PersonalizationInsight[]> {
    const insights: PersonalizationInsight[] = [];

    // Find dominant personality traits and generate insights
    const dominantTraits = profile.personalityProfile.dominantTraits;

    if (
      dominantTraits.includes('detail_oriented') &&
      dominantTraits.includes('budget_conscious')
    ) {
      insights.push({
        id: `personality_${profile.coupleId}_${Date.now()}`,
        coupleId: profile.coupleId,
        type: 'personality_insight',
        insight:
          'You tend to be both detail-oriented and budget-conscious. Consider vendors who provide detailed cost breakdowns and transparent pricing.',
        confidence: 0.85,
        supportingData: { traits: dominantTraits },
        actionable: true,
        recommendations: [
          'Look for vendors with detailed pricing',
          'Request comprehensive quotes',
        ],
        discoveredAt: new Date(),
      });
    }

    return insights;
  }

  private async generateBehaviorInsights(
    profile: UserProfile,
  ): Promise<PersonalizationInsight[]> {
    const insights: PersonalizationInsight[] = [];

    if (
      profile.behaviors.planningStyle === 'structured' &&
      profile.behaviors.timelineAdherence === 'early'
    ) {
      insights.push({
        id: `behavior_${profile.coupleId}_${Date.now()}`,
        coupleId: profile.coupleId,
        type: 'behavior_change',
        insight:
          'Your structured planning style and early timeline adherence suggest you should book vendors 12+ months in advance for better selection and pricing.',
        confidence: 0.8,
        supportingData: { behaviors: profile.behaviors },
        actionable: true,
        recommendations: [
          'Start vendor research early',
          'Book popular vendors 12+ months ahead',
        ],
        discoveredAt: new Date(),
      });
    }

    return insights;
  }

  private async generatePreferenceInsights(
    profile: UserProfile,
  ): Promise<PersonalizationInsight[]> {
    const insights: PersonalizationInsight[] = [];

    // Find high-importance categories
    const highImportanceCategories = profile.preferences
      .filter((p) => p.importance > 0.8)
      .map((p) => p.category);

    if (highImportanceCategories.length > 0) {
      insights.push({
        id: `preference_${profile.coupleId}_${Date.now()}`,
        coupleId: profile.coupleId,
        type: 'preference_discovery',
        insight: `You prioritize ${highImportanceCategories.join(', ')} highly. Consider allocating 60-70% of your budget to these categories.`,
        confidence: 0.9,
        supportingData: { categories: highImportanceCategories },
        actionable: true,
        recommendations: [
          `Focus budget on ${highImportanceCategories.join(', ')}`,
          'Consider cost savings in lower priority areas',
        ],
        discoveredAt: new Date(),
      });
    }

    return insights;
  }

  private async generateSocialInsights(
    profile: UserProfile,
  ): Promise<PersonalizationInsight[]> {
    const insights: PersonalizationInsight[] = [];

    if (profile.socialInfluences.familyInfluence > 0.8) {
      insights.push({
        id: `social_${profile.coupleId}_${Date.now()}`,
        coupleId: profile.coupleId,
        type: 'social_influence',
        insight:
          'Family opinions are very important to you. Consider including family members in vendor meetings and decision-making processes.',
        confidence: 0.85,
        supportingData: {
          familyInfluence: profile.socialInfluences.familyInfluence,
        },
        actionable: true,
        recommendations: [
          'Include family in vendor selection',
          'Schedule family vendor meetings',
        ],
        discoveredAt: new Date(),
      });
    }

    return insights;
  }
}

// ====================================================================
// EXPORT SINGLETON INSTANCE
// ====================================================================

export const personalizationEngine = new PersonalizationEngine({
  learningRate: 0.1,
  memoryWindow: 90,
  adaptationThreshold: 0.3,
  confidenceThreshold: 0.6,
});
