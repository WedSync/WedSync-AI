// __tests__/api/usage-monitoring/enhanced-rate-limiter.test.ts
// WS-233: Enhanced Rate Limiter Tests
// Team B - Comprehensive test suite for tier-based rate limiting

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedRateLimiter, TierBasedRateLimitConfig } from '@/lib/middleware/enhanced-rate-limiter';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(),
  auth: { getUser: jest.fn() }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock Redis
const mockRedis = {
  connect: jest.fn(),
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  pipeline: jest.fn(() => ({
    incr: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn()
  })),
  ping: jest.fn()
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis)
}));

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.REDIS_URL = 'redis://localhost:6379';

describe('EnhancedRateLimiter', () => {
  let rateLimiter: EnhancedRateLimiter;
  let mockConfig: TierBasedRateLimitConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    rateLimiter = new EnhancedRateLimiter();
    
    mockConfig = {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL',
      endpoint: '/api/forms/create',
      userId: 'user-123e4567-e89b-12d3-a456-426614174000',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (compatible; WedSync/1.0)'
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkRateLimit', () => {
    test('should allow request for PROFESSIONAL tier within limits', async () => {
      // Mock tier limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'PROFESSIONAL',
                daily_quota: 10000,
                monthly_quota: 250000,
                rate_limit_per_minute: 50,
                burst_limit: 20
              },
              error: null
            })
          })
        })
      });

      // Mock usage data - within limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(100), // 100 requests today
              error: null
            })
          })
        })
      });

      // Mock minute usage - Redis returns low count
      mockRedis.get.mockResolvedValueOnce('5');

      const result = await rateLimiter.checkRateLimit(mockConfig);

      expect(result.allowed).toBe(true);
      expect(result.quotaInfo.dailyUsed).toBe(101); // 100 + current request
      expect(result.quotaInfo.dailyLimit).toBe(10000);
      expect(result.rateLimitInfo.requestsThisMinute).toBe(6); // 5 + current request
      expect(result.rateLimitInfo.minuteLimit).toBe(50);
    });

    test('should deny request when daily quota exceeded', async () => {
      // Mock tier limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'FREE',
                daily_quota: 100,
                monthly_quota: 2000,
                rate_limit_per_minute: 5,
                burst_limit: 5
              },
              error: null
            })
          })
        })
      });

      // Mock usage data - quota exceeded
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(100), // Already at limit
              error: null
            })
          })
        })
      });

      // Mock insert for violation logging
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await rateLimiter.checkRateLimit({
        ...mockConfig,
        subscriptionTier: 'FREE'
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('DAILY_QUOTA_EXCEEDED');
      expect(result.quotaInfo.dailyUsed).toBe(100);
      expect(result.quotaInfo.dailyRemaining).toBe(0);
      expect(result.upgradeMessage).toContain('Upgrade to STARTER');
    });

    test('should deny request when rate limit exceeded', async () => {
      // Mock tier limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'STARTER',
                daily_quota: 1000,
                monthly_quota: 25000,
                rate_limit_per_minute: 20,
                burst_limit: 10
              },
              error: null
            })
          })
        })
      });

      // Mock usage data - within daily limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(50), // Well within daily limit
              error: null
            })
          })
        })
      });

      // Mock minute usage - at rate limit
      mockRedis.get.mockResolvedValueOnce('20');

      // Mock violation logging
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await rateLimiter.checkRateLimit({
        ...mockConfig,
        subscriptionTier: 'STARTER'
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.rateLimitInfo.requestsThisMinute).toBe(20);
      expect(result.rateLimitInfo.minuteRemaining).toBe(0);
      expect(result.retryAfter).toBe(60); // 1 minute
    });

    test('should deny request when burst limit exceeded', async () => {
      // Mock tier limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'PROFESSIONAL',
                daily_quota: 10000,
                monthly_quota: 250000,
                rate_limit_per_minute: 50,
                burst_limit: 20
              },
              error: null
            })
          })
        })
      });

      // Mock daily usage - within limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(100),
              error: null
            })
          })
        })
      });

      // Mock minute usage - within limits
      mockRedis.get.mockResolvedValueOnce('10');

      // Mock burst usage - exceeded
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: new Array(20), // At burst limit
                error: null
              })
            })
          })
        })
      });

      // Mock violation logging
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await rateLimiter.checkRateLimit(mockConfig);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BURST_LIMIT_EXCEEDED');
    });

    test('should handle ENTERPRISE unlimited tier correctly', async () => {
      // Mock tier limits - unlimited enterprise
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'ENTERPRISE',
                daily_quota: -1, // Unlimited
                monthly_quota: -1, // Unlimited
                rate_limit_per_minute: -1, // Unlimited
                burst_limit: 100
              },
              error: null
            })
          })
        })
      });

      // Mock high usage that would normally exceed limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(50000), // Very high usage
              error: null
            })
          })
        })
      });

      mockRedis.get.mockResolvedValueOnce('200'); // High rate

      const result = await rateLimiter.checkRateLimit({
        ...mockConfig,
        subscriptionTier: 'ENTERPRISE'
      });

      expect(result.allowed).toBe(true);
      expect(result.quotaInfo.dailyLimit).toBe(-1);
      expect(result.rateLimitInfo.minuteLimit).toBe(-1);
      expect(result.quotaInfo.utilization).toBe(0); // Should be 0 for unlimited
    });

    test('should fallback gracefully when Redis unavailable', async () => {
      // Mock tier limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'PROFESSIONAL',
                daily_quota: 10000,
                rate_limit_per_minute: 50,
                burst_limit: 20
              },
              error: null
            })
          })
        })
      });

      // Mock Redis failure
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection failed'));

      // Mock database fallback
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(100),
              error: null
            })
          })
        })
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { request_count: 5 },
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await rateLimiter.checkRateLimit(mockConfig);

      expect(result.allowed).toBe(true);
      expect(result.rateLimitInfo.requestsThisMinute).toBe(6);
    });

    test('should fail open on database errors', async () => {
      // Mock tier limits failure
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const result = await rateLimiter.checkRateLimit(mockConfig);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('RATE_LIMITER_ERROR');
      expect(result.quotaInfo.dailyLimit).toBe(-1); // Unknown
    });
  });

  describe('Tier-specific behaviors', () => {
    test('should apply FREE tier restrictions correctly', async () => {
      // Mock FREE tier limits
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'FREE',
                daily_quota: 100,
                monthly_quota: 2000,
                rate_limit_per_minute: 5,
                burst_limit: 5
              },
              error: null
            })
          })
        })
      });

      // Mock usage at 90% of quota
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(90),
              error: null
            })
          })
        })
      });

      mockRedis.get.mockResolvedValueOnce('2');

      const result = await rateLimiter.checkRateLimit({
        ...mockConfig,
        subscriptionTier: 'FREE'
      });

      expect(result.allowed).toBe(true);
      expect(result.quotaInfo.utilization).toBe(91); // (90 + 1) / 100 * 100
      expect(result.quotaInfo.dailyRemaining).toBe(9);
    });

    test('should provide appropriate upgrade messages', async () => {
      const testCases = [
        { tier: 'FREE', expectedMessage: 'STARTER' },
        { tier: 'STARTER', expectedMessage: 'PROFESSIONAL' },
        { tier: 'PROFESSIONAL', expectedMessage: 'SCALE' },
        { tier: 'SCALE', expectedMessage: 'ENTERPRISE' }
      ];

      for (const testCase of testCases) {
        // Mock quota exceeded for each tier
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  subscription_tier: testCase.tier,
                  daily_quota: 100,
                  rate_limit_per_minute: 10,
                  burst_limit: 5
                },
                error: null
              })
            })
          })
        });

        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: new Array(100),
                error: null
              })
            })
          })
        });

        mockSupabase.from.mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null })
        });

        const result = await rateLimiter.checkRateLimit({
          ...mockConfig,
          subscriptionTier: testCase.tier as any
        });

        expect(result.allowed).toBe(false);
        expect(result.upgradeMessage).toContain(testCase.expectedMessage);
      }
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when all components working', async () => {
      // Mock successful database query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null })
        })
      });

      // Mock successful Redis ping
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const health = await rateLimiter.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.database).toBe(true);
      expect(health.details.redis).toBe(true);
    });

    test('should return degraded status when Redis fails', async () => {
      // Mock successful database query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null })
        })
      });

      // Mock Redis failure
      mockRedis.ping.mockRejectedValueOnce(new Error('Redis down'));

      const health = await rateLimiter.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details.database).toBe(true);
      expect(health.details.redis).toBe(false);
    });

    test('should return unhealthy status when database fails', async () => {
      // Mock database failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: { message: 'DB failed' } })
        })
      });

      const health = await rateLimiter.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.database).toBe(false);
    });
  });

  describe('Performance and Load Tests', () => {
    test('should handle concurrent rate limit checks', async () => {
      // Mock successful responses
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'PROFESSIONAL',
                daily_quota: 10000,
                rate_limit_per_minute: 50,
                burst_limit: 20
              },
              error: null
            })
          })
        })
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(100),
              error: null
            })
          })
        })
      });

      mockRedis.get.mockResolvedValue('5');

      // Run 10 concurrent checks
      const promises = Array.from({ length: 10 }, (_, i) =>
        rateLimiter.checkRateLimit({
          ...mockConfig,
          userId: `user-${i}`
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    test('should complete rate limit check within performance threshold', async () => {
      // Mock fast responses
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                subscription_tier: 'PROFESSIONAL',
                daily_quota: 10000,
                rate_limit_per_minute: 50,
                burst_limit: 20
              },
              error: null
            })
          })
        })
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: new Array(100),
              error: null
            })
          })
        })
      });

      mockRedis.get.mockResolvedValue('5');

      const startTime = Date.now();
      const result = await rateLimiter.checkRateLimit(mockConfig);
      const endTime = Date.now();

      expect(result.allowed).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });
  });
});