/**
 * WS-232 Predictive Modeling API Integration Tests
 * Comprehensive testing of all prediction endpoints and functionality
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST, GET } from '@/app/api/predictions/route';
import { POST as BatchPOST } from '@/app/api/predictions/batch/route';
import { GET as PerformanceGET } from '@/app/api/predictions/performance/route';

// Mock dependencies
jest.mock('@/lib/services/predictive-modeling-service');
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/security/rate-limiter');

const mockPredictiveService = {
  generatePrediction: jest.fn(),
  generateBatchPredictions: jest.fn(),
  getPredictionHistory: jest.fn(),
  getModelPerformance: jest.fn(),
};

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            data: { organization_id: 'test-org-id' },
            error: null,
          }),
        ),
      })),
    })),
  })),
};

const mockRateLimit = jest.fn(() => Promise.resolve({ success: true }));

// Mock implementations
jest
  .mocked(
    require('@/lib/services/predictive-modeling-service')
      .predictiveModelingService,
  )
  .mockImplementation(() => mockPredictiveService);

jest
  .mocked(require('@supabase/supabase-js').createClient)
  .mockReturnValue(mockSupabase as any);

jest
  .mocked(require('@/lib/security/rate-limiter').rateLimit)
  .mockImplementation(mockRateLimit as any);

describe('WS-232 Predictive Modeling API Integration Tests', () => {
  const validAuthHeader = 'Bearer valid-token';
  const mockUser = {
    id: 'user-123',
    organization_id: 'test-org-id',
  };

  beforeAll(() => {
    // Setup global mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/predictions - Single Prediction', () => {
    it('should create vendor performance prediction successfully', async () => {
      const mockPredictionResult = {
        id: 'pred-123',
        predictionType: 'vendor_performance',
        confidence: 0.89,
        result: {
          performanceScore: 0.92,
          weddingSeasonReadiness: 'excellent',
          strengthAreas: ['On-time delivery', 'Client communication'],
          improvementAreas: ['Pricing competitiveness'],
        },
        insights: ['Vendor shows consistent high performance'],
        recommendations: ['Continue current practices'],
        riskFactors: [],
        createdAt: new Date(),
        processedAt: new Date(),
      };

      mockPredictiveService.generatePrediction.mockResolvedValueOnce(
        mockPredictionResult,
      );

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'vendor_performance',
          vendorId: 'vendor-123',
          features: {
            onTimeDelivery: 0.95,
            clientSatisfaction: 4.8,
            responseTime: 12,
            completedWeddings: 45,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        data: mockPredictionResult,
        metadata: {
          processingTime: expect.any(Number),
          modelVersion: '1.0.0',
          confidence: 0.89,
        },
      });
    });

    it('should create budget variance prediction successfully', async () => {
      const mockBudgetResult = {
        id: 'pred-456',
        predictionType: 'budget_variance',
        confidence: 0.82,
        result: {
          predictedVariance: 0.12,
          seasonAdjustedBudget: 28750,
          budgetHealthScore: 0.85,
          recommendedContingency: 0.15,
        },
        insights: ['Budget shows healthy planning within normal variance'],
        recommendations: ['Consider 15% contingency for seasonal premium'],
        riskFactors: [],
        createdAt: new Date(),
        processedAt: new Date(),
      };

      mockPredictiveService.generatePrediction.mockResolvedValueOnce(
        mockBudgetResult,
      );

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'budget_variance',
          weddingId: 'wedding-789',
          features: {
            baseBudget: 25000,
            seasonalFactors: 'summer',
            guestCount: 120,
            venueType: 'outdoor',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.predictionType).toBe('budget_variance');
      expect(data.data.result.seasonAdjustedBudget).toBe(28750);
    });

    it('should handle authentication errors', async () => {
      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing Authorization header
        },
        body: JSON.stringify({
          predictionType: 'vendor_performance',
          features: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    it('should handle invalid prediction type', async () => {
      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'invalid_type',
          features: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle rate limiting', async () => {
      mockRateLimit.mockResolvedValueOnce({ success: false });

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'vendor_performance',
          features: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMITED');

      // Reset rate limit mock
      mockRateLimit.mockResolvedValue({ success: true });
    });

    it('should handle prediction service errors', async () => {
      mockPredictiveService.generatePrediction.mockRejectedValueOnce(
        new Error('OpenAI API unavailable'),
      );

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'vendor_performance',
          features: { test: true },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PREDICTION_FAILED');
      expect(data.error.details).toContain('OpenAI API unavailable');
    });
  });

  describe('GET /api/predictions - Prediction History', () => {
    it('should retrieve prediction history successfully', async () => {
      const mockHistory = [
        {
          id: 'pred-1',
          predictionType: 'vendor_performance',
          confidence: 0.89,
          result: { performanceScore: 0.92 },
          insights: ['Test insight'],
          recommendations: ['Test recommendation'],
          riskFactors: [],
          createdAt: new Date(),
          processedAt: new Date(),
        },
        {
          id: 'pred-2',
          predictionType: 'budget_variance',
          confidence: 0.82,
          result: { predictedVariance: 0.12 },
          insights: ['Budget insight'],
          recommendations: ['Budget recommendation'],
          riskFactors: [],
          createdAt: new Date(),
          processedAt: new Date(),
        },
      ];

      mockPredictiveService.getPredictionHistory.mockResolvedValueOnce(
        mockHistory,
      );

      const request = new NextRequest(
        'http://localhost/api/predictions?type=vendor_performance&limit=10',
        {
          method: 'GET',
          headers: {
            Authorization: validAuthHeader,
          },
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        data: mockHistory,
        metadata: {
          count: 2,
          organizationId: 'test-org-id',
          predictionType: 'vendor_performance',
        },
      });
    });

    it('should handle history retrieval errors', async () => {
      mockPredictiveService.getPredictionHistory.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'GET',
        headers: {
          Authorization: validAuthHeader,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FETCH_FAILED');
    });
  });

  describe('POST /api/predictions/batch - Batch Processing', () => {
    it('should process batch predictions successfully', async () => {
      const mockBatchResult = [
        {
          id: 'pred-batch-1',
          predictionType: 'vendor_performance',
          confidence: 0.89,
          result: { performanceScore: 0.92 },
          insights: [],
          recommendations: [],
          riskFactors: [],
          createdAt: new Date(),
          processedAt: new Date(),
        },
        {
          id: 'pred-batch-2',
          predictionType: 'budget_variance',
          confidence: 0.85,
          result: { predictedVariance: 0.08 },
          insights: [],
          recommendations: [],
          riskFactors: [],
          createdAt: new Date(),
          processedAt: new Date(),
        },
      ];

      mockPredictiveService.generateBatchPredictions.mockResolvedValueOnce(
        mockBatchResult,
      );

      const request = new NextRequest(
        'http://localhost/api/predictions/batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: validAuthHeader,
          },
          body: JSON.stringify({
            requests: [
              {
                predictionType: 'vendor_performance',
                features: { onTimeDelivery: 0.92 },
              },
              {
                predictionType: 'budget_variance',
                features: { baseBudget: 30000 },
              },
            ],
          }),
        },
      );

      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        totalRequests: 2,
        successfulRequests: 2,
        failedRequests: 0,
        results: mockBatchResult,
        status: 'completed',
      });
    });

    it('should handle batch size limits', async () => {
      const largeRequest = {
        requests: Array.from({ length: 51 }, (_, i) => ({
          predictionType: 'vendor_performance',
          features: { test: i },
        })),
      };

      const request = new NextRequest(
        'http://localhost/api/predictions/batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: validAuthHeader,
          },
          body: JSON.stringify(largeRequest),
        },
      );

      const response = await BatchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/predictions/performance - Model Performance', () => {
    it('should retrieve model performance metrics', async () => {
      const mockPerformance = {
        accuracy: 0.89,
        precision: 0.87,
        recall: 0.91,
        f1Score: 0.89,
        lastUpdated: new Date(),
      };

      mockPredictiveService.getModelPerformance.mockResolvedValueOnce(
        mockPerformance,
      );

      const request = new NextRequest(
        'http://localhost/api/predictions/performance?type=vendor_performance',
        {
          method: 'GET',
          headers: {
            Authorization: validAuthHeader,
          },
        },
      );

      const response = await PerformanceGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        predictionType: 'vendor_performance',
        performance: mockPerformance,
      });
    });

    it('should retrieve all models performance when no type specified', async () => {
      const mockAllPerformance = {
        models: [
          {
            predictionType: 'vendor_performance',
            performance: { accuracy: 0.89 },
          },
          {
            predictionType: 'budget_variance',
            performance: { accuracy: 0.82 },
          },
        ],
        summary: {
          totalModels: 2,
          activeModels: 2,
          averageAccuracy: 0.855,
        },
      };

      // Mock multiple calls for all prediction types
      mockPredictiveService.getModelPerformance
        .mockResolvedValueOnce({ accuracy: 0.89 })
        .mockResolvedValueOnce({ accuracy: 0.82 })
        .mockResolvedValue(null); // For remaining models

      const request = new NextRequest(
        'http://localhost/api/predictions/performance',
        {
          method: 'GET',
          headers: {
            Authorization: validAuthHeader,
          },
        },
      );

      const response = await PerformanceGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.models).toBeDefined();
      expect(data.data.summary).toBeDefined();
    });
  });

  describe('Wedding Industry Specific Tests', () => {
    it('should handle guest attendance prediction with seasonal factors', async () => {
      const mockGuestResult = {
        id: 'pred-guest-123',
        predictionType: 'guest_attendance',
        confidence: 0.84,
        result: {
          predictedAttendanceRate: 0.87,
          predictedAttendees: 104,
          cateringRecommendation: 110,
          venueCapacityUtilization: 0.65,
          seasonalAttendanceFactor: 1.02,
        },
        insights: ['High attendance expected for summer wedding'],
        recommendations: [
          'Confirm catering for 110 guests',
          'Ensure venue capacity',
        ],
        riskFactors: [],
        createdAt: new Date(),
        processedAt: new Date(),
      };

      mockPredictiveService.generatePrediction.mockResolvedValueOnce(
        mockGuestResult,
      );

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'guest_attendance',
          features: {
            invitedGuests: 120,
            seasonalFactors: 'summer',
            distanceFactor: 'local',
            venueCapacity: 160,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.result.predictedAttendees).toBe(104);
      expect(data.data.result.cateringRecommendation).toBe(110);
    });

    it('should handle timeline delays prediction for wedding planning', async () => {
      const mockTimelineResult = {
        id: 'pred-timeline-456',
        predictionType: 'timeline_delays',
        confidence: 0.78,
        result: {
          delayProbability: 0.23,
          criticalMilestones: ['Venue booking', 'Catering confirmation'],
          bufferRecommendation: 2,
          riskMitigationStrategies: [
            'Early vendor booking',
            'Flexible timeline',
          ],
          vendorDependencies: ['Venue', 'Catering', 'Photography'],
        },
        insights: ['Moderate risk of delays due to wedding season demand'],
        recommendations: ['Add 2-week buffer to critical milestones'],
        riskFactors: ['High seasonal demand', 'Multiple vendor coordination'],
        createdAt: new Date(),
        processedAt: new Date(),
      };

      mockPredictiveService.generatePrediction.mockResolvedValueOnce(
        mockTimelineResult,
      );

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'timeline_delays',
          features: {
            planningPhase: 'venue_selection',
            vendorCount: 8,
            complexity: 'moderate',
            seasonalDemand: 'high',
            organizationExperience: 3,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.result.delayProbability).toBe(0.23);
      expect(data.data.result.bufferRecommendation).toBe(2);
    });

    it('should handle seasonal trends prediction for wedding market', async () => {
      const mockSeasonalResult = {
        id: 'pred-seasonal-789',
        predictionType: 'seasonal_trends',
        confidence: 0.92,
        result: {
          demandForecast: {
            spring: 0.8,
            summer: 1.0,
            autumn: 0.9,
            winter: 0.4,
          },
          pricingRecommendations: {
            spring: 1.08,
            summer: 1.15,
            autumn: 1.05,
            winter: 0.95,
          },
          capacityPlanning: {
            summer: 'high_demand',
            winter: 'low_demand',
          },
        },
        insights: ['Summer shows peak demand with 15% price premium'],
        recommendations: [
          'Increase capacity for summer',
          'Offer winter discounts',
        ],
        riskFactors: [],
        createdAt: new Date(),
        processedAt: new Date(),
      };

      mockPredictiveService.generatePrediction.mockResolvedValueOnce(
        mockSeasonalResult,
      );

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'seasonal_trends',
          features: {
            historicalBookings: { '2023': 245, '2024': 289 },
            marketDemand: { photography: 1.2, catering: 1.1 },
            pricingTrends: { summer: 1.15, winter: 0.95 },
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.result.pricingRecommendations.summer).toBe(1.15);
      expect(data.data.result.demandForecast.summer).toBe(1.0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: 'invalid-json{',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle missing organization context', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: null,
              }),
          }),
        }),
      }));

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: validAuthHeader,
        },
        body: JSON.stringify({
          predictionType: 'vendor_performance',
          features: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('NO_ORGANIZATION');
    });

    it('should handle invalid auth tokens', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const request = new NextRequest('http://localhost/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({
          predictionType: 'vendor_performance',
          features: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_TOKEN');

      // Reset auth mock
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent prediction requests', async () => {
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        id: `pred-concurrent-${i}`,
        predictionType: 'vendor_performance',
        confidence: 0.8 + i * 0.01,
        result: { performanceScore: 0.8 + i * 0.01 },
        insights: [],
        recommendations: [],
        riskFactors: [],
        createdAt: new Date(),
        processedAt: new Date(),
      }));

      mockPredictiveService.generatePrediction.mockImplementation(() =>
        Promise.resolve(mockResults[0]),
      );

      const requests = Array.from(
        { length: 10 },
        (_, i) =>
          new NextRequest('http://localhost/api/predictions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: validAuthHeader,
            },
            body: JSON.stringify({
              predictionType: 'vendor_performance',
              features: { testId: i },
            }),
          }),
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle large batch processing efficiently', async () => {
      const largeBatchSize = 50;
      const mockBatchResults = Array.from(
        { length: largeBatchSize },
        (_, i) => ({
          id: `pred-large-batch-${i}`,
          predictionType: 'vendor_performance',
          confidence: 0.8,
          result: { performanceScore: 0.8 },
          insights: [],
          recommendations: [],
          riskFactors: [],
          createdAt: new Date(),
          processedAt: new Date(),
        }),
      );

      mockPredictiveService.generateBatchPredictions.mockResolvedValueOnce(
        mockBatchResults,
      );

      const request = new NextRequest(
        'http://localhost/api/predictions/batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: validAuthHeader,
          },
          body: JSON.stringify({
            requests: Array.from({ length: largeBatchSize }, (_, i) => ({
              predictionType: 'vendor_performance',
              features: { batchId: i },
            })),
          }),
        },
      );

      const startTime = Date.now();
      const response = await BatchPOST(request);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.successfulRequests).toBe(largeBatchSize);
      expect(processingTime).toBeLessThan(30000); // Should complete in under 30 seconds
    });
  });
});
