/**
 * WS-241: AI Caching Strategy System - API Integration Tests
 * Team D: AI/ML Engineering Implementation
 *
 * API endpoint tests for the AI caching system
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';

// Import API routes
import {
  POST as predictPost,
  GET as predictGet,
} from '@/app/api/ai-cache/predict/route';
import {
  POST as optimizePost,
  PUT as optimizeBatch,
} from '@/app/api/ai-cache/optimize/route';
import {
  GET as metricsGet,
  HEAD as metricsHealth,
  POST as metricsPost,
} from '@/app/api/ai-cache/metrics/route';

// Mock request data
const mockWeddingContext = {
  wedding_id: 'test-wedding-123',
  couple_id: 'test-couple-456',
  wedding_date: '2024-08-15T00:00:00.000Z',
  location: {
    city: 'San Francisco',
    state: 'California',
    country: 'USA',
    venue: 'Golden Gate Park',
  },
  budget_range: 'high',
  wedding_style: 'modern',
  guest_count: 150,
  current_planning_stage: 'vendor_booking',
  cultural_preferences: ['American', 'Italian'],
  preferences: {
    photography_style: 'candid',
    music_genre: 'jazz',
  },
  timezone: 'America/Los_Angeles',
};

const mockQuery =
  'What are the best photographers for outdoor summer weddings?';
const mockResponse =
  'For outdoor summer weddings, consider photographers who specialize in natural light photography and have experience with golden hour shoots.';

describe('AI Cache API Integration Tests', () => {
  describe('/api/ai-cache/predict', () => {
    it('should handle valid POST requests for query prediction', async () => {
      const requestBody = {
        context: mockWeddingContext,
        recent_queries: [mockQuery],
        limit: 5,
        include_hit_probability: true,
        preload_high_confidence: false,
      };

      const request = new NextRequest('http://localhost/api/ai-cache/predict', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await predictPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('predictions');
      expect(data.data).toHaveProperty('metadata');
      expect(data).toHaveProperty('performance');
      expect(Array.isArray(data.data.predictions)).toBe(true);
      expect(data.data.metadata.total_predictions).toBeGreaterThan(0);
    });

    it('should handle GET requests for quick predictions', async () => {
      const url =
        'http://localhost/api/ai-cache/predict?wedding_id=test-123&couple_id=test-456';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await predictGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('predictions');
      expect(data.data).toHaveProperty('note');
      expect(Array.isArray(data.data.predictions)).toBe(true);
    });

    it('should return 400 for invalid POST data', async () => {
      const invalidRequestBody = {
        context: {
          ...mockWeddingContext,
          budget_range: 'invalid_range', // Invalid enum value
        },
      };

      const request = new NextRequest('http://localhost/api/ai-cache/predict', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await predictPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
      expect(data).toHaveProperty('details');
    });

    it('should return 400 for missing required GET parameters', async () => {
      const url = 'http://localhost/api/ai-cache/predict?wedding_id=test-123';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await predictGet(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('couple_id are required');
    });
  });

  describe('/api/ai-cache/optimize', () => {
    it('should handle valid POST requests for response optimization', async () => {
      const requestBody = {
        query: mockQuery,
        response: mockResponse,
        context: mockWeddingContext,
        optimization_options: {
          enhance_cultural_sensitivity: true,
          add_budget_context: true,
          include_seasonal_advice: true,
        },
        return_cache_decision: true,
        return_quality_metrics: true,
      };

      const request = new NextRequest(
        'http://localhost/api/ai-cache/optimize',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await optimizePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('original_response');
      expect(data.data).toHaveProperty('optimized_response');
      expect(data.data).toHaveProperty('quality_assessment');
      expect(data.data).toHaveProperty('cache_decision');
      expect(data.data).toHaveProperty('improvements_applied');
      expect(data.data).toHaveProperty('optimization_metrics');
      expect(data.data.original_response).toBe(mockResponse);
      expect(data.data.optimized_response.length).toBeGreaterThan(
        mockResponse.length,
      );
    });

    it('should handle batch optimization requests via PUT', async () => {
      const batchRequestBody = {
        requests: [
          {
            query: mockQuery,
            response: mockResponse,
            context: mockWeddingContext,
          },
          {
            query: 'What venues should I consider?',
            response: 'Consider venues that match your style and budget.',
            context: mockWeddingContext,
          },
        ],
        parallel_processing: true,
      };

      const request = new NextRequest(
        'http://localhost/api/ai-cache/optimize',
        {
          method: 'PUT',
          body: JSON.stringify(batchRequestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await optimizeBatch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('results');
      expect(data.data).toHaveProperty('summary');
      expect(Array.isArray(data.data.results)).toBe(true);
      expect(data.data.results).toHaveLength(2);
      expect(data.data.summary.total_requests).toBe(2);
    });

    it('should return 400 for missing response in optimization request', async () => {
      const invalidRequestBody = {
        query: mockQuery,
        context: mockWeddingContext,
        // Missing 'response' field
      };

      const request = new NextRequest(
        'http://localhost/api/ai-cache/optimize',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await optimizePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should enforce batch size limits', async () => {
      const largeBatchRequestBody = {
        requests: Array(15).fill({
          // Over the limit of 10
          query: mockQuery,
          response: mockResponse,
          context: mockWeddingContext,
        }),
        parallel_processing: true,
      };

      const request = new NextRequest(
        'http://localhost/api/ai-cache/optimize',
        {
          method: 'PUT',
          body: JSON.stringify(largeBatchRequestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await optimizeBatch(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('/api/ai-cache/metrics', () => {
    it('should handle GET requests for detailed metrics', async () => {
      const url =
        'http://localhost/api/ai-cache/metrics?timeframe=24h&include_quality=true&format=detailed';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await metricsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('performance_metrics');
      expect(data.data).toHaveProperty('quality_dashboard');
      expect(data.data).toHaveProperty('system_health');
      expect(data.data).toHaveProperty('model_performance');
      expect(data.metadata).toHaveProperty('timeframe');
      expect(data.metadata.timeframe).toBe('24h');
    });

    it('should handle GET requests for summary metrics', async () => {
      const url = 'http://localhost/api/ai-cache/metrics?format=summary';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await metricsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('overall_health');
      expect(data.data).toHaveProperty('key_metrics');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('last_updated');
      expect(data.data.key_metrics).toHaveProperty('cache_hit_rate');
      expect(data.data.key_metrics).toHaveProperty('quality_score');
    });

    it('should handle GET requests for dashboard format', async () => {
      const url = 'http://localhost/api/ai-cache/metrics?format=dashboard';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await metricsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('health_overview');
      expect(data.data).toHaveProperty('real_time_metrics');
      expect(data.data).toHaveProperty('quality_metrics');
      expect(data.data).toHaveProperty('active_alerts');
      expect(data.data).toHaveProperty('recommendations');
    });

    it('should handle HEAD requests for health checks', async () => {
      const request = new NextRequest('http://localhost/api/ai-cache/metrics', {
        method: 'HEAD',
      });

      const response = await metricsHealth(request);

      expect([200, 503, 500]).toContain(response.status);
      expect(response.headers.get('X-System-Status')).toBeDefined();
    });

    it('should handle POST requests for training triggers', async () => {
      const requestBody = {
        action: 'trigger_training',
        parameters: {
          force_retrain: false,
        },
      };

      const request = new NextRequest('http://localhost/api/ai-cache/metrics', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await metricsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('trigger_training');
      expect(data.data).toHaveProperty('models_updated');
      expect(data.data).toHaveProperty('performance_improvements');
      expect(data.data).toHaveProperty('next_training_schedule');
    });

    it('should handle POST requests for model updates', async () => {
      const requestBody = {
        action: 'update_models',
        parameters: {
          models_to_update: ['quality_model', 'prediction_model'],
        },
      };

      const request = new NextRequest('http://localhost/api/ai-cache/metrics', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await metricsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('update_models');
      expect(data.data).toHaveProperty('models_updated');
    });

    it('should handle POST requests for feedback analysis', async () => {
      const requestBody = {
        action: 'analyze_feedback',
        parameters: {
          feedback_timeframe: '7d',
        },
      };

      const request = new NextRequest('http://localhost/api/ai-cache/metrics', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await metricsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('analyze_feedback');
      expect(data.data).toHaveProperty('feedback_analyzed');
      expect(data.data).toHaveProperty('improvement_recommendations');
    });

    it('should return 400 for invalid training actions', async () => {
      const invalidRequestBody = {
        action: 'invalid_action',
      };

      const request = new NextRequest('http://localhost/api/ai-cache/metrics', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await metricsPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should validate timeframe parameters', async () => {
      const url =
        'http://localhost/api/ai-cache/metrics?timeframe=invalid_timeframe';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await metricsGet(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('API Error Handling', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const request = new NextRequest('http://localhost/api/ai-cache/predict', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await predictPost(request);

      expect([400, 500]).toContain(response.status);
    });

    it('should handle missing Content-Type headers', async () => {
      const request = new NextRequest(
        'http://localhost/api/ai-cache/optimize',
        {
          method: 'POST',
          body: JSON.stringify({
            query: mockQuery,
            response: mockResponse,
            context: mockWeddingContext,
          }),
          // Missing Content-Type header
        },
      );

      const response = await optimizePost(request);

      // Should still process successfully as Next.js handles JSON parsing
      expect([200, 400]).toContain(response.status);
    });

    it('should handle very large request bodies', async () => {
      const largeResponse = 'A'.repeat(50000); // 50KB response
      const requestBody = {
        query: mockQuery,
        response: largeResponse,
        context: mockWeddingContext,
      };

      const request = new NextRequest(
        'http://localhost/api/ai-cache/optimize',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await optimizePost(request);

      // Should handle gracefully, either succeed or fail with proper error
      expect([200, 400, 413, 500]).toContain(response.status);
    });
  });

  describe('API Performance', () => {
    it('should respond to prediction requests within reasonable time', async () => {
      const requestBody = {
        context: mockWeddingContext,
        limit: 3,
      };

      const request = new NextRequest('http://localhost/api/ai-cache/predict', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const startTime = Date.now();
      const response = await predictPost(request);
      const endTime = Date.now();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(data.performance?.processing_time).toBeDefined();
    });

    it('should handle concurrent requests efficiently', async () => {
      const requestBody = {
        context: mockWeddingContext,
        limit: 2,
      };

      const requests = Array(5)
        .fill(null)
        .map(
          () =>
            new NextRequest('http://localhost/api/ai-cache/predict', {
              method: 'POST',
              body: JSON.stringify(requestBody),
              headers: {
                'Content-Type': 'application/json',
              },
            }),
        );

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map((request) => predictPost(request)),
      );
      const endTime = Date.now();

      expect(responses).toHaveLength(5);
      expect(responses.every((response) => response.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // All requests within 10 seconds
    });
  });
});
