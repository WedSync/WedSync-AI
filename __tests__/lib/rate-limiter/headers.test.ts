/**
 * Unit tests for Rate Limit Headers Manager
 * Tests header generation and validation
 */

import { NextResponse } from 'next/server';
import { RateLimitHeadersManager, withRateLimitHeaders, createRateLimitErrorResponse } from '@/lib/rate-limiter/headers';
import type { RateLimitResult, EnhancedRateLimitResult } from '@/types/rate-limit';

describe('RateLimitHeadersManager', () => {
  const mockRateLimitResult: RateLimitResult = {
    allowed: true,
    limit: 1000,
    remaining: 750,
    resetTime: Date.now() + 3600000,
    tier: 'user',
    key: 'user-123',
    windowMs: 3600000
  };

  const mockEnhancedResult: EnhancedRateLimitResult = {
    ...mockRateLimitResult,
    appliedTier: 'user',
    allTiers: {
      ip: {
        allowed: true,
        limit: 1000,
        remaining: 800,
        resetTime: Date.now() + 3600000,
        tier: 'ip',
        key: '192.168.1.1',
        windowMs: 3600000
      },
      user: mockRateLimitResult,
      organization: {
        allowed: true,
        limit: 2000,
        remaining: 1500,
        resetTime: Date.now() + 3600000,
        tier: 'organization',
        key: 'org-456',
        windowMs: 3600000
      },
      global: {
        allowed: true,
        limit: 10000,
        remaining: 8000,
        resetTime: Date.now() + 3600000,
        tier: 'global',
        key: 'global',
        windowMs: 3600000
      }
    }
  };

  describe('generateHeaders', () => {
    it('should generate standard rate limit headers', () => {
      const headers = RateLimitHeadersManager.generateHeaders(mockRateLimitResult);

      expect(headers['X-RateLimit-Limit']).toBe('1000');
      expect(headers['X-RateLimit-Remaining']).toBe('750');
      expect(headers['X-RateLimit-Reset']).toBe(Math.ceil(mockRateLimitResult.resetTime / 1000).toString());
      expect(headers['X-RateLimit-Tier']).toBe('USER');
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('should include Retry-After header for blocked requests', () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0,
        retryAfter: 300
      };

      const headers = RateLimitHeadersManager.generateHeaders(blockedResult);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBe('300');
    });
  });

  describe('generateEnhancedHeaders', () => {
    it('should generate enhanced headers with multi-tier information', () => {
      const headers = RateLimitHeadersManager.generateEnhancedHeaders(mockEnhancedResult);

      expect(headers['X-RateLimit-Applied-Tier']).toBe('USER');
      expect(headers['X-RateLimit-IP-Limit']).toBe('1000');
      expect(headers['X-RateLimit-IP-Remaining']).toBe('800');
      expect(headers['X-RateLimit-USER-Limit']).toBe('1000');
      expect(headers['X-RateLimit-USER-Remaining']).toBe('750');
      expect(headers['X-RateLimit-ORGANIZATION-Limit']).toBe('2000');
      expect(headers['X-RateLimit-GLOBAL-Limit']).toBe('10000');
      expect(headers['X-RateLimit-Window']).toBe('3600s');
    });

    it('should include bypass reason when present', () => {
      const bypassResult: EnhancedRateLimitResult = {
        ...mockEnhancedResult,
        bypassReason: 'whitelist'
      };

      const headers = RateLimitHeadersManager.generateEnhancedHeaders(bypassResult);

      expect(headers['X-RateLimit-Bypass']).toBe('whitelist');
    });

    it('should skip skipped tiers in headers', () => {
      const resultWithSkippedTiers: EnhancedRateLimitResult = {
        ...mockEnhancedResult,
        allTiers: {
          ...mockEnhancedResult.allTiers,
          user: {
            allowed: true,
            limit: 0, // Skipped tier
            remaining: 0,
            resetTime: Date.now(),
            tier: 'user',
            key: 'skipped',
            windowMs: 0
          }
        }
      };

      const headers = RateLimitHeadersManager.generateEnhancedHeaders(resultWithSkippedTiers);

      expect(headers['X-RateLimit-USER-Limit']).toBeUndefined();
      expect(headers['X-RateLimit-IP-Limit']).toBe('1000');
    });
  });

  describe('generateLegacyHeaders', () => {
    it('should generate legacy headers for backward compatibility', () => {
      const headers = RateLimitHeadersManager.generateLegacyHeaders(mockRateLimitResult);

      expect(headers['X-RateLimit-Limit']).toBe('1000');
      expect(headers['X-RateLimit-Remaining']).toBe('750');
      expect(headers['X-RateLimit-Reset']).toEqual(new Date(mockRateLimitResult.resetTime).toISOString());
      expect(headers['X-RateLimit-Resource']).toBe('user');
      expect(headers['X-RateLimit-Used']).toBe('250');
      expect(headers['X-Rate-Limit-Limit']).toBe('1000'); // Twitter style
    });
  });

  describe('applyHeadersToResponse', () => {
    it('should apply standard headers to NextResponse', () => {
      const response = NextResponse.json({ success: true });
      const result = RateLimitHeadersManager.applyHeadersToResponse(
        response,
        mockRateLimitResult,
        { enhanced: false }
      );

      expect(result.headers.get('X-RateLimit-Limit')).toBe('1000');
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('750');
      expect(result.headers.get('X-RateLimit-Tier')).toBe('USER');
    });

    it('should apply enhanced headers when enabled', () => {
      const response = NextResponse.json({ success: true });
      const result = RateLimitHeadersManager.applyHeadersToResponse(
        response,
        mockEnhancedResult,
        { enhanced: true }
      );

      expect(result.headers.get('X-RateLimit-Applied-Tier')).toBe('USER');
      expect(result.headers.get('X-RateLimit-IP-Limit')).toBe('1000');
      expect(result.headers.get('X-RateLimit-Window')).toBe('3600s');
    });

    it('should apply legacy headers when enabled', () => {
      const response = NextResponse.json({ success: true });
      const result = RateLimitHeadersManager.applyHeadersToResponse(
        response,
        mockRateLimitResult,
        { enhanced: false, legacy: true }
      );

      expect(result.headers.get('X-RateLimit-Resource')).toBe('user');
      expect(result.headers.get('X-Rate-Limit-Limit')).toBe('1000');
    });

    it('should apply debug headers in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = NextResponse.json({ success: true });
      const result = RateLimitHeadersManager.applyHeadersToResponse(
        response,
        mockRateLimitResult,
        { debug: true }
      );

      const debugHeader = result.headers.get('X-RateLimit-Debug');
      expect(debugHeader).toBeTruthy();
      const debugData = JSON.parse(debugHeader!);
      expect(debugData.key).toBe('user-123');
      expect(debugData.windowMs).toBe(3600000);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createErrorResponse', () => {
    it('should create 429 error response with appropriate headers', () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0,
        retryAfter: 300
      };

      const response = RateLimitHeadersManager.createErrorResponse(blockedResult);

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBe('300');
    });

    it('should include error details in response body', async () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0,
        retryAfter: 300
      };

      const response = RateLimitHeadersManager.createErrorResponse(blockedResult);
      const body = await response.json();

      expect(body.error).toBe('Rate limit exceeded');
      expect(body.tier).toBe('user');
      expect(body.limit).toBe(1000);
      expect(body.retryAfter).toBe(300);
    });

    it('should use custom message when provided', async () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0
      };

      const response = RateLimitHeadersManager.createErrorResponse(blockedResult, {
        customMessage: 'Custom rate limit message'
      });
      const body = await response.json();

      expect(body.message).toBe('Custom rate limit message');
    });
  });

  describe('generateErrorMessage', () => {
    it('should generate user-friendly message for different time periods', () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000 // 30 seconds
      };

      const message = RateLimitHeadersManager.generateErrorMessage(blockedResult);

      expect(message).toContain('User rate limit exceeded');
      expect(message).toContain('30 seconds');
    });

    it('should show minutes for longer periods', () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 300000 // 5 minutes
      };

      const message = RateLimitHeadersManager.generateErrorMessage(blockedResult);

      expect(message).toContain('5 minutes');
    });

    it('should show hours for very long periods', () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 7200000 // 2 hours
      };

      const message = RateLimitHeadersManager.generateErrorMessage(blockedResult);

      expect(message).toContain('2 hours');
    });

    it('should include tier-specific advice', () => {
      const userBlockedResult: EnhancedRateLimitResult = {
        ...mockEnhancedResult,
        allowed: false,
        remaining: 0,
        appliedTier: 'user',
        resetTime: Date.now() + 60000
      };

      const message = RateLimitHeadersManager.generateErrorMessage(userBlockedResult);

      expect(message).toContain('Consider upgrading your plan');
    });

    it('should handle IP-specific blocking', () => {
      const ipBlockedResult: EnhancedRateLimitResult = {
        ...mockEnhancedResult,
        allowed: false,
        remaining: 0,
        appliedTier: 'ip',
        resetTime: Date.now() + 60000
      };

      const message = RateLimitHeadersManager.generateErrorMessage(ipBlockedResult);

      expect(message).toContain('This limit applies to your IP address');
    });
  });

  describe('parseHeaders', () => {
    it('should parse rate limit headers from Headers object', () => {
      const headers = new Headers({
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '750',
        'X-RateLimit-Reset': '1642781234',
        'X-RateLimit-Tier': 'user',
        'Retry-After': '300'
      });

      const parsed = RateLimitHeadersManager.parseHeaders(headers);

      expect(parsed.limit).toBe(1000);
      expect(parsed.remaining).toBe(750);
      expect(parsed.reset).toEqual(new Date(1642781234 * 1000));
      expect(parsed.tier).toBe('user');
      expect(parsed.retryAfter).toBe(300);
    });

    it('should handle missing headers gracefully', () => {
      const headers = new Headers();

      const parsed = RateLimitHeadersManager.parseHeaders(headers);

      expect(parsed.limit).toBeUndefined();
      expect(parsed.remaining).toBeUndefined();
      expect(parsed.reset).toBeUndefined();
      expect(parsed.tier).toBeUndefined();
      expect(parsed.retryAfter).toBeUndefined();
    });
  });

  describe('validateHeaders', () => {
    it('should validate correct headers', () => {
      const headers = {
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '750',
        'X-RateLimit-Reset': '1642781234',
        'X-RateLimit-Tier': 'user'
      };

      const validation = RateLimitHeadersManager.validateHeaders(headers);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should identify missing required headers', () => {
      const headers = {
        'X-RateLimit-Limit': '1000'
      };

      const validation = RateLimitHeadersManager.validateHeaders(headers);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing X-RateLimit-Remaining header');
      expect(validation.errors).toContain('Missing X-RateLimit-Reset header');
      expect(validation.errors).toContain('Missing X-RateLimit-Tier header');
    });

    it('should identify invalid numeric values', () => {
      const headers = {
        'X-RateLimit-Limit': 'invalid',
        'X-RateLimit-Remaining': '750',
        'X-RateLimit-Reset': '1642781234',
        'X-RateLimit-Tier': 'user'
      };

      const validation = RateLimitHeadersManager.validateHeaders(headers);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('X-RateLimit-Limit must be a number');
    });

    it('should identify inconsistent remaining vs limit values', () => {
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '150', // More than limit
        'X-RateLimit-Reset': '1642781234',
        'X-RateLimit-Tier': 'user'
      };

      const validation = RateLimitHeadersManager.validateHeaders(headers);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('X-RateLimit-Remaining cannot be greater than X-RateLimit-Limit');
    });

    it('should identify negative remaining values', () => {
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '-5',
        'X-RateLimit-Reset': '1642781234',
        'X-RateLimit-Tier': 'user'
      };

      const validation = RateLimitHeadersManager.validateHeaders(headers);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('X-RateLimit-Remaining cannot be negative');
    });

    it('should identify timestamps too far in the past', () => {
      const pastTimestamp = Math.floor((Date.now() - 7200000) / 1000); // 2 hours ago
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': pastTimestamp.toString(),
        'X-RateLimit-Tier': 'user'
      };

      const validation = RateLimitHeadersManager.validateHeaders(headers);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('X-RateLimit-Reset timestamp appears to be too far in the past');
    });
  });

  describe('convenience functions', () => {
    it('should provide withRateLimitHeaders convenience function', () => {
      const response = NextResponse.json({ success: true });
      const result = withRateLimitHeaders(response, mockRateLimitResult);

      expect(result.headers.get('X-RateLimit-Limit')).toBe('1000');
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('750');
    });

    it('should provide createRateLimitErrorResponse convenience function', () => {
      const blockedResult: RateLimitResult = {
        ...mockRateLimitResult,
        allowed: false,
        remaining: 0
      };

      const response = createRateLimitErrorResponse(blockedResult);

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });
});