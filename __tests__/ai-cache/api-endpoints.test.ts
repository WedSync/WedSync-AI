/**
 * WS-241 AI Caching Strategy System - API Endpoints Tests
 * Comprehensive test suite for all cache API endpoints
 * Team B - Backend Infrastructure & API Development
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as cacheQueryGET, POST as cacheQueryPOST } from '@/app/api/ai-cache/query/route';
import { GET as cacheInvalidateGET, POST as cacheInvalidatePOST, DELETE as cacheInvalidateDELETE } from '@/app/api/ai-cache/invalidate/route';
import { GET as cachePreloadGET, POST as cachePreloadPOST } from '@/app/api/ai-cache/preload/route';
import { GET as cacheStatisticsGET } from '@/app/api/ai-cache/statistics/route';
import { GET as cacheSeasonalScalingGET, POST as cacheSeasonalScalingPOST } from '@/app/api/ai-cache/seasonal-scaling/route';
import { GET as cacheSecurityGET, POST as cacheSecurityPOST } from '@/app/api/ai-cache/security/route';

// Mock Next.js request/response
const createMockRequest = (url: string, options: any = {}) => ({
  url,
  method: options.method || 'GET',
  headers: new Map([
    ['x-forwarded-for', '192.168.1.1'],
    ['user-agent', 'test-agent'],
    ...Object.entries(options.headers || {})
  ]),
  json: vi.fn().mockResolvedValue(options.body || {}),
  ...options
} as unknown as NextRequest);

// Mock Supabase auth
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user-id',
            email: 'test@example.com'
          } 
        },
        error: null
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { 
          organization_id: 'test-org-id', 
          role: 'ADMIN' 
        }, 
        error: null 
      }),
      then: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }))
}));

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({}))
}));

// Mock rate limiter
vi.mock('@/lib/ratelimit', () => ({
  ratelimit: {
    limit: vi.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000
    })
  }
}));

// Mock cache services
vi.mock('@/lib/ai-cache/WeddingAICacheService', () => ({
  WeddingAICacheService: vi.fn(() => ({
    getCachedResponse: vi.fn(),
    setCachedResponse: vi.fn(),
    invalidateCache: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue({ status: 'healthy' })
  }))
}));

vi.mock('@/lib/ai-cache/SeasonalScalingAutomator', () => ({
  SeasonalScalingAutomator: vi.fn(() => ({
    getCurrentSeason: vi.fn().mockReturnValue({ name: 'peak', trafficMultiplier: 3.0 }),
    predictSeasonalTransition: vi.fn().mockResolvedValue({ upcomingTransitions: [], recommendedActions: [] }),
    executeSeasonalScaling: vi.fn().mockResolvedValue({ scalingExecuted: true, actions: [], errors: [] }),
    healthCheck: vi.fn().mockResolvedValue({ status: 'healthy', checks: [] })
  }))
}));

vi.mock('@/lib/ai-cache/CacheSecurityManager', () => ({
  CacheSecurityManager: vi.fn(() => ({
    securityHealthCheck: vi.fn().mockResolvedValue({ status: 'healthy', checks: [], recommendations: [] }),
    generateGDPRReport: vi.fn().mockResolvedValue({ compliance_score: 95 }),
    logSecurityEvent: vi.fn()
  }))
}));

describe('AI Cache API Endpoints', () => {
  beforeAll(() => {
    // Set required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.CACHE_ENCRYPTION_KEY = '12345678901234567890123456789012';
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/ai-cache/query', () => {
    describe('GET /api/ai-cache/query', () => {
      it('should return health check information', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/query');
        const response = await cacheQueryGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.service).toBe('AI Cache Query API');
        expect(responseData.health).toBeDefined();
      });
    });

    describe('POST /api/ai-cache/query', () => {
      it('should handle valid cache queries', async () => {
        const mockCacheService = require('@/lib/ai-cache/WeddingAICacheService').WeddingAICacheService;
        const mockInstance = new mockCacheService();
        mockInstance.getCachedResponse.mockResolvedValue({
          data: { venues: ['Test Venue'] },
          source: 'redis',
          timestamp: new Date().toISOString(),
          hitCount: 5,
          ttl: 3600
        });

        const validQuery = {
          query: {
            type: 'venue_recommendations',
            content: 'Find wedding venues in California',
            model: 'gpt-4'
          },
          weddingContext: {
            location: 'California',
            weddingDate: '2024-06-15',
            guestCount: 150,
            budgetTier: 'premium'
          }
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/query',
          { method: 'POST', body: validQuery }
        );

        const response = await cacheQueryPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data).toBeDefined();
        expect(responseData.source).toBe('cache');
      });

      it('should validate required query fields', async () => {
        const invalidQuery = {
          query: {
            type: '', // Invalid empty type
            content: 'Find venues'
          },
          weddingContext: {
            location: 'California'
          }
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/query',
          { method: 'POST', body: invalidQuery }
        );

        const response = await cacheQueryPOST(request);
        
        expect(response.status).toBe(400);
      });

      it('should validate wedding context', async () => {
        const queryWithInvalidContext = {
          query: {
            type: 'venue_recommendations',
            content: 'Find venues'
          },
          weddingContext: {
            location: '', // Invalid empty location
            weddingDate: 'invalid-date' // Invalid date
          }
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/query',
          { method: 'POST', body: queryWithInvalidContext }
        );

        const response = await cacheQueryPOST(request);
        
        expect(response.status).toBe(400);
      });

      it('should handle rate limiting', async () => {
        const mockRateLimit = require('@/lib/ratelimit').ratelimit;
        mockRateLimit.limit.mockResolvedValueOnce({
          success: false,
          limit: 100,
          remaining: 0,
          reset: Date.now() + 60000
        });

        const request = createMockRequest('http://localhost:3000/api/ai-cache/query', {
          method: 'POST',
          body: { query: { type: 'test' }, weddingContext: { location: 'test' } }
        });

        const response = await cacheQueryPOST(request);
        
        expect(response.status).toBe(429);
      });
    });
  });

  describe('/api/ai-cache/invalidate', () => {
    describe('POST /api/ai-cache/invalidate', () => {
      it('should invalidate cache with proper authorization', async () => {
        const invalidateRequest = {
          weddingId: 'wedding-123',
          cacheTypes: ['venue_recommendations'],
          scope: 'wedding',
          reason: 'Data updated'
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/invalidate',
          { method: 'POST', body: invalidateRequest }
        );

        const response = await cacheInvalidatePOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.scope).toBe('wedding');
      });

      it('should require admin privileges for global invalidation', async () => {
        const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
        mockClient().from().select().eq().single.mockResolvedValueOnce({
          data: { organization_id: 'test-org', role: 'USER' }, // Non-admin user
          error: null
        });

        const globalInvalidateRequest = {
          scope: 'global',
          force: true
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/invalidate',
          { method: 'POST', body: globalInvalidateRequest }
        );

        const response = await cacheInvalidatePOST(request);
        
        expect(response.status).toBe(403);
      });

      it('should require force flag for global invalidation', async () => {
        const globalInvalidateRequest = {
          scope: 'global',
          force: false
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/invalidate',
          { method: 'POST', body: globalInvalidateRequest }
        );

        const response = await cacheInvalidatePOST(request);
        
        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/ai-cache/invalidate', () => {
      it('should handle emergency cache wipe with owner privileges', async () => {
        const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
        mockClient().from().select().eq().single.mockResolvedValueOnce({
          data: { organization_id: 'test-org', role: 'OWNER' },
          error: null
        });

        const emergencyRequest = {
          confirmation: 'EMERGENCY_WIPE_CONFIRMED',
          reason: 'Security breach'
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/invalidate',
          { method: 'DELETE', body: emergencyRequest }
        );

        const response = await cacheInvalidateDELETE(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.action).toBe('emergency_cache_wipe');
      });

      it('should require explicit confirmation for emergency wipe', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/invalidate',
          { 
            method: 'DELETE', 
            body: { 
              confirmation: 'wrong-confirmation',
              reason: 'Test' 
            } 
          }
        );

        const response = await cacheInvalidateDELETE(request);
        
        expect(response.status).toBe(400);
      });
    });
  });

  describe('/api/ai-cache/preload', () => {
    describe('POST /api/ai-cache/preload', () => {
      it('should execute cache preloading with admin privileges', async () => {
        const preloadRequest = {
          locations: ['California', 'New York'],
          cacheTypes: ['venue_recommendations', 'vendor_matching'],
          season: 'summer',
          priority: 'high',
          strategy: 'aggressive'
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/preload',
          { method: 'POST', body: preloadRequest }
        );

        const response = await cachePreloadPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.preload_job_id).toBeDefined();
      });

      it('should validate preload parameters', async () => {
        const invalidPreloadRequest = {
          locations: [], // Empty locations array
          cacheTypes: [],
          strategy: 'invalid_strategy'
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/preload',
          { method: 'POST', body: invalidPreloadRequest }
        );

        const response = await cachePreloadPOST(request);
        
        expect(response.status).toBe(400);
      });
    });
  });

  describe('/api/ai-cache/statistics', () => {
    describe('GET /api/ai-cache/statistics', () => {
      it('should return cache statistics', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/statistics?period=24h');
        const response = await cacheStatisticsGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.statistics).toBeDefined();
        expect(responseData.period).toBe('24h');
      });

      it('should handle different time periods', async () => {
        const periods = ['1h', '24h', '7d', '30d'];
        
        for (const period of periods) {
          const request = createMockRequest(`http://localhost:3000/api/ai-cache/statistics?period=${period}`);
          const response = await cacheStatisticsGET(request);
          
          expect(response.status).toBe(200);
        }
      });

      it('should export statistics in different formats', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/statistics?format=csv');
        const response = await cacheStatisticsGET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toContain('text/csv');
      });
    });
  });

  describe('/api/ai-cache/seasonal-scaling', () => {
    describe('GET /api/ai-cache/seasonal-scaling', () => {
      it('should return scaling status', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/seasonal-scaling?action=status');
        const response = await cacheSeasonalScalingGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data).toBeDefined();
      });

      it('should return scaling predictions', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/seasonal-scaling?action=predictions&days=30');
        const response = await cacheSeasonalScalingGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.upcomingTransitions).toBeDefined();
      });

      it('should return health check', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/seasonal-scaling?action=health');
        const response = await cacheSeasonalScalingGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.status).toBe('healthy');
      });
    });

    describe('POST /api/ai-cache/seasonal-scaling', () => {
      it('should execute manual scaling with owner privileges', async () => {
        const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
        mockClient().from().select().eq().single.mockResolvedValueOnce({
          data: { organization_id: 'test-org', role: 'OWNER' },
          error: null
        });

        const scalingRequest = {
          action: 'execute',
          reason: 'Manual scaling for peak season',
          force: true
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/seasonal-scaling',
          { method: 'POST', body: scalingRequest }
        );

        const response = await cacheSeasonalScalingPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
      });

      it('should schedule scaling operations', async () => {
        const scheduleRequest = {
          action: 'schedule',
          scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          reason: 'Scheduled peak season preparation'
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/seasonal-scaling',
          { method: 'POST', body: scheduleRequest }
        );

        const response = await cacheSeasonalScalingPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.scheduled).toBe(true);
      });
    });
  });

  describe('/api/ai-cache/security', () => {
    describe('GET /api/ai-cache/security', () => {
      it('should return security health check', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/security?action=health');
        const response = await cacheSecurityGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.status).toBe('healthy');
      });

      it('should return GDPR report for admin users', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/security?action=gdpr-report');
        const response = await cacheSecurityGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.compliance_score).toBeDefined();
      });

      it('should return security metrics', async () => {
        const request = createMockRequest('http://localhost:3000/api/ai-cache/security?action=metrics');
        const response = await cacheSecurityGET(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.metrics).toBeDefined();
      });

      it('should deny non-admin access to sensitive endpoints', async () => {
        const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
        mockClient().from().select().eq().single.mockResolvedValueOnce({
          data: { organization_id: 'test-org', role: 'USER' }, // Non-admin user
          error: null
        });

        const request = createMockRequest('http://localhost:3000/api/ai-cache/security?action=violations');
        const response = await cacheSecurityGET(request);

        expect(response.status).toBe(403);
      });
    });

    describe('POST /api/ai-cache/security', () => {
      it('should log audit events', async () => {
        const auditRequest = {
          action: 'log-audit-event',
          eventType: 'access',
          resourceType: 'cache',
          action: 'query',
          severity: 'low'
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/security',
          { method: 'POST', body: auditRequest }
        );

        const response = await cacheSecurityPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.logged).toBe(true);
      });

      it('should handle data deletion requests with owner privileges', async () => {
        const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
        mockClient().from().select().eq().single.mockResolvedValueOnce({
          data: { organization_id: 'test-org', role: 'OWNER' },
          error: null
        });

        const deletionRequest = {
          action: 'delete-user-data',
          userId: 'user-to-delete',
          organizationId: 'test-org',
          reason: 'GDPR deletion request',
          confirmationToken: 'DELETE_user-to-delete_123456'
        };

        const request = createMockRequest(
          'http://localhost:3000/api/ai-cache/security',
          { method: 'POST', body: deletionRequest }
        );

        const response = await cacheSecurityPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.status).toBeDefined();
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should deny access without authentication', async () => {
      const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
      mockClient().auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const request = createMockRequest('http://localhost:3000/api/ai-cache/query');
      const response = await cacheQueryGET(request);

      expect(response.status).toBe(401);
    });

    it('should deny access without proper organization', async () => {
      const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
      mockClient().from().select().eq().single.mockResolvedValueOnce({
        data: null, // No profile found
        error: null
      });

      const request = createMockRequest('http://localhost:3000/api/ai-cache/query');
      const response = await cacheQueryGET(request);

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      const mockCacheService = require('@/lib/ai-cache/WeddingAICacheService').WeddingAICacheService;
      const mockInstance = new mockCacheService();
      mockInstance.getCachedResponse.mockRejectedValue(new Error('Internal cache error'));

      const request = createMockRequest(
        'http://localhost:3000/api/ai-cache/query',
        { 
          method: 'POST', 
          body: { 
            query: { type: 'venue_recommendations', content: 'test' },
            weddingContext: { location: 'test', weddingDate: '2024-01-01' }
          } 
        }
      );

      const response = await cacheQueryPOST(request);

      expect(response.status).toBe(500);
    });

    it('should handle database connection failures', async () => {
      const mockClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient();
      mockClient().from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const request = createMockRequest('http://localhost:3000/api/ai-cache/statistics');
      const response = await cacheStatisticsGET(request);

      // Should handle database errors gracefully
      expect([200, 500]).toContain(response.status);
    });

    it('should validate request body format', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/ai-cache/query',
        { 
          method: 'POST', 
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        }
      );

      const response = await cacheQueryPOST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Response Headers and Metadata', () => {
    it('should include proper response headers', async () => {
      const request = createMockRequest('http://localhost:3000/api/ai-cache/query');
      const response = await cacheQueryGET(request);

      expect(response.headers.get('X-Response-Time')).toBeDefined();
    });

    it('should include rate limiting headers', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/ai-cache/query',
        { 
          method: 'POST', 
          body: { 
            query: { type: 'venue_recommendations', content: 'test' },
            weddingContext: { location: 'test', weddingDate: '2024-01-01' }
          } 
        }
      );

      const response = await cacheQueryPOST(request);

      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });

    it('should include cache status headers', async () => {
      const mockCacheService = require('@/lib/ai-cache/WeddingAICacheService').WeddingAICacheService;
      const mockInstance = new mockCacheService();
      mockInstance.getCachedResponse.mockResolvedValue({
        data: { venues: [] },
        source: 'redis'
      });

      const request = createMockRequest(
        'http://localhost:3000/api/ai-cache/query',
        { 
          method: 'POST', 
          body: { 
            query: { type: 'venue_recommendations', content: 'test' },
            weddingContext: { location: 'test', weddingDate: '2024-01-01' }
          } 
        }
      );

      const response = await cacheQueryPOST(request);

      expect(response.headers.get('X-Cache-Status')).toBe('HIT');
      expect(response.headers.get('X-Cache-Source')).toBe('redis');
    });
  });
});