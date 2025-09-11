import { GET, POST } from '@/app/api/clients/analytics/route';
import { GET as HistoricalGET } from '@/app/api/clients/analytics/historical/route';
import { GET as PerformanceGET } from '@/app/api/clients/analytics/performance/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('next/headers');
jest.mock('@/lib/rate-limiter', () => ({
  ratelimit: {
    limit: jest
      .fn()
      .mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now(),
        remaining: 99,
      }),
  },
}));

// API Test Helper Types
interface QueryParams {
  timeframe?: string;
  metrics?: string;
  privacy_level?: string;
  supplier_id?: string;
}

interface BulkRequest {
  client_id: string;
  supplier_id?: string;
  timeframe: string;
  metrics: string[];
  privacy_level: string;
}

interface DateRange {
  start_date: string;
  end_date: string;
  granularity?: string;
  export_format?: string;
  include_predictions?: boolean;
}

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  apply: jest.fn().mockReturnThis(),
  rpc: jest.fn(),
};

// Database Mock Builders - Reduces nesting from 5-6 levels to 2-3 levels
function createClientEngagementMock(data: any[]) {
  const mockData = { data, error: null };
  return {
    select: jest.fn().mockResolvedValue(mockData),
  };
}

function createOrganizationMemberMock(role: string | null) {
  const mockData = { data: role ? { role } : null, error: null };
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockData),
  };
}

function createUserRolesMock(role: string) {
  const mockData = { data: { role }, error: null };
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockData),
  };
}

function createDatabasePerformanceMock() {
  const performanceData = {
    datname: 'wedsync',
    numbackends: 5,
    xact_commit: 1000,
    xact_rollback: 10,
    blks_read: 500,
    blks_hit: 4500,
    tup_returned: 10000,
    tup_fetched: 8000,
    tup_inserted: 100,
    tup_updated: 50,
    tup_deleted: 10,
  };
  
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: performanceData, error: null }),
  };
}

// API Request Builders - Standardizes request creation
function createAnalyticsRequest(params: QueryParams = {}): NextRequest {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  
  const url = `http://localhost:3000/api/clients/analytics?${searchParams.toString()}`;
  return new NextRequest(url);
}

function createBulkAnalyticsRequest(requests: BulkRequest[]): NextRequest {
  const url = 'http://localhost:3000/api/clients/analytics';
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify({ requests }),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createHistoricalRequest(dateRange: DateRange): NextRequest {
  const searchParams = new URLSearchParams();
  Object.entries(dateRange).forEach(([key, value]) => {
    if (value) searchParams.append(key, value.toString());
  });
  
  const url = `http://localhost:3000/api/clients/analytics/historical?${searchParams.toString()}`;
  return new NextRequest(url);
}

// Response Validators - Extracts complex validation logic
function validateAnalyticsResponse(data: any, expectedMetrics: string[]) {
  expect(data).toHaveProperty('metadata');
  expect(data.metadata.requested_metrics).toEqual(expectedMetrics);
}

function validateAnonymizedData(data: any) {
  if (!data.engagement?.client_analytics) return;
  
  data.engagement.client_analytics.forEach((client: any) => {
    expect(client.client_id).toBeNull();
    expect(client.client_name).toBe('Anonymous');
  });
}

function validatePerformanceRecommendations(recommendations: any[]) {
  expect(Array.isArray(recommendations)).toBe(true);
  
  recommendations.forEach((rec: any) => {
    expect(rec).toHaveProperty('type');
    expect(rec).toHaveProperty('category');
    expect(rec).toHaveProperty('message');
    expect(rec).toHaveProperty('action');
    expect(['optimization', 'warning', 'critical']).toContain(rec.type);
  });
}

// Complex Mock Setup Handler - Reduces conditional nesting
function setupTableMocks(tableMocks: Record<string, any>) {
  return (table: string) => tableMocks[table] || mockSupabase;
}

// Access Control Mock Builder
function createAccessControlMock(allowedSuppliers: string[]) {
  return (field: string, value: string) => {
    const hasAccess = allowedSuppliers.includes(value);
    const roleData = hasAccess ? { role: 'admin' } : null;
    
    return {
      single: jest.fn().mockResolvedValue({ data: roleData, error: null }),
    };
  };
}

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
};

describe('Client Analytics API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue(new Map());

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('GET /api/clients/analytics', () => {
    it('should return client analytics data for authenticated user', async () => {
      const request = createAnalyticsRequest({
        timeframe: '30d',
        metrics: 'engagement,communication',
      });

      const engagementData = [{
        client_id: 'client-1',
        supplier_id: 'supplier-1',
        event_type: 'portal_login',
        created_at: '2024-01-01T10:00:00Z',
        session_id: 'session-1',
        clients: { name: 'John Doe', email: 'john@example.com' },
      }];

      mockSupabase.from.mockImplementation(setupTableMocks({
        'client_engagement_events': createClientEngagementMock(engagementData),
        'organization_members': createOrganizationMemberMock('admin'),
      }));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).toHaveProperty('timeframe', '30d');
      validateAnalyticsResponse(data, ['engagement', 'communication']);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      });

      const url = 'http://localhost:3000/api/clients/analytics';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for users without access to supplier data', async () => {
      const request = createAnalyticsRequest({ supplier_id: 'supplier-1' });

      mockSupabase.from.mockImplementation(setupTableMocks({
        'organization_members': createOrganizationMemberMock(null),
      }));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - No access to supplier data');
    });

    it('should validate query parameters', async () => {
      const request = createAnalyticsRequest({
        timeframe: 'invalid',
        privacy_level: 'invalid',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.details).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed'),
        }),
      }));

      const request = createAnalyticsRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate analytics data');
    });

    it('should respect privacy levels', async () => {
      const mockData = [{
        client_id: 'client-1',
        supplier_id: 'supplier-1',
        event_type: 'portal_login',
        created_at: '2024-01-01T10:00:00Z',
        clients: { name: 'John Doe', email: 'john@example.com' },
      }];

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        apply: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      }));

      const request = createAnalyticsRequest({ privacy_level: 'anonymized' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.privacy_level).toBe('anonymized');
      validateAnonymizedData(data);
    });

    it('should cache responses with appropriate headers', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const request = createAnalyticsRequest({ timeframe: '7d' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toContain('public');
      expect(response.headers.get('X-Analytics-Version')).toBe('1.0');
    });
  });

  describe('POST /api/clients/analytics (Bulk Requests)', () => {
    it('should handle bulk analytics requests', async () => {
      const bulkRequests: BulkRequest[] = [
        {
          client_id: 'client-1',
          timeframe: '30d',
          metrics: ['engagement'],
          privacy_level: 'full',
        },
        {
          client_id: 'client-2',
          timeframe: '7d',
          metrics: ['communication'],
          privacy_level: 'full',
        },
      ];

      const request = createBulkAnalyticsRequest(bulkRequests);

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      }));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.results).toHaveLength(2);
    });

    it('should limit bulk request size', async () => {
      const oversizedRequests = Array(11).fill({
        client_id: 'client-1',
        timeframe: '30d',
        metrics: ['engagement'],
        privacy_level: 'full',
      });

      const request = createBulkAnalyticsRequest(oversizedRequests);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid bulk request format');
    });

    it('should handle mixed success/failure in bulk requests', async () => {
      const mixedRequests: BulkRequest[] = [
        {
          client_id: 'client-1',
          supplier_id: 'allowed-supplier',
          timeframe: '30d',
          metrics: ['engagement'],
          privacy_level: 'full',
        },
        {
          client_id: 'client-2',
          supplier_id: 'forbidden-supplier',
          timeframe: '7d',
          metrics: ['communication'],
          privacy_level: 'full',
        },
      ];

      const request = createBulkAnalyticsRequest(mixedRequests);

      mockSupabase.from.mockImplementation(setupTableMocks({
        'organization_members': {
          select: jest.fn().mockReturnThis(),
          eq: createAccessControlMock(['allowed-supplier']),
        },
      }));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.processed).toBe(1);
      expect(data.failed).toBe(1);
    });
  });

  describe('GET /api/clients/analytics/historical', () => {
    it('should return historical analytics data', async () => {
      const dateRange: DateRange = {
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-31T23:59:59.999Z',
        granularity: 'daily',
      };
      
      const request = createHistoricalRequest(dateRange);

      const historicalData = [{
        period: '2024-01-01',
        event_type: 'portal_login',
        client_id: 'client-1',
        supplier_id: 'supplier-1',
      }];

      mockSupabase.from.mockImplementation(setupTableMocks({
        'client_engagement_events': createClientEngagementMock(historicalData),
        'organization_members': createOrganizationMemberMock('admin'),
      }));

      const response = await HistoricalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).toHaveProperty('start_date', dateRange.start_date);
      expect(data.metadata).toHaveProperty('end_date', dateRange.end_date);
      expect(data.metadata).toHaveProperty('granularity', 'daily');
    });

    it('should validate date ranges', async () => {
      const invalidDateRange: DateRange = {
        start_date: '2024-02-01T00:00:00.000Z', // Start after end
        end_date: '2024-01-01T00:00:00.000Z',
      };
      
      const request = createHistoricalRequest(invalidDateRange);
      const response = await HistoricalGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date range');
    });

    it('should handle CSV export', async () => {
      const csvDateRange: DateRange = {
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-31T23:59:59.999Z',
        export_format: 'csv',
      };
      
      const request = createHistoricalRequest(csvDateRange);

      const csvData = [{
        period: '2024-01-01',
        event_type: 'portal_login',
        client_id: 'client-1',
      }];

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ data: csvData, error: null }),
      }));

      const response = await HistoricalGET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });

    it('should include predictive insights when requested', async () => {
      const predictionDateRange: DateRange = {
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-31T23:59:59.999Z',
        include_predictions: true,
      };
      
      const request = createHistoricalRequest(predictionDateRange);

      const historicalData = Array(10).fill(null).map((_, i) => ({
        period: `2024-01-${String(i + 1).padStart(2, '0')}`,
        event_type: 'portal_login',
        client_id: 'client-1',
        supplier_id: 'supplier-1',
      }));

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ data: historicalData, error: null }),
      }));

      const response = await HistoricalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('predictive_insights');
      expect(data.predictive_insights).toHaveProperty('predictions');
      expect(data.predictive_insights).toHaveProperty('confidence');
    });
  });

  describe('GET /api/clients/analytics/performance', () => {
    it('should return performance metrics for admin users', async () => {
      const url = 'http://localhost:3000/api/clients/analytics/performance?timeframe=24h';
      const request = new NextRequest(url);

      mockSupabase.from.mockImplementation(setupTableMocks({
        'user_roles': createUserRolesMock('admin'),
      }));

      const response = await PerformanceGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('system_health');
      expect(data.system_health).toHaveProperty('status');
      expect(data.system_health).toHaveProperty('checks');
      expect(data).toHaveProperty('recommendations');
    });

    it('should deny access to non-admin users', async () => {
      const url = 'http://localhost:3000/api/clients/analytics/performance';
      const request = new NextRequest(url);

      mockSupabase.from.mockImplementation(setupTableMocks({
        'user_roles': createUserRolesMock('user'),
      }));

      const response = await PerformanceGET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('should include database performance metrics', async () => {
      const url = 'http://localhost:3000/api/clients/analytics/performance?metrics=database_performance';
      const request = new NextRequest(url);

      mockSupabase.from.mockImplementation(setupTableMocks({
        'user_roles': createUserRolesMock('admin'),
        'pg_stat_database': createDatabasePerformanceMock(),
      }));

      const response = await PerformanceGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('database_performance');
      expect(data.database_performance).toHaveProperty('active_connections');
      expect(data.database_performance).toHaveProperty('cache_hit_ratio');
    });

    it('should generate performance recommendations', async () => {
      const url = 'http://localhost:3000/api/clients/analytics/performance';
      const request = new NextRequest(url);

      mockSupabase.from.mockImplementation(setupTableMocks({
        'user_roles': createUserRolesMock('admin'),
      }));

      const response = await PerformanceGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations).toBeDefined();
      validatePerformanceRecommendations(data.recommendations);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const { ratelimit } = require('@/lib/rate-limiter');
      ratelimit.limit.mockResolvedValueOnce({
        success: false,
        limit: 30,
        reset: Date.now() + 60000,
        remaining: 0,
      });

      const request = createAnalyticsRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('reset');
      expect(data).toHaveProperty('remaining');
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase connection errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      const request = createAnalyticsRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate analytics data');
    });

    it('should handle malformed JSON in POST requests', async () => {
      const url = 'http://localhost:3000/api/clients/analytics';
      const request = new NextRequest(url, {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('should validate required fields in bulk requests', async () => {
      const invalidRequests = [{ timeframe: 'invalid' }]; // Missing required fields
      const request = createBulkAnalyticsRequest(invalidRequests as BulkRequest[]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid bulk request format');
    });
  });

  describe('Data Privacy Compliance', () => {
    it('should anonymize data when privacy_level is anonymized', async () => {
      const privacyTestData = [{
        client_id: 'client-1',
        supplier_id: 'supplier-1',
        event_type: 'portal_login',
        created_at: '2024-01-01T10:00:00Z',
        clients: { name: 'John Doe', email: 'john@example.com' },
      }];

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ data: privacyTestData, error: null }),
      }));

      const request = createAnalyticsRequest({ privacy_level: 'anonymized' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Privacy-Level')).toBe('anonymized');
      validateAnonymizedData(data);
    });

    it('should round sensitive numbers in anonymized mode', async () => {
      const revenueData = [{
        client_id: 'client-1',
        supplier_id: 'supplier-1',
        revenue_amount: '1234.56',
        transaction_date: '2024-01-01T00:00:00Z',
      }];

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ data: revenueData, error: null }),
      }));

      const request = createAnalyticsRequest({
        metrics: 'revenue',
        privacy_level: 'anonymized',
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      if (data.revenue) {
        expect(data.revenue.total_revenue % 100).toBe(0);
      }
    });
  });
});
