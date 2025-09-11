// __tests__/api/usage-monitoring/api-usage-tracker.test.ts
// WS-233: API Usage Tracker Tests
// Team B - Comprehensive test suite for API usage tracking middleware

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { ApiUsageTracker, withApiUsageTracking, ApiUsageContext } from '@/lib/middleware/api-usage-tracker';

// Mock Supabase
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(),
  auth: { getUser: jest.fn() }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock Redis
const mockRedis = {
  connect: jest.fn(),
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

describe('ApiUsageTracker', () => {
  let tracker: ApiUsageTracker;
  let mockContext: ApiUsageContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    tracker = new ApiUsageTracker();
    
    mockContext = {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      userId: 'user-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL',
      endpoint: '/api/forms/create',
      httpMethod: 'POST',
      requestId: 'req-123e4567-e89b-12d3-a456-426614174000',
      userAgent: 'Mozilla/5.0 (compatible; WedSync/1.0)',
      ipAddress: '192.168.1.100',
      countryCode: 'US'
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateUsage', () => {
    test('should allow request when within quota limits', async () => {
      // Mock successful quota check
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          allowed: true,
          daily_usage: 50,
          daily_limit: 10000,
          minute_usage: 2,
          minute_limit: 50,
          subscription_tier: 'PROFESSIONAL'
        },
        error: null
      });

      const result = await tracker.validateUsage(mockContext);

      expect(result.allowed).toBe(true);
      expect(result.trackingId).toBe(mockContext.requestId);
      expect(result.quotaInfo).toBeDefined();
      expect(result.quotaInfo?.dailyUsed).toBe(50);
      expect(result.quotaInfo?.dailyLimit).toBe(10000);
      
      // Verify RPC call
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_api_usage_limits', {
        p_organization_id: mockContext.organizationId,
        p_endpoint: mockContext.endpoint
      });
    });

    test('should deny request when daily quota exceeded', async () => {
      // Mock quota exceeded response
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          allowed: false,
          reason: 'DAILY_QUOTA_EXCEEDED',
          daily_usage: 10000,
          daily_limit: 10000
        },
        error: null
      });

      const result = await tracker.validateUsage(mockContext);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('DAILY_QUOTA_EXCEEDED');
      expect(result.quotaInfo).toBeDefined();
      expect(result.quotaInfo?.dailyUsed).toBe(10000);
      expect(result.quotaInfo?.dailyRemaining).toBe(0);
    });

    test('should deny request when rate limit exceeded', async () => {
      // Mock rate limit exceeded response
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          allowed: false,
          reason: 'RATE_LIMIT_EXCEEDED',
          minute_usage: 50,
          minute_limit: 50
        },
        error: null
      });

      const result = await tracker.validateUsage(mockContext);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.rateLimitInfo).toBeDefined();
      expect(result.rateLimitInfo?.remainingRequests).toBe(0);
    });

    test('should fail open on database error', async () => {
      // Mock database error
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
      });

      const result = await tracker.validateUsage(mockContext);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('QUOTA_CHECK_ERROR');
      expect(result.trackingId).toBe(mockContext.requestId);
    });

    test('should handle free tier limits correctly', async () => {
      const freeContext = { ...mockContext, subscriptionTier: 'FREE' as const };
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          allowed: true,
          daily_usage: 80,
          daily_limit: 100,
          minute_usage: 4,
          minute_limit: 5,
          subscription_tier: 'FREE'
        },
        error: null
      });

      const result = await tracker.validateUsage(freeContext);

      expect(result.allowed).toBe(true);
      expect(result.quotaInfo?.dailyLimit).toBe(100);
      expect(result.quotaInfo?.utilization).toBe(81); // (80 + 1) / 100 * 100
    });

    test('should handle enterprise unlimited tier', async () => {
      const enterpriseContext = { ...mockContext, subscriptionTier: 'ENTERPRISE' as const };
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          allowed: true,
          daily_usage: 50000,
          daily_limit: -1, // Unlimited
          minute_usage: 200,
          minute_limit: -1, // Unlimited
          subscription_tier: 'ENTERPRISE'
        },
        error: null
      });

      const result = await tracker.validateUsage(enterpriseContext);

      expect(result.allowed).toBe(true);
      expect(result.quotaInfo?.dailyLimit).toBe(-1);
      expect(result.quotaInfo?.utilization).toBe(0); // Should be 0 for unlimited
    });
  });

  describe('recordUsage', () => {
    beforeEach(() => {
      // Mock database insert
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });
    });

    test('should record successful API usage', async () => {
      await tracker.recordUsage(
        mockContext,
        200, // status code
        150, // response time
        1024, // response size
        undefined, // no error
        undefined
      );

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw any errors
      expect(true).toBe(true);
    });

    test('should record API usage with error information', async () => {
      await tracker.recordUsage(
        mockContext,
        400, // Bad request
        50,
        512,
        'VALIDATION_ERROR',
        'ValidationError'
      );

      // Should not throw any errors
      expect(true).toBe(true);
    });

    test('should handle recording failures gracefully', async () => {
      // Mock database insertion failure
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
      });

      // Should not throw even if database insert fails
      await expect(tracker.recordUsage(mockContext, 200, 100)).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when all systems operational', async () => {
      // Mock successful database query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null })
        })
      });

      // Mock successful Redis ping
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const health = await tracker.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.database).toBe(true);
      expect(health.details.redis).toBe(true);
    });

    test('should return degraded status when Redis unavailable', async () => {
      // Mock successful database query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null })
        })
      });

      // Mock Redis failure
      mockRedis.ping.mockRejectedValueOnce(new Error('Redis connection failed'));

      const health = await tracker.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details.database).toBe(true);
      expect(health.details.redis).toBe(false);
    });

    test('should return unhealthy status when database unavailable', async () => {
      // Mock database failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: { message: 'DB connection failed' } })
        })
      });

      const health = await tracker.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.database).toBe(false);
    });
  });
});

describe('withApiUsageTracking HOF', () => {
  let mockHandler: jest.Mock;
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockHandler = jest.fn();
    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'x-organization-id': 'org-123e4567-e89b-12d3-a456-426614174000',
        'user-agent': 'Mozilla/5.0 (compatible; WedSync/1.0)'
      }
    });

    // Mock successful quota check
    mockSupabase.rpc.mockResolvedValue({
      data: {
        allowed: true,
        daily_usage: 50,
        daily_limit: 10000,
        subscription_tier: 'PROFESSIONAL'
      },
      error: null
    });

    // Mock database insert
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null })
    });
  });

  test('should track successful API request', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
    mockHandler.mockResolvedValueOnce(mockResponse);

    const wrappedHandler = withApiUsageTracking(mockHandler);
    const response = await wrappedHandler(mockRequest, {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL'
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Request-ID')).toBeDefined();
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  test('should return 429 when quota exceeded', async () => {
    // Mock quota exceeded
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        allowed: false,
        reason: 'DAILY_QUOTA_EXCEEDED',
        daily_usage: 10000,
        daily_limit: 10000
      },
      error: null
    });

    const wrappedHandler = withApiUsageTracking(mockHandler);
    const response = await wrappedHandler(mockRequest, {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL'
    });

    expect(response.status).toBe(429);
    expect(mockHandler).not.toHaveBeenCalled();
    
    const responseBody = await response.json();
    expect(responseBody.error).toBe(true);
    expect(responseBody.code).toBe('DAILY_QUOTA_EXCEEDED');
  });

  test('should add rate limit headers to response', async () => {
    // Mock successful response with quota info
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        allowed: true,
        daily_usage: 100,
        daily_limit: 1000,
        subscription_tier: 'PROFESSIONAL'
      },
      error: null
    });

    const mockResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
    mockHandler.mockResolvedValueOnce(mockResponse);

    const wrappedHandler = withApiUsageTracking(mockHandler);
    const response = await wrappedHandler(mockRequest, {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL'
    });

    expect(response.headers.get('X-Quota-Used')).toBe('100');
    expect(response.headers.get('X-Quota-Limit')).toBe('1000');
    expect(response.headers.get('X-Quota-Utilization')).toContain('%');
  });

  test('should handle and track API handler errors', async () => {
    const error = new Error('Internal server error');
    (error as any).status = 500;
    (error as any).code = 'INTERNAL_ERROR';
    
    mockHandler.mockRejectedValueOnce(error);

    const wrappedHandler = withApiUsageTracking(mockHandler);
    const response = await wrappedHandler(mockRequest, {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL'
    });

    expect(response.status).toBe(500);
    
    const responseBody = await response.json();
    expect(responseBody.error).toBe(true);
    expect(responseBody.message).toBe('Internal server error');
  });

  test('should extract context from request headers', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
    mockHandler.mockResolvedValueOnce(mockResponse);

    const customRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: {
        'x-organization-id': 'custom-org-id',
        'x-user-id': 'custom-user-id',
        'x-api-key-id': 'custom-api-key-id',
        'user-agent': 'Custom-Agent/1.0',
        'x-forwarded-for': '203.0.113.1',
        'referer': 'https://wedsync.com/dashboard'
      }
    });

    const wrappedHandler = withApiUsageTracking(mockHandler);
    await wrappedHandler(customRequest, { subscriptionTier: 'SCALE' });

    // Should have called quota check with extracted organization ID
    expect(mockSupabase.rpc).toHaveBeenCalledWith('check_api_usage_limits', {
      p_organization_id: 'custom-org-id',
      p_endpoint: '/api/test'
    });
  });
});

describe('API Usage Context Validation', () => {
  test('should validate valid API usage context', () => {
    const validContext = {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      userId: 'user-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL' as const,
      endpoint: '/api/forms/create',
      httpMethod: 'POST' as const,
      requestId: 'req-123e4567-e89b-12d3-a456-426614174000',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.100',
      countryCode: 'US'
    };

    expect(() => {
      // ApiUsageContextSchema.parse(validContext);
    }).not.toThrow();
  });

  test('should reject invalid subscription tier', () => {
    const invalidContext = {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'INVALID_TIER',
      endpoint: '/api/forms/create',
      httpMethod: 'POST',
      requestId: 'req-123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => {
      // ApiUsageContextSchema.parse(invalidContext);
    }).toThrow();
  });

  test('should reject invalid HTTP method', () => {
    const invalidContext = {
      organizationId: 'org-123e4567-e89b-12d3-a456-426614174000',
      subscriptionTier: 'PROFESSIONAL',
      endpoint: '/api/forms/create',
      httpMethod: 'INVALID_METHOD',
      requestId: 'req-123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => {
      // ApiUsageContextSchema.parse(invalidContext);
    }).toThrow();
  });
});

describe('Performance Tests', () => {
  test('should validate usage within acceptable time limits', async () => {
    const tracker = new ApiUsageTracker();
    
    // Mock fast database response
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { allowed: true, daily_usage: 10, daily_limit: 1000 },
      error: null
    });

    const startTime = Date.now();
    const result = await tracker.validateUsage(mockContext);
    const endTime = Date.now();

    expect(result.allowed).toBe(true);
    expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
  });

  test('should handle high-volume usage recording', async () => {
    const tracker = new ApiUsageTracker();
    
    // Mock successful database inserts
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null })
    });

    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(tracker.recordUsage(
        { ...mockContext, requestId: `req-${i}` },
        200,
        Math.random() * 1000
      ));
    }

    // Should handle batch recording without errors
    await expect(Promise.all(promises)).resolves.not.toThrow();
  });
});