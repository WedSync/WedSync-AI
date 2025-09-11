/**
 * Unit tests for Multi-Tier Rate Limiting Service
 * Tests the hierarchical rate limiting logic
 */

import { NextRequest } from 'next/server';
import { MultiTierRateLimitService } from '@/lib/rate-limiter';
import { SlidingWindowRateLimiter } from '@/lib/rate-limiter/sliding-window';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

// Mock dependencies
jest.mock('@/lib/rate-limiter/sliding-window');
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/lib/monitoring/metrics');

const mockLimiter = {
  checkLimit: jest.fn(),
  resetLimit: jest.fn(),
  setOverride: jest.fn()
};

(SlidingWindowRateLimiter as jest.MockedClass<typeof SlidingWindowRateLimiter>).mockImplementation(
  () => mockLimiter as any
);

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        or: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        gte: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        })),
        limit: jest.fn()
      })),
      or: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      insert: jest.fn()
    }))
  }))
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('MultiTierRateLimitService', () => {
  let service: MultiTierRateLimitService;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MultiTierRateLimitService();
    
    mockRequest = new NextRequest('https://example.com/api/test', {
      method: 'GET',
      headers: {
        'x-forwarded-for': '192.168.1.100',
        'user-agent': 'Test Agent',
        'authorization': 'Bearer test-token'
      }
    });
  });

  describe('checkRateLimit', () => {
    it('should check all applicable tiers for authenticated user', async () => {
      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                organization_id: 'org-456',
                tier: 'pro',
                organizations: {
                  id: 'org-456',
                  name: 'Test Org',
                  tier: 'pro',
                  member_count: 5
                }
              }
            })
          })
        })
      });

      // Mock rate limit results
      const ipResult = {
        allowed: true,
        limit: 1000,
        remaining: 500,
        resetTime: Date.now() + 3600000,
        tier: 'ip' as const,
        key: '192.168.1.100',
        windowMs: 3600000
      };

      const userResult = {
        allowed: false,
        limit: 500,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        retryAfter: 300,
        tier: 'user' as const,
        key: 'user-123',
        windowMs: 3600000
      };

      const orgResult = {
        allowed: true,
        limit: 2000,
        remaining: 1500,
        resetTime: Date.now() + 3600000,
        tier: 'organization' as const,
        key: 'org-456',
        windowMs: 3600000
      };

      const globalResult = {
        allowed: true,
        limit: 10000,
        remaining: 8000,
        resetTime: Date.now() + 3600000,
        tier: 'global' as const,
        key: 'global',
        windowMs: 3600000
      };

      mockLimiter.checkLimit
        .mockResolvedValueOnce(ipResult)    // IP check
        .mockResolvedValueOnce(userResult)  // User check
        .mockResolvedValueOnce(orgResult)   // Org check
        .mockResolvedValueOnce(globalResult); // Global check

      const result = await service.checkRateLimit(mockRequest);

      expect(result.allowed).toBe(false);
      expect(result.appliedTier).toBe('user'); // User tier blocks first
      expect(result.allTiers.user.allowed).toBe(false);
      expect(result.allTiers.ip.allowed).toBe(true);
      expect(result.allTiers.organization.allowed).toBe(true);
      expect(result.allTiers.global.allowed).toBe(true);
    });

    it('should handle unauthenticated requests with IP limiting only', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: 'Invalid token'
      });

      const ipResult = {
        allowed: true,
        limit: 1000,
        remaining: 800,
        resetTime: Date.now() + 3600000,
        tier: 'ip' as const,
        key: '192.168.1.100',
        windowMs: 3600000
      };

      const globalResult = {
        allowed: true,
        limit: 10000,
        remaining: 9000,
        resetTime: Date.now() + 3600000,
        tier: 'global' as const,
        key: 'global',
        windowMs: 3600000
      };

      mockLimiter.checkLimit
        .mockResolvedValueOnce(ipResult)
        .mockResolvedValueOnce(null) // No user
        .mockResolvedValueOnce(null) // No org
        .mockResolvedValueOnce(globalResult);

      const result = await service.checkRateLimit(mockRequest);

      expect(result.allowed).toBe(true);
      expect(result.appliedTier).toBe('ip');
      expect(result.allTiers.user.limit).toBe(0); // Skipped tier
      expect(result.allTiers.organization.limit).toBe(0); // Skipped tier
    });

    it('should handle bypass conditions', async () => {
      // Mock health check endpoint
      const healthRequest = new NextRequest('https://example.com/api/health', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });

      const result = await service.checkRateLimit(healthRequest);

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBe('health_check');
      expect(result.allTiers.ip.limit).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle IP whitelist bypass', async () => {
      process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.100,127.0.0.1';

      const result = await service.checkRateLimit(mockRequest);

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBe('whitelist');

      delete process.env.RATE_LIMIT_WHITELIST_IPS;
    });

    it('should handle admin override bypass', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                organization_id: 'org-456',
                tier: 'enterprise' // Enterprise user
              }
            })
          }),
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'override-123',
                    user_id: 'user-123',
                    active: true,
                    expires_at: new Date(Date.now() + 86400000).toISOString()
                  }
                })
              })
            })
          })
        })
      });

      const result = await service.checkRateLimit(mockRequest);

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBe('admin_override');
    });

    it('should handle errors gracefully and fail open', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'));

      // Mock fallback to IP limiting
      const fallbackResult = {
        allowed: true,
        limit: 1000,
        remaining: 500,
        resetTime: Date.now() + 3600000,
        tier: 'ip' as const,
        key: '192.168.1.100',
        windowMs: 3600000
      };

      mockLimiter.checkLimit.mockResolvedValue(fallbackResult);

      const result = await service.checkRateLimit(mockRequest);

      expect(result.allowed).toBe(true);
      expect(result.appliedTier).toBe('ip');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' }
      });

      mockLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        remaining: 500,
        resetTime: Date.now() + 3600000,
        tier: 'ip' as const,
        key: '203.0.113.1',
        windowMs: 3600000
      });

      await service.checkRateLimit(request);

      expect(mockLimiter.checkLimit).toHaveBeenCalledWith('203.0.113.1');
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: { 
          'cf-connecting-ip': '203.0.113.2',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      mockLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        remaining: 500,
        resetTime: Date.now() + 3600000,
        tier: 'ip' as const,
        key: '203.0.113.2',
        windowMs: 3600000
      });

      await service.checkRateLimit(request);

      expect(mockLimiter.checkLimit).toHaveBeenCalledWith('203.0.113.2');
    });

    it('should fallback to default IP when headers missing', async () => {
      const request = new NextRequest('https://example.com/api/test');

      mockLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        remaining: 500,
        resetTime: Date.now() + 3600000,
        tier: 'ip' as const,
        key: '127.0.0.1',
        windowMs: 3600000
      });

      await service.checkRateLimit(request);

      expect(mockLimiter.checkLimit).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('tier precedence', () => {
    it('should apply user tier when user limit exceeded', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', organization_id: 'org-456', tier: 'free' }
            })
          })
        })
      });

      const results = [
        { allowed: true, tier: 'ip' as const, limit: 1000, remaining: 500, resetTime: Date.now() + 3600000, key: 'ip', windowMs: 3600000 },
        { allowed: false, tier: 'user' as const, limit: 500, remaining: 0, resetTime: Date.now() + 3600000, key: 'user', windowMs: 3600000 },
        { allowed: true, tier: 'organization' as const, limit: 2000, remaining: 1500, resetTime: Date.now() + 3600000, key: 'org', windowMs: 3600000 },
        { allowed: true, tier: 'global' as const, limit: 10000, remaining: 8000, resetTime: Date.now() + 3600000, key: 'global', windowMs: 3600000 }
      ];

      mockLimiter.checkLimit
        .mockResolvedValueOnce(results[0])
        .mockResolvedValueOnce(results[1])
        .mockResolvedValueOnce(results[2])
        .mockResolvedValueOnce(results[3]);

      const result = await service.checkRateLimit(mockRequest);

      expect(result.appliedTier).toBe('user');
      expect(result.allowed).toBe(false);
    });

    it('should apply organization tier when user passes but org exceeds', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', organization_id: 'org-456', tier: 'free' }
            })
          })
        })
      });

      const results = [
        { allowed: true, tier: 'ip' as const, limit: 1000, remaining: 500, resetTime: Date.now() + 3600000, key: 'ip', windowMs: 3600000 },
        { allowed: true, tier: 'user' as const, limit: 500, remaining: 100, resetTime: Date.now() + 3600000, key: 'user', windowMs: 3600000 },
        { allowed: false, tier: 'organization' as const, limit: 2000, remaining: 0, resetTime: Date.now() + 3600000, key: 'org', windowMs: 3600000 },
        { allowed: true, tier: 'global' as const, limit: 10000, remaining: 8000, resetTime: Date.now() + 3600000, key: 'global', windowMs: 3600000 }
      ];

      mockLimiter.checkLimit
        .mockResolvedValueOnce(results[0])
        .mockResolvedValueOnce(results[1])
        .mockResolvedValueOnce(results[2])
        .mockResolvedValueOnce(results[3]);

      const result = await service.checkRateLimit(mockRequest);

      expect(result.appliedTier).toBe('organization');
      expect(result.allowed).toBe(false);
    });
  });

  describe('admin methods', () => {
    it('should reset rate limit for specific tier', async () => {
      mockLimiter.resetLimit.mockResolvedValue(undefined);
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await service.resetRateLimit('user', 'user-123', 'admin-456');

      expect(mockLimiter.resetLimit).toHaveBeenCalledWith('user-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('admin_actions');
    });

    it('should set rate limit override', async () => {
      mockLimiter.setOverride.mockResolvedValue(undefined);
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      const expiresAt = new Date(Date.now() + 86400000);
      await service.setOverride(
        'ip',
        '192.168.1.100',
        2000,
        3600000,
        'admin-456',
        'Increased limit for VIP user',
        expiresAt
      );

      expect(mockLimiter.setOverride).toHaveBeenCalledWith('192.168.1.100', 2000, 3600000);
      expect(mockSupabase.from).toHaveBeenCalledWith('rate_limit_overrides');
    });
  });

  describe('analytics recording', () => {
    it('should record metrics and analytics for blocked requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', organization_id: null, tier: 'free' }
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      const blockedResult = {
        allowed: false,
        tier: 'user' as const,
        limit: 500,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        key: 'user-123',
        windowMs: 3600000,
        retryAfter: 300
      };

      mockLimiter.checkLimit.mockResolvedValue(blockedResult);

      const result = await service.checkRateLimit(mockRequest);

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'rate_limit.multi_tier.requests',
        1,
        expect.objectContaining({
          applied_tier: 'user',
          allowed: 'false'
        })
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('rate_limit_events');
    });

    it('should record processing time histogram', async () => {
      mockLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        tier: 'ip' as const,
        limit: 1000,
        remaining: 500,
        resetTime: Date.now() + 3600000,
        key: '192.168.1.100',
        windowMs: 3600000
      });

      await service.checkRateLimit(mockRequest);

      expect(metrics.recordHistogram).toHaveBeenCalledWith(
        'rate_limit.multi_tier.processing_time',
        expect.any(Number),
        expect.objectContaining({
          applied_tier: 'ip'
        })
      );
    });
  });

  describe('maintenance mode', () => {
    it('should bypass rate limiting for enterprise users in maintenance mode', async () => {
      process.env.MAINTENANCE_MODE = 'true';

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', tier: 'enterprise' }
            })
          })
        })
      });

      const result = await service.checkRateLimit(mockRequest);

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBe('system_maintenance');

      delete process.env.MAINTENANCE_MODE;
    });
  });
});