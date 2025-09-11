/**
 * WS-236: User Feedback System - FeedbackCollector Service
 *
 * Comprehensive feedback collection system for wedding industry users
 * Handles NPS, CSAT, CES, feature-specific, and contextual feedback
 * with wedding industry specific triggers and follow-up automation
 *
 * Features:
 * - Eligibility checking with rate limiting
 * - Wedding industry context awareness
 * - AI sentiment analysis integration
 * - Automated follow-up workflows
 * - Multi-channel collection (in-app, email, post-support)
 */

import { supabase } from '@/lib/supabase';
import { OpenAIService } from '@/lib/services/openai-service';
import type { User } from '@supabase/supabase-js';

// Core types for feedback system
export interface FeedbackSession {
  id: string;
  userId: string;
  type: 'nps' | 'csat' | 'ces' | 'feature' | 'onboarding' | 'churn' | 'general';
  triggerReason: string;
  triggerContext: Record<string, any>;

  startedAt: Date;
  completedAt: Date | null;
  abandonedAt: Date | null;

  userType: 'supplier' | 'couple';
  userTier: string;
  accountAgeDays: number;
  engagementScore: number;

  deviceType: string;
  browser: string;
  sessionDuration: number;
  pageUrl: string;

  questions: FeedbackQuestion[];
  responses: FeedbackResponse[];

  overallSentiment: number | null;
  satisfactionCategory: string | null;
  completionRate: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface FeedbackQuestion {
  key: string;
  type: 'nps' | 'rating' | 'text' | 'choice' | 'boolean';
  text: string;
  required: boolean;
  order: number;
  scale?: number;
  labels?: string[];
  choices?: string[];
  dependsOn?: string;
  helpText?: string;
  placeholder?: string;
  maxLength?: number;
  multiple?: boolean;
}

export interface FeedbackResponse {
  id: string;
  sessionId: string;
  questionKey: string;
  questionText: string;
  questionType: string;

  npsScore?: number;
  ratingValue?: number;
  textValue?: string;
  choiceValue?: string;
  booleanValue?: boolean;

  respondedAt: Date;
  timeToRespond: number;
  questionOrder: number;
  isRequired: boolean;

  sentimentScore?: number;
  keywords?: string[];
  themes?: string[];
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  details?: string;
  retryAfter?: Date;
  samplingRate?: number;
}

export interface UserContext {
  userType: 'supplier' | 'couple';
  tier: string;
  accountAge: number;
  engagement: number;
  vendorType?: string;
  featureUsage?: Record<string, any>;
  recentActivity?: Record<string, any>;
  weddingSeason?: string;
}

export interface StartFeedbackRequest {
  userId: string;
  feedbackType:
    | 'nps'
    | 'csat'
    | 'ces'
    | 'feature'
    | 'onboarding'
    | 'churn'
    | 'general';
  triggerReason?: string;
  context?: Record<string, any>;
  userAgent?: string;
  referrer?: string;
  deviceInfo?: {
    type: string;
    browser: string;
  };
}

export interface FeedbackAnalysis {
  overallSentiment: number;
  category: string;
  hasNegativeFeedback: boolean;
  keywords: string[];
  themes: string[];
  actionableInsights: string[];
  summary: string;
  improvementSuggestions: string[];
  positiveHighlights: string[];
  hasPromoterScore: boolean;
  hasDetractorScore: boolean;
}

/**
 * Main feedback collection service with wedding industry specialization
 */
export class FeedbackCollector {
  private static instance: FeedbackCollector;
  private activeSessions: Map<string, FeedbackSession> = new Map();
  private rateLimitCache: Map<string, Date> = new Map();
  private openAIService: OpenAIService;

  static getInstance(): FeedbackCollector {
    if (!FeedbackCollector.instance) {
      FeedbackCollector.instance = new FeedbackCollector();
    }
    return FeedbackCollector.instance;
  }

  constructor() {
    this.openAIService = new OpenAIService();
  }

  /**
   * Check if user is eligible for feedback collection
   * Includes rate limiting, fatigue prevention, and context validation
   */
  async checkFeedbackEligibility(
    userId: string,
    feedbackType: string,
  ): Promise<EligibilityResult> {
    try {
      console.log(
        `Checking feedback eligibility for user ${userId}, type: ${feedbackType}`,
      );

      // Check database-level eligibility using stored function
      const { data, error } = await supabase.rpc('check_feedback_eligibility', {
        target_user_id: userId,
        feedback_type_param: feedbackType,
      });

      if (error) {
        console.error('Error checking feedback eligibility:', error);
        throw new Error(`Database eligibility check failed: ${error.message}`);
      }

      const result = data[0];
      if (!result.eligible) {
        return {
          eligible: false,
          reason: result.reason,
          details:
            result.reason === 'account_too_new'
              ? 'Account must be at least 3 days old'
              : result.reason === 'feedback_fatigue'
                ? 'User has provided feedback recently'
                : result.reason === 'monthly_limit_reached'
                  ? 'Monthly feedback limit reached'
                  : result.reason === 'too_recent'
                    ? 'Recent feedback for this type'
                    : 'User not eligible for feedback',
          retryAfter: result.next_eligible_date,
        };
      }

      // Additional wedding industry specific checks
      const userContext = await this.getUserContext(userId);

      // Check engagement thresholds
      if (userContext.engagement < 0.1) {
        return {
          eligible: false,
          reason: 'low_engagement',
          details: 'User engagement too low for meaningful feedback',
        };
      }

      // Wedding industry specific eligibility
      if (userContext.userType === 'supplier') {
        const hasActiveClients = await this.hasActiveClients(userId);
        if (!hasActiveClients && ['nps', 'feature'].includes(feedbackType)) {
          return {
            eligible: false,
            reason: 'no_active_usage',
            details: 'Supplier has no active clients for meaningful feedback',
          };
        }
      }

      // Calculate sampling rate based on user tier and type
      const samplingRate = await this.calculateSamplingRate(
        userId,
        feedbackType,
        userContext,
      );

      return {
        eligible: true,
        reason: 'eligible',
        samplingRate,
      };
    } catch (error) {
      console.error('Error in checkFeedbackEligibility:', error);
      return {
        eligible: false,
        reason: 'error',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Start a new feedback collection session
   * Creates personalized questions based on user context and wedding industry needs
   */
  async startFeedbackSession(
    request: StartFeedbackRequest,
  ): Promise<FeedbackSession> {
    console.log(
      `Starting feedback session for user ${request.userId}:`,
      request.feedbackType,
    );

    try {
      // Validate eligibility
      const eligibility = await this.checkFeedbackEligibility(
        request.userId,
        request.feedbackType,
      );
      if (!eligibility.eligible) {
        throw new Error(
          `Feedback not eligible: ${eligibility.reason} - ${eligibility.details}`,
        );
      }

      // Get comprehensive user context
      const userContext = await this.getUserContext(request.userId);

      // Create session with wedding industry context
      const session: FeedbackSession = {
        id: crypto.randomUUID(),
        userId: request.userId,
        type: request.feedbackType,
        triggerReason: request.triggerReason || 'manual',
        triggerContext: {
          ...request.context,
          timestamp: new Date().toISOString(),
          userAgent: request.userAgent,
          referrer: request.referrer,
          weddingSeason: userContext.weddingSeason,
        },

        startedAt: new Date(),
        completedAt: null,
        abandonedAt: null,

        userType: userContext.userType,
        userTier: userContext.tier,
        accountAgeDays: userContext.accountAge,
        engagementScore: userContext.engagement,

        deviceType: request.deviceInfo?.type || 'unknown',
        browser: request.deviceInfo?.browser || 'unknown',
        sessionDuration: 0,
        pageUrl: request.context?.page || '',

        questions: [],
        responses: [],

        overallSentiment: null,
        satisfactionCategory: null,
        completionRate: 0,
        status: 'active',
      };

      // Generate contextual questions based on user and wedding industry context
      session.questions = await this.generateContextualQuestions(
        session,
        userContext,
      );

      // Save session to database
      await this.saveFeedbackSession(session);

      // Track in active sessions cache
      this.activeSessions.set(session.id, session);

      // Track session start event
      await this.trackFeedbackEvent('session_started', {
        sessionId: session.id,
        userId: session.userId,
        feedbackType: session.type,
        triggerReason: session.triggerReason,
        userType: session.userType,
        userTier: session.userTier,
        questionsCount: session.questions.length,
        weddingContext: this.extractWeddingContext(userContext),
      });

      console.log(`Feedback session ${session.id} started:`, {
        type: session.type,
        questionsCount: session.questions.length,
        userContext: { type: session.userType, tier: session.userTier },
      });

      return session;
    } catch (error) {
      console.error('Error starting feedback session:', error);
      throw error;
    }
  }

  /**
   * Submit a response to a feedback question
   * Includes sentiment analysis for text responses and completion checking
   */
  async submitResponse(
    sessionId: string,
    questionKey: string,
    response: any,
    timeSpent: number = 0,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Invalid session ID: ${sessionId}`);
    }

    const question = session.questions.find((q) => q.key === questionKey);
    if (!question) {
      throw new Error(`Invalid question key: ${questionKey}`);
    }

    try {
      // Validate and process response
      const processedResponse = await this.processResponse(question, response);

      // Create response record
      const feedbackResponse: FeedbackResponse = {
        id: crypto.randomUUID(),
        sessionId,
        questionKey,
        questionText: question.text,
        questionType: question.type,
        ...processedResponse,
        respondedAt: new Date(),
        timeToRespond: timeSpent,
        questionOrder: question.order,
        isRequired: question.required,
      };

      // Analyze text responses for sentiment and wedding industry themes
      if (processedResponse.textValue) {
        const analysis = await this.analyzeSentiment(
          processedResponse.textValue,
        );
        feedbackResponse.sentimentScore = analysis.sentiment;
        feedbackResponse.keywords = analysis.keywords;
        feedbackResponse.themes = analysis.themes;
      }

      // Save response to database
      await this.saveFeedbackResponse(feedbackResponse);

      // Update session
      session.responses.push(feedbackResponse);
      const requiredQuestions = session.questions.filter((q) => q.required);
      session.completionRate =
        session.responses.length / requiredQuestions.length;

      // Check for session completion
      const answeredRequired = session.responses.filter((r) =>
        requiredQuestions.some((q) => q.key === r.questionKey),
      );

      // Track response submission
      await this.trackFeedbackEvent('response_submitted', {
        sessionId,
        questionKey,
        questionType: question.type,
        responseTime: timeSpent,
        hasText: !!processedResponse.textValue,
        sentiment: feedbackResponse.sentimentScore,
      });

      // Auto-complete if all required questions answered
      if (answeredRequired.length >= requiredQuestions.length) {
        await this.completeFeedbackSession(sessionId);
      }

      console.log(`Response submitted for session ${sessionId}:`, {
        questionKey,
        type: question.type,
        completionRate: session.completionRate,
      });
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  }

  /**
   * Complete a feedback session with analysis and follow-up actions
   */
  private async completeFeedbackSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }

    console.log(`Completing feedback session ${sessionId}`);

    try {
      // Update session completion
      session.completedAt = new Date();
      session.status = 'completed';
      session.sessionDuration = Math.floor(
        (session.completedAt.getTime() - session.startedAt.getTime()) / 1000,
      );

      // Analyze overall feedback with wedding industry context
      const analysis = await this.analyzeFeedbackSession(session);
      session.overallSentiment = analysis.overallSentiment;
      session.satisfactionCategory = analysis.category;

      // Save session updates
      await this.updateFeedbackSession(session);

      // Process feedback type-specific actions
      switch (session.type) {
        case 'nps':
          await this.processNPSCompletion(session, analysis);
          break;
        case 'feature':
          await this.processFeatureFeedbackCompletion(session, analysis);
          break;
        case 'churn':
          await this.processChurnFeedbackCompletion(session, analysis);
          break;
      }

      // Trigger follow-up actions based on sentiment and wedding context
      await this.triggerFollowUpActions(session, analysis);

      // Update analytics
      await this.updateFeedbackAnalytics(session, analysis);

      // Clean up
      this.activeSessions.delete(sessionId);

      // Track completion
      await this.trackFeedbackEvent('session_completed', {
        sessionId,
        completionRate: session.completionRate,
        sessionDuration: session.sessionDuration,
        overallSentiment: analysis.overallSentiment,
        category: analysis.category,
        hasNegativeFeedback: analysis.hasNegativeFeedback,
        hasActionableInsights: analysis.actionableInsights.length > 0,
      });

      console.log(`Feedback session ${sessionId} completed:`, {
        type: session.type,
        duration: session.sessionDuration,
        sentiment: analysis.overallSentiment,
        category: analysis.category,
      });
    } catch (error) {
      console.error('Error completing feedback session:', error);
      throw error;
    }
  }

  /**
   * Generate contextual questions based on feedback type and wedding industry context
   */
  private async generateContextualQuestions(
    session: FeedbackSession,
    userContext: UserContext,
  ): Promise<FeedbackQuestion[]> {
    const questions: FeedbackQuestion[] = [];

    switch (session.type) {
      case 'nps':
        // Core NPS question
        questions.push({
          key: 'nps_score',
          type: 'nps',
          text: 'How likely are you to recommend WedSync to a friend or colleague?',
          required: true,
          order: 1,
          helpText:
            'Your honest feedback helps us improve our service for the wedding community.',
        });

        // Wedding industry specific follow-up
        if (session.userType === 'supplier') {
          questions.push({
            key: 'nps_business_impact',
            type: 'text',
            text: "How has WedSync impacted your wedding business? What's the main reason for your score?",
            required: false,
            order: 2,
            placeholder:
              'e.g., "Helped me organize client information better", "Made communication with couples easier"...',
            maxLength: 500,
          });

          if (userContext.vendorType) {
            questions.push({
              key: 'vendor_specific_feedback',
              type: 'text',
              text: `As a ${userContext.vendorType}, what features are most valuable to your workflow?`,
              required: false,
              order: 3,
              placeholder:
                'Tell us what works best for your specific type of wedding business...',
            });
          }
        } else {
          questions.push({
            key: 'nps_planning_impact',
            type: 'text',
            text: "How has WedSync helped with your wedding planning? What's the main reason for your score?",
            required: false,
            order: 2,
            placeholder:
              'e.g., "Made it easier to communicate with vendors", "Helped keep track of everything"...',
            maxLength: 500,
          });
        }

        // General improvement question
        questions.push({
          key: 'improvement_priority',
          type: 'choice',
          text: 'If we could improve one thing, what would have the biggest impact for you?',
          choices: [
            'Easier form creation',
            'Better client communication',
            'More customization options',
            'Mobile app improvements',
            'Integration with other tools',
            'Better reporting/analytics',
            'Faster performance',
            'Other',
          ],
          required: false,
          order: 4,
        });
        break;

      case 'feature':
        const featureName =
          session.triggerContext.featureName || 'this feature';

        questions.push(
          {
            key: 'feature_satisfaction',
            type: 'rating',
            text: `How satisfied are you with the ${featureName} feature?`,
            scale: 5,
            labels: [
              'Very Dissatisfied',
              'Dissatisfied',
              'Neutral',
              'Satisfied',
              'Very Satisfied',
            ],
            required: true,
            order: 1,
          },
          {
            key: 'feature_ease',
            type: 'rating',
            text: `How easy is the ${featureName} feature to use?`,
            scale: 5,
            labels: [
              'Very Difficult',
              'Difficult',
              'Neutral',
              'Easy',
              'Very Easy',
            ],
            required: true,
            order: 2,
          },
          {
            key: 'feature_wedding_value',
            type: 'rating',
            text: `How valuable is this feature for your ${session.userType === 'supplier' ? 'wedding business' : 'wedding planning'}?`,
            scale: 5,
            labels: [
              'Not Valuable',
              'Slightly Valuable',
              'Moderately Valuable',
              'Very Valuable',
              'Extremely Valuable',
            ],
            required: true,
            order: 3,
          },
          {
            key: 'usage_frequency',
            type: 'choice',
            text: `How often do you use the ${featureName} feature?`,
            choices: [
              'Daily',
              'Weekly',
              'Monthly',
              'Rarely',
              'This is my first time',
            ],
            required: true,
            order: 4,
          },
        );

        // Feature-specific questions
        if (featureName === 'form_builder') {
          questions.push({
            key: 'form_builder_pain_points',
            type: 'text',
            text: "What's the most challenging part about creating forms for your clients/wedding?",
            required: false,
            order: 5,
            placeholder:
              'e.g., "Setting up guest information fields", "Customizing the design"...',
          });
        } else if (featureName === 'journey_canvas') {
          questions.push({
            key: 'journey_canvas_usage',
            type: 'choice',
            text: 'What do you primarily use the Journey Canvas for?',
            choices: [
              'Planning wedding timeline',
              'Client communication workflow',
              'Vendor coordination',
              'Task management',
              'Other',
            ],
            required: false,
            order: 5,
          });
        }

        // Improvement suggestions
        questions.push({
          key: 'feature_improvements',
          type: 'text',
          text: `What improvements would make the ${featureName} feature even better for your needs?`,
          required: false,
          order: 6,
          placeholder:
            'Any specific features, integrations, or changes that would help...',
          maxLength: 300,
        });
        break;

      case 'onboarding':
        if (session.accountAgeDays <= 14) {
          questions.push(
            {
              key: 'onboarding_overall_ease',
              type: 'rating',
              text: 'How easy was it to get started with WedSync?',
              scale: 5,
              labels: [
                'Very Difficult',
                'Difficult',
                'Neutral',
                'Easy',
                'Very Easy',
              ],
              required: true,
              order: 1,
            },
            {
              key: 'setup_completion_time',
              type: 'choice',
              text: 'How long did it take to complete your initial setup?',
              choices: [
                'Less than 5 minutes',
                '5-15 minutes',
                '15-30 minutes',
                '30-60 minutes',
                'More than 1 hour',
                'Still working on it',
              ],
              required: true,
              order: 2,
            },
            {
              key: 'onboarding_confusion',
              type: 'text',
              text: 'Was anything confusing or difficult during the onboarding process?',
              required: false,
              order: 3,
              placeholder: 'Help us improve the experience for future users...',
              maxLength: 300,
            },
          );

          // Wedding industry specific onboarding questions
          if (session.userType === 'supplier') {
            questions.push({
              key: 'business_setup_completion',
              type: 'choice',
              text: 'Which parts of your wedding business setup have you completed?',
              choices: [
                'Basic profile information',
                'Service offerings',
                'Client form templates',
                'Journey workflows',
                'Email templates',
                'Nothing yet',
              ],
              multiple: true,
              required: false,
              order: 4,
            });
          }
        }
        break;

      case 'churn':
        questions.push(
          {
            key: 'leaving_reason',
            type: 'choice',
            text: "What's the main reason you're considering leaving or reducing your use of WedSync?",
            choices: [
              'Too expensive for my needs',
              'Missing features I need',
              'Too complicated to use',
              'Not enough clients/bookings',
              'Found a better alternative',
              'Business priorities changed',
              'Technical issues',
              'Other',
            ],
            required: true,
            order: 1,
          },
          {
            key: 'alternative_solution',
            type: 'text',
            text: 'Are you switching to another service? If so, what attracted you to it?',
            required: false,
            order: 2,
            placeholder: 'This helps us understand what we might be missing...',
          },
          {
            key: 'retention_features',
            type: 'text',
            text: 'What features or improvements would have convinced you to stay?',
            required: false,
            order: 3,
            placeholder:
              'Your input could help us build what wedding professionals really need...',
          },
        );
        break;
    }

    // Add wedding context question for relevant feedback types
    if (
      ['nps', 'feature', 'general'].includes(session.type) &&
      session.userType === 'supplier'
    ) {
      questions.push({
        key: 'current_wedding_season',
        type: 'choice',
        text: 'How busy is your current wedding season?',
        choices: [
          'Very busy (peak season)',
          'Moderately busy',
          'Slow season',
          'Just getting started',
          'Off-season/break',
        ],
        required: false,
        order: 99,
        helpText: 'This helps us understand the context of your feedback',
      });
    }

    return questions.sort((a, b) => a.order - b.order);
  }

  /**
   * Get comprehensive user context for personalized feedback
   */
  private async getUserContext(userId: string): Promise<UserContext> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(
          `
          user_type,
          subscription_tier,
          vendor_type,
          created_at,
          engagement_metrics,
          feature_usage_stats,
          recent_activity
        `,
        )
        .eq('user_id', userId)
        .single();

      if (error || !profile) {
        console.warn('Could not fetch user profile:', error);
        return {
          userType: 'supplier',
          tier: 'free',
          accountAge: 0,
          engagement: 0,
        };
      }

      const accountAge = Math.floor(
        (new Date().getTime() - new Date(profile.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Determine wedding season context
      const currentMonth = new Date().getMonth() + 1;
      const weddingSeason = [5, 6, 7, 9, 10].includes(currentMonth)
        ? 'peak'
        : [4, 8].includes(currentMonth)
          ? 'moderate'
          : 'slow';

      return {
        userType: profile.user_type || 'supplier',
        tier: profile.subscription_tier || 'free',
        accountAge,
        engagement: profile.engagement_metrics?.overall_score || 0,
        vendorType: profile.vendor_type,
        featureUsage: profile.feature_usage_stats || {},
        recentActivity: profile.recent_activity || {},
        weddingSeason,
      };
    } catch (error) {
      console.error('Error fetching user context:', error);
      return {
        userType: 'supplier',
        tier: 'free',
        accountAge: 0,
        engagement: 0,
      };
    }
  }

  /**
   * Check if supplier has active clients for meaningful feedback
   */
  private async hasActiveClients(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.warn('Error checking active clients:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error in hasActiveClients:', error);
      return false;
    }
  }

  /**
   * Calculate dynamic sampling rate based on user context
   */
  private async calculateSamplingRate(
    userId: string,
    feedbackType: string,
    userContext: UserContext,
  ): Promise<number> {
    // Base sampling rates by feedback type
    const baseSamplingRates = {
      nps: 0.3,
      csat: 0.5,
      feature: 0.4,
      onboarding: 1.0,
      churn: 1.0,
      general: 0.2,
    };

    let samplingRate =
      baseSamplingRates[feedbackType as keyof typeof baseSamplingRates] || 0.2;

    // Adjust based on user tier (higher tiers get more surveys for better insights)
    const tierMultipliers = {
      free: 0.8,
      starter: 1.0,
      professional: 1.2,
      scale: 1.3,
      enterprise: 1.5,
    };

    samplingRate *=
      tierMultipliers[userContext.tier as keyof typeof tierMultipliers] || 1.0;

    // Adjust based on engagement (higher engagement = more likely to respond)
    if (userContext.engagement > 0.7) {
      samplingRate *= 1.2;
    } else if (userContext.engagement < 0.3) {
      samplingRate *= 0.7;
    }

    // Wedding season adjustments
    if (userContext.weddingSeason === 'peak') {
      samplingRate *= 0.8; // Lower during peak season to avoid fatigue
    }

    return Math.min(1.0, Math.max(0.1, samplingRate));
  }

  /**
   * Process and validate response based on question type
   */
  private async processResponse(
    question: FeedbackQuestion,
    response: any,
  ): Promise<Partial<FeedbackResponse>> {
    const processedResponse: Partial<FeedbackResponse> = {};

    switch (question.type) {
      case 'nps':
        const npsScore = parseInt(response);
        if (isNaN(npsScore) || npsScore < 0 || npsScore > 10) {
          throw new Error('Invalid NPS score: must be 0-10');
        }
        processedResponse.npsScore = npsScore;
        break;

      case 'rating':
        const rating = parseInt(response);
        const scale = question.scale || 5;
        if (isNaN(rating) || rating < 1 || rating > scale) {
          throw new Error(`Invalid rating: must be 1-${scale}`);
        }
        processedResponse.ratingValue = rating;
        break;

      case 'text':
        const text = String(response || '').trim();
        if (question.required && !text) {
          throw new Error('Text response is required');
        }
        if (question.maxLength && text.length > question.maxLength) {
          throw new Error(
            `Text too long: maximum ${question.maxLength} characters`,
          );
        }
        processedResponse.textValue = text;
        break;

      case 'choice':
        const choice = String(response || '');
        if (question.required && !choice) {
          throw new Error('Choice is required');
        }
        if (
          question.choices &&
          !question.choices.includes(choice) &&
          choice !== ''
        ) {
          throw new Error('Invalid choice value');
        }
        processedResponse.choiceValue = choice;
        break;

      case 'boolean':
        processedResponse.booleanValue = Boolean(response);
        break;

      default:
        throw new Error(`Unknown question type: ${question.type}`);
    }

    return processedResponse;
  }

  /**
   * Analyze sentiment of text responses using OpenAI
   */
  /**
   * Analyze sentiment of text responses using OpenAI
   */
  /**
   * Analyze sentiment of text responses using OpenAI
   */
  private async analyzeSentiment(
    text: string,
  ): Promise<{ sentiment: number; keywords: string[]; themes: string[] }> {
    try {
      const prompt = `Analyze this wedding industry feedback for sentiment, keywords, and themes:

"${text}"

Return JSON with:
- sentiment: number from -1.0 (very negative) to 1.0 (very positive)
- keywords: array of important words/phrases (max 10)
- themes: array of main topics like "usability", "pricing", "features", "support", "integration" etc (max 5)

Focus on wedding industry context - vendors, clients, forms, communication, etc.`;

      const analysis = await this.openAIService.generateCompletion(prompt, {
        max_tokens: 200,
        temperature: 0.1,
        system_prompt:
          'You are an expert at analyzing wedding industry feedback. Always return valid JSON.',
      });

      const parsed = JSON.parse(analysis.text);

      return {
        sentiment: Math.max(-1, Math.min(1, parsed.sentiment || 0)),
        keywords: (parsed.keywords || []).slice(0, 10),
        themes: (parsed.themes || []).slice(0, 5),
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        sentiment: 0,
        keywords: [],
        themes: [],
      };
    }
  }

  /**
   * Comprehensive analysis of completed feedback session
   */
  private async analyzeFeedbackSession(
    session: FeedbackSession,
  ): Promise<FeedbackAnalysis> {
    const textResponses = session.responses
      .filter((r) => r.textValue)
      .map((r) => r.textValue!);

    const ratings = session.responses
      .filter((r) => r.ratingValue !== null && r.ratingValue !== undefined)
      .map((r) => ({ key: r.questionKey, rating: r.ratingValue! }));

    const npsScore = session.responses.find(
      (r) => r.npsScore !== null && r.npsScore !== undefined,
    )?.npsScore;

    // Aggregate sentiment from individual text responses
    const sentimentScores = session.responses
      .filter(
        (r) => r.sentimentScore !== null && r.sentimentScore !== undefined,
      )
      .map((r) => r.sentimentScore!);

    const overallSentiment =
      sentimentScores.length > 0
        ? sentimentScores.reduce((sum, score) => sum + score, 0) /
          sentimentScores.length
        : null;

    // Extract all keywords and themes
    const allKeywords = session.responses.flatMap((r) => r.keywords || []);
    const allThemes = session.responses.flatMap((r) => r.themes || []);

    // Determine satisfaction category
    let category = 'neutral';
    if (npsScore !== undefined) {
      if (npsScore >= 9) category = 'very_satisfied';
      else if (npsScore >= 7) category = 'satisfied';
      else if (npsScore >= 4) category = 'neutral';
      else category = 'dissatisfied';
    } else if (overallSentiment !== null) {
      if (overallSentiment > 0.3) category = 'satisfied';
      else if (overallSentiment < -0.3) category = 'dissatisfied';
    }

    // Check for negative feedback indicators
    const hasNegativeFeedback =
      (overallSentiment !== null && overallSentiment < -0.2) ||
      (npsScore !== undefined && npsScore <= 6) ||
      ratings.some((r) => r.rating <= 2);

    // Extract actionable insights
    const actionableInsights = await this.extractActionableInsights(
      session.responses,
    );
    const improvementSuggestions =
      await this.extractImprovementSuggestions(textResponses);
    const positiveHighlights =
      await this.extractPositiveHighlights(textResponses);

    return {
      overallSentiment: overallSentiment || 0,
      category,
      hasNegativeFeedback,
      keywords: [...new Set(allKeywords)],
      themes: [...new Set(allThemes)],
      actionableInsights,
      summary: await this.generateFeedbackSummary(session, textResponses),
      improvementSuggestions,
      positiveHighlights,
      hasPromoterScore: npsScore !== undefined && npsScore >= 9,
      hasDetractorScore: npsScore !== undefined && npsScore <= 6,
    };
  }

  /**
   * Extract actionable insights from feedback responses
   */
  /**
   * Extract actionable insights from feedback responses
   */
  private async extractActionableInsights(
    responses: FeedbackResponse[],
  ): Promise<string[]> {
    const insights: string[] = [];
    const textResponses = responses
      .filter((r) => r.textValue)
      .map((r) => r.textValue!);

    if (textResponses.length === 0) return insights;

    try {
      const prompt = `Extract actionable insights from this wedding industry feedback:

${textResponses.map((text, i) => `${i + 1}. ${text}`).join('\n')}

Return 2-5 specific, actionable insights that could improve the product. Focus on:
- Specific features mentioned
- Workflow improvements
- Integration needs
- Wedding industry pain points

Format as JSON array of strings.`;

      const result = await this.openAIService.generateCompletion(prompt, {
        max_tokens: 300,
        temperature: 0.3,
        system_prompt:
          'You are a wedding industry product expert. Extract actionable insights and return valid JSON only.',
      });

      const parsed = JSON.parse(result.text);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch (error) {
      console.error('Error extracting actionable insights:', error);
      return [];
    }
  }

  /**
   * Extract improvement suggestions from text feedback
   */
  /**
   * Extract improvement suggestions from text feedback
   */
  private async extractImprovementSuggestions(
    textResponses: string[],
  ): Promise<string[]> {
    if (textResponses.length === 0) return [];

    try {
      const combinedText = textResponses.join(' ');

      const prompt = `Extract improvement suggestions from this wedding industry feedback:

"${combinedText}"

Return 2-4 specific improvement suggestions. Format as JSON array of strings.`;

      const result = await this.openAIService.generateCompletion(prompt, {
        max_tokens: 200,
        temperature: 0.3,
        system_prompt:
          'Extract concrete improvement suggestions from wedding industry feedback. Return valid JSON only.',
      });

      const parsed = JSON.parse(result.text);
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch (error) {
      console.error('Error extracting improvement suggestions:', error);
      return [];
    }
  }

  /**
   * Extract positive highlights from feedback
   */
  /**
   * Extract positive highlights from feedback
   */
  private async extractPositiveHighlights(
    textResponses: string[],
  ): Promise<string[]> {
    if (textResponses.length === 0) return [];

    try {
      const combinedText = textResponses.join(' ');

      const prompt = `Extract positive highlights from this wedding industry feedback:

"${combinedText}"

Return 2-3 positive aspects or features that users liked. Format as JSON array of strings.`;

      const result = await this.openAIService.generateCompletion(prompt, {
        max_tokens: 150,
        temperature: 0.3,
        system_prompt:
          'Extract positive highlights from wedding industry feedback. Return valid JSON only.',
      });

      const parsed = JSON.parse(result.text);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch (error) {
      console.error('Error extracting positive highlights:', error);
      return [];
    }
  }

  /**
   * Generate concise summary of feedback session
   */
  /**
   * Generate concise summary of feedback session
   */
  private async generateFeedbackSummary(
    session: FeedbackSession,
    textResponses: string[],
  ): Promise<string> {
    try {
      const npsResponse = session.responses.find((r) => r.npsScore !== null);
      const npsContext = npsResponse
        ? `NPS Score: ${npsResponse.npsScore}`
        : '';
      const textContent = textResponses.join(' ').substring(0, 500);

      const prompt = `Summarize this wedding industry feedback in 2-3 sentences:

${npsContext}
User Type: ${session.userType}
Feedback Type: ${session.type}
Text Feedback: ${textContent}

Focus on key points and sentiment.`;

      const summary = await this.openAIService.generateCompletion(prompt, {
        max_tokens: 100,
        temperature: 0.3,
        system_prompt:
          'Summarize wedding industry feedback concisely. Focus on key points and sentiment.',
      });

      return summary.text.trim();
    } catch (error) {
      console.error('Error generating feedback summary:', error);
      return `${session.type} feedback from ${session.userType} user`;
    }
  }

  /**
   * Extract wedding-specific context from user profile
   */
  private extractWeddingContext(userContext: UserContext): Record<string, any> {
    return {
      vendorType: userContext.vendorType,
      weddingSeason: userContext.weddingSeason,
      engagementLevel:
        userContext.engagement > 0.7
          ? 'high'
          : userContext.engagement > 0.3
            ? 'medium'
            : 'low',
      accountMaturity:
        userContext.accountAge > 90
          ? 'established'
          : userContext.accountAge > 30
            ? 'developing'
            : 'new',
    };
  }

  // Database operations (to be implemented with specific DB queries)
  private async saveFeedbackSession(session: FeedbackSession): Promise<void> {
    const { error } = await supabase.from('feedback_sessions').insert({
      id: session.id,
      user_id: session.userId,
      session_type: session.type,
      trigger_reason: session.triggerReason,
      trigger_context: session.triggerContext,
      started_at: session.startedAt.toISOString(),
      user_type: session.userType,
      user_tier: session.userTier,
      account_age_days: session.accountAgeDays,
      engagement_score: session.engagementScore,
      device_type: session.deviceType,
      browser: session.browser,
      page_url: session.pageUrl,
      questions_total: session.questions.length,
      completion_rate: session.completionRate,
    });

    if (error) {
      console.error('Error saving feedback session:', error);
      throw new Error(`Failed to save feedback session: ${error.message}`);
    }
  }

  private async saveFeedbackResponse(
    response: FeedbackResponse,
  ): Promise<void> {
    const { error } = await supabase.from('feedback_responses').insert({
      id: response.id,
      session_id: response.sessionId,
      question_key: response.questionKey,
      question_text: response.questionText,
      question_type: response.questionType,
      nps_score: response.npsScore,
      rating_value: response.ratingValue,
      text_value: response.textValue,
      choice_value: response.choiceValue,
      boolean_value: response.booleanValue,
      responded_at: response.respondedAt.toISOString(),
      time_to_respond_seconds: response.timeToRespond,
      question_order: response.questionOrder,
      is_required: response.isRequired,
      sentiment_score: response.sentimentScore,
      keywords: response.keywords,
      themes: response.themes,
    });

    if (error) {
      console.error('Error saving feedback response:', error);
      throw new Error(`Failed to save feedback response: ${error.message}`);
    }
  }

  private async updateFeedbackSession(session: FeedbackSession): Promise<void> {
    const { error } = await supabase
      .from('feedback_sessions')
      .update({
        completed_at: session.completedAt?.toISOString(),
        abandoned_at: session.abandonedAt?.toISOString(),
        session_duration_seconds: session.sessionDuration,
        questions_answered: session.responses.length,
        completion_rate: session.completionRate,
        overall_sentiment: session.overallSentiment,
        satisfaction_category: session.satisfactionCategory,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (error) {
      console.error('Error updating feedback session:', error);
      throw new Error(`Failed to update feedback session: ${error.message}`);
    }
  }

  private async trackFeedbackEvent(
    eventName: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      // Track event in analytics system
      // This could integrate with your existing analytics tracking
      console.log(`Feedback Event: ${eventName}`, data);

      // Could also store in events table for audit trail
      await supabase.from('events').insert({
        event_type: 'feedback',
        event_name: eventName,
        event_data: data,
        user_id: data.userId,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking feedback event:', error);
      // Don't throw - this shouldn't block the main feedback flow
    }
  }

  // Placeholder methods for follow-up processing (to be implemented)
  private async processNPSCompletion(
    session: FeedbackSession,
    analysis: FeedbackAnalysis,
  ): Promise<void> {
    console.log('Processing NPS completion:', {
      sessionId: session.id,
      analysis: analysis.category,
    });
    // Implementation will be added in follow-up automation system
  }

  private async processFeatureFeedbackCompletion(
    session: FeedbackSession,
    analysis: FeedbackAnalysis,
  ): Promise<void> {
    console.log('Processing feature feedback completion:', {
      sessionId: session.id,
      featureName: session.triggerContext.featureName,
    });
    // Implementation will be added in analytics engine
  }

  private async processChurnFeedbackCompletion(
    session: FeedbackSession,
    analysis: FeedbackAnalysis,
  ): Promise<void> {
    console.log('Processing churn feedback completion:', {
      sessionId: session.id,
      analysis: analysis.category,
    });
    // Implementation will be added in follow-up automation system
  }

  private async triggerFollowUpActions(
    session: FeedbackSession,
    analysis: FeedbackAnalysis,
  ): Promise<void> {
    console.log('Triggering follow-up actions:', {
      sessionId: session.id,
      hasNegative: analysis.hasNegativeFeedback,
    });
    // Implementation will be added in follow-up automation system
  }

  private async updateFeedbackAnalytics(
    session: FeedbackSession,
    analysis: FeedbackAnalysis,
  ): Promise<void> {
    console.log('Updating feedback analytics:', {
      sessionId: session.id,
      type: session.type,
    });
    // Implementation will be added in analytics engine
  }
}

// Export singleton instance
export const feedbackCollector = FeedbackCollector.getInstance();
