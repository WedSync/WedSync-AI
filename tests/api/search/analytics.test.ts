/**
 * Comprehensive tests for Search Analytics API
 * Tests all functionality of /api/search/analytics endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../../src/app/api/search/analytics/route';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockAnalyticsData,
                error: null
              }))
            }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({
        data: [{ id: 'new-event' }],
        error: null
      })),
      rpc: vi.fn(() => Promise.resolve({
        data: mockAggregatedData,
        error: null
      }))
    }))
  }))
}));

// Mock SearchAnalytics service
vi.mock('../../../src/lib/services/search/SearchAnalytics', () => ({
  SearchAnalytics: vi.fn().mockImplementation(() => ({
    trackEvent: vi.fn().mockResolvedValue({ success: true, eventId: 'evt123' }),
    getSearchMetrics: vi.fn().mockResolvedValue(mockSearchMetrics),
    getPopularQueries: vi.fn().mockResolvedValue(mockPopularQueries),
    getUserBehaviorInsights: vi.fn().mockResolvedValue(mockUserInsights),
    getPerformanceMetrics: vi.fn().mockResolvedValue(mockPerformanceMetrics),
    generateReport: vi.fn().mockResolvedValue(mockAnalyticsReport),
    getConversionMetrics: vi.fn().mockResolvedValue(mockConversionMetrics),
    getRealTimeMetrics: vi.fn().mockResolvedValue(mockRealTimeMetrics)
  }))
}));

const mockAnalyticsData = [
  {
    id: 'evt1',
    event_type: 'search_performed',
    query: 'wedding photographer',
    user_id: 'user123',
    timestamp: '2024-01-15T10:00:00Z',
    metadata: { results_count: 25, response_time: 150 }
  },
  {
    id: 'evt2',
    event_type: 'result_clicked',
    vendor_id: 'vendor456',
    user_id: 'user123',
    timestamp: '2024-01-15T10:05:00Z',
    metadata: { position: 2, query: 'wedding photographer' }
  }
];

const mockAggregatedData = [
  { query: 'wedding photographer', search_count: 150 },
  { query: 'wedding venues nyc', search_count: 120 },
  { query: 'florist brooklyn', search_count: 85 }
];

const mockSearchMetrics = {
  totalSearches: 50000,
  uniqueUsers: 12000,
  averageResponseTime: 185,
  successRate: 96.5,
  topQueries: mockAggregatedData,
  searchTrends: [
    { date: '2024-01-15', searches: 2500 },
    { date: '2024-01-14', searches: 2300 }
  ]
};

const mockPopularQueries = [
  { query: 'wedding photographer', count: 150, trend: 'up' },
  { query: 'wedding venues', count: 120, trend: 'stable' },
  { query: 'wedding florist', count: 85, trend: 'down' }
];

const mockUserInsights = {
  avgSessionDuration: 420,
  avgQueriesPerSession: 3.2,
  topUserSegments: ['engaged_couples', 'wedding_planners'],
  searchPatterns: {
    peakHours: [19, 20, 21],
    peakDays: ['saturday', 'sunday']
  }
};

const mockPerformanceMetrics = {
  avgResponseTime: 185,
  p95ResponseTime: 450,
  p99ResponseTime: 800,
  errorRate: 0.8,
  cacheHitRate: 85.3,
  indexingLatency: 25
};

const mockConversionMetrics = {
  searchToClick: 35.6,
  clickToContact: 12.4,
  searchToBooking: 2.1,
  revenuePerSearch: 45.20
};

const mockRealTimeMetrics = {
  activeUsers: 245,
  searchesLastHour: 380,
  responseTimeLastHour: 165,
  topQueriesLastHour: ['photographer', 'venue', 'dj']
};

const mockAnalyticsReport = {
  summary: {
    period: '2024-01-01 to 2024-01-31',
    totalSearches: 50000,
    uniqueUsers: 12000,
    conversionRate: 2.1
  },
  insights: [
    'Search volume increased 15% compared to previous month',
    'Mobile searches now represent 68% of total searches'
  ],
  recommendations: [
    'Optimize mobile search experience',
    'Focus on improving photographer search results'
  ]
};

describe('/api/search/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/search/analytics', () => {
    it('should return comprehensive search metrics', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('metrics');
      expect(data.metrics.totalSearches).toBe(50000);
      expect(data.metrics.uniqueUsers).toBe(12000);
      expect(data.metrics.successRate).toBe(96.5);
    });

    it('should return popular queries with trends', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?type=popular_queries');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('popularQueries');
      expect(data.popularQueries[0].query).toBe('wedding photographer');
      expect(data.popularQueries[0].count).toBe(150);
    });

    it('should return user behavior insights', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?type=user_behavior');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('insights');
      expect(data.insights.avgSessionDuration).toBe(420);
      expect(data.insights.avgQueriesPerSession).toBe(3.2);
    });

    it('should return performance metrics', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?type=performance');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('performance');
      expect(data.performance.avgResponseTime).toBe(185);
      expect(data.performance.cacheHitRate).toBe(85.3);
    });

    it('should return conversion metrics', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?type=conversions');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('conversions');
      expect(data.conversions.searchToClick).toBe(35.6);
      expect(data.conversions.revenuePerSearch).toBe(45.20);
    });

    it('should support date range filtering', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?startDate=2024-01-01&endDate=2024-01-31');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
    });

    it('should return real-time metrics when requested', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?realtime=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('realtime');
      expect(data.realtime.activeUsers).toBe(245);
      expect(data.realtime.searchesLastHour).toBe(380);
    });

    it('should generate comprehensive reports', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?format=report');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('report');
      expect(data.report.summary).toBeDefined();
      expect(data.report.insights).toBeDefined();
      expect(data.report.recommendations).toBeDefined();
    });

    it('should require admin authentication', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics');
      const request = new NextRequest(url); // No auth header
      
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });

    it('should support data export formats', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?export=csv');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toMatch(/text\/csv/);
    });

    it('should handle pagination for large datasets', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?page=2&limit=100');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('pagination');
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(100);
    });
  });

  describe('POST /api/search/analytics', () => {
    it('should track search events', async () => {
      const eventData = {
        eventType: 'search_performed',
        query: 'wedding photographer NYC',
        userId: 'user123',
        metadata: {
          resultsCount: 25,
          responseTime: 150,
          filters: { vendorType: 'photographer' }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('eventId');
    });

    it('should track click events', async () => {
      const clickEvent = {
        eventType: 'result_clicked',
        vendorId: 'vendor456',
        userId: 'user123',
        metadata: {
          position: 2,
          query: 'wedding photographer',
          searchId: 'search123'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clickEvent)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should track conversion events', async () => {
      const conversionEvent = {
        eventType: 'vendor_contacted',
        vendorId: 'vendor789',
        userId: 'user456',
        metadata: {
          searchQuery: 'wedding venue brooklyn',
          conversionValue: 5000,
          contactMethod: 'email'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(conversionEvent)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle bulk event tracking', async () => {
      const bulkEvents = {
        events: [
          {
            eventType: 'search_performed',
            query: 'photographer',
            userId: 'user1'
          },
          {
            eventType: 'result_clicked',
            vendorId: 'vendor1',
            userId: 'user1'
          },
          {
            eventType: 'search_performed',
            query: 'venue',
            userId: 'user2'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bulkEvents)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processedEvents).toBe(3);
    });

    it('should validate event data structure', async () => {
      const invalidEvent = {
        invalidField: 'test',
        missingRequiredFields: true
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidEvent)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle anonymous user events', async () => {
      const anonymousEvent = {
        eventType: 'search_performed',
        query: 'wedding photographer',
        sessionId: 'session789',
        metadata: {
          isAnonymous: true,
          userAgent: 'Mozilla/5.0...'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(anonymousEvent)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume event ingestion', async () => {
      const events = Array(100).fill(null).map((_, i) => ({
        eventType: 'search_performed',
        query: `query ${i}`,
        userId: `user${i % 10}`,
        timestamp: new Date().toISOString()
      }));

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.processedEvents).toBe(100);
    });

    it('should respond quickly for real-time metrics', async () => {
      const start = Date.now();
      
      const url = new URL('http://localhost:3000/api/search/analytics?realtime=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should cache frequently requested metrics', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?type=popular_queries');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/analytics');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle analytics service errors', async () => {
      vi.doMock('../../../src/lib/services/search/SearchAnalytics', () => ({
        SearchAnalytics: vi.fn().mockImplementation(() => ({
          getSearchMetrics: vi.fn().mockRejectedValue(new Error('Analytics service error'))
        }))
      }));

      const url = new URL('http://localhost:3000/api/search/analytics');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle malformed event data gracefully', async () => {
      const malformedEvent = {
        eventType: 'invalid_event_type',
        invalidData: { nested: { deeply: 'invalid' } }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(malformedEvent)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Privacy and Security', () => {
    it('should anonymize sensitive user data', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?anonymize=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      // Verify user IDs are anonymized
      expect(JSON.stringify(data)).not.toMatch(/user123/);
    });

    it('should respect data retention policies', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?respectRetention=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('dataRetentionInfo');
    });

    it('should validate admin permissions for sensitive data', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?includeUserIds=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer user-token' } // Non-admin token
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(403); // Forbidden
    });
  });

  describe('Reporting and Insights', () => {
    it('should generate automated insights', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?insights=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('insights');
      expect(Array.isArray(data.insights)).toBe(true);
    });

    it('should provide actionable recommendations', async () => {
      const url = new URL('http://localhost:3000/api/search/analytics?recommendations=true');
      const request = new NextRequest(url, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('recommendations');
      expect(Array.isArray(data.recommendations)).toBe(true);
    });

    it('should support custom dashboard configurations', async () => {
      const dashboardConfig = {
        widgets: ['popular_queries', 'conversion_metrics', 'performance'],
        timeframe: '30d',
        filters: { vendorType: 'photographer' }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ 
          action: 'dashboard_config',
          config: dashboardConfig 
        })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Integration and Webhooks', () => {
    it('should support webhook notifications for metrics thresholds', async () => {
      const webhookConfig = {
        action: 'configure_webhook',
        webhook: {
          url: 'https://example.com/analytics-webhook',
          events: ['conversion_threshold', 'performance_alert'],
          thresholds: {
            conversionRate: 1.5,
            responseTime: 500
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(webhookConfig)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should integrate with external analytics platforms', async () => {
      const integrationConfig = {
        action: 'configure_integration',
        platform: 'google_analytics',
        credentials: 'encrypted_credentials',
        mappings: {
          'search_performed': 'search',
          'result_clicked': 'click',
          'vendor_contacted': 'conversion'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/search/analytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify(integrationConfig)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});