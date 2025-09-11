/**
 * Unit Tests for Feedback Fatigue Prevention Service
 * WS-236 Team C Integration Testing
 * 
 * Tests wedding industry specific feedback rate limiting and fatigue prevention
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { FeedbackFatiguePreventionService } from '@/lib/rate-limiter';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  rpc: vi.fn(() => mockSupabase)
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

// Mock logger
vi.mock('@/lib/monitoring/structured-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

describe('FeedbackFatiguePreventionService', () => {
  let service: FeedbackFatiguePreventionService;
  const mockUserId = 'test-user-123';
  const mockWeddingId = 'wedding-456';
  const mockOrganizationId = 'org-789';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedbackFatiguePreventionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkFeedbackEligibility', () => {
    describe('Wedding Day Protection', () => {
      it('should block all feedback collection on wedding day', async () => {
        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps',
          { 
            isWeddingDay: true,
            weddingId: mockWeddingId
          }
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('Wedding day protection');
        expect(result.skipReasons).toContain('Wedding day - absolute no feedback collection');
        expect(result.weddingContextRules.weddingDayBlocked).toBe(true);
      });

      it('should block even critical feedback types on wedding day', async () => {
        const feedbackTypes = ['nps', 'csat', 'ces', 'feature', 'onboarding', 'churn', 'general'];
        
        for (const type of feedbackTypes) {
          const result = await service.checkFeedbackEligibility(
            mockUserId, 
            type as any,
            { isWeddingDay: true }
          );

          expect(result.eligible).toBe(false);
          expect(result.reason).toContain('Wedding day protection');
        }
      });
    });

    describe('Recent Wedding Protection (72 hours)', () => {
      it('should block feedback within 72 hours after wedding', async () => {
        const recentWeddingDate = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
        
        mockSupabase.single.mockResolvedValueOnce({
          data: { wedding_date: recentWeddingDate.toISOString() },
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps',
          { weddingId: mockWeddingId }
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('Recent wedding protection');
        expect(result.weddingContextRules.recentWeddingProtection).toBe(true);
        expect(result.nextEligibleAt).toBeDefined();
      });

      it('should allow feedback after 72 hours from wedding', async () => {
        const oldWeddingDate = new Date(Date.now() - (80 * 60 * 60 * 1000)); // 80 hours ago
        
        mockSupabase.single.mockResolvedValueOnce({
          data: { wedding_date: oldWeddingDate.toISOString() },
          error: null
        });

        // Mock database eligibility check to return eligible
        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps',
          { weddingId: mockWeddingId }
        );

        expect(result.weddingContextRules.recentWeddingProtection).toBe(false);
      });
    });

    describe('Wedding Season Protection', () => {
      it('should apply busy season protection during May-September', async () => {
        // Mock current date to be in May (month 4)
        const mayDate = new Date(2024, 4, 15); // May 15, 2024
        vi.spyOn(Date, 'now').mockReturnValue(mayDate.getTime());
        vi.spyOn(global, 'Date').mockImplementation((dateValue?: any) => {
          if (dateValue) return new Date(dateValue);
          return mayDate;
        });

        // Mock user profile as supplier
        mockSupabase.single.mockResolvedValueOnce({
          data: { 
            user_type: 'supplier',
            organization_id: mockOrganizationId,
            created_at: '2023-01-01'
          },
          error: null
        });

        // Mock database eligibility check
        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        // Mock upcoming weddings query
        mockSupabase.limit.mockResolvedValueOnce({
          data: [],
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps'
        );

        // Should still allow critical feedback types during busy season
        expect(result.eligible).toBe(true);
      });

      it('should block non-critical feedback during busy season', async () => {
        const julyDate = new Date(2024, 6, 15); // July 15, 2024
        vi.spyOn(Date, 'now').mockReturnValue(julyDate.getTime());
        vi.spyOn(global, 'Date').mockImplementation((dateValue?: any) => {
          if (dateValue) return new Date(dateValue);
          return julyDate;
        });

        mockSupabase.single.mockResolvedValueOnce({
          data: { 
            user_type: 'supplier',
            organization_id: mockOrganizationId,
            created_at: '2023-01-01'
          },
          error: null
        });

        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        mockSupabase.limit.mockResolvedValueOnce({
          data: [],
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps'
        );

        expect(result.skipReasons).toContain('Wedding busy season - reduced NPS collection');
      });
    });

    describe('Vendor Workload Protection', () => {
      it('should block feedback when vendor has 3+ weddings in next 14 days', async () => {
        mockSupabase.single.mockResolvedValueOnce({
          data: { 
            user_type: 'supplier',
            organization_id: mockOrganizationId,
            created_at: '2023-01-01'
          },
          error: null
        });

        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        // Mock 4 upcoming weddings
        const upcomingWeddings = Array.from({ length: 4 }, (_, i) => ({
          id: `wedding-${i}`,
          wedding_date: new Date(Date.now() + ((i + 1) * 24 * 60 * 60 * 1000)).toISOString()
        }));

        mockSupabase.limit.mockResolvedValueOnce({
          data: upcomingWeddings,
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps'
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('Vendor workload protection');
        expect(result.skipReasons).toContain('High vendor workload - 3+ weddings in next 14 days');
        expect(result.weddingContextRules.vendorWorkloadCheck).toBe(true);
      });

      it('should allow critical feedback even during high workload', async () => {
        mockSupabase.single.mockResolvedValueOnce({
          data: { 
            user_type: 'supplier',
            organization_id: mockOrganizationId,
            created_at: '2023-01-01'
          },
          error: null
        });

        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        // Mock 4 upcoming weddings (high workload)
        const upcomingWeddings = Array.from({ length: 4 }, (_, i) => ({
          id: `wedding-${i}`,
          wedding_date: new Date(Date.now() + ((i + 1) * 24 * 60 * 60 * 1000)).toISOString()
        }));

        mockSupabase.limit.mockResolvedValueOnce({
          data: upcomingWeddings,
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'churn' // Critical feedback type
        );

        expect(result.eligible).toBe(true);
        expect(result.weddingContextRules.vendorWorkloadCheck).toBe(true);
      });
    });

    describe('Couple Stress Protection', () => {
      it('should block non-essential feedback 30 days before wedding', async () => {
        const weddingDate = new Date(Date.now() + (20 * 24 * 60 * 60 * 1000)); // 20 days from now

        mockSupabase.single.mockResolvedValueOnce({
          data: { 
            user_type: 'couple',
            organization_id: null,
            created_at: '2023-01-01'
          },
          error: null
        });

        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        // Mock wedding query for couple stress protection
        mockSupabase.single.mockResolvedValueOnce({
          data: { wedding_date: weddingDate.toISOString() },
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps',
          { 
            weddingId: mockWeddingId
          }
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('Pre-wedding stress protection');
        expect(result.skipReasons).toContain('Pre-wedding stress period - 30 days before wedding');
        expect(result.weddingContextRules.coupleStressProtection).toBe(true);
      });

      it('should allow essential feedback during pre-wedding period', async () => {
        const weddingDate = new Date(Date.now() + (15 * 24 * 60 * 60 * 1000)); // 15 days from now

        mockSupabase.single.mockResolvedValueOnce({
          data: { 
            user_type: 'couple',
            organization_id: null,
            created_at: '2023-01-01'
          },
          error: null
        });

        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        mockSupabase.single.mockResolvedValueOnce({
          data: { wedding_date: weddingDate.toISOString() },
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'general', // Essential feedback type
          { weddingId: mockWeddingId }
        );

        expect(result.eligible).toBe(true);
        expect(result.weddingContextRules.coupleStressProtection).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should fail closed when database eligibility check fails', async () => {
        mockSupabase.rpc.mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed')
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps'
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('System error - eligibility check failed');
        expect(result.skipReasons).toContain('system_error');
      });

      it('should handle missing user profile gracefully', async () => {
        mockSupabase.rpc.mockResolvedValueOnce({
          data: { 
            is_eligible: true,
            block_reason: null,
            next_eligible_at: null,
            applied_rules: null
          },
          error: null
        });

        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: null
        });

        const result = await service.checkFeedbackEligibility(
          mockUserId, 
          'nps'
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('User profile not found');
        expect(result.skipReasons).toContain('no_profile');
      });
    });
  });

  describe('recordFeedbackAttempt', () => {
    it('should record successful feedback collection', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: {}, error: null });
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });

      await service.recordFeedbackAttempt(
        mockUserId,
        'nps',
        'collected',
        {
          sessionId: 'session-123',
          weddingContext: { weddingDayBlocked: false }
        }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          feedback_type: 'nps',
          attempt_status: 'collected',
          session_id: 'session-123'
        })
      );
    });

    it('should record blocked attempts with reasons', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: {}, error: null });
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });

      await service.recordFeedbackAttempt(
        mockUserId,
        'nps',
        'blocked',
        {
          blockReason: 'Wedding day protection',
          skipReasons: ['wedding_day', 'absolute_block'],
          weddingContext: { weddingDayBlocked: true }
        }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          feedback_type: 'nps',
          attempt_status: 'blocked',
          block_reason: 'Wedding day protection',
          skip_reasons: ['wedding_day', 'absolute_block']
        })
      );
    });
  });

  describe('getFeedbackFatigueAnalysis', () => {
    it('should return proper fatigue analysis', async () => {
      const mockAnalysis = {
        fatigue_level: 'medium',
        recommendations: ['Wait 24 hours before next NPS', 'Focus on feature feedback'],
        next_optimal_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        blocked_types: ['nps', 'csat'],
        stats: {
          total_requests: 10,
          completed_feedback: 7,
          blocked_attempts: 3,
          last_feedback_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
        }
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockAnalysis,
        error: null
      });

      const result = await service.getFeedbackFatigueAnalysis(mockUserId);

      expect(result.fatigueLevel).toBe('medium');
      expect(result.recommendations).toHaveLength(2);
      expect(result.blockedTypes).toContain('nps');
      expect(result.stats.totalRequests).toBe(10);
      expect(result.stats.lastFeedbackDate).toBeInstanceOf(Date);
    });

    it('should handle users with no feedback history', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await service.getFeedbackFatigueAnalysis(mockUserId);

      expect(result.fatigueLevel).toBe('low');
      expect(result.recommendations).toContain('No feedback history available');
      expect(result.stats.totalRequests).toBe(0);
    });
  });

  describe('adminOverrideFeedbackBlock', () => {
    it('should create admin override with proper logging', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: {}, error: null });

      await service.adminOverrideFeedbackBlock(
        'admin-123',
        mockUserId,
        'nps',
        'Emergency wedding day issue requires immediate feedback',
        48
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_user_id: 'admin-123',
          target_user_id: mockUserId,
          feedback_type: 'nps',
          reason: 'Emergency wedding day issue requires immediate feedback'
        })
      );
    });

    it('should handle database errors when creating override', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ 
        data: null, 
        error: new Error('Database insert failed') 
      });

      await expect(service.adminOverrideFeedbackBlock(
        'admin-123',
        mockUserId,
        'nps',
        'Test override'
      )).rejects.toThrow('Database insert failed');
    });
  });

  describe('Wedding Industry Context Integration', () => {
    it('should properly integrate all wedding context rules', async () => {
      const context = {
        weddingId: mockWeddingId,
        isWeddingDay: false,
        userTier: 'professional',
        daysSinceLastFeedback: 30
      };

      // Mock normal wedding (not recent, not upcoming)
      const normalWeddingDate = new Date(Date.now() - (100 * 24 * 60 * 60 * 1000)); // 100 days ago
      mockSupabase.single.mockResolvedValueOnce({
        data: { wedding_date: normalWeddingDate.toISOString() },
        error: null
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { 
          is_eligible: true,
          block_reason: null,
          next_eligible_at: null,
          applied_rules: {
            frequency_rule: 'normal',
            tier_limits: 'professional_limits'
          }
        },
        error: null
      });

      // Mock supplier with low workload
      mockSupabase.single.mockResolvedValueOnce({
        data: { 
          user_type: 'supplier',
          organization_id: mockOrganizationId,
          created_at: '2023-01-01'
        },
        error: null
      });

      mockSupabase.limit.mockResolvedValueOnce({
        data: [], // No upcoming weddings
        error: null
      });

      const result = await service.checkFeedbackEligibility(
        mockUserId, 
        'nps',
        context
      );

      expect(result.eligible).toBe(true);
      expect(result.weddingContextRules).toMatchObject({
        weddingDayBlocked: false,
        recentWeddingProtection: false,
        feedbackFrequencyRule: 'normal',
        tierBasedLimits: 'professional_limits',
        busySeasonProtection: expect.any(Boolean),
        vendorWorkloadCheck: false,
        coupleStressProtection: false
      });
    });
  });
});