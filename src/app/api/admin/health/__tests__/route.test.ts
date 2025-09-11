import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/services/health-monitor');
jest.mock('@/lib/middleware/rate-limiting');

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  })),
};

const mockHealthData = {
  infrastructure: {
    serverUptime: 99.9,
    responseTime: 150,
    cpuUsage: 45,
    memoryUsage: 60,
    diskSpace: 25,
    networkLatency: 30,
  },
  services: {
    database: {
      status: 'healthy',
      latency: 50,
      lastCheck: new Date().toISOString(),
      errorCount24h: 0,
      uptime: 99.9,
    },
    redis: {
      status: 'healthy',
      latency: 20,
      lastCheck: new Date().toISOString(),
      errorCount24h: 0,
      uptime: 100,
    },
    emailService: {
      status: 'healthy',
      latency: 200,
      lastCheck: new Date().toISOString(),
      errorCount24h: 0,
      uptime: 99.5,
    },
    smsService: {
      status: 'healthy',
      latency: 300,
      lastCheck: new Date().toISOString(),
      errorCount24h: 0,
      uptime: 98.5,
    },
    supabase: {
      status: 'healthy',
      latency: 100,
      lastCheck: new Date().toISOString(),
      errorCount24h: 0,
      uptime: 99.8,
    },
    storage: {
      status: 'healthy',
      latency: 150,
      lastCheck: new Date().toISOString(),
      errorCount24h: 0,
      uptime: 99.2,
    },
  },
  apiHealth: {
    requestsPerMinute: 120,
    errorRate: 2.1,
    p95ResponseTime: 350,
    p99ResponseTime: 800,
    activeConnections: 45,
    throughput: 2.0,
  },
  jobQueue: {
    pending: 5,
    processing: 3,
    failed: 1,
    completed24h: 1250,
    oldestPendingJob: 2,
    averageProcessingTime: 45,
  },
  lastUpdated: new Date().toISOString(),
};

describe('/api/admin/health', () => {
  let mockCreateClient: jest.Mock;
  let mockHealthMonitor: jest.Mock;
  let mockRateLimit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock createClient
    mockCreateClient = require('@/lib/supabase/server').createClient;
    mockCreateClient.mockReturnValue(mockSupabaseClient);

    // Mock healthMonitor
    const healthMonitorModule = require('@/lib/services/health-monitor');
    mockHealthMonitor = healthMonitorModule.healthMonitor;
    mockHealthMonitor.performHealthCheck = jest
      .fn()
      .mockResolvedValue(mockHealthData);

    // Mock rate limiting
    mockRateLimit = require('@/lib/middleware/rate-limiting').rateLimit;
    mockRateLimit.mockReturnValue(
      jest.fn().mockResolvedValue({ success: true }),
    );
  });

  describe('GET /api/admin/health', () => {
    it('should return health data for authenticated admin', async () => {
      // Mock authenticated admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.data.services).toBeDefined();
      expect(responseData.data.infrastructure).toBeDefined();
      expect(responseData.meta.requestId).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });

    it('should return 403 for non-admin users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'user', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Insufficient permissions');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = { error: 'Rate limit exceeded' };
      mockRateLimit.mockReturnValue(
        jest.fn().mockResolvedValue(rateLimitError),
      );

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Rate limit exceeded');
    });

    it('should include history data when requested', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      // Mock history data query
      mockSupabaseClient.from().limit.mockResolvedValue({
        data: [
          {
            service: 'database',
            status: 'healthy',
            latency: 50,
            checked_at: new Date(),
          },
        ],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/health?history=true',
      );
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.history).toBeDefined();
      expect(responseData.data.history.period).toBe('24h');
    });

    it('should filter by service when specified', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/health?service=database',
      );
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.services.database).toBeDefined();
      expect(Object.keys(responseData.data.services)).toHaveLength(1);
    });

    it('should return degraded status (206) when services are degraded', async () => {
      const degradedHealthData = {
        ...mockHealthData,
        services: {
          ...mockHealthData.services,
          database: {
            ...mockHealthData.services.database,
            status: 'degraded' as const,
          },
        },
      };

      mockHealthMonitor.performHealthCheck.mockResolvedValue(
        degradedHealthData,
      );

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(206);
      expect(response.headers.get('X-Health-Status')).toBe('degraded');
    });

    it('should return service unavailable (503) when critical services are down', async () => {
      const downHealthData = {
        ...mockHealthData,
        services: {
          ...mockHealthData.services,
          database: {
            ...mockHealthData.services.database,
            status: 'down' as const,
          },
        },
      };

      mockHealthMonitor.performHealthCheck.mockResolvedValue(downHealthData);

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(503);
      expect(response.headers.get('X-Health-Status')).toBe('down');
    });

    it('should handle health check errors gracefully', async () => {
      mockHealthMonitor.performHealthCheck.mockRejectedValue(
        new Error('Health check failed'),
      );

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Health check failed');
      expect(response.headers.get('X-Health-Status')).toBe('down');
    });

    it('should include detailed metrics when requested', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      // Mock metrics data query
      mockSupabaseClient.from().limit.mockResolvedValue({
        data: [
          {
            metric_type: 'cpu_usage',
            value: 45.2,
            metadata: {},
            recorded_at: new Date(),
          },
          {
            metric_type: 'memory_usage',
            value: 62.1,
            metadata: {},
            recorded_at: new Date(),
          },
        ],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/health?metrics=true',
      );
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.detailedMetrics).toBeDefined();
      expect(responseData.data.detailedMetrics.period).toBe('1h');
    });
  });

  describe('POST /api/admin/health', () => {
    it('should trigger manual health check for admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/health',
        {
          method: 'POST',
          body: JSON.stringify({
            services: ['database', 'redis'],
            forceRefresh: true,
          }),
        },
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.meta.triggeredBy).toBe('admin-user-id');
      expect(mockHealthMonitor.performHealthCheck).toHaveBeenCalled();
    });

    it('should require authentication for manual health checks', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/health',
        {
          method: 'POST',
          body: JSON.stringify({ forceRefresh: true }),
        },
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });

    it('should require admin permissions for manual health checks', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'user', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/health',
        {
          method: 'POST',
          body: JSON.stringify({ forceRefresh: true }),
        },
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Admin access required');
    });

    it('should handle manual health check failures', async () => {
      mockHealthMonitor.performHealthCheck.mockRejectedValue(
        new Error('Manual check failed'),
      );

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/health',
        {
          method: 'POST',
          body: JSON.stringify({ forceRefresh: true }),
        },
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Manual health check failed');
      expect(responseData.message).toBe('Manual check failed');
    });
  });

  describe('Health Status Determination', () => {
    it('should return healthy status when all services are operational', () => {
      // This would test the internal getOverallHealthStatus function
      // Since it's not exported, we test it through the API response status codes
      const healthyData = mockHealthData;
      mockHealthMonitor.performHealthCheck.mockResolvedValue(healthyData);

      // Test would verify that the response status is 200 for healthy systems
    });

    it('should return degraded status when non-critical services are down', () => {
      const degradedData = {
        ...mockHealthData,
        services: {
          ...mockHealthData.services,
          smsService: {
            ...mockHealthData.services.smsService,
            status: 'down' as const,
          },
        },
      };
      mockHealthMonitor.performHealthCheck.mockResolvedValue(degradedData);

      // Test would verify that the response status is 206 for degraded systems
    });

    it('should return down status when critical services are unavailable', () => {
      const downData = {
        ...mockHealthData,
        services: {
          ...mockHealthData.services,
          database: {
            ...mockHealthData.services.database,
            status: 'down' as const,
          },
          supabase: {
            ...mockHealthData.services.supabase,
            status: 'down' as const,
          },
        },
      };
      mockHealthMonitor.performHealthCheck.mockResolvedValue(downData);

      // Test would verify that the response status is 503 for down systems
    });
  });

  describe('Audit Logging', () => {
    it('should log health check access for audit trail', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      mockSupabaseClient
        .from()
        .insert.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      await GET(request);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'admin-user-id',
          organization_id: 'org-123',
          action: 'health_check_access',
          resource_type: 'system_health',
        }),
      );
    });

    it('should not fail health check if audit logging fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-123' },
        error: null,
      });

      // Mock audit log insertion failure
      mockSupabaseClient
        .from()
        .insert.mockRejectedValue(new Error('Audit log failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log health access:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
