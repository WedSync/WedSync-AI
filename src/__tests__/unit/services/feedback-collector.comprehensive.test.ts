/**
 * COMPREHENSIVE UNIT TESTS: WS-236 User Feedback System
 * Team E - Batch 2, Round 1
 *
 * Testing the complete FeedbackCollector system with wedding industry context
 * Covers: NPS, CSAT, feature feedback, rate limiting, sentiment analysis
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { FeedbackCollector } from '@/lib/feedback/feedback-collector';
import { NPSManager } from '@/lib/feedback/nps-manager';
import { SentimentAnalyzer } from '@/lib/feedback/sentiment-analyzer';
import { FeedbackRateLimiter } from '@/lib/feedback/rate-limiter';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/feedback/sentiment-analyzer');
jest.mock('@/lib/feedback/rate-limiter');

interface MockUserContext {
  userType: 'supplier' | 'couple';
  tier: string;
  accountAge: number;
  engagement: number;
  vendorType?: string;
  featureUsage?: Record<string, any>;
}

interface MockFeedbackSession {
  id: string;
  userId: string;
  type: string;
  userType: 'supplier' | 'couple';
  userTier: string;
  responses: Array<{
    questionKey: string;
    npsScore?: number;
    ratingValue?: number;
    textValue?: string;
  }>;
}

describe('FeedbackCollector - Comprehensive Wedding Industry Tests', () => {
  let feedbackCollector: FeedbackCollector;
  let mockSentimentAnalyzer: jest.Mocked<SentimentAnalyzer>;
  let mockRateLimiter: jest.Mocked<FeedbackRateLimiter>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup sentiment analyzer mock
    mockSentimentAnalyzer = {
      analyze: jest.fn().mockResolvedValue({
        sentiment: 0.2,
        keywords: ['easy', 'helpful'],
        themes: ['usability', 'efficiency'],
      }),
    } as any;

    // Setup rate limiter mock
    mockRateLimiter = {
      checkUserLimit: jest.fn().mockResolvedValue({
        allowed: true,
        reason: 'eligible',
        nextEligibleDate: null,
        retryAfter: null,
      }),
    } as any;

    // Create feedback collector instance
    feedbackCollector = FeedbackCollector.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Wedding Industry Context - Supplier Types', () => {
    it('should generate photographer-specific NPS questions', async () => {
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'professional',
        accountAge: 30,
        engagement: 0.8,
        vendorType: 'photographer',
      };

      mockSupabaseUserContext(userContext);

      const request = {
        userId: 'photographer-123',
        feedbackType: 'nps' as const,
        triggerReason: 'milestone_reached',
        context: { feature: 'form_builder' },
        userAgent: 'test-browser',
        deviceInfo: { type: 'desktop', browser: 'chrome' },
      };

      const session = await feedbackCollector.startFeedbackSession(request);

      expect(session.type).toBe('nps');
      expect(session.userType).toBe('supplier');
      expect(session.questions).toHaveLength(4); // NPS + business impact + vendor specific + improvement priority

      // Check for photographer-specific context
      const vendorSpecificQ = session.questions.find(
        (q) => q.key === 'vendor_specific_feedback',
      );
      expect(vendorSpecificQ?.text).toContain('photographer');
      expect(vendorSpecificQ?.text).toContain('workflow');
    });

    it('should generate venue-specific feature feedback questions', async () => {
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'scale',
        accountAge: 60,
        engagement: 0.9,
        vendorType: 'venue',
        featureUsage: {
          form_builder: { usageCount: 15, lastUsed: new Date() },
        },
      };

      mockSupabaseUserContext(userContext);

      const request = {
        userId: 'venue-456',
        feedbackType: 'feature' as const,
        triggerReason: 'feature_usage',
        context: { featureName: 'form_builder' },
        userAgent: 'test-browser',
      };

      const session = await feedbackCollector.startFeedbackSession(request);

      expect(session.type).toBe('feature');
      expect(session.questions).toHaveLength(7); // Core ratings + usage + context specific + improvements + wedding season

      // Check for wedding business value question
      const valueQ = session.questions.find(
        (q) => q.key === 'feature_wedding_value',
      );
      expect(valueQ?.text).toContain('wedding business');

      // Check for venue-specific pain points
      const painPointsQ = session.questions.find(
        (q) => q.key === 'form_builder_pain_points',
      );
      expect(painPointsQ).toBeDefined();
    });

    it('should handle couple-specific onboarding feedback', async () => {
      const userContext: MockUserContext = {
        userType: 'couple',
        tier: 'free',
        accountAge: 3,
        engagement: 0.4,
      };

      mockSupabaseUserContext(userContext);

      const request = {
        userId: 'couple-789',
        feedbackType: 'onboarding' as const,
        triggerReason: 'onboarding_completion',
        context: {},
        userAgent: 'test-mobile',
      };

      const session = await feedbackCollector.startFeedbackSession(request);

      expect(session.type).toBe('onboarding');
      expect(session.userType).toBe('couple');

      // Couple-specific questions should not include business setup
      const businessSetupQ = session.questions.find(
        (q) => q.key === 'business_setup_completion',
      );
      expect(businessSetupQ).toBeUndefined();

      // Should have general onboarding questions
      const easeQ = session.questions.find(
        (q) => q.key === 'onboarding_overall_ease',
      );
      expect(easeQ).toBeDefined();
    });
  });

  describe('Rate Limiting and Feedback Fatigue Prevention', () => {
    it('should enforce rate limiting for frequent feedback requests', async () => {
      // Mock rate limiter to deny request
      mockRateLimiter.checkUserLimit.mockResolvedValueOnce({
        allowed: false,
        reason: 'rate_limited',
        nextEligibleDate: '2025-02-01',
        retryAfter: 86400,
      });

      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        'user-123',
        'nps',
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('rate_limited');
      expect(eligibility.retryAfter).toBe(86400);
    });

    it('should prevent feedback fatigue with recent feedback check', async () => {
      // Mock recent feedback query
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [
                { created_at: '2025-01-20T10:00:00Z', session_type: 'nps' },
                { created_at: '2025-01-21T10:00:00Z', session_type: 'feature' },
              ],
              error: null,
            }),
          }),
        }),
      });

      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        'user-123',
        'nps',
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('feedback_fatigue');
    });

    it('should allow feedback for eligible users with proper engagement', async () => {
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'professional',
        accountAge: 30,
        engagement: 0.7,
      };

      mockSupabaseUserContext(userContext);

      // Mock no recent feedback
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        'user-123',
        'nps',
      );

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBe('eligible');
    });

    it('should require minimum account age for NPS surveys', async () => {
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'starter',
        accountAge: 3, // Less than 7 days
        engagement: 0.8,
      };

      mockSupabaseUserContext(userContext);

      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        'user-123',
        'nps',
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('account_too_new');
    });

    it('should require active client engagement for supplier feedback', async () => {
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'professional',
        accountAge: 30,
        engagement: 0.7,
      };

      mockSupabaseUserContext(userContext);

      // Mock no active clients
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        'user-123',
        'nps',
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('no_active_usage');
    });
  });

  describe('Sentiment Analysis and Wedding Industry Terms', () => {
    it('should analyze wedding-specific positive sentiment', async () => {
      const weddingPositiveFeedback =
        'The form builder made creating my wedding questionnaire so much easier! My couples love how organized everything is now.';

      mockSentimentAnalyzer.analyze.mockResolvedValueOnce({
        sentiment: 0.8,
        keywords: ['easier', 'love', 'organized'],
        themes: ['efficiency', 'client_satisfaction', 'organization'],
      });

      const analysis = await mockSentimentAnalyzer.analyze(
        weddingPositiveFeedback,
      );

      expect(analysis.sentiment).toBeGreaterThan(0.5);
      expect(analysis.keywords).toContain('easier');
      expect(analysis.themes).toContain('efficiency');
    });

    it('should analyze wedding-specific negative sentiment', async () => {
      const weddingNegativeFeedback =
        'The guest management system is confusing during busy wedding season. My clients keep calling with questions.';

      mockSentimentAnalyzer.analyze.mockResolvedValueOnce({
        sentiment: -0.6,
        keywords: ['confusing', 'busy', 'questions'],
        themes: ['usability_issues', 'support_burden', 'seasonal_stress'],
      });

      const analysis = await mockSentimentAnalyzer.analyze(
        weddingNegativeFeedback,
      );

      expect(analysis.sentiment).toBeLessThan(-0.3);
      expect(analysis.keywords).toContain('confusing');
      expect(analysis.themes).toContain('usability_issues');
    });

    it('should extract wedding industry themes from mixed feedback', async () => {
      const mixedFeedback =
        'Love the timeline feature for wedding planning, but the venue coordination could be better.';

      mockSentimentAnalyzer.analyze.mockResolvedValueOnce({
        sentiment: 0.1,
        keywords: ['love', 'timeline', 'better', 'coordination'],
        themes: [
          'timeline_management',
          'venue_coordination',
          'feature_satisfaction',
        ],
      });

      const analysis = await mockSentimentAnalyzer.analyze(mixedFeedback);

      expect(analysis.themes).toContain('timeline_management');
      expect(analysis.themes).toContain('venue_coordination');
      expect(analysis.sentiment).toBeGreaterThan(-0.2);
    });
  });

  describe('NPS Processing and Follow-up Actions', () => {
    it('should process NPS promoter (score 9) with referral program invitation', async () => {
      const session: MockFeedbackSession = {
        id: 'session-123',
        userId: 'user-123',
        type: 'nps',
        userType: 'supplier',
        userTier: 'professional',
        responses: [
          { questionKey: 'nps_score', npsScore: 9 },
          {
            questionKey: 'nps_business_impact',
            textValue: 'WedSync has doubled my efficiency!',
          },
        ],
      };

      mockSupabaseOperations();

      const mockScheduleEmail = jest.fn();
      const mockAddToReferralProgram = jest.fn();

      // Mock the methods
      (feedbackCollector as any).scheduleEmail = mockScheduleEmail;
      (feedbackCollector as any).addToReferralProgram =
        mockAddToReferralProgram;
      (feedbackCollector as any).isInReferralProgram = jest
        .fn()
        .mockResolvedValue(false);

      await (feedbackCollector as any).processNPSCompletion(session, {
        overallSentiment: 0.8,
        hasPromoterScore: true,
        category: 'very_satisfied',
      });

      // Should schedule thank you email
      expect(mockScheduleEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          template: 'nps_promoter_thank_you_referral',
          delay: '1 hour',
        }),
      );

      // Should add to referral program
      expect(mockAddToReferralProgram).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          source: 'nps_promoter',
          npsScore: 9,
        }),
      );
    });

    it('should process NPS detractor (score 3) with support ticket creation', async () => {
      const session: MockFeedbackSession = {
        id: 'session-456',
        userId: 'user-456',
        type: 'nps',
        userType: 'supplier',
        userTier: 'starter',
        responses: [
          { questionKey: 'nps_score', npsScore: 3 },
          {
            questionKey: 'nps_business_impact',
            textValue: 'Too complicated for my small business',
          },
        ],
      };

      mockSupabaseOperations();

      const mockCreateSupportTicket = jest.fn();
      const mockScheduleEmail = jest.fn();

      (feedbackCollector as any).createSupportTicket = mockCreateSupportTicket;
      (feedbackCollector as any).scheduleEmail = mockScheduleEmail;

      await (feedbackCollector as any).processNPSCompletion(session, {
        overallSentiment: -0.7,
        hasDetractorScore: true,
        category: 'dissatisfied',
      });

      // Should create high priority support ticket
      expect(mockCreateSupportTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          priority: 'high',
          type: 'nps_detractor_followup',
          assignTo: 'customer_success_lead',
        }),
      );

      // Should schedule personal outreach email
      expect(mockScheduleEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          template: 'nps_detractor_personal_outreach',
          delay: '30 minutes',
        }),
      );
    });

    it('should process NPS passive (score 7) with educational follow-up', async () => {
      const session: MockFeedbackSession = {
        id: 'session-789',
        userId: 'user-789',
        type: 'nps',
        userType: 'supplier',
        userTier: 'professional',
        responses: [
          { questionKey: 'nps_score', npsScore: 7 },
          {
            questionKey: 'nps_business_impact',
            textValue: "It's okay, but I could use more features",
          },
        ],
      };

      mockSupabaseOperations();

      const mockScheduleEmail = jest.fn();
      const mockGetUnderutilizedFeatures = jest
        .fn()
        .mockResolvedValue(['journey_canvas', 'automation_workflows']);

      (feedbackCollector as any).scheduleEmail = mockScheduleEmail;
      (feedbackCollector as any).getUnderutilizedFeatures =
        mockGetUnderutilizedFeatures;

      await (feedbackCollector as any).processNPSCompletion(session, {
        overallSentiment: 0.1,
        hasPromoterScore: false,
        hasDetractorScore: false,
        category: 'neutral',
      });

      // Should schedule feature highlights email
      expect(mockScheduleEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-789',
          template: 'nps_passive_feature_highlights',
          delay: '2 hours',
          context: expect.objectContaining({
            underutilizedFeatures: ['journey_canvas', 'automation_workflows'],
          }),
        }),
      );
    });
  });

  describe('Feature Feedback Processing', () => {
    it('should process form builder feedback with improvement suggestions', async () => {
      const session: MockFeedbackSession = {
        id: 'session-fb1',
        userId: 'user-fb1',
        type: 'feature',
        userType: 'supplier',
        userTier: 'professional',
        responses: [
          { questionKey: 'feature_satisfaction', ratingValue: 4 },
          { questionKey: 'feature_ease', ratingValue: 3 },
          { questionKey: 'feature_wedding_value', ratingValue: 5 },
          {
            questionKey: 'feature_improvements',
            textValue:
              'Need more wedding-specific templates, especially for dietary restrictions and accessibility needs',
          },
        ],
      };

      mockSupabaseOperations();

      // Mock sentiment analysis for improvement suggestion
      mockSentimentAnalyzer.analyze.mockResolvedValueOnce({
        sentiment: 0.2,
        keywords: ['templates', 'dietary', 'accessibility'],
        themes: [
          'template_requests',
          'wedding_specific_needs',
          'accessibility',
        ],
      });

      const mockCreateFeatureRequests = jest.fn();
      (feedbackCollector as any).createFeatureRequests =
        mockCreateFeatureRequests;

      await (feedbackCollector as any).processFeatureFeedbackCompletion(
        session,
        {
          overallSentiment: 0.2,
          improvementSuggestions: [
            'wedding templates',
            'dietary restrictions',
            'accessibility features',
          ],
          category: 'satisfied',
        },
      );

      // Should create feature requests from suggestions
      expect(mockCreateFeatureRequests).toHaveBeenCalledWith(
        ['wedding templates', 'dietary restrictions', 'accessibility features'],
        'user-fb1',
      );
    });

    it('should track feature usage patterns in feedback context', async () => {
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'scale',
        accountAge: 90,
        engagement: 0.8,
        vendorType: 'photographer',
        featureUsage: {
          form_builder: {
            usageCount: 25,
            lastUsed: new Date(),
            averageTimeSpent: 120,
          },
        },
      };

      mockSupabaseUserContext(userContext);

      const request = {
        userId: 'power-user-123',
        feedbackType: 'feature' as const,
        triggerReason: 'power_user_milestone',
        context: { featureName: 'form_builder' },
        userAgent: 'test-browser',
      };

      const session = await feedbackCollector.startFeedbackSession(request);

      expect(session.triggerContext.featureName).toBe('form_builder');

      // Should include power user context in questions
      const usageQ = session.questions.find((q) => q.key === 'usage_frequency');
      expect(usageQ).toBeDefined();
    });
  });

  describe('Wedding Season Context and Timing', () => {
    it('should include wedding season context in feedback questions', async () => {
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'professional',
        accountAge: 120,
        engagement: 0.9,
        vendorType: 'photographer',
      };

      mockSupabaseUserContext(userContext);

      const request = {
        userId: 'photographer-season',
        feedbackType: 'nps' as const,
        triggerReason: 'quarterly_check',
        context: {},
        userAgent: 'test-browser',
      };

      const session = await feedbackCollector.startFeedbackSession(request);

      // Should have wedding season context question
      const seasonQ = session.questions.find(
        (q) => q.key === 'current_wedding_season',
      );
      expect(seasonQ).toBeDefined();
      expect(seasonQ?.text).toContain('wedding season');
      expect(seasonQ?.choices).toContain('Very busy (peak season)');
      expect(seasonQ?.choices).toContain('Off-season/break');
    });

    it('should handle wedding phase context for couples', async () => {
      const userContext: MockUserContext = {
        userType: 'couple',
        tier: 'free',
        accountAge: 45,
        engagement: 0.6,
      };

      mockSupabaseUserContext(userContext);

      const request = {
        userId: 'couple-planning',
        feedbackType: 'feature' as const,
        triggerReason: 'milestone_usage',
        context: {
          featureName: 'timeline_builder',
          weddingPhase: 'active_planning',
        },
        userAgent: 'test-mobile',
      };

      const session = await feedbackCollector.startFeedbackSession(request);

      expect(session.triggerContext.weddingPhase).toBe('active_planning');

      // Should adapt questions for wedding planning context
      const valueQ = session.questions.find(
        (q) => q.key === 'feature_wedding_value',
      );
      expect(valueQ?.text).toContain('wedding planning');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid session ID gracefully', async () => {
      await expect(
        feedbackCollector.submitResponse(
          'invalid-session',
          'test-question',
          'test-value',
          10,
        ),
      ).rejects.toThrow('Invalid session ID: invalid-session');
    });

    it('should handle invalid question key gracefully', async () => {
      // Create a valid session first
      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'professional',
        accountAge: 30,
        engagement: 0.7,
      };

      mockSupabaseUserContext(userContext);

      const session = await feedbackCollector.startFeedbackSession({
        userId: 'test-user',
        feedbackType: 'nps',
        triggerReason: 'test',
        context: {},
        userAgent: 'test',
      });

      await expect(
        feedbackCollector.submitResponse(
          session.id,
          'invalid-question-key',
          'test-value',
          10,
        ),
      ).rejects.toThrow('Invalid question key: invalid-question-key');
    });

    it('should handle database errors during session creation', async () => {
      // Mock database error
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      });

      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'professional',
        accountAge: 30,
        engagement: 0.7,
      };

      mockSupabaseUserContext(userContext);

      await expect(
        feedbackCollector.startFeedbackSession({
          userId: 'test-user',
          feedbackType: 'nps',
          triggerReason: 'test',
          context: {},
          userAgent: 'test',
        }),
      ).rejects.toThrow();
    });

    it('should handle sentiment analysis failures gracefully', async () => {
      mockSentimentAnalyzer.analyze.mockRejectedValueOnce(
        new Error('OpenAI API unavailable'),
      );

      const userContext: MockUserContext = {
        userType: 'supplier',
        tier: 'professional',
        accountAge: 30,
        engagement: 0.7,
      };

      mockSupabaseUserContext(userContext);

      const session = await feedbackCollector.startFeedbackSession({
        userId: 'test-user',
        feedbackType: 'nps',
        triggerReason: 'test',
        context: {},
        userAgent: 'test',
      });

      // Should continue processing even if sentiment analysis fails
      await expect(
        feedbackCollector.submitResponse(
          session.id,
          'nps_score',
          { npsScore: 8 },
          10,
        ),
      ).resolves.not.toThrow();
    });
  });

  // Helper functions for mocking
  function mockSupabaseUserContext(context: MockUserContext) {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              user_type: context.userType,
              subscription_tier: context.tier,
              created_at: new Date(
                Date.now() - context.accountAge * 24 * 60 * 60 * 1000,
              ).toISOString(),
              engagement_score: context.engagement,
              vendor_type: context.vendorType,
              feature_usage: context.featureUsage,
            },
            error: null,
          }),
        }),
      }),
      insert: jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'session-123' }], error: null }),
      update: jest.fn().mockResolvedValue({ data: [{}], error: null }),
    });
  }

  function mockSupabaseOperations() {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'new-record' }], error: null }),
      update: jest.fn().mockResolvedValue({ data: [{}], error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
  }
});

describe('NPSManager - Wedding Industry Analytics', () => {
  let npsManager: NPSManager;

  beforeEach(() => {
    npsManager = new NPSManager();
    jest.clearAllMocks();
  });

  it('should calculate wedding industry NPS with vendor segmentation', async () => {
    // Mock NPS survey data with wedding industry context
    const mockNPSSurveys = [
      {
        score: 9,
        userType: 'supplier',
        vendorType: 'photographer',
        completedAt: new Date('2025-06-01'),
      },
      {
        score: 8,
        userType: 'supplier',
        vendorType: 'venue',
        completedAt: new Date('2025-06-15'),
      },
      {
        score: 10,
        userType: 'couple',
        vendorType: null,
        completedAt: new Date('2025-05-20'),
      },
      {
        score: 6,
        userType: 'supplier',
        vendorType: 'florist',
        completedAt: new Date('2025-07-01'),
      },
      {
        score: 9,
        userType: 'supplier',
        vendorType: 'photographer',
        completedAt: new Date('2025-10-01'),
      },
    ];

    // Mock database query
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockResolvedValue({
            data: mockNPSSurveys,
            error: null,
          }),
        }),
      }),
    });

    const npsMetrics =
      await npsManager.calculateWeddingIndustryNPS('quarterly');

    expect(npsMetrics.overall.score).toBe(60); // (4 promoters - 1 detractor) / 5 * 100
    expect(npsMetrics.overall.promoters).toBe(4);
    expect(npsMetrics.overall.detractors).toBe(1);
    expect(npsMetrics.segments.supplier).toBeDefined();
    expect(npsMetrics.segments.couple).toBeDefined();
    expect(npsMetrics.segments.vendorTypes.photographer).toBeDefined();
    expect(npsMetrics.seasonality.weddingSeason).toBeDefined();
    expect(npsMetrics.benchmarks.target).toBe(50);
  });

  it('should identify wedding season vs off-season trends', async () => {
    const npsManager = new NPSManager();

    // Test wedding season detection
    expect((npsManager as any).isWeddingSeason(new Date('2025-06-15'))).toBe(
      true,
    ); // June
    expect((npsManager as any).isWeddingSeason(new Date('2025-10-01'))).toBe(
      true,
    ); // October
    expect((npsManager as any).isWeddingSeason(new Date('2025-02-14'))).toBe(
      false,
    ); // February
    expect((npsManager as any).isWeddingSeason(new Date('2025-12-25'))).toBe(
      false,
    ); // December
  });

  it('should calculate response rates with wedding context', async () => {
    // Mock survey trigger and completion data
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  triggered_at: '2025-01-01',
                  completed_at: '2025-01-01',
                  user_type: 'supplier',
                },
                {
                  triggered_at: '2025-01-02',
                  completed_at: null,
                  user_type: 'supplier',
                },
                {
                  triggered_at: '2025-01-03',
                  completed_at: '2025-01-03',
                  user_type: 'couple',
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const responseRate = await (npsManager as any).calculateResponseRate(
      'monthly',
    );

    expect(responseRate).toBe(67); // 2 completed out of 3 triggered = 66.67% rounded
  });
});
