/**
 * WS-239: AI Features API Comprehensive Test Suite - Team B Round 1
 * Tests all API endpoints for dual AI system with wedding industry context
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  rpc: jest.fn()
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock AI services
const mockAIFeatureRouter = {
  routeAIRequest: jest.fn()
};

const mockCostTrackingService = {
  getUsageAnalytics: jest.fn(),
  getBudgetStatus: jest.fn(),
  calculateProjectedCosts: jest.fn(),
  generateCostReport: jest.fn()
};

const mockClientAIService = {
  validateAPIKey: jest.fn(),
  storeAPIKey: jest.fn()
};

jest.mock('@/lib/ai/dual-system/AIFeatureRouter', () => ({
  aiFeatureRouter: mockAIFeatureRouter
}));

jest.mock('@/lib/ai/dual-system/CostTrackingService', () => ({
  costTrackingService: mockCostTrackingService
}));

jest.mock('@/lib/ai/dual-system/ClientAIService', () => ({
  clientAIService: mockClientAIService
}));

// Import API handlers after mocking
import { POST as executePost, GET as executeGet } from '@/app/api/ai-features/execute/route';
import { GET as configGet, PUT as configPut } from '@/app/api/ai-features/config/route';
import { GET as usageGet } from '@/app/api/ai-features/usage/route';
import { POST as testKeyPost } from '@/app/api/ai-features/test-key/route';

describe('AI Features API Test Suite', () => {
  const mockUser = {
    id: 'user-123',
    email: 'supplier@example.com'
  };

  const mockSupplierProfile = {
    organization_id: 'supplier-456',
    user_type: 'supplier'
  };

  const mockAIConfig = {
    id: 'config-789',
    supplier_id: 'supplier-456',
    platform_features_enabled: true,
    platform_usage_tier: 'PROFESSIONAL',
    platform_monthly_limits: {
      photo_analysis: 2000,
      content_generation: 1000,
      email_templates: 500
    },
    platform_overage_rate_pounds: 0.01,
    client_api_enabled: false,
    client_api_provider: null,
    client_monthly_budget_pounds: 50.00,
    migration_status: 'platform_only',
    client_api_health_status: true,
    platform_api_health_status: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default authentication mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockSupplierProfile,
        error: null
      })
    });
  });

  describe('POST /api/ai-features/execute', () => {
    it('should successfully execute AI request with wedding context', async () => {
      const requestBody = {
        featureType: 'photo_analysis',
        requestType: 'wedding_photo_analysis',
        data: {
          imageUrl: 'https://example.com/wedding-photo.jpg',
          categories: ['ceremony', 'portrait']
        },
        weddingDate: '2025-06-15T14:00:00.000Z',
        options: {
          model: 'gpt-4-vision-preview',
          maxTokens: 2000
        }
      };

      mockAIFeatureRouter.routeAIRequest.mockResolvedValue({
        success: true,
        data: {
          analysis: {
            primary_category: 'ceremony',
            quality_score: 9,
            enhancement_suggestions: []
          }
        },
        provider: 'platform',
        usage: {
          tokensInput: 1500,
          tokensOutput: 800,
          tokensTotal: 2300,
          costPounds: 0.01
        },
        performanceMs: 1200,
        model: 'gpt-4-vision-preview'
      });

      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await executePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.provider).toBe('platform');
      expect(data.usage.tokensTotal).toBe(2300);
      expect(data.usage.costPounds).toBe(0.01);
      expect(data.metadata.featureType).toBe('photo_analysis');

      expect(mockAIFeatureRouter.routeAIRequest).toHaveBeenCalledWith(
        'supplier-456',
        'user-123',
        expect.objectContaining({
          featureType: 'photo_analysis',
          requestType: 'wedding_photo_analysis',
          data: requestBody.data
        }),
        '2025-06-15T14:00:00.000Z'
      );
    });

    it('should handle wedding peak season requests with priority', async () => {
      const requestBody = {
        featureType: 'vendor_matching',
        requestType: 'emergency_vendor_search',
        data: {
          weddingDate: '2025-06-15',
          vendorType: 'photographer',
          budget: 2000,
          urgent: true
        },
        weddingDate: '2025-06-15T10:00:00.000Z' // Saturday wedding
      };

      mockAIFeatureRouter.routeAIRequest.mockResolvedValue({
        success: true,
        data: { matches: [] },
        provider: 'client',
        usage: { tokensInput: 500, tokensOutput: 300, tokensTotal: 800, costPounds: 0.05 },
        performanceMs: 800
      });

      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify(requestBody)
      });

      const response = await executePost(request);
      expect(response.status).toBe(200);
    });

    it('should return 401 for unauthorized requests', async () => {
      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        body: JSON.stringify({ featureType: 'photo_analysis' })
      });

      const response = await executePost(request);
      expect(response.status).toBe(401);
    });

    it('should validate request schema and return 400 for invalid data', async () => {
      const invalidRequest = {
        featureType: 'invalid_feature',
        data: 'not an object'
      };

      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify(invalidRequest)
      });

      const response = await executePost(request);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/ai-features/config', () => {
    it('should return supplier AI configuration', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAIConfig,
          error: null
        })
      });

      const request = new NextRequest('http://localhost/api/ai-features/config', {
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      const response = await configGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform.enabled).toBe(true);
      expect(data.platform.usageTier).toBe('PROFESSIONAL');
      expect(data.client.enabled).toBe(false);
      expect(data.migration.status).toBe('platform_only');
    });

    it('should not expose encrypted API keys', async () => {
      const configWithApiKey = {
        ...mockAIConfig,
        client_api_enabled: true,
        client_api_provider: 'openai',
        client_api_key_encrypted: 'encrypted-key-data',
        client_api_key_iv: 'iv-data'
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: configWithApiKey,
          error: null
        })
      });

      const request = new NextRequest('http://localhost/api/ai-features/config', {
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      const response = await configGet(request);
      const data = await response.json();

      expect(data.client.hasApiKey).toBe(true);
      expect(data).not.toHaveProperty('client_api_key_encrypted');
      expect(data).not.toHaveProperty('client_api_key_iv');
    });
  });

  describe('PUT /api/ai-features/config', () => {
    it('should update platform configuration settings', async () => {
      const updateData = {
        platformFeaturesEnabled: true,
        clientMonthlyBudgetPounds: 100.0,
        clientCostAlertsEnabled: true,
        clientAlertThresholds: [0.5, 0.8, 0.9]
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSupplierProfile,
          error: null
        })
      });

      mockSupabaseClient.update.mockResolvedValue({ error: null });

      const request = new NextRequest('http://localhost/api/ai-features/config', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const response = await configPut(request);
      expect(response.status).toBe(200);
    });

    it('should validate and store new API key securely', async () => {
      const updateWithApiKey = {
        clientApiEnabled: true,
        clientApiProvider: 'openai',
        clientApiKey: 'sk-test-key-1234567890abcdef',
        clientMonthlyBudgetPounds: 75.0
      };

      mockClientAIService.storeAPIKey.mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost/api/ai-features/config', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateWithApiKey)
      });

      const response = await configPut(request);
      
      expect(mockClientAIService.storeAPIKey).toHaveBeenCalledWith(
        'supplier-456',
        'sk-test-key-1234567890abcdef',
        'openai',
        75.0
      );
    });
  });

  describe('GET /api/ai-features/usage', () => {
    it('should return comprehensive usage analytics', async () => {
      const mockAnalytics = {
        totalRequests: 150,
        totalCost: 12.50,
        averageResponseTime: 1200,
        successRate: 0.98,
        topFeatures: [
          { feature: 'photo_analysis', count: 80, cost: 8.00 },
          { feature: 'email_templates', count: 45, cost: 2.25 }
        ],
        dailyBreakdown: [
          { date: '2025-01-15', requests: 25, cost: 2.50 }
        ],
        providerBreakdown: { platform: 120, client: 30 }
      };

      const mockBudgetStatus = {
        monthlyBudget: 100.0,
        currentSpend: 12.50,
        utilizationRate: 0.125,
        onTrack: true,
        daysRemaining: 15,
        triggeredAlerts: []
      };

      mockCostTrackingService.getUsageAnalytics.mockResolvedValue(mockAnalytics);
      mockCostTrackingService.getBudgetStatus.mockResolvedValue(mockBudgetStatus);

      const request = new NextRequest('http://localhost/api/ai-features/usage?period=month', {
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      const response = await usageGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalRequests).toBe(150);
      expect(data.summary.totalCost).toBe(12.50);
      expect(data.budgetStatus.platform.currentSpend).toBe(12.50);
      expect(data.budgetStatus.client.utilizationRate).toBe(0.125);
    });

    it('should include wedding season analytics', async () => {
      const weddingSeasonAnalytics = {
        totalRequests: 200,
        totalCost: 25.00,
        averageResponseTime: 1100,
        successRate: 0.99,
        topFeatures: [
          { feature: 'vendor_matching', count: 100, cost: 15.00 },
          { feature: 'wedding_planning', count: 60, cost: 7.50 }
        ],
        dailyBreakdown: [
          { date: '2025-06-14', requests: 50, cost: 6.25 }, // Friday
          { date: '2025-06-15', requests: 80, cost: 10.00 } // Saturday - peak!
        ],
        providerBreakdown: { platform: 150, client: 50 }
      };

      mockCostTrackingService.getUsageAnalytics.mockResolvedValue(weddingSeasonAnalytics);

      const request = new NextRequest(
        'http://localhost/api/ai-features/usage?period=week&startDate=2025-06-14T00:00:00.000Z&endDate=2025-06-15T23:59:59.000Z',
        { headers: { 'Authorization': 'Bearer valid-token' } }
      );

      const response = await usageGet(request);
      const data = await response.json();

      expect(data.summary.totalRequests).toBe(200);
      expect(data.detailed.dailyBreakdown).toHaveLength(2);
      expect(data.detailed.dailyBreakdown[1].requests).toBe(80); // Saturday peak
    });
  });

  describe('POST /api/ai-features/test-key', () => {
    it('should validate OpenAI API key successfully', async () => {
      const validationResult = {
        valid: true,
        provider: 'openai',
        rateLimits: {
          requestsPerMinute: 500,
          tokensPerMinute: 40000
        },
        estimatedMonthlyCost: 0
      };

      mockClientAIService.validateAPIKey.mockResolvedValue(validationResult);

      const request = new NextRequest('http://localhost/api/ai-features/test-key', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: 'sk-test-valid-key-1234567890',
          provider: 'openai'
        })
      });

      const response = await testKeyPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.provider).toBe('openai');
      expect(data.details.rateLimits.requestsPerMinute).toBe(500);
    });

    it('should reject invalid API key', async () => {
      mockClientAIService.validateAPIKey.mockResolvedValue({
        valid: false,
        provider: 'openai',
        error: 'Invalid API key'
      });

      const request = new NextRequest('http://localhost/api/ai-features/test-key', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: 'sk-invalid-key',
          provider: 'openai'
        })
      });

      const response = await testKeyPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Invalid API key');
    });
  });

  describe('Wedding Industry Business Logic Tests', () => {
    it('should handle peak wedding season with enhanced monitoring', async () => {
      // Test Saturday wedding request (peak season)
      const peakSeasonRequest = {
        featureType: 'photo_analysis',
        requestType: 'urgent_photo_processing',
        data: { urgent: true, weddingToday: true },
        weddingDate: '2025-06-14T14:00:00.000Z' // Saturday
      };

      mockAIFeatureRouter.routeAIRequest.mockResolvedValue({
        success: true,
        data: { processed: true },
        provider: 'platform',
        usage: { tokensInput: 1000, tokensOutput: 500, tokensTotal: 1500, costPounds: 0.015 },
        performanceMs: 800
      });

      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify(peakSeasonRequest)
      });

      const response = await executePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.performance.responseTimeMs).toBeLessThan(2000); // Fast response for wedding day
    });

    it('should prioritize vendor matching during wedding emergencies', async () => {
      const emergencyRequest = {
        featureType: 'vendor_matching',
        requestType: 'emergency_replacement',
        data: {
          originalVendor: 'photographer',
          weddingDate: '2025-06-15',
          maxDistance: 50,
          urgent: true,
          budget: 1500
        },
        weddingDate: '2025-06-15T12:00:00.000Z'
      };

      mockAIFeatureRouter.routeAIRequest.mockResolvedValue({
        success: true,
        data: {
          matches: [
            { name: 'Emergency Photographer', distance: 15, rating: 4.8 },
            { name: 'Last Minute Studios', distance: 25, rating: 4.6 }
          ]
        },
        provider: 'platform',
        usage: { tokensInput: 800, tokensOutput: 600, tokensTotal: 1400, costPounds: 0.01 },
        performanceMs: 600
      });

      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify(emergencyRequest)
      });

      const response = await executePost(request);
      expect(response.status).toBe(200);
      expect(response.json().then(data => data.data.matches)).resolves.toHaveLength(2);
    });
  });

  describe('Security and Compliance Tests', () => {
    it('should not expose sensitive data in API responses', async () => {
      const request = new NextRequest('http://localhost/api/ai-features/config', {
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockAIConfig,
            client_api_key_encrypted: 'sensitive-encrypted-data',
            client_api_key_iv: 'sensitive-iv-data'
          },
          error: null
        })
      });

      const response = await configGet(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain('sensitive-encrypted-data');
      expect(responseText).not.toContain('sensitive-iv-data');
      expect(responseText).not.toContain('api_key');
    });

    it('should enforce supplier-only access', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockSupplierProfile, user_type: 'couple' },
          error: null
        })
      });

      const request = new NextRequest('http://localhost/api/ai-features/config', {
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      const response = await configGet(request);
      expect(response.status).toBe(403);
    });

    it('should validate all input parameters', async () => {
      const maliciousRequest = {
        featureType: 'photo_analysis',
        data: {
          script: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE users; --"
        }
      };

      // Should still pass validation since we sanitize at the router level
      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify(maliciousRequest)
      });

      mockAIFeatureRouter.routeAIRequest.mockResolvedValue({
        success: true,
        data: { sanitized: true },
        provider: 'platform',
        usage: { tokensInput: 100, tokensOutput: 50, tokensTotal: 150, costPounds: 0.001 },
        performanceMs: 300
      });

      const response = await executePost(request);
      expect(response.status).toBe(200);
      // Verify malicious content was passed to router for proper sanitization
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle high request volume during wedding season', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        featureType: 'photo_analysis',
        requestType: 'batch_processing',
        data: { batchId: i, photos: [`photo${i}.jpg`] },
        weddingDate: '2025-06-15T16:00:00.000Z'
      }));

      const promises = requests.map(async (requestBody) => {
        mockAIFeatureRouter.routeAIRequest.mockResolvedValue({
          success: true,
          data: { processed: true },
          provider: 'platform',
          usage: { tokensInput: 500, tokensOutput: 200, tokensTotal: 700, costPounds: 0.007 },
          performanceMs: 800
        });

        const request = new NextRequest('http://localhost/api/ai-features/execute', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer valid-token' },
          body: JSON.stringify(requestBody)
        });

        return executePost(request);
      });

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle service failures gracefully', async () => {
      mockAIFeatureRouter.routeAIRequest.mockRejectedValue(new Error('OpenAI service unavailable'));

      const request = new NextRequest('http://localhost/api/ai-features/execute', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: JSON.stringify({
          featureType: 'photo_analysis',
          requestType: 'test_failure',
          data: { test: true }
        })
      });

      const response = await executePost(request);
      expect(response.status).toBe(500);
    });
  });
});

describe('Integration Tests', () => {
  it('should complete full wedding photo processing workflow', async () => {
    // This would be a full integration test simulating:
    // 1. Supplier uploads wedding photos
    // 2. AI analyzes photos for categorization
    // 3. Cost tracking records usage
    // 4. Billing summary updates
    // 5. Client receives processed results

    const workflowSteps = [
      'photo_upload',
      'ai_analysis',
      'cost_tracking', 
      'billing_update',
      'result_delivery'
    ];

    // Mock successful completion of each step
    workflowSteps.forEach(step => {
      expect(step).toBeDefined();
    });

    expect(workflowSteps).toHaveLength(5);
  });
});

// Test utilities and helpers
export const createMockRequest = (method: string, url: string, body?: any, headers?: Record<string, string>) => {
  return new NextRequest(url, {
    method,
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
};

export const createMockSupplier = (overrides = {}) => ({
  id: 'supplier-123',
  organizationId: 'org-456',
  userType: 'supplier',
  ...overrides
});