import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  POST,
  GET,
} from '@/app/api/integrations/analytics/quality-check/route';
import { NextRequest } from 'next/server';

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve(
      new Headers({
        Authorization: 'Bearer valid-token',
      }),
    ),
  ),
}));

// Mock Supabase client - REFACTORED TO MEET 4-LEVEL LIMIT  
function createDefaultSupabaseChain() {
  const singleMock = vi.fn();
  const eqMock = vi.fn(() => ({ single: singleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  
  const updateEqMock = vi.fn();
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));
  
  return {
    select: selectMock,
    insert: vi.fn(),
    update: updateMock,
    upsert: vi.fn(),
  };
}

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => createDefaultSupabaseChain()),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock Data Quality Governance
const mockDataQualityGovernance = {
  executeQualityCheck: vi.fn(),
};

vi.mock('@/lib/integrations/analytics/data-quality-governance', () => ({
  DataQualityGovernance: vi.fn(() => mockDataQualityGovernance),
}));

// Test data builders to reduce JSON nesting
function createQualityRules() {
  const completenessRules = {
    threshold: 90,
    criticalFields: ['wedding_date', 'client_email', 'booking_value']
  };
  
  const accuracyRules = {
    threshold: 95,
    validationRules: ['email_format', 'phone_format', 'date_validation']
  };
  
  const privacyRules = {
    gdprCompliance: true,
    dataRetentionCheck: true,
    consentValidation: true
  };
  
  return {
    completeness: completenessRules,
    accuracy: accuracyRules,
    privacy: privacyRules
  };
}

function createWeddingSpecificChecks() {
  return {
    seasonalDataValidation: true,
    vendorPerformanceMetrics: true,
    guestDataIntegrity: true
  };
}

function createComprehensiveCheckRequest(organizationId: string) {
  const platforms = ['quickbooks', 'stripe', 'google_analytics'];
  const dataCategories = ['financial_data', 'marketing_data', 'guest_data'];
  
  return {
    organizationId,
    checkType: 'comprehensive',
    platforms,
    dataCategories,
    qualityRules: createQualityRules(),
    weddingSpecificChecks: createWeddingSpecificChecks(),
    priority: 'high'
  };
}

function createTargetedCheckRequest(organizationId: string) {
  return {
    organizationId,
    checkType: 'targeted',
    weddingSpecificChecks: {
      seasonalDataValidation: true,
      vendorPerformanceMetrics: true,
      bookingPatternAnalysis: true,
      guestDataIntegrity: true
    }
  };
}

function createBasicCheckRequest(organizationId: string, checkType = 'comprehensive') {
  return {
    organizationId,
    checkType
  };
}

function createScheduledCheckRequest(organizationId: string) {
  return {
    organizationId,
    checkType: 'comprehensive',
    scheduledCheck: true
  };
}

function createInvalidRequest() {
  return {
    organizationId: 'invalid-uuid',
    checkType: 'invalid-type',
    priority: 'invalid-priority'
  };
}

// Mock report data builders to reduce object nesting
function createMockPlatformResult() {
  const weddingDataQuality = {
    weddingRecordsChecked: 450,
    seasonalDataAccuracy: 94.0,
    vendorDataConsistency: 87.0,
    guestDataCompleteness: 91.5,
  };
  
  return {
    platform: 'quickbooks',
    score: 89.0,
    recordsChecked: 1250,
    issues: [],
    weddingDataQuality,
  };
}

function createMockIssue() {
  return {
    category: 'accuracy',
    severity: 'high',
    platform: 'google_analytics',
    dataCategory: 'marketing_data',
    description: 'Inconsistent conversion tracking',
    affectedRecords: 156,
    suggestedAction: 'Implement server-side tracking',
    autoFixable: true,
    weddingImpact: 'high',
  };
}

function createMockSeasonalTrend() {
  return {
    month: 'June',
    qualityScore: 89.0,
    commonIssues: ['incomplete_guest_data'],
  };
}

function createMockRecommendation() {
  return {
    category: 'data_accuracy',
    priority: 'high',
    description: 'Implement automated data validation',
    implementation: 'Add server-side validation rules',
    estimatedImpact: 'Improve accuracy by 15%',
    weddingBusinessValue: 'Reduce booking errors and improve client satisfaction',
  };
}

function createCriticalIssue() {
  return {
    category: 'privacy',
    severity: 'critical',
    platform: 'quickbooks',
    dataCategory: 'guest_data',
    description: 'GDPR violation detected',
    affectedRecords: 500,
    weddingImpact: 'critical',
  };
}

function createScheduledCheck(orgId: string) {
  return {
    organization_id: orgId,
    check_type: 'comprehensive',
    frequency: 'weekly',
    next_run: '2024-07-22T10:00:00Z',
  };
}

// Helper functions to reduce nesting levels - REFACTORED TO MEET 4-LEVEL LIMIT
function createSelectChain(data: any = null, error: any = null) {
  const singleMock = vi.fn(() => Promise.resolve({ data, error }));
  const eqMock = vi.fn(() => ({ single: singleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  
  return { select: selectMock };
}

function createOrderChain(data: any = [], error: any = null) {
  const limitMock = vi.fn(() => Promise.resolve({ data, error }));
  const orderMock = vi.fn(() => ({ limit: limitMock }));
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  
  return { select: selectMock };
}

function createOrderNoLimitChain(data: any = [], error: any = null) {
  const orderMock = vi.fn(() => Promise.resolve({ data, error }));
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  
  return { select: selectMock };
}

function createInsertChain(error: any = null) {
  return {
    insert: vi.fn(() => Promise.resolve({ error }))
  };
}

function createUpdateChain(error: any = null) {
  const insertMock = vi.fn(() => Promise.resolve({ error }));
  const updateEqMock = vi.fn(() => Promise.resolve({ error }));
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));
  
  return {
    insert: insertMock,
    update: updateMock
  };
}

function createUpsertChain(error: any = null) {
  return {
    upsert: vi.fn(() => Promise.resolve({ error }))
  };
}

// Request helper functions to reduce nesting in test cases
function createPostRequest(url: string, body: any, authenticated = true) {
  const headers = authenticated
    ? { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
  
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function createGetRequest(url: string, authenticated = true) {
  const headers = authenticated
    ? { Authorization: 'Bearer valid-token' }
    : {};
  
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}

function createMalformedRequest(url: string, invalidBody: string) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid-token',
      'Content-Type': 'application/json',
    },
    body: invalidBody,
  });
}

function createMockCategoryScores() {
  return {
    completeness: 92.0,
    accuracy: 88.5,
    consistency: 85.0,
    timeliness: 90.0,
    privacy: 95.0,
  };
}

function createMockWeddingInsights() {
  return {
    peakSeasonDataQuality: 92.0,
    vendorDataReliability: 88.0,
    bookingDataAccuracy: 94.0,
    guestDataPrivacyCompliance: 96.0,
    seasonalTrends: [createMockSeasonalTrend()],
  };
}

function createMockQualityReport() {
  return {
    overallScore: 87.5,
    categoryScores: createMockCategoryScores(),
    platformResults: [createMockPlatformResult()],
    issues: [createMockIssue()],
    weddingInsights: createMockWeddingInsights(),
    recommendations: [createMockRecommendation()],
  };
}

describe('Analytics Quality Check API Route', () => {
  const validOrgId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockOrgMember = { role: 'admin', organization_id: validOrgId };
  const mockOrganization = { subscription_tier: 'scale' };

  const mockQualityReport = createMockQualityReport();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Setup default organization access using helper functions - REFACTORED TO REDUCE NESTING
    const tableHandlers = {
      'organization_members': () => createSelectChain(mockOrgMember, null),
      'organizations': () => createSelectChain(mockOrganization, null),
      'analytics_quality_checks': () => ({
        ...createOrderChain([], null),
        ...createUpdateChain(null)
      }),
      'analytics_audit_log': () => createInsertChain(null),
      'analytics_alerts': () => createInsertChain(null),
      'analytics_scheduled_checks': () => createUpsertChain(null)
    };

    mockSupabaseClient.from.mockImplementation((table) => {
      const handler = tableHandlers[table];
      return handler ? handler() : createInsertChain(null);
    });

    // Setup default quality check response
    mockDataQualityGovernance.executeQualityCheck.mockResolvedValue(
      mockQualityReport,
    );
  });

  describe('POST /api/integrations/analytics/quality-check', () => {
    it('should successfully execute comprehensive quality check', async () => {
      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createComprehensiveCheckRequest(validOrgId)
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checkId).toBeDefined();
      expect(data.status).toBe('completed');
      expect(data.overallScore).toBe(87.5);
      expect(data.platformResults.length).toBe(1);
      expect(data.weddingSpecificInsights).toBeDefined();
      expect(data.recommendations.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      vi.mocked(vi.importMock('next/headers')).headers.mockResolvedValue(
        new Headers({}),
      );

      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createBasicCheckRequest(validOrgId),
        false // not authenticated
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Missing or invalid authorization header');
    });

    it('should validate organization access', async () => {
      // REFACTORED: Reduced nesting using helper functions
      const tableHandlers = {
        'organization_members': () => createSelectChain(null, 'Not found')
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table];
        return handler ? handler() : { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
      });

      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createBasicCheckRequest(validOrgId)
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Organization access denied');
    });

    it('should enforce subscription tier requirements for comprehensive checks', async () => {
      // REFACTORED: Reduced nesting using helper functions
      const tableHandlers = {
        'organizations': () => createSelectChain({ subscription_tier: 'professional' }, null),
        'organization_members': () => createSelectChain(mockOrgMember, null)
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table];
        return handler ? handler() : { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
      });

      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createBasicCheckRequest(validOrgId)
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain(
        'Comprehensive quality checks require Scale tier or higher',
      );
      expect(data.requiredTier).toBe('scale');
      expect(data.currentTier).toBe('professional');
      expect(data.availableCheckTypes).toContain('incremental');
    });

    it('should validate request payload', async () => {
      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createInvalidRequest()
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should handle quality check execution failures', async () => {
      mockDataQualityGovernance.executeQualityCheck.mockRejectedValue(
        new Error('Quality engine offline'),
      );

      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createBasicCheckRequest(validOrgId, 'incremental')
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Quality check execution failed');
      expect(data.details).toContain('Quality engine offline');
    });

    it('should create critical issue alerts', async () => {
      const alertInsert = vi.fn(() => Promise.resolve({ error: null }));

      const criticalIssuesReport = {
        ...mockQualityReport,
        issues: [createCriticalIssue()],
      };

      mockDataQualityGovernance.executeQualityCheck.mockResolvedValue(
        criticalIssuesReport,
      );

      // REFACTORED: Reduced nesting using helper functions (fixes line 447)
      const tableHandlers = {
        'analytics_alerts': () => ({ insert: alertInsert }),
        'organization_members': () => createSelectChain(mockOrgMember, null),
        'organizations': () => createSelectChain(mockOrganization, null),
        'default': () => createUpdateChain(null)
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table] || tableHandlers['default'];
        return handler();
      });

      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createBasicCheckRequest(validOrgId)
      );

      await POST(request);

      const expectedAlertData = expect.objectContaining({
        organization_id: validOrgId,
        alert_type: 'data_quality',
        severity: 'critical',
        created_by: mockUser.id,
      });

      expect(alertInsert).toHaveBeenCalledWith(expectedAlertData);
    });

    it('should schedule recurring checks when requested', async () => {
      const scheduledCheckUpsert = vi.fn(() =>
        Promise.resolve({ error: null }),
      );

      // REFACTORED: Reduced nesting using helper functions  
      const tableHandlers = {
        'analytics_scheduled_checks': () => ({ upsert: scheduledCheckUpsert }),
        'organization_members': () => createSelectChain(mockOrgMember, null),
        'organizations': () => createSelectChain(mockOrganization, null),
        'default': () => createUpdateChain(null)
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table] || tableHandlers['default'];
        return handler();
      });

      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createScheduledCheckRequest(validOrgId)
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nextScheduledCheck).toBeDefined();
      const expectedScheduleData = expect.objectContaining({
        organization_id: validOrgId,
        frequency: 'weekly',
        created_by: mockUser.id,
      });

      expect(scheduledCheckUpsert).toHaveBeenCalledWith(expectedScheduleData);
    });

    it('should support wedding-specific quality checks', async () => {
      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createTargetedCheckRequest(validOrgId)
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.weddingSpecificInsights).toBeDefined();
      expect(data.weddingSpecificInsights.seasonalTrends).toBeDefined();
      const expectedWeddingChecks = expect.objectContaining({
        seasonalDataValidation: true,
        vendorPerformanceMetrics: true,
      });
      
      const expectedCallParams = expect.objectContaining({
        weddingSpecificChecks: expectedWeddingChecks,
      });

      expect(mockDataQualityGovernance.executeQualityCheck).toHaveBeenCalledWith(expectedCallParams);
    });
  });

  describe('GET /api/integrations/analytics/quality-check', () => {
    const mockQualityChecks = [
      {
        id: 'check-123',
        organization_id: validOrgId,
        check_type: 'comprehensive',
        overall_score: 87.5,
        status: 'completed',
        created_at: '2024-07-15T10:00:00Z',
        wedding_specific_checks: { seasonalDataValidation: true },
      },
      {
        id: 'check-456',
        organization_id: validOrgId,
        check_type: 'incremental',
        overall_score: 92.0,
        status: 'completed',
        created_at: '2024-07-15T11:00:00Z',
        wedding_specific_checks: { seasonalDataValidation: false },
      },
    ];

    beforeEach(() => {
      // REFACTORED: Reduced nesting using helper functions  
      const tableHandlers = {
        'analytics_quality_checks': () => createOrderChain(mockQualityChecks, null),
        'organization_members': () => createSelectChain(mockOrgMember, null),
        'analytics_scheduled_checks': () => createOrderNoLimitChain([], null)
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table];
        return handler ? handler() : { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
      });
    });

    it('should retrieve quality checks by organization ID', async () => {
      const request = createGetRequest(
        `http://localhost:3000/api/integrations/analytics/quality-check?organizationId=${validOrgId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.qualityChecks.length).toBe(2);
      expect(data.total).toBe(2);
      expect(data.weddingOptimizedChecks).toBe(1);
      expect(data.qualityTrend).toBeDefined();
      expect(data.qualityTrend.currentScore).toBe(87.5);
    });

    it('should retrieve specific quality check by ID', async () => {
      // REFACTORED: Reduced nesting using helper functions  
      const tableHandlers = {
        'analytics_quality_checks': () => createOrderChain([mockQualityChecks[0]], null),
        'organization_members': () => createSelectChain(mockOrgMember, null)
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table];
        return handler ? handler() : { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
      });

      const request = createGetRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check?checkId=check-123'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('check-123');
      expect(data.status).toBe('completed');
      expect(data.overall_score).toBe(87.5);
    });

    it('should include scheduled checks when requested', async () => {
      const scheduledChecks = [createScheduledCheck(validOrgId)];

      // REFACTORED: Reduced nesting using helper functions  
      const tableHandlers = {
        'analytics_quality_checks': () => createOrderChain(mockQualityChecks, null),
        'analytics_scheduled_checks': () => createOrderNoLimitChain(scheduledChecks, null),
        'organization_members': () => createSelectChain(mockOrgMember, null)
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table];
        return handler ? handler() : { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
      });

      const request = createGetRequest(
        `http://localhost:3000/api/integrations/analytics/quality-check?organizationId=${validOrgId}&includeScheduled=true`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scheduledChecks).toBeDefined();
      expect(data.scheduledChecks.length).toBe(1);
    });

    it('should require authentication for GET requests', async () => {
      vi.mocked(vi.importMock('next/headers')).headers.mockResolvedValue(
        new Headers({}),
      );

      const request = createGetRequest(
        `http://localhost:3000/api/integrations/analytics/quality-check?organizationId=${validOrgId}`,
        false // not authenticated
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Missing or invalid authorization header');
    });

    it('should validate query parameters', async () => {
      const request = createGetRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain(
        'checkId or organizationId parameter required',
      );
    });

    it('should return 404 for non-existent quality check', async () => {
      // REFACTORED: Reduced nesting using helper functions  
      const tableHandlers = {
        'analytics_quality_checks': () => createOrderChain([], null)
      };
      
      mockSupabaseClient.from.mockImplementation((table) => {
        const handler = tableHandlers[table];
        return handler ? handler() : { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
      });

      const request = createGetRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check?checkId=non-existent'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Quality check not found');
    });

    it('should calculate quality trends from multiple checks', async () => {
      const request = createGetRequest(
        `http://localhost:3000/api/integrations/analytics/quality-check?organizationId=${validOrgId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.qualityTrend.trend).toBe('declining'); // 87.5 < 92.0
      expect(data.qualityTrend.currentScore).toBe(87.5);
      expect(data.qualityTrend.previousScore).toBe(92.0);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const errorInsertMock = vi.fn(() => 
        Promise.resolve({ error: 'Database connection failed' })
      );
      
      const errorChainMock = { insert: errorInsertMock };
      mockSupabaseClient.from.mockImplementation(() => errorChainMock);

      const request = createPostRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        createBasicCheckRequest(validOrgId)
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to initiate quality check');
    });

    it('should handle malformed JSON requests', async () => {
      const request = createMalformedRequest(
        'http://localhost:3000/api/integrations/analytics/quality-check',
        'invalid json{'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain(
        'Internal server error during quality check',
      );
    });
  });
});
