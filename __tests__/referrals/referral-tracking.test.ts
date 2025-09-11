/**
 * WS-344 Supplier Referral Gamification System - Unit Tests
 * Comprehensive test suite for ReferralTrackingService
 * Target: >90% code coverage with fraud prevention focus
 */

import { ReferralTrackingService } from '@/services/ReferralTrackingService';
import { createMockSupplier, createMockReferral, createReferralChain } from '@/test-utils/factories';
import { SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
} as unknown as jest.Mocked<SupabaseClient>;

// Mock modules
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

describe('ReferralTrackingService', () => {
  let service: ReferralTrackingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferralTrackingService();
    
    // Default mock implementations
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    } as any);
  });

  describe('generateReferralCode', () => {
    it('should generate unique 8-character alphanumeric codes', async () => {
      // Mock database check to return false (code doesn't exist)
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const codes = await Promise.all([
        service.generateReferralCode('supplier-1'),
        service.generateReferralCode('supplier-2'),
        service.generateReferralCode('supplier-3'),
      ]);

      // Verify uniqueness
      expect(new Set(codes)).toHaveSize(3);

      // Verify format
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
        expect(code).toHaveLength(8);
        // Ensure no confusing characters (0, O, I, 1)
        expect(code).not.toMatch(/[0OI1]/);
      });
    });

    it('should handle collision gracefully with retry mechanism', async () => {
      let callCount = 0;
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First attempt - collision
            return Promise.resolve({ data: { code: 'EXISTING1' }, error: null });
          } else {
            // Second attempt - success
            return Promise.resolve({ data: null, error: null });
          }
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const code = await service.generateReferralCode('supplier-1');
      
      expect(mockQuery.single).toHaveBeenCalledTimes(2);
      expect(code).toBeDefined();
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should throw error after maximum collision retries', async () => {
      // Mock persistent collisions
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { code: 'EXISTS123' }, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        service.generateReferralCode('supplier-1')
      ).rejects.toThrow('Unable to generate unique referral code after 10 attempts');
    });

    it('should exclude confusing characters from generated codes', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Generate multiple codes and verify none contain confusing characters
      const codes = await Promise.all(
        Array.from({ length: 20 }, () => service.generateReferralCode('test-supplier'))
      );

      codes.forEach(code => {
        expect(code).not.toMatch(/[0OI1]/); // No confusing characters
        expect(code).toMatch(/^[A-Z2-9]{8}$/); // Only clear characters
      });
    });
  });

  describe('createReferralLink', () => {
    it('should create referral link with all required components', async () => {
      const mockSupplier = createMockSupplier();
      const mockCode = 'ABCD2345';
      
      // Mock code generation
      jest.spyOn(service, 'generateReferralCode').mockResolvedValue(mockCode);
      
      // Mock database insert
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: 'ref-123',
            code: mockCode,
            custom_message: 'Join me on WedSync!',
            created_at: new Date().toISOString()
          }, 
          error: null 
        }),
      };
      mockSupabase.from.mockReturnValue(mockInsert as any);

      const result = await service.createReferralLink(mockSupplier.id, {
        customMessage: 'Join me on WedSync!',
        source: 'dashboard'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        referralCode: mockCode,
        customLink: `https://wedsync.com/join/${mockCode}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://wedsync.com/join/${mockCode}`,
        shareText: 'Join me on WedSync! Join me on WedSync! Use my referral code to get started: https://wedsync.com/join/ABCD2345',
        socialLinks: {
          whatsapp: `https://wa.me/?text=${encodeURIComponent('Join me on WedSync! Join me on WedSync! Use my referral code: https://wedsync.com/join/ABCD2345')}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://wedsync.com/join/ABCD2345')}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent('https://wedsync.com/join/ABCD2345')}&text=${encodeURIComponent('Join me on WedSync!')}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://wedsync.com/join/ABCD2345')}`
        }
      });

      expect(mockInsert.insert).toHaveBeenCalledWith({
        referrer_id: mockSupplier.id,
        code: mockCode,
        custom_message: 'Join me on WedSync!',
        source: 'dashboard',
        status: 'active',
        metadata: {
          ip: expect.any(String),
          user_agent: expect.any(String),
        }
      });
    });

    it('should apply rate limiting for referral link creation', async () => {
      const mockSupplier = createMockSupplier();
      
      // Mock Redis rate limiting
      const { redis } = require('@/lib/redis');
      redis.get.mockResolvedValue('5'); // Already at limit
      
      await expect(
        service.createReferralLink(mockSupplier.id, {})
      ).rejects.toThrow('Rate limit exceeded. Maximum 5 referral links per hour.');

      expect(redis.get).toHaveBeenCalledWith(`rate_limit:referral_create:${mockSupplier.id}`);
    });

    it('should sanitize custom messages to prevent XSS', async () => {
      const mockSupplier = createMockSupplier();
      const maliciousMessage = '<script>alert("XSS")</script>Join me!';
      
      jest.spyOn(service, 'generateReferralCode').mockResolvedValue('ABCD2345');
      
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: 'ref-123',
            code: 'ABCD2345',
            custom_message: 'Join me!', // Sanitized
            created_at: new Date().toISOString()
          }, 
          error: null 
        }),
      };
      mockSupabase.from.mockReturnValue(mockInsert as any);

      await service.createReferralLink(mockSupplier.id, {
        customMessage: maliciousMessage
      });

      expect(mockInsert.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_message: 'Join me!' // XSS content should be stripped
        })
      );
    });
  });

  describe('trackConversion', () => {
    it('should prevent self-referral fraud', async () => {
      const mockReferral = createMockReferral({ referrerId: 'supplier-123' });
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion(mockReferral.code, 'signup_started', 'supplier-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Self-referral not allowed');
      expect(result.code).toBe('SELF_REFERRAL_BLOCKED');
    });

    it('should process valid conversions with reward calculation', async () => {
      const mockReferral = createMockReferral({ 
        referrerId: 'supplier-123',
        status: 'active'
      });
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        }),
      };
      
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockReferral, status: 'converted' },
          error: null
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockSupabase.from.mockReturnValueOnce(mockUpdate as any); // For update call

      const result = await service.trackConversion(mockReferral.code, 'first_payment', 'supplier-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        conversionStage: 'first_payment',
        rewardEarned: true,
        rewardAmount: 39, // £39 for Professional tier conversion (1 month free)
        referralId: mockReferral.id,
        previousStage: 'active'
      });

      expect(mockUpdate.update).toHaveBeenCalledWith({
        status: 'converted',
        conversion_stage: 'first_payment',
        converted_at: expect.any(String),
        referred_id: 'supplier-456',
        reward_earned: 39
      });
    });

    it('should handle conversion pipeline stages correctly', async () => {
      const mockReferral = createMockReferral({ status: 'active' });
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        }),
      };
      
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockReferral, status: 'signup_completed' },
          error: null
        }),
      };
      
      mockSupabase.from
        .mockReturnValueOnce(mockQuery as any)  // For select
        .mockReturnValueOnce(mockUpdate as any); // For update

      // Test progression through conversion funnel
      const stages = ['link_clicked', 'signup_started', 'signup_completed', 'trial_started', 'first_payment'];
      
      for (const stage of stages) {
        const result = await service.trackConversion(mockReferral.code, stage, 'supplier-456');
        expect(result.success).toBe(true);
        
        // Only first_payment should earn reward
        if (stage === 'first_payment') {
          expect(result.data?.rewardEarned).toBe(true);
        } else {
          expect(result.data?.rewardEarned).toBe(false);
        }
      }
    });

    it('should prevent duplicate conversions', async () => {
      const mockReferral = createMockReferral({ 
        status: 'converted',
        conversionStage: 'first_payment'
      });
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion(mockReferral.code, 'first_payment', 'supplier-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Referral already converted');
      expect(result.code).toBe('ALREADY_CONVERTED');
    });

    it('should handle expired referrals', async () => {
      const expiredReferral = createMockReferral({ 
        createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000) // 32 days ago
      });
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: expiredReferral,
          error: null
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion(expiredReferral.code, 'signup_started', 'supplier-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Referral link has expired');
      expect(result.code).toBe('REFERRAL_EXPIRED');
    });

    it('should detect and prevent IP-based fraud', async () => {
      const mockReferral = createMockReferral({ referrerId: 'supplier-123' });
      
      // Mock Redis to show existing IP usage
      const { redis } = require('@/lib/redis');
      redis.get.mockResolvedValue('2'); // Already 2 referrals from this IP
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion(mockReferral.code, 'signup_started', 'supplier-456', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many referrals from this IP address');
      expect(result.code).toBe('IP_FRAUD_DETECTED');
    });
  });

  describe('calculateLeaderboards', () => {
    it('should rank suppliers by paid conversions only', async () => {
      const mockLeaderboardData = [
        { 
          supplier_id: 'sup-1', 
          supplier_name: 'Alice Photography',
          total_referrals: 15, 
          paid_conversions: 10,
          conversion_rate: 66.67,
          total_earned: 390 
        },
        { 
          supplier_id: 'sup-2', 
          supplier_name: 'Bob Catering',
          total_referrals: 20, 
          paid_conversions: 8,
          conversion_rate: 40.00,
          total_earned: 312 
        },
        { 
          supplier_id: 'sup-3', 
          supplier_name: 'Carol Florals',
          total_referrals: 12, 
          paid_conversions: 12,
          conversion_rate: 100.00,
          total_earned: 468 
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ 
          data: mockLeaderboardData.sort((a, b) => b.paid_conversions - a.paid_conversions), 
          error: null 
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.calculateLeaderboards({ limit: 50 });

      expect(result.success).toBe(true);
      expect(result.data.entries).toHaveLength(3);
      
      // Should be ordered by paid conversions (highest first)
      expect(result.data.entries[0].supplier_id).toBe('sup-3'); // 12 conversions
      expect(result.data.entries[1].supplier_id).toBe('sup-1'); // 10 conversions
      expect(result.data.entries[2].supplier_id).toBe('sup-2'); // 8 conversions

      // Verify structure
      expect(result.data.entries[0]).toEqual({
        rank: 1,
        supplier_id: 'sup-3',
        supplier_name: 'Carol Florals',
        total_referrals: 12,
        paid_conversions: 12,
        conversion_rate: 100.00,
        total_earned: 468,
        trend: 'stable' // Default trend
      });
    });

    it('should support category-based filtering', async () => {
      const mockCategoryData = [
        { 
          supplier_id: 'photo-1', 
          supplier_name: 'Pro Photography',
          category: 'photography',
          paid_conversions: 15 
        },
        { 
          supplier_id: 'photo-2', 
          supplier_name: 'Elite Photos',
          category: 'photography',
          paid_conversions: 12 
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ 
          data: mockCategoryData, 
          error: null 
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.calculateLeaderboards({ 
        category: 'photography',
        limit: 50 
      });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'photography');
      expect(result.data.entries).toHaveLength(2);
    });

    it('should support geographic filtering', async () => {
      const mockGeoData = [
        { 
          supplier_id: 'london-1', 
          supplier_name: 'London Wedding Co',
          location: 'London, UK',
          paid_conversions: 8 
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ 
          data: mockGeoData, 
          error: null 
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.calculateLeaderboards({ 
        location: 'London',
        limit: 50 
      });

      expect(result.success).toBe(true);
      expect(mockQuery.ilike).toHaveBeenCalledWith('location', '%London%');
    });

    it('should calculate trends from historical data', async () => {
      // Mock current leaderboard
      const currentData = [{ supplier_id: 'sup-1', paid_conversions: 10 }];
      
      // Mock historical data (7 days ago)
      const historicalData = [{ supplier_id: 'sup-1', paid_conversions: 8 }];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn()
          .mockResolvedValueOnce({ data: currentData, error: null })    // Current
          .mockResolvedValueOnce({ data: historicalData, error: null }) // Historical
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.calculateLeaderboards({ limit: 50, includeTrends: true });

      expect(result.data.entries[0].trend).toBe('up'); // 8 -> 10 conversions
      expect(result.data.entries[0].trendPercentage).toBe(25); // 25% increase
    });

    it('should handle empty leaderboard gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ 
          data: [], 
          error: null 
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.calculateLeaderboards({ limit: 50 });

      expect(result.success).toBe(true);
      expect(result.data.entries).toHaveLength(0);
      expect(result.data.totalSuppliers).toBe(0);
    });
  });

  describe('getSupplierStats', () => {
    it('should calculate comprehensive supplier statistics', async () => {
      const supplierId = 'supplier-123';
      const mockStats = {
        total_referrals_sent: 25,
        pending_referrals: 8,
        converted_referrals: 12,
        expired_referrals: 5,
        total_earned: 468,
        this_month_referrals: 6,
        this_month_conversions: 3,
        conversion_rate: 48.0,
        rank: 15,
        tier: 'professional'
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockStats,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.getSupplierStats(supplierId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalReferralsSent: 25,
        pendingReferrals: 8,
        convertedReferrals: 12,
        expiredReferrals: 5,
        conversionRate: 48.0,
        totalEarned: 468,
        thisMonthReferrals: 6,
        thisMonthConversions: 3,
        currentRank: 15,
        tier: 'professional',
        nextMilestone: {
          conversions: 15, // Next milestone at 15 conversions
          reward: 'Bronze referral badge',
          progress: 0.8 // 12/15 = 80%
        },
        recentActivity: expect.any(Array)
      });
    });

    it('should calculate next milestone correctly', async () => {
      const supplierId = 'supplier-high-performer';
      const mockStats = {
        converted_referrals: 23,
        // ... other stats
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockStats,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.getSupplierStats(supplierId);
      const nextMilestone = result.data?.nextMilestone;

      expect(nextMilestone?.conversions).toBe(25); // Next milestone
      expect(nextMilestone?.reward).toBe('Silver referral badge');
      expect(nextMilestone?.progress).toBe(0.92); // 23/25 = 92%
    });
  });

  describe('fraud detection', () => {
    it('should detect suspicious patterns in referral behavior', async () => {
      const supplierId = 'suspicious-supplier';
      
      // Mock suspicious activity data
      const mockSuspiciousData = {
        rapid_referrals: 15, // 15 referrals in last hour
        same_ip_referrals: 8, // 8 referrals from same IP
        similar_emails: 5, // 5 referrals with similar email patterns
        conversion_rate: 95, // Unrealistically high conversion rate
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSuspiciousData,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.detectFraudulentActivity(supplierId);

      expect(result.isSuspicious).toBe(true);
      expect(result.riskScore).toBeGreaterThan(70); // High risk score
      expect(result.flags).toContain('RAPID_REFERRALS');
      expect(result.flags).toContain('SAME_IP_ABUSE');
      expect(result.flags).toContain('EMAIL_PATTERN_FRAUD');
      expect(result.flags).toContain('UNREALISTIC_CONVERSION_RATE');

      expect(result.recommendations).toEqual([
        'Temporarily restrict referral link creation',
        'Manual review of recent conversions required',
        'Implement additional identity verification',
        'Monitor for coordinated fraud attempts'
      ]);
    });

    it('should clear suppliers with normal behavior patterns', async () => {
      const supplierId = 'normal-supplier';
      
      const mockNormalData = {
        rapid_referrals: 2,
        same_ip_referrals: 1,
        similar_emails: 0,
        conversion_rate: 35, // Normal conversion rate
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockNormalData,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.detectFraudulentActivity(supplierId);

      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBeLessThan(30); // Low risk score
      expect(result.flags).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion('TESTCODE', 'signup_started', 'supplier-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
      expect(result.code).toBe('DATABASE_ERROR');
    });

    it('should handle invalid referral codes', async () => {
      const result = await service.trackConversion('INVALID', 'signup_started', 'supplier-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid referral code format');
      expect(result.code).toBe('INVALID_CODE_FORMAT');
    });

    it('should handle network timeouts', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Request timeout'))
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion('TESTCODE', 'signup_started', 'supplier-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
      expect(result.code).toBe('NETWORK_ERROR');
    });
  });

  describe('performance optimization', () => {
    it('should complete referral code generation within 100ms', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      await service.generateReferralCode('test-supplier');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent referral tracking efficiently', async () => {
      const mockReferrals = Array.from({ length: 10 }, (_, i) => 
        createMockReferral({ code: `CODE${i}`, referrerId: `supplier-${i}` })
      );

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation((_, code) => {
          const referral = mockReferrals.find(r => r.code === code);
          return Promise.resolve({ data: referral, error: null });
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      const promises = mockReferrals.map(referral =>
        service.trackConversion(referral.code, 'signup_started', 'different-supplier')
      );
      
      await Promise.all(promises);
      const duration = performance.now() - start;

      // Should handle 10 concurrent operations within 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});