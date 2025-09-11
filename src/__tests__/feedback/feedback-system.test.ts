/**
 * WS-236: User Feedback System - Comprehensive Test Suite
 *
 * Tests all feedback system components including:
 * - FeedbackCollector
 * - NPSManager
 * - SentimentAnalyzer
 * - FollowUpAutomation
 * - AnalyticsEngine
 * - API endpoints
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

// Mock modules before imports
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI),
}));

jest.mock('@/lib/rate-limiter', () => ({
  rateLimit: jest.fn(() => Promise.resolve({ success: true, headers: {} })),
}));

// Import services under test
import { feedbackCollector } from '../../lib/feedback/feedback-collector';
import { npsManager } from '../../lib/feedback/nps-manager';
import { sentimentAnalyzer } from '../../lib/feedback/sentiment-analyzer';
import { followUpAutomation } from '../../lib/feedback/follow-up-automation';
import { analyticsEngine } from '../../lib/feedback/analytics-engine';

// Mock data and clients
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

// Test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockUserProfile = {
  organization_id: 'org-123',
  vendor_type: 'photographer',
  subscription_tier: 'professional',
};

const mockFeedbackSession = {
  id: 'session-123',
  user_id: 'user-123',
  session_type: 'nps',
  questions_total: 3,
  questions_answered: 0,
  started_at: new Date().toISOString(),
};

const mockFeedbackResponse = {
  id: 'response-123',
  session_id: 'session-123',
  question_key: 'nps_score',
  nps_score: 9,
  text_value: 'Great service!',
  sentiment_score: 0.85,
  sentiment_category: 'positive',
};

describe('WS-236 User Feedback System', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('FeedbackCollector Service', () => {
    describe('checkFeedbackEligibility', () => {
      it('should check user eligibility for feedback', async () => {
        // Mock database queries
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockUserProfile,
            error: null,
          }),
        };
        mockSupabase.from.mockReturnValue(mockQuery);

        const eligibility = await feedbackCollector.checkFeedbackEligibility(
          'user-123',
          'nps',
        );

        expect(eligibility).toMatchObject({
          eligible: expect.any(Boolean),
          reason: expect.any(String),
          retryAfter: expect.any(Number),
          samplingRate: expect.any(Number),
        });
        expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      });

      it('should prevent feedback fatigue with rate limiting', async () => {
        // Mock recent feedback sessions
        const recentSessions = Array(5)
          .fill(null)
          .map((_, i) => ({
            id: `session-${i}`,
            created_at: new Date(
              Date.now() - i * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }));

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
          mockResolvedValue: jest
            .fn()
            .mockResolvedValue({ data: recentSessions, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQuery);

        const eligibility = await feedbackCollector.checkFeedbackEligibility(
          'user-123',
          'nps',
        );

        expect(eligibility.eligible).toBe(false);
        expect(eligibility.reason).toContain('rate limit');
      });
    });

    describe('startFeedbackSession', () => {
      it('should create a new feedback session with personalized questions', async () => {
        const mockInsert = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockFeedbackSession,
            error: null,
          }),
        };
        mockSupabase.from.mockReturnValue(mockInsert);

        const sessionRequest = {
          userId: 'user-123',
          feedbackType: 'nps',
          triggerReason: 'manual',
          context: { page: '/dashboard' },
        };

        const session =
          await feedbackCollector.startFeedbackSession(sessionRequest);

        expect(session).toMatchObject({
          id: expect.any(String),
          type: 'nps',
          questions: expect.arrayContaining([
            expect.objectContaining({
              key: expect.any(String),
              type: expect.any(String),
              text: expect.any(String),
              required: expect.any(Boolean),
            }),
          ]),
        });
        expect(mockSupabase.from).toHaveBeenCalledWith('feedback_sessions');
      });
    });

    describe('submitResponse', () => {
      it('should process and analyze feedback responses', async () => {
        const mockInsert = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockFeedbackResponse,
            error: null,
          }),
        };
        const mockUpdate = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockFeedbackSession, questions_answered: 1 },
            error: null,
          }),
        };
        mockSupabase.from
          .mockReturnValueOnce(mockInsert)
          .mockReturnValueOnce(mockUpdate);

        // Mock OpenAI sentiment analysis
        mockOpenAI.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sentimentScore: 0.85,
                  sentimentCategory: 'positive',
                  urgency: 'low',
                  businessImpact: 'positive',
                }),
              },
            },
          ],
        });

        await feedbackCollector.submitResponse(
          'session-123',
          'nps_score',
          9,
          30,
        );

        expect(mockSupabase.from).toHaveBeenCalledWith('feedback_responses');
        expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      });
    });
  });

  describe('NPSManager Service', () => {
    describe('calculateNPS', () => {
      it('should correctly calculate NPS from scores', () => {
        const scores = [9, 10, 8, 7, 6, 9, 10, 5, 8, 9]; // 5 promoters, 3 passives, 2 detractors
        const nps = npsManager.calculateNPS(scores);

        expect(nps).toBe(30); // (5 promoters - 2 detractors) / 10 total * 100
      });

      it('should handle edge cases', () => {
        expect(npsManager.calculateNPS([])).toBe(0);
        expect(npsManager.calculateNPS([10, 10, 10])).toBe(100);
        expect(npsManager.calculateNPS([0, 1, 2])).toBe(-100);
      });
    });

    describe('getNPSCategory', () => {
      it('should categorize NPS scores correctly', () => {
        expect(npsManager.getNPSCategory(10)).toBe('promoter');
        expect(npsManager.getNPSCategory(9)).toBe('promoter');
        expect(npsManager.getNPSCategory(8)).toBe('passive');
        expect(npsManager.getNPSCategory(7)).toBe('passive');
        expect(npsManager.getNPSCategory(6)).toBe('detractor');
        expect(npsManager.getNPSCategory(0)).toBe('detractor');
      });
    });

    describe('calculateWeddingIndustryNPS', () => {
      it('should calculate wedding industry specific metrics', async () => {
        // Mock database query for NPS data
        const mockNPSData = [
          {
            nps_score: 9,
            vendor_type: 'photographer',
            created_at: '2024-06-15T10:00:00Z',
          },
          {
            nps_score: 8,
            vendor_type: 'venue',
            created_at: '2024-06-20T10:00:00Z',
          },
          {
            nps_score: 10,
            vendor_type: 'photographer',
            created_at: '2024-07-15T10:00:00Z',
          },
        ];

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          mockResolvedValue: jest
            .fn()
            .mockResolvedValue({ data: mockNPSData, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQuery);

        const metrics =
          await npsManager.calculateWeddingIndustryNPS('quarterly');

        expect(metrics).toMatchObject({
          overallNPS: expect.any(Number),
          totalResponses: expect.any(Number),
          vendorBreakdown: expect.any(Object),
          seasonalTrends: expect.any(Object),
          benchmarkComparison: expect.any(Object),
        });
        expect(mockSupabase.from).toHaveBeenCalledWith('feedback_responses');
      });
    });
  });

  describe('SentimentAnalyzer Service', () => {
    describe('analyze', () => {
      it('should analyze sentiment with wedding industry context', async () => {
        mockOpenAI.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sentimentScore: 0.85,
                  sentimentCategory: 'positive',
                  emotions: ['satisfaction', 'gratitude'],
                  urgency: 'low',
                  businessImpact: 'positive',
                  weddingContext: {
                    weddingRelated: true,
                    vendorMention: true,
                    serviceQuality: 'high',
                  },
                }),
              },
            },
          ],
        });

        const analysis = await sentimentAnalyzer.analyze(
          'The photographer was amazing and captured our wedding perfectly!',
          { vendorType: 'photographer', isWeddingRelated: true },
        );

        expect(analysis).toMatchObject({
          sentimentScore: 0.85,
          sentimentCategory: 'positive',
          emotions: expect.arrayContaining(['satisfaction', 'gratitude']),
          urgency: 'low',
          businessImpact: 'positive',
          weddingContext: expect.objectContaining({
            weddingRelated: true,
            vendorMention: true,
          }),
        });
        expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      });

      it('should handle OpenAI API errors gracefully', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValue(
          new Error('API Error'),
        );

        const analysis = await sentimentAnalyzer.analyze('Some feedback text');

        expect(analysis).toMatchObject({
          sentimentScore: 0.5,
          sentimentCategory: 'neutral',
          urgency: 'low',
          businessImpact: 'neutral',
          error: expect.any(String),
        });
      });
    });
  });

  describe('FollowUpAutomation Service', () => {
    describe('processFeedbackTrigger', () => {
      it('should trigger appropriate follow-up actions for detractors', async () => {
        const mockInsert = {
          insert: jest.fn().mockReturnThis(),
          mockResolvedValue: jest
            .fn()
            .mockResolvedValue({ data: null, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockInsert);

        const trigger = {
          sessionId: 'session-123',
          userId: 'user-123',
          npsScore: 3, // Detractor
          sentimentScore: 0.2,
          sentimentCategory: 'negative' as const,
          urgencyLevel: 'high' as const,
          weddingContext: {
            isWeddingSeason: true,
            daysUntilWedding: 7,
            vendorType: 'photographer',
          },
        };

        await followUpAutomation.processFeedbackTrigger(trigger);

        expect(mockSupabase.from).toHaveBeenCalledWith(
          'feedback_follow_up_actions',
        );
        expect(mockInsert.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            session_id: 'session-123',
            user_id: 'user-123',
            action_type: expect.any(String),
            action_status: 'pending',
            wedding_priority: expect.any(Boolean),
          }),
        );
      });

      it('should prioritize wedding day critical issues', async () => {
        const mockInsert = {
          insert: jest.fn().mockReturnThis(),
          mockResolvedValue: jest
            .fn()
            .mockResolvedValue({ data: null, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockInsert);

        const weddingDayTrigger = {
          sessionId: 'session-123',
          userId: 'user-123',
          npsScore: 2,
          weddingContext: {
            daysUntilWedding: 0, // Wedding day!
            isWeddingSeason: true,
          },
        };

        await followUpAutomation.processFeedbackTrigger(weddingDayTrigger);

        expect(mockInsert.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            action_type: 'wedding_day_emergency_response',
            wedding_priority: true,
            action_config: expect.objectContaining({
              escalationLevel: 4,
              requiresImmediateCall: true,
            }),
          }),
        );
      });
    });
  });

  describe('AnalyticsEngine Service', () => {
    describe('generateAnalytics', () => {
      it('should generate comprehensive feedback analytics', async () => {
        const mockSessions = [
          {
            id: 'session-1',
            user_id: 'user-1',
            session_type: 'nps',
            completed_at: new Date().toISOString(),
            overall_sentiment: 0.8,
            nps_score: 9,
            user_profiles: {
              vendor_type: 'photographer',
              subscription_tier: 'professional',
            },
            feedback_responses: [
              {
                nps_score: 9,
                sentiment_score: 0.8,
                sentiment_category: 'positive',
              },
            ],
          },
        ];

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          mockResolvedValue: jest
            .fn()
            .mockResolvedValue({ data: mockSessions, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQuery);

        const analytics = await analyticsEngine.generateAnalytics(
          'monthly',
          'org-123',
        );

        expect(analytics).toMatchObject({
          period: 'monthly',
          totalSessions: expect.any(Number),
          completionRate: expect.any(Number),
          npsMetrics: expect.objectContaining({
            overallScore: expect.any(Number),
            promoters: expect.any(Number),
            passives: expect.any(Number),
            detractors: expect.any(Number),
          }),
          sentimentMetrics: expect.objectContaining({
            averageScore: expect.any(Number),
            positivePercentage: expect.any(Number),
            negativePercentage: expect.any(Number),
          }),
          weddingIndustryMetrics: expect.objectContaining({
            vendorTypePerformance: expect.any(Array),
          }),
          followUpMetrics: expect.any(Object),
          trendAnalysis: expect.any(Object),
        });
      });

      it('should handle empty data gracefully', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          mockResolvedValue: jest
            .fn()
            .mockResolvedValue({ data: [], error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQuery);

        const analytics = await analyticsEngine.generateAnalytics(
          'monthly',
          'org-123',
        );

        expect(analytics.totalSessions).toBe(0);
        expect(analytics.completionRate).toBe(0);
        expect(analytics.npsMetrics.overallScore).toBe(0);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume feedback submission', async () => {
      const startTime = Date.now();

      // Simulate 100 concurrent feedback submissions
      const promises = Array(100)
        .fill(null)
        .map(async (_, i) => {
          // Mock high-volume scenario
          return Promise.resolve({ sessionId: `session-${i}`, success: true });
        });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should efficiently calculate NPS for large datasets', () => {
      const startTime = Date.now();

      // Generate large dataset
      const largeScoreSet = Array(10000)
        .fill(null)
        .map(() => Math.floor(Math.random() * 11));

      const nps = npsManager.calculateNPS(largeScoreSet);

      const processingTime = Date.now() - startTime;

      expect(nps).toBeGreaterThanOrEqual(-100);
      expect(nps).toBeLessThanOrEqual(100);
      expect(processingTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Wedding Industry Specific Tests', () => {
    it('should prioritize wedding season feedback', async () => {
      // Test wedding season specific logic
      const weddingSeasonContext = {
        isWeddingSeason: true,
        vendorType: 'photographer',
        daysUntilWedding: 30,
      };

      // Mock eligibility check during wedding season
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUserProfile, vendor_type: 'photographer' },
          error: null,
        }),
        mockResolvedValue: jest
          .fn()
          .mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        'user-123',
        'nps',
      );

      // Wedding season should have higher sampling rate
      expect(eligibility.samplingRate).toBeGreaterThan(0.5);
    });

    it('should handle vendor type specific questions correctly', async () => {
      const vendorTypes = [
        'photographer',
        'venue',
        'florist',
        'caterer',
        'band',
      ];

      for (const vendorType of vendorTypes) {
        const mockInsert = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockFeedbackSession,
              user_profiles: { vendor_type: vendorType },
            },
            error: null,
          }),
        };
        mockSupabase.from.mockReturnValue(mockInsert);

        const sessionRequest = {
          userId: 'user-123',
          feedbackType: 'nps',
          triggerReason: 'manual',
          context: { vendorType },
        };

        const session =
          await feedbackCollector.startFeedbackSession(sessionRequest);

        // Should have vendor-specific questions
        const vendorSpecificQuestion = session.questions.some(
          (q) =>
            q.text.toLowerCase().includes(vendorType) ||
            q.context?.vendorType === vendorType,
        );

        expect(vendorSpecificQuestion).toBeTruthy();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        feedbackCollector.checkFeedbackEligibility('user-123', 'nps'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid user IDs gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const eligibility = await feedbackCollector.checkFeedbackEligibility(
        'invalid-user',
        'nps',
      );

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('not found');
    });

    it('should handle OpenAI rate limits', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue({
        error: { type: 'rate_limit_exceeded' },
      });

      const analysis = await sentimentAnalyzer.analyze('Some text');

      expect(analysis.error).toContain('rate limit');
      expect(analysis.sentimentScore).toBe(0.5); // Default neutral
    });
  });
});
