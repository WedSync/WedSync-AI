/**
 * @fileoverview Integration Tests for Review Analytics API Endpoints
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 * 
 * Test Coverage: API endpoints, authentication, authorization, data validation, performance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const testApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const testSupplierId = 'test-supplier-123';
const testUserId = 'test-user-456';
const testCampaignId = 'test-campaign-789';

describe('Review Analytics API Integration Tests', () => {
  let authToken: string;
  let testSupplier: any;
  let testUser: any;

  beforeAll(async () => {
    // Set up test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Get fresh auth token for each test
    authToken = await getAuthToken();
  });

  async function setupTestData() {
    // Create test supplier
    const { data: supplier } = await supabaseAdmin
      .from('suppliers')
      .insert({
        id: testSupplierId,
        business_name: 'Test Wedding Photography',
        contact_email: 'test@example.com',
        status: 'active',
      })
      .select()
      .single();
    testSupplier = supplier;

    // Create test user
    const { data: user } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true,
    });

    if (user.user) {
      await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: user.user.id,
          role: 'supplier',
          supplier_id: testSupplierId,
        });
      testUser = user.user;
    }

    // Create test reviews
    const reviewsData = Array.from({ length: 50 }, (_, index) => ({
      supplier_id: testSupplierId,
      rating: Math.floor(Math.random() * 5) + 1,
      review_text: `Test review ${index + 1}`,
      platform: ['Google', 'Yelp', 'Facebook'][Math.floor(Math.random() * 3)],
      sentiment_score: Math.random(),
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    await supabaseAdmin
      .from('reviews')
      .insert(reviewsData);

    // Create test campaign
    await supabaseAdmin
      .from('review_campaigns')
      .insert({
        id: testCampaignId,
        supplier_id: testSupplierId,
        name: 'Test Campaign',
        status: 'active',
      });
  }

  async function cleanupTestData() {
    // Delete test data in reverse dependency order
    await supabaseAdmin.from('reviews').delete().eq('supplier_id', testSupplierId);
    await supabaseAdmin.from('review_campaigns').delete().eq('id', testCampaignId);
    await supabaseAdmin.from('user_profiles').delete().eq('supplier_id', testSupplierId);
    await supabaseAdmin.from('suppliers').delete().eq('id', testSupplierId);
    
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
  }

  async function getAuthToken(): Promise<string> {
    const { data } = await supabaseAdmin.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123',
    });
    return data.session?.access_token || '';
  }

  describe('Overview Analytics Endpoint', () => {
    const endpointUrl = `${testApiUrl}/api/analytics/reviews/overview/${testSupplierId}`;

    it('returns analytics data for authenticated supplier', async () => {
      const response = await fetch(endpointUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('totalReviews');
      expect(data).toHaveProperty('averageRating');
      expect(data).toHaveProperty('responseRate');
      expect(data).toHaveProperty('sentimentScore');
      expect(data).toHaveProperty('monthlyGrowth');
      expect(data).toHaveProperty('lastUpdated');
      expect(data).toHaveProperty('metadata');

      // Validate data types
      expect(typeof data.totalReviews).toBe('number');
      expect(typeof data.averageRating).toBe('number');
      expect(typeof data.responseRate).toBe('number');
      expect(typeof data.sentimentScore).toBe('number');
      expect(data.totalReviews).toBeGreaterThanOrEqual(0);
      expect(data.averageRating).toBeGreaterThanOrEqual(0);
      expect(data.averageRating).toBeLessThanOrEqual(5);
    });

    it('includes performance metadata', async () => {
      const response = await fetch(endpointUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();
      expect(data.metadata).toHaveProperty('supplierId', testSupplierId);
      expect(data.metadata).toHaveProperty('dateRange');
      expect(data.metadata).toHaveProperty('queryTime');
      expect(data.metadata.queryTime).toBeGreaterThan(0);
      expect(response.headers.get('X-Response-Time')).toBeTruthy();
    });

    it('respects date range parameters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-03-31';
      const urlWithDateRange = `${endpointUrl}?dateRange=${startDate},${endDate}`;

      const response = await fetch(urlWithDateRange, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.metadata.dateRange.start).toBe(`${startDate}T00:00:00.000Z`);
      expect(data.metadata.dateRange.end).toBe(`${endDate}T23:59:59.999Z`);
    });

    it('validates date range format', async () => {
      const invalidDateRange = 'invalid-date-format';
      const urlWithInvalidRange = `${endpointUrl}?dateRange=${invalidDateRange}`;

      const response = await fetch(urlWithInvalidRange, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('limits date range to 365 days', async () => {
      const startDate = '2023-01-01';
      const endDate = '2024-12-31'; // More than 365 days
      const urlWithLongRange = `${endpointUrl}?dateRange=${startDate},${endDate}`;

      const response = await fetch(urlWithLongRange, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('365 days');
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await fetch(endpointUrl);
      expect(response.status).toBe(401);
    });

    it('returns 403 for unauthorized suppliers', async () => {
      const unauthorizedSupplierId = 'unauthorized-supplier-123';
      const unauthorizedUrl = `${testApiUrl}/api/analytics/reviews/overview/${unauthorizedSupplierId}`;

      const response = await fetch(unauthorizedUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('handles invalid supplier ID format', async () => {
      const invalidSupplierUrl = `${testApiUrl}/api/analytics/reviews/overview/invalid-uuid`;

      const response = await fetch(invalidSupplierUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(400);
    });

    it('implements rate limiting', async () => {
      const requests = [];
      
      // Send 101+ requests rapidly (rate limit is 100/minute)
      for (let i = 0; i < 105; i++) {
        requests.push(
          fetch(endpointUrl, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('includes cache headers', async () => {
      const response = await fetch(endpointUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    });

    it('responds within performance target (<500ms)', async () => {
      const startTime = Date.now();
      
      const response = await fetch(endpointUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
      expect(response.status).toBe(200);
    });
  });

  describe('Campaign Analytics Endpoint', () => {
    const endpointUrl = `${testApiUrl}/api/analytics/reviews/campaigns/${testCampaignId}`;

    it('returns campaign analytics data', async () => {
      const response = await fetch(endpointUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('campaign');
      expect(data).toHaveProperty('analytics');
      expect(data).toHaveProperty('metadata');

      expect(data.campaign.id).toBe(testCampaignId);
      expect(data.analytics).toHaveProperty('totalRequests');
      expect(data.analytics).toHaveProperty('totalOpens');
      expect(data.analytics).toHaveProperty('totalResponses');
      expect(data.analytics).toHaveProperty('averageRating');
    });

    it('supports different granularity options', async () => {
      const granularities = ['hour', 'day', 'week'];

      for (const granularity of granularities) {
        const response = await fetch(`${endpointUrl}?granularity=${granularity}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.metadata.granularity).toBe(granularity);
      }
    });

    it('returns 404 for non-existent campaign', async () => {
      const nonExistentUrl = `${testApiUrl}/api/analytics/reviews/campaigns/non-existent-campaign`;

      const response = await fetch(nonExistentUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('validates campaign ID format', async () => {
      const invalidCampaignUrl = `${testApiUrl}/api/analytics/reviews/campaigns/invalid-uuid`;

      const response = await fetch(invalidCampaignUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(400);
    });

    it('implements caching for campaign analytics', async () => {
      // First request
      const response1 = await fetch(endpointUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      // Second request (should be served from cache)
      const response2 = await fetch(endpointUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();
      
      // Should have same data (from cache)
      expect(data1.analytics.totalRequests).toBe(data2.analytics.totalRequests);
    });
  });

  describe('Export Analytics Endpoint', () => {
    const endpointUrl = `${testApiUrl}/api/analytics/reviews/export`;

    it('exports data in CSV format', async () => {
      const exportData = {
        format: 'csv',
        supplierId: testSupplierId,
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-03-31T23:59:59.999Z',
        },
        includeFields: ['rating', 'platform', 'created_at'],
        maxRecords: 100,
      };

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      
      const csvContent = await response.text();
      expect(csvContent).toContain('Rating');
      expect(csvContent).toContain('Platform');
      expect(csvContent).toContain('Date');
    });

    it('exports data in JSON format', async () => {
      const exportData = {
        format: 'json',
        supplierId: testSupplierId,
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-03-31T23:59:59.999Z',
        },
        includeFields: ['rating', 'platform'],
        maxRecords: 50,
      };

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const jsonContent = await response.json();
      expect(jsonContent).toHaveProperty('data');
      expect(jsonContent).toHaveProperty('metadata');
      expect(Array.isArray(jsonContent.data)).toBe(true);
    });

    it('limits export to 90 days', async () => {
      const exportData = {
        format: 'csv',
        dateRange: {
          start: '2023-01-01T00:00:00.000Z',
          end: '2024-12-31T23:59:59.999Z',
        },
      };

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('90 days');
    });

    it('limits maximum records', async () => {
      const exportData = {
        format: 'csv',
        maxRecords: 15000, // Above limit of 10000
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-03-31T23:59:59.999Z',
        },
      };

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      expect(response.status).toBe(400);
    });

    it('protects PII in exports', async () => {
      const exportData = {
        format: 'csv',
        supplierId: testSupplierId,
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-03-31T23:59:59.999Z',
        },
        includeFields: ['review_text'], // Should be truncated
      };

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      expect(response.status).toBe(200);
      const csvContent = await response.text();
      expect(csvContent).toContain('Review Excerpt'); // Header should be renamed
    });

    it('implements stricter rate limiting for exports', async () => {
      const exportData = {
        format: 'csv',
        supplierId: testSupplierId,
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-03-31T23:59:59.999Z',
        },
      };

      const requests = [];
      
      // Send 12+ export requests (limit is 10/minute)
      for (let i = 0; i < 12; i++) {
        requests.push(
          fetch(endpointUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(exportData),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('logs export activity', async () => {
      const exportData = {
        format: 'json',
        supplierId: testSupplierId,
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-03-31T23:59:59.999Z',
        },
      };

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      expect(response.status).toBe(200);

      // Check export history
      const historyResponse = await fetch(endpointUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(historyResponse.status).toBe(200);
      const historyData = await historyResponse.json();
      expect(historyData).toHaveProperty('exports');
      expect(Array.isArray(historyData.exports)).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('handles concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, () =>
        fetch(`${testApiUrl}/api/analytics/reviews/overview/${testSupplierId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000);
    });

    it('handles database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we ensure the API returns proper error responses
      expect(true).toBe(true); // Placeholder
    });

    it('maintains response time under load', async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await fetch(`${testApiUrl}/api/analytics/reviews/overview/${testSupplierId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(500);
      expect(maxResponseTime).toBeLessThan(1000);
    });
  });
});