import { NextRequest } from 'next/server';
import { GET as metricsGET } from '../../app/api/analytics/metrics/route';
import { GET as realtimeGET } from '../../app/api/analytics/realtime/route';
import { GET as insightsGET } from '../../app/api/analytics/wedding-insights/route';
import { jest } from '@jest/globals';

// Mock authentication
jest.mock('../../lib/auth/auth-utils', () => ({
  validateAuth: jest.fn(() => ({
    isValid: true,
    user: {
      id: 'user-123',
      organizationId: 'org-123',
      tier: 'professional',
    },
  })),
  checkRateLimit: jest.fn(() => ({ allowed: true, remaining: 99 })),
}));

// Mock analytics services
jest.mock('../../lib/analytics/analytics-engine', () => ({
  AnalyticsEngine: jest.fn(() => ({
    calculateMetrics: jest.fn(),
    getRealTimeMetrics: jest.fn(),
    getWeddingInsights: jest.fn(),
  })),
}));

// Helper functions to reduce nesting - EXTRACTED TO MEET 4-LEVEL LIMIT

/**
 * Creates mock connections array for testing connection limits
 */
const createMockConnections = (count: number) => 
  Array.from({ length: count }, (_, i) => ({ id: i }));

/**
 * Mocks the realtime websocket service with connection data
 */
const mockRealtimeWebSocketService = (connections: any[]) => ({
  getActiveConnections: () => connections,
});

/**
 * Creates a NextRequest with common headers for testing
 */
const createAuthenticatedRequest = (url: URL) => {
  return new NextRequest(url, {
    headers: {
      Authorization: 'Bearer valid-token',
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Creates mock user data for tier testing
 */
const createMockFreeTierUser = () => ({
  isValid: true,
  user: {
    id: 'user-456',
    organizationId: 'org-456',
    tier: 'free',
  },
});

/**
 * Creates a NextRequest with WebSocket upgrade headers
 */
const createWebSocketUpgradeRequest = (url: URL) => {
  return new NextRequest(url, {
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Key': 'test-key',
      'Sec-WebSocket-Version': '13',
    },
  });
};

/**
 * Creates analytics engine mock with database error
 */
const createAnalyticsEngineWithError = () => {
  const { AnalyticsEngine } = require('../../lib/analytics/analytics-engine');
  AnalyticsEngine.mockImplementation(() => ({
    calculateMetrics: jest
      .fn()
      .mockRejectedValue(new Error('Database connection failed')),
  }));
};

/**
 * Creates expected log object for monitoring tests
 */
const createExpectedLogObject = (organizationId: string) => ({
  endpoint: '/api/analytics/metrics',
  method: 'GET',
  organizationId,
  responseTime: expect.any(Number),
  status: 200,
});

/**
 * Creates a NextRequest with GDPR/EU headers
 */
const createGDPRRequest = (url: URL) => {
  return new NextRequest(url, {
    headers: {
      'CF-IPCountry': 'DE', // Germany (EU)
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    },
  });
};

describe('Analytics API Endpoints', () => {
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/metrics', () => {
    test('should return metrics for authenticated user', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events,unique_users&timeRange=7d',
      );
      const request = createAuthenticatedRequest(url);

      const response = await metricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metrics).toBeDefined();
      expect(data.data.calculatedAt).toBeDefined();
      expect(data.data.organizationId).toBe(mockOrganizationId);
    });

    test('should handle invalid metrics parameter', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=invalid_metric',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_METRICS');
    });

    test('should respect rate limiting', async () => {
      // Mock rate limit exceeded
      const { checkRateLimit } = require('../../lib/auth/auth-utils');
      checkRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 });

      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    test('should handle wedding season metrics', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=seasonal_bookings&season=summer&vendorType=photographer',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metrics.seasonal_bookings).toBeDefined();
      expect(data.data.context.season).toBe('summer');
      expect(data.data.context.vendorType).toBe('photographer');
    });

    test('should return cached results when available', async () => {
      // First request
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events',
      );
      const request1 = new NextRequest(url);

      const response1 = await metricsGET(request1);
      const data1 = await response1.json();

      // Second identical request (should be cached)
      const request2 = new NextRequest(url);
      const response2 = await metricsGET(request2);
      const data2 = await response2.json();

      expect(response2.headers.get('X-Cache')).toBe('HIT');
      expect(data1.data.calculatedAt).toBe(data2.data.calculatedAt);
    });

    test('should handle tier-based access restrictions', async () => {
      // Mock free tier user
      const { validateAuth } = require('../../lib/auth/auth-utils');
      validateAuth.mockReturnValueOnce(createMockFreeTierUser());

      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=advanced_predictions',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);

      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe('TIER_RESTRICTION');
    });
  });

  describe('GET /api/analytics/realtime', () => {
    test('should return real-time metrics', async () => {
      const url = new URL(
        'https://example.com/api/analytics/realtime?metrics=active_users,events_per_minute',
      );
      const request = new NextRequest(url);

      const response = await realtimeGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.realTimeMetrics).toBeDefined();
      expect(data.data.timestamp).toBeDefined();
      expect(data.data.refreshInterval).toBe(30); // 30 seconds default
    });

    test('should handle WebSocket upgrade requests', async () => {
      const url = new URL('https://example.com/api/analytics/realtime');
      const request = createWebSocketUpgradeRequest(url);

      const response = await realtimeGET(request);

      expect(response.status).toBe(101); // Switching Protocols
      expect(response.headers.get('Upgrade')).toBe('websocket');
    });

    test('should provide polling fallback for non-WebSocket clients', async () => {
      const url = new URL(
        'https://example.com/api/analytics/realtime?fallback=polling',
      );
      const request = new NextRequest(url);

      const response = await realtimeGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pollingInterval).toBe(5000); // 5 seconds
      expect(data.data.nextPollUrl).toBeDefined();
    });

    test('should handle wedding day priority requests', async () => {
      const url = new URL(
        'https://example.com/api/analytics/realtime?priority=wedding_day&weddingDate=2024-06-15',
      );
      const request = new NextRequest(url);

      const response = await realtimeGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.priority).toBe('wedding_day');
      expect(data.data.refreshInterval).toBe(5); // Higher frequency for wedding day
      expect(response.headers.get('X-Priority')).toBe('high');
    });

    test('should limit concurrent connections per organization', async () => {
      // Use extracted helper functions - REDUCED NESTING FROM 5 TO 4 LEVELS
      const url = new URL('https://example.com/api/analytics/realtime');
      const request = new NextRequest(url);

      // Create mock connections using helper function
      const mockConnections = createMockConnections(100);
      jest.doMock('../../lib/analytics/realtime-websocket-service', () => 
        mockRealtimeWebSocketService(mockConnections)
      );

      const response = await realtimeGET(request);

      expect(response.status).toBe(503); // Service Unavailable
      expect((await response.json()).error.code).toBe(
        'CONNECTION_LIMIT_EXCEEDED',
      );
    });
  });

  describe('GET /api/analytics/wedding-insights', () => {
    test('should return wedding-specific insights', async () => {
      const url = new URL(
        'https://example.com/api/analytics/wedding-insights?insight=seasonal_demand&vendorType=photographer',
      );
      const request = new NextRequest(url);

      const response = await insightsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.insights).toBeDefined();
      expect(data.data.weddingContext).toBeDefined();
      expect(data.data.recommendations).toBeInstanceOf(Array);
    });

    test('should validate vendor type parameter', async () => {
      const url = new URL(
        'https://example.com/api/analytics/wedding-insights?vendorType=invalid_vendor',
      );
      const request = new NextRequest(url);

      const response = await insightsGET(request);

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('INVALID_VENDOR_TYPE');
    });

    test('should provide market trend analysis', async () => {
      const url = new URL(
        'https://example.com/api/analytics/wedding-insights?insight=market_trends&region=UK&timeframe=12months',
      );
      const request = new NextRequest(url);

      const response = await insightsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.insights.marketTrends).toBeDefined();
      expect(data.data.insights.emergingTrends).toBeInstanceOf(Array);
      expect(data.data.insights.opportunityScore).toBeBetween(0, 10);
    });

    test('should handle competitive analysis requests', async () => {
      const url = new URL(
        'https://example.com/api/analytics/wedding-insights?insight=competitive_position&vendorType=photographer&region=London',
      );
      const request = new NextRequest(url);

      const response = await insightsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.insights.competitivePosition).toBeDefined();
      expect(data.data.insights.marketShare).toBeBetween(0, 1);
      expect(data.data.insights.threats).toBeInstanceOf(Array);
      expect(data.data.insights.opportunities).toBeInstanceOf(Array);
    });

    test('should provide pricing optimization insights', async () => {
      const url = new URL(
        'https://example.com/api/analytics/wedding-insights?insight=pricing_optimization&currentPrice=2000&vendorType=photographer',
      );
      const request = new NextRequest(url);

      const response = await insightsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.insights.pricingOptimization).toBeDefined();
      expect(data.data.insights.recommendedPrice).toBeGreaterThan(0);
      expect(data.data.insights.priceElasticity).toBeLessThan(0);
      expect(data.data.insights.revenueImpact).toBeDefined();
    });

    test('should handle seasonal analysis with weather data', async () => {
      const url = new URL(
        'https://example.com/api/analytics/wedding-insights?insight=seasonal_analysis&includeWeather=true&year=2024',
      );
      const request = new NextRequest(url);

      const response = await insightsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.insights.seasonalAnalysis).toBeDefined();
      expect(data.data.insights.weatherImpact).toBeDefined();
      expect(data.data.insights.optimalMonths).toBeInstanceOf(Array);
    });
  });

  describe('API Performance and Reliability', () => {
    test('should respond within performance thresholds', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events',
      );
      const request = new NextRequest(url);

      const startTime = Date.now();
      const response = await metricsGET(request);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(200); // <200ms requirement
      expect(response.headers.get('X-Response-Time')).toBeDefined();
    });

    test('should handle high concurrent load', async () => {
      const concurrentRequests = Array.from({ length: 50 }, () => {
        const url = new URL(
          'https://example.com/api/analytics/metrics?metrics=total_events',
        );
        return metricsGET(new NextRequest(url));
      });

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      expect(responses.length).toBe(50);
      expect(responses.every((r) => r.status === 200 || r.status === 429)).toBe(
        true,
      ); // 200 or rate limited
      expect(totalTime).toBeLessThan(5000); // Should handle 50 concurrent requests in <5 seconds
    });

    test('should implement proper error handling', async () => {
      // Mock database error using helper function
      createAnalyticsEngineWithError();

      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.details).not.toContain('Database connection failed'); // Sensitive info should be hidden
    });

    test('should include proper security headers', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe(
        'strict-origin-when-cross-origin',
      );
    });

    test('should log requests for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events',
      );
      const request = new NextRequest(url);

      await metricsGET(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining(createExpectedLogObject(mockOrganizationId)),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Wedding Day Critical Operations', () => {
    test('should prioritize wedding day requests', async () => {
      const url = new URL(
        'https://example.com/api/analytics/realtime?weddingDay=true&weddingDate=2024-06-15',
      );
      const request = new NextRequest(url);

      const response = await realtimeGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Priority')).toBe('critical');
      expect(data.data.refreshInterval).toBe(1); // 1 second for wedding day
      expect(data.data.guaranteedUptime).toBe(true);
    });

    test('should provide emergency escalation for wedding day issues', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?emergency=true&weddingDate=2024-06-15',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.emergencyMode).toBe(true);
      expect(data.data.supportContact).toBeDefined();
      expect(data.data.escalationLevel).toBe('immediate');
    });
  });

  describe('Data Privacy and Security', () => {
    test('should not expose sensitive data in responses', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=user_data',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should not contain sensitive patterns
      expect(responseText).not.toMatch(/password|secret|key|token/i);
      expect(responseText).not.toMatch(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      ); // Email patterns
      expect(responseText).not.toMatch(
        /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
      ); // Credit card patterns
    });

    test('should validate GDPR compliance for EU requests', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=total_events',
      );
      const request = createGDPRRequest(url);

      const response = await metricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.gdprCompliant).toBe(true);
      expect(data.data.dataRetentionPeriod).toBeDefined();
      expect(data.data.userRights).toBeDefined();
    });

    test('should sanitize query parameters', async () => {
      const url = new URL(
        'https://example.com/api/analytics/metrics?metrics=<script>alert("xss")</script>',
      );
      const request = new NextRequest(url);

      const response = await metricsGET(request);

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('INVALID_PARAMETERS');
    });
  });
});
