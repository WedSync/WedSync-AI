/**
 * Unit tests for Sliding Window Rate Limiter
 * Comprehensive test suite covering all scenarios
 */

import { SlidingWindowRateLimiter } from '@/lib/rate-limiter/sliding-window';
import { RedisRateLimitOperations } from '@/lib/redis';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/lib/monitoring/metrics');

const mockRedisOps = {
  checkSlidingWindow: jest.fn(),
  getCurrentCount: jest.fn(),
  resetLimit: jest.fn(),
  setOverride: jest.fn(),
  getOverride: jest.fn(),
  deleteOverride: jest.fn(),
  getClient: jest.fn(() => ({
    eval: jest.fn(),
    del: jest.fn(),
  }))
};

(RedisRateLimitOperations as jest.MockedClass<typeof RedisRateLimitOperations>).mockImplementation(
  () => mockRedisOps as any
);

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter;
  const mockDate = new Date('2025-01-21T10:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    
    limiter = new SlidingWindowRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      tier: 'ip',
      keyPrefix: 'test:',
      precision: 10
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      const mockRedisResult = {
        current: 50,
        remaining: 50,
        allowed: true
      };
      
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([50, 50, 1])
      });

      const result = await limiter.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.tier).toBe('ip');
      expect(result.key).toBe('test-user');
    });

    it('should block requests exceeding limit', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([101, 0, 0])
      });

      const result = await limiter.checkLimit('test-user');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(100);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should respect rate limit overrides', async () => {
      const override = {
        limit: 200,
        windowMs: 120000 // 2 minutes
      };
      
      mockRedisOps.getOverride.mockResolvedValue(override);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([150, 50, 1])
      });

      const result = await limiter.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(200);
      expect(result.windowMs).toBe(120000);
    });

    it('should handle Redis errors gracefully (fail open)', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockRejectedValue(new Error('Redis connection failed'))
      });

      const result = await limiter.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        'Sliding window rate limit check failed',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should fallback to simple sliding window if Lua script fails', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockRejectedValue(new Error('Lua script error'))
      });
      
      const fallbackResult = {
        current: 25,
        remaining: 75,
        allowed: true
      };
      mockRedisOps.checkSlidingWindow.mockResolvedValue(fallbackResult);

      const result = await limiter.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(75);
      expect(mockRedisOps.checkSlidingWindow).toHaveBeenCalled();
    });

    it('should record metrics for requests', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([30, 70, 1])
      });

      await limiter.checkLimit('test-user');

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'rate_limit.requests',
        1,
        expect.objectContaining({
          tier: 'ip',
          allowed: 'true'
        })
      );
    });
  });

  describe('getWindowStatus', () => {
    it('should return current window status', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getCurrentCount.mockResolvedValue(42);

      const status = await limiter.getWindowStatus('test-user');

      expect(status.key).toBe('test-user');
      expect(status.current).toBe(42);
      expect(status.remaining).toBe(58);
      expect(status.limit).toBe(100);
      expect(status.windowMs).toBe(60000);
    });

    it('should handle errors in getting window status', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getCurrentCount.mockRejectedValue(new Error('Redis error'));

      const status = await limiter.getWindowStatus('test-user');

      expect(status.current).toBe(0);
      expect(status.remaining).toBe(100);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('resetLimit', () => {
    it('should reset rate limit and clean up bucket keys', async () => {
      const mockRedisClient = {
        del: jest.fn().mockResolvedValue(1)
      };
      mockRedisOps.getClient.mockReturnValue(mockRedisClient);
      mockRedisOps.deleteOverride.mockResolvedValue(undefined);

      await limiter.resetLimit('test-user');

      expect(mockRedisClient.del).toHaveBeenCalled();
      expect(mockRedisOps.deleteOverride).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Rate limit reset successfully',
        expect.objectContaining({
          identifier: 'test-user',
          tier: 'ip'
        })
      );
    });

    it('should handle errors during reset', async () => {
      mockRedisOps.getClient.mockReturnValue({
        del: jest.fn().mockRejectedValue(new Error('Redis error'))
      });

      await limiter.resetLimit('test-user');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to reset rate limit',
        expect.any(Error),
        expect.objectContaining({ identifier: 'test-user' })
      );
    });
  });

  describe('setOverride', () => {
    it('should set rate limit override', async () => {
      mockRedisOps.setOverride.mockResolvedValue(undefined);

      await limiter.setOverride('test-user', 500, 300000);

      expect(mockRedisOps.setOverride).toHaveBeenCalledWith(
        'test:ip:test-user',
        500,
        300000
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Rate limit override set',
        expect.objectContaining({
          identifier: 'test-user',
          newLimit: 500,
          windowMs: 300000
        })
      );
    });

    it('should handle errors when setting override', async () => {
      mockRedisOps.setOverride.mockRejectedValue(new Error('Redis error'));

      await limiter.setOverride('test-user', 500, 300000);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to set rate limit override',
        expect.any(Error),
        expect.objectContaining({
          identifier: 'test-user',
          newLimit: 500
        })
      );
    });
  });

  describe('reset time calculation', () => {
    it('should calculate reset time correctly for sliding window', async () => {
      const now = mockDate.getTime();
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([50, 50, 1])
      });

      const result = await limiter.checkLimit('test-user');

      // Should be approximately now + windowMs, but accounting for bucket precision
      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(now + 60000);
    });
  });

  describe('metrics recording', () => {
    it('should record processing time histogram', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([50, 50, 1])
      });

      await limiter.checkLimit('test-user');

      expect(metrics.recordHistogram).toHaveBeenCalledWith(
        'rate_limit.processing_time',
        expect.any(Number),
        expect.objectContaining({ tier: 'ip' })
      );
    });

    it('should record utilization gauge', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([30, 70, 1])
      });

      await limiter.checkLimit('test-user');

      expect(metrics.recordGauge).toHaveBeenCalledWith(
        'rate_limit.utilization',
        30, // (100-70)/100 * 100
        expect.objectContaining({ tier: 'ip' })
      );
    });

    it('should increment blocked counter for exceeded limits', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([101, 0, 0])
      });

      await limiter.checkLimit('test-user');

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'rate_limit.blocked',
        1,
        expect.objectContaining({
          tier: 'ip',
          allowed: 'false'
        })
      );
    });
  });

  describe('key type detection', () => {
    it('should identify user keys', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([50, 50, 1])
      });

      await limiter.checkLimit('user@example.com');

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'rate_limit.requests',
        1,
        expect.objectContaining({
          key_type: 'user'
        })
      );
    });

    it('should identify IP keys', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([50, 50, 1])
      });

      await limiter.checkLimit('192.168.1.1');

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'rate_limit.requests',
        1,
        expect.objectContaining({
          key_type: 'ip'
        })
      );
    });

    it('should identify organization keys', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([50, 50, 1])
      });

      await limiter.checkLimit('org_12345');

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'rate_limit.requests',
        1,
        expect.objectContaining({
          key_type: 'organization'
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent requests correctly', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      let callCount = 0;
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve([callCount, 100 - callCount, callCount <= 100 ? 1 : 0]);
        })
      });

      const promises = Array.from({ length: 10 }, () => limiter.checkLimit('test-user'));
      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.tier).toBe('ip');
        expect(result.key).toBe('test-user');
      });
    });

    it('should handle very high precision correctly', async () => {
      const highPrecisionLimiter = new SlidingWindowRateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 100,
        tier: 'user',
        precision: 60 // 1 bucket per second
      });

      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([50, 50, 1])
      });

      const result = await highPrecisionLimiter.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(mockRedisOps.getClient().eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'test:user:test-user',
        '60000',
        '100',
        expect.any(String),
        '1000', // bucket size
        '60'    // precision
      );
    });

    it('should handle zero remaining correctly', async () => {
      mockRedisOps.getOverride.mockResolvedValue(null);
      mockRedisOps.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue([100, 0, 1])
      });

      const result = await limiter.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });
});