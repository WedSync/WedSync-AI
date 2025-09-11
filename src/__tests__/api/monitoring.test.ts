import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET as metricsGET,
  POST as metricsPOST,
} from '@/app/api/monitoring/metrics/route';
import {
  GET as alertsGET,
  POST as alertsPOST,
} from '@/app/api/monitoring/alerts/route';
import { GET as healthGET } from '@/app/api/monitoring/health/route';
import { POST as webhookPOST } from '@/app/api/monitoring/webhook/route';

// Helper functions to reduce function nesting - REFACTORED TO MEET 4-LEVEL LIMIT

/**
 * Creates mock Supabase query builder - EXTRACTED TO REDUCE NESTING
 */
function createMockSupabaseQueryBuilder() {
  return {
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null }),
    eq: function () { return this; },
    order: function () { return this; },
    limit: function () { return this; },
  };
}

/**
 * Creates mock Supabase client - EXTRACTED TO REDUCE NESTING
 */
function createMockSupabaseClient() {
  return {
    from: (table: string) => createMockSupabaseQueryBuilder(),
  };
}

/**
 * Creates POST request for metrics endpoint - EXTRACTED TO REDUCE NESTING
 */
function createMetricsPostRequest(metricData: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/monitoring/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metricData),
  });
}

/**
 * Creates POST request for alerts endpoint - EXTRACTED TO REDUCE NESTING
 */
function createAlertsPostRequest(alertData: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/monitoring/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData),
  });
}

/**
 * Creates webhook request with optional signature - EXTRACTED TO REDUCE NESTING
 */
function createWebhookRequest(payload: any, signature?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (signature) {
    headers['X-Provider-Signature'] = signature;
  }

  return new NextRequest('http://localhost:3000/api/monitoring/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Generates concurrent metric test data - EXTRACTED TO REDUCE NESTING
 */
function generateConcurrentMetricData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    service_name: 'concurrent-test',
    metric_name: 'concurrent_metric',
    metric_value: i,
    metric_type: 'counter',
  }));
}

/**
 * Generates rate limit test data - EXTRACTED TO REDUCE NESTING
 */
function generateRateLimitTestData(count: number) {
  const baseMetric = {
    service_name: 'rate-limit-test',
    metric_name: 'test_metric',
    metric_value: 100,
    metric_type: 'gauge',
  };
  
  return Array(count).fill(baseMetric);
}

/**
 * Executes multiple metric POST requests - EXTRACTED TO REDUCE NESTING
 */
async function executeMultipleMetricRequests(metricDataArray: any[], expectedSuccessStatus = 201) {
  const requests = metricDataArray.map(data => createMetricsPostRequest(data));
  const responses = await Promise.all(requests.map(req => metricsPOST(req)));
  
  return {
    responses,
    successful: responses.filter(r => r.status === expectedSuccessStatus),
    failed: responses.filter(r => r.status !== expectedSuccessStatus),
  };
}


/**
 * Mocks database error for testing - EXTRACTED TO REDUCE NESTING
 */
function mockDatabaseError(errorMessage: string) {
  const mockSupabase = require('@/lib/supabase');
  mockSupabase.createClient.mockReturnValueOnce({
    from: () => ({
      select: () => Promise.reject(new Error(errorMessage)),
    }),
  });
}

/**
 * Creates webhook POST request - EXTRACTED TO REDUCE NESTING
 */
function createWebhookPostRequest(payload: any, signature = 'valid-signature'): NextRequest {
  return new NextRequest('http://localhost:3000/api/monitoring/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Provider-Signature': signature,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Tests multiple webhook providers with detailed results - EXTRACTED TO REDUCE NESTING
 */
async function testMultipleWebhookProviders(providers: any[]) {
  const results = [];
  
  for (const payload of providers) {
    const request = createWebhookPostRequest(payload);
    const response = await webhookPOST(request);
    
    results.push({
      payload,
      response,
      success: response.status === 200
    });
  }
  
  return results;
}

/**
 * Creates multiple metric requests for rate limiting tests - EXTRACTED TO REDUCE NESTING
 */
function createBulkMetricRequests(metricData: any, count: number): Promise<Response>[] {
  return Array.from({ length: count }, () =>
    metricsPOST(createMetricsPostRequest(metricData))
  );
}

// Mock auth and database
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() =>
    Promise.resolve({
      id: 'test-user-id',
      organization_id: 'test-org-id',
    }),
  ),
}));

// Use extracted helper function - REDUCED NESTING FROM 5 TO 2 LEVELS
vi.mock('@/lib/supabase', () => ({
  createClient: createMockSupabaseClient,
}));

describe('Monitoring API Endpoints', () => {
  describe('/api/monitoring/metrics', () => {
    describe('GET', () => {
      it('should return performance metrics for organization', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/metrics?service=web-app&timeframe=1h',
        );

        const response = await metricsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('metrics');
        expect(data).toHaveProperty('aggregations');
      });

      it('should validate query parameters', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/metrics?timeframe=invalid',
        );

        const response = await metricsGET(request);

        expect(response.status).toBe(400);
      });

      it('should filter metrics by service and time range', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/metrics?service=api-gateway&timeframe=24h&metric=response_time',
        );

        const response = await metricsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.filters).toMatchObject({
          service: 'api-gateway',
          timeframe: '24h',
          metric: 'response_time',
        });
      });

      it('should return wedding day metrics when requested', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/metrics?wedding_day=true',
        );

        const response = await metricsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.filters.wedding_day).toBe(true);
      });
    });

    describe('POST', () => {
      it('should accept single performance metric', async () => {
        const metricData = {
          service_name: 'web-app',
          metric_name: 'response_time',
          metric_value: 150.5,
          metric_type: 'timer',
          unit: 'ms',
          tags: { endpoint: '/api/clients' },
        };

        // REFACTORED: Reduced nesting using helper function
        const request = createMetricsPostRequest(metricData);

        const response = await metricsPOST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty('success', true);
      });

      it('should accept batch performance metrics', async () => {
        const batchMetrics = {
          metrics: [
            {
              service_name: 'api-gateway',
              metric_name: 'request_count',
              metric_value: 1500,
              metric_type: 'counter',
            },
            {
              service_name: 'database',
              metric_name: 'query_time',
              metric_value: 45.2,
              metric_type: 'timer',
              unit: 'ms',
            },
          ],
        };

        // REFACTORED: Reduced nesting using helper function  
        const request = createMetricsPostRequest(batchMetrics);

        const response = await metricsPOST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.inserted_count).toBe(2);
      });

      it('should validate required metric fields', async () => {
        const invalidMetric = {
          service_name: 'test',
          // Missing metric_name and metric_value
          metric_type: 'gauge',
        };

        // REFACTORED: Reduced nesting using helper function
        const request = createMetricsPostRequest(invalidMetric);

        const response = await metricsPOST(request);

        expect(response.status).toBe(400);
      });

      it('should handle wedding context in metrics', async () => {
        const weddingMetric = {
          service_name: 'photo-upload',
          metric_name: 'processing_time',
          metric_value: 2500,
          metric_type: 'timer',
          unit: 'ms',
          wedding_context: {
            is_wedding_day: true,
            wedding_date: '2025-06-15',
            vendor_type: 'photographer',
          },
        };

        // REFACTORED: Reduced nesting using helper function
        const request = createMetricsPostRequest(weddingMetric);

        const response = await metricsPOST(request);

        expect(response.status).toBe(201);
      });
    });
  });

  describe('/api/monitoring/alerts', () => {
    describe('GET', () => {
      it('should return configured alerts for organization', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/alerts',
        );

        const response = await alertsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('alerts');
      });

      it('should filter alerts by status', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/alerts?status=active',
        );

        const response = await alertsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.filters.status).toBe('active');
      });

      it('should return alert incidents when requested', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/alerts?include_incidents=true',
        );

        const response = await alertsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('incidents');
      });
    });

    describe('POST', () => {
      it('should create new performance alert', async () => {
        const alertConfig = {
          alert_name: 'High API Response Time',
          description: 'Alert when API response time exceeds 500ms',
          metric_pattern: 'api.response_time.*',
          threshold_value: 500,
          comparison_operator: 'gt',
          severity: 'warning',
          notification_channels: ['email'],
          wedding_day_override: true,
          wedding_day_threshold_value: 200,
        };

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/alerts',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertConfig),
          },
        );

        const response = await alertsPOST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty('alert_id');
      });

      it('should validate alert configuration', async () => {
        const invalidAlert = {
          alert_name: 'Test Alert',
          // Missing required fields
          threshold_value: 'invalid',
        };

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/alerts',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidAlert),
          },
        );

        const response = await alertsPOST(request);

        expect(response.status).toBe(400);
      });

      it('should prevent duplicate alert names', async () => {
        const alertConfig = {
          alert_name: 'Duplicate Alert Test',
          metric_pattern: 'test.*',
          threshold_value: 100,
          comparison_operator: 'gt',
          severity: 'warning',
        };

        const request1 = new NextRequest(
          'http://localhost:3000/api/monitoring/alerts',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertConfig),
          },
        );

        const request2 = new NextRequest(
          'http://localhost:3000/api/monitoring/alerts',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertConfig),
          },
        );

        await alertsPOST(request1);
        const response2 = await alertsPOST(request2);

        expect(response2.status).toBe(409); // Conflict
      });
    });
  });

  describe('/api/monitoring/health', () => {
    describe('GET', () => {
      it('should return service health status', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/health',
        );

        const response = await healthGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('services');
        expect(data).toHaveProperty('overall_status');
      });

      it('should filter by service type', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/health?type=payment',
        );

        const response = await healthGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.filters.type).toBe('payment');
      });

      it('should prioritize wedding-critical services', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/health?wedding_critical=true',
        );

        const response = await healthGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.filters.wedding_critical).toBe(true);
      });

      it('should include service health history', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/health?include_history=true',
        );

        const response = await healthGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.services[0]).toHaveProperty('status_history');
      });
    });
  });

  describe('/api/monitoring/webhook', () => {
    describe('POST', () => {
      it('should accept external monitoring webhooks', async () => {
        const webhookPayload = {
          provider: 'datadog',
          event_type: 'alert_triggered',
          alert_name: 'High CPU Usage',
          severity: 'critical',
          timestamp: new Date().toISOString(),
          data: {
            service: 'web-app',
            metric: 'cpu_usage',
            value: 85.5,
            threshold: 80,
          },
        };

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/webhook',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Provider-Signature': 'test-signature',
            },
            body: JSON.stringify(webhookPayload),
          },
        );

        const response = await webhookPOST(request);

        expect(response.status).toBe(200);
      });

      it('should validate webhook signatures', async () => {
        const webhookPayload = {
          provider: 'newrelic',
          event_type: 'alert_resolved',
          alert_name: 'Database Connection Pool',
          severity: 'warning',
        };

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/webhook',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Missing signature header
            body: JSON.stringify(webhookPayload),
          },
        );

        const response = await webhookPOST(request);

        expect(response.status).toBe(401);
      });

      it('should handle different provider webhook formats', async () => {
        const providers = [
          {
            provider: 'prometheus',
            alerts: [
              {
                status: 'firing',
                labels: { alertname: 'HighResponseTime', service: 'api' },
                annotations: { summary: 'API response time is high' },
              },
            ],
          },
          {
            provider: 'grafana',
            ruleName: 'Database Query Slow',
            state: 'alerting',
            evalMatches: [{ value: 150, metric: 'query_time' }],
          },
        ];

        // REFACTORED: Reduced from 6 levels to 4 levels using helper
        const results = await testMultipleWebhookProviders(providers);
        
        results.forEach(result => {
          expect(result.response.status).toBe(200);
        });
      });

      it('should create incidents from webhook alerts', async () => {
        const criticalAlert = {
          provider: 'pingdom',
          event_type: 'downtime_detected',
          check_name: 'Wedding Photo Upload API',
          status: 'down',
          response_time: null,
          error: 'Connection timeout',
          timestamp: new Date().toISOString(),
        };

        const request = new NextRequest(
          'http://localhost:3000/api/monitoring/webhook',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Provider-Signature': 'pingdom-signature',
            },
            body: JSON.stringify(criticalAlert),
          },
        );

        const response = await webhookPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('incident_created', true);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all monitoring endpoints', async () => {
      // Mock unauthenticated user
      const mockAuth = require('@/lib/auth');
      mockAuth.getCurrentUser.mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/metrics',
      );
      const response = await metricsGET(request);

      expect(response.status).toBe(401);
    });

    it('should enforce organization-level access', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/metrics?organization_id=different-org',
      );
      const response = await metricsGET(request);

      // Should not allow access to different organization's data
      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on metric ingestion', async () => {
      const metricData = {
        service_name: 'rate-limit-test',
        metric_name: 'test_metric',
        metric_value: 100,
        metric_type: 'gauge',
      };

      // REFACTORED: Reduced nesting from 5 levels to 3 levels using helper
      const requests = createBulkMetricRequests(metricData, 101);

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/metrics',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid json ',
        },
      );

      const response = await metricsPOST(request);

      expect(response.status).toBe(400);
    });

    it('should handle database connection errors', async () => {
      // Mock database error
      const mockSupabase = require('@/lib/supabase');
      mockSupabase.createClient.mockReturnValueOnce({
        from: () => ({
          select: () => Promise.reject(new Error('Database connection failed')),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/metrics',
      );
      const response = await metricsGET(request);

      expect(response.status).toBe(500);
    });

    it('should provide helpful error messages', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/alerts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalid: 'data' }),
        },
      );

      const response = await alertsPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
    });
  });

  describe('Performance Requirements', () => {
    it('should respond to health checks within 100ms', async () => {
      const startTime = Date.now();

      const request = new NextRequest(
        'http://localhost:3000/api/monitoring/health',
      );
      const response = await healthGET(request);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle concurrent metric ingestion', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => {
        const metricData = {
          service_name: 'concurrent-test',
          metric_name: 'concurrent_metric',
          metric_value: i,
          metric_type: 'counter',
        };

        return metricsPOST(
          new NextRequest('http://localhost:3000/api/monitoring/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metricData),
          }),
        );
      });

      const responses = await Promise.all(concurrentRequests);
      const successfulResponses = responses.filter((r) => r.status === 201);

      expect(successfulResponses.length).toBe(50);
    });
  });
});
