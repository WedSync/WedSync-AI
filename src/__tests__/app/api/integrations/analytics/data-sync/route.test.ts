import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/integrations/analytics/data-sync/route';
import { NextRequest } from 'next/server';

// Mock Next.js headers
const createMockHeaders = () => Promise.resolve(new Headers({
  'Authorization': 'Bearer valid-token'
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(createMockHeaders)
}));

// Helper functions to reduce nesting levels
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

function createInsertChain(error: any = null) {
  const insertMock = vi.fn(() => Promise.resolve({ error }));
  return { insert: insertMock };
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

// Combined chain for analytics_sync_jobs to avoid deep nesting
function createAnalyticsSyncJobsChain(data: any = [], error: any = null) {
  const orderChain = createOrderChain(data, error);
  const updateChain = createUpdateChain(error);
  return {
    ...orderChain,
    ...updateChain
  };
}

// Default mock chain for unhandled tables
function createDefaultMockChain() {
  return {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn()
  };
}

// Extract conditional handlers to eliminate S2004 nesting violations
function createSyncJobsHandler(config: any) {
  const hasJobsOrError = config.syncJobs.length || config.syncJobsError;
  
  if (hasJobsOrError) {
    return createOrderChain(config.syncJobs, config.syncJobsError);
  }
  
  return createAnalyticsSyncJobsChain(config.syncJobs, config.syncJobsError);
}

function createAuditLogHandler(config: any) {
  const customHandler = config.customHandlers['analytics_audit_log'];
  
  if (customHandler) {
    return customHandler();
  }
  
  return createInsertChain(config.auditError);
}

// Extract table lookup to prevent deep nesting
function createTableLookup(handlers: Record<string, Function>) {
  return function getHandlerForTable(table: string) {
    const handler = handlers[table];
    
    if (handler) {
      return handler();
    }
    
    return createDefaultMockChain();
  };
}

// Factory function with zero S2004 nesting violations
function createTableHandlerFactory(config = {}) {
  const defaultConfig = {
    orgMember: null,
    orgMemberError: null,
    organization: null,
    organizationError: null,
    syncJobs: [],
    syncJobsError: null,
    auditError: null,
    customHandlers: {}
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  const handlers = {
    'organization_members': () => createSelectChain(
      finalConfig.orgMember,
      finalConfig.orgMemberError
    ),
    'organizations': () => createSelectChain(
      finalConfig.organization,
      finalConfig.organizationError
    ),
    'analytics_sync_jobs': () => createSyncJobsHandler(finalConfig),
    'analytics_audit_log': () => createAuditLogHandler(finalConfig),
    ...finalConfig.customHandlers
  };
  
  return (table) => {
    const handler = handlers[table];
    return handler ? handler() : createDefaultMockChain();
  };
}

// Helper for audit log test setup
function createAuditLogTestHandler(auditLogInsert, baseConfig = {}) {
  return createTableHandlerFactory({
    ...baseConfig,
    customHandlers: {
      'analytics_audit_log': () => ({ insert: auditLogInsert })
    }
  });
}

// Request payload builders to reduce nesting
const createRequestHeaders = () => ({
  'Authorization': 'Bearer valid-token',
  'Content-Type': 'application/json'
});

const createDateRange = (start = '2024-07-01T00:00:00Z', end = '2024-07-31T23:59:59Z') => ({ start, end });

const createSyncPayload = (overrides = {}) => {
  const defaults = {
    organizationId: '',
    syncType: 'incremental',
    platforms: ['tableau'],
    dateRange: createDateRange(),
    weddingSeasonOptimization: false,
    priority: 'normal'
  };
  return { ...defaults, ...overrides };
};

const createPostRequest = (url, payload) => new NextRequest(url, {
  method: 'POST',
  headers: createRequestHeaders(),
  body: JSON.stringify(payload)
});

const createGetRequest = (url) => new NextRequest(url, {
  method: 'GET',
  headers: { 'Authorization': 'Bearer valid-token' }
});

// Mock Supabase client with reduced nesting
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));

// Mock analytics integration classes
const mockBIPlatformConnector = {
  syncPlatformData: vi.fn()
};

const mockDataWarehouseManager = {
  syncWarehouse: vi.fn()
};

const mockThirdPartyAnalyticsIntegrator = {
  syncPlatform: vi.fn()
};

vi.mock('@/lib/integrations/analytics/bi-platform-connector', () => ({
  BIPlatformConnector: vi.fn(() => mockBIPlatformConnector)
}));

vi.mock('@/lib/integrations/analytics/data-warehouse-manager', () => ({
  DataWarehouseManager: vi.fn(() => mockDataWarehouseManager)
}));

vi.mock('@/lib/integrations/analytics/third-party-analytics', () => ({
  ThirdPartyAnalyticsIntegrator: vi.fn(() => mockThirdPartyAnalyticsIntegrator)
}));

describe('Analytics Data Sync API Route', () => {
  const validOrgId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockOrgMember = { role: 'admin', organization_id: validOrgId };
  const mockOrganization = { subscription_tier: 'professional' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Setup default organization access
    mockSupabaseClient.from.mockImplementation(
      createTableHandlerFactory({
        orgMember: mockOrgMember,
        organization: mockOrganization
      })
    );

    // Setup default sync responses
    mockBIPlatformConnector.syncPlatformData.mockResolvedValue({
      success: true,
      recordsProcessed: 150
    });

    mockDataWarehouseManager.syncWarehouse.mockResolvedValue({
      success: true,
      recordsProcessed: 200
    });

    mockThirdPartyAnalyticsIntegrator.syncPlatform.mockResolvedValue({
      success: true,
      recordsProcessed: 300,
      weddingMetrics: {
        totalWeddings: 45,
        seasonalTrends: []
      }
    });
  });

  describe('POST /api/integrations/analytics/data-sync', () => {
    it('should successfully initiate data sync for multiple platforms', async () => {
      const payload = createSyncPayload({
        organizationId: validOrgId,
        platforms: ['tableau', 'bigquery', 'google_analytics'],
        weddingSeasonOptimization: true,
        priority: 'high'
      });
      const request = createPostRequest('http://localhost:3000/api/integrations/analytics/data-sync', payload);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncId).toBeDefined();
      expect(data.status).toBe('completed');
      expect(data.platformResults.length).toBe(3);
      expect(data.totalRecords).toBe(650); // 150 + 200 + 300
      expect(data.weddingInsights).toBeDefined();
    });

    it('should require authentication', async () => {
      vi.mocked(vi.importMock('next/headers')).headers.mockResolvedValue(
        new Headers({})
      );

      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: validOrgId,
          syncType: 'incremental',
          platforms: ['tableau']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Missing or invalid authorization header');
    });

    it('should validate organization access', async () => {
      mockSupabaseClient.from.mockImplementation(
        createTableHandlerFactory({
          orgMember: null,
          orgMemberError: 'Not found'
        })
      );

      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: validOrgId,
          syncType: 'incremental',
          platforms: ['tableau']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Organization access denied');
    });

    it('should enforce subscription tier requirements', async () => {
      mockSupabaseClient.from.mockImplementation(
        createTableHandlerFactory({
          organization: { subscription_tier: 'starter' },
          orgMember: mockOrgMember
        })
      );

      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: validOrgId,
          syncType: 'incremental',
          platforms: ['tableau']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Analytics integration requires Professional tier or higher');
      expect(data.requiredTier).toBe('professional');
      expect(data.currentTier).toBe('starter');
    });

    it('should validate request payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: 'invalid-uuid',
          syncType: 'invalid-type',
          platforms: []
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should handle platform sync failures gracefully', async () => {
      mockBIPlatformConnector.syncPlatformData.mockRejectedValue(
        new Error('Tableau connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: validOrgId,
          syncType: 'incremental',
          platforms: ['tableau', 'bigquery'],
          weddingSeasonOptimization: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('partial');
      expect(data.platformResults.some(p => p.status === 'failed')).toBe(true);
      expect(data.platformResults.some(p => p.status === 'success')).toBe(true);
    });

    it('should support wedding season optimization', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: validOrgId,
          syncType: 'incremental',
          platforms: ['google_analytics'],
          weddingSeasonOptimization: true,
          priority: 'urgent'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.weddingInsights).toBeDefined();
      expect(data.weddingInsights.seasonalOptimizationEnabled).toBe(true);
    });

    it('should create audit log entries', async () => {
      const auditLogInsert = vi.fn(() => Promise.resolve({ error: null }));
      
      // Pre-configure the audit log test handler to reduce nesting
      const auditLogHandler = createAuditLogTestHandler(auditLogInsert, {
        orgMember: mockOrgMember,
        organization: mockOrganization
      });
      
      mockSupabaseClient.from.mockImplementation(auditLogHandler);

      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: validOrgId,
          syncType: 'full',
          platforms: ['tableau']
        })
      });

      await POST(request);

      expect(auditLogInsert).toHaveBeenCalledWith(expect.objectContaining({
        organization_id: validOrgId,
        action: 'data_sync',
        performed_by: mockUser.id
      }));
    });
  });

  describe('GET /api/integrations/analytics/data-sync', () => {
    const mockSyncJobs = [
      {
        id: 'sync-123',
        organization_id: validOrgId,
        sync_type: 'incremental',
        platforms: ['tableau', 'bigquery'],
        status: 'completed',
        created_at: '2024-07-15T10:00:00Z',
        wedding_season_optimization: true
      },
      {
        id: 'sync-456',
        organization_id: validOrgId,
        sync_type: 'full',
        platforms: ['google_analytics'],
        status: 'in_progress',
        created_at: '2024-07-15T11:00:00Z',
        wedding_season_optimization: false
      }
    ];

    beforeEach(() => {
      mockSupabaseClient.from.mockImplementation(
        createTableHandlerFactory({
          syncJobs: mockSyncJobs,
          orgMember: mockOrgMember
        })
      );
    });

    it('should retrieve sync jobs by organization ID', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/integrations/analytics/data-sync?organizationId=${validOrgId}`,
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncJobs.length).toBe(2);
      expect(data.total).toBe(2);
      expect(data.weddingOptimizedInsights).toBe(1);
    });

    it('should retrieve specific sync job by ID', async () => {
      mockSupabaseClient.from.mockImplementation(
        createTableHandlerFactory({
          syncJobs: [mockSyncJobs[0]],
          orgMember: mockOrgMember
        })
      );

      const request = new NextRequest(
        `http://localhost:3000/api/integrations/analytics/data-sync?syncId=sync-123`,
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('sync-123');
      expect(data.status).toBe('completed');
    });

    it('should require authentication for GET requests', async () => {
      vi.mocked(vi.importMock('next/headers')).headers.mockResolvedValue(
        new Headers({})
      );

      const request = new NextRequest(
        `http://localhost:3000/api/integrations/analytics/data-sync?organizationId=${validOrgId}`,
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Missing or invalid authorization header');
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/analytics/data-sync',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('syncId or organizationId parameter required');
    });

    it('should return 404 for non-existent sync job', async () => {
      mockSupabaseClient.from.mockImplementation(
        createTableHandlerFactory({
          syncJobs: []
        })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/integrations/analytics/data-sync?syncId=non-existent',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Sync job not found');
    });

    it('should enforce organization access for sync job retrieval', async () => {
      const modifiedJob = { ...mockSyncJobs[0], organization_id: 'different-org-id' };
      
      mockSupabaseClient.from.mockImplementation(
        createTableHandlerFactory({
          syncJobs: [modifiedJob],
          orgMember: null,
          orgMemberError: 'Not found'
        })
      );

      const request = new NextRequest(
        'http://localhost:3000/api/integrations/analytics/data-sync?syncId=sync-123',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied to this sync job');
    });
  });

  // Helper to create request with reduced nesting
  const createDatabaseErrorRequest = () => {
    const requestPayload = {
      organizationId: validOrgId,
      syncType: 'incremental',
      platforms: ['tableau']
    };
    
    const requestHeaders = {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    };
    
    const requestOptions = {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestPayload)
    };

    return new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', requestOptions);
  };

  // Helper function to reduce nesting complexity (S2004)
  function createDatabaseErrorHandler() {
    return () => ({
      insert: vi.fn(() => Promise.resolve({ error: 'Database connection failed' }))
    });
  }

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(createDatabaseErrorHandler());

      const request = createDatabaseErrorRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to initiate sync job');
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/analytics/data-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: 'invalid json{'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error during data sync');
    });
  });
});