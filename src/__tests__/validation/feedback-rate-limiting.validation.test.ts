/**
 * VALIDATION TESTS: WS-236 Rate Limiting & Feedback Fatigue Prevention
 * Team E - Batch 2, Round 1
 *
 * Comprehensive validation scenarios for:
 * - Rate limiting enforcement (max 2 per user per month)
 * - Wedding season sensitivity
 * - Cross-feedback-type coordination
 * - Time-based cooling periods
 * - User context awareness
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { FeedbackRateLimiter } from '@/lib/feedback/rate-limiter';
import { FeedbackCollector } from '@/lib/feedback/feedback-collector';
import { WeddingSeasonManager } from '@/lib/wedding/season-manager';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/wedding/season-manager');

interface MockFeedbackSession {
  id: string;
  userId: string;
  sessionType: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed' | 'abandoned';
  userType: 'supplier' | 'couple';
  engagementScore: number;
}

interface MockUserContext {
  userId: string;
  userType: 'supplier' | 'couple';
  tier: string;
  vendorType?: string;
  accountAge: number;
  engagement: number;
  weddingSeasonStatus?: 'peak' | 'moderate' | 'slow' | 'off';
  recentStressIndicators?: number;
}

describe('Feedback Rate Limiting - Core Rules Validation', () => {
  let rateLimiter: FeedbackRateLimiter;
  let feedbackCollector: FeedbackCollector;
  let weddingSeasonManager: jest.Mocked<WeddingSeasonManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    rateLimiter = new FeedbackRateLimiter();
    feedbackCollector = FeedbackCollector.getInstance();

    weddingSeasonManager = {
      isWeddingSeason: jest.fn(),
      getSeasonalStressLevel: jest.fn(),
      getVendorWorkload: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Monthly Rate Limit Enforcement (Max 2 per month)', () => {
    it('should allow first feedback request within monthly period', async () => {
      const userId = 'user-no-previous-feedback';
      mockRecentFeedbackHistory(userId, []); // No previous feedback

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
      expect(rateLimitCheck.remainingInPeriod).toBe(2);
      expect(rateLimitCheck.nextResetDate).toBeDefined();
    });

    it('should allow second feedback request within monthly period', async () => {
      const userId = 'user-one-previous-feedback';

      // Mock one previous feedback this month
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 15), // 15 days ago
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
      expect(rateLimitCheck.remainingInPeriod).toBe(1);
    });

    it('should deny third feedback request within monthly period', async () => {
      const userId = 'user-two-previous-feedback';

      // Mock two previous feedback sessions this month
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 20), // 20 days ago
        createMockSession('feature', 10), // 10 days ago
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('monthly_limit_exceeded');
      expect(rateLimitCheck.remainingInPeriod).toBe(0);
      expect(rateLimitCheck.nextEligibleDate).toBeDefined();
      expect(rateLimitCheck.retryAfter).toBeGreaterThan(0);
    });

    it('should reset monthly limit at month boundary', async () => {
      const userId = 'user-previous-month-feedback';

      // Mock two feedback sessions from previous month
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 45), // 45 days ago (previous month)
        createMockSession('feature', 40), // 40 days ago (previous month)
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
      expect(rateLimitCheck.remainingInPeriod).toBe(2); // Full allowance reset
    });

    it('should handle mixed month boundaries correctly', async () => {
      const userId = 'user-mixed-month-feedback';

      // Mock one session this month, one previous month
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 45), // Previous month
        createMockSession('feature', 15), // This month
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.remainingInPeriod).toBe(1); // One remaining this month
    });
  });

  describe('Feedback Fatigue Prevention (7-day cooldown)', () => {
    it('should enforce 7-day cooldown between feedback sessions', async () => {
      const userId = 'user-recent-feedback';

      // Mock recent feedback 5 days ago
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 5), // 5 days ago - too recent
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('feedback_fatigue_protection');
      expect(rateLimitCheck.daysUntilEligible).toBe(2); // 7 - 5 = 2 days remaining
      expect(rateLimitCheck.nextEligibleDate).toBeDefined();
    });

    it('should allow feedback after 7-day cooldown period', async () => {
      const userId = 'user-cooled-down';

      // Mock feedback exactly 7 days ago
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 7), // Exactly 7 days ago - should be eligible
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
      expect(rateLimitCheck.daysUntilEligible).toBe(0);
    });

    it('should allow feedback after 8+ days cooldown', async () => {
      const userId = 'user-long-cooled-down';

      // Mock feedback 10 days ago
      mockRecentFeedbackHistory(userId, [createMockSession('feature', 10)]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
    });

    it('should not count abandoned sessions in cooldown calculation', async () => {
      const userId = 'user-abandoned-sessions';

      // Mock abandoned session 5 days ago (should not count)
      mockRecentFeedbackHistory(userId, [
        {
          ...createMockSession('nps', 5),
          status: 'abandoned',
          completedAt: undefined,
        },
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
      // Abandoned sessions shouldn't trigger fatigue protection
    });
  });

  describe('Wedding Season Sensitivity', () => {
    it('should extend cooldown during peak wedding season for suppliers', async () => {
      const userId = 'supplier-peak-season';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'professional',
        vendorType: 'photographer',
        accountAge: 90,
        engagement: 0.8,
        weddingSeasonStatus: 'peak',
        recentStressIndicators: 0.9, // High stress
      };

      mockUserContext(userContext);
      weddingSeasonManager.isWeddingSeason.mockReturnValue(true);
      weddingSeasonManager.getSeasonalStressLevel.mockReturnValue(0.9);
      weddingSeasonManager.getVendorWorkload.mockReturnValue('extremely_busy');

      // Mock recent feedback 5 days ago
      mockRecentFeedbackHistory(userId, [createMockSession('nps', 5)]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('wedding_season_protection');
      expect(rateLimitCheck.daysUntilEligible).toBeGreaterThan(2); // Extended cooldown
      expect(rateLimitCheck.seasonalContext).toEqual({
        isWeddingSeason: true,
        stressLevel: 0.9,
        workload: 'extremely_busy',
        extendedCooldown: true,
      });
    });

    it('should use standard cooldown during off-season', async () => {
      const userId = 'supplier-off-season';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'professional',
        vendorType: 'venue',
        accountAge: 120,
        engagement: 0.6,
        weddingSeasonStatus: 'off',
        recentStressIndicators: 0.2,
      };

      mockUserContext(userContext);
      weddingSeasonManager.isWeddingSeason.mockReturnValue(false);
      weddingSeasonManager.getSeasonalStressLevel.mockReturnValue(0.2);
      weddingSeasonManager.getVendorWorkload.mockReturnValue('slow');

      // Mock recent feedback 6 days ago
      mockRecentFeedbackHistory(userId, [createMockSession('nps', 6)]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      expect(rateLimitCheck.allowed).toBe(true); // Would be false if extended cooldown applied
      expect(rateLimitCheck.reason).toBe('eligible');
      expect(rateLimitCheck.seasonalContext.extendedCooldown).toBe(false);
    });

    it('should not apply seasonal restrictions to couples', async () => {
      const userId = 'couple-wedding-season';
      const userContext: MockUserContext = {
        userId,
        userType: 'couple',
        tier: 'free',
        accountAge: 30,
        engagement: 0.7,
        weddingSeasonStatus: 'peak',
      };

      mockUserContext(userContext);
      weddingSeasonManager.isWeddingSeason.mockReturnValue(true);

      // Mock recent feedback 5 days ago
      mockRecentFeedbackHistory(userId, [createMockSession('nps', 5)]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      // Couples should not get extended cooldown during wedding season
      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('feedback_fatigue_protection'); // Standard fatigue, not seasonal
      expect(rateLimitCheck.daysUntilEligible).toBe(2); // Standard 7-day cooldown
    });

    it('should reduce rate limits for stressed suppliers during peak season', async () => {
      const userId = 'stressed-supplier-peak';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'professional',
        vendorType: 'wedding_planner',
        accountAge: 200,
        engagement: 0.9,
        weddingSeasonStatus: 'peak',
        recentStressIndicators: 0.95, // Extremely high stress
      };

      mockUserContext(userContext);
      weddingSeasonManager.getSeasonalStressLevel.mockReturnValue(0.95);
      weddingSeasonManager.getVendorWorkload.mockReturnValue('overwhelmed');

      // Mock one previous feedback this month
      mockRecentFeedbackHistory(userId, [createMockSession('nps', 15)]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(
        userId,
        'feature',
      );

      // Should reduce monthly limit from 2 to 1 during extreme stress
      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('seasonal_stress_protection');
      expect(rateLimitCheck.adjustedMonthlyLimit).toBe(1); // Reduced from 2
      expect(rateLimitCheck.stressLevel).toBe(0.95);
    });
  });

  describe('User Context Awareness', () => {
    it('should require higher engagement threshold for new users', async () => {
      const userId = 'new-low-engagement-user';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'starter',
        accountAge: 5, // New user
        engagement: 0.15, // Low engagement
      };

      mockUserContext(userContext);
      mockRecentFeedbackHistory(userId, []);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('insufficient_engagement');
      expect(rateLimitCheck.requiredEngagement).toBe(0.25); // Higher threshold for new users
      expect(rateLimitCheck.currentEngagement).toBe(0.15);
    });

    it('should allow feedback for established users with moderate engagement', async () => {
      const userId = 'established-moderate-engagement';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'professional',
        accountAge: 60, // Established user
        engagement: 0.4, // Moderate engagement
      };

      mockUserContext(userContext);
      mockRecentFeedbackHistory(userId, []);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
    });

    it('should apply different rules for enterprise tier users', async () => {
      const userId = 'enterprise-user';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'enterprise',
        vendorType: 'venue',
        accountAge: 180,
        engagement: 0.8,
      };

      mockUserContext(userContext);

      // Mock 3 feedback sessions this month (would normally exceed limit)
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 25),
        createMockSession('feature', 15),
        createMockSession('churn', 8),
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      // Enterprise users get higher monthly limit (3 instead of 2)
      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('eligible');
      expect(rateLimitCheck.adjustedMonthlyLimit).toBe(3);
      expect(rateLimitCheck.tierBenefits).toContain('increased_feedback_limit');
    });

    it('should require active client usage for supplier feedback eligibility', async () => {
      const userId = 'supplier-no-clients';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'professional',
        accountAge: 90,
        engagement: 0.7,
      };

      mockUserContext(userContext);
      mockRecentFeedbackHistory(userId, []);

      // Mock no active clients
      mockActiveClientCheck(userId, false);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('no_active_usage');
      expect(rateLimitCheck.details).toContain('active clients');
    });

    it('should handle different account age requirements by feedback type', async () => {
      const userId = 'young-account';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'professional',
        accountAge: 5, // Less than NPS requirement (7 days)
        engagement: 0.8,
      };

      mockUserContext(userContext);
      mockRecentFeedbackHistory(userId, []);

      // NPS requires 7+ days account age
      const npsCheck = await rateLimiter.checkUserLimit(userId, 'nps');
      expect(npsCheck.allowed).toBe(false);
      expect(npsCheck.reason).toBe('account_too_young');
      expect(npsCheck.minAccountAgeDays).toBe(7);

      // Feature feedback requires only 3+ days
      const featureCheck = await rateLimiter.checkUserLimit(userId, 'feature');
      expect(featureCheck.allowed).toBe(true);
      expect(featureCheck.reason).toBe('eligible');

      // Onboarding feedback has no age requirement
      const onboardingCheck = await rateLimiter.checkUserLimit(
        userId,
        'onboarding',
      );
      expect(onboardingCheck.allowed).toBe(true);
    });
  });

  describe('Cross-Feedback-Type Coordination', () => {
    it('should coordinate cooldowns across different feedback types', async () => {
      const userId = 'user-mixed-feedback-types';

      // Recent NPS feedback should affect feature feedback eligibility
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 4), // NPS 4 days ago
      ]);

      const featureCheck = await rateLimiter.checkUserLimit(userId, 'feature');

      expect(featureCheck.allowed).toBe(false);
      expect(featureCheck.reason).toBe('feedback_fatigue_protection');
      expect(featureCheck.lastFeedbackType).toBe('nps');
      expect(featureCheck.daysUntilEligible).toBe(3); // 7 - 4 = 3 days
    });

    it('should not coordinate between onboarding and other feedback types', async () => {
      const userId = 'user-recent-onboarding';

      // Recent onboarding feedback should not block other types
      mockRecentFeedbackHistory(userId, [
        createMockSession('onboarding', 2), // Onboarding 2 days ago
      ]);

      const npsCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(npsCheck.allowed).toBe(true); // Onboarding doesn't count for cooldown
      expect(npsCheck.reason).toBe('eligible');
    });

    it('should handle urgent feedback types (churn) with relaxed rules', async () => {
      const userId = 'user-at-risk';
      const userContext: MockUserContext = {
        userId,
        userType: 'supplier',
        tier: 'professional',
        accountAge: 120,
        engagement: 0.2, // Low engagement - churn risk
      };

      mockUserContext(userContext);

      // Recent feedback would normally block, but churn is urgent
      mockRecentFeedbackHistory(userId, [
        createMockSession('nps', 3), // 3 days ago
      ]);

      const churnCheck = await rateLimiter.checkUserLimit(userId, 'churn');

      expect(churnCheck.allowed).toBe(true); // Churn feedback bypasses cooldown
      expect(churnCheck.reason).toBe('urgent_feedback_type');
      expect(churnCheck.urgencyLevel).toBe('high');
    });

    it('should track feedback density to prevent survey spam', async () => {
      const userId = 'user-high-density';

      // Multiple feedback sessions in short time spans
      mockRecentFeedbackHistory(userId, [
        createMockSession('feature', 30), // 30 days ago
        createMockSession('nps', 25), // 25 days ago
        createMockSession('feature', 20), // 20 days ago
        createMockSession('onboarding', 15), // 15 days ago (doesn't count)
        createMockSession('feature', 10), // 10 days ago
      ]);

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(false);
      expect(rateLimitCheck.reason).toBe('high_feedback_density');
      expect(rateLimitCheck.feedbackDensity).toBeGreaterThan(0.8); // High density
      expect(rateLimitCheck.recommendedCooldown).toBeGreaterThan(7); // Extended cooldown
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-db-error';

      // Mock database error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest
              .fn()
              .mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      });

      // Should default to allowing feedback when database is unavailable
      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      expect(rateLimitCheck.allowed).toBe(true);
      expect(rateLimitCheck.reason).toBe('fallback_eligible');
      expect(rateLimitCheck.warning).toContain(
        'rate limiting temporarily unavailable',
      );
    });

    it('should handle invalid user IDs', async () => {
      const invalidUserId = '';

      await expect(
        rateLimiter.checkUserLimit(invalidUserId, 'nps'),
      ).rejects.toThrow('Invalid user ID');
    });

    it('should handle invalid feedback types', async () => {
      const userId = 'valid-user';

      await expect(
        rateLimiter.checkUserLimit(userId, 'invalid-type' as any),
      ).rejects.toThrow('Invalid feedback type');
    });

    it('should handle timezone edge cases for monthly boundaries', async () => {
      const userId = 'timezone-edge-user';

      // Mock feedback sessions around month boundary in different timezones
      const mockSessions = [
        {
          ...createMockSession('nps', 5),
          startedAt: new Date('2025-01-31T23:30:00Z'), // UTC late on 31st
        },
        {
          ...createMockSession('feature', 3),
          startedAt: new Date('2025-02-01T01:30:00Z'), // UTC early on 1st
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: mockSessions,
              error: null,
            }),
          }),
        }),
      });

      const rateLimitCheck = await rateLimiter.checkUserLimit(userId, 'nps');

      // Should correctly handle timezone-aware monthly calculations
      expect(rateLimitCheck.timezoneHandling).toBe('utc_normalized');
      expect(rateLimitCheck.allowed).toBeDefined();
    });
  });

  // Helper functions for mocking
  function createMockSession(
    type: string,
    daysAgo: number,
  ): MockFeedbackSession {
    const startedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      id: `session-${type}-${daysAgo}`,
      userId: 'test-user',
      sessionType: type,
      startedAt,
      completedAt: new Date(startedAt.getTime() + 10 * 60 * 1000), // 10 minutes later
      status: 'completed',
      userType: 'supplier',
      engagementScore: 0.7,
    };
  }

  function mockRecentFeedbackHistory(
    userId: string,
    sessions: MockFeedbackSession[],
  ) {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: sessions.map((session) => ({
              id: session.id,
              user_id: session.userId,
              session_type: session.sessionType,
              started_at: session.startedAt.toISOString(),
              completed_at: session.completedAt?.toISOString(),
              status: session.status,
            })),
            error: null,
          }),
        }),
      }),
    });
  }

  function mockUserContext(context: MockUserContext) {
    const userContextQuery = (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: context.userId,
              user_type: context.userType,
              subscription_tier: context.tier,
              vendor_type: context.vendorType,
              created_at: new Date(
                Date.now() - context.accountAge * 24 * 60 * 60 * 1000,
              ).toISOString(),
              engagement_score: context.engagement,
              wedding_season_status: context.weddingSeasonStatus,
              recent_stress_indicators: context.recentStressIndicators,
            },
            error: null,
          }),
        }),
      }),
    });

    return userContextQuery;
  }

  function mockActiveClientCheck(userId: string, hasActiveClients: boolean) {
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: hasActiveClients ? [{ id: 'client-1' }] : [],
            error: null,
          }),
        }),
      }),
    });
  }
});

describe('Feedback Collector Integration with Rate Limiting', () => {
  let feedbackCollector: FeedbackCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    feedbackCollector = FeedbackCollector.getInstance();
  });

  it('should reject feedback session creation when rate limited', async () => {
    const userId = 'rate-limited-user';

    // Mock user context
    mockUserContext({
      userId,
      userType: 'supplier',
      tier: 'professional',
      accountAge: 90,
      engagement: 0.8,
    });

    // Mock rate limit exceeded
    mockRecentFeedbackHistory(userId, [
      createMockSession('nps', 20),
      createMockSession('feature', 10),
    ]);

    await expect(
      feedbackCollector.startFeedbackSession({
        userId,
        feedbackType: 'nps',
        triggerReason: 'test',
        context: {},
        userAgent: 'test',
      }),
    ).rejects.toThrow('monthly_limit_exceeded');
  });

  it('should create session when rate limit allows', async () => {
    const userId = 'eligible-user';

    mockUserContext({
      userId,
      userType: 'supplier',
      tier: 'professional',
      accountAge: 90,
      engagement: 0.8,
    });

    // Mock no recent feedback
    mockRecentFeedbackHistory(userId, []);
    mockActiveClientCheck(userId, true);

    // Mock session creation
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              user_type: 'supplier',
              subscription_tier: 'professional',
              created_at: new Date(
                Date.now() - 90 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              engagement_score: 0.8,
              vendor_type: 'photographer',
            },
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: 'new-session' }],
        error: null,
      }),
    });

    const session = await feedbackCollector.startFeedbackSession({
      userId,
      feedbackType: 'nps',
      triggerReason: 'eligible_test',
      context: {},
      userAgent: 'test',
    });

    expect(session.id).toBeDefined();
    expect(session.userId).toBe(userId);
    expect(session.type).toBe('nps');
  });

  // Helper functions (reused from above)
  function createMockSession(
    type: string,
    daysAgo: number,
  ): MockFeedbackSession {
    const startedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      id: `session-${type}-${daysAgo}`,
      userId: 'test-user',
      sessionType: type,
      startedAt,
      completedAt: new Date(startedAt.getTime() + 10 * 60 * 1000),
      status: 'completed',
      userType: 'supplier',
      engagementScore: 0.7,
    };
  }

  function mockRecentFeedbackHistory(
    userId: string,
    sessions: MockFeedbackSession[],
  ) {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: sessions.map((session) => ({
              id: session.id,
              user_id: session.userId,
              session_type: session.sessionType,
              started_at: session.startedAt.toISOString(),
              completed_at: session.completedAt?.toISOString(),
              status: session.status,
            })),
            error: null,
          }),
        }),
      }),
    });
  }

  function mockUserContext(context: MockUserContext) {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: context.userId,
              user_type: context.userType,
              subscription_tier: context.tier,
              vendor_type: context.vendorType,
              created_at: new Date(
                Date.now() - context.accountAge * 24 * 60 * 60 * 1000,
              ).toISOString(),
              engagement_score: context.engagement,
            },
            error: null,
          }),
        }),
      }),
      insert: jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'session-123' }], error: null }),
    });
  }

  function mockActiveClientCheck(userId: string, hasActiveClients: boolean) {
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: hasActiveClients ? [{ id: 'client-1' }] : [],
            error: null,
          }),
        }),
      }),
    });
  }
});
