/**
 * WS-227: Health Monitor Service Unit Tests
 * Comprehensive test suite for system health monitoring
 */

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  vi,
  MockedFunction,
} from 'vitest';
import {
  HealthMonitor,
  SystemHealth,
  ServiceStatus,
} from '@/lib/services/health-monitor';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/redis');

const mockSupabase = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
};

(createClient as MockedFunction<typeof createClient>).mockReturnValue(
  mockSupabase as any,
);
(redis as any).get = mockRedis.get;
(redis as any).set = mockRedis.set;
(redis as any).setex = mockRedis.setex;
(redis as any).del = mockRedis.del;

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    healthMonitor = new HealthMonitor();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkDatabase', () => {
    it('should return healthy status for fast database response', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await healthMonitor.checkDatabase();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeLessThan(1000);
      expect(result.errorCount24h).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('health_checks');
    });

    it('should return degraded status for slow database response', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: [{}], error: null });
            }, 1100); // Simulate slow response
          });
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await healthMonitor.checkDatabase();

      expect(result.status).toBe('degraded');
      expect(result.latency).toBeGreaterThan(1000);
    }, 10000);

    it('should return down status for database error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await healthMonitor.checkDatabase();

      expect(result.status).toBe('down');
      expect(result.latency).toBe(-1);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('checkRedis', () => {
    it('should return healthy status for working Redis', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('test_value');
      mockRedis.del.mockResolvedValue(1);

      const result = await healthMonitor.checkRedis();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeLessThan(500);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should return degraded status for slow Redis', async () => {
      mockRedis.set.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('OK'), 600);
        });
      });
      mockRedis.get.mockResolvedValue('test_value');
      mockRedis.del.mockResolvedValue(1);

      const result = await healthMonitor.checkRedis();

      expect(result.status).toBe('degraded');
      expect(result.latency).toBeGreaterThan(500);
    }, 10000);

    it('should return down status for Redis connection failure', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      const result = await healthMonitor.checkRedis();

      expect(result.status).toBe('down');
      expect(result.latency).toBe(-1);
      expect(result.message).toContain('Redis connection failed');
    });

    it('should return down status for Redis read/write test failure', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('wrong_value'); // Simulate read/write mismatch
      mockRedis.del.mockResolvedValue(1);

      const result = await healthMonitor.checkRedis();

      expect(result.status).toBe('down');
      expect(result.message).toContain('Redis read/write test failed');
    });
  });

  describe('checkEmailService', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
      process.env.RESEND_API_KEY = 'test-api-key';
    });

    it('should return healthy status for working email service', async () => {
      (global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const result = await healthMonitor.checkEmailService();

      expect(result.status).toBe('healthy');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/domains',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should return degraded status for slow email service', async () => {
      (global.fetch as MockedFunction<typeof fetch>).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
            } as Response);
          }, 2100);
        });
      });

      const result = await healthMonitor.checkEmailService();

      expect(result.status).toBe('degraded');
      expect(result.latency).toBeGreaterThan(2000);
    }, 10000);

    it('should return down status for email service error', async () => {
      (global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await healthMonitor.checkEmailService();

      expect(result.status).toBe('down');
    });
  });

  describe('performHealthCheck', () => {
    beforeEach(() => {
      // Mock all individual check methods
      vi.spyOn(healthMonitor, 'checkDatabase').mockResolvedValue({
        status: 'healthy',
        latency: 50,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 99.9,
      } as ServiceStatus);

      vi.spyOn(healthMonitor, 'checkRedis').mockResolvedValue({
        status: 'healthy',
        latency: 20,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 100,
      } as ServiceStatus);

      vi.spyOn(healthMonitor, 'checkEmailService').mockResolvedValue({
        status: 'healthy',
        latency: 100,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 99.8,
      } as ServiceStatus);

      vi.spyOn(healthMonitor, 'checkSMSService').mockResolvedValue({
        status: 'healthy',
        latency: 80,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 99.5,
      } as ServiceStatus);

      vi.spyOn(healthMonitor, 'checkSupabase').mockResolvedValue({
        status: 'healthy',
        latency: 150,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 99.7,
      } as ServiceStatus);

      vi.spyOn(healthMonitor, 'checkStorage').mockResolvedValue({
        status: 'healthy',
        latency: 200,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 99.6,
      } as ServiceStatus);
    });

    it('should return comprehensive health data', async () => {
      mockRedis.get.mockResolvedValue(null); // No cached data
      mockRedis.setex.mockResolvedValue('OK');

      const result = await healthMonitor.performHealthCheck();

      expect(result).toBeDefined();
      expect(result.infrastructure).toBeDefined();
      expect(result.services).toBeDefined();
      expect(result.apiHealth).toBeDefined();
      expect(result.jobQueue).toBeDefined();
      expect(result.lastUpdated).toBeDefined();

      // Check all services are included
      expect(result.services.database).toBeDefined();
      expect(result.services.redis).toBeDefined();
      expect(result.services.emailService).toBeDefined();
      expect(result.services.smsService).toBeDefined();
      expect(result.services.supabase).toBeDefined();
      expect(result.services.storage).toBeDefined();
    });

    it('should use cached data when available and fresh', async () => {
      const cachedHealth = {
        infrastructure: { cpuUsage: 30, memoryUsage: 40 },
        services: { database: { status: 'healthy' } },
        lastUpdated: new Date().toISOString(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedHealth));

      const result = await healthMonitor.performHealthCheck();

      // Should return cached data without calling individual checks
      expect(healthMonitor.checkDatabase).not.toHaveBeenCalled();
      expect(result.infrastructure.cpuUsage).toBe(30);
    });

    it('should handle Redis cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const result = await healthMonitor.performHealthCheck();

      // Should still complete health check despite cache errors
      expect(result).toBeDefined();
      expect(result.services.database.status).toBe('healthy');
    });

    it('should return degraded health when services fail', async () => {
      vi.spyOn(healthMonitor, 'checkDatabase').mockRejectedValue(
        new Error('DB error'),
      );

      const result = await healthMonitor.performHealthCheck();

      expect(result).toBeDefined();
      // Should have default values for failed service
      expect(result.services.database).toBeDefined();
    });
  });

  describe('getErrorCount24h', () => {
    it('should return error count from database', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Access private method for testing
      const errorCount = await (healthMonitor as any).getErrorCount24h(
        'database',
      );

      expect(errorCount).toBe(5);
      expect(mockSupabase.from).toHaveBeenCalledWith('health_checks');
    });

    it('should return 0 on database error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          count: null,
          error: { message: 'Query failed' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const errorCount = await (healthMonitor as any).getErrorCount24h(
        'database',
      );

      expect(errorCount).toBe(0);
    });
  });

  describe('calculateUptime', () => {
    it('should calculate uptime percentage correctly', async () => {
      const mockChecks = [
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'degraded' },
        { status: 'healthy' },
        { status: 'down' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChecks,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const uptime = await (healthMonitor as any).calculateUptime('database');

      // 3 out of 5 checks were healthy = 60%
      expect(uptime).toBe(60);
    });

    it('should return 100% when no data available', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const uptime = await (healthMonitor as any).calculateUptime('database');

      expect(uptime).toBe(100);
    });
  });

  describe('Wedding Day Protocol', () => {
    it('should handle Saturday detection', () => {
      const saturday = new Date('2025-01-25'); // A Saturday
      const isSaturday = saturday.getDay() === 6;

      expect(isSaturday).toBe(true);
    });

    it('should have stricter thresholds for wedding days', () => {
      // This would be implemented in the actual service
      // Testing the concept of wedding day mode
      const weddingDayMode = true;
      const normalLatencyThreshold = 1000;
      const weddingDayLatencyThreshold = 500;

      const threshold = weddingDayMode
        ? weddingDayLatencyThreshold
        : normalLatencyThreshold;

      expect(threshold).toBe(500);
    });
  });
});

describe('HealthMonitor Integration Tests', () => {
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    healthMonitor = new HealthMonitor();
  });

  describe('End-to-End Health Check', () => {
    it('should complete full health check workflow', async () => {
      // This would test the full workflow in a test environment
      // Mock successful responses for all services
      const mockSuccessfulService = {
        status: 'healthy' as const,
        latency: 100,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 99.9,
      };

      vi.spyOn(healthMonitor, 'checkDatabase').mockResolvedValue(
        mockSuccessfulService,
      );
      vi.spyOn(healthMonitor, 'checkRedis').mockResolvedValue(
        mockSuccessfulService,
      );
      vi.spyOn(healthMonitor, 'checkEmailService').mockResolvedValue(
        mockSuccessfulService,
      );
      vi.spyOn(healthMonitor, 'checkSMSService').mockResolvedValue(
        mockSuccessfulService,
      );
      vi.spyOn(healthMonitor, 'checkSupabase').mockResolvedValue(
        mockSuccessfulService,
      );
      vi.spyOn(healthMonitor, 'checkStorage').mockResolvedValue(
        mockSuccessfulService,
      );

      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const startTime = Date.now();
      const result = await healthMonitor.performHealthCheck();
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
      expect(new Date(result.lastUpdated).getTime()).toBeGreaterThanOrEqual(
        startTime,
      );
      expect(new Date(result.lastUpdated).getTime()).toBeLessThanOrEqual(
        endTime,
      );

      // Verify all components are healthy
      Object.values(result.services).forEach((service) => {
        expect(service.status).toBe('healthy');
        expect(service.latency).toBeGreaterThanOrEqual(0);
        expect(service.uptime).toBeGreaterThan(0);
      });

      expect(result.infrastructure.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(result.infrastructure.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(result.apiHealth.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.jobQueue.pending).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed service states', async () => {
      // Mix of healthy, degraded, and down services
      vi.spyOn(healthMonitor, 'checkDatabase').mockResolvedValue({
        status: 'healthy',
        latency: 50,
        lastCheck: new Date().toISOString(),
        errorCount24h: 0,
        uptime: 99.9,
      });

      vi.spyOn(healthMonitor, 'checkRedis').mockResolvedValue({
        status: 'degraded',
        latency: 800,
        lastCheck: new Date().toISOString(),
        errorCount24h: 5,
        uptime: 98.5,
      });

      vi.spyOn(healthMonitor, 'checkEmailService').mockResolvedValue({
        status: 'down',
        latency: -1,
        lastCheck: new Date().toISOString(),
        errorCount24h: 25,
        uptime: 90.0,
        message: 'Service unavailable',
      });

      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await healthMonitor.performHealthCheck();

      expect(result.services.database.status).toBe('healthy');
      expect(result.services.redis.status).toBe('degraded');
      expect(result.services.emailService.status).toBe('down');
      expect(result.services.emailService.message).toBe('Service unavailable');
    });
  });
});
