/**
 * WS-240: AI Optimization API Endpoints Test Suite
 * 
 * Comprehensive tests for all AI optimization API endpoints.
 * Ensures security, validation, and proper error handling.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock all dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/ai/optimization/CostOptimizationEngine');
jest.mock('@/lib/ai/optimization/BudgetTrackingEngine');
jest.mock('@/lib/ai/optimization/SmartCacheOptimizer');
jest.mock('@/lib/rate-limiter');

describe('AI Optimization API Endpoints', () => {
  let mockCreateClient: any;
  let mockRateLimit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase client
    mockCreateClient = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'test-supplier-id',
          organization_id: 'test-org-id',
          status: 'active'
        },
        error: null
      })
    });

    // Mock rate limiter
    mockRateLimit = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000
    });

    require('@supabase/supabase-js').createClient = mockCreateClient;
    require('@/lib/rate-limiter').rateLimit = mockRateLimit;
  });

  describe('POST /api/ai-optimization/optimize', () => {
    const createOptimizeRequest = (overrides = {}) => {
      return new NextRequest('http://localhost:3000/api/ai-optimization/optimize', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify({
          supplierId: 'test-supplier-id',
          featureType: 'photo_ai',
          prompt: 'Tag wedding photos with bride smiling, outdoor ceremony',
          qualityLevel: 'high',
          priority: 'normal',
          clientFacing: true,
          maxTokens: 1000,
          temperature: 0.7,
          ...overrides
        })
      });
    };

    test('should optimize AI request successfully for photography studio', async () => {
      // Arrange
      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      
      // Mock optimization engine response
      const mockOptimizationEngine = {
        optimizeAIRequest: jest.fn().mockResolvedValue({
          originalRequest: { id: 'test-request' },
          optimizedModel: 'gpt-3.5-turbo',
          cacheStrategy: 'semantic',
          estimatedCost: 0.15,
          potentialSavings: 0.10,
          processingMode: 'immediate',
          optimizationReasons: ['Semantic cache hit (85% match)', 'Efficient model selected']
        })
      };
      
      require('@/lib/ai/optimization/CostOptimizationEngine').CostOptimizationEngine = jest.fn()
        .mockImplementation(() => mockOptimizationEngine);

      // Mock budget engine response  
      const mockBudgetEngine = {
        checkBudgetThresholds: jest.fn().mockResolvedValue([])
      };
      
      require('@/lib/ai/optimization/BudgetTrackingEngine').BudgetTrackingEngine = jest.fn()
        .mockImplementation(() => mockBudgetEngine);

      const request = createOptimizeRequest();

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.optimization).toBeDefined();
      expect(responseData.optimization.optimizedResult.model).toBe('gpt-3.5-turbo');
      expect(responseData.optimization.savings.percentage).toBeGreaterThan(0);
      expect(responseData.optimization.weddingContext).toBeDefined();
      expect(responseData.budget).toBeDefined();
      expect(responseData.nextSteps).toBeInstanceOf(Array);
    });

    test('should return 429 when rate limit exceeded', async () => {
      // Arrange
      mockRateLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000
      });

      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      const request = createOptimizeRequest();

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(responseData.error).toBe('Rate limit exceeded');
      expect(responseData.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('should return 400 for invalid request data', async () => {
      // Arrange
      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      const invalidRequest = createOptimizeRequest({
        supplierId: 'invalid-uuid', // Invalid UUID format
        prompt: '', // Empty prompt
        qualityLevel: 'invalid' // Invalid quality level
      });

      // Act
      const response = await POST(invalidRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.code).toBe('VALIDATION_ERROR');
      expect(responseData.details.issues).toBeInstanceOf(Array);
      expect(responseData.details.issues.length).toBeGreaterThan(0);
    });

    test('should return 404 for non-existent supplier', async () => {
      // Arrange
      mockCreateClient.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Supplier not found' }
        })
      });

      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      const request = createOptimizeRequest({
        supplierId: '00000000-0000-0000-0000-000000000000'
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Supplier not found');
      expect(responseData.code).toBe('SUPPLIER_NOT_FOUND');
    });

    test('should return 402 when budget limits exceeded', async () => {
      // Arrange
      const mockBudgetEngine = {
        checkBudgetThresholds: jest.fn().mockResolvedValue([
          {
            severity: 'critical',
            alertType: 'limit_reached',
            message: 'Daily budget exceeded',
            actionRequired: true
          }
        ])
      };
      
      require('@/lib/ai/optimization/BudgetTrackingEngine').BudgetTrackingEngine = jest.fn()
        .mockImplementation(() => mockBudgetEngine);

      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      const request = createOptimizeRequest();

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(402);
      expect(responseData.error).toBe('Budget limit exceeded');
      expect(responseData.code).toBe('BUDGET_EXCEEDED');
    });
  });

  describe('GET /api/ai-optimization/budget/status', () => {
    const createBudgetStatusRequest = (params: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/ai-optimization/budget/status');
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      
      return new NextRequest(url.toString(), {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
    };

    test('should return budget status for photography studio', async () => {
      // Arrange
      const mockBudgetEngine = {
        checkBudgetThresholds: jest.fn().mockResolvedValue([
          {
            supplierId: 'photo-studio-1',
            featureType: 'photo_ai',
            severity: 'low',
            message: 'Budget healthy',
            currentSpend: 15.50,
            percentageUsed: 31,
            actionRequired: false
          }
        ])
      };

      require('@/lib/ai/optimization/BudgetTrackingEngine').BudgetTrackingEngine = jest.fn()
        .mockImplementation(() => mockBudgetEngine);

      const { GET } = require('@/src/app/api/ai-optimization/budget/status/route');
      const request = createBudgetStatusRequest({
        supplierId: 'photo-studio-1',
        featureType: 'photo_ai',
        includeProjections: 'true'
      });

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.supplierId).toBe('photo-studio-1');
      expect(responseData.budgetStatus).toBeInstanceOf(Array);
      expect(responseData.summary).toBeDefined();
      expect(responseData.seasonalContext).toBeDefined();
      expect(responseData.seasonalContext.currentMultiplier).toBeGreaterThanOrEqual(1.0);
    });

    test('should return 400 for missing supplierId', async () => {
      // Arrange
      const { GET } = require('@/src/app/api/ai-optimization/budget/status/route');
      const request = createBudgetStatusRequest({}); // No supplierId

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toContain('supplierId');
    });
  });

  describe('PUT /api/ai-optimization/config', () => {
    const createConfigRequest = (body = {}) => {
      return new NextRequest('http://localhost:3000/api/ai-optimization/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierId: 'test-supplier-id',
          featureType: 'photo_ai',
          optimizationLevel: 'balanced',
          monthlyBudgetPounds: 75.00,
          dailyBudgetPounds: 7.50,
          alertThresholdPercent: 85,
          autoDisableAtLimit: true,
          cacheStrategy: {
            semantic: true,
            exact: true,
            ttlHours: 48,
            similarityThreshold: 0.90
          },
          batchProcessingEnabled: true,
          seasonalMultiplierEnabled: true,
          ...body
        })
      });
    };

    test('should update optimization configuration successfully', async () => {
      // Arrange
      mockCreateClient.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            supplier_id: 'test-supplier-id',
            feature_type: 'photo_ai',
            optimization_level: 'balanced',
            monthly_budget_pounds: '75.00'
          }],
          error: null
        })
      });

      const { PUT } = require('@/src/app/api/ai-optimization/config/route');
      const request = createConfigRequest();

      // Act
      const response = await PUT(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('updated successfully');
      expect(responseData.config).toBeDefined();
    });

    test('should validate configuration parameters', async () => {
      // Arrange
      const { PUT } = require('@/src/app/api/ai-optimization/config/route');
      const invalidRequest = createConfigRequest({
        monthlyBudgetPounds: -10, // Invalid negative budget
        alertThresholdPercent: 150, // Invalid percentage
        cacheStrategy: {
          ttlHours: 200, // Exceeds max 168 hours
          similarityThreshold: 1.5 // Exceeds max 1.0
        }
      });

      // Act
      const response = await PUT(invalidRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toContain('validation');
    });
  });

  describe('GET /api/ai-optimization/savings', () => {
    test('should calculate and return cost savings analytics', async () => {
      // Arrange
      const mockCacheOptimizer = {
        calculateCacheHitSavings: jest.fn().mockResolvedValue({
          supplierId: 'photo-studio-1',
          featureType: 'photo_ai',
          timeframe: 'monthly',
          totalRequests: 500,
          cacheHits: 350,
          cacheMisses: 150,
          hitRate: 70.0,
          costSavings: 87.50,
          avgSavingsPerHit: 0.25,
          topCachedPatterns: [
            'wedding photography styles',
            'bride portraits',
            'ceremony photos'
          ]
        })
      };

      require('@/lib/ai/optimization/SmartCacheOptimizer').SmartCacheOptimizer = jest.fn()
        .mockImplementation(() => mockCacheOptimizer);

      const { GET } = require('@/src/app/api/ai-optimization/savings/route');
      const request = new NextRequest(
        'http://localhost:3000/api/ai-optimization/savings?supplierId=photo-studio-1&featureType=photo_ai&timeframe=monthly',
        { method: 'GET' }
      );

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.savings.hitRate).toBe(70.0);
      expect(responseData.savings.costSavings).toBe(87.50);
      expect(responseData.projections.annualSavings).toBe(1050); // 87.50 * 12
      expect(responseData.projections.weddingIndustryContext).toBeDefined();
      expect(responseData.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/ai-optimization/emergency-disable', () => {
    test('should execute emergency disable for budget protection', async () => {
      // Arrange
      const mockBudgetEngine = {
        executeAutoDisable: jest.fn().mockResolvedValue({
          success: true,
          disabledAt: new Date(),
          reason: {
            type: 'budget_exceeded',
            message: 'Daily budget exceeded'
          },
          affectedFeatures: ['photo_ai'],
          reEnableInstructions: 'Increase budget or contact support',
          emergencyContact: 'support@wedsync.com'
        })
      };

      require('@/lib/ai/optimization/BudgetTrackingEngine').BudgetTrackingEngine = jest.fn()
        .mockImplementation(() => mockBudgetEngine);

      const { POST } = require('@/src/app/api/ai-optimization/emergency-disable/route');
      const request = new NextRequest('http://localhost:3000/api/ai-optimization/emergency-disable', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierId: 'over-budget-supplier',
          featureType: 'photo_ai',
          reason: 'budget_exceeded',
          message: 'Emergency disable due to budget overrun'
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('emergency disabled');
      expect(responseData.criticalAlert.severity).toBe('critical');
      expect(responseData.criticalAlert.weddingDayProtection).toBeDefined();
    });
  });

  describe('Error Handling and Security', () => {
    test('should handle internal server errors gracefully', async () => {
      // Arrange - Mock database failure
      mockCreateClient.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      const request = new NextRequest('http://localhost:3000/api/ai-optimization/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierId: 'test-supplier',
          featureType: 'photo_ai',
          prompt: 'Test request'
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Optimization failed');
      expect(responseData.code).toBe('INTERNAL_ERROR');
      expect(responseData.details.errorId).toBeDefined();
    });

    test('should include security headers in responses', async () => {
      // Arrange
      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      const request = new NextRequest('http://localhost:3000/api/ai-optimization/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierId: 'test-supplier',
          featureType: 'photo_ai',
          prompt: 'Test security headers'
        })
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-Optimization-Time')).toBeDefined();
    });
  });

  describe('Wedding Industry Specific Tests', () => {
    test('should provide wedding season context in optimization responses', async () => {
      // Arrange - Mock peak season (June)
      jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-06-15') as any);

      const mockOptimizationEngine = {
        optimizeAIRequest: jest.fn().mockResolvedValue({
          optimizedModel: 'gpt-3.5-turbo',
          estimatedCost: 0.20,
          potentialSavings: 0.05,
          cacheStrategy: 'semantic',
          processingMode: 'immediate',
          optimizationReasons: ['Peak wedding season optimization applied']
        })
      };

      require('@/lib/ai/optimization/CostOptimizationEngine').CostOptimizationEngine = jest.fn()
        .mockImplementation(() => mockOptimizationEngine);

      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');
      const request = new NextRequest('http://localhost:3000/api/ai-optimization/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierId: 'wedding-photographer',
          featureType: 'photo_ai',
          prompt: 'Tag summer wedding photos',
          weddingDate: '2024-06-20T14:00:00Z'
        })
      });

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(responseData.optimization.weddingContext.peakSeason).toBe(true);
      expect(responseData.optimization.weddingContext.seasonalMultiplier).toBe(1.6);
      expect(responseData.optimization.weddingContext.industryTip).toContain('wedding');
    });

    test('should handle venue coordinator specific optimization patterns', async () => {
      // Arrange
      const venueRequest = new NextRequest('http://localhost:3000/api/ai-optimization/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierId: 'elegant-venues-coordinator',
          featureType: 'venue_descriptions',
          prompt: 'Generate elegant description for garden wedding venue with capacity for 150 guests',
          qualityLevel: 'high',
          clientFacing: true
        })
      });

      const mockOptimizationEngine = {
        optimizeAIRequest: jest.fn().mockResolvedValue({
          optimizedModel: 'gpt-4-turbo',
          estimatedCost: 0.35,
          potentialSavings: 0.15,
          cacheStrategy: 'semantic',
          processingMode: 'immediate',
          optimizationReasons: ['High-quality model for client-facing venue description', 'Semantic cache for similar venues']
        })
      };

      require('@/lib/ai/optimization/CostOptimizationEngine').CostOptimizationEngine = jest.fn()
        .mockImplementation(() => mockOptimizationEngine);

      const { POST } = require('@/src/app/api/ai-optimization/optimize/route');

      // Act
      const response = await POST(venueRequest);
      const responseData = await response.json();

      // Assert
      expect(responseData.optimization.weddingContext.industryTip).toContain('venue');
      expect(responseData.nextSteps).toContain(expect.stringMatching(/venue|description/i));
    });
  });
});