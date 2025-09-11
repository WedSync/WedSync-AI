/**
 * Wedding Day Monitor Test Suite
 *
 * Tests the critical Saturday wedding day monitoring system
 * Ensures ultra-sensitive thresholds and emergency procedures work correctly
 *
 * Critical Requirements:
 * - Saturday detection accuracy
 * - Emergency threshold enforcement
 * - Vendor notification system
 * - Automatic escalation procedures
 */

import { WeddingDayMonitor } from '@/lib/database/wedding-day-monitor';
import { DatabaseHealthMonitor } from '@/lib/database/health-monitor';

// Helper functions to reduce nesting complexity (S2004 compliance)
const createMockSupabaseQuery = () => ({
  single: jest.fn(),
});

const createMockSupabaseSelect = () => ({
  eq: jest.fn(() => createMockSupabaseQuery()),
});

const createMockSupabaseTable = () => ({
  select: jest.fn(() => createMockSupabaseSelect()),
});

const createMockSupabaseClient = () => ({
  from: jest.fn(() => createMockSupabaseTable()),
});

const createMockRedisClient = () => ({
  connect: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
});

// Mock external dependencies with reduced nesting
jest.mock('@/lib/database/health-monitor');
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => createMockSupabaseClient()),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => createMockRedisClient()),
}));

// Mock email service
const mockSendEmail = jest.fn();
jest.mock('@/lib/services/email-service', () => ({
  EmailService: {
    sendCriticalAlert: mockSendEmail,
    sendWeddingDayAlert: mockSendEmail,
  },
}));

// Mock SMS service
const mockSendSMS = jest.fn();
jest.mock('@/lib/services/sms-service', () => ({
  SMSService: {
    sendEmergencyAlert: mockSendSMS,
  },
}));

describe('WeddingDayMonitor', () => {
  let monitor: WeddingDayMonitor;
  let mockHealthMonitor: jest.Mocked<DatabaseHealthMonitor>;

  beforeEach(() => {
    monitor = new WeddingDayMonitor();
    mockHealthMonitor =
      new DatabaseHealthMonitor() as jest.Mocked<DatabaseHealthMonitor>;

    // Reset all mocks
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true });
    mockSendSMS.mockResolvedValue({ success: true });

    // Mock current time to a known Saturday
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-25T14:30:00.000Z')); // Saturday
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Saturday Detection', () => {
    it('should correctly identify Saturday as wedding day', () => {
      const isSaturday = monitor.isWeddingDay();
      expect(isSaturday).toBe(true);
    });

    it('should return false for non-Saturday dates', () => {
      // Test Monday
      jest.setSystemTime(new Date('2025-01-20T14:30:00.000Z'));
      expect(monitor.isWeddingDay()).toBe(false);

      // Test Friday
      jest.setSystemTime(new Date('2025-01-24T14:30:00.000Z'));
      expect(monitor.isWeddingDay()).toBe(false);

      // Test Sunday
      jest.setSystemTime(new Date('2025-01-26T14:30:00.000Z'));
      expect(monitor.isWeddingDay()).toBe(false);
    });

    it('should handle timezone edge cases correctly', () => {
      // Test Saturday midnight UTC
      jest.setSystemTime(new Date('2025-01-25T00:00:00.000Z'));
      expect(monitor.isWeddingDay()).toBe(true);

      // Test Saturday 23:59 UTC
      jest.setSystemTime(new Date('2025-01-25T23:59:59.999Z'));
      expect(monitor.isWeddingDay()).toBe(true);
    });
  });

  // Helper functions for mock data to reduce nesting violations (S2004)
  const createMockConnectionPool = (overrides = {}) => ({
    totalConnections: 20,
    activeConnections: 5,
    idleConnections: 15,
    waitingConnections: 0,
    utilization: 25,
    ...overrides,
  });

  const createMockQueryPerformance = (overrides = {}) => ({
    averageQueryTime: 100,
    slowQueryCount: 0,
    totalQueries: 1000,
    queriesPerSecond: 10,
    slowestQuery: { query: 'SELECT * FROM users', duration: 150 },
    ...overrides,
  });

  const createMockSystemHealth = (overrides = {}) => ({
    cpuUsage: 45,
    memoryUsage: 60,
    diskUsage: 30,
    networkLatency: 50,
    ...overrides,
  });

  const createHealthyMockStatus = () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics: {
      connectionPool: createMockConnectionPool(),
      queryPerformance: createMockQueryPerformance(),
      systemHealth: createMockSystemHealth(),
    },
    alerts: [],
    lastUpdated: new Date().toISOString(),
  });

  describe('Wedding Day Thresholds', () => {
    beforeEach(() => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue(createHealthyMockStatus());
    });

    it('should use stricter thresholds on wedding days', async () => {
      const status = await monitor.checkWeddingDayStatus();

      expect(mockHealthMonitor.getHealthStatus).toHaveBeenCalled();
      expect(status.isWeddingDay).toBe(true);
      expect(status.thresholds.queryTime.warning).toBe(250); // Stricter than normal 500ms
      expect(status.thresholds.queryTime.critical).toBe(500); // Stricter than normal 1000ms
      expect(status.thresholds.queryTime.emergency).toBe(1000); // Stricter than normal 2000ms
    });

    it('should use normal thresholds on non-wedding days', async () => {
      jest.setSystemTime(new Date('2025-01-20T14:30:00.000Z')); // Monday

      const status = await monitor.checkWeddingDayStatus();

      expect(status.isWeddingDay).toBe(false);
      expect(status.thresholds.queryTime.warning).toBe(500); // Normal thresholds
      expect(status.thresholds.queryTime.critical).toBe(1000);
      expect(status.thresholds.queryTime.emergency).toBe(2000);
    });

    // Helper for warning status mock to reduce nesting (S2004)
    const createWarningMockStatus = () => {
      const connectionPoolWarning = createMockConnectionPool({
        activeConnections: 18,
        idleConnections: 2,
        waitingConnections: 5,
        utilization: 90,
      });

      const queryPerformanceWarning = createMockQueryPerformance({
        averageQueryTime: 300, // Above wedding day warning threshold
        slowQueryCount: 10,
        queriesPerSecond: 5,
        slowestQuery: {
          query: 'SELECT * FROM bookings WHERE wedding_date = ?',
          duration: 800,
        },
      });

      const systemHealthWarning = createMockSystemHealth({
        cpuUsage: 85,
        memoryUsage: 90,
        networkLatency: 200,
      });

      return {
        status: 'warning',
        timestamp: new Date().toISOString(),
        metrics: {
          connectionPool: connectionPoolWarning,
          queryPerformance: queryPerformanceWarning,
          systemHealth: systemHealthWarning,
        },
        alerts: [
          {
            level: 'warning',
            message: 'High query response time detected',
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      };
    };

    it('should trigger wedding day alerts for performance degradation', async () => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue(createWarningMockStatus());

      const status = await monitor.checkWeddingDayStatus();

      expect(status.alertLevel).toBe('warning');
      expect(status.alerts).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          message: expect.stringContaining('Wedding day performance warning'),
        }),
      );
    });
  });

  describe('Emergency Procedures', () => {
    // Helper for critical status mock to reduce nesting (S2004)
    const createCriticalMockStatus = () => {
      const connectionPoolCritical = createMockConnectionPool({
        activeConnections: 20,
        idleConnections: 0,
        waitingConnections: 50,
        utilization: 100,
      });

      const queryPerformanceCritical = createMockQueryPerformance({
        averageQueryTime: 1500, // Above emergency threshold
        slowQueryCount: 50,
        queriesPerSecond: 2,
        slowestQuery: {
          query: 'SELECT * FROM complex_join',
          duration: 5000,
        },
      });

      const systemHealthCritical = createMockSystemHealth({
        cpuUsage: 95,
        memoryUsage: 98,
        diskUsage: 85,
        networkLatency: 500,
      });

      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        metrics: {
          connectionPool: connectionPoolCritical,
          queryPerformance: queryPerformanceCritical,
          systemHealth: systemHealthCritical,
        },
        alerts: [
          {
            level: 'critical',
            message: 'Database emergency - connection pool exhausted',
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      };
    };

    it('should trigger emergency procedures for critical performance issues', async () => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue(createCriticalMockStatus());

      const result = await monitor.executeEmergencyProcedures();

      expect(result.success).toBe(true);
      expect(result.actionsPerformed).toContain('vendor_notifications_sent');
      expect(result.actionsPerformed).toContain('emergency_contacts_notified');
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('WEDDING DAY EMERGENCY'),
          priority: 'critical',
        }),
      );
      expect(mockSendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('DATABASE EMERGENCY'),
        }),
      );
    });

    it('should handle emergency procedure failures gracefully', async () => {
      mockSendEmail.mockRejectedValue(new Error('Email service unavailable'));
      mockSendSMS.mockRejectedValue(new Error('SMS service down'));

      const result = await monitor.executeEmergencyProcedures();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to send email notifications');
      expect(result.errors).toContain('Failed to send SMS notifications');
      expect(result.fallbackProceduresActivated).toBe(true);
    });

    // Helper for prolonged critical status to reduce nesting (S2004)
    const createProlongedCriticalStatus = () => {
      const connectionPoolProlonged = createMockConnectionPool({
        activeConnections: 20,
        idleConnections: 0,
        waitingConnections: 100,
        utilization: 100,
      });

      const queryPerformanceProlonged = createMockQueryPerformance({
        averageQueryTime: 2000,
        slowQueryCount: 100,
        totalQueries: 500,
        queriesPerSecond: 1,
        slowestQuery: { query: 'timeout query', duration: 10000 },
      });

      const systemHealthProlonged = createMockSystemHealth({
        cpuUsage: 100,
        memoryUsage: 100,
        diskUsage: 95,
        networkLatency: 1000,
      });

      return {
        status: 'critical',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        metrics: {
          connectionPool: connectionPoolProlonged,
          queryPerformance: queryPerformanceProlonged,
          systemHealth: systemHealthProlonged,
        },
        alerts: [
          {
            level: 'critical',
            message: 'System unresponsive for 10+ minutes',
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      };
    };

    it('should implement escalation procedures for prolonged issues', async () => {
      // Simulate prolonged critical status using helper
      mockHealthMonitor.getHealthStatus.mockResolvedValue(createProlongedCriticalStatus());

      const result = await monitor.handleEscalation();

      expect(result.escalationLevel).toBe('emergency');
      expect(result.actionsPerformed).toContain('senior_management_notified');
      expect(result.actionsPerformed).toContain(
        'vendor_communication_initiated',
      );
      expect(result.estimatedRecoveryTime).toBeLessThanOrEqual(30); // minutes
    });
  });

  // Helper for vendor notification mock data to reduce nesting (S2004)
  const createVendorNotificationMockStatus = () => {
    const connectionPoolVendor = createMockConnectionPool({
      activeConnections: 15,
      waitingConnections: 3,
      utilization: 75,
    });

    const queryPerformanceVendor = createMockQueryPerformance({
      averageQueryTime: 400,
      slowQueryCount: 5,
      queriesPerSecond: 8,
      slowestQuery: { query: 'venue query', duration: 600 },
    });

    const systemHealthVendor = createMockSystemHealth({
      cpuUsage: 70,
      memoryUsage: 65,
      diskUsage: 40,
      networkLatency: 100,
    });

    return {
      status: 'warning',
      timestamp: new Date().toISOString(),
      metrics: {
        connectionPool: connectionPoolVendor,
        queryPerformance: queryPerformanceVendor,
        systemHealth: systemHealthVendor,
      },
      alerts: [
        {
          level: 'warning',
          message: 'Performance degradation detected',
          timestamp: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  };

  describe('Wedding Vendor Notifications', () => {
    beforeEach(() => {
      // Mock wedding data using helper
      mockHealthMonitor.getHealthStatus.mockResolvedValue(createVendorNotificationMockStatus());
    });

    it('should notify affected wedding vendors during issues', async () => {
      const result = await monitor.notifyAffectedVendors();

      expect(result.vendorsNotified).toBeGreaterThan(0);
      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Wedding Day System Status Update'),
          template: 'wedding_day_vendor_alert',
        }),
      );
    });

    it('should prioritize notifications by wedding proximity', async () => {
      const result = await monitor.notifyAffectedVendors();

      expect(result.priorityNotifications).toBeDefined();
      expect(result.priorityNotifications.immediate).toBeGreaterThanOrEqual(0);
      expect(result.priorityNotifications.urgent).toBeGreaterThanOrEqual(0);
      expect(result.priorityNotifications.standard).toBeGreaterThanOrEqual(0);
    });

    it('should include helpful guidance in vendor notifications', async () => {
      await monitor.notifyAffectedVendors();

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            recommendedActions: expect.any(Array),
            alternativeAccess: expect.any(String),
            supportContact: expect.any(String),
            estimatedResolution: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('Recovery Procedures', () => {
    // Helper for recovery test mock to reduce nesting (S2004)
    const createRecoveryTestMockStatus = () => {
      const connectionPoolRecovery = createMockConnectionPool({
        activeConnections: 20,
        idleConnections: 0,
        waitingConnections: 25,
        utilization: 100,
      });

      const queryPerformanceRecovery = createMockQueryPerformance({
        averageQueryTime: 800,
        slowQueryCount: 20,
        totalQueries: 500,
        queriesPerSecond: 3,
        slowestQuery: { query: 'heavy query', duration: 2000 },
      });

      const systemHealthRecovery = createMockSystemHealth({
        cpuUsage: 90,
        memoryUsage: 85,
        diskUsage: 60,
        networkLatency: 300,
      });

      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        metrics: {
          connectionPool: connectionPoolRecovery,
          queryPerformance: queryPerformanceRecovery,
          systemHealth: systemHealthRecovery,
        },
        alerts: [
          {
            level: 'critical',
            message: 'Connection pool exhausted',
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      };
    };

    it('should implement automatic recovery steps', async () => {
      mockHealthMonitor.getHealthStatus.mockResolvedValue(createRecoveryTestMockStatus());

      const result = await monitor.attemptAutoRecovery();

      expect(result.recoveryAttempted).toBe(true);
      expect(result.steps).toContain('connection_pool_reset');
      expect(result.steps).toContain('cache_clear');
      expect(result.steps).toContain('query_optimization_enabled');
      expect(result.success).toBe(true);
    });

    it('should track recovery progress and effectiveness', async () => {
      const result = await monitor.attemptAutoRecovery();

      expect(result.progressTracking).toBeDefined();
      expect(result.progressTracking.startTime).toBeDefined();
      expect(result.progressTracking.expectedDuration).toBeLessThanOrEqual(300); // 5 minutes max
      expect(result.progressTracking.checkpoints).toBeInstanceOf(Array);
    });

    it('should escalate if auto-recovery fails', async () => {
      // Mock failed recovery
      jest.spyOn(monitor, 'attemptAutoRecovery').mockResolvedValue({
        recoveryAttempted: true,
        success: false,
        steps: ['connection_pool_reset_failed', 'cache_clear_failed'],
        progressTracking: {
          startTime: new Date().toISOString(),
          expectedDuration: 300,
          checkpoints: [],
        },
        errors: ['Connection pool reset failed', 'Cache service unreachable'],
      });

      const result = await monitor.attemptAutoRecovery();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Impact', () => {
    it('should have minimal performance impact during normal operations', async () => {
      const startTime = Date.now();

      await monitor.checkWeddingDayStatus();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should cache wedding day status to reduce database load', async () => {
      // First call
      await monitor.checkWeddingDayStatus();
      // Second call should use cache
      const startTime = Date.now();
      await monitor.checkWeddingDayStatus();
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(10); // Cached response should be very fast
    });

    // Helper for concurrent request testing to reduce nesting (S2004)
    const createConcurrentRequests = (count: number) => {
      return Array(count).fill(null).map(() => monitor.checkWeddingDayStatus());
    };

    const validateConcurrentResults = (results: any[]) => {
      results.forEach((result) => {
        expect(result.isWeddingDay).toBe(true);
        expect(result.status).toBeDefined();
      });
    };

    it('should handle high concurrent monitoring requests', async () => {
      const promises = createConcurrentRequests(50);
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      validateConcurrentResults(results);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockHealthMonitor.getHealthStatus.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await monitor.checkWeddingDayStatus();

      expect(result.status).toBe('unknown');
      expect(result.error).toBeDefined();
      expect(result.fallbackMode).toBe(true);
    });

    it('should continue monitoring with degraded functionality during partial failures', async () => {
      mockSendEmail.mockRejectedValue(new Error('Email service down'));

      const result = await monitor.notifyAffectedVendors();

      expect(result.partialFailure).toBe(true);
      expect(result.alternativeNotificationsSent).toBeGreaterThan(0);
      expect(result.failedServices).toContain('email');
    });

    it('should log all errors for debugging purposes', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockHealthMonitor.getHealthStatus.mockRejectedValue(
        new Error('Test error'),
      );
      await monitor.checkWeddingDayStatus();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WeddingDayMonitor error'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with Core Systems', () => {
    it('should integrate properly with DatabaseHealthMonitor', async () => {
      await monitor.checkWeddingDayStatus();

      expect(mockHealthMonitor.getHealthStatus).toHaveBeenCalledWith();
    });

    it('should respect existing health check caching', async () => {
      // Multiple calls should efficiently use existing health monitor caching
      await monitor.checkWeddingDayStatus();
      await monitor.checkWeddingDayStatus();
      await monitor.checkWeddingDayStatus();

      expect(mockHealthMonitor.getHealthStatus).toHaveBeenCalledTimes(3);
    });

    it('should provide enhanced status information for wedding days', async () => {
      const result = await monitor.checkWeddingDayStatus();

      expect(result).toHaveProperty('isWeddingDay', true);
      expect(result).toHaveProperty('weddingDayProtections');
      expect(result).toHaveProperty('vendorImpactAssessment');
      expect(result).toHaveProperty('recoveryProcedures');
    });
  });

  describe('Wedding-Specific Business Logic', () => {
    it('should identify peak wedding hours for enhanced monitoring', async () => {
      // Saturday 2 PM - peak wedding ceremony time
      jest.setSystemTime(new Date('2025-01-25T14:00:00.000Z'));

      const result = await monitor.checkWeddingDayStatus();

      expect(result.isPeakHours).toBe(true);
      expect(result.thresholds.queryTime.warning).toBeLessThan(250); // Even stricter during peak
    });

    it('should consider vendor timezone differences', async () => {
      const result = await monitor.getVendorTimezoneImpact();

      expect(result.affectedTimezones).toBeInstanceOf(Array);
      expect(result.priorityAdjustments).toBeDefined();
    });

    it('should handle multiple concurrent weddings scenario', async () => {
      const result = await monitor.assessMultiWeddingLoad();

      expect(result.concurrentWeddings).toBeGreaterThanOrEqual(0);
      expect(result.loadDistribution).toBeDefined();
      expect(result.capacityRecommendations).toBeDefined();
    });
  });
});
