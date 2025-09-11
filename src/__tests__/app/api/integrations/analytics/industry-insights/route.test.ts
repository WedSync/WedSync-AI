import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { POST, GET } from '@/app/api/integrations/analytics/industry-insights/route';

// Mock dependencies
jest.mock('next/headers');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/integrations/analytics/wedding-industry-data');
jest.mock('@/lib/analytics/report-builders');

const mockHeaders = headers as jest.MockedFunction<typeof headers>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-12345'),
  },
});

describe('/api/integrations/analytics/industry-insights', () => {
  let mockSupabaseClient: any;
  let mockHeadersList: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock headers
    mockHeadersList = {
      get: jest.fn(),
    };
    mockHeaders.mockResolvedValue(mockHeadersList);

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    mockCreateClient.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper functions to reduce nesting complexity (S2004)
  const createMockUserResponse = (userId: string) => ({
    data: { user: { id: userId } },
    error: null,
  });

  const createMockUserErrorResponse = (error: Error) => ({
    data: { user: null },
    error,
  });

  const createMockOrgAccessResponse = (role: string) => ({
    data: { role },
    error: null,
  });

  const createMockOrgAccessErrorResponse = (error: Error) => ({
    data: null,
    error,
  });

  const createMockDatabaseErrorResponse = (error: Error) => ({
    data: null,
    error,
  });

  const createMockInsertResponse = () => ({
    error: null,
  });

  const createMockSuccessResponse = (data: any) => ({
    data,
    error: null,
  });

  // Mock request creation helper to reduce nesting (S2004)
  const createAuthHeaderImplementation = (authToken?: string) => (name: string) => {
    if (name === 'Authorization') {
      return authToken || 'Bearer valid-token';
    }
    return null;
  };

  // Mock insight data helper to reduce nesting (S2004)
  const createMockInsightData = (organizationId: string, type: string = 'market_analysis') => ({
    id: 'insight-1',
    organization_id: organizationId,
    insight_type: type,
    status: 'completed',
    created_at: new Date().toISOString(),
  });

  // Enhanced helper functions for common mock setups
  const setupAuthenticatedUser = (userId: string = 'user-123') => {
    mockSupabaseClient.auth.getUser.mockResolvedValue(
      createMockUserResponse(userId)
    );
  };

  const setupAuthenticationError = (error: Error = new Error('Invalid token')) => {
    mockSupabaseClient.auth.getUser.mockResolvedValue(
      createMockUserErrorResponse(error)
    );
  };

  const setupOrganizationAccess = (role: string = 'admin', organizationId?: string) => {
    const mockData = organizationId
      ? { role, organization_id: organizationId }
      : { role };

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: mockData,
      error: null,
    });
  };

  const setupSubscriptionTier = (tier: string, vendorCategory: string = 'photographer', city: string = 'New York') => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: {
        subscription_tier: tier,
        vendor_category: vendorCategory,
        location: { city },
      },
      error: null,
    });
  };

  const setupMockIndustryIntegrator = (mockReport?: any) => {
    const mockWeddingIndustryDataIntegrator = require('@/lib/integrations/analytics/wedding-industry-data').WeddingIndustryDataIntegrator;
    const reportToReturn = mockReport || createMockInsightReport();

    mockWeddingIndustryDataIntegrator.mockImplementation(() => ({
      generateIndustryInsights: jest.fn().mockResolvedValue(reportToReturn),
    }));

    return reportToReturn;
  };

  const setupMockIndustryIntegratorWithError = (error: Error = new Error('Generation failed')) => {
    const mockWeddingIndustryDataIntegrator = require('@/lib/integrations/analytics/wedding-industry-data').WeddingIndustryDataIntegrator;

    mockWeddingIndustryDataIntegrator.mockImplementation(() => ({
      generateIndustryInsights: jest.fn().mockRejectedValue(error),
    }));
  };

  const setupMockReportBuilder = (organizationId: string, insightReport: any) => {
    const mockBuildStructuredReport = require('@/lib/analytics/report-builders').buildStructuredReport;
    const structuredReport = createMockStructuredReport(organizationId, insightReport);

    mockBuildStructuredReport.mockReturnValue(structuredReport);
    return structuredReport;
  };

  // Common test scenario setups to reduce duplication
  const setupValidPostRequest = (tier: string = 'enterprise') => {
    setupAuthenticatedUser();
    setupOrganizationAccess('admin', validRequestBody.organizationId);
    setupSubscriptionTier(tier);
    mockSupabaseClient.insert.mockResolvedValue(createMockInsertResponse());
    mockSupabaseClient.update.mockResolvedValue(createMockInsertResponse());
  };

  const setupValidGetRequest = (organizationId?: string) => {
    setupGetRequestAuth();
    setupAuthenticatedUser();
    if (organizationId) {
      setupOrganizationAccess('admin');
    }
  };

  const expectUnauthorizedResponse = (response: any, responseJson: any) => {
    expect(response.status).toBe(401);
    expect(responseJson.error).toBe('Missing or invalid authorization header');
  };

  const expectForbiddenResponse = (response: any, responseJson: any, expectedError: string) => {
    expect(response.status).toBe(403);
    expect(responseJson.error).toBe(expectedError);
  };

  // Helper function for creating mock insights
  const createMockInsight = (id: string, organizationId: string, type: string = 'market_analysis') => ({
    id,
    organization_id: organizationId,
    insight_type: type,
    status: 'completed',
  });

  const setupMockInsightResponse = (insight: any) => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: insight,
      error: null,
    });
  };

  // Helper functions for complex mock data to reduce nesting violations (S2004)
  const createMockRecommendation = () => ({
    category: 'pricing',
    priority: 'high',
    recommendation: 'Adjust pricing strategy',
    rationale: 'Market analysis shows opportunity',
    expectedImpact: 'Increased revenue',
    implementationComplexity: 'medium',
    timeframe: '3 months',
    keyMetrics: ['revenue', 'bookings'],
  });

  const createMockInsightReport = () => ({
    keyFindings: ['Finding 1', 'Finding 2'],
    criticalInsights: ['Insight 1'],
    recommendations: [createMockRecommendation()],
  });

  const createMockExecutiveSummary = (keyFindings: string[]) => ({
    keyFindings,
    opportunityScore: 75,
  });

  const createMockDataQuality = () => ({
    dataSourcesCovered: ['theknot', 'weddingwire'],
  });

  const createMockStructuredReport = (organizationId: string, insightReport: any) => ({
    insightId: 'test-uuid-12345',
    organizationId,
    reportType: 'market_analysis',
    executiveSummary: createMockExecutiveSummary(insightReport.keyFindings),
    actionableRecommendations: insightReport.recommendations,
    dataQuality: createMockDataQuality(),
  });

  const createMockInsightsWithScores = (organizationId: string) => [
    {
      id: 'insight-1',
      organization_id: organizationId,
      insight_type: 'market_analysis',
      status: 'completed',
      executive_summary: { opportunityScore: 75 },
      wedding_season_analysis: { includePeakSeason: true },
      created_at: new Date().toISOString(),
    },
    {
      id: 'insight-2',
      organization_id: organizationId,
      insight_type: 'trend_analysis',
      status: 'completed',
      executive_summary: { opportunityScore: 85 },
      wedding_season_analysis: { includePeakSeason: false },
      created_at: new Date().toISOString(),
    },
  ];

  describe('POST /api/integrations/analytics/industry-insights', () => {
    const createMockRequest = (body: any, authToken?: string) => {
      const request = {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest;

      mockHeadersList.get.mockImplementation(
        createAuthHeaderImplementation(authToken)
      );

      return request;
    };

    const validRequestBody = {
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      insightType: 'market_analysis' as const,
      scope: 'regional' as const,
      timeframe: {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        compareWithPreviousPeriod: false,
      },
      priority: 'medium' as const,
      includeActionableRecommendations: true,
    };

    it('should reject requests without authorization header', async () => {
      const request = createMockRequest(validRequestBody, undefined);
      mockHeadersList.get.mockReturnValue(null);

      const response = await POST(request);
      const responseJson = await response.json();

      expectUnauthorizedResponse(response, responseJson);
    });

    it('should reject requests with invalid authorization format', async () => {
      const request = createMockRequest(validRequestBody, 'InvalidToken');

      const response = await POST(request);
      const responseJson = await response.json();

      expectUnauthorizedResponse(response, responseJson);
    });

    it('should reject requests with invalid authentication token', async () => {
      const request = createMockRequest(validRequestBody);
      setupAuthenticationError();

      const response = await POST(request);
      const responseJson = await response.json();

      expect(response.status).toBe(401);
      expect(responseJson.error).toBe('Invalid authentication token');
    });

    it('should reject requests with invalid request data', async () => {
      const invalidBody = {
        organizationId: 'invalid-uuid',
        insightType: 'invalid_type',
      };

      const request = createMockRequest(invalidBody);
      setupAuthenticatedUser();

      const response = await POST(request);
      const responseJson = await response.json();

      expect(response.status).toBe(400);
      expect(responseJson.error).toBe('Invalid request data');
      expect(responseJson.details).toBeDefined();
    });

    it('should reject requests when user lacks organization access', async () => {
      const request = createMockRequest(validRequestBody);
      setupAuthenticatedUser();
      mockSupabaseClient.single.mockResolvedValue(
        createMockOrgAccessErrorResponse(new Error('No access'))
      );

      const response = await POST(request);
      const responseJson = await response.json();

      expectForbiddenResponse(response, responseJson, 'Organization access denied');
    });

    it('should reject requests for insufficient subscription tier', async () => {
      const request = createMockRequest(validRequestBody);
      setupAuthenticatedUser();
      setupOrganizationAccess('admin', validRequestBody.organizationId);
      setupSubscriptionTier('basic');

      const response = await POST(request);
      const responseJson = await response.json();

      expect(response.status).toBe(403);
      expect(responseJson.error).toBe('Industry insights require Professional tier or higher');
      expect(responseJson.requiredTier).toBe('professional');
      expect(responseJson.currentTier).toBe('basic');
    });

    it('should reject enterprise features for non-enterprise users', async () => {
      const enterpriseRequest = {
        ...validRequestBody,
        insightType: 'competitive_intelligence' as const,
      };

      const request = createMockRequest(enterpriseRequest);
      setupAuthenticatedUser();
      setupOrganizationAccess('admin', validRequestBody.organizationId);
      setupSubscriptionTier('professional');

      const response = await POST(request);
      const responseJson = await response.json();

      expect(response.status).toBe(403);
      expect(responseJson.error).toBe('competitive_intelligence insights require Enterprise tier');
    });

    it('should handle insight generation failure gracefully', async () => {
      const request = createMockRequest(validRequestBody);
      setupAuthenticatedUser();
      setupOrganizationAccess('admin', validRequestBody.organizationId);
      setupSubscriptionTier('enterprise');

      // Mock successful job creation
      mockSupabaseClient.insert.mockResolvedValue(createMockInsertResponse());

      // Mock insight generation failure
      setupMockIndustryIntegratorWithError();

      // Mock update for failed status
      mockSupabaseClient.update.mockResolvedValue(createMockInsertResponse());

      const response = await POST(request);
      const responseJson = await response.json();

      expect(response.status).toBe(500);
      expect(responseJson.error).toBe('Industry insight generation failed');
      expect(responseJson.details).toBe('Generation failed');
    });

    it('should successfully generate insights for valid request', async () => {
      const request = createMockRequest(validRequestBody);
      setupAuthenticatedUser();
      setupOrganizationAccess('admin', validRequestBody.organizationId);
      setupSubscriptionTier('enterprise');

      // Mock successful job creation
      mockSupabaseClient.insert.mockResolvedValue(createMockInsertResponse());

      // Setup mock insight generation and report building
      const mockInsightReport = setupMockIndustryIntegrator();
      const mockStructuredReport = setupMockReportBuilder(validRequestBody.organizationId, mockInsightReport);

      // Mock database updates
      mockSupabaseClient.update.mockResolvedValue(createMockInsertResponse());

      const response = await POST(request);
      const responseJson = await response.json();

      expect(response.status).toBe(200);
      expect(responseJson.insightId).toBe('test-uuid-12345');
      expect(responseJson.organizationId).toBe(validRequestBody.organizationId);
      expect(responseJson.reportType).toBe('market_analysis');
    });
  });

  describe('GET /api/integrations/analytics/industry-insights', () => {
    const createMockRequest = (searchParams: Record<string, string>) => {
      const url = new URL('http://localhost:3000/api/test');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return {
        url: url.toString(),
      } as NextRequest;
    };

    const setupGetRequestAuth = (token: string = 'Bearer valid-token') => {
      mockHeadersList.get.mockReturnValue(token);
    };

    it('should reject requests without required parameters', async () => {
      const request = createMockRequest({});
      mockHeadersList.get.mockReturnValue('Bearer valid-token');

      const response = await GET(request);
      const responseJson = await response.json();

      expect(response.status).toBe(400);
      expect(responseJson.error).toBe('insightId or organizationId parameter required');
    });

    it('should reject requests without authorization', async () => {
      const request = createMockRequest({ organizationId: '123e4567-e89b-12d3-a456-426614174000' });
      mockHeadersList.get.mockReturnValue(null);

      const response = await GET(request);
      const responseJson = await response.json();

      expectUnauthorizedResponse(response, responseJson);
    });

    it('should return specific insight by ID', async () => {
      const insightId = 'insight-123';
      const request = createMockRequest({ insightId });

      setupGetRequestAuth();
      setupAuthenticatedUser();

      const mockInsight = {
        id: insightId,
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        insight_type: 'market_analysis',
        status: 'completed',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockInsight,
        error: null,
      });

      setupOrganizationAccess('admin');

      const response = await GET(request);
      const responseJson = await response.json();

      expect(response.status).toBe(200);
      expect(responseJson.id).toBe(insightId);
    });

    it('should return 404 for non-existent insight', async () => {
      const request = createMockRequest({ insightId: 'non-existent' });

      setupGetRequestAuth();
      setupAuthenticatedUser();

      mockSupabaseClient.single.mockResolvedValue(
        createMockSuccessResponse([])
      );

      const response = await GET(request);
      const responseJson = await response.json();

      expect(response.status).toBe(404);
      expect(responseJson.error).toBe('Industry insight not found');
    });

    it('should return insights by organization ID', async () => {
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';
      const request = createMockRequest({ organizationId });

      setupGetRequestAuth();
      setupAuthenticatedUser();
      setupOrganizationAccess('admin');

      const mockInsights = createMockInsightsWithScores(organizationId);

      mockSupabaseClient.limit.mockResolvedValue(
        createMockSuccessResponse(mockInsights)
      );

      const response = await GET(request);
      const responseJson = await response.json();

      expect(response.status).toBe(200);
      expect(responseJson.industryInsights).toHaveLength(2);
      expect(responseJson.total).toBe(2);
      expect(responseJson.weddingOptimizedInsights).toBe(1);
      expect(responseJson.insightsTrend).toBeDefined();
      expect(responseJson.insightsTrend.totalInsights).toBe(2);
      expect(responseJson.insightsTrend.averageOpportunityScore).toBe(80);
    });

    it('should filter insights by type when specified', async () => {
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';
      const insightType = 'market_analysis';
      const request = createMockRequest({ organizationId, insightType });

      setupGetRequestAuth();
      setupAuthenticatedUser();
      setupOrganizationAccess('admin');

      const mockInsights = [
        createMockInsightData(organizationId, 'market_analysis'),
      ];

      mockSupabaseClient.limit.mockResolvedValue(
        createMockSuccessResponse(mockInsights)
      );

      const response = await GET(request);
      const responseJson = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('insight_type', 'market_analysis');
    });

    it('should handle database errors gracefully', async () => {
      const request = createMockRequest({ organizationId: '123e4567-e89b-12d3-a456-426614174000' });

      setupGetRequestAuth();
      setupAuthenticatedUser();
      setupOrganizationAccess('admin');

      mockSupabaseClient.limit.mockResolvedValue(
        createMockDatabaseErrorResponse(new Error('Database error'))
      );

      const response = await GET(request);
      const responseJson = await response.json();

      expect(response.status).toBe(500);
      expect(responseJson.error).toBe('Failed to fetch industry insights');
    });
  });
});
