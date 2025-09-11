import { HealthMonitor } from '../health-monitor';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabaseClient = {
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
};

// Mock Redis
jest.mock('@/lib/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.RESEND_API_KEY = 'test-resend-key';

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    healthMonitor = new HealthMonitor();
  });

  describe('Database Health Check', () => {
    it('should return healthy status for successful database connection', async () => {
      // Mock successful database query
      const mockSelect = jest.fn().mockReturnValue({
        limit: jest
          .fn()
          .mockResolvedValue({ data: [{ id: 'test' }], error: null }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const status = await healthMonitor.checkDatabase();

      expect(status.status).toBe('healthy');
      expect(typeof status.latency).toBe('number');
      expect(status.latency).toBeGreaterThan(0);
      expect(status.lastCheck).toBeDefined();
    });

    it('should return down status for database connection failure', async () => {
      // Mock database error
      const mockSelect = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' },
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const status = await healthMonitor.checkDatabase();

      expect(status.status).toBe('down');
      expect(status.latency).toBe(-1);
      expect(status.message).toBe('Connection failed');
    });

    it('should return degraded status for slow database response', async () => {
      // Mock slow database response
      const mockSelect = jest.fn().mockReturnValue({
        limit: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(
                  () => resolve({ data: [{ id: 'test' }], error: null }),
                  1100,
                ),
              ),
          ),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const status = await healthMonitor.checkDatabase();

      expect(status.status).toBe('degraded');
      expect(status.latency).toBeGreaterThan(1000);
    });
  });

  describe('Redis Health Check', () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = require('@/lib/redis');
    });

    it('should return healthy status for successful Redis operations', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('test_value');
      mockRedis.del.mockResolvedValue(1);

      const status = await healthMonitor.checkRedis();

      expect(status.status).toBe('healthy');
      expect(status.latency).toBeLessThan(500);
    });

    it('should return down status for Redis connection failure', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      const status = await healthMonitor.checkRedis();

      expect(status.status).toBe('down');
      expect(status.latency).toBe(-1);
      expect(status.message).toBe('Redis connection failed');
    });

    it('should return degraded status for slow Redis response', async () => {
      mockRedis.set.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('OK'), 600)),
      );
      mockRedis.get.mockResolvedValue('test_value');
      mockRedis.del.mockResolvedValue(1);

      const status = await healthMonitor.checkRedis();

      expect(status.status).toBe('degraded');
      expect(status.latency).toBeGreaterThan(500);
    });
  });

  describe('Email Service Health Check', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return healthy status for successful email service', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const status = await healthMonitor.checkEmailService();

      expect(status.status).toBe('healthy');
      expect(status.latency).toBeLessThan(2000);
    });

    it('should return down status for failed email service', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const status = await healthMonitor.checkEmailService();

      expect(status.status).toBe('down');
    });

    it('should return degraded status for slow email service', async () => {
      global.fetch = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ ok: true, status: 200 }), 2100),
            ),
        );

      const status = await healthMonitor.checkEmailService();

      expect(status.status).toBe('degraded');
      expect(status.latency).toBeGreaterThan(2000);
    });
  });

  describe('Storage Health Check', () => {
    it('should return healthy status for successful storage access', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [{ name: 'test' }],
        error: null,
      });
      mockSupabaseClient.storage.from.mockReturnValue({ list: mockList });

      const status = await healthMonitor.checkStorage();

      expect(status.status).toBe('healthy');
      expect(status.latency).toBeLessThan(2000);
    });

    it('should return down status for storage access failure', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage bucket not accessible' },
      });
      mockSupabaseClient.storage.from.mockReturnValue({ list: mockList });

      const status = await healthMonitor.checkStorage();

      expect(status.status).toBe('down');
      expect(status.message).toBe('Storage bucket not accessible');
    });
  });

  describe('System Health Check', () => {
    it('should perform comprehensive health check successfully', async () => {
      // Mock all service checks to be healthy
      const mockSelect = jest.fn().mockReturnValue({
        limit: jest
          .fn()
          .mockResolvedValue({ data: [{ id: 'test' }], error: null }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const mockList = jest.fn().mockResolvedValue({
        data: [{ name: 'test' }],
        error: null,
      });
      mockSupabaseClient.storage.from.mockReturnValue({ list: mockList });

      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const mockRedis = require('@/lib/redis');
      mockRedis.get.mockResolvedValue(null); // No cache
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('test_value');
      mockRedis.del.mockResolvedValue(1);
      mockRedis.setex.mockResolvedValue('OK');

      const systemHealth = await healthMonitor.performHealthCheck();

      expect(systemHealth).toBeDefined();
      expect(systemHealth.services).toBeDefined();
      expect(systemHealth.infrastructure).toBeDefined();
      expect(systemHealth.apiHealth).toBeDefined();
      expect(systemHealth.jobQueue).toBeDefined();
      expect(systemHealth.lastUpdated).toBeDefined();
    });

    it('should handle partial service failures gracefully', async () => {
      // Mock database failure
      const mockSelect = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database down' },
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // Mock other services as healthy
      const mockList = jest.fn().mockResolvedValue({
        data: [{ name: 'test' }],
        error: null,
      });
      mockSupabaseClient.storage.from.mockReturnValue({ list: mockList });

      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const mockRedis = require('@/lib/redis');
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('test_value');
      mockRedis.del.mockResolvedValue(1);

      const systemHealth = await healthMonitor.performHealthCheck();

      expect(systemHealth.services.database.status).toBe('down');
      expect(systemHealth.services.storage.status).toBe('healthy');
    });

    it('should use cached results when available and fresh', async () => {
      const cachedHealth = {
        infrastructure: { serverUptime: 99.9 },
        services: { database: { status: 'healthy' } },
        apiHealth: { requestsPerMinute: 100 },
        jobQueue: { pending: 5 },
        lastUpdated: new Date().toISOString(),
      };

      const mockRedis = require('@/lib/redis');
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedHealth));

      const systemHealth = await healthMonitor.performHealthCheck();

      expect(systemHealth.infrastructure.serverUptime).toBe(99.9);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });

  describe('Error Count and Uptime Calculation', () => {
    it('should calculate error count for last 24 hours', async () => {
      const mockCount = jest.fn().mockResolvedValue({ count: 5, error: null });
      const mockSelect = jest.fn().mockReturnValue({
        count: mockCount,
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // Use reflection to access private method for testing
      const errorCount = await (healthMonitor as any).getErrorCount24h(
        'database',
      );

      expect(errorCount).toBe(5);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('health_checks');
    });

    it('should calculate uptime percentage', async () => {
      const mockData = [
        { status: 'healthy', checked_at: new Date() },
        { status: 'healthy', checked_at: new Date() },
        { status: 'down', checked_at: new Date() },
        { status: 'healthy', checked_at: new Date() },
      ];

      const mockLimit = jest
        .fn()
        .mockResolvedValue({ data: mockData, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq = jest.fn().mockReturnValue({ gte: mockGte });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const uptime = await (healthMonitor as any).calculateUptime('database');

      expect(uptime).toBe(75); // 3 out of 4 checks were healthy
    });
  });

  describe('Alert Threshold Management', () => {
    it('should initialize default thresholds', () => {
      const monitor = new HealthMonitor();

      // Access private property for testing
      const thresholds = (monitor as any).alertThresholds;

      expect(thresholds.has('database')).toBe(true);
      expect(thresholds.has('infrastructure')).toBe(true);
    });

    it('should check thresholds and create alerts for critical conditions', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const criticalHealth = {
        infrastructure: {
          serverUptime: 99.9,
          responseTime: 100,
          cpuUsage: 90, // Above threshold
          memoryUsage: 95, // Above threshold
          diskSpace: 95, // Above threshold
          networkLatency: 20,
        },
        services: {
          database: {
            status: 'down' as const,
            latency: -1,
            lastCheck: '',
            errorCount24h: 0,
            uptime: 0,
          },
          redis: {
            status: 'healthy' as const,
            latency: 100,
            lastCheck: '',
            errorCount24h: 0,
            uptime: 100,
          },
          emailService: {
            status: 'healthy' as const,
            latency: 100,
            lastCheck: '',
            errorCount24h: 0,
            uptime: 100,
          },
          smsService: {
            status: 'healthy' as const,
            latency: 100,
            lastCheck: '',
            errorCount24h: 0,
            uptime: 100,
          },
          supabase: {
            status: 'healthy' as const,
            latency: 100,
            lastCheck: '',
            errorCount24h: 0,
            uptime: 100,
          },
          storage: {
            status: 'healthy' as const,
            latency: 100,
            lastCheck: '',
            errorCount24h: 0,
            uptime: 100,
          },
        },
        apiHealth: {
          requestsPerMinute: 100,
          errorRate: 10, // Above threshold
          p95ResponseTime: 500,
          p99ResponseTime: 1000,
          activeConnections: 50,
          throughput: 10,
        },
        jobQueue: {
          pending: 10,
          processing: 2,
          failed: 1,
          completed24h: 1000,
          oldestPendingJob: 5,
          averageProcessingTime: 30,
        },
        lastUpdated: new Date().toISOString(),
      };

      await (healthMonitor as any).checkAlertThresholds(criticalHealth);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'HEALTH ALERT [CRITICAL]: database - database is down',
        ),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'HEALTH ALERT [HIGH]: infrastructure - High CPU usage detected',
        ),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Health Check Logging', () => {
    it('should log health check results to database', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      await (healthMonitor as any).logHealthCheck('database', 'healthy', 100);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('health_checks');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'database',
          status: 'healthy',
          latency: 100,
        }),
      );
    });

    it('should handle logging errors gracefully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await (healthMonitor as any).logHealthCheck('database', 'healthy', 100);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error logging health check:',
        expect.objectContaining({ message: 'Insert failed' }),
      );

      consoleSpy.mockRestore();
    });
  });
});
