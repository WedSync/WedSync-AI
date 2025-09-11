/**
 * Database Health API Endpoint Test Suite
 *
 * Tests the enhanced database health check API with multiple modes:
 * - Quick health checks for load balancers
 * - Wedding day specific monitoring
 * - Comprehensive health metrics
 * - Legacy compatibility mode
 *
 * Critical for monitoring infrastructure and automated alerts
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/database/route';
import { DatabaseHealthMonitor } from '@/lib/database/health-monitor';
import { WeddingDayMonitor } from '@/lib/database/wedding-day-monitor';

// Mock the health monitoring services
jest.mock('@/lib/database/health-monitor');
jest.mock('@/lib/database/wedding-day-monitor');

// Mock rate limiting
jest.mock('@/lib/middleware/rate-limiting', () => ({
  rateLimit: jest.fn(() => ({ success: true, remaining: 100 })),
}));

// Mock Redis for caching
const mockRedisClient = {
  connect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn(),
};
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('Database Health API Endpoint', () => {
  let mockHealthMonitor: jest.Mocked<DatabaseHealthMonitor>;
  let mockWeddingDayMonitor: jest.Mocked<WeddingDayMonitor>;

  beforeEach(() => {
    mockHealthMonitor =
      new DatabaseHealthMonitor() as jest.Mocked<DatabaseHealthMonitor>;
    mockWeddingDayMonitor =
      new WeddingDayMonitor() as jest.Mocked<WeddingDayMonitor>;

    // Reset all mocks
    jest.clearAllMocks();

    // Mock successful health status by default
    mockHealthMonitor.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        connectionPool: {
          totalConnections: 20,
          activeConnections: 5,
          idleConnections: 15,
          waitingConnections: 0,
          utilization: 25,
        },
        queryPerformance: {
          averageQueryTime: 100,
          slowQueryCount: 0,
          totalQueries: 1000,
          queriesPerSecond: 10,
          slowestQuery: { query: 'SELECT * FROM users', duration: 150 },
        },
        systemHealth: {
          cpuUsage: 45,
          memoryUsage: 60,
          diskUsage: 30,
          networkLatency: 50,
        },
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    });

    // Mock wedding day status
    mockWeddingDayMonitor.checkWeddingDayStatus.mockResolvedValue({
      isWeddingDay: false,
      status: 'healthy',
      alertLevel: 'none',
      thresholds: {
        queryTime: { warning: 500, critical: 1000, emergency: 2000 },
        connectionPool: { warning: 80, critical: 90, emergency: 95 },
        systemResources: { warning: 70, critical: 85, emergency: 95 },
      },
      alerts: [],
      weddingDayProtections: false,
      vendorImpactAssessment: 'none',
      recoveryProcedures: 'standard',
    });

    // Mock Redis cache miss by default
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
  });

  describe('Basic Health Check (Default Mode)', () => {
    it('should return healthy status with comprehensive metrics', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.metrics.connectionPool).toBeDefined();
      expect(data.metrics.queryPerformance).toBeDefined();
      expect(data.metrics.systemHealth).toBeDefined();
      expect(data.alerts).toEqual([]);
    });

    it('should return warning status with alert details', async () => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue({
        status: 'warning',
        timestamp: new Date().toISOString(),
        metrics: {
          connectionPool: {
            totalConnections: 20,
            activeConnections: 18,
            idleConnections: 2,
            waitingConnections: 5,
            utilization: 90,
          },
          queryPerformance: {
            averageQueryTime: 750,
            slowQueryCount: 15,
            totalQueries: 1000,
            queriesPerSecond: 8,
            slowestQuery: { query: 'complex query', duration: 2000 },
          },
          systemHealth: {
            cpuUsage: 85,
            memoryUsage: 90,
            diskUsage: 60,
            networkLatency: 150,
          },
        },
        alerts: [
          {
            level: 'warning',
            message: 'High CPU usage detected',
            timestamp: new Date().toISOString(),
          },
          {
            level: 'warning',
            message: 'Slow queries increasing',
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('warning');
      expect(data.alerts).toHaveLength(2);
      expect(data.alerts[0].level).toBe('warning');
      expect(data.metrics.systemHealth.cpuUsage).toBe(85);
    });

    it('should return critical status with 503 status code', async () => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue({
        status: 'critical',
        timestamp: new Date().toISOString(),
        metrics: {
          connectionPool: {
            totalConnections: 20,
            activeConnections: 20,
            idleConnections: 0,
            waitingConnections: 50,
            utilization: 100,
          },
          queryPerformance: {
            averageQueryTime: 2000,
            slowQueryCount: 100,
            totalQueries: 500,
            queriesPerSecond: 2,
            slowestQuery: { query: 'timeout query', duration: 10000 },
          },
          systemHealth: {
            cpuUsage: 100,
            memoryUsage: 98,
            diskUsage: 95,
            networkLatency: 1000,
          },
        },
        alerts: [
          {
            level: 'critical',
            message: 'Database connection pool exhausted',
            timestamp: new Date().toISOString(),
          },
          {
            level: 'critical',
            message: 'System resources critically low',
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      const response = await GET(request);

      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.status).toBe('critical');
      expect(data.alerts).toHaveLength(2);
      expect(data.metrics.connectionPool.utilization).toBe(100);
    });
  });

  describe('Quick Health Check Mode', () => {
    it('should return minimal health status for load balancers', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database?quick=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.responseTime).toBeGreaterThan(0);
      expect(data.checkType).toBe('quick');

      // Quick mode should not include detailed metrics
      expect(data.metrics).toBeUndefined();
      expect(data.alerts).toBeUndefined();
    });

    it('should complete quick checks in under 100ms', async () => {
      const startTime = Date.now();
      const request = new NextRequest(
        'http://localhost:3000/api/health/database?quick=true',
      );
      await GET(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should use cache for rapid quick check responses', async () => {
      // First request - cache miss
      const request1 = new NextRequest(
        'http://localhost:3000/api/health/database?quick=true',
      );
      await GET(request1);

      expect(mockRedisClient.set).toHaveBeenCalled();

      // Mock cache hit
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          cached: true,
        }),
      );

      // Second request - should use cache
      const request2 = new NextRequest(
        'http://localhost:3000/api/health/database?quick=true',
      );
      const response = await GET(request2);

      const data = await response.json();
      expect(data.cached).toBe(true);
    });
  });

  describe('Wedding Day Monitoring Mode', () => {
    it('should return wedding day specific status and thresholds', async () => {
      mockWeddingDayMonitor.checkWeddingDayStatus.mockResolvedValue({
        isWeddingDay: true,
        status: 'healthy',
        alertLevel: 'none',
        thresholds: {
          queryTime: { warning: 250, critical: 500, emergency: 1000 },
          connectionPool: { warning: 70, critical: 80, emergency: 90 },
          systemResources: { warning: 60, critical: 75, emergency: 85 },
        },
        alerts: [],
        weddingDayProtections: true,
        vendorImpactAssessment: 'minimal',
        recoveryProcedures: 'expedited',
        isPeakHours: true,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database?wedding-day=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isWeddingDay).toBe(true);
      expect(data.weddingDayProtections).toBe(true);
      expect(data.isPeakHours).toBe(true);
      expect(data.thresholds.queryTime.warning).toBe(250); // Stricter wedding day thresholds
      expect(data.vendorImpactAssessment).toBe('minimal');
      expect(data.recoveryProcedures).toBe('expedited');
    });

    it('should escalate wedding day warnings appropriately', async () => {
      mockWeddingDayMonitor.checkWeddingDayStatus.mockResolvedValue({
        isWeddingDay: true,
        status: 'warning',
        alertLevel: 'warning',
        thresholds: {
          queryTime: { warning: 250, critical: 500, emergency: 1000 },
          connectionPool: { warning: 70, critical: 80, emergency: 90 },
          systemResources: { warning: 60, critical: 75, emergency: 85 },
        },
        alerts: [
          {
            level: 'warning',
            message: 'Wedding day performance degradation detected',
            timestamp: new Date().toISOString(),
          },
        ],
        weddingDayProtections: true,
        vendorImpactAssessment: 'moderate',
        recoveryProcedures: 'expedited',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database?wedding-day=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.alertLevel).toBe('warning');
      expect(data.vendorImpactAssessment).toBe('moderate');
      expect(data.alerts[0].message).toContain(
        'Wedding day performance degradation',
      );
    });

    it('should trigger emergency protocols for wedding day critical issues', async () => {
      mockWeddingDayMonitor.checkWeddingDayStatus.mockResolvedValue({
        isWeddingDay: true,
        status: 'critical',
        alertLevel: 'emergency',
        thresholds: {
          queryTime: { warning: 250, critical: 500, emergency: 1000 },
          connectionPool: { warning: 70, critical: 80, emergency: 90 },
          systemResources: { warning: 60, critical: 75, emergency: 85 },
        },
        alerts: [
          {
            level: 'emergency',
            message: 'WEDDING DAY EMERGENCY: Database performance critical',
            timestamp: new Date().toISOString(),
          },
        ],
        weddingDayProtections: true,
        vendorImpactAssessment: 'severe',
        recoveryProcedures: 'emergency',
        emergencyContactsNotified: true,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database?wedding-day=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.alertLevel).toBe('emergency');
      expect(data.emergencyContactsNotified).toBe(true);
      expect(data.recoveryProcedures).toBe('emergency');
      expect(data.vendorImpactAssessment).toBe('severe');
    });
  });

  describe('Metrics Export Mode', () => {
    it('should export detailed metrics for monitoring systems', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database?metrics=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.exportFormat).toBe('detailed');
      expect(data.metrics.connectionPool).toBeDefined();
      expect(data.metrics.queryPerformance.averageQueryTime).toBe(100);
      expect(data.metrics.systemHealth.cpuUsage).toBe(45);
      expect(data.timestamps.collected).toBeDefined();
      expect(data.timestamps.exported).toBeDefined();
    });

    it('should include historical trend data in metrics mode', async () => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          connectionPool: {
            totalConnections: 20,
            activeConnections: 5,
            idleConnections: 15,
            waitingConnections: 0,
            utilization: 25,
          },
          queryPerformance: {
            averageQueryTime: 100,
            slowQueryCount: 0,
            totalQueries: 1000,
            queriesPerSecond: 10,
            slowestQuery: { query: 'SELECT * FROM users', duration: 150 },
          },
          systemHealth: {
            cpuUsage: 45,
            memoryUsage: 60,
            diskUsage: 30,
            networkLatency: 50,
          },
        },
        alerts: [],
        lastUpdated: new Date().toISOString(),
        trends: {
          queryTimeGrowth: 5.2,
          connectionUtilizationTrend: -2.1,
          resourceUsageTrend: 1.8,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database?metrics=true',
      );
      const response = await GET(request);

      const data = await response.json();
      expect(data.trends.queryTimeGrowth).toBe(5.2);
      expect(data.trends.connectionUtilizationTrend).toBe(-2.1);
      expect(data.trends.resourceUsageTrend).toBe(1.8);
    });
  });

  describe('Legacy Compatibility Mode', () => {
    it('should return legacy format health check', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database?legacy=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.healthy).toBe(true);
      expect(data.database).toBe('connected');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe('legacy-v1');

      // Legacy format should not include new metrics structure
      expect(data.metrics).toBeUndefined();
      expect(data.alerts).toBeUndefined();
    });

    it('should handle legacy format for unhealthy status', async () => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue({
        status: 'critical',
        timestamp: new Date().toISOString(),
        metrics: {
          connectionPool: {
            totalConnections: 20,
            activeConnections: 20,
            idleConnections: 0,
            waitingConnections: 50,
            utilization: 100,
          },
          queryPerformance: {
            averageQueryTime: 2000,
            slowQueryCount: 100,
            totalQueries: 500,
            queriesPerSecond: 2,
            slowestQuery: { query: 'timeout query', duration: 10000 },
          },
          systemHealth: {
            cpuUsage: 100,
            memoryUsage: 98,
            diskUsage: 95,
            networkLatency: 1000,
          },
        },
        alerts: [
          {
            level: 'critical',
            message: 'Database connection pool exhausted',
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database?legacy=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.healthy).toBe(false);
      expect(data.database).toBe('disconnected');
      expect(data.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits for authenticated requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      // Add authorization header
      request.headers.set('Authorization', 'Bearer valid-token');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });

    it('should handle rate limit exceeded scenarios', async () => {
      // Mock rate limiting failure
      const mockRateLimit = require('@/lib/middleware/rate-limiting').rateLimit;
      mockRateLimit.mockReturnValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      const response = await GET(request);

      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toContain('Rate limit exceeded');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('should allow higher rate limits for quick health checks', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database?quick=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Quick checks should have more lenient rate limits
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockHealthMonitor.getHealthStatus.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      const response = await GET(request);

      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.status).toBe('error');
      expect(data.error).toContain('Database connection failed');
      expect(data.fallbackMode).toBe(true);
    });

    it('should handle partial service failures with degraded functionality', async () => {
      mockWeddingDayMonitor.checkWeddingDayStatus.mockRejectedValue(
        new Error('Wedding day monitor unavailable'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/health/database?wedding-day=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.partialFailure).toBe(true);
      expect(data.unavailableServices).toContain('wedding-day-monitor');
      expect(data.fallbackWeddingDayStatus).toBeDefined();
    });

    it('should handle Redis cache failures without breaking main functionality', async () => {
      mockRedisClient.get.mockRejectedValue(
        new Error('Redis connection failed'),
      );
      mockRedisClient.set.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/health/database?quick=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.cacheUnavailable).toBe(true);
      expect(data.status).toBe('healthy'); // Main functionality should still work
    });

    it('should log errors appropriately for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockHealthMonitor.getHealthStatus.mockRejectedValue(
        new Error('Test error'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      await GET(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database health check error'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Response Headers and Security', () => {
    it('should include appropriate security headers', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      const response = await GET(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate',
      );
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should include rate limiting headers', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      const response = await GET(request);

      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should handle CORS appropriately for monitoring tools', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      request.headers.set('Origin', 'https://monitoring.wedsync.com');

      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete health checks within acceptable time limits', async () => {
      const startTime = Date.now();

      const request = new NextRequest(
        'http://localhost:3000/api/health/database',
      );
      await GET(request);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle concurrent health check requests efficiently', async () => {
      const promises = Array(20)
        .fill(null)
        .map(() => {
          const request = new NextRequest(
            'http://localhost:3000/api/health/database?quick=true',
          );
          return GET(request);
        });

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should optimize response size for different modes', async () => {
      const quickRequest = new NextRequest(
        'http://localhost:3000/api/health/database?quick=true',
      );
      const fullRequest = new NextRequest(
        'http://localhost:3000/api/health/database',
      );

      const quickResponse = await GET(quickRequest);
      const fullResponse = await GET(fullRequest);

      const quickData = await quickResponse.json();
      const fullData = await fullResponse.json();

      const quickSize = JSON.stringify(quickData).length;
      const fullSize = JSON.stringify(fullData).length;

      expect(quickSize).toBeLessThan(fullSize / 2); // Quick mode should be significantly smaller
    });
  });
});
